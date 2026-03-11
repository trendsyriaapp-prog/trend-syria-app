# /app/backend/routes/food_orders.py
# مسارات طلبات الطعام

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid

from core.database import db, get_current_user

router = APIRouter(prefix="/food/orders", tags=["Food Orders"])

# حالات الطلب
ORDER_STATUSES = {
    "pending": "بانتظار التأكيد",
    "confirmed": "تم التأكيد",
    "preparing": "جاري التحضير",
    "ready": "جاهز للاستلام",
    "out_for_delivery": "في الطريق",
    "delivered": "تم التوصيل",
    "cancelled": "ملغي"
}

# Models
class FoodOrderItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int
    notes: Optional[str] = None

class FoodOrderCreate(BaseModel):
    store_id: str
    items: List[FoodOrderItem]
    delivery_address: str
    delivery_city: str
    delivery_phone: str
    notes: Optional[str] = None
    payment_method: str = "wallet"  # wallet, cash

# ===============================
# طلبات العميل
# ===============================

@router.post("")
async def create_food_order(order: FoodOrderCreate, user: dict = Depends(get_current_user)):
    """إنشاء طلب طعام جديد"""
    
    # التحقق من المتجر
    store = await db.food_stores.find_one({"id": order.store_id, "is_approved": True, "is_active": True})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير متاح")
    
    # حساب المجموع
    subtotal = 0
    order_items = []
    
    for item in order.items:
        product = await db.food_products.find_one({"id": item.product_id, "is_available": True})
        if not product:
            raise HTTPException(status_code=400, detail=f"المنتج {item.name} غير متاح")
        
        item_total = product["price"] * item.quantity
        subtotal += item_total
        
        order_items.append({
            "product_id": item.product_id,
            "name": product["name"],
            "price": product["price"],
            "quantity": item.quantity,
            "total": item_total,
            "notes": item.notes
        })
    
    # التحقق من الحد الأدنى للطلب
    if store.get("minimum_order", 0) > subtotal:
        raise HTTPException(
            status_code=400, 
            detail=f"الحد الأدنى للطلب هو {store['minimum_order']:,.0f} ل.س"
        )
    
    # حساب خصم العروض
    from routes.food import calculate_offer_discount
    offer_result = await calculate_offer_discount(order.store_id, order_items, subtotal)
    offer_discount = offer_result["discount"]
    offer_applied = offer_result["offer_applied"]
    free_items = offer_result["free_items"]
    
    # حساب خصم عروض الفلاش (Flash Sales)
    flash_discount = 0
    flash_sale_applied = None
    flash_items = []  # المنتجات المشمولة بالفلاش
    now = datetime.now(timezone.utc).isoformat()
    
    active_flash = await db.flash_sales.find_one({
        "is_active": True,
        "start_time": {"$lte": now},
        "end_time": {"$gte": now},
        "$or": [
            {"applicable_stores": []},
            {"applicable_stores": order.store_id}
        ]
    }, {"_id": 0})
    
    if active_flash:
        flash_type = active_flash.get("flash_type", "all")
        apply_flash = False
        eligible_subtotal = 0  # المجموع المؤهل للخصم
        
        if flash_type == "all":
            # جميع المنتجات
            if not active_flash.get("applicable_categories"):
                apply_flash = True
                eligible_subtotal = subtotal - offer_discount
            elif store.get("store_type") in active_flash.get("applicable_categories", []):
                apply_flash = True
                eligible_subtotal = subtotal - offer_discount
                
        elif flash_type == "categories":
            # فئات محددة
            if store.get("store_type") in active_flash.get("applicable_categories", []):
                apply_flash = True
                eligible_subtotal = subtotal - offer_discount
                
        elif flash_type == "products":
            # منتجات محددة فقط
            flash_product_ids = active_flash.get("applicable_products", [])
            if flash_product_ids:
                for item in order_items:
                    if item["product_id"] in flash_product_ids:
                        eligible_subtotal += item["price"] * item["quantity"]
                        flash_items.append({
                            "product_id": item["product_id"],
                            "name": item.get("name", ""),
                            "quantity": item["quantity"],
                            "original_price": item["price"],
                            "discount": item["price"] * item["quantity"] * (active_flash["discount_percentage"] / 100)
                        })
                if eligible_subtotal > 0:
                    apply_flash = True
        
        if apply_flash and eligible_subtotal > 0:
            flash_discount = eligible_subtotal * (active_flash["discount_percentage"] / 100)
            flash_sale_applied = active_flash
            # تحديث عداد الاستخدام
            await db.flash_sales.update_one(
                {"id": active_flash["id"]},
                {"$inc": {"usage_count": 1}}
            )
    
    # المجموع النهائي بعد جميع الخصومات
    total_discount = offer_discount + flash_discount
    
    # حساب رسوم التوصيل
    store_delivery_fee = store.get("delivery_fee", 5000)
    free_delivery_min = store.get("free_delivery_minimum", 0)
    
    # توصيل مجاني إذا تجاوز المجموع الحد الأدنى (بعد الخصم)
    final_subtotal = subtotal - total_discount
    if free_delivery_min > 0 and final_subtotal >= free_delivery_min:
        delivery_fee = 0
    else:
        delivery_fee = store_delivery_fee
    
    total = final_subtotal + delivery_fee
    
    # التحقق من رصيد المحفظة إذا كان الدفع بالمحفظة
    if order.payment_method == "wallet":
        wallet = await db.wallets.find_one({"user_id": user["id"]})
        balance = wallet.get("balance", 0) if wallet else 0
        if balance < total:
            raise HTTPException(status_code=400, detail="رصيد المحفظة غير كافي")
        
        # خصم من المحفظة
        await db.wallets.update_one(
            {"user_id": user["id"]},
            {"$inc": {"balance": -total}}
        )
        
        # تسجيل المعاملة
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "payment",
            "amount": -total,
            "description": f"طلب طعام من {store['name']}",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # إنشاء الطلب
    order_id = str(uuid.uuid4())
    order_number = f"FO{datetime.now().strftime('%y%m%d')}{str(uuid.uuid4())[:4].upper()}"
    now = datetime.now(timezone.utc)
    # مهلة الإلغاء لطلبات الطعام: 3 دقائق
    CANCEL_WINDOW_MINUTES = 3
    can_process_after = now + timedelta(minutes=CANCEL_WINDOW_MINUTES)
    
    order_doc = {
        "id": order_id,
        "order_number": order_number,
        "order_type": "food",
        "customer_id": user["id"],
        "customer_name": user["name"],
        "customer_phone": user.get("phone", order.delivery_phone),
        "store_id": order.store_id,
        "store_name": store["name"],
        "store_type": store["store_type"],
        "items": order_items,
        "subtotal": subtotal,
        "offer_discount": offer_discount,
        "offer_applied": {
            "id": offer_applied["id"] if offer_applied else None,
            "name": offer_applied["name"] if offer_applied else None,
            "type": offer_applied["offer_type"] if offer_applied else None
        } if offer_applied else None,
        "flash_discount": flash_discount,
        "flash_sale_applied": {
            "id": flash_sale_applied["id"] if flash_sale_applied else None,
            "name": flash_sale_applied["name"] if flash_sale_applied else None,
            "percentage": flash_sale_applied["discount_percentage"] if flash_sale_applied else None
        } if flash_sale_applied else None,
        "total_discount": total_discount,
        "free_items": free_items,
        "delivery_fee": delivery_fee,
        "total": total,
        "delivery_address": order.delivery_address,
        "delivery_city": order.delivery_city,
        "delivery_phone": order.delivery_phone,
        "notes": order.notes,
        "payment_method": order.payment_method,
        "payment_status": "paid" if order.payment_method == "wallet" else "pending",
        "status": "pending",
        "status_history": [{
            "status": "pending",
            "timestamp": now.isoformat(),
            "note": "تم استلام الطلب - ينتظر انتهاء مهلة الإلغاء"
        }],
        "estimated_delivery_time": store.get("delivery_time", 30),
        "driver_id": None,
        "created_at": now.isoformat(),
        "can_process_after": can_process_after.isoformat(),
        "cancel_window_minutes": CANCEL_WINDOW_MINUTES,
        "seller_notified": False,
        "driver_notified": False
    }
    
    await db.food_orders.insert_one(order_doc)
    
    # تحديث عداد استخدام العرض
    if offer_applied:
        await db.food_offers.update_one(
            {"id": offer_applied["id"]},
            {"$inc": {"usage_count": 1}}
        )
    
    # تحديث عدد طلبات المتجر
    await db.food_stores.update_one(
        {"id": order.store_id},
        {"$inc": {"orders_count": 1}}
    )
    
    # لا نرسل إشعار للمتجر فوراً - سيُرسل بعد انتهاء مهلة الإلغاء (3 دقائق)
    # الإشعار سيُرسل عند جلب الطلبات من قبل المتجر أو السائق
    
    return {
        "order_id": order_id,
        "order_number": order_number,
        "total": total,
        "estimated_time": store.get("delivery_time", 30),
        "cancel_window_minutes": CANCEL_WINDOW_MINUTES,
        "message": "تم إنشاء الطلب. يمكنك إلغاءه خلال 3 دقائق."
    }

@router.get("/my-orders")
async def get_my_food_orders(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """جلب طلبات العميل"""
    query = {"customer_id": user["id"], "order_type": "food"}
    if status:
        query["status"] = status
    
    orders = await db.food_orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    
    for order in orders:
        order["status_label"] = ORDER_STATUSES.get(order["status"], order["status"])
    
    return orders

@router.get("/seller")
async def get_seller_food_orders(user: dict = Depends(get_current_user)):
    """جلب طلبات الطعام للبائع"""
    if user.get("user_type") != "food_seller":
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول")
    
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        return []
    
    orders = await db.food_orders.find(
        {"store_id": store["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return orders or []

@router.get("/{order_id}")
async def get_food_order(order_id: str, user: dict = Depends(get_current_user)):
    """جلب تفاصيل طلب"""
    order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من الصلاحية
    if order["customer_id"] != user["id"]:
        store = await db.food_stores.find_one({"id": order["store_id"]})
        if not store or store["owner_id"] != user["id"]:
            if user["user_type"] not in ["admin", "delivery"]:
                raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    order["status_label"] = ORDER_STATUSES.get(order["status"], order["status"])
    return order

@router.post("/{order_id}/cancel")
async def cancel_food_order(order_id: str, user: dict = Depends(get_current_user)):
    """إلغاء طلب - مسموح فقط خلال 3 دقائق من إنشاء الطلب"""
    order = await db.food_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order["customer_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    # لا يمكن الإلغاء إذا كان الطلب في مرحلة متقدمة
    if order["status"] in ["out_for_delivery", "delivered", "cancelled"]:
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء الطلب في هذه المرحلة")
    
    # التحقق من مهلة الـ 3 دقائق
    created_at = datetime.fromisoformat(order["created_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    elapsed_seconds = (now - created_at).total_seconds()
    
    CANCEL_WINDOW_SECONDS = 3 * 60  # 3 دقائق
    
    if elapsed_seconds > CANCEL_WINDOW_SECONDS:
        raise HTTPException(
            status_code=400, 
            detail="انتهت مهلة الإلغاء (3 دقائق). لا يمكن إلغاء الطلب بعد هذه المدة"
        )
    
    # استرجاع المبلغ إذا كان الدفع بالمحفظة
    if order["payment_method"] == "wallet" and order["payment_status"] == "paid":
        await db.wallets.update_one(
            {"user_id": user["id"]},
            {"$inc": {"balance": order["total"]}}
        )
        
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "refund",
            "amount": order["total"],
            "description": f"استرجاع طلب طعام #{order['order_number']}",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # تحديث حالة الطلب
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()},
            "$push": {
                "status_history": {
                    "status": "cancelled",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": "تم إلغاء الطلب من قبل العميل"
                }
            }
        }
    )
    
    return {"message": "تم إلغاء الطلب"}

# ===============================
# طلبات المتجر
# ===============================

@router.get("/store/orders")
async def get_store_orders(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """جلب طلبات المتجر - فقط الطلبات التي انتهت مهلة إلغائها"""
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        raise HTTPException(status_code=404, detail="لا يوجد متجر مرتبط بحسابك")
    
    now = datetime.now(timezone.utc).isoformat()
    
    query = {
        "store_id": store["id"],
        "$or": [
            {"can_process_after": {"$lte": now}},
            {"can_process_after": {"$exists": False}}  # للطلبات القديمة
        ]
    }
    if status:
        query["status"] = status
    
    orders = await db.food_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(None)
    
    # إرسال إشعارات للطلبات الجديدة التي لم يُبلّغ عنها بعد
    for order in orders:
        order["status_label"] = ORDER_STATUSES.get(order["status"], order["status"])
        
        # إرسال إشعار للمتجر إذا لم يُرسل بعد
        if not order.get("seller_notified", False) and order["status"] == "pending":
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "title": "🍽️ طلب جديد!",
                "message": f"لديك طلب جديد #{order['order_number']} بقيمة {order['total']:,.0f} ل.س",
                "type": "new_food_order",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            # تحديث حالة الإشعار
            await db.food_orders.update_one(
                {"id": order["id"]},
                {"$set": {"seller_notified": True}}
            )
    
    return orders

@router.post("/store/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    new_status: str,
    note: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """تحديث حالة الطلب من المتجر أو المدير"""
    # المدير يمكنه تحديث أي طلب
    if user["user_type"] in ["admin", "sub_admin"]:
        order = await db.food_orders.find_one({"id": order_id})
        if not order:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        valid_statuses = list(ORDER_STATUSES.keys())
    else:
        store = await db.food_stores.find_one({"owner_id": user["id"]})
        if not store:
            raise HTTPException(status_code=403, detail="غير مصرح لك")
        
        order = await db.food_orders.find_one({"id": order_id, "store_id": store["id"]})
        if not order:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
        valid_statuses = ["confirmed", "preparing", "ready", "cancelled"]
    
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail="حالة غير صالحة")
    
    # تحديث الحالة
    update_data = {
        "status": new_status,
        "status_label": ORDER_STATUSES.get(new_status, new_status),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": update_data,
            "$push": {
                "status_history": {
                    "status": new_status,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": note or ORDER_STATUSES.get(new_status),
                    "updated_by": user["id"]
                }
            }
        }
    )
    
    # إشعار العميل
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": order["customer_id"],
        "title": "📦 تحديث طلبك",
        "message": f"طلبك #{order['order_number']}: {ORDER_STATUSES.get(new_status)}",
        "type": "order_status_update",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "تم تحديث حالة الطلب"}

# ===============================
# طلبات التوصيل
# ===============================

@router.get("/delivery/available")
async def get_available_food_orders(user: dict = Depends(get_current_user)):
    """جلب الطلبات المتاحة للتوصيل - فقط بعد انتهاء مهلة الإلغاء"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # الطلبات الجاهزة للاستلام وانتهت مهلة إلغائها
    orders = await db.food_orders.find(
        {
            "status": "ready",
            "driver_id": None,
            "$or": [
                {"can_process_after": {"$lte": now}},
                {"can_process_after": {"$exists": False}}
            ]
        },
        {"_id": 0}
    ).sort("created_at", 1).to_list(None)
    
    # إرسال إشعارات للطلبات الجديدة
    for order in orders:
        order["status_label"] = ORDER_STATUSES.get(order["status"], order["status"])
        
        # إرسال إشعار للسائق إذا لم يُرسل بعد
        if not order.get("driver_notified", False):
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "title": "🛵 طلب جاهز للتوصيل!",
                "message": f"طلب #{order['order_number']} من {order['store_name']} جاهز للاستلام",
                "type": "food_order_ready",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            # تحديث حالة الإشعار
            await db.food_orders.update_one(
                {"id": order["id"]},
                {"$set": {"driver_notified": True}}
            )
    
    return orders

@router.post("/delivery/{order_id}/accept")
async def accept_food_order(order_id: str, user: dict = Depends(get_current_user)):
    """قبول طلب توصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.food_orders.find_one({"id": order_id, "status": "ready", "driver_id": None})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير متاح")
    
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "driver_id": user["id"],
                "driver_name": user["name"],
                "driver_phone": user.get("phone"),
                "status": "out_for_delivery",
                "picked_up_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "status_history": {
                    "status": "out_for_delivery",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": f"جاري التوصيل بواسطة {user['name']}"
                }
            }
        }
    )
    
    # إشعار العميل
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": order["customer_id"],
        "title": "🚗 طلبك في الطريق!",
        "message": f"موظف التوصيل {user['name']} في طريقه إليك",
        "type": "order_out_for_delivery",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "تم قبول الطلب"}

@router.post("/delivery/{order_id}/complete")
async def complete_food_delivery(order_id: str, user: dict = Depends(get_current_user)):
    """إتمام التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.food_orders.find_one({"id": order_id, "driver_id": user["id"], "status": "out_for_delivery"})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "delivered",
                "delivered_at": datetime.now(timezone.utc).isoformat(),
                "payment_status": "paid"
            },
            "$push": {
                "status_history": {
                    "status": "delivered",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": "تم التوصيل بنجاح"
                }
            }
        }
    )
    
    # إشعار العميل
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": order["customer_id"],
        "title": "✅ تم التوصيل!",
        "message": f"طلبك #{order['order_number']} وصل. شكراً لك!",
        "type": "order_delivered",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # إضافة أرباح موظف التوصيل
    delivery_earning = 5000  # ربح ثابت لكل طلب
    await db.wallets.update_one(
        {"user_id": user["id"]},
        {"$inc": {"balance": delivery_earning}},
        upsert=True
    )
    
    return {"message": "تم إتمام التوصيل بنجاح"}

@router.get("/delivery/my-deliveries")
async def get_my_food_deliveries(user: dict = Depends(get_current_user)):
    """جلب طلبات التوصيل الخاصة بي"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    orders = await db.food_orders.find(
        {"driver_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(None)
    
    for order in orders:
        order["status_label"] = ORDER_STATUSES.get(order["status"], order["status"])
    
    return orders


# ===============================
# التقييمات والمراجعات
# ===============================

@router.post("/{order_id}/rate")
async def rate_food_order(order_id: str, rating_data: dict, user: dict = Depends(get_current_user)):
    """تقييم طلب الطعام (المتجر وموظف التوصيل)"""
    order = await db.food_orders.find_one({"id": order_id, "customer_id": user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order["status"] != "delivered":
        raise HTTPException(status_code=400, detail="لا يمكن تقييم طلب لم يتم توصيله بعد")
    
    if order.get("rating"):
        raise HTTPException(status_code=400, detail="تم تقييم هذا الطلب مسبقاً")
    
    store_rating = rating_data.get("store_rating")
    driver_rating = rating_data.get("driver_rating")
    comment = rating_data.get("comment", "")
    
    if not store_rating or store_rating < 1 or store_rating > 5:
        raise HTTPException(status_code=400, detail="تقييم المتجر مطلوب (1-5)")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # حفظ التقييم
    rating_doc = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "order_number": order["order_number"],
        "customer_id": user["id"],
        "customer_name": user["name"],
        "store_id": order["store_id"],
        "store_rating": store_rating,
        "driver_id": order.get("driver_id"),
        "driver_rating": driver_rating,
        "comment": comment,
        "created_at": now
    }
    
    await db.food_reviews.insert_one(rating_doc)
    
    # تحديث الطلب
    await db.food_orders.update_one(
        {"id": order_id},
        {"$set": {
            "rating": {
                "store_rating": store_rating,
                "driver_rating": driver_rating,
                "comment": comment,
                "rated_at": now
            }
        }}
    )
    
    # تحديث متوسط تقييم المتجر
    store_reviews = await db.food_reviews.find(
        {"store_id": order["store_id"]},
        {"store_rating": 1}
    ).to_list(None)
    
    if store_reviews:
        avg_rating = sum(r["store_rating"] for r in store_reviews) / len(store_reviews)
        await db.food_stores.update_one(
            {"id": order["store_id"]},
            {
                "$set": {"rating": round(avg_rating, 1)},
                "$inc": {"reviews_count": 1}
            }
        )
    
    # تحديث تقييم موظف التوصيل
    if driver_rating and order.get("driver_id"):
        driver_reviews = await db.food_reviews.find(
            {"driver_id": order["driver_id"], "driver_rating": {"$exists": True, "$ne": None}},
            {"driver_rating": 1}
        ).to_list(None)
        
        if driver_reviews:
            driver_avg = sum(r["driver_rating"] for r in driver_reviews) / len(driver_reviews)
            await db.users.update_one(
                {"id": order["driver_id"]},
                {"$set": {"rating": round(driver_avg, 1)}}
            )
            
            # إضافة نقاط مكافأة إذا كان التقييم 5 نجوم
            if driver_rating == 5:
                from core.database import create_notification_for_user
                await db.users.update_one(
                    {"id": order["driver_id"]},
                    {"$inc": {"behavior_points": 5}}
                )
                await create_notification_for_user(
                    user_id=order["driver_id"],
                    title="⭐ مكافأة تقييم!",
                    message="حصلت على +5 نقاط سلوك من تقييم 5 نجوم",
                    notification_type="bonus_points"
                )
    
    return {"message": "شكراً لتقييمك!"}


@router.get("/store/{store_id}/reviews")
async def get_store_reviews(
    store_id: str,
    skip: int = 0,
    limit: int = 20
):
    """جلب تقييمات متجر"""
    reviews = await db.food_reviews.find(
        {"store_id": store_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    
    # حساب الإحصائيات
    all_reviews = await db.food_reviews.find(
        {"store_id": store_id},
        {"store_rating": 1}
    ).to_list(None)
    
    stats = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    for r in all_reviews:
        rating_key = str(int(r["store_rating"]))
        stats[rating_key] = stats.get(rating_key, 0) + 1
    
    total = len(all_reviews)
    avg = sum(r["store_rating"] for r in all_reviews) / total if total > 0 else 0
    
    return {
        "reviews": reviews,
        "stats": {
            "total": total,
            "average": round(avg, 1),
            "distribution": stats
        }
    }



# ============== إلغاء الطلب من الأدمن ==============

class AdminCancelRequest(BaseModel):
    reason: str
    notify_customer: bool = True
    offer_replacement: bool = True

@router.post("/admin/{order_id}/cancel-with-penalty")
async def admin_cancel_order_with_penalty(
    order_id: str, 
    request: AdminCancelRequest,
    user: dict = Depends(get_current_user)
):
    """إلغاء طلب من الأدمن مع خصم من السائق (بعد الاستلام)"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمديرين فقط")
    
    order = await db.food_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="الطلب ملغي بالفعل")
    
    if order["status"] == "delivered":
        raise HTTPException(status_code=400, detail="الطلب تم توصيله بالفعل")
    
    driver_id = order.get("driver_id")
    penalty_amount = 0
    
    # إذا كان السائق قد استلم الطلب، نخصم منه قيمة الطعام (بدون رسوم التوصيل)
    if driver_id and order["status"] == "out_for_delivery":
        # قيمة الطعام فقط (بدون رسوم التوصيل)
        penalty_amount = order["subtotal"] - order.get("total_discount", 0)
        
        # خصم من رصيد السائق
        await db.wallets.update_one(
            {"user_id": driver_id},
            {"$inc": {"balance": -penalty_amount}},
            upsert=True
        )
        
        # تسجيل العملية
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": driver_id,
            "type": "penalty",
            "amount": -penalty_amount,
            "description": f"خصم بسبب إلغاء طلب #{order['order_number']} - {request.reason}",
            "order_id": order_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # إشعار السائق بالخصم
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": driver_id,
            "title": "⚠️ تم خصم مبلغ من رصيدك",
            "message": f"تم خصم {penalty_amount:,.0f} ل.س بسبب إلغاء طلب #{order['order_number']}",
            "type": "penalty",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # استرجاع المبلغ للعميل إذا كان الدفع بالمحفظة
    if order["payment_method"] == "wallet" and order["payment_status"] == "paid":
        await db.wallets.update_one(
            {"user_id": order["customer_id"]},
            {"$inc": {"balance": order["total"]}}
        )
        
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": order["customer_id"],
            "type": "refund",
            "amount": order["total"],
            "description": f"استرجاع طلب #{order['order_number']} - {request.reason}",
            "order_id": order_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # تحديث حالة الطلب
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_at": datetime.now(timezone.utc).isoformat(),
                "cancelled_by": "admin",
                "cancel_reason": request.reason,
                "driver_penalty": penalty_amount
            },
            "$push": {
                "status_history": {
                    "status": "cancelled",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": f"تم الإلغاء من الإدارة: {request.reason}"
                }
            }
        }
    )
    
    # إشعار العميل
    if request.notify_customer:
        message = f"تم إلغاء طلبك #{order['order_number']}\nالسبب: {request.reason}"
        if request.offer_replacement:
            message += "\n\nهل تريد إعادة الطلب؟ تواصل معنا عبر الدعم."
        
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": order["customer_id"],
            "title": "❌ تم إلغاء طلبك",
            "message": message,
            "type": "order_cancelled",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # إشعار المتجر
    store = await db.food_stores.find_one({"id": order["store_id"]})
    if store:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": store["owner_id"],
            "title": "❌ تم إلغاء طلب",
            "message": f"تم إلغاء طلب #{order['order_number']} من الإدارة\nالسبب: {request.reason}",
            "type": "order_cancelled",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "message": "تم إلغاء الطلب",
        "penalty_applied": penalty_amount > 0,
        "penalty_amount": penalty_amount,
        "refund_to_customer": order["total"] if order["payment_method"] == "wallet" else 0
    }


@router.get("/admin/support-phone")
async def get_support_phone():
    """جلب رقم الدعم"""
    setting = await db.settings.find_one({"key": "support_phone"})
    return {"phone": setting["value"] if setting else "0911111111"}
