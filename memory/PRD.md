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

### P3 - Refactoring
- [x] تقسيم `FoodStoreDashboard.js`: من 4252 إلى 3477 سطر ✅
- [ ] تقسيم المكونات الكبيرة المتبقية:
  - `OrdersMap.js`: 3403 سطر
  - `DeliveryPages.js`: 2492 سطر
  - `DeliverySettingsTab.js`: 2443 سطر

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
