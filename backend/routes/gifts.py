# /app/backend/routes/gifts.py
# نظام إرسال المنتجات كهدايا

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel
from typing import Optional

from core.database import db, get_current_user
from helpers.datetime_helpers import get_now

router = APIRouter(prefix="/gifts", tags=["Gifts"])

class GiftRequest(BaseModel):
    product_id: str
    recipient_phone: str
    recipient_name: str
    message: Optional[str] = ""
    is_anonymous: bool = False
    is_surprise: bool = False  # هل الهدية مفاجأة (تخفي تفاصيل المنتج)
    pay_shipping: bool = False  # جديد: المرسل يدفع رسوم الشحن

class GiftResponse(BaseModel):
    gift_id: str
    status: str

# نموذج عنوان الشحن للهدية
class GiftShippingAddress(BaseModel):
    city: str
    area: str
    street: Optional[str] = ""
    building: Optional[str] = ""
    floor: Optional[str] = ""
    phone: str
    notes: Optional[str] = ""

@router.post("/send")
async def send_gift(gift: GiftRequest, user: dict = Depends(get_current_user)) -> dict:
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
        "is_surprise": gift.is_surprise,  # هل الهدية مفاجأة؟
        "shipping_paid_by_sender": gift.pay_shipping,  # جديد: هل المرسل يدفع الشحن
        "status": "pending",  # pending, pending_address, completed, rejected
        "created_at": get_now()
    }
    
    await db.gifts.insert_one(gift_doc)
    
    # إرسال إشعار للمستلم (بدون اسم المنتج - مفاجأة!)
    if recipient:
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": recipient["id"],
            "title": "🎁 لديك هدية جديدة!",
            "message": f"أرسل لك {'صديق' if gift.is_anonymous else user.get('full_name', 'شخص')} هدية مفاجأة!",
            "type": "gift_received",
            "data": {"gift_id": gift_id},
            "read": False,
            "created_at": get_now()
        }
        await db.notifications.insert_one(notification)
    
    return {
        "message": "تم إرسال الهدية بنجاح!",
        "gift_id": gift_id,
        "status": "pending",
        "shipping_paid": gift.pay_shipping
    }

@router.get("/sent")
async def get_sent_gifts(user: dict = Depends(get_current_user)) -> dict:
    """الهدايا المُرسلة"""
    gifts = await db.gifts.find(
        {"sender_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return gifts

@router.get("/received")
async def get_received_gifts(user: dict = Depends(get_current_user)) -> dict:
    """الهدايا المُستلمة - مع إخفاء تفاصيل المنتج حتى التسليم الفعلي"""
    gifts = await db.gifts.find(
        {"$or": [
            {"recipient_id": user["id"]},
            {"recipient_phone": user["phone"]}
        ]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    result = []
    for gift in gifts:
        # التحقق من حالة الطلب إذا كان موجوداً
        order_delivered = False
        if gift.get("order_id"):
            order = await db.orders.find_one({"id": gift["order_id"]}, {"_id": 0, "status": 1})
            if order and order.get("status") == "delivered":
                order_delivered = True
        
        # إخفاء تفاصيل المنتج حتى التسليم الفعلي (مفاجأة كاملة!)
        if gift["status"] in ["pending", "pending_address", "completed"] and not order_delivered:
            gift_copy = {
                "id": gift["id"],
                "sender_name": gift["sender_name"],
                "recipient_name": gift["recipient_name"],
                "message": gift.get("message"),
                "is_anonymous": gift.get("is_anonymous", False),
                "status": gift["status"],
                "created_at": gift["created_at"],
                "accepted_at": gift.get("accepted_at"),
                "completed_at": gift.get("completed_at"),
                "order_id": gift.get("order_id"),
                "shipping_paid_by_sender": gift.get("shipping_paid_by_sender", False),
                # إخفاء تفاصيل المنتج - مفاجأة!
                "product_name": "🎁 مفاجأة!",
                "product_image": None,
                "product_price": None,
                "is_surprise": True,
                "requires_address": gift["status"] == "pending_address"
            }
            result.append(gift_copy)
        else:
            # بعد التسليم أو الرفض - يظهر كل شيء
            gift["is_surprise"] = False
            gift["requires_address"] = False
            result.append(gift)
    
    return result

@router.post("/{gift_id}/accept")
async def accept_gift(gift_id: str, user: dict = Depends(get_current_user)) -> dict:
    """قبول الهدية - المرحلة الأولى (تحويل لـ pending_address)"""
    gift = await db.gifts.find_one({"id": gift_id}, {"_id": 0})
    if not gift:
        raise HTTPException(status_code=404, detail="الهدية غير موجودة")
    
    # التحقق من أن المستخدم هو المستلم
    if gift.get("recipient_id") != user["id"] and gift.get("recipient_phone") != user["phone"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if gift["status"] != "pending":
        raise HTTPException(status_code=400, detail="تم معالجة هذه الهدية مسبقاً")
    
    # تحديث حالة الهدية إلى "بانتظار العنوان"
    await db.gifts.update_one(
        {"id": gift_id},
        {"$set": {
            "status": "pending_address",
            "recipient_id": user["id"],
            "accepted_at": get_now()
        }}
    )
    
    return {
        "message": "تم قبول الهدية! يرجى إدخال عنوان الشحن",
        "status": "pending_address",
        "gift_id": gift_id,
        "requires_address": True
    }


@router.post("/{gift_id}/submit-address")
async def submit_gift_address(gift_id: str, address: GiftShippingAddress, user: dict = Depends(get_current_user)) -> dict:
    """إكمال استلام الهدية مع عنوان الشحن"""
    gift = await db.gifts.find_one({"id": gift_id}, {"_id": 0})
    if not gift:
        raise HTTPException(status_code=404, detail="الهدية غير موجودة")
    
    # التحقق من أن المستخدم هو المستلم
    if gift.get("recipient_id") != user["id"] and gift.get("recipient_phone") != user["phone"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if gift["status"] not in ["pending", "pending_address"]:
        raise HTTPException(status_code=400, detail="لا يمكن إضافة عنوان لهذه الهدية")
    
    # التحقق من المنتج
    product = await db.products.find_one({"id": gift["product_id"]}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    # حساب رسوم الشحن
    shipping_paid_by_sender = gift.get("shipping_paid_by_sender", False)
    
    # جلب إعدادات الشحن
    settings = await db.platform_settings.find_one({}, {"_id": 0})
    base_shipping_fee = 5000  # رسوم شحن افتراضية
    if settings:
        base_shipping_fee = settings.get("delivery_fees", {}).get("same_city", 5000)
    
    # إذا المرسل دفع الشحن، يكون 0 على المستلم
    shipping_fee = 0 if shipping_paid_by_sender else base_shipping_fee
    
    # إنشاء الطلب
    order_id = str(uuid.uuid4())[:8].upper()
    
    shipping_address = {
        "city": address.city,
        "area": address.area,
        "street": address.street,
        "building": address.building,
        "floor": address.floor,
        "phone": address.phone,
        "notes": address.notes,
        "full_address": f"{address.city}، {address.area}" + (f"، {address.street}" if address.street else "")
    }
    
    order = {
        "id": order_id,
        "user_id": user["id"],  # المستلم هو صاحب الطلب
        "user_name": gift["recipient_name"],
        "user_phone": address.phone,
        "items": [{
            "product_id": product["id"],
            "product_name": product["name"],
            "product_image": product.get("images", [None])[0],
            "price": product["price"],
            "quantity": 1,
            "seller_id": product.get("seller_id")
        }],
        "subtotal": product["price"],
        "shipping_fee": shipping_fee,
        "shipping_paid_by_sender": shipping_paid_by_sender,
        "total": product["price"] + shipping_fee,
        "shipping_address": shipping_address,
        "status": "paid",  # تعتبر مدفوعة (المرسل دفع)
        "payment_status": "paid",
        "payment_method": "gift",
        "is_gift": True,
        "is_surprise": gift.get("is_surprise", False),  # هل الهدية مفاجأة؟
        "gift_id": gift_id,
        "gift_sender_id": gift["sender_id"],
        "gift_sender_name": gift.get("sender_name", "صديق"),  # اسم المرسل
        "gift_message": gift.get("message", ""),
        "created_at": get_now(),
        "updated_at": get_now()
    }
    
    await db.orders.insert_one(order)
    
    # تحديث حالة الهدية
    await db.gifts.update_one(
        {"id": gift_id},
        {"$set": {
            "status": "completed",
            "shipping_address": shipping_address,
            "order_id": order_id,
            "completed_at": get_now()
        }}
    )
    
    # إرسال إشعار للمرسل
    sender_notification = {
        "id": str(uuid.uuid4()),
        "user_id": gift["sender_id"],
        "title": "🎉 تم استلام هديتك!",
        "message": f"قبل {gift['recipient_name']} هديتك ({gift['product_name']}) وأدخل عنوان الشحن. رقم الطلب: {order_id}",
        "type": "gift_completed",
        "data": {"gift_id": gift_id, "order_id": order_id},
        "read": False,
        "created_at": get_now()
    }
    await db.notifications.insert_one(sender_notification)
    
    # إرسال إشعار للمستلم
    recipient_notification = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": "📦 تم إنشاء طلب هديتك!",
        "message": f"رقم الطلب: {order_id}. سيتم شحن الهدية إلى عنوانك قريباً.",
        "type": "gift_order_created",
        "data": {"gift_id": gift_id, "order_id": order_id},
        "read": False,
        "created_at": get_now()
    }
    await db.notifications.insert_one(recipient_notification)
    
    return {
        "message": "تم إكمال استلام الهدية بنجاح!",
        "status": "completed",
        "order_id": order_id,
        "product_name": gift["product_name"]
    }


@router.get("/{gift_id}/details")
async def get_gift_details(gift_id: str, user: dict = Depends(get_current_user)) -> dict:
    """جلب تفاصيل هدية محددة"""
    gift = await db.gifts.find_one({"id": gift_id}, {"_id": 0})
    if not gift:
        raise HTTPException(status_code=404, detail="الهدية غير موجودة")
    
    # التحقق من أن المستخدم هو المستلم أو المرسل
    is_recipient = gift.get("recipient_id") == user["id"] or gift.get("recipient_phone") == user["phone"]
    is_sender = gift.get("sender_id") == user["id"]
    
    if not is_recipient and not is_sender:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # إذا كان المستلم والهدية pending، أخفِ تفاصيل المنتج
    if is_recipient and gift["status"] == "pending":
        gift = {
            "id": gift["id"],
            "sender_name": gift["sender_name"],
            "recipient_name": gift["recipient_name"],
            "message": gift.get("message"),
            "is_anonymous": gift.get("is_anonymous", False),
            "status": gift["status"],
            "created_at": gift["created_at"],
            "product_name": "🎁 مفاجأة!",
            "product_image": None,
            "product_price": None,
            "is_surprise": True
        }
    else:
        gift["is_surprise"] = False
    
    return gift

@router.post("/{gift_id}/reject")
async def reject_gift(gift_id: str, user: dict = Depends(get_current_user)) -> dict:
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
            "rejected_at": get_now()
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
        "created_at": get_now()
    }
    await db.notifications.insert_one(sender_notification)
    
    return {"message": "تم رفض الهدية", "status": "rejected"}
