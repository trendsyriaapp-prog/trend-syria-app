# /app/backend/routes/food.py
# مسارات توصيل الطعام - مطاعم ومواد غذائية وخضروات

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

from core.database import db, get_current_user, get_optional_user

router = APIRouter(prefix="/food", tags=["Food Delivery"])

# أنواع متاجر الطعام
FOOD_STORE_TYPES = {
    "restaurants": "مطاعم",
    "groceries": "مواد غذائية", 
    "vegetables": "خضروات وفواكه"
}

# Models
class FoodStoreCreate(BaseModel):
    name: str
    store_type: str  # restaurants, groceries, vegetables
    description: Optional[str] = None
    phone: str
    address: str
    city: str
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    delivery_time: Optional[int] = 30  # بالدقائق
    minimum_order: Optional[float] = 0
    working_hours: Optional[dict] = None

class FoodProductCreate(BaseModel):
    store_id: str
    name: str
    description: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    category: str  # فئة داخل المتجر
    images: List[str] = []
    is_available: bool = True
    preparation_time: Optional[int] = None  # للمطاعم فقط

# ===============================
# المتاجر
# ===============================

@router.get("/stores")
async def get_food_stores(
    category: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    """جلب متاجر الطعام"""
    query = {"is_active": True, "is_approved": True}
    
    if category and category != 'all':
        query["store_type"] = category
    if city:
        query["city"] = city
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    stores = await db.food_stores.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(None)
    
    # إضافة اسم الفئة
    for store in stores:
        store["category_name"] = FOOD_STORE_TYPES.get(store.get("store_type"), "")
    
    return stores

@router.get("/stores/{store_id}")
async def get_food_store(store_id: str):
    """جلب تفاصيل متجر معين"""
    store = await db.food_stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    store["category_name"] = FOOD_STORE_TYPES.get(store.get("store_type"), "")
    
    # جلب منتجات المتجر
    products = await db.food_products.find(
        {"store_id": store_id, "is_available": True}, 
        {"_id": 0}
    ).to_list(None)
    store["products"] = products
    
    return store

@router.post("/stores")
async def create_food_store(store: FoodStoreCreate, user: dict = Depends(get_current_user)):
    """إنشاء متجر طعام جديد (للبائعين)"""
    if user["user_type"] not in ["seller", "admin"]:
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    if store.store_type not in FOOD_STORE_TYPES:
        raise HTTPException(status_code=400, detail="نوع المتجر غير صالح")
    
    # التحقق من عدم وجود متجر سابق
    existing = await db.food_stores.find_one({"owner_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="لديك متجر طعام بالفعل")
    
    store_id = str(uuid.uuid4())
    store_doc = {
        "id": store_id,
        "owner_id": user["id"],
        "owner_name": user["name"],
        "owner_phone": user.get("phone", ""),
        "name": store.name,
        "store_type": store.store_type,
        "description": store.description,
        "phone": store.phone,
        "address": store.address,
        "city": store.city,
        "logo": store.logo,
        "cover_image": store.cover_image,
        "delivery_time": store.delivery_time,
        "minimum_order": store.minimum_order,
        "working_hours": store.working_hours,
        "rating": 0,
        "reviews_count": 0,
        "orders_count": 0,
        "is_active": True,
        "is_approved": False,  # يحتاج موافقة الإدارة
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.food_stores.insert_one(store_doc)
    return {"id": store_id, "message": "تم إنشاء المتجر بنجاح، في انتظار موافقة الإدارة"}

# ===============================
# المنتجات
# ===============================

@router.get("/products")
async def get_food_products(
    category: Optional[str] = None,
    store_id: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    """جلب منتجات الطعام"""
    # أولاً نجلب المتاجر المعتمدة من الفئة المطلوبة
    store_query = {"is_active": True, "is_approved": True}
    if category and category != 'all':
        store_query["store_type"] = category
    
    approved_stores = await db.food_stores.find(store_query, {"id": 1}).to_list(None)
    approved_store_ids = [s["id"] for s in approved_stores]
    
    if not approved_store_ids:
        return []
    
    # ثم نجلب المنتجات من هذه المتاجر
    query = {"store_id": {"$in": approved_store_ids}, "is_available": True}
    
    if store_id:
        query["store_id"] = store_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.food_products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(None)
    
    # إضافة معلومات المتجر
    for product in products:
        store = await db.food_stores.find_one({"id": product["store_id"]}, {"_id": 0, "name": 1, "store_type": 1})
        if store:
            product["store_name"] = store.get("name", "")
            product["store_type"] = store.get("store_type", "")
    
    return products

@router.post("/products")
async def create_food_product(product: FoodProductCreate, user: dict = Depends(get_current_user)):
    """إضافة منتج طعام جديد"""
    # التحقق من ملكية المتجر
    store = await db.food_stores.find_one({"id": product.store_id})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    if store["owner_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    product_id = str(uuid.uuid4())
    product_doc = {
        "id": product_id,
        "store_id": product.store_id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "original_price": product.original_price,
        "category": product.category,
        "images": product.images,
        "is_available": product.is_available,
        "preparation_time": product.preparation_time,
        "rating": 0,
        "reviews_count": 0,
        "sales_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.food_products.insert_one(product_doc)
    return {"id": product_id, "message": "تم إضافة المنتج بنجاح"}

# ===============================
# الإحصائيات
# ===============================

@router.get("/stats")
async def get_food_stats():
    """إحصائيات قسم الطعام"""
    stores_count = await db.food_stores.count_documents({"is_active": True, "is_approved": True})
    products_count = await db.food_products.count_documents({"is_available": True})
    
    # إحصائيات حسب النوع
    stats_by_type = {}
    for store_type, name in FOOD_STORE_TYPES.items():
        count = await db.food_stores.count_documents({
            "store_type": store_type, 
            "is_active": True, 
            "is_approved": True
        })
        stats_by_type[store_type] = {"name": name, "count": count}
    
    return {
        "total_stores": stores_count,
        "total_products": products_count,
        "by_type": stats_by_type
    }


# ===============================
# لوحة تحكم المتجر
# ===============================

@router.get("/my-store")
async def get_my_store(user: dict = Depends(get_current_user)):
    """جلب متجر المستخدم الحالي"""
    store = await db.food_stores.find_one({"owner_id": user["id"]}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="لا يوجد متجر مرتبط بحسابك")
    
    # جلب منتجات المتجر
    products = await db.food_products.find({"store_id": store["id"]}, {"_id": 0}).to_list(None)
    
    return {"store": store, "products": products}

@router.put("/my-store")
async def update_my_store(update_data: dict, user: dict = Depends(get_current_user)):
    """تحديث معلومات متجر المستخدم"""
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        raise HTTPException(status_code=404, detail="لا يوجد متجر مرتبط بحسابك")
    
    # الحقول المسموح بتعديلها
    allowed_fields = ["name", "description", "phone", "delivery_time", "minimum_order", "logo", "cover_image"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.food_stores.update_one(
        {"id": store["id"]},
        {"$set": update_dict}
    )
    
    return {"message": "تم تحديث المتجر بنجاح"}

@router.put("/products/{product_id}")
async def update_food_product(product_id: str, update_data: dict, user: dict = Depends(get_current_user)):
    """تحديث منتج طعام"""
    product = await db.food_products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    # التحقق من ملكية المتجر
    store = await db.food_stores.find_one({"id": product["store_id"]})
    if store["owner_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    # الحقول المسموح بتعديلها
    allowed_fields = ["name", "description", "price", "original_price", "category", "images", "is_available", "preparation_time"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.food_products.update_one(
        {"id": product_id},
        {"$set": update_dict}
    )
    
    return {"message": "تم تحديث المنتج بنجاح"}

@router.patch("/products/{product_id}")
async def patch_food_product(product_id: str, update_data: dict, user: dict = Depends(get_current_user)):
    """تحديث جزئي لمنتج طعام (مثل تغيير حالة التوفر)"""
    product = await db.food_products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    store = await db.food_stores.find_one({"id": product["store_id"]})
    if store["owner_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    await db.food_products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    
    return {"message": "تم التحديث"}

@router.delete("/products/{product_id}")
async def delete_food_product(product_id: str, user: dict = Depends(get_current_user)):
    """حذف منتج طعام"""
    product = await db.food_products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    store = await db.food_stores.find_one({"id": product["store_id"]})
    if store["owner_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    await db.food_products.delete_one({"id": product_id})
    
    return {"message": "تم حذف المنتج"}
