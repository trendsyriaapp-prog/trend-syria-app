# /app/backend/core/database.py
# إعداد قاعدة البيانات والمصادقة
# 🔒 محمي بنظام JWT محسّن مع تجديد تلقائي

from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt
import hashlib
import secrets
import uuid
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'trend_syria')]

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
