# /app/backend/server.py
# الملف الرئيسي للخادم - ترند سورية API
# تم تقسيم الكود إلى ملفات منفصلة في مجلد routes
# 🔒 محمي بـ 10 طبقات أمان
# ⚡ محسّن للأداء

from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import logging
from pathlib import Path
from dotenv import load_dotenv
import os
from datetime import datetime, timezone
import hashlib
import uuid
import time

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import database
from core.database import db, client

# ⚡ Import performance module
from core.performance import (
    create_database_indexes, 
    cache, 
    performance_monitor,
    IMAGE_OPTIMIZATION_CONFIG
)

# 🔒 Import security module
from core.security import (
    limiter, 
    rate_limit_exceeded_handler,
    add_security_headers,
    is_ip_blocked,
    log_suspicious_activity,
    SECURITY_HEADERS
)
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Import routers
from routes.auth import router as auth_router, seller_router, delivery_auth_router
from routes.products import router as products_router
from routes.cart import router as cart_router
from routes.orders import router as orders_router
from routes.shipping import router as shipping_router
from routes.stores import router as stores_router
from routes.messages import router as messages_router
from routes.reviews import router as reviews_router
from routes.notifications import router as notifications_router
from routes.user import router as user_router
from routes.admin import router as admin_router
from routes.delivery import router as delivery_router
from routes.wallet import router as wallet_router
from routes.payment import router as payment_router
from routes.settings import router as settings_router
from routes.ads import router as ads_router
from routes.discounts import router as discounts_router
from routes.loyalty import router as loyalty_router
from routes.image_processing import router as image_router
from routes.delivery_boxes import router as delivery_boxes_router
from routes.challenges import router as challenges_router
from routes.achievements import router as achievements_router
from routes.chatbot import router as chatbot_router
from routes.food import router as food_router
from routes.food_orders import router as food_orders_router
from routes.coupons import router as coupons_router
from routes.referrals import router as referrals_router
from routes.daily_deals import router as daily_deals_router
from routes.analytics import router as analytics_router
from routes.gifts import router as gifts_router
from routes.recommendations import router as recommendations_router
from routes.image_search import router as image_search_router
from routes.push_notifications import router as push_router
from routes.admin_settings import router as admin_settings_router
from routes.delivery_time import router as delivery_time_router
from routes.price_reports import router as price_reports_router
from routes.websocket import router as websocket_router

# Create FastAPI app
app = FastAPI(
    title="ترند سورية API", 
    description="API لمتجر ترند سورية الإلكتروني",
    docs_url="/api/docs" if os.environ.get("DEBUG") else None,  # إخفاء docs في الإنتاج
    redoc_url=None
)

# 🔒 إضافة Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# 🔒 Middleware للتحقق من IPs المحظورة
@app.middleware("http")
async def check_blocked_ips(request: Request, call_next):
    client_ip = request.client.host if request.client else "unknown"
    
    if is_ip_blocked(client_ip):
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=403,
            content={"detail": "تم حظر الوصول"}
        )
    
    return await call_next(request)

# 🔒 Middleware لإضافة Security Headers
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response

# Create main API router with /api prefix
api_router = APIRouter(prefix="/api")

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(seller_router)
api_router.include_router(delivery_auth_router)
api_router.include_router(products_router)
api_router.include_router(cart_router)
api_router.include_router(orders_router)
api_router.include_router(shipping_router)
api_router.include_router(stores_router)
api_router.include_router(messages_router)
api_router.include_router(reviews_router)
api_router.include_router(notifications_router)
api_router.include_router(user_router)
api_router.include_router(admin_router)
api_router.include_router(delivery_router)
api_router.include_router(wallet_router)
api_router.include_router(payment_router)
api_router.include_router(settings_router)
api_router.include_router(ads_router)
api_router.include_router(discounts_router)
api_router.include_router(loyalty_router)
api_router.include_router(image_router)
api_router.include_router(delivery_boxes_router)
api_router.include_router(challenges_router)
api_router.include_router(achievements_router)
api_router.include_router(chatbot_router)
api_router.include_router(food_router)
api_router.include_router(food_orders_router)
api_router.include_router(coupons_router)
api_router.include_router(referrals_router)
api_router.include_router(daily_deals_router)
api_router.include_router(analytics_router)
api_router.include_router(gifts_router)
api_router.include_router(recommendations_router)
api_router.include_router(image_search_router)
api_router.include_router(push_router)
api_router.include_router(admin_settings_router)
api_router.include_router(delivery_time_router)
api_router.include_router(price_reports_router)
api_router.include_router(websocket_router)

# ============== Categories ==============

CATEGORIES = [
    {"id": "electronics", "name": "إلكترونيات", "icon": "Smartphone"},
    {"id": "fashion", "name": "أزياء", "icon": "Shirt"},
    {"id": "home", "name": "المنزل", "icon": "Home"},
    {"id": "beauty", "name": "تجميل", "icon": "Sparkles"},
    {"id": "sports", "name": "رياضة", "icon": "Dumbbell"},
    {"id": "books", "name": "كتب", "icon": "BookOpen"},
    {"id": "toys", "name": "ألعاب", "icon": "Gamepad2"},
    {"id": "food", "name": "طعام", "icon": "UtensilsCrossed"},
    {"id": "health", "name": "صحة", "icon": "Heart"},
    {"id": "cleaning", "name": "أدوات تنظيف", "icon": "SprayCan"},
    {"id": "medicines", "name": "أدوية", "icon": "Pill"},
    {"id": "cars", "name": "سيارات", "icon": "Car"},
]

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

# ============== Root Endpoint ==============

@api_router.get("/")
async def root():
    return {"message": "مرحباً بك في ترند سورية API"}

# ============== Background Tasks ==============

import asyncio

async def reset_sold_out_products_task():
    """
    مهمة خلفية لإعادة المنتجات التي نفدت مؤقتاً
    تُشغّل كل ساعة للتحقق من المنتجات التي يجب إعادتها
    """
    while True:
        try:
            today = datetime.now(timezone.utc).date().isoformat()
            
            # إعادة المنتجات التي نفدت قبل اليوم
            result = await db.food_products.update_many(
                {
                    "availability_status": "sold_out_today",
                    "sold_out_date": {"$lt": today}
                },
                {
                    "$set": {
                        "availability_status": "available",
                        "is_available": True,
                        "availability_updated_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$unset": {"sold_out_date": ""}
                }
            )
            
            if result.modified_count > 0:
                logging.info(f"✅ تم إعادة {result.modified_count} منتج طعام إلى حالة 'متاح'")
        
        except Exception as e:
            logging.error(f"❌ خطأ في إعادة المنتجات: {e}")
        
        # انتظار ساعة
        await asyncio.sleep(3600)

@app.on_event("startup")
async def start_background_tasks():
    """تشغيل المهام الخلفية"""
    asyncio.create_task(reset_sold_out_products_task())
    logging.info("🔄 تم تشغيل مهمة إعادة المنتجات المنتهية")

# ============== Performance Stats ==============

@api_router.get("/performance/stats")
async def get_performance_stats():
    """⚡ إحصائيات الأداء والكاش"""
    return {
        "cache_stats": cache.stats,
        "performance_stats": performance_monitor.get_stats(),
        "image_config": IMAGE_OPTIMIZATION_CONFIG
    }

# ============== Seed Demo Data ==============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@api_router.post("/seed")
async def seed_demo_data():
    """
    ⚠️ هذا الـ endpoint للتطوير فقط - لا يُعيد كتابة البيانات الموجودة
    البيانات محفوظة في قاعدة البيانات ولن تتغير
    """
    # التحقق من وجود البيانات - إذا موجودة لا نفعل شيء
    existing_users = await db.users.count_documents({})
    existing_food_stores = await db.food_stores.count_documents({})
    existing_food_products = await db.food_products.count_documents({})
    
    if existing_users > 0 and existing_food_stores > 0 and existing_food_products > 0:
        return {
            "message": "البيانات موجودة مسبقاً ولن يتم تغييرها",
            "users": existing_users,
            "food_stores": existing_food_stores,
            "food_products": existing_food_products
        }
    
    # فقط إذا كانت قاعدة البيانات فارغة تماماً
    # Create admin user if not exists
    existing_admin = await db.users.find_one({"phone": "0911111111"})
    admin_id = str(uuid.uuid4())
    if not existing_admin:
        await db.users.insert_one({
            "id": admin_id,
            "name": "أحمد محمد علي",
            "full_name": "أحمد محمد علي",
            "password": hash_password("admin123"),
            "phone": "0911111111",
            "city": "دمشق",
            "user_type": "admin",
            "is_verified": True,
            "is_approved": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        admin_id = existing_admin.get("id")
    
    # Create demo seller if not exists
    existing_seller = await db.users.find_one({"phone": "0922222222"})
    seller_id = str(uuid.uuid4())
    if not existing_seller:
        await db.users.insert_one({
            "id": seller_id,
            "name": "خالد سعيد حسن",
            "full_name": "خالد سعيد حسن",
            "password": hash_password("seller123"),
            "phone": "0922222222",
            "city": "حلب",
            "user_type": "seller",
            "is_verified": True,
            "is_approved": True,
            "store_name": "متجر الأناقة",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        seller_id = existing_seller.get("id")
    
    # Create demo buyer if not exists
    existing_buyer = await db.users.find_one({"phone": "0933333333"})
    buyer_id = str(uuid.uuid4())
    if not existing_buyer:
        await db.users.insert_one({
            "id": buyer_id,
            "name": "محمد أحمد",
            "full_name": "محمد أحمد",
            "password": hash_password("user123"),
            "phone": "0933333333",
            "city": "دمشق",
            "user_type": "buyer",
            "is_verified": True,
            "is_approved": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        buyer_id = existing_buyer.get("id")
    
    # Create demo food seller (restaurant) if not exists
    existing_food = await db.users.find_one({"phone": "0944444444"})
    food_seller_id = str(uuid.uuid4())
    if not existing_food:
        await db.users.insert_one({
            "id": food_seller_id,
            "name": "مطعم الشام",
            "full_name": "مطعم الشام الدمشقي",
            "password": hash_password("food123"),
            "phone": "0944444444",
            "city": "دمشق",
            "user_type": "food_seller",
            "is_verified": True,
            "is_approved": True,
            "store_name": "مطعم الشام",
            "store_description": "أشهى المأكولات الشامية التقليدية",
            "store_address": "دمشق - شارع الحمرا",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        food_seller_id = existing_food.get("id")
    
    # Create demo delivery driver if not exists
    existing_delivery = await db.users.find_one({"phone": "0900000000"})
    delivery_id = str(uuid.uuid4())
    if not existing_delivery:
        await db.users.insert_one({
            "id": delivery_id,
            "name": "سامر التوصيل",
            "full_name": "سامر محمود",
            "password": hash_password("delivery123"),
            "phone": "0900000000",
            "city": "دمشق",
            "user_type": "delivery",
            "is_verified": True,
            "is_approved": True,
            "vehicle_type": "motorcycle",
            "vehicle_number": "دمشق 123456",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        delivery_id = existing_delivery.get("id")
    
    # Create demo food store if not exists
    existing_food_store = await db.food_stores.find_one({"owner_id": food_seller_id})
    if not existing_food_store:
        await db.food_stores.insert_one({
            "id": str(uuid.uuid4()),
            "owner_id": food_seller_id,
            "name": "مطعم الشام",
            "description": "أشهى المأكولات الشامية التقليدية",
            "store_type": "restaurants",
            "category": "restaurant",
            "cuisine_type": "syrian",
            "address": "دمشق، سوريا",
            "phone": "0944444444",
            "city": "دمشق",
            "image": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
            "cover_image": "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=1200",
            "logo": "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=400",
            "rating": 4.5,
            "reviews_count": 120,
            "delivery_time": "30-45",
            "min_order": 15000,
            "delivery_fee": 5000,
            "free_delivery_minimum": 50000,
            "minimum_order": 20000,
            "is_open": True,
            "is_active": True,
            "is_approved": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    # ⚠️ لا نُحدّث المتجر الموجود - البيانات محفوظة ولن تتغير
    
    # Demo food items for the restaurant
    food_store = await db.food_stores.find_one({"owner_id": food_seller_id})
    if food_store:
        existing_items = await db.food_products.count_documents({"store_id": food_store["id"]})
        if existing_items == 0:
            demo_food_items = [
        {
            "name": "شاورما دجاج",
            "description": "شاورما دجاج طازجة مع الثوم والمخللات",
            "price": 25000,
            "category": "shawarma",
            "preparation_time": 15,
            "is_available": True,
            "image": "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400"
        },
        {
            "name": "فتة حمص",
            "description": "فتة حمص بالسمنة والصنوبر",
            "price": 35000,
            "category": "appetizers",
            "preparation_time": 10,
            "is_available": True,
            "image": "https://images.unsplash.com/photo-1547058881-aa0edd92aab3?w=400"
        },
        {
            "name": "كباب حلبي",
            "description": "كباب لحم غنم مشوي على الفحم",
            "price": 85000,
            "category": "grills",
            "preparation_time": 25,
            "is_available": True,
            "image": "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400"
        },
        {
            "name": "فلافل",
            "description": "فلافل مقرمشة مع الطحينة",
            "price": 15000,
            "category": "sandwiches",
            "preparation_time": 10,
            "is_available": True,
            "image": "https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?w=400"
            }
        ]
        
            for item in demo_food_items:
                await db.food_products.insert_one({
                    "id": str(uuid.uuid4()),
                    "store_id": food_store["id"],
                    "seller_id": food_seller_id,
                    **item,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
    
    # Demo products - check if exist
    existing_products_count = await db.products.count_documents({})
    if existing_products_count == 0:
        demo_products = [
        {
            "name": "هاتف سامسونج Galaxy S24",
            "description": "هاتف ذكي بشاشة AMOLED وكاميرا 108 ميجابكسل",
            "price": 2500000,
            "category": "electronics",
            "stock": 15,
            "images": ["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400"]
        },
        {
            "name": "حقيبة يد نسائية فاخرة",
            "description": "حقيبة جلد طبيعي بتصميم عصري",
            "price": 450000,
            "category": "fashion",
            "stock": 20,
            "images": ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400"]
        },
        {
            "name": "سماعات لاسلكية Sony",
            "description": "سماعات بتقنية إلغاء الضوضاء",
            "price": 850000,
            "category": "electronics",
            "stock": 30,
            "images": ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"]
        },
        {
            "name": "ساعة يد رجالية",
            "description": "ساعة كلاسيكية بحزام جلد",
            "price": 320000,
            "category": "fashion",
            "stock": 25,
            "images": ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"]
        },
        {
            "name": "لابتوب Lenovo ThinkPad",
            "description": "لابتوب للأعمال بمعالج i7",
            "price": 3200000,
            "category": "electronics",
            "stock": 10,
            "images": ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400"]
        },
        {
            "name": "طقم أثاث غرفة جلوس",
            "description": "طقم كنب مودرن 3+2+1",
            "price": 5500000,
            "category": "home",
            "stock": 5,
            "images": ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400"]
        },
        {
            "name": "عطر رجالي Dior Sauvage",
            "description": "عطر فرنسي أصلي 100مل",
            "price": 280000,
            "category": "beauty",
            "stock": 40,
            "images": ["https://images.unsplash.com/photo-1541643600914-78b084683601?w=400"]
        },
        {
            "name": "دراجة رياضية",
            "description": "دراجة هوائية للتمارين المنزلية",
            "price": 750000,
            "category": "sports",
            "stock": 12,
            "images": ["https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400"]
        }
    ]
    
        for product in demo_products:
            await db.products.insert_one({
                "id": str(uuid.uuid4()),
                "seller_id": seller_id,
                "seller_name": "متجر الأناقة",
                "business_name": "متجر الأناقة",
                "city": "حلب",
                **product,
                "rating": round(3.5 + (hash(product["name"]) % 15) / 10, 1),
                "reviews_count": hash(product["name"]) % 50,
                "sales_count": hash(product["name"]) % 100,
                "is_active": True,
                "is_approved": True,
                "approval_status": "approved",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    return {"message": "تم إنشاء البيانات التجريبية بنجاح"}

# Include main router
app.include_router(api_router)

# 🔒 CORS Middleware - محسّن للأمان
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    expose_headers=["X-New-Token"],  # للتجديد التلقائي للتوكن
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Default commission rates
DEFAULT_CATEGORY_COMMISSIONS = {
    "إلكترونيات": 0.18,
    "أزياء": 0.17,
    "ملابس": 0.17,
    "أحذية": 0.21,
    "تجميل": 0.18,
    "مجوهرات": 0.16,
    "إكسسوارات": 0.16,
    "المنزل": 0.20,
    "رياضة": 0.16,
    "أطفال": 0.15,
    "كتب": 0.12,
    "ألعاب": 0.14,
    "default": 0.15,
}

@app.on_event("startup")
async def init_commission_rates():
    """تهيئة نسب العمولات الافتراضية في قاعدة البيانات"""
    existing = await db.commission_rates.find_one({"id": "main"})
    if not existing:
        await db.commission_rates.insert_one({
            "id": "main",
            "categories": DEFAULT_CATEGORY_COMMISSIONS,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("تم تهيئة نسب العمولات الافتراضية")

@app.on_event("startup")
async def init_database_indexes():
    """⚡ إنشاء فهارس قاعدة البيانات لتحسين الأداء"""
    await create_database_indexes(db)

@app.on_event("startup")
async def start_dispatch_background_tasks():
    """🚀 بدء مهام التوزيع التلقائي"""
    try:
        from services.background_tasks import start_background_tasks
        start_background_tasks()
        logger.info("✅ Background dispatch tasks started")
    except Exception as e:
        logger.error(f"❌ Failed to start background tasks: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    # إيقاف مهام الخلفية
    try:
        from services.background_tasks import stop_background_tasks
        stop_background_tasks()
        logger.info("Background tasks stopped")
    except Exception as e:
        logger.error(f"Error stopping background tasks: {e}")
    
    client.close()

# ============== Performance Monitoring Middleware ==============

@app.middleware("http")
async def performance_middleware(request: Request, call_next):
    """⚡ Middleware لمراقبة أداء الطلبات"""
    start_time = time.time()
    
    response = await call_next(request)
    
    # حساب مدة الطلب
    duration_ms = (time.time() - start_time) * 1000
    
    # تسجيل في مراقب الأداء
    performance_monitor.log_request(
        path=request.url.path,
        method=request.method,
        duration_ms=duration_ms,
        status_code=response.status_code
    )
    
    # إضافة header لمدة المعالجة
    response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
    
    return response
