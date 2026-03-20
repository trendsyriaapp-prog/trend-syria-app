# /app/backend/routes/notifications.py
# مسارات الإشعارات

from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
import uuid
from typing import Optional

from core.database import db, get_current_user
from models.schemas import NotificationCreate

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# تصنيف أنواع الإشعارات حسب السياق
SELLER_NOTIFICATION_TYPES = [
    'new_order', 'order_cancelled', 'order_paid', 'review', 'low_stock',
    'product_approved', 'product_rejected', 'wallet_credit', 'withdrawal_approved',
    'seller_approved', 'seller_offer'
]

DELIVERY_NOTIFICATION_TYPES = [
    'delivery_available', 'delivery_assigned', 'delivery_completed', 'delivery_cancelled',
    'delivery_bonus', 'delivery_penalty', 'wallet_credit', 'withdrawal_approved',
    'delivery_approved', 'delivery_challenge'
]

CUSTOMER_NOTIFICATION_TYPES = [
    'order_status', 'delivery', 'delivery_ready', 'gift_received', 'gift_accepted',
    'gift_completed', 'promotion', 'flash_sale', 'daily_deal', 'loyalty_points',
    'food_order', 'coupon', 'price_drop'
]

# أنواع إشعارات المدير
ADMIN_NOTIFICATION_TYPES = [
    'new_seller_registration', 'new_driver_registration', 'withdrawal_request',
    'seller_document_submitted', 'driver_document_submitted', 'report_submitted',
    'support_ticket', 'system_alert', 'low_stock_alert', 'topup_request',
    'admin_notification', 'seller_approved', 'seller_rejected', 'delivery_approved', 'delivery_rejected'
]

@router.get("")
async def get_notifications(
    user: dict = Depends(get_current_user),
    context: Optional[str] = Query(None, description="seller, delivery, customer, or admin")
):
    """جلب الإشعارات مع إمكانية الفلترة حسب السياق"""
    user_type = user.get("user_type", "buyer")
    target_role = user_type + "s" if not user_type.endswith("s") else user_type
    
    # بناء الاستعلام الأساسي
    base_query = {"$or": [
        {"target": "all"},
        {"target": target_role},
        {"target": user_type},
        {"user_id": user["id"]}
    ]}
    
    # إذا تم تحديد سياق معين، فلتر حسب أنواع الإشعارات
    if context:
        if context == 'seller' and user_type in ['seller', 'food_seller']:
            # إشعارات البائع فقط
            base_query = {"$and": [
                base_query,
                {"type": {"$in": SELLER_NOTIFICATION_TYPES}}
            ]}
        elif context == 'delivery' and user_type == 'delivery':
            # إشعارات التوصيل فقط
            base_query = {"$and": [
                base_query,
                {"type": {"$in": DELIVERY_NOTIFICATION_TYPES}}
            ]}
        elif context == 'admin' and user_type in ['admin', 'sub_admin']:
            # إشعارات المدير فقط
            base_query = {"$and": [
                base_query,
                {"type": {"$in": ADMIN_NOTIFICATION_TYPES}}
            ]}
        elif context == 'customer':
            # إشعارات العميل فقط (للجميع عند التصفح كعميل)
            base_query = {"$and": [
                base_query,
                {"type": {"$in": CUSTOMER_NOTIFICATION_TYPES}}
            ]}
    # إذا كان المدير بدون سياق محدد، نعرض إشعارات المدير فقط
    elif user_type in ['admin', 'sub_admin']:
        base_query = {"$and": [
            base_query,
            {"type": {"$in": ADMIN_NOTIFICATION_TYPES}}
        ]}
    
    notifications = await db.notifications.find(
        base_query,
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Get user's read notifications
    user_reads = await db.notification_reads.find(
        {"user_id": user["id"]},
        {"_id": 0, "notification_id": 1}
    ).to_list(100)
    read_ids = {r["notification_id"] for r in user_reads}
    
    # Add is_read flag
    for n in notifications:
        n["is_read"] = n["id"] in read_ids
    
    return notifications


@router.get("/unread")
async def get_unread_notifications(user: dict = Depends(get_current_user)):
    """جلب الإشعارات غير المقروءة للمستخدم"""
    # Get user's read notifications
    user_reads = await db.notification_reads.find(
        {"user_id": user["id"]},
        {"_id": 0, "notification_id": 1}
    ).to_list(100)
    read_ids = {r["notification_id"] for r in user_reads}
    
    # Get notifications for user
    user_type = user.get("user_type", "buyer")
    target_role = user_type + "s" if not user_type.endswith("s") else user_type
    
    notifications = await db.notifications.find(
        {"$or": [
            {"target": "all"},
            {"target": target_role},
            {"target": user_type},
            {"user_id": user["id"]}
        ]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Filter only unread notifications
    unread_notifications = [n for n in notifications if n["id"] not in read_ids]
    
    # Add is_read flag (always False for this endpoint)
    for n in unread_notifications:
        n["is_read"] = False
    
    return unread_notifications



@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notification_reads.update_one(
        {"user_id": user["id"], "notification_id": notification_id},
        {"$set": {
            "user_id": user["id"],
            "notification_id": notification_id,
            "read_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "تم تحديد الإشعار كمقروء"}

@router.post("/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    user_type = user.get("user_type", "buyer")
    target_role = user_type + "s" if not user_type.endswith("s") else user_type
    
    notifications = await db.notifications.find(
        {"$or": [
            {"target": "all"},
            {"target": target_role},
            {"target": user_type},
            {"user_id": user["id"]}
        ]},
        {"_id": 0, "id": 1}
    ).to_list(100)
    
    for n in notifications:
        await db.notification_reads.update_one(
            {"user_id": user["id"], "notification_id": n["id"]},
            {"$set": {
                "user_id": user["id"],
                "notification_id": n["id"],
                "read_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    
    return {"message": "تم تحديد جميع الإشعارات كمقروءة"}

# ============== Firebase Cloud Messaging ==============

from pydantic import BaseModel

class FCMTokenRequest(BaseModel):
    fcm_token: str

@router.post("/fcm-token")
async def save_fcm_token(data: FCMTokenRequest, user: dict = Depends(get_current_user)):
    """حفظ FCM Token للمستخدم"""
    await db.fcm_tokens.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "user_id": user["id"],
            "fcm_token": data.fcm_token,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "تم حفظ التوكن"}

@router.delete("/fcm-token")
async def remove_fcm_token(user: dict = Depends(get_current_user)):
    """إزالة FCM Token للمستخدم"""
    await db.fcm_tokens.delete_one({"user_id": user["id"]})
    return {"message": "تم إزالة التوكن"}

# ============== إرسال إشعارات Push من الأدمن ==============

from core.firebase_admin import send_push_notification, send_push_to_multiple, send_push_to_topic
import logging

logger = logging.getLogger(__name__)

class PushNotificationRequest(BaseModel):
    title: str
    body: str
    target: str = "all"  # all, buyers, sellers, delivery, user_id
    user_id: str = None
    data: dict = None
    image: str = None

@router.post("/push/send")
async def send_push_notification_admin(data: PushNotificationRequest, user: dict = Depends(get_current_user)):
    """إرسال إشعار Push من الأدمن"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    results = {"success": 0, "failed": 0, "total": 0}
    
    try:
        # جلب توكنات المستخدمين المستهدفين
        query = {}
        if data.target == "all":
            query = {}
        elif data.target == "buyers":
            # جلب IDs المشترين
            buyers = await db.users.find({"user_type": "buyer"}, {"_id": 0, "id": 1}).to_list(10000)
            buyer_ids = [b["id"] for b in buyers]
            query = {"user_id": {"$in": buyer_ids}}
        elif data.target == "sellers":
            sellers = await db.users.find({"user_type": "seller"}, {"_id": 0, "id": 1}).to_list(10000)
            seller_ids = [s["id"] for s in sellers]
            query = {"user_id": {"$in": seller_ids}}
        elif data.target == "delivery":
            drivers = await db.users.find({"user_type": "delivery"}, {"_id": 0, "id": 1}).to_list(10000)
            driver_ids = [d["id"] for d in drivers]
            query = {"user_id": {"$in": driver_ids}}
        elif data.user_id:
            query = {"user_id": data.user_id}
        
        # جلب التوكنات
        tokens_docs = await db.fcm_tokens.find(query, {"_id": 0, "fcm_token": 1}).to_list(10000)
        tokens = [t["fcm_token"] for t in tokens_docs if t.get("fcm_token")]
        
        results["total"] = len(tokens)
        
        if not tokens:
            return {"message": "لا توجد توكنات مسجلة", **results}
        
        # إرسال الإشعارات
        if len(tokens) == 1:
            success = await send_push_notification(
                fcm_token=tokens[0],
                title=data.title,
                body=data.body,
                data=data.data,
                image=data.image
            )
            results["success"] = 1 if success else 0
            results["failed"] = 0 if success else 1
        else:
            # إرسال للمجموعة (بدفعات من 500)
            for i in range(0, len(tokens), 500):
                batch = tokens[i:i+500]
                batch_result = await send_push_to_multiple(
                    fcm_tokens=batch,
                    title=data.title,
                    body=data.body,
                    data=data.data,
                    image=data.image
                )
                results["success"] += batch_result.get("success", 0)
                results["failed"] += batch_result.get("failed", 0)
        
        # حفظ سجل الإشعار
        await db.push_logs.insert_one({
            "id": str(uuid.uuid4()),
            "admin_id": user["id"],
            "title": data.title,
            "body": data.body,
            "target": data.target,
            "results": results,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"message": "تم إرسال الإشعارات", **results}
        
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في إرسال الإشعارات: {str(e)}")

@router.post("/push/test")
async def test_push_notification(user: dict = Depends(get_current_user)):
    """إرسال إشعار تجريبي للمستخدم الحالي"""
    try:
        # جلب توكن المستخدم
        token_doc = await db.fcm_tokens.find_one({"user_id": user["id"]}, {"_id": 0})
        
        if not token_doc or not token_doc.get("fcm_token"):
            raise HTTPException(status_code=400, detail="لم يتم تسجيل توكن الإشعارات")
        
        success = await send_push_notification(
            fcm_token=token_doc["fcm_token"],
            title="إشعار تجريبي 🔔",
            body="هذا إشعار تجريبي من ترند سورية",
            data={"type": "test", "url": "/"}
        )
        
        if success:
            return {"message": "تم إرسال الإشعار التجريبي بنجاح"}
        else:
            raise HTTPException(status_code=500, detail="فشل إرسال الإشعار")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ: {str(e)}")

@router.get("/push/stats")
async def get_push_stats(user: dict = Depends(get_current_user)):
    """إحصائيات إشعارات Push"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # عدد التوكنات المسجلة
    total_tokens = await db.fcm_tokens.count_documents({})
    
    # آخر الإشعارات المرسلة
    recent_logs = await db.push_logs.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "total_registered_tokens": total_tokens,
        "recent_notifications": recent_logs
    }
