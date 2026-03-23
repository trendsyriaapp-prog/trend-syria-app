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

### ✅ COMPLETED (March 23, 2026 - Latest Session)

#### Shadow Position Fix
- **Issue**: Product shadow was positioned too far from the product base
- **Fix**: Changed shadow CSS from `top: 90%` to `bottom: 0` with `transformOrigin: center top`
- **Result**: Shadow now attaches directly to product base with proper skew effect
- **File Modified**: `/app/frontend/src/components/seller/SimpleImageCapture.js` (lines 415-438)

#### PhotoRoom Credits Display for Admin - VERIFIED
- **Feature**: Admin can now see PhotoRoom API credit balance
- **Backend**: `GET /api/image/photoroom-credits` endpoint returns credit info
- **Frontend**: `ImageSettingsTab.js` displays credits with visual indicators
- **Fallback**: Shows "لا يوجد رصيد" message when API key not active, with note that app uses free rembg fallback
- **Files**:
  - `/app/backend/routes/image_processing.py` (endpoint at line 893-898)
  - `/app/frontend/src/components/admin/ImageSettingsTab.js` (display at lines 150-239)

### ✅ COMPLETED (Earlier March 2026)

#### Enhanced Image Editor with Adjustments & Shadow
- **Features**:
  - Image Adjustments Panel (brightness, contrast, saturation)
  - Shadow options (none, soft, strong)
  - Center alignment guides
  - Zoom constraints (0.5x - 1.3x)
  - Drag to move product
- **File**: `/app/frontend/src/components/seller/SimpleImageCapture.js`

#### PhotoRoom API Integration
- **New Integration**: PhotoRoom API for professional background removal
- **Fallback**: rembg local library when PhotoRoom unavailable
- **API Endpoints**:
  - `POST /api/image/process-photoroom` - Main processing
  - `GET /api/image/shadows` - Shadow types
  - `GET /api/image/status` - Service status
  - `GET /api/image/photoroom-credits` - Credit balance

#### Platform Wallet for Admin
- Collection `platform_wallet` for platform earnings
- API endpoints for wallet management
- UI component: `PlatformWalletTab.js`

#### Driver-Seller Coordination Flow
- Backend APIs for driver request/accept workflow
- Frontend UIs for sellers and drivers

---

## Prioritized Backlog

### P0 - Critical
- None currently

### P1 - High Priority
- [ ] Live payment verification for Sham Cash (waiting for account details)
- [ ] Delete old unused image components after confirming SimpleImageCapture is stable

### P2 - Medium Priority
- [ ] Cross-Governorate Shopping
- [ ] VoIP call button for customer-driver communication
- [ ] Improve price display (e.g., `9.4K` instead of `9,375`)

### P3 - Future
- [ ] Convert web app to mobile app for app stores

---

## Key API Endpoints
- `GET /api/orders/seller/my-orders` - Fetch seller's orders
- `POST /api/image/process-photoroom` - Process image with PhotoRoom
- `GET /api/image/photoroom-credits` - Get PhotoRoom credit balance
- `POST /api/auth/login` - User authentication

## Test Credentials
- **Product Seller**: Phone: `0922222222`, Password: `seller123`
- **Admin**: Phone: `0912345678`, Password: `admin123`

## Important Notes
- PhotoRoom API key may not be active - app automatically falls back to free rembg
- Image editor shadow is a CSS-based effect, also rendered on canvas for final output
- All backend routes must be prefixed with `/api` for proper Kubernetes ingress routing
