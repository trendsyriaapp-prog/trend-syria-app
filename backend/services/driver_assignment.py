"""
خدمة تعيين السائقين التلقائي
- اختيار أقرب سائق متاح
- إرسال للجميع إذا رفض السائق الأول
"""
import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Dict
import uuid
import math

from core.database import db

# حساب المسافة بين نقطتين (Haversine formula)
def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """حساب المسافة بالكيلومتر"""
    R = 6371  # نصف قطر الأرض بالكيلومتر
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


async def get_available_drivers() -> List[Dict]:
    """جلب السائقين المتاحين"""
    # جلب السائقين المتاحين من جدول delivery_documents
    available_docs = await db.delivery_documents.find(
        {"is_available": True, "status": "approved"}
    ).to_list(None)
    
    available_driver_ids = [doc["user_id"] for doc in available_docs]
    
    if not available_driver_ids:
        return []
    
    # جلب معلومات السائقين
    drivers = await db.users.find(
        {
            "id": {"$in": available_driver_ids},
            "user_type": "delivery"
        },
        {"_id": 0}
    ).to_list(None)
    
    # إضافة معلومات الموقع من delivery_documents
    for driver in drivers:
        doc = next((d for d in available_docs if d["user_id"] == driver["id"]), None)
        if doc:
            driver["latitude"] = doc.get("current_latitude", 33.5138)
            driver["longitude"] = doc.get("current_longitude", 36.2765)
            driver["is_available"] = True
    
    return drivers


async def get_driver_active_orders_count(driver_id: str) -> int:
    """حساب عدد الطلبات النشطة للسائق"""
    active_statuses = ["accepted", "picked_up", "on_the_way", "out_for_delivery", "preparing", "ready_for_pickup"]
    
    food_count = await db.food_orders.count_documents({
        "driver_id": driver_id,
        "status": {"$in": active_statuses}
    })
    
    products_count = await db.orders.count_documents({
        "driver_id": driver_id,
        "delivery_status": {"$in": ["assigned", "picked_up", "on_the_way"]}
    })
    
    return food_count + products_count


async def find_nearest_available_driver(
    store_lat: float, 
    store_lon: float,
    max_orders: int = 7,
    exclude_driver_ids: List[str] = None
) -> Optional[Dict]:
    """
    البحث عن أقرب سائق متاح
    
    Args:
        store_lat: خط عرض المتجر
        store_lon: خط طول المتجر
        max_orders: الحد الأقصى للطلبات النشطة
        exclude_driver_ids: قائمة السائقين المستبعدين (رفضوا الطلب)
    
    Returns:
        معلومات السائق الأقرب أو None
    """
    if exclude_driver_ids is None:
        exclude_driver_ids = []
    
    drivers = await get_available_drivers()
    
    if not drivers:
        return None
    
    # حساب المسافة لكل سائق وترتيبهم
    drivers_with_distance = []
    
    for driver in drivers:
        # استبعاد السائقين المرفوضين
        if driver["id"] in exclude_driver_ids:
            continue
        
        # التحقق من عدد الطلبات النشطة
        active_orders = await get_driver_active_orders_count(driver["id"])
        if active_orders >= max_orders:
            continue
        
        distance = calculate_distance(
            driver.get("latitude", 33.5138),
            driver.get("longitude", 36.2765),
            store_lat,
            store_lon
        )
        
        drivers_with_distance.append({
            **driver,
            "distance": distance,
            "active_orders": active_orders
        })
    
    if not drivers_with_distance:
        return None
    
    # ترتيب حسب المسافة (الأقرب أولاً)
    drivers_with_distance.sort(key=lambda x: x["distance"])
    
    return drivers_with_distance[0]


async def assign_order_to_driver(
    order_id: str,
    order_type: str,  # "food" أو "product"
    driver_id: str,
    store_name: str = ""
) -> bool:
    """
    تعيين طلب لسائق معين
    
    Args:
        order_id: معرف الطلب
        order_type: نوع الطلب (food/product)
        driver_id: معرف السائق
        store_name: اسم المتجر
    
    Returns:
        True إذا نجح التعيين
    """
    now = datetime.now(timezone.utc).isoformat()
    
    if order_type == "food":
        result = await db.food_orders.update_one(
            {"id": order_id, "driver_id": None},
            {
                "$set": {
                    "driver_id": driver_id,
                    "status": "accepted",
                    "assigned_at": now,
                    "auto_assigned": True
                }
            }
        )
    else:  # product
        result = await db.orders.update_one(
            {"id": order_id, "driver_id": None},
            {
                "$set": {
                    "driver_id": driver_id,
                    "delivery_status": "assigned",
                    "assigned_at": now,
                    "auto_assigned": True
                }
            }
        )
    
    if result.modified_count > 0:
        # إرسال إشعار للسائق
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": driver_id,
            "title": "🚀 طلب جديد مُعيّن لك!",
            "message": f"تم تعيين طلب جديد لك من {store_name}. اذهب لاستلامه الآن!",
            "type": "order_assigned",
            "order_id": order_id,
            "is_read": False,
            "created_at": now
        })
        return True
    
    return False


async def send_order_to_all_drivers(
    order_id: str,
    order_type: str,
    store_name: str = ""
) -> int:
    """
    إرسال الطلب لجميع السائقين المتاحين
    
    Returns:
        عدد السائقين الذين تم إرسال الإشعار لهم
    """
    drivers = await get_available_drivers()
    now = datetime.now(timezone.utc).isoformat()
    
    # تحديث حالة الطلب ليظهر في "الطلبات المتاحة"
    if order_type == "food":
        await db.food_orders.update_one(
            {"id": order_id},
            {
                "$set": {
                    "broadcast_to_all": True,
                    "broadcast_at": now
                }
            }
        )
    else:
        await db.orders.update_one(
            {"id": order_id},
            {
                "$set": {
                    "broadcast_to_all": True,
                    "broadcast_at": now
                }
            }
        )
    
    # إرسال إشعار لجميع السائقين
    notifications = []
    for driver in drivers:
        # التحقق من عدد الطلبات
        active_orders = await get_driver_active_orders_count(driver["id"])
        if active_orders >= 7:
            continue
        
        notifications.append({
            "id": str(uuid.uuid4()),
            "user_id": driver["id"],
            "title": "🔔 طلب جديد متاح!",
            "message": f"طلب جديد من {store_name} متاح للقبول. سارع بالقبول!",
            "type": "order_available",
            "order_id": order_id,
            "is_read": False,
            "created_at": now
        })
    
    if notifications:
        await db.notifications.insert_many(notifications)
    
    return len(notifications)


async def process_driver_assignment(
    order_id: str,
    order_type: str,
    store_lat: float,
    store_lon: float,
    store_name: str = "",
    wait_seconds: int = 60
) -> Dict:
    """
    معالجة تعيين السائق للطلب
    
    1. البحث عن أقرب سائق
    2. إرسال الطلب له
    3. انتظار الرد
    4. إذا رفض أو لم يرد، إرسال للجميع
    
    Args:
        order_id: معرف الطلب
        order_type: نوع الطلب
        store_lat: خط عرض المتجر
        store_lon: خط طول المتجر
        store_name: اسم المتجر
        wait_seconds: وقت الانتظار بالثواني
    
    Returns:
        dict مع حالة التعيين
    """
    # البحث عن أقرب سائق
    nearest_driver = await find_nearest_available_driver(store_lat, store_lon)
    
    if not nearest_driver:
        # لا يوجد سائقين متاحين - إرسال للجميع مباشرة
        count = await send_order_to_all_drivers(order_id, order_type, store_name)
        return {
            "status": "broadcast",
            "message": "لا يوجد سائقين متاحين، تم إرسال الطلب للجميع",
            "drivers_notified": count
        }
    
    # إرسال للسائق الأقرب
    assigned = await assign_order_to_driver(
        order_id, 
        order_type, 
        nearest_driver["id"],
        store_name
    )
    
    if assigned:
        # حفظ معلومات التعيين للمتابعة
        await db.order_assignments.insert_one({
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "order_type": order_type,
            "driver_id": nearest_driver["id"],
            "driver_name": nearest_driver.get("name", ""),
            "distance": nearest_driver.get("distance", 0),
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": datetime.now(timezone.utc).isoformat(),  # سيتم تحديثه
            "status": "pending",  # pending, accepted, rejected, expired
            "store_lat": store_lat,
            "store_lon": store_lon,
            "store_name": store_name
        })
        
        return {
            "status": "assigned",
            "message": f"تم تعيين الطلب للسائق {nearest_driver.get('name', '')}",
            "driver_id": nearest_driver["id"],
            "driver_name": nearest_driver.get("name", ""),
            "distance": nearest_driver.get("distance", 0)
        }
    
    # فشل التعيين - إرسال للجميع
    count = await send_order_to_all_drivers(order_id, order_type, store_name)
    return {
        "status": "broadcast",
        "message": "فشل تعيين السائق، تم إرسال الطلب للجميع",
        "drivers_notified": count
    }


async def handle_driver_rejection(
    order_id: str,
    order_type: str,
    driver_id: str
) -> Dict:
    """
    معالجة رفض السائق للطلب
    
    1. تحديث حالة التعيين
    2. البحث عن سائق آخر أو إرسال للجميع
    """
    # تحديث حالة التعيين
    assignment = await db.order_assignments.find_one({"order_id": order_id, "status": "pending"})
    
    if assignment:
        await db.order_assignments.update_one(
            {"id": assignment["id"]},
            {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # إرسال للجميع
        store_name = assignment.get("store_name", "")
        count = await send_order_to_all_drivers(order_id, order_type, store_name)
        
        return {
            "status": "broadcast",
            "message": "تم رفض الطلب، تم إرساله لجميع السائقين",
            "drivers_notified": count
        }
    
    return {
        "status": "error",
        "message": "لم يتم العثور على التعيين"
    }
