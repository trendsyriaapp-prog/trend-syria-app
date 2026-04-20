# /app/backend/core/rate_limiter.py
# نظام Rate Limiting متقدم مع تتبع وإحصائيات

import time
import logging
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Request, HTTPException
from functools import wraps

logger = logging.getLogger(__name__)

# ============== إعدادات Rate Limiting ==============

RATE_LIMITS = {
    # المصادقة - حدود صارمة
    "/api/auth/login": {"requests": 5, "window": 60, "block_duration": 300},
    "/api/auth/send-otp": {"requests": 3, "window": 300, "block_duration": 600},
    "/api/auth/verify-otp": {"requests": 5, "window": 60, "block_duration": 300},
    "/api/auth/register": {"requests": 3, "window": 300, "block_duration": 600},
    
    # الطلبات والدفع - حدود متوسطة
    "/api/orders": {"requests": 10, "window": 60, "block_duration": 120},
    "/api/payment": {"requests": 10, "window": 60, "block_duration": 120},
    "/api/food/orders": {"requests": 15, "window": 60, "block_duration": 120},
    
    # التصفح - حدود مرنة
    "/api/products": {"requests": 60, "window": 60, "block_duration": 60},
    "/api/food/stores": {"requests": 60, "window": 60, "block_duration": 60},
    "/api/categories": {"requests": 30, "window": 60, "block_duration": 60},
    
    # الإدارة - حدود خاصة
    "/api/admin": {"requests": 100, "window": 60, "block_duration": 60},
    
    # افتراضي لأي endpoint آخر
    "default": {"requests": 100, "window": 60, "block_duration": 60}
}


class RateLimiter:
    """نظام Rate Limiting مع تتبع وإحصائيات"""
    
    def __init__(self):
        # تخزين عدد الطلبات لكل IP/endpoint
        self._requests = defaultdict(list)
        # تخزين IPs المحظورة مؤقتاً
        self._blocked = {}
        # إحصائيات
        self._stats = {
            "total_requests": 0,
            "blocked_requests": 0,
            "requests_by_endpoint": defaultdict(int),
            "requests_by_hour": defaultdict(int),
            "blocked_ips": defaultdict(int),
            "blocked_log": []
        }
        # بدء التشغيل
        self._start_time = datetime.now(timezone.utc)
    
    def _get_client_ip(self, request: Request) -> str:
        """استخراج IP العميل"""
        # التحقق من headers للـ proxy
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _get_endpoint_key(self, path: str) -> str:
        """تحديد مفتاح الـ endpoint للحدود"""
        # البحث عن تطابق دقيق أو جزئي
        for endpoint in RATE_LIMITS:
            if endpoint != "default" and path.startswith(endpoint):
                return endpoint
        return "default"
    
    def _get_limits(self, endpoint_key: str) -> dict:
        """جلب حدود الـ endpoint"""
        return RATE_LIMITS.get(endpoint_key, RATE_LIMITS["default"])
    
    def _clean_old_requests(self, key: str, window: int):
        """تنظيف الطلبات القديمة"""
        now = time.time()
        self._requests[key] = [
            t for t in self._requests[key] 
            if now - t < window
        ]
    
    def _is_blocked(self, ip: str) -> tuple[bool, int]:
        """التحقق إذا كان IP محظور"""
        if ip in self._blocked:
            block_until = self._blocked[ip]
            if time.time() < block_until:
                remaining = int(block_until - time.time())
                return True, remaining
            else:
                # انتهى الحظر
                del self._blocked[ip]
        return False, 0
    
    def _block_ip(self, ip: str, duration: int, reason: str):
        """حظر IP مؤقتاً"""
        self._blocked[ip] = time.time() + duration
        self._stats["blocked_ips"][ip] += 1
        
        # تسجيل في السجل
        log_entry = {
            "ip": ip,
            "reason": reason,
            "blocked_at": datetime.now(timezone.utc).isoformat(),
            "duration_seconds": duration
        }
        self._stats["blocked_log"].append(log_entry)
        
        # الاحتفاظ بآخر 1000 سجل فقط
        if len(self._stats["blocked_log"]) > 1000:
            self._stats["blocked_log"] = self._stats["blocked_log"][-1000:]
        
        logger.warning(f"🚫 IP blocked: {ip} for {duration}s - {reason}")
    
    def check_rate_limit(self, request: Request) -> tuple[bool, Optional[str]]:
        """
        فحص Rate Limit للطلب
        
        Returns:
            (allowed: bool, error_message: Optional[str])
        """
        ip = self._get_client_ip(request)
        path = request.url.path
        endpoint_key = self._get_endpoint_key(path)
        limits = self._get_limits(endpoint_key)
        
        # تحديث الإحصائيات
        self._stats["total_requests"] += 1
        self._stats["requests_by_endpoint"][endpoint_key] += 1
        hour_key = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:00")
        self._stats["requests_by_hour"][hour_key] += 1
        
        # التحقق من الحظر
        is_blocked, remaining = self._is_blocked(ip)
        if is_blocked:
            self._stats["blocked_requests"] += 1
            return False, f"تم حظرك مؤقتاً. حاول بعد {remaining} ثانية"
        
        # فحص Rate Limit
        key = f"{ip}:{endpoint_key}"
        self._clean_old_requests(key, limits["window"])
        
        request_count = len(self._requests[key])
        
        if request_count >= limits["requests"]:
            # تجاوز الحد - حظر مؤقت
            self._block_ip(
                ip, 
                limits["block_duration"],
                f"تجاوز الحد في {endpoint_key}: {request_count}/{limits['requests']} طلب"
            )
            self._stats["blocked_requests"] += 1
            return False, f"تجاوزت الحد المسموح ({limits['requests']} طلب/{limits['window']} ثانية)"
        
        # تسجيل الطلب
        self._requests[key].append(time.time())
        return True, None
    
    def get_stats(self) -> dict:
        """جلب الإحصائيات"""
        now = datetime.now(timezone.utc)
        uptime = (now - self._start_time).total_seconds()
        
        # آخر 24 ساعة من الطلبات/ساعة
        last_24h = {}
        for i in range(24):
            hour = (now - timedelta(hours=i)).strftime("%Y-%m-%d %H:00")
            last_24h[hour] = self._stats["requests_by_hour"].get(hour, 0)
        
        # أكثر endpoints استخداماً
        top_endpoints = sorted(
            self._stats["requests_by_endpoint"].items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        # أكثر IPs محظورة
        top_blocked_ips = sorted(
            self._stats["blocked_ips"].items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return {
            "uptime_seconds": int(uptime),
            "uptime_formatted": self._format_uptime(uptime),
            "total_requests": self._stats["total_requests"],
            "blocked_requests": self._stats["blocked_requests"],
            "block_rate": round(
                (self._stats["blocked_requests"] / max(1, self._stats["total_requests"])) * 100, 2
            ),
            "currently_blocked_ips": len(self._blocked),
            "requests_by_hour": dict(sorted(last_24h.items())),
            "top_endpoints": [{"endpoint": e, "count": c} for e, c in top_endpoints],
            "top_blocked_ips": [{"ip": ip, "count": c} for ip, c in top_blocked_ips],
            "recent_blocks": self._stats["blocked_log"][-20:][::-1],  # آخر 20 حظر
            "rate_limits_config": RATE_LIMITS
        }
    
    def _format_uptime(self, seconds: float) -> str:
        """تنسيق وقت التشغيل"""
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        
        parts = []
        if days > 0:
            parts.append(f"{days} يوم")
        if hours > 0:
            parts.append(f"{hours} ساعة")
        if minutes > 0:
            parts.append(f"{minutes} دقيقة")
        
        return " و ".join(parts) if parts else "أقل من دقيقة"
    
    def get_blocked_ips(self) -> list:
        """جلب قائمة IPs المحظورة حالياً"""
        now = time.time()
        blocked_list = []
        
        for ip, block_until in list(self._blocked.items()):
            if now < block_until:
                blocked_list.append({
                    "ip": ip,
                    "remaining_seconds": int(block_until - now),
                    "block_count": self._stats["blocked_ips"].get(ip, 1)
                })
            else:
                del self._blocked[ip]
        
        return sorted(blocked_list, key=lambda x: x["remaining_seconds"], reverse=True)
    
    def unblock_ip(self, ip: str) -> bool:
        """إلغاء حظر IP يدوياً"""
        if ip in self._blocked:
            del self._blocked[ip]
            logger.info(f"✅ IP unblocked manually: {ip}")
            return True
        return False
    
    def clear_stats(self):
        """مسح الإحصائيات"""
        self._stats = {
            "total_requests": 0,
            "blocked_requests": 0,
            "requests_by_endpoint": defaultdict(int),
            "requests_by_hour": defaultdict(int),
            "blocked_ips": defaultdict(int),
            "blocked_log": []
        }
        logger.info("📊 Rate limiter stats cleared")


# إنشاء instance واحد
rate_limiter = RateLimiter()


# ============== Middleware ==============

async def rate_limit_middleware(request: Request, call_next):
    """Middleware للتحقق من Rate Limit"""
    
    # تجاوز للمسارات الثابتة والـ health check
    skip_paths = ["/health", "/api/health", "/docs", "/openapi.json", "/favicon.ico"]
    if any(request.url.path.startswith(p) for p in skip_paths):
        return await call_next(request)
    
    # فحص Rate Limit
    allowed, error_message = rate_limiter.check_rate_limit(request)
    
    if not allowed:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=429,
            content={
                "detail": error_message,
                "error_code": "RATE_LIMIT_EXCEEDED"
            },
            headers={
                "Retry-After": "60",
                "X-RateLimit-Limit": "varies",
                "X-RateLimit-Remaining": "0"
            }
        )
    
    return await call_next(request)


# ============== Decorator للـ Routes ==============

def rate_limit(requests: int = 10, window: int = 60):
    """
    Decorator لتطبيق rate limit مخصص على route معين
    
    Usage:
        @rate_limit(requests=5, window=60)
        async def my_endpoint():
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # البحث عن Request في الـ arguments
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if request:
                ip = rate_limiter._get_client_ip(request)
                key = f"{ip}:{func.__name__}"
                
                rate_limiter._clean_old_requests(key, window)
                
                if len(rate_limiter._requests[key]) >= requests:
                    raise HTTPException(
                        status_code=429,
                        detail=f"تجاوزت الحد المسموح ({requests} طلب/{window} ثانية)"
                    )
                
                rate_limiter._requests[key].append(time.time())
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
