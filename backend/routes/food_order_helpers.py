# /app/backend/routes/food_order_helpers.py
# دوال مساعدة لإنشاء طلبات الطعام
# تم استخراجها من create_food_order لتقليل التعقيد

from datetime import datetime, timezone
from fastapi import HTTPException
import math

from core.database import db


async def validate_store(store_id: str) -> dict:
    """التحقق من وجود المتجر وإرجاعه"""
    store = await db.food_stores.find_one({
        "id": store_id, 
        "is_approved": True, 
        "is_active": True
    })
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير متاح")
    return store


async def get_store_coordinates(store: dict) -> tuple:
    """استخراج إحداثيات المتجر"""
    store_lat = store.get("latitude")
    store_lng = store.get("longitude")
    
    if not store_lat or not store_lng:
        raise HTTPException(
            status_code=400,
            detail="المتجر لا يملك موقع محدد. يرجى التواصل مع المتجر لتحديث موقعه."
        )
    
    return float(store_lat), float(store_lng)


def get_customer_coordinates(order) -> tuple:
    """استخراج إحداثيات العميل من الطلب"""
    customer_lat = order.latitude or order.delivery_latitude
    customer_lng = order.longitude or order.delivery_longitude
    
    if not customer_lat or not customer_lng:
        raise HTTPException(
            status_code=400,
            detail="يرجى تحديد موقعك على الخريطة لحساب أجرة التوصيل بدقة."
        )
    
    return float(customer_lat), float(customer_lng)


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """حساب المسافة بين نقطتين (Haversine)"""
    R = 6371  # نصف قطر الأرض بالكيلومتر
    
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


def calculate_estimated_time(distance: float, store: dict) -> int:
    """حساب الوقت المتوقع للتوصيل"""
    preparation_time_raw = store.get("delivery_time", 20)
    try:
        preparation_time = float(preparation_time_raw) if preparation_time_raw else 20
    except (ValueError, TypeError):
        preparation_time = 20
    
    avg_speed_kmh = 25  # متوسط سرعة السائق
    travel_time_minutes = (distance / avg_speed_kmh) * 60
    
    return round(preparation_time + travel_time_minutes)


async def validate_order_items(order, store_id: str) -> tuple:
    """التحقق من عناصر الطلب وحساب المجموع"""
    subtotal = 0
    order_items = []
    
    # جلب جميع المنتجات دفعة واحدة
    product_ids = [item.product_id for item in order.items]
    products_list = await db.food_products.find(
        {"id": {"$in": product_ids}},
        {"_id": 0}
    ).to_list(None)
    products_map = {p["id"]: p for p in products_list}
    
    # التحقق من وجود جميع المنتجات
    for item in order.items:
        product = products_map.get(item.product_id)
        if not product:
            raise HTTPException(status_code=400, detail=f"المنتج {item.name} غير موجود")
        
        # التحقق من حالة التوفر
        availability_status = product.get(
            "availability_status", 
            "available" if product.get("is_available", True) else "unavailable"
        )
        if availability_status == "sold_out_today":
            raise HTTPException(
                status_code=400, 
                detail=f"المنتج '{product['name']}' نفد مؤقتاً اليوم، سيعود غداً"
            )
        elif availability_status == "unavailable" or not product.get("is_available", True):
            raise HTTPException(
                status_code=400, 
                detail=f"المنتج '{product['name']}' غير متاح حالياً"
            )
    
    # بناء قائمة العناصر
    for item in order.items:
        product = products_map[item.product_id]
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
    
    return subtotal, order_items


def validate_minimum_order(store: dict, subtotal: float) -> None:
    """التحقق من الحد الأدنى للطلب"""
    if store.get("minimum_order", 0) > subtotal:
        raise HTTPException(
            status_code=400, 
            detail=f"الحد الأدنى للطلب هو {store['minimum_order']:,.0f} ل.س"
        )


async def calculate_offer_discounts(store_id: str, order_items: list, subtotal: float) -> dict:
    """حساب خصومات العروض"""
    from routes.food import calculate_offer_discount
    return await calculate_offer_discount(store_id, order_items, subtotal)


async def calculate_flash_discounts(store_id: str, store: dict, order_items: list, subtotal: float, offer_discount: float) -> dict:
    """حساب خصومات عروض الفلاش"""
    flash_discount = 0
    flash_sale_applied = None
    flash_items = []
    now = datetime.now(timezone.utc).isoformat()
    
    active_flash = await db.flash_sales.find_one({
        "is_active": True,
        "start_time": {"$lte": now},
        "end_time": {"$gte": now},
        "$or": [
            {"applicable_stores": []},
            {"applicable_stores": store_id}
        ]
    }, {"_id": 0})
    
    if not active_flash:
        return {
            "discount": 0,
            "flash_applied": None,
            "flash_items": []
        }
    
    flash_type = active_flash.get("flash_type", "all")
    apply_flash = False
    eligible_subtotal = 0
    
    if flash_type == "all":
        if not active_flash.get("applicable_categories"):
            apply_flash = True
            eligible_subtotal = subtotal - offer_discount
        elif store.get("store_type") in active_flash.get("applicable_categories", []):
            apply_flash = True
            eligible_subtotal = subtotal - offer_discount
            
    elif flash_type == "categories":
        if store.get("store_type") in active_flash.get("applicable_categories", []):
            apply_flash = True
            eligible_subtotal = subtotal - offer_discount
            
    elif flash_type == "products":
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
    
    return {
        "discount": flash_discount,
        "flash_applied": flash_sale_applied,
        "flash_items": flash_items
    }


async def get_delivery_settings() -> dict:
    """جلب إعدادات التوصيل من المنصة"""
    platform_settings = await db.platform_settings.find_one({"id": "main"})
    
    food_free_delivery_threshold = 100000
    weather_surcharge = {}
    
    if platform_settings:
        food_free_delivery_threshold = platform_settings.get("food_free_delivery_threshold", 100000)
        weather_surcharge = platform_settings.get("weather_surcharge", {})
    
    weather_surcharge_active = weather_surcharge.get("is_active", False)
    weather_surcharge_amount = weather_surcharge.get("amount", 0) if weather_surcharge_active else 0
    weather_surcharge_reason = weather_surcharge.get("reason", "") if weather_surcharge_active else ""
    
    return {
        "food_free_delivery_threshold": food_free_delivery_threshold,
        "weather_surcharge_active": weather_surcharge_active,
        "weather_surcharge_amount": weather_surcharge_amount,
        "weather_surcharge_reason": weather_surcharge_reason
    }


async def check_global_free_shipping() -> bool:
    """التحقق من عرض الشحن المجاني الشامل"""
    global_free_shipping = await db.settings.find_one({"key": "global_free_shipping"})
    
    if not global_free_shipping or not global_free_shipping.get("is_active"):
        return False
    
    applies_to = global_free_shipping.get("applies_to", "all")
    if applies_to not in ["all", "food"]:
        return False
    
    end_date = global_free_shipping.get("end_date")
    if end_date:
        try:
            end_datetime = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            if end_datetime.tzinfo is None:
                end_datetime = end_datetime.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > end_datetime:
                return False
        except Exception:
            pass
    
    return True


async def apply_surge_pricing(driver_delivery_fee: int) -> dict:
    """تطبيق التسعير الديناميكي"""
    surge_settings = await db.platform_settings.find_one({"id": "surge_pricing"}, {"_id": 0})
    
    if not surge_settings or not surge_settings.get("is_active", False):
        return {
            "fee": driver_delivery_fee,
            "applied": False,
            "reason": "",
            "increase": 0
        }
    
    applies_to = surge_settings.get("applies_to", "all")
    if applies_to not in ["all", "food_only"]:
        return {
            "fee": driver_delivery_fee,
            "applied": False,
            "reason": "",
            "increase": 0
        }
    
    original_fee = driver_delivery_fee
    surge_reason = surge_settings.get("reason", "زيادة الطلب")
    
    # حساب الزيادة
    if surge_settings.get("fixed_amount", 0) > 0:
        driver_delivery_fee = driver_delivery_fee + surge_settings["fixed_amount"]
    else:
        driver_delivery_fee = int(driver_delivery_fee * surge_settings.get("multiplier", 1.0))
    
    # تطبيق الحد الأقصى
    max_surge = surge_settings.get("max_surge_amount", 0)
    if max_surge > 0:
        driver_delivery_fee = min(driver_delivery_fee, original_fee + max_surge)
    
    return {
        "fee": driver_delivery_fee,
        "applied": True,
        "reason": surge_reason,
        "increase": driver_delivery_fee - original_fee
    }


async def process_wallet_payment(user_id: str, total: float, store_name: str) -> None:
    """معالجة الدفع من المحفظة"""
    import uuid
    
    wallet = await db.wallets.find_one({"user_id": user_id})
    balance = wallet.get("balance", 0) if wallet else 0
    
    if balance < total:
        raise HTTPException(status_code=400, detail="رصيد المحفظة غير كافي")
    
    # خصم من المحفظة
    await db.wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"balance": -total}}
    )
    
    # تسجيل المعاملة
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "payment",
        "amount": -total,
        "description": f"طلب طعام من {store_name}",
        "created_at": datetime.now(timezone.utc).isoformat()
    })


async def send_order_notifications(
    store_id: str,
    order_number: str,
    total: float,
    delivery_city: str,
    user_id: str,
    order_id: str,
    store_name: str,
    estimated_time: int,
    distance: float
) -> None:
    """إرسال إشعارات الطلب"""
    # إشعارات Push للمتجر والسائقين
    try:
        from routes.push_notifications import (
            send_new_order_notification_to_food_seller,
            send_new_order_notification_to_delivery
        )
        await send_new_order_notification_to_food_seller(
            store_id=store_id,
            order_number=order_number,
            total=total
        )
        await send_new_order_notification_to_delivery(
            order_type="طعام",
            city=delivery_city
        )
    except Exception as e:
        print(f"Push notification error: {e}")
    
    # إشعار للعميل
    try:
        from services.notification_helper import send_notification_with_push
        
        if estimated_time > 45:
            emoji = "⏰"
            time_note = f"الوقت المتوقع: ~{estimated_time} دقيقة (المطعم يبعد {round(distance, 1)} كم)"
        else:
            emoji = "🍔"
            time_note = f"الوقت المتوقع: ~{estimated_time} دقيقة"
        
        await send_notification_with_push(
            user_id=user_id,
            title=f"{emoji} تم استلام طلبك!",
            message=f"طلبك من {store_name} قيد التحضير\n{time_note}",
            notification_type="food_order",
            data={
                "order_id": order_id,
                "order_number": order_number,
                "store_name": store_name,
                "estimated_time": estimated_time,
                "distance_km": round(distance, 2),
                "action": "view_order"
            },
            play_sound=True,
            priority="high"
        )
    except Exception as e:
        print(f"Customer notification error: {e}")


# ============== ثوابت إضافية ==============

# تصنيفات أنواع المتاجر للتوصيل
HOT_FRESH_STORE_TYPES = ["restaurants", "cafes", "bakery", "drinks", "sweets"]
COLD_DRY_STORE_TYPES = ["market", "vegetables"]

# الحدود الافتراضية
DEFAULT_HOT_FRESH_LIMIT = 2
DEFAULT_COLD_DRY_LIMIT = 5

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

PLATFORM_WALLET_ID = "platform_admin_wallet"


# ============== دوال إضافية ==============

def get_first_name(full_name: str) -> str:
    """استخراج الاسم الأول فقط من الاسم الكامل"""
    if not full_name:
        return "السائق"
    return full_name.strip().split()[0] if full_name.strip() else "السائق"


def get_store_delivery_category(store_type: str) -> str:
    """تحديد تصنيف التوصيل للمتجر (hot_fresh أو cold_dry)"""
    if store_type in HOT_FRESH_STORE_TYPES:
        return "hot_fresh"
    elif store_type in COLD_DRY_STORE_TYPES:
        return "cold_dry"
    else:
        return "hot_fresh"


async def get_driver_km_settings() -> dict:
    """جلب إعدادات أجرة السائق بالكيلومتر"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    default_settings = {
        "enabled": True,
        "base_fee": 1000,
        "price_per_km": 300,
        "min_fee": 1500
    }
    
    if settings and "driver_km_settings" in settings:
        return {**default_settings, **settings["driver_km_settings"]}
    
    return default_settings


async def calculate_driver_fee_by_km(distance_km: float) -> dict:
    """حساب أجرة السائق بناءً على المسافة"""
    settings = await get_driver_km_settings()
    
    if not settings.get("enabled", True):
        platform_settings = await db.platform_settings.find_one({"id": "main"})
        fixed_fee = platform_settings.get("food_delivery_fee", 5000) if platform_settings else 5000
        return {
            "driver_fee": fixed_fee,
            "distance_km": distance_km,
            "calculation_method": "fixed",
            "details": None
        }
    
    base_fee = settings.get("base_fee", 1000)
    price_per_km = settings.get("price_per_km", 300)
    min_fee = settings.get("min_fee", 1500)
    
    calculated_fee = base_fee + (distance_km * price_per_km)
    final_fee = max(calculated_fee, min_fee)
    final_fee = round(final_fee)
    
    return {
        "driver_fee": final_fee,
        "distance_km": round(distance_km, 2),
        "calculation_method": "per_km",
        "details": {
            "base_fee": base_fee,
            "price_per_km": price_per_km,
            "min_fee": min_fee,
            "calculated": round(calculated_fee)
        }
    }


async def get_driver_cancel_settings() -> dict:
    """جلب إعدادات إلغاء السائقين"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    default_settings = {
        "max_cancel_rate": 20,
        "warning_threshold": 15,
        "lookback_orders": 50,
        "penalty_duration_hours": 24,
        "penalty_fee": 5000,
        "free_cancels_per_day": 2
    }
    
    if settings and "driver_cancel_settings" in settings:
        return {**default_settings, **settings["driver_cancel_settings"]}
    
    return default_settings


async def calculate_driver_cancel_rate(driver_id: str, lookback: int = 50) -> dict:
    """حساب نسبة إلغاء السائق"""
    recent_orders = await db.food_orders.find(
        {"driver_id": driver_id},
        {"_id": 0, "status": 1, "cancelled_by": 1}
    ).sort("created_at", -1).limit(lookback).to_list(length=lookback)
    
    if not recent_orders:
        return {
            "total_orders": 0,
            "cancelled_orders": 0,
            "cancel_rate": 0,
            "status": "good"
        }
    
    total = len(recent_orders)
    cancelled = sum(1 for o in recent_orders if o.get("cancelled_by") == "driver")
    rate = (cancelled / total * 100) if total > 0 else 0
    
    settings = await get_driver_cancel_settings()
    max_rate = settings.get("max_cancel_rate", 20)
    warning_threshold = settings.get("warning_threshold", 15)
    
    status = "good"
    if rate >= max_rate:
        status = "blocked"
    elif rate >= warning_threshold:
        status = "warning"
    
    return {
        "total_orders": total,
        "cancelled_orders": cancelled,
        "cancel_rate": round(rate, 1),
        "status": status,
        "max_rate": max_rate,
        "warning_threshold": warning_threshold
    }


async def add_commission_to_platform_wallet_food(order_id: str, commission_amount: float, order_number: str = "") -> dict:
    """إضافة عمولة طلبات الطعام لمحفظة المنصة"""
    import uuid
    
    if commission_amount <= 0:
        return
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.platform_wallet.update_one(
        {"id": PLATFORM_WALLET_ID},
        {
            "$inc": {
                "balance": commission_amount,
                "total_commission_food": commission_amount
            },
            "$set": {"updated_at": now}
        },
        upsert=True
    )
    
    transaction = {
        "id": str(uuid.uuid4()),
        "type": "commission",
        "order_type": "food",
        "amount": commission_amount,
        "order_id": order_id,
        "created_at": now,
        "description": f"عمولة طلب طعام #{order_number or order_id[:8]}"
    }
    await db.platform_wallet_transactions.insert_one(transaction)


async def send_priority_order_push_notification(order: dict) -> dict:
    """إرسال إشعار Push للسائقين الذين لديهم طلبات من نفس المطعم"""
    import uuid
    
    try:
        from core.firebase_admin import send_push_to_user
        
        restaurant_id = order.get("restaurant_id") or order.get("store_id")
        if not restaurant_id:
            return
        
        drivers_with_same_restaurant = await db.food_orders.aggregate([
            {
                "$match": {
                    "status": "out_for_delivery",
                    "$or": [
                        {"restaurant_id": restaurant_id},
                        {"store_id": restaurant_id}
                    ],
                    "driver_id": {"$ne": None}
                }
            },
            {
                "$group": {
                    "_id": "$driver_id"
                }
            }
        ]).to_list(length=50)
        
        if not drivers_with_same_restaurant:
            return
        
        driver_ids = [d["_id"] for d in drivers_with_same_restaurant]
        
        store_name = order.get("restaurant_name") or order.get("store_name") or "المطعم"
        delivery_fee = order.get("driver_delivery_fee") or order.get("delivery_fee") or 0
        delivery_area = ""
        if order.get("delivery_address"):
            if isinstance(order["delivery_address"], dict):
                delivery_area = order["delivery_address"].get("city") or order["delivery_address"].get("area") or ""
            else:
                delivery_area = str(order["delivery_address"])[:30]
        
        for driver_id in driver_ids:
            await send_push_to_user(
                user_id=driver_id,
                title="🔔 طلب عاجل من نفس المطعم!",
                body=f"💰 +{delivery_fee:,} ل.س من {store_name} - {delivery_area}",
                data={
                    "type": "priority_order",
                    "order_id": order.get("id", ""),
                    "store_name": store_name,
                    "delivery_fee": str(delivery_fee),
                    "click_action": "/delivery/dashboard?tab=my"
                }
            )
            
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": driver_id,
                "title": "🔔 طلب عاجل من نفس المطعم!",
                "message": f"💰 +{delivery_fee:,} ل.س من {store_name} - {delivery_area}",
                "type": "priority_order",
                "order_id": order.get("id"),
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        print(f"✅ Priority push sent to {len(driver_ids)} drivers for order from {store_name}")
        
    except Exception as e:
        print(f"❌ Error sending priority push: {e}")



# ============== دوال الطلبات التجميعية (Batch) ==============

async def check_batch_readiness_and_notify_driver(batch_id: str, ready_order_id: str) -> dict:
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
    (ready_count / total_orders) * 100
    
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


async def calculate_optimal_pickup_order(batch_id: str, driver_lat: float, driver_lng: float) -> list:
    """
    حساب ترتيب الاستلام الأمثل للطلب التجميعي
    المنطق: استلم من المتجر الأبعد عن العميل أولاً، والأقرب أخيراً
    هكذا الطعام الذي يُستلم أخيراً يكون الأحدث
    """
    from math import radians, sin, cos, sqrt, atan2
    
    def haversine(lat1, lon1, lat2, lon2) -> list:
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
    
    # جلب معرفات المتاجر
    store_ids = list(set([o.get("store_id") for o in batch_orders if o.get("store_id")]))
    
    # جلب جميع المتاجر دفعة واحدة
    stores_list = await db.food_stores.find(
        {"id": {"$in": store_ids}},
        {"_id": 0}
    ).to_list(None)
    stores_map = {s["id"]: s for s in stores_list}
    
    # حساب المسافة من كل متجر للعميل
    stores_with_distance = []
    for order in batch_orders:
        store = stores_map.get(order.get("store_id"))
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


# ============== دوال الأرباح والدفع ==============

async def add_driver_earnings_food(driver: dict, amount: float, order: dict) -> None:
    """
    إضافة أجرة توصيل طلب الطعام للسائق (معلقة لمدة ساعة واحدة)
    """
    import logging
    from services.earnings_hold import add_held_earnings
    
    await add_held_earnings(
        user_id=driver["id"],
        user_type="delivery",
        amount=amount,
        order_id=order["id"],
        order_type="food",  # طعام = 1 ساعة تعليق
        description=f"أجرة توصيل طلب #{order['order_number']}"
    )
    
    # التحقق من التأمين وخصم تلقائي إذا لزم
    try:
        from routes.driver_security import check_and_deduct_for_security
        await check_and_deduct_for_security(driver["id"])
    except Exception as e:
        logging.error(f"Error checking security deposit: {e}")


async def add_seller_earnings_food(seller_id: str, amount: float, order: dict) -> None:
    """
    إضافة أرباح بائع الطعام (معلقة لمدة ساعة واحدة)
    """
    from services.earnings_hold import add_held_earnings
    
    # تحديد نوع البائع
    seller = await db.users.find_one({"id": seller_id}, {"_id": 0, "user_type": 1})
    user_type = seller.get("user_type", "food_seller") if seller else "food_seller"
    
    await add_held_earnings(
        user_id=seller_id,
        user_type=user_type,
        amount=amount,
        order_id=order["id"],
        order_type="food",  # طعام = 1 ساعة تعليق
        description=f"أرباح مبيعات طلب #{order['order_number']}"
    )


async def add_earnings_directly(driver: dict, amount: float, order: dict, user_type: str) -> None:
    """إضافة أرباح مباشرة بدون تعليق (Fallback) - استخدم add_driver_earnings_food بدلاً منها"""
    # إعادة توجيه للدالة الجديدة
    await add_driver_earnings_food(driver, amount, order)


async def add_seller_earnings_directly(seller_id: str, amount: float, order: dict) -> None:
    """إضافة أرباح البائع مباشرة - استخدم add_seller_earnings_food بدلاً منها"""
    # إعادة توجيه للدالة الجديدة
    await add_seller_earnings_food(seller_id, amount, order)



# ============== دالة إتمام التسليم والدفع ==============

async def complete_delivery_and_pay_driver(order: dict, driver: dict, note: str) -> None:
    """
    إتمام التسليم وإضافة الأجرة لمحفظة السائق (مع التعليق)
    
    Args:
        order: بيانات الطلب
        driver: بيانات السائق
        note: ملاحظة للسجل
    """
    import uuid
    
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
    
    # حساب أرباح السائق من إعدادات المنصة
    delivery_fee = order.get("delivery_fee", 0)
    driver_delivery_fee = order.get("driver_delivery_fee", delivery_fee)
    
    # جلب إعدادات المنصة
    platform_settings = await db.platform_settings.find_one({"id": "main"})
    
    # جلب إعدادات أرباح السائق من المنصة
    driver_settings = platform_settings.get("driver_earnings", {}) if platform_settings else {}
    base_fee = driver_settings.get("base_fee", 1000)
    
    # ربح السائق = الربح الأساسي + أجرة التوصيل
    driver_earning = base_fee + driver_delivery_fee
    
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
    
    # إضافة العمولة لمحفظة المنصة (الأدمن)
    if platform_commission > 0:
        await add_commission_to_platform_wallet_food(order["id"], platform_commission, order.get("order_number", ""))
    
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
    
    # جلب طلبات الطعام المتبقية
    remaining_food_orders = await db.food_orders.find({
        "driver_id": driver["id"],
        "status": {"$in": ["accepted", "out_for_delivery", "picked_up"]},
        "id": {"$ne": order["id"]}
    }).to_list(length=100)
    
    # جلب جميع المتاجر للطلبات المتبقية دفعة واحدة
    remaining_store_ids = list(set(o.get("store_id") for o in remaining_food_orders if o.get("store_id")))
    if remaining_store_ids:
        remaining_stores_list = await db.food_stores.find(
            {"id": {"$in": remaining_store_ids}},
            {"_id": 0, "id": 1, "store_type": 1}
        ).to_list(None)
        remaining_stores_map = {s["id"]: s for s in remaining_stores_list}
    else:
        remaining_stores_map = {}
    
    # حساب عدد الطلبات الساخنة/الطازجة المتبقية
    remaining_hot_fresh = 0
    for o in remaining_food_orders:
        o_store = remaining_stores_map.get(o.get("store_id"))
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



# ============== دوال جلب البيانات الشائعة ==============

async def get_order_by_id(order_id: str, projection: dict = None) -> dict:
    """جلب طلب بواسطة المعرف"""
    proj = projection or {"_id": 0}
    return await db.food_orders.find_one({"id": order_id}, proj)


async def get_store_by_id(store_id: str, projection: dict = None) -> dict:
    """جلب متجر بواسطة المعرف"""
    proj = projection or {"_id": 0}
    return await db.food_stores.find_one({"id": store_id}, proj)


async def get_driver_by_id(driver_id: str, projection: dict = None) -> dict:
    """جلب سائق بواسطة المعرف"""
    proj = projection or {"_id": 0}
    return await db.users.find_one({"id": driver_id, "user_type": "delivery"}, proj)


async def get_customer_by_id(customer_id: str, projection: dict = None) -> dict:
    """جلب عميل بواسطة المعرف"""
    proj = projection or {"_id": 0}
    return await db.users.find_one({"id": customer_id}, proj)


async def get_driver_active_food_orders(driver_id: str) -> list:
    """جلب طلبات الطعام النشطة للسائق"""
    return await db.food_orders.find({
        "driver_id": driver_id,
        "status": {"$in": ["accepted", "picked_up", "out_for_delivery"]}
    }, {"_id": 0}).to_list(None)


async def get_available_orders_for_delivery() -> list:
    """جلب الطلبات المتاحة للتوصيل"""
    now = datetime.now(timezone.utc).isoformat()
    return await db.food_orders.find(
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


async def get_stores_by_ids(store_ids: list, projection: dict = None) -> dict:
    """جلب متاجر متعددة وإرجاعها كـ map"""
    if not store_ids:
        return {}
    proj = projection or {"_id": 0}
    stores_list = await db.food_stores.find(
        {"id": {"$in": store_ids}},
        proj
    ).to_list(None)
    return {s["id"]: s for s in stores_list}


async def count_driver_hot_fresh_orders(driver_id: str) -> int:
    """حساب عدد طلبات الطعام الساخنة/الطازجة النشطة للسائق"""
    orders = await get_driver_active_food_orders(driver_id)
    if not orders:
        return 0
    
    # جلب المتاجر
    store_ids = list(set(o.get("store_id") for o in orders if o.get("store_id")))
    stores_map = await get_stores_by_ids(store_ids, {"_id": 0, "id": 1, "store_type": 1})
    
    count = 0
    for order in orders:
        store = stores_map.get(order.get("store_id"))
        store_type = store.get("store_type", "restaurants") if store else "restaurants"
        if store_type in HOT_FRESH_STORE_TYPES:
            count += 1
    
    return count


async def can_driver_accept_order(driver_id: str, store_type: str) -> tuple:
    """
    التحقق إذا كان السائق يمكنه قبول طلب جديد
    Returns: (can_accept: bool, reason: str, current_count: int, max_limit: int)
    """
    # جلب إعدادات الحدود
    settings = await db.platform_settings.find_one({"id": "main"})
    driver_limits = settings.get("driver_order_limits", {}) if settings else {}
    
    hot_fresh_limit = driver_limits.get("hot_fresh", DEFAULT_HOT_FRESH_LIMIT)
    cold_dry_limit = driver_limits.get("cold_dry", DEFAULT_COLD_DRY_LIMIT)
    
    # تحديد تصنيف المتجر
    category = get_store_delivery_category(store_type)
    max_limit = hot_fresh_limit if category == "hot_fresh" else cold_dry_limit
    
    # حساب الطلبات الحالية
    current_count = await count_driver_hot_fresh_orders(driver_id)
    
    if category == "hot_fresh" and current_count >= hot_fresh_limit:
        return (False, f"لديك بالفعل {current_count} طلبات ساخنة/طازجة (الحد الأقصى: {hot_fresh_limit})", current_count, hot_fresh_limit)
    
    return (True, "", current_count, max_limit)


# ============== دوال تحديث الطلبات ==============

async def update_order_status_with_history(order_id: str, new_status: str, note: str = "", extra_fields: dict = None) -> bool:
    """تحديث حالة الطلب مع إضافة سجل"""
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "$set": {
            "status": new_status,
            "updated_at": now
        },
        "$push": {
            "status_history": {
                "status": new_status,
                "timestamp": now,
                "note": note
            }
        }
    }
    
    if extra_fields:
        update_data["$set"].update(extra_fields)
    
    result = await db.food_orders.update_one({"id": order_id}, update_data)
    return result.modified_count > 0


async def assign_driver_to_order(order_id: str, driver_id: str, driver_name: str) -> bool:
    """تعيين سائق لطلب"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.food_orders.update_one(
        {"id": order_id, "driver_id": None},  # فقط إذا لم يتم تعيين سائق
        {
            "$set": {
                "driver_id": driver_id,
                "driver_name": driver_name,
                "driver_assigned_at": now,
                "status": "accepted",
                "driver_status": "accepted",
                "updated_at": now
            },
            "$push": {
                "status_history": {
                    "status": "accepted",
                    "timestamp": now,
                    "note": f"تم قبول الطلب من السائق {driver_name}"
                }
            }
        }
    )
    return result.modified_count > 0

