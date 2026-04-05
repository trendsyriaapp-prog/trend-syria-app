"""
مهام الخلفية للتوزيع الذكي
- فحص الطلبات الجاهزة للتوزيع
- تعيين السائقين تلقائياً
"""
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

from core.database import db
from services.driver_assignment import (
    find_nearest_available_driver,
    assign_order_to_driver,
    send_order_to_all_drivers
)

logger = logging.getLogger(__name__)

# حالة المهمة
task_running = False
task_instance: Optional[asyncio.Task] = None


async def check_orders_ready_for_dispatch():
    """
    فحص الطلبات التي حان وقت إرسالها للسائقين
    
    الطلبات التي تم وضعها في حالة "preparing" مع send_to_driver_at
    ولم يتم تعيين سائق لها بعد
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    
    # البحث عن الطلبات الجاهزة للتوزيع
    orders_to_dispatch = await db.food_orders.find({
        "status": {"$in": ["preparing", "confirmed"]},
        "driver_id": None,
        "send_to_driver_at": {"$lte": now_iso},
        "dispatched": {"$ne": True}  # لم يتم إرسالها بعد
    }).to_list(50)
    
    if not orders_to_dispatch:
        return 0
    
    dispatched_count = 0
    
    for order in orders_to_dispatch:
        try:
            order_id = order["id"]
            store_id = order.get("store_id")
            store_name = order.get("store_name", "متجر")
            
            # جلب إحداثيات المتجر
            store = await db.food_stores.find_one({"id": store_id}, {"_id": 0})
            if not store:
                continue
            
            store_lat = store.get("latitude", 33.5138)
            store_lon = store.get("longitude", 36.2765)
            
            # البحث عن أقرب سائق متاح
            nearest_driver = await find_nearest_available_driver(store_lat, store_lon)
            
            if nearest_driver:
                # تعيين السائق الأقرب
                assigned = await assign_order_to_driver(
                    order_id=order_id,
                    order_type="food",
                    driver_id=nearest_driver["id"],
                    store_name=store_name
                )
                
                if assigned:
                    # تحديث الطلب
                    await db.food_orders.update_one(
                        {"id": order_id},
                        {
                            "$set": {
                                "dispatched": True,
                                "dispatched_at": now_iso,
                                "dispatch_type": "nearest_driver",
                                "assigned_driver_distance": nearest_driver.get("distance", 0)
                            }
                        }
                    )
                    
                    logger.info(f"Order {order_id} assigned to driver {nearest_driver['name']}")
                    dispatched_count += 1
                    continue
            
            # لا يوجد سائق متاح - إرسال للجميع
            drivers_notified = await send_order_to_all_drivers(
                order_id=order_id,
                order_type="food",
                store_name=store_name
            )
            
            await db.food_orders.update_one(
                {"id": order_id},
                {
                    "$set": {
                        "dispatched": True,
                        "dispatched_at": now_iso,
                        "dispatch_type": "broadcast",
                        "drivers_notified": drivers_notified
                    }
                }
            )
            
            logger.info(f"Order {order_id} broadcast to {drivers_notified} drivers")
            dispatched_count += 1
            
        except Exception as e:
            logger.error(f"Error dispatching order {order.get('id')}: {e}")
            continue
    
    return dispatched_count


async def check_expired_driver_assignments():
    """
    فحص التعيينات المنتهية الصلاحية
    إذا لم يقبل السائق خلال الوقت المحدد، يُرسل الطلب للجميع
    """
    settings = await db.settings.find_one({"type": "delivery_settings"})
    timeout_seconds = 60
    if settings:
        timeout_seconds = settings.get("values", {}).get("driver_accept_timeout_seconds", 60)
    
    expiry_time = (datetime.now(timezone.utc) - timedelta(seconds=timeout_seconds)).isoformat()
    
    # البحث عن التعيينات المنتهية
    expired_assignments = await db.order_assignments.find({
        "status": "pending",
        "assigned_at": {"$lte": expiry_time}
    }).to_list(20)
    
    for assignment in expired_assignments:
        try:
            order_id = assignment["order_id"]
            
            # تحديث التعيين
            await db.order_assignments.update_one(
                {"id": assignment["id"]},
                {"$set": {"status": "expired", "expired_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # التحقق من أن الطلب لا يزال بدون سائق
            order = await db.food_orders.find_one({"id": order_id})
            if order and not order.get("driver_id"):
                # إرسال للجميع
                await send_order_to_all_drivers(
                    order_id=order_id,
                    order_type="food",
                    store_name=assignment.get("store_name", "")
                )
                
                logger.info(f"Assignment for order {order_id} expired, broadcast to all drivers")
            
        except Exception as e:
            logger.error(f"Error handling expired assignment: {e}")


async def check_driver_shortage():
    """
    فحص نقص السائقين في كل مدينة وإرسال إشعار للمدير
    """
    import uuid
    
    try:
        # جلب إعدادات إشعارات نقص السائقين
        settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
        if not settings:
            return
        
        driver_alert = settings.get("driver_shortage_alert", {})
        
        # التحقق من تفعيل الميزة
        if not driver_alert.get("enabled", False):
            return
        
        min_drivers = driver_alert.get("min_available_drivers", 3)
        monitored_cities = driver_alert.get("monitored_cities", [])  # فارغ = كل المدن
        cooldown_minutes = driver_alert.get("cooldown_minutes", 30)  # فترة الانتظار بين الإشعارات
        
        now = datetime.now(timezone.utc)
        
        # جلب المدن إذا لم تكن محددة
        if not monitored_cities:
            cities_result = await db.delivery_documents.distinct("city", {"status": "approved"})
            monitored_cities = [c for c in cities_result if c]
        
        # فحص كل مدينة
        for city in monitored_cities:
            # عدد السائقين المتاحين والمتصلين في المدينة
            # السائق متصل إذا حدّث موقعه خلال آخر دقيقتين
            two_min_ago = (now - timedelta(minutes=2)).isoformat()
            
            # جلب السائقين المعتمدين في المدينة
            approved_docs = await db.delivery_documents.find(
                {"status": "approved", "city": city, "is_available": True},
                {"_id": 0, "driver_id": 1, "delivery_id": 1}
            ).to_list(100)
            
            driver_ids = [doc.get("driver_id") or doc.get("delivery_id") for doc in approved_docs]
            
            if not driver_ids:
                continue
            
            # عدد المتصلين (لديهم موقع حديث)
            online_count = await db.driver_locations.count_documents({
                "driver_id": {"$in": driver_ids},
                "updated_at": {"$gte": two_min_ago}
            })
            
            # التحقق من النقص
            if online_count < min_drivers:
                # التحقق من فترة الانتظار (عدم إرسال إشعارات متكررة)
                last_alert_key = f"driver_shortage_alert_{city}"
                last_alert = await db.system_cache.find_one({"key": last_alert_key}, {"_id": 0})
                
                if last_alert:
                    last_alert_time = datetime.fromisoformat(last_alert["value"].replace("Z", "+00:00"))
                    if (now - last_alert_time) < timedelta(minutes=cooldown_minutes):
                        continue  # لم تنتهِ فترة الانتظار
                
                # إرسال إشعار للمدراء
                admins = await db.users.find(
                    {"user_type": {"$in": ["admin", "sub_admin"]}},
                    {"_id": 0, "id": 1}
                ).to_list(10)
                
                for admin in admins:
                    notification = {
                        "id": str(uuid.uuid4()),
                        "user_id": admin["id"],
                        "title": "⚠️ نقص في السائقين!",
                        "message": f"عدد السائقين المتصلين في {city} ({online_count}) أقل من الحد الأدنى ({min_drivers})",
                        "type": "driver_shortage",
                        "city": city,
                        "is_read": False,
                        "play_sound": True,
                        "created_at": now.isoformat()
                    }
                    await db.notifications.insert_one(notification)
                
                # تحديث وقت آخر إشعار
                await db.system_cache.update_one(
                    {"key": last_alert_key},
                    {"$set": {"key": last_alert_key, "value": now.isoformat()}},
                    upsert=True
                )
                
                logger.warning(f"Driver shortage alert: {city} has only {online_count} online drivers (min: {min_drivers})")
    
    except Exception as e:
        logger.error(f"Error checking driver shortage: {e}")


async def activate_scheduled_orders():
    """
    تفعيل الطلبات المجدولة التي حان وقتها
    يتم تحويلها من حالة "scheduled" إلى "pending"
    """
    try:
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        
        # البحث عن الطلبات المجدولة التي حان وقتها
        scheduled_orders = await db.food_orders.find({
            "is_scheduled": True,
            "status": "scheduled",
            "scheduled_for": {"$lte": now_iso}
        }).to_list(50)
        
        if not scheduled_orders:
            return 0
        
        activated_count = 0
        
        for order in scheduled_orders:
            try:
                order_id = order["id"]
                
                # تفعيل الطلب
                await db.food_orders.update_one(
                    {"id": order_id},
                    {
                        "$set": {
                            "status": "pending",
                            "activated_at": now_iso
                        },
                        "$push": {
                            "status_history": {
                                "status": "pending",
                                "timestamp": now_iso,
                                "note": "تم تفعيل الطلب المجدول تلقائياً"
                            }
                        }
                    }
                )
                
                # إرسال إشعار للعميل
                try:
                    from core.database import create_notification_for_user
                    await create_notification_for_user(
                        user_id=order["customer_id"],
                        title="🕐 طلبك المجدول بدأ الآن!",
                        message=f"طلبك من {order.get('store_name', 'المتجر')} بدأ معالجته الآن",
                        notification_type="order_update"
                    )
                except Exception as e:
                    logger.error(f"Error sending scheduled order notification: {e}")
                
                activated_count += 1
                logger.info(f"Activated scheduled order: {order_id}")
                
            except Exception as e:
                logger.error(f"Error activating scheduled order {order['id']}: {e}")
        
        return activated_count
        
    except Exception as e:
        logger.error(f"Error in activate_scheduled_orders: {e}")
        return 0


async def background_dispatch_loop():
    """
    الحلقة الرئيسية لمهام التوزيع
    تعمل كل 10 ثواني
    """
    global task_running
    
    logger.info("Starting background dispatch loop...")
    task_running = True
    
    # عداد لإطلاق الأرباح المعلقة (كل 5 دقائق = 30 * 10 ثواني)
    release_counter = 0
    # عداد لفحص نقص السائقين (كل دقيقة = 6 * 10 ثواني)
    shortage_counter = 0
    # عداد لفحص الطقس (كل 30 دقيقة = 180 * 10 ثواني)
    weather_counter = 0
    # عداد لتفعيل الطلبات المجدولة (كل دقيقة = 6 * 10 ثواني)
    scheduled_counter = 0
    
    while task_running:
        try:
            # فحص الطلبات الجاهزة للتوزيع
            dispatched = await check_orders_ready_for_dispatch()
            if dispatched > 0:
                logger.info(f"Dispatched {dispatched} orders")
            
            # فحص التعيينات المنتهية
            await check_expired_driver_assignments()
            
            # فحص نقص السائقين كل دقيقة
            shortage_counter += 1
            if shortage_counter >= 6:  # 6 * 10 = 60 ثانية = 1 دقيقة
                shortage_counter = 0
                await check_driver_shortage()
            
            # تفعيل الطلبات المجدولة كل دقيقة
            scheduled_counter += 1
            if scheduled_counter >= 6:  # 6 * 10 = 60 ثانية = 1 دقيقة
                scheduled_counter = 0
                await activate_scheduled_orders()
            
            # فحص الطقس وتحديث الرسوم تلقائياً
            weather_counter += 1
            if weather_counter >= 180:  # 180 * 10 = 1800 ثانية = 30 دقيقة
                weather_counter = 0
                try:
                    from services.weather_service import update_weather_surcharge_automatically
                    result = await update_weather_surcharge_automatically()
                    if result.get("updated"):
                        logger.info(f"Weather surcharge updated: {result}")
                except Exception as e:
                    logger.error(f"Error updating weather surcharge: {e}")
            
            # إطلاق الأرباح المعلقة كل 5 دقائق
            release_counter += 1
            if release_counter >= 30:  # 30 * 10 = 300 ثانية = 5 دقائق
                release_counter = 0
                try:
                    from services.earnings_hold import release_held_earnings
                    result = await release_held_earnings()
                    if result["released_count"] > 0:
                        logger.info(f"Released {result['released_count']} held earnings, total: {result['total_released']} SYP")
                except Exception as e:
                    logger.error(f"Error releasing held earnings: {e}")
            
            # تنظيف تسجيلات المكالمات المنتهية كل ساعة
            if release_counter == 0:  # كل 5 دقائق، لكن سنتحقق كل ساعة
                try:
                    from routes.voip import cleanup_expired_recordings
                    await cleanup_expired_recordings()
                    logger.debug("VoIP recordings cleanup completed")
                except Exception as e:
                    logger.error(f"Error cleaning up VoIP recordings: {e}")
            
            # معالجة الطلبات المتأخرة وحماية العميل كل دقيقة
            if shortage_counter == 0:  # نفس توقيت فحص نقص السائقين
                try:
                    from services.violation_system import process_delayed_orders
                    result = await process_delayed_orders()
                    if result.get("processed", 0) > 0:
                        logger.info(f"Processed {result['processed']} delayed orders for customer protection")
                except Exception as e:
                    logger.error(f"Error processing delayed orders: {e}")
            
        except Exception as e:
            logger.error(f"Error in dispatch loop: {e}")
        
        # انتظار 10 ثواني
        await asyncio.sleep(10)
    
    logger.info("Background dispatch loop stopped")


def start_background_tasks():
    """بدء مهام الخلفية"""
    global task_instance
    
    if task_instance is not None:
        return
    
    try:
        # استخدام asyncio.create_task مباشرة في بيئة async
        task_instance = asyncio.create_task(background_dispatch_loop())
        logger.info("Background tasks started")
    except RuntimeError:
        # في حالة عدم وجود event loop، نستخدم get_event_loop
        try:
            loop = asyncio.get_event_loop()
            task_instance = loop.create_task(background_dispatch_loop())
            logger.info("Background tasks started (via event loop)")
        except Exception as e:
            logger.warning(f"Could not start background tasks: {e}")


def stop_background_tasks():
    """إيقاف مهام الخلفية"""
    global task_running, task_instance
    
    task_running = False
    if task_instance:
        task_instance.cancel()
        task_instance = None
    
    logger.info("Background tasks stopped")
