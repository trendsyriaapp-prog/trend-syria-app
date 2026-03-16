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

### March 2026

#### تحديثات 16 مارس 2026 (الجلسة الثانية) ✅

##### 1. إصلاح مشكلة UI في صفحة التصنيفات ✅
- **المشكلة:** ظهور اسم التصنيف بالإنجليزي (مثل `electronics`) لحظة قبل تحميل الاسم العربي
- **الحل:** تعديل دالة `getCategoryName()` لعرض "..." أثناء تحميل التصنيفات
- **الملف:** `pages/ProductsPage.js` (السطر 322-327)
- **Status:** VERIFIED ✅

##### 2. خريطة مراقبة السائقين للمدير ✅
- **الميزة:** خريطة تفاعلية تعرض مواقع جميع السائقين في الوقت الحقيقي
- **المكونات:**
  - **Backend API:** `GET /api/delivery/admin/all-drivers-locations`
    - فلترة حسب المدينة
    - فلترة حسب حالة التوفر
    - إحصائيات (إجمالي، متصلين، متاحين، يوصلون طلبات)
    - قائمة الطلبات النشطة لكل سائق
  - **Frontend:** `components/admin/DriversMapTab.js`
    - خريطة Leaflet تفاعلية
    - شريط إحصائيات فورية
    - فلاتر (المدينة، المتاحين فقط، المتصلين فقط)
    - تحديث تلقائي كل 15 ثانية
    - قائمة تفصيلية للسائقين
    - دليل ألوان واضح
- **الوصول:** لوحة المدير ← زر "خريطة السائقين"
- **دليل الألوان:**
  - 🟢 متصل ومتاح
  - 🟠 يوصل طلبات
  - ⚫ متصل غير متاح
  - ⚪ غير متصل
- **Status:** VERIFIED ✅

##### 3. نظام إشعارات نقص السائقين ✅
- **الميزة:** إشعار تلقائي للمدراء عندما ينخفض عدد السائقين المتصلين عن حد معين
- **المكونات:**
  - **Backend:**
    - `services/background_tasks.py` - فحص دوري كل دقيقة
    - `routes/settings.py` - APIs للإعدادات:
      - `GET /api/settings/driver-shortage-alert`
      - `PUT /api/settings/driver-shortage-alert`
      - `GET /api/settings/driver-shortage-alert/cities`
  - **Frontend:** `DriverShortageAlertSettings` component in `SettingsTab.js`
- **الإعدادات المتاحة:**
  - تفعيل/تعطيل الإشعارات
  - الحد الأدنى للسائقين المتصلين
  - فترة الانتظار بين الإشعارات (دقائق)
  - المدن المراقبة (مع إحصائيات)
- **آلية العمل:**
  - فحص دوري كل دقيقة
  - إرسال إشعار لجميع المدراء عند النقص
  - فترة انتظار (cooldown) لمنع الإشعارات المتكررة
- **الوصول:** لوحة المدير ← الإعدادات ← إشعارات نقص السائقين
- **Status:** VERIFIED ✅

#### تحسينات شاملة (Comprehensive Updates) ✅ - 16 March 2026
تم تنفيذ مجموعة من التحسينات والميزات الجديدة:

##### 1. مكون FreeShippingBanner الموحد ✅
- **الميزة:** توحيد مكون بانر الشحن المجاني في ملف واحد بدلاً من التكرار في 3 صفحات
- **التفاصيل:**
  - مكون جديد: `components/FreeShippingBanner.js`
  - يدعم نوعين: `variant="food"` (أخضر) و `variant="products"` (أزرق)
  - عداد تنازلي مدمج
  - مستورد في: `FoodPage.js`, `ProductsPage.js`, `HomePage.js`
- **Status:** TESTED ✅ (iteration_72)

##### 2. بيانات الإعلانات وعروض الفلاش ✅
- **الميزة:** إضافة بيانات تجريبية للإعلانات والعروض السريعة
- **الملفات:**
  - `backend/scripts/seed_ads_flash.py` - سكريبت إضافة البيانات
- **البيانات المضافة:**
  - 3 إعلانات: عروض رمضان، قسم الطعام، شحن مجاني
  - عرض فلاش: خصم 25% لمدة 48 ساعة على 8 منتجات
- **Status:** TESTED ✅ (iteration_72)

##### 3. نظام التوجيه الذكي للسائقين (Smart Routing) ✅
- **الميزة:** نظام يساعد السائق على قبول طلبات متعددة إذا كانت على نفس المسار
- **المكونات:**
  - خدمة جديدة: `services/smart_routing.py`
    - `is_order_on_route()` - التحقق إذا كان الطلب على المسار
    - `optimize_delivery_order()` - ترتيب الطلبات بشكل أمثل
    - `evaluate_new_order()` - تقييم جدوى قبول طلب جديد
  - يستخدم OSRM API للحصول على المسارات الفعلية
- **APIs الجديدة:**
  - `POST /api/food/orders/delivery/smart-route/evaluate` - تقييم الطلب قبل القبول
  - `GET /api/food/orders/delivery/optimize-route` - الحصول على الترتيب الأمثل للتوصيل
- **Status:** TESTED ✅ (iteration_72)

##### 4. تقييمات الأسعار للمتاجر ✅
- **الميزة:** عرض تقييم أسعار المتجر للعملاء بناءً على البلاغات
- **الوظائف:**
  - شارة تقييم الأسعار في صفحة المتجر ($ أسعار ممتازة/جيدة/متوسطة/مرتفعة)
  - حساب التقييم بناءً على نسبة البلاغات المعتمدة
  - تحذير للعملاء إذا كان المتجر يملك نقاط مخالفات عالية
- **الملفات:**
  - `routes/price_reports.py` - endpoints جديدة (lines 416-530)
  - `pages/FoodStorePage.js` - عرض شارة التقييم
- **APIs الجديدة:**
  - `GET /api/price-reports/store/{store_id}/rating` - تقييم أسعار المتجر
  - `GET /api/price-reports/seller/{seller_id}/price-stats` - إحصائيات البائع
- **Status:** TESTED ✅ (iteration_72)

##### 5. نظام الإحالات ✅
- **الميزة:** نظام دعوة الأصدقاء والحصول على مكافآت
- **التحقق:** تم التحقق من عمله وإضافة واجهة للمستخدمين
- **المكونات الجديدة:**
  - زر "ادعُ صديقاً" في قائمة حساب المستخدم (MobileNav.js)
  - صفحة `/referrals` محدّثة مع دعم التحقق من حالة النظام
  - قسم إدارة الإحالات في لوحة الأدمن (PlatformSettingsTab.js)
  - **إشعارات push للإحالات:**
    - إشعار ترحيبي تلقائي للمستخدمين الجدد
    - زر إرسال تذكير لجميع المستخدمين (للأدمن)
    - زر إرسال تذكير للمستخدمين غير النشطين (للأدمن)
- **APIs:**
  - `GET /api/referrals/status` - حالة تفعيل النظام (عام)
  - `GET /api/referrals/my-code` - كود الإحالة للمستخدم
  - `PUT /api/referrals/admin/settings` - تحديث إعدادات الإحالات (للأدمن)
  - `POST /api/referrals/admin/send-reminder` - إرسال تذكير للجميع (للأدمن)
  - `POST /api/referrals/admin/send-to-inactive` - إرسال للمستخدمين غير النشطين (للأدمن)
- **إعدادات قابلة للتحكم:**
  - تفعيل/إيقاف النظام
  - مكافأة المُحيل (ل.س)
  - خصم الصديق الجديد (%)
  - الحد الأدنى للطلب لاحتساب الإحالة
- **Status:** VERIFIED ✅

##### 7. نظام تتبع السائق المباشر ✅ - 16 March 2026
- **الميزة:** تتبع موقع السائق مباشرة على الخريطة للعملاء والبائعين
- **المكونات:**
  - `components/DriverTrackingMap.js` - خريطة تتبع للعميل
    - عرض موقع السائق 🏍️ وموقع العميل 🏠
    - المسافة المتبقية والوقت المتوقع
    - **المسار الفعلي** من OSRM (وليس خط مستقيم)
    - إشعار صوتي عند اقتراب السائق (< 500م)
    - تحديث تلقائي كل 10 ثواني
  - `components/SellerDriverTrackingMap.js` - خريطة تتبع للبائع (جديد)
    - نسخة مصغرة للبائع لمتابعة التوصيل
    - تُعرض في لوحة تحكم البائع للطلبات "في الطريق"
- **APIs:**
  - `PUT /api/delivery/location` - تحديث موقع السائق
  - `GET /api/delivery/location/{order_id}` - جلب موقع السائق للطلب
    - يدعم: العميل، السائق، الأدمن، **البائع (صاحب المتجر)**
- **الملفات المعدلة:**
  - `routes/delivery.py` - إضافة صلاحية للبائع لرؤية موقع السائق
  - `pages/FoodOrderTracking.js` - صفحة تتبع الطلب للعميل
  - `pages/FoodStoreDashboard.js` - إضافة خريطة التتبع للبائع
- **التحسينات:**
  - استخدام OSRM لحساب المسار الفعلي والوقت الدقيق
  - مكون FitBounds لضبط حدود الخريطة تلقائياً
- **Status:** TESTED ✅

##### 6. نظام حالة توفر منتجات الطعام ✅ - 16 March 2026
- **الميزة:** نظام 3 حالات لتوفر منتجات الطعام
- **الحالات:**
  - 🟢 `available` - متاح للطلب
  - 🟡 `sold_out_today` - نفد مؤقتاً (يعود تلقائياً غداً)
  - 🔴 `unavailable` - متوقف (يحتاج تفعيل يدوي)
- **الميزات:**
  - البائع يغير الحالة بضغطة زر
  - رسائل خطأ واضحة للعملاء عند محاولة طلب منتج غير متاح
  - مهمة خلفية تلقائية تعيد المنتجات "نفد مؤقتاً" إلى "متاح" كل يوم
  - **واجهة للبائع:** 3 أزرار ملونة (🟢🟡🔴) بجانب كل منتج في لوحة التحكم
- **APIs:**
  - `GET /api/food/products/{id}/availability` - جلب حالة التوفر
  - `PUT /api/food/products/{id}/availability?status=xxx` - تغيير الحالة
  - `POST /api/food/products/reset-sold-out` - إعادة المنتجات يدوياً
- **الملفات:**
  - `routes/food.py` - APIs الجديدة
  - `pages/SellerPages.js` - واجهة البائع مع الأزرار الملونة
- **Status:** TESTED ✅

### December 2025

#### نظام التحكم في الأسعار (Price Control System) ✅ - 16 Dec 2025
- **الميزة:** نظام شامل لمراقبة أسعار البائعين ومنع التضخم السعري
- **المكونات:**
  1. **شريط الأكثر مبيعاً:** يعرض المنتجات الأكثر مبيعاً مع عدد المبيعات
  2. **شريط أقل الأسعار:** يعرض المنتجات الأرخص لتشجيع المنافسة السعرية
  3. **نظام الإبلاغ عن الأسعار:**
     - زر "سعر مرتفع؟" في صفحة تفاصيل المنتج
     - نموذج إبلاغ مع 5 أسباب + سعر مقترح + ملاحظات
     - حماية خصوصية المُبلّغ (معلوماته لا تُشارك مع البائع)
  4. **نقاط المخالفات:**
     - تراكم نقاط على البائع المخالف
     - 5 نقاط = تحذير
     - 10 نقاط = تعليق تلقائي
  5. **لوحة تحكم الأدمن:**
     - إحصائيات البلاغات (قيد المراجعة، مؤكدة، تحذيرات، مرفوضة)
     - مراجعة البلاغات واتخاذ إجراء
     - قائمة البائعين المخالفين
     - تعليق/إلغاء تعليق الحسابات
- **الملفات:**
  - `routes/price_reports.py` - جميع APIs البلاغات والمخالفات (جديد)
  - `routes/products.py` - endpoints: `/best-sellers`, `/lowest-price`
  - `pages/ProductsPage.js` - شريط الأكثر مبيعاً وأقل الأسعار
  - `pages/ProductDetailPage.js` - مكون ReportPriceModal
  - `components/admin/PriceReportsTab.js` - لوحة تحكم البلاغات (جديد)
- **APIs:**
  - `GET /api/products/best-sellers` - المنتجات الأكثر مبيعاً
  - `GET /api/products/lowest-price` - المنتجات الأقل سعراً
  - `POST /api/price-reports` - إنشاء بلاغ (للعملاء)
  - `GET /api/price-reports/admin/stats` - إحصائيات (للأدمن)
  - `GET /api/price-reports/admin/all` - جميع البلاغات (للأدمن)
  - `PUT /api/price-reports/admin/{id}/resolve` - حل البلاغ
  - `GET /api/price-reports/admin/sellers-with-violations` - البائعون المخالفون
  - `PUT /api/price-reports/admin/seller/{id}/suspend` - تعليق البائع
  - `PUT /api/price-reports/admin/seller/{id}/unsuspend` - إلغاء التعليق
- **Status:** TESTED ✅ (iteration_71)

#### ميزة عرض الشحن المجاني الشامل (Global Free Shipping Promo) ✅ - 15 Dec 2025
- **الميزة:** تفعيل توصيل مجاني شامل من لوحة الأدمن (للافتتاح أو العروض الترويجية)
- **الوظائف:**
  - الأدمن يفعّل/يلغي العرض من لوحة التحكم
  - اختيار نوع العرض: **جميع الطلبات** / الطعام فقط / المنتجات فقط
  - تحديد تاريخ انتهاء (اختياري) أو عرض بدون تاريخ (يدوي)
  - رسالة مخصصة تظهر للعملاء
  - **المنصة تتحمل التكلفة**: السائق يحصل على أجرته كاملة
  - **عند انتهاء العرض**: يعود كل شيء للوضع الطبيعي (رسوم توصيل حسب الحد الأدنى)
- **الواجهة:**
  - بانر أخضر في صفحة الطعام ✅
  - بانر أزرق في صفحة المنتجات ✅
  - بانر أزرق في الصفحة الرئيسية ✅
  - **عداد تنازلي** يظهر وقت انتهاء العرض ✅
- **الملفات:**
  - `routes/settings.py` - API endpoints للعرض
  - `routes/food_orders.py` - منطق التحقق من العرض لطلبات الطعام
  - `routes/orders.py` - منطق التحقق من العرض لطلبات المنتجات
  - `components/admin/PlatformSettingsTab.js` - واجهة الأدمن
  - `pages/FoodPage.js` - بانر للعملاء (طعام)
  - `pages/ProductsPage.js` - بانر للعملاء (منتجات)
  - `pages/HomePage.js` - بانر للعملاء (رئيسية)
- **Status:** TESTED ✅

#### ميزة حالة المتجر مغلق (Store Closed Status) ✅ - 15 Dec 2025
- **الميزة:** عرض حالة فتح/إغلاق المتاجر للعملاء بناءً على ساعات العمل
- **الوظائف:**
  - API يُرجع `is_open`, `open_status`, `next_open_time` لكل متجر
  - المتاجر المغلقة تظهر في نهاية القائمة
  - بطاقة المتجر المغلق: grayscale، شارة "مغلق الآن"، غير قابلة للنقر
  - صفحة المتجر المغلق: بانر أحمر "المتجر مغلق حالياً"، أزرار إضافة معطلة
  - **ساعات العمل إلزامية:** قيم افتراضية في نموذج التسجيل + إمكانية التعديل لاحقاً
  - **تعديل من لوحة التحكم:** البائع يمكنه تعديل ساعات العمل من تبويب الإعدادات
- **حساب التوقيت:** يستخدم توقيت سوريا (UTC+3)
- **خيارات الإعداد:**
  - نفس الساعات لكل الأيام (خيار مبسط)
  - ساعات مختلفة لكل يوم (خيار متقدم)
  - إمكانية إغلاق أيام معينة (مثل الجمعة)
- **الملفات:**
  - `routes/food.py` - `get_food_stores()`, `get_food_store()`, `update_my_store()` مع حالة is_open
  - `pages/FoodPage.js` - `StoreCard` معدل لعرض حالة الإغلاق
  - `pages/FoodStorePage.js` - بانر الإغلاق، تعطيل الأزرار
  - `pages/JoinAsFoodSellerPage.js` - ساعات العمل الافتراضية في التسجيل
  - `pages/FoodStoreDashboard.js` - تعديل ساعات العمل في الإعدادات
- **Status:** TESTED ✅ (iteration_70)

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

### المسافة القصوى بين المطعم والعميل ✅ - 15 Dec 2025
- **الميزة:** منع العميل من الطلب من متجر يبعد أكثر من 5 كم
- **الهدف:** ضمان وصول الطعام طازجاً (تقليل وقت التوصيل)
- **Backend:**
  - التحقق من المسافة عند إنشاء الطلب (`create_food_order`)
  - `GET /api/settings/store-customer-distance` - جلب الإعداد
  - `PUT /api/settings/store-customer-distance` - تحديث الإعداد
- **Frontend:**
  - لوحة الأدمن ← إعدادات التوصيل ← المسافة بين المطعم والعميل
- **الافتراضي:** 5 كم
- **Status:** IMPLEMENTED ✅

### أيقونات الطلبات التجميعية ✅ - 15 Dec 2025
- **الميزة:** تمييز الطلبات التجميعية بألوان مختلفة حسب النوع
- **الأيقونات:**
  - 🔥 **طلب تجميعي ساخن** - لون برتقالي
  - 📦 **طلب تجميعي بارد** - لون أخضر زمردي
- **Frontend:**
  - `AvailableOrdersList.js` - تحديث ألوان وأيقونات الطلبات التجميعية
- **Status:** IMPLEMENTED ✅

### رسوم الطقس الصعب (Weather Surcharge) ✅ - 15 Dec 2025
- **الميزة:** إضافة رسوم إضافية على التوصيل في أوقات الطقس الصعب
- **الأسباب المدعومة:** مطر غزير، ثلوج، عاصفة رملية، حرارة شديدة، ضغط عالي
- **المنطق:**
  - الأدمن يفعّل/يوقف الرسوم يدوياً
  - المبلغ قابل للتحديد (0 - 50,000 ل.س)
  - الرسوم تُطبق فقط إذا لم يصل العميل للحد المجاني
  - إشعار تلقائي لجميع السائقين عند التفعيل/الإيقاف
- **Backend:**
  - `GET /api/settings/weather-surcharge` - جلب الإعدادات
  - `PUT /api/settings/weather-surcharge` - تفعيل/إيقاف + إشعارات
  - تعديل `create_food_order` لتطبيق الرسوم
- **Frontend:**
  - لوحة الأدمن ← قسم جديد "رسوم الطقس الصعب"
  - `FoodBatchCheckoutPage.js` - عرض الرسوم في ملخص الطلب
- **Status:** IMPLEMENTED ✅

### نظام رسوم التوصيل الموحدة ✅ - 15 Dec 2025
- **الميزة:** رسوم توصيل موحدة يحددها الأدمن لجميع متاجر الطعام
- **المنطق:**
  - الحد المجاني يُحسب لكل متجر على حدة (ليس المجموع الكلي)
  - رسوم التوصيل = ما يدفعه العميل = ما يأخذه السائق
  - الأدمن يحدد: رسوم التوصيل + الحد المجاني
- **Backend:**
  - `GET /api/settings/food-delivery-fee` - جلب رسوم التوصيل
  - `PUT /api/settings/food-delivery-fee` - تحديث رسوم التوصيل
  - تعديل حساب أرباح السائق لتشمل رسوم التوصيل
- **Frontend:**
  - لوحة الأدمن ← إعدادات المنصة ← رسوم توصيل الطعام
- **Status:** IMPLEMENTED ✅

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
- [x] التحقق من خريطة اختيار الموقع - DONE ✅
- [x] إعادة هيكلة مكون FreeShippingBanner - DONE ✅
- [x] إضافة بيانات للإعلانات والعروض - DONE ✅
- [x] نظام التوجيه الذكي للسائقين - DONE ✅
- [x] تقييمات الأسعار للمتاجر - DONE ✅
- [x] نظام الإحالات مع إشعارات Push - DONE ✅
- [x] التسعير الديناميكي (Surge Pricing) - DONE ✅
- [x] نظام تتبع السائق للعميل والبائع - DONE ✅ (16 March 2026)
- [x] ربط Smart Routing بواجهة السائق - DONE ✅ (16 March 2026)
- [x] نظام إلغاء الطلب للسائق - Backend DONE ✅ (16 March 2026)
- [ ] إصلاح واجهة إعدادات إلغاء السائق في لوحة الأدمن
- [ ] اختبار المستخدم اليدوي للنظام الكامل

## Future Tasks (P2)
- [ ] WebSocket للتحديثات المباشرة (Live updates)
- [ ] ربط API الطقس للرسوم الإضافية التلقائية
- [ ] تكامل مزود دفع سوري
- [ ] نظام مكافآت السائقين (Quests)
- [ ] واجهة إدارة الكوبونات

## Future Tasks (P3)
- [ ] التسوق عبر المحافظات (Cross-governorate)
- [ ] أرقام هاتف مقنّعة
- [ ] دردشة داخلية
- [ ] صفحة عرض جميع المتاجر (/food/stores)

---

## Test Reports
- `/app/test_reports/iteration_72.json` - Smart Routing, Price Rating, FreeShippingBanner ✅
- `/app/test_reports/iteration_71.json` - Price Control System ✅
- `/app/test_reports/iteration_70.json` - Store Closed Status Feature ✅
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
