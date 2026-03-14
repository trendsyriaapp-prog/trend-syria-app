"""
نظام المخالفات والتعويضات
- تتبع تأخيرات المطاعم
- حساب تعويضات السائقين
- إدارة التحذيرات
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
import uuid

from core.database import db


# الإعدادات الافتراضية (يمكن تغييرها من لوحة الأدمن)
DEFAULT_SETTINGS = {
    "max_waiting_time_minutes": 10,  # وقت الانتظار المسموح
    "compensation_per_5_minutes": 500,  # تعويض لكل 5 دقائق إضافية
    "max_compensation_per_order": 2000,  # الحد الأقصى للتعويض
    "driver_accept_timeout_seconds": 60,  # وقت انتظار قبول السائق
    "warnings_before_alert": 3,  # عدد المخالفات قبل التحذير
    "warnings_before_final": 7,  # عدد المخالفات قبل التحذير الأخير
    "warnings_before_suspend": 10,  # عدد المخالفات قبل الإيقاف
    "suspend_duration_hours": 24,  # مدة الإيقاف
    "geofencing_max_distance_meters": 150  # المسافة المسموحة لتسجيل الوصول
}


async def get_delivery_settings() -> Dict:
    """جلب إعدادات التوصيل"""
    settings = await db.settings.find_one({"type": "delivery_settings"})
    if settings:
        return {**DEFAULT_SETTINGS, **settings.get("values", {})}
    return DEFAULT_SETTINGS


async def save_delivery_settings(settings: Dict) -> bool:
    """حفظ إعدادات التوصيل"""
    await db.settings.update_one(
        {"type": "delivery_settings"},
        {
            "$set": {
                "type": "delivery_settings",
                "values": settings,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    return True


async def record_driver_arrival(order_id: str, driver_id: str) -> Dict:
    """
    تسجيل وصول السائق للمطعم
    يبدأ عداد الانتظار
    """
    now = datetime.now(timezone.utc)
    
    # تحديث الطلب
    result = await db.food_orders.update_one(
        {"id": order_id, "driver_id": driver_id},
        {
            "$set": {
                "driver_arrived_at": now.isoformat(),
                "waiting_started": True
            }
        }
    )
    
    if result.modified_count > 0:
        return {
            "success": True,
            "message": "تم تسجيل وصولك للمطعم",
            "arrived_at": now.isoformat()
        }
    
    return {
        "success": False,
        "message": "فشل تسجيل الوصول"
    }


async def calculate_waiting_compensation(order_id: str) -> Dict:
    """
    حساب تعويض الانتظار للسائق
    
    Returns:
        dict مع تفاصيل التعويض
    """
    settings = await get_delivery_settings()
    
    order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return {"compensation": 0, "waiting_minutes": 0}
    
    driver_arrived_at = order.get("driver_arrived_at")
    pickup_verified_at = order.get("pickup_verified_at")
    
    if not driver_arrived_at:
        return {"compensation": 0, "waiting_minutes": 0}
    
    # حساب وقت الانتظار
    arrived_time = datetime.fromisoformat(driver_arrived_at.replace('Z', '+00:00'))
    
    if pickup_verified_at:
        end_time = datetime.fromisoformat(pickup_verified_at.replace('Z', '+00:00'))
    else:
        end_time = datetime.now(timezone.utc)
    
    waiting_seconds = (end_time - arrived_time).total_seconds()
    waiting_minutes = waiting_seconds / 60
    
    max_waiting = settings["max_waiting_time_minutes"]
    compensation_rate = settings["compensation_per_5_minutes"]
    max_compensation = settings["max_compensation_per_order"]
    
    # حساب التعويض
    if waiting_minutes <= max_waiting:
        compensation = 0
        extra_minutes = 0
    else:
        extra_minutes = waiting_minutes - max_waiting
        # تعويض لكل 5 دقائق إضافية
        compensation_units = int(extra_minutes / 5) + (1 if extra_minutes % 5 > 0 else 0)
        compensation = min(compensation_units * compensation_rate, max_compensation)
    
    return {
        "waiting_minutes": round(waiting_minutes, 1),
        "max_waiting_minutes": max_waiting,
        "extra_minutes": round(extra_minutes, 1),
        "compensation": compensation,
        "max_compensation": max_compensation
    }


async def finalize_order_compensation(order_id: str) -> Dict:
    """
    إنهاء حساب التعويض وتطبيقه
    يُستدعى عند تأكيد استلام الطلب من البائع
    """
    compensation_data = await calculate_waiting_compensation(order_id)
    
    if compensation_data["compensation"] > 0:
        order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
        
        if order:
            driver_id = order.get("driver_id")
            store_id = order.get("store_id")
            store_name = order.get("store_name", "")
            
            # تحديث الطلب بالتعويض
            await db.food_orders.update_one(
                {"id": order_id},
                {
                    "$set": {
                        "waiting_compensation": compensation_data["compensation"],
                        "waiting_minutes": compensation_data["waiting_minutes"]
                    }
                }
            )
            
            # إضافة التعويض لرصيد السائق
            if driver_id:
                await db.users.update_one(
                    {"id": driver_id},
                    {"$inc": {"wallet_balance": compensation_data["compensation"]}}
                )
                
                # تسجيل المعاملة
                await db.wallet_transactions.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": driver_id,
                    "amount": compensation_data["compensation"],
                    "type": "waiting_compensation",
                    "description": f"تعويض انتظار - طلب من {store_name}",
                    "order_id": order_id,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            
            # خصم من المطعم
            if store_id:
                await db.food_stores.update_one(
                    {"id": store_id},
                    {"$inc": {"pending_deductions": compensation_data["compensation"]}}
                )
            
            # تسجيل المخالفة
            await record_violation(
                store_id=store_id,
                store_name=store_name,
                order_id=order_id,
                violation_type="late_preparation",
                waiting_minutes=compensation_data["waiting_minutes"],
                compensation=compensation_data["compensation"]
            )
    
    return compensation_data


async def record_violation(
    store_id: str,
    store_name: str,
    order_id: str,
    violation_type: str,
    waiting_minutes: float,
    compensation: int
) -> Dict:
    """تسجيل مخالفة للمطعم"""
    now = datetime.now(timezone.utc)
    
    violation = {
        "id": str(uuid.uuid4()),
        "store_id": store_id,
        "store_name": store_name,
        "order_id": order_id,
        "type": violation_type,
        "waiting_minutes": waiting_minutes,
        "compensation": compensation,
        "created_at": now.isoformat()
    }
    
    await db.violations.insert_one(violation)
    
    # تحديث عداد المخالفات للمطعم
    await db.food_stores.update_one(
        {"id": store_id},
        {
            "$inc": {"violation_count": 1},
            "$set": {"last_violation_at": now.isoformat()}
        }
    )
    
    # التحقق من مستوى التحذير
    await check_and_update_warning_level(store_id)
    
    return violation


async def check_and_update_warning_level(store_id: str) -> Dict:
    """التحقق من مستوى التحذير وتحديثه"""
    settings = await get_delivery_settings()
    
    # حساب المخالفات في الأسبوع الأخير
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    weekly_violations = await db.violations.count_documents({
        "store_id": store_id,
        "created_at": {"$gte": week_ago}
    })
    
    # حساب المخالفات في الشهر الأخير
    month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    monthly_violations = await db.violations.count_documents({
        "store_id": store_id,
        "created_at": {"$gte": month_ago}
    })
    
    # تحديد مستوى التحذير
    warning_level = "normal"
    warning_message = ""
    should_suspend = False
    
    if monthly_violations >= settings["warnings_before_suspend"]:
        warning_level = "suspended"
        warning_message = f"تم إيقاف متجرك مؤقتاً لمدة {settings['suspend_duration_hours']} ساعة بسبب كثرة التأخيرات"
        should_suspend = True
    elif monthly_violations >= settings["warnings_before_final"]:
        warning_level = "final_warning"
        warning_message = "تحذير أخير! استمرار التأخير سيؤدي لإيقاف المتجر"
    elif weekly_violations >= settings["warnings_before_alert"]:
        warning_level = "warning"
        warning_message = f"تحذير! لديك {weekly_violations} مخالفات تأخير هذا الأسبوع"
    
    # تحديث المتجر
    update_data = {
        "warning_level": warning_level,
        "weekly_violations": weekly_violations,
        "monthly_violations": monthly_violations
    }
    
    if should_suspend:
        suspend_until = datetime.now(timezone.utc) + timedelta(hours=settings["suspend_duration_hours"])
        update_data["suspended_until"] = suspend_until.isoformat()
        update_data["is_active"] = False
    
    await db.food_stores.update_one(
        {"id": store_id},
        {"$set": update_data}
    )
    
    # إرسال إشعار للمطعم
    if warning_message:
        store = await db.food_stores.find_one({"id": store_id}, {"_id": 0, "owner_id": 1})
        if store and store.get("owner_id"):
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": store["owner_id"],
                "title": f"⚠️ {warning_level.replace('_', ' ').title()}",
                "message": warning_message,
                "type": "store_warning",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    return {
        "warning_level": warning_level,
        "weekly_violations": weekly_violations,
        "monthly_violations": monthly_violations,
        "message": warning_message
    }


async def get_store_violations_summary(store_id: str) -> Dict:
    """جلب ملخص مخالفات المطعم"""
    settings = await get_delivery_settings()
    
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    month_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    weekly_violations = await db.violations.count_documents({
        "store_id": store_id,
        "created_at": {"$gte": week_ago}
    })
    
    monthly_violations = await db.violations.count_documents({
        "store_id": store_id,
        "created_at": {"$gte": month_ago}
    })
    
    total_deductions = await db.violations.aggregate([
        {"$match": {"store_id": store_id, "created_at": {"$gte": month_ago}}},
        {"$group": {"_id": None, "total": {"$sum": "$compensation"}}}
    ]).to_list(1)
    
    total_deductions = total_deductions[0]["total"] if total_deductions else 0
    
    store = await db.food_stores.find_one({"id": store_id}, {"_id": 0, "warning_level": 1})
    
    return {
        "weekly_violations": weekly_violations,
        "weekly_limit": settings["warnings_before_alert"],
        "monthly_violations": monthly_violations,
        "monthly_limit": settings["warnings_before_suspend"],
        "total_deductions": total_deductions,
        "warning_level": store.get("warning_level", "normal") if store else "normal"
    }


async def get_admin_violations_report(days: int = 30) -> Dict:
    """تقرير المخالفات للأدمن"""
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # إجمالي المخالفات
    total_violations = await db.violations.count_documents({
        "created_at": {"$gte": start_date}
    })
    
    # إجمالي التعويضات
    total_compensations = await db.violations.aggregate([
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {"_id": None, "total": {"$sum": "$compensation"}}}
    ]).to_list(1)
    total_compensations = total_compensations[0]["total"] if total_compensations else 0
    
    # المطاعم المخالفة
    violating_stores = await db.violations.aggregate([
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {"_id": "$store_id", "count": {"$sum": 1}, "total": {"$sum": "$compensation"}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]).to_list(20)
    
    # إضافة معلومات المتاجر
    for store in violating_stores:
        store_info = await db.food_stores.find_one(
            {"id": store["_id"]}, 
            {"_id": 0, "name": 1, "warning_level": 1}
        )
        if store_info:
            store["name"] = store_info.get("name", "غير معروف")
            store["warning_level"] = store_info.get("warning_level", "normal")
    
    # متوسط وقت التأخير
    avg_waiting = await db.violations.aggregate([
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {"_id": None, "avg": {"$avg": "$waiting_minutes"}}}
    ]).to_list(1)
    avg_waiting = round(avg_waiting[0]["avg"], 1) if avg_waiting else 0
    
    return {
        "period_days": days,
        "total_violations": total_violations,
        "total_compensations": total_compensations,
        "average_waiting_minutes": avg_waiting,
        "violating_stores": violating_stores
    }
