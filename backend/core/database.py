# /app/backend/core/database.py
# إعداد قاعدة البيانات والمصادقة

from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import jwt
import hashlib
import uuid
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'trend-syria-secret-key-2024')
ALGORITHM = "HS256"

security = HTTPBearer(auto_error=False)

# ============== Helper Functions ==============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, user_type: str) -> str:
    payload = {
        "user_id": user_id,
        "user_type": user_type,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="غير مصرح - يجب تسجيل الدخول")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة")
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
    except:
        return None

# ============== Notification Helpers ==============

async def create_notification_for_user(user_id: str, title: str, message: str, notification_type: str = "order", order_id: str = None, product_id: str = None):
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
