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

## Completed Refactoring Work

### food_orders.py ✅ COMPLETE
- Replaced ALL `datetime.now().isoformat()` with `get_now()`
- Replaced duplicate MongoDB queries with helpers
- Created `require_delivery_user` dependency
- **Size**: 4435 → 4248 lines (-187)

### admin.py ✅ COMPLETE (Phase 37)
- ✅ Added `get_now()` helper function
- ✅ Added `insert_notification()` helper (replaced 20 usages)
- ✅ Added `require_admin_user` dependency (~50 endpoints)
- ✅ Added `require_main_admin` dependency (~20 endpoints)
- ✅ Replaced ALL ~70 manual permission checks with dependencies
- ✅ Fixed return type bug in `get_all_flash_sales` (dict → list)
- **Size**: 4751 → 4419 lines (-332)

### Frontend ✅ COMPLETE
- `OrdersMap.js`: 2273 → 1902 lines (-371)
- Fixed GPS button position in map (top-20)

---

## Bug Fixes (Dec 2025)
1. ✅ Phone number hidden behind icon
2. ✅ Image upload X button + red/green colors
3. ✅ Address text change
4. ✅ Location button position (inside map)
5. ✅ Sham Cash character limit removed
6. ✅ Password eye icon issue
7. ✅ Admin API errors (return types fixed)

---

## Current File Sizes
| File | Original | Current | Saved |
|------|----------|---------|-------|
| `food_orders.py` | 4435 | 4248 | -187 |
| `admin.py` | 4751 | 4419 | -332 |
| `OrdersMap.js` | 2273 | 1902 | -371 |
| **Total** | | | **-890** |

---

## Dependencies Created
| Dependency | File | Usage Count |
|------------|------|-------------|
| `require_admin_user` | admin.py | ~50 |
| `require_main_admin` | admin.py | ~20 |
| `require_delivery_user` | food_orders.py | 23 |

---

## Prioritized Backlog

### P0 - Critical
- [x] Add admin dependencies
- [x] Replace ALL 70 permission checks in admin.py ✅

### P1 - High Priority
- [ ] Activate real SMS OTP for Syrian numbers (mocked to `123456`)
- [ ] Activate Sham Cash payment gateway (mocked)

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

## Test Reports
- Latest: `/app/test_reports/iteration_206.json` (22/22 passed - 100% success)
- Previous: `/app/test_reports/iteration_205.json`

*Last Updated: December 2025 - Phase 37 Complete*
