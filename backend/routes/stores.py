# /app/backend/routes/stores.py
# مسارات المتاجر والمفضلة والمتابعة

from fastapi import APIRouter, HTTPException, Depends, Header
from typing import Optional
from datetime import datetime, timezone
import uuid
import jwt

from core.database import db, get_current_user, JWT_SECRET, ALGORITHM

router = APIRouter(tags=["Stores"])

# ============== Store Page ==============

@router.get("/stores/{seller_id}")
async def get_store_page(seller_id: str, authorization: Optional[str] = Header(default=None)):
    seller_docs = await db.seller_documents.find_one({"seller_id": seller_id})
    seller = await db.users.find_one({"id": seller_id})
    
    if not seller:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    business_name = seller_docs.get("business_name", seller.get("name", "متجر")) if seller_docs else seller.get("name", "متجر")
    
    products = await db.products.find(
        {"seller_id": seller_id, "is_active": True, "is_approved": True}, 
        {"_id": 0, "seller_name": 0, "seller_phone": 0}
    ).to_list(100)
    
    followers_count = await db.follows.count_documents({"seller_id": seller_id})
    
    is_following = False
    if authorization:
        try:
            token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
            payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
            user_id = payload.get("user_id")
            follow = await db.follows.find_one({"user_id": user_id, "seller_id": seller_id})
            is_following = follow is not None
        except jwt.PyJWTError:
            pass
    
    return {
        "seller_id": seller_id,
        "business_name": business_name,
        "products_count": len(products),
        "products": products,
        "followers_count": followers_count,
        "is_following": is_following
    }

@router.post("/stores/{seller_id}/follow")
async def follow_store(seller_id: str, user: dict = Depends(get_current_user)):
    seller = await db.users.find_one({"id": seller_id, "user_type": "seller"})
    if not seller:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    existing = await db.follows.find_one({"user_id": user["id"], "seller_id": seller_id})
    if existing:
        raise HTTPException(status_code=400, detail="أنت متابع لهذا المتجر بالفعل")
    
    follow_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "seller_id": seller_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.follows.insert_one(follow_doc)
    
    return {"message": "تمت المتابعة بنجاح"}

@router.delete("/stores/{seller_id}/follow")
async def unfollow_store(seller_id: str, user: dict = Depends(get_current_user)):
    result = await db.follows.delete_one({"user_id": user["id"], "seller_id": seller_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="أنت لا تتابع هذا المتجر")
    
    return {"message": "تم إلغاء المتابعة"}

@router.get("/user/following")
async def get_following_stores(user: dict = Depends(get_current_user)):
    follows = await db.follows.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    if not follows:
        return []
    
    # جلب جميع البائعين ووثائقهم دفعة واحدة
    seller_ids = [f["seller_id"] for f in follows]
    
    sellers_list = await db.users.find(
        {"id": {"$in": seller_ids}},
        {"_id": 0}
    ).to_list(None)
    sellers_map = {s["id"]: s for s in sellers_list}
    
    seller_docs_list = await db.seller_documents.find(
        {"seller_id": {"$in": seller_ids}},
        {"_id": 0}
    ).to_list(None)
    seller_docs_map = {sd["seller_id"]: sd for sd in seller_docs_list}
    
    # جلب عدد المنتجات لكل بائع باستخدام aggregation
    products_pipeline = [
        {"$match": {"seller_id": {"$in": seller_ids}, "is_active": True}},
        {"$group": {"_id": "$seller_id", "count": {"$sum": 1}}}
    ]
    products_counts = await db.products.aggregate(products_pipeline).to_list(None)
    products_count_map = {pc["_id"]: pc["count"] for pc in products_counts}
    
    stores = []
    for follow in follows:
        seller = sellers_map.get(follow["seller_id"])
        if seller:
            seller_docs = seller_docs_map.get(follow["seller_id"])
            business_name = seller_docs.get("business_name", seller.get("name")) if seller_docs else seller.get("name")
            stores.append({
                "seller_id": follow["seller_id"],
                "business_name": business_name,
                "products_count": products_count_map.get(follow["seller_id"], 0),
                "followed_at": follow.get("created_at")
            })
    
    return stores

# ============== Favorites ==============

@router.post("/favorites/{product_id}")
async def add_to_favorites(product_id: str, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id, "is_active": True})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    existing = await db.favorites.find_one({"user_id": user["id"], "product_id": product_id})
    if existing:
        raise HTTPException(status_code=400, detail="المنتج موجود في المفضلة بالفعل")
    
    favorite_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "product_id": product_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.favorites.insert_one(favorite_doc)
    
    return {"message": "تمت الإضافة للمفضلة"}

@router.delete("/favorites/{product_id}")
async def remove_from_favorites(product_id: str, user: dict = Depends(get_current_user)):
    result = await db.favorites.delete_one({"user_id": user["id"], "product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="المنتج غير موجود في المفضلة")
    
    return {"message": "تمت الإزالة من المفضلة"}

@router.get("/favorites")
async def get_favorites(user: dict = Depends(get_current_user)):
    favorites = await db.favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    if not favorites:
        return []
    
    # جلب جميع المنتجات دفعة واحدة
    product_ids = [fav["product_id"] for fav in favorites]
    products_list = await db.products.find(
        {"id": {"$in": product_ids}, "is_active": True},
        {"_id": 0, "seller_name": 0, "seller_phone": 0}
    ).to_list(None)
    products_map = {p["id"]: p for p in products_list}
    
    # إنشاء قاموس لتواريخ الإضافة
    added_at_map = {fav["product_id"]: fav.get("created_at") for fav in favorites}
    
    products = []
    for fav in favorites:
        product = products_map.get(fav["product_id"])
        if product:
            product_copy = product.copy()
            product_copy["added_at"] = added_at_map.get(fav["product_id"])
            products.append(product_copy)
    
    return products

@router.get("/favorites/check/{product_id}")
async def check_favorite(product_id: str, user: dict = Depends(get_current_user)):
    favorite = await db.favorites.find_one({"user_id": user["id"], "product_id": product_id})
    return {"is_favorite": favorite is not None}

# ============== Seller Products ==============

@router.get("/seller/products")
async def get_seller_products(user: dict = Depends(get_current_user)):
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    products = await db.products.find({"seller_id": user["id"]}, {"_id": 0}).to_list(100)
    return products

@router.get("/seller/my-products")
async def get_seller_my_products(user: dict = Depends(get_current_user)):
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    products = await db.products.find(
        {"seller_id": user["id"], "is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return products
