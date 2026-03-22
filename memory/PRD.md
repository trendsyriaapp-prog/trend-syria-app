# Trend Syria - Multi-Vendor E-Commerce & Food Delivery Platform

## Original Problem Statement
Build a multi-vendor e-commerce and food delivery application with a sophisticated coordination system between sellers and drivers.

## Core Requirements
1. **Syrian Payment Provider Integration**: Transition from sandbox to real payment (Sham Cash, Bank Cards) - DEFERRED
2. **Wallet Top-Up Automation**: Automate wallet top-ups via transaction ID verification
3. **Currency Update**: Adjust hardcoded amounts to the new Syrian currency
4. **Seller Dashboard UI/UX Overhaul**: Redesign seller dashboards into single, integrated pages
5. **Driver-Seller Coordination**: Workflow for food orders where seller requests driver, driver accepts, seller sets prep time

## User Personas
- **Buyers**: Browse products, place orders, track deliveries
- **Product Sellers**: Manage inventory, process orders, track earnings
- **Food Sellers**: Manage menu items, coordinate with drivers for delivery
- **Drivers**: Accept delivery requests, navigate to pickup/delivery locations
- **Admins**: Manage users, oversee platform operations

## Tech Stack
- **Frontend**: React with Tailwind CSS, Shadcn UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: JWT-based authentication

---

## What's Been Implemented

### ✅ COMPLETED (March 22, 2026 - Latest Session)

#### PhotoRoom API Integration for Professional Image Processing
- **New Integration**: Replaced Remove.bg with PhotoRoom API for superior quality
- **Features Implemented**:
  - Full screen image display on mobile devices
  - Background removal with PhotoRoom API ($0.02/image)
  - 4 shadow types: بدون (none), ناعم (soft), حاد (hard), عائم (floating)
  - 10 background colors
  - 12 pre-built 3D templates
  - Adjustment sliders (brightness, contrast, saturation)
  - Fallback to Remove.bg/rembg if PhotoRoom fails
- **API Endpoints Added**:
  - `POST /api/image/process-photoroom` - Main processing endpoint
  - `GET /api/image/shadows` - Get available shadow types
  - `GET /api/image/status` - Check service availability
- **Files Created/Modified**:
  - `/app/backend/services/photoroom.py` (NEW)
  - `/app/backend/routes/image_processing.py` (MODIFIED)
  - `/app/frontend/src/components/seller/SimpleImageCapture.js` (MODIFIED)
  - `/app/backend/.env` - Added PHOTOROOM_API_KEY

#### Platform Wallet for Admin
- New collection `platform_wallet` to store platform earnings
- API endpoints: GET /api/admin/platform-wallet, GET /api/admin/platform-wallet/transactions, POST /api/admin/platform-wallet/withdraw
- UI component: PlatformWalletTab.js showing balance, commissions breakdown, transactions log
- Auto-collection of commissions when orders are completed (both products and food)

#### Sound Notifications for All Sellers
- Modified SellerPages.js to enable sound notifications for product sellers (was only food sellers)
- Auto-refresh every 30 seconds for all seller types

### ✅ COMPLETED (Earlier March 2026)

#### Driver-Seller Coordination Flow
- Backend APIs for driver request/accept workflow
- Frontend UIs for sellers and drivers
- Preparation time synchronization

#### Seller Dashboard Overhaul
- Separated "Orders" and "Products/Dishes" into distinct tabs
- "Orders" is the default view for both seller types
- Added "Packaging Guidelines" tab for product sellers

#### UI/UX Enhancements
- **Availability Toggle**: Clear text ("متاح"/"إظهار"), distinct colors, badge for hidden items
- **Mandatory Location Fields**: Address and map location required in settings
- **Edit Product Modal**: Fixed to correctly load data and show proper title
- **Product Preview Modal**: Shows description, store name, and category

#### Bug Fixes
- Fixed login issues (database name mismatch)
- Fixed React runtime error with centralized error handling
- Added missing Authorization headers to all API calls
- Fixed backend order status update logic
- Created new endpoint `GET /orders/seller/my-orders`

#### Test Data
- Created 8 test orders with various statuses for product seller

---

## Prioritized Backlog

### P0 - Critical
- None currently

### P1 - High Priority
- [ ] Live payment verification for Sham Cash (waiting for account details)
- [ ] Delete old unused image components after confirming SimpleImageCapture is stable:
  - `/app/frontend/src/components/seller/CameraGuideModal.js`
  - `/app/frontend/src/components/seller/ImageEditorModal.js`
  - `/app/frontend/src/components/seller/ProImageProcessor.js`

### P2 - Medium Priority
- [ ] Cross-Governorate Shopping
- [ ] VoIP call button for customer-driver communication
- [ ] Improve price display (e.g., `9.4K` instead of `9,375`)

### P3 - Future
- [ ] Convert web app to mobile app for app stores

---

## Key API Endpoints
- `GET /api/orders/seller/my-orders` - Fetch seller's orders
- `POST /api/store/orders/{order_id}/request-driver` - Request driver for order
- `POST /api/driver/orders/{order_id}/accept` - Driver accepts order
- `POST /api/store/orders/{order_id}/set-preparation-time` - Set prep time
- `POST /api/orders/{order_id}/seller/{action}` - Order status actions
- `PUT /api/products/{product_id}` - Update product
- `POST /api/image/process-pro` - Professional image processing with background removal
- `GET /api/templates/list` - Get available 3D templates
- `POST /api/templates/apply-free` - Apply free 3D template to image

## Key Database Schema
- **food_orders**: `driver_request_status`, `driver_accepted_at`, `accepted_by_driver_id`, `seller_prep_time_minutes`, `estimated_ready_at`
- **products**: `is_available` boolean field
- **orders**: Handles both `buyer_id` and `user_id` for compatibility
- **stores**: Requires `address`, `latitude`, `longitude`

## Test Credentials
- **Product Seller**: Phone: `0922222222`, Password: `test123456`

## Critical Implementation Notes
- Always include `Authorization: Bearer ${token}` in API calls
- Use `getErrorMessage` from `/app/frontend/src/utils/errorHelpers.js` for error handling
- Backend handles both `user_id` and `buyer_id` for compatibility
