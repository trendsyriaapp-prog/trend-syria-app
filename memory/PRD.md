# ترند سورية - Trend Syria E-commerce Platform

## Original Problem Statement
استكمال تطبيق التجارة الإلكترونية "ترند سوريا" (Trend Syria) للإطلاق الرسمي على متجر Google Play. 
- تطبيق تجارة إلكترونية متكامل (Android/Capacitor, React, FastAPI, MongoDB)
- يتطلب تكامل مع الجهاز (Native)، أدوار مستخدمين متعددة، أدوات تحكم وإشراف للإدارة
- Requires extreme performance optimization for slow Syrian internet networks
- Moving to self-hosted Riyadh VPS for performance

## Architecture
- **Frontend**: React + Capacitor (Android)
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Caching**: IndexedDB (Offline-First)
- **Hosting**: Nginx on Ubuntu 22.04 VPS (Riyadh)

## Completed Features

### Core E-commerce
- [x] Product catalog with categories
- [x] Shopping cart & checkout
- [x] Order tracking system
- [x] Seller dashboard
- [x] Admin panel

### Security & Rate Limiting (December 2024)
- [x] Advanced Rate Limiting System (`core/rate_limiter.py`)
- [x] Rate Limit Admin Dashboard (`RateLimitDashboard.js`)
- [x] Security Alerts for brute force detection
- [x] Push notifications to admins

### Code Quality Fixes (December 2024)
- [x] Replaced 450+ console.log with production-safe logger.js
- [x] Fixed insecure `random` → `secrets` module
- [x] Fixed React Hook dependencies (stale closures)
- [x] Replaced Array index keys in dynamic lists
- [x] Removed hardcoded secrets from test files
- [x] Created tests/conftest.py and tests/.env.test

### Wallet & Withdrawal System - Updated (April 2025)
- [x] **إضافة خيار الحساب البنكي للسحب** - بجانب شام كاش
- [x] **إزالة موافقة الأدمن للسحوبات** - الطلبات تُقبل تلقائياً بحالة `ready_for_transfer`
- [x] **خصم فوري من المحفظة** - المبلغ يُخصم فور إرسال طلب السحب
- [x] **API جديد لتأكيد التحويل** - `POST /api/payment/admin/withdrawals/{id}/mark-transferred`
- [x] **فشل الشحن مباشر** - إذا فشل التحقق من الشحن، يفشل الطلب بدون إرساله للأدمن
- [x] **تحديث لوحة الأدمن** - عرض بيانات الحساب البنكي وزر "تم التحويل"
- [x] **تحديث واجهة المستخدم** - نموذج السحب يدعم شام كاش والحساب البنكي

### Geographic Restriction System (April 2025) ✅ NEW
- [x] **نظام التقييد الجغرافي المؤقت** - شاشة اختيار المحافظة والمنطقة عند كل فتح للتطبيق
- [x] **منفصل تماماً عن Checkout** - لا يتداخل مع عناوين التوصيل أو نظام الطلبات
- [x] **لوحة إدارة كاملة** - إضافة/إزالة محافظات ومناطق
- [x] **تفعيل/تعطيل سهل** - يمكن تعطيل النظام من لوحة الإدارة
- [x] **رسالة حظر ودية** - "نحن نعمل على التوسع! الخدمة ستكون متاحة قريباً"
- [x] **سهولة الإزالة** - يمكن حذف المكون بالكامل بعد التوسع
- **الملفات:**
  - `/app/frontend/src/components/CityRestrictionGate.js` - مكون الحماية
  - `/app/frontend/src/components/admin/AllowedRegionsTab.js` - لوحة الإدارة
  - `/app/backend/routes/settings.py` - APIs (allowed-regions endpoints)

### 🔒 httpOnly Cookies Authentication (April 2025) ✅ NEW
- [x] **تحويل من localStorage إلى httpOnly Cookies** - أمان أعلى ضد هجمات XSS
- [x] **CORS Middleware** - إضافة دعم credentials للـ cookies
- [x] **Backend يدعم كلا الطريقتين** - Cookie و Authorization header للتوافق
- [x] **Logout endpoint** - مسح الـ cookies بشكل آمن
- [x] **AuthContext محدّث** - يستخدم cookies مع `withCredentials: true`
- **الملفات:**
  - `/app/backend/core/auth_cookies.py` - نظام الـ cookies الجديد
  - `/app/backend/core/database.py` - دالة `get_current_user` محدّثة
  - `/app/backend/server.py` - CORS middleware مع credentials
  - `/app/frontend/src/context/AuthContext.js` - محدّث للـ cookies

### Delivery System
- [x] Driver performance tracking
- [x] Unified map system
- [x] Order assignment

### Delivery Driver Registration - Syrian Local Requirements (April 2025)
- [x] إزالة حقل رخصة القيادة نهائياً
- [x] تغيير "صورة المركبة" إلى "صورة الدراجة" (bike_photo)
- [x] تغيير "نوع المركبة" إلى "نوع الوقود: بنزين/كهرباء" (fuel_type: petrol/electric)
- [x] دمج المدينة والعنوان مع تحديد GPS إلزامي
- [x] إضافة تحذير: "⚠️ موتورات البارت غير مصرح بها إطلاقاً"
- [x] إضافة ملاحظة عند الصورة الشخصية: "ستظهر صورتك للبائعين والعملاء"
- [x] جميع الحقول إلزامية
- [x] تحديث بطاقة مراجعة الطلب في لوحة الإدارة
- [x] تحديث الصفحة التسويقية والأسئلة الشائعة

### Driver Profile Photo Display (April 2025)
- [x] إضافة API جديد `GET /api/delivery/profile` لجلب الملف الشخصي مع الصورة
- [x] عرض الصورة الشخصية في Header صفحة السائق الرئيسية
- [x] عرض التقييم إلى جانب اسم السائق
- [x] عدم السماح بتعديل الصورة مباشرة (فقط عبر الدعم)
- [x] عرض رابط الموقع GPS للمدير عند مراجعة الطلب
- [x] عرض تاريخ تقديم الطلب للمدير

## Saved for Future (Pending Legal Review)

### نظام الوكلاء (مكاتب الحوالات)
- **الملف:** `/app/memory/AGENT_SYSTEM_PLAN.md`
- **الحالة:** محفوظ - ينتظر استشارة محامي
- **للبدء:** قل "ابدأ ببناء نظام الوكلاء"
- يشمل: لوحة تحكم الوكيل، إدارة الوكلاء، نظام المحاسبة كل 24 ساعة

---

## In Progress / Upcoming Tasks

### P1 - High Priority
- [ ] **Sham Cash Integration** - Activate real payment gateway (currently MOCKED)
- [ ] **SMS OTP Integration** - Activate real SMS for Syrian numbers (currently MOCKED/console)
- [ ] **Sub-admin Permissions** - Granular roles ("Order Manager", "Product Manager")

### P2 - Medium Priority
- [ ] Secure localStorage → httpOnly cookies (High-risk refactor, deferred)
- [ ] MongoDB Authentication on Riyadh VPS (Deferred - requires SSH session)

### P3 - Low Priority (COMPLETED)
- [x] Refactor oversized React components (December 2024):
  - MobileNav.js: 617 → 214 lines ✅
  - AllPendingJoinRequests.js: 896 → 386 lines ✅
  - Extracted to: `/components/navigation/` and `/components/admin/join-requests/`
- [ ] Reactivate ACCESS_BACKGROUND_LOCATION for Capacitor

### P5 - Future
- [ ] Email login option
- [ ] Increase Python type hint coverage

## Key Files Reference
- `/app/backend/core/rate_limiter.py` - Rate limiting logic
- `/app/backend/routes/auth.py` - Authentication & driver registration API
- `/app/backend/routes/wallet.py` - Wallet and withdrawal APIs
- `/app/backend/routes/payment.py` - Payment and admin withdrawal APIs
- `/app/backend/routes/settings.py` - Platform settings including geographic restriction
- `/app/backend/models/schemas.py` - Data schemas including WithdrawalRequest
- `/app/frontend/src/components/CityRestrictionGate.js` - Geographic restriction gate (TEMPORARY)
- `/app/frontend/src/components/admin/AllowedRegionsTab.js` - Admin region management
- `/app/frontend/src/pages/WalletPage.js` - Seller/Driver wallet page with withdrawal
- `/app/frontend/src/pages/BuyerWalletPage.js` - Buyer wallet page with top-up
- `/app/frontend/src/components/admin/AllWithdrawRequestsTab.js` - Admin withdrawal management

## API Endpoints

### Geographic Restriction APIs (TEMPORARY)
- `GET /api/settings/allowed-regions` - Get allowed cities/regions (public)
- `GET /api/settings/allowed-regions/admin` - Get full settings (admin only)
- `PUT /api/settings/allowed-regions` - Update all settings (admin only)
- `POST /api/settings/allowed-regions/add-city` - Add new city (admin only)
- `POST /api/settings/allowed-regions/add-region` - Add region to city (admin only)
- `DELETE /api/settings/allowed-regions/remove-city/{name}` - Remove city (admin only)
- `DELETE /api/settings/allowed-regions/remove-region` - Remove region (admin only)
- `PUT /api/settings/allowed-regions/toggle` - Enable/disable system (admin only)

### Wallet APIs
- `GET /api/wallet/balance` - Get wallet balance
- `POST /api/wallet/withdraw` - Request withdrawal (shamcash or bank_account)
- `GET /api/wallet/withdrawals` - Get withdrawal history
- `DELETE /api/wallet/withdrawals/{id}` - Cancel withdrawal (if not transferred)
- `POST /api/wallet/topup/request` - Request top-up
- `POST /api/wallet/topup/verify` - Verify top-up payment

### Admin Withdrawal APIs
- `GET /api/payment/admin/withdrawals` - Get all withdrawals
- `POST /api/payment/admin/withdrawals/{id}/mark-transferred` - Confirm transfer done
- `POST /api/payment/admin/withdrawals/{id}/approve` - Legacy approve (for old pending requests)
- `POST /api/payment/admin/withdrawals/{id}/reject` - Reject and refund

### Delivery APIs
- `GET /api/delivery/fuel-types` - Get available fuel types (petrol, electric)
- `POST /api/delivery/documents` - Submit driver registration documents
- `GET /api/delivery/documents/status` - Check registration status
- `GET /api/delivery/profile` - Get driver profile with personal photo, stats, and rating

## Test Credentials
- Super Admin: `0945570365` / Password: `TrendSyria@2026`
- Test Seller: `0945570399` / Password: `Test@123456`
- OTP Test Code: `123456`

## VPS Info
- **مزود الخدمة**: LightNode (https://console.lightnode.com/)
- **IP**: `130.94.57.227`
- **Port**: `2222`
- **User**: `root`
- **الموقع**: الرياض، السعودية
- **SSH Command**: `ssh -p 2222 root@130.94.57.227`

## 3rd Party Integrations
- Firebase Admin (Push Notifications)
- UptimeRobot (VPS monitoring)
- Cloudflare (DNS, SSL, R2 CDN)
- Sham Cash (MOCKED - pending activation)

## Known Issues
- Geographic block (Syria) - Users use VPN to access Emergent preview
- Database shows "disconnected" in preview environment (normal behavior)
- **localStorage Security**: Auth tokens stored in localStorage (P2 - Deferred). Migration to httpOnly cookies requires significant refactoring.

## Code Quality Fixes Applied (April 2025)
- ✅ Replaced Array index as React keys with unique identifiers (AdminPage.js, ProductDetailPage.js, JoinAsSellerPage.js)
- ✅ Replaced `random` module with `secrets` in test files for security-sensitive operations
- ✅ Fixed f-strings without placeholders (70 auto-fixed)
- ✅ Test credentials moved to environment variables via conftest.py and .env.test
- ✅ Fixed mutable default arguments in Pydantic models (settings.py)
- ✅ Fixed empty catch blocks with proper error logging (ProductDetailPage.js, OrdersPage.js)
- ✅ Removed hardcoded secrets from 12+ test files (TrendSyria@2026, Test@123456)
- ✅ Circular imports avoided via lazy imports (database.py ↔ firebase_admin.py)
- ✅ Created RejectModal.js (was missing, causing build failure)
- ✅ **localStorage → httpOnly Cookies** - Token authentication now uses secure cookies
- ✅ **CORS Middleware** - Added with credentials support
- ✅ **Logout endpoint** - Properly clears authentication cookies

### Remaining Code Quality (Deferred - Low Priority)
**Note: These items work correctly. Changing them has high risk of breaking functionality.**

- ✅ **Type Hints**: Added to `background_tasks.py`. Other files have adequate coverage.
- ✅ **Nested Ternaries in SettingsPage.js**: Simplified using `getTabButtonClass()` helper function
- ⚠️ **Large Components (5 files)**: Working correctly. Splitting now = high risk.
  - `OrderTrackingMap.js` (468 lines) - Complex map integration
  - `ProductCard.js` (436 lines) - Many variants and states
  - `Header.js` (422 lines) - Search, menu, notifications all interconnected
- ⚠️ **Complex Functions (4 functions)**: Working correctly. Splitting now = high risk.
  - `send_push_to_admins()` (99 lines) - Logical flow, well-documented
  - `reject_seller()` (82 lines) - Database operations + notifications

**Recommendation**: Leave these as-is. Refactor only when modifying them.

## Notes
- Always communicate with user in Arabic (العربية)
- MONGO_URL in preview can be swapped to localhost for testing, but must be reverted
