# Trend Syria - E-Commerce App PRD

## Overview
Full-stack e-commerce application for Syria market with Android/Capacitor, React, FastAPI, and MongoDB.

## Current Status: Production (Google Play Closed Testing)
- Live Website: https://trendsyria.app
- Android App: v1.0.12 (versionCode: 12) in Closed Testing (Alpha)

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
