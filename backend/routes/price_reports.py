# /app/backend/routes/price_reports.py
# نظام الإبلاغ عن الأسعار المرتفعة والمخالفات

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

from core.database import db, get_current_user

router = APIRouter(prefix="/price-reports", tags=["Price Reports"])

# ============== Pydantic Models ==============

class PriceReportCreate(BaseModel):
    product_id: str
    product_type: str = "product"  # "product" or "food"
    reason: str
    suggested_price: Optional[float] = None
    comment: Optional[str] = None

class PriceReportResolve(BaseModel):
    status: str  # "approved", "rejected", "warning"
    admin_notes: Optional[str] = None
    violation_points: int = 0  # نقاط المخالفة للبائع

class ViolationPointsUpdate(BaseModel):
    points: int
    reason: str

# ============== Customer Endpoints ==============

@router.post("")
async def create_price_report(report: PriceReportCreate, user: dict = Depends(get_current_user)):
    """إنشاء بلاغ عن سعر مرتفع"""
    
    # التحقق من وجود المنتج
    if report.product_type == "food":
        product = await db.food_products.find_one({"id": report.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="المنتج غير موجود")
        store = await db.food_stores.find_one({"id": product.get("store_id")}, {"_id": 0})
        seller_id = store.get("owner_id") if store else product.get("seller_id")
        product_name = product.get("name", "")
        product_price = product.get("price", 0)
    else:
        product = await db.products.find_one({"id": report.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail="المنتج غير موجود")
        seller_id = product.get("seller_id")
        product_name = product.get("name", "")
        product_price = product.get("price", 0)
    
    # التحقق من عدم وجود بلاغ مكرر من نفس المستخدم لنفس المنتج
    existing = await db.price_reports.find_one({
        "reporter_id": user["id"],
        "product_id": report.product_id,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="لقد قمت بالإبلاغ عن هذا المنتج مسبقاً")
    
    report_id = str(uuid.uuid4())
    report_doc = {
        "id": report_id,
        "reporter_id": user["id"],
        "reporter_name": user.get("name", "مجهول"),  # لن يظهر للبائع
        "product_id": report.product_id,
        "product_type": report.product_type,
        "product_name": product_name,
        "product_price": product_price,
        "seller_id": seller_id,
        "reason": report.reason,
        "suggested_price": report.suggested_price,
        "comment": report.comment,
        "status": "pending",  # pending, approved, rejected, warning
        "admin_notes": None,
        "violation_points_assigned": 0,
        "resolved_at": None,
        "resolved_by": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.price_reports.insert_one(report_doc)
    
    return {
        "id": report_id,
        "message": "تم إرسال البلاغ بنجاح. سيتم مراجعته من قبل الإدارة."
    }

@router.get("/my-reports")
async def get_my_reports(user: dict = Depends(get_current_user)):
    """جلب بلاغات المستخدم الخاصة"""
    reports = await db.price_reports.find(
        {"reporter_id": user["id"]},
        {"_id": 0, "reporter_name": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return reports

# ============== Admin Endpoints ==============

@router.get("/admin/all")
async def get_all_reports(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = Query(default=20, le=50),
    user: dict = Depends(get_current_user)
):
    """جلب جميع البلاغات للأدمن"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    query = {}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    
    # جلب البلاغات بدون معلومات المبلّغ الشخصية
    reports = await db.price_reports.find(
        query,
        {"_id": 0, "reporter_name": 0}  # إخفاء اسم المبلّغ
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.price_reports.count_documents(query)
    
    # جلب جميع البائعين دفعة واحدة
    seller_ids = list(set(r.get("seller_id") for r in reports if r.get("seller_id")))
    if seller_ids:
        sellers_list = await db.users.find(
            {"id": {"$in": seller_ids}},
            {"_id": 0, "id": 1, "name": 1, "phone": 1, "violation_points": 1}
        ).to_list(None)
        sellers_map = {s["id"]: s for s in sellers_list}
        
        for report in reports:
            seller = sellers_map.get(report.get("seller_id"))
            if seller:
                report["seller_name"] = seller.get("name", "غير معروف")
                report["seller_violation_points"] = seller.get("violation_points", 0)
    
    return {
        "reports": reports,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.get("/admin/stats")
async def get_reports_stats(user: dict = Depends(get_current_user)):
    """إحصائيات البلاغات"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    pending = await db.price_reports.count_documents({"status": "pending"})
    approved = await db.price_reports.count_documents({"status": "approved"})
    rejected = await db.price_reports.count_documents({"status": "rejected"})
    warning = await db.price_reports.count_documents({"status": "warning"})
    total = pending + approved + rejected + warning
    
    return {
        "total": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "warning": warning
    }

@router.put("/admin/{report_id}/resolve")
async def resolve_report(
    report_id: str,
    resolution: PriceReportResolve,
    user: dict = Depends(get_current_user)
):
    """حل بلاغ سعر"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    report = await db.price_reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="البلاغ غير موجود")
    
    if report["status"] != "pending":
        raise HTTPException(status_code=400, detail="تم حل هذا البلاغ مسبقاً")
    
    # تحديث البلاغ
    await db.price_reports.update_one(
        {"id": report_id},
        {"$set": {
            "status": resolution.status,
            "admin_notes": resolution.admin_notes,
            "violation_points_assigned": resolution.violation_points,
            "resolved_at": datetime.now(timezone.utc).isoformat(),
            "resolved_by": user["id"]
        }}
    )
    
    # إضافة نقاط مخالفة للبائع إذا كان هناك
    if resolution.violation_points > 0:
        seller_id = report.get("seller_id")
        if seller_id:
            # تحديث نقاط المخالفة في جدول المستخدمين
            await db.users.update_one(
                {"id": seller_id},
                {"$inc": {"violation_points": resolution.violation_points}}
            )
            
            # تسجيل المخالفة في سجل المخالفات
            violation_id = str(uuid.uuid4())
            await db.seller_violations.insert_one({
                "id": violation_id,
                "seller_id": seller_id,
                "report_id": report_id,
                "points": resolution.violation_points,
                "reason": f"إبلاغ سعر مرتفع - {report.get('product_name', '')}",
                "admin_notes": resolution.admin_notes,
                "assigned_by": user["id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            # إرسال إشعار للبائع
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": seller_id,
                "type": "violation_warning",
                "title": "تحذير: مخالفة سعر",
                "message": f"تم تسجيل {resolution.violation_points} نقطة مخالفة على حسابك بسبب سعر مرتفع للمنتج: {report.get('product_name', '')}",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            # التحقق من تجاوز حد المخالفات للتعليق التلقائي
            seller = await db.users.find_one({"id": seller_id})
            if seller:
                total_points = seller.get("violation_points", 0) + resolution.violation_points
                
                # إذا تجاوز 10 نقاط = تعليق تلقائي
                if total_points >= 10:
                    await db.users.update_one(
                        {"id": seller_id},
                        {"$set": {
                            "is_suspended": True,
                            "suspension_reason": "تجاوز حد نقاط المخالفات (10 نقاط)",
                            "suspended_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    await db.notifications.insert_one({
                        "id": str(uuid.uuid4()),
                        "user_id": seller_id,
                        "type": "account_suspended",
                        "title": "تم تعليق حسابك",
                        "message": "تم تعليق حسابك تلقائياً بسبب تجاوز حد نقاط المخالفات. يرجى التواصل مع الإدارة.",
                        "is_read": False,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
    
    return {"message": "تم حل البلاغ بنجاح"}

# ============== Seller Endpoints ==============

@router.get("/seller/my-violations")
async def get_seller_violations(user: dict = Depends(get_current_user)):
    """جلب مخالفات البائع"""
    if user["user_type"] not in ["seller", "food_seller"]:
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    violations = await db.seller_violations.find(
        {"seller_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    total_points = user.get("violation_points", 0)
    
    return {
        "violations": violations,
        "total_points": total_points,
        "warning_threshold": 5,  # تحذير عند 5 نقاط
        "suspension_threshold": 10  # تعليق عند 10 نقاط
    }

# ============== Admin Seller Management ==============

@router.get("/admin/sellers-with-violations")
async def get_sellers_with_violations(
    min_points: int = 1,
    page: int = 1,
    limit: int = Query(default=20, le=50),
    user: dict = Depends(get_current_user)
):
    """جلب البائعين الذين لديهم نقاط مخالفات"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    skip = (page - 1) * limit
    
    sellers = await db.users.find(
        {
            "user_type": {"$in": ["seller", "food_seller"]},
            "violation_points": {"$gte": min_points}
        },
        {
            "_id": 0,
            "id": 1,
            "name": 1,
            "phone": 1,
            "user_type": 1,
            "violation_points": 1,
            "is_suspended": 1,
            "suspension_reason": 1
        }
    ).sort("violation_points", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.users.count_documents({
        "user_type": {"$in": ["seller", "food_seller"]},
        "violation_points": {"$gte": min_points}
    })
    
    return {
        "sellers": sellers,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.put("/admin/seller/{seller_id}/update-points")
async def update_seller_violation_points(
    seller_id: str,
    update: ViolationPointsUpdate,
    user: dict = Depends(get_current_user)
):
    """تحديث نقاط مخالفات البائع يدوياً"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    seller = await db.users.find_one({"id": seller_id})
    if not seller:
        raise HTTPException(status_code=404, detail="البائع غير موجود")
    
    new_points = max(0, seller.get("violation_points", 0) + update.points)
    
    await db.users.update_one(
        {"id": seller_id},
        {"$set": {"violation_points": new_points}}
    )
    
    # تسجيل التغيير
    await db.seller_violations.insert_one({
        "id": str(uuid.uuid4()),
        "seller_id": seller_id,
        "report_id": None,
        "points": update.points,
        "reason": update.reason,
        "admin_notes": "تعديل يدوي بواسطة الأدمن",
        "assigned_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "تم تحديث نقاط المخالفات", "new_total": new_points}

@router.put("/admin/seller/{seller_id}/suspend")
async def suspend_seller(seller_id: str, reason: str = "مخالفة الأسعار", user: dict = Depends(get_current_user)):
    """تعليق حساب البائع"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.users.update_one(
        {"id": seller_id},
        {"$set": {
            "is_suspended": True,
            "suspension_reason": reason,
            "suspended_at": datetime.now(timezone.utc).isoformat(),
            "suspended_by": user["id"]
        }}
    )
    
    # إرسال إشعار
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": seller_id,
        "type": "account_suspended",
        "title": "تم تعليق حسابك",
        "message": f"تم تعليق حسابك. السبب: {reason}",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "تم تعليق حساب البائع"}

@router.put("/admin/seller/{seller_id}/unsuspend")
async def unsuspend_seller(seller_id: str, user: dict = Depends(get_current_user)):
    """إلغاء تعليق حساب البائع"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.users.update_one(
        {"id": seller_id},
        {"$set": {
            "is_suspended": False,
            "suspension_reason": None,
            "suspended_at": None,
            "suspended_by": None
        }}
    )
    
    # إرسال إشعار
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": seller_id,
        "type": "account_unsuspended",
        "title": "تم إلغاء تعليق حسابك",
        "message": "تم إلغاء تعليق حسابك. يمكنك الآن البيع مجدداً.",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "تم إلغاء تعليق حساب البائع"}


# ============== Store Price Rating ==============

@router.get("/store/{store_id}/rating")
async def get_store_price_rating(store_id: str):
    """
    الحصول على تقييم أسعار المتجر بناءً على البلاغات
    
    Returns:
        - rating: تقييم من 1-5 (5 = أسعار ممتازة)
        - total_reports: إجمالي البلاغات
        - approved_reports: البلاغات المعتمدة (أسعار مرتفعة فعلاً)
        - status: حالة المتجر من حيث الأسعار
    """
    # جلب المتجر
    store = await db.food_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    seller_id = store.get("owner_id")
    
    # جلب البلاغات المتعلقة بمنتجات هذا المتجر
    pipeline = [
        {
            "$match": {
                "seller_id": seller_id,
                "product_type": "food"
            }
        },
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }
        }
    ]
    
    stats = await db.price_reports.aggregate(pipeline).to_list(length=10)
    
    total_reports = 0
    approved_reports = 0
    rejected_reports = 0
    
    for stat in stats:
        total_reports += stat["count"]
        if stat["_id"] == "approved":
            approved_reports = stat["count"]
        elif stat["_id"] == "rejected":
            rejected_reports = stat["count"]
    
    # حساب التقييم (5 = لا توجد بلاغات، 1 = كثير من البلاغات المعتمدة)
    # البلاغات المعتمدة = أسعار مرتفعة فعلاً
    if total_reports == 0:
        rating = 5.0  # لا توجد بلاغات = أسعار جيدة
        status = "excellent"
        status_text = "أسعار ممتازة"
    elif approved_reports == 0:
        rating = 4.5  # كل البلاغات مرفوضة = أسعار جيدة
        status = "good"
        status_text = "أسعار جيدة"
    else:
        # حساب نسبة البلاغات المعتمدة
        approval_rate = approved_reports / total_reports
        rating = max(1.0, 5.0 - (approval_rate * 4))
        
        if rating >= 4:
            status = "good"
            status_text = "أسعار جيدة"
        elif rating >= 3:
            status = "average"
            status_text = "أسعار متوسطة"
        elif rating >= 2:
            status = "high"
            status_text = "أسعار مرتفعة قليلاً"
        else:
            status = "very_high"
            status_text = "أسعار مرتفعة"
    
    # جلب نقاط المخالفة للبائع
    seller = await db.users.find_one({"id": seller_id}, {"_id": 0, "violation_points": 1})
    violation_points = seller.get("violation_points", 0) if seller else 0
    
    return {
        "store_id": store_id,
        "rating": round(rating, 1),
        "total_reports": total_reports,
        "approved_reports": approved_reports,
        "rejected_reports": rejected_reports,
        "status": status,
        "status_text": status_text,
        "violation_points": violation_points,
        "show_warning": violation_points >= 5 or approved_reports >= 3
    }

@router.get("/seller/{seller_id}/price-stats")
async def get_seller_price_stats(seller_id: str):
    """
    إحصائيات الأسعار للبائع (للوحة البائع)
    """
    # إجمالي البلاغات
    total = await db.price_reports.count_documents({"seller_id": seller_id})
    approved = await db.price_reports.count_documents({"seller_id": seller_id, "status": "approved"})
    pending = await db.price_reports.count_documents({"seller_id": seller_id, "status": "pending"})
    
    # نقاط المخالفة
    seller = await db.users.find_one({"id": seller_id}, {"_id": 0, "violation_points": 1})
    violation_points = seller.get("violation_points", 0) if seller else 0
    
    # آخر البلاغات
    recent = await db.price_reports.find(
        {"seller_id": seller_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_reports": total,
        "approved_reports": approved,
        "pending_reports": pending,
        "violation_points": violation_points,
        "max_points": 15,  # الحد الأقصى قبل التعليق
        "recent_reports": recent,
        "warning": violation_points >= 10
    }
