# /app/backend/core/firebase_admin.py
# إعداد Firebase Admin SDK لإرسال الإشعارات

import firebase_admin
from firebase_admin import credentials, messaging
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# تهيئة Firebase Admin
def init_firebase():
    """تهيئة Firebase Admin SDK"""
    try:
        if not firebase_admin._apps:
            cred_path = Path(__file__).parent.parent / "config" / "firebase-service-account.json"
            cred = credentials.Certificate(str(cred_path))
            firebase_admin.initialize_app(cred)
            logger.info("✅ Firebase Admin initialized successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Firebase Admin initialization failed: {e}")
        return False

# تهيئة عند استيراد الملف
firebase_initialized = init_firebase()

async def send_push_notification(
    fcm_token: str,
    title: str,
    body: str,
    data: dict = None,
    image: str = None
) -> bool:
    """
    إرسال إشعار لمستخدم واحد
    
    Args:
        fcm_token: توكن FCM للمستخدم
        title: عنوان الإشعار
        body: نص الإشعار
        data: بيانات إضافية (اختياري)
        image: رابط صورة (اختياري)
    
    Returns:
        True إذا نجح الإرسال
    """
    if not firebase_initialized:
        logger.error("Firebase not initialized")
        return False
    
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
                image=image
            ),
            data=data or {},
            token=fcm_token,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    icon="ic_notification",
                    color="#FF6B00",
                    sound="default"
                )
            ),
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    icon="/icons/icon-192.png",
                    badge="/icons/icon-72.png"
                )
            )
        )
        
        response = messaging.send(message)
        logger.info(f"✅ Push notification sent: {response}")
        return True
        
    except messaging.UnregisteredError:
        logger.warning(f"Token unregistered: {fcm_token[:20]}...")
        return False
    except Exception as e:
        logger.error(f"❌ Push notification failed: {e}")
        return False

async def send_push_to_multiple(
    fcm_tokens: list,
    title: str,
    body: str,
    data: dict = None,
    image: str = None
) -> dict:
    """
    إرسال إشعار لعدة مستخدمين
    
    Returns:
        {"success": int, "failed": int}
    """
    if not firebase_initialized:
        return {"success": 0, "failed": len(fcm_tokens)}
    
    if not fcm_tokens:
        return {"success": 0, "failed": 0}
    
    try:
        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
                image=image
            ),
            data=data or {},
            tokens=fcm_tokens,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    icon="ic_notification",
                    color="#FF6B00",
                    sound="default"
                )
            ),
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    icon="/icons/icon-192.png",
                    badge="/icons/icon-72.png"
                )
            )
        )
        
        response = messaging.send_each_for_multicast(message)
        
        return {
            "success": response.success_count,
            "failed": response.failure_count
        }
        
    except Exception as e:
        logger.error(f"❌ Multicast push failed: {e}")
        return {"success": 0, "failed": len(fcm_tokens)}

async def send_push_to_topic(
    topic: str,
    title: str,
    body: str,
    data: dict = None,
    image: str = None
) -> bool:
    """
    إرسال إشعار لموضوع (جميع المشتركين)
    
    Topics: 'all_users', 'offers', 'orders', etc.
    """
    if not firebase_initialized:
        return False
    
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
                image=image
            ),
            data=data or {},
            topic=topic,
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    icon="ic_notification",
                    color="#FF6B00",
                    sound="default"
                )
            ),
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    icon="/icons/icon-192.png",
                    badge="/icons/icon-72.png"
                )
            )
        )
        
        response = messaging.send(message)
        logger.info(f"✅ Topic notification sent to '{topic}': {response}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Topic push failed: {e}")
        return False
