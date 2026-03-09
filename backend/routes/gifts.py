# /app/backend/routes/gifts.py
# نظام إرسال المنتجات كهدايا

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel
from typing import Optional

from core.database import db, get_current_user

router = APIRouter(prefix="/gifts", tags=["Gifts"])

class GiftRequest(BaseModel):
    product_id: str
    recipient_phone: str
    recipient_name: str
    message: Optional[str] = ""
    is_anonymous: bool = False

class GiftResponse(BaseModel):
    gift_id: str
    status: str

@router.post("/send")
async def send_gift(gift: GiftRequest, user: dict = Depends(get_current_user)):
    """إرسال منتج كهدية"""
    
    # التحقق من المنتج
    product = await db.products.find_one({"id": gift.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    # التحقق من المستلم
    recipient = await db.users.find_one({"phone": gift.recipient_phone}, {"_id": 0})
    
    gift_id = str(uuid.uuid4())
    gift_doc = {
        "id": gift_id,
        "sender_id": user["id"],
        "sender_name": user.get("full_name", "مجهول") if not gift.is_anonymous else "صديق",
        "recipient_phone": gift.recipient_phone,
        "recipient_name": gift.recipient_name,
        "recipient_id": recipient["id"] if recipient else None,
        "product_id": gift.product_id,
        "product_name": product["name"],
        "product_image": product.get("images", [None])[0],
        "product_price": product["price"],
        "message": gift.message,
        "is_anonymous": gift.is_anonymous,
        "status": "pending",  # pending, accepted, rejected, completed
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.gifts.insert_one(gift_doc)
    
    # إرسال إشعار للمستلم
    if recipient:
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": recipient["id"],
            "title": "🎁 لديك هدية جديدة!",
            "message": f"أرسل لك {'صديق' if gift.is_anonymous else user.get('full_name', 'شخص')} هدية: {product['name']}",
            "type": "gift_received",
            "data": {"gift_id": gift_id},
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {
        "message": "تم إرسال الهدية بنجاح!",
        "gift_id": gift_id,
        "status": "pending"
    }

@router.get("/sent")
async def get_sent_gifts(user: dict = Depends(get_current_user)):
    """الهدايا المُرسلة"""
    gifts = await db.gifts.find(
        {"sender_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return gifts

@router.get("/received")
async def get_received_gifts(user: dict = Depends(get_current_user)):
    """الهدايا المُستلمة"""
    gifts = await db.gifts.find(
        {"$or": [
            {"recipient_id": user["id"]},
            {"recipient_phone": user["phone"]}
        ]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return gifts

@router.post("/{gift_id}/accept")
async def accept_gift(gift_id: str, user: dict = Depends(get_current_user)):
    """قبول الهدية"""
    gift = await db.gifts.find_one({"id": gift_id}, {"_id": 0})
    if not gift:
        raise HTTPException(status_code=404, detail="الهدية غير موجودة")
    
    # التحقق من أن المستخدم هو المستلم
    if gift.get("recipient_id") != user["id"] and gift.get("recipient_phone") != user["phone"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if gift["status"] != "pending":
        raise HTTPException(status_code=400, detail="تم معالجة هذه الهدية مسبقاً")
    
    # تحديث حالة الهدية
    await db.gifts.update_one(
        {"id": gift_id},
        {"$set": {
            "status": "accepted",
            "recipient_id": user["id"],
            "accepted_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # إرسال إشعار للمرسل
    sender_notification = {
        "id": str(uuid.uuid4()),
        "user_id": gift["sender_id"],
        "title": "✅ تم قبول هديتك!",
        "message": f"قبل {gift['recipient_name']} هديتك: {gift['product_name']}",
        "type": "gift_accepted",
        "data": {"gift_id": gift_id},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(sender_notification)
    
    return {"message": "تم قبول الهدية بنجاح!", "status": "accepted"}

@router.post("/{gift_id}/reject")
async def reject_gift(gift_id: str, user: dict = Depends(get_current_user)):
    """رفض الهدية"""
    gift = await db.gifts.find_one({"id": gift_id}, {"_id": 0})
    if not gift:
        raise HTTPException(status_code=404, detail="الهدية غير موجودة")
    
    if gift.get("recipient_id") != user["id"] and gift.get("recipient_phone") != user["phone"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if gift["status"] != "pending":
        raise HTTPException(status_code=400, detail="تم معالجة هذه الهدية مسبقاً")
    
    await db.gifts.update_one(
        {"id": gift_id},
        {"$set": {
            "status": "rejected",
            "rejected_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # إرسال إشعار للمرسل
    sender_notification = {
        "id": str(uuid.uuid4()),
        "user_id": gift["sender_id"],
        "title": "❌ تم رفض هديتك",
        "message": f"عذراً، رفض {gift['recipient_name']} هديتك: {gift['product_name']}",
        "type": "gift_rejected",
        "data": {"gift_id": gift_id},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(sender_notification)
    
    return {"message": "تم رفض الهدية", "status": "rejected"}
