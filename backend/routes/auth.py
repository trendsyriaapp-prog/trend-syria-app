# /app/backend/routes/auth.py
# مسارات المصادقة وتسجيل الدخول

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
import hashlib
import bcrypt

from core.database import db, get_current_user, create_token, hash_password
from models.schemas import UserRegister, UserLogin, SellerDocuments, DeliveryDocuments

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register")
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

@router.post("/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"phone": credentials.phone}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="رقم الهاتف أو كلمة المرور غير صحيحة")
    
    stored_password = user["password"]
    password_valid = False
    
    if stored_password.startswith("$2"):
        try:
            password_valid = bcrypt.checkpw(credentials.password.encode(), stored_password.encode())
        except (ValueError, TypeError):
            password_valid = False
    else:
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

@router.get("/me")
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
