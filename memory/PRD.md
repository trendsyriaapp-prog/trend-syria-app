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

### Wallet System
- [x] Buyer wallet functionality
- [x] Seller earnings tracking
- [x] Driver earnings stats

### Delivery System
- [x] Driver performance tracking
- [x] Unified map system
- [x] Order assignment

### Delivery Driver Registration - Syrian Local Requirements (April 2025) ✅ NEW
- [x] إزالة حقل رخصة القيادة نهائياً
- [x] تغيير "صورة المركبة" إلى "صورة الدراجة" (bike_photo)
- [x] تغيير "نوع المركبة" إلى "نوع الوقود: بنزين/كهرباء" (fuel_type: petrol/electric)
- [x] دمج المدينة والعنوان مع تحديد GPS إلزامي
- [x] إضافة تحذير: "⚠️ موتورات البارت غير مصرح بها إطلاقاً"
- [x] إضافة ملاحظة عند الصورة الشخصية: "ستظهر صورتك للبائعين والعملاء"
- [x] جميع الحقول إلزامية
- [x] تحديث بطاقة مراجعة الطلب في لوحة الإدارة
- [x] تحديث الصفحة التسويقية والأسئلة الشائعة

### Driver Profile Photo Display (April 2025) ✅ NEW
- [x] إضافة API جديد `GET /api/delivery/profile` لجلب الملف الشخصي مع الصورة
- [x] عرض الصورة الشخصية في Header صفحة السائق الرئيسية
- [x] عرض التقييم إلى جانب اسم السائق
- [x] عدم السماح بتعديل الصورة مباشرة (فقط عبر الدعم)
- [x] عرض رابط الموقع GPS للمدير عند مراجعة الطلب
- [x] عرض تاريخ تقديم الطلب للمدير

## In Progress / Upcoming Tasks

### P1 - High Priority
- [ ] **Sham Cash Integration** - Activate real payment gateway (currently MOCKED)
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
- `/app/backend/models/schemas.py` - DeliveryDocuments schema
- `/app/frontend/src/pages/DeliveryPages.js` - Driver registration form
- `/app/frontend/src/pages/JoinAsDeliveryPage.js` - Marketing page
- `/app/frontend/src/components/admin/join-requests/DriverRequestCard.js` - Admin review card
- `/app/frontend/src/components/admin/DeliveryTab.js` - Admin delivery tab

## API Endpoints
- `GET /api/delivery/fuel-types` - Get available fuel types (petrol, electric)
- `POST /api/delivery/documents` - Submit driver registration documents
- `GET /api/delivery/documents/status` - Check registration status
- `GET /api/delivery/profile` - Get driver profile with personal photo, stats, and rating

## Test Credentials
- Super Admin: `0945570365`
- OTP Test Code: `123456`
- VPS SSH: `ssh -p 2222 root@130.94.57.227`

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
- ✅ Replaced Array index as React keys with unique identifiers (AdminPage.js, etc.)
- ✅ Replaced `random` module with `secrets` in test files for security-sensitive operations
- ✅ Fixed f-strings without placeholders (70 auto-fixed)
- ✅ Test credentials moved to environment variables via conftest.py

## Notes
- Always communicate with user in Arabic (العربية)
- MONGO_URL in preview can be swapped to localhost for testing, but must be reverted
