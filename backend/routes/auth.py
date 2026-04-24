# /app/backend/routes/auth.py
# مسارات المصادقة وتسجيل الدخول
# 🔒 محمي ضد Brute Force و Input Validation

from fastapi import APIRouter, HTTPException, Depends, Request, Response
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user
from core.auth_cookies import set_auth_cookies, clear_auth_cookies
from core.security import (
    hash_password_secure,
    verify_password,
    check_brute_force,
    record_failed_login,
    clear_failed_attempts,
    validate_phone,
    validate_password_strength,
    is_default_account,
    sanitize_input,
    log_suspicious_activity,
    create_access_token,
    create_refresh_token,
    decode_token,
    limiter,
    reset_all_brute_force_locks
)
from models.schemas import (
    UserRegister, UserLogin, SellerDocuments, DeliveryDocuments,
    ForgotPasswordRequest, VerifyIdentityRequest, ResetPasswordRequest,
    DeviceOTPVerify
)
import secrets
import string
import os
import logging
from slowapi.util import get_remote_address
from datetime import timedelta

# إعداد logger
auth_logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ============== دوال مساعدة للأجهزة ==============

async def check_new_device(user_id: str, device_id: str, user_type: str) -> bool:
    """
    التحقق إذا كان الجهاز جديداً
    - المشترين: لا نتحقق من الأجهزة الجديدة (اختياري)
    - البائعين والمدراء والتوصيل: نتحقق دائماً
    """
    # المشترين لا يحتاجون OTP للأجهزة الجديدة (إلا إذا أردت تغيير هذا)
    # if user_type == "buyer":
    #     return False
    
    # التحقق من وجود الجهاز في قائمة الأجهزة الموثوقة
    trusted_device = await db.trusted_devices.find_one({
        "user_id": user_id,
        "device_id": device_id,
        "is_active": True
    })
    
    if trusted_device:
        # تحديث آخر استخدام
        await db.trusted_devices.update_one(
            {"_id": trusted_device["_id"]},
            {"$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}}
        )
        return False  # جهاز معروف
    
    return True  # جهاز جديد


async def add_trusted_device(user_id: str, device_id: str, device_name: str = None, ip_address: str = None) -> None:
    """
    إضافة جهاز للقائمة الموثوقة بعد التحقق
    """
    await db.trusted_devices.update_one(
        {"user_id": user_id, "device_id": device_id},
        {"$set": {
            "user_id": user_id,
            "device_id": device_id,
            "device_name": device_name or "جهاز غير معروف",
            "ip_address": ip_address,
            "is_active": True,
            "added_at": datetime.now(timezone.utc).isoformat(),
            "last_used_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )


def mask_phone(phone: str) -> str:
    """
    إخفاء جزء من رقم الهاتف للخصوصية
    مثال: 0945****65
    """
    if len(phone) < 6:
        return phone
    return phone[:4] + "****" + phone[-2:]

@router.post("/register")
@limiter.limit("3/minute")
async def register(request: Request, user: UserRegister, response: Response) -> dict:
    """
    تسجيل مستخدم جديد
    🔒 يُرسل Token في httpOnly Cookie للأمان
    """
    get_remote_address(request)
    
    # 🔒 التحقق من صحة رقم الهاتف
    if not validate_phone(user.phone):
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
    
    # 🔒 التحقق من قوة كلمة المرور
    is_valid, issues = validate_password_strength(user.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=issues[0])
    
    # 🔒 تنظيف المدخلات
    clean_name = sanitize_input(user.full_name)
    clean_city = sanitize_input(user.city)
    
    existing = await db.users.find_one({"phone": user.phone})
    if existing:
        raise HTTPException(status_code=400, detail="رقم الهاتف مسجل مسبقاً")
    
    user_id = str(uuid.uuid4())
    
    # إعداد الأدوار الأولية
    initial_roles = [user.user_type]
    initial_role_status = {
        user.user_type: {
            "status": "active" if user.user_type == "buyer" else "not_submitted",
            "added_at": datetime.now(timezone.utc).isoformat()
        }
    }
    
    user_doc = {
        "id": user_id,
        "name": clean_name,
        "full_name": clean_name,
        "phone": user.phone,
        "password": hash_password_secure(user.password),  # 🔒 bcrypt
        "city": clean_city,
        "user_type": user.user_type,
        "roles": initial_roles,  # 🆕 نظام الأدوار المتعددة
        "active_role": user.user_type,  # 🆕 الدور النشط
        "role_status": initial_role_status,  # 🆕 حالة كل دور
        "emergency_phone": user.emergency_phone,  # رقم الطوارئ
        "is_verified": user.user_type == "buyer",
        "is_approved": user.user_type == "buyer",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # 🎁 إرسال إشعار ترحيبي مع برنامج الإحالات
    if user.user_type == "buyer":
        referral_settings = await db.platform_settings.find_one({"id": "referral"}, {"_id": 0})
        if referral_settings and referral_settings.get("is_active", True):
            reward = referral_settings.get("referrer_reward", 10000)
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": "welcome_referral",
                "title": "🎉 مرحباً بك في تريند سوريا!",
                "message": f"شارك تطبيقنا مع أصدقائك واكسب {reward:,} ل.س عن كل صديق يسجل ويطلب. افتح 'ادعُ صديقاً' من حسابك!",
                "action_url": "/referrals",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    # 🔒 إنشاء توكنات آمنة
    access_token = create_access_token(user_id, user.user_type)
    refresh_token = create_refresh_token(user_id)
    
    # حفظ refresh token في قاعدة البيانات
    await db.refresh_tokens.insert_one({
        "user_id": user_id,
        "token": refresh_token,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # 🔒 تعيين Token في httpOnly Cookie
    set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "token": access_token,  # للتوافق مع التطبيقات القديمة
        "refresh_token": refresh_token,
        "user": {
            "id": user_id,
            "name": clean_name,
            "full_name": clean_name,
            "phone": user.phone,
            "user_type": user.user_type,
            "is_approved": user_doc["is_approved"]
        }
    }


# ============== تسجيل جديد مع OTP ==============

@router.post("/send-registration-otp")
@limiter.limit("3/minute")
async def send_registration_otp(request: Request, data: dict) -> dict:
    """
    الخطوة 1: إرسال OTP للتحقق من الرقم قبل إنشاء الحساب
    لا يتم إنشاء أي شيء في قاعدة البيانات حتى التحقق من OTP
    """
    phone = data.get("phone", "")
    full_name = data.get("full_name", "")
    
    # التحقق من صحة رقم الهاتف
    if not validate_phone(phone):
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
    
    # التحقق من أن الرقم غير مسجل مسبقاً
    existing = await db.users.find_one({"phone": phone})
    if existing:
        raise HTTPException(status_code=400, detail="رقم الهاتف مسجل مسبقاً")
    
    # توليد OTP ومعرف التسجيل
    otp_code = ''.join(secrets.choice(string.digits) for _ in range(6))
    registration_id = str(uuid.uuid4())
    
    # حفظ بيانات التسجيل المؤقتة (تنتهي بعد 10 دقائق)
    await db.pending_registrations.delete_many({"phone": phone})  # حذف المحاولات السابقة
    await db.pending_registrations.insert_one({
        "registration_id": registration_id,
        "phone": phone,
        "full_name": sanitize_input(full_name),
        "otp": otp_code,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "verified": False
    })
    
    # إرسال OTP عبر WhatsApp
    from services.whatsapp_service import send_otp, TEST_MODE, TEST_OTP_CODE
    
    if TEST_MODE:
        auth_logger.info(f"🧪 TEST MODE: Registration OTP for {phone} is {TEST_OTP_CODE}")
    else:
        try:
            await send_otp(phone, otp_code)
        except Exception as e:
            auth_logger.error(f"Failed to send OTP: {e}")
            # في حالة الفشل، نستمر لأغراض الاختبار
    
    return {
        "message": "تم إرسال رمز التحقق",
        "registration_id": registration_id,
        "phone": phone
    }


@router.post("/verify-otp-only")
@limiter.limit("5/minute")
async def verify_otp_only(request: Request, data: dict) -> dict:
    """
    التحقق من OTP فقط بدون إنشاء الحساب
    يُستخدم للتحقق من الرقم قبل إكمال بيانات البائع
    """
    registration_id = data.get("registration_id", "")
    otp = data.get("otp", "")
    phone = data.get("phone", "")
    
    if not registration_id or not otp or not phone:
        raise HTTPException(status_code=400, detail="بيانات غير صالحة")
    
    # التحقق من OTP
    from services.whatsapp_service import TEST_MODE, TEST_OTP_CODE
    
    pending = await db.pending_registrations.find_one({
        "registration_id": registration_id,
        "phone": phone
    })
    
    if not pending:
        raise HTTPException(status_code=400, detail="جلسة التسجيل غير صالحة أو منتهية")
    
    # التحقق من انتهاء الصلاحية
    expires_at = datetime.fromisoformat(pending["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        await db.pending_registrations.delete_one({"registration_id": registration_id})
        raise HTTPException(status_code=400, detail="انتهت صلاحية رمز التحقق، يرجى إعادة المحاولة")
    
    # التحقق من صحة OTP
    valid_otp = (TEST_MODE and otp == TEST_OTP_CODE) or (otp == pending.get("otp"))
    if not valid_otp:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")
    
    # تحديث حالة التسجيل إلى "verified"
    await db.pending_registrations.update_one(
        {"registration_id": registration_id},
        {
            "$set": {
                "verified": True,
                "verified_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
            }
        }
    )
    
    return {
        "message": "تم التحقق من الرقم بنجاح",
        "verified": True,
        "registration_id": registration_id
    }


@router.post("/complete-registration")
@limiter.limit("5/minute")
async def complete_registration(request: Request, data: dict, response: Response) -> dict:
    """
    إكمال التسجيل وإنشاء الحساب بعد التحقق من OTP
    يتطلب أن يكون OTP قد تم التحقق منه مسبقاً
    """
    registration_id = data.get("registration_id", "")
    
    # البيانات الأساسية
    full_name = data.get("full_name", "")
    phone = data.get("phone", "")
    password = data.get("password", "")
    city = data.get("city", "")
    user_type = data.get("user_type", "buyer")
    
    # البيانات الإضافية حسب نوع المستخدم
    seller_data = data.get("seller_data")
    food_seller_data = data.get("food_seller_data")
    delivery_data = data.get("delivery_data")
    
    # التحقق من البيانات الأساسية
    if not all([full_name, phone, password]):
        raise HTTPException(status_code=400, detail="يرجى إكمال جميع البيانات المطلوبة")
    
    if not validate_phone(phone):
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
    
    # التحقق من قوة كلمة المرور
    is_valid, issues = validate_password_strength(password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=issues[0])
    
    # التحقق من أن OTP تم التحقق منه
    pending = await db.pending_registrations.find_one({
        "registration_id": registration_id,
        "phone": phone,
        "verified": True
    })
    
    if not pending:
        raise HTTPException(status_code=400, detail="يرجى التحقق من رقم الهاتف أولاً")
    
    # التحقق من انتهاء الصلاحية
    expires_at = datetime.fromisoformat(pending["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        await db.pending_registrations.delete_one({"registration_id": registration_id})
        raise HTTPException(status_code=400, detail="انتهت صلاحية الجلسة، يرجى إعادة التسجيل")
    
    # التحقق من أن الرقم غير مسجل
    existing = await db.users.find_one({"phone": phone})
    if existing:
        await db.pending_registrations.delete_one({"registration_id": registration_id})
        raise HTTPException(status_code=400, detail="رقم الهاتف مسجل مسبقاً")
    
    # === إنشاء الحساب ===
    clean_name = sanitize_input(full_name)
    clean_city = sanitize_input(city) if city else ""
    user_id = str(uuid.uuid4())
    
    # إعداد الأدوار الأولية
    initial_roles = [user_type]
    initial_role_status = {
        user_type: {
            "status": "active" if user_type == "buyer" else "pending",
            "added_at": datetime.now(timezone.utc).isoformat()
        }
    }
    
    user_doc = {
        "id": user_id,
        "name": clean_name,
        "full_name": clean_name,
        "phone": phone,
        "password": hash_password_secure(password),
        "city": clean_city,
        "user_type": user_type,
        "roles": initial_roles,
        "active_role": user_type,
        "role_status": initial_role_status,
        "is_verified": True,
        "is_approved": user_type == "buyer",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # إضافة بيانات البائع إذا كان بائع منتجات
    if user_type == "seller" and seller_data:
        user_doc["seller_info"] = {
            "business_category": seller_data.get("business_category", ""),
            "national_id": seller_data.get("national_id", ""),
            "commercial_reg": seller_data.get("commercial_reg", ""),
            "responsibility_accepted": seller_data.get("responsibility_accepted", False),
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }
        user_doc["role_status"]["seller"]["status"] = "pending"
    
    # إضافة بيانات بائع الطعام
    if user_type == "food_seller" and food_seller_data:
        user_doc["food_seller_info"] = {
            "restaurant_name": food_seller_data.get("restaurant_name", ""),
            "business_category": food_seller_data.get("business_category", ""),
            "logo": food_seller_data.get("logo", ""),
            "storefront_image": food_seller_data.get("storefront_image", ""),
            "health_license": food_seller_data.get("health_license", ""),
            "national_id": food_seller_data.get("national_id", ""),
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }
        user_doc["role_status"]["food_seller"] = {
            "status": "pending",
            "added_at": datetime.now(timezone.utc).isoformat()
        }
    
    # إضافة بيانات موظف التوصيل
    if user_type == "delivery" and delivery_data:
        user_doc["delivery_info"] = {
            "personal_photo": delivery_data.get("personal_photo", ""),
            "national_id": delivery_data.get("national_id", ""),
            "driving_license": delivery_data.get("driving_license", ""),
            "vehicle_photo": delivery_data.get("vehicle_photo", ""),
            "vehicle_type": delivery_data.get("vehicle_type", ""),
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }
        user_doc["role_status"]["delivery"] = {
            "status": "pending",
            "added_at": datetime.now(timezone.utc).isoformat()
        }
    
    # حفظ المستخدم في قاعدة البيانات
    await db.users.insert_one(user_doc)
    
    # حذف التسجيل المؤقت
    await db.pending_registrations.delete_one({"registration_id": registration_id})
    
    # إرسال إشعار ترحيبي للمشتري
    if user_type == "buyer":
        referral_settings = await db.platform_settings.find_one({"id": "referral"}, {"_id": 0})
        if referral_settings and referral_settings.get("is_active", True):
            reward = referral_settings.get("referrer_reward", 10000)
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": "welcome_referral",
                "title": "🎉 مرحباً بك في ترند سوريا!",
                "message": f"شارك تطبيقنا مع أصدقائك واكسب {reward:,} ل.س عن كل صديق يسجل ويطلب!",
                "action_url": "/referrals",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    # إنشاء التوكنات
    access_token = create_access_token(user_id, user_type)
    refresh_token = create_refresh_token(user_id)
    
    # حفظ refresh token
    await db.refresh_tokens.insert_one({
        "user_id": user_id,
        "token": refresh_token,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # تعيين الكوكيز
    set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "message": "تم التسجيل بنجاح",
        "token": access_token,
        "user": {
            "id": user_id,
            "name": clean_name,
            "full_name": clean_name,
            "phone": phone,
            "user_type": user_type,
            "is_approved": user_doc["is_approved"],
            "is_verified": True
        }
    }


@router.post("/verify-registration-otp")
@limiter.limit("5/minute")
async def verify_registration_otp(request: Request, data: dict, response: Response) -> dict:
    """
    الخطوة 2: التحقق من OTP وإنشاء الحساب (للمشترين فقط - تدفق مختصر)
    يتم إنشاء الحساب فقط بعد التحقق من OTP بنجاح
    """
    registration_id = data.get("registration_id", "")
    otp = data.get("otp", "")
    
    # البيانات الأساسية
    full_name = data.get("full_name", "")
    phone = data.get("phone", "")
    password = data.get("password", "")
    city = data.get("city", "")
    user_type = data.get("user_type", "buyer")
    
    # البيانات الإضافية حسب نوع المستخدم
    seller_data = data.get("seller_data")
    food_seller_data = data.get("food_seller_data")
    delivery_data = data.get("delivery_data")
    
    # التحقق من البيانات الأساسية
    if not all([full_name, phone, password]):
        raise HTTPException(status_code=400, detail="يرجى إكمال جميع البيانات المطلوبة")
    
    if not validate_phone(phone):
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
    
    # التحقق من قوة كلمة المرور
    is_valid, issues = validate_password_strength(password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=issues[0])
    
    # التحقق من OTP
    from services.whatsapp_service import TEST_MODE, TEST_OTP_CODE
    
    pending = await db.pending_registrations.find_one({
        "registration_id": registration_id,
        "phone": phone
    })
    
    if not pending:
        raise HTTPException(status_code=400, detail="جلسة التسجيل غير صالحة أو منتهية")
    
    # التحقق من انتهاء الصلاحية
    expires_at = datetime.fromisoformat(pending["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires_at:
        await db.pending_registrations.delete_one({"registration_id": registration_id})
        raise HTTPException(status_code=400, detail="انتهت صلاحية رمز التحقق، يرجى إعادة المحاولة")
    
    # التحقق من صحة OTP
    valid_otp = (TEST_MODE and otp == TEST_OTP_CODE) or (otp == pending.get("otp"))
    if not valid_otp:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")
    
    # التحقق من أن الرقم غير مسجل (تحقق إضافي)
    existing = await db.users.find_one({"phone": phone})
    if existing:
        await db.pending_registrations.delete_one({"registration_id": registration_id})
        raise HTTPException(status_code=400, detail="رقم الهاتف مسجل مسبقاً")
    
    # === إنشاء الحساب بعد التحقق ===
    clean_name = sanitize_input(full_name)
    clean_city = sanitize_input(city) if city else ""
    user_id = str(uuid.uuid4())
    
    # إعداد الأدوار الأولية
    initial_roles = [user_type]
    initial_role_status = {
        user_type: {
            "status": "active" if user_type == "buyer" else "pending",
            "added_at": datetime.now(timezone.utc).isoformat()
        }
    }
    
    user_doc = {
        "id": user_id,
        "name": clean_name,
        "full_name": clean_name,
        "phone": phone,
        "password": hash_password_secure(password),
        "city": clean_city,
        "user_type": user_type,
        "roles": initial_roles,
        "active_role": user_type,
        "role_status": initial_role_status,
        "is_verified": True,  # تم التحقق من الرقم
        "is_approved": user_type == "buyer",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # إضافة بيانات البائع إذا كان بائع منتجات
    if user_type == "seller" and seller_data:
        user_doc["seller_info"] = {
            "business_category": seller_data.get("business_category", ""),
            "national_id": seller_data.get("national_id", ""),
            "commercial_reg": seller_data.get("commercial_reg", ""),
            "responsibility_accepted": seller_data.get("responsibility_accepted", False),
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }
        user_doc["role_status"]["seller"]["status"] = "pending"
    
    # إضافة بيانات بائع الطعام
    if user_type == "food_seller" and food_seller_data:
        user_doc["food_seller_info"] = {
            "restaurant_name": food_seller_data.get("restaurant_name", ""),
            "business_category": food_seller_data.get("business_category", ""),
            "logo": food_seller_data.get("logo", ""),
            "storefront_image": food_seller_data.get("storefront_image", ""),
            "health_license": food_seller_data.get("health_license", ""),
            "national_id": food_seller_data.get("national_id", ""),
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }
        user_doc["role_status"]["food_seller"] = {
            "status": "pending",
            "added_at": datetime.now(timezone.utc).isoformat()
        }
    
    # إضافة بيانات موظف التوصيل
    if user_type == "delivery" and delivery_data:
        user_doc["delivery_info"] = {
            "personal_photo": delivery_data.get("personal_photo", ""),
            "national_id": delivery_data.get("national_id", ""),
            "driving_license": delivery_data.get("driving_license", ""),
            "vehicle_photo": delivery_data.get("vehicle_photo", ""),
            "vehicle_type": delivery_data.get("vehicle_type", ""),
            "submitted_at": datetime.now(timezone.utc).isoformat()
        }
        user_doc["role_status"]["delivery"] = {
            "status": "pending",
            "added_at": datetime.now(timezone.utc).isoformat()
        }
    
    # حفظ المستخدم في قاعدة البيانات
    await db.users.insert_one(user_doc)
    
    # حذف التسجيل المؤقت
    await db.pending_registrations.delete_one({"registration_id": registration_id})
    
    # إرسال إشعار ترحيبي للمشتري
    if user_type == "buyer":
        referral_settings = await db.platform_settings.find_one({"id": "referral"}, {"_id": 0})
        if referral_settings and referral_settings.get("is_active", True):
            reward = referral_settings.get("referrer_reward", 10000)
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": "welcome_referral",
                "title": "🎉 مرحباً بك في ترند سوريا!",
                "message": f"شارك تطبيقنا مع أصدقائك واكسب {reward:,} ل.س عن كل صديق يسجل ويطلب!",
                "action_url": "/referrals",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    # إنشاء التوكنات
    access_token = create_access_token(user_id, user_type)
    refresh_token = create_refresh_token(user_id)
    
    # حفظ refresh token
    await db.refresh_tokens.insert_one({
        "user_id": user_id,
        "token": refresh_token,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # تعيين الكوكيز
    set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "message": "تم التسجيل بنجاح",
        "token": access_token,
        "user": {
            "id": user_id,
            "name": clean_name,
            "full_name": clean_name,
            "phone": phone,
            "user_type": user_type,
            "is_approved": user_doc["is_approved"],
            "is_verified": True
        }
    }


@router.post("/resend-registration-otp")
@limiter.limit("2/minute")
async def resend_registration_otp(request: Request, data: dict) -> dict:
    """
    إعادة إرسال OTP للتسجيل
    """
    registration_id = data.get("registration_id", "")
    phone = data.get("phone", "")
    
    if not registration_id or not phone:
        raise HTTPException(status_code=400, detail="بيانات غير صالحة")
    
    # البحث عن التسجيل المؤقت
    pending = await db.pending_registrations.find_one({
        "registration_id": registration_id,
        "phone": phone
    })
    
    if not pending:
        raise HTTPException(status_code=400, detail="جلسة التسجيل غير صالحة")
    
    # توليد OTP جديد
    otp_code = ''.join(secrets.choice(string.digits) for _ in range(6))
    
    # تحديث OTP وتمديد الصلاحية
    await db.pending_registrations.update_one(
        {"registration_id": registration_id},
        {
            "$set": {
                "otp": otp_code,
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
            }
        }
    )
    
    # إرسال OTP
    from services.whatsapp_service import send_otp, TEST_MODE, TEST_OTP_CODE
    
    if TEST_MODE:
        auth_logger.info(f"🧪 TEST MODE: Resend Registration OTP for {phone} is {TEST_OTP_CODE}")
    else:
        try:
            await send_otp(phone, otp_code)
        except Exception as e:
            auth_logger.error(f"Failed to resend OTP: {e}")
    
    return {"message": "تم إعادة إرسال رمز التحقق"}


@router.post("/login")
@limiter.limit("15/minute")
async def login(request: Request, credentials: UserLogin, response: Response) -> dict:
    """
    تسجيل الدخول - مع معالجة أخطاء شاملة
    🔒 يُرسل Token في httpOnly Cookie للأمان
    """
    import traceback
    auth_logger = logging.getLogger("auth")
    
    try:
        client_ip = get_remote_address(request)
        auth_logger.info(f"🔐 Login attempt: phone={credentials.phone}, ip={client_ip}")
        
        # 🔒 فحص Brute Force
        try:
            check_brute_force(credentials.phone, client_ip)
        except HTTPException:
            raise
        except Exception as bf_error:
            auth_logger.error(f"Brute force check error: {bf_error}")
            # استمر حتى لو فشل الفحص
        
        # البحث عن المستخدم
        try:
            user = await db.users.find_one({"phone": credentials.phone}, {"_id": 0})
        except Exception as db_error:
            auth_logger.error(f"Database error finding user: {db_error}")
            raise HTTPException(status_code=500, detail=f"خطأ في قاعدة البيانات: {str(db_error)[:100]}")
        
        if not user:
            record_failed_login(credentials.phone, client_ip)
            raise HTTPException(status_code=401, detail="رقم الهاتف أو كلمة المرور غير صحيحة")
        
        auth_logger.info(f"✅ User found: id={user.get('id', 'N/A')}, type={user.get('user_type', 'N/A')}")
        
        # 🔒 التحقق من كلمة المرور
        stored_password = user.get("password", "")
        if not stored_password:
            auth_logger.error(f"❌ User has no password: {credentials.phone}")
            raise HTTPException(status_code=500, detail="خطأ: حساب بدون كلمة مرور")
        
        auth_logger.info(f"Password hash type: {'bcrypt' if stored_password.startswith('$2') else 'legacy_sha256'}, len={len(stored_password)}")
        
        try:
            password_valid = verify_password(credentials.password, stored_password)
        except Exception as pwd_error:
            auth_logger.error(f"Password verification error: {pwd_error}")
            raise HTTPException(status_code=500, detail=f"خطأ في التحقق من كلمة المرور: {str(pwd_error)[:100]}")
        
        if not password_valid:
            record_failed_login(credentials.phone, client_ip)
            auth_logger.warning(f"Failed login for {credentials.phone}")
            log_suspicious_activity(
                "failed_login",
                f"Failed login attempt for {credentials.phone}",
                client_ip
            )
            raise HTTPException(status_code=401, detail="رقم الهاتف أو كلمة المرور غير صحيحة")
        
        auth_logger.info(f"✅ Password verified for {credentials.phone}")
        
        # 🔒 مسح محاولات الدخول الفاشلة
        clear_failed_attempts(credentials.phone, client_ip)
        
        # 🔒 تحديث كلمة المرور القديمة إلى bcrypt
        if not stored_password.startswith('$2'):
            try:
                new_hash = hash_password_secure(credentials.password)
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"password": new_hash}}
                )
                auth_logger.info(f"✅ Upgraded password hash for {credentials.phone}")
            except Exception as upgrade_error:
                auth_logger.warning(f"Failed to upgrade password hash: {upgrade_error}")
        
        # 🔒 التحقق من الحساب الافتراضي
        force_password_change = is_default_account(credentials.phone, credentials.password) or user.get("force_password_change", False)
        
        # 🔒 إنشاء توكنات آمنة
        try:
            access_token = create_access_token(user["id"], user["user_type"])
            refresh_token = create_refresh_token(user["id"])
        except Exception as token_error:
            auth_logger.error(f"Token creation error: {token_error}\n{traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"خطأ في إنشاء التوكن: {str(token_error)[:100]}")
        
        auth_logger.info(f"✅ Tokens created for {credentials.phone}")
        
        # 🆕 التحقق من الجهاز الجديد
        device_id = credentials.device_id
        if device_id:
            try:
                is_new_device = await check_new_device(user["id"], device_id, user["user_type"])
                
                if is_new_device:
                    # جهاز جديد - نطلب OTP
                    # إرسال OTP عبر WhatsApp
                    from services.whatsapp_service import send_otp, TEST_MODE, TEST_OTP_CODE
                    
                    # في وضع الاختبار: استخدم الرمز الثابت
                    otp_code = TEST_OTP_CODE if TEST_MODE else ''.join(''.join(secrets.choice(string.digits) for _ in range(6)))
                    
                    # حفظ OTP مؤقت
                    await db.device_otp_codes.update_one(
                        {"user_id": user["id"], "device_id": device_id},
                        {"$set": {
                            "user_id": user["id"],
                            "phone": user["phone"],
                            "device_id": device_id,
                            "otp": otp_code,
                            "user_type": user["user_type"],
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                            "verified": False,
                            "attempts": 0
                        }},
                        upsert=True
                    )
                    
                    if TEST_MODE:
                        auth_logger.info(f"🧪 [TEST MODE] Device OTP for {user['phone']}: {otp_code}")
                    else:
                        await send_otp(user["phone"], otp_code)
                    
                    auth_logger.info(f"🔐 New device detected for {credentials.phone}, OTP required")
                    
                    return {
                        "requires_otp": True,
                        "message": "تم اكتشاف جهاز جديد. تم إرسال رمز التحقق إلى WhatsApp",
                        "phone": mask_phone(user["phone"]),
                        "device_id": device_id,
                        "otp_expires_in": 600  # 10 دقائق
                    }
            except Exception as device_error:
                auth_logger.warning(f"Device check error: {device_error}")
                # استمر بدون التحقق من الجهاز في حالة الخطأ
        
        # حفظ refresh token
        try:
            await db.refresh_tokens.update_one(
                {"user_id": user["id"]},
                {"$set": {
                    "token": refresh_token,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
        except Exception as rt_error:
            auth_logger.warning(f"Failed to save refresh token: {rt_error}")
            # استمر حتى لو فشل حفظ التوكن
        
        # تحديد is_approved حسب نوع المستخدم
        is_approved = user.get("is_approved", False)
        
        # للسائقين: التحقق من delivery_documents
        if user["user_type"] == "delivery":
            try:
                delivery_doc = await db.delivery_documents.find_one(
                    {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
                    {"_id": 0, "status": 1}
                )
                is_approved = delivery_doc and delivery_doc.get("status") == "approved"
            except Exception as dd_error:
                auth_logger.warning(f"Failed to check delivery documents: {dd_error}")
        
        # للبائعين: التحقق من is_approved
        elif user["user_type"] in ["seller", "food_seller"]:
            is_approved = user.get("is_approved", False)
        
        auth_logger.info(f"✅ Login successful: {credentials.phone}, type={user['user_type']}")
        
        # 🆕 جلب معلومات الأدوار
        roles = user.get("roles", [user["user_type"]])
        active_role = user.get("active_role", user["user_type"])
        role_status = user.get("role_status", {})
        
        # 🔒 تعيين Token في httpOnly Cookie
        set_auth_cookies(response, access_token, refresh_token)
        
        return {
            "token": access_token,  # للتوافق مع التطبيقات القديمة
            "refresh_token": refresh_token,
            "user": {
                "id": user["id"],
                "name": user.get("full_name", user.get("name", "")),
                "full_name": user.get("full_name", user.get("name", "")),
                "phone": user["phone"],
                "user_type": user["user_type"],
                "roles": roles,  # 🆕 جميع الأدوار
                "active_role": active_role,  # 🆕 الدور النشط
                "role_status": role_status,  # 🆕 حالة كل دور
                "is_approved": is_approved
            },
            "force_password_change": force_password_change
        }
    
    except HTTPException:
        raise
    except Exception as e:
        auth_logger.error(f"❌ Unexpected login error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"خطأ غير متوقع: {str(e)[:200]}")

@router.post("/logout")
async def logout(request: Request, response: Response) -> dict:
    """
    🔒 تسجيل الخروج - مسح Cookies المصادقة
    """
    # مسح Cookies
    clear_auth_cookies(response)
    
    # حذف refresh token من قاعدة البيانات (اختياري)
    try:
        token = request.cookies.get("access_token")
        if token:
            from core.security import decode_token
            payload = decode_token(token)
            if payload:
                await db.refresh_tokens.delete_many({"user_id": payload.get("user_id")})
    except Exception:
        pass  # نتجاهل الأخطاء - الأهم هو مسح الكوكيز
    
    return {"message": "تم تسجيل الخروج بنجاح"}

@router.post("/reset-brute-force")
async def reset_brute_force_locks(user: dict = Depends(get_current_user)) -> dict:
    """🔒 إعادة تعيين أقفال brute force - للأدمن فقط"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للإدارة فقط")
    
    result = reset_all_brute_force_locks()
    return result


@router.post("/verify-device-otp")
@limiter.limit("5/minute")
async def verify_device_otp(request: Request, data: DeviceOTPVerify) -> dict:
    """
    🔐 التحقق من OTP للجهاز الجديد
    بعد التحقق، يتم إضافة الجهاز للقائمة الموثوقة وإرجاع التوكن
    """
    get_remote_address(request)
    
    # البحث عن سجل OTP
    otp_record = await db.device_otp_codes.find_one({
        "phone": data.phone,
        "device_id": data.device_id,
        "verified": False
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="لا يوجد طلب تحقق لهذا الجهاز")
    
    # التحقق من انتهاء الصلاحية
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        await db.device_otp_codes.delete_one({"_id": otp_record["_id"]})
        raise HTTPException(status_code=400, detail="انتهت صلاحية رمز التحقق")
    
    # التحقق من عدد المحاولات
    attempts = otp_record.get("attempts", 0)
    if attempts >= 5:
        await db.device_otp_codes.delete_one({"_id": otp_record["_id"]})
        raise HTTPException(status_code=400, detail="تجاوزت عدد المحاولات المسموحة")
    
    # استيراد TEST_MODE و TEST_OTP_CODE
    from services.whatsapp_service import TEST_MODE, TEST_OTP_CODE
    
    # التحقق من OTP
    expected_otp = TEST_OTP_CODE if TEST_MODE else otp_record["otp"]
    
    if data.otp != expected_otp:
        # تسجيل المحاولة الفاشلة
        await db.device_otp_codes.update_one(
            {"_id": otp_record["_id"]},
            {"$inc": {"attempts": 1}}
        )
        remaining = 5 - attempts - 1
        raise HTTPException(
            status_code=400, 
            detail=f"رمز التحقق غير صحيح. المحاولات المتبقية: {remaining}"
        )
    
    # OTP صحيح - إضافة الجهاز للقائمة الموثوقة
    user_id = otp_record["user_id"]
    user_type = otp_record["user_type"]
    
    # إضافة الجهاز الموثوق
    client_ip = get_remote_address(request)
    await add_trusted_device(
        user_id=user_id,
        device_id=data.device_id,
        device_name=data.device_name,
        ip_address=client_ip
    )
    
    # تحديث سجل OTP
    await db.device_otp_codes.update_one(
        {"_id": otp_record["_id"]},
        {"$set": {
            "verified": True,
            "verified_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # جلب بيانات المستخدم الكاملة
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # إنشاء التوكنات
    access_token = create_access_token(user_id, user_type)
    refresh_token_str = create_refresh_token(user_id)
    
    # حفظ refresh token
    await db.refresh_tokens.update_one(
        {"user_id": user_id},
        {"$set": {
            "token": refresh_token_str,
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # تحديد is_approved
    is_approved = user.get("is_approved", False)
    if user_type == "delivery":
        delivery_doc = await db.delivery_documents.find_one(
            {"$or": [{"driver_id": user_id}, {"delivery_id": user_id}]},
            {"_id": 0, "status": 1}
        )
        is_approved = delivery_doc and delivery_doc.get("status") == "approved"
    
    auth_logger.info(f"✅ Device OTP verified for {data.phone}, device: {data.device_id[:8]}...")
    
    # جلب معلومات الأدوار
    roles = user.get("roles", [user_type])
    active_role = user.get("active_role", user_type)
    role_status = user.get("role_status", {})
    
    return {
        "success": True,
        "message": "تم التحقق بنجاح",
        "token": access_token,
        "refresh_token": refresh_token_str,
        "user": {
            "id": user["id"],
            "name": user.get("full_name", user.get("name", "")),
            "full_name": user.get("full_name", user.get("name", "")),
            "phone": user["phone"],
            "user_type": user_type,
            "roles": roles,
            "active_role": active_role,
            "role_status": role_status,
            "is_approved": is_approved
        },
        "device_trusted": True
    }


@router.post("/resend-device-otp")
@limiter.limit("2/minute")
async def resend_device_otp(request: Request, phone: str, device_id: str) -> dict:
    """
    إعادة إرسال OTP للجهاز
    """
    get_remote_address(request)
    
    # البحث عن سجل OTP موجود
    existing = await db.device_otp_codes.find_one({
        "phone": phone,
        "device_id": device_id,
        "verified": False
    })
    
    if not existing:
        raise HTTPException(status_code=400, detail="لا يوجد طلب تحقق لهذا الجهاز")
    
    # إنشاء OTP جديد
    otp_code = ''.join(''.join(secrets.choice(string.digits) for _ in range(6)))
    
    # تحديث السجل
    await db.device_otp_codes.update_one(
        {"_id": existing["_id"]},
        {"$set": {
            "otp": otp_code,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
            "attempts": 0
        }}
    )
    
    # إرسال OTP
    from services.whatsapp_service import send_otp, TEST_MODE
    
    if not TEST_MODE:
        await send_otp(phone, otp_code)
    
    return {
        "success": True,
        "message": "تم إرسال رمز التحقق مرة أخرى",
        "otp_expires_in": 600
    }


@router.get("/trusted-devices")
async def get_trusted_devices(user: dict = Depends(get_current_user)) -> dict:
    """
    جلب قائمة الأجهزة الموثوقة للمستخدم
    """
    devices = await db.trusted_devices.find(
        {"user_id": user["id"], "is_active": True},
        {"_id": 0}
    ).sort("last_used_at", -1).to_list(None)
    
    return {"devices": devices}


@router.delete("/trusted-devices/{device_id}")
async def remove_trusted_device(device_id: str, user: dict = Depends(get_current_user)) -> dict:
    """
    إزالة جهاز من القائمة الموثوقة
    """
    result = await db.trusted_devices.delete_one({
        "user_id": user["id"],
        "device_id": device_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الجهاز غير موجود")
    
    return {"message": "تم إزالة الجهاز بنجاح"}

@router.post("/refresh")
async def refresh_token(request: Request) -> dict:
    """🔒 تجديد التوكن"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="توكن غير صالح")
    
    token = auth_header.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="توكن التجديد غير صالح")
    
    user_id = payload.get("user_id")
    
    # التحقق من وجود التوكن في قاعدة البيانات
    stored = await db.refresh_tokens.find_one({"user_id": user_id, "token": token})
    if not stored:
        raise HTTPException(status_code=401, detail="توكن التجديد منتهي الصلاحية")
    
    # جلب بيانات المستخدم
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="المستخدم غير موجود")
    
    # إنشاء توكنات جديدة
    new_access = create_access_token(user_id, user["user_type"])
    new_refresh = create_refresh_token(user_id)
    
    # تحديث refresh token
    await db.refresh_tokens.update_one(
        {"user_id": user_id},
        {"$set": {"token": new_refresh, "created_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "token": new_access,
        "refresh_token": new_refresh
    }

@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)) -> dict:
    return {
        "id": user["id"],
        "name": user.get("full_name", user.get("name", "")),
        "full_name": user.get("full_name", user.get("name", "")),
        "phone": user.get("phone", ""),
        "city": user.get("city", ""),
        "address": user.get("address", ""),
        "user_type": user["user_type"],
        "is_approved": user.get("is_approved", False)
    }

@router.get("/lookup/{phone}")
async def lookup_user_by_phone(phone: str, user: dict = Depends(get_current_user)) -> dict:
    """البحث عن مستخدم برقم الهاتف - للتحقق قبل إرسال هدية"""
    # تنظيف رقم الهاتف
    clean_phone = sanitize_input(phone)
    
    if not validate_phone(clean_phone):
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
    
    # لا يمكن إرسال هدية لنفسك
    if clean_phone == user.get("phone"):
        raise HTTPException(status_code=400, detail="لا يمكنك إرسال هدية لنفسك")
    
    # البحث عن المستخدم
    recipient = await db.users.find_one(
        {"phone": clean_phone},
        {"_id": 0, "id": 1, "full_name": 1, "name": 1, "phone": 1, "profile_image": 1, "city": 1}
    )
    
    if not recipient:
        raise HTTPException(status_code=404, detail="هذا الرقم غير مسجل في التطبيق")
    
    return {
        "found": True,
        "id": recipient.get("id"),
        "name": recipient.get("full_name") or recipient.get("name", "مستخدم"),
        "phone": recipient.get("phone"),
        "profile_image": recipient.get("profile_image"),
        "city": recipient.get("city", "")
    }

# ============== Seller Routes ==============

seller_router = APIRouter(prefix="/seller", tags=["Seller"])

@seller_router.post("/documents")
async def upload_seller_documents(docs: SellerDocuments, user: dict = Depends(get_current_user)) -> dict:
    if user["user_type"] not in ["seller", "food_seller"]:
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    # التحقق من وجود مستندات سابقة
    existing = await db.seller_documents.find_one({"seller_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="تم رفع المستندات مسبقاً")
    
    # التحقق من الحقول الإلزامية
    if not docs.business_name or not docs.business_name.strip():
        raise HTTPException(status_code=400, detail="اسم النشاط التجاري مطلوب")
    
    if not docs.national_id or not docs.national_id.strip():
        raise HTTPException(status_code=400, detail="صورة الهوية مطلوبة")
    
    # التحقق من الرخصة إذا كان الصنف يتطلبها
    requires_license_categories = ["medicine"]  # الأصناف التي تتطلب رخصة للمنتجات
    if docs.business_category in requires_license_categories:
        if not docs.commercial_registration or not docs.commercial_registration.strip():
            raise HTTPException(status_code=400, detail="صورة السجل التجاري / الرخصة مطلوبة لهذا الصنف")
    
    # التحقق من العنوان والموقع - إلزامي
    if not docs.store_address or not docs.store_address.strip():
        raise HTTPException(status_code=400, detail="عنوان المتجر مطلوب")
    
    if not docs.store_latitude or not docs.store_longitude:
        raise HTTPException(status_code=400, detail="يرجى تحديد موقع المتجر على الخريطة")
    
    # التحقق من نوع البائع
    valid_seller_types = ["traditional_shop", "restaurant"]
    if docs.seller_type not in valid_seller_types:
        raise HTTPException(
            status_code=400,
            detail="نوع البائع غير صالح. الأنواع المتاحة: متجر تقليدي، مطعم"
        )
    
    # التحقق من الوثائق المطلوبة حسب النوع
    if docs.seller_type == "traditional_shop":
        if not docs.shop_photo or not docs.shop_photo.strip():
            raise HTTPException(status_code=400, detail="صورة المحل مطلوبة للمتاجر التقليدية")
    
    if docs.seller_type == "restaurant":
        if not docs.health_certificate or not docs.health_certificate.strip():
            raise HTTPException(status_code=400, detail="الشهادة الصحية مطلوبة للمطاعم")
    
    # ترجمة نوع البائع
    seller_type_names = {
        "traditional_shop": "متجر تقليدي",
        "restaurant": "مطعم/طعام"
    }
    
    doc = {
        "id": str(uuid.uuid4()),
        "seller_id": user["id"],
        "business_name": docs.business_name,
        "business_category": docs.business_category,
        "seller_type": docs.seller_type,
        "seller_type_name": seller_type_names.get(docs.seller_type, docs.seller_type),
        "national_id": docs.national_id,
        "commercial_registration": docs.commercial_registration,
        "shop_photo": docs.shop_photo if docs.seller_type == "traditional_shop" else None,
        "health_certificate": docs.health_certificate if docs.seller_type == "restaurant" else None,
        # حقول العنوان الجديدة
        "store_address": docs.store_address,
        "store_latitude": docs.store_latitude,
        "store_longitude": docs.store_longitude,
        "store_city": docs.store_city,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.seller_documents.insert_one(doc)
    
    # حفظ حساب استلام الأرباح
    if docs.payment_account:
        payment_acc = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "user_type": user["user_type"],
            "type": docs.payment_account.type,
            "account_number": docs.payment_account.account_number,
            "holder_name": docs.payment_account.holder_name,
            "bank_name": docs.payment_account.bank_name,
            "is_default": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.seller_payment_accounts.insert_one(payment_acc)
    
    # إرسال إشعار Push للمدراء
    try:
        from core.firebase_admin import send_push_to_admins
        await send_push_to_admins(
            title="📦 طلب انضمام بائع جديد",
            body=f"بائع جديد '{docs.business_name}' بانتظار الموافقة",
            notification_type="new_seller_registration",
            data={"seller_id": user["id"], "business_name": docs.business_name}
        )
    except Exception as e:
        auth_logger.warning(f"Failed to send admin notification for new seller: {e}")
    
    return {"message": "تم رفع المستندات بنجاح، سيتم مراجعتها قريباً"}

@seller_router.get("/seller-types")
async def get_seller_types() -> dict:
    """جلب أنواع البائعين المتاحة للتسجيل"""
    return {
        "seller_types": [
            {
                "id": "traditional_shop",
                "name": "متجر تقليدي",
                "icon": "🏪",
                "description": "محل تجاري بموقع ثابت",
                "required_documents": ["national_id", "commercial_registration", "shop_photo"]
            },
            {
                "id": "restaurant",
                "name": "مطعم/طعام",
                "icon": "🍳",
                "description": "مطعم أو محل طعام",
                "required_documents": ["national_id", "commercial_registration", "health_certificate"]
            }
        ]
    }

@seller_router.get("/documents/status")
async def get_documents_status(user: dict = Depends(get_current_user)) -> dict:
    doc = await db.seller_documents.find_one({"seller_id": user["id"]}, {"_id": 0})
    if not doc:
        return {"status": "not_submitted"}
    return {
        "status": doc["status"],
        "business_name": doc.get("business_name"),
        "seller_type": doc.get("seller_type"),
        "seller_type_name": doc.get("seller_type_name"),
        "rejection_reason": doc.get("rejection_reason")
    }

# ============== Delivery Routes ==============

delivery_auth_router = APIRouter(prefix="/delivery", tags=["Delivery Auth"])

@delivery_auth_router.post("/documents")
async def upload_delivery_documents(docs: DeliveryDocuments, user: dict = Depends(get_current_user)) -> dict:
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    existing = await db.delivery_documents.find_one({"delivery_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="تم رفع المستندات مسبقاً")
    
    # ========== التحقق من جميع الحقول الإلزامية ==========
    
    # 1. رقم الهوية
    if not docs.national_id or not docs.national_id.strip():
        raise HTTPException(status_code=400, detail="رقم الهوية الوطنية مطلوب")
    
    # 2. الصورة الشخصية (سيلفي)
    if not docs.personal_photo or not docs.personal_photo.strip():
        raise HTTPException(status_code=400, detail="الصورة الشخصية مطلوبة")
    
    # 3. صورة الهوية
    if not docs.id_photo or not docs.id_photo.strip():
        raise HTTPException(status_code=400, detail="صورة الهوية مطلوبة")
    
    # 4. صورة الدراجة - إلزامية
    if not docs.bike_photo or not docs.bike_photo.strip():
        raise HTTPException(status_code=400, detail="صورة الدراجة مطلوبة")
    
    # 5. نوع الوقود - إلزامي
    valid_fuel_types = ["petrol", "electric"]
    if not docs.fuel_type or docs.fuel_type not in valid_fuel_types:
        raise HTTPException(
            status_code=400, 
            detail="نوع الوقود مطلوب. الخيارات المتاحة: بنزين أو كهرباء"
        )
    
    # 6. العنوان والموقع - إلزامي
    if not docs.home_address or not docs.home_address.strip():
        raise HTTPException(status_code=400, detail="العنوان مطلوب (المدينة + العنوان التفصيلي)")
    
    # 7. الموقع GPS - إلزامي
    if not docs.home_latitude or not docs.home_longitude:
        raise HTTPException(status_code=400, detail="يرجى تحديد موقعك على الخريطة لتستقبل طلبات من منطقتك")
    
    # ترجمة نوع الوقود للعرض
    fuel_type_names = {
        "petrol": "بنزين",
        "electric": "كهرباء"
    }
    
    doc = {
        "id": str(uuid.uuid4()),
        "delivery_id": user["id"],
        "driver_id": user["id"],  # للتوافق مع الكود القديم
        "national_id": docs.national_id,
        "personal_photo": docs.personal_photo,
        "id_photo": docs.id_photo,
        "bike_photo": docs.bike_photo,  # صورة الدراجة
        "fuel_type": docs.fuel_type,  # نوع الوقود
        "fuel_type_name": fuel_type_names.get(docs.fuel_type, docs.fuel_type),
        # حقول العنوان والموقع
        "home_address": docs.home_address,
        "home_latitude": docs.home_latitude,
        "home_longitude": docs.home_longitude,
        "home_city": docs.home_city,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.delivery_documents.insert_one(doc)
    
    # حفظ حساب استلام الأرباح
    if docs.payment_account:
        payment_acc = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "user_type": user["user_type"],
            "type": docs.payment_account.type,
            "account_number": docs.payment_account.account_number,
            "holder_name": docs.payment_account.holder_name,
            "bank_name": docs.payment_account.bank_name,
            "is_default": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.delivery_payment_accounts.insert_one(payment_acc)
    
    # إرسال إشعار Push للمدراء
    try:
        from core.firebase_admin import send_push_to_admins
        driver_name = user.get("name", user.get("full_name", "سائق جديد"))
        await send_push_to_admins(
            title="🛵 طلب انضمام سائق جديد",
            body=f"سائق جديد '{driver_name}' بانتظار الموافقة",
            notification_type="new_driver_registration",
            data={"driver_id": user["id"], "driver_name": driver_name}
        )
    except Exception as e:
        auth_logger.warning(f"Failed to send admin notification for new driver: {e}")
    
    return {"message": "تم رفع المستندات بنجاح، سيتم مراجعتها قريباً"}

@delivery_auth_router.get("/documents/status")
async def get_delivery_documents_status(user: dict = Depends(get_current_user)) -> dict:
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    doc = await db.delivery_documents.find_one(
        {"$or": [{"delivery_id": user["id"]}, {"driver_id": user["id"]}]}, 
        {"_id": 0}
    )
    if not doc:
        return {"status": "not_submitted"}
    return {
        "status": doc["status"],
        "fuel_type": doc.get("fuel_type"),
        "fuel_type_name": doc.get("fuel_type_name"),
        "rejection_reason": doc.get("rejection_reason")
    }

@delivery_auth_router.get("/profile")
async def get_delivery_profile(user: dict = Depends(get_current_user)) -> dict:
    """
    جلب ملف السائق الشخصي بما في ذلك الصورة الشخصية
    هذا الـ endpoint يُستخدم في صفحة السائق الرئيسية
    """
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # جلب بيانات المستخدم الأساسية
    user_data = await db.users.find_one(
        {"id": user["id"]},
        {"_id": 0, "id": 1, "full_name": 1, "name": 1, "phone": 1, "city": 1, "created_at": 1}
    )
    
    if not user_data:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # جلب الوثائق والصورة الشخصية
    doc = await db.delivery_documents.find_one(
        {"$or": [{"delivery_id": user["id"]}, {"driver_id": user["id"]}]},
        {"_id": 0, "personal_photo": 1, "bike_photo": 1, "fuel_type": 1, "fuel_type_name": 1, 
         "home_city": 1, "home_address": 1, "status": 1, "created_at": 1}
    )
    
    # جلب إحصائيات السائق
    total_orders = await db.orders.count_documents({
        "$or": [
            {"delivery_id": user["id"]},
            {"driver_id": user["id"]}
        ],
        "delivery_status": "delivered"
    })
    
    # جلب التقييم
    ratings = await db.delivery_ratings.find(
        {"driver_id": user["id"]}
    ).to_list(1000)
    
    avg_rating = 0
    if ratings:
        avg_rating = sum(r.get("rating", 0) for r in ratings) / len(ratings)
    
    return {
        "id": user_data["id"],
        "name": user_data.get("full_name") or user_data.get("name", ""),
        "phone": user_data.get("phone", ""),
        "city": doc.get("home_city") if doc else user_data.get("city", ""),
        "personal_photo": doc.get("personal_photo") if doc else None,
        "bike_photo": doc.get("bike_photo") if doc else None,
        "fuel_type": doc.get("fuel_type") if doc else None,
        "fuel_type_name": doc.get("fuel_type_name") if doc else None,
        "status": doc.get("status") if doc else "not_submitted",
        "total_delivered_orders": total_orders,
        "average_rating": round(avg_rating, 1),
        "total_ratings": len(ratings),
        "joined_at": user_data.get("created_at", "")
    }

@delivery_auth_router.get("/fuel-types")
async def get_fuel_types() -> dict:
    """جلب أنواع الوقود المتاحة للتسجيل"""
    return {
        "fuel_types": [
            {
                "id": "petrol",
                "name": "بنزين",
                "icon": "⛽",
                "description": "دراجة نارية بنزين"
            },
            {
                "id": "electric",
                "name": "كهرباء",
                "icon": "🔋",
                "description": "دراجة كهربائية"
            }
        ]
    }


# ============================================
# 🏪 إعدادات المتجر للبائع
# ============================================

from pydantic import BaseModel
from typing import Optional

class StoreSettingsUpdate(BaseModel):
    store_name: Optional[str] = None
    store_description: Optional[str] = None
    store_address: Optional[str] = None
    store_city: Optional[str] = None
    store_phone: Optional[str] = None
    store_logo: Optional[str] = None
    store_latitude: Optional[float] = None
    store_longitude: Optional[float] = None

class PaymentAccountUpdate(BaseModel):
    type: str  # shamcash, bank_account
    account_number: str
    holder_name: str
    bank_name: Optional[str] = None
    is_default: bool = False

@router.get("/seller/store-settings")
async def get_store_settings(user: dict = Depends(get_current_user)) -> dict:
    """جلب إعدادات المتجر للبائع"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    seller = await db.users.find_one(
        {"id": user["id"]},
        {"_id": 0, "store_name": 1, "store_description": 1, "store_address": 1, "store_city": 1, "store_phone": 1, "city": 1, "phone": 1, "store_logo": 1, "store_latitude": 1, "store_longitude": 1}
    )
    
    return {
        "store_name": seller.get("store_name", ""),
        "store_description": seller.get("store_description", ""),
        "store_address": seller.get("store_address", ""),
        "store_city": seller.get("store_city", seller.get("city", "")),
        "store_phone": seller.get("store_phone", seller.get("phone", "")),
        "store_logo": seller.get("store_logo"),
        "store_latitude": seller.get("store_latitude"),
        "store_longitude": seller.get("store_longitude")
    }

@router.put("/seller/store-settings")
async def update_store_settings(settings: StoreSettingsUpdate, user: dict = Depends(get_current_user)) -> dict:
    """تحديث إعدادات المتجر للبائع"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    update_data = {}
    if settings.store_name is not None:
        update_data["store_name"] = sanitize_input(settings.store_name)
    if settings.store_description is not None:
        update_data["store_description"] = sanitize_input(settings.store_description)
    if settings.store_address is not None:
        update_data["store_address"] = sanitize_input(settings.store_address)
    if settings.store_city is not None:
        update_data["store_city"] = sanitize_input(settings.store_city)
    if settings.store_phone is not None:
        update_data["store_phone"] = settings.store_phone
    if settings.store_logo is not None:
        update_data["store_logo"] = settings.store_logo
    if settings.store_latitude is not None:
        update_data["store_latitude"] = settings.store_latitude
    if settings.store_longitude is not None:
        update_data["store_longitude"] = settings.store_longitude
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    return {"message": "تم تحديث إعدادات المتجر بنجاح"}

# ============================================
# 💳 حسابات الاستلام المالي للبائع
# ============================================

@router.get("/seller/payment-accounts")
async def get_seller_payment_accounts(user: dict = Depends(get_current_user)) -> dict:
    """جلب حسابات الاستلام المالي للبائع"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    accounts = await db.seller_payment_accounts.find(
        {"seller_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    return accounts

@router.post("/seller/payment-accounts")
async def add_seller_payment_account(account: PaymentAccountUpdate, user: dict = Depends(get_current_user)) -> dict:
    """إضافة حساب استلام مالي جديد للبائع"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    # التحقق من نوع الحساب
    valid_types = ["shamcash", "bank_account"]
    if account.type not in valid_types:
        raise HTTPException(status_code=400, detail="نوع الحساب غير صالح. الأنواع المتاحة: شام كاش، حساب بنكي")
    
    # إذا كان هذا الحساب افتراضي، إلغاء الافتراضي من الحسابات الأخرى
    if account.is_default:
        await db.seller_payment_accounts.update_many(
            {"seller_id": user["id"]},
            {"$set": {"is_default": False}}
        )
    
    # التحقق من عدم تكرار نفس الحساب
    existing = await db.seller_payment_accounts.find_one({
        "seller_id": user["id"],
        "type": account.type,
        "account_number": account.account_number
    })
    if existing:
        raise HTTPException(status_code=400, detail="هذا الحساب موجود مسبقاً")
    
    new_account = {
        "id": str(uuid.uuid4()),
        "seller_id": user["id"],
        "type": account.type,
        "account_number": account.account_number,
        "holder_name": sanitize_input(account.holder_name),
        "bank_name": sanitize_input(account.bank_name) if account.bank_name else None,
        "is_default": account.is_default,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.seller_payment_accounts.insert_one(new_account)
    del new_account["_id"]
    
    return new_account

@router.put("/seller/payment-accounts/{account_id}")
async def update_seller_payment_account(account_id: str, account: PaymentAccountUpdate, user: dict = Depends(get_current_user)) -> dict:
    """تحديث حساب استلام مالي للبائع"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    existing = await db.seller_payment_accounts.find_one({
        "id": account_id,
        "seller_id": user["id"]
    })
    if not existing:
        raise HTTPException(status_code=404, detail="الحساب غير موجود")
    
    # إذا كان هذا الحساب افتراضي، إلغاء الافتراضي من الحسابات الأخرى
    if account.is_default:
        await db.seller_payment_accounts.update_many(
            {"seller_id": user["id"], "id": {"$ne": account_id}},
            {"$set": {"is_default": False}}
        )
    
    update_data = {
        "type": account.type,
        "account_number": account.account_number,
        "holder_name": sanitize_input(account.holder_name),
        "bank_name": sanitize_input(account.bank_name) if account.bank_name else None,
        "is_default": account.is_default,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.seller_payment_accounts.update_one(
        {"id": account_id, "seller_id": user["id"]},
        {"$set": update_data}
    )
    
    return {"message": "تم تحديث الحساب بنجاح"}

@router.delete("/seller/payment-accounts/{account_id}")
async def delete_seller_payment_account(account_id: str, user: dict = Depends(get_current_user)) -> dict:
    """حذف حساب استلام مالي للبائع"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    result = await db.seller_payment_accounts.delete_one({
        "id": account_id,
        "seller_id": user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الحساب غير موجود")
    
    return {"message": "تم حذف الحساب بنجاح"}

@router.post("/seller/payment-accounts/{account_id}/default")
async def set_default_payment_account(account_id: str, user: dict = Depends(get_current_user)) -> dict:
    """تعيين حساب كافتراضي"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    existing = await db.seller_payment_accounts.find_one({
        "id": account_id,
        "seller_id": user["id"]
    })
    if not existing:
        raise HTTPException(status_code=404, detail="الحساب غير موجود")
    
    # إلغاء الافتراضي من كل الحسابات
    await db.seller_payment_accounts.update_many(
        {"seller_id": user["id"]},
        {"$set": {"is_default": False}}
    )
    
    # تعيين هذا الحساب كافتراضي
    await db.seller_payment_accounts.update_one(
        {"id": account_id},
        {"$set": {"is_default": True}}
    )
    
    return {"message": "تم تعيين الحساب كافتراضي"}


# ============================================
# 🚚 إعدادات موظف التوصيل
# ============================================

class DeliverySettingsUpdate(BaseModel):
    fuel_type: Optional[str] = None  # petrol, electric
    working_city: Optional[str] = None
    working_hours: Optional[str] = None
    home_address: Optional[str] = None
    home_latitude: Optional[float] = None
    home_longitude: Optional[float] = None

@router.get("/delivery/settings")
async def get_delivery_settings(user: dict = Depends(get_current_user)) -> dict:
    """جلب إعدادات موظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # جلب بيانات المستخدم
    delivery = await db.users.find_one(
        {"id": user["id"]},
        {"_id": 0, "working_city": 1, "working_hours": 1, "city": 1,
         "home_address": 1, "home_latitude": 1, "home_longitude": 1}
    )
    
    # جلب بيانات الوثائق للحصول على نوع الوقود
    doc = await db.delivery_documents.find_one(
        {"$or": [{"delivery_id": user["id"]}, {"driver_id": user["id"]}]},
        {"_id": 0, "fuel_type": 1, "fuel_type_name": 1, "home_city": 1}
    )
    
    return {
        "fuel_type": doc.get("fuel_type") if doc else "petrol",
        "fuel_type_name": doc.get("fuel_type_name") if doc else "بنزين",
        "working_city": delivery.get("working_city", delivery.get("city", doc.get("home_city", "دمشق") if doc else "دمشق")),
        "working_hours": delivery.get("working_hours", ""),
        "home_address": delivery.get("home_address", ""),
        "home_latitude": delivery.get("home_latitude"),
        "home_longitude": delivery.get("home_longitude")
    }

@router.put("/delivery/settings")
async def update_delivery_settings(settings: DeliverySettingsUpdate, user: dict = Depends(get_current_user)) -> dict:
    """تحديث إعدادات موظف التوصيل (باستثناء نوع الوقود - يتطلب تواصل مع الدعم)"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    update_data = {}
    # ملاحظة: لا نسمح بتغيير fuel_type مباشرة - يجب التواصل مع الدعم
    if settings.working_city is not None:
        update_data["working_city"] = settings.working_city
    if settings.working_hours is not None:
        update_data["working_hours"] = settings.working_hours
    if settings.home_address is not None:
        update_data["home_address"] = settings.home_address
    if settings.home_latitude is not None:
        update_data["home_latitude"] = settings.home_latitude
    if settings.home_longitude is not None:
        update_data["home_longitude"] = settings.home_longitude
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    return {"message": "تم تحديث الإعدادات بنجاح"}

# ============================================
# 💳 حسابات الاستلام المالي لموظف التوصيل
# ============================================

@router.get("/delivery/payment-accounts")
async def get_delivery_payment_accounts(user: dict = Depends(get_current_user)) -> dict:
    """جلب حسابات الاستلام المالي لموظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    accounts = await db.delivery_payment_accounts.find(
        {"delivery_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    return accounts

@router.post("/delivery/payment-accounts")
async def add_delivery_payment_account(account: PaymentAccountUpdate, user: dict = Depends(get_current_user)) -> dict:
    """إضافة حساب استلام مالي جديد لموظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    valid_types = ["shamcash", "bank_account"]
    if account.type not in valid_types:
        raise HTTPException(status_code=400, detail="نوع الحساب غير صالح. الأنواع المتاحة: شام كاش، حساب بنكي")
    
    if account.is_default:
        await db.delivery_payment_accounts.update_many(
            {"delivery_id": user["id"]},
            {"$set": {"is_default": False}}
        )
    
    existing = await db.delivery_payment_accounts.find_one({
        "delivery_id": user["id"],
        "type": account.type,
        "account_number": account.account_number
    })
    if existing:
        raise HTTPException(status_code=400, detail="هذا الحساب موجود مسبقاً")
    
    new_account = {
        "id": str(uuid.uuid4()),
        "delivery_id": user["id"],
        "type": account.type,
        "account_number": account.account_number,
        "holder_name": sanitize_input(account.holder_name),
        "bank_name": sanitize_input(account.bank_name) if account.bank_name else None,
        "is_default": account.is_default,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.delivery_payment_accounts.insert_one(new_account)
    del new_account["_id"]
    
    return new_account

@router.put("/delivery/payment-accounts/{account_id}")
async def update_delivery_payment_account(account_id: str, account: PaymentAccountUpdate, user: dict = Depends(get_current_user)) -> dict:
    """تحديث حساب استلام مالي لموظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    existing = await db.delivery_payment_accounts.find_one({
        "id": account_id,
        "delivery_id": user["id"]
    })
    if not existing:
        raise HTTPException(status_code=404, detail="الحساب غير موجود")
    
    if account.is_default:
        await db.delivery_payment_accounts.update_many(
            {"delivery_id": user["id"], "id": {"$ne": account_id}},
            {"$set": {"is_default": False}}
        )
    
    update_data = {
        "type": account.type,
        "account_number": account.account_number,
        "holder_name": sanitize_input(account.holder_name),
        "bank_name": sanitize_input(account.bank_name) if account.bank_name else None,
        "is_default": account.is_default,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.delivery_payment_accounts.update_one(
        {"id": account_id, "delivery_id": user["id"]},
        {"$set": update_data}
    )
    
    return {"message": "تم تحديث الحساب بنجاح"}

@router.delete("/delivery/payment-accounts/{account_id}")
async def delete_delivery_payment_account(account_id: str, user: dict = Depends(get_current_user)) -> dict:
    """حذف حساب استلام مالي لموظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    result = await db.delivery_payment_accounts.delete_one({
        "id": account_id,
        "delivery_id": user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الحساب غير موجود")
    
    return {"message": "تم حذف الحساب بنجاح"}

@router.post("/delivery/payment-accounts/{account_id}/default")
async def set_default_delivery_payment_account(account_id: str, user: dict = Depends(get_current_user)) -> dict:
    """تعيين حساب كافتراضي لموظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    existing = await db.delivery_payment_accounts.find_one({
        "id": account_id,
        "delivery_id": user["id"]
    })
    if not existing:
        raise HTTPException(status_code=404, detail="الحساب غير موجود")
    
    await db.delivery_payment_accounts.update_many(
        {"delivery_id": user["id"]},
        {"$set": {"is_default": False}}
    )
    
    await db.delivery_payment_accounts.update_one(
        {"id": account_id},
        {"$set": {"is_default": True}}
    )
    
    return {"message": "تم تعيين الحساب كافتراضي"}



# ============================================
# 🔐 استعادة كلمة المرور
# ============================================

def generate_reset_token() -> str:
    """توليد رمز إعادة تعيين كلمة المرور"""
    return ''.join(secrets.token_urlsafe(24))


def generate_sms_code() -> str:
    """توليد كود SMS من 6 أرقام"""
    return ''.join(''.join(secrets.choice(string.digits) for _ in range(6)))


# وضع المحاكاة - True للتطوير، False للإنتاج مع Twilio
SMS_MOCK_MODE = os.environ.get("SMS_MOCK_MODE", "true").lower() == "true"


async def send_sms(phone: str, message: str) -> dict:
    """
    إرسال SMS - محاكاة أو Twilio
    """
    if SMS_MOCK_MODE:
        # وضع المحاكاة - نطبع الكود في الـ logs
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"📱 [MOCK SMS] إلى {phone}: {message}")
        print(f"\n{'='*50}")
        print(f"📱 MOCK SMS to {phone}")
        print(f"Message: {message}")
        print(f"{'='*50}\n")
        return {"success": True, "mock": True, "message": message}
    else:
        # Twilio - يمكن تفعيله لاحقاً
        # from twilio.rest import Client
        # account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        # auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
        # from_number = os.environ.get("TWILIO_PHONE_NUMBER")
        # client = Client(account_sid, auth_token)
        # message = client.messages.create(body=message, from_=from_number, to=phone)
        # return {"success": True, "sid": message.sid}
        raise HTTPException(status_code=500, detail="خدمة الرسائل النصية غير مُعدّة")


@router.post("/send-sms-code")
@limiter.limit("3/minute")
async def send_sms_code(request: Request, data: ForgotPasswordRequest) -> dict:
    """
    إرسال كود التحقق عبر SMS
    """
    get_remote_address(request)
    
    # التحقق من صحة رقم الهاتف
    if not validate_phone(data.phone):
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
    
    # البحث عن المستخدم
    user = await db.users.find_one({"phone": data.phone}, {"_id": 0, "id": 1})
    if not user:
        raise HTTPException(status_code=404, detail="هذا الرقم غير مسجل في التطبيق")
    
    # توليد كود جديد
    sms_code = generate_sms_code()
    
    # حفظ الكود في قاعدة البيانات (صالح لمدة 5 دقائق)
    await db.sms_codes.update_one(
        {"phone": data.phone},
        {
            "$set": {
                "phone": data.phone,
                "code": sms_code,
                "user_id": user["id"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "attempts": 0,
                "verified": False
            }
        },
        upsert=True
    )
    
    # إرسال SMS
    message = f"كود التحقق الخاص بك في ترند سورية: {sms_code}\nصالح لمدة 5 دقائق فقط."
    await send_sms(data.phone, message)
    
    response = {
        "sent": True,
        "message": "تم إرسال كود التحقق إلى رقم هاتفك"
    }
    
    # في وضع المحاكاة، نرجع الكود للتطوير
    if SMS_MOCK_MODE:
        response["mock_code"] = sms_code
        response["mock_mode"] = True
    
    return response


@router.post("/verify-sms-code")
@limiter.limit("5/minute")
async def verify_sms_code(request: Request) -> dict:
    """
    التحقق من كود SMS
    """
    body = await request.json()
    phone = body.get("phone", "")
    code = body.get("code", "")
    
    if not phone or not code:
        raise HTTPException(status_code=400, detail="رقم الهاتف والكود مطلوبان")
    
    # البحث عن الكود
    sms_record = await db.sms_codes.find_one({"phone": phone, "verified": False})
    if not sms_record:
        raise HTTPException(status_code=404, detail="لم يتم إرسال كود لهذا الرقم")
    
    # التحقق من انتهاء الصلاحية (5 دقائق)
    from datetime import timedelta
    created_at = datetime.fromisoformat(sms_record["created_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) - created_at > timedelta(minutes=5):
        raise HTTPException(status_code=401, detail="انتهت صلاحية الكود. اطلب كود جديد.")
    
    # التحقق من عدد المحاولات (حد أقصى 5)
    if sms_record.get("attempts", 0) >= 5:
        raise HTTPException(status_code=429, detail="تجاوزت الحد الأقصى للمحاولات. اطلب كود جديد.")
    
    # زيادة عداد المحاولات
    await db.sms_codes.update_one(
        {"phone": phone},
        {"$inc": {"attempts": 1}}
    )
    
    # التحقق من الكود
    if sms_record["code"] != code:
        remaining = 5 - sms_record.get("attempts", 0) - 1
        raise HTTPException(status_code=401, detail=f"الكود غير صحيح. متبقي {remaining} محاولات.")
    
    # الكود صحيح - توليد reset token
    reset_token = generate_reset_token()
    
    # تحديث الكود كمستخدم وحفظ reset token
    await db.sms_codes.update_one(
        {"phone": phone},
        {"$set": {"verified": True}}
    )
    
    await db.password_resets.update_one(
        {"phone": phone},
        {
            "$set": {
                "phone": phone,
                "user_id": sms_record["user_id"],
                "token": reset_token,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "used": False
            }
        },
        upsert=True
    )
    
    return {
        "verified": True,
        "reset_token": reset_token,
        "message": "تم التحقق بنجاح. يمكنك الآن إعادة تعيين كلمة المرور."
    }


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest) -> dict:
    """
    الخطوة الأولى: التحقق من وجود رقم الهاتف
    """
    get_remote_address(request)
    
    # التحقق من صحة رقم الهاتف
    if not validate_phone(data.phone):
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
    
    # البحث عن المستخدم
    user = await db.users.find_one({"phone": data.phone}, {"_id": 0, "id": 1, "full_name": 1, "name": 1, "emergency_phone": 1})
    if not user:
        raise HTTPException(status_code=404, detail="هذا الرقم غير مسجل في التطبيق")
    
    # التحقق من وجود رقم طوارئ
    has_emergency = bool(user.get("emergency_phone"))
    
    return {
        "found": True,
        "has_emergency_phone": has_emergency,
        "message": "تم العثور على الحساب. اختر طريقة التحقق."
    }


@router.post("/verify-identity")
@limiter.limit("5/minute")
async def verify_identity(request: Request, data: VerifyIdentityRequest) -> dict:
    """
    الخطوة الثانية: التحقق من الهوية عبر رقم الطوارئ أو الاسم الثلاثي
    """
    client_ip = get_remote_address(request)
    
    # البحث عن المستخدم
    user = await db.users.find_one({"phone": data.phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="هذا الرقم غير مسجل في التطبيق")
    
    verified = False
    
    if data.verification_type == "emergency":
        # التحقق من آخر 4 أرقام من رقم الطوارئ
        emergency_phone = user.get("emergency_phone", "")
        if not emergency_phone:
            raise HTTPException(status_code=400, detail="لا يوجد رقم طوارئ مسجل. جرب التحقق بالاسم الثلاثي.")
        
        # استخراج آخر 4 أرقام
        actual_last_4 = emergency_phone[-4:] if len(emergency_phone) >= 4 else emergency_phone
        provided_last_4 = data.emergency_last_4 or ""
        
        if provided_last_4 == actual_last_4:
            verified = True
        else:
            # تسجيل محاولة فاشلة
            log_suspicious_activity(
                "failed_identity_verification",
                f"Failed emergency phone verification for {data.phone}",
                client_ip
            )
            raise HTTPException(status_code=401, detail="آخر 4 أرقام غير صحيحة")
    
    elif data.verification_type == "name":
        # التحقق من الاسم الثلاثي
        user_name = user.get("full_name", user.get("name", "")).strip().lower()
        provided_name = (data.full_name or "").strip().lower()
        
        if not provided_name:
            raise HTTPException(status_code=400, detail="يرجى إدخال الاسم الثلاثي")
        
        # مقارنة الأسماء (مرنة - تتجاهل الفراغات الزائدة)
        user_name_parts = set(user_name.split())
        provided_name_parts = set(provided_name.split())
        
        # يجب أن يكون هناك تطابق في 3 أجزاء على الأقل
        matching_parts = user_name_parts.intersection(provided_name_parts)
        
        if len(matching_parts) >= 3 or user_name == provided_name:
            verified = True
        else:
            log_suspicious_activity(
                "failed_identity_verification",
                f"Failed name verification for {data.phone}",
                client_ip
            )
            raise HTTPException(status_code=401, detail="الاسم الثلاثي غير مطابق")
    
    else:
        raise HTTPException(status_code=400, detail="نوع التحقق غير صالح")
    
    if verified:
        # توليد رمز إعادة التعيين
        reset_token = generate_reset_token()
        
        # حفظ الرمز في قاعدة البيانات (صالح لمدة 15 دقيقة)
        await db.password_resets.update_one(
            {"phone": data.phone},
            {
                "$set": {
                    "phone": data.phone,
                    "user_id": user["id"],
                    "token": reset_token,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "used": False
                }
            },
            upsert=True
        )
        
        return {
            "verified": True,
            "reset_token": reset_token,
            "message": "تم التحقق بنجاح. يمكنك الآن إعادة تعيين كلمة المرور."
        }


@router.post("/reset-password")
@limiter.limit("3/minute")
async def reset_password(request: Request, data: ResetPasswordRequest) -> dict:
    """
    الخطوة الثالثة: إعادة تعيين كلمة المرور
    """
    get_remote_address(request)
    
    # التحقق من قوة كلمة المرور الجديدة
    is_valid, issues = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=issues[0])
    
    # البحث عن رمز إعادة التعيين
    reset_record = await db.password_resets.find_one({
        "phone": data.phone,
        "token": data.reset_token,
        "used": False
    })
    
    if not reset_record:
        raise HTTPException(status_code=401, detail="رمز إعادة التعيين غير صالح أو منتهي الصلاحية")
    
    # التحقق من انتهاء الصلاحية (15 دقيقة)
    from datetime import timedelta
    created_at = datetime.fromisoformat(reset_record["created_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) - created_at > timedelta(minutes=15):
        raise HTTPException(status_code=401, detail="انتهت صلاحية رمز إعادة التعيين. يرجى طلب رمز جديد.")
    
    # تحديث كلمة المرور
    new_password_hash = hash_password_secure(data.new_password)
    await db.users.update_one(
        {"phone": data.phone},
        {"$set": {"password": new_password_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # تحديد الرمز كمستخدم
    await db.password_resets.update_one(
        {"phone": data.phone, "token": data.reset_token},
        {"$set": {"used": True}}
    )
    
    # حذف refresh tokens القديمة لإجبار المستخدم على تسجيل الدخول من جديد
    await db.refresh_tokens.delete_many({"user_id": reset_record["user_id"]})
    
    return {
        "success": True,
        "message": "تم تغيير كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول."
    }


# ============================================
# 🔐 تغيير كلمة المرور (للمستخدم المسجل)
# ============================================

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
@limiter.limit("5/minute")
async def change_password(request: Request, data: ChangePasswordRequest, user: dict = Depends(get_current_user)) -> dict:
    """
    تغيير كلمة المرور للمستخدم المسجل
    يُستخدم أيضاً عند إجبار تغيير كلمة المرور الافتراضية
    """
    client_ip = get_remote_address(request)
    
    # جلب بيانات المستخدم الكاملة
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not full_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # التحقق من كلمة المرور الحالية
    if not verify_password(data.current_password, full_user["password"]):
        log_suspicious_activity(
            "failed_password_change",
            f"Failed password change attempt for {full_user.get('phone', 'unknown')}",
            client_ip
        )
        raise HTTPException(status_code=401, detail="كلمة المرور الحالية غير صحيحة")
    
    # التحقق من أن كلمة المرور الجديدة مختلفة
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية")
    
    # التحقق من قوة كلمة المرور الجديدة (صارم)
    is_valid, issues = validate_password_strength(data.new_password, strict=True)
    if not is_valid:
        raise HTTPException(status_code=400, detail=issues[0])
    
    # تحديث كلمة المرور
    new_password_hash = hash_password_secure(data.new_password)
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "password": new_password_hash,
                "force_password_change": False,  # إزالة إجبار التغيير
                "password_changed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "message": "تم تغيير كلمة المرور بنجاح"
    }



@router.put("/user/emergency-phone")
async def update_emergency_phone(request: Request, user: dict = Depends(get_current_user)) -> dict:
    """تحديث رقم الطوارئ للمستخدم"""
    body = await request.json()
    emergency_phone = body.get("emergency_phone", "")
    
    if emergency_phone and not validate_phone(emergency_phone):
        raise HTTPException(status_code=400, detail="رقم الطوارئ غير صحيح")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"emergency_phone": emergency_phone, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "تم تحديث رقم الطوارئ بنجاح"}


@router.get("/user/emergency-phone")
async def get_emergency_phone(user: dict = Depends(get_current_user)) -> dict:
    """جلب رقم الطوارئ للمستخدم"""
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0, "emergency_phone": 1})
    return {"emergency_phone": user_data.get("emergency_phone", "")}



# === Debug: تشخيص مشاكل تسجيل الدخول (للأدمن فقط) ===
@router.get("/debug/login-check/{phone}")
async def debug_login_check(phone: str, admin: dict = Depends(get_current_user)) -> dict:
    """
    🔧 تشخيص مشاكل تسجيل الدخول - للأدمن فقط
    يُظهر معلومات عامة فقط لتحديد المشكلة
    """
    if admin.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    try:
        # التحقق من اتصال قاعدة البيانات
        try:
            await db.command("ping")
            db_status = "✅ متصل"
        except Exception as db_err:
            db_status = f"❌ خطأ: {str(db_err)[:50]}"
        
        # البحث عن المستخدم
        user = await db.users.find_one({"phone": phone}, {"_id": 0, "id": 1, "user_type": 1, "password": 1, "full_name": 1, "is_approved": 1})
        
        if not user:
            return {
                "status": "not_found",
                "message": "المستخدم غير موجود في قاعدة البيانات",
                "db_status": db_status,
                "phone": phone
            }
        
        # معلومات كلمة المرور (بدون كشفها)
        password = user.get("password", "")
        password_info = {
            "exists": bool(password),
            "type": "bcrypt" if password.startswith("$2") else "sha256" if len(password) == 64 else "unknown",
            "length": len(password)
        }
        
        return {
            "status": "found",
            "db_status": db_status,
            "phone": phone,
            "user_id": user.get("id", "N/A")[:8] + "...",
            "user_type": user.get("user_type", "N/A"),
            "full_name": user.get("full_name", "N/A"),
            "is_approved": user.get("is_approved", False),
            "password_info": password_info
        }
    except Exception:
        return {
            "status": "error",
            "error": "حدث خطأ في التحقق"
        }


# === Admin: تشخيص مشاكل تسجيل الدخول ===
@router.get("/admin/user-auth-status/{phone}")
async def get_user_auth_status(phone: str, admin: dict = Depends(get_current_user)) -> dict:
    """التحقق من حالة مصادقة مستخدم - للأدمن فقط"""
    if admin.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    password = user.get("password", "")
    return {
        "phone": phone,
        "full_name": user.get("full_name", "N/A"),
        "user_type": user.get("user_type", "N/A"),
        "is_approved": user.get("is_approved", False),
        "is_verified": user.get("is_verified", False),
        "password_hash_type": "bcrypt" if password.startswith("$2") else "legacy_sha256" if len(password) == 64 else "unknown",
        "password_hash_length": len(password),
        "force_password_change": user.get("force_password_change", False),
        "password_changed_at": user.get("password_changed_at", "N/A"),
        "created_at": user.get("created_at", "N/A"),
    }


@router.post("/admin/reset-user-password/{phone}")
async def admin_reset_user_password(phone: str, admin: dict = Depends(get_current_user)) -> dict:
    """إعادة تعيين كلمة مرور مستخدم للقيمة الافتراضية - للأدمن فقط"""
    if admin.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # كلمة مرور افتراضية من environment variable
    default_password = os.environ.get("DEFAULT_RESET_PASSWORD", "test1234")
    new_hash = hash_password_secure(default_password)
    
    await db.users.update_one(
        {"phone": phone},
        {"$set": {
            "password": new_hash,
            "force_password_change": True,  # إجبار تغيير كلمة المرور
            "password_changed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": f"تم إعادة تعيين كلمة مرور {phone} إلى: {default_password}",
        "force_password_change": True
    }



# ============== WhatsApp OTP ==============

@router.post("/send-whatsapp-otp")
@limiter.limit("3/minute")
async def send_whatsapp_otp(request: Request, data: ForgotPasswordRequest) -> dict:
    """
    إرسال رمز OTP عبر واتساب لاستعادة كلمة المرور
    🧪 في وضع الاختبار: يعيد رسالة نجاح مع إرشاد لاستخدام الرمز 123456
    """
    from services.whatsapp_service import send_password_reset_otp, TEST_MODE, TEST_OTP_CODE
    
    get_remote_address(request)
    
    # التحقق من صحة رقم الهاتف
    if not validate_phone(data.phone):
        raise HTTPException(status_code=400, detail="رقم الهاتف غير صحيح")
    
    # البحث عن المستخدم
    user = await db.users.find_one({"phone": data.phone}, {"_id": 0, "id": 1, "full_name": 1})
    if not user:
        raise HTTPException(status_code=404, detail="هذا الرقم غير مسجل في التطبيق")
    
    # 🧪 في وضع الاختبار: لا نحتاج لحفظ OTP حقيقي
    if TEST_MODE:
        return {
            "sent": True,
            "test_mode": True,
            "message": f"وضع الاختبار - استخدم الرمز: {TEST_OTP_CODE}",
            "hint": f"الرمز الثابت للاختبار: {TEST_OTP_CODE}"
        }
    
    # توليد رمز OTP (6 أرقام)
    otp_code = ''.join(''.join(secrets.choice(string.digits) for _ in range(6)))
    
    # حفظ OTP في قاعدة البيانات (صالح لمدة 10 دقائق)
    await db.otp_codes.update_one(
        {"phone": data.phone},
        {
            "$set": {
                "phone": data.phone,
                "user_id": user["id"],
                "otp": otp_code,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                "used": False,
                "attempts": 0
            }
        },
        upsert=True
    )
    
    # إرسال OTP عبر واتساب
    result = await send_password_reset_otp(data.phone, otp_code)
    
    if result.get("success"):
        return {
            "sent": True,
            "message": "تم إرسال رمز التحقق عبر واتساب"
        }
    else:
        raise HTTPException(status_code=500, detail="فشل إرسال الرسالة. تأكد من أن رقمك مسجل على واتساب.")


@router.post("/verify-whatsapp-otp")
@limiter.limit("5/minute")
async def verify_whatsapp_otp(request: Request, phone: str, otp: str) -> dict:
    """
    التحقق من رمز OTP المرسل عبر واتساب
    🧪 في وضع الاختبار: يقبل الرمز الثابت 123456
    """
    get_remote_address(request)
    
    # 🧪 استيراد إعدادات وضع الاختبار
    from services.whatsapp_service import TEST_MODE, TEST_OTP_CODE
    
    # 🧪 في وضع الاختبار: قبول الرمز الثابت 123456 مباشرة
    if TEST_MODE and otp == TEST_OTP_CODE:
        # البحث عن المستخدم
        user = await db.users.find_one({"phone": phone}, {"_id": 0, "id": 1})
        if not user:
            raise HTTPException(status_code=404, detail="هذا الرقم غير مسجل في التطبيق")
        
        # توليد رمز إعادة التعيين
        reset_token = ''.join(secrets.token_urlsafe(24))
        
        # حفظ رمز إعادة التعيين
        await db.password_resets.update_one(
            {"phone": phone},
            {
                "$set": {
                    "phone": phone,
                    "user_id": user["id"],
                    "token": reset_token,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "used": False
                }
            },
            upsert=True
        )
        
        return {
            "verified": True,
            "reset_token": reset_token,
            "test_mode": True,
            "message": "تم التحقق بنجاح (وضع الاختبار). يمكنك الآن إعادة تعيين كلمة المرور."
        }
    
    # البحث عن OTP
    otp_record = await db.otp_codes.find_one({"phone": phone, "used": False}, {"_id": 0})
    
    if not otp_record:
        raise HTTPException(status_code=404, detail="لم يتم طلب رمز تحقق لهذا الرقم")
    
    # التحقق من انتهاء الصلاحية
    expires_at = datetime.fromisoformat(otp_record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="انتهت صلاحية رمز التحقق. اطلب رمزاً جديداً.")
    
    # التحقق من عدد المحاولات
    if otp_record.get("attempts", 0) >= 5:
        raise HTTPException(status_code=429, detail="تم تجاوز عدد المحاولات المسموح. اطلب رمزاً جديداً.")
    
    # زيادة عدد المحاولات
    await db.otp_codes.update_one(
        {"phone": phone},
        {"$inc": {"attempts": 1}}
    )
    
    # التحقق من OTP
    if otp_record["otp"] != otp:
        remaining = 5 - otp_record.get("attempts", 0) - 1
        raise HTTPException(status_code=401, detail=f"رمز التحقق غير صحيح. المحاولات المتبقية: {remaining}")
    
    # OTP صحيح - توليد رمز إعادة التعيين
    reset_token = ''.join(secrets.token_urlsafe(24))
    
    # تحديث OTP كمستخدم
    await db.otp_codes.update_one(
        {"phone": phone},
        {"$set": {"used": True}}
    )
    
    # حفظ رمز إعادة التعيين
    await db.password_resets.update_one(
        {"phone": phone},
        {
            "$set": {
                "phone": phone,
                "user_id": otp_record["user_id"],
                "token": reset_token,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "used": False
            }
        },
        upsert=True
    )
    
    return {
        "verified": True,
        "reset_token": reset_token,
        "message": "تم التحقق بنجاح. يمكنك الآن إعادة تعيين كلمة المرور."
    }


@router.get("/whatsapp/status")
async def check_whatsapp_status() -> dict:
    """
    التحقق من حالة اتصال واتساب
    """
    from services.whatsapp_service import check_connection
    
    result = await check_connection()
    return result



@router.delete("/delete-account")
async def delete_account(user: dict = Depends(get_current_user)) -> dict:
    """
    حذف حساب المستخدم نهائياً
    """
    user_id = user["id"]
    user_type = user.get("user_type", "buyer")
    
    # لا يمكن للأدمن حذف حسابه
    if user_type == "admin":
        raise HTTPException(status_code=403, detail="لا يمكن حذف حساب الأدمن")
    
    try:
        # حذف المستخدم من جدول users
        await db.users.delete_one({"id": user_id})
        
        # حذف البيانات المرتبطة
        await db.wallets.delete_one({"user_id": user_id})
        await db.notifications.delete_many({"user_id": user_id})
        await db.carts.delete_one({"user_id": user_id})
        await db.favorites.delete_many({"user_id": user_id})
        await db.reviews.delete_many({"user_id": user_id})
        
        # إذا كان سائق
        if user_type == "delivery":
            await db.delivery_documents.delete_one({"driver_id": user_id})
            await db.driver_locations.delete_one({"driver_id": user_id})
            await db.driver_security_deposits.delete_one({"driver_id": user_id})
        
        # إذا كان بائع
        if user_type == "seller":
            await db.seller_documents.delete_one({"seller_id": user_id})
            await db.products.delete_many({"seller_id": user_id})
        
        # إذا كان بائع طعام
        if user_type == "food_seller":
            await db.food_stores.delete_one({"owner_id": user_id})
            await db.food_items.delete_many({"seller_id": user_id})
        
        return {"success": True, "message": "تم حذف حسابك بنجاح"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"حدث خطأ أثناء حذف الحساب: {str(e)}")



# ============== نظام الأدوار المتعددة (Multi-Role System) ==============

class AddRoleRequest(BaseModel):
    role: str  # "seller", "food_seller", "delivery"

class SwitchRoleRequest(BaseModel):
    role: str


@router.get("/roles")
async def get_user_roles(user: dict = Depends(get_current_user)) -> dict:
    """
    جلب أدوار المستخدم الحالي
    """
    user_id = user["id"]
    
    # جلب بيانات المستخدم الكاملة
    full_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not full_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # إذا لم يكن لديه roles، نُنشئها من user_type الحالي
    roles = full_user.get("roles", [full_user.get("user_type", "buyer")])
    active_role = full_user.get("active_role", full_user.get("user_type", "buyer"))
    role_status = full_user.get("role_status", {})
    
    # التأكد من وجود حالة لكل دور
    for role in roles:
        if role not in role_status:
            if role == "buyer":
                role_status[role] = {"status": "active"}
            elif role in ["seller", "food_seller"]:
                # التحقق من حالة وثائق البائع
                seller_doc = await db.seller_documents.find_one({"seller_id": user_id}, {"_id": 0})
                if seller_doc:
                    role_status[role] = {"status": seller_doc.get("status", "pending")}
                else:
                    role_status[role] = {"status": "not_submitted"}
            elif role == "delivery":
                # التحقق من حالة وثائق التوصيل
                delivery_doc = await db.delivery_documents.find_one({"driver_id": user_id}, {"_id": 0})
                if delivery_doc:
                    role_status[role] = {"status": delivery_doc.get("status", "pending")}
                else:
                    role_status[role] = {"status": "not_submitted"}
    
    return {
        "roles": roles,
        "active_role": active_role,
        "role_status": role_status,
        "can_add_roles": get_available_roles(roles)
    }


def get_available_roles(current_roles: list) -> list:
    """
    الحصول على الأدوار المتاحة للإضافة
    """
    all_roles = ["buyer", "seller", "food_seller", "delivery"]
    # المشتري لا يمكن أن يكون بائع منتجات وطعام معاً
    if "seller" in current_roles:
        all_roles.remove("food_seller")
    if "food_seller" in current_roles:
        all_roles.remove("seller")
    
    return [r for r in all_roles if r not in current_roles]


@router.post("/roles/add")
async def add_role_to_user(data: AddRoleRequest, user: dict = Depends(get_current_user)) -> dict:
    """
    إضافة دور جديد للمستخدم (مثل: مشتري يصبح بائع)
    """
    user_id = user["id"]
    new_role = data.role
    
    # التحقق من صحة الدور
    valid_roles = ["seller", "food_seller", "delivery"]
    if new_role not in valid_roles:
        raise HTTPException(status_code=400, detail="دور غير صالح")
    
    # جلب بيانات المستخدم
    full_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not full_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # الحصول على الأدوار الحالية
    current_roles = full_user.get("roles", [full_user.get("user_type", "buyer")])
    
    # التحقق من عدم وجود الدور مسبقاً
    if new_role in current_roles:
        raise HTTPException(status_code=400, detail="لديك هذا الدور بالفعل")
    
    # التحقق من التعارض (لا يمكن أن يكون seller و food_seller معاً)
    if new_role == "seller" and "food_seller" in current_roles:
        raise HTTPException(status_code=400, detail="لا يمكنك أن تكون بائع منتجات وبائع طعام معاً")
    if new_role == "food_seller" and "seller" in current_roles:
        raise HTTPException(status_code=400, detail="لا يمكنك أن تكون بائع طعام وبائع منتجات معاً")
    
    # إضافة الدور الجديد
    new_roles = current_roles + [new_role]
    
    # تحديث role_status
    role_status = full_user.get("role_status", {})
    role_status[new_role] = {"status": "not_submitted", "added_at": datetime.now(timezone.utc).isoformat()}
    
    # تحديث قاعدة البيانات
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "roles": new_roles,
                "role_status": role_status
            }
        }
    )
    
    # تحديد الصفحة التالية
    next_page = "/seller/documents" if new_role in ["seller", "food_seller"] else "/delivery/documents"
    
    return {
        "success": True,
        "message": f"تم إضافة دور {get_role_name(new_role)} بنجاح",
        "roles": new_roles,
        "next_step": "يرجى رفع الوثائق المطلوبة للموافقة",
        "redirect_to": next_page
    }


@router.post("/roles/switch")
async def switch_active_role(data: SwitchRoleRequest, user: dict = Depends(get_current_user)) -> dict:
    """
    تبديل الدور النشط للمستخدم
    """
    user_id = user["id"]
    new_role = data.role
    
    # جلب بيانات المستخدم
    full_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not full_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # الحصول على الأدوار الحالية
    current_roles = full_user.get("roles", [full_user.get("user_type", "buyer")])
    
    # التحقق من أن المستخدم لديه هذا الدور
    if new_role not in current_roles:
        raise HTTPException(status_code=400, detail="ليس لديك هذا الدور")
    
    # التحقق من حالة الدور (يجب أن يكون معتمداً أو نشطاً)
    role_status = full_user.get("role_status", {})
    role_info = role_status.get(new_role, {})
    
    if new_role != "buyer":
        status = role_info.get("status", "not_submitted")
        if status not in ["active", "approved"]:
            if status == "pending":
                raise HTTPException(status_code=400, detail="هذا الدور في انتظار الموافقة")
            elif status == "rejected":
                raise HTTPException(status_code=400, detail="تم رفض هذا الدور، يرجى إعادة رفع الوثائق")
            else:
                raise HTTPException(status_code=400, detail="يرجى رفع الوثائق المطلوبة أولاً")
    
    # تحديث الدور النشط و user_type (للتوافق مع الكود الحالي)
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "active_role": new_role,
                "user_type": new_role  # للتوافق مع الكود القديم
            }
        }
    )
    
    # إنشاء توكن جديد بالدور الجديد
    new_access_token = create_access_token(user_id, new_role)
    new_refresh_token = create_refresh_token(user_id)
    
    return {
        "success": True,
        "message": f"تم التبديل إلى {get_role_name(new_role)}",
        "active_role": new_role,
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "redirect_to": get_role_redirect(new_role)
    }


def get_role_name(role: str) -> str:
    """
    الحصول على اسم الدور بالعربية
    """
    names = {
        "buyer": "مشتري",
        "seller": "بائع",
        "food_seller": "بائع طعام",
        "delivery": "موظف توصيل",
        "admin": "مدير",
        "sub_admin": "مشرف"
    }
    return names.get(role, role)


def get_role_redirect(role: str) -> str:
    """
    الحصول على صفحة التوجيه حسب الدور
    """
    redirects = {
        "buyer": "/",
        "seller": "/seller/dashboard",
        "food_seller": "/food/dashboard",
        "delivery": "/delivery/dashboard",
        "admin": "/admin",
        "sub_admin": "/admin"
    }
    return redirects.get(role, "/")


@router.get("/roles/status/{role}")
async def get_role_status(role: str, user: dict = Depends(get_current_user)) -> dict:
    """
    جلب حالة دور معين (للتحقق قبل التبديل)
    """
    user_id = user["id"]
    
    full_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not full_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    current_roles = full_user.get("roles", [full_user.get("user_type", "buyer")])
    
    if role not in current_roles:
        return {
            "has_role": False,
            "status": "not_added",
            "message": "لم تضف هذا الدور بعد"
        }
    
    role_status = full_user.get("role_status", {})
    role_info = role_status.get(role, {"status": "active" if role == "buyer" else "not_submitted"})
    
    return {
        "has_role": True,
        "status": role_info.get("status"),
        "can_switch": role_info.get("status") in ["active", "approved"],
        "message": get_status_message(role_info.get("status"))
    }


def get_status_message(status: str) -> str:
    """
    رسالة حالة الدور
    """
    messages = {
        "active": "نشط",
        "approved": "معتمد",
        "pending": "في انتظار الموافقة",
        "rejected": "مرفوض",
        "not_submitted": "لم يتم رفع الوثائق"
    }
    return messages.get(status, status)
