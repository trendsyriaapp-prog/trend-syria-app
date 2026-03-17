# /app/backend/services/notification_helper.py
# Helper لإرسال الإشعارات مع Push Notifications

import uuid
from datetime import datetime, timezone
from core.database import db
from services.firebase_push import send_push_to_multiple
import logging

logger = logging.getLogger(__name__)

async def send_notification_with_push(
    user_id: str,
    title: str,
    message: str,
    notification_type: str = "general",
    data: dict = None,
    image: str = None,
    play_sound: bool = True,
    priority: str = "normal"
) -> dict:
    """
    إرسال إشعار للمستخدم مع Push Notification
    
    Args:
        user_id: معرف المستخدم
        title: عنوان الإشعار
        message: نص الإشعار
        notification_type: نوع الإشعار (order, chat, delivery, etc.)
        data: بيانات إضافية
        image: رابط صورة
        play_sound: تشغيل صوت
        priority: أولوية (normal, high)
    
    Returns:
        dict مع حالة الإرسال
    """
    try:
        # 1. حفظ الإشعار في قاعدة البيانات
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": notification_type,
            "data": data or {},
            "image": image,
            "is_read": False,
            "play_sound": play_sound,
            "priority": priority,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.notifications.insert_one(notification)
        logger.info(f"Notification saved for user {user_id}: {title}")
        
        # 2. إرسال Push Notification
        push_result = {"success": False, "reason": "not_attempted"}
        
        # جلب tokens المستخدم
        tokens_cursor = db.push_tokens.find(
            {"user_id": user_id, "is_active": True},
            {"_id": 0, "token": 1}
        )
        tokens = await tokens_cursor.to_list(10)
        
        if tokens:
            token_list = [t["token"] for t in tokens]
            
            push_data = {
                "type": notification_type,
                "notification_id": notification["id"],
                **(data or {})
            }
            
            push_result = await send_push_to_multiple(
                tokens=token_list,
                title=title,
                body=message,
                data={k: str(v) for k, v in push_data.items()},  # FCM requires string values
                image=image
            )
            
            # تنظيف tokens الفاشلة
            if push_result.get("failed_tokens"):
                await db.push_tokens.update_many(
                    {"token": {"$in": push_result["failed_tokens"]}},
                    {"$set": {"is_active": False}}
                )
                logger.info(f"Deactivated {len(push_result['failed_tokens'])} failed tokens")
        else:
            push_result = {"success": False, "reason": "no_tokens"}
        
        return {
            "notification_id": notification["id"],
            "saved": True,
            "push_result": push_result
        }
        
    except Exception as e:
        logger.error(f"Error sending notification: {e}")
        return {
            "notification_id": None,
            "saved": False,
            "error": str(e)
        }

async def send_notification_to_multiple_users(
    user_ids: list,
    title: str,
    message: str,
    notification_type: str = "general",
    data: dict = None,
    image: str = None
) -> dict:
    """
    إرسال إشعار لعدة مستخدمين
    """
    results = {
        "total": len(user_ids),
        "saved": 0,
        "push_sent": 0,
        "errors": []
    }
    
    for user_id in user_ids:
        try:
            result = await send_notification_with_push(
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notification_type,
                data=data,
                image=image
            )
            
            if result.get("saved"):
                results["saved"] += 1
            if result.get("push_result", {}).get("success"):
                results["push_sent"] += 1
                
        except Exception as e:
            results["errors"].append({"user_id": user_id, "error": str(e)})
    
    return results

async def send_notification_to_user_type(
    user_type: str,
    title: str,
    message: str,
    notification_type: str = "general",
    data: dict = None,
    image: str = None,
    limit: int = 1000
) -> dict:
    """
    إرسال إشعار لجميع المستخدمين من نوع معين
    مثل: seller, driver, customer, food_seller, admin
    """
    # جلب قائمة المستخدمين
    users = await db.users.find(
        {"user_type": user_type},
        {"_id": 0, "id": 1}
    ).limit(limit).to_list(None)
    
    if not users:
        return {"total": 0, "saved": 0, "push_sent": 0}
    
    user_ids = [u["id"] for u in users]
    
    return await send_notification_to_multiple_users(
        user_ids=user_ids,
        title=title,
        message=message,
        notification_type=notification_type,
        data=data,
        image=image
    )
