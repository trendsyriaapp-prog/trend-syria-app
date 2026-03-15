# /app/backend/routes/delivery_time.py
# نظام وقت التوصيل والعقوبات

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os

router = APIRouter()

# الاتصال بقاعدة البيانات
from motor.motor_asyncio import AsyncIOMotorClient

def get_db():
    client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
    return client[os.environ.get("DB_NAME", "trend_syria")]

# ================== Models ==================

class DeliveryTimeSettings(BaseModel):
    buffer_minutes: int = 8  # الوقت الإضافي بالدقائق
    warning_before_minutes: int = 3  # تحذير قبل انتهاء الوقت
    warnings_before_penalty: int = 3  # عدد التحذيرات قبل الخصم
    penalty_amount: int = 500  # مبلغ الخصم بالليرة
    max_penalty_per_day: int = 2000  # الحد الأقصى للخصم اليومي

class StartDeliveryTimerRequest(BaseModel):
    order_id: str
    order_type: str  # 'food' or 'product'
    estimated_minutes: int  # الوقت المتوقع من GPS

class DeliveryTimerResponse(BaseModel):
    order_id: str
    started_at: str
    estimated_minutes: int
    buffer_minutes: int
    total_allowed_minutes: int
    deadline: str
    remaining_seconds: int
    is_late: bool
    warning_sent: bool

# ================== Helper Functions ==================

async def get_delivery_time_settings(db):
    """جلب إعدادات وقت التوصيل"""
    settings = await db.settings.find_one({"type": "delivery_time_settings"})
    if settings:
        return settings.get("values", {})
    # القيم الافتراضية
    return {
        "buffer_minutes": 8,
        "warning_before_minutes": 3,
        "warnings_before_penalty": 3,
        "penalty_amount": 500,
        "max_penalty_per_day": 2000
    }

async def get_driver_warnings_today(db, driver_id: str):
    """جلب عدد التحذيرات اليوم للسائق"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    warnings = await db.delivery_warnings.count_documents({
        "driver_id": driver_id,
        "created_at": {"$gte": today_start}
    })
    return warnings

async def get_driver_penalties_today(db, driver_id: str):
    """جلب مجموع الخصومات اليوم للسائق"""
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    pipeline = [
        {
            "$match": {
                "driver_id": driver_id,
                "created_at": {"$gte": today_start},
                "type": "late_delivery"
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$amount"}
            }
        }
    ]
    
    result = await db.driver_penalties.aggregate(pipeline).to_list(1)
    return result[0]["total"] if result else 0

# ================== Endpoints ==================

@router.post("/delivery/timer/start")
async def start_delivery_timer(request: StartDeliveryTimerRequest, driver_id: str = None):
    """بدء عداد وقت التوصيل عند استلام الطلب"""
    db = get_db()
    
    # جلب الإعدادات
    settings = await get_delivery_time_settings(db)
    buffer_minutes = settings.get("buffer_minutes", 8)
    
    # حساب الوقت الإجمالي المسموح
    total_allowed = request.estimated_minutes + buffer_minutes
    
    now = datetime.now(timezone.utc)
    deadline = now + timedelta(minutes=total_allowed)
    
    # حفظ بيانات العداد
    timer_data = {
        "order_id": request.order_id,
        "order_type": request.order_type,
        "driver_id": driver_id,
        "started_at": now,
        "estimated_minutes": request.estimated_minutes,
        "buffer_minutes": buffer_minutes,
        "total_allowed_minutes": total_allowed,
        "deadline": deadline,
        "warning_sent": False,
        "completed": False,
        "is_late": False
    }
    
    # تحديث أو إنشاء
    await db.delivery_timers.update_one(
        {"order_id": request.order_id},
        {"$set": timer_data},
        upsert=True
    )
    
    return {
        "success": True,
        "timer": {
            "order_id": request.order_id,
            "started_at": now.isoformat(),
            "estimated_minutes": request.estimated_minutes,
            "buffer_minutes": buffer_minutes,
            "total_allowed_minutes": total_allowed,
            "deadline": deadline.isoformat(),
            "remaining_seconds": total_allowed * 60
        }
    }

@router.get("/delivery/timer/{order_id}")
async def get_delivery_timer(order_id: str):
    """جلب حالة عداد التوصيل"""
    db = get_db()
    
    timer = await db.delivery_timers.find_one({"order_id": order_id})
    
    if not timer:
        raise HTTPException(status_code=404, detail="لم يتم العثور على العداد")
    
    now = datetime.now(timezone.utc)
    deadline = timer.get("deadline")
    
    if isinstance(deadline, str):
        deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
    
    remaining = (deadline - now).total_seconds()
    is_late = remaining < 0
    
    return {
        "order_id": order_id,
        "started_at": timer.get("started_at").isoformat() if timer.get("started_at") else None,
        "estimated_minutes": timer.get("estimated_minutes"),
        "buffer_minutes": timer.get("buffer_minutes"),
        "total_allowed_minutes": timer.get("total_allowed_minutes"),
        "deadline": deadline.isoformat() if deadline else None,
        "remaining_seconds": max(0, int(remaining)),
        "is_late": is_late,
        "warning_sent": timer.get("warning_sent", False)
    }

@router.post("/delivery/timer/{order_id}/complete")
async def complete_delivery_timer(order_id: str, driver_id: str = None):
    """إكمال التوصيل وتسجيل النتيجة"""
    db = get_db()
    
    timer = await db.delivery_timers.find_one({"order_id": order_id})
    
    if not timer:
        raise HTTPException(status_code=404, detail="لم يتم العثور على العداد")
    
    now = datetime.now(timezone.utc)
    deadline = timer.get("deadline")
    
    if isinstance(deadline, str):
        deadline = datetime.fromisoformat(deadline.replace('Z', '+00:00'))
    
    is_late = now > deadline
    late_minutes = max(0, int((now - deadline).total_seconds() / 60)) if is_late else 0
    
    # تحديث العداد
    await db.delivery_timers.update_one(
        {"order_id": order_id},
        {
            "$set": {
                "completed": True,
                "completed_at": now,
                "is_late": is_late,
                "late_minutes": late_minutes
            }
        }
    )
    
    result = {
        "success": True,
        "order_id": order_id,
        "is_late": is_late,
        "late_minutes": late_minutes,
        "penalty_applied": False,
        "penalty_amount": 0,
        "message": "تم التوصيل في الوقت المحدد" if not is_late else f"تأخر التوصيل {late_minutes} دقيقة"
    }
    
    # إذا تأخر، نتحقق من العقوبات
    if is_late and driver_id:
        settings = await get_delivery_time_settings(db)
        warnings_before_penalty = settings.get("warnings_before_penalty", 3)
        penalty_amount = settings.get("penalty_amount", 500)
        max_penalty_per_day = settings.get("max_penalty_per_day", 2000)
        
        # جلب عدد التحذيرات اليوم
        warnings_today = await get_driver_warnings_today(db, driver_id)
        
        if warnings_today < warnings_before_penalty:
            # إضافة تحذير
            await db.delivery_warnings.insert_one({
                "driver_id": driver_id,
                "order_id": order_id,
                "late_minutes": late_minutes,
                "created_at": now
            })
            
            result["message"] = f"تحذير {warnings_today + 1}/{warnings_before_penalty} - تأخر التوصيل {late_minutes} دقيقة"
            result["warnings_count"] = warnings_today + 1
            result["warnings_before_penalty"] = warnings_before_penalty
        else:
            # تطبيق العقوبة
            penalties_today = await get_driver_penalties_today(db, driver_id)
            
            if penalties_today < max_penalty_per_day:
                actual_penalty = min(penalty_amount, max_penalty_per_day - penalties_today)
                
                await db.driver_penalties.insert_one({
                    "driver_id": driver_id,
                    "order_id": order_id,
                    "type": "late_delivery",
                    "amount": actual_penalty,
                    "late_minutes": late_minutes,
                    "created_at": now
                })
                
                result["penalty_applied"] = True
                result["penalty_amount"] = actual_penalty
                result["message"] = f"تم خصم {actual_penalty} ل.س بسبب التأخر {late_minutes} دقيقة"
            else:
                result["message"] = f"تأخر التوصيل {late_minutes} دقيقة (تم الوصول للحد الأقصى للخصم اليومي)"
    
    return result

@router.get("/delivery/driver/{driver_id}/stats")
async def get_driver_delivery_stats(driver_id: str):
    """جلب إحصائيات السائق لليوم"""
    db = get_db()
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # عدد التوصيلات اليوم
    deliveries_today = await db.delivery_timers.count_documents({
        "driver_id": driver_id,
        "completed": True,
        "completed_at": {"$gte": today_start}
    })
    
    # عدد التوصيلات المتأخرة
    late_deliveries = await db.delivery_timers.count_documents({
        "driver_id": driver_id,
        "completed": True,
        "is_late": True,
        "completed_at": {"$gte": today_start}
    })
    
    # عدد التحذيرات
    warnings = await get_driver_warnings_today(db, driver_id)
    
    # مجموع الخصومات
    penalties = await get_driver_penalties_today(db, driver_id)
    
    # جلب الإعدادات
    settings = await get_delivery_time_settings(db)
    
    return {
        "driver_id": driver_id,
        "today": {
            "deliveries": deliveries_today,
            "late_deliveries": late_deliveries,
            "on_time_rate": round((deliveries_today - late_deliveries) / deliveries_today * 100, 1) if deliveries_today > 0 else 100,
            "warnings": warnings,
            "warnings_before_penalty": settings.get("warnings_before_penalty", 3),
            "penalties_amount": penalties,
            "max_penalty_per_day": settings.get("max_penalty_per_day", 2000)
        }
    }

# ================== Admin Endpoints ==================

@router.get("/admin/delivery-time-settings")
async def get_admin_delivery_time_settings():
    """جلب إعدادات وقت التوصيل للأدمن"""
    db = get_db()
    settings = await get_delivery_time_settings(db)
    return {"success": True, "settings": settings}

@router.put("/admin/delivery-time-settings")
async def update_admin_delivery_time_settings(settings: DeliveryTimeSettings):
    """تحديث إعدادات وقت التوصيل"""
    db = get_db()
    
    await db.settings.update_one(
        {"type": "delivery_time_settings"},
        {
            "$set": {
                "type": "delivery_time_settings",
                "values": settings.dict(),
                "updated_at": datetime.now(timezone.utc)
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "message": "تم تحديث إعدادات وقت التوصيل",
        "settings": settings.dict()
    }

@router.get("/admin/late-deliveries")
async def get_admin_late_deliveries(days: int = 7):
    """جلب تقرير التوصيلات المتأخرة للأدمن"""
    db = get_db()
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # جلب التوصيلات المتأخرة
    late_deliveries = await db.delivery_timers.find({
        "is_late": True,
        "completed_at": {"$gte": start_date}
    }).sort("completed_at", -1).to_list(100)
    
    # تحويل ObjectId
    for delivery in late_deliveries:
        delivery["_id"] = str(delivery["_id"])
        if delivery.get("started_at"):
            delivery["started_at"] = delivery["started_at"].isoformat()
        if delivery.get("completed_at"):
            delivery["completed_at"] = delivery["completed_at"].isoformat()
        if delivery.get("deadline"):
            delivery["deadline"] = delivery["deadline"].isoformat()
    
    # إحصائيات
    total_late = len(late_deliveries)
    total_deliveries = await db.delivery_timers.count_documents({
        "completed": True,
        "completed_at": {"$gte": start_date}
    })
    
    return {
        "success": True,
        "period_days": days,
        "stats": {
            "total_deliveries": total_deliveries,
            "late_deliveries": total_late,
            "on_time_rate": round((total_deliveries - total_late) / total_deliveries * 100, 1) if total_deliveries > 0 else 100
        },
        "late_deliveries": late_deliveries
    }

@router.get("/admin/driver-penalties")
async def get_admin_driver_penalties(days: int = 7):
    """جلب تقرير خصومات السائقين للأدمن"""
    db = get_db()
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    # تجميع الخصومات حسب السائق
    pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_date},
                "type": "late_delivery"
            }
        },
        {
            "$group": {
                "_id": "$driver_id",
                "total_penalties": {"$sum": "$amount"},
                "penalty_count": {"$sum": 1}
            }
        },
        {
            "$sort": {"total_penalties": -1}
        }
    ]
    
    penalties_by_driver = await db.driver_penalties.aggregate(pipeline).to_list(50)
    
    # جلب أسماء السائقين
    for item in penalties_by_driver:
        driver = await db.users.find_one({"_id": ObjectId(item["_id"])})
        item["driver_name"] = driver.get("name", "غير معروف") if driver else "غير معروف"
        item["driver_id"] = item.pop("_id")
    
    # مجموع الخصومات
    total_penalties = sum(item["total_penalties"] for item in penalties_by_driver)
    
    return {
        "success": True,
        "period_days": days,
        "total_penalties": total_penalties,
        "drivers": penalties_by_driver
    }
