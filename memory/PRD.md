# Trend Syria - E-Commerce App PRD

## Overview
Full-stack e-commerce application for Syria market with Android/Capacitor, React, FastAPI, and MongoDB.

## Current Status: Production (Google Play Closed Testing)
- Live Website: https://trendsyria.app
- Android App: v1.0.10 (versionCode: 11) in Closed Testing (Alpha)

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
