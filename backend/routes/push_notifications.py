# /app/backend/routes/push_notifications.py
# API لإدارة إشعارات Push

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user
from services.firebase_push import (
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
) -> dict:
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
) -> dict:
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
) -> dict:
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
) -> dict:
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
) -> dict:
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
) -> dict:
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


# ==================== إشعارات طلبات الطعام ====================

async def send_new_order_notification_to_food_seller(
    seller_id: str,
    order_number: str,
    total: float,
    items_count: int = 0
) -> dict:
    """
    إرسال إشعار Push لبائع الطعام عند وصول طلب جديد
    """
    from services.firebase_push import send_push_notification
    
    try:
        # جلب tokens البائع
        tokens = await db.push_tokens.find(
            {"user_id": seller_id, "is_active": True},
            {"_id": 0, "token": 1}
        ).to_list(10)
        
        if not tokens:
            # محاولة من جدول fcm_tokens القديم
            old_token = await db.fcm_tokens.find_one({"user_id": seller_id})
            if old_token and old_token.get("fcm_token"):
                tokens = [{"token": old_token["fcm_token"]}]
        
        if not tokens:
            return {"success": False, "reason": "no_tokens"}
        
        title = "🍽️ طلب جديد!"
        body = f"لديك طلب جديد #{order_number} بقيمة {total:,.0f} ل.س"
        if items_count > 0:
            body += f" ({items_count} أصناف)"
        
        data = {
            "type": "new_food_order",
            "order_number": str(order_number),
            "click_action": "/food/dashboard?tab=orders"
        }
        
        success_count = 0
        for t in tokens:
            result = await send_push_notification(
                token=t["token"],
                title=title,
                body=body,
                data=data
            )
            if result.get("success"):
                success_count += 1
        
        return {"success": success_count > 0, "sent": success_count}
        
    except Exception as e:
        import logging
        logging.error(f"❌ Error sending food seller notification: {e}")
        return {"success": False, "error": str(e)}


async def send_new_order_notification_to_delivery(
    order_id: str,
    order_number: str,
    store_name: str,
    delivery_fee: float,
    pickup_area: str = "",
    delivery_area: str = ""
) -> dict:
    """
    إرسال إشعار Push للسائقين المتاحين عند وجود طلب جاهز للتوصيل
    """
    from services.firebase_push import send_push_to_multiple
    
    try:
        # جلب السائقين المتاحين
        available_drivers = await db.users.find(
            {
                "user_type": "delivery",
                "is_approved": True,
                "is_available": True
            },
            {"_id": 0, "id": 1}
        ).to_list(100)
        
        if not available_drivers:
            return {"success": False, "reason": "no_available_drivers"}
        
        driver_ids = [d["id"] for d in available_drivers]
        
        # جلب tokens السائقين
        tokens_cursor = db.push_tokens.find(
            {"user_id": {"$in": driver_ids}, "is_active": True},
            {"_id": 0, "token": 1}
        )
        tokens_list = await tokens_cursor.to_list(500)
        fcm_tokens = [t["token"] for t in tokens_list if t.get("token")]
        
        if not fcm_tokens:
            return {"success": False, "reason": "no_tokens"}
        
        title = "🚗 طلب توصيل جديد!"
        body = f"💰 {delivery_fee:,.0f} ل.س - {store_name}"
        if delivery_area:
            body += f" → {delivery_area}"
        
        data = {
            "type": "new_delivery_order",
            "order_id": str(order_id),
            "order_number": str(order_number),
            "store_name": store_name,
            "delivery_fee": str(int(delivery_fee)),
            "click_action": "/delivery/dashboard?tab=available"
        }
        
        result = await send_push_to_multiple(
            tokens=fcm_tokens,
            title=title,
            body=body,
            data=data
        )
        
        return {
            "success": result.get("success_count", 0) > 0,
            "sent": result.get("success_count", 0),
            "failed": result.get("failure_count", 0)
        }
        
    except Exception as e:
        import logging
        logging.error(f"❌ Error sending delivery notification: {e}")
        return {"success": False, "error": str(e)}
