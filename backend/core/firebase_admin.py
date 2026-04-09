# /app/backend/core/firebase_admin.py
# إعداد Firebase Admin SDK لإرسال الإشعارات

import firebase_admin
from firebase_admin import credentials, messaging
from pathlib import Path
import logging
import os

logger = logging.getLogger(__name__)

# تهيئة Firebase Admin
def init_firebase():
    """تهيئة Firebase Admin SDK"""
    try:
        if not firebase_admin._apps:
            # محاولة قراءة من environment variables أولاً
            project_id = os.environ.get("FIREBASE_PROJECT_ID")
            client_email = os.environ.get("FIREBASE_CLIENT_EMAIL")
            private_key = os.environ.get("FIREBASE_PRIVATE_KEY")
            
            if project_id and client_email and private_key:
                # استخدام credentials من environment variables
                cred_dict = {
                    "type": "service_account",
                    "project_id": project_id,
                    "client_email": client_email,
                    "private_key": private_key.replace('\\n', '\n'),
                    "token_uri": "https://oauth2.googleapis.com/token"
                }
                cred = credentials.Certificate(cred_dict)
                logger.info("✅ Using Firebase credentials from environment variables")
            else:
                # fallback: قراءة من ملف JSON
                cred_path = Path(__file__).parent.parent / "config" / "firebase-service-account.json"
                if not cred_path.exists():
                    cred_path = Path(__file__).parent.parent / "firebase-service-account.json"
                cred = credentials.Certificate(str(cred_path))
                logger.info("✅ Using Firebase credentials from JSON file")
            
            firebase_admin.initialize_app(cred)
            logger.info("✅ Firebase Admin initialized successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Firebase Admin initialization failed: {e}")
        return False

# تهيئة عند استيراد الملف - مع معالجة الأخطاء
try:
    firebase_initialized = init_firebase()
except Exception as e:
    logger.warning(f"⚠️ Firebase initialization skipped: {e}")
    firebase_initialized = False

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


async def send_push_to_user(
    user_id: str,
    title: str,
    body: str,
    data: dict = None,
    image: str = None
) -> bool:
    """
    إرسال إشعار لمستخدم بناءً على user_id
    يجلب FCM tokens من قاعدة البيانات ويرسل لجميع أجهزة المستخدم
    
    Args:
        user_id: معرف المستخدم
        title: عنوان الإشعار
        body: نص الإشعار
        data: بيانات إضافية (اختياري)
        image: رابط صورة (اختياري)
    
    Returns:
        True إذا نجح الإرسال لجهاز واحد على الأقل
    """
    if not firebase_initialized:
        logger.error("Firebase not initialized")
        return False
    
    try:
        from core.database import db
        
        # جلب FCM tokens للمستخدم من جدول push_tokens
        tokens_cursor = db.push_tokens.find({"user_id": user_id})
        tokens_list = await tokens_cursor.to_list(10)  # حد أقصى 10 أجهزة
        
        if not tokens_list:
            # محاولة جلب من حقل fcm_token في جدول المستخدمين
            user = await db.users.find_one({"id": user_id}, {"fcm_token": 1})
            if user and user.get("fcm_token"):
                tokens_list = [{"token": user["fcm_token"]}]
        
        if not tokens_list:
            logger.warning(f"No FCM tokens found for user: {user_id}")
            return False
        
        fcm_tokens = [t["token"] for t in tokens_list if t.get("token")]
        
        if not fcm_tokens:
            return False
        
        # إرسال لجميع أجهزة المستخدم
        if len(fcm_tokens) == 1:
            return await send_push_notification(fcm_tokens[0], title, body, data, image)
        else:
            result = await send_push_to_multiple(fcm_tokens, title, body, data, image)
            return result["success"] > 0
            
    except Exception as e:
        logger.error(f"❌ Push to user failed: {e}")
        return False


async def send_push_to_admins(
    title: str,
    body: str,
    notification_type: str,
    data: dict = None,
    image: str = None
) -> dict:
    """
    إرسال إشعار Push لجميع المدراء (admin + sub_admin)
    
    Args:
        title: عنوان الإشعار
        body: نص الإشعار
        notification_type: نوع الإشعار (مثل: new_seller, new_product, withdrawal_request)
        data: بيانات إضافية (اختياري)
        image: رابط صورة (اختياري)
    
    Returns:
        {"success": int, "failed": int, "total_admins": int}
    """
    if not firebase_initialized:
        logger.warning("Firebase not initialized - skipping admin push notification")
        return {"success": 0, "failed": 0, "total_admins": 0}
    
    try:
        from core.database import db
        import uuid
        from datetime import datetime, timezone
        
        # جلب جميع المدراء
        admins = await db.users.find(
            {"user_type": {"$in": ["admin", "sub_admin"]}},
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(50)
        
        if not admins:
            logger.warning("No admins found to notify")
            return {"success": 0, "failed": 0, "total_admins": 0}
        
        admin_ids = [a["id"] for a in admins]
        
        # جلب FCM tokens لجميع المدراء
        tokens_cursor = db.push_tokens.find({"user_id": {"$in": admin_ids}})
        tokens_list = await tokens_cursor.to_list(100)
        
        # أيضاً تحقق من fcm_token في جدول المستخدمين
        for admin in admins:
            admin_data = await db.users.find_one({"id": admin["id"]}, {"fcm_token": 1})
            if admin_data and admin_data.get("fcm_token"):
                tokens_list.append({"token": admin_data["fcm_token"], "user_id": admin["id"]})
        
        fcm_tokens = list(set([t["token"] for t in tokens_list if t.get("token")]))
        
        # حفظ إشعار داخلي لكل مدير
        now = datetime.now(timezone.utc).isoformat()
        notifications = []
        for admin_id in admin_ids:
            notifications.append({
                "id": str(uuid.uuid4()),
                "user_id": admin_id,
                "title": title,
                "message": body,
                "type": notification_type,
                "data": data or {},
                "is_read": False,
                "created_at": now
            })
        
        if notifications:
            await db.notifications.insert_many(notifications)
            logger.info(f"✅ Saved {len(notifications)} internal notifications for admins")
        
        # إرسال Push notifications
        if not fcm_tokens:
            logger.warning("No FCM tokens found for admins - internal notifications saved only")
            return {"success": 0, "failed": 0, "total_admins": len(admins), "internal_saved": len(notifications)}
        
        # إعداد البيانات الإضافية
        push_data = {
            "type": notification_type,
            "click_action": "FLUTTER_NOTIFICATION_CLICK",
            **(data or {})
        }
        # تحويل جميع القيم إلى strings (مطلوب لـ FCM)
        push_data = {k: str(v) for k, v in push_data.items()}
        
        result = await send_push_to_multiple(fcm_tokens, title, body, push_data, image)
        
        logger.info(f"✅ Admin push notifications: {result['success']} success, {result['failed']} failed")
        
        return {
            "success": result["success"],
            "failed": result["failed"],
            "total_admins": len(admins),
            "internal_saved": len(notifications)
        }
        
    except Exception as e:
        logger.error(f"❌ Push to admins failed: {e}")
        return {"success": 0, "failed": 0, "total_admins": 0, "error": str(e)}

