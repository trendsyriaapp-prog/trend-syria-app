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

## In Progress / Upcoming Tasks

### P1 - High Priority
- [ ] **Sham Cash Integration** - Activate real payment gateway (currently MOCKED)
- [ ] **Sub-admin Permissions** - Granular roles ("Order Manager", "Product Manager")

### P2 - Medium Priority
- [ ] Secure localStorage → httpOnly cookies (High-risk refactor, deferred)

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
- `/app/backend/routes/rate_limits.py` - Rate limit API routes
- `/app/frontend/src/components/admin/RateLimitDashboard.js` - Admin dashboard
- `/app/frontend/src/lib/logger.js` - Production logging utility
- `/app/backend/tests/conftest.py` - Test fixtures

## API Endpoints
- `GET /api/rate-limits/stats` - Rate limit statistics
- `GET /api/rate-limits/alert-config` - Alert configuration
- `POST /api/rate-limits/test-alert` - Test security alert

## Test Credentials
- Super Admin: `0945570365`
- OTP Test Code: `123456`

## 3rd Party Integrations
- Firebase Admin (Push Notifications)
- UptimeRobot (VPS monitoring)
- Cloudflare (DNS, SSL, R2 CDN)
- Sham Cash (MOCKED - pending activation)

## Known Issues
- Geographic block (Syria) - Users use VPN to access Emergent preview
- Database shows "disconnected" in preview environment (normal behavior)

## Notes
- Always communicate with user in Arabic (العربية)
- MONGO_URL in preview can be swapped to localhost for testing, but must be reverted
