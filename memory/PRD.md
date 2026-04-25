# Trend Syria - E-commerce Application PRD

## Original Problem Statement
استكمال تطبيق التجارة الإلكترونية "ترند سوريا" (Trend Syria) وتجهيزه للإطلاق العام.

## Architecture
- **Frontend**: React.js
- **Backend**: FastAPI (Python)  
- **Database**: MongoDB
- **Authentication**: JWT + OTP

## Refactoring Methodology
**استخراج تدريجي → اختبار → التأكد من صفر أخطاء**

---

## ✅ COMPLETED - Backend Refactoring Phase (December 2025)

### Phase 41 COMPLETE - Authorization Dependencies

#### Centralized datetime_helpers.py
- ✅ Created `/app/backend/helpers/datetime_helpers.py`
- ✅ Contains `get_now()` and `get_today()` functions
- ✅ **42 route files** now import from this central location
- ✅ **381 total get_now() usages** across all files
- **All local `get_now()` definitions removed**

#### Authorization Dependencies Summary
| Dependency | Usage Count | Files |
|------------|-------------|-------|
| `require_admin_user` | 146+ endpoints | admin.py, categories.py, settings.py, etc. |
| `require_main_admin` | 70+ endpoints | admin.py, categories.py |
| `require_delivery_user` | 47+ endpoints | food_orders.py, delivery.py |
| `require_seller_user` | Multiple endpoints | auth.py |
| `require_any_seller_user` | Multiple endpoints | auth.py, categories.py, image_templates.py |
| **Total** | **263+ endpoints** | Centralized authorization |

### Files Refactored
- ✅ admin.py: 4751 → 4416 lines (-335)
- ✅ food_orders.py: 4435 → 4248 lines (-187)
- ✅ orders.py: Fixed return types
- ✅ food.py, stores.py: datetime helpers
- ✅ auth.py: seller dependencies + 55 datetime fixes
- ✅ settings.py: 47 datetime fixes
- ✅ delivery.py: 38 datetime fixes
- ✅ wallet.py: 18 datetime fixes
- ✅ categories.py: admin + seller dependencies
- ✅ image_templates.py: seller dependencies
- ✅ 30+ other route files

### Bug Fixes
1. ✅ Phone number hidden behind icon
2. ✅ Image upload X button + red/green colors
3. ✅ Address text change
4. ✅ Location button position (inside map)
5. ✅ Sham Cash character limit removed
6. ✅ Password eye icon issue
7. ✅ Admin API errors (return types fixed)

---

## Test Reports
- **Latest**: `/app/test_reports/iteration_211.json` (16/16 passed - 100% success)
- Previous iterations: 206-210 (all 100% success)

---

## Prioritized Backlog

### P1 - High Priority (Next Tasks)
- [ ] **Activate real SMS OTP** for Syrian numbers (currently mocked to `123456`)
- [ ] **Activate Sham Cash payment gateway** (currently mocked)

### P2 - Medium Priority
- [ ] Add granular permissions for Sub-admins

### P5 - Future Tasks
- [ ] Agent/Remittance Office top-up system
- [ ] Email login option

---

## Mocked Services
1. **SMS OTP**: Returns `123456`
2. **Sham Cash Payment**: Mocked gateway

## Test Credentials
- Super Admin: `0945570365` / `TrendSyria@2026`
- OTP Code: `123456`

---

*Last Updated: December 2025 - Phase 41 Complete (Backend Refactoring DONE)*
