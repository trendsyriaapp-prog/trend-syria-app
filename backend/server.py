from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, Query, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import hashlib
import jwt
import base64
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'trend-syria-secret-key-2024')
ALGORITHM = "HS256"

app = FastAPI(title="تريند سورية API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ============== Models ==============

class UserRegister(BaseModel):
    full_name: str  # الاسم الثلاثي
    phone: str  # رقم الهاتف - سيستخدم لتسجيل الدخول
    password: str
    city: str
    user_type: str = "buyer"  # buyer, seller, or delivery

class UserLogin(BaseModel):
    phone: str  # تسجيل الدخول برقم الهاتف
    password: str

class DeliveryDocuments(BaseModel):
    national_id: str  # رقم الهوية الوطنية
    personal_photo: str  # صورة شخصية Base64
    id_photo: str  # صورة الهوية كاملة Base64
    motorcycle_license: str  # شهادة/رخصة الدراجة Base64
    
class SellerDocuments(BaseModel):
    seller_id: str
    business_name: str
    business_license: str  # Base64 encoded image

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    stock: int
    images: List[str]  # Base64 encoded images
    video: Optional[str] = None  # فيديو المنتج Base64
    video_url: Optional[str] = None  # رابط فيديو المنتج (قديم)
    city: str  # مدينة البائع
    length_cm: Optional[float] = None  # الطول بالسنتيمتر
    width_cm: Optional[float] = None   # العرض بالسنتيمتر
    height_cm: Optional[float] = None  # الارتفاع بالسنتيمتر
    weight_kg: Optional[float] = None  # الوزن بالكيلوغرام
    size_type: Optional[str] = None  # نوع المقاس: clothes, shoes, pants, none
    available_sizes: Optional[List[str]] = None  # المقاسات المتوفرة

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    images: Optional[List[str]] = None
    video: Optional[str] = None
    video_url: Optional[str] = None
    city: Optional[str] = None
    length_cm: Optional[float] = None
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    size_type: Optional[str] = None
    available_sizes: Optional[List[str]] = None

class CartItem(BaseModel):
    product_id: str
    quantity: int
    selected_size: Optional[str] = None  # المقاس المختار

class OrderCreate(BaseModel):
    items: List[CartItem]
    address: str
    city: str
    phone: str
    payment_method: str = "shamcash"  # shamcash, syriatel_cash, mtn_cash
    payment_phone: Optional[str] = None

class ReviewCreate(BaseModel):
    product_id: str
    rating: int  # 1-5 نجوم
    comment: str
    images: Optional[List[str]] = []  # صور المنتج بعد الاستلام

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    product_id: Optional[str] = None

class ShamCashPayment(BaseModel):
    order_id: str
    phone: str
    otp: str

class SubAdminCreate(BaseModel):
    full_name: str
    phone: str
    password: str
    city: str

class ProductApproval(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None

class AddressCreate(BaseModel):
    title: str
    city: str
    area: str
    street_number: Optional[str] = None
    building_number: Optional[str] = None
    apartment_number: Optional[str] = None
    phone: str
    is_default: bool = False

class PaymentMethodCreate(BaseModel):
    type: str
    phone: str
    holder_name: str
    is_default: bool = False

class NotificationCreate(BaseModel):
    title: str
    message: str
    target: str = "all"  # all, buyers, sellers

class ProductQuestion(BaseModel):
    question: str

class ProductAnswer(BaseModel):
    answer: str

# ============== Helper Functions ==============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, user_type: str) -> str:
    payload = {
        "user_id": user_id,
        "user_type": user_type,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="غير مصرح")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="مستخدم غير موجود")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except jwt.PyJWTError:
        return None

# ============== Auth Routes ==============

@api_router.post("/auth/register")
async def register(user: UserRegister):
    existing = await db.users.find_one({"phone": user.phone})
    if existing:
        raise HTTPException(status_code=400, detail="رقم الهاتف مسجل مسبقاً")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user.full_name,
        "full_name": user.full_name,
        "phone": user.phone,
        "password": hash_password(user.password),
        "city": user.city,
        "user_type": user.user_type,
        "is_verified": user.user_type == "buyer",
        "is_approved": user.user_type == "buyer",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.user_type)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "name": user.full_name,
            "full_name": user.full_name,
            "phone": user.phone,
            "user_type": user.user_type,
            "is_approved": user_doc["is_approved"]
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"phone": credentials.phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="رقم الهاتف أو كلمة المرور غير صحيحة")
    
    # Check password - support both bcrypt and hashlib
    stored_password = user["password"]
    password_valid = False
    
    if stored_password.startswith("$2"):
        # Bcrypt hash
        try:
            password_valid = bcrypt.checkpw(credentials.password.encode(), stored_password.encode())
        except (ValueError, TypeError):
            password_valid = False
    else:
        # Old hashlib hash
        password_valid = stored_password == hash_password(credentials.password)
    
    if not password_valid:
        raise HTTPException(status_code=401, detail="رقم الهاتف أو كلمة المرور غير صحيحة")
    
    token = create_token(user["id"], user["user_type"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user.get("full_name", user.get("name", "")),
            "full_name": user.get("full_name", user.get("name", "")),
            "phone": user["phone"],
            "user_type": user["user_type"],
            "is_approved": user.get("is_approved", False)
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "name": user.get("full_name", user.get("name", "")),
        "full_name": user.get("full_name", user.get("name", "")),
        "phone": user.get("phone", ""),
        "city": user.get("city", ""),
        "user_type": user["user_type"],
        "is_approved": user.get("is_approved", False)
    }

# ============== Seller Documents ==============

@api_router.post("/seller/documents")
async def upload_seller_documents(docs: SellerDocuments, user: dict = Depends(get_current_user)):
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    doc = {
        "id": str(uuid.uuid4()),
        "seller_id": user["id"],
        "business_name": docs.business_name,
        "business_license": docs.business_license,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.seller_documents.insert_one(doc)
    return {"message": "تم رفع المستندات بنجاح، في انتظار الموافقة"}

@api_router.get("/seller/documents/status")
async def get_documents_status(user: dict = Depends(get_current_user)):
    doc = await db.seller_documents.find_one({"seller_id": user["id"]}, {"_id": 0})
    if not doc:
        return {"status": "not_submitted"}
    return {"status": doc["status"], "business_name": doc.get("business_name")}

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

# ============== Products ==============

@api_router.post("/products")
async def create_product(product: ProductCreate, user: dict = Depends(get_current_user)):
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    if not user.get("is_approved"):
        raise HTTPException(status_code=403, detail="حسابك غير مفعل بعد")
    
    # الحصول على اسم النشاط التجاري من وثائق البائع
    seller_docs = await db.seller_documents.find_one({"seller_id": user["id"]})
    business_name = seller_docs.get("business_name", user["name"]) if seller_docs else user["name"]
    
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
        "city": product.city,
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
        "is_approved": False,  # المنتج يحتاج موافقة
        "approval_status": "pending",  # pending, approved, rejected
        "rejection_reason": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    return {"id": product_id, "message": "تم إضافة المنتج بنجاح، في انتظار موافقة الإدارة"}

@api_router.get("/products")
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    city: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    # فقط المنتجات المعتمدة تظهر للعملاء
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
    
    skip = (page - 1) * limit
    products = await db.products.find(query, {"_id": 0, "seller_name": 0, "seller_phone": 0, "seller_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.products.count_documents(query)
    
    return {"products": products, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/products/featured")
async def get_featured_products():
    # فقط المنتجات المعتمدة
    products = await db.products.find({"is_active": True, "is_approved": True}, {"_id": 0, "seller_name": 0, "seller_phone": 0, "seller_id": 0}).sort("sales_count", -1).limit(8).to_list(8)
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str, authorization: Optional[str] = Header(default=None)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    # Get reviews
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).to_list(50)
    product["reviews"] = reviews
    
    # التحقق من نوع المستخدم
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
    
    # إخفاء معلومات البائع من العملاء (فقط المدير يراها)
    # نبقي seller_id للرابط إلى صفحة المتجر
    # نبقي city لحساب تكلفة الشحن
    if not is_admin:
        product.pop("seller_name", None)
        product.pop("seller_phone", None)
        # نبقي city للمنتج لحساب تكلفة الشحن
    
    return product

# تكلفة الشحن بين المحافظات (بالليرة السورية)
SHIPPING_COSTS = {
    "same_city": 0,  # نفس المحافظة - مجاني
    "nearby": 15000,  # محافظات قريبة
    "far": 25000,  # محافظات بعيدة
}

# المحافظات القريبة من بعضها
NEARBY_CITIES = {
    "دمشق": ["ريف دمشق", "درعا", "السويداء", "القنيطرة"],
    "ريف دمشق": ["دمشق", "درعا", "السويداء", "القنيطرة"],
    "حلب": ["إدلب", "الرقة", "الحسكة"],
    "حمص": ["حماة", "طرطوس"],
    "حماة": ["حمص", "إدلب", "طرطوس"],
    "اللاذقية": ["طرطوس", "إدلب"],
    "طرطوس": ["اللاذقية", "حمص", "حماة"],
    "درعا": ["دمشق", "ريف دمشق", "السويداء"],
    "السويداء": ["دمشق", "ريف دمشق", "درعا"],
    "إدلب": ["حلب", "حماة", "اللاذقية"],
    "الرقة": ["حلب", "دير الزور", "الحسكة"],
    "دير الزور": ["الرقة", "الحسكة"],
    "الحسكة": ["الرقة", "دير الزور", "حلب"],
    "القنيطرة": ["دمشق", "ريف دمشق", "درعا"],
}

@api_router.get("/shipping/calculate")
async def calculate_shipping(product_id: str, customer_city: str):
    """حساب تكلفة الشحن بناءً على موقع المنتج وموقع العميل"""
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    seller_city = product.get("city", "")
    
    # نفس المحافظة - مجاني
    if seller_city == customer_city:
        return {
            "shipping_cost": 0,
            "shipping_type": "free",
            "message": "توصيل مجاني - نفس المحافظة",
            "seller_city": seller_city,
            "customer_city": customer_city
        }
    
    # محافظات قريبة
    nearby = NEARBY_CITIES.get(seller_city, [])
    if customer_city in nearby:
        return {
            "shipping_cost": SHIPPING_COSTS["nearby"],
            "shipping_type": "nearby",
            "message": f"تكلفة الشحن من {seller_city} إلى {customer_city}",
            "seller_city": seller_city,
            "customer_city": customer_city
        }
    
    # محافظات بعيدة
    return {
        "shipping_cost": SHIPPING_COSTS["far"],
        "shipping_type": "far",
        "message": f"تكلفة الشحن من {seller_city} إلى {customer_city}",
        "seller_city": seller_city,
        "customer_city": customer_city
    }

@api_router.get("/shipping/cities")
async def get_cities():
    """قائمة المحافظات السورية"""
    return [
        "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", 
        "اللاذقية", "طرطوس", "درعا", "السويداء", 
        "إدلب", "الرقة", "دير الزور", "الحسكة", "القنيطرة"
    ]

@api_router.get("/products/{product_id}/similar")
async def get_similar_products(product_id: str, limit: int = 6):
    """الحصول على منتجات مشابهة من نفس الفئة"""
    # الحصول على المنتج الأصلي
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        return []
    
    # البحث عن منتجات من نفس الفئة (باستثناء المنتج الحالي)
    similar = await db.products.find(
        {
            "category": product.get("category"),
            "id": {"$ne": product_id},
            "is_active": True,
            "is_approved": True
        },
        {"_id": 0, "seller_name": 0, "seller_phone": 0, "seller_id": 0, "city": 0}
    ).limit(limit).to_list(limit)
    
    # إذا لم يكن هناك منتجات كافية من نفس الفئة، أضف منتجات عشوائية
    if len(similar) < limit:
        remaining = limit - len(similar)
        existing_ids = [product_id] + [p["id"] for p in similar]
        more_products = await db.products.find(
            {
                "id": {"$nin": existing_ids},
                "is_active": True,
                "is_approved": True
            },
            {"_id": 0, "seller_name": 0, "seller_phone": 0, "seller_id": 0, "city": 0}
        ).limit(remaining).to_list(remaining)
        similar.extend(more_products)
    
    return similar

@api_router.get("/seller/products")
async def get_seller_products(user: dict = Depends(get_current_user)):
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    products = await db.products.find({"seller_id": user["id"]}, {"_id": 0}).to_list(100)
    return products

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, update: ProductUpdate, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    if product["seller_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.products.update_one({"id": product_id}, {"$set": update_data})
    return {"message": "تم تحديث المنتج"}

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    if product["seller_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.products.update_one({"id": product_id}, {"$set": {"is_active": False}})
    return {"message": "تم حذف المنتج"}

# ============== Store/Seller Page ==============

@api_router.get("/seller/my-products")
async def get_seller_my_products(user: dict = Depends(get_current_user)):
    """منتجات البائع مع حالة الموافقة"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    products = await db.products.find(
        {"seller_id": user["id"], "is_active": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return products

@api_router.get("/stores/{seller_id}")
async def get_store_page(seller_id: str, authorization: Optional[str] = Header(default=None)):
    """صفحة المتجر - تظهر اسم المتجر ومنتجاته"""
    # البحث عن وثائق البائع للحصول على اسم المتجر
    seller_docs = await db.seller_documents.find_one({"seller_id": seller_id})
    seller = await db.users.find_one({"id": seller_id})
    
    if not seller:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    business_name = seller_docs.get("business_name", seller.get("name", "متجر")) if seller_docs else seller.get("name", "متجر")
    
    # الحصول على منتجات البائع (بدون معلومات البائع الخاصة)
    products = await db.products.find(
        {"seller_id": seller_id, "is_active": True}, 
        {"_id": 0, "seller_name": 0, "seller_phone": 0, "seller_id": 0, "city": 0}
    ).to_list(100)
    
    # عدد المتابعين
    followers_count = await db.follows.count_documents({"seller_id": seller_id})
    
    # التحقق إذا كان المستخدم متابع
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

@api_router.post("/stores/{seller_id}/follow")
async def follow_store(seller_id: str, user: dict = Depends(get_current_user)):
    """متابعة متجر"""
    # التحقق من وجود البائع
    seller = await db.users.find_one({"id": seller_id, "user_type": "seller"})
    if not seller:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    # التحقق من عدم المتابعة مسبقاً
    existing = await db.follows.find_one({"user_id": user["id"], "seller_id": seller_id})
    if existing:
        raise HTTPException(status_code=400, detail="أنت متابع لهذا المتجر بالفعل")
    
    # إضافة المتابعة
    follow_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "seller_id": seller_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.follows.insert_one(follow_doc)
    
    return {"message": "تمت المتابعة بنجاح"}

@api_router.delete("/stores/{seller_id}/follow")
async def unfollow_store(seller_id: str, user: dict = Depends(get_current_user)):
    """إلغاء متابعة متجر"""
    result = await db.follows.delete_one({"user_id": user["id"], "seller_id": seller_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="أنت لا تتابع هذا المتجر")
    
    return {"message": "تم إلغاء المتابعة"}

@api_router.get("/user/following")
async def get_following_stores(user: dict = Depends(get_current_user)):
    """الحصول على قائمة المتاجر المتابعة"""
    follows = await db.follows.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    stores = []
    for follow in follows:
        seller_docs = await db.seller_documents.find_one({"seller_id": follow["seller_id"]})
        seller = await db.users.find_one({"id": follow["seller_id"]})
        if seller:
            business_name = seller_docs.get("business_name", seller.get("name")) if seller_docs else seller.get("name")
            products_count = await db.products.count_documents({"seller_id": follow["seller_id"], "is_active": True})
            stores.append({
                "seller_id": follow["seller_id"],
                "business_name": business_name,
                "products_count": products_count,
                "followed_at": follow.get("created_at")
            })
    
    return stores

# ============== Favorites/Wishlist ==============

@api_router.post("/favorites/{product_id}")
async def add_to_favorites(product_id: str, user: dict = Depends(get_current_user)):
    """إضافة منتج للمفضلة"""
    # التحقق من وجود المنتج
    product = await db.products.find_one({"id": product_id, "is_active": True})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    # التحقق من عدم الإضافة مسبقاً
    existing = await db.favorites.find_one({"user_id": user["id"], "product_id": product_id})
    if existing:
        raise HTTPException(status_code=400, detail="المنتج موجود في المفضلة بالفعل")
    
    # إضافة للمفضلة
    favorite_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "product_id": product_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.favorites.insert_one(favorite_doc)
    
    return {"message": "تمت الإضافة للمفضلة"}

@api_router.delete("/favorites/{product_id}")
async def remove_from_favorites(product_id: str, user: dict = Depends(get_current_user)):
    """إزالة منتج من المفضلة"""
    result = await db.favorites.delete_one({"user_id": user["id"], "product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="المنتج غير موجود في المفضلة")
    
    return {"message": "تمت الإزالة من المفضلة"}

@api_router.get("/favorites")
async def get_favorites(user: dict = Depends(get_current_user)):
    """الحصول على قائمة المفضلة"""
    favorites = await db.favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(100)
    
    products = []
    for fav in favorites:
        product = await db.products.find_one(
            {"id": fav["product_id"], "is_active": True}, 
            {"_id": 0, "seller_name": 0, "seller_phone": 0, "city": 0}
        )
        if product:
            product["added_at"] = fav.get("created_at")
            products.append(product)
    
    return products

@api_router.get("/favorites/check/{product_id}")
async def check_favorite(product_id: str, user: dict = Depends(get_current_user)):
    """التحقق إذا كان المنتج في المفضلة"""
    favorite = await db.favorites.find_one({"user_id": user["id"], "product_id": product_id})
    return {"is_favorite": favorite is not None}

# ============== Cart ==============

@api_router.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart:
        return {"items": [], "total": 0}
    
    # Get product details for each item
    items_with_details = []
    total = 0
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            item_total = product["price"] * item["quantity"]
            items_with_details.append({
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "selected_size": item.get("selected_size"),
                "product": product,
                "item_total": item_total
            })
            total += item_total
    
    return {"items": items_with_details, "total": total}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": item.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    if product["stock"] < item.quantity:
        raise HTTPException(status_code=400, detail="الكمية غير متوفرة")
    
    # التحقق من المقاس إذا كان المنتج يحتوي على مقاسات
    if product.get("available_sizes") and len(product.get("available_sizes", [])) > 0:
        if not item.selected_size:
            raise HTTPException(status_code=400, detail="يرجى اختيار المقاس")
        if item.selected_size not in product["available_sizes"]:
            raise HTTPException(status_code=400, detail="المقاس غير متوفر")
    
    cart = await db.carts.find_one({"user_id": user["id"]})
    cart_item = {
        "product_id": item.product_id, 
        "quantity": item.quantity,
        "selected_size": item.selected_size
    }
    
    if cart:
        # Check if product already in cart (with same size)
        existing_item = next(
            (i for i in cart["items"] 
             if i["product_id"] == item.product_id and i.get("selected_size") == item.selected_size), 
            None
        )
        if existing_item:
            new_quantity = existing_item["quantity"] + item.quantity
            await db.carts.update_one(
                {"user_id": user["id"], "items.product_id": item.product_id, "items.selected_size": item.selected_size},
                {"$set": {"items.$.quantity": new_quantity}}
            )
        else:
            await db.carts.update_one(
                {"user_id": user["id"]},
                {"$push": {"items": cart_item}}
            )
    else:
        await db.carts.insert_one({
            "user_id": user["id"],
            "items": [cart_item]
        })
    
    return {"message": "تمت الإضافة إلى السلة"}

@api_router.put("/cart/update")
async def update_cart_item(item: CartItem, user: dict = Depends(get_current_user)):
    if item.quantity <= 0:
        await db.carts.update_one(
            {"user_id": user["id"]},
            {"$pull": {"items": {"product_id": item.product_id}}}
        )
    else:
        await db.carts.update_one(
            {"user_id": user["id"], "items.product_id": item.product_id},
            {"$set": {"items.$.quantity": item.quantity}}
        )
    return {"message": "تم تحديث السلة"}

@api_router.delete("/cart/{product_id}")
async def remove_from_cart(product_id: str, user: dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "تم الحذف من السلة"}

# ============== Orders ==============

@api_router.post("/orders")
async def create_order(order: OrderCreate, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="السلة فارغة")
    
    # Calculate total and validate stock
    items_details = []
    total = 0
    for item in cart["items"]:
        product = await db.products.find_one({"id": item["product_id"]})
        if not product:
            raise HTTPException(status_code=400, detail="منتج غير موجود")
        if product["stock"] < item["quantity"]:
            raise HTTPException(status_code=400, detail=f"الكمية غير متوفرة: {product['name']}")
        
        item_total = product["price"] * item["quantity"]
        items_details.append({
            "product_id": item["product_id"],
            "product_name": product["name"],
            "seller_id": product["seller_id"],
            "price": product["price"],
            "quantity": item["quantity"],
            "selected_size": item.get("selected_size"),
            "item_total": item_total,
            "image": product["images"][0] if product["images"] else None
        })
        total += item_total
    
    order_id = str(uuid.uuid4())
    order_doc = {
        "id": order_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "items": items_details,
        "total": total,
        "address": order.address,
        "city": order.city,
        "phone": order.phone,
        "payment_method": order.payment_method,
        "payment_phone": order.payment_phone,
        "status": "pending_payment",
        "delivery_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_doc)
    
    # Clear cart
    await db.carts.delete_one({"user_id": user["id"]})
    
    # Update product stock
    for item in cart["items"]:
        await db.products.update_one(
            {"id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"], "sales_count": item["quantity"]}}
        )
    
    return {"order_id": order_id, "total": total, "message": "تم إنشاء الطلب"}

@api_router.get("/orders")
async def get_orders(user: dict = Depends(get_current_user)):
    if user["user_type"] == "seller":
        # Get orders containing seller's products
        orders = await db.orders.find(
            {"items.seller_id": user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    else:
        orders = await db.orders.find(
            {"user_id": user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if order["user_id"] != user["id"] and user["user_type"] not in ["seller", "admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    return order

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str = Query(...), user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["seller", "admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"delivery_status": status}}
    )
    return {"message": "تم تحديث حالة الطلب"}

# ============== ShamCash Payment ==============

@api_router.post("/payment/shamcash/init")
async def init_shamcash_payment(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # Simulated OTP - في الواقع سيتم إرسال OTP عبر شام كاش
    return {
        "message": "تم إرسال رمز التحقق إلى رقم شام كاش",
        "order_id": order_id,
        "amount": order["total"]
    }

@api_router.post("/payment/shamcash/verify")
async def verify_shamcash_payment(payment: ShamCashPayment, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": payment.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # Simulated verification - في الواقع سيتم التحقق عبر API شام كاش
    # For demo, accept any 6-digit OTP
    if len(payment.otp) == 6 and payment.otp.isdigit():
        await db.orders.update_one(
            {"id": payment.order_id},
            {"$set": {"status": "paid", "payment_verified_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"success": True, "message": "تم الدفع بنجاح"}
    else:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")

# ============== Reviews ==============

@api_router.post("/reviews")
async def create_review(review: ReviewCreate, user: dict = Depends(get_current_user)):
    # Check if user purchased this product
    order = await db.orders.find_one({
        "user_id": user["id"],
        "items.product_id": review.product_id,
        "status": "paid"
    })
    if not order:
        raise HTTPException(status_code=400, detail="يجب شراء المنتج أولاً للتقييم")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({
        "user_id": user["id"],
        "product_id": review.product_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="تم تقييم هذا المنتج مسبقاً")
    
    review_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["name"],
        "product_id": review.product_id,
        "rating": review.rating,
        "comment": review.comment,
        "images": review.images or [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)
    
    # Update product rating
    reviews = await db.reviews.find({"product_id": review.product_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.products.update_one(
        {"id": review.product_id},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(reviews)}}
    )
    
    return {"message": "تم إضافة التقييم"}

@api_router.get("/reviews/{product_id}")
async def get_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).to_list(100)
    return reviews

# ============== Product Q&A (Public) ==============

@api_router.post("/products/{product_id}/questions")
async def ask_product_question(product_id: str, question: ProductQuestion, user: dict = Depends(get_current_user)):
    """Ask a public question about a product - visible to everyone"""
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    question_doc = {
        "id": str(uuid.uuid4()),
        "product_id": product_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "question": question.question,
        "answer": None,
        "answered_by": None,
        "answered_by_name": None,
        "answered_at": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.product_questions.insert_one(question_doc)
    return {"id": question_doc["id"], "message": "تم إرسال السؤال"}

@api_router.get("/products/{product_id}/questions")
async def get_product_questions(product_id: str):
    """Get all public questions and answers for a product - visible to everyone"""
    questions = await db.product_questions.find(
        {"product_id": product_id}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return questions

@api_router.post("/products/{product_id}/questions/{question_id}/answer")
async def answer_product_question(
    product_id: str, 
    question_id: str, 
    answer: ProductAnswer, 
    user: dict = Depends(get_current_user)
):
    """Seller or Admin answers a product question"""
    # Check if product exists and user is the seller or admin
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    is_seller = product.get("seller_id") == user["id"]
    is_admin = user["user_type"] in ["admin", "sub_admin"]
    
    if not is_seller and not is_admin:
        raise HTTPException(status_code=403, detail="فقط البائع أو المدير يمكنه الرد")
    
    # Update the question with the answer
    result = await db.product_questions.update_one(
        {"id": question_id, "product_id": product_id},
        {"$set": {
            "answer": answer.answer,
            "answered_by": user["id"],
            "answered_by_name": user["name"],
            "answered_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="السؤال غير موجود")
    
    return {"message": "تم إضافة الرد"}

# ============== Messages/Chat ==============

@api_router.post("/messages")
async def send_message(message: MessageCreate, user: dict = Depends(get_current_user)):
    msg_doc = {
        "id": str(uuid.uuid4()),
        "sender_id": user["id"],
        "sender_name": user["name"],
        "receiver_id": message.receiver_id,
        "content": message.content,
        "product_id": message.product_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(msg_doc)
    return {"message": "تم إرسال الرسالة"}

@api_router.get("/messages")
async def get_conversations(user: dict = Depends(get_current_user)):
    # Get all unique conversations
    pipeline = [
        {"$match": {"$or": [{"sender_id": user["id"]}, {"receiver_id": user["id"]}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": {
                "$cond": [
                    {"$eq": ["$sender_id", user["id"]]},
                    "$receiver_id",
                    "$sender_id"
                ]
            },
            "last_message": {"$first": "$$ROOT"},
            "unread_count": {
                "$sum": {
                    "$cond": [
                        {"$and": [
                            {"$eq": ["$receiver_id", user["id"]]},
                            {"$eq": ["$is_read", False]}
                        ]},
                        1,
                        0
                    ]
                }
            }
        }}
    ]
    conversations = await db.messages.aggregate(pipeline).to_list(100)
    
    # Get user details for each conversation
    result = []
    for conv in conversations:
        other_user = await db.users.find_one({"id": conv["_id"]}, {"_id": 0, "password": 0})
        if other_user:
            result.append({
                "user": other_user,
                "last_message": {
                    "content": conv["last_message"]["content"],
                    "created_at": conv["last_message"]["created_at"],
                    "is_mine": conv["last_message"]["sender_id"] == user["id"]
                },
                "unread_count": conv["unread_count"]
            })
    
    return result

@api_router.get("/messages/{other_user_id}")
async def get_chat_messages(other_user_id: str, user: dict = Depends(get_current_user)):
    messages = await db.messages.find({
        "$or": [
            {"sender_id": user["id"], "receiver_id": other_user_id},
            {"sender_id": other_user_id, "receiver_id": user["id"]}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    # Mark as read
    await db.messages.update_many(
        {"sender_id": other_user_id, "receiver_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return messages

# ============== Admin Routes ==============

@api_router.get("/admin/sellers/pending")
async def get_pending_sellers(user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    docs = await db.seller_documents.find({"status": "pending"}, {"_id": 0}).to_list(100)
    result = []
    for doc in docs:
        seller = await db.users.find_one({"id": doc["seller_id"]}, {"_id": 0, "password": 0})
        if seller:
            result.append({**doc, "seller": seller})
    return result

@api_router.post("/admin/sellers/{seller_id}/approve")
async def approve_seller(seller_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    await db.users.update_one({"id": seller_id}, {"$set": {"is_approved": True}})
    await db.seller_documents.update_one({"seller_id": seller_id}, {"$set": {"status": "approved"}})
    return {"message": "تم تفعيل البائع"}

@api_router.post("/admin/sellers/{seller_id}/reject")
async def reject_seller(seller_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    await db.seller_documents.update_one({"seller_id": seller_id}, {"$set": {"status": "rejected"}})
    return {"message": "تم رفض البائع"}

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    total_users = await db.users.count_documents({"user_type": "buyer"})
    total_sellers = await db.users.count_documents({"user_type": "seller"})
    total_delivery = await db.users.count_documents({"user_type": "delivery"})
    total_products = await db.products.count_documents({"approval_status": "approved"})
    total_orders = await db.orders.count_documents({})
    pending_sellers = await db.seller_documents.count_documents({"status": "pending"})
    pending_products = await db.products.count_documents({"approval_status": "pending"})
    pending_delivery = await db.delivery_documents.count_documents({"status": "pending"})
    total_sub_admins = await db.users.count_documents({"user_type": "sub_admin"})
    
    return {
        "total_users": total_users,
        "total_sellers": total_sellers,
        "total_delivery": total_delivery,
        "total_products": total_products,
        "total_orders": total_orders,
        "pending_sellers": pending_sellers,
        "pending_products": pending_products,
        "pending_delivery": pending_delivery,
        "total_sub_admins": total_sub_admins
    }

# ============== Sub-Admin Management ==============

@api_router.post("/admin/sub-admins")
async def create_sub_admin(sub_admin: SubAdminCreate, user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    existing = await db.users.find_one({"phone": sub_admin.phone})
    if existing:
        raise HTTPException(status_code=400, detail="رقم الهاتف مسجل مسبقاً")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": sub_admin.full_name,
        "full_name": sub_admin.full_name,
        "phone": sub_admin.phone,
        "password": hash_password(sub_admin.password),
        "city": sub_admin.city,
        "user_type": "sub_admin",
        "is_verified": True,
        "is_approved": True,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    return {"id": user_id, "message": "تم إضافة المدير التنفيذي بنجاح"}

@api_router.get("/admin/sub-admins")
async def get_sub_admins(user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    sub_admins = await db.users.find(
        {"user_type": "sub_admin"},
        {"_id": 0, "password": 0}
    ).to_list(100)
    return sub_admins

@api_router.delete("/admin/sub-admins/{sub_admin_id}")
async def delete_sub_admin(sub_admin_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    result = await db.users.delete_one({"id": sub_admin_id, "user_type": "sub_admin"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="المدير التنفيذي غير موجود")
    
    return {"message": "تم حذف المدير التنفيذي"}


# ============== Admin - All Users ==============

@api_router.get("/admin/users")
async def get_all_users(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    users = await db.users.find(
        {"user_type": "buyer"},
        {"_id": 0, "password": 0}
    ).sort("created_at", -1).to_list(500)
    return users

@api_router.get("/admin/sellers")
async def get_all_sellers(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    sellers = await db.users.find(
        {"user_type": "seller"},
        {"_id": 0, "password": 0}
    ).sort("created_at", -1).to_list(500)
    
    # إضافة معلومات الوثائق لكل بائع
    for seller in sellers:
        doc = await db.seller_documents.find_one({"seller_id": seller["id"]}, {"_id": 0})
        seller["documents"] = doc
    
    return sellers

@api_router.get("/admin/orders")
async def get_all_orders(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@api_router.get("/admin/products/all")
async def get_all_products_admin(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    products = await db.products.find(
        {"approval_status": "approved"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return products

@api_router.delete("/admin/products/clear-all")
async def delete_all_products(user: dict = Depends(get_current_user)):
    """Delete all products - Admin only"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    result = await db.products.delete_many({})
    await db.cart_items.delete_many({})
    await db.reviews.delete_many({})
    await db.product_questions.delete_many({})
    
    return {"message": f"تم حذف {result.deleted_count} منتج"}


# ============== Delivery Driver System ==============

@api_router.post("/delivery/documents")
async def submit_delivery_documents(docs: DeliveryDocuments, user: dict = Depends(get_current_user)):
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # التحقق من عدم وجود وثائق سابقة
    existing = await db.delivery_documents.find_one({"driver_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="تم إرسال الوثائق مسبقاً")
    
    doc_id = str(uuid.uuid4())
    doc_data = {
        "id": doc_id,
        "driver_id": user["id"],
        "driver_name": user["full_name"] or user.get("name"),
        "driver_phone": user["phone"],
        "driver_city": user["city"],
        "national_id": docs.national_id,
        "personal_photo": docs.personal_photo,
        "id_photo": docs.id_photo,
        "motorcycle_license": docs.motorcycle_license,
        "status": "pending",  # pending, approved, rejected
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.delivery_documents.insert_one(doc_data)
    return {"message": "تم إرسال الوثائق بنجاح، في انتظار موافقة الإدارة"}

@api_router.get("/delivery/documents/status")
async def get_delivery_doc_status(user: dict = Depends(get_current_user)):
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    doc = await db.delivery_documents.find_one({"driver_id": user["id"]}, {"_id": 0})
    if not doc:
        return {"status": "not_submitted"}
    return {"status": doc["status"], "documents": doc}

@api_router.get("/delivery/available-orders")
async def get_available_orders_for_delivery(user: dict = Depends(get_current_user)):
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # التحقق من اعتماد موظف التوصيل
    doc = await db.delivery_documents.find_one({"driver_id": user["id"]})
    if not doc or doc["status"] != "approved":
        raise HTTPException(status_code=403, detail="يجب أن تكون معتمداً لمشاهدة الطلبات")
    
    # جلب الطلبات المدفوعة التي لم يتم تعيين موظف توصيل لها
    orders = await db.orders.find(
        {"status": "paid", "delivery_driver_id": {"$exists": False}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # إضافة عناوين البائع والمشتري لكل طلب
    for order in orders:
        # عنوان المشتري (موجود في الطلب)
        order["buyer_address"] = {
            "name": order.get("user_name"),
            "phone": order.get("phone"),
            "city": order.get("city"),
            "address": order.get("address")
        }
        
        # جلب عناوين البائعين من المنتجات
        seller_addresses = []
        for item in order.get("items", []):
            seller = await db.users.find_one({"id": item.get("seller_id")}, {"_id": 0, "password": 0})
            if seller:
                seller_doc = await db.seller_documents.find_one({"seller_id": seller["id"]}, {"_id": 0})
                seller_addresses.append({
                    "name": seller.get("full_name") or seller.get("name"),
                    "phone": seller.get("phone"),
                    "city": seller.get("city"),
                    "business_name": seller_doc.get("business_name") if seller_doc else None
                })
        order["seller_addresses"] = seller_addresses
    
    return orders

@api_router.post("/delivery/take-order/{order_id}")
async def take_delivery_order(order_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # التحقق من اعتماد موظف التوصيل
    doc = await db.delivery_documents.find_one({"driver_id": user["id"]})
    if not doc or doc["status"] != "approved":
        raise HTTPException(status_code=403, detail="يجب أن تكون معتمداً لأخذ الطلبات")
    
    # التحقق من أوقات العمل (8 صباحاً - 6 مساءً) - معطل للاختبار
    # now = datetime.now(timezone.utc)
    # local_hour = (now.hour + 3) % 24
    # if local_hour < 8 or local_hour >= 18:
    #     raise HTTPException(
    #         status_code=400, 
    #         detail="لا يمكن أخذ طلبات خارج أوقات العمل (8 صباحاً - 6 مساءً)"
    #     )
    
    # التحقق من وجود الطلب
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("delivery_driver_id"):
        raise HTTPException(status_code=400, detail="تم تعيين موظف توصيل آخر لهذا الطلب")
    
    if order.get("status") != "paid":
        raise HTTPException(status_code=400, detail="الطلب غير مدفوع")
    
    # تعيين موظف التوصيل للطلب
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "delivery_driver_id": user["id"],
            "delivery_driver_name": user.get("full_name") or user.get("name"),
            "delivery_driver_phone": user["phone"],
            "delivery_status": "picked_up",
            "delivery_assigned_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "تم تعيينك لتوصيل هذا الطلب بنجاح"}

@api_router.get("/delivery/my-orders")
async def get_my_delivery_orders(user: dict = Depends(get_current_user)):
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    orders = await db.orders.find(
        {"delivery_driver_id": user["id"]},
        {"_id": 0}
    ).sort("delivery_assigned_at", -1).to_list(100)
    
    return orders

@api_router.post("/delivery/complete-order/{order_id}")
async def complete_delivery_order(order_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.orders.find_one({"id": order_id, "delivery_driver_id": user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود أو ليس معيناً لك")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "delivery_status": "delivered",
            "delivered_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "تم تسليم الطلب بنجاح"}

# ============== Admin - Delivery Drivers ==============

@api_router.get("/admin/delivery/pending")
async def get_pending_delivery_drivers(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    docs = await db.delivery_documents.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return docs

@api_router.get("/admin/delivery/all")
async def get_all_delivery_drivers(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    drivers = await db.users.find(
        {"user_type": "delivery"},
        {"_id": 0, "password": 0}
    ).sort("created_at", -1).to_list(100)
    
    # إضافة معلومات الوثائق لكل سائق
    for driver in drivers:
        doc = await db.delivery_documents.find_one({"driver_id": driver["id"]}, {"_id": 0})
        driver["documents"] = doc
    
    return drivers

@api_router.post("/admin/delivery/{driver_id}/approve")
async def approve_delivery_driver(driver_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.delivery_documents.update_one(
        {"driver_id": driver_id},
        {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="لم يتم العثور على الوثائق")
    
    return {"message": "تم اعتماد موظف التوصيل"}

@api_router.post("/admin/delivery/{driver_id}/reject")
async def reject_delivery_driver(driver_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.delivery_documents.update_one(
        {"driver_id": driver_id},
        {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="لم يتم العثور على الوثائق")
    
    return {"message": "تم رفض موظف التوصيل"}


# ============== Product Approval ==============

@api_router.get("/admin/products/pending")
async def get_pending_products(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    products = await db.products.find(
        {"approval_status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # إضافة معلومات البائع
    for product in products:
        seller = await db.users.find_one({"id": product["seller_id"]}, {"_id": 0, "password": 0})
        if seller:
            product["seller"] = seller
    
    return products

@api_router.post("/admin/products/{product_id}/approve")
async def approve_product(product_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.products.update_one(
        {"id": product_id},
        {
            "$set": {
                "is_approved": True,
                "approval_status": "approved",
                "approved_by": user["id"],
                "approved_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    return {"message": "تم الموافقة على المنتج"}

@api_router.post("/admin/products/{product_id}/reject")
async def reject_product(product_id: str, approval: ProductApproval, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.products.update_one(
        {"id": product_id},
        {
            "$set": {
                "is_approved": False,
                "approval_status": "rejected",
                "rejection_reason": approval.rejection_reason,
                "rejected_by": user["id"],
                "rejected_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    return {"message": "تم رفض المنتج"}

# ============== Seed Demo Data ==============

# ============== User Addresses ==============

@api_router.get("/user/addresses")
async def get_user_addresses(user: dict = Depends(get_current_user)):
    addresses = await db.addresses.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("is_default", -1).to_list(20)
    return addresses

@api_router.post("/user/addresses")
async def create_address(address: AddressCreate, user: dict = Depends(get_current_user)):
    address_id = str(uuid.uuid4())
    
    # If this is set as default, unset other defaults
    if address.is_default:
        await db.addresses.update_many(
            {"user_id": user["id"]},
            {"$set": {"is_default": False}}
        )
    
    # If this is the first address, make it default
    existing_count = await db.addresses.count_documents({"user_id": user["id"]})
    is_default = address.is_default or existing_count == 0
    
    address_doc = {
        "id": address_id,
        "user_id": user["id"],
        "title": address.title,
        "city": address.city,
        "area": address.area,
        "street": address.street,
        "building": address.building,
        "floor": address.floor,
        "details": address.details,
        "phone": address.phone,
        "is_default": is_default,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.addresses.insert_one(address_doc)
    return {"id": address_id, "message": "تم إضافة العنوان بنجاح"}

@api_router.put("/user/addresses/{address_id}")
async def update_address(address_id: str, address: AddressCreate, user: dict = Depends(get_current_user)):
    existing = await db.addresses.find_one({"id": address_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="العنوان غير موجود")
    
    if address.is_default:
        await db.addresses.update_many(
            {"user_id": user["id"]},
            {"$set": {"is_default": False}}
        )
    
    await db.addresses.update_one(
        {"id": address_id},
        {"$set": {
            "title": address.title,
            "city": address.city,
            "area": address.area,
            "street": address.street,
            "building": address.building,
            "floor": address.floor,
            "details": address.details,
            "phone": address.phone,
            "is_default": address.is_default
        }}
    )
    return {"message": "تم تحديث العنوان"}

@api_router.delete("/user/addresses/{address_id}")
async def delete_address(address_id: str, user: dict = Depends(get_current_user)):
    result = await db.addresses.delete_one({"id": address_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العنوان غير موجود")
    return {"message": "تم حذف العنوان"}

@api_router.post("/user/addresses/{address_id}/default")
async def set_default_address(address_id: str, user: dict = Depends(get_current_user)):
    existing = await db.addresses.find_one({"id": address_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="العنوان غير موجود")
    
    await db.addresses.update_many(
        {"user_id": user["id"]},
        {"$set": {"is_default": False}}
    )
    await db.addresses.update_one(
        {"id": address_id},
        {"$set": {"is_default": True}}
    )
    return {"message": "تم تعيين العنوان الافتراضي"}

# ============== User Payment Methods ==============

@api_router.get("/user/payment-methods")
async def get_payment_methods(user: dict = Depends(get_current_user)):
    methods = await db.payment_methods.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("is_default", -1).to_list(20)
    return methods

@api_router.post("/user/payment-methods")
async def create_payment_method(payment: PaymentMethodCreate, user: dict = Depends(get_current_user)):
    payment_id = str(uuid.uuid4())
    
    if payment.is_default:
        await db.payment_methods.update_many(
            {"user_id": user["id"]},
            {"$set": {"is_default": False}}
        )
    
    existing_count = await db.payment_methods.count_documents({"user_id": user["id"]})
    is_default = payment.is_default or existing_count == 0
    
    payment_doc = {
        "id": payment_id,
        "user_id": user["id"],
        "type": payment.type,
        "phone": payment.phone,
        "holder_name": payment.holder_name,
        "is_default": is_default,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_methods.insert_one(payment_doc)
    return {"id": payment_id, "message": "تم إضافة طريقة الدفع بنجاح"}

@api_router.put("/user/payment-methods/{payment_id}")
async def update_payment_method(payment_id: str, payment: PaymentMethodCreate, user: dict = Depends(get_current_user)):
    existing = await db.payment_methods.find_one({"id": payment_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="طريقة الدفع غير موجودة")
    
    if payment.is_default:
        await db.payment_methods.update_many(
            {"user_id": user["id"]},
            {"$set": {"is_default": False}}
        )
    
    await db.payment_methods.update_one(
        {"id": payment_id},
        {"$set": {
            "type": payment.type,
            "phone": payment.phone,
            "holder_name": payment.holder_name,
            "is_default": payment.is_default
        }}
    )
    return {"message": "تم تحديث طريقة الدفع"}

@api_router.delete("/user/payment-methods/{payment_id}")
async def delete_payment_method(payment_id: str, user: dict = Depends(get_current_user)):
    result = await db.payment_methods.delete_one({"id": payment_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="طريقة الدفع غير موجودة")
    return {"message": "تم حذف طريقة الدفع"}

@api_router.post("/user/payment-methods/{payment_id}/default")
async def set_default_payment(payment_id: str, user: dict = Depends(get_current_user)):
    existing = await db.payment_methods.find_one({"id": payment_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="طريقة الدفع غير موجودة")
    
    await db.payment_methods.update_many(
        {"user_id": user["id"]},
        {"$set": {"is_default": False}}
    )
    await db.payment_methods.update_one(
        {"id": payment_id},
        {"$set": {"is_default": True}}
    )
    return {"message": "تم تعيين طريقة الدفع الافتراضية"}

# ============== Demo Data ==============

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
            **product,
            "rating": round(3.5 + (hash(product["name"]) % 15) / 10, 1),
            "reviews_count": hash(product["name"]) % 50,
            "sales_count": hash(product["name"]) % 100,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "تم إنشاء البيانات التجريبية بنجاح"}

# ============== Notifications API ==============

@api_router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    """Get user notifications"""
    notifications = await db.notifications.find(
        {"$or": [
            {"target": "all"},
            {"target": user.get("user_type", "buyer") + "s"},
            {"user_id": user["id"]}
        ]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Get user's read notifications
    user_reads = await db.notification_reads.find(
        {"user_id": user["id"]},
        {"_id": 0, "notification_id": 1}
    ).to_list(100)
    read_ids = {r["notification_id"] for r in user_reads}
    
    # Add is_read flag
    for n in notifications:
        n["is_read"] = n["id"] in read_ids
    
    return notifications

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    await db.notification_reads.update_one(
        {"user_id": user["id"], "notification_id": notification_id},
        {"$set": {
            "user_id": user["id"],
            "notification_id": notification_id,
            "read_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "تم تحديد الإشعار كمقروء"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    notifications = await db.notifications.find(
        {"$or": [
            {"target": "all"},
            {"target": user.get("user_type", "buyer") + "s"},
            {"user_id": user["id"]}
        ]},
        {"_id": 0, "id": 1}
    ).to_list(100)
    
    for n in notifications:
        await db.notification_reads.update_one(
            {"user_id": user["id"], "notification_id": n["id"]},
            {"$set": {
                "user_id": user["id"],
                "notification_id": n["id"],
                "read_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    
    return {"message": "تم تحديد جميع الإشعارات كمقروءة"}

@api_router.post("/admin/notifications")
async def create_notification(data: NotificationCreate, user: dict = Depends(get_current_user)):
    """Create notification (Admin only)"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    notification = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "message": data.message,
        "target": data.target,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    if "_id" in notification:
        del notification["_id"]
    
    return {"message": "تم إرسال الإشعار بنجاح", "notification": notification}

@api_router.get("/admin/notifications")
async def get_admin_notifications(user: dict = Depends(get_current_user)):
    """Get all notifications (Admin only)"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    notifications = await db.notifications.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)
    
    return notifications

@api_router.delete("/admin/notifications/{notification_id}")
async def delete_notification(notification_id: str, user: dict = Depends(get_current_user)):
    """Delete notification (Admin only)"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    result = await db.notifications.delete_one({"id": notification_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الإشعار غير موجود")
    
    # Also delete read records
    await db.notification_reads.delete_many({"notification_id": notification_id})
    
    return {"message": "تم حذف الإشعار"}

@api_router.get("/")
async def root():
    return {"message": "مرحباً بك في تريند سورية API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
