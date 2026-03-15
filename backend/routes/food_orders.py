# /app/backend/routes/food_orders.py
# مسارات طلبات الطعام

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid

from core.database import db, get_current_user

router = APIRouter(prefix="/food/orders", tags=["Food Orders"])

# ============== تصنيفات أنواع المتاجر للتوصيل ==============
# ساخن/طازج: يحتاج توصيل سريع (حد أقصى 2 طلبات)
HOT_FRESH_STORE_TYPES = ["restaurants", "cafes", "bakery", "drinks", "sweets"]
# بارد/جاف: يتحمل الانتظار (حد أقصى 5 طلبات)
COLD_DRY_STORE_TYPES = ["market", "vegetables"]

# الحدود الافتراضية
DEFAULT_HOT_FRESH_LIMIT = 2  # طلبات ساخنة/طازجة
DEFAULT_COLD_DRY_LIMIT = 5   # طلبات باردة/جافة

def get_store_delivery_category(store_type: str) -> str:
    """تحديد تصنيف التوصيل للمتجر (hot_fresh أو cold_dry)"""
    if store_type in HOT_FRESH_STORE_TYPES:
        return "hot_fresh"
    elif store_type in COLD_DRY_STORE_TYPES:
        return "cold_dry"
    else:
        # افتراضياً نعامله كساخن/طازج للأمان
        return "hot_fresh"

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
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None
    notes: Optional[str] = None
    payment_method: str = "wallet"  # wallet, cash
    batch_id: Optional[str] = None  # معرف الدفعة للطلبات المجمعة
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # رسوم التوصيل
    delivery_fee: Optional[float] = None
    delivery_distance_km: Optional[float] = None


class BatchOrderItem(BaseModel):
    store_id: str
    items: List[FoodOrderItem]
    notes: Optional[str] = None


class BatchOrderCreate(BaseModel):
    orders: List[BatchOrderItem]
    delivery_address: str
    delivery_city: str
    delivery_phone: str
    payment_method: str = "wallet"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


# ===============================
# دوال مساعدة للطلبات التجميعية
# ===============================

async def check_batch_readiness_and_notify_driver(batch_id: str, ready_order_id: str):
    """
    تحقق من جهوزية جميع طلبات الدفعة وأرسل إشعار للسائق
    مع ترتيب الاستلام الأمثل (الأبعد عن العميل أولاً)
    """
    # جلب جميع طلبات الدفعة
    batch_orders = await db.food_orders.find({"batch_id": batch_id}).to_list(None)
    
    if not batch_orders:
        return
    
    # حساب عدد الطلبات الجاهزة
    ready_orders = [o for o in batch_orders if o.get("status") == "ready"]
    total_orders = len(batch_orders)
    ready_count = len(ready_orders)
    
    # إذا جهز أول طلب (حوالي 50% أو أكثر)، أرسل إشعار للسائقين
    ready_percentage = (ready_count / total_orders) * 100
    
    # إذا جهز على الأقل طلب واحد ولم يتم إرسال إشعار بعد
    first_order = batch_orders[0]
    if ready_count >= 1 and not first_order.get("drivers_notified_for_batch"):
        # تحديث جميع الطلبات لتسجيل أننا أرسلنا إشعار
        await db.food_orders.update_many(
            {"batch_id": batch_id},
            {"$set": {"drivers_notified_for_batch": True}}
        )
        
        # إرسال إشعار للسائقين
        try:
            from routes.push_notifications import send_new_order_notification_to_delivery
            customer_city = first_order.get("delivery_city", "")
            await send_new_order_notification_to_delivery(
                order_type=f"طلب تجميعي ({ready_count}/{total_orders} جاهز)",
                city=customer_city
            )
        except Exception as e:
            print(f"Push notification error: {e}")

async def calculate_optimal_pickup_order(batch_id: str, driver_lat: float, driver_lng: float):
    """
    حساب ترتيب الاستلام الأمثل للطلب التجميعي
    المنطق: استلم من المتجر الأبعد عن العميل أولاً، والأقرب أخيراً
    هكذا الطعام الذي يُستلم أخيراً يكون الأحدث
    """
    from math import radians, sin, cos, sqrt, atan2
    
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371  # نصف قطر الأرض بالكيلومتر
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        return R * c
    
    # جلب طلبات الدفعة
    batch_orders = await db.food_orders.find({"batch_id": batch_id, "status": "ready"}).to_list(None)
    
    if not batch_orders:
        return []
    
    # جلب إحداثيات العميل
    customer_lat = batch_orders[0].get("latitude")
    customer_lng = batch_orders[0].get("longitude")
    
    if not customer_lat or not customer_lng:
        return batch_orders  # إرجاع بدون ترتيب
    
    # حساب المسافة من كل متجر للعميل
    stores_with_distance = []
    for order in batch_orders:
        store = await db.food_stores.find_one({"id": order["store_id"]})
        if store and store.get("latitude") and store.get("longitude"):
            distance_to_customer = haversine(
                store["latitude"], store["longitude"],
                customer_lat, customer_lng
            )
            stores_with_distance.append({
                "order": order,
                "store": store,
                "distance_to_customer": distance_to_customer,
                "ready_at": order.get("ready_at")
            })
        else:
            # إذا لا توجد إحداثيات، أضفه في النهاية
            stores_with_distance.append({
                "order": order,
                "store": store,
                "distance_to_customer": 0,
                "ready_at": order.get("ready_at")
            })
    
    # ترتيب: الأبعد عن العميل أولاً (سيُستلم أولاً، يبقى أكثر في السيارة لكنه طُبخ مبكراً)
    # والأقرب أخيراً (سيُستلم أخيراً، يصل طازجاً)
    stores_with_distance.sort(key=lambda x: x["distance_to_customer"], reverse=True)
    
    return stores_with_distance


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
    
    # ===== التحقق من المسافة بين المطعم والعميل =====
    # جلب إعدادات المسافة القصوى
    settings = await db.platform_settings.find_one({"id": "main"})
    max_delivery_distance = 5.0  # الافتراضي 5 كم
    if settings:
        max_delivery_distance = settings.get("max_store_customer_distance_km", 5.0)
    
    # حساب المسافة إذا كانت الإحداثيات متوفرة
    store_lat = store.get("latitude")
    store_lng = store.get("longitude")
    customer_lat = order.latitude or order.delivery_latitude
    customer_lng = order.longitude or order.delivery_longitude
    
    if store_lat and store_lng and customer_lat and customer_lng:
        import math
        R = 6371  # نصف قطر الأرض بالكيلومتر
        
        lat1, lon1 = math.radians(store_lat), math.radians(store_lng)
        lat2, lon2 = math.radians(customer_lat), math.radians(customer_lng)
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        distance = R * c
        
        if distance > max_delivery_distance:
            raise HTTPException(
                status_code=400, 
                detail=f"📍 المتجر بعيد عنك ({distance:.1f} كم). الحد الأقصى للتوصيل: {max_delivery_distance:.0f} كم. جرّب متجراً أقرب!"
            )
    
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
    # إذا تم إرسال رسوم التوصيل من الـ Frontend (محسوبة بالمسافة)، نستخدمها
    # وإلا نحسب بناءً على إعدادات المنصة الموحدة
    if order.delivery_fee is not None:
        delivery_fee = order.delivery_fee
        delivery_distance_km = order.delivery_distance_km
    else:
        store_delivery_fee = store.get("delivery_fee", 5000)
        
        # جلب حد التوصيل المجاني الموحد من إعدادات المنصة
        platform_settings = await db.platform_settings.find_one({"id": "main"})
        food_free_delivery_threshold = platform_settings.get("food_free_delivery_threshold", 100000) if platform_settings else 100000
        
        # توصيل مجاني إذا تجاوز المجموع الحد الموحد (بعد الخصم)
        final_subtotal = subtotal - total_discount
        if food_free_delivery_threshold > 0 and final_subtotal >= food_free_delivery_threshold:
            delivery_fee = 0
        else:
            delivery_fee = store_delivery_fee
        delivery_distance_km = None
    
    final_subtotal = subtotal - total_discount
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
    
    # توليد كود التسليم (4 أرقام)
    import random
    delivery_code = str(random.randint(1000, 9999))
    
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
        "delivery_distance_km": delivery_distance_km,
        "total": total,
        "delivery_address": order.delivery_address,
        "delivery_city": order.delivery_city,
        "delivery_phone": order.delivery_phone,
        "latitude": order.delivery_latitude or order.latitude,
        "longitude": order.delivery_longitude or order.longitude,
        "notes": order.notes,
        "payment_method": order.payment_method,
        "payment_status": "paid" if order.payment_method == "wallet" else "pending",
        "status": "pending",
        "delivery_code": delivery_code,
        "delivery_code_verified": False,
        "customer_not_responding": False,
        "customer_not_responding_since": None,
        "left_at_door": False,
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
    
    # إرسال إشعار Push للمتجر والسائقين
    try:
        from routes.push_notifications import (
            send_new_order_notification_to_food_seller,
            send_new_order_notification_to_delivery
        )
        # إشعار المتجر
        await send_new_order_notification_to_food_seller(
            store_id=order.store_id,
            order_number=order_number,
            total=total
        )
        # إشعار سائقي التوصيل
        await send_new_order_notification_to_delivery(
            order_type="طعام",
            city=order.delivery_city
        )
    except Exception as e:
        print(f"Push notification error: {e}")
    
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


@router.post("/batch")
async def create_batch_food_orders(batch: BatchOrderCreate, user: dict = Depends(get_current_user)):
    """إنشاء طلبات طعام مجمعة من متاجر متعددة - دفعة واحدة لسائق واحد"""
    
    if len(batch.orders) == 0:
        raise HTTPException(status_code=400, detail="لا توجد طلبات")
    
    # إنشاء معرف دفعة فريد
    batch_id = f"BATCH{datetime.now().strftime('%y%m%d')}{str(uuid.uuid4())[:6].upper()}"
    
    created_orders = []
    total_amount = 0
    total_delivery_fee = 0
    stores_info = []
    
    # التحقق من جميع المتاجر والمنتجات أولاً
    for order_item in batch.orders:
        store = await db.food_stores.find_one({"id": order_item.store_id, "is_approved": True, "is_active": True})
        if not store:
            raise HTTPException(status_code=404, detail="المتجر غير متاح")
        
        # حساب مجموع كل متجر
        store_subtotal = 0
        for item in order_item.items:
            product = await db.food_products.find_one({"id": item.product_id, "is_available": True})
            if not product:
                raise HTTPException(status_code=400, detail=f"المنتج {item.name} غير متاح")
            store_subtotal += product["price"] * item.quantity
        
        # التحقق من الحد الأدنى
        if store.get("minimum_order", 0) > store_subtotal:
            raise HTTPException(
                status_code=400, 
                detail=f"الحد الأدنى للطلب من {store['name']} هو {store['minimum_order']:,.0f} ل.س"
            )
        
        stores_info.append({
            "store": store,
            "subtotal": store_subtotal,
            "items": order_item.items,
            "notes": order_item.notes
        })
    
    # جلب حد التوصيل المجاني الموحد من إعدادات المنصة
    platform_settings = await db.platform_settings.find_one({"id": "main"})
    food_free_delivery_threshold = platform_settings.get("food_free_delivery_threshold", 100000) if platform_settings else 100000
    
    # حساب الإجمالي للتحقق من المحفظة
    for info in stores_info:
        store = info["store"]
        subtotal = info["subtotal"]
        
        # رسوم التوصيل - استخدام الحد الموحد
        if food_free_delivery_threshold > 0 and subtotal >= food_free_delivery_threshold:
            delivery_fee = 0
        else:
            delivery_fee = store.get("delivery_fee", 5000)
        
        total_amount += subtotal + delivery_fee
        total_delivery_fee += delivery_fee
    
    # التحقق من رصيد المحفظة
    if batch.payment_method == "wallet":
        wallet = await db.wallets.find_one({"user_id": user["id"]})
        balance = wallet.get("balance", 0) if wallet else 0
        if balance < total_amount:
            raise HTTPException(status_code=400, detail=f"رصيد المحفظة غير كافي. المطلوب: {total_amount:,.0f} ل.س، المتاح: {balance:,.0f} ل.س")
        
        # خصم الإجمالي من المحفظة
        await db.wallets.update_one(
            {"user_id": user["id"]},
            {"$inc": {"balance": -total_amount}}
        )
        
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "payment",
            "amount": -total_amount,
            "description": f"طلب مجمع من {len(batch.orders)} متجر - {batch_id}",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # إنشاء الطلبات
    now = datetime.now(timezone.utc)
    CANCEL_WINDOW_MINUTES = 3
    can_process_after = now + timedelta(minutes=CANCEL_WINDOW_MINUTES)
    
    for idx, info in enumerate(stores_info):
        store = info["store"]
        subtotal = info["subtotal"]
        items_list = info["items"]
        notes = info["notes"]
        
        # حساب رسوم التوصيل - استخدام الحد الموحد
        if food_free_delivery_threshold > 0 and subtotal >= food_free_delivery_threshold:
            delivery_fee = 0
        else:
            delivery_fee = store.get("delivery_fee", 5000)
        
        order_total = subtotal + delivery_fee
        
        # تحضير العناصر
        order_items = []
        for item in items_list:
            product = await db.food_products.find_one({"id": item.product_id})
            item_total = product["price"] * item.quantity
            order_items.append({
                "product_id": item.product_id,
                "name": product["name"],
                "price": product["price"],
                "quantity": item.quantity,
                "total": item_total,
                "notes": item.notes
            })
        
        order_id = str(uuid.uuid4())
        order_number = f"FO{datetime.now().strftime('%y%m%d')}{str(uuid.uuid4())[:4].upper()}"
        
        order_doc = {
            "id": order_id,
            "order_number": order_number,
            "order_type": "food",
            "batch_id": batch_id,
            "batch_index": idx + 1,
            "batch_total": len(batch.orders),
            "customer_id": user["id"],
            "customer_name": user["name"],
            "customer_phone": user.get("phone", batch.delivery_phone),
            "store_id": store["id"],
            "store_name": store["name"],
            "store_type": store.get("store_type", "restaurant"),
            "items": order_items,
            "subtotal": subtotal,
            "delivery_fee": delivery_fee,
            "total": order_total,
            "delivery_address": batch.delivery_address,
            "delivery_city": batch.delivery_city,
            "delivery_phone": batch.delivery_phone,
            "latitude": batch.latitude,
            "longitude": batch.longitude,
            "notes": notes,
            "payment_method": batch.payment_method,
            "payment_status": "paid" if batch.payment_method == "wallet" else "pending",
            "status": "pending",
            "status_history": [{
                "status": "pending",
                "timestamp": now.isoformat(),
                "note": f"طلب مجمع ({idx + 1}/{len(batch.orders)}) - ينتظر انتهاء مهلة الإلغاء"
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
        
        # تحديث عدد طلبات المتجر
        await db.food_stores.update_one(
            {"id": store["id"]},
            {"$inc": {"orders_count": 1}}
        )
        
        created_orders.append({
            "order_id": order_id,
            "order_number": order_number,
            "store_name": store["name"],
            "total": order_total
        })
        
        # إرسال إشعار للمتجر
        try:
            from routes.push_notifications import send_new_order_notification_to_food_seller
            await send_new_order_notification_to_food_seller(
                store_id=store["id"],
                order_number=order_number,
                total=order_total
            )
        except Exception as e:
            print(f"Push notification error: {e}")
    
    # إرسال إشعار للسائقين
    try:
        from routes.push_notifications import send_new_order_notification_to_delivery
        await send_new_order_notification_to_delivery(
            order_type="طعام مجمع",
            city=batch.delivery_city
        )
    except Exception as e:
        print(f"Push notification error: {e}")
    
    return {
        "batch_id": batch_id,
        "orders": created_orders,
        "total_amount": total_amount,
        "total_delivery_fee": total_delivery_fee,
        "stores_count": len(batch.orders),
        "cancel_window_minutes": CANCEL_WINDOW_MINUTES,
        "message": f"تم إنشاء {len(batch.orders)} طلب بنجاح. يمكنك إلغاءها خلال 3 دقائق."
    }


@router.post("/batch/{batch_id}/cancel")
async def cancel_batch_orders(batch_id: str, user: dict = Depends(get_current_user)):
    """إلغاء جميع طلبات الدفعة"""
    orders = await db.food_orders.find({"batch_id": batch_id, "customer_id": user["id"]}).to_list(None)
    
    if not orders:
        raise HTTPException(status_code=404, detail="لا توجد طلبات بهذه الدفعة")
    
    # التحقق من أن جميع الطلبات قابلة للإلغاء
    now = datetime.now(timezone.utc)
    for order in orders:
        if order["status"] in ["out_for_delivery", "delivered", "cancelled"]:
            raise HTTPException(status_code=400, detail=f"طلب #{order['order_number']} لا يمكن إلغاؤه")
        
        created_at = datetime.fromisoformat(order["created_at"].replace("Z", "+00:00"))
        elapsed_seconds = (now - created_at).total_seconds()
        if elapsed_seconds > 3 * 60:
            raise HTTPException(status_code=400, detail="انتهت مهلة الإلغاء (3 دقائق)")
    
    # حساب إجمالي المبلغ للاسترجاع
    total_refund = sum(o["total"] for o in orders if o["payment_method"] == "wallet" and o["payment_status"] == "paid")
    
    # استرجاع المبلغ
    if total_refund > 0:
        await db.wallets.update_one(
            {"user_id": user["id"]},
            {"$inc": {"balance": total_refund}}
        )
        
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "refund",
            "amount": total_refund,
            "description": f"استرجاع طلب مجمع {batch_id}",
            "created_at": now.isoformat()
        })
    
    # إلغاء جميع الطلبات
    await db.food_orders.update_many(
        {"batch_id": batch_id, "customer_id": user["id"]},
        {
            "$set": {"status": "cancelled", "cancelled_at": now.isoformat()},
            "$push": {
                "status_history": {
                    "status": "cancelled",
                    "timestamp": now.isoformat(),
                    "note": "تم إلغاء الطلب المجمع من قبل العميل"
                }
            }
        }
    )
    
    return {
        "message": f"تم إلغاء {len(orders)} طلب",
        "refunded_amount": total_refund
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


class PreparationStartRequest(BaseModel):
    preparation_time_minutes: int = 15  # وقت التحضير بالدقائق


@router.post("/store/orders/{order_id}/start-preparation")
async def start_order_preparation(
    order_id: str,
    data: PreparationStartRequest,
    user: dict = Depends(get_current_user)
):
    """
    بدء تحضير الطلب - للطعام فقط
    يرسل الطلب للسائق الأقرب بعد (وقت_التحضير - 7 دقائق)
    """
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    order = await db.food_orders.find_one({"id": order_id, "store_id": store["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("status") not in ["pending", "confirmed"]:
        raise HTTPException(status_code=400, detail="لا يمكن بدء التحضير لهذا الطلب")
    
    now = datetime.now(timezone.utc)
    prep_time = data.preparation_time_minutes
    
    # حساب وقت إرسال الطلب للسائق (قبل 7 دقائق من الجهوزية)
    send_to_driver_delay = max(0, prep_time - 7)  # لا يقل عن 0
    send_to_driver_at = now + timedelta(minutes=send_to_driver_delay)
    
    # تحديث الطلب
    update_data = {
        "status": "preparing",
        "status_label": "جاري التحضير",
        "preparation_started_at": now.isoformat(),
        "preparation_time_minutes": prep_time,
        "expected_ready_at": (now + timedelta(minutes=prep_time)).isoformat(),
        "send_to_driver_at": send_to_driver_at.isoformat(),
        "updated_at": now.isoformat()
    }
    
    # توليد كود الاستلام مسبقاً
    import random
    pickup_code = str(random.randint(1000, 9999))
    update_data["pickup_code"] = pickup_code
    update_data["pickup_code_verified"] = False
    
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": update_data,
            "$push": {
                "status_history": {
                    "status": "preparing",
                    "timestamp": now.isoformat(),
                    "note": f"بدأ التحضير - الوقت المتوقع: {prep_time} دقيقة",
                    "updated_by": user["id"]
                }
            }
        }
    )
    
    # إذا كان وقت الإرسال الآن أو قريب جداً، نرسل فوراً
    if send_to_driver_delay <= 1:
        try:
            from services.driver_assignment import process_driver_assignment
            
            store_lat = store.get("latitude", 33.5138)
            store_lon = store.get("longitude", 36.2765)
            
            assignment_result = await process_driver_assignment(
                order_id=order_id,
                order_type="food",
                store_lat=store_lat,
                store_lon=store_lon,
                store_name=store.get("name", "")
            )
            
            return {
                "success": True,
                "message": "تم بدء التحضير وإرسال الطلب للسائق",
                "preparation_time": prep_time,
                "pickup_code": pickup_code,
                "driver_assignment": assignment_result
            }
        except Exception as e:
            print(f"Error assigning driver: {e}")
    
    # إشعار العميل
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": order["customer_id"],
        "title": "🍳 جاري تحضير طلبك",
        "message": f"طلبك #{order['order_number']} قيد التحضير - الوقت المتوقع: {prep_time} دقيقة",
        "type": "order_preparing",
        "is_read": False,
        "created_at": now.isoformat()
    })
    
    return {
        "success": True,
        "message": "تم بدء التحضير",
        "preparation_time": prep_time,
        "pickup_code": pickup_code,
        "send_to_driver_at": send_to_driver_at.isoformat()
    }


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
    
    # إذا كان الطلب جاهز للاستلام، نولد كود استلام ونحفظ وقت الجهوزية
    import random
    if new_status == "ready":
        pickup_code = str(random.randint(1000, 9999))
        update_data["pickup_code"] = pickup_code
        update_data["pickup_code_verified"] = False
        update_data["ready_at"] = datetime.now(timezone.utc).isoformat()
        
        # إذا كان طلب تجميعي، تحقق من جهوزية باقي الطلبات
        if order.get("batch_id"):
            await check_batch_readiness_and_notify_driver(order["batch_id"], order_id)
    
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


@router.post("/store/orders/{order_id}/report-false-arrival")
async def report_false_driver_arrival(
    order_id: str,
    reason: str = "السائق لم يصل فعلياً",
    user: dict = Depends(get_current_user)
):
    """
    إبلاغ البائع عن وصول كاذب للسائق
    يُسجل شكوى ويُلغي عداد الانتظار
    """
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    order = await db.food_orders.find_one({
        "id": order_id,
        "store_id": store["id"]
    }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if not order.get("driver_arrived_at"):
        raise HTTPException(status_code=400, detail="السائق لم يسجل وصوله بعد")
    
    driver_id = order.get("driver_id")
    now = datetime.now(timezone.utc)
    
    # تسجيل الشكوى
    complaint_id = str(uuid.uuid4())
    await db.driver_complaints.insert_one({
        "id": complaint_id,
        "driver_id": driver_id,
        "store_id": store["id"],
        "store_name": store.get("name", ""),
        "order_id": order_id,
        "type": "false_arrival",
        "reason": reason,
        "driver_arrival_location": order.get("driver_arrival_location"),
        "store_location": {
            "latitude": store.get("latitude"),
            "longitude": store.get("longitude")
        },
        "created_at": now.isoformat(),
        "status": "pending"  # pending, confirmed, rejected
    })
    
    # إلغاء تسجيل الوصول وعداد الانتظار
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "driver_arrived_at": None,
                "waiting_started": False,
                "false_arrival_reported": True,
                "false_arrival_reported_at": now.isoformat()
            },
            "$push": {
                "status_history": {
                    "status": "false_arrival_reported",
                    "timestamp": now.isoformat(),
                    "note": f"أبلغ البائع عن وصول كاذب: {reason}"
                }
            }
        }
    )
    
    # تحديث عداد شكاوى السائق
    await db.users.update_one(
        {"id": driver_id},
        {
            "$inc": {"false_arrival_complaints": 1},
            "$set": {"last_complaint_at": now.isoformat()}
        }
    )
    
    # جلب عدد الشكاوى الحالي
    driver = await db.users.find_one({"id": driver_id}, {"_id": 0, "false_arrival_complaints": 1, "name": 1})
    complaints_count = driver.get("false_arrival_complaints", 1) if driver else 1
    
    # تطبيق العقوبات حسب عدد الشكاوى
    warning_message = ""
    if complaints_count >= 5:
        # إيقاف السائق مؤقتاً
        await db.delivery_documents.update_one(
            {"user_id": driver_id},
            {
                "$set": {
                    "is_available": False,
                    "suspended_until": (now + timedelta(hours=24)).isoformat(),
                    "suspension_reason": "شكاوى متكررة عن وصول كاذب"
                }
            }
        )
        warning_message = "تم إيقاف السائق مؤقتاً لمدة 24 ساعة"
    elif complaints_count >= 3:
        warning_message = f"تحذير: السائق لديه {complaints_count} شكاوى"
    
    # إشعار السائق
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": driver_id,
        "title": "⚠️ شكوى وصول كاذب",
        "message": f"أبلغ المتجر {store.get('name', '')} عن وصول كاذب. يرجى الالتزام بالتسجيل فقط عند الوصول الفعلي.",
        "type": "complaint",
        "is_read": False,
        "created_at": now.isoformat()
    })
    
    return {
        "success": True,
        "message": "تم تسجيل الشكوى وإلغاء عداد الانتظار",
        "complaint_id": complaint_id,
        "driver_complaints_count": complaints_count,
        "warning": warning_message
    }


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
            "status": {"$in": ["ready", "ready_for_pickup"]},
            "driver_id": None,
            "$or": [
                {"can_process_after": {"$lte": now}},
                {"can_process_after": {"$exists": False}}
            ]
        },
        {"_id": 0}
    ).sort("created_at", 1).to_list(None)
    
    # تجميع الطلبات حسب batch_id
    batched_orders = {}
    single_orders = []
    
    for order in orders:
        order["status_label"] = ORDER_STATUSES.get(order["status"], order["status"])
        
        # إضافة إحداثيات المتجر للسائق
        store = await db.food_stores.find_one({"id": order.get("store_id")}, {"_id": 0, "latitude": 1, "longitude": 1, "address": 1, "city": 1})
        if store:
            order["store_latitude"] = store.get("latitude")
            order["store_longitude"] = store.get("longitude")
            # إضافة عنوان البائع كـ seller_addresses للتوافق مع الفرونت إند
            if not order.get("seller_addresses"):
                order["seller_addresses"] = [{
                    "address": store.get("address", order.get("store_name", "")),
                    "city": store.get("city", order.get("delivery_city", "دمشق")),
                    "latitude": store.get("latitude"),
                    "longitude": store.get("longitude")
                }]
        
        # إضافة عنوان العميل كـ buyer_address للتوافق
        if not order.get("buyer_address"):
            order["buyer_address"] = {
                "name": order.get("customer_name", "العميل"),
                "address": order.get("delivery_address", ""),
                "city": order.get("delivery_city", "دمشق"),
                "phone": order.get("customer_phone", ""),
                "latitude": order.get("latitude"),
                "longitude": order.get("longitude")
            }
        
        # إرسال إشعار للسائق إذا لم يُرسل بعد
        if not order.get("driver_notified", False):
            order_num = order.get('order_number', order.get('id', '')[:8])
            store_name = order.get('store_name', 'متجر')
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "title": "🛵 طلب جاهز للتوصيل!",
                "message": f"طلب #{order_num} من {store_name} جاهز للاستلام",
                "type": "food_order_ready",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            # تحديث حالة الإشعار
            await db.food_orders.update_one(
                {"id": order["id"]},
                {"$set": {"driver_notified": True}}
            )
        
        # تجميع حسب batch_id
        batch_id = order.get("batch_id")
        if batch_id:
            if batch_id not in batched_orders:
                batched_orders[batch_id] = {
                    "batch_id": batch_id,
                    "is_batch": True,
                    "orders": [],
                    "stores": [],
                    "total_amount": 0,
                    "customer_name": order["customer_name"],
                    "customer_phone": order.get("customer_phone"),
                    "delivery_address": order["delivery_address"],
                    "delivery_city": order["delivery_city"],
                    "created_at": order["created_at"]
                }
            batched_orders[batch_id]["orders"].append(order)
            batched_orders[batch_id]["stores"].append({
                "store_id": order["store_id"],
                "store_name": order["store_name"],
                "order_id": order["id"],
                "order_number": order["order_number"],
                "total": order["total"],
                "items_count": len(order["items"])
            })
            batched_orders[batch_id]["total_amount"] += order["total"]
        else:
            single_orders.append(order)
    
    # تحويل الدفعات إلى قائمة
    batch_list = list(batched_orders.values())
    
    # إرجاع الطلبات الفردية + الدفعات المجمعة
    return {
        "single_orders": single_orders,
        "batch_orders": batch_list,
        "total_count": len(single_orders) + len(batch_list)
    }


@router.post("/delivery/batch/{batch_id}/accept")
async def accept_batch_orders(batch_id: str, user: dict = Depends(get_current_user)):
    """قبول جميع طلبات الدفعة - السائق يجب أن يقبل الكل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # التحقق من أن السائق متاح
    doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
        {"_id": 0, "is_available": 1, "status": 1}
    )
    if not doc or doc.get("status") != "approved":
        raise HTTPException(status_code=403, detail="يجب اعتماد حسابك أولاً")
    
    if not doc.get("is_available", False):
        raise HTTPException(
            status_code=403, 
            detail="يجب تعيين حالتك إلى 'متاح' قبل قبول الطلبات"
        )
    
    # جلب جميع طلبات الدفعة الجاهزة
    orders = await db.food_orders.find({
        "batch_id": batch_id,
        "status": "ready",
        "driver_id": None
    }).to_list(None)
    
    if not orders:
        raise HTTPException(status_code=404, detail="لا توجد طلبات متاحة في هذه الدفعة")
    
    now = datetime.now(timezone.utc)
    
    # قبول جميع الطلبات
    await db.food_orders.update_many(
        {"batch_id": batch_id, "status": "ready", "driver_id": None},
        {
            "$set": {
                "driver_id": user["id"],
                "driver_name": user["name"],
                "driver_phone": user.get("phone"),
                "status": "out_for_delivery",
                "picked_up_at": now.isoformat()
            },
            "$push": {
                "status_history": {
                    "status": "out_for_delivery",
                    "timestamp": now.isoformat(),
                    "note": f"جاري التوصيل بواسطة {user['name']} (طلب مجمع)"
                }
            }
        }
    )
    
    # إشعار العميل
    customer_id = orders[0]["customer_id"]
    stores_names = ", ".join([o["store_name"] for o in orders])
    
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": customer_id,
        "title": "🚗 طلباتك في الطريق!",
        "message": f"موظف التوصيل {user['name']} يجمع طلباتك من {len(orders)} متجر: {stores_names}",
        "type": "order_out_for_delivery",
        "is_read": False,
        "created_at": now.isoformat()
    })
    
    return {
        "message": f"تم قبول {len(orders)} طلب",
        "batch_id": batch_id,
        "orders_count": len(orders)
    }


@router.get("/delivery/batch/{batch_id}/pickup-plan")
async def get_batch_pickup_plan(
    batch_id: str,
    driver_lat: float = Query(None, description="خط عرض السائق"),
    driver_lng: float = Query(None, description="خط طول السائق"),
    user: dict = Depends(get_current_user)
):
    """
    الحصول على خطة الاستلام المثلى للطلب التجميعي
    يرتب المتاجر بحيث يُستلم من الأبعد عن العميل أولاً والأقرب أخيراً
    """
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # جلب طلبات الدفعة
    orders = await db.food_orders.find({"batch_id": batch_id}).to_list(None)
    
    if not orders:
        raise HTTPException(status_code=404, detail="لا توجد طلبات في هذه الدفعة")
    
    # حساب الترتيب الأمثل
    if driver_lat and driver_lng:
        optimal_order = await calculate_optimal_pickup_order(batch_id, driver_lat, driver_lng)
    else:
        # إذا لا توجد إحداثيات السائق، نستخدم ترتيب افتراضي
        optimal_order = []
        for order in orders:
            store = await db.food_stores.find_one({"id": order["store_id"]})
            optimal_order.append({
                "order": order,
                "store": store,
                "distance_to_customer": 0
            })
    
    # تجهيز خطة الاستلام
    pickup_plan = []
    for idx, item in enumerate(optimal_order):
        order = item["order"]
        store = item["store"] or {}
        
        pickup_plan.append({
            "sequence": idx + 1,
            "order_id": order["id"],
            "order_number": order["order_number"],
            "store_id": order["store_id"],
            "store_name": order["store_name"],
            "store_address": store.get("address", ""),
            "store_phone": store.get("phone", ""),
            "store_latitude": store.get("latitude"),
            "store_longitude": store.get("longitude"),
            "status": order["status"],
            "ready_at": order.get("ready_at"),
            "pickup_code": order.get("pickup_code"),
            "items_count": len(order.get("items", [])),
            "subtotal": order.get("subtotal", 0),
            "distance_to_customer_km": round(item.get("distance_to_customer", 0), 2),
            "note": "استلم من هنا أولاً - الأبعد عن العميل" if idx == 0 else 
                   "استلم من هنا أخيراً - الأقرب للعميل" if idx == len(optimal_order) - 1 else
                   f"محطة رقم {idx + 1}"
        })
    
    # معلومات التوصيل النهائي
    first_order = orders[0]
    customer_info = {
        "name": first_order.get("customer_name"),
        "phone": first_order.get("delivery_phone"),
        "address": first_order.get("delivery_address"),
        "city": first_order.get("delivery_city"),
        "latitude": first_order.get("latitude"),
        "longitude": first_order.get("longitude")
    }
    
    total_amount = sum(o.get("total", 0) for o in orders)
    total_delivery_fee = sum(o.get("delivery_fee", 0) for o in orders)
    
    return {
        "batch_id": batch_id,
        "total_stores": len(pickup_plan),
        "total_amount": total_amount,
        "total_delivery_fee": total_delivery_fee,
        "pickup_plan": pickup_plan,
        "customer": customer_info,
        "tips": [
            "🔥 استلم من المتاجر بالترتيب المحدد للحفاظ على الطعام ساخناً",
            "📍 المتجر الأخير هو الأقرب للعميل - استلم منه أخيراً",
            "⏱️ تحقق من جهوزية كل متجر قبل الذهاب إليه"
        ]
    }
async def complete_batch_delivery(batch_id: str, user: dict = Depends(get_current_user)):
    """إتمام توصيل جميع طلبات الدفعة"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    orders = await db.food_orders.find({
        "batch_id": batch_id,
        "driver_id": user["id"],
        "status": "out_for_delivery"
    }).to_list(None)
    
    if not orders:
        raise HTTPException(status_code=404, detail="لا توجد طلبات للتوصيل في هذه الدفعة")
    
    now = datetime.now(timezone.utc)
    
    # إتمام جميع الطلبات
    await db.food_orders.update_many(
        {"batch_id": batch_id, "driver_id": user["id"], "status": "out_for_delivery"},
        {
            "$set": {
                "status": "delivered",
                "delivered_at": now.isoformat(),
                "payment_status": "paid"
            },
            "$push": {
                "status_history": {
                    "status": "delivered",
                    "timestamp": now.isoformat(),
                    "note": "تم التوصيل بنجاح (طلب مجمع)"
                }
            }
        }
    )
    
    # إشعار العميل
    customer_id = orders[0]["customer_id"]
    batch_total = sum(o["total"] for o in orders)
    
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": customer_id,
        "title": "✅ تم توصيل طلباتك!",
        "message": f"تم توصيل {len(orders)} طلب بقيمة {batch_total:,.0f} ل.س. شكراً لك!",
        "type": "order_delivered",
        "is_read": False,
        "created_at": now.isoformat()
    })
    
    # إضافة أرباح السائق (مكافأة إضافية للطلبات المجمعة)
    delivery_earning = 5000 * len(orders)  # 5000 لكل طلب
    batch_bonus = 2000 if len(orders) > 1 else 0  # مكافأة إضافية للدفعات
    total_earning = delivery_earning + batch_bonus
    
    await db.wallets.update_one(
        {"user_id": user["id"]},
        {"$inc": {"balance": total_earning}},
        upsert=True
    )
    
    return {
        "message": f"تم إتمام توصيل {len(orders)} طلب بنجاح",
        "earnings": total_earning,
        "batch_bonus": batch_bonus
    }

@router.post("/delivery/{order_id}/accept")
async def accept_food_order(order_id: str, user: dict = Depends(get_current_user)):
    """قبول طلب توصيل مع التحقق من الحد الأقصى حسب نوع المتجر (ساخن/طازج أو بارد/جاف)"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # التحقق من أن السائق متاح
    doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
        {"_id": 0, "is_available": 1, "status": 1}
    )
    if not doc or doc.get("status") != "approved":
        raise HTTPException(status_code=403, detail="يجب اعتماد حسابك أولاً")
    
    if not doc.get("is_available", False):
        raise HTTPException(
            status_code=403, 
            detail="يجب تعيين حالتك إلى 'متاح' قبل قبول الطلبات"
        )
    
    # جلب إعدادات المنصة
    settings = await db.platform_settings.find_one({"id": "main"})
    
    # جلب حدود التوصيل الجديدة (حسب نوع المتجر)
    delivery_limits = settings.get("food_delivery_limits", {}) if settings else {}
    hot_fresh_limit = delivery_limits.get("hot_fresh_limit", DEFAULT_HOT_FRESH_LIMIT)
    cold_dry_limit = delivery_limits.get("cold_dry_limit", DEFAULT_COLD_DRY_LIMIT)
    max_distance_km = settings.get("food_orders_max_distance_km", 10) if settings else 10
    
    # البحث عن الطلب الجديد أولاً
    order = await db.food_orders.find_one({
        "id": order_id, 
        "status": {"$in": ["ready", "ready_for_pickup"]}, 
        "driver_id": None
    })
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير متاح")
    
    # جلب معلومات المتجر لمعرفة نوعه
    store = await db.food_stores.find_one({"id": order.get("store_id")})
    new_store_type = store.get("store_type", "restaurants") if store else "restaurants"
    new_store_category = get_store_delivery_category(new_store_type)
    
    # التحقق من عدد الطلبات الحالية للسائق
    current_orders = await db.food_orders.find({
        "driver_id": user["id"],
        "status": "out_for_delivery"
    }).to_list(length=100)
    
    # تصنيف الطلبات الحالية حسب نوع المتجر
    hot_fresh_count = 0
    cold_dry_count = 0
    
    for o in current_orders:
        o_store = await db.food_stores.find_one({"id": o.get("store_id")})
        o_store_type = o_store.get("store_type", "restaurants") if o_store else "restaurants"
        o_category = get_store_delivery_category(o_store_type)
        
        if o_category == "hot_fresh":
            hot_fresh_count += 1
        else:
            cold_dry_count += 1
    
    # التحقق من الحدود حسب نوع الطلب الجديد
    if new_store_category == "hot_fresh":
        # طلب ساخن/طازج
        if hot_fresh_count >= hot_fresh_limit:
            raise HTTPException(
                status_code=400, 
                detail=f"🔥 لديك {hot_fresh_count} طلب ساخن/طازج (الحد الأقصى: {hot_fresh_limit}). أكمل التوصيلات الحالية أولاً لضمان وصول الطعام طازجاً."
            )
    else:
        # طلب بارد/جاف
        if cold_dry_count >= cold_dry_limit:
            raise HTTPException(
                status_code=400, 
                detail=f"📦 لديك {cold_dry_count} طلب بارد/جاف (الحد الأقصى: {cold_dry_limit}). أكمل التوصيلات الحالية أولاً."
            )
    
    # التحقق من المسافة إذا كان لديه طلبات سابقة
    if len(current_orders) > 0:
        first_order = current_orders[0]
        first_lat = first_order.get("latitude")
        first_lon = first_order.get("longitude")
        new_lat = order.get("latitude")
        new_lon = order.get("longitude")
        
        if first_lat and first_lon and new_lat and new_lon:
            import math
            R = 6371
            
            lat1, lon1 = math.radians(first_lat), math.radians(first_lon)
            lat2, lon2 = math.radians(new_lat), math.radians(new_lon)
            
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            c = 2 * math.asin(math.sqrt(a))
            distance = R * c
            
            if distance > max_distance_km:
                raise HTTPException(
                    status_code=400,
                    detail=f"هذا الطلب بعيد عن مسارك الحالي ({distance:.1f} كم). الحد الأقصى المسموح: {max_distance_km} كم"
                )
    
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
    
    return {
        "message": "تم قبول الطلب", 
        "store_category": new_store_category,
        "hot_fresh_count": hot_fresh_count + (1 if new_store_category == "hot_fresh" else 0),
        "cold_dry_count": cold_dry_count + (1 if new_store_category == "cold_dry" else 0)
    }

# ============== التحقق من كود الاستلام ==============

class VerifyPickupCode(BaseModel):
    code: str

@router.post("/delivery/{order_id}/verify-pickup")
async def verify_pickup_code(order_id: str, data: VerifyPickupCode, user: dict = Depends(get_current_user)):
    """التحقق من كود الاستلام من البائع"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # جلب الطلب
    order = await db.food_orders.find_one({
        "id": order_id,
        "driver_id": user["id"]
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود أو ليس مخصصاً لك")
    
    # التحقق من الكود
    correct_code = order.get("pickup_code")
    if not correct_code:
        raise HTTPException(status_code=400, detail="لا يوجد كود استلام لهذا الطلب")
    
    if data.code != correct_code:
        raise HTTPException(status_code=400, detail="الكود غير صحيح")
    
    # تحديث حالة الاستلام
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "pickup_code_verified": True,
                "pickup_verified_at": datetime.now(timezone.utc).isoformat(),
                "pickup_verified_by": user["id"]
            },
            "$push": {
                "status_history": {
                    "status": "pickup_verified",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": f"تم تأكيد الاستلام بالكود بواسطة {user['name']}"
                }
            }
        }
    )
    
    # حساب التعويض إذا كان السائق انتظر
    compensation_data = {"compensation": 0}
    try:
        from services.violation_system import finalize_order_compensation
        compensation_data = await finalize_order_compensation(order_id)
    except Exception as e:
        print(f"Error calculating compensation: {e}")
    
    return {
        "success": True,
        "message": "تم تأكيد الاستلام بنجاح",
        "order_id": order_id,
        "compensation": compensation_data
    }


@router.post("/delivery/{order_id}/arrived")
async def driver_arrived_at_store(
    order_id: str, 
    latitude: float = None,
    longitude: float = None,
    user: dict = Depends(get_current_user)
):
    """تسجيل وصول السائق للمطعم - يبدأ عداد الانتظار"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.food_orders.find_one({
        "id": order_id,
        "driver_id": user["id"]
    }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود أو ليس مخصصاً لك")
    
    # التحقق من أن السائق لم يسجل وصوله بالفعل
    if order.get("driver_arrived_at"):
        return {
            "success": True,
            "message": "تم تسجيل وصولك مسبقاً",
            "arrived_at": order.get("driver_arrived_at")
        }
    
    # === Geofencing: التحقق من موقع السائق ===
    # جلب المسافة المسموحة من الإعدادات (الافتراضي 150 متر)
    settings = await db.settings.find_one({"type": "delivery_settings"})
    MAX_DISTANCE_METERS = 150  # الافتراضي
    if settings and settings.get("values", {}).get("geofencing_max_distance_meters"):
        MAX_DISTANCE_METERS = settings["values"]["geofencing_max_distance_meters"]
    
    if latitude and longitude:
        # جلب موقع المتجر
        store = await db.food_stores.find_one({"id": order.get("store_id")}, {"_id": 0})
        if store and store.get("latitude") and store.get("longitude"):
            store_lat = store.get("latitude")
            store_lon = store.get("longitude")
            
            # حساب المسافة بين السائق والمتجر (Haversine formula)
            import math
            R = 6371000  # نصف قطر الأرض بالمتر
            
            lat1_rad = math.radians(latitude)
            lat2_rad = math.radians(store_lat)
            delta_lat = math.radians(store_lat - latitude)
            delta_lon = math.radians(store_lon - longitude)
            
            a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
            distance_meters = R * c
            
            if distance_meters > MAX_DISTANCE_METERS:
                raise HTTPException(
                    status_code=400, 
                    detail=f"يجب أن تكون قرب المتجر لتسجيل الوصول. أنت على بعد {int(distance_meters)} متر (الحد المسموح {MAX_DISTANCE_METERS} متر)"
                )
    
    now = datetime.now(timezone.utc)
    
    # تسجيل الوصول مع موقع السائق
    update_data = {
        "driver_arrived_at": now.isoformat(),
        "waiting_started": True
    }
    
    if latitude and longitude:
        update_data["driver_arrival_location"] = {
            "latitude": latitude,
            "longitude": longitude
        }
    
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": update_data,
            "$push": {
                "status_history": {
                    "status": "driver_arrived",
                    "timestamp": now.isoformat(),
                    "note": f"وصل السائق {user['name']} للمطعم"
                }
            }
        }
    )
    
    return {
        "success": True,
        "message": "تم تسجيل وصولك للمطعم",
        "arrived_at": now.isoformat()
    }


@router.get("/delivery/{order_id}/waiting-status")
async def get_waiting_status(order_id: str, user: dict = Depends(get_current_user)):
    """جلب حالة الانتظار والتعويض المتوقع"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.food_orders.find_one({
        "id": order_id,
        "driver_id": user["id"]
    }, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if not order.get("driver_arrived_at"):
        return {
            "waiting": False,
            "message": "لم تسجل وصولك للمطعم بعد"
        }
    
    try:
        from services.violation_system import calculate_waiting_compensation
        compensation_data = await calculate_waiting_compensation(order_id)
        return {
            "waiting": True,
            "arrived_at": order.get("driver_arrived_at"),
            **compensation_data
        }
    except Exception as e:
        return {
            "waiting": True,
            "arrived_at": order.get("driver_arrived_at"),
            "error": str(e)
        }


@router.get("/delivery/{order_id}/pickup-code")
async def get_pickup_code(order_id: str, user: dict = Depends(get_current_user)):
    """جلب كود الاستلام للبائع"""
    # يمكن للبائع أو المشرف فقط رؤية الكود
    if user["user_type"] not in ["seller", "admin"]:
        raise HTTPException(status_code=403, detail="للبائع أو المشرف فقط")
    
    order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من أن البائع هو صاحب الطلب
    if user["user_type"] == "seller":
        store = await db.food_stores.find_one({"owner_id": user["id"]})
        if not store or store["id"] != order.get("store_id"):
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية لهذا الطلب")
    
    pickup_code = order.get("pickup_code")
    if not pickup_code:
        raise HTTPException(status_code=400, detail="لا يوجد كود استلام بعد")
    
    return {
        "pickup_code": pickup_code,
        "is_verified": order.get("pickup_code_verified", False),
        "order_number": order.get("order_number"),
        "driver_name": order.get("driver_name")
    }

# ============== الأولوية الذكية - طلبات من نفس المطعم ==============

@router.get("/delivery/priority-orders")
async def get_priority_orders(user: dict = Depends(get_current_user)):
    """جلب الطلبات ذات الأولوية - من نفس المطاعم التي يذهب إليها السائق"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # جلب إعدادات الأولوية
    settings = await db.platform_settings.find_one({"id": "main"})
    smart_limits = settings.get("smart_order_limits", {}) if settings else {}
    enable_priority = smart_limits.get("enable_smart_priority", True)
    
    if not enable_priority:
        return {"priority_orders": [], "message": "الأولوية الذكية غير مفعّلة"}
    
    # جلب الطلبات الحالية للسائق
    current_orders = await db.food_orders.find({
        "driver_id": user["id"],
        "status": "out_for_delivery"
    }).to_list(length=100)
    
    if not current_orders:
        return {"priority_orders": [], "message": "لا توجد طلبات حالية"}
    
    # جلب المطاعم التي يذهب إليها السائق
    current_restaurants = list(set(
        o.get("restaurant_id") or o.get("store_id") 
        for o in current_orders
    ))
    
    # البحث عن طلبات جديدة من نفس المطاعم
    priority_orders = await db.food_orders.find({
        "status": {"$in": ["ready", "ready_for_pickup"]},
        "driver_id": None,
        "$or": [
            {"restaurant_id": {"$in": current_restaurants}},
            {"store_id": {"$in": current_restaurants}}
        ]
    }, {"_id": 0}).to_list(length=20)
    
    # إضافة معلومات إضافية
    for order in priority_orders:
        order["is_priority"] = True
        order["priority_reason"] = "طلب من نفس المطعم الذي تذهب إليه"
    
    return {
        "priority_orders": priority_orders,
        "current_restaurants": current_restaurants,
        "message": f"وجدنا {len(priority_orders)} طلب من نفس مطاعمك"
    }

# ===============================
# نظام تأكيد التسليم بالكود
# ===============================

class DeliveryCodeVerification(BaseModel):
    delivery_code: str

@router.post("/delivery/{order_id}/verify-code")
async def verify_delivery_code(
    order_id: str, 
    data: DeliveryCodeVerification, 
    user: dict = Depends(get_current_user)
):
    """التحقق من كود التسليم وإتمام الطلب"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.food_orders.find_one({
        "id": order_id, 
        "driver_id": user["id"], 
        "status": "out_for_delivery"
    })
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من الكود
    if order.get("delivery_code") != data.delivery_code:
        raise HTTPException(status_code=400, detail="كود التسليم غير صحيح")
    
    # إتمام التسليم
    await complete_delivery_and_pay_driver(order, user, "تم التسليم بكود التأكيد")
    
    return {"message": "تم التحقق من الكود وإتمام التسليم بنجاح"}

@router.post("/delivery/{order_id}/customer-not-responding")
async def mark_customer_not_responding(order_id: str, user: dict = Depends(get_current_user)):
    """تسجيل أن العميل لا يرد"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.food_orders.find_one({
        "id": order_id, 
        "driver_id": user["id"], 
        "status": "out_for_delivery"
    })
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من أنه لم يتم تسجيل عدم الرد مسبقاً
    if order.get("customer_not_responding"):
        # حساب الوقت المتبقي
        since = datetime.fromisoformat(order["customer_not_responding_since"])
        # جلب وقت الانتظار من الإعدادات
        settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
        wait_time = settings.get("delivery_wait_time_minutes", 10) if settings else 10
        elapsed = (datetime.now(timezone.utc) - since).total_seconds() / 60
        remaining = max(0, wait_time - elapsed)
        return {
            "message": "تم تسجيل عدم الرد مسبقاً",
            "remaining_minutes": round(remaining, 1),
            "can_leave_at_door": remaining <= 0
        }
    
    now = datetime.now(timezone.utc)
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "customer_not_responding": True,
                "customer_not_responding_since": now.isoformat()
            },
            "$push": {
                "status_history": {
                    "status": "customer_not_responding",
                    "timestamp": now.isoformat(),
                    "note": "العميل لا يرد على الهاتف"
                }
            }
        }
    )
    
    # إشعار العميل
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": order["customer_id"],
        "title": "📞 موظف التوصيل يحاول الاتصال بك!",
        "message": "يرجى الرد على موظف التوصيل أو سيتم ترك طلبك عند الباب",
        "type": "delivery_waiting",
        "order_id": order_id,
        "is_read": False,
        "created_at": now.isoformat()
    })
    
    # جلب وقت الانتظار من الإعدادات
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    wait_time = settings.get("delivery_wait_time_minutes", 10) if settings else 10
    
    return {
        "message": "تم تسجيل عدم رد العميل",
        "wait_time_minutes": wait_time,
        "remaining_minutes": wait_time,
        "can_leave_at_door": False
    }

@router.post("/delivery/{order_id}/leave-at-door")
async def leave_order_at_door(order_id: str, user: dict = Depends(get_current_user)):
    """ترك الطلب عند الباب بعد انتهاء وقت الانتظار"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.food_orders.find_one({
        "id": order_id, 
        "driver_id": user["id"], 
        "status": "out_for_delivery"
    })
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من تسجيل عدم الرد
    if not order.get("customer_not_responding"):
        raise HTTPException(status_code=400, detail="يجب تسجيل عدم رد العميل أولاً")
    
    # التحقق من انتهاء وقت الانتظار
    since = datetime.fromisoformat(order["customer_not_responding_since"])
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    wait_time = settings.get("delivery_wait_time_minutes", 10) if settings else 10
    elapsed = (datetime.now(timezone.utc) - since).total_seconds() / 60
    
    if elapsed < wait_time:
        remaining = wait_time - elapsed
        raise HTTPException(
            status_code=400, 
            detail=f"يجب الانتظار {int(remaining)} دقيقة إضافية"
        )
    
    # إتمام التسليم (ترك عند الباب)
    await complete_delivery_and_pay_driver(order, user, "تم ترك الطلب عند الباب - العميل لم يرد")
    
    # تحديث حالة الطلب
    await db.food_orders.update_one(
        {"id": order_id},
        {"$set": {"left_at_door": True}}
    )
    
    return {"message": "تم ترك الطلب عند الباب وإتمام التسليم"}


async def complete_delivery_and_pay_driver(order: dict, driver: dict, note: str):
    """إتمام التسليم وإضافة الأجرة لمحفظة السائق (مع التعليق)"""
    now = datetime.now(timezone.utc)
    
    # تحديث حالة الطلب
    await db.food_orders.update_one(
        {"id": order["id"]},
        {
            "$set": {
                "status": "delivered",
                "delivered_at": now.isoformat(),
                "payment_status": "paid",
                "delivery_code_verified": True
            },
            "$push": {
                "status_history": {
                    "status": "delivered",
                    "timestamp": now.isoformat(),
                    "note": note
                }
            }
        }
    )
    
    # حساب أرباح السائق
    delivery_fee = order.get("delivery_fee", 0)
    base_earning = 5000  # ربح أساسي ثابت
    driver_earning = base_earning + delivery_fee
    
    # جلب المتجر لحساب العمولة
    store = await db.food_stores.find_one({"id": order.get("store_id")})
    store_type = store.get("store_type", "restaurants") if store else "restaurants"
    
    # جلب نسبة العمولة من قاعدة البيانات
    from routes.admin import get_food_commission_rates_from_db
    commission_rates = await get_food_commission_rates_from_db()
    commission_rate = commission_rates.get(store_type, commission_rates.get("default", 0.20))
    
    # حساب أرباح البائع (subtotal - خصومات - عمولة المنصة)
    subtotal = order.get("subtotal", 0) - order.get("offer_discount", 0) - order.get("flash_discount", 0)
    platform_commission = subtotal * commission_rate
    seller_earning = subtotal - platform_commission
    
    # تحديث الطلب بمعلومات العمولة
    await db.food_orders.update_one(
        {"id": order["id"]},
        {
            "$set": {
                "platform_commission": platform_commission,
                "commission_rate": commission_rate,
                "seller_earning": seller_earning
            }
        }
    )
    
    # استخدام نظام تعليق الأرباح
    try:
        from services.earnings_hold import add_held_earnings, get_hold_settings
        settings = await get_hold_settings()
        
        if settings.get("enabled", True):
            # إضافة أرباح السائق (معلقة)
            await add_held_earnings(
                user_id=driver["id"],
                user_type="delivery",
                amount=driver_earning,
                order_id=order["id"],
                order_type="food",
                description=f"أجرة توصيل طلب #{order['order_number']}"
            )
            
            # إضافة أرباح البائع (معلقة) - بعد خصم العمولة
            if store and store.get("owner_id") and seller_earning > 0:
                await add_held_earnings(
                    user_id=store["owner_id"],
                    user_type="food_seller",
                    amount=seller_earning,
                    order_id=order["id"],
                    order_type="food",
                    description=f"أرباح طلب #{order['order_number']} (بعد عمولة {int(commission_rate*100)}%)"
                )
        else:
            # إضافة مباشرة بدون تعليق
            await add_earnings_directly(driver, driver_earning, order, "delivery")
            if store and store.get("owner_id") and seller_earning > 0:
                await add_seller_earnings_directly(store["owner_id"], seller_earning, order)
    except Exception as e:
        print(f"Error using hold system, falling back to direct: {e}")
        # Fallback للإضافة المباشرة
        await add_earnings_directly(driver, driver_earning, order, "delivery")
        if store and store.get("owner_id") and seller_earning > 0:
            await add_seller_earnings_directly(store["owner_id"], seller_earning, order)
    
    # إشعار العميل
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": order["customer_id"],
        "title": "✅ تم التوصيل!",
        "message": f"طلبك #{order['order_number']} وصل. شكراً لك!",
        "type": "order_delivered",
        "order_id": order["id"],
        "is_read": False,
        "created_at": now.isoformat()
    })
    
    # ===== إشعار فك القفل للسائق =====
    # التحقق إذا كان هذا آخر طلب طعام ساخن/طازج نشط للسائق
    # الطلبات الباردة/الجافة لا تقفل المنتجات
    
    # جلب طلبات الطعام المتبقية
    remaining_food_orders = await db.food_orders.find({
        "driver_id": driver["id"],
        "status": {"$in": ["accepted", "out_for_delivery", "picked_up"]},
        "id": {"$ne": order["id"]}  # استثناء الطلب الحالي
    }).to_list(length=100)
    
    # حساب عدد الطلبات الساخنة/الطازجة المتبقية
    remaining_hot_fresh = 0
    for o in remaining_food_orders:
        o_store = await db.food_stores.find_one({"id": o.get("store_id")})
        o_store_type = o_store.get("store_type", "restaurants") if o_store else "restaurants"
        if o_store_type in HOT_FRESH_STORE_TYPES:
            remaining_hot_fresh += 1
    
    # إذا لم يعد هناك طلبات طعام ساخنة/طازجة
    if remaining_hot_fresh == 0:
        # التحقق من وجود طلبات منتجات معلقة
        pending_product_orders = await db.orders.count_documents({
            "delivery_driver_id": driver["id"],
            "delivery_status": {"$in": ["out_for_delivery", "picked_up", "on_the_way"]}
        })
        
        # إذا كان لديه طلبات منتجات معلقة، أرسل إشعار فك القفل
        if pending_product_orders > 0:
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": driver["id"],
                "title": "🔓 تم فك القفل!",
                "message": f"أكملت طلبات الطعام الساخنة! لديك {pending_product_orders} طلب منتجات بانتظار التسليم. يمكنك الآن إكمال توصيلها.",
                "type": "lock_released",
                "is_read": False,
                "play_sound": True,
                "created_at": now.isoformat()
            })
            print(f"🔓 إشعار فك القفل للسائق {driver['id']}: {pending_product_orders} طلب منتجات")


async def add_earnings_directly(driver: dict, amount: float, order: dict, user_type: str):
    """إضافة أرباح مباشرة بدون تعليق (Fallback)"""
    now = datetime.now(timezone.utc)
    
    await db.wallets.update_one(
        {"user_id": driver["id"]},
        {"$inc": {"balance": amount, "total_earned": amount}},
        upsert=True
    )
    
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": driver["id"],
        "type": "delivery_earning",
        "amount": amount,
        "description": f"أجرة توصيل طلب #{order['order_number']}",
        "order_id": order["id"],
        "created_at": now.isoformat()
    })
    
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": driver["id"],
        "title": "💰 تم إضافة أرباحك!",
        "message": f"تم إضافة {amount:,} ل.س لمحفظتك",
        "type": "earning_added",
        "order_id": order["id"],
        "is_read": False,
        "created_at": now.isoformat()
    })


async def add_seller_earnings_directly(seller_id: str, amount: float, order: dict):
    """إضافة أرباح البائع مباشرة"""
    now = datetime.now(timezone.utc)
    
    await db.wallets.update_one(
        {"user_id": seller_id},
        {"$inc": {"balance": amount, "total_earned": amount}},
        upsert=True
    )
    
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": seller_id,
        "type": "sales_earning",
        "amount": amount,
        "description": f"أرباح مبيعات طلب #{order['order_number']}",
        "order_id": order["id"],
        "created_at": now.isoformat()
    })

@router.post("/delivery/{order_id}/complete")
async def complete_food_delivery(order_id: str, user: dict = Depends(get_current_user)):
    """إتمام التوصيل (الطريقة القديمة - للتوافق)"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.food_orders.find_one({"id": order_id, "driver_id": user["id"], "status": "out_for_delivery"})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # إذا كان الطلب يحتوي على كود تسليم ولم يتم التحقق منه
    if order.get("delivery_code") and not order.get("delivery_code_verified"):
        # السماح فقط إذا انتهى وقت الانتظار
        if order.get("customer_not_responding"):
            since = datetime.fromisoformat(order["customer_not_responding_since"])
            settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
            wait_time = settings.get("delivery_wait_time_minutes", 10) if settings else 10
            elapsed = (datetime.now(timezone.utc) - since).total_seconds() / 60
            
            if elapsed < wait_time:
                raise HTTPException(
                    status_code=400, 
                    detail="يجب إدخال كود التسليم أو الانتظار حتى انتهاء المهلة"
                )
        else:
            raise HTTPException(
                status_code=400, 
                detail="يجب إدخال كود التسليم من العميل"
            )
    
    await complete_delivery_and_pay_driver(order, user, "تم التسليم بنجاح")
    
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
