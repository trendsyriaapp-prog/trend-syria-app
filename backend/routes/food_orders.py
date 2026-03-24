# /app/backend/routes/food_orders.py
# مسارات طلبات الطعام

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid
import math

from core.database import db, get_current_user

router = APIRouter(prefix="/food/orders", tags=["Food Orders"])

# ============== حساب المسافة والأجرة بالكيلومتر ==============

async def get_driver_km_settings():
    """جلب إعدادات أجرة السائق بالكيلومتر"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    default_settings = {
        "enabled": True,
        "base_fee": 1000,       # رسوم أساسية
        "price_per_km": 300,   # سعر الكيلومتر
        "min_fee": 1500        # الحد الأدنى
    }
    
    if settings and "driver_km_settings" in settings:
        return {**default_settings, **settings["driver_km_settings"]}
    
    return default_settings

def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """حساب المسافة بين نقطتين بالكيلومتر (Haversine)"""
    if not all([lat1, lon1, lat2, lon2]):
        return 0
    
    R = 6371  # نصف قطر الأرض بالكيلومتر
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

async def calculate_driver_fee_by_km(distance_km: float) -> dict:
    """حساب أجرة السائق بناءً على المسافة"""
    settings = await get_driver_km_settings()
    
    if not settings.get("enabled", True):
        # إذا النظام معطل، استخدم الرسوم الثابتة
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
    
    # الحساب: رسوم أساسية + (المسافة × سعر الكيلومتر)
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

# ============== إشعارات Push للطلبات العاجلة ==============

async def send_priority_order_push_notification(order: dict):
    """
    إرسال إشعار Push للسائقين الذين لديهم طلبات من نفس المطعم
    يُستدعى عندما يصبح طلب جديد ready
    """
    try:
        from core.firebase_admin import send_push_to_user
        
        restaurant_id = order.get("restaurant_id") or order.get("store_id")
        if not restaurant_id:
            return
        
        # البحث عن سائقين لديهم طلبات من نفس المطعم
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
        
        # جلب معلومات الطلب للإشعار
        store_name = order.get("restaurant_name") or order.get("store_name") or "المطعم"
        delivery_fee = order.get("driver_delivery_fee") or order.get("delivery_fee") or 0
        delivery_area = ""
        if order.get("delivery_address"):
            if isinstance(order["delivery_address"], dict):
                delivery_area = order["delivery_address"].get("city") or order["delivery_address"].get("area") or ""
            else:
                delivery_area = str(order["delivery_address"])[:30]
        
        # إرسال إشعار لكل سائق
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
            
            # تسجيل الإشعار في قاعدة البيانات
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

# ============== Platform Wallet Helper ==============

PLATFORM_WALLET_ID = "platform_admin_wallet"

async def add_commission_to_platform_wallet_food(order_id: str, commission_amount: float, order_number: str = ""):
    """إضافة عمولة طلبات الطعام لمحفظة المنصة"""
    if commission_amount <= 0:
        return
    
    now = datetime.now(timezone.utc).isoformat()
    
    # تحديث رصيد المحفظة
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
    
    # تسجيل المعاملة
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

# ============== حساب المسافة والتحذير الذكي ==============

class DistanceCheckRequest(BaseModel):
    store_id: str
    customer_lat: float
    customer_lng: float

@router.get("/check-drivers-availability/{order_id}")
async def check_drivers_availability_for_order(order_id: str, user: dict = Depends(get_current_user)):
    """
    فحص توفر السائقين القريبين للطلب
    يُستخدم من البائع قبل قبول الطلب لمعرفة حالة التوصيل
    """
    # جلب الطلب
    order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # جلب المتجر
    store = await db.food_stores.find_one({"id": order.get("store_id")}, {"_id": 0})
    if not store:
        return {
            "available": False,
            "drivers_count": 0,
            "warning_level": "error",
            "message": "خطأ في بيانات المتجر"
        }
    
    store_lat = store.get("latitude", 33.5138)
    store_lon = store.get("longitude", 36.2765)
    store_city = store.get("city", order.get("delivery_city"))
    
    # جلب السائقين المتاحين في نفس المدينة
    available_docs = await db.delivery_documents.find({
        "status": "approved",
        "is_available": True,
        "city": store_city
    }, {"_id": 0, "user_id": 1, "driver_id": 1, "delivery_id": 1}).to_list(50)
    
    if not available_docs:
        return {
            "available": False,
            "drivers_count": 0,
            "nearest_driver_km": None,
            "estimated_arrival_minutes": None,
            "warning_level": "high",
            "warning_color": "red",
            "message": "⚠️ لا يوجد سائقين متاحين حالياً في المنطقة",
            "recommendation": "يُنصح بالانتظار أو رفض الطلب"
        }
    
    driver_ids = [doc.get("user_id") or doc.get("driver_id") or doc.get("delivery_id") for doc in available_docs]
    driver_ids = [d for d in driver_ids if d]
    
    # جلب مواقع السائقين الحالية (آخر تحديث خلال 5 دقائق)
    five_min_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    
    driver_locations = await db.driver_locations.find({
        "driver_id": {"$in": driver_ids},
        "updated_at": {"$gte": five_min_ago}
    }, {"_id": 0}).to_list(50)
    
    if not driver_locations:
        return {
            "available": False,
            "drivers_count": len(driver_ids),
            "online_count": 0,
            "nearest_driver_km": None,
            "estimated_arrival_minutes": None,
            "warning_level": "medium",
            "warning_color": "orange",
            "message": f"⚠️ يوجد {len(driver_ids)} سائق معتمد لكن لا أحد متصل حالياً",
            "recommendation": "قد يتأخر قبول الطلب من السائقين"
        }
    
    # حساب المسافات لكل سائق متصل
    drivers_with_distance = []
    for loc in driver_locations:
        distance = calculate_distance_km(
            store_lat, store_lon,
            loc.get("latitude", 0), loc.get("longitude", 0)
        )
        drivers_with_distance.append({
            "driver_id": loc["driver_id"],
            "distance_km": round(distance, 2),
            "latitude": loc.get("latitude"),
            "longitude": loc.get("longitude")
        })
    
    # ترتيب حسب المسافة
    drivers_with_distance.sort(key=lambda x: x["distance_km"])
    
    nearest = drivers_with_distance[0] if drivers_with_distance else None
    nearest_km = nearest["distance_km"] if nearest else None
    
    # حساب الوقت المتوقع للوصول (متوسط سرعة 20-30 كم/ساعة في المدينة)
    avg_speed = 25  # كم/ساعة
    arrival_minutes = round((nearest_km / avg_speed) * 60) if nearest_km else None
    
    # تحديد مستوى التحذير
    nearby_drivers = [d for d in drivers_with_distance if d["distance_km"] <= 5]  # أقل من 5 كم
    
    if len(nearby_drivers) >= 2:
        # ممتاز - يوجد أكثر من سائق قريب
        return {
            "available": True,
            "drivers_count": len(driver_ids),
            "online_count": len(driver_locations),
            "nearby_count": len(nearby_drivers),
            "nearest_driver_km": nearest_km,
            "estimated_arrival_minutes": arrival_minutes,
            "warning_level": "none",
            "warning_color": "green",
            "message": f"✅ يوجد {len(nearby_drivers)} سائق على بُعد أقل من 5 كم",
            "sub_message": f"الوقت المتوقع للاستلام: {arrival_minutes} دقيقة" if arrival_minutes else None,
            "recommendation": "يمكن قبول الطلب بثقة"
        }
    elif len(nearby_drivers) == 1:
        # جيد - يوجد سائق واحد قريب
        return {
            "available": True,
            "drivers_count": len(driver_ids),
            "online_count": len(driver_locations),
            "nearby_count": 1,
            "nearest_driver_km": nearest_km,
            "estimated_arrival_minutes": arrival_minutes,
            "warning_level": "low",
            "warning_color": "green",
            "message": f"✅ يوجد سائق على بُعد {nearest_km} كم",
            "sub_message": f"الوقت المتوقع للاستلام: {arrival_minutes} دقيقة",
            "recommendation": "يمكن قبول الطلب"
        }
    elif nearest_km and nearest_km <= 8:
        # متوسط - السائق ليس قريباً جداً
        return {
            "available": True,
            "drivers_count": len(driver_ids),
            "online_count": len(driver_locations),
            "nearby_count": 0,
            "nearest_driver_km": nearest_km,
            "estimated_arrival_minutes": arrival_minutes,
            "warning_level": "medium",
            "warning_color": "orange",
            "message": f"📍 أقرب سائق على بُعد {nearest_km} كم",
            "sub_message": f"الوقت المتوقع للاستلام: {arrival_minutes} دقيقة",
            "recommendation": "قد يتأخر استلام الطلب قليلاً"
        }
    else:
        # سيء - السائق بعيد جداً
        return {
            "available": True,
            "drivers_count": len(driver_ids),
            "online_count": len(driver_locations),
            "nearby_count": 0,
            "nearest_driver_km": nearest_km,
            "estimated_arrival_minutes": arrival_minutes,
            "warning_level": "high",
            "warning_color": "red",
            "message": f"⚠️ أقرب سائق على بُعد {nearest_km} كم",
            "sub_message": f"الوقت المتوقع للاستلام: {arrival_minutes} دقيقة - قد يبرد الطعام!",
            "recommendation": "يُنصح بتأجيل قبول الطلب أو تحذير العميل"
        }

@router.post("/check-distance")
async def check_delivery_distance(data: DistanceCheckRequest):
    """
    حساب المسافة بين المتجر والعميل وإرجاع تحذير ذكي إذا لزم الأمر
    يُستخدم من الـ Frontend لعرض تحذير قبل الطلب
    """
    # جلب بيانات المتجر
    store = await db.food_stores.find_one({"id": data.store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    store_lat = store.get("latitude")
    store_lng = store.get("longitude")
    
    if not store_lat or not store_lng:
        return {
            "success": False,
            "error": "المتجر لا يملك موقع محدد"
        }
    
    # حساب المسافة
    distance_km = calculate_distance_km(
        store_lat, store_lng,
        data.customer_lat, data.customer_lng
    )
    
    # حساب الوقت التقديري (متوسط سرعة 25 كم/ساعة في المدينة + وقت التحضير)
    avg_speed_kmh = 25
    travel_time_minutes = (distance_km / avg_speed_kmh) * 60
    preparation_time = store.get("delivery_time", 20)  # وقت التحضير الافتراضي
    total_estimated_time = round(preparation_time + travel_time_minutes)
    
    # حساب رسوم التوصيل
    fee_info = await calculate_driver_fee_by_km(distance_km)
    
    # تحديد مستوى التحذير
    warning_level = "none"
    warning_message = None
    warning_emoji = None
    
    if distance_km > 10:
        warning_level = "high"
        warning_emoji = "⚠️"
        warning_message = f"المطعم بعيد جداً ({distance_km:.1f} كم) - قد يصل الطعام بارداً"
    elif distance_km > 5:
        warning_level = "medium"
        warning_emoji = "📍"
        warning_message = f"المطعم يبعد {distance_km:.1f} كم - الوقت المتوقع: {total_estimated_time} دقيقة"
    elif distance_km > 3:
        warning_level = "low"
        warning_emoji = "🛵"
        warning_message = f"المطعم يبعد {distance_km:.1f} كم - التوصيل خلال {total_estimated_time} دقيقة"
    
    return {
        "success": True,
        "distance_km": round(distance_km, 2),
        "estimated_time_minutes": total_estimated_time,
        "delivery_fee": fee_info["driver_fee"],
        "warning": {
            "level": warning_level,
            "emoji": warning_emoji,
            "message": warning_message
        } if warning_level != "none" else None,
        "store_name": store.get("name"),
        "store_type": store.get("store_type")
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
    # الجدولة
    scheduled_for: Optional[str] = None  # ISO datetime string للطلبات المجدولة
    is_scheduled: bool = False


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
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None


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
    
    # ===== حساب المسافة بين المطعم والعميل =====
    # ملاحظة: تم إزالة قيد المسافة القصوى - العميل يقرر والتحذير يظهر في الواجهة
    
    # إحداثيات المتجر (مطلوبة)
    store_lat = store.get("latitude")
    store_lng = store.get("longitude")
    
    if not store_lat or not store_lng:
        raise HTTPException(
            status_code=400,
            detail="المتجر لا يملك موقع محدد. يرجى التواصل مع المتجر لتحديث موقعه."
        )
    
    # إحداثيات العميل (مطلوبة)
    customer_lat = order.latitude or order.delivery_latitude
    customer_lng = order.longitude or order.delivery_longitude
    
    if not customer_lat or not customer_lng:
        raise HTTPException(
            status_code=400,
            detail="يرجى تحديد موقعك على الخريطة لحساب أجرة التوصيل بدقة."
        )
    
    # حساب المسافة (للتسجيل وحساب الأجرة فقط - بدون رفض الطلب)
    import math
    R = 6371  # نصف قطر الأرض بالكيلومتر
    
    lat1, lon1 = math.radians(store_lat), math.radians(store_lng)
    lat2, lon2 = math.radians(customer_lat), math.radians(customer_lng)
    
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    distance = R * c
    
    # لا نرفض الطلب بناءً على المسافة - العميل اختار المطعم وهو على علم بالمسافة
    
    # حساب الوقت المتوقع للتوصيل (تحضير + سفر)
    preparation_time_raw = store.get("delivery_time", 20)
    try:
        preparation_time = float(preparation_time_raw) if preparation_time_raw else 20
    except (ValueError, TypeError):
        preparation_time = 20
    avg_speed_kmh = 25  # متوسط سرعة السائق في المدينة
    travel_time_minutes = (distance / avg_speed_kmh) * 60
    estimated_total_time = round(preparation_time + travel_time_minutes)
    
    # حساب المجموع
    subtotal = 0
    order_items = []
    
    for item in order.items:
        product = await db.food_products.find_one({"id": item.product_id})
        if not product:
            raise HTTPException(status_code=400, detail=f"المنتج {item.name} غير موجود")
        
        # التحقق من حالة التوفر
        availability_status = product.get("availability_status", "available" if product.get("is_available", True) else "unavailable")
        if availability_status == "sold_out_today":
            raise HTTPException(status_code=400, detail=f"المنتج '{product['name']}' نفد مؤقتاً اليوم، سيعود غداً")
        elif availability_status == "unavailable" or not product.get("is_available", True):
            raise HTTPException(status_code=400, detail=f"المنتج '{product['name']}' غير متاح حالياً")
        
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
    
    # جلب إعدادات المنصة
    platform_settings = await db.platform_settings.find_one({"id": "main"})
    food_free_delivery_threshold = platform_settings.get("food_free_delivery_threshold", 100000) if platform_settings else 100000
    # رسوم التوصيل الموحدة من إعدادات المنصة
    food_delivery_fee = platform_settings.get("food_delivery_fee", 5000) if platform_settings else 5000
    
    # جلب رسوم الطقس الصعب
    weather_surcharge = platform_settings.get("weather_surcharge", {}) if platform_settings else {}
    weather_surcharge_active = weather_surcharge.get("is_active", False)
    weather_surcharge_amount = weather_surcharge.get("amount", 0) if weather_surcharge_active else 0
    weather_surcharge_reason = weather_surcharge.get("reason", "") if weather_surcharge_active else ""
    
    # التحقق من عرض الشحن المجاني الشامل
    global_free_shipping = await db.settings.find_one({"key": "global_free_shipping"})
    is_global_free_shipping = False
    if global_free_shipping and global_free_shipping.get("is_active"):
        applies_to = global_free_shipping.get("applies_to", "all")
        if applies_to in ["all", "food"]:
            # التحقق من تاريخ الانتهاء
            end_date = global_free_shipping.get("end_date")
            if end_date:
                try:
                    end_datetime = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                    if end_datetime.tzinfo is None:
                        end_datetime = end_datetime.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) <= end_datetime:
                        is_global_free_shipping = True
                except:
                    pass
            else:
                is_global_free_shipping = True
    
    # حساب المجموع النهائي قبل التوصيل
    final_subtotal = subtotal - total_discount
    
    # التحقق من الحد المجاني للتوصيل (لكل متجر على حدة) أو العرض الشامل
    is_free_delivery = is_global_free_shipping or (food_free_delivery_threshold > 0 and final_subtotal >= food_free_delivery_threshold)
    
    # ========== حساب أجرة السائق بنظام الكيلومتر ==========
    delivery_distance_km = order.delivery_distance_km
    
    # إحداثيات المتجر (تم التحقق منها مسبقاً)
    # store_lat و store_lng معرّفة مسبقاً في السطر 285-286
    
    # حساب المسافة إذا لم تُرسل من Frontend
    if delivery_distance_km is None:
        # محاولة الحصول على إحداثيات العميل
        customer_lat = None
        customer_lon = None
        
        # 1. من الطلب مباشرة (delivery_latitude, delivery_longitude)
        if order.delivery_latitude and order.delivery_longitude:
            customer_lat = order.delivery_latitude
            customer_lon = order.delivery_longitude
        # 2. من latitude/longitude في الطلب
        elif order.latitude and order.longitude:
            customer_lat = order.latitude
            customer_lon = order.longitude
        # 3. من delivery_address إذا كان كائن
        elif isinstance(order.delivery_address, dict):
            customer_lat = order.delivery_address.get("lat") or order.delivery_address.get("latitude")
            customer_lon = order.delivery_address.get("lng") or order.delivery_address.get("lon") or order.delivery_address.get("longitude")
        
        # التحقق من وجود إحداثيات العميل (مطلوبة)
        if not customer_lat or not customer_lon:
            raise HTTPException(
                status_code=400,
                detail="يرجى تحديد موقعك على الخريطة لحساب أجرة التوصيل بدقة."
            )
        
        try:
            delivery_distance_km = calculate_distance_km(
                float(store_lat), float(store_lng),
                float(customer_lat), float(customer_lon)
            )
        except (ValueError, TypeError):
            raise HTTPException(
                status_code=400,
                detail="خطأ في حساب المسافة. يرجى التأكد من صحة الموقع."
            )
    
    # حساب أجرة السائق بالكيلومتر (دائماً)
    km_calculation = await calculate_driver_fee_by_km(delivery_distance_km)
    driver_delivery_fee = km_calculation["driver_fee"]
    delivery_calculation_method = km_calculation["calculation_method"]
    delivery_calculation_details = km_calculation["details"]
    
    # 🔥 تطبيق التسعير الديناميكي (Surge Pricing)
    surge_settings = await db.platform_settings.find_one({"id": "surge_pricing"}, {"_id": 0})
    surge_applied = False
    surge_reason = ""
    original_delivery_fee = driver_delivery_fee
    
    if surge_settings and surge_settings.get("is_active", False):
        applies_to = surge_settings.get("applies_to", "all")
        if applies_to in ["all", "food_only"]:
            surge_applied = True
            surge_reason = surge_settings.get("reason", "زيادة الطلب")
            
            # حساب الزيادة
            if surge_settings.get("fixed_amount", 0) > 0:
                driver_delivery_fee = driver_delivery_fee + surge_settings["fixed_amount"]
            else:
                driver_delivery_fee = int(driver_delivery_fee * surge_settings.get("multiplier", 1.0))
            
            # تطبيق الحد الأقصى
            max_surge = surge_settings.get("max_surge_amount", 0)
            if max_surge > 0:
                driver_delivery_fee = min(driver_delivery_fee, original_delivery_fee + max_surge)
    
    # ما يدفعه العميل (صفر إذا توصيل مجاني)
    if is_free_delivery:
        delivery_fee = 0  # العميل لا يدفع
    else:
        delivery_fee = driver_delivery_fee  # العميل يدفع (مع الزيادة إذا مفعّلة)
    
    # إضافة رسوم الطقس الصعب (فقط إذا لم يكن التوصيل مجاني)
    applied_weather_surcharge = 0
    if weather_surcharge_active and not is_free_delivery:
        applied_weather_surcharge = weather_surcharge_amount
    
    total = final_subtotal + delivery_fee + applied_weather_surcharge
    
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
        "store_phone": store.get("phone", ""),  # رقم هاتف المتجر
        "store_type": store["store_type"],
        "store_latitude": store.get("latitude"),  # إحداثيات المتجر
        "store_longitude": store.get("longitude"),  # إحداثيات المتجر
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
        "driver_delivery_fee": driver_delivery_fee,  # أجرة السائق (تُدفع دائماً)
        "is_platform_paid_delivery": is_free_delivery,  # هل المنصة تدفع أجرة التوصيل؟
        "delivery_distance_km": round(delivery_distance_km, 2) if delivery_distance_km else None,
        "delivery_calculation_method": delivery_calculation_method,  # fixed أو per_km
        "delivery_calculation_details": delivery_calculation_details,  # تفاصيل الحساب
        "weather_surcharge": applied_weather_surcharge,
        "weather_surcharge_reason": weather_surcharge_reason if applied_weather_surcharge > 0 else None,
        "surge_pricing_applied": surge_applied,
        "surge_pricing_reason": surge_reason if surge_applied else None,
        "surge_pricing_increase": (driver_delivery_fee - original_delivery_fee) if surge_applied else 0,
        "total": total,
        "delivery_address": order.delivery_address,
        "delivery_city": order.delivery_city,
        "delivery_phone": order.delivery_phone,
        "latitude": order.delivery_latitude or order.latitude,
        "longitude": order.delivery_longitude or order.longitude,
        "notes": order.notes,
        "payment_method": order.payment_method,
        "payment_status": "paid" if order.payment_method == "wallet" else "pending",
        "status": "scheduled" if order.is_scheduled else "pending",
        "is_scheduled": order.is_scheduled,
        "scheduled_for": order.scheduled_for if order.is_scheduled else None,
        "delivery_code": delivery_code,
        "delivery_code_verified": False,
        "customer_not_responding": False,
        "customer_not_responding_since": None,
        "left_at_door": False,
        "status_history": [{
            "status": "scheduled" if order.is_scheduled else "pending",
            "timestamp": now.isoformat(),
            "note": f"طلب مجدول ليوم {order.scheduled_for}" if order.is_scheduled else "تم استلام الطلب - ينتظر انتهاء مهلة الإلغاء"
        }],
        "estimated_delivery_time": store.get("delivery_time", 30),
        "driver_id": None,
        "created_at": now.isoformat(),
        "can_process_after": can_process_after.isoformat(),
        "cancel_window_minutes": CANCEL_WINDOW_MINUTES,
        "seller_notified": False,
        "driver_notified": False,
        "distance_km": round(distance, 2),
        "estimated_total_time": estimated_total_time
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
    
    # 🆕 إرسال إشعار للعميل مع الوقت المتوقع
    try:
        from services.notification_helper import send_notification_with_push
        
        # تحديد نوع الرسالة حسب الوقت
        if estimated_total_time > 45:
            emoji = "⏰"
            time_note = f"الوقت المتوقع: ~{estimated_total_time} دقيقة (المطعم يبعد {round(distance, 1)} كم)"
        else:
            emoji = "🍔"
            time_note = f"الوقت المتوقع: ~{estimated_total_time} دقيقة"
        
        await send_notification_with_push(
            user_id=user["id"],
            title=f"{emoji} تم استلام طلبك!",
            message=f"طلبك من {store.get('name')} قيد التحضير\n{time_note}",
            notification_type="food_order",
            data={
                "order_id": order_id,
                "order_number": order_number,
                "store_name": store.get("name"),
                "estimated_time": estimated_total_time,
                "distance_km": round(distance, 2),
                "action": "view_order"
            },
            play_sound=True,
            priority="high"
        )
    except Exception as e:
        print(f"Customer notification error: {e}")
    
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
    
    response_data = {
        "order_id": order_id,
        "order_number": order_number,
        "total": total,
        "estimated_time": store.get("delivery_time", 30),
        "cancel_window_minutes": CANCEL_WINDOW_MINUTES,
        "message": "تم إنشاء الطلب. يمكنك إلغاءه خلال 3 دقائق."
    }
    
    if order.is_scheduled:
        response_data["is_scheduled"] = True
        response_data["scheduled_for"] = order.scheduled_for
        response_data["message"] = f"تم جدولة الطلب بنجاح ليوم {order.scheduled_for}"
    
    return response_data


# ============== الطلبات المجدولة ==============

@router.get("/my-scheduled")
async def get_my_scheduled_orders(user: dict = Depends(get_current_user)):
    """جلب طلباتي المجدولة"""
    orders = await db.food_orders.find(
        {
            "customer_id": user["id"],
            "is_scheduled": True,
            "status": "scheduled"
        },
        {"_id": 0}
    ).sort("scheduled_for", 1).to_list(50)
    
    return {"orders": orders}


@router.post("/{order_id}/activate-scheduled")
async def activate_scheduled_order(order_id: str, user: dict = Depends(get_current_user)):
    """تفعيل طلب مجدول (تحويله من مجدول إلى معلق)"""
    order = await db.food_orders.find_one({"id": order_id, "customer_id": user["id"]})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if not order.get("is_scheduled"):
        raise HTTPException(status_code=400, detail="هذا ليس طلباً مجدولاً")
    
    if order["status"] != "scheduled":
        raise HTTPException(status_code=400, detail="الطلب تم تفعيله مسبقاً")
    
    now = datetime.now(timezone.utc)
    
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "pending",
                "activated_at": now.isoformat()
            },
            "$push": {
                "status_history": {
                    "status": "pending",
                    "timestamp": now.isoformat(),
                    "note": "تم تفعيل الطلب المجدول"
                }
            }
        }
    )
    
    return {"message": "تم تفعيل الطلب بنجاح"}


@router.delete("/{order_id}/cancel-scheduled")
async def cancel_scheduled_order(order_id: str, user: dict = Depends(get_current_user)):
    """إلغاء طلب مجدول (مع استرداد المبلغ)"""
    order = await db.food_orders.find_one({"id": order_id, "customer_id": user["id"]})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if not order.get("is_scheduled"):
        raise HTTPException(status_code=400, detail="هذا ليس طلباً مجدولاً")
    
    if order["status"] != "scheduled":
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء طلب تم تفعيله")
    
    now = datetime.now(timezone.utc)
    
    # استرداد المبلغ إذا كان مدفوعاً بالمحفظة
    if order.get("payment_method") == "wallet" and order.get("payment_status") == "paid":
        await db.wallets.update_one(
            {"user_id": user["id"]},
            {"$inc": {"balance": order["total"]}}
        )
        
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "refund",
            "amount": order["total"],
            "description": f"استرداد طلب مجدول ملغي #{order['order_number']}",
            "created_at": now.isoformat()
        })
    
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_at": now.isoformat(),
                "cancel_reason": "إلغاء طلب مجدول من قبل العميل"
            },
            "$push": {
                "status_history": {
                    "status": "cancelled",
                    "timestamp": now.isoformat(),
                    "note": "تم إلغاء الطلب المجدول"
                }
            }
        }
    )
    
    return {"message": "تم إلغاء الطلب واسترداد المبلغ"}


@router.post("/batch")
async def create_batch_food_orders(batch: BatchOrderCreate, user: dict = Depends(get_current_user)):
    """إنشاء طلبات طعام مجمعة من متاجر متعددة - دفعة واحدة لسائق واحد"""
    
    if len(batch.orders) == 0:
        raise HTTPException(status_code=400, detail="لا توجد طلبات")
    
    # ===== التحقق من إحداثيات العميل (مطلوبة) =====
    customer_lat = batch.delivery_latitude or batch.latitude
    customer_lng = batch.delivery_longitude or batch.longitude
    
    if not customer_lat or not customer_lng:
        raise HTTPException(
            status_code=400,
            detail="يرجى تحديد موقعك على الخريطة لحساب أجرة التوصيل بدقة."
        )
    
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
        
        # التحقق من إحداثيات المتجر (مطلوبة)
        if not store.get("latitude") or not store.get("longitude"):
            raise HTTPException(
                status_code=400,
                detail=f"المتجر '{store.get('name', '')}' لا يملك موقع محدد. يرجى التواصل مع المتجر."
            )
        
        # حساب مجموع كل متجر
        store_subtotal = 0
        for item in order_item.items:
            product = await db.food_products.find_one({"id": item.product_id})
            if not product:
                raise HTTPException(status_code=400, detail=f"المنتج {item.name} غير موجود")
            
            # التحقق من حالة التوفر
            availability_status = product.get("availability_status", "available" if product.get("is_available", True) else "unavailable")
            if availability_status == "sold_out_today":
                raise HTTPException(status_code=400, detail=f"المنتج '{product['name']}' نفد مؤقتاً اليوم، سيعود غداً")
            elif availability_status == "unavailable" or not product.get("is_available", True):
                raise HTTPException(status_code=400, detail=f"المنتج '{product['name']}' غير متاح حالياً")
            
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
    # رسوم التوصيل الموحدة من إعدادات المنصة
    food_delivery_fee = platform_settings.get("food_delivery_fee", 5000) if platform_settings else 5000
    
    # التحقق من عرض الشحن المجاني الشامل
    global_free_shipping = await db.settings.find_one({"key": "global_free_shipping"})
    is_global_free_shipping = False
    if global_free_shipping and global_free_shipping.get("is_active"):
        applies_to = global_free_shipping.get("applies_to", "all")
        if applies_to in ["all", "food"]:
            end_date = global_free_shipping.get("end_date")
            if end_date:
                try:
                    end_datetime = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                    # تأكد من أن end_datetime له timezone
                    if end_datetime.tzinfo is None:
                        end_datetime = end_datetime.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) <= end_datetime:
                        is_global_free_shipping = True
                except:
                    pass
            else:
                is_global_free_shipping = True
    
    # حساب الإجمالي للتحقق من المحفظة
    for info in stores_info:
        store = info["store"]
        subtotal = info["subtotal"]
        
        # حساب المسافة وأجرة التوصيل بالكيلومتر
        store_lat = store.get("latitude")
        store_lng = store.get("longitude")
        
        delivery_distance_km = calculate_distance_km(
            float(store_lat), float(store_lng),
            float(customer_lat), float(customer_lng)
        )
        
        km_calculation = await calculate_driver_fee_by_km(delivery_distance_km)
        driver_fee = km_calculation["driver_fee"]
        
        # رسوم التوصيل - استخدام الحد الموحد والرسوم الموحدة أو العرض الشامل
        if is_global_free_shipping or (food_free_delivery_threshold > 0 and subtotal >= food_free_delivery_threshold):
            delivery_fee = 0  # مجاني - عرض شامل أو العميل وصل للحد
        else:
            delivery_fee = driver_fee  # العميل يدفع أجرة السائق بالكيلومتر
        
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
        
        # ===== حساب المسافة وأجرة السائق بالكيلومتر =====
        store_lat = store.get("latitude")
        store_lng = store.get("longitude")
        
        delivery_distance_km = calculate_distance_km(
            float(store_lat), float(store_lng),
            float(customer_lat), float(customer_lng)
        )
        
        # حساب أجرة السائق بالكيلومتر
        km_calculation = await calculate_driver_fee_by_km(delivery_distance_km)
        driver_delivery_fee = km_calculation["driver_fee"]
        delivery_calculation_method = km_calculation["calculation_method"]
        delivery_calculation_details = km_calculation["details"]
        
        # 🔥 تطبيق التسعير الديناميكي (Surge Pricing)
        surge_settings = await db.platform_settings.find_one({"id": "surge_pricing"}, {"_id": 0})
        surge_applied = False
        surge_reason = ""
        original_driver_fee = driver_delivery_fee
        
        if surge_settings and surge_settings.get("is_active", False):
            applies_to = surge_settings.get("applies_to", "all")
            if applies_to in ["all", "food_only"]:
                surge_applied = True
                surge_reason = surge_settings.get("reason", "زيادة الطلب")
                
                if surge_settings.get("fixed_amount", 0) > 0:
                    driver_delivery_fee = driver_delivery_fee + surge_settings["fixed_amount"]
                else:
                    driver_delivery_fee = int(driver_delivery_fee * surge_settings.get("multiplier", 1.0))
                
                max_surge = surge_settings.get("max_surge_amount", 0)
                if max_surge > 0:
                    driver_delivery_fee = min(driver_delivery_fee, original_driver_fee + max_surge)
        
        # حساب رسوم التوصيل - استخدام الحد الموحد والرسوم الموحدة أو العرض الشامل
        is_free_delivery = is_global_free_shipping or (food_free_delivery_threshold > 0 and subtotal >= food_free_delivery_threshold)
        
        if is_free_delivery:
            delivery_fee = 0  # مجاني - عرض شامل أو العميل وصل للحد
        else:
            delivery_fee = driver_delivery_fee  # العميل يدفع (مع الزيادة إذا مفعّلة)
        
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
            "driver_delivery_fee": driver_delivery_fee,  # أجرة السائق (تُدفع دائماً)
            "is_platform_paid_delivery": is_free_delivery,  # هل المنصة تدفع أجرة التوصيل؟
            "delivery_distance_km": round(delivery_distance_km, 2),
            "delivery_calculation_method": delivery_calculation_method,
            "delivery_calculation_details": delivery_calculation_details,
            "surge_pricing_applied": surge_applied,
            "surge_pricing_reason": surge_reason if surge_applied else None,
            "surge_pricing_increase": (driver_delivery_fee - original_driver_fee) if surge_applied else 0,
            "total": order_total,
            "delivery_address": batch.delivery_address,
            "delivery_city": batch.delivery_city,
            "delivery_phone": batch.delivery_phone,
            "latitude": customer_lat,
            "longitude": customer_lng,
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
        # تعيين driver_status ليتمكن السائق من قبول الطلب
        if not order.get("driver_id"):
            update_data["driver_status"] = "waiting_for_acceptance"
        
        # ⭐ إرسال إشعار Push للسائقين الذين لديهم طلبات من نفس المطعم
        await send_priority_order_push_notification(order)
        
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
async def get_available_food_orders(
    driver_lat: float = Query(None, description="خط عرض السائق الحالي"),
    driver_lng: float = Query(None, description="خط طول السائق الحالي"),
    user: dict = Depends(get_current_user)
):
    """جلب الطلبات المتاحة للتوصيل - مرتبة حسب القرب من السائق"""
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
    
    # جلب الطلبات التي طلب البائع فيها سائقاً (نظام التنسيق الجديد)
    driver_requested_orders = await db.food_orders.find(
        {
            "driver_requested": True,
            "driver_status": {"$in": ["waiting_for_acceptance", "waiting_for_driver"]},
            "driver_id": None
        },
        {"_id": 0}
    ).sort("driver_requested_at", -1).to_list(None)
    
    # دالة حساب المسافة
    def calculate_distance(lat1, lon1, lat2, lon2):
        if not all([lat1, lon1, lat2, lon2]):
            return 9999  # مسافة كبيرة للطلبات بدون إحداثيات
        import math
        R = 6371
        lat1, lon1 = math.radians(lat1), math.radians(lon1)
        lat2, lon2 = math.radians(lat2), math.radians(lon2)
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        return R * c
    
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
            
            # حساب المسافة بين السائق والمتجر
            if driver_lat and driver_lng:
                driver_to_store_km = calculate_distance(
                    driver_lat, driver_lng,
                    store.get("latitude"), store.get("longitude")
                )
                order["driver_distance_km"] = round(driver_to_store_km, 2)
                order["driver_eta_minutes"] = round((driver_to_store_km / 25) * 60)  # متوسط سرعة 25 كم/ساعة
                
                # تصنيف القرب
                if driver_to_store_km <= 1:
                    order["proximity_label"] = "قريب جداً 🟢"
                    order["proximity_level"] = 1
                elif driver_to_store_km <= 3:
                    order["proximity_label"] = "قريب 🟡"
                    order["proximity_level"] = 2
                elif driver_to_store_km <= 5:
                    order["proximity_label"] = "متوسط 🟠"
                    order["proximity_level"] = 3
                else:
                    order["proximity_label"] = "بعيد 🔴"
                    order["proximity_level"] = 4
        
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
    
    # ترتيب الطلبات حسب القرب من السائق (إذا تم تحديد موقعه)
    if driver_lat and driver_lng:
        single_orders.sort(key=lambda x: x.get("driver_distance_km", 9999))
        batch_list.sort(key=lambda x: min([o.get("driver_distance_km", 9999) for o in x.get("orders", [])]) if x.get("orders") else 9999)
    
    # معالجة الطلبات المطلوب فيها سائق (نظام التنسيق الجديد)
    requested_orders = []
    for order in driver_requested_orders:
        order["status_label"] = ORDER_STATUSES.get(order["status"], order["status"])
        order["is_driver_request"] = True  # علامة لتمييزها في الفرونت إند
        
        # إضافة إحداثيات المتجر
        store = await db.food_stores.find_one({"id": order.get("store_id")}, {"_id": 0, "latitude": 1, "longitude": 1, "address": 1, "city": 1, "name": 1})
        if store:
            order["store_latitude"] = store.get("latitude")
            order["store_longitude"] = store.get("longitude")
            order["store_address"] = store.get("address")
            
            # حساب المسافة بين السائق والمتجر
            if driver_lat and driver_lng:
                driver_to_store_km = calculate_distance(
                    driver_lat, driver_lng,
                    store.get("latitude"), store.get("longitude")
                )
                order["driver_distance_km"] = round(driver_to_store_km, 2)
                order["driver_eta_minutes"] = round((driver_to_store_km / 25) * 60)
                
                # تصنيف القرب
                if driver_to_store_km <= 1:
                    order["proximity_label"] = "قريب جداً 🟢"
                    order["proximity_level"] = 1
                elif driver_to_store_km <= 3:
                    order["proximity_label"] = "قريب 🟡"
                    order["proximity_level"] = 2
                elif driver_to_store_km <= 5:
                    order["proximity_label"] = "متوسط 🟠"
                    order["proximity_level"] = 3
                else:
                    order["proximity_label"] = "بعيد 🔴"
                    order["proximity_level"] = 4
        
        requested_orders.append(order)
    
    # ترتيب الطلبات المطلوب فيها سائق حسب القرب
    if driver_lat and driver_lng:
        requested_orders.sort(key=lambda x: x.get("driver_distance_km", 9999))
    
    # إرجاع الطلبات الفردية + الدفعات المجمعة + الطلبات المطلوب فيها سائق
    return {
        "single_orders": single_orders,
        "batch_orders": batch_list,
        "driver_requested_orders": requested_orders,  # الطلبات التي يطلب البائع سائقاً
        "total_count": len(single_orders) + len(batch_list) + len(requested_orders),
        "sorted_by_proximity": driver_lat is not None and driver_lng is not None
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
    
    # التحقق من أن السائق ليس لديه طلبات حالية - الطلب التجميعي يقفل السائق
    current_orders = await db.food_orders.find({
        "driver_id": user["id"],
        "status": "out_for_delivery"
    }).to_list(length=10)
    
    if current_orders:
        raise HTTPException(
            status_code=400,
            detail=f"⚠️ لديك {len(current_orders)} طلب قيد التوصيل. أكمل توصيلها أولاً قبل قبول طلب تجميعي."
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
                "driver_image": user.get("photo", ""),
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
@router.post("/orders/{order_id}/accept")
@router.put("/orders/{order_id}/accept")
async def accept_food_order(
    order_id: str, 
    driver_lat: float = Query(None, description="خط عرض السائق الحالي"),
    driver_lng: float = Query(None, description="خط طول السائق الحالي"),
    user: dict = Depends(get_current_user)
):
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
    
    # التحقق إذا كان السائق لديه طلب تجميعي طعام - لا يمكنه قبول طلبات أخرى
    # ملاحظة: طلبات الطعام التجميعية فقط تقفل السائق (لأن الطعام يبرد)
    has_food_batch_order = any(o.get("batch_id") and o.get("order_source") != "products" for o in current_orders)
    if has_food_batch_order:
        batch_count = len([o for o in current_orders if o.get("batch_id")])
        raise HTTPException(
            status_code=400,
            detail=f"🔥 لديك طلب طعام تجميعي ({batch_count} متجر). أكمل توصيله أولاً لضمان وصول الطعام طازجاً."
        )
    
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
    # للطلبات الباردة: حد أقصى 3 كم بين مواقع التسليم
    # للطلبات الساخنة: يتم التحقق من المسافة أيضاً لكن مع تسامح أكبر
    COLD_DRY_MAX_DISTANCE_KM = 3.0  # الحد الأقصى للطلبات الباردة
    
    if len(current_orders) > 0:
        new_lat = order.get("latitude")
        new_lon = order.get("longitude")
        
        if new_lat and new_lon:
            # للطلبات الباردة: التحقق من أن جميع مواقع التسليم قريبة من بعضها
            if new_store_category == "cold_dry" and cold_dry_count > 0:
                for existing_order in current_orders:
                    existing_store = await db.food_stores.find_one({"id": existing_order.get("store_id")})
                    existing_category = get_store_delivery_category(existing_store.get("store_type", "restaurants")) if existing_store else "hot_fresh"
                    
                    # التحقق فقط من الطلبات الباردة الأخرى
                    if existing_category == "cold_dry":
                        existing_lat = existing_order.get("latitude")
                        existing_lon = existing_order.get("longitude")
                        
                        if existing_lat and existing_lon:
                            distance_between = calculate_distance_km(
                                existing_lat, existing_lon,
                                new_lat, new_lon
                            )
                            
                            if distance_between > COLD_DRY_MAX_DISTANCE_KM:
                                raise HTTPException(
                                    status_code=400,
                                    detail=f"📦 موقع تسليم هذا الطلب بعيد عن طلباتك الأخرى ({distance_between:.1f} كم). للطلبات الباردة، يجب أن تكون مواقع التسليم قريبة (≤ {COLD_DRY_MAX_DISTANCE_KM} كم) لضمان سرعة التوصيل."
                                )
            
            # التحقق العام من المسافة (للطلبات الساخنة وكفحص إضافي)
            first_order = current_orders[0]
            first_lat = first_order.get("latitude")
            first_lon = first_order.get("longitude")
            
            if first_lat and first_lon:
                distance = calculate_distance_km(first_lat, first_lon, new_lat, new_lon)
                
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
                "driver_image": user.get("photo", ""),
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
    
    # ========== إشعار البائع بوقت وصول السائق ==========
    driver_eta_to_store = None
    preparation_suggestion = None
    
    if driver_lat and driver_lng and store:
        store_lat = store.get("latitude")
        store_lng = store.get("longitude")
        
        if store_lat and store_lng:
            # حساب المسافة بين السائق والمتجر
            import math
            R = 6371
            lat1, lon1 = math.radians(driver_lat), math.radians(driver_lng)
            lat2, lon2 = math.radians(store_lat), math.radians(store_lng)
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
            c = 2 * math.asin(math.sqrt(a))
            driver_to_store_km = R * c
            
            # حساب وقت وصول السائق للمتجر (متوسط سرعة 25 كم/ساعة)
            avg_speed = 25
            driver_eta_to_store = round((driver_to_store_km / avg_speed) * 60)
            
            # اقتراح وقت بدء التحضير
            store_prep_time = store.get("delivery_time", 15)  # وقت التحضير المعتاد
            
            if driver_eta_to_store > store_prep_time:
                # السائق بعيد - اقتراح تأخير التحضير
                delay_minutes = driver_eta_to_store - store_prep_time
                preparation_suggestion = f"ابدأ التحضير بعد {delay_minutes} دقيقة"
                suggestion_type = "delay"
            elif driver_eta_to_store > 5:
                # السائق في الطريق - ابدأ الآن
                preparation_suggestion = "ابدأ التحضير الآن"
                suggestion_type = "start_now"
            else:
                # السائق قريب جداً
                preparation_suggestion = "السائق قريب جداً - جهّز الطلب فوراً!"
                suggestion_type = "urgent"
            
            # إرسال إشعار للبائع
            try:
                from services.notification_helper import send_notification_with_push
                
                # تحديد الأيقونة والرسالة حسب الحالة
                if suggestion_type == "delay":
                    emoji = "⏰"
                    title = f"طلب جديد #{order.get('order_number', '')[-4:]}"
                    message = f"السائق {user['name']} يصل بعد {driver_eta_to_store} دقيقة\n💡 {preparation_suggestion}"
                elif suggestion_type == "start_now":
                    emoji = "🍳"
                    title = f"ابدأ تحضير الطلب #{order.get('order_number', '')[-4:]}"
                    message = f"السائق {user['name']} يصل بعد {driver_eta_to_store} دقيقة\nابدأ التحضير الآن ليكون جاهزاً عند وصوله"
                else:
                    emoji = "🚨"
                    title = f"السائق قريب! طلب #{order.get('order_number', '')[-4:]}"
                    message = f"السائق {user['name']} يصل خلال {driver_eta_to_store} دقيقة\nجهّز الطلب فوراً!"
                
                # إشعار لصاحب المتجر
                await send_notification_with_push(
                    user_id=store.get("owner_id"),
                    title=f"{emoji} {title}",
                    message=message,
                    notification_type="driver_accepted_order",
                    data={
                        "order_id": order_id,
                        "order_number": order.get("order_number"),
                        "driver_name": user["name"],
                        "driver_phone": user.get("phone"),
                        "driver_eta_minutes": driver_eta_to_store,
                        "preparation_suggestion": preparation_suggestion,
                        "action": "prepare_order"
                    },
                    play_sound=True,
                    priority="high"
                )
            except Exception as e:
                print(f"Seller notification error: {e}")
    
    # إشعار العميل مع Push notification والوقت المتوقع
    try:
        from services.notification_helper import send_notification_with_push
        
        # حساب الوقت المتبقي للتوصيل
        distance_km = order.get("distance_km", 3)
        avg_speed_kmh = 25
        remaining_time = round((distance_km / avg_speed_kmh) * 60)
        
        # إذا كان الوقت طويل، نضيف تنبيه
        if remaining_time > 20:
            emoji = "🛵"
            time_msg = f"الوقت المتوقع للوصول: ~{remaining_time} دقيقة"
        else:
            emoji = "🚀"
            time_msg = f"يصلك خلال ~{remaining_time} دقيقة"
        
        await send_notification_with_push(
            user_id=order["customer_id"],
            title=f"{emoji} طلبك في الطريق!",
            message=f"السائق {user['name']} استلم طلبك\n{time_msg}",
            notification_type="order_out_for_delivery",
            data={
                "order_id": order_id,
                "order_number": order.get("order_number"),
                "driver_name": user["name"],
                "driver_phone": user.get("phone"),
                "estimated_arrival": remaining_time,
                "action": "track_order"
            },
            play_sound=True,
            priority="high"
        )
    except Exception as e:
        print(f"Customer pickup notification error: {e}")
        # Fallback للإشعار القديم
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


# ============== إلغاء الطلب من السائق ==============

class DriverCancelRequest(BaseModel):
    reason: str  # سبب الإلغاء (إجباري)

async def get_driver_cancel_settings():
    """جلب إعدادات إلغاء الطلب للسائق"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    default_settings = {
        "enabled": True,
        "cancel_window_seconds": 120,  # دقيقتين
        "max_cancel_rate": 10,  # 10%
        "lookback_orders": 50,  # آخر 50 طلب
        "warning_threshold": 7,  # تحذير عند 7%
        "suspension_threshold": 15  # إيقاف عند 15%
    }
    
    if settings and "driver_cancel_settings" in settings:
        return {**default_settings, **settings["driver_cancel_settings"]}
    
    return default_settings

async def calculate_driver_cancel_rate(driver_id: str, lookback: int = 50):
    """حساب نسبة إلغاء السائق"""
    # جلب آخر X طلب تم قبولها
    recent_orders = await db.food_orders.find(
        {"driver_id": driver_id},
        {"_id": 0, "id": 1, "driver_cancelled": 1}
    ).sort("picked_up_at", -1).limit(lookback).to_list(length=lookback)
    
    if len(recent_orders) < 5:
        return {"rate": 0, "cancelled": 0, "total": len(recent_orders), "enough_data": False}
    
    cancelled_count = sum(1 for o in recent_orders if o.get("driver_cancelled"))
    cancel_rate = (cancelled_count / len(recent_orders)) * 100
    
    return {
        "rate": round(cancel_rate, 1),
        "cancelled": cancelled_count,
        "total": len(recent_orders),
        "enough_data": True
    }

@router.post("/delivery/{order_id}/cancel")
async def driver_cancel_order(order_id: str, data: DriverCancelRequest, user: dict = Depends(get_current_user)):
    """
    إلغاء طلب من السائق
    - مسموح فقط خلال فترة زمنية محددة
    - يتطلب سبب
    - يؤثر على نسبة الإلغاء
    """
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # جلب إعدادات الإلغاء
    cancel_settings = await get_driver_cancel_settings()
    
    if not cancel_settings.get("enabled", True):
        raise HTTPException(status_code=403, detail="ميزة إلغاء الطلب معطلة حالياً")
    
    # جلب الطلب
    order = await db.food_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من أن السائق هو من قبل الطلب
    if order.get("driver_id") != user["id"]:
        raise HTTPException(status_code=403, detail="لا يمكنك إلغاء طلب لم تقبله")
    
    # التحقق من حالة الطلب
    if order["status"] != "out_for_delivery":
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء طلب في هذه الحالة")
    
    # التحقق من الوقت المسموح للإلغاء
    picked_up_at = order.get("picked_up_at")
    if picked_up_at:
        if isinstance(picked_up_at, str):
            picked_up_at = datetime.fromisoformat(picked_up_at.replace("Z", "+00:00"))
        
        now = datetime.now(timezone.utc)
        elapsed_seconds = (now - picked_up_at).total_seconds()
        cancel_window = cancel_settings.get("cancel_window_seconds", 120)
        
        if elapsed_seconds > cancel_window:
            raise HTTPException(
                status_code=400, 
                detail=f"انتهت مهلة الإلغاء ({cancel_window // 60} دقيقة). تواصل مع الدعم إذا كان هناك مشكلة."
            )
    
    # التحقق من نسبة الإلغاء
    lookback = cancel_settings.get("lookback_orders", 50)
    cancel_rate_data = await calculate_driver_cancel_rate(user["id"], lookback)
    max_rate = cancel_settings.get("max_cancel_rate", 10)
    
    if cancel_rate_data["enough_data"] and cancel_rate_data["rate"] >= max_rate:
        raise HTTPException(
            status_code=400,
            detail=f"نسبة الإلغاء لديك مرتفعة ({cancel_rate_data['rate']}%). لا يمكنك إلغاء المزيد من الطلبات حالياً."
        )
    
    # إعادة الطلب لحالة "جاهز"
    await db.food_orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "driver_id": None,
                "driver_name": None,
                "driver_phone": None,
                "status": "ready",
                "driver_cancelled": True,
                "driver_cancel_reason": data.reason,
                "driver_cancel_at": datetime.now(timezone.utc).isoformat(),
                "driver_cancel_by": user["id"]
            },
            "$unset": {
                "picked_up_at": "",
                "driver_latitude": "",
                "driver_longitude": "",
                "driver_location_updated_at": ""
            },
            "$push": {
                "status_history": {
                    "status": "driver_cancelled",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "note": f"تم إلغاء الاستلام بواسطة السائق: {data.reason}",
                    "driver_id": user["id"],
                    "driver_name": user["name"]
                }
            }
        }
    )
    
    # تسجيل الإلغاء
    await db.driver_cancellations.insert_one({
        "id": str(uuid.uuid4()),
        "driver_id": user["id"],
        "driver_name": user["name"],
        "order_id": order_id,
        "order_number": order.get("order_number"),
        "reason": data.reason,
        "cancelled_at": datetime.now(timezone.utc).isoformat()
    })
    
    # إشعار للعميل
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": order["customer_id"],
        "title": "⚠️ تغيير في طلبك",
        "message": "يتم البحث عن موظف توصيل آخر لطلبك",
        "type": "driver_changed",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # إشعار للمتجر
    store = await db.food_stores.find_one({"id": order.get("store_id")})
    if store:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": store.get("owner_id"),
            "title": "⚠️ السائق ألغى الاستلام",
            "message": f"الطلب #{order.get('order_number')} - يتم البحث عن سائق آخر",
            "type": "driver_cancelled",
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # حساب نسبة الإلغاء الجديدة
    new_cancel_rate = await calculate_driver_cancel_rate(user["id"], lookback)
    
    # تحذير إذا اقتربت النسبة من الحد
    warning_threshold = cancel_settings.get("warning_threshold", 7)
    warning_message = None
    if new_cancel_rate["rate"] >= warning_threshold:
        warning_message = f"⚠️ تحذير: نسبة الإلغاء لديك {new_cancel_rate['rate']}%. الحد المسموح {max_rate}%."
    
    return {
        "message": "تم إلغاء الطلب",
        "order_id": order_id,
        "cancel_rate": new_cancel_rate,
        "warning": warning_message
    }

@router.get("/delivery/my-cancel-rate")
async def get_my_cancel_rate(user: dict = Depends(get_current_user)):
    """جلب نسبة الإلغاء للسائق"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    cancel_settings = await get_driver_cancel_settings()
    lookback = cancel_settings.get("lookback_orders", 50)
    
    cancel_rate = await calculate_driver_cancel_rate(user["id"], lookback)
    
    return {
        **cancel_rate,
        "max_allowed": cancel_settings.get("max_cancel_rate", 10),
        "warning_threshold": cancel_settings.get("warning_threshold", 7),
        "cancel_window_seconds": cancel_settings.get("cancel_window_seconds", 120)
    }


# ============== التوجيه الذكي ==============

class SmartRouteEvaluateRequest(BaseModel):
    order_id: str
    driver_lat: float
    driver_lon: float

@router.post("/delivery/smart-route/evaluate")
async def evaluate_order_for_smart_route(data: SmartRouteEvaluateRequest, user: dict = Depends(get_current_user)):
    """
    تقييم ما إذا كان الطلب الجديد على مسار السائق الحالي
    يساعد السائق في اتخاذ قرار قبول الطلب
    """
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    from services.smart_routing import evaluate_new_order
    
    # جلب الطلب الجديد
    new_order = await db.food_orders.find_one({
        "id": data.order_id,
        "status": {"$in": ["ready", "ready_for_pickup"]},
        "driver_id": None
    })
    if not new_order:
        raise HTTPException(status_code=404, detail="الطلب غير متاح")
    
    # إضافة معلومات المتجر
    store = await db.food_stores.find_one({"id": new_order.get("store_id")})
    if store:
        new_order["store_lat"] = store.get("latitude")
        new_order["store_lng"] = store.get("longitude")
        new_order["store_type"] = store.get("store_type", "restaurants")
    
    # جلب الطلبات الحالية للسائق
    current_orders = await db.food_orders.find({
        "driver_id": user["id"],
        "status": "out_for_delivery"
    }).to_list(length=20)
    
    # إضافة معلومات المتاجر للطلبات الحالية
    for order in current_orders:
        o_store = await db.food_stores.find_one({"id": order.get("store_id")})
        if o_store:
            order["store_lat"] = o_store.get("latitude")
            order["store_lng"] = o_store.get("longitude")
    
    # جلب الإعدادات
    settings = await db.platform_settings.find_one({"id": "main"}) or {}
    
    # تقييم الطلب
    evaluation = await evaluate_new_order(
        driver_id=user["id"],
        driver_location=(data.driver_lat, data.driver_lon),
        current_orders=current_orders,
        new_order=new_order,
        settings=settings
    )
    
    return {
        "order_id": data.order_id,
        "can_accept": evaluation["can_accept"],
        "score": evaluation["score"],
        "added_distance_km": evaluation["added_distance_km"],
        "added_time_min": evaluation["added_time_min"],
        "added_earnings": evaluation["added_earnings"],
        "is_on_route": evaluation["route_analysis"]["is_on_route"],
        "reasons": evaluation["reasons"],
        "recommendation": "✅ يُنصح بالقبول" if evaluation["can_accept"] else "⚠️ بعيد عن مسارك"
    }

@router.get("/delivery/optimize-route")
async def get_optimized_route(user: dict = Depends(get_current_user)):
    """
    الحصول على الترتيب الأمثل لتوصيل الطلبات الحالية
    """
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    from services.smart_routing import optimize_delivery_order
    
    # جلب الطلبات الحالية
    orders = await db.food_orders.find({
        "driver_id": user["id"],
        "status": "out_for_delivery"
    }).to_list(length=20)
    
    if not orders:
        return {"optimized_route": [], "total_distance_km": 0, "estimated_time_min": 0}
    
    # إضافة معلومات المتاجر
    for order in orders:
        store = await db.food_stores.find_one({"id": order.get("store_id")})
        if store:
            order["store_lat"] = store.get("latitude")
            order["store_lng"] = store.get("longitude")
            order["store_name"] = store.get("name")
    
    # جلب موقع السائق الأخير
    driver_loc = await db.driver_locations.find_one({"driver_id": user["id"]})
    driver_lat = driver_loc.get("lat", 33.5138) if driver_loc else 33.5138
    driver_lon = driver_loc.get("lng", 36.2765) if driver_loc else 36.2765
    
    # تحسين المسار
    optimized = await optimize_delivery_order(
        driver_location=(driver_lat, driver_lon),
        orders=orders,
        mode="mixed"
    )
    
    # حساب المسافة الإجمالية
    total_distance = 0
    current_lat, current_lon = driver_lat, driver_lon
    
    for point in optimized:
        from services.smart_routing import calculate_distance
        dist = calculate_distance(current_lat, current_lon, point["lat"], point["lon"])
        total_distance += dist
        current_lat, current_lon = point["lat"], point["lon"]
    
    return {
        "optimized_route": [
            {
                "step": i + 1,
                "type": p["type"],
                "type_ar": "استلام" if p["type"] == "pickup" else "توصيل",
                "name": p["name"],
                "order_id": p["order_id"],
                "lat": p["lat"],
                "lon": p["lon"]
            }
            for i, p in enumerate(optimized)
        ],
        "total_distance_km": round(total_distance, 1),
        "estimated_time_min": round(total_distance * 3, 0)  # تقدير 3 دقائق/كم
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
    latitude: float = Query(..., description="خط العرض - إجباري"),
    longitude: float = Query(..., description="خط الطول - إجباري"),
    user: dict = Depends(get_current_user)
):
    """تسجيل وصول السائق للمطعم - يبدأ عداد الانتظار (يتطلب موقع GPS)"""
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
    
    # === Geofencing: التحقق من موقع السائق (إجباري) ===
    # جلب المسافة المسموحة من الإعدادات (الافتراضي 100 متر)
    settings = await db.settings.find_one({"type": "delivery_settings"})
    MAX_DISTANCE_METERS = 100  # الافتراضي 100 متر
    if settings and settings.get("values", {}).get("geofencing_max_distance_meters"):
        MAX_DISTANCE_METERS = settings["values"]["geofencing_max_distance_meters"]
    
    # جلب موقع المتجر
    store = await db.food_stores.find_one({"id": order.get("store_id")}, {"_id": 0})
    if not store or not store.get("latitude") or not store.get("longitude"):
        raise HTTPException(status_code=400, detail="المتجر ليس له موقع محدد")
    
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
    
    # تسجيل الوصول مع موقع السائق (إجباري)
    update_data = {
        "driver_arrived_at": now.isoformat(),
        "waiting_started": True,
        "driver_arrival_location": {
            "latitude": latitude,
            "longitude": longitude
        }
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
    
    # حساب أرباح السائق من إعدادات المنصة
    # إذا كان التوصيل مجاني للعميل (عرض شامل)، السائق يحصل على أجرته من المنصة
    delivery_fee = order.get("delivery_fee", 0)
    driver_delivery_fee = order.get("driver_delivery_fee", delivery_fee)  # الأجرة الأصلية للسائق
    
    # جلب إعدادات المنصة
    platform_settings = await db.platform_settings.find_one({"id": "main"})
    
    # جلب إعدادات أرباح السائق من المنصة
    driver_settings = platform_settings.get("driver_earnings", {}) if platform_settings else {}
    base_fee = driver_settings.get("base_fee", 1000)  # الربح الأساسي من إعدادات الأدمن
    
    # ربح السائق = الربح الأساسي + أجرة التوصيل (دائماً، حتى لو العرض مجاني)
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



# ============== نظام إرسال الطلب للسائق بالتأكيد ==============

class RequestDriverData(BaseModel):
    """بيانات طلب سائق"""
    pass

class AcceptOrderData(BaseModel):
    """بيانات قبول الطلب من السائق"""
    pass

class SetPreparationTimeData(BaseModel):
    """بيانات تحديد وقت التحضير"""
    preparation_time_minutes: int


@router.post("/store/orders/{order_id}/request-driver")
async def request_driver_for_order(
    order_id: str,
    user: dict = Depends(get_current_user)
):
    """
    البائع يطلب سائق للطلب
    - يُرسل إشعار لجميع السائقين المتاحين
    - السائق يمكنه قبول أو رفض
    """
    if user["user_type"] not in ["food_seller", "admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    # جلب المتجر
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    # جلب الطلب
    order = await db.food_orders.find_one({"id": order_id, "store_id": store["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("status") not in ["pending", "confirmed"]:
        raise HTTPException(status_code=400, detail="لا يمكن طلب سائق لهذا الطلب")
    
    if order.get("driver_requested"):
        raise HTTPException(status_code=400, detail="تم طلب سائق مسبقاً لهذا الطلب")
    
    now = datetime.now(timezone.utc)
    
    # جلب السائقين المتاحين
    store_lat = store.get("latitude") or store.get("location", {}).get("lat", 33.5138)
    store_lon = store.get("longitude") or store.get("location", {}).get("lng", 36.2765)
    
    # جلب السائقين المتصلين
    five_min_ago = (now - timedelta(minutes=5)).isoformat()
    driver_locations = await db.driver_locations.find({
        "updated_at": {"$gte": five_min_ago},
        "is_online": True
    }).to_list(50)
    
    if not driver_locations:
        # لا يوجد سائقين متصلين - تحديث الطلب وإخبار البائع
        await db.food_orders.update_one(
            {"id": order_id},
            {"$set": {
                "driver_requested": True,
                "driver_requested_at": now.isoformat(),
                "driver_status": "waiting_for_driver",
                "updated_at": now.isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": "تم إرسال طلب السائق",
            "drivers_notified": 0,
            "warning": "⚠️ لا يوجد سائقين متصلين حالياً. سيتم إشعارهم عند اتصالهم."
        }
    
    # حساب المسافة لكل سائق
    drivers_with_distance = []
    for loc in driver_locations:
        driver_lat = loc.get("latitude", 0)
        driver_lon = loc.get("longitude", 0)
        distance = calculate_distance_km(store_lat, store_lon, driver_lat, driver_lon)
        
        drivers_with_distance.append({
            "driver_id": loc["driver_id"],
            "distance_km": round(distance, 2),
            "estimated_arrival_minutes": max(3, int(distance * 2))  # 2 دقيقة لكل كم، حد أدنى 3 دقائق
        })
    
    # ترتيب حسب المسافة
    drivers_with_distance.sort(key=lambda x: x["distance_km"])
    nearest_driver = drivers_with_distance[0] if drivers_with_distance else None
    
    # تحديث الطلب
    await db.food_orders.update_one(
        {"id": order_id},
        {"$set": {
            "driver_requested": True,
            "driver_requested_at": now.isoformat(),
            "driver_status": "waiting_for_acceptance",
            "available_drivers": drivers_with_distance,
            "nearest_driver_distance_km": nearest_driver["distance_km"] if nearest_driver else None,
            "updated_at": now.isoformat()
        }}
    )
    
    # إرسال إشعارات للسائقين
    for driver_info in drivers_with_distance:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": driver_info["driver_id"],
            "title": "🚗 طلب توصيل جديد!",
            "message": f"طلب من {store.get('name')} - على بُعد {driver_info['distance_km']} كم",
            "type": "new_delivery_request",
            "order_id": order_id,
            "order_type": "food",
            "store_name": store.get("name"),
            "distance_km": driver_info["distance_km"],
            "is_read": False,
            "requires_action": True,
            "created_at": now.isoformat()
        })
    
    return {
        "success": True,
        "message": "تم إرسال الطلب للسائقين",
        "drivers_notified": len(drivers_with_distance),
        "nearest_driver": nearest_driver
    }


@router.post("/driver/orders/{order_id}/accept")
async def driver_accept_order(
    order_id: str,
    user: dict = Depends(get_current_user)
):
    """
    السائق يقبل الطلب
    - يُحسب وقت وصول السائق للمتجر
    - يُرسل إشعار للبائع مع وقت الوصول المتوقع
    """
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    # جلب الطلب
    order = await db.food_orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("driver_id"):
        raise HTTPException(status_code=400, detail="الطلب مُعيَّن لسائق آخر بالفعل")
    
    if order.get("driver_status") not in ["waiting_for_acceptance", "waiting_for_driver"]:
        raise HTTPException(status_code=400, detail="لا يمكن قبول هذا الطلب")
    
    now = datetime.now(timezone.utc)
    
    # جلب موقع السائق
    driver_location = await db.driver_locations.find_one({"driver_id": user["id"]})
    driver_lat = driver_location.get("latitude", 33.52) if driver_location else 33.52
    driver_lon = driver_location.get("longitude", 36.28) if driver_location else 36.28
    
    # جلب موقع المتجر
    store = await db.food_stores.find_one({"id": order["store_id"]})
    store_lat = store.get("latitude") or store.get("location", {}).get("lat", 33.5138)
    store_lon = store.get("longitude") or store.get("location", {}).get("lng", 36.2765)
    
    # حساب المسافة والوقت المتوقع
    distance_km = calculate_distance_km(driver_lat, driver_lon, store_lat, store_lon)
    estimated_arrival_minutes = max(3, int(distance_km * 2))  # 2 دقيقة لكل كم
    estimated_arrival_at = now + timedelta(minutes=estimated_arrival_minutes)
    
    # تحديث الطلب
    await db.food_orders.update_one(
        {"id": order_id},
        {"$set": {
            "driver_id": user["id"],
            "driver_name": user.get("full_name", "السائق"),
            "driver_phone": user.get("phone", ""),
            "driver_image": user.get("photo", ""),
            "driver_status": "driver_accepted",
            "driver_accepted_at": now.isoformat(),
            "driver_distance_km": round(distance_km, 2),
            "driver_estimated_arrival_minutes": estimated_arrival_minutes,
            "driver_estimated_arrival_at": estimated_arrival_at.isoformat(),
            "waiting_for_preparation_time": True,  # ينتظر البائع لتحديد وقت التحضير
            "updated_at": now.isoformat()
        },
        "$push": {
            "status_history": {
                "status": "driver_accepted",
                "timestamp": now.isoformat(),
                "note": f"السائق {user.get('full_name')} قبل الطلب - سيصل خلال {estimated_arrival_minutes} دقيقة",
                "driver_id": user["id"]
            }
        }}
    )
    
    # إشعار للبائع
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": store.get("owner_id"),
        "title": "✅ السائق قبل الطلب!",
        "message": f"السائق {user.get('full_name')} قبل الطلب #{order['order_number']} - سيصل خلال {estimated_arrival_minutes} دقيقة",
        "type": "driver_accepted_order",
        "order_id": order_id,
        "driver_name": user.get("full_name"),
        "driver_phone": user.get("phone"),
        "driver_distance_km": round(distance_km, 2),
        "driver_estimated_arrival_minutes": estimated_arrival_minutes,
        "requires_action": True,
        "action_type": "set_preparation_time",
        "is_read": False,
        "created_at": now.isoformat()
    })
    
    # إلغاء الإشعارات للسائقين الآخرين
    await db.notifications.update_many(
        {
            "order_id": order_id,
            "type": "new_delivery_request",
            "user_id": {"$ne": user["id"]}
        },
        {"$set": {
            "is_cancelled": True,
            "cancelled_reason": "تم قبول الطلب من سائق آخر"
        }}
    )
    
    return {
        "success": True,
        "message": "تم قبول الطلب بنجاح",
        "order_number": order["order_number"],
        "store_name": store.get("name"),
        "store_address": store.get("address"),
        "store_location": {"lat": store_lat, "lng": store_lon},
        "distance_km": round(distance_km, 2),
        "estimated_arrival_minutes": estimated_arrival_minutes,
        "waiting_for_preparation_time": True,
        "message_for_driver": "انتظر البائع ليحدد وقت التحضير"
    }


@router.post("/driver/orders/{order_id}/reject")
async def driver_reject_order(
    order_id: str,
    user: dict = Depends(get_current_user)
):
    """السائق يرفض الطلب"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    # تحديث إشعار السائق فقط
    await db.notifications.update_one(
        {
            "order_id": order_id,
            "user_id": user["id"],
            "type": "new_delivery_request"
        },
        {"$set": {
            "is_rejected": True,
            "rejected_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "تم رفض الطلب"}


@router.post("/store/orders/{order_id}/set-preparation-time")
async def set_order_preparation_time(
    order_id: str,
    data: SetPreparationTimeData,
    user: dict = Depends(get_current_user)
):
    """
    البائع يحدد وقت تحضير الطلب بعد قبول السائق
    - يتم إشعار السائق بوقت جاهزية الطلب
    """
    if user["user_type"] not in ["food_seller", "admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    # جلب المتجر
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    # جلب الطلب
    order = await db.food_orders.find_one({"id": order_id, "store_id": store["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if not order.get("driver_id"):
        raise HTTPException(status_code=400, detail="لم يتم تعيين سائق بعد")
    
    if not order.get("waiting_for_preparation_time"):
        raise HTTPException(status_code=400, detail="تم تحديد وقت التحضير مسبقاً")
    
    now = datetime.now(timezone.utc)
    prep_time = data.preparation_time_minutes
    expected_ready_at = now + timedelta(minutes=prep_time)
    
    # توليد كود الاستلام
    import random
    pickup_code = str(random.randint(1000, 9999))
    
    # تحديث الطلب
    await db.food_orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "preparing",
            "status_label": "جاري التحضير",
            "preparation_started_at": now.isoformat(),
            "preparation_time_minutes": prep_time,
            "expected_ready_at": expected_ready_at.isoformat(),
            "waiting_for_preparation_time": False,
            "pickup_code": pickup_code,
            "pickup_code_verified": False,
            "updated_at": now.isoformat()
        },
        "$push": {
            "status_history": {
                "status": "preparing",
                "timestamp": now.isoformat(),
                "note": f"بدأ التحضير - الطلب جاهز خلال {prep_time} دقيقة",
                "updated_by": user["id"]
            }
        }}
    )
    
    # إشعار السائق بوقت الجاهزية
    driver_estimated_arrival = order.get("driver_estimated_arrival_minutes", 5)
    
    # حساب الفرق - متى يجب أن يذهب السائق؟
    if prep_time > driver_estimated_arrival:
        # الطلب يحتاج وقت أكثر من وصول السائق
        wait_minutes = prep_time - driver_estimated_arrival
        driver_message = f"الطلب جاهز خلال {prep_time} دقيقة. اذهب للمتجر بعد {wait_minutes} دقيقة"
        go_to_store_at = now + timedelta(minutes=wait_minutes)
    else:
        # السائق يحتاج للذهاب الآن
        driver_message = f"الطلب جاهز خلال {prep_time} دقيقة. اذهب للمتجر الآن!"
        go_to_store_at = now
    
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": order["driver_id"],
        "title": "⏱️ وقت تحضير الطلب",
        "message": driver_message,
        "type": "preparation_time_set",
        "order_id": order_id,
        "order_number": order["order_number"],
        "preparation_time_minutes": prep_time,
        "expected_ready_at": expected_ready_at.isoformat(),
        "go_to_store_at": go_to_store_at.isoformat(),
        "store_name": store.get("name"),
        "is_read": False,
        "created_at": now.isoformat()
    })
    
    # تحديث موقع السائق بمعلومات الطلب
    await db.driver_locations.update_one(
        {"driver_id": order["driver_id"]},
        {"$set": {
            "current_order_id": order_id,
            "go_to_store_at": go_to_store_at.isoformat(),
            "order_ready_at": expected_ready_at.isoformat()
        }}
    )
    
    # إشعار العميل
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": order["customer_id"],
        "title": "🍳 جاري تحضير طلبك",
        "message": f"طلبك #{order['order_number']} قيد التحضير - جاهز خلال {prep_time} دقيقة",
        "type": "order_preparing",
        "is_read": False,
        "created_at": now.isoformat()
    })
    
    return {
        "success": True,
        "message": "تم تحديد وقت التحضير وإبلاغ السائق",
        "preparation_time_minutes": prep_time,
        "expected_ready_at": expected_ready_at.isoformat(),
        "pickup_code": pickup_code,
        "driver_notified": True,
        "driver_go_time": go_to_store_at.isoformat()
    }


@router.get("/store/orders/{order_id}/driver-status")
async def get_order_driver_status(
    order_id: str,
    user: dict = Depends(get_current_user)
):
    """جلب حالة السائق للطلب"""
    if user["user_type"] not in ["food_seller", "admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    order = await db.food_orders.find_one(
        {"id": order_id, "store_id": store["id"]},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    return {
        "order_id": order_id,
        "driver_requested": order.get("driver_requested", False),
        "driver_status": order.get("driver_status"),
        "driver_id": order.get("driver_id"),
        "driver_name": order.get("driver_name"),
        "driver_phone": order.get("driver_phone"),
        "driver_distance_km": order.get("driver_distance_km"),
        "driver_estimated_arrival_minutes": order.get("driver_estimated_arrival_minutes"),
        "waiting_for_preparation_time": order.get("waiting_for_preparation_time", False),
        "preparation_time_minutes": order.get("preparation_time_minutes"),
        "expected_ready_at": order.get("expected_ready_at")
    }
