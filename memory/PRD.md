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

### food_orders.py
- ✅ Replaced ALL `datetime.now().isoformat()` with `get_now()` (27+ → 0)
- ✅ Replaced duplicate MongoDB queries with helpers
- ✅ Replaced Haversine calculations with `calculate_distance_km`
- ✅ Removed `import math`
- **Size**: 4435 → 4248 lines

### admin.py
- ✅ Added `get_now()` helper function
- ✅ Replaced 58 `datetime.now().isoformat()` with `get_now()`
- ✅ Added `insert_notification()` helper function
- ✅ Replaced 20 duplicate notification inserts with helper
- ✅ Fixed 4 return type annotation bugs (-> dict to -> list)
- **Size**: 4751 → 4703 lines (-48 lines)

### Frontend
- ✅ `OrdersMap.js`: 2273 → 1902 lines
- ✅ Extracted helpers to `MapHelpers.js`

---

## Bug Fixes (Dec 2025)
1. ✅ Phone number hidden behind icon
2. ✅ Image upload X button + red/green colors
3. ✅ Address text change
4. ✅ Location button position (inside map - top-20)
5. ✅ Sham Cash character limit removed
6. ✅ Password eye icon issue (z-10, pl-12)
7. ✅ Admin API errors (return types fixed)

---

## Current File Sizes
| File | Lines | Status |
|------|-------|--------|
| `food_orders.py` | 4248 | ✅ Complete |
| `food_order_helpers.py` | 1258 | Helpers |
| `admin.py` | 4703 | ✅ Complete |
| `OrdersMap.js` | 1902 | ✅ Complete |

---

## Prioritized Backlog

### P0 - Critical
- [x] Complete datetime.now() refactoring
- [x] Extract notification pattern

### P1 - High Priority
- [ ] Activate real SMS OTP for Syrian numbers (mocked to `123456`)
- [ ] Activate Sham Cash payment gateway (mocked)
- [ ] Add granular permissions for sub-admins

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
- Latest: `/app/test_reports/iteration_202.json` (22/22 passed)

*Last Updated: December 2025*
