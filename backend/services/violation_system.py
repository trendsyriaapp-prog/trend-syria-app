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
    "geofencing_max_distance_meters": 150,  # المسافة المسموحة لتسجيل الوصول
    
    # ============ إعدادات حماية العميل ============
    "customer_protection_enabled": True,  # تفعيل حماية العميل
    "delay_notification_minutes": 5,  # إشعار العميل بعد X دقائق تأخير
    "free_cancel_delay_minutes": 15,  # إلغاء مجاني بعد X دقائق تأخير
    "compensation_coupon_delay_minutes": 20,  # كوبون تعويض بعد X دقائق تأخير
    "compensation_coupon_percent": 10,  # نسبة كوبون التعويض %
    "max_coupon_value": 15000,  # الحد الأقصى لقيمة الكوبون بالليرة
    "seller_compensation_on_cancel_percent": 50,  # تعويض البائع عند الإلغاء بعد التحضير %
}


async def get_delivery_settings() -> Dict:
    """جلب إعدادات التوصيل وحماية العميل من قاعدة البيانات"""
    # جلب الإعدادات العامة
    settings = await db.settings.find_one({"type": "delivery_settings"})
    
    # جلب إعدادات حماية العميل
    customer_protection = await db.customer_protection_settings.find_one({"id": "main"}, {"_id": 0})
    
    # دمج الإعدادات
    result = {**DEFAULT_SETTINGS}
    
    if settings:
        result.update(settings.get("values", {}))
    
    if customer_protection:
        result.update({
            "customer_protection_enabled": customer_protection.get("customer_protection_enabled", True),
            "delay_notification_minutes": customer_protection.get("delay_notification_minutes", 5),
            "free_cancel_delay_minutes": customer_protection.get("free_cancel_delay_minutes", 15),
            "compensation_coupon_delay_minutes": customer_protection.get("compensation_coupon_delay_minutes", 20),
            "compensation_coupon_percent": customer_protection.get("compensation_coupon_percent", 10),
            "max_coupon_value": customer_protection.get("max_coupon_value", 15000),
            "seller_compensation_on_cancel_percent": customer_protection.get("seller_compensation_on_cancel_percent", 50)
        })
    
    return result


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



# ============== نظام حماية العميل ==============

async def check_order_delay(order_id: str) -> Dict:
    """
    فحص تأخير الطلب وتحديد الإجراء المناسب
    يُستدعى دورياً من background tasks
    """
    settings = await get_delivery_settings()
    
    if not settings.get("customer_protection_enabled", True):
        return {"action": "none", "reason": "protection_disabled"}
    
    order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return {"action": "none", "reason": "order_not_found"}
    
    # تجاهل الطلبات المكتملة أو الملغاة
    if order.get("status") in ["delivered", "cancelled"]:
        return {"action": "none", "reason": "order_completed"}
    
    # حساب التأخير
    expected_delivery = order.get("expected_delivery_at")
    if not expected_delivery:
        return {"action": "none", "reason": "no_expected_time"}
    
    expected_time = datetime.fromisoformat(expected_delivery.replace('Z', '+00:00'))
    now = datetime.now(timezone.utc)
    
    if now <= expected_time:
        return {"action": "none", "reason": "not_delayed", "remaining_minutes": (expected_time - now).seconds // 60}
    
    delay_minutes = (now - expected_time).seconds // 60
    
    # تحديد الإجراء بناءً على مدة التأخير
    delay_notification = settings.get("delay_notification_minutes", 5)
    free_cancel_delay = settings.get("free_cancel_delay_minutes", 15)
    coupon_delay = settings.get("compensation_coupon_delay_minutes", 20)
    
    result = {
        "delay_minutes": delay_minutes,
        "expected_delivery_at": expected_delivery,
        "order_id": order_id,
        "customer_id": order.get("customer_id"),
        "order_number": order.get("order_number")
    }
    
    # التحقق من الإشعارات السابقة
    already_notified = order.get("delay_notified", False)
    free_cancel_enabled = order.get("free_cancel_enabled", False)
    coupon_given = order.get("delay_coupon_given", False)
    
    if delay_minutes >= coupon_delay and not coupon_given:
        result["action"] = "give_coupon"
        result["coupon_percent"] = settings.get("compensation_coupon_percent", 10)
        result["max_coupon_value"] = settings.get("max_coupon_value", 15000)
    elif delay_minutes >= free_cancel_delay and not free_cancel_enabled:
        result["action"] = "enable_free_cancel"
    elif delay_minutes >= delay_notification and not already_notified:
        result["action"] = "notify_customer"
    else:
        result["action"] = "none"
        result["reason"] = "already_handled"
    
    return result


async def notify_customer_delay(order_id: str) -> Dict:
    """إرسال إشعار للعميل بتأخير الطلب"""
    order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return {"success": False, "error": "order_not_found"}
    
    customer_id = order.get("customer_id")
    order_number = order.get("order_number")
    
    # إنشاء الإشعار
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": customer_id,
        "title": "⏰ تأخير في طلبك",
        "message": f"نعتذر! طلبك #{order_number} متأخر قليلاً. نحن نعمل على توصيله بأسرع وقت.",
        "type": "order_delay",
        "order_id": order_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    # تحديث الطلب
    await db.food_orders.update_one(
        {"id": order_id},
        {"$set": {"delay_notified": True, "delay_notified_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "notification_id": notification["id"]}


async def enable_free_cancel(order_id: str) -> Dict:
    """تفعيل خيار الإلغاء المجاني للعميل"""
    order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return {"success": False, "error": "order_not_found"}
    
    customer_id = order.get("customer_id")
    order_number = order.get("order_number")
    
    # تحديث الطلب
    await db.food_orders.update_one(
        {"id": order_id},
        {"$set": {
            "free_cancel_enabled": True,
            "free_cancel_enabled_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # إشعار العميل
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": customer_id,
        "title": "🆓 إلغاء مجاني متاح",
        "message": f"بسبب التأخير في طلبك #{order_number}، يمكنك الآن إلغاءه واسترداد المبلغ كاملاً.",
        "type": "free_cancel_available",
        "order_id": order_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {"success": True}


async def give_delay_coupon(order_id: str) -> Dict:
    """منح كوبون تعويض للعميل بسبب التأخير"""
    settings = await get_delivery_settings()
    
    order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return {"success": False, "error": "order_not_found"}
    
    customer_id = order.get("customer_id")
    order_number = order.get("order_number")
    order_total = order.get("total", 0)
    
    # حساب قيمة الكوبون
    coupon_percent = settings.get("compensation_coupon_percent", 10)
    max_coupon = settings.get("max_coupon_value", 15000)
    
    coupon_value = min(int(order_total * coupon_percent / 100), max_coupon)
    
    # إنشاء الكوبون
    coupon_code = f"DELAY{order_number[-4:]}{uuid.uuid4().hex[:4].upper()}"
    coupon = {
        "id": str(uuid.uuid4()),
        "code": coupon_code,
        "type": "delay_compensation",
        "discount_type": "fixed",
        "discount_value": coupon_value,
        "min_order_value": 0,
        "max_uses": 1,
        "used_count": 0,
        "user_id": customer_id,  # كوبون خاص بالعميل
        "order_id": order_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.coupons.insert_one(coupon)
    
    # تحديث الطلب
    await db.food_orders.update_one(
        {"id": order_id},
        {"$set": {
            "delay_coupon_given": True,
            "delay_coupon_code": coupon_code,
            "delay_coupon_value": coupon_value
        }}
    )
    
    # إشعار العميل
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": customer_id,
        "title": "🎁 كوبون تعويض",
        "message": f"نعتذر عن التأخير في طلبك #{order_number}. حصلت على كوبون خصم {coupon_value:,} ل.س للطلب القادم. الكود: {coupon_code}",
        "type": "delay_coupon",
        "order_id": order_id,
        "coupon_code": coupon_code,
        "coupon_value": coupon_value,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {
        "success": True,
        "coupon_code": coupon_code,
        "coupon_value": coupon_value
    }


async def compensate_seller_on_cancel(order_id: str) -> Dict:
    """تعويض البائع عند إلغاء الطلب بعد التحضير"""
    settings = await get_delivery_settings()
    
    order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return {"success": False, "error": "order_not_found"}
    
    # التحقق من أن الطلب كان جاهزاً (بعد التحضير)
    if not order.get("ready_at"):
        return {"success": False, "error": "order_not_prepared", "compensation": 0}
    
    store_id = order.get("store_id")
    store_name = order.get("store_name", "")
    order_total = order.get("subtotal", 0)  # بدون رسوم التوصيل
    
    # حساب التعويض
    compensation_percent = settings.get("seller_compensation_on_cancel_percent", 50)
    compensation_amount = int(order_total * compensation_percent / 100)
    
    # إضافة التعويض لرصيد المتجر
    await db.food_stores.update_one(
        {"id": store_id},
        {"$inc": {"wallet_balance": compensation_amount}}
    )
    
    # تسجيل المعاملة
    transaction = {
        "id": str(uuid.uuid4()),
        "store_id": store_id,
        "amount": compensation_amount,
        "type": "cancel_compensation",
        "description": f"تعويض إلغاء طلب #{order.get('order_number')} بعد التحضير",
        "order_id": order_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.store_transactions.insert_one(transaction)
    
    # إشعار البائع
    store = await db.food_stores.find_one({"id": store_id}, {"_id": 0, "owner_id": 1})
    if store and store.get("owner_id"):
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": store["owner_id"],
            "title": "💰 تعويض إلغاء",
            "message": f"تم تعويضك {compensation_amount:,} ل.س بسبب إلغاء الطلب #{order.get('order_number')} بعد التحضير.",
            "type": "cancel_compensation",
            "order_id": order_id,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {
        "success": True,
        "compensation_amount": compensation_amount,
        "store_id": store_id
    }


async def process_delayed_orders():
    """
    معالجة الطلبات المتأخرة
    يُستدعى دورياً من background tasks
    """
    settings = await get_delivery_settings()
    
    if not settings.get("customer_protection_enabled", True):
        return {"processed": 0, "reason": "protection_disabled"}
    
    now = datetime.now(timezone.utc)
    
    # البحث عن الطلبات النشطة التي لديها وقت توصيل متوقع
    active_orders = await db.food_orders.find({
        "status": {"$in": ["confirmed", "preparing", "ready", "picked_up", "delivering"]},
        "expected_delivery_at": {"$exists": True, "$ne": None}
    }, {"_id": 0, "id": 1, "expected_delivery_at": 1}).to_list(100)
    
    processed = 0
    actions_taken = []
    
    for order in active_orders:
        try:
            delay_check = await check_order_delay(order["id"])
            
            if delay_check["action"] == "notify_customer":
                await notify_customer_delay(order["id"])
                actions_taken.append({"order_id": order["id"], "action": "notified"})
                processed += 1
            elif delay_check["action"] == "enable_free_cancel":
                await enable_free_cancel(order["id"])
                actions_taken.append({"order_id": order["id"], "action": "free_cancel_enabled"})
                processed += 1
            elif delay_check["action"] == "give_coupon":
                await give_delay_coupon(order["id"])
                actions_taken.append({"order_id": order["id"], "action": "coupon_given"})
                processed += 1
                
        except Exception as e:
            print(f"Error processing delayed order {order['id']}: {e}")
            continue
    
    return {
        "processed": processed,
        "actions": actions_taken
    }
