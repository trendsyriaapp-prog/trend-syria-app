# /app/backend/core/performance.py
# تحسينات الأداء - Database Indexes + Caching

import logging
from functools import wraps
from datetime import datetime, timezone, timedelta
import hashlib
import json

logger = logging.getLogger(__name__)

# ============== In-Memory Cache ==============
# بديل بسيط عن Redis للتخزين المؤقت

class SimpleCache:
    """كاش بسيط في الذاكرة مع TTL"""
    
    def __init__(self):
        self._cache = {}
        self._timestamps = {}
    
    def get(self, key: str):
        """جلب قيمة من الكاش"""
        if key not in self._cache:
            return None
        
        # التحقق من انتهاء الصلاحية
        if key in self._timestamps:
            if datetime.now(timezone.utc) > self._timestamps[key]:
                del self._cache[key]
                del self._timestamps[key]
                return None
        
        return self._cache[key]
    
    def set(self, key: str, value, ttl_seconds: int = 300):
        """حفظ قيمة في الكاش"""
        self._cache[key] = value
        self._timestamps[key] = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    
    def delete(self, key: str):
        """حذف قيمة من الكاش"""
        if key in self._cache:
            del self._cache[key]
        if key in self._timestamps:
            del self._timestamps[key]
    
    def clear_pattern(self, pattern: str):
        """حذف جميع المفاتيح التي تطابق النمط"""
        keys_to_delete = [k for k in self._cache.keys() if pattern in k]
        for key in keys_to_delete:
            self.delete(key)
    
    def clear_all(self):
        """مسح كل الكاش"""
        self._cache.clear()
        self._timestamps.clear()
    
    @property
    def stats(self):
        """إحصائيات الكاش"""
        return {
            "total_keys": len(self._cache),
            "memory_size": len(json.dumps(self._cache, default=str))
        }

# إنشاء instance واحد للكاش
cache = SimpleCache()

# ============== Cache Decorator ==============

def cached(ttl_seconds: int = 300, key_prefix: str = ""):
    """Decorator للتخزين المؤقت للدوال"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # إنشاء مفتاح فريد
            cache_key = f"{key_prefix}:{func.__name__}:{hashlib.md5(str(args).encode() + str(kwargs).encode()).hexdigest()[:16]}"
            
            # التحقق من الكاش
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # تنفيذ الدالة وحفظ النتيجة
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl_seconds)
            
            return result
        return wrapper
    return decorator

# ============== Database Indexes ==============

async def create_database_indexes(db):
    """إنشاء فهارس قاعدة البيانات لتحسين الأداء"""
    
    try:
        logger.info("🔧 Creating database indexes...")
        
        # ========== Users Collection ==========
        await db.users.create_index("id", unique=True)
        await db.users.create_index("phone", unique=True)
        await db.users.create_index("email", sparse=True)  # sparse لأن الإيميل اختياري
        await db.users.create_index("user_type")
        await db.users.create_index("created_at")
        await db.users.create_index("referral_code", sparse=True)
        await db.users.create_index("is_approved")
        await db.users.create_index("city")
        await db.users.create_index([("user_type", 1), ("is_approved", 1)])  # فهرس مركب
        logger.info("✅ Users indexes created")
        
        # ========== Products Collection ==========
        await db.products.create_index("id", unique=True)
        await db.products.create_index("seller_id")
        await db.products.create_index("category_id")
        await db.products.create_index("category")
        await db.products.create_index("status")
        await db.products.create_index("approval_status")
        await db.products.create_index("is_active")
        await db.products.create_index("price")
        await db.products.create_index("created_at")
        await db.products.create_index("views", background=True)
        await db.products.create_index("sales_count", background=True)
        await db.products.create_index("city")
        # فهرس نصي للبحث (بدون تحديد لغة افتراضية)
        try:
            await db.products.create_index([
                ("name", "text"), 
                ("description", "text"),
                ("category_name", "text")
            ])
        except Exception as text_error:
            logger.warning(f"Text index may already exist: {text_error}")
        # فهرس مركب للفلترة
        await db.products.create_index([("status", 1), ("category_id", 1), ("price", 1)])
        await db.products.create_index([("seller_id", 1), ("is_active", 1)])
        await db.products.create_index([("city", 1), ("category", 1)])
        logger.info("✅ Products indexes created")
        
        # ========== Orders Collection ==========
        await db.orders.create_index("id", unique=True)
        await db.orders.create_index("user_id")
        await db.orders.create_index("seller_id")
        await db.orders.create_index("delivery_driver_id", sparse=True)
        await db.orders.create_index("status")
        await db.orders.create_index("created_at")
        await db.orders.create_index("order_type")
        await db.orders.create_index([("user_id", 1), ("created_at", -1)])
        await db.orders.create_index([("seller_id", 1), ("status", 1)])
        await db.orders.create_index([("delivery_driver_id", 1), ("status", 1)])
        await db.orders.create_index([("status", 1), ("created_at", -1)])
        logger.info("✅ Orders indexes created")
        
        # ========== Food Orders Collection ==========
        await db.food_orders.create_index("id", unique=True)
        await db.food_orders.create_index("user_id")
        await db.food_orders.create_index("restaurant_id")
        await db.food_orders.create_index("store_id")
        await db.food_orders.create_index("seller_id")
        await db.food_orders.create_index("status")
        await db.food_orders.create_index("delivery_driver_id", sparse=True)
        await db.food_orders.create_index([("user_id", 1), ("created_at", -1)])
        await db.food_orders.create_index([("seller_id", 1), ("status", 1)])
        logger.info("✅ Food orders indexes created")
        
        # ========== Food Stores Collection ==========
        await db.food_stores.create_index("id", unique=True)
        await db.food_stores.create_index("owner_id")
        await db.food_stores.create_index("city")
        await db.food_stores.create_index("is_active")
        await db.food_stores.create_index("is_approved")
        await db.food_stores.create_index("store_type")
        await db.food_stores.create_index([("city", 1), ("is_active", 1), ("is_approved", 1)])
        logger.info("✅ Food stores indexes created")
        
        # ========== Food Products Collection ==========
        await db.food_products.create_index("id", unique=True)
        await db.food_products.create_index("store_id")
        await db.food_products.create_index("seller_id")
        await db.food_products.create_index("category")
        await db.food_products.create_index("is_available")
        await db.food_products.create_index([("store_id", 1), ("is_available", 1)])
        logger.info("✅ Food products indexes created")
        
        # ========== Categories Collection ==========
        await db.categories.create_index("id", unique=True)
        await db.categories.create_index("parent_id", sparse=True)
        await db.categories.create_index("order")
        logger.info("✅ Categories indexes created")
        
        # ========== Reviews Collection ==========
        await db.reviews.create_index("id", unique=True)
        await db.reviews.create_index("product_id")
        await db.reviews.create_index("user_id")
        await db.reviews.create_index("seller_id")
        await db.reviews.create_index("rating")
        await db.reviews.create_index([("product_id", 1), ("created_at", -1)])
        await db.reviews.create_index([("seller_id", 1), ("rating", -1)])
        logger.info("✅ Reviews indexes created")
        
        # ========== Notifications Collection ==========
        await db.notifications.create_index("id", unique=True)
        await db.notifications.create_index("user_id")
        await db.notifications.create_index("target")
        await db.notifications.create_index("is_read")
        await db.notifications.create_index("created_at")
        await db.notifications.create_index([("user_id", 1), ("is_read", 1)])
        await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
        logger.info("✅ Notifications indexes created")
        
        # ========== Cart Collection ==========
        await db.cart.create_index("user_id")
        await db.cart.create_index([("user_id", 1), ("product_id", 1)], unique=True)
        logger.info("✅ Cart indexes created")
        
        # ========== Wishlist Collection ==========
        await db.wishlists.create_index("user_id")
        await db.wishlists.create_index([("user_id", 1), ("product_id", 1)], unique=True)
        logger.info("✅ Wishlist indexes created")
        
        # ========== Coupons Collection ==========
        await db.coupons.create_index("code", unique=True)
        await db.coupons.create_index("is_active")
        await db.coupons.create_index("expiry_date")
        await db.coupons.create_index("seller_id", sparse=True)
        logger.info("✅ Coupons indexes created")
        
        # ========== Wallet Transactions ==========
        await db.wallet_transactions.create_index("user_id")
        await db.wallet_transactions.create_index("type")
        await db.wallet_transactions.create_index("created_at")
        await db.wallet_transactions.create_index([("user_id", 1), ("created_at", -1)])
        await db.wallet_transactions.create_index([("user_id", 1), ("type", 1)])
        logger.info("✅ Wallet transactions indexes created")
        
        # ========== Messages / Chat ==========
        await db.messages.create_index("conversation_id")
        await db.messages.create_index("sender_id")
        await db.messages.create_index("receiver_id")
        await db.messages.create_index("created_at")
        await db.messages.create_index([("conversation_id", 1), ("created_at", -1)])
        logger.info("✅ Messages indexes created")
        
        # ========== Support Tickets ==========
        await db.support_tickets.create_index("id", unique=True)
        await db.support_tickets.create_index("user_id")
        await db.support_tickets.create_index("status")
        await db.support_tickets.create_index("ticket_type")
        await db.support_tickets.create_index([("status", 1), ("created_at", -1)])
        logger.info("✅ Support tickets indexes created")
        
        # ========== Newsletter Subscribers ==========
        await db.newsletter_subscribers.create_index("email", unique=True)
        await db.newsletter_subscribers.create_index("is_active")
        await db.newsletter_subscribers.create_index("user_type", sparse=True)
        logger.info("✅ Newsletter indexes created")
        
        # ========== FCM Tokens ==========
        await db.fcm_tokens.create_index("user_id", unique=True)
        await db.fcm_tokens.create_index("fcm_token")
        logger.info("✅ FCM tokens indexes created")
        
        # ========== Driver Locations ==========
        await db.driver_locations.create_index("driver_id", unique=True)
        await db.driver_locations.create_index("updated_at")
        await db.driver_locations.create_index("is_online")
        await db.driver_locations.create_index("city")
        logger.info("✅ Driver locations indexes created")
        
        # ========== Gifts ==========
        await db.gifts.create_index("sender_id")
        await db.gifts.create_index("recipient_phone")
        await db.gifts.create_index("recipient_id", sparse=True)
        await db.gifts.create_index("status")
        await db.gifts.create_index([("recipient_id", 1), ("status", 1)])
        logger.info("✅ Gifts indexes created")
        
        # ========== Activity Log (للأمان) ==========
        await db.activity_log.create_index("user_id")
        await db.activity_log.create_index("action")
        await db.activity_log.create_index("created_at")
        await db.activity_log.create_index([("user_id", 1), ("created_at", -1)])
        logger.info("✅ Activity log indexes created")
        
        # ========== Refresh Tokens ==========
        await db.refresh_tokens.create_index("user_id", unique=True)
        await db.refresh_tokens.create_index("token")
        await db.refresh_tokens.create_index("created_at")
        logger.info("✅ Refresh tokens indexes created")
        
        logger.info("🎉 All database indexes created successfully!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating indexes: {e}")
        return False

# ============== Query Optimization Helpers ==============

def get_pagination_pipeline(page: int, limit: int):
    """إنشاء pipeline للـ pagination"""
    skip = (page - 1) * limit
    return [
        {"$skip": skip},
        {"$limit": limit}
    ]

def get_sort_pipeline(sort_by: str = "created_at", order: int = -1):
    """إنشاء pipeline للترتيب"""
    return [{"$sort": {sort_by: order}}]

# ============== Image Optimization Config ==============

IMAGE_OPTIMIZATION_CONFIG = {
    "max_width": 1200,          # الحد الأقصى للعرض
    "max_height": 1200,         # الحد الأقصى للارتفاع
    "thumbnail_size": 300,      # حجم الصورة المصغرة
    "quality": 85,              # جودة الضغط (JPEG)
    "format": "webp",           # تنسيق الإخراج المفضل
    "lazy_loading": True,       # التحميل الكسول
    "placeholder_blur": True,   # صورة ضبابية كـ placeholder
    "max_file_size_kb": 500,    # الحد الأقصى لحجم الملف بعد الضغط (KB)
}

# ============== Image Compression Helper ==============

def compress_image(image_data: bytes, max_size_kb: int = 500, quality: int = 85) -> bytes:
    """
    ضغط الصورة مع الحفاظ على الجودة
    يقلل الحجم تدريجياً حتى يصل للحد المطلوب
    """
    from PIL import Image
    import io
    
    try:
        img = Image.open(io.BytesIO(image_data))
        
        # تحويل RGBA لـ RGB إذا لزم (للـ JPEG)
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # تصغير الأبعاد إذا كانت كبيرة جداً
        max_dim = max(IMAGE_OPTIMIZATION_CONFIG["max_width"], IMAGE_OPTIMIZATION_CONFIG["max_height"])
        if max(img.size) > max_dim:
            img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        
        # ضغط تدريجي
        current_quality = quality
        output = io.BytesIO()
        
        while current_quality >= 30:
            output.seek(0)
            output.truncate()
            img.save(output, format='JPEG', quality=current_quality, optimize=True)
            
            if output.tell() <= max_size_kb * 1024:
                break
            
            current_quality -= 10
        
        output.seek(0)
        return output.getvalue()
        
    except Exception as e:
        logger.error(f"Error compressing image: {e}")
        return image_data  # إرجاع الأصلية في حالة الخطأ

def generate_thumbnail(image_data: bytes, size: int = 300) -> bytes:
    """إنشاء صورة مصغرة"""
    from PIL import Image
    import io
    
    try:
        img = Image.open(io.BytesIO(image_data))
        
        # تحويل لـ RGB
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # تصغير مع الحفاظ على النسبة
        img.thumbnail((size, size), Image.Resampling.LANCZOS)
        
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=75, optimize=True)
        output.seek(0)
        return output.getvalue()
        
    except Exception as e:
        logger.error(f"Error generating thumbnail: {e}")
        return image_data

# ============== Performance Monitoring ==============

class PerformanceMonitor:
    """مراقبة أداء الطلبات"""
    
    def __init__(self):
        self.requests = []
        self.slow_threshold_ms = 1000  # 1 ثانية
    
    def log_request(self, path: str, method: str, duration_ms: float, status_code: int):
        """تسجيل طلب"""
        self.requests.append({
            "path": path,
            "method": method,
            "duration_ms": duration_ms,
            "status_code": status_code,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "is_slow": duration_ms > self.slow_threshold_ms
        })
        
        # الاحتفاظ بآخر 1000 طلب فقط
        if len(self.requests) > 1000:
            self.requests = self.requests[-1000:]
    
    def get_stats(self):
        """إحصائيات الأداء"""
        if not self.requests:
            return {"message": "لا توجد بيانات"}
        
        durations = [r["duration_ms"] for r in self.requests]
        slow_requests = [r for r in self.requests if r["is_slow"]]
        
        return {
            "total_requests": len(self.requests),
            "avg_duration_ms": sum(durations) / len(durations),
            "max_duration_ms": max(durations),
            "min_duration_ms": min(durations),
            "slow_requests_count": len(slow_requests),
            "slow_requests_percentage": len(slow_requests) / len(self.requests) * 100,
            "slowest_endpoints": self._get_slowest_endpoints()
        }
    
    def _get_slowest_endpoints(self, limit: int = 5):
        """أبطأ الـ endpoints"""
        from collections import defaultdict
        
        endpoint_times = defaultdict(list)
        for r in self.requests:
            endpoint_times[r["path"]].append(r["duration_ms"])
        
        avg_times = {
            path: sum(times) / len(times) 
            for path, times in endpoint_times.items()
        }
        
        sorted_endpoints = sorted(avg_times.items(), key=lambda x: x[1], reverse=True)
        return sorted_endpoints[:limit]

performance_monitor = PerformanceMonitor()
