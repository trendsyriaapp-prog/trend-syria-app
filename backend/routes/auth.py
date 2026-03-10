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
