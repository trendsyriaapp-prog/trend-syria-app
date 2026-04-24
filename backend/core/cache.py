# /app/backend/core/cache.py
# نظام التخزين المؤقت باستخدام Redis أو Memory Fallback

import os
import json
import logging
from typing import Optional, Any
import asyncio
from functools import wraps

logger = logging.getLogger(__name__)

# ============== إعدادات Redis ==============
REDIS_URL = os.environ.get("REDIS_URL", None)
CACHE_ENABLED = os.environ.get("CACHE_ENABLED", "true").lower() == "true"

# TTL الافتراضي للتخزين المؤقت (بالثواني)
DEFAULT_TTL = 300  # 5 دقائق
SETTINGS_TTL = 3600  # ساعة للإعدادات
CATEGORIES_TTL = 1800  # 30 دقيقة للفئات
PRODUCTS_TTL = 300  # 5 دقائق للمنتجات
USER_TTL = 600  # 10 دقائق للمستخدمين
HOMEPAGE_TTL = 180  # 3 دقائق للصفحة الرئيسية
FOOD_STORES_TTL = 300  # 5 دقائق لمتاجر الطعام
BUSINESS_CATEGORIES_TTL = 3600  # ساعة للأصناف التجارية


class MemoryCache:
    """تخزين مؤقت في الذاكرة (fallback عند عدم توفر Redis)"""
    
    def __init__(self):
        self._cache = {}
        self._expiry = {}
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[str]:
        async with self._lock:
            if key in self._cache:
                import time
                if self._expiry.get(key, 0) > time.time():
                    return self._cache[key]
                else:
                    # انتهت الصلاحية
                    del self._cache[key]
                    del self._expiry[key]
            return None
    
    async def set(self, key: str, value: str, ex: int = DEFAULT_TTL) -> bool:
        async with self._lock:
            import time
            self._cache[key] = value
            self._expiry[key] = time.time() + ex
            return True
    
    async def delete(self, key: str) -> bool:
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
                del self._expiry[key]
            return True
    
    async def exists(self, key: str) -> bool:
        return await self.get(key) is not None
    
    async def clear_pattern(self, pattern: str) -> int:
        """حذف جميع المفاتيح التي تطابق النمط"""
        async with self._lock:
            import fnmatch
            keys_to_delete = [k for k in self._cache.keys() if fnmatch.fnmatch(k, pattern)]
            for key in keys_to_delete:
                del self._cache[key]
                del self._expiry[key]
            return len(keys_to_delete)


class RedisCache:
    """تخزين مؤقت باستخدام Redis"""
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self._redis = None
    
    async def _get_redis(self):
        if self._redis is None:
            try:
                import aioredis
                self._redis = await aioredis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True
                )
                logger.info("✅ Redis connected successfully")
            except Exception as e:
                logger.warning(f"⚠️ Redis connection failed: {e}")
                return None
        return self._redis
    
    async def get(self, key: str) -> Optional[str]:
        try:
            redis = await self._get_redis()
            if redis:
                return await redis.get(key)
        except Exception as e:
            logger.warning(f"Redis GET error: {e}")
        return None
    
    async def set(self, key: str, value: str, ex: int = DEFAULT_TTL) -> bool:
        try:
            redis = await self._get_redis()
            if redis:
                await redis.set(key, value, ex=ex)
                return True
        except Exception as e:
            logger.warning(f"Redis SET error: {e}")
        return False
    
    async def delete(self, key: str) -> bool:
        try:
            redis = await self._get_redis()
            if redis:
                await redis.delete(key)
                return True
        except Exception as e:
            logger.warning(f"Redis DELETE error: {e}")
        return False
    
    async def exists(self, key: str) -> bool:
        try:
            redis = await self._get_redis()
            if redis:
                return await redis.exists(key) > 0
        except Exception as e:
            logger.warning(f"Redis EXISTS error: {e}")
        return False
    
    async def clear_pattern(self, pattern: str) -> int:
        try:
            redis = await self._get_redis()
            if redis:
                keys = await redis.keys(pattern)
                if keys:
                    await redis.delete(*keys)
                return len(keys) if keys else 0
        except Exception as e:
            logger.warning(f"Redis CLEAR_PATTERN error: {e}")
        return 0


# ============== Cache Manager ==============
class CacheManager:
    """مدير التخزين المؤقت الموحد"""
    
    def __init__(self):
        self.enabled = CACHE_ENABLED
        
        if REDIS_URL:
            self._cache = RedisCache(REDIS_URL)
            logger.info("🔄 Using Redis cache")
        else:
            self._cache = MemoryCache()
            logger.info("🔄 Using Memory cache (Redis not configured)")
    
    async def get(self, key: str) -> Optional[Any]:
        if not self.enabled:
            return None
        
        value = await self._cache.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None
    
    async def set(self, key: str, value: Any, ttl: int = DEFAULT_TTL) -> bool:
        if not self.enabled:
            return False
        
        try:
            json_value = json.dumps(value, ensure_ascii=False, default=str)
            return await self._cache.set(key, json_value, ex=ttl)
        except Exception as e:
            logger.warning(f"Cache SET error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        return await self._cache.delete(key)
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """إبطال جميع المفاتيح التي تطابق النمط"""
        return await self._cache.clear_pattern(pattern)
    
    # ============== Convenience Methods ==============
    
    async def get_settings(self, settings_id: str = "main") -> Optional[dict]:
        """جلب الإعدادات من الكاش"""
        return await self.get(f"settings:{settings_id}")
    
    async def set_settings(self, settings: dict, settings_id: str = "main") -> bool:
        """تخزين الإعدادات في الكاش"""
        return await self.set(f"settings:{settings_id}", settings, ttl=SETTINGS_TTL)
    
    async def invalidate_settings(self) -> int:
        """إبطال كاش الإعدادات"""
        return await self.invalidate_pattern("settings:*")
    
    async def get_categories(self) -> Optional[list]:
        """جلب الفئات من الكاش"""
        return await self.get("categories:all")
    
    async def set_categories(self, categories: list) -> bool:
        """تخزين الفئات في الكاش"""
        return await self.set("categories:all", categories, ttl=CATEGORIES_TTL)
    
    async def invalidate_categories(self) -> int:
        """إبطال كاش الفئات"""
        return await self.invalidate_pattern("categories:*")


# إنشاء instance واحد
cache_manager = CacheManager()


# ============== Decorator للتخزين المؤقت ==============
def cached(key_prefix: str, ttl: int = DEFAULT_TTL):
    """
    Decorator للتخزين المؤقت للدوال
    
    Usage:
        @cached("user_profile", ttl=300)
        async def get_user_profile(user_id: str):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # بناء مفتاح الكاش
            cache_key = f"{key_prefix}:{':'.join(str(a) for a in args)}"
            if kwargs:
                cache_key += f":{':'.join(f'{k}={v}' for k, v in sorted(kwargs.items()))}"
            
            # محاولة جلب من الكاش
            cached_value = await cache_manager.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # تنفيذ الدالة وتخزين النتيجة
            result = await func(*args, **kwargs)
            await cache_manager.set(cache_key, result, ttl=ttl)
            
            return result
        return wrapper
    return decorator
