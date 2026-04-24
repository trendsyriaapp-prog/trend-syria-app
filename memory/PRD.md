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
4. ✅ Location button position - Moved above address field
5. ✅ Sham Cash character limit - Removed maxLength restriction
6. ✅ Password eye icon issue - Added z-10 and pl-12 padding
7. ✅ Admin API error - Fixed return type from dict to list

### Phase 26-29 (Previous Session)
- Removed unused imports from `food_orders.py`
- Replaced 5 duplicate MongoDB queries with helpers
- Replaced Haversine calculations with `calculate_distance_km`
- Removed `import math`

### Phase 30 (Dec 2025)
- Replaced 18+ `datetime.now(timezone.utc).isoformat()` with `get_now()` helper
- Remaining 9 usages are for datetime objects (comparison, not string conversion)
- Tests: 11/11 passed

### Frontend Refactoring (Previous Session)
- `OrdersMap.js`: 2273 → 1902 lines
- Extracted helpers to `MapHelpers.js`

---

## Current File Sizes
| File | Lines | Status |
|------|-------|--------|
| `food_orders.py` | 4245 | In Progress |
| `food_order_helpers.py` | 1258 | Helpers extracted |
| `admin.py` | 4746 | Pending (Next target) |
| `OrdersMap.js` | 1902 | Done |

---

## Prioritized Backlog

### P0 - Critical (Refactoring)
- [ ] Start `admin.py` refactoring (4746 lines - largest file)
- [ ] Apply same methodology: gradual extraction → test → zero errors

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

---

## Test Reports
- Latest: `/app/test_reports/iteration_199.json` (11/11 passed)
- Bug fixes: `/app/test_reports/iteration_198.json` (100% pass)

---

*Last Updated: December 2025*
