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
    sanitize_input,
    log_suspicious_activity,
    create_access_token,
    create_refresh_token,
    decode_token,
    should_refresh_token,
    limiter
)
from models.schemas import UserRegister, UserLogin, SellerDocuments, DeliveryDocuments
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
        "is_verified": user.user_type == "buyer",
        "is_approved": user.user_type == "buyer",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
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
@limiter.limit("5/minute")
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
    
    return {
        "token": access_token,
        "refresh_token": refresh_token,
        "user": {
            "id": user["id"],
            "name": user.get("full_name", user.get("name", "")),
            "full_name": user.get("full_name", user.get("name", "")),
            "phone": user["phone"],
            "user_type": user["user_type"],
            "is_approved": user.get("is_approved", False)
        }
    }

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

# ============== Seller Routes ==============

seller_router = APIRouter(prefix="/seller", tags=["Seller"])

@seller_router.post("/documents")
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

@seller_router.get("/documents/status")
async def get_documents_status(user: dict = Depends(get_current_user)):
    doc = await db.seller_documents.find_one({"seller_id": user["id"]}, {"_id": 0})
    if not doc:
        return {"status": "not_submitted"}
    return {"status": doc["status"], "business_name": doc.get("business_name")}

# ============== Delivery Routes ==============

delivery_auth_router = APIRouter(prefix="/delivery", tags=["Delivery Auth"])

@delivery_auth_router.post("/documents")
async def upload_delivery_documents(docs: DeliveryDocuments, user: dict = Depends(get_current_user)):
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    existing = await db.delivery_documents.find_one({"delivery_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="تم رفع المستندات مسبقاً")
    
    doc = {
        "id": str(uuid.uuid4()),
        "delivery_id": user["id"],
        "national_id": docs.national_id,
        "personal_photo": docs.personal_photo,
        "id_photo": docs.id_photo,
        "motorcycle_license": docs.motorcycle_license,
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
    return {"status": doc["status"]}


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

@router.get("/delivery/settings")
async def get_delivery_settings(user: dict = Depends(get_current_user)):
    """جلب إعدادات موظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    delivery = await db.users.find_one(
        {"id": user["id"]},
        {"_id": 0, "vehicle_type": 1, "vehicle_number": 1, "working_city": 1, "working_hours": 1, "city": 1}
    )
    
    return {
        "vehicle_type": delivery.get("vehicle_type", "motorcycle"),
        "vehicle_number": delivery.get("vehicle_number", ""),
        "working_city": delivery.get("working_city", delivery.get("city", "دمشق")),
        "working_hours": delivery.get("working_hours", "")
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

