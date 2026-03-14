"""
إعدادات الأدمن - التوصيل والمخالفات
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from datetime import datetime, timezone

from core.database import db, get_current_user
from services.violation_system import (
    get_delivery_settings,
    save_delivery_settings,
    get_admin_violations_report
)

router = APIRouter(prefix="/admin", tags=["Admin Settings"])


class DeliverySettingsUpdate(BaseModel):
    max_waiting_time_minutes: Optional[int] = None
    compensation_per_5_minutes: Optional[int] = None
    max_compensation_per_order: Optional[int] = None
    driver_accept_timeout_seconds: Optional[int] = None
    warnings_before_alert: Optional[int] = None
    warnings_before_final: Optional[int] = None
    warnings_before_suspend: Optional[int] = None
    suspend_duration_hours: Optional[int] = None


@router.get("/settings/delivery")
async def get_delivery_settings_api(user: dict = Depends(get_current_user)):
    """جلب إعدادات التوصيل"""
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    settings = await get_delivery_settings()
    return {
        "success": True,
        "settings": settings
    }


@router.put("/settings/delivery")
async def update_delivery_settings_api(
    data: DeliverySettingsUpdate,
    user: dict = Depends(get_current_user)
):
    """تحديث إعدادات التوصيل"""
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    current_settings = await get_delivery_settings()
    
    # تحديث فقط القيم المرسلة
    update_data = data.dict(exclude_none=True)
    new_settings = {**current_settings, **update_data}
    
    await save_delivery_settings(new_settings)
    
    return {
        "success": True,
        "message": "تم تحديث الإعدادات بنجاح",
        "settings": new_settings
    }


@router.get("/violations/report")
async def get_violations_report(
    days: int = 30,
    user: dict = Depends(get_current_user)
):
    """تقرير المخالفات للأدمن"""
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    report = await get_admin_violations_report(days)
    return {
        "success": True,
        "report": report
    }


@router.get("/violations/list")
async def get_violations_list(
    page: int = 1,
    limit: int = 20,
    store_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """قائمة المخالفات"""
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    query = {}
    if store_id:
        query["store_id"] = store_id
    
    skip = (page - 1) * limit
    
    violations = await db.violations.find(query, {"_id": 0}).sort(
        "created_at", -1
    ).skip(skip).limit(limit).to_list(limit)
    
    total = await db.violations.count_documents(query)
    
    return {
        "success": True,
        "violations": violations,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }


@router.post("/stores/{store_id}/unsuspend")
async def unsuspend_store(store_id: str, user: dict = Depends(get_current_user)):
    """إلغاء إيقاف متجر"""
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.food_stores.update_one(
        {"id": store_id},
        {
            "$set": {
                "is_active": True,
                "warning_level": "normal",
                "suspended_until": None
            },
            "$unset": {"suspended_until": ""}
        }
    )
    
    if result.modified_count > 0:
        return {"success": True, "message": "تم إلغاء إيقاف المتجر"}
    
    raise HTTPException(status_code=404, detail="المتجر غير موجود")


@router.get("/violations/report")
async def get_violations_report(
    days: int = 30,
    user: dict = Depends(get_current_user)
):
    """تقرير المخالفات الشامل للأدمن"""
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    try:
        from services.violation_system import get_admin_violations_report
        report = await get_admin_violations_report(days)
        return {"success": True, "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dispatch/status")
async def get_dispatch_status(user: dict = Depends(get_current_user)):
    """حالة نظام التوزيع التلقائي"""
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    from datetime import timedelta
    now = datetime.now(timezone.utc)
    
    # الطلبات الجاهزة للتوزيع
    pending_dispatch = await db.food_orders.count_documents({
        "status": {"$in": ["preparing", "confirmed"]},
        "driver_id": None,
        "dispatched": {"$ne": True}
    })
    
    # الطلبات المُوزعة اليوم
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    dispatched_today = await db.food_orders.count_documents({
        "dispatched": True,
        "dispatched_at": {"$gte": today_start}
    })
    
    # السائقين المتاحين
    available_drivers = await db.delivery_documents.count_documents({
        "is_available": True,
        "status": "approved"
    })
    
    return {
        "success": True,
        "status": {
            "pending_dispatch": pending_dispatch,
            "dispatched_today": dispatched_today,
            "available_drivers": available_drivers,
            "background_task_running": True
        }
    }

