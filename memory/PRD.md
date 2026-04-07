# Trend Syria - E-Commerce App PRD

## Overview
Full-stack e-commerce application for Syria market with Android/Capacitor, React, FastAPI, and MongoDB.

## Current Status: Production (Google Play Closed Testing)
- Live Website: https://trendsyria.app
- Android App: v1.0.8 in Closed Testing (Alpha)

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

### 2026-04-07: Comprehensive Deep-Dive Bug Fixes ✅
**Problem 1:** Missing `import logging` causing 500 errors on exception handling
**Fix:** Added `import logging` to `auth.py`, `orders.py`, `food_orders.py`

**Problem 2:** 404 errors on placeholder images (via.placeholder.com blocked by ORB)
**Fix:** 
- Created `/placeholder.svg` in public folder
- Updated 23 files to use `/placeholder.svg` instead of `via.placeholder.com`
- Fixed `LazyImage.js` to properly fallback to `/placeholder.svg` on error

**Files Fixed:**
- Backend: `auth.py`, `orders.py`, `food_orders.py` (logging imports)
- Frontend: `ProductCard.js`, `DailyDeal.js`, `AllFoodStoresPage.js`, `LazyImage.js`, `GiftModal.js`, `EditProductModal.js`, `StatDetailsModal.js`, `SellerAdsTab.js`, `SellerProductsGrid.js`, `SellerAdAnalytics.js`, `FeaturedProducts.js`, `RecommendedProducts.js`, `AdsTab.js`, `PendingProductsTab.js`, `ProductsTab.js`, `DailyDealsTab.js`, `LowStockTab.js`, `AnalyticsDashboard.js`, `CartPage.js`, `SellerPages.js`, `StorePage.js`, `FavoritesPage.js`, `ProductDetailPage.js`, `OrdersPage.js`

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
