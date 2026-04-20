# /app/backend/routes/rate_limits.py
# API endpoints لإدارة ومراقبة Rate Limiting

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.database import get_current_admin
from core.rate_limiter import rate_limiter, RATE_LIMITS

router = APIRouter(prefix="/rate-limits", tags=["Rate Limits"])


class UnblockRequest(BaseModel):
    ip: str


@router.get("/stats")
async def get_rate_limit_stats(admin: dict = Depends(get_current_admin)):
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
async def get_blocked_ips(admin: dict = Depends(get_current_admin)):
    """
    جلب قائمة IPs المحظورة حالياً
    """
    return {
        "blocked_ips": rate_limiter.get_blocked_ips(),
        "total": len(rate_limiter.get_blocked_ips())
    }


@router.post("/unblock")
async def unblock_ip(data: UnblockRequest, admin: dict = Depends(get_current_admin)):
    """
    إلغاء حظر IP يدوياً
    """
    success = rate_limiter.unblock_ip(data.ip)
    
    if success:
        return {"message": f"تم إلغاء حظر {data.ip} بنجاح"}
    else:
        raise HTTPException(status_code=404, detail="IP غير موجود في قائمة المحظورين")


@router.get("/config")
async def get_rate_limit_config(admin: dict = Depends(get_current_admin)):
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
async def clear_stats(admin: dict = Depends(get_current_admin)):
    """
    مسح إحصائيات Rate Limiting (للمدير فقط)
    """
    # التحقق أنه admin وليس sub_admin
    if admin.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="هذا الإجراء للمدير الرئيسي فقط")
    
    rate_limiter.clear_stats()
    return {"message": "تم مسح الإحصائيات بنجاح"}
