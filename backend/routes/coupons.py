# /app/backend/routes/coupons.py
# نظام كوبونات الخصم

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
import uuid

from core.database import db, get_current_user
from helpers.datetime_helpers import get_now

router = APIRouter(prefix="/coupons", tags=["Coupons"])

# أنواع الكوبونات
COUPON_TYPES = {
    "percentage": "نسبة مئوية",
    "fixed": "مبلغ ثابت",
    "free_delivery": "توصيل مجاني"
}

# نطاق الكوبون
COUPON_SCOPES = {
    "all": "جميع المنتجات",
    "food": "قسم الطعام فقط",
    "shop": "المتجر العام فقط",
    "store": "متجر محدد",
    "category": "فئة محددة",
    "product": "منتج محدد"
}


# ===============================
# APIs للمدير
# ===============================

@router.get("/admin/list")
async def get_all_coupons(
    status: str = "all",  # all, active, expired, disabled
    user: dict = Depends(get_current_user)
) -> dict:
    """جلب جميع الكوبونات للمدير"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    now = get_now()
    query = {}
    
    if status == "active":
        query["is_active"] = True
        query["$or"] = [
            {"end_date": None},
            {"end_date": {"$gte": now}}
        ]
    elif status == "expired":
        query["end_date"] = {"$lt": now}
    elif status == "disabled":
        query["is_active"] = False
    
    coupons = await db.coupons.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # إحصائيات
    stats = {
        "total": await db.coupons.count_documents({}),
        "active": await db.coupons.count_documents({
            "is_active": True,
            "$or": [{"end_date": None}, {"end_date": {"$gte": now}}]
        }),
        "total_uses": sum(c.get("usage_count", 0) for c in coupons),
        "total_savings": sum(c.get("total_discount_given", 0) for c in coupons)
    }
    
    return {"coupons": coupons, "stats": stats}


@router.post("/admin/create")
async def create_coupon(coupon_data: dict, user: dict = Depends(get_current_user)) -> dict:
    """إنشاء كوبون جديد"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    code = coupon_data.get("code", "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="كود الكوبون مطلوب")
    
    # التحقق من عدم وجود كوبون بنفس الكود
    existing = await db.coupons.find_one({"code": code})
    if existing:
        raise HTTPException(status_code=400, detail="هذا الكود مستخدم مسبقاً")
    
    coupon_type = coupon_data.get("coupon_type", "percentage")
    if coupon_type not in COUPON_TYPES:
        raise HTTPException(status_code=400, detail="نوع كوبون غير صالح")
    
    now = get_now()
    
    coupon = {
        "id": str(uuid.uuid4()),
        "code": code,
        "name": coupon_data.get("name", code),
        "description": coupon_data.get("description", ""),
        "coupon_type": coupon_type,
        "coupon_type_label": COUPON_TYPES[coupon_type],
        
        # قيمة الخصم
        "discount_percentage": coupon_data.get("discount_percentage", 0),  # للنسبة المئوية
        "discount_amount": coupon_data.get("discount_amount", 0),  # للمبلغ الثابت
        "max_discount": coupon_data.get("max_discount"),  # الحد الأقصى للخصم
        
        # الشروط
        "min_order_amount": coupon_data.get("min_order_amount", 0),  # الحد الأدنى للطلب
        "scope": coupon_data.get("scope", "all"),  # نطاق الكوبون
        "scope_ids": coupon_data.get("scope_ids", []),  # IDs للمتاجر/الفئات/المنتجات
        
        # الصلاحية
        "start_date": coupon_data.get("start_date"),
        "end_date": coupon_data.get("end_date"),
        "max_uses": coupon_data.get("max_uses"),  # عدد مرات الاستخدام الكلي
        "max_uses_per_user": coupon_data.get("max_uses_per_user", 1),  # لكل مستخدم
        
        # للعملاء الجدد فقط
        "new_customers_only": coupon_data.get("new_customers_only", False),
        
        # الحالة
        "is_active": coupon_data.get("is_active", True),
        "usage_count": 0,
        "total_discount_given": 0,
        
        # التتبع
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.coupons.insert_one(coupon)
    del coupon["_id"]
    
    return {"message": "تم إنشاء الكوبون بنجاح", "coupon": coupon}


@router.put("/admin/{coupon_id}")
async def update_coupon(coupon_id: str, coupon_data: dict, user: dict = Depends(get_current_user)) -> dict:
    """تحديث كوبون"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    coupon = await db.coupons.find_one({"id": coupon_id})
    if not coupon:
        raise HTTPException(status_code=404, detail="الكوبون غير موجود")
    
    # الحقول المسموح تحديثها
    allowed_fields = [
        "name", "description", "discount_percentage", "discount_amount",
        "max_discount", "min_order_amount", "scope", "scope_ids",
        "start_date", "end_date", "max_uses", "max_uses_per_user",
        "new_customers_only", "is_active"
    ]
    
    update = {k: v for k, v in coupon_data.items() if k in allowed_fields}
    update["updated_at"] = get_now()
    
    await db.coupons.update_one({"id": coupon_id}, {"$set": update})
    
    return {"message": "تم تحديث الكوبون"}


@router.delete("/admin/{coupon_id}")
async def delete_coupon(coupon_id: str, user: dict = Depends(get_current_user)) -> dict:
    """حذف كوبون"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.coupons.delete_one({"id": coupon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الكوبون غير موجود")
    
    return {"message": "تم حذف الكوبون"}


@router.get("/admin/{coupon_id}/usage")
async def get_coupon_usage(coupon_id: str, user: dict = Depends(get_current_user)) -> dict:
    """جلب سجل استخدام كوبون"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    usage = await db.coupon_usage.find(
        {"coupon_id": coupon_id},
        {"_id": 0}
    ).sort("used_at", -1).to_list(100)
    
    return usage


# ===============================
# APIs للعملاء
# ===============================

@router.post("/validate")
async def validate_coupon(
    data: dict,
    user: dict = Depends(get_current_user)
) -> dict:
    """التحقق من صلاحية كوبون وحساب الخصم"""
    code = data.get("code", "").strip().upper()
    order_amount = data.get("order_amount", 0)
    order_type = data.get("order_type", "food")  # food أو shop
    store_id = data.get("store_id")
    category = data.get("category")
    product_ids = data.get("product_ids", [])
    
    if not code:
        raise HTTPException(status_code=400, detail="كود الكوبون مطلوب")
    
    coupon = await db.coupons.find_one({"code": code})
    if not coupon:
        raise HTTPException(status_code=404, detail="كود الكوبون غير صحيح")
    
    now = get_now()
    
    # التحقق من الحالة
    if not coupon.get("is_active"):
        raise HTTPException(status_code=400, detail="هذا الكوبون غير مفعّل")
    
    # التحقق من تاريخ البداية
    if coupon.get("start_date") and coupon["start_date"] > now:
        raise HTTPException(status_code=400, detail="هذا الكوبون لم يبدأ بعد")
    
    # التحقق من تاريخ الانتهاء
    if coupon.get("end_date") and coupon["end_date"] < now:
        raise HTTPException(status_code=400, detail="هذا الكوبون منتهي الصلاحية")
    
    # التحقق من عدد الاستخدامات الكلي
    if coupon.get("max_uses") and coupon.get("usage_count", 0) >= coupon["max_uses"]:
        raise HTTPException(status_code=400, detail="تم استنفاد هذا الكوبون")
    
    # التحقق من عدد استخدامات المستخدم
    user_usage = await db.coupon_usage.count_documents({
        "coupon_id": coupon["id"],
        "user_id": user["id"]
    })
    if coupon.get("max_uses_per_user") and user_usage >= coupon["max_uses_per_user"]:
        raise HTTPException(status_code=400, detail="لقد استخدمت هذا الكوبون من قبل")
    
    # التحقق من العملاء الجدد
    if coupon.get("new_customers_only"):
        # التحقق من وجود طلبات سابقة
        previous_orders = await db.food_orders.count_documents({"customer_id": user["id"], "status": "delivered"})
        shop_orders = await db.orders.count_documents({"user_id": user["id"], "status": "delivered"})
        if previous_orders > 0 or shop_orders > 0:
            raise HTTPException(status_code=400, detail="هذا الكوبون للعملاء الجدد فقط")
    
    # التحقق من الحد الأدنى للطلب
    if coupon.get("min_order_amount") and order_amount < coupon["min_order_amount"]:
        remaining = coupon["min_order_amount"] - order_amount
        raise HTTPException(
            status_code=400, 
            detail=f"الحد الأدنى للطلب {coupon['min_order_amount']:,} ل.س. أضف {remaining:,} ل.س للاستفادة"
        )
    
    # التحقق من النطاق
    scope = coupon.get("scope", "all")
    if scope == "food" and order_type != "food":
        raise HTTPException(status_code=400, detail="هذا الكوبون لطلبات الطعام فقط")
    elif scope == "shop" and order_type != "shop":
        raise HTTPException(status_code=400, detail="هذا الكوبون للمتجر العام فقط")
    elif scope == "store" and store_id not in coupon.get("scope_ids", []):
        raise HTTPException(status_code=400, detail="هذا الكوبون لمتجر محدد فقط")
    elif scope == "category" and category not in coupon.get("scope_ids", []):
        raise HTTPException(status_code=400, detail="هذا الكوبون لفئة محددة فقط")
    elif scope == "product":
        matching = set(product_ids) & set(coupon.get("scope_ids", []))
        if not matching:
            raise HTTPException(status_code=400, detail="هذا الكوبون لمنتجات محددة فقط")
    
    # حساب الخصم
    discount = 0
    coupon_type = coupon.get("coupon_type", "percentage")
    
    if coupon_type == "percentage":
        discount = order_amount * (coupon.get("discount_percentage", 0) / 100)
        # تطبيق الحد الأقصى
        if coupon.get("max_discount") and discount > coupon["max_discount"]:
            discount = coupon["max_discount"]
    
    elif coupon_type == "fixed":
        discount = min(coupon.get("discount_amount", 0), order_amount)
    
    elif coupon_type == "free_delivery":
        discount = 0  # سيتم التعامل مع التوصيل المجاني في checkout
    
    return {
        "valid": True,
        "coupon": {
            "id": coupon["id"],
            "code": coupon["code"],
            "name": coupon["name"],
            "type": coupon_type,
            "type_label": COUPON_TYPES.get(coupon_type, ""),
            "discount_percentage": coupon.get("discount_percentage", 0),
            "is_free_delivery": coupon_type == "free_delivery"
        },
        "discount": discount,
        "final_amount": order_amount - discount,
        "message": f"تم تطبيق الكوبون! وفرت {discount:,.0f} ل.س" if discount > 0 else "تم تطبيق كوبون التوصيل المجاني!"
    }


@router.post("/apply")
async def apply_coupon_to_order(
    data: dict,
    user: dict = Depends(get_current_user)
) -> dict:
    """تطبيق كوبون على طلب (يُستدعى عند إتمام الطلب)"""
    coupon_id = data.get("coupon_id")
    order_id = data.get("order_id")
    order_type = data.get("order_type", "food")
    discount_amount = data.get("discount_amount", 0)
    
    if not coupon_id or not order_id:
        raise HTTPException(status_code=400, detail="بيانات ناقصة")
    
    coupon = await db.coupons.find_one({"id": coupon_id})
    if not coupon:
        raise HTTPException(status_code=404, detail="الكوبون غير موجود")
    
    now = get_now()
    
    # تسجيل الاستخدام
    usage = {
        "id": str(uuid.uuid4()),
        "coupon_id": coupon_id,
        "coupon_code": coupon["code"],
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "order_id": order_id,
        "order_type": order_type,
        "discount_amount": discount_amount,
        "used_at": now
    }
    await db.coupon_usage.insert_one(usage)
    
    # تحديث إحصائيات الكوبون
    await db.coupons.update_one(
        {"id": coupon_id},
        {
            "$inc": {
                "usage_count": 1,
                "total_discount_given": discount_amount
            }
        }
    )
    
    return {"message": "تم تطبيق الكوبون"}


# ===============================
# كوبون ترحيبي تلقائي
# ===============================

async def get_welcome_coupon_for_user(user_id: str) -> Optional[dict]:
    """جلب كوبون ترحيبي للمستخدم إذا كان جديداً"""
    # التحقق من أن المستخدم جديد
    food_orders = await db.food_orders.count_documents({"customer_id": user_id, "status": "delivered"})
    shop_orders = await db.orders.count_documents({"user_id": user_id, "status": "delivered"})
    
    if food_orders > 0 or shop_orders > 0:
        return None
    
    now = get_now()
    
    # البحث عن كوبون ترحيبي نشط
    welcome_coupon = await db.coupons.find_one({
        "new_customers_only": True,
        "is_active": True,
        "$and": [
            {"$or": [
                {"end_date": None},
                {"end_date": {"$gte": now}}
            ]},
            {"$or": [
                {"max_uses": None},
                {"$expr": {"$lt": ["$usage_count", "$max_uses"]}}
            ]}
        ]
    }, {"_id": 0})
    
    return welcome_coupon
