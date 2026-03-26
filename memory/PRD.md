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

### December 2024
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
- [ ] Google Identity Verification (Waiting on Google Support response)

### P1 - High Priority
- [ ] Granular permissions for sub-admins (orders manager, products manager roles)
- [ ] Live payment verification for Sham Cash (`backend/services/payment_providers.py`)

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
- Seller: `0911444555` / `test123`
