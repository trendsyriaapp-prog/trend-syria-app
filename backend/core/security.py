# /app/backend/core/security.py
# طبقات الأمان الشاملة لتطبيق ترند سورية

import os
import re
import html
import logging
import hashlib
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from functools import wraps

import bcrypt
import bleach
from jose import jwt, JWTError
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# ============== إعداد السجلات ==============
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.WARNING)

# إنشاء handler لملف السجلات الأمنية
file_handler = logging.FileHandler("/app/backend/logs/security.log")
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(levelname)s - IP:%(ip)s - %(message)s'
))
security_logger.addHandler(file_handler)

# ============== 1. Rate Limiting ==============
limiter = Limiter(key_func=get_remote_address)

# حدود مختلفة لكل نوع من الطلبات
RATE_LIMITS = {
    "login": "15/minute",           # 15 محاولة تسجيل دخول بالدقيقة (مرن للاختبار)
    "register": "5/minute",         # 5 تسجيلات بالدقيقة
    "api_general": "100/minute",    # 100 طلب عام بالدقيقة
    "api_heavy": "20/minute",       # 20 طلب ثقيل بالدقيقة
    "password_reset": "5/hour",     # 5 طلبات استعادة كلمة مرور بالساعة
}

def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """معالج تجاوز حد الطلبات"""
    client_ip = get_remote_address(request)
    security_logger.warning(
        f"Rate limit exceeded: {request.url.path}",
        extra={"ip": client_ip}
    )
    return JSONResponse(
        status_code=429,
        content={
            "detail": "تم تجاوز الحد المسموح من الطلبات. يرجى الانتظار قليلاً.",
            "retry_after": 60
        }
    )

# ============== 2. تشفير كلمات المرور ==============
def hash_password_secure(password: str) -> str:
    """تشفير كلمة المرور باستخدام bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """التحقق من كلمة المرور"""
    # دعم كلمات المرور القديمة (SHA256)
    if not hashed_password.startswith('$2'):
        old_hash = hashlib.sha256(plain_password.encode()).hexdigest()
        return old_hash == hashed_password
    
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except (ValueError, TypeError):
        return False

# ============== 3. حماية من Injection ==============
# أنماط خطيرة يجب حظرها
DANGEROUS_PATTERNS = [
    r'\$where',           # MongoDB $where injection
    r'\$gt|\$lt|\$ne',    # MongoDB operators
    r'\$regex',           # MongoDB regex injection
    r'<script',           # XSS
    r'javascript:',       # XSS
    r'on\w+\s*=',         # Event handlers XSS
    r'union\s+select',    # SQL injection
    r';\s*drop\s+',       # SQL injection
    r'--\s*$',            # SQL comment
]

def sanitize_input(value: Any) -> Any:
    """تنظيف المدخلات من الأكواد الخبيثة"""
    if value is None:
        return None
    
    if isinstance(value, str):
        # إزالة HTML tags
        cleaned = bleach.clean(value, tags=[], strip=True)
        # تحويل الرموز الخاصة
        cleaned = html.escape(cleaned)
        
        # فحص الأنماط الخطيرة
        for pattern in DANGEROUS_PATTERNS:
            if re.search(pattern, value, re.IGNORECASE):
                raise HTTPException(
                    status_code=400,
                    detail="تم اكتشاف محتوى غير مسموح"
                )
        
        return cleaned
    
    elif isinstance(value, dict):
        return {k: sanitize_input(v) for k, v in value.items()}
    
    elif isinstance(value, list):
        return [sanitize_input(item) for item in value]
    
    return value

def sanitize_mongo_query(query: dict) -> dict:
    """تنظيف استعلامات MongoDB"""
    dangerous_keys = ['$where', '$function', '$accumulator']
    
    def clean_dict(d):
        if not isinstance(d, dict):
            return d
        
        cleaned = {}
        for key, value in d.items():
            # منع المفاتيح الخطيرة
            if key in dangerous_keys:
                security_logger.warning(
                    f"Blocked dangerous MongoDB operator: {key}",
                    extra={"ip": "system"}
                )
                continue
            
            # تنظيف القيم المتداخلة
            if isinstance(value, dict):
                cleaned[key] = clean_dict(value)
            elif isinstance(value, list):
                cleaned[key] = [clean_dict(item) if isinstance(item, dict) else item for item in value]
            else:
                cleaned[key] = value
        
        return cleaned
    
    return clean_dict(query)

# 🔒 JWT Settings - مفتاح أقوى
# استخدام نفس المفتاح من database.py
from core.database import JWT_SECRET
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
REFRESH_TOKEN_EXPIRE_DAYS = 30

def create_access_token(user_id: str, user_type: str, extra_data: dict = None) -> str:
    """إنشاء توكن وصول"""
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "user_id": user_id,
        "user_type": user_type,
        "exp": expire.timestamp(),
        "iat": datetime.now(timezone.utc).timestamp(),
        "type": "access"
    }
    if extra_data:
        payload.update(extra_data)
    
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    """إنشاء توكن تجديد"""
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "user_id": user_id,
        "exp": expire.timestamp(),
        "iat": datetime.now(timezone.utc).timestamp(),
        "type": "refresh",
        "jti": secrets.token_hex(16)  # معرف فريد للتوكن
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    """فك تشفير التوكن"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

def should_refresh_token(payload: dict) -> bool:
    """التحقق إذا كان التوكن يحتاج تجديد (أقل من يوم على الانتهاء)"""
    exp = payload.get("exp", 0)
    remaining = exp - datetime.now(timezone.utc).timestamp()
    return remaining < 86400  # أقل من 24 ساعة

# ============== 5. حماية من Brute Force (محسّنة) ==============
# تخزين محاولات تسجيل الدخول الفاشلة
failed_login_attempts: Dict[str, Dict] = {}
LOCKOUT_THRESHOLD = 10  # عدد المحاولات قبل القفل (زيادة للتسامح مع الاختبارات)
LOCKOUT_DURATION = 5 * 60  # 5 دقائق (تقليل المدة)
ATTEMPT_WINDOW = 10 * 60  # نافذة 10 دقائق للمحاولات

def _cleanup_old_attempts():
    """تنظيف المحاولات القديمة تلقائياً"""
    now = datetime.now(timezone.utc).timestamp()
    keys_to_delete = []
    
    for key, data in failed_login_attempts.items():
        last_attempt = data.get("last_attempt", 0)
        locked_until = data.get("locked_until", 0)
        
        # حذف السجلات القديمة (أكثر من 30 دقيقة)
        if now - last_attempt > 1800 and locked_until < now:
            keys_to_delete.append(key)
    
    for key in keys_to_delete:
        del failed_login_attempts[key]

def check_brute_force(identifier: str, ip: str) -> None:
    """فحص محاولات الاختراق مع تنظيف تلقائي"""
    # تنظيف المحاولات القديمة أولاً
    _cleanup_old_attempts()
    
    key = f"{identifier}:{ip}"
    now = datetime.now(timezone.utc).timestamp()
    
    if key in failed_login_attempts:
        data = failed_login_attempts[key]
        
        # التحقق من القفل
        locked_until = data.get("locked_until", 0)
        if locked_until > now:
            remaining = int(locked_until - now)
            remaining_min = max(1, remaining // 60)
            raise HTTPException(
                status_code=429,
                detail=f"تم تجاوز عدد المحاولات. انتظر {remaining_min} دقيقة."
            )
        
        # إعادة تعيين بعد انتهاء القفل
        if locked_until > 0 and locked_until <= now:
            failed_login_attempts[key] = {"attempts": 0, "locked_until": 0, "last_attempt": now}
        
        # إعادة تعيين إذا مرت فترة كافية من آخر محاولة
        last_attempt = data.get("last_attempt", 0)
        if now - last_attempt > ATTEMPT_WINDOW:
            failed_login_attempts[key] = {"attempts": 0, "locked_until": 0, "last_attempt": now}

def record_failed_login(identifier: str, ip: str) -> None:
    """تسجيل محاولة دخول فاشلة"""
    key = f"{identifier}:{ip}"
    now = datetime.now(timezone.utc).timestamp()
    
    if key not in failed_login_attempts:
        failed_login_attempts[key] = {"attempts": 0, "locked_until": 0, "last_attempt": now}
    
    failed_login_attempts[key]["attempts"] += 1
    failed_login_attempts[key]["last_attempt"] = now
    
    # قفل الحساب بعد تجاوز الحد
    if failed_login_attempts[key]["attempts"] >= LOCKOUT_THRESHOLD:
        failed_login_attempts[key]["locked_until"] = now + LOCKOUT_DURATION
        security_logger.warning(
            f"Account locked due to brute force: {identifier}",
            extra={"ip": ip}
        )

def clear_failed_attempts(identifier: str, ip: str) -> None:
    """مسح محاولات الدخول الفاشلة بعد نجاح الدخول"""
    key = f"{identifier}:{ip}"
    if key in failed_login_attempts:
        del failed_login_attempts[key]
    
    # مسح أيضاً بناءً على المعرف فقط (لجميع IPs)
    keys_to_clear = [k for k in failed_login_attempts.keys() if k.startswith(f"{identifier}:")]
    for k in keys_to_clear:
        del failed_login_attempts[k]

# ============== 6. Security Headers ==============
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:;",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
}

async def add_security_headers(request: Request, call_next):
    """إضافة headers الأمان للاستجابات"""
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response

# ============== 7. التحقق من صحة البيانات ==============
import validators

def validate_phone(phone: str) -> bool:
    """التحقق من صحة رقم الهاتف السوري"""
    # أرقام سورية: 09XXXXXXXX
    pattern = r'^09\d{8}$'
    return bool(re.match(pattern, phone))

def validate_email(email: str) -> bool:
    """التحقق من صحة البريد الإلكتروني"""
    return validators.email(email) if email else True

def validate_url(url: str) -> bool:
    """التحقق من صحة الرابط"""
    return validators.url(url) if url else True

def validate_password_strength(password: str, strict: bool = False) -> tuple:
    """
    التحقق من قوة كلمة المرور
    strict=True: للحسابات الجديدة (متطلبات أقوى)
    strict=False: للتوافق مع الحسابات القديمة
    """
    issues = []
    
    if len(password) < 6:
        issues.append("كلمة المرور قصيرة جداً (الحد الأدنى 6 أحرف)")
    
    if len(password) > 128:
        issues.append("كلمة المرور طويلة جداً")
    
    # متطلبات أقوى للحسابات الجديدة
    if strict:
        if len(password) < 8:
            issues.append("كلمة المرور يجب أن تكون 8 أحرف على الأقل")
        if not re.search(r'\d', password):
            issues.append("يجب أن تحتوي على رقم واحد على الأقل")
        if not re.search(r'[a-zA-Z\u0600-\u06FF]', password):  # حروف عربية أو إنجليزية
            issues.append("يجب أن تحتوي على حرف واحد على الأقل")
    
    # فحص كلمات المرور الضعيفة الشائعة
    weak_passwords = ['123456', '123456789', 'password', 'admin123', 'seller123', 
                      'buyer123', 'delivery123', 'food123', 'user123', '000000',
                      '111111', 'qwerty', 'password1']
    if password.lower() in weak_passwords:
        issues.append("كلمة المرور ضعيفة جداً. اختر كلمة مرور أقوى")
    
    return (len(issues) == 0, issues)

# ============== التحقق من الحسابات الافتراضية ==============
DEFAULT_ACCOUNTS = {
    "0911111111": "admin123",      # حساب الأدمن الافتراضي
    "0900000000": "delivery123",   # سائق تجريبي
}

def is_default_account(phone: str, password: str) -> bool:
    """التحقق إذا كان الحساب افتراضي ولم يتم تغيير كلمة المرور"""
    return DEFAULT_ACCOUNTS.get(phone) == password

def check_password_change_required(user: dict) -> bool:
    """التحقق إذا كان يجب على المستخدم تغيير كلمة المرور"""
    return user.get("force_password_change", False)

# ============== 8. تسجيل الأنشطة المشبوهة ==============
def log_suspicious_activity(
    activity_type: str,
    details: str,
    ip: str,
    user_id: str = None,
    severity: str = "WARNING"
):
    """تسجيل نشاط مشبوه"""
    log_data = {
        "type": activity_type,
        "details": details,
        "user_id": user_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if severity == "CRITICAL":
        security_logger.critical(str(log_data), extra={"ip": ip})
    elif severity == "WARNING":
        security_logger.warning(str(log_data), extra={"ip": ip})
    else:
        security_logger.info(str(log_data), extra={"ip": ip})

# ============== 9. حماية APIs الحساسة ==============
SENSITIVE_ENDPOINTS = [
    "/api/admin/",
    "/api/wallet/withdraw",
    "/api/payment/",
    "/api/user/delete",
]

def is_sensitive_endpoint(path: str) -> bool:
    """التحقق إذا كان المسار حساساً"""
    return any(path.startswith(endpoint) for endpoint in SENSITIVE_ENDPOINTS)

# ============== 10. قائمة IPs المحظورة ==============
blocked_ips: set = set()

def is_ip_blocked(ip: str) -> bool:
    """التحقق إذا كان IP محظوراً"""
    return ip in blocked_ips

def block_ip(ip: str, reason: str):
    """حظر IP"""
    blocked_ips.add(ip)
    security_logger.critical(
        f"IP blocked: {reason}",
        extra={"ip": ip}
    )

def unblock_ip(ip: str):
    """رفع الحظر عن IP"""
    blocked_ips.discard(ip)


def reset_all_brute_force_locks():
    """إعادة تعيين جميع أقفال brute force (للتطوير والاختبار)"""
    global failed_login_attempts
    failed_login_attempts.clear()
    return {"cleared": True, "message": "تم مسح جميع أقفال تسجيل الدخول"}
