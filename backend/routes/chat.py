# /app/backend/routes/chat.py
# نظام المحادثة بين السائق والعميل

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

from core.database import db, get_current_user, create_notification_for_user
from helpers.datetime_helpers import get_now
from services.websocket_manager import manager

router = APIRouter(prefix="/chat", tags=["Chat"])


class SendMessageRequest(BaseModel):
    order_id: str
    message: str


class MarkReadRequest(BaseModel):
    order_id: str


# ============== APIs ==============

@router.get("/conversation/{order_id}")
async def get_conversation(order_id: str, user: dict = Depends(get_current_user)) -> dict:
    """جلب محادثة طلب معين"""
    
    # التحقق من الطلب
    order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        # جرب طلبات المنتجات
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من الصلاحية
    user_id = user["id"]
    user_type = user.get("user_type")
    
    # دعم كلا الحقلين driver_id و delivery_driver_id
    order_driver_id = order.get("driver_id") or order.get("delivery_driver_id") or order.get("delivery_id")
    
    is_customer = order.get("customer_id") == user_id or order.get("user_id") == user_id
    is_driver = order_driver_id == user_id
    is_admin = user_type in ["admin", "sub_admin"]
    
    if not (is_customer or is_driver or is_admin):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # جلب الرسائل
    messages = await db.chat_messages.find(
        {"order_id": order_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    
    # تحديد أطراف المحادثة
    customer_name = order.get("customer_name", "العميل")
    driver_name = "السائق"
    
    if order_driver_id:
        driver = await db.users.find_one(
            {"id": order_driver_id},
            {"_id": 0, "name": 1, "full_name": 1}
        )
        if driver:
            driver_name = driver.get("full_name") or driver.get("name", "السائق")
    
    return {
        "order_id": order_id,
        "order_number": order.get("order_number"),
        "customer": {
            "id": order.get("customer_id") or order.get("user_id"),
            "name": customer_name
        },
        "driver": {
            "id": order_driver_id,
            "name": driver_name
        } if order_driver_id else None,
        "messages": messages,
        "can_chat": order.get("status") in ["accepted", "preparing", "ready", "out_for_delivery", "ready_for_pickup", "picked_up", "on_the_way", "arriving"],
        "status": order.get("status")
    }


@router.post("/send")
async def send_message(req: SendMessageRequest, user: dict = Depends(get_current_user)) -> dict:
    """إرسال رسالة في محادثة الطلب"""
    
    # التحقق من الطلب
    order = await db.food_orders.find_one({"id": req.order_id}, {"_id": 0})
    if not order:
        order = await db.orders.find_one({"id": req.order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من الصلاحية
    user_id = user["id"]
    
    # دعم كلا الحقلين driver_id و delivery_driver_id
    order_driver_id = order.get("driver_id") or order.get("delivery_driver_id") or order.get("delivery_id")
    order_customer_id = order.get("customer_id") or order.get("user_id")
    
    is_customer = order_customer_id == user_id
    is_driver = order_driver_id == user_id
    
    if not (is_customer or is_driver):
        raise HTTPException(status_code=403, detail="غير مصرح بإرسال رسائل")
    
    # التحقق من حالة الطلب
    allowed_statuses = ["accepted", "preparing", "ready", "out_for_delivery", "ready_for_pickup", "driver_accepted", "picked_up", "on_the_way", "arriving"]
    if order.get("status") not in allowed_statuses and order.get("delivery_status") not in allowed_statuses:
        raise HTTPException(status_code=400, detail="لا يمكن المحادثة في هذا الوقت")
    
    # تحديد المستلم
    if is_customer:
        recipient_id = order_driver_id
        sender_type = "customer"
    else:
        recipient_id = order_customer_id
        sender_type = "driver"
    
    if not recipient_id:
        raise HTTPException(status_code=400, detail="لا يوجد طرف آخر للمحادثة")
    
    # إنشاء الرسالة
    now = datetime.now(timezone.utc)
    message = {
        "id": str(uuid.uuid4()),
        "order_id": req.order_id,
        "sender_id": user_id,
        "sender_type": sender_type,
        "sender_name": user.get("full_name") or user.get("name", "مستخدم"),
        "recipient_id": recipient_id,
        "message": req.message,
        "is_read": False,
        "created_at": now.isoformat()
    }
    
    await db.chat_messages.insert_one(message)
    
    # إرسال إشعار فوري عبر WebSocket
    try:
        await manager.send_to_user(recipient_id, {
            "type": "new_chat_message",
            "order_id": req.order_id,
            "message": {
                "id": message["id"],
                "sender_id": user_id,
                "sender_type": sender_type,
                "sender_name": message["sender_name"],
                "message": req.message,
                "created_at": message["created_at"]
            }
        })
    except Exception as e:
        print(f"WebSocket send error: {e}")
    
    # إرسال إشعار push
    try:
        await create_notification_for_user(
            user_id=recipient_id,
            title="💬 رسالة جديدة",
            message=f"{message['sender_name']}: {req.message[:50]}...",
            notification_type="chat_message",
            order_id=req.order_id
        )
    except Exception as e:
        print(f"Notification error: {e}")
    
    return {
        "message_id": message["id"],
        "sent_at": message["created_at"]
    }


@router.post("/mark-read")
async def mark_messages_read(req: MarkReadRequest, user: dict = Depends(get_current_user)) -> dict:
    """تحديد الرسائل كمقروءة"""
    
    await db.chat_messages.update_many(
        {
            "order_id": req.order_id,
            "recipient_id": user["id"],
            "is_read": False
        },
        {"$set": {"is_read": True, "read_at": get_now()}}
    )
    
    return {"status": "ok"}


@router.get("/unread-count")
async def get_unread_count(user: dict = Depends(get_current_user)) -> dict:
    """عدد الرسائل غير المقروءة"""
    
    count = await db.chat_messages.count_documents({
        "recipient_id": user["id"],
        "is_read": False
    })
    
    return {"unread_count": count}


@router.get("/active-conversations")
async def get_active_conversations(user: dict = Depends(get_current_user)) -> dict:
    """جلب المحادثات النشطة للمستخدم"""
    
    user_id = user["id"]
    user_type = user.get("user_type")
    
    # البحث عن الطلبات النشطة
    if user_type == "delivery":
        # السائق: طلباته الحالية
        orders = await db.food_orders.find(
            {
                "driver_id": user_id,
                "status": {"$in": ["accepted", "preparing", "ready", "out_for_delivery"]}
            },
            {"_id": 0, "id": 1, "order_number": 1, "customer_name": 1, "customer_id": 1, "status": 1}
        ).to_list(20)
        
        # إضافة طلبات المنتجات
        product_orders = await db.orders.find(
            {
                "delivery_driver_id": user_id,
                "delivery_status": {"$in": ["picked_up", "out_for_delivery"]}
            },
            {"_id": 0, "id": 1, "order_number": 1, "customer_name": 1, "customer_id": 1, "status": 1}
        ).to_list(20)
        orders.extend(product_orders)
        
    else:
        # العميل: طلباته النشطة
        orders = await db.food_orders.find(
            {
                "customer_id": user_id,
                "driver_id": {"$ne": None},
                "status": {"$in": ["accepted", "preparing", "ready", "out_for_delivery"]}
            },
            {"_id": 0, "id": 1, "order_number": 1, "driver_id": 1, "status": 1}
        ).to_list(20)
    
    # إضافة عدد الرسائل غير المقروءة لكل محادثة
    if not orders:
        return {"conversations": []}
    
    order_ids = [o["id"] for o in orders]
    
    # جلب عدد الرسائل غير المقروءة لجميع الطلبات دفعة واحدة
    unread_pipeline = [
        {"$match": {
            "order_id": {"$in": order_ids},
            "recipient_id": user_id,
            "is_read": False
        }},
        {"$group": {"_id": "$order_id", "count": {"$sum": 1}}}
    ]
    unread_counts = await db.chat_messages.aggregate(unread_pipeline).to_list(None)
    unread_map = {item["_id"]: item["count"] for item in unread_counts}
    
    # جلب آخر رسالة لكل طلب دفعة واحدة
    last_messages_pipeline = [
        {"$match": {"order_id": {"$in": order_ids}}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$order_id",
            "message": {"$first": "$message"},
            "created_at": {"$first": "$created_at"}
        }}
    ]
    last_messages = await db.chat_messages.aggregate(last_messages_pipeline).to_list(None)
    last_messages_map = {lm["_id"]: lm for lm in last_messages}
    
    result = []
    for order in orders:
        last_message = last_messages_map.get(order["id"])
        
        result.append({
            "order_id": order["id"],
            "order_number": order.get("order_number"),
            "other_party": order.get("customer_name") if user_type == "delivery" else "السائق",
            "unread_count": unread_map.get(order["id"], 0),
            "last_message": last_message.get("message", "")[:50] if last_message else None,
            "last_message_at": last_message.get("created_at") if last_message else None,
            "status": order.get("status")
        })
    
    # ترتيب حسب آخر رسالة
    result.sort(key=lambda x: x.get("last_message_at") or "", reverse=True)
    
    return {"conversations": result}
