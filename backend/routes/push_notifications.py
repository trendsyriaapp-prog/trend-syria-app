# /app/backend/routes/push_notifications.py
# API لإدارة إشعارات Push

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user
from services.firebase_push import (
    send_push_notification,
    send_push_to_multiple,
    send_push_to_topic,
    subscribe_to_topic,
    unsubscribe_from_topic
)

router = APIRouter(prefix="/push", tags=["Push Notifications"])

class TokenRegistration(BaseModel):
    token: str
    device_type: str = "web"  # web, android, ios

class SendNotificationRequest(BaseModel):
    user_id: Optional[str] = None
    title: str
    body: str
    data: Optional[dict] = None
    image: Optional[str] = None

class TopicSubscription(BaseModel):
    topic: str

# ==================== تسجيل Token ====================

@router.post("/register-token")
async def register_push_token(
    data: TokenRegistration,
    user: dict = Depends(get_current_user)
):
    """تسجيل FCM token للمستخدم"""
    
    try:
        # التحقق من وجود token مسبق
        existing = await db.push_tokens.find_one({
            "user_id": user["id"],
            "token": data.token
        })
        
        if existing:
            # تحديث آخر استخدام
            await db.push_tokens.update_one(
                {"_id": existing["_id"]},
                {"$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
            )
            return {"success": True, "message": "Token already registered"}
        
        # حذف tokens قديمة للمستخدم (احتفظ بآخر 5 فقط)
        old_tokens = await db.push_tokens.find(
            {"user_id": user["id"]}
        ).sort("created_at", -1).skip(4).to_list(100)
        
        if old_tokens:
            old_ids = [t["_id"] for t in old_tokens]
            await db.push_tokens.delete_many({"_id": {"$in": old_ids}})
        
        # تسجيل token جديد
        token_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "user_type": user.get("user_type", "customer"),
            "token": data.token,
            "device_type": data.device_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_used": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }
        
        await db.push_tokens.insert_one(token_doc)
        
        # اشتراك تلقائي في المواضيع حسب نوع المستخدم
        topics = ["all_users"]
        user_type = user.get("user_type", "customer")
        
        if user_type == "driver":
            topics.append("drivers")
        elif user_type == "seller":
            topics.append("sellers")
        elif user_type == "food_seller":
            topics.append("food_sellers")
        elif user_type == "admin":
            topics.append("admins")
        else:
            topics.append("customers")
        
        for topic in topics:
            await subscribe_to_topic([data.token], topic)
        
        return {
            "success": True,
            "message": "Token registered successfully",
            "subscribed_topics": topics
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/unregister-token")
async def unregister_push_token(
    token: str,
    user: dict = Depends(get_current_user)
):
    """إلغاء تسجيل FCM token"""
    
    try:
        result = await db.push_tokens.delete_one({
            "user_id": user["id"],
            "token": token
        })
        
        if result.deleted_count > 0:
            # إلغاء الاشتراك من المواضيع
            await unsubscribe_from_topic([token], "all_users")
            return {"success": True, "message": "Token unregistered"}
        
        return {"success": False, "message": "Token not found"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==================== إرسال الإشعارات ====================

@router.post("/send-to-user")
async def send_notification_to_user(
    data: SendNotificationRequest,
    user: dict = Depends(get_current_user)
):
    """إرسال إشعار لمستخدم محدد (للمدير فقط)"""
    
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    target_user_id = data.user_id
    if not target_user_id:
        raise HTTPException(status_code=400, detail="user_id مطلوب")
    
    # جلب tokens المستخدم
    tokens = await db.push_tokens.find(
        {"user_id": target_user_id, "is_active": True},
        {"_id": 0, "token": 1}
    ).to_list(10)
    
    if not tokens:
        return {"success": False, "message": "لا يوجد token مسجل للمستخدم"}
    
    token_list = [t["token"] for t in tokens]
    
    # إرسال الإشعار
    result = await send_push_to_multiple(
        tokens=token_list,
        title=data.title,
        body=data.body,
        data=data.data,
        image=data.image
    )
    
    # حذف tokens الفاشلة
    if result.get("failed_tokens"):
        await db.push_tokens.update_many(
            {"token": {"$in": result["failed_tokens"]}},
            {"$set": {"is_active": False}}
        )
    
    return result

@router.post("/send-to-topic")
async def send_notification_to_topic(
    topic: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
    image: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """إرسال إشعار لموضوع (للمدير فقط)"""
    
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    result = await send_push_to_topic(
        topic=topic,
        title=title,
        body=body,
        data=data,
        image=image
    )
    
    return result

# ==================== إدارة الاشتراكات ====================

@router.post("/subscribe")
async def subscribe_user_to_topic(
    data: TopicSubscription,
    user: dict = Depends(get_current_user)
):
    """اشتراك المستخدم في موضوع"""
    
    tokens = await db.push_tokens.find(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0, "token": 1}
    ).to_list(10)
    
    if not tokens:
        return {"success": False, "message": "لا يوجد token مسجل"}
    
    token_list = [t["token"] for t in tokens]
    result = await subscribe_to_topic(token_list, data.topic)
    
    return result

@router.post("/unsubscribe")
async def unsubscribe_user_from_topic(
    data: TopicSubscription,
    user: dict = Depends(get_current_user)
):
    """إلغاء اشتراك المستخدم من موضوع"""
    
    tokens = await db.push_tokens.find(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0, "token": 1}
    ).to_list(10)
    
    if not tokens:
        return {"success": False, "message": "لا يوجد token مسجل"}
    
    token_list = [t["token"] for t in tokens]
    result = await unsubscribe_from_topic(token_list, data.topic)
    
    return result

# ==================== دالة مساعدة للإرسال من أي مكان ====================

async def send_push_to_user_id(
    user_id: str,
    title: str,
    body: str,
    data: dict = None,
    image: str = None
) -> dict:
    """
    دالة مساعدة لإرسال Push من أي مكان في التطبيق
    تُستخدم مع نظام الإشعارات الحالي
    """
    tokens = await db.push_tokens.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0, "token": 1}
    ).to_list(10)
    
    if not tokens:
        return {"success": False, "reason": "no_tokens"}
    
    token_list = [t["token"] for t in tokens]
    
    result = await send_push_to_multiple(
        tokens=token_list,
        title=title,
        body=body,
        data=data,
        image=image
    )
    
    # تنظيف tokens الفاشلة
    if result.get("failed_tokens"):
        await db.push_tokens.update_many(
            {"token": {"$in": result["failed_tokens"]}},
            {"$set": {"is_active": False}}
        )
    
    return result
