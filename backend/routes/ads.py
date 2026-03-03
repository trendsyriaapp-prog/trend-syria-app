# /app/backend/routes/ads.py
# نظام إعلانات البائعين

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import uuid

from core.database import db, get_current_user

router = APIRouter(prefix="/ads", tags=["Ads"])

# أسعار الإعلانات الافتراضية
DEFAULT_AD_PRICES = {
    "featured_product_day": 5000,      # منتج مميز (يوم)
    "featured_product_week": 25000,    # منتج مميز (أسبوع)
    "featured_product_month": 80000,   # منتج مميز (شهر)
    "banner_day": 15000,               # بانر رئيسية (يوم)
    "banner_week": 70000,              # بانر رئيسية (أسبوع)
    "search_top_day": 10000,           # أول نتائج البحث (يوم)
    "search_top_week": 50000,          # أول نتائج البحث (أسبوع)
}

class CreateAdRequest(BaseModel):
    product_id: str
    ad_type: str  # featured_product, banner, search_top
    duration: str  # day, week, month
    
class AdResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_image: str
    product_price: float
    seller_id: str
    seller_name: str
    ad_type: str
    duration: str
    cost: float
    status: str  # pending, active, expired, rejected
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    views: int
    clicks: int
    created_at: datetime

# دالة مساعدة للحصول على قاعدة البيانات
async def get_database():
    from ..database import get_database as get_db
    return await get_db()

# دالة مساعدة للحصول على المستخدم الحالي
async def get_current_user():
    from ..auth import get_current_user as get_user
    return await get_user()

# حساب تكلفة الإعلان
def calculate_ad_cost(ad_type: str, duration: str, prices: dict) -> float:
    key = f"{ad_type}_{duration}"
    return prices.get(key, DEFAULT_AD_PRICES.get(key, 5000))

# الحصول على أسعار الإعلانات
@router.get("/prices")
async def get_ad_prices(db = Depends(get_database)):
    """الحصول على أسعار الإعلانات"""
    settings = await db.settings.find_one({"type": "ad_settings"})
    if settings and "prices" in settings:
        return settings["prices"]
    return DEFAULT_AD_PRICES

# إنشاء إعلان جديد
@router.post("/create")
async def create_ad(
    data: CreateAdRequest,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """إنشاء إعلان جديد للمنتج"""
    
    # التحقق من أن المستخدم بائع
    if current_user.get("user_type") != "seller":
        raise HTTPException(status_code=403, detail="فقط البائعين يمكنهم إنشاء إعلانات")
    
    # الحصول على المنتج
    product = await db.products.find_one({"id": data.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    # التحقق من أن المنتج ملك للبائع
    if product.get("seller_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="لا يمكنك الإعلان عن منتج ليس ملكك")
    
    # الحصول على أسعار الإعلانات
    settings = await db.settings.find_one({"type": "ad_settings"})
    prices = settings.get("prices", DEFAULT_AD_PRICES) if settings else DEFAULT_AD_PRICES
    
    # حساب التكلفة
    cost = calculate_ad_cost(data.ad_type, data.duration, prices)
    
    # التحقق من رصيد المحفظة
    wallet = await db.wallets.find_one({"user_id": current_user.get("id")})
    if not wallet or wallet.get("balance", 0) < cost:
        raise HTTPException(
            status_code=400, 
            detail=f"رصيد المحفظة غير كافٍ. المطلوب: {cost:,} ل.س"
        )
    
    # حساب تاريخ الانتهاء
    duration_days = {"day": 1, "week": 7, "month": 30}
    days = duration_days.get(data.duration, 1)
    
    # إنشاء الإعلان
    ad = {
        "id": str(uuid.uuid4()),
        "product_id": data.product_id,
        "product_name": product.get("name"),
        "product_image": product.get("images", ["/placeholder.jpg"])[0] if product.get("images") else "/placeholder.jpg",
        "product_price": product.get("price", 0),
        "seller_id": current_user.get("id"),
        "seller_name": current_user.get("store_name", current_user.get("name", "")),
        "ad_type": data.ad_type,
        "duration": data.duration,
        "duration_days": days,
        "cost": cost,
        "status": "active",  # يمكن تغييره لـ pending إذا أردت موافقة المدير
        "start_date": datetime.utcnow(),
        "end_date": datetime.utcnow() + timedelta(days=days),
        "views": 0,
        "clicks": 0,
        "created_at": datetime.utcnow()
    }
    
    # خصم من المحفظة
    await db.wallets.update_one(
        {"user_id": current_user.get("id")},
        {"$inc": {"balance": -cost}}
    )
    
    # تسجيل المعاملة
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": current_user.get("id"),
        "type": "ad_payment",
        "amount": -cost,
        "description": f"دفع إعلان: {product.get('name')} ({data.duration})",
        "ad_id": ad["id"],
        "created_at": datetime.utcnow()
    }
    await db.transactions.insert_one(transaction)
    
    # حفظ الإعلان
    await db.ads.insert_one(ad)
    
    return {
        "message": "تم إنشاء الإعلان بنجاح",
        "ad": {
            "id": ad["id"],
            "product_name": ad["product_name"],
            "ad_type": ad["ad_type"],
            "duration": ad["duration"],
            "cost": ad["cost"],
            "status": ad["status"],
            "end_date": ad["end_date"].isoformat()
        }
    }

# الحصول على إعلانات البائع
@router.get("/my-ads")
async def get_my_ads(
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """الحصول على إعلانات البائع"""
    
    if current_user.get("user_type") != "seller":
        raise HTTPException(status_code=403, detail="فقط البائعين")
    
    ads = await db.ads.find(
        {"seller_id": current_user.get("id")}
    ).sort("created_at", -1).to_list(length=100)
    
    # تحديث حالة الإعلانات المنتهية
    now = datetime.utcnow()
    for ad in ads:
        if ad.get("status") == "active" and ad.get("end_date") and ad["end_date"] < now:
            await db.ads.update_one(
                {"id": ad["id"]},
                {"$set": {"status": "expired"}}
            )
            ad["status"] = "expired"
    
    return [{
        "id": ad["id"],
        "product_id": ad["product_id"],
        "product_name": ad["product_name"],
        "product_image": ad.get("product_image"),
        "ad_type": ad["ad_type"],
        "duration": ad["duration"],
        "cost": ad["cost"],
        "status": ad["status"],
        "start_date": ad.get("start_date"),
        "end_date": ad.get("end_date"),
        "views": ad.get("views", 0),
        "clicks": ad.get("clicks", 0),
        "created_at": ad["created_at"]
    } for ad in ads]

# الحصول على المنتجات المميزة (للعرض في الصفحة الرئيسية)
@router.get("/featured-products")
async def get_featured_products(
    limit: int = 10,
    db = Depends(get_database)
):
    """الحصول على المنتجات المميزة النشطة"""
    
    now = datetime.utcnow()
    
    # جلب الإعلانات النشطة من نوع featured_product
    ads = await db.ads.find({
        "ad_type": "featured_product",
        "status": "active",
        "end_date": {"$gt": now}
    }).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    if not ads:
        return []
    
    # جلب تفاصيل المنتجات
    product_ids = [ad["product_id"] for ad in ads]
    products = await db.products.find(
        {"id": {"$in": product_ids}}
    ).to_list(length=limit)
    
    products_dict = {p["id"]: p for p in products}
    
    result = []
    for ad in ads:
        product = products_dict.get(ad["product_id"])
        if product:
            # زيادة عدد المشاهدات
            await db.ads.update_one(
                {"id": ad["id"]},
                {"$inc": {"views": 1}}
            )
            
            result.append({
                "ad_id": ad["id"],
                "product": {
                    "id": product["id"],
                    "name": product["name"],
                    "price": product["price"],
                    "images": product.get("images", []),
                    "city": product.get("city"),
                    "seller_id": product.get("seller_id")
                },
                "is_featured": True
            })
    
    return result

# الحصول على البانرات النشطة
@router.get("/banners")
async def get_active_banners(
    limit: int = 5,
    db = Depends(get_database)
):
    """الحصول على البانرات الإعلانية النشطة"""
    
    now = datetime.utcnow()
    
    ads = await db.ads.find({
        "ad_type": "banner",
        "status": "active",
        "end_date": {"$gt": now}
    }).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    if not ads:
        return []
    
    product_ids = [ad["product_id"] for ad in ads]
    products = await db.products.find(
        {"id": {"$in": product_ids}}
    ).to_list(length=limit)
    
    products_dict = {p["id"]: p for p in products}
    
    result = []
    for ad in ads:
        product = products_dict.get(ad["product_id"])
        if product:
            await db.ads.update_one(
                {"id": ad["id"]},
                {"$inc": {"views": 1}}
            )
            
            result.append({
                "ad_id": ad["id"],
                "product_id": product["id"],
                "product_name": product["name"],
                "product_price": product["price"],
                "product_image": product.get("images", ["/placeholder.jpg"])[0] if product.get("images") else "/placeholder.jpg",
                "seller_name": ad.get("seller_name", "")
            })
    
    return result

# تسجيل نقرة على الإعلان
@router.post("/click/{ad_id}")
async def record_ad_click(
    ad_id: str,
    db = Depends(get_database)
):
    """تسجيل نقرة على الإعلان"""
    
    result = await db.ads.update_one(
        {"id": ad_id},
        {"$inc": {"clicks": 1}}
    )
    
    return {"success": True}

# === APIs للمدير ===

# الحصول على جميع الإعلانات (للمدير)
@router.get("/admin/all")
async def get_all_ads_admin(
    status: Optional[str] = None,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """الحصول على جميع الإعلانات (للمدير)"""
    
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    query = {}
    if status:
        query["status"] = status
    
    ads = await db.ads.find(query).sort("created_at", -1).to_list(length=500)
    
    # تحديث الإعلانات المنتهية
    now = datetime.utcnow()
    for ad in ads:
        if ad.get("status") == "active" and ad.get("end_date") and ad["end_date"] < now:
            await db.ads.update_one(
                {"id": ad["id"]},
                {"$set": {"status": "expired"}}
            )
            ad["status"] = "expired"
    
    return ads

# تحديث أسعار الإعلانات (للمدير)
@router.put("/admin/prices")
async def update_ad_prices(
    prices: dict,
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """تحديث أسعار الإعلانات (للمدير)"""
    
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.settings.update_one(
        {"type": "ad_settings"},
        {"$set": {"prices": prices}},
        upsert=True
    )
    
    return {"message": "تم تحديث الأسعار", "prices": prices}

# إحصائيات الإعلانات (للمدير)
@router.get("/admin/stats")
async def get_ads_stats(
    db = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """إحصائيات الإعلانات (للمدير)"""
    
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    now = datetime.utcnow()
    
    # إجمالي الإعلانات
    total_ads = await db.ads.count_documents({})
    
    # الإعلانات النشطة
    active_ads = await db.ads.count_documents({
        "status": "active",
        "end_date": {"$gt": now}
    })
    
    # إجمالي الإيرادات
    pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$cost"}}}
    ]
    revenue_result = await db.ads.aggregate(pipeline).to_list(length=1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # إجمالي المشاهدات والنقرات
    stats_pipeline = [
        {"$group": {
            "_id": None,
            "total_views": {"$sum": "$views"},
            "total_clicks": {"$sum": "$clicks"}
        }}
    ]
    stats_result = await db.ads.aggregate(stats_pipeline).to_list(length=1)
    total_views = stats_result[0]["total_views"] if stats_result else 0
    total_clicks = stats_result[0]["total_clicks"] if stats_result else 0
    
    return {
        "total_ads": total_ads,
        "active_ads": active_ads,
        "total_revenue": total_revenue,
        "total_views": total_views,
        "total_clicks": total_clicks
    }
