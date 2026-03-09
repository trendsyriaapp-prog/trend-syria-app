# /app/backend/routes/newsletter.py
# نظام النشرة البريدية

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re
import logging

from core.database import db, get_current_user, create_notification_for_user

router = APIRouter(prefix="/newsletter", tags=["Newsletter"])
logger = logging.getLogger(__name__)

# ============== نماذج البيانات ==============

class SubscribeRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None

class UnsubscribeRequest(BaseModel):
    email: EmailStr

class NewsletterCreate(BaseModel):
    subject: str
    content: str  # HTML content
    preview_text: Optional[str] = None
    target_audience: str = "all"  # all, buyers, sellers, delivery
    scheduled_at: Optional[str] = None  # ISO format for scheduled sending

class NewsletterUpdate(BaseModel):
    subject: Optional[str] = None
    content: Optional[str] = None
    preview_text: Optional[str] = None
    target_audience: Optional[str] = None

# ============== وظائف مساعدة ==============

def validate_email(email: str) -> bool:
    """التحقق من صحة البريد الإلكتروني"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

async def get_subscribers_by_target(target: str) -> List[dict]:
    """جلب المشتركين حسب الفئة المستهدفة"""
    query = {"is_active": True}
    
    if target == "all":
        pass  # جميع المشتركين
    elif target == "buyers":
        query["user_type"] = "buyer"
    elif target == "sellers":
        query["user_type"] = "seller"
    elif target == "delivery":
        query["user_type"] = "delivery"
    
    subscribers = await db.newsletter_subscribers.find(
        query,
        {"_id": 0, "email": 1, "name": 1}
    ).to_list(10000)
    
    return subscribers

# ============== اشتراك المستخدمين ==============

@router.post("/subscribe")
async def subscribe_to_newsletter(data: SubscribeRequest):
    """الاشتراك في النشرة البريدية"""
    
    # التحقق من صحة البريد
    if not validate_email(data.email):
        raise HTTPException(status_code=400, detail="البريد الإلكتروني غير صالح")
    
    # التحقق من عدم وجود اشتراك سابق
    existing = await db.newsletter_subscribers.find_one({"email": data.email.lower()})
    
    if existing:
        if existing.get("is_active"):
            return {"message": "أنت مشترك بالفعل في النشرة البريدية", "already_subscribed": True}
        else:
            # إعادة تفعيل الاشتراك
            await db.newsletter_subscribers.update_one(
                {"email": data.email.lower()},
                {
                    "$set": {
                        "is_active": True,
                        "resubscribed_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            return {"message": "تم إعادة تفعيل اشتراكك بنجاح!", "reactivated": True}
    
    # إنشاء اشتراك جديد
    subscriber = {
        "id": str(uuid.uuid4()),
        "email": data.email.lower(),
        "name": data.name,
        "phone": data.phone,
        "is_active": True,
        "user_type": None,  # سيتم تحديثه إذا سجل الدخول
        "source": "website",
        "subscribed_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.newsletter_subscribers.insert_one(subscriber)
    
    return {
        "message": "تم الاشتراك بنجاح! سنرسل لك أحدث العروض والمنتجات",
        "subscriber_id": subscriber["id"]
    }

@router.post("/subscribe/user")
async def subscribe_logged_user(user: dict = Depends(get_current_user)):
    """اشتراك المستخدم المسجل"""
    
    email = user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="يرجى إضافة بريد إلكتروني لحسابك أولاً")
    
    existing = await db.newsletter_subscribers.find_one({"email": email.lower()})
    
    if existing:
        if existing.get("is_active"):
            return {"message": "أنت مشترك بالفعل", "already_subscribed": True}
        else:
            await db.newsletter_subscribers.update_one(
                {"email": email.lower()},
                {
                    "$set": {
                        "is_active": True,
                        "user_id": user["id"],
                        "user_type": user.get("user_type"),
                        "resubscribed_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            return {"message": "تم إعادة تفعيل اشتراكك!", "reactivated": True}
    
    subscriber = {
        "id": str(uuid.uuid4()),
        "email": email.lower(),
        "name": user.get("full_name") or user.get("name"),
        "phone": user.get("phone"),
        "user_id": user["id"],
        "user_type": user.get("user_type"),
        "is_active": True,
        "source": "app",
        "subscribed_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.newsletter_subscribers.insert_one(subscriber)
    
    return {"message": "تم الاشتراك بنجاح!", "subscriber_id": subscriber["id"]}

@router.post("/unsubscribe")
async def unsubscribe_from_newsletter(data: UnsubscribeRequest):
    """إلغاء الاشتراك"""
    
    result = await db.newsletter_subscribers.update_one(
        {"email": data.email.lower()},
        {
            "$set": {
                "is_active": False,
                "unsubscribed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="البريد غير مسجل في النشرة")
    
    return {"message": "تم إلغاء الاشتراك بنجاح. نأسف لرؤيتك تذهب!"}

@router.get("/status")
async def check_subscription_status(email: str):
    """التحقق من حالة الاشتراك"""
    
    subscriber = await db.newsletter_subscribers.find_one(
        {"email": email.lower()},
        {"_id": 0, "is_active": 1, "subscribed_at": 1}
    )
    
    if not subscriber:
        return {"subscribed": False}
    
    return {
        "subscribed": subscriber.get("is_active", False),
        "subscribed_at": subscriber.get("subscribed_at")
    }

# ============== إدارة النشرات (الأدمن) ==============

@router.get("/subscribers")
async def get_all_subscribers(
    user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 50,
    status: str = "all"  # all, active, inactive
):
    """جلب قائمة المشتركين (للأدمن)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    query = {}
    if status == "active":
        query["is_active"] = True
    elif status == "inactive":
        query["is_active"] = False
    
    skip = (page - 1) * limit
    
    subscribers = await db.newsletter_subscribers.find(
        query,
        {"_id": 0}
    ).sort("subscribed_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.newsletter_subscribers.count_documents(query)
    active_count = await db.newsletter_subscribers.count_documents({"is_active": True})
    
    return {
        "subscribers": subscribers,
        "total": total,
        "active_count": active_count,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/stats")
async def get_newsletter_stats(user: dict = Depends(get_current_user)):
    """إحصائيات النشرة البريدية"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    total_subscribers = await db.newsletter_subscribers.count_documents({})
    active_subscribers = await db.newsletter_subscribers.count_documents({"is_active": True})
    total_newsletters = await db.newsletters.count_documents({})
    sent_newsletters = await db.newsletters.count_documents({"status": "sent"})
    
    # اشتراكات آخر 7 أيام
    from datetime import timedelta
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    new_subscribers = await db.newsletter_subscribers.count_documents({
        "subscribed_at": {"$gte": week_ago}
    })
    
    # إلغاءات آخر 7 أيام
    unsubscribes = await db.newsletter_subscribers.count_documents({
        "unsubscribed_at": {"$gte": week_ago}
    })
    
    return {
        "total_subscribers": total_subscribers,
        "active_subscribers": active_subscribers,
        "inactive_subscribers": total_subscribers - active_subscribers,
        "total_newsletters": total_newsletters,
        "sent_newsletters": sent_newsletters,
        "new_subscribers_week": new_subscribers,
        "unsubscribes_week": unsubscribes,
        "growth_rate": round((new_subscribers - unsubscribes) / max(active_subscribers, 1) * 100, 2)
    }

@router.post("/create")
async def create_newsletter(
    data: NewsletterCreate,
    user: dict = Depends(get_current_user)
):
    """إنشاء نشرة بريدية جديدة"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    newsletter = {
        "id": str(uuid.uuid4()),
        "subject": data.subject,
        "content": data.content,
        "preview_text": data.preview_text or data.subject[:100],
        "target_audience": data.target_audience,
        "status": "draft",  # draft, scheduled, sending, sent
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "scheduled_at": data.scheduled_at,
        "sent_at": None,
        "stats": {
            "total_sent": 0,
            "delivered": 0,
            "opened": 0,
            "clicked": 0
        }
    }
    
    await db.newsletters.insert_one(newsletter)
    
    return {"message": "تم إنشاء النشرة بنجاح", "newsletter_id": newsletter["id"]}

@router.get("/list")
async def list_newsletters(
    user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 20,
    status: str = "all"
):
    """قائمة النشرات البريدية"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    query = {}
    if status != "all":
        query["status"] = status
    
    skip = (page - 1) * limit
    
    newsletters = await db.newsletters.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.newsletters.count_documents(query)
    
    return {
        "newsletters": newsletters,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/{newsletter_id}")
async def get_newsletter(newsletter_id: str, user: dict = Depends(get_current_user)):
    """تفاصيل نشرة معينة"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    newsletter = await db.newsletters.find_one(
        {"id": newsletter_id},
        {"_id": 0}
    )
    
    if not newsletter:
        raise HTTPException(status_code=404, detail="النشرة غير موجودة")
    
    return newsletter

@router.put("/{newsletter_id}")
async def update_newsletter(
    newsletter_id: str,
    data: NewsletterUpdate,
    user: dict = Depends(get_current_user)
):
    """تحديث نشرة (قبل الإرسال فقط)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    newsletter = await db.newsletters.find_one({"id": newsletter_id})
    if not newsletter:
        raise HTTPException(status_code=404, detail="النشرة غير موجودة")
    
    if newsletter.get("status") == "sent":
        raise HTTPException(status_code=400, detail="لا يمكن تعديل نشرة تم إرسالها")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.newsletters.update_one(
        {"id": newsletter_id},
        {"$set": update_data}
    )
    
    return {"message": "تم تحديث النشرة بنجاح"}

@router.delete("/{newsletter_id}")
async def delete_newsletter(newsletter_id: str, user: dict = Depends(get_current_user)):
    """حذف نشرة (المسودات فقط)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    newsletter = await db.newsletters.find_one({"id": newsletter_id})
    if not newsletter:
        raise HTTPException(status_code=404, detail="النشرة غير موجودة")
    
    if newsletter.get("status") != "draft":
        raise HTTPException(status_code=400, detail="يمكن حذف المسودات فقط")
    
    await db.newsletters.delete_one({"id": newsletter_id})
    
    return {"message": "تم حذف النشرة"}

# ============== إرسال النشرات ==============

async def send_email_task(newsletter_id: str, subscribers: List[dict]):
    """مهمة إرسال البريد في الخلفية"""
    try:
        newsletter = await db.newsletters.find_one({"id": newsletter_id})
        if not newsletter:
            return
        
        sent_count = 0
        failed_count = 0
        
        for subscriber in subscribers:
            try:
                # هنا يتم إرسال البريد الفعلي
                # حالياً نسجل فقط أنه تم "إرسال" البريد
                # في الإنتاج ستستخدم SendGrid أو Resend أو AWS SES
                
                # تسجيل الإرسال
                await db.newsletter_sends.insert_one({
                    "id": str(uuid.uuid4()),
                    "newsletter_id": newsletter_id,
                    "email": subscriber["email"],
                    "status": "sent",  # في الواقع: sent, delivered, bounced, failed
                    "sent_at": datetime.now(timezone.utc).isoformat()
                })
                
                sent_count += 1
                
            except Exception as e:
                logger.error(f"Failed to send to {subscriber['email']}: {e}")
                failed_count += 1
        
        # تحديث إحصائيات النشرة
        await db.newsletters.update_one(
            {"id": newsletter_id},
            {
                "$set": {
                    "status": "sent",
                    "sent_at": datetime.now(timezone.utc).isoformat(),
                    "stats.total_sent": sent_count,
                    "stats.failed": failed_count
                }
            }
        )
        
        logger.info(f"Newsletter {newsletter_id} sent to {sent_count} subscribers")
        
    except Exception as e:
        logger.error(f"Newsletter send task failed: {e}")
        await db.newsletters.update_one(
            {"id": newsletter_id},
            {"$set": {"status": "failed", "error": str(e)}}
        )

@router.post("/{newsletter_id}/send")
async def send_newsletter(
    newsletter_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """إرسال النشرة للمشتركين"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    newsletter = await db.newsletters.find_one({"id": newsletter_id})
    if not newsletter:
        raise HTTPException(status_code=404, detail="النشرة غير موجودة")
    
    if newsletter.get("status") == "sent":
        raise HTTPException(status_code=400, detail="تم إرسال هذه النشرة مسبقاً")
    
    if newsletter.get("status") == "sending":
        raise HTTPException(status_code=400, detail="جاري إرسال هذه النشرة")
    
    # جلب المشتركين المستهدفين
    subscribers = await get_subscribers_by_target(newsletter.get("target_audience", "all"))
    
    if not subscribers:
        raise HTTPException(status_code=400, detail="لا يوجد مشتركين لإرسال النشرة إليهم")
    
    # تحديث الحالة
    await db.newsletters.update_one(
        {"id": newsletter_id},
        {"$set": {"status": "sending"}}
    )
    
    # إرسال في الخلفية
    background_tasks.add_task(send_email_task, newsletter_id, subscribers)
    
    return {
        "message": f"جاري إرسال النشرة إلى {len(subscribers)} مشترك",
        "subscribers_count": len(subscribers)
    }

@router.post("/{newsletter_id}/test")
async def send_test_newsletter(
    newsletter_id: str,
    test_email: str,
    user: dict = Depends(get_current_user)
):
    """إرسال نسخة تجريبية"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if not validate_email(test_email):
        raise HTTPException(status_code=400, detail="البريد غير صالح")
    
    newsletter = await db.newsletters.find_one({"id": newsletter_id}, {"_id": 0})
    if not newsletter:
        raise HTTPException(status_code=404, detail="النشرة غير موجودة")
    
    # إرسال بريد تجريبي
    # في الإنتاج سيتم إرسال بريد فعلي
    
    return {
        "message": f"تم إرسال نسخة تجريبية إلى {test_email}",
        "preview": {
            "subject": newsletter["subject"],
            "preview_text": newsletter.get("preview_text")
        }
    }

# ============== قوالب النشرات ==============

@router.get("/templates/list")
async def get_newsletter_templates(user: dict = Depends(get_current_user)):
    """قوالب جاهزة للنشرات"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    templates = [
        {
            "id": "welcome",
            "name": "ترحيب بالمشتركين الجدد",
            "subject": "مرحباً بك في تريند سورية! 🎉",
            "preview_text": "شكراً لانضمامك إلينا",
            "content": """
            <div style="font-family: 'Cairo', Arial, sans-serif; direction: rtl; padding: 20px;">
                <h1 style="color: #FF6B00;">مرحباً بك في تريند سورية!</h1>
                <p>شكراً لاشتراكك في نشرتنا البريدية.</p>
                <p>سنرسل لك أحدث العروض والمنتجات الجديدة.</p>
                <a href="{app_url}" style="background: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">تصفح المنتجات</a>
            </div>
            """
        },
        {
            "id": "sale",
            "name": "إعلان عروض",
            "subject": "🔥 عروض حصرية تصل إلى 50%!",
            "preview_text": "لا تفوت هذه العروض المذهلة",
            "content": """
            <div style="font-family: 'Cairo', Arial, sans-serif; direction: rtl; padding: 20px;">
                <h1 style="color: #FF6B00;">عروض لا تُفوَّت! 🔥</h1>
                <p>خصومات تصل إلى 50% على منتجات مختارة.</p>
                <p>العرض لفترة محدودة!</p>
                <a href="{app_url}/products?discount=true" style="background: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">تسوق الآن</a>
            </div>
            """
        },
        {
            "id": "new_products",
            "name": "منتجات جديدة",
            "subject": "✨ وصلت منتجات جديدة!",
            "preview_text": "اكتشف أحدث المنتجات",
            "content": """
            <div style="font-family: 'Cairo', Arial, sans-serif; direction: rtl; padding: 20px;">
                <h1 style="color: #FF6B00;">منتجات جديدة! ✨</h1>
                <p>اكتشف أحدث ما وصلنا من منتجات مميزة.</p>
                <a href="{app_url}/products?sort=newest" style="background: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">شاهد المنتجات الجديدة</a>
            </div>
            """
        },
        {
            "id": "coupon",
            "name": "كوبون خصم",
            "subject": "🎁 هديتك: كوبون خصم خاص!",
            "preview_text": "استخدم هذا الكوبون للحصول على خصم",
            "content": """
            <div style="font-family: 'Cairo', Arial, sans-serif; direction: rtl; padding: 20px; text-align: center;">
                <h1 style="color: #FF6B00;">هديتك الخاصة! 🎁</h1>
                <p>استخدم هذا الكوبون للحصول على خصم:</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <span style="font-size: 28px; font-weight: bold; color: #FF6B00; letter-spacing: 4px;">{coupon_code}</span>
                </div>
                <p>خصم {discount_percent}% على طلبك القادم!</p>
                <a href="{app_url}" style="background: #FF6B00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">تسوق الآن</a>
            </div>
            """
        }
    ]
    
    return templates
