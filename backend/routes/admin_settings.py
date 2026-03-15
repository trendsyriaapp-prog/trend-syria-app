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
    geofencing_max_distance_meters: Optional[int] = None  # المسافة المسموحة لتسجيل الوصول
    max_product_orders_per_driver: Optional[int] = None  # الحد الأقصى لطلبات المنتجات للسائق
    # إعدادات ساعات توصيل المنتجات
    product_delivery_start_hour: Optional[int] = None  # أول وقت للتوصيل (ساعة)
    product_delivery_start_minute: Optional[int] = None
    product_delivery_end_hour: Optional[int] = None  # آخر وقت للتوصيل (ساعة)
    product_delivery_end_minute: Optional[int] = None


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



# ============================================
# إعدادات ساعات توصيل المنتجات
# ============================================

@router.get("/settings/product-delivery-hours")
async def get_product_delivery_hours(user: dict = Depends(get_current_user)):
    """جلب إعدادات ساعات توصيل المنتجات"""
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    settings = await db.settings.find_one({"type": "product_delivery_hours"}, {"_id": 0})
    
    if not settings:
        # القيم الافتراضية
        settings = {
            "type": "product_delivery_hours",
            "start_hour": 8,
            "start_minute": 0,
            "end_hour": 23,
            "end_minute": 0
        }
    
    return {
        "success": True,
        "settings": settings
    }


class ProductDeliveryHoursUpdate(BaseModel):
    start_hour: int  # 0-23
    start_minute: int  # 0-59
    end_hour: int  # 0-23
    end_minute: int  # 0-59


@router.put("/settings/product-delivery-hours")
async def update_product_delivery_hours(
    data: ProductDeliveryHoursUpdate,
    user: dict = Depends(get_current_user)
):
    """تحديث إعدادات ساعات توصيل المنتجات"""
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # التحقق من صحة القيم
    if not (0 <= data.start_hour <= 23 and 0 <= data.end_hour <= 23):
        raise HTTPException(status_code=400, detail="الساعة يجب أن تكون بين 0 و 23")
    if not (0 <= data.start_minute <= 59 and 0 <= data.end_minute <= 59):
        raise HTTPException(status_code=400, detail="الدقائق يجب أن تكون بين 0 و 59")
    
    settings = {
        "type": "product_delivery_hours",
        "start_hour": data.start_hour,
        "start_minute": data.start_minute,
        "end_hour": data.end_hour,
        "end_minute": data.end_minute,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user.get("id")
    }
    
    await db.settings.update_one(
        {"type": "product_delivery_hours"},
        {"$set": settings},
        upsert=True
    )
    
    return {
        "success": True,
        "message": "تم تحديث ساعات التوصيل بنجاح",
        "settings": settings
    }


@router.get("/delivery/check-hours")
async def check_delivery_hours():
    """التحقق من إمكانية التوصيل الآن (للسائقين)"""
    settings = await db.settings.find_one({"type": "product_delivery_hours"}, {"_id": 0})
    
    if not settings:
        settings = {
            "start_hour": 8,
            "start_minute": 0,
            "end_hour": 23,
            "end_minute": 0
        }
    
    # الوقت الحالي بتوقيت سوريا (UTC+3)
    from datetime import timedelta
    now_utc = datetime.now(timezone.utc)
    syria_tz = timezone(timedelta(hours=3))
    now_syria = now_utc.astimezone(syria_tz)
    
    current_minutes = now_syria.hour * 60 + now_syria.minute
    start_minutes = settings["start_hour"] * 60 + settings["start_minute"]
    end_minutes = settings["end_hour"] * 60 + settings["end_minute"]
    
    is_allowed = start_minutes <= current_minutes <= end_minutes
    
    return {
        "is_delivery_allowed": is_allowed,
        "current_time": now_syria.strftime("%H:%M"),
        "delivery_start": f"{settings['start_hour']:02d}:{settings['start_minute']:02d}",
        "delivery_end": f"{settings['end_hour']:02d}:{settings['end_minute']:02d}",
        "message": "يمكنك التوصيل الآن" if is_allowed else f"التوصيل متاح من {settings['start_hour']:02d}:{settings['start_minute']:02d}"
    }


@router.post("/delivery/process-undelivered")
async def process_undelivered_orders(user: dict = Depends(get_current_user)):
    """معالجة الطلبات غير المُسلّمة وخصم قيمتها من رصيد السائقين - يدوي من المدير"""
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    from datetime import timedelta
    
    # جلب إعدادات ساعات التوصيل
    settings = await db.settings.find_one({"type": "product_delivery_hours"}, {"_id": 0})
    if not settings:
        settings = {"start_hour": 8, "start_minute": 0}
    
    # الوقت الحالي بتوقيت سوريا
    now_utc = datetime.now(timezone.utc)
    syria_tz = timezone(timedelta(hours=3))
    now_syria = now_utc.astimezone(syria_tz)
    
    # بداية اليوم السابق
    yesterday_start = (now_syria - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_end = yesterday_start + timedelta(days=1)
    
    # البحث عن طلبات المنتجات التي لم تُسلّم من الأمس
    undelivered_orders = await db.orders.find({
        "status": "shipped",  # مُستلمة من المتجر ولم تُسلّم للعميل
        "driver_id": {"$ne": None},
        "picked_up_at": {
            "$gte": yesterday_start.isoformat(),
            "$lt": yesterday_end.isoformat()
        },
        "delivered_at": None,
        "penalty_applied": {"$ne": True}
    }, {"_id": 0}).to_list(None)
    
    deductions = []
    total_deducted = 0
    
    for order in undelivered_orders:
        driver_id = order.get("driver_id")
        order_total = order.get("total", 0)
        
        if not driver_id or order_total <= 0:
            continue
        
        # خصم المبلغ من رصيد السائق
        await db.users.update_one(
            {"id": driver_id},
            {
                "$inc": {
                    "balance": -order_total,
                    "total_penalties": order_total,
                    "penalties_count": 1
                }
            }
        )
        
        # تسجيل الخصم
        deduction_record = {
            "id": f"ded_{datetime.now().strftime('%Y%m%d%H%M%S')}_{order['id'][:8]}",
            "driver_id": driver_id,
            "order_id": order["id"],
            "amount": order_total,
            "reason": "عدم تسليم طلب منتجات في الوقت المحدد",
            "created_at": now_utc.isoformat(),
            "created_by": user.get("id")
        }
        await db.deductions.insert_one(deduction_record)
        
        # تحديث الطلب
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {"penalty_applied": True, "penalty_amount": order_total}}
        )
        
        deductions.append({
            "order_id": order["id"],
            "driver_id": driver_id,
            "amount": order_total
        })
        total_deducted += order_total
    
    return {
        "success": True,
        "message": f"تم معالجة {len(deductions)} طلب غير مُسلّم",
        "total_deducted": total_deducted,
        "deductions": deductions
    }


@router.get("/delivery/undelivered-report")
async def get_undelivered_report(user: dict = Depends(get_current_user)):
    """تقرير الطلبات غير المُسلّمة"""
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    from datetime import timedelta
    
    now_utc = datetime.now(timezone.utc)
    syria_tz = timezone(timedelta(hours=3))
    now_syria = now_utc.astimezone(syria_tz)
    
    # بداية اليوم الحالي
    today_start = now_syria.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    
    # طلبات اليوم غير المُسلّمة
    today_undelivered = await db.orders.find({
        "status": "shipped",
        "driver_id": {"$ne": None},
        "picked_up_at": {"$gte": today_start.isoformat()},
        "delivered_at": None
    }, {"_id": 0, "id": 1, "driver_id": 1, "total": 1, "picked_up_at": 1}).to_list(None)
    
    # طلبات الأمس غير المُسلّمة (تحتاج خصم)
    yesterday_undelivered = await db.orders.find({
        "status": "shipped",
        "driver_id": {"$ne": None},
        "picked_up_at": {
            "$gte": yesterday_start.isoformat(),
            "$lt": today_start.isoformat()
        },
        "delivered_at": None,
        "penalty_applied": {"$ne": True}
    }, {"_id": 0, "id": 1, "driver_id": 1, "total": 1, "picked_up_at": 1}).to_list(None)
    
    return {
        "success": True,
        "report": {
            "today": {
                "count": len(today_undelivered),
                "total_value": sum(o.get("total", 0) for o in today_undelivered),
                "orders": today_undelivered
            },
            "yesterday_pending_penalty": {
                "count": len(yesterday_undelivered),
                "total_value": sum(o.get("total", 0) for o in yesterday_undelivered),
                "orders": yesterday_undelivered
            }
        }
    }
