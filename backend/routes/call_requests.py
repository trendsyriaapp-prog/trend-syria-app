# /app/backend/routes/call_requests.py
# نظام طلبات الاتصال - عندما لا يرد العميل

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user
from helpers.datetime_helpers import get_now

router = APIRouter(prefix="/call-requests", tags=["Call Requests"])

class CallRequestCreate(BaseModel):
    order_id: str
    order_type: str = "food"  # food أو shopping
    reason: Optional[str] = "العميل لا يرد"

class CallRequestUpdate(BaseModel):
    status: str  # pending, in_progress, completed, cancelled
    notes: Optional[str] = None

@router.post("")
async def create_call_request(data: CallRequestCreate, user: dict = Depends(get_current_user)) -> dict:
    """إنشاء طلب اتصال جديد - للسائق عندما لا يرد العميل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # جلب معلومات الطلب
    if data.order_type == "food":
        order = await db.food_orders.find_one({"id": data.order_id}, {"_id": 0})
    else:
        order = await db.orders.find_one({"id": data.order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من أن السائق معين لهذا الطلب (دعم كلا الحقلين driver_id و delivery_driver_id)
    order_driver_id = order.get("driver_id") or order.get("delivery_driver_id") or order.get("delivery_id")
    if order_driver_id != user["id"]:
        raise HTTPException(status_code=403, detail="غير مصرح - لست السائق المعين لهذا الطلب")
    
    # جلب معلومات العميل
    customer_id = order.get("customer_id") or order.get("user_id")
    customer = await db.users.find_one({"id": customer_id}, {"_id": 0, "id": 1, "name": 1, "phone": 1, "full_name": 1})
    
    # التحقق من عدم وجود طلب مفتوح لنفس الطلب
    existing = await db.call_requests.find_one({
        "order_id": data.order_id,
        "status": {"$in": ["pending", "in_progress"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="يوجد طلب اتصال مفتوح لهذا الطلب")
    
    call_request = {
        "id": str(uuid.uuid4()),
        "order_id": data.order_id,
        "order_number": order.get("order_number", ""),
        "order_type": data.order_type,
        "driver_id": user["id"],
        "driver_name": user.get("full_name") or user.get("name", ""),
        "driver_phone": user.get("phone", ""),
        "customer_id": customer_id,
        "customer_name": customer.get("full_name") or customer.get("name", "") if customer else "",
        "customer_phone": customer.get("phone", "") if customer else "",
        "delivery_address": order.get("delivery_address") or order.get("address", ""),
        "reason": data.reason,
        "status": "pending",
        "attempts": 0,
        "notes": None,
        "handled_by": None,
        "created_at": get_now(),
        "updated_at": get_now()
    }
    
    await db.call_requests.insert_one(call_request)
    
    # إرسال إشعار للموظفين (الأدمن والمدراء الفرعيين)
    admins = await db.users.find(
        {"user_type": {"$in": ["admin", "sub_admin"]}},
        {"_id": 0, "id": 1}
    ).to_list(None)
    
    for admin in admins:
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": admin["id"],
            "title": "📞 طلب اتصال جديد!",
            "message": f"السائق {call_request['driver_name']} يحتاج مساعدة - العميل لا يرد. الطلب #{call_request['order_number']}",
            "type": "call_request",
            "data": {"call_request_id": call_request["id"], "order_id": data.order_id},
            "is_read": False,
            "play_sound": True,
            "created_at": get_now()
        }
        await db.notifications.insert_one(notification)
    
    return {
        "message": "تم إرسال طلب الاتصال للموظفين",
        "call_request_id": call_request["id"]
    }

@router.get("")
async def get_call_requests(
    status: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user)
) -> dict:
    """جلب طلبات الاتصال - للموظفين"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للموظفين فقط")
    
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.call_requests.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(None)
    
    return requests

@router.get("/pending")
async def get_pending_call_requests(user: dict = Depends(get_current_user)) -> dict:
    """جلب طلبات الاتصال المعلقة - للموظفين"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للموظفين فقط")
    
    requests = await db.call_requests.find(
        {"status": {"$in": ["pending", "in_progress"]}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(None)
    
    return {"count": len(requests), "requests": requests}

@router.get("/my-requests")
async def get_my_call_requests(user: dict = Depends(get_current_user)) -> dict:
    """جلب طلبات الاتصال الخاصة بالسائق"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    requests = await db.call_requests.find(
        {"driver_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(None)
    
    return requests

@router.put("/{request_id}")
async def update_call_request(
    request_id: str,
    data: CallRequestUpdate,
    user: dict = Depends(get_current_user)
) -> dict:
    """تحديث حالة طلب الاتصال - للموظفين"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للموظفين فقط")
    
    request = await db.call_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="طلب الاتصال غير موجود")
    
    update_data = {
        "status": data.status,
        "updated_at": get_now()
    }
    
    if data.notes:
        update_data["notes"] = data.notes
    
    if data.status == "in_progress":
        update_data["handled_by"] = user["id"]
        update_data["handled_by_name"] = user.get("full_name") or user.get("name", "")
    
    if data.status == "completed":
        update_data["completed_at"] = get_now()
    
    await db.call_requests.update_one(
        {"id": request_id},
        {"$set": update_data, "$inc": {"attempts": 1}}
    )
    
    # إشعار السائق بالتحديث
    if data.status == "completed":
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": request["driver_id"],
            "title": "✅ تم التواصل مع العميل",
            "message": f"الموظف تواصل مع العميل بخصوص الطلب #{request['order_number']}. {data.notes or ''}",
            "type": "call_request_completed",
            "data": {"call_request_id": request_id, "order_id": request["order_id"]},
            "is_read": False,
            "created_at": get_now()
        }
        await db.notifications.insert_one(notification)
    
    return {"message": "تم تحديث طلب الاتصال"}

@router.post("/{request_id}/take")
async def take_call_request(request_id: str, user: dict = Depends(get_current_user)) -> dict:
    """استلام طلب اتصال - للموظف"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للموظفين فقط")
    
    request = await db.call_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="طلب الاتصال غير موجود")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="هذا الطلب تم استلامه بالفعل")
    
    await db.call_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "in_progress",
                "handled_by": user["id"],
                "handled_by_name": user.get("full_name") or user.get("name", ""),
                "updated_at": get_now()
            }
        }
    )
    
    # إشعار السائق
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": request["driver_id"],
        "title": "📞 جاري التواصل مع العميل",
        "message": f"الموظف {user.get('full_name') or user.get('name', '')} يتواصل مع العميل الآن",
        "type": "call_request_in_progress",
        "data": {"call_request_id": request_id},
        "is_read": False,
        "created_at": get_now()
    }
    await db.notifications.insert_one(notification)
    
    return {
        "message": "تم استلام الطلب",
        "customer_phone": request["customer_phone"],
        "driver_phone": request["driver_phone"]
    }
