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
    
    while task_running:
        try:
            # فحص الطلبات الجاهزة للتوزيع
            dispatched = await check_orders_ready_for_dispatch()
            if dispatched > 0:
                logger.info(f"Dispatched {dispatched} orders")
            
            # فحص التعيينات المنتهية
            await check_expired_driver_assignments()
            
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
    
    loop = asyncio.get_event_loop()
    task_instance = loop.create_task(background_dispatch_loop())
    logger.info("Background tasks started")


def stop_background_tasks():
    """إيقاف مهام الخلفية"""
    global task_running, task_instance
    
    task_running = False
    if task_instance:
        task_instance.cancel()
        task_instance = None
    
    logger.info("Background tasks stopped")
