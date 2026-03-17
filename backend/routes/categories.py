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

# الفئات الافتراضية
DEFAULT_CATEGORIES = [
    # قسم المنتجات
    {"id": "electronics", "name": "إلكترونيات", "name_en": "Electronics", "icon": "Smartphone", "type": "shopping", "color": "#3B82F6", "order": 1},
    {"id": "mobiles", "name": "موبايلات", "name_en": "Mobiles", "icon": "Smartphone", "type": "shopping", "color": "#8B5CF6", "order": 2},
    {"id": "computers", "name": "كمبيوتر ولابتوب", "name_en": "Computers", "icon": "Laptop", "type": "shopping", "color": "#6366F1", "order": 3},
    {"id": "clothes", "name": "ملابس", "name_en": "Clothes", "icon": "Shirt", "type": "shopping", "color": "#EC4899", "order": 4},
    {"id": "shoes", "name": "أحذية", "name_en": "Shoes", "icon": "Footprints", "type": "shopping", "color": "#F59E0B", "order": 5},
    {"id": "accessories", "name": "إكسسوارات", "name_en": "Accessories", "icon": "Watch", "type": "shopping", "color": "#10B981", "order": 6},
    {"id": "perfumes", "name": "عطور", "name_en": "Perfumes", "icon": "Sparkles", "type": "shopping", "color": "#F472B6", "order": 7},
    {"id": "home", "name": "المنزل", "name_en": "Home", "icon": "Home", "type": "shopping", "color": "#14B8A6", "order": 8},
    {"id": "furniture", "name": "أثاث", "name_en": "Furniture", "icon": "Sofa", "type": "shopping", "color": "#84CC16", "order": 9},
    {"id": "appliances", "name": "أجهزة منزلية", "name_en": "Appliances", "icon": "Refrigerator", "type": "shopping", "color": "#06B6D4", "order": 10},
    {"id": "beauty", "name": "تجميل", "name_en": "Beauty", "icon": "SprayCan", "type": "shopping", "color": "#D946EF", "order": 11},
    {"id": "sports", "name": "رياضة", "name_en": "Sports", "icon": "Dumbbell", "type": "shopping", "color": "#EF4444", "order": 12},
    {"id": "kids", "name": "أطفال", "name_en": "Kids", "icon": "Gamepad2", "type": "shopping", "color": "#F97316", "order": 13},
    {"id": "books", "name": "كتب", "name_en": "Books", "icon": "BookOpen", "type": "shopping", "color": "#78716C", "order": 14},
    {"id": "gifts", "name": "هدايا", "name_en": "Gifts", "icon": "Gift", "type": "shopping", "color": "#E11D48", "order": 15},
    {"id": "medicines", "name": "أدوية", "name_en": "Medicines", "icon": "Pill", "type": "shopping", "color": "#22C55E", "order": 16},
    {"id": "cars", "name": "سيارات", "name_en": "Cars", "icon": "Car", "type": "shopping", "color": "#64748B", "order": 17},
    # قسم الطعام
    {"id": "restaurants", "name": "مطاعم", "name_en": "Restaurants", "icon": "UtensilsCrossed", "type": "food", "color": "#FF6B00", "order": 1},
    {"id": "cafes", "name": "مقاهي", "name_en": "Cafes", "icon": "Coffee", "type": "food", "color": "#8B4513", "order": 2},
    {"id": "sweets", "name": "حلويات", "name_en": "Sweets", "icon": "Cake", "type": "food", "color": "#EC4899", "order": 3},
    {"id": "bakery", "name": "مخابز", "name_en": "Bakery", "icon": "Croissant", "type": "food", "color": "#D97706", "order": 4},
    {"id": "market", "name": "ماركت", "name_en": "Market", "icon": "ShoppingCart", "type": "food", "color": "#10B981", "order": 5},
    {"id": "drinks", "name": "مشروبات", "name_en": "Drinks", "icon": "GlassWater", "type": "food", "color": "#06B6D4", "order": 6},
    {"id": "groceries", "name": "مواد غذائية", "name_en": "Groceries", "icon": "ShoppingBasket", "type": "food", "color": "#84CC16", "order": 7},
    {"id": "vegetables", "name": "خضروات وفواكه", "name_en": "Vegetables", "icon": "Apple", "type": "food", "color": "#22C55E", "order": 8},
]

async def init_default_categories():
    """تهيئة الفئات الافتراضية إذا لم تكن موجودة"""
    count = await db.categories.count_documents({})
    if count == 0:
        for cat in DEFAULT_CATEGORIES:
            cat["is_active"] = True
            cat["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.categories.insert_one(cat)
        print("✅ تم إنشاء الفئات الافتراضية")

@router.get("")
async def get_categories(type: Optional[str] = None, active_only: bool = True):
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
    
    categories = await db.categories.find(query, {"_id": 0}).sort("order", 1).to_list(None)
    return categories

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
