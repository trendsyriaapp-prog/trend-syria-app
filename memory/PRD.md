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

#### AI Chatbot for Guest Users - FIXED
- **Issue**: AI Chatbot was returning error for unauthenticated (guest) users
- **Root Cause**: `/api/ai-chatbot/send` endpoint was using `get_current_user` which requires authentication
- **Fix**: Changed to `get_optional_user` to allow both authenticated and guest users
- **Files Modified**: `/app/backend/routes/ai_chatbot.py`
- **Testing**: Verified with curl - chatbot now responds correctly for guests

### ✅ COMPLETED (Earlier March 2026)

#### Shadow Position Fix
- **Issue**: Product shadow was positioned too far from the product base
- **Fix**: Changed shadow CSS from `top: 90%` to `bottom: 0` with `transformOrigin: center top`
- **Result**: Shadow now attaches directly to product base with proper skew effect
- **File Modified**: `/app/frontend/src/components/seller/SimpleImageCapture.js`

#### PhotoRoom Credits Display for Admin - VERIFIED
- **Feature**: Admin can now see PhotoRoom API credit balance
- **Backend**: `GET /api/image/photoroom-credits` endpoint returns credit info
- **Frontend**: `ImageSettingsTab.js` displays credits with visual indicators

#### Enhanced Image Editor with Adjustments & Shadow
- **Features**:
  - Image Adjustments Panel (brightness, contrast, saturation)
  - Shadow options (none, soft, strong)
  - Center alignment guides
  - Zoom constraints (0.5x - 1.3x)
  - Drag to move product
  - Rotation slider (0-360 degrees)
- **File**: `/app/frontend/src/components/seller/SimpleImageCapture.js`

#### Platform Closure Controls
- Admin can close platform for customers and/or sellers separately
- Backend endpoints and frontend UI implemented
- **Files**: `/app/backend/routes/admin.py`, `/app/frontend/src/components/admin/PlatformSettingsTab.js`

#### Food Product Approval Flow
- Backend endpoints for approving/rejecting food items
- Notifications sent to sellers on approval/rejection

---

## Prioritized Backlog

### P0 - Critical
- None currently ✅

### P1 - High Priority
- [ ] Live payment verification for Sham Cash (waiting for account details)

### P2 - Medium Priority
- [ ] Cross-Governorate Shopping
- [ ] VoIP call button for customer-driver communication
- [ ] Improve price display (e.g., `9.4K` instead of `9,375`)

### P3 - Future
- [ ] Convert web app to mobile app for app stores

---

## Key API Endpoints
- `POST /api/ai-chatbot/send` - Send message to AI chatbot (supports guests)
- `POST /api/chatbot/send` - Send message to FAQ chatbot (supports guests)
- `GET /api/admin/platform-status` - Get platform open/closed status
- `POST /api/admin/food-products/{id}/approve` - Approve food item

## Test Credentials
- **Product Seller**: Phone: `0922222222`, Password: `seller123`
- **Food Seller**: Phone: `0944444444`, Password: `food123`
- **Driver**: Phone: `0977777777`, Password: `driver123`
- **Admin**: Phone: `0912345678`, Password: `admin123`

## Important Notes
- AI Chatbot now works for both authenticated users and guests
- PhotoRoom API key may not be active - app automatically falls back to free rembg
- Image editor shadow is a CSS-based effect, also rendered on canvas for final output
- All backend routes must be prefixed with `/api` for proper Kubernetes ingress routing
