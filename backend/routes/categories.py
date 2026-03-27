# /app/backend/routes/categories.py
# إدارة الفئات الديناميكية

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from core.database import db, get_current_user

router = APIRouter(prefix="/categories", tags=["Categories"])

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

# الفئات الافتراضية - نظام رئيسية وفرعية
DEFAULT_CATEGORIES = [
    # ===== قسم المنتجات (shopping) =====
    
    # 📱 إلكترونيات (فئة رئيسية)
    {"id": "electronics", "name": "إلكترونيات", "name_en": "Electronics", "icon": "Smartphone", "type": "shopping", "color": "#3B82F6", "order": 1, "parent_id": None, "is_parent": True},
    {"id": "mobiles", "name": "موبايلات", "name_en": "Mobiles", "icon": "Smartphone", "type": "shopping", "color": "#8B5CF6", "order": 1, "parent_id": "electronics", "is_parent": False},
    {"id": "computers", "name": "كمبيوتر ولابتوب", "name_en": "Computers", "icon": "Laptop", "type": "shopping", "color": "#6366F1", "order": 2, "parent_id": "electronics", "is_parent": False},
    {"id": "watches", "name": "ساعات يد", "name_en": "Watches", "icon": "Watch", "type": "shopping", "color": "#4F46E5", "order": 3, "parent_id": "electronics", "is_parent": False},
    {"id": "gaming", "name": "ألعاب فيديو وبلايستيشن", "name_en": "Gaming", "icon": "Gamepad2", "type": "shopping", "color": "#7C3AED", "order": 4, "parent_id": "electronics", "is_parent": False},
    {"id": "headphones", "name": "سماعات وإكسسوارات", "name_en": "Headphones", "icon": "Headphones", "type": "shopping", "color": "#9333EA", "order": 5, "parent_id": "electronics", "is_parent": False},
    
    # 👕 أزياء (فئة رئيسية)
    {"id": "fashion", "name": "أزياء", "name_en": "Fashion", "icon": "Shirt", "type": "shopping", "color": "#EC4899", "order": 2, "parent_id": None, "is_parent": True},
    {"id": "clothes", "name": "ملابس", "name_en": "Clothes", "icon": "Shirt", "type": "shopping", "color": "#F472B6", "order": 1, "parent_id": "fashion", "is_parent": False},
    {"id": "shoes", "name": "أحذية", "name_en": "Shoes", "icon": "Footprints", "type": "shopping", "color": "#F59E0B", "order": 2, "parent_id": "fashion", "is_parent": False},
    {"id": "accessories", "name": "إكسسوارات", "name_en": "Accessories", "icon": "Gem", "type": "shopping", "color": "#10B981", "order": 3, "parent_id": "fashion", "is_parent": False},
    {"id": "perfumes", "name": "عطور", "name_en": "Perfumes", "icon": "Sparkles", "type": "shopping", "color": "#A855F7", "order": 4, "parent_id": "fashion", "is_parent": False},
    {"id": "bags", "name": "حقائب", "name_en": "Bags", "icon": "Briefcase", "type": "shopping", "color": "#D946EF", "order": 5, "parent_id": "fashion", "is_parent": False},
    {"id": "eyewear", "name": "نظارات", "name_en": "Eyewear", "icon": "Glasses", "type": "shopping", "color": "#0EA5E9", "order": 6, "parent_id": "fashion", "is_parent": False},
    {"id": "jewelry", "name": "مجوهرات", "name_en": "Jewelry", "icon": "Crown", "type": "shopping", "color": "#EAB308", "order": 7, "parent_id": "fashion", "is_parent": False},
    
    # 🏠 المنزل (فئة رئيسية)
    {"id": "home", "name": "المنزل", "name_en": "Home", "icon": "Home", "type": "shopping", "color": "#14B8A6", "order": 3, "parent_id": None, "is_parent": True},
    {"id": "furniture", "name": "أثاث", "name_en": "Furniture", "icon": "Sofa", "type": "shopping", "color": "#84CC16", "order": 1, "parent_id": "home", "is_parent": False},
    {"id": "appliances", "name": "أجهزة منزلية", "name_en": "Appliances", "icon": "Refrigerator", "type": "shopping", "color": "#06B6D4", "order": 2, "parent_id": "home", "is_parent": False},
    {"id": "home_tools", "name": "أدوات منزلية", "name_en": "Home Tools", "icon": "Wrench", "type": "shopping", "color": "#64748B", "order": 3, "parent_id": "home", "is_parent": False},
    {"id": "decor", "name": "ديكور", "name_en": "Decor", "icon": "Lamp", "type": "shopping", "color": "#F97316", "order": 4, "parent_id": "home", "is_parent": False},
    
    # 💄 جمال وصحة (فئة رئيسية)
    {"id": "beauty_health", "name": "جمال وصحة", "name_en": "Beauty & Health", "icon": "Heart", "type": "shopping", "color": "#D946EF", "order": 4, "parent_id": None, "is_parent": True},
    {"id": "beauty", "name": "تجميل", "name_en": "Beauty", "icon": "SprayCan", "type": "shopping", "color": "#EC4899", "order": 1, "parent_id": "beauty_health", "is_parent": False},
    {"id": "medicines", "name": "أدوية", "name_en": "Medicines", "icon": "Pill", "type": "shopping", "color": "#22C55E", "order": 2, "parent_id": "beauty_health", "is_parent": False},
    {"id": "personal_care", "name": "عناية شخصية", "name_en": "Personal Care", "icon": "Sparkle", "type": "shopping", "color": "#F472B6", "order": 3, "parent_id": "beauty_health", "is_parent": False},
    
    # 🎁 أخرى (فئة رئيسية)
    {"id": "other", "name": "أخرى", "name_en": "Other", "icon": "Package", "type": "shopping", "color": "#9CA3AF", "order": 5, "parent_id": None, "is_parent": True},
    {"id": "gifts", "name": "هدايا", "name_en": "Gifts", "icon": "Gift", "type": "shopping", "color": "#E11D48", "order": 1, "parent_id": "other", "is_parent": False},
    {"id": "books", "name": "كتب", "name_en": "Books", "icon": "BookOpen", "type": "shopping", "color": "#78716C", "order": 2, "parent_id": "other", "is_parent": False},
    {"id": "kids", "name": "أطفال", "name_en": "Kids", "icon": "Baby", "type": "shopping", "color": "#F97316", "order": 3, "parent_id": "other", "is_parent": False},
    {"id": "sports", "name": "رياضة", "name_en": "Sports", "icon": "Dumbbell", "type": "shopping", "color": "#EF4444", "order": 4, "parent_id": "other", "is_parent": False},
    {"id": "cars", "name": "سيارات", "name_en": "Cars", "icon": "Car", "type": "shopping", "color": "#64748B", "order": 5, "parent_id": "other", "is_parent": False},
    {"id": "flowers", "name": "زهور", "name_en": "Flowers", "icon": "Flower2", "type": "shopping", "color": "#F43F5E", "order": 6, "parent_id": "other", "is_parent": False},
    {"id": "stationery", "name": "قرطاسية", "name_en": "Stationery", "icon": "Pencil", "type": "shopping", "color": "#0284C7", "order": 7, "parent_id": "other", "is_parent": False},
    {"id": "pets", "name": "حيوانات أليفة", "name_en": "Pets", "icon": "PawPrint", "type": "shopping", "color": "#A3E635", "order": 8, "parent_id": "other", "is_parent": False},
    {"id": "services", "name": "خدمات", "name_en": "Services", "icon": "Wrench", "type": "shopping", "color": "#6366F1", "order": 9, "parent_id": "other", "is_parent": False},
    
    # ===== قسم الطعام (food) =====
    
    # 🍔 طعام ومطاعم (فئة رئيسية)
    {"id": "food_restaurants", "name": "طعام ومطاعم", "name_en": "Food & Restaurants", "icon": "UtensilsCrossed", "type": "food", "color": "#FF6B00", "order": 1, "parent_id": None, "is_parent": True},
    {"id": "restaurants", "name": "مطاعم", "name_en": "Restaurants", "icon": "UtensilsCrossed", "type": "food", "color": "#FF6B00", "order": 1, "parent_id": "food_restaurants", "is_parent": False},
    {"id": "sweets", "name": "حلويات", "name_en": "Sweets", "icon": "Cake", "type": "food", "color": "#EC4899", "order": 2, "parent_id": "food_restaurants", "is_parent": False},
    {"id": "bakery", "name": "مخابز", "name_en": "Bakery", "icon": "Croissant", "type": "food", "color": "#D97706", "order": 3, "parent_id": "food_restaurants", "is_parent": False},
    {"id": "cafes", "name": "مقاهي", "name_en": "Cafes", "icon": "Coffee", "type": "food", "color": "#8B4513", "order": 4, "parent_id": "food_restaurants", "is_parent": False},
    {"id": "drinks", "name": "مشروبات", "name_en": "Drinks", "icon": "GlassWater", "type": "food", "color": "#06B6D4", "order": 5, "parent_id": "food_restaurants", "is_parent": False},
    {"id": "fast_food", "name": "وجبات سريعة", "name_en": "Fast Food", "icon": "Pizza", "type": "food", "color": "#F59E0B", "order": 6, "parent_id": "food_restaurants", "is_parent": False},
    
    # 🛒 بقالة وماركت (فئة رئيسية)
    {"id": "grocery", "name": "بقالة وماركت", "name_en": "Grocery", "icon": "ShoppingCart", "type": "food", "color": "#10B981", "order": 2, "parent_id": None, "is_parent": True},
    {"id": "groceries", "name": "مواد غذائية", "name_en": "Groceries", "icon": "ShoppingBasket", "type": "food", "color": "#84CC16", "order": 1, "parent_id": "grocery", "is_parent": False},
    {"id": "vegetables", "name": "خضروات وفواكه", "name_en": "Vegetables", "icon": "Apple", "type": "food", "color": "#22C55E", "order": 2, "parent_id": "grocery", "is_parent": False},
    {"id": "market", "name": "ماركت", "name_en": "Market", "icon": "Store", "type": "food", "color": "#0EA5E9", "order": 3, "parent_id": "grocery", "is_parent": False},
    {"id": "meat", "name": "لحوم ودواجن", "name_en": "Meat", "icon": "Beef", "type": "food", "color": "#DC2626", "order": 4, "parent_id": "grocery", "is_parent": False},
]

async def init_default_categories():
    """تهيئة الفئات الافتراضية إذا لم تكن موجودة"""
    count = await db.categories.count_documents({})
    if count == 0:
        for cat in DEFAULT_CATEGORIES:
            cat["is_active"] = True
            cat["created_at"] = datetime.now(timezone.utc).isoformat()
            # إضافة الحقول الجديدة إذا لم تكن موجودة
            if "parent_id" not in cat:
                cat["parent_id"] = None
            if "is_parent" not in cat:
                cat["is_parent"] = False
            await db.categories.insert_one(cat)
        print("✅ تم إنشاء الفئات الافتراضية مع التنظيم الهرمي")

@router.get("")
async def get_categories(type: Optional[str] = None, active_only: bool = True, parent_only: bool = False, parent_id: Optional[str] = None):
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
async def get_categories_hierarchical(type: Optional[str] = None):
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
async def get_shopping_categories():
    """جلب فئات التسوق فقط"""
    return await get_categories(type="shopping")

@router.get("/food")
async def get_food_categories():
    """جلب فئات الطعام فقط"""
    return await get_categories(type="food")

@router.get("/{category_id}")
async def get_category(category_id: str):
    """جلب فئة محددة"""
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="الفئة غير موجودة")
    return category

@router.post("")
async def create_category(category: CategoryCreate, user: dict = Depends(get_current_user)):
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
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    
    await db.categories.insert_one(new_category)
    
    # حذف الكاش
    
    return {"message": "تم إنشاء الفئة بنجاح", "category": {k: v for k, v in new_category.items() if k != "_id"}}

@router.put("/{category_id}")
async def update_category(category_id: str, category: CategoryUpdate, user: dict = Depends(get_current_user)):
    """تحديث فئة (للأدمن فقط)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="الفئة غير موجودة")
    
    update_data = {k: v for k, v in category.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = user["id"]
    
    await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    # حذف الكاش
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return {"message": "تم تحديث الفئة بنجاح", "category": updated}

@router.delete("/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(get_current_user)):
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
async def toggle_category(category_id: str, user: dict = Depends(get_current_user)):
    """تفعيل/تعطيل فئة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="الفئة غير موجودة")
    
    new_status = not existing.get("is_active", True)
    await db.categories.update_one(
        {"id": category_id}, 
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # حذف الكاش
    
    return {"message": f"تم {'تفعيل' if new_status else 'تعطيل'} الفئة", "is_active": new_status}

@router.put("/reorder")
async def reorder_categories(orders: List[dict], user: dict = Depends(get_current_user)):
    """إعادة ترتيب الفئات"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    for item in orders:
        await db.categories.update_one(
            {"id": item["id"]},
            {"$set": {"order": item["order"]}}
        )
    
    # حذف الكاش
    
    return {"message": "تم إعادة ترتيب الفئات بنجاح"}

# ========== اقتراحات التصنيفات الجديدة ==========

class CategorySuggestion(BaseModel):
    name: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    type: str = "shopping"  # shopping أو food

@router.post("/suggest")
async def suggest_category(suggestion: CategorySuggestion, user: dict = Depends(get_current_user)):
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
    
    now = datetime.now(timezone.utc).isoformat()
    
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
async def get_my_suggestions(user: dict = Depends(get_current_user)):
    """جلب اقتراحات البائع"""
    
    suggestions = await db.category_suggestions.find(
        {"suggested_by": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return suggestions

@router.get("/suggestions/all")
async def get_all_suggestions(status: Optional[str] = None, user: dict = Depends(get_current_user)):
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
async def approve_suggestion(suggestion_id: str, user: dict = Depends(get_current_user)):
    """قبول اقتراح تصنيف وإنشاءه"""
    
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    suggestion = await db.category_suggestions.find_one({"id": suggestion_id})
    if not suggestion:
        raise HTTPException(status_code=404, detail="الاقتراح غير موجود")
    
    if suggestion["status"] != "pending":
        raise HTTPException(status_code=400, detail="هذا الاقتراح تمت معالجته مسبقاً")
    
    now = datetime.now(timezone.utc).isoformat()
    
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
async def reject_suggestion(suggestion_id: str, reason: Optional[str] = None, user: dict = Depends(get_current_user)):
    """رفض اقتراح تصنيف"""
    
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    suggestion = await db.category_suggestions.find_one({"id": suggestion_id})
    if not suggestion:
        raise HTTPException(status_code=404, detail="الاقتراح غير موجود")
    
    if suggestion["status"] != "pending":
        raise HTTPException(status_code=400, detail="هذا الاقتراح تمت معالجته مسبقاً")
    
    now = datetime.now(timezone.utc).isoformat()
    
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

