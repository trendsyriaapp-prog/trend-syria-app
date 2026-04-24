# /app/backend/routes/discounts.py
# نظام العروض والخصومات

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from core.database import db, get_current_user

router = APIRouter(prefix="/discounts", tags=["Discounts"])

class CreateDiscountRequest(BaseModel):
    name: str                          # اسم العرض
    discount_type: str                 # percentage, fixed
    discount_value: float              # قيمة الخصم
    code: Optional[str] = None         # كود الخصم (اختياري)
    applies_to: str                    # all, specific_products, category
    product_ids: Optional[List[str]] = []  # المنتجات المحددة
    category: Optional[str] = None     # الفئة
    min_order_amount: Optional[float] = 0  # الحد الأدنى للطلب
    max_uses: Optional[int] = None     # الحد الأقصى للاستخدام
    start_date: str                    # تاريخ البداية
    end_date: str                      # تاريخ النهاية

class ApplyCouponRequest(BaseModel):
    code: str
    cart_total: float
    product_ids: List[str]

# إنشاء خصم جديد
@router.post("/create")
async def create_discount(
    data: CreateDiscountRequest,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """إنشاء خصم جديد"""
    
    if current_user.get("user_type") != "seller":
        raise HTTPException(status_code=403, detail="فقط البائعين يمكنهم إنشاء خصومات")
    
    seller_id = current_user.get("id")
    
    # التحقق من كود الخصم إن وجد
    if data.code:
        existing = await db.discounts.find_one({
            "code": data.code.upper(),
            "seller_id": seller_id,
            "is_active": True
        })
        if existing:
            raise HTTPException(status_code=400, detail="كود الخصم مستخدم بالفعل")
    
    # إنشاء الخصم
    discount = {
        "id": str(uuid.uuid4()),
        "seller_id": seller_id,
        "seller_name": current_user.get("name", ""),
        "name": data.name,
        "discount_type": data.discount_type,
        "discount_value": data.discount_value,
        "code": data.code.upper() if data.code else None,
        "applies_to": data.applies_to,
        "product_ids": data.product_ids or [],
        "category": data.category,
        "min_order_amount": data.min_order_amount or 0,
        "max_uses": data.max_uses,
        "used_count": 0,
        "start_date": datetime.fromisoformat(data.start_date.replace('Z', '+00:00')),
        "end_date": datetime.fromisoformat(data.end_date.replace('Z', '+00:00')),
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    await db.discounts.insert_one(discount)
    
    # إزالة _id
    discount.pop("_id", None)
    
    return {"message": "تم إنشاء العرض بنجاح", "discount": discount}

# الحصول على خصومات البائع
@router.get("/my-discounts")
async def get_my_discounts(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """الحصول على خصومات البائع"""
    
    if current_user.get("user_type") != "seller":
        raise HTTPException(status_code=403, detail="فقط البائعين")
    
    seller_id = current_user.get("id")
    
    discounts = await db.discounts.find(
        {"seller_id": seller_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    
    # تحديث حالة الخصومات المنتهية
    now = datetime.utcnow()
    for d in discounts:
        if d.get("is_active") and d.get("end_date") and d["end_date"] < now:
            await db.discounts.update_one(
                {"id": d["id"]},
                {"$set": {"is_active": False}}
            )
            d["is_active"] = False
    
    return discounts

# تفعيل/إيقاف خصم
@router.put("/{discount_id}/toggle")
async def toggle_discount(
    discount_id: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """تفعيل أو إيقاف خصم"""
    
    if current_user.get("user_type") != "seller":
        raise HTTPException(status_code=403, detail="فقط البائعين")
    
    discount = await db.discounts.find_one({
        "id": discount_id,
        "seller_id": current_user.get("id")
    })
    
    if not discount:
        raise HTTPException(status_code=404, detail="الخصم غير موجود")
    
    new_status = not discount.get("is_active", True)
    
    await db.discounts.update_one(
        {"id": discount_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {"message": "تم التحديث", "is_active": new_status}

# حذف خصم
@router.delete("/{discount_id}")
async def delete_discount(
    discount_id: str,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """حذف خصم"""
    
    if current_user.get("user_type") != "seller":
        raise HTTPException(status_code=403, detail="فقط البائعين")
    
    result = await db.discounts.delete_one({
        "id": discount_id,
        "seller_id": current_user.get("id")
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الخصم غير موجود")
    
    return {"message": "تم حذف الخصم"}

# الحصول على الخصومات النشطة لمنتج
@router.get("/product/{product_id}")
async def get_product_discounts(product_id: str) -> dict:
    """الحصول على الخصومات النشطة لمنتج معين"""
    
    now = datetime.utcnow()
    
    # جلب المنتج
    product = await db.products.find_one({"id": product_id})
    if not product:
        return {"discounts": [], "best_discount": None}
    
    seller_id = product.get("seller_id")
    category = product.get("category")
    
    # البحث عن الخصومات النشطة
    discounts = await db.discounts.find({
        "seller_id": seller_id,
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now},
        "$or": [
            {"applies_to": "all"},
            {"applies_to": "specific_products", "product_ids": product_id},
            {"applies_to": "category", "category": category}
        ]
    }, {"_id": 0}).to_list(length=10)
    
    # فلترة الخصومات التي وصلت للحد الأقصى
    valid_discounts = []
    for d in discounts:
        if d.get("max_uses") is None or d.get("used_count", 0) < d.get("max_uses"):
            valid_discounts.append(d)
    
    # تحديد أفضل خصم
    best_discount = None
    if valid_discounts:
        # ترتيب حسب قيمة الخصم (الأعلى أولاً)
        sorted_discounts = sorted(
            valid_discounts, 
            key=lambda x: x.get("discount_value", 0), 
            reverse=True
        )
        best_discount = sorted_discounts[0]
    
    return {
        "discounts": valid_discounts,
        "best_discount": best_discount
    }

# التحقق من كوبون وتطبيقه
@router.post("/apply-coupon")
async def apply_coupon(
    data: ApplyCouponRequest,
    current_user: dict = Depends(get_current_user)
) -> dict:
    """التحقق من كوبون وتطبيقه"""
    
    now = datetime.utcnow()
    code = data.code.upper().strip()
    
    # البحث عن الكوبون
    discount = await db.discounts.find_one({
        "code": code,
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }, {"_id": 0})
    
    if not discount:
        raise HTTPException(status_code=404, detail="كود الخصم غير صالح أو منتهي")
    
    # التحقق من الحد الأقصى للاستخدام
    if discount.get("max_uses") and discount.get("used_count", 0) >= discount.get("max_uses"):
        raise HTTPException(status_code=400, detail="تم استنفاد عدد مرات استخدام هذا الكود")
    
    # التحقق من الحد الأدنى للطلب
    if data.cart_total < discount.get("min_order_amount", 0):
        min_amount = discount.get("min_order_amount", 0)
        raise HTTPException(
            status_code=400, 
            detail=f"الحد الأدنى للطلب {min_amount:,.0f} ل.س"
        )
    
    # التحقق من أن الكوبون ينطبق على منتجات السلة
    applies_to = discount.get("applies_to")
    seller_id = discount.get("seller_id")
    
    # جلب منتجات السلة للتحقق
    cart_products = await db.products.find(
        {"id": {"$in": data.product_ids}},
        {"_id": 0, "id": 1, "seller_id": 1, "category": 1, "price": 1}
    ).to_list(length=100)
    
    # حساب المبلغ المؤهل للخصم
    eligible_amount = 0
    for p in cart_products:
        if p.get("seller_id") != seller_id:
            continue
        
        if applies_to == "all":
            eligible_amount += p.get("price", 0)
        elif applies_to == "specific_products" and p.get("id") in discount.get("product_ids", []):
            eligible_amount += p.get("price", 0)
        elif applies_to == "category" and p.get("category") == discount.get("category"):
            eligible_amount += p.get("price", 0)
    
    if eligible_amount == 0:
        raise HTTPException(status_code=400, detail="الكوبون لا ينطبق على منتجات سلتك")
    
    # حساب قيمة الخصم
    if discount.get("discount_type") == "percentage":
        discount_amount = eligible_amount * (discount.get("discount_value", 0) / 100)
    else:
        discount_amount = min(discount.get("discount_value", 0), eligible_amount)
    
    return {
        "valid": True,
        "discount": discount,
        "discount_amount": round(discount_amount),
        "message": f"تم تطبيق خصم {discount.get('name')}"
    }

# استخدام الكوبون (يُستدعى عند إتمام الطلب)
@router.post("/use-coupon/{code}")
async def use_coupon(code: str) -> dict:
    """تسجيل استخدام الكوبون"""
    
    result = await db.discounts.update_one(
        {"code": code.upper()},
        {"$inc": {"used_count": 1}}
    )
    
    return {"success": result.modified_count > 0}

# الحصول على جميع العروض النشطة (للعملاء)
@router.get("/active")
async def get_active_discounts(
    seller_id: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20
) -> dict:
    """الحصول على العروض النشطة"""
    
    now = datetime.utcnow()
    
    query = {
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    }
    
    if seller_id:
        query["seller_id"] = seller_id
    
    if category:
        query["$or"] = [
            {"applies_to": "all"},
            {"applies_to": "category", "category": category}
        ]
    
    discounts = await db.discounts.find(query, {"_id": 0}).limit(limit).to_list(length=limit)
    
    # فلترة الخصومات التي وصلت للحد الأقصى
    valid_discounts = []
    for d in discounts:
        if d.get("max_uses") is None or d.get("used_count", 0) < d.get("max_uses"):
            valid_discounts.append(d)
    
    return valid_discounts

# إحصائيات الخصومات للبائع
@router.get("/my-stats")
async def get_discount_stats(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """إحصائيات الخصومات للبائع"""
    
    if current_user.get("user_type") != "seller":
        raise HTTPException(status_code=403, detail="فقط البائعين")
    
    seller_id = current_user.get("id")
    now = datetime.utcnow()
    
    # إجمالي الخصومات
    total = await db.discounts.count_documents({"seller_id": seller_id})
    
    # الخصومات النشطة
    active = await db.discounts.count_documents({
        "seller_id": seller_id,
        "is_active": True,
        "start_date": {"$lte": now},
        "end_date": {"$gte": now}
    })
    
    # إجمالي الاستخدامات
    pipeline = [
        {"$match": {"seller_id": seller_id}},
        {"$group": {"_id": None, "total_uses": {"$sum": "$used_count"}}}
    ]
    result = await db.discounts.aggregate(pipeline).to_list(length=1)
    total_uses = result[0]["total_uses"] if result else 0
    
    return {
        "total_discounts": total,
        "active_discounts": active,
        "total_uses": total_uses
    }
