# /app/backend/routes/error_logs.py
# نظام تسجيل الأخطاء المركزي

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import traceback

from core.database import db, get_current_user

router = APIRouter(prefix="/errors", tags=["Error Logs"])


# ==================== Models ====================

class ErrorLogCreate(BaseModel):
    """نموذج إنشاء سجل خطأ"""
    error_type: str  # frontend, backend, api, payment, etc.
    error_message: str
    error_stack: Optional[str] = None
    url: Optional[str] = None
    user_agent: Optional[str] = None
    component: Optional[str] = None  # اسم المكون أو الملف
    additional_data: Optional[dict] = None


class ErrorLogResponse(BaseModel):
    """نموذج استجابة سجل خطأ"""
    id: str
    error_type: str
    error_message: str
    error_stack: Optional[str]
    url: Optional[str]
    user_agent: Optional[str]
    component: Optional[str]
    user_id: Optional[str]
    user_phone: Optional[str]
    ip_address: Optional[str]
    created_at: str
    is_resolved: bool
    resolved_at: Optional[str]
    resolved_by: Optional[str]
    occurrence_count: int


# ==================== Helper Functions ====================

async def get_client_ip(request: Request) -> str:
    """استخراج IP العميل"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def log_error_to_db(
    error_type: str,
    error_message: str,
    error_stack: Optional[str] = None,
    url: Optional[str] = None,
    user_agent: Optional[str] = None,
    component: Optional[str] = None,
    user_id: Optional[str] = None,
    user_phone: Optional[str] = None,
    ip_address: Optional[str] = None,
    additional_data: Optional[dict] = None
) -> str:
    """حفظ الخطأ في قاعدة البيانات"""
    
    # البحث عن خطأ مشابه (نفس الرسالة والنوع) خلال آخر 24 ساعة
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    
    existing_error = await db.error_logs.find_one({
        "error_type": error_type,
        "error_message": error_message,
        "component": component,
        "created_at": {"$gte": yesterday}
    })
    
    if existing_error:
        # تحديث عداد التكرار
        await db.error_logs.update_one(
            {"id": existing_error["id"]},
            {
                "$inc": {"occurrence_count": 1},
                "$set": {"last_occurrence": datetime.now(timezone.utc).isoformat()}
            }
        )
        return existing_error["id"]
    
    # إنشاء سجل جديد
    error_id = str(uuid.uuid4())
    error_log = {
        "id": error_id,
        "error_type": error_type,
        "error_message": error_message[:2000],  # تحديد طول الرسالة
        "error_stack": error_stack[:5000] if error_stack else None,
        "url": url,
        "user_agent": user_agent,
        "component": component,
        "user_id": user_id,
        "user_phone": user_phone,
        "ip_address": ip_address,
        "additional_data": additional_data,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_occurrence": datetime.now(timezone.utc).isoformat(),
        "is_resolved": False,
        "resolved_at": None,
        "resolved_by": None,
        "occurrence_count": 1
    }
    
    await db.error_logs.insert_one(error_log)
    return error_id


# ==================== API Endpoints ====================

@router.post("/log")
async def create_error_log(
    error: ErrorLogCreate,
    request: Request
) -> dict:
    """تسجيل خطأ جديد (من Frontend أو أي مصدر)"""
    
    # استخراج معلومات المستخدم إن وجدت
    user_id = None
    user_phone = None
    
    try:
        # محاولة جلب المستخدم من الـ cookie
        from core.auth_cookies import get_user_from_cookie
        user = await get_user_from_cookie(request)
        if user:
            user_id = user.get("id")
            user_phone = user.get("phone")
    except Exception:
        pass
    
    ip_address = await get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "")
    
    error_id = await log_error_to_db(
        error_type=error.error_type,
        error_message=error.error_message,
        error_stack=error.error_stack,
        url=error.url or str(request.url),
        user_agent=user_agent,
        component=error.component,
        user_id=user_id,
        user_phone=user_phone,
        ip_address=ip_address,
        additional_data=error.additional_data
    )
    
    return {"success": True, "error_id": error_id}


@router.get("/list")
async def get_error_logs(
    user: dict = Depends(get_current_user),
    error_type: Optional[str] = None,
    is_resolved: Optional[bool] = None,
    limit: int = 50,
    skip: int = 0
) -> dict:
    """جلب قائمة الأخطاء (للأدمن فقط)"""
    
    if user.get("user_type") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    query = {}
    if error_type:
        query["error_type"] = error_type
    if is_resolved is not None:
        query["is_resolved"] = is_resolved
    
    total = await db.error_logs.count_documents(query)
    
    errors = await db.error_logs.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(None)
    
    return {
        "errors": errors,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/stats")
async def get_error_stats(
    user: dict = Depends(get_current_user)
) -> dict:
    """إحصائيات الأخطاء (للأدمن فقط)"""
    
    if user.get("user_type") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # إحصائيات عامة
    total_errors = await db.error_logs.count_documents({})
    unresolved_errors = await db.error_logs.count_documents({"is_resolved": False})
    
    # أخطاء اليوم
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    today_errors = await db.error_logs.count_documents({"created_at": {"$gte": today_start}})
    
    # أخطاء الأسبوع
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    week_errors = await db.error_logs.count_documents({"created_at": {"$gte": week_ago}})
    
    # توزيع حسب النوع
    pipeline = [
        {"$group": {"_id": "$error_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_type = await db.error_logs.aggregate(pipeline).to_list(None)
    
    # أكثر الأخطاء تكراراً
    most_common = await db.error_logs.find(
        {"is_resolved": False},
        {"_id": 0, "id": 1, "error_type": 1, "error_message": 1, "component": 1, "occurrence_count": 1}
    ).sort("occurrence_count", -1).limit(10).to_list(None)
    
    return {
        "total_errors": total_errors,
        "unresolved_errors": unresolved_errors,
        "today_errors": today_errors,
        "week_errors": week_errors,
        "by_type": {item["_id"]: item["count"] for item in by_type},
        "most_common": most_common
    }


@router.post("/{error_id}/resolve")
async def resolve_error(
    error_id: str,
    user: dict = Depends(get_current_user)
) -> dict:
    """تحديد الخطأ كـ 'تم حله'"""
    
    if user.get("user_type") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    result = await db.error_logs.update_one(
        {"id": error_id},
        {
            "$set": {
                "is_resolved": True,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
                "resolved_by": user.get("id")
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="الخطأ غير موجود")
    
    return {"success": True}


@router.delete("/{error_id}")
async def delete_error(
    error_id: str,
    user: dict = Depends(get_current_user)
) -> dict:
    """حذف سجل خطأ"""
    
    if user.get("user_type") != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin فقط")
    
    result = await db.error_logs.delete_one({"id": error_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الخطأ غير موجود")
    
    return {"success": True}


@router.delete("/cleanup/old")
async def cleanup_old_errors(
    days: int = 30,
    user: dict = Depends(get_current_user)
) -> dict:
    """حذف الأخطاء القديمة (المحلولة فقط)"""
    
    if user.get("user_type") != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin فقط")
    
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    result = await db.error_logs.delete_many({
        "is_resolved": True,
        "created_at": {"$lt": cutoff_date}
    })
    
    return {"success": True, "deleted_count": result.deleted_count}
