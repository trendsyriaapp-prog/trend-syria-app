# /app/backend/routes/activity_log.py
# سجل نشاط المسؤولين

from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

from core.database import db, get_current_user

router = APIRouter(prefix="/activity-log", tags=["Activity Log"])


# دالة مساعدة لتسجيل النشاط
async def log_admin_activity(
    admin_id: str,
    admin_name: str,
    action: str,
    action_type: str,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    target_name: Optional[str] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None
):
    """تسجيل نشاط مسؤول"""
    
    log_entry = {
        "id": str(uuid.uuid4()),
        "admin_id": admin_id,
        "admin_name": admin_name,
        "action": action,
        "action_type": action_type,  # user, order, product, settings, payment, etc.
        "target_type": target_type,
        "target_id": target_id,
        "target_name": target_name,
        "details": details,
        "ip_address": ip_address,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.admin_activity_logs.insert_one(log_entry)
    return log_entry["id"]


# ============== APIs ==============

@router.get("/")
async def get_activity_logs(
    action_type: Optional[str] = None,
    admin_id: Optional[str] = None,
    target_type: Optional[str] = None,
    days: int = Query(7, ge=1, le=90),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: dict = Depends(get_current_user)
):
    """جلب سجلات النشاط (للمدراء فقط)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # حساب تاريخ البداية
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    query = {"created_at": {"$gte": start_date.isoformat()}}
    
    if action_type:
        query["action_type"] = action_type
    if admin_id:
        query["admin_id"] = admin_id
    if target_type:
        query["target_type"] = target_type
    
    skip = (page - 1) * limit
    
    logs = await db.admin_activity_logs.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.admin_activity_logs.count_documents(query)
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/stats")
async def get_activity_stats(
    days: int = Query(7, ge=1, le=90),
    user: dict = Depends(get_current_user)
):
    """إحصائيات النشاط (للمدراء فقط)"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    query = {"created_at": {"$gte": start_date.isoformat()}}
    
    total = await db.admin_activity_logs.count_documents(query)
    
    # بحسب نوع الإجراء
    by_type_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$action_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_type = await db.admin_activity_logs.aggregate(by_type_pipeline).to_list(20)
    
    # بحسب المسؤول
    by_admin_pipeline = [
        {"$match": query},
        {"$group": {"_id": {"id": "$admin_id", "name": "$admin_name"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    by_admin = await db.admin_activity_logs.aggregate(by_admin_pipeline).to_list(10)
    
    # النشاط اليومي
    daily_pipeline = [
        {"$match": query},
        {"$project": {
            "date": {"$dateToString": {"format": "%Y-%m-%d", "date": {"$dateFromString": {"dateString": "$created_at"}}}}
        }},
        {"$group": {"_id": "$date", "count": {"$sum": 1}}},
        {"$sort": {"_id": -1}},
        {"$limit": days}
    ]
    daily = await db.admin_activity_logs.aggregate(daily_pipeline).to_list(days)
    
    return {
        "total": total,
        "by_type": {item["_id"]: item["count"] for item in by_type},
        "by_admin": [
            {"admin_id": item["_id"]["id"], "admin_name": item["_id"]["name"], "count": item["count"]}
            for item in by_admin
        ],
        "daily": [{"date": item["_id"], "count": item["count"]} for item in daily]
    }


@router.get("/admins")
async def get_admins_list(user: dict = Depends(get_current_user)):
    """قائمة المسؤولين للفلترة"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    admins = await db.users.find(
        {"user_type": {"$in": ["admin", "sub_admin"]}},
        {"_id": 0, "id": 1, "name": 1, "full_name": 1}
    ).to_list(100)
    
    return {
        "admins": [
            {"id": a["id"], "name": a.get("full_name") or a.get("name", "مسؤول")}
            for a in admins
        ]
    }


# ============== أنواع الإجراءات ==============
ACTION_TYPES = {
    "user": "المستخدمين",
    "order": "الطلبات",
    "product": "المنتجات",
    "store": "المتاجر",
    "payment": "المدفوعات",
    "settings": "الإعدادات",
    "coupon": "الكوبونات",
    "driver": "السائقين",
    "support": "الدعم",
    "other": "أخرى"
}


@router.get("/action-types")
async def get_action_types(user: dict = Depends(get_current_user)):
    """قائمة أنواع الإجراءات للفلترة"""
    
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    return {"action_types": ACTION_TYPES}
