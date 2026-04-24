# /app/backend/routes/driver_security.py
# نظام تأمين موظفي التوصيل

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid

from core.database import db, get_current_user, create_notification_for_user

router = APIRouter(prefix="/driver/security", tags=["Driver Security Deposit"])


# ============== Models ==============

class DepositRequest(BaseModel):
    amount: int
    payment_method: str  # shamcash, bank, hawala, cash
    payment_reference: Optional[str] = None  # رقم الحوالة أو المرجع
    notes: Optional[str] = None


class ResignationRequest(BaseModel):
    reason: Optional[str] = None
    shamcash_phone: Optional[str] = None  # لاسترداد التأمين


# ============== Helper Functions ==============

async def get_security_settings() -> dict:
    """جلب إعدادات التأمين"""
    settings = await db.settings.find_one({"type": "driver_security"}, {"_id": 0})
    if not settings:
        # إعدادات افتراضية (بالعملة السورية الجديدة - بدون صفرين)
        settings = {
            "type": "driver_security",
            "required_amount": 500,  # 500 ل.س جديدة (المبلغ الموحد لجميع السائقين)
            "is_enabled": True,  # تفعيل النظام
            "auto_deduct_from_earnings": True,  # خصم تلقائي من الأرباح لتعويض التأمين
            "min_behavior_points_for_refund": 50,  # الحد الأدنى لنقاط السلوك للاسترداد
        }
        await db.settings.insert_one(settings)
    return settings


async def get_driver_security_deposit(driver_id: str) -> dict:
    """جلب بيانات تأمين السائق"""
    deposit = await db.driver_security_deposits.find_one(
        {"driver_id": driver_id}, 
        {"_id": 0}
    )
    if not deposit:
        deposit = {
            "id": str(uuid.uuid4()),
            "driver_id": driver_id,
            "current_amount": 0,
            "required_amount": 0,
            "status": "pending",  # pending, partial, complete, refunded
            "transactions": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.driver_security_deposits.insert_one(deposit)
        deposit.pop("_id", None)
    return deposit


async def process_auto_deduction(driver_id: str) -> dict:
    """معالجة الخصم التلقائي من الأرباح لإكمال التأمين"""
    settings = await get_security_settings()
    
    if not settings.get("auto_deduct_from_earnings", True):
        return None
    
    deposit = await get_driver_security_deposit(driver_id)
    required = settings.get("required_amount", 100000)
    current = deposit.get("current_amount", 0)
    
    if current >= required:
        return None  # التأمين مكتمل
    
    # جلب رصيد الأرباح المتاح
    wallet = await db.wallets.find_one({"user_id": driver_id}, {"_id": 0})
    if not wallet or wallet.get("balance", 0) <= 0:
        return None
    
    # حساب المبلغ المطلوب لإكمال التأمين
    needed = required - current
    available = wallet.get("balance", 0)
    deduct_amount = min(needed, available)
    
    if deduct_amount <= 0:
        return None
    
    now = datetime.now(timezone.utc).isoformat()
    
    # خصم من المحفظة
    await db.wallets.update_one(
        {"user_id": driver_id},
        {
            "$inc": {"balance": -deduct_amount},
            "$push": {
                "transactions": {
                    "id": str(uuid.uuid4()),
                    "type": "security_deposit_auto",
                    "amount": -deduct_amount,
                    "description": "خصم تلقائي لإكمال التأمين",
                    "created_at": now
                }
            }
        }
    )
    
    # إضافة للتأمين
    new_amount = current + deduct_amount
    new_status = "complete" if new_amount >= required else "partial"
    
    await db.driver_security_deposits.update_one(
        {"driver_id": driver_id},
        {
            "$set": {
                "current_amount": new_amount,
                "required_amount": required,
                "status": new_status,
                "updated_at": now
            },
            "$push": {
                "transactions": {
                    "id": str(uuid.uuid4()),
                    "type": "auto_deduction",
                    "amount": deduct_amount,
                    "description": "خصم تلقائي من الأرباح",
                    "created_at": now
                }
            }
        }
    )
    
    # إشعار السائق
    await create_notification_for_user(
        user_id=driver_id,
        title="💰 خصم تلقائي للتأمين",
        message=f"تم خصم {deduct_amount:,} ل.س من أرباحك لإكمال التأمين. الرصيد الحالي: {new_amount:,} ل.س",
        notification_type="security_deposit"
    )
    
    return {
        "deducted": deduct_amount,
        "new_deposit_amount": new_amount,
        "status": new_status
    }


# ============== Endpoints ==============

def _get_status_message(current: int, required: int, status: str) -> str:
    """رسالة حالة التأمين"""
    if current >= required:
        return "✅ التأمين مكتمل - يمكنك استقبال الطلبات"
    elif current > 0:
        remaining = required - current
        return f"⚠️ التأمين غير مكتمل - متبقي {remaining:,} ل.س"
    else:
        return f"❌ يجب دفع التأمين ({required:,} ل.س) للبدء بالعمل"


@router.get("/status")
async def get_security_deposit_status(user: dict = Depends(get_current_user)) -> dict:
    """حالة تأمين موظف التوصيل"""
    
    if user.get("user_type") != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    settings = await get_security_settings()
    deposit = await get_driver_security_deposit(user["id"])
    
    required = settings.get("required_amount", 500)
    current = deposit.get("current_amount", 0)
    
    return {
        "is_enabled": settings.get("is_enabled", True),
        "required_amount": required,
        "current_amount": current,
        "remaining_amount": max(0, required - current),
        "status": deposit.get("status", "pending"),
        "is_complete": current >= required,
        "can_receive_orders": current >= required,
        "transactions": deposit.get("transactions", [])[-10:],
        "message": _get_status_message(current, required, deposit.get("status"))
    }


@router.get("/settings")
async def get_security_settings_public(user: dict = Depends(get_current_user)) -> dict:
    """إعدادات التأمين (للعرض)"""
    
    if user.get("user_type") != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    settings = await get_security_settings()
    
    return {
        "required_amount": settings.get("required_amount", 100000),
        "is_enabled": settings.get("is_enabled", True),
        "payment_methods": [
            {"id": "shamcash", "name": "Sham Cash", "icon": "💳"},
            {"id": "bank", "name": "تحويل بنكي", "icon": "🏦"},
            {"id": "hawala", "name": "حوالة", "icon": "💸"},
            {"id": "cash", "name": "نقداً (للمكتب)", "icon": "💵"}
        ]
    }


@router.post("/deposit")
async def submit_deposit(data: DepositRequest, user: dict = Depends(get_current_user)) -> dict:
    """إيداع مبلغ التأمين"""
    
    if user.get("user_type") != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    settings = await get_security_settings()
    
    if not settings.get("is_enabled", True):
        raise HTTPException(status_code=400, detail="نظام التأمين غير مفعّل حالياً")
    
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="المبلغ يجب أن يكون أكبر من صفر")
    
    deposit = await get_driver_security_deposit(user["id"])
    required = settings.get("required_amount", 100000)
    current = deposit.get("current_amount", 0)
    
    # التحقق من عدم تجاوز المبلغ المطلوب
    remaining = required - current
    if data.amount > remaining:
        raise HTTPException(
            status_code=400, 
            detail=f"المبلغ المتبقي هو {remaining:,} ل.س فقط"
        )
    
    now = datetime.now(timezone.utc).isoformat()
    
    # إنشاء طلب إيداع (ينتظر موافقة الأدمن إذا لم يكن نقداً)
    deposit_request = {
        "id": str(uuid.uuid4()),
        "driver_id": user["id"],
        "driver_name": user.get("full_name", user.get("name", "")),
        "driver_phone": user.get("phone", ""),
        "amount": data.amount,
        "payment_method": data.payment_method,
        "payment_reference": data.payment_reference,
        "notes": data.notes,
        "status": "pending",  # pending, approved, rejected
        "created_at": now
    }
    
    await db.security_deposit_requests.insert_one(deposit_request)
    
    # إشعار الأدمن
    admins = await db.users.find(
        {"user_type": {"$in": ["admin", "sub_admin"]}}, 
        {"_id": 0, "id": 1}
    ).to_list(100)
    
    for admin in admins:
        await create_notification_for_user(
            user_id=admin["id"],
            title="💰 طلب إيداع تأمين جديد",
            message=f"السائق {user.get('full_name', user.get('name', ''))} طلب إيداع {data.amount:,} ل.س عبر {data.payment_method}",
            notification_type="security_deposit_request"
        )
    
    return {
        "message": "تم إرسال طلب الإيداع بنجاح. سيتم مراجعته من الإدارة.",
        "request_id": deposit_request["id"],
        "amount": data.amount,
        "status": "pending"
    }


@router.get("/deposit-requests")
async def get_my_deposit_requests(user: dict = Depends(get_current_user)) -> dict:
    """طلبات الإيداع الخاصة بي"""
    
    if user.get("user_type") != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    requests = await db.security_deposit_requests.find(
        {"driver_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    
    return requests


@router.post("/resign")
async def request_resignation(data: ResignationRequest, user: dict = Depends(get_current_user)) -> dict:
    """طلب استقالة واسترداد التأمين"""
    
    if user.get("user_type") != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # التحقق من عدم وجود طلبات معلقة
    pending_orders = await db.orders.count_documents({
        "delivery_driver_id": user["id"],
        "delivery_status": {"$nin": ["delivered", "cancelled", "delivery_failed"]}
    })
    
    pending_food_orders = await db.food_orders.count_documents({
        "driver_id": user["id"],
        "status": {"$nin": ["delivered", "cancelled", "delivery_failed"]}
    })
    
    if pending_orders > 0 or pending_food_orders > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"لديك {pending_orders + pending_food_orders} طلب معلق. أكمل جميع الطلبات أولاً."
        )
    
    # التحقق من نقاط السلوك
    driver = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    behavior_points = driver.get("behavior_points", 100)
    
    settings = await get_security_settings()
    min_points = settings.get("min_behavior_points_for_refund", 50)
    
    deposit = await get_driver_security_deposit(user["id"])
    refund_amount = deposit.get("current_amount", 0)
    
    # إذا كانت نقاط السلوك منخفضة جداً، لا يُسترد التأمين
    if behavior_points < min_points:
        refund_amount = 0
        refund_note = f"لا يمكن استرداد التأمين - نقاط السلوك ({behavior_points}) أقل من الحد الأدنى ({min_points})"
    else:
        refund_note = "سيتم استرداد التأمين بعد موافقة الإدارة"
    
    now = datetime.now(timezone.utc).isoformat()
    
    # إنشاء طلب استقالة
    resignation_request = {
        "id": str(uuid.uuid4()),
        "driver_id": user["id"],
        "driver_name": user.get("full_name", user.get("name", "")),
        "driver_phone": user.get("phone", ""),
        "reason": data.reason,
        "shamcash_phone": data.shamcash_phone or user.get("phone", ""),
        "refund_amount": refund_amount,
        "behavior_points": behavior_points,
        "status": "pending",  # pending, approved, rejected
        "created_at": now
    }
    
    await db.resignation_requests.insert_one(resignation_request)
    
    # إشعار الأدمن
    admins = await db.users.find(
        {"user_type": {"$in": ["admin", "sub_admin"]}}, 
        {"_id": 0, "id": 1}
    ).to_list(100)
    
    for admin in admins:
        await create_notification_for_user(
            user_id=admin["id"],
            title="📤 طلب استقالة سائق",
            message=f"السائق {user.get('full_name', user.get('name', ''))} طلب الاستقالة. مبلغ الاسترداد: {refund_amount:,} ل.س",
            notification_type="resignation_request"
        )
    
    return {
        "message": "تم إرسال طلب الاستقالة. سيتم مراجعته من الإدارة.",
        "request_id": resignation_request["id"],
        "refund_amount": refund_amount,
        "refund_note": refund_note,
        "status": "pending"
    }


@router.get("/my-resignation")
async def get_my_resignation(user: dict = Depends(get_current_user)) -> dict:
    """جلب طلب الاستقالة الحالي للسائق"""
    
    if user.get("user_type") != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    request = await db.resignation_requests.find_one(
        {"driver_id": user["id"], "status": "pending"},
        {"_id": 0}
    )
    
    return request or {}


@router.post("/resign/cancel")
async def cancel_resignation(user: dict = Depends(get_current_user)) -> dict:
    """إلغاء طلب الاستقالة"""
    
    if user.get("user_type") != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    result = await db.resignation_requests.delete_one({
        "driver_id": user["id"],
        "status": "pending"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="لا يوجد طلب استقالة معلق")
    
    return {"message": "تم إلغاء طلب الاستقالة"}


# ============== Admin Endpoints ==============

@router.get("/admin/pending-deposits")
async def get_pending_deposits(user: dict = Depends(get_current_user)) -> dict:
    """طلبات الإيداع المعلقة (للأدمن)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    requests = await db.security_deposit_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return requests


@router.post("/admin/approve-deposit/{request_id}")
async def approve_deposit(request_id: str, user: dict = Depends(get_current_user)) -> dict:
    """الموافقة على طلب إيداع (للأدمن)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    request = await db.security_deposit_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="تمت معالجة هذا الطلب مسبقاً")
    
    now = datetime.now(timezone.utc).isoformat()
    driver_id = request["driver_id"]
    amount = request["amount"]
    
    # تحديث طلب الإيداع
    await db.security_deposit_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "approved",
                "approved_by": user["id"],
                "approved_at": now
            }
        }
    )
    
    # جلب إعدادات التأمين
    settings = await get_security_settings()
    required = settings.get("required_amount", 100000)
    
    # تحديث رصيد التأمين
    deposit = await get_driver_security_deposit(driver_id)
    current = deposit.get("current_amount", 0)
    new_amount = current + amount
    new_status = "complete" if new_amount >= required else "partial"
    
    await db.driver_security_deposits.update_one(
        {"driver_id": driver_id},
        {
            "$set": {
                "current_amount": new_amount,
                "required_amount": required,
                "status": new_status,
                "updated_at": now
            },
            "$push": {
                "transactions": {
                    "id": str(uuid.uuid4()),
                    "type": "deposit",
                    "amount": amount,
                    "payment_method": request["payment_method"],
                    "description": f"إيداع تأمين عبر {request['payment_method']}",
                    "approved_by": user["id"],
                    "created_at": now
                }
            }
        },
        upsert=True
    )
    
    # إذا اكتمل التأمين، فعّل الحساب
    if new_status == "complete":
        await db.users.update_one(
            {"id": driver_id},
            {"$set": {"security_deposit_complete": True}}
        )
    
    # إشعار السائق
    await create_notification_for_user(
        user_id=driver_id,
        title="✅ تم قبول إيداع التأمين",
        message=f"تم إضافة {amount:,} ل.س لتأمينك. الرصيد الحالي: {new_amount:,} ل.س" + 
                (" - يمكنك الآن استقبال الطلبات!" if new_status == "complete" else ""),
        notification_type="security_deposit"
    )
    
    return {
        "message": "تم قبول الإيداع بنجاح",
        "new_amount": new_amount,
        "status": new_status
    }


@router.post("/admin/reject-deposit/{request_id}")
async def reject_deposit(request_id: str, reason: str = "", user: dict = Depends(get_current_user)) -> dict:
    """رفض طلب إيداع (للأدمن)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    request = await db.security_deposit_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="تمت معالجة هذا الطلب مسبقاً")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.security_deposit_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "rejected",
                "rejected_by": user["id"],
                "rejected_at": now,
                "rejection_reason": reason
            }
        }
    )
    
    # إشعار السائق
    await create_notification_for_user(
        user_id=request["driver_id"],
        title="❌ تم رفض طلب الإيداع",
        message=f"تم رفض طلب إيداع التأمين بمبلغ {request['amount']:,} ل.س" + 
                (f". السبب: {reason}" if reason else ""),
        notification_type="security_deposit"
    )
    
    return {"message": "تم رفض الطلب"}


@router.get("/admin/pending-resignations")
async def get_pending_resignations(user: dict = Depends(get_current_user)) -> dict:
    """طلبات الاستقالة المعلقة (للأدمن)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    requests = await db.resignation_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return requests


@router.post("/admin/approve-resignation/{request_id}")
async def approve_resignation(request_id: str, user: dict = Depends(get_current_user)) -> dict:
    """الموافقة على طلب استقالة (للأدمن)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    request = await db.resignation_requests.find_one({"id": request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="تمت معالجة هذا الطلب مسبقاً")
    
    now = datetime.now(timezone.utc).isoformat()
    driver_id = request["driver_id"]
    refund_amount = request["refund_amount"]
    
    # تحديث طلب الاستقالة
    await db.resignation_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "approved",
                "approved_by": user["id"],
                "approved_at": now
            }
        }
    )
    
    # تحديث حالة التأمين
    await db.driver_security_deposits.update_one(
        {"driver_id": driver_id},
        {
            "$set": {
                "current_amount": 0,
                "status": "refunded",
                "refunded_at": now
            },
            "$push": {
                "transactions": {
                    "id": str(uuid.uuid4()),
                    "type": "refund",
                    "amount": -refund_amount,
                    "description": "استرداد التأمين - استقالة",
                    "created_at": now
                }
            }
        }
    )
    
    # إلغاء تفعيل حساب السائق
    await db.users.update_one(
        {"id": driver_id},
        {
            "$set": {
                "is_active": False,
                "resigned": True,
                "resigned_at": now,
                "security_deposit_complete": False
            }
        }
    )
    
    # إشعار السائق
    await create_notification_for_user(
        user_id=driver_id,
        title="✅ تمت الموافقة على استقالتك",
        message=f"تم قبول طلب الاستقالة. سيتم تحويل {refund_amount:,} ل.س لرقم {request.get('shamcash_phone', '')}",
        notification_type="resignation"
    )
    
    return {
        "message": "تمت الموافقة على الاستقالة",
        "refund_amount": refund_amount
    }


@router.put("/admin/settings")
async def update_security_settings(
    required_amount: int,
    is_enabled: bool = True,
    auto_deduct: bool = True,
    min_behavior_points: int = 50,
    user: dict = Depends(get_current_user)
) -> dict:
    """تحديث إعدادات التأمين (للأدمن)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    await db.settings.update_one(
        {"type": "driver_security"},
        {
            "$set": {
                "type": "driver_security",
                "required_amount": required_amount,
                "is_enabled": is_enabled,
                "auto_deduct_from_earnings": auto_deduct,
                "min_behavior_points_for_refund": min_behavior_points,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {"message": "تم تحديث الإعدادات بنجاح"}


@router.get("/admin/all-deposits")
async def get_all_driver_deposits(user: dict = Depends(get_current_user)) -> dict:
    """جميع تأمينات السائقين (للأدمن)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    deposits = await db.driver_security_deposits.find(
        {},
        {"_id": 0}
    ).to_list(500)
    
    if not deposits:
        return []
    
    # جلب جميع السائقين دفعة واحدة
    driver_ids = list(set(d["driver_id"] for d in deposits if d.get("driver_id")))
    drivers_list = await db.users.find(
        {"id": {"$in": driver_ids}},
        {"_id": 0, "id": 1, "full_name": 1, "name": 1, "phone": 1}
    ).to_list(None)
    drivers_map = {d["id"]: d for d in drivers_list}
    
    # إضافة معلومات السائق
    for deposit in deposits:
        driver = drivers_map.get(deposit.get("driver_id"))
        if driver:
            deposit["driver_name"] = driver.get("full_name", driver.get("name", ""))
            deposit["driver_phone"] = driver.get("phone", "")
    
    return deposits


# ============== إدارة حسابات السائقين (للأدمن) ==============

@router.post("/admin/driver/{driver_id}/suspend")
async def suspend_driver(driver_id: str, reason: str = "", user: dict = Depends(get_current_user)) -> dict:
    """إيقاف حساب سائق"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    driver = await db.users.find_one({"id": driver_id, "user_type": "delivery"})
    if not driver:
        raise HTTPException(status_code=404, detail="السائق غير موجود")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": driver_id},
        {
            "$set": {
                "is_suspended": True,
                "suspended_at": now,
                "suspension_reason": reason or "إيقاف من قبل الإدارة",
                "suspended_by": user["id"]
            }
        }
    )
    
    # إشعار السائق
    await create_notification_for_user(
        user_id=driver_id,
        title="⛔ تم إيقاف حسابك",
        message="تم إيقاف حسابك من قبل الإدارة" + (f". السبب: {reason}" if reason else ""),
        notification_type="account_suspended"
    )
    
    return {"message": "تم إيقاف الحساب بنجاح"}


@router.post("/admin/driver/{driver_id}/activate")
async def activate_driver(driver_id: str, user: dict = Depends(get_current_user)) -> dict:
    """إعادة تفعيل حساب سائق"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    driver = await db.users.find_one({"id": driver_id, "user_type": "delivery"})
    if not driver:
        raise HTTPException(status_code=404, detail="السائق غير موجود")
    
    await db.users.update_one(
        {"id": driver_id},
        {
            "$set": {"is_suspended": False},
            "$unset": {
                "suspended_at": "",
                "suspension_reason": "",
                "suspended_by": ""
            }
        }
    )
    
    # إشعار السائق
    await create_notification_for_user(
        user_id=driver_id,
        title="✅ تم تفعيل حسابك",
        message="تم إعادة تفعيل حسابك. يمكنك الآن استقبال الطلبات",
        notification_type="account_activated"
    )
    
    return {"message": "تم تفعيل الحساب بنجاح"}


@router.delete("/admin/driver/{driver_id}")
async def delete_driver(driver_id: str, user: dict = Depends(get_current_user)) -> dict:
    """حذف حساب سائق نهائياً"""
    
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    driver = await db.users.find_one({"id": driver_id, "user_type": "delivery"})
    if not driver:
        raise HTTPException(status_code=404, detail="السائق غير موجود")
    
    # التحقق من عدم وجود طلبات نشطة
    active_orders = await db.orders.count_documents({
        "delivery_driver_id": driver_id,
        "delivery_status": {"$nin": ["delivered", "cancelled", "delivery_failed"]}
    })
    
    active_food_orders = await db.food_orders.count_documents({
        "driver_id": driver_id,
        "status": {"$nin": ["delivered", "cancelled", "delivery_failed"]}
    })
    
    if active_orders > 0 or active_food_orders > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"لا يمكن حذف السائق - لديه {active_orders + active_food_orders} طلب نشط"
        )
    
    now = datetime.now(timezone.utc).isoformat()
    
    # حفظ بيانات السائق في سجل الحذف
    await db.deleted_drivers.insert_one({
        "id": str(uuid.uuid4()),
        "original_driver_id": driver_id,
        "driver_data": driver,
        "deleted_by": user["id"],
        "deleted_at": now
    })
    
    # حذف بيانات السائق
    await db.users.delete_one({"id": driver_id})
    await db.wallets.delete_one({"user_id": driver_id})
    await db.driver_security_deposits.delete_one({"driver_id": driver_id})
    
    return {"message": "تم حذف حساب السائق نهائياً"}


@router.get("/admin/drivers")
async def get_all_drivers(user: dict = Depends(get_current_user)) -> dict:
    """جلب جميع السائقين مع حالاتهم"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    drivers = await db.users.find(
        {"user_type": "delivery"},
        {
            "_id": 0, 
            "id": 1, 
            "name": 1, 
            "full_name": 1, 
            "phone": 1,
            "is_approved": 1,
            "is_suspended": 1,
            "suspended_at": 1,
            "suspension_reason": 1,
            "resigned": 1,
            "behavior_points": 1,
            "created_at": 1
        }
    ).to_list(500)
    
    if not drivers:
        return []
    
    driver_ids = [d["id"] for d in drivers]
    
    # جلب جميع بيانات التأمين دفعة واحدة
    deposits_list = await db.driver_security_deposits.find(
        {"driver_id": {"$in": driver_ids}},
        {"_id": 0, "driver_id": 1, "current_amount": 1, "required_amount": 1, "status": 1}
    ).to_list(None)
    deposits_map = {d["driver_id"]: d for d in deposits_list}
    
    # جلب إحصائيات الطلبات دفعة واحدة باستخدام aggregation
    orders_pipeline = [
        {"$match": {"delivery_driver_id": {"$in": driver_ids}, "delivery_status": "delivered"}},
        {"$group": {"_id": "$delivery_driver_id", "count": {"$sum": 1}}}
    ]
    orders_stats = await db.orders.aggregate(orders_pipeline).to_list(None)
    orders_map = {s["_id"]: s["count"] for s in orders_stats}
    
    food_orders_pipeline = [
        {"$match": {"driver_id": {"$in": driver_ids}, "status": "delivered"}},
        {"$group": {"_id": "$driver_id", "count": {"$sum": 1}}}
    ]
    food_stats = await db.food_orders.aggregate(food_orders_pipeline).to_list(None)
    food_map = {s["_id"]: s["count"] for s in food_stats}
    
    # إضافة المعلومات للسائقين
    for driver in drivers:
        deposit = deposits_map.get(driver["id"])
        if deposit:
            driver["security_deposit"] = {
                "current_amount": deposit.get("current_amount", 0),
                "required_amount": deposit.get("required_amount"),
                "status": deposit.get("status")
            }
        else:
            driver["security_deposit"] = {"current_amount": 0, "status": "pending"}
        
        driver["total_deliveries"] = orders_map.get(driver["id"], 0) + food_map.get(driver["id"], 0)
    
    return drivers




# ============== Hook: Call after adding earnings ==============

async def check_and_deduct_for_security(driver_id: str) -> dict:
    """
    يُستدعى بعد إضافة أرباح للسائق
    للتحقق من التأمين وخصم تلقائي إذا لزم
    """
    return await process_auto_deduction(driver_id)
