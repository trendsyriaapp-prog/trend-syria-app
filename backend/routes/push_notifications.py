"""
Push Notifications API
إشعارات Push للتطبيق - تعمل حتى عندما يكون التطبيق مغلقاً
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from pywebpush import webpush, WebPushException
import os
import json
from bson import ObjectId

router = APIRouter(prefix="/push", tags=["Push Notifications"])

# الحصول على قاعدة البيانات
def get_db():
    from server import db
    return db

# نموذج الاشتراك
class PushSubscription(BaseModel):
    endpoint: str
    keys: dict  # p256dh و auth

class SubscriptionRequest(BaseModel):
    subscription: PushSubscription
    user_type: Optional[str] = None  # seller, food_seller, delivery, buyer

# نموذج الإشعار
class NotificationPayload(BaseModel):
    title: str
    body: str
    icon: Optional[str] = "/logo192.png"
    badge: Optional[str] = "/badge.png"
    url: Optional[str] = "/"
    tag: Optional[str] = None
    data: Optional[dict] = None

# الحصول على المستخدم الحالي
async def get_current_user_from_token(token: str = None):
    """استخراج المستخدم من التوكن"""
    if not token:
        return None
    try:
        import jwt
        payload = jwt.decode(token, os.environ.get("JWT_SECRET"), algorithms=["HS256"])
        return payload
    except:
        return None

@router.get("/vapid-public-key")
async def get_vapid_public_key():
    """الحصول على المفتاح العام للاشتراك في الإشعارات"""
    public_key = os.environ.get("VAPID_PUBLIC_KEY")
    if not public_key:
        raise HTTPException(status_code=500, detail="VAPID key not configured")
    return {"publicKey": public_key}

@router.post("/subscribe")
async def subscribe_to_push(request: SubscriptionRequest):
    """الاشتراك في إشعارات Push"""
    db = get_db()
    
    subscription_data = {
        "endpoint": request.subscription.endpoint,
        "keys": request.subscription.keys,
        "user_type": request.user_type,
        "active": True
    }
    
    # التحقق من عدم وجود اشتراك مكرر
    existing = await db.push_subscriptions.find_one({"endpoint": request.subscription.endpoint})
    if existing:
        # تحديث الاشتراك الموجود
        await db.push_subscriptions.update_one(
            {"endpoint": request.subscription.endpoint},
            {"$set": subscription_data}
        )
        return {"message": "تم تحديث الاشتراك", "status": "updated"}
    
    # إضافة اشتراك جديد
    await db.push_subscriptions.insert_one(subscription_data)
    return {"message": "تم الاشتراك بنجاح", "status": "subscribed"}

@router.post("/unsubscribe")
async def unsubscribe_from_push(request: SubscriptionRequest):
    """إلغاء الاشتراك من إشعارات Push"""
    db = get_db()
    
    result = await db.push_subscriptions.delete_one({"endpoint": request.subscription.endpoint})
    if result.deleted_count > 0:
        return {"message": "تم إلغاء الاشتراك", "status": "unsubscribed"}
    return {"message": "لم يتم العثور على الاشتراك", "status": "not_found"}

async def send_push_notification(subscription: dict, payload: dict):
    """إرسال إشعار Push لمشترك واحد"""
    try:
        vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY")
        vapid_email = os.environ.get("VAPID_EMAIL", "mailto:admin@trendsyria.com")
        
        if not vapid_private_key:
            print("VAPID private key not configured")
            return False
        
        subscription_info = {
            "endpoint": subscription["endpoint"],
            "keys": subscription["keys"]
        }
        
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=vapid_private_key,
            vapid_claims={"sub": vapid_email}
        )
        return True
    except WebPushException as e:
        print(f"WebPush error: {e}")
        # إذا كان الاشتراك غير صالح، نقوم بحذفه
        if e.response and e.response.status_code in [404, 410]:
            db = get_db()
            await db.push_subscriptions.delete_one({"endpoint": subscription["endpoint"]})
        return False
    except Exception as e:
        print(f"Push notification error: {e}")
        return False

async def notify_user_type(user_type: str, notification: NotificationPayload):
    """إرسال إشعار لجميع المشتركين من نوع معين"""
    db = get_db()
    
    # البحث عن جميع الاشتراكات من هذا النوع
    cursor = db.push_subscriptions.find({"user_type": user_type, "active": True})
    subscriptions = await cursor.to_list(length=1000)
    
    # إذا كان النوع delivery، نستثني السائقين غير المتاحين
    if user_type == "delivery":
        # جلب قائمة السائقين المتاحين
        available_drivers = await db.delivery_documents.find(
            {"is_available": True},
            {"driver_id": 1, "delivery_id": 1}
        ).to_list(1000)
        
        available_driver_ids = set()
        for doc in available_drivers:
            if doc.get("driver_id"):
                available_driver_ids.add(doc["driver_id"])
            if doc.get("delivery_id"):
                available_driver_ids.add(doc["delivery_id"])
        
        # تصفية الاشتراكات للسائقين المتاحين فقط
        subscriptions = [
            sub for sub in subscriptions 
            if sub.get("user_id") in available_driver_ids
        ]
    
    payload = {
        "title": notification.title,
        "body": notification.body,
        "icon": notification.icon,
        "badge": notification.badge,
        "url": notification.url,
        "tag": notification.tag,
        "data": notification.data or {}
    }
    
    success_count = 0
    for sub in subscriptions:
        if await send_push_notification(sub, payload):
            success_count += 1
    
    return {"sent": success_count, "total": len(subscriptions)}

@router.post("/notify/sellers")
async def notify_all_sellers(notification: NotificationPayload):
    """إرسال إشعار لجميع البائعين"""
    result = await notify_user_type("seller", notification)
    return result

@router.post("/notify/food-sellers")
async def notify_all_food_sellers(notification: NotificationPayload):
    """إرسال إشعار لجميع بائعي الطعام"""
    result = await notify_user_type("food_seller", notification)
    return result

@router.post("/notify/delivery")
async def notify_all_delivery(notification: NotificationPayload):
    """إرسال إشعار لجميع سائقي التوصيل"""
    result = await notify_user_type("delivery", notification)
    return result

# دالة مساعدة للاستخدام في routes أخرى
async def send_new_order_notification_to_food_seller(store_id: str, order_number: str, total: float):
    """إرسال إشعار طلب جديد لبائع الطعام"""
    notification = NotificationPayload(
        title="طلب جديد!",
        body=f"طلب جديد #{order_number} - {total:,.0f} ل.س",
        icon="/logo192.png",
        url="/seller/dashboard?tab=menu",
        tag=f"new-order-{order_number}",
        data={"type": "new_food_order", "order_number": order_number}
    )
    return await notify_user_type("food_seller", notification)

async def send_new_order_notification_to_delivery(order_type: str, city: str):
    """إرسال إشعار طلب جديد متاح للتوصيل"""
    notification = NotificationPayload(
        title="طلب جديد متاح للتوصيل!",
        body=f"طلب {order_type} جديد في {city}",
        icon="/logo192.png",
        url="/delivery/dashboard?tab=available",
        tag="new-delivery-order",
        data={"type": "new_delivery_order", "city": city}
    )
    return await notify_user_type("delivery", notification)

async def send_order_status_notification(endpoint: str, title: str, body: str, url: str = "/"):
    """إرسال إشعار حالة الطلب لمشترك محدد"""
    db = get_db()
    subscription = await db.push_subscriptions.find_one({"endpoint": endpoint})
    if subscription:
        payload = {
            "title": title,
            "body": body,
            "icon": "/logo192.png",
            "url": url
        }
        return await send_push_notification(subscription, payload)
    return False
