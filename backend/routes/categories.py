# /app/backend/routes/categories.py
# إدارة الفئات الديناميكية

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from core.database import db, get_current_user
from helpers.datetime_helpers import get_now

router = APIRouter(prefix="/categories", tags=["Categories"])
# ============== Authorization Dependencies ==============

async def require_admin_user(user: dict = Depends(get_current_user)) -> dict:
    """التحقق من أن المستخدم admin أو sub_admin"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    return user



# النماذج
class CategoryCreate(BaseModel):
    name: str
    name_en: Optional[str] = None
    icon: str = "Package"
    type: str = "shopping"  # shopping أو food
    color: Optional[str] = "#FF6B00"
    order: Optional[int] = 0
    is_active: bool = True

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    icon: Optional[str] = None
    type: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

# الفئات الافتراضية - القائمة النهائية المعتمدة
DEFAULT_CATEGORIES = [
    # ===== قسم المنتجات (shopping) - 26 صنف =====
    {"id": "electronics", "name": "إلكترونيات", "name_en": "Electronics", "icon": "Smartphone", "type": "shopping", "color": "#3B82F6", "order": 1, "is_active": True},
    {"id": "mobiles", "name": "موبايلات", "name_en": "Mobiles", "icon": "Smartphone", "type": "shopping", "color": "#8B5CF6", "order": 2, "is_active": True},
    {"id": "clothes", "name": "ملابس", "name_en": "Clothes", "icon": "Shirt", "type": "shopping", "color": "#EC4899", "order": 3, "is_active": True},
    {"id": "shoes", "name": "أحذية", "name_en": "Shoes", "icon": "Footprints", "type": "shopping", "color": "#F59E0B", "order": 4, "is_active": True},
    {"id": "accessories", "name": "إكسسوارات", "name_en": "Accessories", "icon": "Watch", "type": "shopping", "color": "#10B981", "order": 5, "is_active": True},
    {"id": "perfumes", "name": "عطور", "name_en": "Perfumes", "icon": "Sparkles", "type": "shopping", "color": "#A855F7", "order": 6, "is_active": True},
    {"id": "furniture", "name": "أثاث", "name_en": "Furniture", "icon": "Sofa", "type": "shopping", "color": "#84CC16", "order": 7, "is_active": True},
    {"id": "home_tools", "name": "أدوات منزلية", "name_en": "Home Tools", "icon": "Wrench", "type": "shopping", "color": "#64748B", "order": 8, "is_active": True},
    {"id": "decor", "name": "ديكور", "name_en": "Decor", "icon": "Lamp", "type": "shopping", "color": "#F97316", "order": 9, "is_active": True},
    {"id": "beauty", "name": "تجميل وعناية شخصية", "name_en": "Beauty & Personal Care", "icon": "SprayCan", "type": "shopping", "color": "#EC4899", "order": 10, "is_active": True},
    {"id": "sports", "name": "رياضة", "name_en": "Sports", "icon": "Dumbbell", "type": "shopping", "color": "#EF4444", "order": 11, "is_active": True},
    {"id": "kids", "name": "أطفال", "name_en": "Kids", "icon": "Baby", "type": "shopping", "color": "#F97316", "order": 12, "is_active": True},
    {"id": "books", "name": "كتب", "name_en": "Books", "icon": "BookOpen", "type": "shopping", "color": "#78716C", "order": 13, "is_active": True},
    {"id": "stationery", "name": "قرطاسية", "name_en": "Stationery", "icon": "Pencil", "type": "shopping", "color": "#0284C7", "order": 14, "is_active": True},
    {"id": "gifts", "name": "هدايا", "name_en": "Gifts", "icon": "Gift", "type": "shopping", "color": "#E11D48", "order": 15, "is_active": True},
    {"id": "gaming", "name": "ألعاب", "name_en": "Games", "icon": "Gamepad2", "type": "shopping", "color": "#7C3AED", "order": 16, "is_active": True},
    {"id": "watches", "name": "ساعات يد", "name_en": "Watches", "icon": "Watch", "type": "shopping", "color": "#4F46E5", "order": 17, "is_active": True},
    {"id": "headphones", "name": "سماعات", "name_en": "Headphones", "icon": "Headphones", "type": "shopping", "color": "#9333EA", "order": 18, "is_active": True},
    {"id": "bags", "name": "حقائب", "name_en": "Bags", "icon": "Briefcase", "type": "shopping", "color": "#D946EF", "order": 19, "is_active": True},
    {"id": "eyewear", "name": "نظارات", "name_en": "Eyewear", "icon": "Glasses", "type": "shopping", "color": "#0EA5E9", "order": 20, "is_active": True},
    {"id": "flowers", "name": "زهور", "name_en": "Flowers", "icon": "Flower2", "type": "shopping", "color": "#F43F5E", "order": 21, "is_active": True},
    {"id": "medicines", "name": "أدوية", "name_en": "Medicines", "icon": "Pill", "type": "shopping", "color": "#22C55E", "order": 22, "is_active": True},
    {"id": "car_parts", "name": "قطع غيار سيارات", "name_en": "Car Parts", "icon": "Wrench", "type": "shopping", "color": "#475569", "order": 23, "is_active": True},
    {"id": "hardware", "name": "خردوات", "name_en": "Hardware", "icon": "Hammer", "type": "shopping", "color": "#78716C", "order": 24, "is_active": True},
    {"id": "groceries", "name": "مواد غذائية ومعلبات", "name_en": "Groceries & Canned", "icon": "ShoppingBasket", "type": "shopping", "color": "#84CC16", "order": 25, "is_active": True},
    {"id": "pet_food", "name": "طعام حيوانات", "name_en": "Pet Food", "icon": "PawPrint", "type": "shopping", "color": "#A3E635", "order": 26, "is_active": True},
    
    # ===== قسم الطعام (food) - 8 أصناف =====
    {"id": "restaurants", "name": "مطاعم", "name_en": "Restaurants", "icon": "UtensilsCrossed", "type": "food", "color": "#FF6B00", "order": 1, "is_active": True},
    {"id": "cafes", "name": "مقاهي", "name_en": "Cafes", "icon": "Coffee", "type": "food", "color": "#8B4513", "order": 2, "is_active": True},
    {"id": "sweets", "name": "حلويات", "name_en": "Sweets", "icon": "Cake", "type": "food", "color": "#EC4899", "order": 3, "is_active": True},
    {"id": "bakery", "name": "مخابز", "name_en": "Bakery", "icon": "Croissant", "type": "food", "color": "#D97706", "order": 4, "is_active": True},
    {"id": "drinks", "name": "مشروبات", "name_en": "Drinks", "icon": "GlassWater", "type": "food", "color": "#06B6D4", "order": 5, "is_active": True},
    {"id": "food_groceries", "name": "مواد غذائية", "name_en": "Groceries", "icon": "ShoppingBasket", "type": "food", "color": "#84CC16", "order": 6, "is_active": True},
    {"id": "vegetables", "name": "خضروات وفواكه", "name_en": "Vegetables", "icon": "Apple", "type": "food", "color": "#22C55E", "order": 7, "is_active": True},
    {"id": "dairy", "name": "ألبان وأجبان", "name_en": "Dairy", "icon": "Milk", "type": "food", "color": "#FBBF24", "order": 8, "is_active": True},
]

async def init_default_categories() -> None:
    """تهيئة الفئات الافتراضية إذا لم تكن موجودة"""
    count = await db.categories.count_documents({})
    if count == 0:
        for cat in DEFAULT_CATEGORIES:
            cat["is_active"] = True
            cat["created_at"] = get_now()
            # إضافة الحقول الجديدة إذا لم تكن موجودة
            if "parent_id" not in cat:
                cat["parent_id"] = None
            if "is_parent" not in cat:
                cat["is_parent"] = False
            await db.categories.insert_one(cat)
        print("✅ تم إنشاء الفئات الافتراضية مع التنظيم الهرمي")

@router.get("")
async def get_categories(type: Optional[str] = None, active_only: bool = True, parent_only: bool = False, parent_id: Optional[str] = None) -> List[dict]:
    """جلب جميع الفئات"""
    # تهيئة الفئات الافتراضية إذا لم تكن موجودة
    count = await db.categories.count_documents({})
    if count == 0:
        await init_default_categories()
    
    query = {}
    if type:
        query["type"] = type
    if active_only:
        query["is_active"] = True
    if parent_only:
        query["is_parent"] = True
    if parent_id:
        query["parent_id"] = parent_id
    
    categories = await db.categories.find(query, {"_id": 0}).sort("order", 1).to_list(None)
    return categories

@router.get("/hierarchical")
async def get_categories_hierarchical(type: Optional[str] = None) -> List[dict]:
    """جلب الفئات بشكل هرمي (رئيسية مع فرعياتها)"""
    count = await db.categories.count_documents({})
    if count == 0:
        await init_default_categories()
    
    query = {"is_active": True}
    if type:
        query["type"] = type
    
    all_categories = await db.categories.find(query, {"_id": 0}).sort("order", 1).to_list(None)
    
    # تنظيم الفئات بشكل هرمي
    parent_categories = [c for c in all_categories if c.get("is_parent", False) or c.get("parent_id") is None]
    
    result = []
    for parent in parent_categories:
        if parent.get("is_parent", False):
            # جلب الفئات الفرعية
            children = [c for c in all_categories if c.get("parent_id") == parent["id"]]
            parent["children"] = children
        result.append(parent)
    
    return result

@router.get("/shopping")
async def get_shopping_categories() -> List[dict]:
    """جلب فئات التسوق فقط"""
    return await get_categories(type="shopping")

@router.get("/food")
async def get_food_categories() -> List[dict]:
    """جلب فئات الطعام فقط"""
    return await get_categories(type="food")

@router.get("/force-reset-2025")
async def force_reset_categories_endpoint() -> dict:
    """إعادة ضبط الفئات"""
    try:
        await db.categories.delete_many({})
        now = get_now()
        cats = []
        for cat in DEFAULT_CATEGORIES:
            c = cat.copy()
            c["created_at"] = now
            c["is_active"] = True
            c["parent_id"] = None
            c["is_parent"] = False
            cats.append(c)
        await db.categories.insert_many(cats)
        return {"success": True, "total": len(cats)}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/{category_id}")
async def get_category(category_id: str) -> dict:
    """جلب فئة محددة"""
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="الفئة غير موجودة")
    return category

@router.post("")
async def create_category(category: CategoryCreate, user: dict = Depends(get_current_user)) -> dict:
    """إنشاء فئة جديدة (للأدمن فقط)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # التحقق من عدم وجود فئة بنفس الاسم
    existing = await db.categories.find_one({"name": category.name})
    if existing:
        raise HTTPException(status_code=400, detail="يوجد فئة بنفس الاسم")
    
    # إنشاء ID فريد
    category_id = category.name_en.lower().replace(" ", "_") if category.name_en else str(uuid.uuid4())[:8]
    
    new_category = {
        "id": category_id,
        "name": category.name,
        "name_en": category.name_en or category.name,
        "icon": category.icon,
        "type": category.type,
        "color": category.color,
        "order": category.order,
        "is_active": category.is_active,
        "created_at": get_now(),
        "created_by": user["id"]
    }
    
    await db.categories.insert_one(new_category)
    
    # حذف الكاش
    
    return {"message": "تم إنشاء الفئة بنجاح", "category": {k: v for k, v in new_category.items() if k != "_id"}}

@router.put("/{category_id}")
async def update_category(category_id: str, category: CategoryUpdate, user: dict = Depends(get_current_user)) -> dict:
    """تحديث فئة (للأدمن فقط)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="الفئة غير موجودة")
    
    update_data = {k: v for k, v in category.dict().items() if v is not None}
    update_data["updated_at"] = get_now()
    update_data["updated_by"] = user["id"]
    
    await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    # حذف الكاش
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return {"message": "تم تحديث الفئة بنجاح", "category": updated}

@router.delete("/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(get_current_user)) -> dict:
    """حذف فئة (للأدمن فقط)"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="الفئة غير موجودة")
    
    # التحقق من عدم وجود منتجات في هذه الفئة
    products_count = await db.products.count_documents({"category": existing["name"]})
    if products_count > 0:
        raise HTTPException(status_code=400, detail=f"لا يمكن حذف الفئة - يوجد {products_count} منتج مرتبط بها")
    
    await db.categories.delete_one({"id": category_id})
    
    # حذف الكاش
    
    return {"message": "تم حذف الفئة بنجاح"}

@router.post("/{category_id}/toggle")
async def toggle_category(category_id: str, user: dict = Depends(get_current_user)) -> dict:
    """تفعيل/تعطيل فئة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="الفئة غير موجودة")
    
    new_status = not existing.get("is_active", True)
    await db.categories.update_one(
        {"id": category_id}, 
        {"$set": {"is_active": new_status, "updated_at": get_now()}}
    )
    
    # حذف الكاش
    
    return {"message": f"تم {'تفعيل' if new_status else 'تعطيل'} الفئة", "is_active": new_status}

@router.put("/reorder")
async def reorder_categories(orders: List[dict], user: dict = Depends(get_current_user)) -> dict:
    """إعادة ترتيب الفئات"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # استخدام bulk_write للتحديث الدفعي
    from pymongo import UpdateOne
    operations = [
        UpdateOne(
            {"id": item["id"]},
            {"$set": {"order": item["order"]}}
        ) for item in orders
    ]
    
    if operations:
        await db.categories.bulk_write(operations)
    
    # حذف الكاش
    
    return {"message": "تم إعادة ترتيب الفئات بنجاح"}

# ========== اقتراحات التصنيفات الجديدة ==========

class CategorySuggestion(BaseModel):
    name: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    type: str = "shopping"  # shopping أو food

@router.post("/suggest")
async def suggest_category(suggestion: CategorySuggestion, user: dict = Depends(get_current_user)) -> dict:
    """اقتراح تصنيف جديد من البائع"""
    
    # التحقق من أن المستخدم بائع
    if user["user_type"] not in ["seller", "food_seller"]:
        raise HTTPException(status_code=403, detail="هذه الخدمة للبائعين فقط")
    
    # التحقق من عدم وجود تصنيف بنفس الاسم
    existing = await db.categories.find_one({"name": suggestion.name})
    if existing:
        raise HTTPException(status_code=400, detail="يوجد تصنيف بنفس الاسم بالفعل")
    
    # التحقق من عدم وجود اقتراح مشابه معلق
    pending = await db.category_suggestions.find_one({
        "name": suggestion.name,
        "status": "pending"
    })
    if pending:
        raise HTTPException(status_code=400, detail="يوجد اقتراح مشابه قيد المراجعة")
    
    now = get_now()
    
    new_suggestion = {
        "id": str(uuid.uuid4()),
        "name": suggestion.name,
        "name_en": suggestion.name_en,
        "description": suggestion.description,
        "type": suggestion.type,
        "suggested_by": user["id"],
        "suggested_by_name": user.get("full_name") or user.get("name") or user.get("store_name", "بائع"),
        "suggested_by_phone": user.get("phone"),
        "status": "pending",  # pending, approved, rejected
        "created_at": now,
        "updated_at": now
    }
    
    await db.category_suggestions.insert_one(new_suggestion)
    
    # إنشاء إشعار للأدمن
    admin_notification = {
        "id": str(uuid.uuid4()),
        "user_id": "admin",
        "title": "اقتراح تصنيف جديد",
        "message": f"اقترح {new_suggestion['suggested_by_name']} إضافة تصنيف: {suggestion.name}",
        "type": "category_suggestion",
        "reference_id": new_suggestion["id"],
        "is_read": False,
        "created_at": now
    }
    await db.notifications.insert_one(admin_notification)
    
    return {
        "message": "تم إرسال اقتراحك بنجاح! سنراجعه قريباً",
        "suggestion_id": new_suggestion["id"]
    }

@router.get("/suggestions/my")
async def get_my_suggestions(user: dict = Depends(get_current_user)) -> List[dict]:
    """جلب اقتراحات البائع"""
    
    suggestions = await db.category_suggestions.find(
        {"suggested_by": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return suggestions

@router.get("/suggestions/all")
async def get_all_suggestions(status: Optional[str] = None, user: dict = Depends(get_current_user)) -> List[dict]:
    """جلب جميع اقتراحات التصنيفات (للأدمن)"""
    
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    query = {}
    if status:
        query["status"] = status
    
    suggestions = await db.category_suggestions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return suggestions

@router.post("/suggestions/{suggestion_id}/approve")
async def approve_suggestion(suggestion_id: str, user: dict = Depends(get_current_user)) -> dict:
    """قبول اقتراح تصنيف وإنشاءه"""
    
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    suggestion = await db.category_suggestions.find_one({"id": suggestion_id})
    if not suggestion:
        raise HTTPException(status_code=404, detail="الاقتراح غير موجود")
    
    if suggestion["status"] != "pending":
        raise HTTPException(status_code=400, detail="هذا الاقتراح تمت معالجته مسبقاً")
    
    now = get_now()
    
    # إنشاء التصنيف الجديد
    category_id = suggestion.get("name_en", "").lower().replace(" ", "_") or str(uuid.uuid4())[:8]
    
    # جلب أعلى ترتيب حالي
    max_order = await db.categories.find_one(
        {"type": suggestion["type"]},
        sort=[("order", -1)]
    )
    new_order = (max_order.get("order", 0) if max_order else 0) + 1
    
    new_category = {
        "id": category_id,
        "name": suggestion["name"],
        "name_en": suggestion.get("name_en") or suggestion["name"],
        "icon": "Package",
        "type": suggestion["type"],
        "color": "#6B7280",
        "order": new_order,
        "is_active": True,
        "created_at": now,
        "created_by": user["id"],
        "suggested_by": suggestion["suggested_by"]
    }
    
    await db.categories.insert_one(new_category)
    
    # تحديث حالة الاقتراح
    await db.category_suggestions.update_one(
        {"id": suggestion_id},
        {"$set": {
            "status": "approved",
            "approved_by": user["id"],
            "approved_at": now,
            "category_id": category_id
        }}
    )
    
    # إشعار البائع
    seller_notification = {
        "id": str(uuid.uuid4()),
        "user_id": suggestion["suggested_by"],
        "title": "تمت الموافقة على اقتراحك! 🎉",
        "message": f"تمت إضافة التصنيف '{suggestion['name']}' الذي اقترحته. يمكنك الآن إضافة منتجات فيه.",
        "type": "suggestion_approved",
        "is_read": False,
        "created_at": now
    }
    await db.notifications.insert_one(seller_notification)
    
    return {
        "message": f"تم إنشاء التصنيف '{suggestion['name']}' بنجاح",
        "category": {k: v for k, v in new_category.items() if k != "_id"}
    }

@router.post("/suggestions/{suggestion_id}/reject")
async def reject_suggestion(suggestion_id: str, reason: Optional[str] = None, user: dict = Depends(get_current_user)) -> dict:
    """رفض اقتراح تصنيف"""
    
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    suggestion = await db.category_suggestions.find_one({"id": suggestion_id})
    if not suggestion:
        raise HTTPException(status_code=404, detail="الاقتراح غير موجود")
    
    if suggestion["status"] != "pending":
        raise HTTPException(status_code=400, detail="هذا الاقتراح تمت معالجته مسبقاً")
    
    now = get_now()
    
    # تحديث حالة الاقتراح
    await db.category_suggestions.update_one(
        {"id": suggestion_id},
        {"$set": {
            "status": "rejected",
            "rejected_by": user["id"],
            "rejected_at": now,
            "rejection_reason": reason or "لا يتناسب مع سياسة المنصة"
        }}
    )
    
    # إشعار البائع
    seller_notification = {
        "id": str(uuid.uuid4()),
        "user_id": suggestion["suggested_by"],
        "title": "تم رفض اقتراحك",
        "message": f"تم رفض اقتراح التصنيف '{suggestion['name']}'. السبب: {reason or 'لا يتناسب مع سياسة المنصة'}",
        "type": "suggestion_rejected",
        "is_read": False,
        "created_at": now
    }
    await db.notifications.insert_one(seller_notification)
    
    return {"message": "تم رفض الاقتراح"}

