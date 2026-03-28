# /app/backend/routes/auth.py
# مسارات المصادقة وتسجيل الدخول
# 🔒 محمي ضد Brute Force و Input Validation

from fastapi import APIRouter, HTTPException, Depends, Request
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user, create_token
from core.security import (
    hash_password_secure,
    verify_password,
    check_brute_force,
    record_failed_login,
    clear_failed_attempts,
    validate_phone,
    validate_password_strength,
    is_default_account,
    check_password_change_required,
    sanitize_input,
    log_suspicious_activity,
    create_access_token,
    create_refresh_token,
    decode_token,
    should_refresh_token,
    limiter,
    reset_all_brute_force_locks
)
from models.schemas import (
    UserRegister, UserLogin, SellerDocuments, DeliveryDocuments,
    ForgotPasswordRequest, VerifyIdentityRequest, ResetPasswordRequest
)
import random
import string
import os
from slowapi.util import get_remote_address

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
@limiter.limit("3/minute")
async def register(request: Request, user: UserRegister):
    client_ip = get_remote_address(request)
    
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
    user_doc = {
        "id": user_id,
        "name": clean_name,
        "full_name": clean_name,
        "phone": user.phone,
        "password": hash_password_secure(user.password),  # 🔒 bcrypt
        "city": clean_city,
        "user_type": user.user_type,
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
    
    return {
        "token": access_token,
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

@router.post("/login")
@limiter.limit("15/minute")
async def login(request: Request, credentials: UserLogin):
    client_ip = get_remote_address(request)
    
    # 🔒 فحص Brute Force
    check_brute_force(credentials.phone, client_ip)
    
    user = await db.users.find_one({"phone": credentials.phone}, {"_id": 0})
    if not user:
        record_failed_login(credentials.phone, client_ip)
        raise HTTPException(status_code=401, detail="رقم الهاتف أو كلمة المرور غير صحيحة")
    
    # 🔒 التحقق من كلمة المرور (يدعم bcrypt و SHA256 القديم)
    if not verify_password(credentials.password, user["password"]):
        record_failed_login(credentials.phone, client_ip)
        # 📝 Log للتحقيق في مشاكل تسجيل الدخول
        import logging
        auth_logger = logging.getLogger("auth")
        auth_logger.warning(f"Failed login for {credentials.phone} - password hash type: {'bcrypt' if user['password'].startswith('$2') else 'legacy'}")
        log_suspicious_activity(
            "failed_login",
            f"Failed login attempt for {credentials.phone}",
            client_ip
        )
        raise HTTPException(status_code=401, detail="رقم الهاتف أو كلمة المرور غير صحيحة")
    
    # 🔒 مسح محاولات الدخول الفاشلة
    clear_failed_attempts(credentials.phone, client_ip)
    
    # 🔒 تحديث كلمة المرور القديمة إلى bcrypt
    if not user["password"].startswith('$2'):
        new_hash = hash_password_secure(credentials.password)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"password": new_hash}}
        )
    
    # 🔒 التحقق من الحساب الافتراضي - إجبار تغيير كلمة المرور
    force_password_change = is_default_account(credentials.phone, credentials.password) or user.get("force_password_change", False)
    
    # 🔒 إنشاء توكنات آمنة
    access_token = create_access_token(user["id"], user["user_type"])
    refresh_token = create_refresh_token(user["id"])
    
    # حفظ refresh token
    await db.refresh_tokens.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "token": refresh_token,
            "created_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    # تحديد is_approved حسب نوع المستخدم
    is_approved = user.get("is_approved", False)
    
    # للسائقين: التحقق من delivery_documents
    if user["user_type"] == "delivery":
        delivery_doc = await db.delivery_documents.find_one(
            {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
            {"_id": 0, "status": 1}
        )
        is_approved = delivery_doc and delivery_doc.get("status") == "approved"
    
    # للبائعين: التحقق من is_approved في users أو seller_profile
    elif user["user_type"] in ["seller", "food_seller"]:
        is_approved = user.get("is_approved", False)
    
    return {
        "token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user["id"],
            "name": user.get("full_name", user.get("name", "")),
            "full_name": user.get("full_name", user.get("name", "")),
            "phone": user["phone"],
            "user_type": user["user_type"],
            "is_approved": is_approved
        },
        "force_password_change": force_password_change
    }

@router.post("/reset-brute-force")
async def reset_brute_force_locks(user: dict = Depends(get_current_user)):
    """🔒 إعادة تعيين أقفال brute force - للأدمن فقط"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للإدارة فقط")
    
    result = reset_all_brute_force_locks()
    return result

@router.post("/refresh")
async def refresh_token(request: Request):
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
async def get_me(user: dict = Depends(get_current_user)):
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
async def lookup_user_by_phone(phone: str, user: dict = Depends(get_current_user)):
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
async def upload_seller_documents(docs: SellerDocuments, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["seller", "food_seller"]:
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    # التحقق من وجود مستندات سابقة
    existing = await db.seller_documents.find_one({"seller_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="تم رفع المستندات مسبقاً")
    
    # التحقق من نوع البائع
    valid_seller_types = ["traditional_shop", "restaurant"]
    if docs.seller_type not in valid_seller_types:
        raise HTTPException(
            status_code=400,
            detail="نوع البائع غير صالح. الأنواع المتاحة: متجر تقليدي، مطعم"
        )
    
    # التحقق من الوثائق المطلوبة حسب النوع
    if docs.seller_type == "traditional_shop":
        if not docs.shop_photo:
            raise HTTPException(status_code=400, detail="صورة المحل مطلوبة للمتاجر التقليدية")
    
    if docs.seller_type == "restaurant":
        if not docs.health_certificate:
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
        "seller_type": docs.seller_type,
        "seller_type_name": seller_type_names.get(docs.seller_type, docs.seller_type),
        "national_id": docs.national_id,
        "commercial_registration": docs.commercial_registration,
        "shop_photo": docs.shop_photo if docs.seller_type == "traditional_shop" else None,
        "health_certificate": docs.health_certificate if docs.seller_type == "restaurant" else None,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.seller_documents.insert_one(doc)
    return {"message": "تم رفع المستندات بنجاح، سيتم مراجعتها قريباً"}

@seller_router.get("/seller-types")
async def get_seller_types():
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
async def get_documents_status(user: dict = Depends(get_current_user)):
    doc = await db.seller_documents.find_one({"seller_id": user["id"]}, {"_id": 0})
    if not doc:
        return {"status": "not_submitted"}
    return {
        "status": doc["status"],
        "business_name": doc.get("business_name"),
        "seller_type": doc.get("seller_type"),
        "seller_type_name": doc.get("seller_type_name")
    }

# ============== Delivery Routes ==============

delivery_auth_router = APIRouter(prefix="/delivery", tags=["Delivery Auth"])

@delivery_auth_router.post("/documents")
async def upload_delivery_documents(docs: DeliveryDocuments, user: dict = Depends(get_current_user)):
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    existing = await db.delivery_documents.find_one({"delivery_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="تم رفع المستندات مسبقاً")
    
    # التحقق من نوع المركبة
    valid_vehicle_types = ["car", "motorcycle", "electric_scooter", "bicycle"]
    if docs.vehicle_type not in valid_vehicle_types:
        raise HTTPException(
            status_code=400, 
            detail="نوع المركبة غير صالح. الأنواع المتاحة: سيارة، دراجة نارية، سكوتر كهربائي، دراجة هوائية"
        )
    
    # المركبات التي تتطلب رخصة قيادة
    requires_license = ["car", "motorcycle"]
    
    if docs.vehicle_type in requires_license and not docs.motorcycle_license:
        vehicle_name = "السيارة" if docs.vehicle_type == "car" else "الدراجة النارية"
        raise HTTPException(
            status_code=400, 
            detail=f"رخصة القيادة مطلوبة لـ{vehicle_name}"
        )
    
    # ترجمة نوع المركبة للعرض
    vehicle_type_names = {
        "car": "سيارة",
        "motorcycle": "دراجة نارية",
        "electric_scooter": "سكوتر كهربائي",
        "bicycle": "دراجة هوائية"
    }
    
    doc = {
        "id": str(uuid.uuid4()),
        "delivery_id": user["id"],
        "driver_id": user["id"],  # للتوافق مع الكود القديم
        "national_id": docs.national_id,
        "personal_photo": docs.personal_photo,
        "id_photo": docs.id_photo,
        "vehicle_type": docs.vehicle_type,
        "vehicle_type_name": vehicle_type_names.get(docs.vehicle_type, docs.vehicle_type),
        "motorcycle_license": docs.motorcycle_license if docs.vehicle_type in requires_license else None,
        "vehicle_photo": docs.vehicle_photo,
        "requires_license": docs.vehicle_type in requires_license,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.delivery_documents.insert_one(doc)
    
    return {"message": "تم رفع المستندات بنجاح، سيتم مراجعتها قريباً"}

@delivery_auth_router.get("/documents/status")
async def get_delivery_documents_status(user: dict = Depends(get_current_user)):
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    doc = await db.delivery_documents.find_one({"delivery_id": user["id"]}, {"_id": 0})
    if not doc:
        return {"status": "not_submitted"}
    return {
        "status": doc["status"],
        "vehicle_type": doc.get("vehicle_type"),
        "vehicle_type_name": doc.get("vehicle_type_name"),
        "requires_license": doc.get("requires_license", True)
    }

@delivery_auth_router.get("/vehicle-types")
async def get_vehicle_types():
    """جلب أنواع المركبات المتاحة للتسجيل"""
    return {
        "vehicle_types": [
            {
                "id": "car",
                "name": "سيارة",
                "icon": "🚗",
                "requires_license": True,
                "description": "سيارة عادية أو فان"
            },
            {
                "id": "motorcycle",
                "name": "دراجة نارية",
                "icon": "🏍️",
                "requires_license": True,
                "description": "دراجة نارية بنزين"
            },
            {
                "id": "electric_scooter",
                "name": "سكوتر كهربائي",
                "icon": "🛵",
                "requires_license": False,
                "description": "دراجة كهربائية أو سكوتر"
            },
            {
                "id": "bicycle",
                "name": "دراجة هوائية",
                "icon": "🚲",
                "requires_license": False,
                "description": "دراجة هوائية عادية"
            }
        ]
    }


# ============================================
# 🏪 إعدادات المتجر للبائع
# ============================================

from pydantic import BaseModel
from typing import Optional, List

class StoreSettingsUpdate(BaseModel):
    store_name: Optional[str] = None
    store_description: Optional[str] = None
    store_address: Optional[str] = None
    store_city: Optional[str] = None
    store_phone: Optional[str] = None

class PaymentAccountUpdate(BaseModel):
    type: str  # shamcash, syriatel_cash, mtn_cash, bank_account
    account_number: str
    holder_name: str
    bank_name: Optional[str] = None
    is_default: bool = False

@router.get("/seller/store-settings")
async def get_store_settings(user: dict = Depends(get_current_user)):
    """جلب إعدادات المتجر للبائع"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    seller = await db.users.find_one(
        {"id": user["id"]},
        {"_id": 0, "store_name": 1, "store_description": 1, "store_address": 1, "store_city": 1, "store_phone": 1, "city": 1, "phone": 1}
    )
    
    return {
        "store_name": seller.get("store_name", ""),
        "store_description": seller.get("store_description", ""),
        "store_address": seller.get("store_address", ""),
        "store_city": seller.get("store_city", seller.get("city", "")),
        "store_phone": seller.get("store_phone", seller.get("phone", ""))
    }

@router.put("/seller/store-settings")
async def update_store_settings(settings: StoreSettingsUpdate, user: dict = Depends(get_current_user)):
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
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    return {"message": "تم تحديث إعدادات المتجر بنجاح"}

# ============================================
# 💳 حسابات الاستلام المالي للبائع
# ============================================

@router.get("/seller/payment-accounts")
async def get_seller_payment_accounts(user: dict = Depends(get_current_user)):
    """جلب حسابات الاستلام المالي للبائع"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    accounts = await db.seller_payment_accounts.find(
        {"seller_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    return accounts

@router.post("/seller/payment-accounts")
async def add_seller_payment_account(account: PaymentAccountUpdate, user: dict = Depends(get_current_user)):
    """إضافة حساب استلام مالي جديد للبائع"""
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    # التحقق من نوع الحساب
    valid_types = ["shamcash", "syriatel_cash", "mtn_cash", "bank_account"]
    if account.type not in valid_types:
        raise HTTPException(status_code=400, detail="نوع الحساب غير صالح")
    
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
async def update_seller_payment_account(account_id: str, account: PaymentAccountUpdate, user: dict = Depends(get_current_user)):
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
async def delete_seller_payment_account(account_id: str, user: dict = Depends(get_current_user)):
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
async def set_default_payment_account(account_id: str, user: dict = Depends(get_current_user)):
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
    vehicle_type: Optional[str] = None  # motorcycle, car, bicycle
    vehicle_number: Optional[str] = None
    working_city: Optional[str] = None
    working_hours: Optional[str] = None
    home_address: Optional[str] = None
    home_latitude: Optional[float] = None
    home_longitude: Optional[float] = None

@router.get("/delivery/settings")
async def get_delivery_settings(user: dict = Depends(get_current_user)):
    """جلب إعدادات موظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    delivery = await db.users.find_one(
        {"id": user["id"]},
        {"_id": 0, "vehicle_type": 1, "vehicle_number": 1, "working_city": 1, "working_hours": 1, "city": 1,
         "home_address": 1, "home_latitude": 1, "home_longitude": 1}
    )
    
    return {
        "vehicle_type": delivery.get("vehicle_type", "motorcycle"),
        "vehicle_number": delivery.get("vehicle_number", ""),
        "working_city": delivery.get("working_city", delivery.get("city", "دمشق")),
        "working_hours": delivery.get("working_hours", ""),
        "home_address": delivery.get("home_address", ""),
        "home_latitude": delivery.get("home_latitude"),
        "home_longitude": delivery.get("home_longitude")
    }

@router.put("/delivery/settings")
async def update_delivery_settings(settings: DeliverySettingsUpdate, user: dict = Depends(get_current_user)):
    """تحديث إعدادات موظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    update_data = {}
    if settings.vehicle_type is not None:
        update_data["vehicle_type"] = settings.vehicle_type
    if settings.vehicle_number is not None:
        update_data["vehicle_number"] = settings.vehicle_number
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
async def get_delivery_payment_accounts(user: dict = Depends(get_current_user)):
    """جلب حسابات الاستلام المالي لموظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    accounts = await db.delivery_payment_accounts.find(
        {"delivery_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    return accounts

@router.post("/delivery/payment-accounts")
async def add_delivery_payment_account(account: PaymentAccountUpdate, user: dict = Depends(get_current_user)):
    """إضافة حساب استلام مالي جديد لموظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    valid_types = ["shamcash", "syriatel_cash", "mtn_cash", "bank_account"]
    if account.type not in valid_types:
        raise HTTPException(status_code=400, detail="نوع الحساب غير صالح")
    
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
async def update_delivery_payment_account(account_id: str, account: PaymentAccountUpdate, user: dict = Depends(get_current_user)):
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
async def delete_delivery_payment_account(account_id: str, user: dict = Depends(get_current_user)):
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
async def set_default_delivery_payment_account(account_id: str, user: dict = Depends(get_current_user)):
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

def generate_reset_token():
    """توليد رمز إعادة تعيين كلمة المرور"""
    return ''.join(random.choices(string.ascii_letters + string.digits, k=32))


def generate_sms_code():
    """توليد كود SMS من 6 أرقام"""
    return ''.join(random.choices(string.digits, k=6))


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
async def send_sms_code(request: Request, data: ForgotPasswordRequest):
    """
    إرسال كود التحقق عبر SMS
    """
    client_ip = get_remote_address(request)
    
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
    result = await send_sms(data.phone, message)
    
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
async def verify_sms_code(request: Request):
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
async def forgot_password(request: Request, data: ForgotPasswordRequest):
    """
    الخطوة الأولى: التحقق من وجود رقم الهاتف
    """
    client_ip = get_remote_address(request)
    
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
async def verify_identity(request: Request, data: VerifyIdentityRequest):
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
async def reset_password(request: Request, data: ResetPasswordRequest):
    """
    الخطوة الثالثة: إعادة تعيين كلمة المرور
    """
    client_ip = get_remote_address(request)
    
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
async def change_password(request: Request, data: ChangePasswordRequest, user: dict = Depends(get_current_user)):
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
async def update_emergency_phone(request: Request, user: dict = Depends(get_current_user)):
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
async def get_emergency_phone(user: dict = Depends(get_current_user)):
    """جلب رقم الطوارئ للمستخدم"""
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0, "emergency_phone": 1})
    return {"emergency_phone": user_data.get("emergency_phone", "")}



# === Admin: تشخيص مشاكل تسجيل الدخول ===
@router.get("/admin/user-auth-status/{phone}")
async def get_user_auth_status(phone: str, admin: dict = Depends(get_current_user)):
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
async def admin_reset_user_password(phone: str, admin: dict = Depends(get_current_user)):
    """إعادة تعيين كلمة مرور مستخدم للقيمة الافتراضية - للأدمن فقط"""
    if admin.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    user = await db.users.find_one({"phone": phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    # كلمة مرور افتراضية
    default_password = "test1234"
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
