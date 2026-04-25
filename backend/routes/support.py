# /app/backend/routes/support.py
# نظام تذاكر الدعم الفني

from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel
import uuid

from core.database import db, get_current_user, create_notification_for_user
from helpers.datetime_helpers import get_now

router = APIRouter(prefix="/support", tags=["Support Tickets"])


class CreateTicketRequest(BaseModel):
    subject: str
    message: str
    category: str = "general"  # general, order, payment, delivery, account, other
    order_id: Optional[str] = None
    priority: str = "normal"  # low, normal, high, urgent


class TicketReplyRequest(BaseModel):
    message: str


class UpdateTicketStatusRequest(BaseModel):
    status: str  # open, in_progress, resolved, closed


# ============== APIs للمستخدمين ==============

@router.post("/tickets")
async def create_ticket(req: CreateTicketRequest, user: dict = Depends(get_current_user)) -> dict:
    """إنشاء تذكرة دعم جديدة"""
    
    now = datetime.now(timezone.utc)
    ticket_number = f"TKT{now.strftime('%y%m%d')}{str(uuid.uuid4())[:4].upper()}"
    
    ticket = {
        "id": str(uuid.uuid4()),
        "ticket_number": ticket_number,
        "user_id": user["id"],
        "user_name": user.get("full_name") or user.get("name", "مستخدم"),
        "user_phone": user.get("phone"),
        "user_type": user.get("user_type"),
        "subject": req.subject,
        "category": req.category,
        "order_id": req.order_id,
        "priority": req.priority,
        "status": "open",
        "messages": [{
            "id": str(uuid.uuid4()),
            "sender_id": user["id"],
            "sender_type": "user",
            "sender_name": user.get("full_name") or user.get("name", "مستخدم"),
            "message": req.message,
            "created_at": now.isoformat()
        }],
        "assigned_to": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "resolved_at": None
    }
    
    await db.support_tickets.insert_one(ticket)
    
    # إشعار للمدراء
    admins = await db.users.find(
        {"user_type": {"$in": ["admin", "sub_admin"]}},
        {"_id": 0, "id": 1}
    ).to_list(100)
    
    for admin in admins:
        try:
            await create_notification_for_user(
                user_id=admin["id"],
                title="🎫 تذكرة دعم جديدة",
                message=f"#{ticket_number}: {req.subject[:50]}",
                notification_type="support_ticket"
            )
        except Exception:
            pass
    
    return {
        "ticket_id": ticket["id"],
        "ticket_number": ticket_number,
        "message": "تم إنشاء تذكرة الدعم بنجاح"
    }


@router.get("/tickets/my")
async def get_my_tickets(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
) -> dict:
    """جلب تذاكر المستخدم"""
    
    query = {"user_id": user["id"]}
    if status:
        query["status"] = status
    
    tickets = await db.support_tickets.find(
        query,
        {"_id": 0}
    ).sort("updated_at", -1).to_list(50)
    
    return {"tickets": tickets}


@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, user: dict = Depends(get_current_user)) -> dict:
    """جلب تفاصيل تذكرة"""
    
    ticket = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")
    
    # التحقق من الصلاحية
    is_owner = ticket["user_id"] == user["id"]
    is_admin = user.get("user_type") in ["admin", "sub_admin"]
    
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    return ticket


@router.post("/tickets/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: str,
    req: TicketReplyRequest,
    user: dict = Depends(get_current_user)
) -> dict:
    """الرد على تذكرة"""
    
    ticket = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")
    
    # التحقق من الصلاحية
    is_owner = ticket["user_id"] == user["id"]
    is_admin = user.get("user_type") in ["admin", "sub_admin"]
    
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    if ticket["status"] == "closed":
        raise HTTPException(status_code=400, detail="التذكرة مغلقة")
    
    now = datetime.now(timezone.utc)
    
    message = {
        "id": str(uuid.uuid4()),
        "sender_id": user["id"],
        "sender_type": "admin" if is_admin else "user",
        "sender_name": user.get("full_name") or user.get("name", "مستخدم"),
        "message": req.message,
        "created_at": now.isoformat()
    }
    
    # تحديث الحالة
    new_status = "in_progress" if is_admin and ticket["status"] == "open" else ticket["status"]
    
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"messages": message},
            "$set": {
                "status": new_status,
                "updated_at": now.isoformat()
            }
        }
    )
    
    # إرسال إشعار
    recipient_id = ticket["user_id"] if is_admin else None
    if is_admin:
        await create_notification_for_user(
            user_id=recipient_id,
            title="💬 رد على تذكرتك",
            message=f"#{ticket['ticket_number']}: {req.message[:50]}...",
            notification_type="support_reply"
        )
    
    return {"message": "تم إرسال الرد بنجاح"}


# ============== APIs للمدراء ==============

@router.get("/admin/tickets")
async def get_all_tickets(
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user)
) -> dict:
    """جلب جميع التذاكر (للمدراء)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    
    skip = (page - 1) * limit
    
    tickets = await db.support_tickets.find(
        query,
        {"_id": 0}
    ).sort("updated_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.support_tickets.count_documents(query)
    
    return {
        "tickets": tickets,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/admin/stats")
async def get_support_stats(user: dict = Depends(get_current_user)) -> dict:
    """إحصائيات الدعم (للمدراء)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    total = await db.support_tickets.count_documents({})
    open_count = await db.support_tickets.count_documents({"status": "open"})
    in_progress = await db.support_tickets.count_documents({"status": "in_progress"})
    resolved = await db.support_tickets.count_documents({"status": "resolved"})
    closed = await db.support_tickets.count_documents({"status": "closed"})
    
    # التذاكر العاجلة
    urgent = await db.support_tickets.count_documents({
        "priority": "urgent",
        "status": {"$ne": "closed"}
    })
    
    # بحسب الفئة
    categories_pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    categories = await db.support_tickets.aggregate(categories_pipeline).to_list(10)
    
    return {
        "total": total,
        "by_status": {
            "open": open_count,
            "in_progress": in_progress,
            "resolved": resolved,
            "closed": closed
        },
        "urgent": urgent,
        "by_category": {c["_id"]: c["count"] for c in categories}
    }


@router.put("/admin/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    req: UpdateTicketStatusRequest,
    user: dict = Depends(get_current_user)
) -> dict:
    """تحديث حالة التذكرة (للمدراء)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    ticket = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")
    
    now = datetime.now(timezone.utc)
    update_data = {
        "status": req.status,
        "updated_at": now.isoformat()
    }
    
    if req.status == "resolved":
        update_data["resolved_at"] = now.isoformat()
    
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$set": update_data}
    )
    
    # إشعار للمستخدم
    status_names = {
        "in_progress": "قيد المعالجة",
        "resolved": "تم الحل",
        "closed": "مغلقة"
    }
    
    await create_notification_for_user(
        user_id=ticket["user_id"],
        title="🎫 تحديث حالة التذكرة",
        message=f"#{ticket['ticket_number']} أصبحت {status_names.get(req.status, req.status)}",
        notification_type="support_update"
    )
    
    return {"message": "تم تحديث حالة التذكرة"}


@router.put("/admin/tickets/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    admin_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
) -> dict:
    """تعيين التذكرة لمدير (للمدراء)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    assigned_id = admin_id or user["id"]
    
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {
            "$set": {
                "assigned_to": assigned_id,
                "updated_at": get_now()
            }
        }
    )
    
    return {"message": "تم تعيين التذكرة"}


@router.delete("/admin/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, user: dict = Depends(get_current_user)) -> dict:
    """حذف تذكرة دعم (للمدراء)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")
    
    await db.support_tickets.delete_one({"id": ticket_id})
    
    return {"message": "تم حذف التذكرة بنجاح"}


# ============== طلبات المساعدة الطارئة للسائقين ==============

class EmergencyHelpRequest(BaseModel):
    order_id: str
    reason: str  # customer_not_responding, wrong_address, customer_refused, other
    message: Optional[str] = None


@router.post("/emergency-help")
async def request_emergency_help(
    req: EmergencyHelpRequest,
    user: dict = Depends(get_current_user)
) -> dict:
    """طلب مساعدة طارئة من السائق - الدعم سيتواصل مع العميل"""
    
    if user.get("user_type") != "delivery":
        raise HTTPException(status_code=403, detail="للسائقين فقط")
    
    # جلب بيانات الطلب
    order = await db.orders.find_one({"id": req.order_id}, {"_id": 0})
    if not order:
        order = await db.food_orders.find_one({"id": req.order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق أن السائق مسؤول عن هذا الطلب
    if order.get("delivery_id") != user["id"] and order.get("driver_id") != user["id"]:
        raise HTTPException(status_code=403, detail="أنت لست مسؤولاً عن هذا الطلب")
    
    now = datetime.now(timezone.utc)
    
    # أسباب الطلب بالعربية
    reason_names = {
        "customer_not_responding": "العميل لا يرد على الرسائل",
        "wrong_address": "العنوان غير صحيح أو غير واضح",
        "customer_refused": "العميل رفض استلام الطلب",
        "payment_issue": "مشكلة في الدفع",
        "other": "سبب آخر"
    }
    
    reason_text = reason_names.get(req.reason, req.reason)
    
    # إنشاء طلب مساعدة طارئة
    help_request = {
        "id": str(uuid.uuid4()),
        "type": "emergency_help",
        "driver_id": user["id"],
        "driver_name": user.get("full_name") or user.get("name", "سائق"),
        "driver_phone": user.get("phone"),
        "order_id": req.order_id,
        "order_number": order.get("order_number", req.order_id[:8]),
        "customer_name": order.get("customer_name") or order.get("user_name", "عميل"),
        "customer_phone": order.get("phone") or order.get("customer_phone"),
        "customer_address": order.get("address") or (
            order.get("delivery_address", {}).get("address", "") 
            if isinstance(order.get("delivery_address"), dict) 
            else str(order.get("delivery_address", ""))
        ),
        "reason": req.reason,
        "reason_text": reason_text,
        "message": req.message,
        "status": "pending",  # pending, in_progress, resolved
        "created_at": now.isoformat(),
        "resolved_at": None,
        "resolved_by": None,
        "resolution_notes": None
    }
    
    await db.emergency_help_requests.insert_one(help_request)
    
    # إرسال إشعار للمدراء
    admins = await db.users.find(
        {"user_type": {"$in": ["admin", "sub_admin"]}},
        {"_id": 0, "id": 1}
    ).to_list(100)
    
    for admin in admins:
        try:
            await create_notification_for_user(
                user_id=admin["id"],
                title="🚨 طلب مساعدة طارئ!",
                message=f"السائق {help_request['driver_name']} يحتاج مساعدة - {reason_text}",
                notification_type="emergency_help"
            )
        except Exception:
            pass
    
    # إشعار للعميل (اختياري - لإعلامه أن الدعم سيتواصل معه)
    customer = await db.users.find_one(
        {"phone": help_request["customer_phone"]},
        {"_id": 0, "id": 1}
    )
    if customer:
        try:
            await create_notification_for_user(
                user_id=customer["id"],
                title="📞 فريق الدعم سيتواصل معك",
                message=f"بخصوص طلبك #{help_request['order_number']} - يرجى التحقق من هاتفك",
                notification_type="support_contact"
            )
        except Exception:
            pass
    
    return {
        "success": True,
        "help_request_id": help_request["id"],
        "message": "تم إرسال طلب المساعدة - فريق الدعم سيتواصل مع العميل"
    }


@router.get("/emergency-help/my-requests")
async def get_my_emergency_requests(user: dict = Depends(get_current_user)) -> dict:
    """جلب طلبات المساعدة الطارئة للسائق"""
    
    if user.get("user_type") != "delivery":
        raise HTTPException(status_code=403, detail="للسائقين فقط")
    
    requests = await db.emergency_help_requests.find(
        {"driver_id": user["id"]},
        {"_id": 0, "customer_phone": 0}  # إخفاء رقم العميل
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {"requests": requests}


@router.get("/admin/emergency-help")
async def get_all_emergency_requests(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
) -> dict:
    """جلب جميع طلبات المساعدة الطارئة (للمدراء)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.emergency_help_requests.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # إحصائيات
    pending_count = await db.emergency_help_requests.count_documents({"status": "pending"})
    
    return {
        "requests": requests,
        "pending_count": pending_count
    }


@router.put("/admin/emergency-help/{request_id}/resolve")
async def resolve_emergency_request(
    request_id: str,
    notes: Optional[str] = None,
    user: dict = Depends(get_current_user)
) -> dict:
    """حل طلب مساعدة طارئ (للمدراء)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    help_req = await db.emergency_help_requests.find_one({"id": request_id}, {"_id": 0})
    
    if not help_req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    now = datetime.now(timezone.utc)
    
    await db.emergency_help_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "resolved",
                "resolved_at": now.isoformat(),
                "resolved_by": user["id"],
                "resolution_notes": notes
            }
        }
    )
    
    # إشعار للسائق
    await create_notification_for_user(
        user_id=help_req["driver_id"],
        title="✅ تم حل المشكلة",
        message=f"طلب المساعدة للطلب #{help_req['order_number']} تم حله",
        notification_type="emergency_resolved"
    )
    
    return {"message": "تم حل طلب المساعدة"}
