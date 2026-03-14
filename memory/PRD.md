# تريند سورية (Trend Syria) - PRD

## Original Problem Statement
بناء تطبيق PWA للتجارة الإلكترونية وتوصيل الطعام باللغة العربية، يتضمن نظام توصيل ذكي مع واجهات مخصصة للمدراء والبائعين والسائقين.

## User Personas
1. **العميل**: يطلب الطعام والمنتجات
2. **البائع/المطعم**: يدير المتجر والطلبات
3. **السائق**: يوصل الطلبات
4. **المدير**: يدير المنصة بالكامل

## Core Requirements
- واجهة RTL بالعربية
- نظام مصادقة بالهاتف
- إدارة المتاجر والمنتجات
- نظام طلبات متكامل
- نظام توصيل ذكي
- محفظة إلكترونية

---

## What's Been Implemented

### December 2025

#### إصلاحات واجهة السائق (Driver UI Fixes) ✅ - 14 Dec 2025
- **مشكلة الجداول خلف الشريط**: تم إضافة scroll وpadding للـ RouteMapModal
- **تكرار الطلب بعد الخطأ**: تم إزالة الطلب مؤقتاً أثناء المعالجة
- **المسافة = 0**: تم إصلاح حساب المسافة باستخدام الإحداثيات الفعلية
- **ملفات معدّلة**: RouteMapModal.js, DeliveryPages.js, distanceCalculator.js, food_orders.py

#### نظام كود تأكيد الاستلام (Pickup Code System) ✅
- **Backend:**
  - توليد كود 4 أرقام عند وضع الطلب "جاهز"
  - Endpoint للتحقق: `POST /api/food/orders/delivery/{order_id}/verify-pickup`
  - حفظ `pickup_code_verified` و `pickup_verified_at`
- **Frontend (البائع):**
  - عرض الكود في `FoodStoreDashboard.js`
- **Frontend (السائق):**
  - Modal لإدخال الكود في `MyOrdersList.js`
  - شارة "تم تأكيد الاستلام" بعد التحقق
- **Status:** TESTED ✅ (iteration_56)

#### نظام توفر السائق (Driver Availability) ✅
- منع قبول الطلبات عندما يكون السائق "غير متاح"
- منع الانتقال لـ"غير متاح" مع طلبات نشطة
- رسائل خطأ واضحة بالعربية
- **Status:** TESTED ✅

#### معاينة المسار (Route Preview) ✅
- Modal جديد `RouteMapModal.js`
- عرض موقع السائق + المتجر + العميل
- حساب المسار الكامل من OSRM
- **Status:** IMPLEMENTED ✅

#### رسائل الخطأ Toast ✅
- إصلاح ظهور رسائل الخطأ
- Toast مع إغلاق تلقائي (5 ثواني)
- **Status:** IMPLEMENTED ✅

#### تحسينات واجهة السائق ✅
- بطاقات طلبات محسّنة (رسوم، مسافة، عدد العناصر)
- خريطة فقط للطلبات المقبولة
- أداء أفضل مع `Promise.all`
- **Status:** IMPLEMENTED ✅

#### نظام التوزيع الذكي وتعويض الانتظار (Phase 1) ✅ - 14 Dec 2025
- **واجهة البائع:**
  - Modal "بدء التحضير" مع اختيار وقت التحضير (10-60 دقيقة أو مخصص)
  - شريط تقدم للطلبات قيد التحضير
  - عرض معلومات السائق المخصص
  - **ملف:** `FoodStoreDashboard.js` (StoreOrdersTab component)

- **واجهة السائق:**
  - زر "وصلت للمطعم" (يظهر فقط للحالات: accepted, ready_for_pickup, preparing, ready)
  - زر "تأكيد الاستلام من البائع" (يظهر فقط بعد وصول السائق ووجود كود)
  - عداد الانتظار عند الوصول للمطعم
  - **ملف:** `MyOrdersList.js`

- **واجهة الأدمن:**
  - قسم "تعويض انتظار السائق في المطعم" في إعدادات التوصيل
  - ضبط: وقت الانتظار المسموح، التعويض لكل 5 دقائق، الحد الأقصى للتعويض
  - نظام التحذيرات (تحذير > تحذير أخير > إيقاف)
  - أمثلة حية على حساب التعويض
  - **ملف:** `DeliverySettingsTab.js`

- **Backend APIs:**
  - `POST /api/food/orders/store/orders/{order_id}/start-preparation` - بدء التحضير مع وقت متوقع
  - `POST /api/food/orders/delivery/{order_id}/arrived` - تسجيل وصول السائق للمطعم
  - `GET /api/admin/settings/delivery` - جلب إعدادات التعويض
  - `PUT /api/admin/settings/delivery` - حفظ إعدادات التعويض
  - **ملفات:** `food_orders.py`, `admin_settings.py`

- **Status:** TESTED ✅ (iteration_57)

#### نظام التوزيع الذكي وتعويض الانتظار (Phase 2) ✅ - 14 Dec 2025
- **Background Task للتوزيع التلقائي:**
  - فحص الطلبات الجاهزة للتوزيع كل 10 ثواني
  - البحث عن أقرب سائق متاح وتعيين الطلب له
  - إرسال للجميع إذا لم يوجد سائق أو رفض
  - **ملف:** `services/background_tasks.py`

- **APIs جديدة للأدمن:**
  - `GET /api/admin/dispatch/status` - حالة نظام التوزيع
  - `GET /api/admin/violations/report?days=30` - تقرير المخالفات
  - **ملف:** `routes/admin_settings.py`

- **واجهة الأدمن المحسّنة:**
  - قسم "حالة التوزيع التلقائي" (النظام يعمل، السائقين المتاحين، بانتظار التوزيع)
  - قسم "تقرير المخالفات" (إجمالي المخالفات، التعويضات، متوسط التأخير)
  - **ملف:** `DeliverySettingsTab.js`

- **نظام المخالفات والتعويضات:**
  - حساب التعويض تلقائياً عند تأكيد الاستلام
  - خصم من المطعم وإضافة لمحفظة السائق
  - تسجيل المخالفات وتحديث مستوى التحذير
  - **ملف:** `services/violation_system.py`

- **Status:** TESTED ✅ (iteration_58)

#### نظام حماية البائع من الغش (Geofencing + شكاوى) ✅ - 14 Dec 2025
- **Geofencing (التحقق من الموقع):**
  - عند ضغط السائق "وصلت للمتجر"، يتم التحقق من موقعه GPS
  - يجب أن يكون ضمن 300 متر من المتجر
  - إذا كان بعيداً، يُرفض التسجيل مع رسالة واضحة
  - **ملف:** `food_orders.py` (endpoint arrived مع Haversine formula)

- **نظام شكاوى الوصول الكاذب:**
  - البائع يمكنه الإبلاغ "السائق لم يصل فعلياً"
  - يُلغي عداد الانتظار ويُسجل شكوى
  - عقوبات تصاعدية: 3 شكاوى = تحذير، 5 شكاوى = إيقاف 24 ساعة
  - **ملف:** `food_orders.py` (endpoint report-false-arrival)

- **Frontend:**
  - السائق: يستخدم Geolocation API لإرسال موقعه
  - البائع: زر "السائق لم يصل فعلياً؟" عند وجود driver_arrived_at
  - **ملفات:** `MyOrdersList.js`, `FoodStoreDashboard.js`

- **Status:** TESTED ✅ (iteration_59)

#### تحسينات توصيل المنتجات ✅ - 14 Dec 2025
- **قبول عدة طلبات:**
  - السائق يمكنه قبول حتى 7 طلبات منتجات في نفس الوقت (قابل للتعديل)
  - عداد يظهر (count/max_orders) و can_accept_more
  - **ملف:** `delivery.py` (endpoint accept + my-product-orders)

- **كود استلام للبائع:**
  - كود 4 أرقام يُنشأ عند شحن الطلب
  - البائع يعطي الكود للسائق
  - السائق يدخله للتأكيد
  - **ملف:** `orders.py` (seller/shipped + verify-pickup)

- **رسالة التوصيل اليوم:**
  - العميل يرى "سيصلك اليوم قبل الساعة X"
  - X من إعدادات المنصة (closing_hour)

- **تحكم المدير في حد الطلبات:** ✅ (أضيف 14 Dec 2025)
  - الأدمن يمكنه تحديد الحد الأقصى لطلبات المنتجات (`max_product_orders_per_driver`)
  - الأدمن يمكنه تحديد الحد الأقصى لطلبات الطعام (`max_food_orders_per_driver`)
  - واجهة في "إعدادات قبول طلبات الطعام" مع حقول منفصلة
  - **ملفات:** `DeliverySettingsTab.js`, `admin_settings.py`

- **APIs جديدة:**
  - `GET /api/delivery/my-product-orders` - طلبات السائق مع العداد
  - `POST /api/orders/{id}/seller/shipped` - شحن + كود استلام
  - `GET /api/orders/{id}/seller/pickup-code` - البائع يحصل الكود
  - `POST /api/orders/{id}/delivery/verify-pickup` - السائق يتحقق
  - `PUT /api/admin/settings/delivery` - تحديث إعدادات التوصيل (يشمل max_product_orders_per_driver)

- **Status:** TESTED ✅ (iteration_60 + curl tests)

---

## Prioritized Backlog

### P0 - Critical (None currently)
All critical features are implemented and tested.

### P1 - High Priority
- [ ] نظام إيداع ومستويات الثقة للسائقين (Driver Deposit & Trust Level)
- [ ] اختبار المستخدم اليدوي للنظام الكامل (بائع > سائق > عميل)

### P2 - Medium Priority
- [ ] تكامل مزود دفع سوري حقيقي
- [ ] تسعير ديناميكي (Surge Pricing)
- [ ] نظام مكافآت للسائقين (Quests)

### P3 - Future/Backlog
- [ ] أرقام هاتف مقنّعة للتواصل
- [ ] نظام دردشة داخلي
- [ ] تحويل PWA إلى APK
- [ ] تتبع السائق مباشرة للعملاء
- [ ] إشعارات ذكية للسائقين قرب مناطق الطلب العالي

---

## Technical Architecture

### Backend (FastAPI)
- `/app/backend/routes/food_orders.py` - طلبات الطعام + كود الاستلام
- `/app/backend/routes/delivery.py` - إدارة السائقين
- `/app/backend/core/database.py` - MongoDB connection

### Frontend (React)
- `/app/frontend/src/components/delivery/` - مكونات السائق
- `/app/frontend/src/components/seller/` - مكونات البائع
- `/app/frontend/src/pages/` - الصفحات الرئيسية

### Database (MongoDB)
- `food_orders` collection with `pickup_code`, `pickup_code_verified`
- `delivery_documents` for driver availability

---

## Known Issues
- **Priority Order Popup Bug (P1):** نافذة الطلب ذات الأولوية قد تظهر مجدداً بعد الرفض في `OrdersMap.js`. يحتاج refactoring للـ state management.

---

## Test Reports
- `/app/test_reports/iteration_60.json` - Product Delivery Improvements ✅
- `/app/test_reports/iteration_59.json` - Geofencing & False Arrival System ✅
- `/app/test_reports/iteration_58.json` - Smart Distribution Phase 2 Tests ✅
- `/app/test_reports/iteration_57.json` - Smart Distribution Phase 1 Tests ✅
- `/app/test_reports/iteration_56.json` - Pickup Code System Tests

## Credentials
- **Driver:** 0900000000 / delivery123
- **Admin:** 0911111111 / admin123
