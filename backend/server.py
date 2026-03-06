# /app/backend/server.py
# الملف الرئيسي للخادم - تريند سورية API
# تم تقسيم الكود إلى ملفات منفصلة في مجلد routes

from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import logging
from pathlib import Path
from dotenv import load_dotenv
import os
from datetime import datetime, timezone
import hashlib
import uuid

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import database
from core.database import db, client

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

# Create FastAPI app
app = FastAPI(title="تريند سورية API", description="API لمتجر تريند سورية الإلكتروني")

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
]

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

# ============== Root Endpoint ==============

@api_router.get("/")
async def root():
    return {"message": "مرحباً بك في تريند سورية API"}

# ============== Seed Demo Data ==============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@api_router.post("/seed")
async def seed_demo_data():
    # Check if already seeded
    existing = await db.products.count_documents({})
    if existing > 0:
        return {"message": "البيانات موجودة مسبقاً"}
    
    # Create admin user
    admin_id = str(uuid.uuid4())
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
    
    # Create demo seller
    seller_id = str(uuid.uuid4())
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
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create demo buyer
    buyer_id = str(uuid.uuid4())
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
    
    # Demo products
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

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
