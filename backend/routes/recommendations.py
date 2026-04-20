# /app/backend/routes/recommendations.py
# نظام التوصيات الذكية

from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
import secrets

from core.database import db, get_current_user

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.get("/for-you")
async def get_personalized_recommendations(
    limit: int = 10,
    user: dict = Depends(get_current_user)
):
    """توصيات مخصصة بناءً على سلوك المستخدم"""
    
    recommendations = []
    
    # 1. جلب المنتجات من الفئات التي اشترى منها المستخدم
    user_orders = await db.orders.find(
        {"user_id": user["id"], "status": "delivered"},
        {"_id": 0, "items": 1}
    ).limit(10).to_list(10)
    
    purchased_categories = set()
    purchased_product_ids = set()
    
    for order in user_orders:
        for item in order.get("items", []):
            if item.get("category"):
                purchased_categories.add(item["category"])
            if item.get("product_id"):
                purchased_product_ids.add(item["product_id"])
    
    # منتجات من نفس الفئات (لكن لم يشتريها)
    if purchased_categories:
        similar_products = await db.products.find(
            {
                "category": {"$in": list(purchased_categories)},
                "id": {"$nin": list(purchased_product_ids)},
                "is_approved": True
            },
            {"_id": 0}
        ).limit(limit // 2).to_list(limit // 2)
        
        for p in similar_products:
            p["recommendation_reason"] = "بناءً على مشترياتك السابقة"
            recommendations.append(p)
    
    # 2. المنتجات الأكثر مبيعاً (للمستخدمين الجدد)
    if len(recommendations) < limit:
        remaining = limit - len(recommendations)
        existing_ids = [p["id"] for p in recommendations]
        
        popular_products = await db.products.find(
            {
                "id": {"$nin": existing_ids + list(purchased_product_ids)},
                "is_approved": True
            },
            {"_id": 0}
        ).sort("sales_count", -1).limit(remaining).to_list(remaining)
        
        for p in popular_products:
            p["recommendation_reason"] = "الأكثر مبيعاً"
            recommendations.append(p)
    
    # 3. المنتجات المشابهة لما شاهده
    viewed_products = await db.product_views.find(
        {"user_id": user["id"]},
        {"_id": 0, "product_id": 1}
    ).sort("viewed_at", -1).limit(5).to_list(5)
    
    if viewed_products:
        viewed_ids = [v["product_id"] for v in viewed_products]
        viewed_product = await db.products.find_one(
            {"id": viewed_ids[0]},
            {"_id": 0, "category": 1}
        )
        
        if viewed_product and len(recommendations) < limit:
            similar = await db.products.find(
                {
                    "category": viewed_product.get("category"),
                    "id": {"$nin": [p["id"] for p in recommendations]},
                    "is_approved": True
                },
                {"_id": 0}
            ).limit(3).to_list(3)
            
            for p in similar:
                p["recommendation_reason"] = "قد يعجبك أيضاً"
                recommendations.append(p)
    
    # خلط النتائج قليلاً للتنوع
    secrets.SystemRandom().shuffle(recommendations)
    
    return recommendations[:limit]

@router.get("/similar/{product_id}")
async def get_similar_products(product_id: str, limit: int = 6):
    """منتجات مشابهة لمنتج معين"""
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        return []
    
    # البحث عن منتجات من نفس الفئة
    similar = await db.products.find(
        {
            "category": product.get("category"),
            "id": {"$ne": product_id},
            "is_approved": True
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    # إضافة منتجات من نفس البائع
    if len(similar) < limit and product.get("seller_id"):
        seller_products = await db.products.find(
            {
                "seller_id": product["seller_id"],
                "id": {"$ne": product_id},
                "is_approved": True
            },
            {"_id": 0}
        ).limit(limit - len(similar)).to_list(limit - len(similar))
        
        similar.extend(seller_products)
    
    return similar[:limit]

@router.get("/trending")
async def get_trending_products(limit: int = 10):
    """المنتجات الرائجة حالياً"""
    
    # أولاً: البحث عن المنتجات ذات أعلى views مباشرة
    products = await db.products.find(
        {
            "is_approved": True,
            "views": {"$gt": 0}
        },
        {"_id": 0}
    ).sort("views", -1).limit(limit).to_list(limit)
    
    if products:
        for p in products:
            p["recommendation_reason"] = "رائج الآن 🔥"
        return products
    
    # Fallback: المنتجات الأكثر مشاهدة من product_views
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    pipeline = [
        {"$match": {"viewed_at": {"$gte": week_ago}}},
        {"$group": {"_id": "$product_id", "views": {"$sum": 1}}},
        {"$sort": {"views": -1}},
        {"$limit": limit}
    ]
    
    trending_ids = await db.product_views.aggregate(pipeline).to_list(limit)
    
    if not trending_ids:
        return []
    
    # جلب جميع المنتجات دفعة واحدة
    product_ids = [item["_id"] for item in trending_ids]
    products_list = await db.products.find(
        {"id": {"$in": product_ids}, "is_approved": True},
        {"_id": 0}
    ).to_list(None)
    products_map = {p["id"]: p for p in products_list}
    
    # إنشاء قاموس للمشاهدات
    views_map = {item["_id"]: item["views"] for item in trending_ids}
    
    products = []
    for item in trending_ids:
        product = products_map.get(item["_id"])
        if product:
            product_copy = product.copy()
            product_copy["views_count"] = views_map.get(item["_id"], 0)
            product_copy["recommendation_reason"] = "رائج الآن 🔥"
            products.append(product_copy)
    
    return products

@router.get("/deals")
async def get_best_deals(limit: int = 10):
    """أفضل العروض والخصومات"""
    
    # البحث عن منتجات بخصم
    products = await db.products.find(
        {
            "is_approved": True,
            "discount_percent": {"$gt": 0}
        },
        {"_id": 0}
    ).sort("discount_percent", -1).limit(limit).to_list(limit)
    
    if products:
        for p in products:
            p["recommendation_reason"] = f"خصم {p.get('discount_percent', 0)}%"
        return products
    
    # Fallback: المنتجات التي لها original_price أعلى من price
    products = await db.products.find(
        {
            "is_approved": True,
            "$expr": {"$gt": ["$original_price", "$price"]}
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    for p in products:
        if p.get("original_price") and p.get("price"):
            discount = int((1 - p["price"] / p["original_price"]) * 100)
            p["recommendation_reason"] = f"خصم {discount}%"
    
    return products


@router.get("/new-products")
async def get_new_products(limit: int = 10):
    """المنتجات الجديدة"""
    
    # المنتجات المضافة في آخر 7 أيام
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    products = await db.products.find(
        {
            "is_approved": True,
            "created_at": {"$gte": week_ago}
        },
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # إذا لم توجد منتجات في آخر أسبوع، نجلب آخر المنتجات المضافة
    if not products:
        products = await db.products.find(
            {"is_approved": True},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
    
    for p in products:
        p["recommendation_reason"] = "جديد ✨"
    
    return products


@router.post("/track-view/{product_id}")
async def track_product_view(product_id: str, user: dict = Depends(get_current_user)):
    """تتبع مشاهدة المنتج (لتحسين التوصيات)"""
    
    await db.product_views.insert_one({
        "user_id": user["id"],
        "product_id": product_id,
        "viewed_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "تم التسجيل"}
