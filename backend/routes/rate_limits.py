# /app/backend/routes/rate_limits.py
# API endpoints لإدارة ومراقبة Rate Limiting

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.database import get_current_admin
from helpers.datetime_helpers import get_now
from core.rate_limiter import rate_limiter, RATE_LIMITS, SECURITY_ALERT_CONFIG

router = APIRouter(prefix="/rate-limits", tags=["Rate Limits"])


class UnblockRequest(BaseModel):
    ip: str


class AlertConfigUpdate(BaseModel):
    enabled: bool = None
    alert_threshold: int = None
    alert_cooldown: int = None


@router.get("/stats")
async def get_rate_limit_stats(admin: dict = Depends(get_current_admin)) -> dict:
    """
    جلب إحصائيات Rate Limiting
    
    يتضمن:
    - إجمالي الطلبات
    - الطلبات المحظورة
    - الطلبات حسب الساعة (آخر 24 ساعة)
    - أكثر endpoints استخداماً
    - أكثر IPs محظورة
    - آخر عمليات الحظر
    """
    return rate_limiter.get_stats()


@router.get("/blocked")
async def get_blocked_ips(admin: dict = Depends(get_current_admin)) -> dict:
    """
    جلب قائمة IPs المحظورة حالياً
    """
    return {
        "blocked_ips": rate_limiter.get_blocked_ips(),
        "total": len(rate_limiter.get_blocked_ips())
    }


@router.post("/unblock")
async def unblock_ip(data: UnblockRequest, admin: dict = Depends(get_current_admin)) -> dict:
    """
    إلغاء حظر IP يدوياً
    """
    success = rate_limiter.unblock_ip(data.ip)
    
    if success:
        return {"message": f"تم إلغاء حظر {data.ip} بنجاح"}
    else:
        raise HTTPException(status_code=404, detail="IP غير موجود في قائمة المحظورين")


@router.get("/config")
async def get_rate_limit_config(admin: dict = Depends(get_current_admin)) -> dict:
    """
    جلب إعدادات Rate Limiting الحالية
    """
    return {
        "limits": RATE_LIMITS,
        "description": {
            "requests": "عدد الطلبات المسموح",
            "window": "النافذة الزمنية بالثواني",
            "block_duration": "مدة الحظر بالثواني عند التجاوز"
        }
    }


@router.post("/clear-stats")
async def clear_stats(admin: dict = Depends(get_current_admin)) -> dict:
    """
    مسح إحصائيات Rate Limiting (للمدير فقط)
    """
    # التحقق أنه admin وليس sub_admin
    if admin.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="هذا الإجراء للمدير الرئيسي فقط")
    
    rate_limiter.clear_stats()
    return {"message": "تم مسح الإحصائيات بنجاح"}


@router.get("/alerts/config")
async def get_alert_config(admin: dict = Depends(get_current_admin)) -> dict:
    """
    جلب إعدادات التنبيهات الأمنية
    """
    return {
        "config": SECURITY_ALERT_CONFIG,
        "description": {
            "enabled": "تفعيل/تعطيل التنبيهات",
            "alert_threshold": "عدد مرات الحظر قبل إرسال تنبيه",
            "alert_cooldown": "الفترة بين التنبيهات لنفس IP (بالثواني)",
            "critical_endpoints": "النقاط الحرجة التي ترسل تنبيه فوري"
        }
    }


@router.post("/alerts/config")
async def update_alert_config(
    data: AlertConfigUpdate,
    admin: dict = Depends(get_current_admin)
) -> dict:
    """
    تحديث إعدادات التنبيهات الأمنية (للمدير فقط)
    """
    if admin.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="هذا الإجراء للمدير الرئيسي فقط")
    
    updated = []
    
    if data.enabled is not None:
        SECURITY_ALERT_CONFIG["enabled"] = data.enabled
        updated.append(f"enabled: {data.enabled}")
    
    if data.alert_threshold is not None:
        if data.alert_threshold < 1:
            raise HTTPException(status_code=400, detail="alert_threshold يجب أن يكون 1 على الأقل")
        SECURITY_ALERT_CONFIG["alert_threshold"] = data.alert_threshold
        updated.append(f"alert_threshold: {data.alert_threshold}")
    
    if data.alert_cooldown is not None:
        if data.alert_cooldown < 60:
            raise HTTPException(status_code=400, detail="alert_cooldown يجب أن يكون 60 ثانية على الأقل")
        SECURITY_ALERT_CONFIG["alert_cooldown"] = data.alert_cooldown
        updated.append(f"alert_cooldown: {data.alert_cooldown}")
    
    return {
        "message": "تم تحديث الإعدادات بنجاح",
        "updated": updated,
        "config": SECURITY_ALERT_CONFIG
    }


@router.post("/test-alert")
async def test_security_alert(admin: dict = Depends(get_current_admin)) -> dict:
    """
    إرسال تنبيه تجريبي للتأكد من عمل النظام
    """
    if admin.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="هذا الإجراء للمدير الرئيسي فقط")
    
    try:
        from core.database import db
        from core.firebase_admin import send_push_to_user
        from datetime import datetime, timezone
        
        # إنشاء إشعار تجريبي
        test_notification = {
            "id": f"test_alert_{int(datetime.now(timezone.utc).timestamp())}",
            "type": "security_alert",
            "title": "🧪 تنبيه تجريبي",
            "body": "هذا تنبيه تجريبي للتأكد من عمل نظام التنبيهات الأمنية",
            "data": {
                "ip": "TEST",
                "endpoint": "/api/test",
                "block_count": 0,
                "reason": "اختبار النظام",
                "severity": "🧪 تجريبي"
            },
            "user_id": admin["id"],
            "created_at": get_now(),
            "is_read": False
        }
        
        await db.notifications.insert_one(test_notification)
        
        # محاولة إرسال Push
        try:
            await send_push_to_user(
                user_id=admin["id"],
                title="🧪 تنبيه تجريبي",
                body="نظام التنبيهات الأمنية يعمل بشكل صحيح!",
                data={"type": "security_alert", "click_action": "/admin?tab=rate-limits"}
            )
            push_status = "تم إرسال Push Notification"
        except Exception as e:
            push_status = f"فشل إرسال Push: {str(e)[:50]}"
        
        return {
            "success": True,
            "message": "تم إرسال التنبيه التجريبي",
            "push_status": push_status,
            "notification_id": test_notification["id"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل إرسال التنبيه: {str(e)}")
