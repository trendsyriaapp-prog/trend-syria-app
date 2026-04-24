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

### Phase 26 (Previous Session)
- Removed 4 unused imports from `food_orders.py`

### Phase 27 (Dec 2025)
- Replaced 5 duplicate MongoDB queries with helper functions
- Enhanced `get_order_for_driver` to support `statuses` parameter
- File size: 4300 → 4274 lines (-26)
- Tests: 23/23 passed

### Phase 28 (Dec 2025)
- Replaced 3 duplicate Haversine calculations with `calculate_distance_km`
- File size: 4274 → 4247 lines (-27)
- Tests: 20/20 passed

### Phase 29 (Dec 2025)
- Removed unused `import math`
- Simplified local `calculate_distance` function to delegate to helper
- File size: 4247 → 4239 lines (-8)
- Tests: 19/19 passed

### Frontend Refactoring (Previous Session)
- `OrdersMap.js`: 2273 → 1902 lines
- Extracted `fetchDriverEarnings`, `fetchSingleRoute`, `fetchOptimizedRoute` to `MapHelpers.js`

---

## Current File Sizes
| File | Lines | Status |
|------|-------|--------|
| `food_orders.py` | 4239 | In Progress |
| `food_order_helpers.py` | 1258 | Helpers extracted |
| `admin.py` | 4746 | Pending |
| `OrdersMap.js` | 1902 | Done |
| `MapHelpers.js` | Expanded | Done |

---

## Prioritized Backlog

### P0 - Critical (Refactoring)
- [ ] Continue `food_orders.py` refactoring
  - Replace 27 remaining `datetime.now().isoformat()` with `get_now()`
  - Extract notification creation pattern (18 occurrences)
- [ ] Start `admin.py` refactoring (4746 lines)

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
- Backend Models: `/app/backend/routes/food_order_models.py`
- Frontend Map: `/app/frontend/src/components/delivery/OrdersMap.js`
- Frontend Helpers: `/app/frontend/src/components/delivery/MapHelpers.js`

---

## Test Reports
- Latest: `/app/test_reports/iteration_197.json` (19/19 passed)
- All iterations: `/app/test_reports/iteration_{176-197}.json` (100% pass rate)

---

*Last Updated: December 2025*
