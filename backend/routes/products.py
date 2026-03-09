# /app/backend/routes/products.py
# مسارات المنتجات

from fastapi import APIRouter, HTTPException, Depends, Query, Header, Request
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import jwt
import logging

from core.database import db, get_current_user, get_optional_user, JWT_SECRET, ALGORITHM
from core.performance import cache, cached
from models.schemas import ProductCreate, ProductUpdate, ProductApproval, ProductQuestion, ProductAnswer

router = APIRouter(prefix="/products", tags=["Products"])

# الفئات المتاحة
CATEGORIES = [
    "إلكترونيات", "أزياء", "ملابس", "أحذية", "تجميل",
    "مجوهرات", "إكسسوارات", "المنزل", "رياضة", "أطفال", "كتب", "ألعاب",
    "مطاعم", "مواد غذائية", "خضروات وفواكه"
]

# أنواع الفئات (عادية أو طعام)
FOOD_CATEGORIES = ["مطاعم", "مواد غذائية", "خضروات وفواكه"]

@router.get("/categories")
async def get_categories():
    """إرجاع الأصناف مع الأيقونات والنوع - مع كاش"""
    # التحقق من الكاش
    cached_categories = cache.get("categories_list")
    if cached_categories:
        return cached_categories
    
    categories_with_icons = [
        {"id": "electronics", "name": "إلكترونيات", "icon": "Smartphone", "type": "shopping"},
        {"id": "fashion", "name": "أزياء", "icon": "Sparkles", "type": "shopping"},
        {"id": "clothes", "name": "ملابس", "icon": "Shirt", "type": "shopping"},
        {"id": "home", "name": "المنزل", "icon": "Home", "type": "shopping"},
        {"id": "beauty", "name": "تجميل", "icon": "SprayCan", "type": "shopping"},
        {"id": "sports", "name": "رياضة", "icon": "Dumbbell", "type": "shopping"},
        {"id": "kids", "name": "أطفال", "icon": "Gamepad2", "type": "shopping"},
        {"id": "books", "name": "كتب", "icon": "BookOpen", "type": "shopping"},
        {"id": "restaurants", "name": "مطاعم", "icon": "UtensilsCrossed", "type": "food"},
        {"id": "groceries", "name": "مواد غذائية", "icon": "ShoppingBasket", "type": "food"},
        {"id": "vegetables", "name": "خضروات وفواكه", "icon": "Apple", "type": "food"},
    ]
    
    # حفظ في الكاش لمدة ساعة
    cache.set("categories_list", categories_with_icons, ttl_seconds=3600)
    
    return categories_with_icons

@router.post("")
async def create_product(product: ProductCreate, user: dict = Depends(get_current_user)):
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    if not user.get("is_approved"):
        raise HTTPException(status_code=403, detail="حسابك غير مفعل بعد")
    
    seller_docs = await db.seller_documents.find_one({"seller_id": user["id"]})
    business_name = seller_docs.get("business_name", user["name"]) if seller_docs else user["name"]
    
    # أخذ المدينة من بيانات البائع إذا لم تُحدد
    seller_city = product.city if product.city else user.get("city", "دمشق")
    
    product_id = str(uuid.uuid4())
    product_doc = {
        "id": product_id,
        "seller_id": user["id"],
        "seller_name": user["name"],
        "seller_phone": user.get("phone", ""),
        "business_name": business_name,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "category": product.category,
        "stock": product.stock,
        "images": product.images,
        "video": product.video,
        "video_url": product.video_url,
        "city": seller_city,
        "length_cm": product.length_cm,
        "width_cm": product.width_cm,
        "height_cm": product.height_cm,
        "weight_kg": product.weight_kg,
        "size_type": product.size_type,
        "available_sizes": product.available_sizes or [],
        "rating": 0,
        "reviews_count": 0,
        "sales_count": 0,
        "is_active": True,
        "is_approved": False,
        "approval_status": "pending",
        "rejection_reason": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    return {"id": product_id, "message": "تم إضافة المنتج بنجاح، في انتظار موافقة الإدارة"}

@router.get("")
async def get_products(
    request: Request,
    category: Optional[str] = None,
    search: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    city: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = 1,
    limit: int = Query(default=12, le=50)
):
    # تسجيل البحث
    if search and search.strip():
        try:
            user_id = None
            auth_header = request.headers.get("authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
                payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
                user_id = payload.get("user_id")
            
            if user_id:
                await db.search_logs.insert_one({
                    "id": str(uuid.uuid4()),
                    "query": search.strip(),
                    "user_id": user_id,
                    "category": category,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
        except Exception:
            pass  # لا نوقف البحث إذا فشل التسجيل
    
    query = {"is_active": True, "is_approved": True}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if price_min is not None:
        query["price"] = {"$gte": price_min}
    if price_max is not None:
        query.setdefault("price", {})["$lte"] = price_max
    if city:
        query["city"] = city
    
    # Sorting
    sort_options = {
        "newest": [("created_at", -1)],
        "price_low": [("price", 1)],
        "price_high": [("price", -1)],
        "popular": [("sales_count", -1), ("rating", -1)]
    }
    sort_query = sort_options.get(sort, [("created_at", -1)])
    
    # Projection - only essential fields for listing
    projection = {
        "_id": 0,
        "id": 1,
        "name": 1,
        "price": 1,
        "images": {"$slice": 1},  # Only first image
        "rating": 1,
        "reviews_count": 1,
        "stock": 1,
        "created_at": 1,
        "category": 1,
        "city": 1,
        "available_sizes": 1,
        "video": 1
    }
    
    skip = (page - 1) * limit
    products = await db.products.find(query, projection).sort(sort_query).skip(skip).limit(limit).to_list(limit)
    total = await db.products.count_documents(query)
    
    return {
        "products": products, 
        "total": total, 
        "page": page, 
        "pages": (total + limit - 1) // limit,
        "has_more": page * limit < total
    }

@router.get("/featured")
async def get_featured_products(limit: int = Query(default=8, le=20)):
    # Projection for lightweight response
    projection = {
        "_id": 0,
        "id": 1,
        "name": 1,
        "price": 1,
        "images": {"$slice": 1},
        "rating": 1,
        "reviews_count": 1,
        "stock": 1,
        "created_at": 1,
        "available_sizes": 1,
        "video": 1
    }
    products = await db.products.find(
        {"is_active": True, "is_approved": True}, 
        projection
    ).sort("sales_count", -1).limit(limit).to_list(limit)
    return products

@router.get("/flash-products")
async def get_flash_products(limit: int = Query(default=10, le=20)):
    """جلب منتجات المتجر المشمولة بعروض الفلاش"""
    now = datetime.now(timezone.utc).isoformat()
    
    # جلب عروض الفلاش النشطة التي تشمل منتجات المتجر
    flash_sales = await db.flash_sales.find({
        "is_active": True,
        "start_time": {"$lte": now},
        "end_time": {"$gte": now},
        "$or": [
            {"sale_scope": "all"},
            {"sale_scope": "shop_only"},
            {"applicable_shop_products": {"$exists": True, "$ne": []}}
        ]
    }, {"_id": 0}).to_list(10)
    
    if not flash_sales:
        return {"products": [], "flash_sale": None}
    
    flash_products = []
    active_flash = flash_sales[0]
    
    # إذا كان هناك منتجات متجر محددة
    if active_flash.get("applicable_shop_products"):
        product_ids = active_flash["applicable_shop_products"]
        products = await db.products.find(
            {"id": {"$in": product_ids}, "is_active": True, "is_approved": True},
            {"_id": 0}
        ).limit(limit).to_list(limit)
        
        for p in products:
            p["flash_discount"] = active_flash["discount_percentage"]
            p["flash_price"] = round(p["price"] * (1 - active_flash["discount_percentage"] / 100))
        flash_products = products
    
    # إذا كان الفلاش على جميع المنتجات أو فئات محددة
    elif active_flash.get("sale_scope") in ["all", "shop_only"]:
        query = {"is_active": True, "is_approved": True}
        
        # إذا كان هناك فئات متجر محددة
        if active_flash.get("applicable_shop_categories"):
            category_map = {
                "electronics": "إلكترونيات",
                "fashion": "أزياء",
                "clothes": "ملابس",
                "home": "المنزل",
                "beauty": "تجميل",
                "sports": "رياضة",
                "kids": "أطفال",
                "books": "كتب"
            }
            categories = [category_map.get(c, c) for c in active_flash["applicable_shop_categories"]]
            query["category"] = {"$in": categories}
        
        products = await db.products.find(query, {"_id": 0}).sort("sales_count", -1).limit(limit).to_list(limit)
        
        for p in products:
            p["flash_discount"] = active_flash["discount_percentage"]
            p["flash_price"] = round(p["price"] * (1 - active_flash["discount_percentage"] / 100))
        flash_products = products
    
    return {
        "products": flash_products,
        "flash_sale": {
            "id": active_flash["id"],
            "name": active_flash["name"],
            "discount_percentage": active_flash["discount_percentage"],
            "end_time": active_flash["end_time"],
            "banner_color": active_flash.get("banner_color", "#FF4500")
        }
    }

@router.get("/sponsored")
async def get_sponsored_products(limit: int = Query(default=10, le=20)):
    """جلب المنتجات المُعلن عنها (Sponsored)"""
    now = datetime.now()
    
    # جلب الإعلانات النشطة
    active_ads = await db.ads.find({
        "status": "active",
        "end_date": {"$gte": now}
    }, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    if not active_ads:
        return []
    
    # جلب المنتجات المُعلن عنها
    product_ids = [ad["product_id"] for ad in active_ads]
    products = await db.products.find(
        {"id": {"$in": product_ids}, "is_active": True, "is_approved": True},
        {"_id": 0}
    ).to_list(limit)
    
    # إضافة معلومات الإعلان
    ad_map = {ad["product_id"]: ad for ad in active_ads}
    for p in products:
        ad = ad_map.get(p["id"])
        if ad:
            p["is_sponsored"] = True
            p["ad_type"] = ad.get("ad_type", "featured")
    
    return products

# ============== سجل البحث ==============

@router.get("/search-history")
async def get_search_history(user: dict = Depends(get_current_user)):
    """جلب سجل البحث للمستخدم"""
    searches = await db.search_logs.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)
    
    return {"searches": searches}

@router.delete("/search-history/{search_id}")
async def delete_search_history_item(search_id: str, user: dict = Depends(get_current_user)):
    """حذف عنصر من سجل البحث"""
    result = await db.search_logs.delete_one({"id": search_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="لم يتم العثور على العنصر")
    return {"message": "تم الحذف"}

@router.delete("/search-history")
async def clear_search_history(user: dict = Depends(get_current_user)):
    """مسح كل سجل البحث"""
    await db.search_logs.delete_many({"user_id": user["id"]})
    return {"message": "تم مسح سجل البحث"}

@router.get("/{product_id}")
async def get_product(product_id: str, authorization: Optional[str] = Header(default=None)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).to_list(50)
    product["reviews"] = reviews
    
    is_admin = False
    if authorization:
        try:
            token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
            payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
            user = await db.users.find_one({"id": payload.get("user_id")})
            if user and user.get("user_type") == "admin":
                is_admin = True
        except Exception as e:
            logging.error(f"Token decode error: {e}")
    
    if not is_admin:
        product.pop("seller_name", None)
        product.pop("seller_phone", None)
    
    return product

@router.get("/{product_id}/similar")
async def get_similar_products(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    query = {
        "is_active": True,
        "is_approved": True,
        "id": {"$ne": product_id},
        "$or": [
            {"category": product.get("category")},
            {"city": product.get("city")}
        ]
    }
    
    similar = await db.products.find(query, {"_id": 0, "seller_name": 0, "seller_phone": 0}).limit(6).to_list(6)
    return similar

@router.put("/{product_id}")
async def update_product(product_id: str, product: ProductUpdate, user: dict = Depends(get_current_user)):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    if existing["seller_id"] != user["id"] and user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    update_data = {k: v for k, v in product.dict().items() if v is not None}
    if update_data:
        await db.products.update_one({"id": product_id}, {"$set": update_data})
    return {"message": "تم تحديث المنتج"}

@router.delete("/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_current_user)):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    if existing["seller_id"] != user["id"] and user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.products.delete_one({"id": product_id})
    return {"message": "تم حذف المنتج"}

# ============== Questions & Answers ==============

@router.post("/{product_id}/questions")
async def add_question(product_id: str, q: ProductQuestion, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    question_id = str(uuid.uuid4())
    question_doc = {
        "id": question_id,
        "product_id": product_id,
        "user_id": user["id"],
        "user_name": user.get("full_name", user.get("name", "")),
        "question": q.question,
        "answer": None,
        "answered_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.product_questions.insert_one(question_doc)
    return {"id": question_id, "message": "تم إضافة السؤال"}

@router.get("/{product_id}/questions")
async def get_questions(product_id: str):
    questions = await db.product_questions.find(
        {"product_id": product_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return questions

@router.post("/{product_id}/questions/{question_id}/answer")
async def answer_question(product_id: str, question_id: str, a: ProductAnswer, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    if product["seller_id"] != user["id"] and user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="فقط البائع يمكنه الإجابة")
    
    result = await db.product_questions.update_one(
        {"id": question_id, "product_id": product_id},
        {"$set": {
            "answer": a.answer,
            "answered_by": user.get("full_name", user.get("name", "")),
            "answered_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")
    
    return {"message": "تم إضافة الإجابة"}

# ============== Seller Products ==============

@router.get("/seller/my-products")
async def get_seller_products(user: dict = Depends(get_current_user)):
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    products = await db.products.find({"seller_id": user["id"]}, {"_id": 0}).to_list(100)
    return products
