# /app/backend/routes/orders.py
# مسارات الطلبات والدفع

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

from core.database import db, get_current_user, create_notification_for_user, create_notification_for_role
from models.schemas import OrderCreate, CartItem, ShamCashPayment
from routes.loyalty import add_loyalty_points

router = APIRouter(tags=["Orders"])

# ============== Order Tracking Status Flow ==============
# 1. pending_payment   - في انتظار الدفع (العميل)
# 2. paid              - تم الدفع (النظام تلقائي)
# 3. confirmed         - تم تأكيد الطلب (البائع)
# 4. preparing         - جاري التحضير (البائع)
# 5. shipped           - تم الشحن (البائع)
# 6. picked_up         - استلم موظف التوصيل (موظف التوصيل)
# 7. on_the_way        - في الطريق للعميل (موظف التوصيل)
# 8. delivered         - تم التسليم (موظف التوصيل)

ORDER_TRACKING_STEPS = [
    {"key": "pending_payment", "label": "في انتظار الدفع", "actor": "customer"},
    {"key": "paid", "label": "تم الدفع", "actor": "system"},
    {"key": "confirmed", "label": "تم تأكيد الطلب", "actor": "seller"},
    {"key": "preparing", "label": "جاري التحضير", "actor": "seller"},
    {"key": "shipped", "label": "تم الشحن", "actor": "seller"},
    {"key": "picked_up", "label": "استلم موظف التوصيل", "actor": "delivery"},
    {"key": "on_the_way", "label": "في الطريق للعميل", "actor": "delivery"},
    {"key": "delivered", "label": "تم التسليم", "actor": "delivery"},
]

# ============== Pydantic Models ==============

class CustomerNoteUpdate(BaseModel):
    delivery_note: str

# ============== Commission Helpers ==============

DEFAULT_CATEGORY_COMMISSIONS = {
    "إلكترونيات": 0.18,
    "أزياء": 0.17,
    "ملابس": 0.17,
    "أحذية": 0.21,
    "تجميل": 0.18,
    "مجوهرات": 0.16,
    "إكسسوارات": 0.16,
    "المنزل": 0.20,
    "رياضة": 0.16,
    "أطفال": 0.15,
    "كتب": 0.12,
    "ألعاب": 0.14,
    "default": 0.15,
}

async def get_commission_rates_from_db():
    rates = await db.commission_rates.find_one({"id": "main"}, {"_id": 0})
    if rates and rates.get("categories"):
        return rates["categories"]
    return DEFAULT_CATEGORY_COMMISSIONS

async def get_commission_rate(category: str) -> float:
    rates = await get_commission_rates_from_db()
    return rates.get(category, rates.get("default", 0.15))

async def calculate_commission(price: float, category: str) -> dict:
    rate = await get_commission_rate(category)
    commission = price * rate
    seller_amount = price - commission
    return {
        "price": price,
        "commission_rate": rate,
        "commission_percentage": f"{rate * 100:.0f}%",
        "commission_amount": commission,
        "seller_amount": seller_amount
    }

# ============== Orders ==============

@router.post("/orders")
async def create_order(order: OrderCreate, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="السلة فارغة")
    
    items_details = []
    total = 0
    total_commission = 0
    
    for item in cart["items"]:
        product = await db.products.find_one({"id": item["product_id"]})
        if not product:
            raise HTTPException(status_code=400, detail="منتج غير موجود")
        if product["stock"] < item["quantity"]:
            raise HTTPException(status_code=400, detail=f"الكمية غير متوفرة: {product['name']}")
        
        item_total = product["price"] * item["quantity"]
        
        category = product.get("category", "default")
        commission_info = await calculate_commission(item_total, category)
        item_commission = commission_info["commission_amount"]
        seller_amount = commission_info["seller_amount"]
        
        items_details.append({
            "product_id": item["product_id"],
            "product_name": product["name"],
            "seller_id": product["seller_id"],
            "price": product["price"],
            "quantity": item["quantity"],
            "selected_size": item.get("selected_size"),
            "item_total": item_total,
            "category": category,
            "commission_rate": commission_info["commission_rate"],
            "commission_amount": item_commission,
            "seller_amount": seller_amount,
            "image": product.get("images", [None])[0] if product.get("images") else product.get("image")
        })
        total += item_total
        total_commission += item_commission
    
    total_seller_amount = total - total_commission
    
    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    # مهلة الإلغاء للمنتجات: ساعة واحدة
    CANCEL_WINDOW_MINUTES = 60
    can_process_after = now + timedelta(minutes=CANCEL_WINDOW_MINUTES)
    
    # جلب إعدادات المنصة
    platform_settings = await db.platform_settings.find_one({"id": "main"})
    products_free_shipping_threshold = platform_settings.get("free_shipping_threshold", 150000) if platform_settings else 150000
    
    # التحقق من عرض الشحن المجاني الشامل
    global_free_shipping = await db.settings.find_one({"key": "global_free_shipping"})
    is_global_free_shipping = False
    if global_free_shipping and global_free_shipping.get("is_active"):
        applies_to = global_free_shipping.get("applies_to", "all")
        if applies_to in ["all", "products"]:
            # التحقق من تاريخ الانتهاء
            end_date = global_free_shipping.get("end_date")
            if end_date:
                end_datetime = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                # ضمان أن end_datetime يحتوي على معلومات المنطقة الزمنية
                if end_datetime.tzinfo is None:
                    end_datetime = end_datetime.replace(tzinfo=timezone.utc)
                if now <= end_datetime:
                    is_global_free_shipping = True
            else:
                is_global_free_shipping = True
    
    # حساب رسوم التوصيل
    # التحقق من الشحن المجاني: عرض شامل أو وصول للحد الأدنى
    is_free_shipping = is_global_free_shipping or (products_free_shipping_threshold > 0 and total >= products_free_shipping_threshold)
    
    # رسوم توصيل افتراضية من الإعدادات
    delivery_fees = platform_settings.get("delivery_fees", {}) if platform_settings else {}
    default_delivery_fee = delivery_fees.get("same_city", 5000)
    
    # أجرة السائق (يحصل عليها دائماً)
    driver_delivery_fee = order.delivery_fee if order.delivery_fee is not None else default_delivery_fee
    
    if is_free_shipping:
        delivery_fee = 0  # العميل لا يدفع
    elif order.delivery_fee is not None:
        delivery_fee = order.delivery_fee
    else:
        delivery_fee = default_delivery_fee
    
    delivery_distance_km = order.delivery_distance_km
    final_total = total + delivery_fee
    
    # توليد كود التسليم للعميل (4 أرقام)
    import random
    delivery_code = str(random.randint(1000, 9999))
    
    order_doc = {
        "id": order_id,
        "user_id": user["id"],
        "user_name": user.get("full_name", user.get("name", "")),
        "items": items_details,
        "subtotal": total,
        "delivery_fee": delivery_fee,
        "driver_delivery_fee": driver_delivery_fee,  # أجرة السائق (تُدفع دائماً)
        "is_platform_paid_delivery": is_free_shipping,  # هل المنصة تدفع أجرة التوصيل؟
        "delivery_distance_km": delivery_distance_km,
        "total": final_total,
        "total_commission": total_commission,
        "total_seller_amount": total_seller_amount,
        "address": order.address,
        "city": order.city,
        "phone": order.phone,
        "payment_method": order.payment_method,
        "payment_phone": order.payment_phone,
        "status": "pending_payment",
        "delivery_status": "pending",
        "delivery_code": delivery_code,  # كود التسليم للعميل
        "delivery_code_verified": False,
        "created_at": now.isoformat(),
        "can_process_after": can_process_after.isoformat(),
        "cancel_window_minutes": CANCEL_WINDOW_MINUTES,
        "latitude": order.latitude,
        "longitude": order.longitude
    }
    await db.orders.insert_one(order_doc)
    
    # Clear cart
    await db.carts.delete_one({"user_id": user["id"]})
    
    # Get low stock threshold from settings
    settings = await db.platform_settings.find_one({"id": "main"})
    LOW_STOCK_THRESHOLD = settings.get("low_stock_threshold", 5) if settings else 5
    
    for item in cart["items"]:
        await db.products.update_one(
            {"id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"], "sales_count": item["quantity"]}}
        )
        
        # Check if stock is low after this order
        updated_product = await db.products.find_one({"id": item["product_id"]})
        if updated_product and updated_product.get("stock", 0) <= LOW_STOCK_THRESHOLD:
            # Send low stock alert to seller
            await create_notification_for_user(
                user_id=updated_product["seller_id"],
                title="⚠️ تنبيه: مخزون منخفض!",
                message=f"المنتج '{updated_product['name']}' وصل إلى {updated_product['stock']} قطع فقط. قم بتحديث المخزون.",
                notification_type="low_stock",
                product_id=item["product_id"]
            )
    
    # لا نرسل إشعار للبائع فوراً - سيُرسل بعد انتهاء مهلة الإلغاء (ساعة)
    # البائع سيرى الطلب فقط بعد انتهاء المهلة
    # الإشعار سيُرسل عند تأكيد الطلب تلقائياً
    
    return {"order_id": order_id, "total": final_total, "commission": total_commission, "message": "تم إنشاء الطلب. يمكنك إلغاءه خلال ساعة."}

@router.get("/orders")
async def get_orders(user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    
    if user["user_type"] == "seller":
        # البائع يرى فقط الطلبات التي انتهت مهلة إلغائها
        orders = await db.orders.find(
            {
                "items.seller_id": user["id"],
                "$or": [
                    {"can_process_after": {"$lte": now}},
                    {"can_process_after": {"$exists": False}}  # للطلبات القديمة
                ]
            },
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    elif user["user_type"] == "delivery":
        # السائق يرى فقط الطلبات الجاهزة للتوصيل
        orders = await db.orders.find(
            {
                "delivery_status": {"$in": ["shipped", "picked_up", "on_the_way"]},
                "$or": [
                    {"can_process_after": {"$lte": now}},
                    {"can_process_after": {"$exists": False}}
                ]
            },
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    else:
        # العميل يرى جميع طلباته
        orders = await db.orders.find(
            {"user_id": user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    return orders

@router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if order["user_id"] != user["id"] and user["user_type"] not in ["seller", "admin", "sub_admin", "delivery"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    return order

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str = Query(...), user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["seller", "admin", "sub_admin", "delivery"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    old_status = order.get("delivery_status", "pending")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"delivery_status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Send notifications based on status
    customer_id = order["user_id"]
    status_messages = {
        "confirmed": ("تم تأكيد طلبك", "طلبك قيد التجهيز الآن"),
        "processing": ("جاري تجهيز طلبك", "البائع يجهز طلبك للشحن"),
        "shipped": ("تم شحن طلبك", "طلبك في الطريق إليك"),
        "out_for_delivery": ("طلبك في الطريق!", "موظف التوصيل في طريقه إليك"),
        "delivered": ("تم التسليم!", "تم تسليم طلبك بنجاح. شكراً لك!"),
        "cancelled": ("تم إلغاء الطلب", "تم إلغاء طلبك")
    }
    
    if status in status_messages:
        title, message = status_messages[status]
        await create_notification_for_user(
            user_id=customer_id,
            title=title,
            message=message,
            notification_type="order_status",
            order_id=order_id
        )
    
    # Notify delivery when order is ready
    if status == "shipped":
        await create_notification_for_role(
            role="delivery",
            title="طلب جاهز للتوصيل",
            message=f"طلب جديد جاهز للتوصيل إلى {order.get('city', '')}",
            notification_type="delivery_ready",
            order_id=order_id
        )
    
    return {"message": "تم تحديث حالة الطلب", "old_status": old_status, "new_status": status}

# ============== Payment ==============

@router.post("/payment/shamcash/init")
async def init_shamcash_payment(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    return {
        "message": "تم إرسال رمز التحقق إلى رقم شام كاش",
        "order_id": order_id,
        "amount": order["total"]
    }

@router.post("/payment/shamcash/verify")
async def verify_shamcash_payment(payment: ShamCashPayment, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": payment.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # Simulated verification - accept any 6-digit OTP
    if len(payment.otp) == 6 and payment.otp.isdigit():
        await db.orders.update_one(
            {"id": payment.order_id},
            {"$set": {"status": "paid", "payment_verified_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # إضافة نقاط الولاء للعميل
        points_earned = await add_loyalty_points(
            user_id=order["user_id"],
            order_total=order["total"],
            order_id=payment.order_id
        )
        
        return {
            "success": True, 
            "message": "تم الدفع بنجاح",
            "loyalty_points_earned": points_earned
        }
    else:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")

# ============== Commission Calculation API ==============

@router.get("/commission/calculate")
async def calculate_product_commission(price: float, category: str):
    result = await calculate_commission(price, category)
    return result

# ============== Order Tracking System ==============

@router.get("/orders/{order_id}/tracking")
async def get_order_tracking(order_id: str, user: dict = Depends(get_current_user)):
    """الحصول على معلومات تتبع الطلب الكاملة"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من الصلاحيات
    is_customer = order["user_id"] == user["id"]
    is_seller = user["user_type"] == "seller" and any(item["seller_id"] == user["id"] for item in order.get("items", []))
    is_delivery = user["user_type"] == "delivery" and order.get("delivery_driver_id") == user["id"]
    is_admin = user["user_type"] in ["admin", "sub_admin"]
    
    if not any([is_customer, is_seller, is_delivery, is_admin]):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # بناء معلومات التتبع
    tracking_info = {
        "order_id": order_id,
        "status": order.get("status", "pending_payment"),
        "delivery_status": order.get("delivery_status", "pending"),
        "tracking_history": order.get("tracking_history", []),
        "delivery_note": order.get("delivery_note", ""),
        "created_at": order.get("created_at"),
        "steps": ORDER_TRACKING_STEPS
    }
    
    # معلومات موظف التوصيل (للعميل والبائع)
    if order.get("delivery_driver_id") and (is_customer or is_seller or is_admin):
        driver = await db.users.find_one({"id": order["delivery_driver_id"]}, {"_id": 0, "password": 0})
        if driver:
            # جلب تقييم السائق
            driver_rating = await db.reviews.aggregate([
                {"$match": {"reviewed_id": driver["id"], "review_type": "delivery"}},
                {"$group": {"_id": None, "avg": {"$avg": "$rating"}}}
            ]).to_list(1)
            rating = driver_rating[0]["avg"] if driver_rating else 5.0
            
            driver_info = {
                "id": driver["id"],
                "name": driver.get("full_name", driver.get("name", "")),
                "photo": driver.get("photo", ""),
                "phone": driver.get("phone", ""),  # رقم الهاتف يظهر للجميع
                "rating": rating
            }
            tracking_info["delivery_driver"] = driver_info
            
            # الوقت المتوقع للوصول
            if order.get("estimated_arrival_minutes"):
                tracking_info["estimated_arrival_minutes"] = order["estimated_arrival_minutes"]
    
    # معلومات البائع (لموظف التوصيل)
    if is_delivery:
        seller_ids = set(item["seller_id"] for item in order.get("items", []))
        sellers_info = []
        for seller_id in seller_ids:
            seller = await db.users.find_one({"id": seller_id}, {"_id": 0, "password": 0})
            if seller:
                store = await db.stores.find_one({"seller_id": seller_id}, {"_id": 0})
                sellers_info.append({
                    "id": seller["id"],
                    "name": seller.get("full_name", seller.get("name", "")),
                    "phone": seller.get("phone", ""),
                    "store_name": store.get("name", "") if store else "",
                    "store_address": store.get("address", "") if store else ""
                })
        tracking_info["sellers"] = sellers_info
        
        # معلومات العميل (لموظف التوصيل)
        tracking_info["customer"] = {
            "name": order.get("user_name", ""),
            "phone": order.get("phone", ""),
            "address": order.get("address", ""),
            "city": order.get("city", ""),
            "delivery_note": order.get("delivery_note", "")
        }
    
    return tracking_info

@router.put("/orders/{order_id}/delivery-note")
async def update_delivery_note(order_id: str, note: CustomerNoteUpdate, user: dict = Depends(get_current_user)):
    """إضافة/تعديل ملاحظة العميل لموظف التوصيل"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="يمكن للعميل فقط إضافة ملاحظة")
    
    # لا يمكن تعديل الملاحظة بعد التسليم
    if order.get("delivery_status") == "delivered":
        raise HTTPException(status_code=400, detail="لا يمكن تعديل الملاحظة بعد التسليم")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "delivery_note": note.delivery_note,
            "delivery_note_updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # إشعار موظف التوصيل إذا كان الطلب معين له
    if order.get("delivery_driver_id"):
        await create_notification_for_user(
            user_id=order["delivery_driver_id"],
            title="ملاحظة جديدة من العميل",
            message=f"أضاف العميل ملاحظة: {note.delivery_note[:50]}...",
            notification_type="delivery_note",
            order_id=order_id
        )
    
    return {"message": "تم حفظ الملاحظة"}

# ============== Seller Order Management ==============

@router.post("/orders/{order_id}/seller/confirm")
async def seller_confirm_order(order_id: str, user: dict = Depends(get_current_user)):
    """البائع يؤكد استلام الطلب"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التأكد أن البائع صاحب المنتج
    if not any(item["seller_id"] == user["id"] for item in order.get("items", [])):
        raise HTTPException(status_code=403, detail="هذا الطلب لا يخصك")
    
    if order.get("status") != "paid":
        raise HTTPException(status_code=400, detail="الطلب لم يتم دفعه بعد")
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "delivery_status": "confirmed",
                "confirmed_at": datetime.now(timezone.utc).isoformat(),
                "confirmed_by": user["id"]
            },
            "$push": {
                "tracking_history": {
                    "status": "confirmed",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "actor": user.get("full_name", user.get("name", "")),
                    "actor_type": "seller"
                }
            }
        }
    )
    
    await create_notification_for_user(
        user_id=order["user_id"],
        title=f"✅ تم تأكيد طلبك #{order_id[:8]}",
        message=f"البائع: {user.get('full_name', 'المتجر')}\nسيبدأ التحضير قريباً",
        notification_type="order_status",
        order_id=order_id
    )
    
    return {"message": "تم تأكيد الطلب"}

@router.post("/orders/{order_id}/seller/preparing")
async def seller_preparing_order(order_id: str, user: dict = Depends(get_current_user)):
    """البائع يبدأ تحضير الطلب"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if not any(item["seller_id"] == user["id"] for item in order.get("items", [])):
        raise HTTPException(status_code=403, detail="هذا الطلب لا يخصك")
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "delivery_status": "preparing",
                "preparing_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "tracking_history": {
                    "status": "preparing",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "actor": user.get("full_name", user.get("name", "")),
                    "actor_type": "seller"
                }
            }
        }
    )
    
    # جلب أسماء المنتجات للإشعار التفصيلي
    product_names = [item.get("product_name", "منتج") for item in order.get("items", [])[:2]]
    products_text = "، ".join(product_names)
    if len(order.get("items", [])) > 2:
        products_text += f" و{len(order.get('items', [])) - 2} أخرى"
    
    await create_notification_for_user(
        user_id=order["user_id"],
        title=f"📦 جاري تحضير طلبك #{order_id[:8]}",
        message=f"المنتجات: {products_text}\nالوقت المتوقع للشحن: اليوم",
        notification_type="order_status",
        order_id=order_id
    )
    
    return {"message": "تم تحديث حالة الطلب"}

@router.post("/orders/{order_id}/seller/shipped")
async def seller_ship_order(order_id: str, tracking_number: Optional[str] = None, user: dict = Depends(get_current_user)):
    """البائع يشحن الطلب - يُنشئ كود استلام للسائق"""
    import random
    
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if not any(item["seller_id"] == user["id"] for item in order.get("items", [])):
        raise HTTPException(status_code=403, detail="هذا الطلب لا يخصك")
    
    # إنشاء كود استلام من البائع (4 أرقام)
    pickup_code = str(random.randint(1000, 9999))
    
    # جلب إعدادات وقت الإغلاق
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    closing_hour = settings.get("closing_hour", 21) if settings else 21  # الافتراضي 9 مساءً
    
    update_data = {
        "delivery_status": "shipped",
        "shipped_at": datetime.now(timezone.utc).isoformat(),
        "pickup_code": pickup_code,
        "pickup_code_verified": False,
        "expected_delivery": "today",
        "delivery_deadline_hour": closing_hour
    }
    if tracking_number:
        update_data["tracking_number"] = tracking_number
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": update_data,
            "$push": {
                "tracking_history": {
                    "status": "shipped",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "actor": user.get("full_name", user.get("name", "")),
                    "actor_type": "seller",
                    "tracking_number": tracking_number
                }
            }
        }
    )
    
    # إشعار العميل مع موعد التوصيل
    await create_notification_for_user(
        user_id=order["user_id"],
        title=f"🚚 تم شحن طلبك #{order_id[:8]}",
        message=f"طلبك جاهز وسيصلك اليوم قبل الساعة {closing_hour}:00\nسيتم إعلامك فور استلام موظف التوصيل",
        notification_type="order_status",
        order_id=order_id
    )
    
    # إشعار موظفي التوصيل
    await create_notification_for_role(
        role="delivery",
        title="📦 طلب جاهز للتوصيل",
        message=f"طلب جديد جاهز للتوصيل\nالمنطقة: {order.get('shipping_address', {}).get('area', order.get('city', ''))}",
        notification_type="delivery_ready",
        order_id=order_id
    )
    
    return {
        "message": "تم شحن الطلب",
        "pickup_code": pickup_code,
        "note": "أعطِ هذا الكود لموظف التوصيل عند الاستلام"
    }

# ============== Delivery Driver Order Management ==============

class VerifyProductPickupCode(BaseModel):
    code: str

@router.post("/orders/{order_id}/delivery/verify-pickup")
async def verify_product_pickup_code(order_id: str, data: VerifyProductPickupCode, user: dict = Depends(get_current_user)):
    """التحقق من كود استلام المنتج من البائع"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من أن الطلب مخصص لهذا السائق
    if order.get("delivery_driver_id") and order.get("delivery_driver_id") != user["id"]:
        raise HTTPException(status_code=403, detail="هذا الطلب مخصص لسائق آخر")
    
    # التحقق من الكود
    correct_code = order.get("pickup_code")
    if not correct_code:
        raise HTTPException(status_code=400, detail="لا يوجد كود استلام لهذا الطلب")
    
    if data.code != correct_code:
        raise HTTPException(status_code=400, detail="كود الاستلام غير صحيح")
    
    # تحديث الطلب
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "pickup_code_verified": True,
                "pickup_code_verified_at": datetime.now(timezone.utc).isoformat(),
                "delivery_driver_id": user["id"],
                "delivery_driver_name": user.get("full_name", user.get("name", "")),
                "delivery_driver_phone": user.get("phone", ""),
                "delivery_status": "picked_up",
                "picked_up_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "tracking_history": {
                    "status": "picked_up",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "actor": user.get("full_name", user.get("name", "")),
                    "actor_type": "delivery",
                    "note": "تم التحقق من كود الاستلام"
                }
            }
        }
    )
    
    # إشعار العميل
    await create_notification_for_user(
        user_id=order["user_id"],
        title=f"📦 تم استلام طلبك #{order_id[:8]}",
        message=f"موظف التوصيل {user.get('full_name', '')} استلم طلبك وسيصلك اليوم",
        notification_type="order_status",
        order_id=order_id
    )
    
    # إشعار البائع
    for item in order.get("items", []):
        seller_id = item.get("seller_id")
        if seller_id:
            await create_notification_for_user(
                user_id=seller_id,
                title=f"✅ تم استلام الطلب #{order_id[:8]}",
                message=f"موظف التوصيل {user.get('full_name', '')} استلم الطلب",
                notification_type="order_pickup",
                order_id=order_id
            )
    
    return {
        "success": True,
        "message": "تم التحقق من الكود واستلام الطلب بنجاح"
    }

@router.get("/orders/{order_id}/seller/pickup-code")
async def get_seller_pickup_code(order_id: str, user: dict = Depends(get_current_user)):
    """البائع يحصل على كود الاستلام لإعطائه للسائق"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if not any(item["seller_id"] == user["id"] for item in order.get("items", [])):
        raise HTTPException(status_code=403, detail="هذا الطلب لا يخصك")
    
    pickup_code = order.get("pickup_code")
    if not pickup_code:
        raise HTTPException(status_code=400, detail="لم يتم شحن الطلب بعد")
    
    return {
        "pickup_code": pickup_code,
        "is_verified": order.get("pickup_code_verified", False),
        "order_id": order_id
    }

@router.post("/orders/{order_id}/delivery/pickup")
async def delivery_pickup_order(order_id: str, user: dict = Depends(get_current_user)):
    """موظف التوصيل يستلم الطلب من البائع"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # التحقق من اعتماد الحساب
    doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
        {"_id": 0}
    )
    if not doc or doc.get("status") != "approved":
        raise HTTPException(status_code=403, detail="يجب اعتماد حسابك أولاً")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("delivery_status") not in ["shipped"]:
        raise HTTPException(status_code=400, detail="الطلب غير جاهز للاستلام")
    
    if order.get("delivery_driver_id") and order.get("delivery_driver_id") != user["id"]:
        raise HTTPException(status_code=400, detail="هذا الطلب مسند لموظف آخر")
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "delivery_driver_id": user["id"],
                "delivery_driver_name": user.get("full_name", user.get("name", "")),
                "delivery_driver_phone": user.get("phone", ""),
                "delivery_driver_photo": user.get("photo", ""),
                "delivery_status": "picked_up",
                "picked_up_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "tracking_history": {
                    "status": "picked_up",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "actor": user.get("full_name", user.get("name", "")),
                    "actor_type": "delivery",
                    "actor_phone": user.get("phone", "")
                }
            }
        }
    )
    
    # جلب تقييم موظف التوصيل
    driver_rating = await db.reviews.aggregate([
        {"$match": {"reviewed_id": user["id"], "review_type": "delivery"}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}}}
    ]).to_list(1)
    rating = driver_rating[0]["avg"] if driver_rating else 5.0
    rating_stars = "⭐" * int(round(rating))
    
    # إشعار العميل التفصيلي مع معلومات السائق
    await create_notification_for_user(
        user_id=order["user_id"],
        title="🚚 تم تسليم طلبك لموظف التوصيل",
        message=f"السائق: {user.get('full_name', user.get('name', ''))}\nالتقييم: {rating_stars} ({rating:.1f})\n📞 للتواصل: {user.get('phone', '')}\nالوصول المتوقع: خلال 45 دقيقة",
        notification_type="delivery",
        order_id=order_id,
        extra_data={
            "driver_id": user["id"],
            "driver_name": user.get("full_name", user.get("name", "")),
            "driver_phone": user.get("phone", ""),
            "driver_photo": user.get("photo", ""),
            "driver_rating": rating
        }
    )
    
    # إشعار البائع
    seller_ids = set(item["seller_id"] for item in order.get("items", []))
    for seller_id in seller_ids:
        await create_notification_for_user(
            user_id=seller_id,
            title="📦 تم استلام الطلب من المتجر",
            message=f"موظف التوصيل: {user.get('full_name', user.get('name', ''))}\nرقم الطلب: #{order_id[:8]}",
            notification_type="delivery",
            order_id=order_id
        )
    
    return {"message": "تم استلام الطلب"}

@router.post("/orders/{order_id}/delivery/on-the-way")
async def delivery_on_the_way(order_id: str, body: dict = None, user: dict = Depends(get_current_user)):
    """موظف التوصيل في الطريق للعميل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("delivery_driver_id") != user["id"]:
        raise HTTPException(status_code=403, detail="هذا الطلب ليس مسنداً إليك")
    
    # الوقت المتوقع من السائق
    estimated_minutes = 30
    if body and body.get("estimated_minutes"):
        estimated_minutes = body.get("estimated_minutes")
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "delivery_status": "on_the_way",
                "on_the_way_at": datetime.now(timezone.utc).isoformat(),
                "estimated_arrival_minutes": estimated_minutes
            },
            "$push": {
                "tracking_history": {
                    "status": "on_the_way",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "actor": user.get("full_name", user.get("name", "")),
                    "actor_type": "delivery",
                    "estimated_minutes": estimated_minutes
                }
            }
        }
    )
    
    # إشعار العميل مع الوقت المتوقع من السائق
    shipping_address = order.get("shipping_address", {})
    area = shipping_address.get("area", order.get("city", ""))
    
    # جلب تقييم موظف التوصيل
    driver_rating = await db.reviews.aggregate([
        {"$match": {"reviewed_id": user["id"], "review_type": "delivery"}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}}}
    ]).to_list(1)
    rating = driver_rating[0]["avg"] if driver_rating else 5.0
    rating_stars = "⭐" * int(round(rating))
    
    await create_notification_for_user(
        user_id=order["user_id"],
        title="🚗 طلبك في الطريق!",
        message=f"السائق: {user.get('full_name', user.get('name', ''))}\nالتقييم: {rating_stars} ({rating:.1f})\n📞 {user.get('phone', '')}\n📍 {area}\n⏱️ الوصول خلال: {estimated_minutes} دقيقة",
        notification_type="delivery",
        order_id=order_id,
        extra_data={
            "driver_id": user["id"],
            "driver_name": user.get("full_name", user.get("name", "")),
            "driver_phone": user.get("phone", ""),
            "driver_photo": user.get("photo", ""),
            "driver_rating": rating,
            "estimated_minutes": estimated_minutes
        }
    )
    
    return {"message": "تم تحديث الحالة", "estimated_minutes": estimated_minutes}


# ============== نظام تأكيد التسليم بالكود ==============

class VerifyDeliveryCode(BaseModel):
    delivery_code: str

@router.post("/orders/{order_id}/delivery/verify-code")
async def verify_shop_delivery_code(
    order_id: str, 
    data: VerifyDeliveryCode, 
    user: dict = Depends(get_current_user)
):
    """التحقق من كود التسليم من العميل وإتمام الطلب"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.orders.find_one({
        "id": order_id, 
        "delivery_driver_id": user["id"], 
        "delivery_status": "on_the_way"
    })
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود أو ليس مسنداً إليك")
    
    # التحقق من الكود
    if order.get("delivery_code") != data.delivery_code:
        raise HTTPException(status_code=400, detail="كود التسليم غير صحيح")
    
    # تحديث حالة الطلب
    now = datetime.now(timezone.utc)
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "delivery_status": "delivered",
                "status": "completed",
                "delivered_at": now.isoformat(),
                "delivery_code_verified": True,
                "delivery_code_verified_at": now.isoformat()
            },
            "$push": {
                "tracking_history": {
                    "status": "delivered",
                    "timestamp": now.isoformat(),
                    "actor": user.get("full_name", user.get("name", "")),
                    "actor_type": "delivery",
                    "note": "تم التسليم بكود التأكيد من العميل"
                }
            }
        }
    )
    
    # إشعار العميل بالتسليم مع طلب التقييم
    await create_notification_for_user(
        user_id=order["user_id"],
        title="🎉 تم تسليم طلبك بنجاح!",
        message=f"رقم الطلب: #{order_id[:8]}\n⭐ قيّم تجربتك مع موظف التوصيل\n🛍️ قيّم المنتجات\nشكراً لتسوقك معنا!",
        notification_type="delivery",
        order_id=order_id,
        extra_data={
            "action": "rate",
            "driver_id": user["id"],
            "show_rating_prompt": True
        }
    )
    
    # إشعار البائع
    seller_ids = set(item["seller_id"] for item in order.get("items", []))
    for seller_id in seller_ids:
        await create_notification_for_user(
            user_id=seller_id,
            title="✅ تم تسليم الطلب",
            message=f"رقم الطلب: #{order_id[:8]}\nتم تسليم طلبك للعميل بنجاح",
            notification_type="delivery",
            order_id=order_id
        )
    
    # إضافة أجرة التوصيل لمحفظة موظف التوصيل
    delivery_fee = order.get("driver_delivery_fee", order.get("delivery_fee", 5000))
    await db.wallets.update_one(
        {"user_id": user["id"]},
        {
            "$inc": {"balance": delivery_fee, "total_earned": delivery_fee},
            "$push": {
                "transactions": {
                    "id": str(uuid.uuid4()),
                    "type": "delivery_earning",
                    "amount": delivery_fee,
                    "order_id": order_id,
                    "timestamp": now.isoformat(),
                    "description": f"أجرة توصيل طلب #{order_id[:8]}"
                }
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "تم التحقق من الكود وإتمام التسليم بنجاح",
        "delivery_fee": delivery_fee
    }


@router.post("/orders/{order_id}/delivery/delivered")
async def delivery_complete(order_id: str, delivery_photo: Optional[str] = None, user: dict = Depends(get_current_user)):
    """موظف التوصيل يؤكد التسليم - يتطلب كود التسليم أولاً"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # التحقق من وجود طلبات طعام ساخنة/طازجة نشطة فقط
    # الطلبات الباردة/الجافة (ماركت، خضار) لا تمنع تسليم المنتجات
    HOT_FRESH_STORE_TYPES = ["restaurants", "cafes", "bakery", "drinks", "sweets"]
    
    active_food_orders = await db.food_orders.find({
        "driver_id": user["id"],
        "status": {"$in": ["accepted", "out_for_delivery", "picked_up"]}
    }).to_list(length=100)
    
    # حساب عدد الطلبات الساخنة/الطازجة فقط
    hot_fresh_count = 0
    for fo in active_food_orders:
        store = await db.food_stores.find_one({"id": fo.get("store_id")})
        store_type = store.get("store_type", "restaurants") if store else "restaurants"
        if store_type in HOT_FRESH_STORE_TYPES:
            hot_fresh_count += 1
    
    if hot_fresh_count > 0:
        raise HTTPException(
            status_code=403, 
            detail=f"🔥 لديك {hot_fresh_count} طلب طعام ساخن/طازج. أكمل توصيله أولاً لضمان وصوله طازجاً"
        )
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("delivery_driver_id") != user["id"]:
        raise HTTPException(status_code=403, detail="هذا الطلب ليس مسنداً إليك")
    
    # التحقق من أن كود التسليم تم التحقق منه
    if order.get("delivery_code") and not order.get("delivery_code_verified"):
        raise HTTPException(
            status_code=400, 
            detail="يجب إدخال كود التسليم من العميل أولاً. استخدم /delivery/verify-code"
        )
    
    update_data = {
        "delivery_status": "delivered",
        "status": "completed",
        "delivered_at": datetime.now(timezone.utc).isoformat()
    }
    if delivery_photo:
        update_data["delivery_proof_photo"] = delivery_photo
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": update_data,
            "$push": {
                "tracking_history": {
                    "status": "delivered",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "actor": user.get("full_name", user.get("name", "")),
                    "actor_type": "delivery",
                    "proof_photo": delivery_photo
                }
            }
        }
    )
    
    # إشعار العميل بالتسليم مع طلب التقييم
    await create_notification_for_user(
        user_id=order["user_id"],
        title="🎉 تم تسليم طلبك بنجاح!",
        message=f"رقم الطلب: #{order_id[:8]}\n⭐ قيّم تجربتك مع موظف التوصيل\n🛍️ قيّم المنتجات\nشكراً لتسوقك معنا!",
        notification_type="delivery",
        order_id=order_id,
        extra_data={
            "action": "rate",
            "driver_id": user["id"],
            "show_rating_prompt": True
        }
    )
    
    # إشعار البائع
    seller_ids = set(item["seller_id"] for item in order.get("items", []))
    for seller_id in seller_ids:
        await create_notification_for_user(
            user_id=seller_id,
            title="✅ تم تسليم الطلب",
            message=f"رقم الطلب: #{order_id[:8]}\nتم تسليم طلبك للعميل بنجاح",
            notification_type="delivery",
            order_id=order_id
        )
    
    # إضافة أجرة التوصيل لمحفظة موظف التوصيل
    delivery_fee = order.get("delivery_fee", 5000)
    await db.wallets.update_one(
        {"user_id": user["id"]},
        {
            "$inc": {"balance": delivery_fee, "total_earned": delivery_fee},
            "$push": {
                "transactions": {
                    "id": str(uuid.uuid4()),
                    "type": "delivery_earning",
                    "amount": delivery_fee,
                    "order_id": order_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "description": f"أجرة توصيل طلب #{order_id[:8]}"
                }
            }
        },
        upsert=True
    )
    
    return {"message": "تم تأكيد التسليم", "delivery_fee": delivery_fee}



# ============== Seller Commission Info ==============

@router.get("/seller/commission")
async def get_seller_commission_info(user: dict = Depends(get_current_user)):
    """جلب معلومات العمولة للبائع"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    # جلب منتجات البائع لتحديد الفئات
    products = await db.products.find(
        {"seller_id": user["id"]},
        {"category": 1}
    ).to_list(100)
    
    # جمع الفئات الفريدة
    categories = list(set(p.get("category", "default") for p in products))
    
    # جلب نسب العمولات لكل فئة
    rates = await get_commission_rates_from_db()
    
    category_rates = {}
    for cat in categories:
        rate = rates.get(cat, rates.get("default", 0.15))
        category_rates[cat] = {
            "rate": rate,
            "percentage": f"{int(rate * 100)}%"
        }
    
    # حساب متوسط العمولة
    if categories:
        avg_rate = sum(rates.get(c, rates.get("default", 0.15)) for c in categories) / len(categories)
    else:
        avg_rate = rates.get("default", 0.15)
    
    # جلب إحصائيات الطلبات
    orders = await db.orders.find(
        {"items.seller_id": user["id"], "status": "delivered"},
        {"items": 1}
    ).to_list(1000)
    
    total_sales = 0
    total_commission = 0
    
    for order in orders:
        for item in order.get("items", []):
            if item.get("seller_id") == user["id"]:
                total_sales += item.get("item_total", 0)
                total_commission += item.get("commission_amount", 0)
    
    total_earnings = total_sales - total_commission
    
    return {
        "average_commission_rate": avg_rate,
        "commission_percentage": f"{int(avg_rate * 100)}%",
        "category_rates": category_rates,
        "total_sales": total_sales,
        "total_commission_paid": total_commission,
        "total_earnings": total_earnings,
        "products_count": len(products),
        "message": f"متوسط نسبة العمولة هو {int(avg_rate * 100)}% من قيمة كل طلب"
    }
