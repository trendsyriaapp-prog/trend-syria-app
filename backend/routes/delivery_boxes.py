# /app/backend/routes/delivery_boxes.py
# نظام إدارة صناديق التوصيل

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user, get_current_admin

router = APIRouter(prefix="/delivery-boxes", tags=["Delivery Boxes"])

# إعدادات الصناديق
BOX_SETTINGS = {
    "deposit_amount": 30000,  # مبلغ الإيداع
    "monthly_installment": 3000,  # القسط الشهري
    "total_installments": 10,  # عدد الأقساط للتملك
    "box_price": 60000,  # سعر الصندوق الفعلي
}

class BoxAssignment(BaseModel):
    delivery_user_id: str
    box_serial: Optional[str] = None
    deposit_paid: float = 0
    notes: Optional[str] = None

class BoxPayment(BaseModel):
    amount: float
    payment_type: str  # deposit, installment, return_deposit
    notes: Optional[str] = None

# ========== Admin Endpoints ==========

@router.get("/admin/all")
async def get_all_boxes(admin: dict = Depends(get_current_admin)):
    """جلب جميع الصناديق مع حالتها"""
    boxes = await db.delivery_boxes.find({}, {"_id": 0}).to_list(1000)
    
    # إحصائيات
    stats = {
        "total_boxes": len(boxes),
        "assigned": len([b for b in boxes if b.get("status") == "assigned"]),
        "available": len([b for b in boxes if b.get("status") == "available"]),
        "owned": len([b for b in boxes if b.get("status") == "owned"]),
        "damaged": len([b for b in boxes if b.get("status") == "damaged"]),
    }
    
    return {"boxes": boxes, "stats": stats, "settings": BOX_SETTINGS}

@router.post("/admin/add")
async def add_new_box(box_serial: str, admin: dict = Depends(get_current_admin)):
    """إضافة صندوق جديد للمخزون"""
    existing = await db.delivery_boxes.find_one({"serial": box_serial})
    if existing:
        raise HTTPException(status_code=400, detail="رقم الصندوق موجود مسبقاً")
    
    box = {
        "id": str(uuid.uuid4()),
        "serial": box_serial,
        "status": "available",  # available, assigned, owned, damaged, returned
        "assigned_to": None,
        "deposit_paid": 0,
        "installments_paid": 0,
        "total_paid": 0,
        "assigned_date": None,
        "ownership_date": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "history": []
    }
    
    await db.delivery_boxes.insert_one(box)
    return {"message": "تم إضافة الصندوق بنجاح", "box": box}

@router.post("/admin/assign")
async def assign_box_to_driver(data: BoxAssignment, admin: dict = Depends(get_current_admin)):
    """تعيين صندوق لموظف توصيل"""
    # التحقق من الموظف
    driver = await db.users.find_one({"id": data.delivery_user_id, "user_type": "delivery"})
    if not driver:
        raise HTTPException(status_code=404, detail="موظف التوصيل غير موجود")
    
    # التحقق من عدم وجود صندوق مسبق
    existing_assignment = await db.delivery_boxes.find_one({
        "assigned_to": data.delivery_user_id,
        "status": {"$in": ["assigned", "owned"]}
    })
    if existing_assignment:
        raise HTTPException(status_code=400, detail="الموظف لديه صندوق بالفعل")
    
    # البحث عن صندوق متاح أو صندوق محدد
    if data.box_serial:
        box = await db.delivery_boxes.find_one({"serial": data.box_serial, "status": "available"})
        if not box:
            raise HTTPException(status_code=404, detail="الصندوق غير متاح")
    else:
        box = await db.delivery_boxes.find_one({"status": "available"})
        if not box:
            raise HTTPException(status_code=404, detail="لا توجد صناديق متاحة")
    
    # تحديث الصندوق
    now = datetime.now(timezone.utc).isoformat()
    history_entry = {
        "action": "assigned",
        "date": now,
        "user_id": data.delivery_user_id,
        "user_name": driver.get("full_name", ""),
        "deposit": data.deposit_paid,
        "notes": data.notes,
        "admin_id": admin["id"]
    }
    
    await db.delivery_boxes.update_one(
        {"id": box["id"]},
        {
            "$set": {
                "status": "assigned",
                "assigned_to": data.delivery_user_id,
                "assigned_to_name": driver.get("full_name", ""),
                "deposit_paid": data.deposit_paid,
                "installments_paid": 0,
                "total_paid": data.deposit_paid,
                "assigned_date": now,
            },
            "$push": {"history": history_entry}
        }
    )
    
    # إنشاء سجل للموظف
    await db.driver_box_records.insert_one({
        "id": str(uuid.uuid4()),
        "driver_id": data.delivery_user_id,
        "box_id": box["id"],
        "box_serial": box["serial"],
        "deposit_paid": data.deposit_paid,
        "installments_paid": 0,
        "installments_count": 0,
        "total_paid": data.deposit_paid,
        "status": "active",  # active, owned, returned
        "start_date": now,
        "payments": [{
            "date": now,
            "amount": data.deposit_paid,
            "type": "deposit",
            "notes": "إيداع أولي"
        }] if data.deposit_paid > 0 else []
    })
    
    return {"message": "تم تعيين الصندوق بنجاح", "box_serial": box["serial"]}

@router.post("/admin/record-payment/{driver_id}")
async def record_box_payment(driver_id: str, payment: BoxPayment, admin: dict = Depends(get_current_admin)):
    """تسجيل دفعة للصندوق"""
    record = await db.driver_box_records.find_one({"driver_id": driver_id, "status": "active"})
    if not record:
        raise HTTPException(status_code=404, detail="لا يوجد سجل صندوق نشط لهذا الموظف")
    
    now = datetime.now(timezone.utc).isoformat()
    
    payment_entry = {
        "date": now,
        "amount": payment.amount,
        "type": payment.payment_type,
        "notes": payment.notes or "",
        "admin_id": admin["id"]
    }
    
    update_data = {
        "$push": {"payments": payment_entry},
        "$inc": {"total_paid": payment.amount}
    }
    
    if payment.payment_type == "installment":
        update_data["$inc"]["installments_paid"] = payment.amount
        update_data["$inc"]["installments_count"] = 1
    elif payment.payment_type == "deposit":
        update_data["$inc"]["deposit_paid"] = payment.amount
    
    await db.driver_box_records.update_one({"id": record["id"]}, update_data)
    
    # تحديث سجل الصندوق
    await db.delivery_boxes.update_one(
        {"id": record["box_id"]},
        {
            "$inc": {"total_paid": payment.amount},
            "$push": {"history": {
                "action": "payment",
                "date": now,
                "amount": payment.amount,
                "type": payment.payment_type
            }}
        }
    )
    
    # التحقق من اكتمال الدفعات للتملك
    updated_record = await db.driver_box_records.find_one({"id": record["id"]})
    total_for_ownership = BOX_SETTINGS["deposit_amount"] + (BOX_SETTINGS["monthly_installment"] * BOX_SETTINGS["total_installments"])
    
    if updated_record["total_paid"] >= total_for_ownership and updated_record["status"] != "owned":
        await db.driver_box_records.update_one(
            {"id": record["id"]},
            {"$set": {"status": "owned", "ownership_date": now}}
        )
        await db.delivery_boxes.update_one(
            {"id": record["box_id"]},
            {"$set": {"status": "owned", "ownership_date": now}}
        )
        return {"message": "تم تسجيل الدفعة - الموظف يمتلك الصندوق الآن! 🎉"}
    
    return {"message": "تم تسجيل الدفعة بنجاح"}

@router.post("/admin/return/{driver_id}")
async def return_box(driver_id: str, condition: str = "good", admin: dict = Depends(get_current_admin)):
    """استرجاع الصندوق من الموظف"""
    record = await db.driver_box_records.find_one({"driver_id": driver_id, "status": "active"})
    if not record:
        raise HTTPException(status_code=404, detail="لا يوجد سجل صندوق نشط")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # حساب المبلغ المسترد
    refund_amount = record["deposit_paid"] if condition == "good" else 0
    
    # تحديث السجل
    await db.driver_box_records.update_one(
        {"id": record["id"]},
        {
            "$set": {
                "status": "returned",
                "return_date": now,
                "return_condition": condition,
                "refund_amount": refund_amount
            }
        }
    )
    
    # تحديث الصندوق
    new_status = "available" if condition == "good" else "damaged"
    await db.delivery_boxes.update_one(
        {"id": record["box_id"]},
        {
            "$set": {
                "status": new_status,
                "assigned_to": None,
                "assigned_to_name": None,
                "deposit_paid": 0,
                "installments_paid": 0,
                "total_paid": 0,
            },
            "$push": {"history": {
                "action": "returned",
                "date": now,
                "condition": condition,
                "refund": refund_amount
            }}
        }
    )
    
    return {
        "message": f"تم استرجاع الصندوق - المبلغ المسترد: {refund_amount:,} ل.س",
        "refund_amount": refund_amount
    }

@router.get("/admin/settings")
async def get_box_settings(admin: dict = Depends(get_current_admin)):
    """جلب إعدادات الصناديق"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    box_settings = settings.get("box_settings", BOX_SETTINGS) if settings else BOX_SETTINGS
    return box_settings

@router.put("/admin/settings")
async def update_box_settings(
    deposit_amount: int,
    monthly_installment: int,
    total_installments: int,
    admin: dict = Depends(get_current_admin)
):
    """تحديث إعدادات الصناديق"""
    await db.platform_settings.update_one(
        {"id": "main"},
        {"$set": {
            "box_settings": {
                "deposit_amount": deposit_amount,
                "monthly_installment": monthly_installment,
                "total_installments": total_installments,
                "box_price": deposit_amount + (monthly_installment * total_installments)
            }
        }},
        upsert=True
    )
    return {"message": "تم تحديث الإعدادات"}

# ========== Driver Endpoints ==========

@router.get("/my-box")
async def get_my_box(user: dict = Depends(get_current_user)):
    """جلب معلومات صندوق الموظف"""
    if user.get("user_type") != "delivery":
        raise HTTPException(status_code=403, detail="هذه الصفحة لموظفي التوصيل فقط")
    
    record = await db.driver_box_records.find_one(
        {"driver_id": user["id"], "status": {"$in": ["active", "owned"]}},
        {"_id": 0}
    )
    
    if not record:
        return {
            "has_box": False,
            "message": "لم يتم تعيين صندوق لك بعد",
            "settings": BOX_SETTINGS
        }
    
    # حساب التفاصيل
    total_required = BOX_SETTINGS["deposit_amount"] + (BOX_SETTINGS["monthly_installment"] * BOX_SETTINGS["total_installments"])
    remaining = max(0, total_required - record["total_paid"])
    remaining_installments = max(0, BOX_SETTINGS["total_installments"] - record.get("installments_count", 0))
    progress_percent = min(100, (record["total_paid"] / total_required) * 100)
    
    return {
        "has_box": True,
        "box_serial": record["box_serial"],
        "status": record["status"],
        "deposit_paid": record["deposit_paid"],
        "installments_paid": record["installments_paid"],
        "installments_count": record.get("installments_count", 0),
        "total_paid": record["total_paid"],
        "total_required": total_required,
        "remaining": remaining,
        "remaining_installments": remaining_installments,
        "progress_percent": round(progress_percent, 1),
        "is_owned": record["status"] == "owned",
        "payments": record.get("payments", [])[-10:],  # آخر 10 دفعات
        "settings": BOX_SETTINGS,
        "start_date": record.get("start_date"),
        "ownership_date": record.get("ownership_date")
    }
