# /app/backend/core/auth_cookies.py
# نظام المصادقة عبر httpOnly Cookies
# أكثر أماناً من localStorage - يحمي من هجمات XSS

from fastapi import Request, Response
from fastapi.responses import JSONResponse
import os

# إعدادات Cookie
COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", None)  # None = current domain
COOKIE_SECURE = True  # HTTPS فقط - مطلوب مع SameSite=none
COOKIE_SAMESITE = "none"  # none للسماح بـ cross-site requests (CORS)
ACCESS_TOKEN_EXPIRE_DAYS = 7
REFRESH_TOKEN_EXPIRE_DAYS = 30


def set_auth_cookies(response: Response, access_token: str, refresh_token: str = None):
    """
    تعيين cookies المصادقة
    httpOnly = True يمنع JavaScript من الوصول للـ cookie
    """
    # Access Token Cookie
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,  # 🔒 الأهم: يمنع JavaScript من قراءة الـ cookie
        secure=COOKIE_SECURE,  # HTTPS فقط في الإنتاج
        samesite=COOKIE_SAMESITE,
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # 7 أيام
        path="/",
        domain=COOKIE_DOMAIN
    )
    
    # Refresh Token Cookie (إذا موجود)
    if refresh_token:
        response.set_cookie(
            key=REFRESH_COOKIE_NAME,
            value=refresh_token,
            httponly=True,
            secure=COOKIE_SECURE,
            samesite=COOKIE_SAMESITE,
            max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # 30 يوم
            path="/api/auth/refresh",  # فقط لـ refresh endpoint
            domain=COOKIE_DOMAIN
        )


def clear_auth_cookies(response: Response):
    """
    مسح cookies المصادقة عند تسجيل الخروج
    يجب استخدام نفس الإعدادات المستخدمة عند إنشاء الكوكيز
    """
    # مسح access token
    response.set_cookie(
        key=COOKIE_NAME,
        value="",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=0,  # تنتهي فوراً
        expires=0,
        path="/",
        domain=COOKIE_DOMAIN
    )
    # مسح refresh token
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value="",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=0,
        expires=0,
        path="/api/auth/refresh",
        domain=COOKIE_DOMAIN
    )


def get_token_from_request(request: Request) -> str | None:
    """
    استخراج Token من الطلب
    يبحث في:
    1. Cookie أولاً (الطريقة الجديدة الآمنة)
    2. Authorization header (للتوافق مع الطلبات القديمة)
    """
    # 1. محاولة قراءة من Cookie
    token = request.cookies.get(COOKIE_NAME)
    if token:
        return token
    
    # 2. محاولة قراءة من Authorization header (للتوافق)
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    
    return None


class AuthCookieResponse(JSONResponse):
    """
    Response مخصص يضيف cookies المصادقة تلقائياً
    """
    def __init__(
        self,
        content: dict,
        access_token: str = None,
        refresh_token: str = None,
        status_code: int = 200,
        **kwargs
    ):
        super().__init__(content=content, status_code=status_code, **kwargs)
        
        if access_token:
            set_auth_cookies(self, access_token, refresh_token)
