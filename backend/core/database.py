# /app/backend/core/database.py
# إعداد قاعدة البيانات والمصادقة
# 🔒 محمي بنظام JWT محسّن مع تجديد تلقائي
# ⚡ محسّن للأداء والاستقرار

from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt
import hashlib
import secrets
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
import logging
from functools import wraps

logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection settings
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'trend_syria')

# ⚡ إعدادات محسّنة للاتصال
MONGO_SETTINGS = {
    # Timeouts
    'serverSelectionTimeoutMS': 10000,  # 10 ثواني للعثور على سيرفر
    'connectTimeoutMS': 10000,          # 10 ثواني للاتصال
    'socketTimeoutMS': 30000,           # 30 ثانية للعمليات
    
    # Connection Pool - إبقاء اتصالات جاهزة
    'minPoolSize': 5,                   # 5 اتصالات جاهزة دائماً
    'maxPoolSize': 50,                  # 50 اتصال كحد أقصى
    'maxIdleTimeMS': 60000,             # إغلاق الاتصال الخامل بعد دقيقة
    
    # Keep-Alive - إبقاء الاتصال حياً
    'heartbeatFrequencyMS': 10000,      # نبضة قلب كل 10 ثواني
    
    # Retry - إعادة المحاولة
    'retryWrites': True,                # إعادة محاولة الكتابة
    'retryReads': True,                 # إعادة محاولة القراءة
    
    # تحسينات إضافية
    'w': 'majority',                    # تأكيد الكتابة من أغلب السيرفرات
    'journal': True,                    # تأكيد الحفظ في السجل
    'compressors': ['zstd', 'snappy', 'zlib'],  # ضغط البيانات
    
    # App Name للتتبع
    'appName': 'TrendSyria'
}

try:
    # إنشاء الاتصال مع الإعدادات المحسّنة
    client = AsyncIOMotorClient(mongo_url, **MONGO_SETTINGS)
    db = client[db_name]
    logger.info(f"✅ MongoDB client initialized for database: {db_name}")
    logger.info(f"   Pool: min={MONGO_SETTINGS['minPoolSize']}, max={MONGO_SETTINGS['maxPoolSize']}")
except Exception as e:
    logger.error(f"❌ MongoDB connection error: {e}")
    # إنشاء اتصال افتراضي حتى لا يفشل الاستيراد
    client = AsyncIOMotorClient('mongodb://localhost:27017', serverSelectionTimeoutMS=1000)
    db = client[db_name]


# ============== Database Retry Helper ==============

def with_retry(max_retries=3, delay=0.5):
    """
    Decorator لإعادة المحاولة عند فشل عمليات قاعدة البيانات
    يعمل مع الدوال async فقط
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    
                    # أخطاء يمكن إعادة المحاولة
                    retryable_errors = [
                        'timeout', 'timed out', 'connection', 'network',
                        'serverselection', 'no servers', 'not master',
                        'socket', 'reset by peer'
                    ]
                    
                    is_retryable = any(err in error_str for err in retryable_errors)
                    
                    if is_retryable and attempt < max_retries - 1:
                        wait_time = delay * (attempt + 1)  # زيادة وقت الانتظار
                        logger.warning(f"⚠️ Retry {attempt + 1}/{max_retries} for {func.__name__}: {e}")
                        await asyncio.sleep(wait_time)
                    else:
                        raise last_error
            raise last_error
        return wrapper
    return decorator


# ============== Database Health Check ==============

async def check_database_connection():
    """
    فحص صحة الاتصال بقاعدة البيانات
    يُستخدم في health check endpoint
    """
    try:
        # محاولة عملية بسيطة
        await client.admin.command('ping')
        return True, "Connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False, str(e)


async def warm_up_connection():
    """
    "تسخين" الاتصال بقاعدة البيانات
    يُستدعى عند بدء التطبيق
    """
    try:
        # تنفيذ عملية بسيطة لفتح الاتصالات
        await client.admin.command('ping')
        # جلب document واحد لتفعيل connection pool
        await db.users.find_one({}, {'_id': 1})
        logger.info("✅ Database connection warmed up")
        return True
    except Exception as e:
        logger.error(f"❌ Database warm-up failed: {e}")
        return False


# ============== MongoDB Indexes للسرعة ==============

async def create_indexes():
    """
    إنشاء فهارس MongoDB لتسريع الاستعلامات
    هذا يحسن سرعة البحث بشكل كبير (من ثواني إلى ميلي ثانية)
    """
    try:
        logger.info("🔧 Creating MongoDB indexes...")
        
        # فهارس جدول المنتجات (الأهم)
        await db.products.create_index("id", unique=True)
        await db.products.create_index("is_active")
        await db.products.create_index("is_approved")
        await db.products.create_index("category")
        await db.products.create_index("seller_id")
        await db.products.create_index("created_at")
        await db.products.create_index("sales_count")
        await db.products.create_index("is_sponsored")
        await db.products.create_index("free_shipping")
        # فهرس مركب للبحث الشائع
        await db.products.create_index([
            ("is_active", 1),
            ("is_approved", 1),
            ("created_at", -1)
        ])
        await db.products.create_index([
            ("is_active", 1),
            ("is_approved", 1),
            ("sales_count", -1)
        ])
        
        # فهارس جدول المستخدمين
        await db.users.create_index("id", unique=True)
        await db.users.create_index("phone", unique=True)
        await db.users.create_index("user_type")
        await db.users.create_index("is_approved")
        
        # فهارس جدول الطلبات
        await db.orders.create_index("id", unique=True)
        await db.orders.create_index("buyer_id")
        await db.orders.create_index("seller_id")
        await db.orders.create_index("status")
        await db.orders.create_index("created_at")
        await db.orders.create_index([("buyer_id", 1), ("created_at", -1)])
        
        # فهارس طلبات الطعام
        await db.food_orders.create_index("id", unique=True)
        await db.food_orders.create_index("buyer_id")
        await db.food_orders.create_index("store_id")
        await db.food_orders.create_index("driver_id")
        await db.food_orders.create_index("status")
        await db.food_orders.create_index("created_at")
        
        # فهارس الإعلانات
        await db.ads.create_index("is_active")
        await db.ads.create_index("created_at")
        
        # فهارس الإعدادات
        await db.settings.create_index("key", unique=True)
        await db.ticker_messages.create_index("id", unique=True)
        
        # فهارس وثائق البائعين والسائقين
        await db.seller_documents.create_index("seller_id")
        await db.seller_documents.create_index("status")
        await db.delivery_documents.create_index("driver_id")
        await db.delivery_documents.create_index("delivery_id")
        await db.delivery_documents.create_index("status")
        
        # فهارس المحافظ
        await db.wallets.create_index("user_id", unique=True)
        await db.wallet_transactions.create_index("user_id")
        await db.wallet_transactions.create_index("created_at")
        
        # ============================================
        # 🚀 فهارس إضافية لتسريع الاستعلامات المعقدة
        # ============================================
        
        # فهارس طلبات المنتجات (للسائقين)
        await db.orders.create_index("delivery_driver_id")
        await db.orders.create_index("delivery_status")
        await db.orders.create_index("city")
        await db.orders.create_index([
            ("delivery_status", 1),
            ("delivery_driver_id", 1),
            ("city", 1)
        ])
        
        # فهارس طلبات الطعام (للسائقين)
        await db.food_orders.create_index("delivery_city")
        await db.food_orders.create_index([
            ("status", 1),
            ("driver_id", 1),
            ("delivery_city", 1)
        ])
        await db.food_orders.create_index("batch_id")
        await db.food_orders.create_index("driver_requested")
        await db.food_orders.create_index("driver_status")
        
        # فهارس متاجر الطعام
        await db.food_stores.create_index("id", unique=True)
        await db.food_stores.create_index("owner_id")
        await db.food_stores.create_index("is_approved")
        await db.food_stores.create_index("is_active")
        await db.food_stores.create_index("store_type")
        await db.food_stores.create_index("city")
        
        # فهارس أطباق الطعام
        await db.food_items.create_index("id", unique=True)
        await db.food_items.create_index("store_id")
        await db.food_items.create_index("is_approved")
        await db.food_items.create_index("category")
        
        # فهارس منتجات الطعام
        await db.food_products.create_index("id", unique=True)
        await db.food_products.create_index("store_id")
        await db.food_products.create_index("approval_status")
        await db.food_products.create_index("category")
        
        # فهارس عروض الفلاش
        await db.flash_sales.create_index("id", unique=True)
        await db.flash_sales.create_index("is_active")
        await db.flash_sale_requests.create_index("store_id")
        await db.flash_sale_requests.create_index("seller_id")
        await db.flash_sale_requests.create_index("status")
        
        # فهارس الإشعارات
        await db.notifications.create_index("user_id")
        await db.notifications.create_index("is_read")
        await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
        
        # فهارس التقييمات
        await db.driver_ratings.create_index("driver_id")
        await db.driver_achievements.create_index("driver_id")
        await db.driver_violations.create_index("driver_id")
        await db.driver_violations.create_index("status")
        
        # فهارس مركبة للأداء الأمثل
        await db.products.create_index([
            ("seller_id", 1),
            ("is_active", 1),
            ("approval_status", 1)
        ])
        await db.food_orders.create_index([
            ("store_id", 1),
            ("status", 1),
            ("created_at", -1)
        ])
        
        logger.info("✅ MongoDB indexes created successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to create indexes: {e}")
        return False

# 🔒 JWT Settings - مفتاح أقوى
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer(auto_error=False)

# ============== Helper Functions ==============

def hash_password(password: str) -> str:
    """للتوافق مع الكود القديم - استخدم hash_password_secure من security.py"""
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, user_type: str) -> str:
    """إنشاء توكن JWT"""
    payload = {
        "user_id": user_id,
        "user_type": user_type,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * TOKEN_EXPIRE_DAYS,
        "iat": datetime.now(timezone.utc).timestamp()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """🔒 التحقق من المستخدم مع تجديد تلقائي للتوكن"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="غير مصرح - يجب تسجيل الدخول")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        
        # إضافة name للتوافق مع الكود القديم (بعض الأماكن تستخدم user['name'] وبعضها user['full_name'])
        if 'name' not in user and 'full_name' in user:
            user['name'] = user['full_name']
        
        # 🔒 التحقق إذا كان التوكن يحتاج تجديد (أقل من يوم على الانتهاء)
        exp = payload.get("exp", 0)
        remaining = exp - datetime.now(timezone.utc).timestamp()
        if remaining < 86400:  # أقل من 24 ساعة
            # إنشاء توكن جديد
            new_token = create_token(user["id"], user["user_type"])
            user["_new_token"] = new_token  # سيتم إرساله في response header
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة - يرجى تسجيل الدخول مجدداً")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """التحقق من صلاحيات المشرف"""
    user = await get_current_user(credentials)
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح - صلاحيات المشرف مطلوبة")
    return user

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except Exception:
        return None

# ============== Notification Helpers ==============

async def create_notification_for_user(user_id: str, title: str, message: str, notification_type: str = "order", order_id: str = None, product_id: str = None, extra_data: dict = None):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "order_id": order_id,
        "product_id": product_id,
        "target": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    # إضافة بيانات إضافية (مثل معلومات السائق)
    if extra_data:
        notification["data"] = extra_data
    await db.notifications.insert_one(notification)
    return notification

async def create_notification_for_role(role: str, title: str, message: str, notification_type: str = "order", order_id: str = None):
    notification = {
        "id": str(uuid.uuid4()),
        "title": title,
        "message": message,
        "type": notification_type,
        "order_id": order_id,
        "target": role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return notification
