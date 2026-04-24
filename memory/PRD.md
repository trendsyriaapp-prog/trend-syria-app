# ترند سوريا - PRD (Product Requirements Document)

## المعلومات الأساسية
- **اسم المشروع**: ترند سوريا (Trend Syria)
- **النوع**: تطبيق تجارة إلكترونية + توصيل طعام
- **التقنيات**: React, FastAPI, MongoDB, Capacitor (Android)

---

## الميزات المُنجزة

### نظام المصادقة ✅
- [x] تسجيل دخول بالهاتف + كلمة مرور
- [x] تسجيل حساب جديد (مشتري/بائع/بائع طعام/موظف توصيل)
- [x] **تدفق OTP الجديد**: التحقق من الرقم قبل إنشاء الحساب (23 أبريل 2026)
  - الخطوة 1: إدخال البيانات → زر "إرسال رمز التحقق"
  - الخطوة 2: إدخال OTP → زر "إنشاء الحساب"
- [x] نسيت كلمة المرور مع OTP
- [x] Cookie-based Authentication (HttpOnly)
- [x] حماية Brute Force

### صفحات المستخدم ✅
- [x] الصفحة الرئيسية مع فصل المنتجات عن الطعام
- [x] البحث والتصفية
- [x] صفحة المنتج التفصيلية
- [x] سلة التسوق
- [x] الطلبات والتتبع
- [x] المحفظة

### لوحة تحكم البائع ✅
- [x] إدارة المنتجات
- [x] إدارة الطلبات
- [x] تحليلات المبيعات

### لوحة تحكم الأدمن ✅
- [x] إدارة المستخدمين
- [x] إدارة الفئات
- [x] إعدادات النظام

---

## ما تم إنجازه حديثاً (24 أبريل 2026)

### 🏗️ إعادة هيكلة Backend: food_orders.py ✅ - 24 أبريل 2026
**الهدف**: تقليل حجم الملف وتحسين قابلية الصيانة

| المرحلة | الوصف | التغيير |
|---------|-------|---------|
| الأصلي | - | 5085 سطر |
| المرحلة 1 | استخراج Helpers + Constants | -249 سطر |
| المرحلة 2 | استخراج Models (Pydantic) | -78 سطر |
| المرحلة 3 | استخراج Batch + Earnings | -163 سطر |
| المرحلة 4 | استخراج complete_delivery_and_pay_driver | -171 سطر |

**النتيجة**:
- `food_orders.py`: من 5085 إلى **4424 سطر** (-661 سطر, -13%)
- `food_order_helpers.py`: **1013 سطر** (دوال مساعدة + ثوابت)
- `food_order_models.py`: **141 سطر** (16 نموذج Pydantic)
- **نتائج الاختبار**: ✅ 100% نجاح في جميع المراحل

### 🔧 إصلاح أخطاء API 500 ✅ - 24 أبريل 2026
**المشكلة**: كانت بعض endpoints تُرجع `list` بينما return type هو `dict`، مما يُسبب `ResponseValidationError`.

**الإصلاحات**:
- `/api/food/products`: يُرجع الآن `{products: [], total: 0}` بدلاً من `[]`
- `/api/notifications/unread`: يُرجع الآن `{notifications: [], count: 0}`
- `/api/food/my-items`: يُرجع الآن `{items: [], store_id: null}`
- `/api/food/my-flash-requests`: يُرجع الآن `{requests: []}`
- إصلاح return type annotations لـ 9 endpoints إضافية

**تحديث Frontend**: تم تحديث الكود للتعامل مع الـ response الجديد

### 🔄 تطبيق إصلاحات UI على بائع الطعام ✅ - 24 أبريل 2026
- ✅ **شام كاش**: تحقق من 32 حرف hex (بدلاً من رقم هاتف 09)
- ✅ **التعهد**: يظهر دائماً بتنسيق أحمر/أخضر
- ✅ **رسالة GPS**: إضافة toast "تم تحديد موقعك" في `LocationPickerMap.js`

### 🗺️ إصلاح زر GPS في نافذة الخريطة ✅ - 24 أبريل 2026
**المشكلة**: عند الضغط على زر "تحديد موقعي" (GPS) في نافذة اختيار الموقع، كانت النافذة تُغلق ويُحفظ الموقع فوراً.
**السلوك الصحيح**: يجب أن يُظهر الموقع على الخريطة فقط، وتبقى النافذة مفتوحة حتى يضغط المستخدم على "تأكيد الموقع".

**الإصلاح** في `/frontend/src/components/FullScreenMapPicker.js` و `LocationPickerMap.js`:
- استخدام `loadingRef` بدلاً من `loading` كـ dependency في `useEffect`
- إزالة `window.history.back()` من cleanup function
- إضافة رسالة toast عند تحديد الموقع

**نتائج الاختبار**: ✅ 100% نجاح

### 🔧 تقسيم DeliverySettingsTab.js ✅ - 24 أبريل 2026
**من ~2444 سطر إلى ~715 سطر**

استخراج 16 مكون فرعي إلى `/frontend/src/components/admin/delivery-settings/`:
1. `DispatchStatusCard.js` - حالة التوزيع التلقائي
2. `ViolationsReportCard.js` - تقرير المخالفات
3. `DistancePricingCard.js` - رسوم التوصيل للعميل
4. `DriverEarningsCard.js` - أرباح السائق
5. `WaitTimeCard.js` - وقت انتظار التوصيل
6. `WaitCompensationCard.js` - تعويض انتظار السائق
7. `OrderLimitsCard.js` - حدود الطلبات
8. `SmartPriorityCard.js` - الأولوية الذكية
9. `DeliveryTimeSettingsCard.js` - إعدادات وقت التوصيل
10. `ProductDeliveryHoursCard.js` - ساعات توصيل المنتجات
11. `PerformanceLevelsCard.js` - مستويات الأداء
12. `LeaderboardRewardsCard.js` - جوائز الصدارة
13. `WorkingHoursCard.js` - ساعات العمل
14. `HoldSettingsCard.js` - تعليق الأرباح
15. `CustomerProtectionCard.js` - حماية العميل
16. `UndeliveredOrdersCard.js` - الطلبات غير المُسلّمة
17. `Modals.js` - النوافذ المنبثقة

**نتائج الاختبار**: ✅ 100% نجاح (كل البطاقات تعرض + الحفظ يعمل)

### 🛠️ إصلاحات جودة الكود (Code Quality Report) ✅ - 24 أبريل 2026

#### Critical Issues:
1. **Circular Imports** ✅ - إصلاح التعارضات بين `database.py` و `firebase_admin.py`
   - استخدام lazy imports داخل الدوال بدلاً من أعلى الملف
2. **Hardcoded Secrets** ✅ - نقل كلمات السر للاختبار إلى `.env.test`
   - إنشاء ملف `/backend/tests/.env.test` مع credentials الاختبار
3. **Undefined Variables** ✅ - إصلاح المتغيرات غير المعرّفة
   - إزالة imports غير مستخدمة
   - تصحيح متغيرات غير مستعملة (`admin_phone`, `response`, `event`)
4. **Hook Dependencies** ✅ - لا توجد مشاكل فعلية (استخدام `[]` صحيح للتحميل مرة واحدة)

#### Important Issues:
6. **Function Complexity** ✅ - إنشاء دوال مساعدة في `/backend/routes/food_order_helpers.py`
7. **Excessive Imports** ✅ - إزالة imports غير المستخدمة من 8 ملفات
8. **Array Index as Key** ✅ - إصلاح حالات مهمة (الصور القابلة للحذف)
9. **Large Components** ✅ - تقسيم `FoodStoreDashboard.js`:
   - استخراج `StoreOrdersTab` إلى `/components/foodstore/StoreOrdersTab.js` (778 سطر)
   - تقليص الملف الأصلي من 4252 إلى 3477 سطر
10. **Console Statements** ✅ - معظمها `console.error` للأخطاء (مقبول للإنتاج)

#### إصلاحات إضافية:
- ✅ إصلاح خطأ Response Validation في `/api/categories` (كان يُرجع list بدلاً من dict)

### 🔒 إصلاح أمني كبير: localStorage → httpOnly Cookies ✅
- [x] إزالة **108 استخدام** لـ `localStorage.getItem('token')` من **53 ملفاً**
- [x] تحويل جميع استدعاءات API لاستخدام Cookies تلقائياً (`withCredentials: true`)
- [x] تعديل WebSocket للعمل مع نظام Cookies الجديد
- [x] تحديث المكونات التي تستخدم `fetch` لإضافة `credentials: 'include'`
- [x] إزالة props التوكن غير الضرورية من المكونات الفرعية

### إصلاح الأخطاء ✅
- [x] إصلاح خطأ `ReferenceError: step is not defined` في صفحة `/join/delivery`

### إعادة هيكلة الكود ✅
- [x] استخراج `FoodItemsGrid` إلى `/components/seller/FoodItemsGrid.js`
- [x] استخراج `FoodOrdersSection` إلى `/components/seller/FoodOrdersSection.js`
- [x] استخراج `WithdrawModal` إلى `/components/seller/WithdrawModal.js`
- [x] تقليل حجم `SellerPages.js` من 2644 سطر إلى 2249 سطر

### مراجعة جودة الكود ✅
- [x] Hook Dependencies: 0 تحذيرات
- [x] Type Hints: **100% تغطية** (924 دالة في Backend)
- [x] تقسيم المكونات: 108 مكون منفصل (25 delivery + 24 seller + 59 admin)
- [x] Nested Ternaries: مقبولة (استخدامات شرعية لـ CSS)
- [x] تعقيد الدوال: مقبول (المكونات الكبيرة هي صفحات)

### إصلاحات Code Quality Report (24 أبريل 2026) ✅
**Critical:**
- [x] Circular Import: إصلاح `database.py` ↔ `firebase_admin.py` (lazy imports)
- [x] Hardcoded Secrets: إنشاء `/backend/tests/.env.test`
- [x] Undefined Variables: إزالة imports غير مستخدمة + إصلاح متغيرات
- [x] localStorage Sensitive: ✅ تم سابقاً (httpOnly Cookies)

**Important:**
- [x] Function Complexity: إنشاء `/backend/routes/food_order_helpers.py`
- [x] Excessive Imports: تنظيف 8 ملفات
- [x] Array Index as Key: إصلاح 12 حالة حرجة (الصور، الرسائل، العناصر الديناميكية)
- [x] Large Components: استخراج `StoreOrdersTab` (778 سطر)
- [x] Console Statements: مراجعة وتأكيد (console.error مقبول)

**الباقي (غير حرج):**
- 59 حالة `key={i}` - معظمها آمن (skeleton, hours, stars)
- 31 console statement - معظمها error logging
- Hook Dependencies - الكود صحيح (تحذيرات ESLint مُفرطة)

### نظام تسجيل الأخطاء المركزي ✅ (24 أبريل 2026)
- [x] إنشاء `/backend/routes/error_logs.py` - Backend API كامل
- [x] إنشاء `/frontend/src/lib/errorLogger.js` - مكتبة تسجيل الأخطاء
- [x] إنشاء `/frontend/src/components/admin/ErrorLogsTab.js` - لوحة تحكم الأدمن
- [x] تحديث `ErrorBoundary.js` لتسجيل الأخطاء تلقائياً
- [x] إضافة تبويب "سجل الأخطاء" في لوحة الأدمن
- [x] **الميزات المُنجزة:**
  - تسجيل الأخطاء تلقائياً (Frontend, API, Payment)
  - تجميع الأخطاء المتكررة (Occurrence Count)
  - إحصائيات شاملة (اليوم، الأسبوع، حسب النوع)
  - واجهة بحث وفلترة
  - تحديد الأخطاء كـ "محلولة"
  - تنظيف الأخطاء القديمة

---

## المهام القادمة (Upcoming)

### P1 - أولوية عالية
- [ ] تفعيل بوابة Sham Cash الحقيقية (حالياً Mock)
- [ ] تفعيل SMS OTP للأرقام السورية (حالياً يقبل `123456`)

### P2 - أولوية متوسطة
- [ ] صلاحيات دقيقة للمشرفين الفرعيين (مدير طلبات، مدير منتجات)
- [ ] تقسيم الدوال المعقدة:
  - `create_food_order()` complexity: 72
  - `create_batch_food_orders()` complexity: 44
  - `accept_food_order()` complexity: 43

### P3 - Refactoring ✅ مكتمل بالكامل (24 أبريل 2026)

#### 1. DeliverySettingsTab.js ✅
- **قبل:** 2443 سطر → **بعد:** 715 سطر (**-71%**)
- **18 مكون** في `/admin/delivery-settings/`

#### 2. DeliveryPages.js ✅
- **قبل:** 2492 سطر → **بعد:** 11 سطر (**-99.6%**)
- **14 ملف** في `/pages/delivery/`:
  - `DeliveryDocuments.js`, `DeliveryDashboard.js`, `DeliveryPendingApproval.js`
  - `/components/`: DriverHeader, OrderTypeTabs, OrderTypeFilter, UnavailableMessage, DriverRequestedOrderCard
  - `/modals/`: ETAModal, DeliveryCodeModal, DeleteConfirmModal

#### 3. OrdersMap.js ✅
- **قبل:** 3403 سطر → تم استخراج **1708 سطر** من الكود المشترك
- **17 ملف** في `/delivery/orders-map/`:
  - `/hooks/` (5 ملفات - 770 سطر): useMapState, useTheme, useGPS, useRouting, usePriorityOrders
  - `/components/` (6 ملفات - 445 سطر): MapButton, MapHeader, PriorityPopup, OrderFilterTabs, RouteInfoCard, MapErrorToast
  - الملفات المساعدة (444 سطر): MapIcons, MapHelpers, VoiceAnnouncements

#### الإحصائيات النهائية:
- **إجمالي الملفات المُنشأة:** 49 ملف
- **إجمالي السطور المُستخرجة:** 6669 سطر
- **حالة التطبيق:** ✅ يعمل بدون أخطاء

### P5 - مستقبلي
- [ ] نظام الوكلاء/مكاتب الحوالات للشحن
- [ ] تسجيل الدخول بالبريد الإلكتروني
- [ ] إشعارات ذكية (تنبيه انخفاض سعر، توفر منتج)

---

## Endpoints الجديدة (23 أبريل 2026)

### تسجيل جديد مع OTP
```
POST /api/auth/send-registration-otp
POST /api/auth/verify-otp-only
POST /api/auth/complete-registration
POST /api/auth/verify-registration-otp (للمشترين - تدفق مختصر)
```

---

## ملاحظات هامة

### OTP Mock
جميع ميزات OTP حالياً تقبل الرمز `123456` للاختبار.

### بيئة Preview vs Production
- Preview: يتم تطبيق التغييرات مباشرة
- Production (`trendsyria.app`): يتطلب النشر عبر GitHub

### بيانات الاختبار
- Super Admin: `0945570365` / `TrendSyria@2026`
- OTP Test Code: `123456`
