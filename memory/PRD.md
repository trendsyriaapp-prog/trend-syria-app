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

#### نظام تعليق الأرباح (Hold Period) ✅ - 15 Dec 2025
- **الميزة:** تعليق الأرباح لفترة محددة قبل إضافتها للرصيد المتاح
- **الغرض:** حماية المنصة من الإرجاعات - الأرباح تبقى معلقة حتى انتهاء فترة الإرجاع
- **الإعدادات:**
  - فترة تعليق طلبات الطعام: 1 ساعة (افتراضي)
  - فترة تعليق طلبات المنتجات: 24 ساعة (افتراضي)
  - إمكانية تفعيل/تعطيل النظام
- **مراحل الأرباح:**
  1. عند التسليم: الأرباح تُضاف كـ `held_balance`
  2. بعد انتهاء فترة التعليق: تُنقل تلقائياً للـ `balance`
- **Background Task:** إطلاق الأرباح المعلقة تلقائياً كل 5 دقائق
- **الملفات:**
  - `services/earnings_hold.py` - نظام التعليق الكامل (جديد)
  - `routes/admin_settings.py` - APIs الإعدادات
  - `routes/wallet.py` - API الأرباح المعلقة للمستخدم
  - `routes/food_orders.py` - تعديل دالة الدفع للسائق
  - `services/background_tasks.py` - Background task للإطلاق التلقائي
  - `pages/WalletPage.js` - عرض الرصيد المعلق
  - `admin/DeliverySettingsTab.js` - واجهة الإعدادات
- **APIs:**
  - `GET /api/admin/settings/earnings-hold` - جلب الإعدادات
  - `PUT /api/admin/settings/earnings-hold` - تحديث الإعدادات
  - `GET /api/admin/held-earnings/summary` - ملخص الأرباح المعلقة
  - `POST /api/admin/held-earnings/release-all` - إطلاق يدوي
  - `GET /api/wallet/held-earnings` - الأرباح المعلقة للمستخدم
- **Status:** TESTED ✅ (iteration_62)

#### تتبع السائق المباشر للعملاء ✅ - 15 Dec 2025
- **الميزة:** تتبع موقع السائق في الوقت الحقيقي
- **التحديثات:**
  - تحديث موقع السائق كل 10 ثواني (بدلاً من 30)
  - جلب موقع السائق للعميل كل 5 ثواني
  - إرسال بيانات إضافية: السرعة (كم/س)، الاتجاه
- **إشعار اقتراب السائق:**
  - عند اقتراب السائق لأقل من 500 متر من العميل
  - إشعار "🚗 طلبك على وشك الوصول!" يُرسل للعميل
  - علامة `nearby_notification_sent` تمنع تكرار الإشعار
  - واجهة المستخدم تعرض "السائق وصل!" مع المسافة بالأمتار
- **حساب المسافة (Haversine):**
  - حساب دقيق للمسافة بين السائق والعميل
  - تقدير وقت الوصول بناءً على السرعة
- **الملفات:**
  - `hooks/useDriverLocationTracker.js` - تتبع موقع السائق (محسّن)
  - `components/DriverTrackingMap.js` - عرض موقع السائق + إشعار القرب
  - `routes/delivery.py` - check_proximity_and_notify(), calculate_eta()
- **Status:** TESTED ✅ (iteration_63)

#### بيانات تجريبية لأقسام الطعام ✅ - 15 Dec 2025
- **المتاجر الجديدة (8 متاجر):**
  - 🍔 **وجبات سريعة:** برغر كينغ دمشق، بيتزا هت سورية
  - 🛒 **ماركت:** سوبر ماركت الأمانة، بقالة السعادة
  - 🥬 **خضار وفواكه:** خضار أبو محمد، فواكه الشام
  - 🍰 **حلويات:** حلويات الشرق، آيس كريم كولد ستون
- **المنتجات:** 54 منتج متنوع (برغر، بيتزا، حليب، بيض، خضار، فواكه، بقلاوة، آيس كريم...)
- **الملف:** `scripts/seed_food_data.py`
- **Status:** TESTED ✅ (iteration_63)

#### نظام عمولات المنصة للبائعين ✅ - 15 Dec 2025
- **الميزة:** خصم نسبة من أرباح البائع كعمولة للمنصة
- **نسب العمولات:**
  - 🍔 وجبات سريعة (fast_food): **20%**
  - 🍕 مطاعم (restaurants): **20%**
  - 🛒 ماركت (market): **15%**
  - 🥬 خضار وفواكه (vegetables): **12%**
  - 🍰 حلويات (sweets): **18%**
- **التطبيق:**
  - العمولة تُخصم تلقائياً عند تسليم الطلب
  - حقول جديدة في الطلب: `platform_commission`, `commission_rate`, `seller_earning`
- **عرض للبائع:**
  - بطاقة عمولة في لوحة التحكم (تبويب نظرة عامة)
  - تُظهر: نسبة العمولة، إجمالي العمولات المدفوعة، صافي الأرباح
- **API:** `GET /api/food/my-store/commission`
- **الملفات:**
  - `routes/food_orders.py` - حساب العمولة عند التسليم
  - `routes/food.py` - API جلب معلومات العمولة
  - `routes/admin.py` - DEFAULT_FOOD_COMMISSIONS
  - `pages/FoodStoreDashboard.js` - بطاقة عرض العمولة
- **Status:** TESTED ✅ (iteration_66)

#### حاسبة العمولة عند تسعير المنتجات ✅ - 15 Dec 2025
- **الميزة:** عرض تفاصيل الأرباح للبائع عند إدخال سعر المنتج
- **ما تعرضه الحاسبة:**
  - 💵 سعر البيع
  - 🔴 عمولة المنصة (النسبة والمبلغ)
  - 🟢 صافي الربح (باللون الأخضر)
- **أماكن الظهور:**
  - نموذج إضافة منتج (FoodStoreDashboard + SellerPages)
  - نموذج تعديل منتج
  - قائمة المنتجات (صافي ربحك لكل منتج)
- **الملفات:**
  - `pages/FoodStoreDashboard.js` - ProductModal
  - `components/seller/AddProductModal.js`
  - `components/seller/EditProductModal.js`
  - `pages/SellerPages.js` - تمرير commissionInfo
- **مثال:**
  ```
  سعر البيع: 100,000 ل.س
  عمولة المنصة (20%): - 20,000 ل.س
  صافي ربحك: 80,000 ل.س ✅
  ```
- **Status:** TESTED ✅ (iteration_67)

#### تغيير أيقونة السيارة إلى موتور 🏍️ ✅ - 15 Dec 2025
- **السبب:** موظفي التوصيل يعملون على الموتور وليس السيارة
- **الملفات المعدّلة:**
  - `DriverTrackingMap.js` - 3 أيقونات
  - `OrdersMap.js` - 4 أيقونات
  - `AvailableOrdersList.js` - 2 أيقونات
  - `RouteMapModal.js` - 3 أيقونات
  - `MultiRouteOptimizer.js` - 3 أيقونات
  - `DeliverySettingsTab.js` - 2 أيقونات
  - `FoodStoreDashboard.js` - 3 أيقونات
- **Status:** TESTED ✅ (iteration_64)

#### صوت إشعار اقتراب السائق 🔔 ✅ - 15 Dec 2025
- **الميزة:** تشغيل صوت إشعار عند اقتراب السائق
- **للعميل:** عند اقتراب السائق من موقع التسليم (< 500م)
- **للبائع:** عند اقتراب السائق من المتجر للاستلام (< 500م)
- **التفاصيل:**
  - ملف الصوت: `/public/notification.mp3`
  - Backend: `check_proximity_and_notify()` in `delivery.py`
  - Frontend: `playNotificationSound()` in `DriverTrackingMap.js` و `FoodStoreDashboard.js`
  - حقول منع التكرار: `nearby_notification_sent` (للعميل), `store_nearby_notification_sent` (للبائع)
- **أنواع الإشعارات:**
  - `driver_nearby` - للعميل
  - `driver_arriving_store` - للبائع
- **Status:** TESTED ✅ (iteration_65)

#### إصلاح مشكلة نافذة الأولوية ✅ - 15 Dec 2025
- **المشكلة:** نافذة طلب الأولوية كانت تعود للظهور بعد رفضها
- **السبب:** مشكلة في إدارة الحالة داخل الـ interval callbacks (closure issue)
- **الحل:** استخدام `useRef` للحفاظ على قائمة الطلبات المرفوضة
- **الملف:** `components/delivery/OrdersMap.js`
- **التغييرات:**
  - إضافة `rejectedOrderIdsRef` باستخدام `useRef`
  - تحديث الـ ref فوراً عند رفض الطلب
  - استخدام الـ refs في الـ interval بدلاً من الـ state
- **Status:** FIXED ✅

#### نظام ساعات توصيل المنتجات والخصم التلقائي ✅ - 15 Dec 2025
- **ساعات التوصيل المسموحة:**
  - المدير يحدد أول وآخر وقت للتوصيل (مثال: 8 صباحاً - 11 مساءً)
  - السائق لا يستطيع تأكيد التسليم خارج هذه الساعات
  - رسالة "لا تزعج العميل الآن" تظهر للسائق
- **نظام الخصم للطلبات غير المُسلّمة:**
  - تقرير يومي بالطلبات غير المُسلّمة
  - المدير يخصم يدوياً من رصيد السائقين
- **الملفات المعدلة:**
  - `admin_settings.py` - APIs جديدة لساعات التوصيل والخصم
  - `delivery.py` - التحقق من ساعات التوصيل عند التسليم
  - `DeliverySettingsTab.js` - واجهة الإعدادات الجديدة
  - `MyOrdersList.js` - تعطيل زر التسليم خارج الساعات
- **Status:** IMPLEMENTED ✅

#### أقسام قسم الطعام الجديدة ✅ - 15 Dec 2025
- **تم تحديث قسم الطعام** ليشمل 4 أقسام فرعية:
  1. 🍔 **وجبات سريعة** - مطاعم، شاورما، بيتزا، برغر (وقت التحضير: 20 د)
  2. 🛒 **ماركت** - سوبرماركت، بقالة، مواد استهلاكية (وقت التحضير: 10 د)
  3. 🥬 **خضار وفواكه** - خضار طازجة، فواكه موسمية (وقت التحضير: 8 د)
  4. 🍰 **حلويات** - حلويات شرقية وغربية، آيس كريم (وقت التحضير: 15 د)
- **إعدادات لكل متجر:**
  - الحد الأدنى للطلب
  - حد الشحن المجاني
  - رسوم التوصيل
  - وقت التحضير (قابل للتخصيص)
- **الملفات المعدلة:**
  - `FoodPage.js` - tabs للأقسام الأربعة
  - `JoinAsFoodSellerPage.js` - اختيار نوع المتجر مع إعدادات افتراضية
  - `food.py` (Backend) - أنواع المتاجر الجديدة
- **Status:** TESTED ✅

#### استعادة كلمة المرور ✅ - 15 Dec 2025
- **الميزة:** نظام متكامل لاستعادة كلمة المرور عند نسيانها
- **3 طرق للتحقق:**
  1. **كود SMS** (الافتراضي) - يُرسل كود 6 أرقام للهاتف
  2. **رقم الطوارئ** - آخر 4 أرقام من رقم الطوارئ المسجل
  3. **الاسم الثلاثي** - مطابقة الاسم المسجل
- **وضع المحاكاة (MOCK):** الكود يظهر في الواجهة للتطوير
- **Twilio Ready:** يمكن التبديل لـ Twilio بتغيير `SMS_MOCK_MODE=false`
- **الملفات:**
  - `ForgotPasswordPage.js` - صفحة استعادة كلمة المرور
  - `AuthPages.js` - رابط "نسيت كلمة المرور" + حقل رقم الطوارئ
  - `auth.py` - 5 endpoints جديدة
  - `schemas.py` - Models جديدة
- **APIs:**
  - `POST /api/auth/forgot-password` - البحث عن الحساب
  - `POST /api/auth/send-sms-code` - إرسال كود SMS
  - `POST /api/auth/verify-sms-code` - التحقق من كود SMS
  - `POST /api/auth/verify-identity` - التحقق (emergency/name)
  - `POST /api/auth/reset-password` - إعادة تعيين كلمة المرور
- **أمان:**
  - Rate limiting: 3/دقيقة للإرسال، 5/دقيقة للتحقق
  - كود SMS صالح 5 دقائق فقط
  - حد أقصى 5 محاولات للكود
  - رمز إعادة التعيين 15 دقيقة فقط
- **Status:** TESTED ✅ (iteration_61)

#### تخطيط المسار الذكي المُحسَّن ✅ - 15 Dec 2025
- **فصل المسارات (3 خيارات):**
  - 🍔 مسار الطعام - طلبات الطعام فقط (أولوية الطعام الساخن)
  - 📦 مسار المنتجات - طلبات المنتجات فقط (توصيل مرن)
  - 🔀 دمج الكل - طعام + منتجات معاً (أولوية للطعام)
- **خوارزمية ذكية:**
  - الأقرب فالأقرب بغض النظر عن نوع النقطة
  - لا يوصل للعميل إلا بعد استلام طلبه من البائع
  - مثال: بائع → بائع → عميل (قريب) → بائع → عميل → عميل
- **ملفات:**
  - `RouteSelector.js` - مكون اختيار نوع المسار (جديد)
  - `MultiRouteOptimizer.js` - خوارزمية محسنة مع mode parameter
  - `MyOrdersList.js` - زر تخطيط المسار الذكي
- **Status:** IMPLEMENTED ✅

#### نظام وقت التوصيل والعقوبات ✅ - 15 Dec 2025
- **Backend:**
  - `delivery_time.py` - APIs لإدارة وقت التوصيل والعقوبات
  - حساب الوقت = GPS + Buffer الإضافي
  - نظام تحذيرات تدريجي قبل الخصم
  - الحد الأقصى للخصم اليومي
- **Frontend (الأدمن):**
  - إعدادات Buffer الإضافي (8 دقائق افتراضي)
  - إعدادات التحذير قبل الانتهاء
  - إعدادات العقوبات (تحذيرات، خصم، حد يومي)
  - `DeliverySettingsTab.js` - قسم جديد لإعدادات وقت التوصيل
- **Frontend (السائق):**
  - `DeliveryTimer.js` - عداد وقت التوصيل (جديد)
  - تحذير في آخر 3 دقائق
  - شريط تقدم ملون
- **APIs:**
  - `POST /api/delivery/timer/start` - بدء العداد
  - `GET /api/delivery/timer/{order_id}` - حالة العداد
  - `POST /api/delivery/timer/{order_id}/complete` - إكمال التوصيل
  - `GET /api/admin/delivery-time-settings` - إعدادات الأدمن
  - `PUT /api/admin/delivery-time-settings` - تحديث الإعدادات
- **Status:** IMPLEMENTED ✅

#### الصفحات القانونية ✅ - 14 Dec 2025
- **صفحات موجودة:**
  - `/about` - من نحن (جديد)
  - `/privacy` - سياسة الخصوصية
  - `/terms` - شروط الاستخدام
  - `/returns` - سياسة الإرجاع
- **معلومات الاتصال:**
  - البريد: trendsyria.app@gmail.com
  - العنوان: حلب، سوريا
  - ساعات الدعم: 10:00 ص - 11:00 م
- **Footer:** تمت إضافته في الصفحة الرئيسية مع روابط لكل الصفحات
- **صفحة التسجيل:** رابط "بالتسجيل، أنت توافق على الشروط"
- **ملفات:** `LegalPages.js`, `AboutPage.js`, `HomePage.js`, `AuthPages.js`
- **Status:** IMPLEMENTED ✅

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
- **Priority Order Popup Bug:** ✅ **FIXED** - تم إصلاح مشكلة ظهور النافذة المتكرر باستخدام `useRef` للحفاظ على قائمة الطلبات المرفوضة بشكل صحيح في callbacks.

---

## What's Been Implemented - Latest

### نظام تصنيف حدود توصيل الطعام (ساخن/طازج vs بارد/جاف) ✅ - 15 Dec 2025
- **الميزة:** تصنيف أنواع المتاجر إلى فئتين بحدود مختلفة للتوصيل
- **التصنيفات:**
  - 🔥 **ساخن/طازج** (2 طلبات): مطاعم، مقاهي، مخابز، مشروبات، حلويات
  - 📦 **بارد/جاف** (5 طلبات): ماركت، خضار وفواكه
- **الهدف:** ضمان جودة الطعام الساخن مع السماح بكفاءة أعلى للمنتجات الباردة
- **Backend:**
  - `GET /api/settings/food-delivery-limits` - جلب الحدود والتصنيفات
  - `PUT /api/settings/food-delivery-limits` - تحديث الحدود
  - تعديل `accept_food_order` لاستخدام الحدود الجديدة
- **Frontend:**
  - لوحة الأدمن ← إعدادات التوصيل ← قسم جديد للحدود
  - عرض التصنيفات بألوان مختلفة (أحمر للساخن، أخضر للبارد)
- **الملفات:**
  - `backend/routes/food_orders.py` - التصنيفات ومنطق الحدود
  - `backend/routes/settings.py` - endpoints الإعدادات الجديدة
  - `frontend/src/components/admin/DeliverySettingsTab.js` - واجهة الإعدادات
- **Status:** IMPLEMENTED ✅ - APIs tested via curl

### نظام أولوية توصيل الطعام (Food Delivery Priority) ✅ - 15 Dec 2025
- **الميزة:** منع السائق من تسليم طلبات المنتجات أثناء وجود طلب طعام **ساخن/طازج** نشط
- **تحديث مهم:** الطلبات الباردة/الجافة (ماركت، خضار) لا تقفل المنتجات!
- **الهدف:** ضمان وصول الطعام الساخن طازجاً للعميل
- **منطق القفل المحدّث:**
  1. السائق لديه طلب بيتزا (ساخن) → 🔒 المنتجات مقفلة
  2. السائق لديه طلب خضار (بارد) → ✅ المنتجات متاحة
- **Backend:**
  - `count_hot_fresh_food_orders()` - دالة جديدة لحساب الطلبات الساخنة فقط
  - `GET /api/delivery/my-product-orders` - يُرجع `is_locked: true` فقط للطلبات الساخنة
  - `POST /api/orders/{id}/delivery/delivered` - يرفض التسليم فقط إذا كان هناك طلبات ساخنة
  - `GET /api/delivery/available-orders` - يُخفي طلبات المنتجات فقط مع الطلبات الساخنة
- **Frontend:**
  - طلبات المنتجات المقفلة تظهر بلون رمادي مع أيقونة 🔒
  - أزرار التسليم معطلة مع رسالة توضيحية
  - الأزرار الخرائط والاتصال تبقى متاحة
- **إشعار فك القفل:** ✅ (جديد)
  - عند تسليم آخر طلب طعام، يُرسل إشعار للسائق
  - الرسالة: "🔓 تم فك القفل! لديك X طلب منتجات بانتظار التسليم"
  - الإشعار يُصدر صوت (play_sound: true)
- **الملفات:**
  - `backend/routes/delivery.py` - منطق `is_locked` في my-product-orders
  - `backend/routes/orders.py` - حماية delivery_complete من التسليم
  - `backend/routes/food_orders.py` - إشعار فك القفل
  - `frontend/src/components/delivery/MyOrdersList.js` - واجهة القفل
  - `frontend/src/pages/DeliveryPages.js` - استخدام endpoint الصحيح
  - `frontend/src/pages/DeliveryHomePage.js` - تحديث endpoint
- **Status:** TESTED ✅ (iteration_69) - Backend 100%، Frontend IMPLEMENTED

---

## Upcoming Tasks (P1)
- [ ] اختبار المستخدم اليدوي للنظام الكامل
- [ ] إضافة سائق تجريبي جديد للاختبار

## Future Tasks (P2/P3)
- [ ] تكامل مزود دفع سوري
- [ ] نظام العمولات والرسوم
- [ ] التسعير الديناميكي (Surge Pricing)
- [ ] نظام مكافآت السائقين (Quests)
- [ ] أرقام هاتف مقنّعة
- [ ] دردشة داخلية

---

## Test Reports
- `/app/test_reports/iteration_69.json` - Food Delivery Priority System ✅
- `/app/test_reports/iteration_67.json` - Commission Calculator for Sellers ✅
- `/app/test_reports/iteration_66.json` - Commission System for Sellers ✅
- `/app/test_reports/iteration_65.json` - Seller Driver Proximity Notification ✅
- `/app/test_reports/iteration_64.json` - Motorcycle Icons & Sound Notification ✅
- `/app/test_reports/iteration_63.json` - Food Seed Data & Driver Proximity ✅
- `/app/test_reports/iteration_62.json` - Earnings Hold Period & Live Tracking ✅
- `/app/test_reports/iteration_61.json` - Password Recovery Feature ✅
- `/app/test_reports/iteration_60.json` - Product Delivery Improvements ✅
- `/app/test_reports/iteration_59.json` - Geofencing & False Arrival System ✅
- `/app/test_reports/iteration_58.json` - Smart Distribution Phase 2 Tests ✅
- `/app/test_reports/iteration_57.json` - Smart Distribution Phase 1 Tests ✅
- `/app/test_reports/iteration_56.json` - Pickup Code System Tests

## Credentials
- **Driver:** 0900000000 / delivery123
- **Admin:** 0911111111 / admin123
- **Test User Emergency Phone:** 0912345678 (last 4: 5678)
