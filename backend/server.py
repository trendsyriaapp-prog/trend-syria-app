# /app/backend/server.py
# الملف الرئيسي للخادم - ترند سورية API
# تم تقسيم الكود إلى ملفات منفصلة في مجلد routes
# 🔒 محمي بـ 10 طبقات أمان
# ⚡ محسّن للأداء

import logging
import sys

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)
logger.info("🚀 Starting Trend Syria API Server...")

from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
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

# Import database with error handling
try:
    from core.database import db, client
except Exception as e:
    logging.error(f"❌ Failed to import database: {e}")
    raise

# ⚡ Import performance module with error handling
try:
    from core.performance import (
        create_database_indexes, 
        cache, 
        performance_monitor,
        IMAGE_OPTIMIZATION_CONFIG
    )
except Exception as e:
    logging.warning(f"⚠️ Performance module not loaded: {e}")
    cache = None
    performance_monitor = None
    IMAGE_OPTIMIZATION_CONFIG = {}
    async def create_database_indexes(db): pass

# 🔒 Import security module with error handling
try:
    from core.security import (
        limiter, 
        rate_limit_exceeded_handler,
        is_ip_blocked,
        SECURITY_HEADERS
    )
    from slowapi.errors import RateLimitExceeded
except Exception as e:
    logging.warning(f"⚠️ Security module not loaded: {e}")
    limiter = None
    SECURITY_HEADERS = {}
    def rate_limit_exceeded_handler(req, exc): 
        pass
    def is_ip_blocked(ip): 
        return False
    class RateLimitExceeded(Exception): 
        pass

# Import routers with error handling
logger.info("📦 Importing routers...")
try:
    logger.info("  📦 Importing auth routers...")
    from routes.auth import router as auth_router, seller_router, delivery_auth_router
    from routes.products import router as products_router
    from routes.cart import router as cart_router
    from routes.orders import router as orders_router
    from routes.shipping import router as shipping_router
    logger.info("  ✅ Core routers imported")
    
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
    logger.info("  ✅ User/Admin routers imported")
    
    from routes.ads import router as ads_router
    from routes.discounts import router as discounts_router
    from routes.loyalty import router as loyalty_router
    from routes.image_processing import router as image_router
    from routes.delivery_boxes import router as delivery_boxes_router
    from routes.challenges import router as challenges_router
    from routes.achievements import router as achievements_router
    logger.info("  ✅ Feature routers imported")
    
    from routes.chatbot import router as chatbot_router
    from routes.ai_chatbot import router as ai_chatbot_router
    from routes.food import router as food_router
    from routes.food_orders import router as food_orders_router
    from routes.coupons import router as coupons_router
    from routes.referrals import router as referrals_router
    from routes.daily_deals import router as daily_deals_router
    logger.info("  ✅ Food/AI routers imported")
    
    from routes.analytics import router as analytics_router
    from routes.gifts import router as gifts_router
    from routes.recommendations import router as recommendations_router
    from routes.image_search import router as image_search_router
    from routes.push_notifications import router as push_router
    from routes.admin_settings import router as admin_settings_router
    from routes.delivery_time import router as delivery_time_router
    from routes.price_reports import router as price_reports_router
    logger.info("  ✅ Analytics routers imported")
    
    from routes.websocket import router as websocket_router
    from routes.chat import router as chat_router
    from routes.support import router as support_router
    from routes.categories import router as categories_router
    from routes.activity_log import router as activity_log_router
    from routes.reports_export import router as reports_export_router
    from routes.image_templates import router as image_templates_router
    from routes.call_requests import router as call_requests_router
    from routes.voip import router as voip_router
    from routes.payment_v2 import router as payment_v2_router
    from routes.feedback import router as feedback_router
    from routes.driver_security import router as driver_security_router
    logger.info("✅ All routers imported successfully")
except Exception as e:
    logger.error(f"❌ Failed to import routers: {e}")
    import traceback
    traceback.print_exc()
    raise

# Create FastAPI app
app = FastAPI(
    title="ترند سورية API", 
    description="API لمتجر ترند سورية الإلكتروني",
    docs_url="/api/docs" if os.environ.get("DEBUG") else None,  # إخفاء docs في الإنتاج
    redoc_url=None
)

logger.info("✅ FastAPI app created")

# ⚡ تسخين قاعدة البيانات عند بدء التطبيق
@app.on_event("startup")
async def startup_event():
    """تسخين الاتصالات عند بدء التطبيق"""
    from core.database import warm_up_connection
    logger.info("🚀 Starting application...")
    await warm_up_connection()
    logger.info("✅ Application startup complete")

# Root level health check (for DigitalOcean)
@app.get("/")
async def root_health():
    return {"status": "healthy"}

@app.get("/health")
async def app_health():
    return {"status": "healthy"}

# Health check مع فحص قاعدة البيانات
@app.get("/api/health")
async def api_health_check():
    """فحص صحة التطبيق وقاعدة البيانات"""
    from core.database import check_database_connection
    db_ok, db_msg = await check_database_connection()
    
    return {
        "status": "healthy" if db_ok else "degraded",
        "message": "ترند سورية API يعمل بنجاح",
        "database": "connected" if db_ok else "disconnected"
    }

# 🔒 إضافة Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# 🌍 ترجمة رسائل الخطأ إلى العربية
VALIDATION_ERRORS_AR = {
    "field required": "هذا الحقل مطلوب",
    "value is not a valid integer": "يجب أن تكون القيمة رقماً صحيحاً",
    "value is not a valid float": "يجب أن تكون القيمة رقماً",
    "value is not a valid email address": "البريد الإلكتروني غير صحيح",
    "ensure this value has at least": "يجب أن يكون طول القيمة على الأقل",
    "ensure this value has at most": "يجب أن يكون طول القيمة على الأكثر",
    "value is not a valid phone number": "رقم الهاتف غير صحيح",
    "invalid datetime format": "صيغة التاريخ غير صحيحة",
    "none is not an allowed value": "هذا الحقل لا يمكن أن يكون فارغاً",
    "value could not be parsed to a boolean": "يجب أن تكون القيمة صحيحة أو خاطئة",
    "ensure this value is greater than": "يجب أن تكون القيمة أكبر من",
    "ensure this value is less than": "يجب أن تكون القيمة أقل من",
    "string does not match regex": "الصيغة غير صحيحة",
    "invalid json": "صيغة JSON غير صحيحة",
    "Input should be a valid string": "يجب إدخال نص صحيح",
    "Input should be a valid integer": "يجب إدخال رقم صحيح",
    "Input should be a valid number": "يجب إدخال رقم صحيح",
    "String should have at least": "يجب أن يكون طول النص على الأقل",
    "String should have at most": "يجب أن يكون طول النص على الأكثر",
    "Field required": "هذا الحقل مطلوب",
    "Missing": "هذا الحقل مطلوب",
    "missing": "هذا الحقل مطلوب",
}

def translate_validation_error(error_msg: str) -> str:
    """ترجمة رسائل خطأ Pydantic إلى العربية"""
    error_msg_lower = error_msg.lower()
    
    for eng, ar in VALIDATION_ERRORS_AR.items():
        if eng.lower() in error_msg_lower:
            return ar
    
    # إذا لم نجد ترجمة، نرجع الرسالة الأصلية
    return error_msg

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """معالج أخطاء التحقق - يُرجع رسائل بالعربية"""
    errors = exc.errors()
    arabic_errors = []
    
    for error in errors:
        field = error.get("loc", [""])[1] if len(error.get("loc", [])) > 1 else error.get("loc", [""])[0]
        msg = error.get("msg", "خطأ في البيانات")
        arabic_msg = translate_validation_error(msg)
        
        # إضافة اسم الحقل للرسالة
        field_names = {
            "amount": "المبلغ",
            "shamcash_phone": "رقم شام كاش",
            "phone": "رقم الهاتف",
            "password": "كلمة المرور",
            "name": "الاسم",
            "email": "البريد الإلكتروني",
            "price": "السعر",
            "stock": "الكمية",
            "description": "الوصف",
            "title": "العنوان",
            "body": "محتوى الرسالة",
        }
        
        field_ar = field_names.get(str(field), str(field))
        arabic_errors.append(f"{field_ar}: {arabic_msg}")
    
    return JSONResponse(
        status_code=422,
        content={"detail": "، ".join(arabic_errors) if arabic_errors else "خطأ في البيانات المدخلة"}
    )

# 🔒 معالج الأخطاء العام - يُخفي التفاصيل التقنية عن المستخدمين
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    معالج الأخطاء العام - يحمي من تسريب المعلومات التقنية
    - يسجل الخطأ الكامل للمبرمج
    - يُرجع رسالة عامة للمستخدم
    """
    import traceback
    
    # تسجيل الخطأ الكامل للمبرمج
    error_id = str(uuid.uuid4())[:8]
    logger.error(f"[Error ID: {error_id}] Unhandled exception at {request.url.path}")
    logger.error(f"[Error ID: {error_id}] {type(exc).__name__}: {str(exc)}")
    logger.error(f"[Error ID: {error_id}] Traceback: {traceback.format_exc()}")
    
    # تحديد نوع الخطأ وإرجاع رسالة مناسبة
    error_message = "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى"
    status_code = 500
    
    error_str = str(exc).lower()
    error_type = type(exc).__name__
    
    # أخطاء قاعدة البيانات
    if any(db_err in error_str for db_err in ['mongodb', 'database', 'connection', 'timeout', 'timed out', 'pymongo', 'motor']):
        error_message = "الخادم مشغول حالياً، يرجى المحاولة بعد لحظات"
        status_code = 503
    
    # أخطاء الشبكة
    elif any(net_err in error_str for net_err in ['network', 'connection refused', 'unreachable']):
        error_message = "مشكلة في الاتصال، يرجى التحقق من الإنترنت"
        status_code = 503
    
    # أخطاء الذاكرة/الموارد
    elif any(mem_err in error_str for mem_err in ['memory', 'resource', 'limit exceeded']):
        error_message = "الخادم مشغول، يرجى المحاولة لاحقاً"
        status_code = 503
    
    # أخطاء الصلاحيات
    elif error_type in ['PermissionError', 'AuthorizationError']:
        error_message = "ليس لديك صلاحية لهذا الإجراء"
        status_code = 403
    
    # أخطاء البيانات
    elif error_type in ['ValueError', 'ValidationError', 'TypeError']:
        error_message = "البيانات المدخلة غير صحيحة"
        status_code = 400
    
    # أخطاء الملفات
    elif error_type in ['FileNotFoundError', 'IOError']:
        error_message = "الملف غير موجود أو لا يمكن الوصول إليه"
        status_code = 404
    
    return JSONResponse(
        status_code=status_code,
        content={
            "detail": error_message,
            "error_id": error_id  # للدعم الفني
        }
    )

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
api_router.include_router(ai_chatbot_router)
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
api_router.include_router(chat_router)
api_router.include_router(support_router)
api_router.include_router(activity_log_router)
api_router.include_router(reports_export_router)
api_router.include_router(image_templates_router)
api_router.include_router(categories_router)
api_router.include_router(call_requests_router)
api_router.include_router(voip_router)
api_router.include_router(push_router)
api_router.include_router(payment_v2_router)
api_router.include_router(feedback_router)
api_router.include_router(driver_security_router)

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

@api_router.get("/health")
async def health_check():
    """Health check endpoint for DigitalOcean"""
    return {"status": "healthy", "message": "ترند سورية API يعمل بنجاح"}

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
    try:
        asyncio.create_task(reset_sold_out_products_task())
        logging.info("🔄 تم تشغيل مهمة إعادة المنتجات المنتهية")
    except Exception as e:
        logging.warning(f"⚠️ Could not start background tasks: {e}")

@app.on_event("startup")
async def ensure_super_admin_exists():
    """🔐 التأكد من وجود حساب Super Admin - يتم إنشاؤه أو إصلاحه تلقائياً"""
    try:
        from core.security import hash_password_secure, verify_password
        
        admin_phone = "0945570365"
        admin_password = "TrendSyria@2026"
        
        # التحقق من وجود الحساب
        existing_admin = await db.users.find_one({"phone": admin_phone}, {"_id": 0})
        
        if existing_admin:
            needs_update = False
            update_fields = {}
            
            # التحقق من نوع المستخدم - يجب أن يكون admin
            if existing_admin.get("user_type") != "admin":
                update_fields["user_type"] = "admin"
                needs_update = True
                logger.info(f"🔧 سيتم تحديث نوع الحساب من {existing_admin.get('user_type')} إلى admin")
            
            # التحقق من is_verified و is_approved
            if not existing_admin.get("is_verified"):
                update_fields["is_verified"] = True
                needs_update = True
            if not existing_admin.get("is_approved"):
                update_fields["is_approved"] = True
                needs_update = True
            
            # التحقق من كلمة المرور
            try:
                if not verify_password(admin_password, existing_admin.get("password", "")):
                    update_fields["password"] = hash_password_secure(admin_password)
                    needs_update = True
                    logger.info("🔧 سيتم تحديث كلمة مرور Super Admin")
            except Exception:
                update_fields["password"] = hash_password_secure(admin_password)
                needs_update = True
                logger.info("🔧 خطأ في التحقق من كلمة المرور، سيتم إعادة تعيينها")
            
            # تطبيق التحديثات إذا لزم الأمر
            if needs_update:
                await db.users.update_one(
                    {"phone": admin_phone},
                    {"$set": update_fields}
                )
                logger.info(f"✅ تم إصلاح حساب Super Admin: {admin_phone} - التحديثات: {list(update_fields.keys())}")
            else:
                logger.info(f"✅ حساب Super Admin موجود وصحيح: {admin_phone}")
        else:
            # إنشاء حساب Super Admin جديد
            admin_doc = {
                "id": str(uuid.uuid4()),
                "full_name": "مدير النظام الرئيسي",
                "name": "Super Admin",
                "phone": admin_phone,
                "password": hash_password_secure(admin_password),
                "city": "دمشق",
                "user_type": "admin",
                "is_verified": True,
                "is_approved": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.users.insert_one(admin_doc)
            logger.info(f"✅ تم إنشاء حساب Super Admin: {admin_phone}")
    except Exception as e:
        logger.error(f"❌ خطأ في إنشاء/إصلاح حساب Super Admin: {e}")

# ============== Performance Stats ==============

@api_router.get("/performance/stats")
async def get_performance_stats():
    """⚡ إحصائيات الأداء والكاش"""
    return {
        "cache_stats": cache.stats,
        "performance_stats": performance_monitor.get_stats(),
        "image_config": IMAGE_OPTIMIZATION_CONFIG
    }

# Include main router
app.include_router(api_router)