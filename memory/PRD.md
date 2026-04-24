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

### admin.py (IN PROGRESS)
- ✅ Added `get_now()` helper function
- ✅ Added `insert_notification()` helper (replaced 20 usages)
- ✅ Added `require_admin_user` dependency
- ✅ Added `require_main_admin` dependency
- ✅ Replaced 16 permission checks with dependencies
- **Remaining**: 59 manual permission checks
- **Size**: 4751 → 4662 lines (-89)

### Frontend ✅ COMPLETE
- `OrdersMap.js`: 2273 → 1902 lines
- Fixed GPS button position in map (top-20)

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
| File | Original | Current | Saved |
|------|----------|---------|-------|
| `food_orders.py` | 4435 | 4248 | -187 |
| `admin.py` | 4751 | 4662 | -89 |
| `OrdersMap.js` | 2273 | 1902 | -371 |
| **Total** | | | **-647** |

---

## Prioritized Backlog

### P0 - Critical
- [x] Add admin dependencies
- [ ] Replace remaining 59 permission checks with dependencies

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
- Latest: `/app/test_reports/iteration_204.json` (24/24 passed)

*Last Updated: December 2025*
