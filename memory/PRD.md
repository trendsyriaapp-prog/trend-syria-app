# Trend Syria - E-Commerce & Food Delivery App

## Original Problem Statement
Full-stack e-commerce and food delivery application for the Syrian market, targeting Google Play release. The app supports Arabic (RTL), multiple user roles (Buyer, Seller, Food Seller, Delivery Driver, Admin), and requires native Android integration via Capacitor.

## Core Features Implemented

### User Roles & Authentication
- ✅ Multi-role system: Buyer, Product Seller, Food Seller, Delivery Driver, Admin
- ✅ Phone-based authentication with OTP (UltraMsg integration - awaiting payment)
- ✅ JWT token management with refresh tokens
- ✅ Role-based access control

### E-Commerce (Product Sellers)
- ✅ Product listing with categories, images, pricing
- ✅ Inventory management
- ✅ Order management with status tracking
- ✅ Seller wallet system
- ✅ Commission tracking
- ✅ Flash ⚡ self-serve promotions (1,000 SYP for 24h visibility)

### Food Delivery (Food Sellers)
- ✅ Restaurant/store dashboard
- ✅ Menu management
- ✅ Order notifications with sound alerts
- ✅ Integration with delivery drivers
- ✅ Flash ⚡ promotions support

### Customer Features
- ✅ Product browsing with categories
- ✅ Search functionality
- ✅ Shopping cart
- ✅ Order placement and tracking
- ✅ Flash ⚡ deals section on homepage

### Admin Panel
- ✅ User management
- ✅ Product/seller approvals
- ✅ Order oversight
- ✅ Commission settings
- ✅ Flash ⚡ promotion settings (cost, duration, limit)
- ✅ Active promotions monitoring
- ✅ Platform statistics

### Flash ⚡ Promotion System (NEW - March 2026)
- ✅ Self-serve system for sellers
- ✅ 1,000 SYP per product for 24-hour visibility
- ✅ Real-time countdown timers
- ✅ Instant wallet deduction
- ✅ Admin configurable settings
- ✅ Customer-facing Flash section on homepage

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, Capacitor (Android)
- **Backend**: FastAPI, Python 3.11
- **Database**: MongoDB (trend_syria)
- **Styling**: RTL support, Arabic language

## Key API Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/seller/promotions/promote` - Promote a product
- `GET /api/promoted-products` - Get active promotions (public)
- `GET /api/admin/promotions/settings` - Admin promotion settings
- `PUT /api/admin/promotions/settings` - Update promotion settings

## Database Collections
- `users` - All user accounts
- `products` - Product listings
- `orders` - Customer orders
- `food_orders` - Food delivery orders
- `promoted_products` - Active Flash promotions
- `platform_settings` - App-wide settings including promotion config
- `wallets` - User wallet balances
- `transactions` - Financial transactions

## Current Status

### Blockers
- 🔴 **Google Play Identity Verification** - Submitted Turkish Kimlik + TurkNet bill (March 30, 2026)
- 🟡 **UltraMsg WhatsApp OTP** - Requires $39 subscription payment

### Pending Tasks
- P1: Sub-admin granular permissions (orders manager, products manager roles)
- P1: Sham Cash live payment verification
- P2: Code refactoring (post-launch) - split large files
- P3: iOS app development

### Completed (March 2026)
- ✅ Unified seller dashboards (notifications, sound alerts)
- ✅ Complete Flash ⚡ promotion system overhaul
- ✅ Admin promotion settings and monitoring
- ✅ Customer homepage Flash section
- ✅ Real-time countdown timers
- ✅ Wallet integration for promotions

### Completed (April 2026)
- ✅ Fixed Arabic labels in Food Seller dashboard ("إضافة طبق جديد" instead of "إضافة منتج جديد")
- ✅ Fixed all toast messages for food dishes (طبق instead of منتج)
- ✅ **Mandatory Driver Request Flow**: Food sellers can NO LONGER start preparation until a driver accepts the order
  - Flow: Accept Order → Request Driver (mandatory) → Driver Accepts → Set Prep Time → Start Preparation → Ready
  - Prevents food from getting cold while waiting for drivers
- ✅ **Driver Food Prep Timer**: Added countdown timer + audio alert for drivers
  - Shows remaining prep time on driver's order card
  - Plays 3-beep sound alert when 3 minutes or less remain
  - Toast notification when food is almost ready
  - Component: `/app/frontend/src/components/delivery/FoodPrepTimer.js`
- ✅ **Analytics Tab for Product Sellers**: Moved to Settings page (inside الإعدادات) instead of bottom nav
  - Reduced bottom nav from 6 tabs to 5 (الطلبات، المنتجات، فلاش، التغليف، الإعدادات)
  - Added "الإحصائيات" button in Settings page that opens SellerAnalytics component
  - Added "رجوع" (back) button to return from Analytics to Settings
- ✅ **FIXED: Driver Product Order Acceptance Flow** (April 3, 2026)
  - **Problem**: Clicking "Accept Order" for product orders incorrectly opened the Pickup Checklist immediately
  - **Solution**: Created separate acceptance flow for product orders
  - **Changes**:
    - Backend: Created `POST /api/orders/{order_id}/delivery/accept` endpoint in `orders.py`
    - Frontend: Added `handleAcceptProductOrder` function in `DeliveryPages.js`
    - Frontend: Updated `AvailableOrdersList.js` to use `onAcceptProductOrder` callback
    - Backend: Updated `my-product-orders` query to include `accepted` status
  - **Correct Flow**: Accept Order → See in "My Orders" → Arrive at Store → Pickup Checklist → Pickup → Deliver
- ✅ **Driver Waiting Timer at Store (Pickup)** (April 3, 2026)
  - Drivers receive compensation for waiting at store beyond 10 minutes
  - Timer starts when driver clicks "وصلت للمتجر" (Arrived at Store)
  - Compensation: 500 SYP per 5 minutes, max 2,000 SYP
  - Timer persists even if modal is closed and reopened
  - Backend: `POST /api/orders/{order_id}/delivery/arrived` stores `driver_arrived_at`
- ✅ **Driver Waiting Timer at Customer (Drop-off)** (April 4, 2026)
  - Same compensation system for waiting at customer location
  - Timer starts when driver clicks "وصلت للعميل" (Arrived at Customer)
  - Timer auto-hides after 10 minutes (customer should be available by then)
  - Backend: `POST /api/orders/{order_id}/delivery/arrived-customer` stores `driver_arrived_at_customer`
  - Backend (food): `POST /api/food/orders/delivery/{order_id}/arrived-customer`
  - Updated `verify-code` to accept `driver_at_customer` status
  - Frontend: `PickupWaitingTimer.js` supports `maxMinutes` prop for auto-hide
  - Frontend: Fixed `RouteProgressBar.js` to use `theme` instead of `isDark`
  - Frontend: Updated `isPickedUp` logic to include `on_the_way` and `driver_at_customer` statuses

## Test Credentials
- **Admin**: 0912345678 / admin123
- **Product Seller**: 0922222222 / seller123
- **Food Seller**: 0966666666 / food123
- **Customer**: 0933333333 / buyer123
- **Delivery Driver**: 0988111333 / driver123

## Files of Reference
- `/app/frontend/src/components/seller/PromoteProductTab.js`
- `/app/frontend/src/pages/SellerPages.js`
- `/app/frontend/src/pages/FoodStoreDashboard.js`
- `/app/frontend/src/components/admin/SellerPromotionsTab.js`
- `/app/frontend/src/pages/HomePage.js`
- `/app/backend/routes/orders.py`
- `/app/backend/routes/admin.py`

## Post-Launch Roadmap
1. Complete 14-day closed testing period
2. Gather user feedback
3. Code refactoring (split large files)
4. Sub-admin permissions
5. Payment gateway verification
6. iOS development

---

## ⚠️ مهام ما بعد الإطلاق (لا تنسى!) - تذكير للمستخدم بعد نشر التطبيق

### 🔴 P0: دفع اشتراك UltraMsg للـ OTP ($39)
**السبب**: خدمة إرسال رمز التحقق عبر WhatsApp متوقفة بسبب عدم الدفع.

**ما يجب فعله**:
1. ادفع اشتراك UltraMsg بقيمة $39
2. بعد الدفع، رموز OTP ستعمل تلقائياً
3. الرابط: https://ultramsg.com

---

### 🔴 P1: إضافة تتبع السائق في الخلفية (Background Location)
**السبب**: تم حذف `ACCESS_BACKGROUND_LOCATION` مؤقتاً لتسهيل نشر التطبيق على Google Play.

**المشكلة الحالية**: عندما يفتح السائق خرائط Google للتنقل، يتوقف تتبع موقعه للزبون.

**ما يجب فعله بعد الإطلاق**:
1. تصوير فيديو YouTube (30 ثانية) يُظهر:
   - السائق يفعّل زر تتبع الموقع
   - رسالة الإفصاح الواضحة للسائق
   - موقع السائق يظهر للزبون على الخريطة
2. إضافة الصلاحيات في `AndroidManifest.xml`:
   - `android.permission.ACCESS_BACKGROUND_LOCATION`
   - `android.permission.FOREGROUND_SERVICE_LOCATION`
3. رفع تحديث جديد لـ Google Play مع الفيديو والشرح

**الملفات المتأثرة**:
- `/app/frontend/android/app/src/main/AndroidManifest.xml`
- `/app/frontend/src/components/delivery/LocationTracker.js`
- `/app/frontend/src/hooks/useDriverLocationTracker.js`

---

## 📅 حالة Google Play (أبريل 2026)

| المرحلة | الحالة | التاريخ المتوقع |
|---------|--------|-----------------|
| إرسال للمراجعة | ✅ تم | 1 أبريل 2026 |
| مراجعة Google | ⏳ جاري | ~7 أيام |
| الاختبار المغلق | ⏳ انتظار | 14 يوم بعد الموافقة |
| الإصدار العلني | ⏳ انتظار | ~21 يوم من الآن |

**المختبرون**: 20 شخص
**الإصدار**: 1.0.3 (رمز 4)

---
*Last Updated: April 4, 2026 - Added Driver Waiting Timer at Customer (Drop-off)*
