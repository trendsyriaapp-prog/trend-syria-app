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

#### Feedback & Suggestions Feature - NEW ✅
- **Feature**: Universal feedback system for all user types (customers, sellers, drivers, guests)
- **Implementation**:
  - `FeedbackButton.js` - Floating purple button visible on all pages
  - `FeedbackTab.js` - Admin panel tab to manage feedback
  - `feedback.py` - Backend API routes for feedback CRUD
- **User Features**:
  - Choose feedback type: Suggestion, Complaint, or Question
  - Submit feedback message with optional user info
  - Works for both logged-in users and guests
- **Admin Features**:
  - View all feedback with stats (total, pending, reviewed)
  - Filter by status and type
  - Respond to feedback (marks as reviewed)
  - Delete feedback
  - **Push Notifications**: When admin responds, user receives push notification instantly
- **Files Created**:
  - `/app/frontend/src/components/FeedbackButton.js`
  - `/app/frontend/src/components/admin/FeedbackTab.js`
  - `/app/backend/routes/feedback.py`
- **Files Modified**:
  - `/app/frontend/src/App.js` - Added FeedbackButton component
  - `/app/frontend/src/pages/AdminPage.js` - Added FeedbackTab to admin panel
  - `/app/backend/server.py` - Registered feedback router
  - `/app/backend/core/firebase_admin.py` - Added `send_push_to_user()` function
- **Database**: New `feedback` collection with schema:
  ```
  { id, type, type_label, message, user_id?, user_name, user_phone?, 
    user_type, status, admin_response?, created_at, updated_at }
  ```

#### Guest User Protection for Food Cart - COMPLETED
- **Feature**: Guests can browse food stores but cannot add items to cart
- **Implementation**: Added user check in `FoodStorePage.js` addToCart function
- **Behavior**: Shows "يجب تسجيل الدخول" toast when guest tries to add food
- **Files Modified**: 
  - `/app/frontend/src/pages/FoodStorePage.js` - Added user check before adding to cart
  - `/app/frontend/src/pages/FoodCartPage.js` - Added redirect to /food if not logged in

#### AI Chatbot for Guest Users - FIXED
- **Issue**: AI Chatbot was returning error for unauthenticated (guest) users
- **Root Cause**: `/api/ai-chatbot/send` endpoint was using `get_current_user` which requires authentication
- **Fix**: Changed to `get_optional_user` to allow both authenticated and guest users
- **Files Modified**: `/app/backend/routes/ai_chatbot.py`
- **Testing**: Verified with curl - chatbot now responds correctly for guests

### ✅ COMPLETED (Earlier March 2026)

#### Shadow Position Fix
- Shadow now attaches directly to product base with proper skew effect
- **File Modified**: `/app/frontend/src/components/seller/SimpleImageCapture.js`

#### PhotoRoom Credits Display for Admin - VERIFIED
- Admin can now see PhotoRoom API credit balance

#### Enhanced Image Editor with Adjustments & Shadow
- Image Adjustments Panel (brightness, contrast, saturation)
- Shadow options, zoom, rotation slider (0-360 degrees)

#### Platform Closure Controls
- Admin can close platform for customers and/or sellers separately

#### Food Product Approval Flow
- Backend endpoints for approving/rejecting food items

---

## Guest User Experience Summary

### ✅ What Guests CAN Do:
- Browse all products and categories
- Browse all food stores and menus
- Use the AI Chatbot for support
- View product details and prices

### ❌ What Guests CANNOT Do (Requires Login):
- Add products to cart → Shows "يجب تسجيل الدخول"
- Add food items to cart → Shows "يجب تسجيل الدخول"
- Access checkout pages
- Place orders

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
- [ ] Smart product suggestions in chatbot based on user questions

### P3 - Future
- [ ] Convert web app to mobile app for app stores

---

## Key API Endpoints
- `POST /api/feedback` - Submit feedback (supports guests and users)
- `GET /api/feedback/all` - Get all feedback (admin only)
- `POST /api/feedback/{id}/respond` - Respond to feedback (admin only)
- `DELETE /api/feedback/{id}` - Delete feedback (admin only)
- `POST /api/ai-chatbot/send` - Send message to AI chatbot (supports guests)
- `POST /api/chatbot/send` - Send message to FAQ chatbot (supports guests)
- `GET /api/admin/platform-status` - Get platform open/closed status

## Test Credentials
- **Product Seller**: Phone: `0922222222`, Password: `seller123`
- **Food Seller**: Phone: `0944444444`, Password: `food123`
- **Driver**: Phone: `0977777777`, Password: `driver123`
- **Admin**: Phone: `0912345678`, Password: `admin123`

## Important Notes
- AI Chatbot now works for both authenticated users and guests
- Guest users can browse but cannot add to cart (products or food)
- All backend routes must be prefixed with `/api` for proper Kubernetes ingress routing
