# Trend Syria - Product Requirements Document

## Original Problem Statement
Full-stack e-commerce and food delivery platform for the Syrian market, wrapped in a Capacitor Android application for Google Play Store distribution.

## User Personas
- **Customers**: Syrian users ordering food and products
- **Sellers**: Restaurant and shop owners managing their stores
- **Delivery Drivers**: Personnel delivering orders with GPS tracking
- **Admins**: Platform administrators managing the entire system

## Core Requirements
- Multi-vendor marketplace with food delivery
- Real-time order tracking with GPS
- Native Android app via Capacitor
- Arabic RTL interface
- Multiple payment methods (Sham Cash, Cash on Delivery)

---

## What's Been Implemented

### March 2026 - Session 4 (30 Mar 2026)
- ✅ **Added Notifications Bell to Food Seller Dashboard** - Perfectly matches Product Seller UI
  - File: `/app/frontend/src/pages/FoodStoreDashboard.js` - Added `<NotificationsDropdown />` to header
  - Food sellers now receive real-time notifications for orders and driver arrivals
  - UI fully standardized between Food and Product seller dashboards
- ✅ **Added New Order Sound Alert for Food Sellers**
  - Integrated `useNotificationSound` hook with `playFood()` function
  - Added `onNewOrder` callback to `StoreOrdersTab` component
  - Sound plays automatically when new pending orders arrive (every 30 seconds check)
  - Shows toast notification with pending order count
- ✅ **Fixed Commission API Endpoint Error**
  - Changed `/orders/seller/commission` to `/api/seller/commission` in `SellerPages.js`
  - Fixed 404 error that was appearing in console logs
- ✅ **NEW: Replaced Flash Sales with "Promote Your Product" System**
  - Created simple, user-friendly promotion system for both Product and Food sellers
  - Backend APIs: `/api/seller/promote-product`, `/api/seller/my-promotions`, `/api/seller/promotion-settings`
  - Frontend: New `PromoteProductTab.js` component with purple gradient design
  - Features:
    - 24-hour promotion duration
    - 1,000 SYP cost per product
    - Optional discount (0-50%)
    - Automatic wallet deduction
    - No admin approval needed (instant)
  - Updated bottom nav: "فلاش" → "روّج" with Rocket icon

### March 2026 - Session 3 (30 Mar 2026)
- ✅ **Fixed Address Backend Schema** - Added `address_details` and `landmark` fields to Pydantic model
  - File: `/app/backend/models/schemas.py` - AddressCreate model updated
  - File: `/app/backend/routes/user.py` - create_address and update_address endpoints updated
- ✅ **Backend API Tests Passed** - 7/7 tests passed for new address fields
- ✅ **Food Store Dashboard Improvements**:
  - Added "Flash Sales" (فلاش) tab to bottom navigation bar (5 tabs now)
  - Moved Analytics inside Settings page
  - Bottom bar: الطلبات | الأطباق | فلاش⚡ | المحفظة | الإعدادات
- ✅ **Standardized Seller Dashboards**:
  - Wallet now opens as Modal from top header button (green)
  - Flash Sales tab added for sellers to join admin campaigns (1000 SYP per product)
  - Analytics moved inside Settings tab
  - Removed redundant "+ Add" button from Product Seller header
  - Fixed store image sizes for consistency

### March 2026 - Session 2 (29 Mar 2026)
- ✅ **UltraMsg WhatsApp API Integration** - Ready for activation ($39/month)
  - Service file: `/app/backend/services/whatsapp_service.py`
  - Endpoints: `/api/auth/send-whatsapp-otp`, `/api/auth/verify-whatsapp-otp`
  - Instance ID: 167761, Token saved in `.env`
- ✅ **Fixed Image Upload Bug** - Second image upload via "+" button now works
  - Added `validateAndEnhanceImage` import
  - Fixed undefined state variables
- ✅ **Fixed Product Preview Modal** - Swipe gesture to change images
- ✅ **Fixed All API Endpoints** - Added `/api` prefix to 100+ endpoints across all files
- ✅ **Fixed "Order Ready for Shipping" Button** - Corrected endpoint path
- ✅ **Fixed Store Settings** - Logo, latitude, longitude now save and load correctly
- ✅ **Packaging Guide Tab** - Full content moved from separate page to bottom nav tab
- ✅ **Removed "Packaging Guide" button** from Settings (no longer needed)
- ✅ **"Browse as Customer" button** - Changed to orange color
- ✅ **Store Logo in Header** - Updates immediately when changed in settings
- ✅ **GPS Location Handler** - Shows error message and "Open Settings" button when GPS is off
- ✅ **Order Label Print** - Fixed order code to match display (last 6 chars)
- ✅ **WhatsApp Support Number** - Added `0945570365` to:
  - About page (green card with direct link)
  - Orders page (floating help button)
  - Order tracking page (floating help button)
  - WhatsApp floating button (default number)
  - Backend settings
- ✅ **Python Code Cleanup** - Fixed 539 lint errors (unused variables, bare except, etc.)

### March 2026 - Food Store Dashboard Parity (29 Mar 2026)
- ✅ **Added Product Approval Status Badges to Food Store Dashboard** (`FoodStoreDashboard.js`)
  - Yellow badge (بانتظار الموافقة) for pending products
  - Green badge (نشط) for approved products  
  - Red badge (مرفوض) for rejected products with rejection reason displayed
- ✅ **Conditional action buttons based on approval status:**
  - Pending: Edit + Delete only (no visibility toggle)
  - Approved: Edit + Delete + Show/Hide toggle
  - Rejected: "Edit & Resubmit" + Delete (no visibility toggle)
- ✅ Created test food seller account (`0966666666` / `food123`) with store "مطعم الشام للمأكولات"

### December 2024 - UI/UX Fixes (28 Dec 2024)
- ✅ Fixed seller bottom navigation bar position (`bottom-0` + `safe-area-inset-bottom`)
- ✅ Fixed AddProductModal scroll issue - prevented scroll leaking to background page (`overscroll-contain`)
- ✅ Fixed ImageBackgroundSelector mobile sizing - proper mobile-first design with slide-up animation
- ✅ Fixed product shadow positioning - shadow now renders closer to product image
- ✅ Improved modal animations for mobile - changed from scale to slide-up
- ✅ **Translated all error messages to Arabic** - Added validation exception handler in server.py and error translation in errorHelpers.js

### Earlier December 2024
- ✅ Full e-commerce platform (React + FastAPI + MongoDB)
- ✅ Capacitor Android wrapper with native integrations
- ✅ GPS permissions and location tracking for delivery
- ✅ Android hardware back-button handling for modals
- ✅ Delivery driver order management (available/my orders)
- ✅ Fixed scroll position preservation in DeliveryPages
- ✅ Google Play Store listing preparation
- ✅ Domain purchased: `trendsyria.app`
- ✅ **Target API Level updated to 35** (required for Play Store)

---

## Prioritized Backlog

### P0 - Blockers
- [ ] Google Identity Verification (Waiting on Google Support response - 1-3 days)

### P1 - High Priority
- [ ] Granular permissions for sub-admins (orders manager, products manager roles)
- [ ] Live payment verification for Sham Cash (`backend/services/payment_providers.py`)
- [ ] UltraMsg WhatsApp OTP Activation (requires $39 subscription payment)

### P2 - Medium Priority
- [ ] Improve price display formatting (e.g., 9375 → 9.4K)
- [ ] iOS app development

---

## Technical Architecture

```
/app/
├── backend/           # FastAPI server
│   └── routes/
│       ├── auth.py
│       └── delivery.py
└── frontend/          # React + Capacitor
    ├── android/
    │   └── variables.gradle  # API 35 configured
    └── src/
        ├── hooks/useBackButton.js
        ├── pages/
        └── components/
```

## Key Integrations
- Namecheap (Domain)
- Google Play Console
- GitHub Actions (CI/CD)
- PhotoRoom/rembg (Background removal)

## Test Credentials (Preview)
- Delivery Driver: `0911222333` / `test123`
- Seller 1: `0922222222` / `seller123`
- Seller 2: `0911444555` / `seller123`
- Food Seller: `0966666666` / `food123` (Store: مطعم الشام للمأكولات)

---

## Files Modified (30 Mar 2026)
- `/app/frontend/src/pages/FoodStoreDashboard.js` - Added NotificationsDropdown to header (standardized with SellerPages)
- `/app/backend/models/schemas.py` - Added address_details and landmark to AddressCreate
- `/app/backend/routes/user.py` - Updated create_address and update_address to save new fields
- `/app/frontend/src/pages/SellerPages.js` - UI refactored (Wallet Modal, Flash Sales Tab)
- `/app/backend/routes/orders.py` - Added flash sales APIs
- `/app/frontend/src/components/seller/SellerFlashSalesTab.js` - Created for flash sales

## Files Modified (29 Mar 2026)
- `/app/frontend/src/pages/FoodStoreDashboard.js` - Added approval status badges and conditional buttons

## Files Modified (28 Dec 2024)
- `/app/frontend/src/pages/SellerPages.js` - Fixed bottom bar position
- `/app/frontend/src/components/seller/AddProductModal.js` - Fixed scroll leaking
- `/app/frontend/src/components/seller/ImageBackgroundSelector.js` - Fixed mobile sizing
- `/app/frontend/src/components/seller/SimpleImageCapture.js` - Fixed shadow position
- `/app/backend/server.py` - Added Arabic validation error handler
- `/app/backend/routes/wallet.py` - Fixed withdraw endpoint to accept JSON body
- `/app/frontend/src/utils/errorHelpers.js` - Added error message translation
