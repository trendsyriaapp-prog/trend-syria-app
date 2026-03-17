# /app/backend/services/firebase_push.py
# خدمة إرسال إشعارات Push عبر Firebase Cloud Messaging

import firebase_admin
from firebase_admin import credentials, messaging
import logging
import os

logger = logging.getLogger(__name__)

# مسار ملف Service Account
SERVICE_ACCOUNT_PATH = "/app/backend/firebase-service-account.json"

# تهيئة Firebase
_firebase_initialized = False

def initialize_firebase():
    """تهيئة Firebase Admin SDK"""
    global _firebase_initialized
    
    if _firebase_initialized:
        return True
    
    try:
        if os.path.exists(SERVICE_ACCOUNT_PATH):
            cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            logger.info("✅ Firebase Admin SDK initialized successfully")
            return True
        else:
            logger.error(f"❌ Firebase service account file not found: {SERVICE_ACCOUNT_PATH}")
            return False
    except Exception as e:
        if "already exists" in str(e):
            _firebase_initialized = True
            return True
        logger.error(f"❌ Error initializing Firebase: {e}")
        return False

async def send_push_notification(
    token: str,
    title: str,
    body: str,
    data: dict = None,
    image: str = None
) -> dict:
    """
    إرسال إشعار Push لمستخدم واحد
    
    Args:
        token: FCM token للمستخدم
        title: عنوان الإشعار
        body: نص الإشعار
        data: بيانات إضافية (اختياري)
        image: رابط صورة (اختياري)
    
    Returns:
        dict مع حالة الإرسال
    """
    if not initialize_firebase():
        return {"success": False, "error": "Firebase not initialized"}
    
    try:
        # بناء الإشعار
        notification = messaging.Notification(
            title=title,
            body=body,
            image=image
        )
        
        # إعدادات Web Push
        webpush = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon="/images/logo.png",
                badge="/images/badge.png",
                tag="trend-syria-notification",
                renotify=True,
                require_interaction=True,
                vibrate=[200, 100, 200]
            ),
            fcm_options=messaging.WebpushFCMOptions(
                link="/"  # رابط عند الضغط على الإشعار
            )
        )
        
        # بناء الرسالة
        message = messaging.Message(
            notification=notification,
            webpush=webpush,
            token=token,
            data=data or {}
        )
        
        # إرسال الرسالة
        response = messaging.send(message)
        
        logger.info(f"✅ Push notification sent successfully: {response}")
        return {"success": True, "message_id": response}
        
    except messaging.UnregisteredError:
        logger.warning(f"⚠️ Token is invalid or unregistered: {token[:20]}...")
        return {"success": False, "error": "invalid_token", "should_remove": True}
    except Exception as e:
        logger.error(f"❌ Error sending push notification: {e}")
        return {"success": False, "error": str(e)}

async def send_push_to_multiple(
    tokens: list,
    title: str,
    body: str,
    data: dict = None,
    image: str = None
) -> dict:
    """
    إرسال إشعار Push لعدة مستخدمين
    
    Args:
        tokens: قائمة FCM tokens
        title: عنوان الإشعار
        body: نص الإشعار
        data: بيانات إضافية
        image: رابط صورة
    
    Returns:
        dict مع إحصائيات الإرسال
    """
    if not initialize_firebase():
        return {"success": False, "error": "Firebase not initialized"}
    
    if not tokens:
        return {"success": False, "error": "No tokens provided"}
    
    try:
        # بناء الإشعار
        notification = messaging.Notification(
            title=title,
            body=body,
            image=image
        )
        
        # إعدادات Web Push
        webpush = messaging.WebpushConfig(
            notification=messaging.WebpushNotification(
                title=title,
                body=body,
                icon="/images/logo.png",
                badge="/images/badge.png",
                tag="trend-syria-notification",
                renotify=True
            )
        )
        
        # بناء رسالة Multicast
        message = messaging.MulticastMessage(
            notification=notification,
            webpush=webpush,
            tokens=tokens,
            data=data or {}
        )
        
        # إرسال الرسائل
        response = messaging.send_each_for_multicast(message)
        
        # جمع التوكنات الفاشلة لحذفها
        failed_tokens = []
        for idx, send_response in enumerate(response.responses):
            if not send_response.success:
                if isinstance(send_response.exception, messaging.UnregisteredError):
                    failed_tokens.append(tokens[idx])
        
        logger.info(f"✅ Multicast: {response.success_count} success, {response.failure_count} failed")
        
        return {
            "success": True,
            "success_count": response.success_count,
            "failure_count": response.failure_count,
            "failed_tokens": failed_tokens
        }
        
    except Exception as e:
        logger.error(f"❌ Error sending multicast: {e}")
        return {"success": False, "error": str(e)}

async def send_push_to_topic(
    topic: str,
    title: str,
    body: str,
    data: dict = None,
    image: str = None
) -> dict:
    """
    إرسال إشعار لموضوع (Topic) - لجميع المشتركين
    
    Args:
        topic: اسم الموضوع (مثل: all_users, drivers, sellers)
        title: عنوان الإشعار
        body: نص الإشعار
        data: بيانات إضافية
        image: رابط صورة
    
    Returns:
        dict مع حالة الإرسال
    """
    if not initialize_firebase():
        return {"success": False, "error": "Firebase not initialized"}
    
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
                image=image
            ),
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=title,
                    body=body,
                    icon="/images/logo.png"
                )
            ),
            topic=topic,
            data=data or {}
        )
        
        response = messaging.send(message)
        
        logger.info(f"✅ Topic notification sent: {response}")
        return {"success": True, "message_id": response}
        
    except Exception as e:
        logger.error(f"❌ Error sending topic notification: {e}")
        return {"success": False, "error": str(e)}

async def subscribe_to_topic(tokens: list, topic: str) -> dict:
    """اشتراك توكنات في موضوع"""
    if not initialize_firebase():
        return {"success": False, "error": "Firebase not initialized"}
    
    try:
        response = messaging.subscribe_to_topic(tokens, topic)
        return {
            "success": True,
            "success_count": response.success_count,
            "failure_count": response.failure_count
        }
    except Exception as e:
        logger.error(f"❌ Error subscribing to topic: {e}")
        return {"success": False, "error": str(e)}

async def unsubscribe_from_topic(tokens: list, topic: str) -> dict:
    """إلغاء اشتراك توكنات من موضوع"""
    if not initialize_firebase():
        return {"success": False, "error": "Firebase not initialized"}
    
    try:
        response = messaging.unsubscribe_from_topic(tokens, topic)
        return {
            "success": True,
            "success_count": response.success_count,
            "failure_count": response.failure_count
        }
    except Exception as e:
        logger.error(f"❌ Error unsubscribing from topic: {e}")
        return {"success": False, "error": str(e)}
