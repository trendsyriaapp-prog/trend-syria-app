# Trend Syria - E-commerce Application PRD

## Original Problem Statement
استكمال تطبيق التجارة الإلكترونية "ترند سوريا" (Trend Syria) وتجهيزه للإطلاق العام.
تطبيق تجارة إلكترونية متكامل يتطلب تحسينات أداء، نظام مصادقة آمن، أدوات تحكم للإدارة، وإعادة هيكلة (Refactoring) للملفات الضخمة المعقدة لضمان الاستقرار باستخدام منهجية (صفر أخطاء - استخراج تدريجي).

## Architecture
- **Frontend**: React.js
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: JWT + OTP

## Refactoring Methodology
**استخراج تدريجي → اختبار → التأكد من صفر أخطاء**
- Make tiny extractions (one helper function or removing unused imports)
- Run linter
- Test using testing_agent_v3_fork
- Ensure 100% test pass before next step

---

## Completed Work

### Bug Fixes Session (Dec 2025)
Fixed 7 bugs reported by user:
1. ✅ Phone number hidden behind icon - Added pr-14 padding
2. ✅ Image upload X button not working - Fixed handler + added red/green colors
3. ✅ Address text change - Updated to new message
4. ✅ Location button position (inside map) - Moved to top-20
5. ✅ Sham Cash character limit - Removed maxLength restriction
6. ✅ Password eye icon issue - Added z-10 and pl-12 padding
7. ✅ Admin API error - Fixed return type from dict to list

### Phase 31 - food_orders.py Complete (Dec 2025)
- Replaced ALL `datetime.now().isoformat()` with `get_now()`
- Final count: 0 datetime.now().isoformat(), 21 get_now() usages
- Tests: 10/10 passed

### Phase 32 - admin.py Complete (Dec 2025)
- Added `get_now()` helper function
- Replaced 58 `datetime.now().isoformat()` calls with `get_now()`
- Fixed 3 return type annotation bugs (-> dict to -> list)
- Final count: 0 datetime.now().isoformat(), 60 get_now() usages
- Tests: 19/19 passed

### Earlier Refactoring (Previous Sessions)
- `OrdersMap.js`: 2273 → 1902 lines
- `food_orders.py`: 4435 → 4248 lines
- Extracted helpers to `food_order_helpers.py` and `MapHelpers.js`

---

## Current File Sizes
| File | Lines | Status |
|------|-------|--------|
| `food_orders.py` | 4248 | ✅ Complete |
| `food_order_helpers.py` | 1258 | Helpers extracted |
| `admin.py` | 4751 | ✅ Complete (datetime refactoring) |
| `OrdersMap.js` | 1902 | ✅ Complete |

---

## Prioritized Backlog

### P0 - Critical (Refactoring)
- [x] Complete datetime.now() refactoring in food_orders.py
- [x] Complete datetime.now() refactoring in admin.py
- [ ] Extract notification creation pattern (24 occurrences in admin.py)

### P1 - High Priority
- [ ] Activate real SMS OTP for Syrian numbers (currently mocked to `123456`)
- [ ] Activate Sham Cash payment gateway (currently mocked)
- [ ] Add granular permissions for sub-admins

### P2 - Medium Priority
- [ ] Performance optimizations
- [ ] Error handling improvements

### P5 - Future Tasks
- [ ] Agent/Remittance Office top-up system
- [ ] Email login option

---

## Mocked Services
1. **SMS OTP**: Always returns `123456` for testing
2. **Sham Cash Payment**: Gateway responses are mocked

---

## Test Credentials
- Super Admin: `0945570365` / `TrendSyria@2026`
- OTP Code: `123456`

---

## Key Files Reference
- Backend Routes: `/app/backend/routes/food_orders.py`
- Backend Helpers: `/app/backend/routes/food_order_helpers.py`
- Backend Admin: `/app/backend/routes/admin.py`
- Frontend Map: `/app/frontend/src/components/delivery/OrdersMap.js`
- Frontend Map Modal: `/app/frontend/src/components/FullScreenMapPicker.js`

---

## Test Reports
- Latest: `/app/test_reports/iteration_201.json` (19/19 passed)
- Phase 31: `/app/test_reports/iteration_200.json` (10/10 passed)

---

*Last Updated: December 2025*
