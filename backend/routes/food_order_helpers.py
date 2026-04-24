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
