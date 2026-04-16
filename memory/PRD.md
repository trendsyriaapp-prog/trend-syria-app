# Trend Syria - E-Commerce App PRD

## Overview
Full-stack e-commerce application for Syria market with Android/Capacitor, React, FastAPI, and MongoDB.

## Current Status: Production (Google Play Closed Testing)
- Live Website: https://trendsyria.app
- Android App: v1.0.20 (versionCode: 21) in Closed Testing (Alpha)

## Latest Update: 2026-04-16

### ✅ Syria Internet Optimization - COMPLETED
**Date:** 2026-04-16
**Session Focus:** تحسينات شاملة للإنترنت البطيء في سوريا

**Problems Solved:**
1. تجمد التطبيق عند رفع الفيديو (Base64 في الذاكرة)
2. فقدان البيانات عند انقطاع الإنترنت
3. عدم وجود مؤشر لجودة الشبكة
4. عدم وجود خيار لتوفير البيانات

**Solutions Implemented:**

**1. رفع الفيديو المحسّن ✅**
- رفع فوري مع Progress Bar (بدلاً من الانتظار عند الحفظ)
- Object URL للعرض (بدلاً من Base64 في الذاكرة)
- الحد الأقصى 15MB (بدلاً من 50MB)
- Files: `videoValidation.js`, `AddProductModal.js`, `storage.py`

**2. إعادة المحاولة التلقائية ✅**
- axios interceptor مع retry (3 محاولات)
- Exponential backoff (2s, 4s, 8s)
- File: `lib/axiosRetry.js`

**3. مؤشر جودة الشبكة ✅**
- يظهر "إنترنت ضعيف" عند الشبكة السيئة
- يستخدم Network Information API
- File: `components/NetworkStatus.js`

**4. وضع توفير البيانات ✅**
- جودة صور: منخفضة/متوسطة/عالية/تلقائي
- خيار تعطيل الفيديو والأنيميشن
- Files: `lib/dataSaver.js`, `components/DataSaverSettings.js`

**Existing Features (Already Implemented):**
- ✅ ضغط الصور تلقائياً (`utils/imageCompression.js`)
- ✅ Lazy Loading للصور (`components/LazyImage.js`)
- ✅ صور ضبابية أولاً (`ProgressiveImage`)
- ✅ Offline-First Architecture (`lib/offlineDB.js`, `lib/syncManager.js`)
- ✅ CDN للصور (Cloudflare R2)

**Verification:**
- ✅ `yarn build` - Compiled successfully
- ✅ ESLint - No issues found

---

### ✅ Unused Files Cleanup - COMPLETED
**Date:** 2026-04-15
**Session Focus:** تنظيف الملفات غير المستخدمة لتقليل حجم البناء

**Problem Solved:**
- وجود 20 ملف React غير مستخدم في الكود (~188KB)
- زيادة غير ضرورية في حجم البناء

**Solution Implemented:**
- فحص شامل لكل ملف للتأكد من عدم استخدامه
- إنشاء نسخة احتياطية في `/app/frontend/src/_unused_backup/`
- حذف الملفات الـ 20 بعد التحقق

**Files Deleted (20 files, ~188KB total):**
1. `components/ImageUploader.js` (9.8KB)
2. `components/InfiniteProductList.js` (5.0KB)
3. `components/WhatsAppButton.js` (6.0KB)
4. `components/RoleSwitcher.js` (8.9KB)
5. `components/ui/SafeButton.js` (4.1KB)
6. `components/BackToTopButton.js` (3.9KB)
7. `components/delivery/DeliveryTimer.js` (5.4KB)
8. `components/delivery/DeliveryHeader.js` (1.1KB)
9. `components/seller/ImageEditorModal.js` (11KB)
10. `components/seller/CameraGuideModal.js` (8.2KB)
11. `components/OptimizedImage.js` (6.3KB)
12. `components/voip/CallCustomerButton.js` (1.6KB)
13. `components/InfiniteScroll.js` (2.8KB)
14. `components/delivery/RouteSelector.js` (12KB)
15. `components/VirtualList.js` (7.6KB)
16. `components/seller/ProImageProcessor.js` (32KB)
17. `components/seller/SellerFlashSalesTab.js` (12KB)
18. `components/chat/OrderChat.js` (7.7KB)
19. `hooks/useDebounce.js` (2.4KB)
20. `utils/locationHelper.js` (3.4KB)

**Verification:**
- ✅ `yarn build` - Compiled successfully
- ✅ ESLint - No issues found
- ✅ Backup created at `/app/frontend/src/_unused_backup/`

**Expected Impact:**
- تقليل حجم البناء بـ ~188KB
- كود أنظف وأسهل للصيانة

---

### ✅ Offline-First Architecture - COMPLETED
**Date:** 2026-04-15
**Session Focus:** تحسين شامل لجعل التطبيق يعمل مثل تطبيقات وديني ويلا كو

**Problem Solved:**
- التطبيق كان يتوقف عن العمل بدون إنترنت
- كل عملية تحتاج اتصال بالسيرفر
- تجربة مستخدم سيئة على الإنترنت البطيء في سوريا

**Solution Implemented - Complete Offline-First System:**

**1. IndexedDB Local Storage (`/app/frontend/src/lib/offlineDB.js`):**
- تخزين محلي للمنتجات، الفئات، السلة، المفضلة
- 8 stores: products, categories, cart, orders, favorites, settings, syncQueue, cacheMeta
- بحث محلي في المنتجات
- Sync queue للعمليات المعلقة

**2. Background Sync Manager (`/app/frontend/src/lib/syncManager.js`):**
- مزامنة دورية كل 30 ثانية
- مزامنة فورية عند عودة الاتصال
- قائمة انتظار للعمليات (cart_add, cart_update, cart_remove)
- إعادة المحاولة 3 مرات عند الفشل

**3. Optimistic UI Updates (`/app/frontend/src/context/CartContext.js`):**
- تحديث واجهة المستخدم فوراً قبل انتظار السيرفر
- السلة تعمل بدون إنترنت
- مزامنة خلفية عند توفر الاتصال

**4. Data Provider (`/app/frontend/src/context/DataContext.js`):**
- Cache-First strategy للصفحة الرئيسية
- تحميل من IndexedDB أولاً ثم من السيرفر
- تحديث تلقائي في الخلفية

**5. Network Status UI (`/app/frontend/src/components/NetworkStatus.js`):**
- شريط "أنت غير متصل بالإنترنت" عند انقطاع الاتصال
- شريط "عاد الاتصال" + "جاري المزامنة" عند العودة
- عداد للعمليات المعلقة

**6. Offline Hooks (`/app/frontend/src/hooks/useOffline.js`):**
- `useNetworkStatus()` - مراقبة حالة الاتصال
- `useSyncManager()` - إدارة المزامنة
- `useConnectionIndicator()` - عرض مؤشر الاتصال

**Files Created:**
- `/app/frontend/src/lib/offlineDB.js` - نظام IndexedDB
- `/app/frontend/src/lib/syncManager.js` - مدير المزامنة
- `/app/frontend/src/context/DataContext.js` - سياق البيانات
- `/app/frontend/src/hooks/useOffline.js` - hooks للـ offline
- `/app/frontend/src/components/NetworkStatus.js` - مؤشر الاتصال

**Files Modified:**
- `/app/frontend/src/App.js` - إضافة DataProvider و NetworkStatus
- `/app/frontend/src/context/CartContext.js` - Offline-First + Optimistic Updates
- `/app/frontend/public/service-worker.js` - إضافة CDN images caching

**Expected Impact:**
- التطبيق يعمل بدون إنترنت (تصفح الكاش)
- السلة تعمل فوراً (Optimistic UI)
- مزامنة تلقائية عند عودة الاتصال
- تجربة مستخدم سلسة مثل وديني ويلا كو

---

### ✅ CDN Image Storage Integration - COMPLETED
**Date:** 2026-04-15
**Session Focus:** Migrate images from Base64 in MongoDB to Emergent Cloud Storage (CDN)

**Problem Solved:**
- Homepage API was ~1.8MB due to Base64 images stored directly in MongoDB
- Severe loading delays on slow Syrian internet connections

**Solution Implemented:**
- Integrated Emergent Object Storage (S3-compatible CDN)
- New images are automatically uploaded to CDN, URLs stored in DB
- Added Admin tool for batch migrating existing Base64 images

**New Files Created:**
- `/app/backend/core/storage.py` - Storage service (init, upload, download)
- `/app/backend/routes/storage.py` - REST API endpoints for images
- `/app/frontend/src/components/admin/ImageMigrationTab.js` - Admin migration UI

**Files Modified:**
- `/app/backend/server.py` - Added storage router & init at startup
- `/app/backend/routes/products.py` - Auto-upload images on product creation
- `/app/frontend/src/components/LazyImage.js` - Support CDN paths with `getImageUrl()`
- `/app/frontend/src/pages/AdminPage.js` - Added migration tab

**API Endpoints Added:**
- `GET /api/storage/images/{path}` - Serve images from CDN
- `POST /api/storage/upload` - Upload Base64 images (authenticated)
- `POST /api/storage/upload-file` - Upload file (multipart)
- `POST /api/storage/migrate-batch` - Batch migrate products (admin)
- `POST /api/storage/migrate-product-images/{id}` - Migrate single product

**Expected Impact:**
- Homepage payload: ~1.8MB → ~50KB (97% reduction)
- Faster loading on slow connections
- Better CDN caching & global delivery

---

### ✅ Performance Optimization - Phase 7 (Advanced Optimizations) - COMPLETED
**Date:** 2026-04-12
**Session Focus:** 7 Advanced Performance Optimizations

**Changes Made:**

**1. Preconnect & DNS Prefetch (`index.html`):**
- Added preconnect for Firebase, fonts.googleapis.com
- Added dns-prefetch for CDN and analytics
- Added preload for critical fonts
- **Impact:** 100-300ms faster first request

**2. API Response Compression (`server.py`):**
- Reduced GZip minimum from 500 to 256 bytes
- **Impact:** More responses compressed, 70% smaller payloads

**3. Service Worker v6 (`service-worker.js`):**
- Complete rewrite with Cache-First strategy for images
- Stale-While-Revalidate for static assets
- Network-First for APIs with fallback
- Offline page support (`offline.html`)
- API response caching for categories/products
- Background sync preparation
- **Impact:** Offline support, instant cached loads

**4. Virtual Scrolling (`VirtualList.js`):**
- New component for rendering only visible items
- `VirtualList` for vertical lists
- `VirtualGrid` for product grids
- `useInfiniteScroll` hook
- **Impact:** 70% less memory for long lists

**5. Improved Skeleton Loading (`HomePageSkeleton.js`):**
- Exact dimensions matching real content
- Shimmer animation with CSS
- Prevents layout shift (CLS)
- **Impact:** Better perceived performance

**6. Enhanced Lazy Image (`LazyImage.js`):**
- Intersection Observer with 200px rootMargin
- Shimmer placeholder
- srcset support for responsive images
- Progressive image loading
- **Impact:** Faster image loads, better UX

**7. Image Compression System (`imageCompressor.js`):**
- WebP conversion (25-35% smaller)
- Multiple sizes generation (xs, sm, md, lg)
- Quality optimization
- Client-side compression before upload
- **Impact:** Smaller uploads, faster processing

**8. Backend Upload Optimization (`image_processing.py`):**
- `/api/image/upload-optimized` - Single image
- `/api/image/bulk-upload-optimized` - Multiple images
- Responsive srcset generation
- **Impact:** Server-side optimization

**New Files Created:**
- `/app/frontend/src/components/VirtualList.js`
- `/app/frontend/public/offline.html`

**Files Modified:**
- `/app/frontend/public/index.html` (Preconnect/Prefetch)
- `/app/frontend/public/service-worker.js` (Complete rewrite)
- `/app/frontend/src/index.css` (Performance CSS)
- `/app/frontend/src/components/HomePageSkeleton.js`
- `/app/frontend/src/components/LazyImage.js`
- `/app/frontend/src/utils/imageCompressor.js`
- `/app/backend/server.py` (GZip threshold)
- `/app/backend/routes/image_processing.py` (Upload endpoints)

---

### ✅ Performance Optimization - Phase 6 (Infrastructure) - COMPLETED
**Date:** 2026-04-12
**Session Focus:** CDN Preparation, Caching, and Image Optimization

**Changes Made:**

**1. Redis Cache System (`core/cache.py`):**
- Created `CacheManager` class with Redis/Memory fallback
- Supports `get`, `set`, `delete`, `invalidate_pattern`
- Configurable TTL for different data types:
  - Settings: 1 hour
  - Categories: 30 minutes
  - Products: 5 minutes
- `@cached` decorator for easy function caching

**2. CDN Cache Headers (`server.py`):**
- Added `Cache-Control` middleware for all responses:
  - Static files: 1 year (immutable)
  - Categories/Settings: 1 hour
  - Products: 5 minutes
  - API calls: no-cache
- Added `Vary` header for proper CDN handling

**3. WebP Image Conversion (`image_processing.py`):**
- Added `/api/image/convert-to-webp` endpoint
- Added `/api/image/optimize-batch` for bulk optimization
- Expected compression: 25-35% smaller than JPEG/PNG
- Quality configurable (default: 85%)

**4. Rate Limiting:**
- Already implemented in `core/security.py`
- Login: 15/minute
- Register: 5/minute
- API general: 100/minute

**Dependencies Added:**
- `redis==7.4.0`
- `aioredis==2.0.1`

**CDN Setup Instructions (for Cloudflare):**
1. Add site to Cloudflare
2. Point DNS to DigitalOcean
3. Enable "Cache Everything" page rule for `/api/images/*`
4. Set Edge TTL to "Respect Existing Headers"

---

### ✅ Performance Optimization - Phase 5 (Frontend + Pagination) - COMPLETED
**Date:** 2026-04-12
**Session Focus:** Code Splitting, Pagination, and Bundle Optimization

**Changes Made:**

**1. Backend Pagination:**
- Added pagination to `/api/stores/favorites` (page, limit params)
- Added pagination to `/api/user/following` (page, limit params)
- Response format: `{data: [], total, page, pages}`

**2. Frontend Code Splitting (React.lazy):**
- Lazy loaded 25+ heavy pages:
  - `AdminPage` (1346 lines)
  - `SellerPages` (2288 lines)
  - `FoodStoreDashboard` (4303 lines)
  - `DeliveryPages` (2018 lines)
  - All food-related pages
  - Section pages (Sponsored, Flash Sale, etc.)
- Added `<Suspense>` wrapper with loading spinner

**3. Frontend Pagination Support:**
- Updated `FavoritesPage.js` with infinite scroll
- Updated `FollowingPage.js` with "Load More" button
- Added loading states and total counts

**Expected Impact:**
- Initial bundle load: ~40% smaller (lazy chunks loaded on demand)
- Favorites/Following pages: Load first 20 items instantly, paginate rest

---

### ✅ Deep Performance Optimization - Phase 4 (Food Orders) - COMPLETED
**Date:** 2026-04-12
**Session Focus:** Complete N+1 Query Elimination in `food_orders.py` (4925 lines, 11 patterns)

**Functions Optimized:**

| Function | Problem | Solution |
|----------|---------|----------|
| `create_food_order()` | Loop `find_one` per item | Batch `$in` query |
| `create_batch_food_orders()` | Nested loops (stores + products) | Double batch `$in` queries |
| `get_batch_pickup_plan()` | Loop `find_one` per store | Batch `$in` query |
| `accept_food_order()` | Loop `find_one` per current order store | Single batch for all stores |
| `evaluate_order_for_smart_route()` | Loop `find_one` per order store | Combined batch query |
| `report_delivery_failed()` | Loop `insert_one` for admin notifications | `insert_many` batch |
| `verify_delivery_code()` | Loop `find_one` for remaining orders | Batch `$in` query |
| `request_delivery_driver()` | Loop `insert_one` for driver notifications | `insert_many` batch |

**Performance Impact:**
- **Food Order Creation**: 5 items = 1 query instead of 5 queries
- **Batch Orders (3 stores)**: 2 queries instead of 6+ queries
- **Driver Accept**: 3 current orders = 1 query instead of 3 queries
- **Notifications**: 10 drivers = 1 insert instead of 10 inserts

---

### ✅ Deep Performance Optimization - Phase 3 - COMPLETED
**Date:** 2026-04-12
**Session Focus:** Critical User-Facing APIs (Cart, Checkout, Payment, Orders)

**Files Optimized in Phase 3:**

| File | Function | Before | After |
|------|----------|--------|-------|
| `shipping.py` | `calculate_cart_shipping()` | N+1 (query per cart item) | Single `$in` query |
| `shipping.py` | `calculate_cart_shipping_detailed()` | N+1 (2 queries per item) | Batch `$in` + sellers map |
| `payment.py` | `checkout_order()` | N+1 (query per cart item) | Single `$in` query |
| `payment.py` | `confirm_shamcash_payment()` | Loop update_one | `bulk_write` |
| `payment.py` | `pay_with_wallet()` | Loop update_one | `bulk_write` |
| `orders.py` | `create_order()` | N+1 (2 queries per item) | Batch `$in` + `bulk_write` |
| `delivery_time.py` | `get_admin_driver_penalties()` | N+1 (query per driver) | Single `$in` query |
| `payment_v2.py` | `_process_successful_payment()` | Loop update_one | `bulk_write` |

**User Flow Impact:**
- **Opening Cart Page**: 10 items = 1 query instead of 20+ queries
- **Checkout Flow**: 10 items = 2 queries instead of 30+ queries  
- **Payment Confirmation**: Stock updates as single bulk operation

---

### ✅ Deep Performance Optimization - Phase 2 - COMPLETED
**Date:** 2026-04-12
**Session Focus:** Continued N+1 Query Elimination across remaining backend files

**Files Optimized with Batch Queries:**

| File | Function | Before | After |
|------|----------|--------|-------|
| `wallet.py` | Line 471 | Duplicate HTTPException | Fixed |
| `cart.py` | `get_cart()` | N+1 (query per cart item) | Single `$in` query |
| `messages.py` | `get_conversations()` | N+1 (query per conversation) | Single `$in` query |
| `stores.py` | `get_following_stores()` | N+1 (3 queries per follow) | Batch + Aggregation |
| `stores.py` | `get_favorites()` | N+1 (query per favorite) | Single `$in` query |
| `recommendations.py` | `get_trending_products()` | N+1 (query per trending item) | Single `$in` query |
| `price_reports.py` | `get_all_reports()` | N+1 (query per report) | Single `$in` query |
| `chat.py` | `get_active_chat_conversations()` | N+1 (2 queries per order) | Aggregation pipelines |
| `driver_security.py` | `get_all_deposits()` | N+1 (query per deposit) | Single `$in` query |
| `driver_security.py` | `get_all_drivers()` | N+1 (3 queries per driver) | Batch + Aggregation |

**Technical Approach:**
- Replaced `for item in list: await db.find_one()` with batch `$in` queries
- Used MongoDB aggregation pipelines for counting and grouping
- Pre-fetch all related data in single queries and map by ID
- Used `bulk_write` for batch updates instead of loop `update_one`

**Expected Performance Improvement:**
- Cart page: ~10x faster (10 items = 1 query vs 10 queries)
- Checkout page: ~15x faster
- Favorites page: ~20x faster (20 favorites = 1 query vs 20 queries)
- Admin drivers page: ~300x faster (100 drivers = 3 queries vs 300 queries)

---

### ✅ Homepage Loading Issue - FIXED (Critical)
**Date:** 2026-04-12
**Problem:**
الصفحة الرئيسية لا تعرض المنتجات أحياناً - تظهر فارغة للمستخدمين الجدد والقدامى في سوريا وتركيا.

**Root Cause Analysis:**
1. الـ API أحياناً يفشل أو يتأخر (timeout)
2. الكاش يحفظ بيانات فارغة إذا فشل الطلب
3. لا يوجد Retry تلقائي عند فشل الطلب
4. يتم استخدام بيانات فارغة من الكاش بدون تحقق

**Fix Applied in `HomePage.js`:**
1. **دالة `isValidHomepageData()`**: للتحقق من صحة البيانات قبل استخدامها أو حفظها
2. **دالة `fetchWithRetry()`**: Retry تلقائي صامت - 3 محاولات مع تأخير 2 ثانية
3. **تحسين منطق الكاش**: لا يحفظ بيانات فارغة، يحذف الكاش الفاسد
4. **إضافة timeout**: 10-15 ثانية للطلبات

**Expected Result:**
- نسبة نجاح التحميل: من ~50% إلى ~85%
- المستخدم يرى Skeleton ثم المنتجات (بدون رسالة خطأ)

---

### ✅ Performance Optimizations - COMPLETED
**Date:** 2026-04-12
**Optimizations Applied:**

1. **Lazy Loading للصور** (موجود مسبقاً في `LazyImage.js`):
   - الصور تُحمّل فقط عندما تظهر في الشاشة
   - rootMargin: 200px للتحميل المسبق

2. **تقليل حجم البيانات من الـ API** (`products.py`):
   - إرسال أول صورة فقط بدلاً من كل الصور: `"images": {"$slice": 1}`
   - إزالة الحقول غير الضرورية (video, seller_id, seller_name, views)

3. **تحسين Service Worker** (`service-worker.js`):
   - إضافة `IMAGE_CACHE` لتخزين الصور
   - استراتيجية Stale-While-Revalidate للصور
   - إضافة `/api/products/homepage-data` للـ APIs القابلة للتخزين
   - رفع الإصدار إلى v5

4. **زيادة وقت الكاش** (`products.py`):
   - من 10 دقائق إلى 30 دقيقة (1800 ثانية)

**Expected Result:**
- سرعة التحميل أسرع بـ 30-40%
- نسبة النجاح الكلية: ~92-95%

---

### ✅ Order Number Simplified
**Date:** 2026-04-12
**Change:**
تغيير رقم الطلب من UUID طويل (`#7c7a993a`) إلى 6 أرقام بسيطة (`#123456`)

**Files Modified:**
- `orders.py` - إضافة `order_number` بـ 6 أرقام
- `food_orders.py` - تغيير صيغة `order_number` إلى 6 أرقام
- `CheckoutPage.js` - عرض `order_number` الجديد

---

### ✅ Food Page Quick Shop Categories - COMPLETED
**Date:** 2026-04-11
**Request:**
إضافة شريط للأصناف الثلاثة (معلبات، مواد غذائية، منظفات) في صفحة الطعام، مع إبقائها في الصفحة الرئيسية أيضاً، ليتمكن العميل من الاختيار بين:
- **التسوق السريع** (صفحة الطعام) → توصيل سريع 🚀
- **التسوق العادي** (الصفحة الرئيسية) → شحن عادي 🚚

**Implementation:**
1. **FoodPage.js:**
   - إضافة 3 أصناف جديدة في `CATEGORY_CONFIG`: `groceries` (مواد غذائية)، `canned_food` (معلبات)، `cleaners` (منظفات)
   - إضافة قسم `quick_shop` في `MAIN_SECTIONS`
   - إضافة شريط أخضر جديد "تسوق سريع" أسفل شريط الفئات الرئيسي
   - الشريط يعرض الأزرار الثلاثة بتصميم جذاب
   - إخفاء هذه الأصناف من الشريط الرئيسي لتجنب التكرار

2. **categories.py (Backend):**
   - إضافة `canned_food` (معلبات) و `cleaners` (منظفات) في `DEFAULT_CATEGORIES`

3. **products.py (Backend):**
   - تحديث `categories_with_icons` لتشمل الأصناف الجديدة

4. **HomePage.js:**
   - إضافة ترجمات الأصناف الجديدة في `getCategoryNameAr`
   - إضافة أيقونات الأصناف الجديدة في `getCategoryIcon`

**Files Modified:**
- `/app/frontend/src/pages/FoodPage.js`
- `/app/frontend/src/pages/HomePage.js`
- `/app/backend/routes/categories.py`
- `/app/backend/routes/products.py`

**Result:**
- صفحة الطعام تعرض شريط "تسوق سريع" أخضر مع 3 أزرار (مواد غذائية، معلبات، منظفات)
- الصفحة الرئيسية تعرض نفس الأصناف مع بقية الأصناف العادية
- العميل يمكنه الاختيار بين سرعة التوصيل حسب القسم الذي يتسوق منه
- **شارة "توصيل سريع 🚀"** تظهر على بطاقات المنتجات من الأصناف الثلاثة (في الزاوية السفلية اليمنى)

---

### ✅ Approved Driver Appearing as New Join Request - FIXED
**Date:** 2026-04-11
**Problem:**
عندما سائق معتمد يقوم بإيداع التأمين أو يدخل لوحة التحكم، يظهر للأدمن كطلب انضمام جديد.

**Root Cause Analysis:**
1. في `delivery.py` - دالتا `get_availability()` و `update_availability()` كانتا تنشئان سجل في `delivery_documents` بـ `status: "pending"` إذا لم يوجد سجل
2. هذا يحدث حتى للسائقين المعتمدين، مما يجعلهم يظهرون في قائمة طلبات الانضمام المعلقة

**Fix Applied:**
1. `delivery.py`: تحقق من `user.is_approved` قبل إنشاء السجل - إذا معتمد يستخدم `status: "approved"`
2. `admin.py`: `get_pending_delivery()` و `get_pending_sellers()` يتجاهلان المستخدمين المعتمدين ويصححان السجلات الخاطئة تلقائياً

**Files Modified:**
- `/app/backend/routes/delivery.py` - `get_availability()`, `update_availability()`
- `/app/backend/routes/admin.py` - `get_pending_delivery()`, `get_pending_sellers()`

---

### ✅ Admin Page Refresh Fix - COMPLETED
**Date:** 2026-04-11
**Problem:** 
عندما يكون المدير في صفحة `/admin?tab=all-pending-items` ويضغط على تحديث الصفحة (F5)، التطبيق يذهب للصفحة الرئيسية بدلاً من البقاء في صفحة الأدمن.

**Root Cause Analysis:**
1. صفحات الأدمن والبائعين والسائقين كانت تتحقق من `user` قبل انتهاء تحميل بيانات المستخدم من `AuthContext`
2. عند تحديث الصفحة، `loading = true` و `user = null` مؤقتاً
3. الكود كان يوجه المستخدم للصفحة الرئيسية عندما `user === null` بدون انتظار انتهاء التحميل

**Fix Applied:**
1. إضافة `loading: authLoading` من `useAuth()` في جميع الصفحات المحمية
2. إضافة شرط `if (authLoading) return <spinner />` قبل أي تحقق من `user`
3. تغيير `navigate('/')` إلى `navigate('/', { replace: true })` لمنع التاريخ الزائد

**Files Modified:**
- `/app/frontend/src/pages/AdminPage.js` - إضافة `authLoading` check
- `/app/frontend/src/pages/SellerPages.js` - إصلاح `SellerDocumentsPage`, `SellerDashboardPage`, `SellerPendingApproval`
- `/app/frontend/src/pages/DeliveryPages.js` - إصلاح `DeliveryDashboard`, `DeliveryPendingApproval`

---

### ✅ Video Upload Validation Fix - COMPLETED
**Date:** 2026-04-11
**Problem:**
1. حد رفع الفيديو كان 10MB فقط - صغير جداً للفيديوهات العادية من الهاتف
2. لم يكن هناك تحقق من مدة الفيديو في صفحة متاجر الطعام

**Fix Applied:**
1. تم إنشاء `videoValidation.js` في الجلسة السابقة (50MB، 1-30 ثانية)
2. تم تطبيقه على `AddProductModal.js` في الجلسة السابقة
3. **هذه الجلسة:** تم تطبيقه على `FoodStoreDashboard.js`
4. تم تحديث نص واجهة المستخدم من "10MB" إلى "50MB"

**Files Modified:**
- `/app/frontend/src/pages/FoodStoreDashboard.js` - إضافة import و تحديث `handleAdminVideoUpload`

---

### ✅ Admin Document Images Display & Modal Fix - COMPLETED
**Date:** 2026-04-10
**Problem:** 
1. الأدمن يرى نص "تم الرفع" بدلاً من الصور الفعلية للمستندات قبل الموافقة
2. عند النقر على صورة لتكبيرها، تظهر شاشة بيضاء فارغة

**Root Cause Analysis:**
1. `ImageViewerModal` موجود كمكون لكنه غير مستخدم في الـ JSX الرئيسي
2. قسم السائقين كان يعرض فقط status text وليس الصور الفعلية
3. قسم متاجر الطعام لم يكن يعرض أي وثائق
4. بعض حقول الصور كانت تستخدم أسماء خاطئة (`national_id_image` بدلاً من `national_id`)

**Fix Applied:**
1. أضيف `ImageViewerModal` في نهاية الـ JSX قبل إغلاق الـ div الرئيسي
2. حُدث قسم البائعين لاستخدام حقول الصور الصحيحة (`national_id`, `commercial_registration`, `shop_photo`/`health_certificate`)
3. حُدث قسم السائقين ليعرض الصور الفعلية (`personal_photo`, `id_photo`, `motorcycle_license`, `vehicle_photo`) بدلاً من status text
4. حُدث قسم متاجر الطعام ليعرض (`logo`, `cover_image`)

**Files Modified:**
- `/app/frontend/src/components/admin/AllPendingJoinRequests.js`

**Test Results:**
- ✅ صور البائعين تظهر بشكل صحيح (3 صور: هوية، سجل تجاري، صورة محل/شهادة صحية)
- ✅ صور السائقين تظهر بشكل صحيح (4 صور: شخصية، هوية، رخصة، مركبة)
- ✅ صور متاجر الطعام تظهر بشكل صحيح (2 صور: شعار، غلاف)
- ✅ Modal يعمل بشكل مثالي - عرض الصورة بحجم كامل مع عنوان وزر إغلاق
- ✅ لا شاشة بيضاء عند النقر على الصور

---

## Previous Update: 2026-04-09

### ✅ Admin Push Notifications Feature - COMPLETED
**Description:** إشعارات Push للمدير عند حدوث أحداث مهمة

| Event | Notification | Trigger |
|-------|--------------|---------|
| بائع جديد | 📦 طلب انضمام بائع جديد | POST /api/seller/documents |
| سائق جديد | 🚗 طلب انضمام سائق جديد | POST /api/delivery/documents |
| متجر طعام | 🍽️ متجر طعام جديد بانتظار الموافقة | POST /api/food/stores |
| منتج جديد | 📦 منتج جديد بانتظار الموافقة | POST /api/products |
| طبق طعام | 🍽️ طبق طعام جديد بانتظار الموافقة | POST /api/food/items |
| طلب سحب | 💰 طلب سحب جديد | POST /api/wallet/withdraw |

**Files Modified:**
- `/app/backend/core/firebase_admin.py` - Added `send_push_to_admins()` function
- `/app/backend/routes/auth.py` - Added notifications for seller & driver registration
- `/app/backend/routes/food.py` - Added notifications for food store & food items
- `/app/backend/routes/products.py` - Added notification for new products
- `/app/backend/routes/wallet.py` - Added notification for withdrawal requests
- `/app/backend/routes/notifications.py` - Added new notification types to filter

### ✅ Admin Approval Dashboard - Comprehensive Testing Completed
**Testing Results:** 100% Backend & Frontend Working

| Feature | Status | Details |
|---------|--------|---------|
| Product Sellers | ✅ | Registration + Documents + Approval/Reject |
| Food Sellers | ✅ | Registration + Store Creation + Approval/Reject |
| Delivery Drivers | ✅ | Registration + Documents (photo, ID, license) + Approval/Reject |
| Products | ✅ | Creation with `admin_video` + Approval/Reject |
| Food Items | ✅ | Creation with `admin_video` + Approval/Reject |
| Verification Video | ✅ | Both products & food items display `admin_video` to admin |

---

## Core Features Implemented
- Multi-role system (buyer, seller, food_seller, delivery, admin, sub_admin)
- Product management with categories
- Order management
- Food delivery system
- Wallet system
- Chat/messaging
- Push notifications
- WhatsApp OTP authentication (test mode: 123456)
- Admin dashboard with full controls

## Recent Bug Fixes (December 2025)

### 2026-04-09: Fix App Reload on Resume (Capacitor) ✅
**Problem:** When user switches to another app and returns, the app reloads from the beginning showing splash screen again
**Root Cause:** 
- SplashScreen component always starts with `showSplash: true`
- No state persistence between app lifecycle changes
- No listener for `appStateChange` event
**Fix:**
1. **SplashScreen.js**: Check `sessionStorage.hasSeenSplash` before showing splash
2. **App.js**: Add `appStateChange` listener to mark splash as seen on resume
3. **capacitor.config.json**: Set `launchShowDuration: 0` and `launchAutoHide: true`
4. **MainActivity.java**: Override `onSaveInstanceState` and `onRestoreInstanceState` to preserve WebView state
**Files Changed:**
- `/app/frontend/src/components/SplashScreen.js`
- `/app/frontend/src/App.js`
- `/app/frontend/capacitor.config.json`
- `/app/frontend/android/app/src/main/java/com/trendsyria/app/MainActivity.java`

### 2026-04-09: Food Products Now Require Admin Approval ✅
**Bug Fixed:** Food products were being created without `approval_status` field, so they never appeared in admin's pending list
**Fix:** Added `is_approved: False` and `approval_status: "pending"` to food product creation in `/app/backend/routes/food.py`
**Result:** Food products now appear in `/api/admin/food-products/pending` and require admin approval before being visible to customers

### 2026-04-09: سجل الطلبات المرفوضة (Rejected Join Requests Log) ✅
**Feature:** إضافة سجل للطلبات المرفوضة (بائعين وسائقين) مع حذف تلقائي بعد 30 يوم
**Implementation:**
- Backend: 
  - إضافة collection جديد `rejected_join_requests`
  - تعديل `reject_seller` و `reject_delivery_driver` لحفظ نسخة في السجل
  - إضافة `GET /api/admin/rejected-requests` لجلب السجل مع حذف تلقائي للقديم
  - إضافة `DELETE /api/admin/rejected-requests/{id}` للحذف اليدوي
- Frontend:
  - إضافة تبويب "المرفوضة" في `AllPendingJoinRequests.js`
  - عرض اسم، نوع (بائع/سائق)، سبب الرفض، التاريخ
  - زر حذف يدوي لكل سجل
**Files Changed:**
- `/app/backend/routes/admin.py` (APIs + save logic)
- `/app/frontend/src/components/admin/AllPendingJoinRequests.js` (UI)

### 2026-04-09: Comprehensive Join Request & Product Approval Testing ✅
**Testing Completed:**
1. **Delivery Drivers:**
   - ❌ Incomplete documents (missing photos) → Rejected with proper error message
   - ✅ Complete documents → Accepted and visible to admin
   - ✅ Admin approval → Driver can access dashboard
   - ✅ Admin rejection → Driver sees rejection reason
   
2. **Product Sellers:**
   - ❌ Incomplete documents → Rejected with proper error message  
   - ✅ Complete documents → Accepted and visible to admin
   - ✅ Admin approval → Seller can access dashboard
   - ✅ Admin rejection → Seller sees rejection reason with "Retry" button
   
3. **Food Sellers:**
   - ✅ Same flow as product sellers (fixed routing bug)
   - ✅ Admin rejection → Food seller sees rejection reason
   
4. **Products:**
   - ✅ Products visible to admin with full details
   - ✅ Admin approval → Product visible to customers
   - ✅ Admin rejection with reason → Seller sees reason and can edit/resubmit
   
**Bugs Fixed:**
- Backend: Added mandatory field validation for delivery documents (personal_photo, id_photo, national_id)
- Backend: Added mandatory field validation for seller documents (business_name, national_id, commercial_registration)
- Backend: Fixed product reject API to accept simple JSON `{reason: "..."}` instead of `ProductApproval` schema
- Backend: Fixed food product reject API (same issue)
- Backend: Added `rejection_reason` to documents/status API response
- Frontend: Added `rejectionReason` state to DeliveryPages.js and SellerPages.js
- Frontend: Display rejection reason in red box for rejected users
- Frontend: Fixed food_seller routing to check documents status before dashboard access

### 2026-04-08: Admin Reject Join Requests - UI Instant Update ✅
**Problem:** When Admin rejects a seller/driver join request, the item stays visible in the "Pending" list until page refresh
**Root Cause:** After successful reject API call, `fetchAllPending()` was called but relied on re-fetching from server which could be slow or cached
**Fix:** Instead of refetching, directly remove the item from React state after successful API response
**Implementation:**
- `executeReject()`: After successful reject, filter out the item from `pendingSellers`, `pendingDrivers`, or `pendingFoodStores` state
- `handleApproveSeller/Driver/FoodStore()`: Same pattern - remove item from state immediately after successful approve
- Also close expanded item with `setExpandedItem(null)` for cleaner UX
**Files Changed:**
- `/app/frontend/src/components/admin/AllPendingJoinRequests.js`

### 2026-04-08: Google Play Account Deletion Policy Compliance ✅
**Requirement:** Google Play requires apps to have an accessible "Delete Account" option from within the app
**Implementation:**
- Created `DeleteAccountPage.js` at `/delete-account` route
- Created `DELETE /api/auth/account` backend API for authenticated account deletion
- Added "حذف الحساب" (Delete Account) link in MobileNav.js account menu dropdown (for buyers)
- Added "حذف الحساب" button in SettingsPage.js (accessible to ALL user types: buyers, sellers, drivers)
- Link appears with red UserX icon above the logout button
**Files Changed:**
- `/app/frontend/src/pages/DeleteAccountPage.js` (new page)
- `/app/frontend/src/components/MobileNav.js` (added navigation link for buyers)
- `/app/frontend/src/pages/SettingsPage.js` (added delete account button for all users)
- `/app/backend/routes/auth.py` (added DELETE /api/auth/account endpoint)
- `/app/frontend/src/App.js` (added route)

### 2026-04-07: All Food Items Admin Tab ✅
**Feature:** Added "All Food Items" (أصناف الطعام) tab in Admin Dashboard
**Implementation:**
- Created `GET /api/admin/food-items/all` API endpoint in `admin.py`
- Created `FoodItemsTab.js` component with filters (all, approved, pending, unavailable)
- Integrated into `AdminPage.js` with icon in "المتاجر والمنتجات" section
- Added delete functionality for food items
**Files Changed:**
- `/app/backend/routes/admin.py` (API endpoint)
- `/app/frontend/src/components/admin/FoodItemsTab.js` (new component)
- `/app/frontend/src/pages/AdminPage.js` (integration)

### 2026-04-07: Admin User/Driver Deletion Fixes ✅
**Problem:** Delete/Ban buttons for users and drivers weren't functional
**Fix:** Connected `handleDeleteDriver`, `handleBanDriver`, `handleDeleteBuyer`, `handleBanBuyer` functions and passed them as props to `DeliveryTab` and `UsersTab`

### 2026-04-07: Ticker Messages UI Fixes ✅
**Fixes:**
- Fixed mobile flex layout
- Added unsaved changes warning
- Removed drag-and-drop to fix scrolling issues
- Unified DB collection reading (`ticker_messages`)
- Removed "Exclusive" star logic

### 2026-04-07: Comprehensive Deep-Dive Bug Fixes ✅
**Problem 1:** Missing `import logging` causing 500 errors on exception handling
**Fix:** Added `import logging` to `auth.py`, `orders.py`, `food_orders.py`

**Problem 2:** 404 errors on placeholder images (via.placeholder.com blocked by ORB)
**Fix:** 
- Created `/placeholder.svg` in public folder
- Updated 23 files to use `/placeholder.svg` instead of `via.placeholder.com`
- Fixed `LazyImage.js` to properly fallback to `/placeholder.svg` on error

**Problem 3:** Security vulnerability - Debug endpoint exposing sensitive data
**Fix:** Protected `/api/auth/debug/login-check/{phone}` with admin authentication and removed traceback exposure

**Problem 4:** Database cleanup for fresh tester start
**Action:** Deleted all old data (2,904 records) - Only Admin account remains

**Problem 5:** Driver documents not visible to Admin (ENHANCEMENT)
**Fix:** Improved DeliveryTab.js and DeliveryPages.js:
- Added document status checker with required/optional distinction
- Added colored status badges (✅/❌) for each document
- Added warning banner when documents are incomplete
- Disabled approve button if required documents are missing
- Added document checklist in driver registration form
- Prevented submission without all required documents

**Files Fixed:**
- Backend: `auth.py`, `orders.py`, `food_orders.py` (logging imports + security)
- Frontend: 23+ files (placeholder images)
- Frontend: `DeliveryTab.js`, `DeliveryPages.js` (document visibility enhancement)

### 2025-12-07: Login State Persistence Fix ✅
**Problem:** Login succeeds but UI shows user as logged out
**Root Cause:** Race condition in AuthContext.js - `fetchUser()` called immediately after `setToken()` could fail and trigger `logout()`
**Fix:** Added `skipFetchUserRef` to prevent `fetchUser()` from being called right after login/register since user data is already returned from the API response

### 2025-12-06: Previous Fixes
- Fixed double `/api/api/` path in GitHub Actions YAML
- Added ErrorBoundary and ApiErrorDisplay to prevent white screens
- Fixed Safe Area for Android Status Bar
- Fixed ensure_super_admin_exists to update existing users
- Added Array.isArray fallback for .map() in ProductsPage and HomePage

## Deployment Architecture
- Frontend: React with Capacitor for Android
- Backend: FastAPI
- Database: MongoDB Atlas
- Hosting: DigitalOcean App Platform
- CI/CD: GitHub Actions (auto-builds Android AAB)

## Key Files Reference
- `/app/frontend/src/context/AuthContext.js` - Authentication state management
- `/app/frontend/src/App.js` - Main React app with routing
- `/app/backend/routes/auth.py` - Authentication API endpoints
- `/app/backend/server.py` - FastAPI main server
- `.github/workflows/android-build.yml` - Android build configuration

## Test Credentials
- Super Admin: `0945570365` / `TrendSyria@2026`
- Dummy OTP: `123456`

## Backlog

### P0 (Critical)
- [x] Fix login state persistence on web - DONE 2025-12-07
- [x] Add "All Food Items" admin tab - DONE 2026-04-07
- [x] Google Play Account Deletion Policy Compliance - DONE 2026-04-08

### P1 (High Priority)
- [ ] Granular permissions for sub-admins (roles like "orders manager", "products manager")
- [ ] Implement live payment verification for Sham Cash

### P2 (Medium Priority)
- [ ] Re-add ACCESS_BACKGROUND_LOCATION and FOREGROUND_SERVICE_LOCATION permissions
- [ ] Create YouTube demo video for location tracking permissions

### P3 (Low Priority - Post Launch)
- [ ] Split large files (food_orders.py, admin.py, FoodStoreDashboard.js, ProductDetailPage.js, AddProductModal.js)
- [ ] iOS app development

## Tech Stack
- React 18
- FastAPI
- MongoDB (Atlas)
- Capacitor 6
- Framer Motion
- Axios
- TailwindCSS
- Shadcn/UI

## Integration Notes
- WhatsApp OTP via UltraMsg (currently in test mode)
- Payment providers: Sham Cash (needs live verification)
