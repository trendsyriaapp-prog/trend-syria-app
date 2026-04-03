"""
Flash Reminder Scheduler
يرسل تذكيرات للبائعين قبل 3 ساعات من بدء الفلاش
"""
import asyncio
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import uuid
import logging

logger = logging.getLogger(__name__)

# المتغير العام للـ scheduler
scheduler = None
db = None

def init_scheduler(database):
    """تهيئة الـ scheduler مع قاعدة البيانات"""
    global scheduler, db
    db = database
    
    scheduler = AsyncIOScheduler()
    
    # تشغيل الفحص كل 30 دقيقة
    scheduler.add_job(
        check_and_send_flash_reminders,
        IntervalTrigger(minutes=30),
        id='flash_reminder_job',
        name='Flash Reminder Check',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("✅ Flash Scheduler started - checking every 30 minutes")


async def check_and_send_flash_reminders():
    """فحص وإرسال تذكيرات الفلاش"""
    global db
    
    if not db:
        logger.warning("Database not initialized for scheduler")
        return
    
    try:
        # جلب إعدادات الفلاش
        settings = await db.platform_settings.find_one({"id": "promotions"})
        if not settings or not settings.get("enabled", True):
            return
        
        flash_start_hour = settings.get("flash_start_hour", 13)
        flash_days = settings.get("flash_days", [0, 1, 2, 3, 4, 5, 6])
        food_flash_enabled = settings.get("food_flash_enabled", True)
        products_flash_enabled = settings.get("products_flash_enabled", True)
        
        now = datetime.now(timezone.utc)
        today_weekday = now.weekday()
        
        # حساب وقت بدء الفلاش اليوم
        today_flash_start = now.replace(hour=flash_start_hour, minute=0, second=0, microsecond=0)
        
        # التحقق إذا كان اليوم من أيام الفلاش
        if today_weekday not in flash_days:
            return
        
        # حساب الفرق بين الآن ووقت البدء
        time_until_start = (today_flash_start - now).total_seconds()
        
        # إرسال تذكير إذا كان الفلاش سيبدأ خلال 3 ساعات ولم يبدأ بعد
        # (بين 2.5 و 3.5 ساعات لتجنب التكرار)
        if 9000 <= time_until_start <= 12600:  # 2.5 - 3.5 ساعات
            logger.info(f"⏰ Flash starting in ~3 hours, sending reminders...")
            
            # التحقق إذا تم إرسال تذكير اليوم
            today_str = now.strftime("%Y-%m-%d")
            existing_reminder = await db.flash_reminders.find_one({
                "date": today_str,
                "sent": True
            })
            
            if existing_reminder:
                logger.info("Reminder already sent today, skipping")
                return
            
            # إرسال تذكيرات للبائعين
            sellers_notified = 0
            
            # بائعي المنتجات
            if products_flash_enabled:
                product_sellers = await db.users.find({
                    "user_type": "seller",
                    "is_approved": True
                }).to_list(1000)
                
                for seller in product_sellers:
                    await send_flash_reminder(seller["id"], "product")
                    sellers_notified += 1
            
            # بائعي الطعام
            if food_flash_enabled:
                food_sellers = await db.users.find({
                    "user_type": "food_seller",
                    "is_approved": True
                }).to_list(1000)
                
                for seller in food_sellers:
                    await send_flash_reminder(seller["id"], "food")
                    sellers_notified += 1
            
            # تسجيل أن التذكير تم إرساله
            await db.flash_reminders.insert_one({
                "date": today_str,
                "sent": True,
                "sent_at": now.isoformat(),
                "sellers_notified": sellers_notified
            })
            
            logger.info(f"✅ Sent flash reminders to {sellers_notified} sellers")
    
    except Exception as e:
        logger.error(f"Error in flash reminder check: {e}")


async def send_flash_reminder(user_id: str, seller_type: str):
    """إرسال تذكير فلاش لبائع معين"""
    global db
    
    try:
        now = datetime.now(timezone.utc).isoformat()
        
        if seller_type == "food":
            title = "⏰ تذكير: فلاش الطعام يبدأ قريباً!"
            message = "فلاش يبدأ بعد 3 ساعات! أضف منتجاتك الآن لتظهر في العروض."
        else:
            title = "⏰ تذكير: فلاش المنتجات يبدأ قريباً!"
            message = "فلاش يبدأ بعد 3 ساعات! أضف منتجاتك الآن لتظهر في العروض."
        
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": "flash_reminder",
            "is_read": False,
            "created_at": now
        })
    
    except Exception as e:
        logger.error(f"Error sending reminder to {user_id}: {e}")


def shutdown_scheduler():
    """إيقاف الـ scheduler"""
    global scheduler
    if scheduler:
        scheduler.shutdown()
        logger.info("Flash Scheduler stopped")
