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

---

## Prioritized Backlog

### P0 - Critical (None currently)
All critical features are implemented and tested.

### P1 - High Priority
- [ ] اختبار المستخدم اليدوي لنظام الكود

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

## Test Reports
- `/app/test_reports/iteration_56.json` - Pickup Code System Tests
- `/app/test_reports/iteration_55.json` - Previous tests

## Credentials
- **Driver:** 0900000000 / delivery123
- **Admin:** 0911111111 / admin123
