# ترند سورية - PRD (Product Requirements Document)

## Original Problem Statement
تطبيق تجارة إلكترونية متكامل للسوق السوري يتضمن:
- منصة تسوق للمنتجات العامة
- منصة توصيل طعام
- نظام محافظ إلكترونية
- نظام توصيل متكامل
- لوحة تحكم للبائعين والإدارة

## User Personas
1. **المشتري**: يتصفح المنتجات، يضيفها للسلة، يشتري، يتتبع الطلبات
2. **البائع**: يدير منتجاته، يتابع المبيعات، يتواصل مع العملاء
3. **السائق**: يستلم الطلبات، يوصلها، يتتبع أرباحه
4. **الإدارة**: تدير المستخدمين، تراقب النظام، تضبط الإعدادات

## Core Requirements
- تصفح المنتجات مع فلاتر متعددة (السعر، المحافظة، التصنيف)
- نظام سلة تسوق ودفع
- تتبع الطلبات في الوقت الحقيقي
- نظام رسائل بين المشتري والبائع
- محفظة إلكترونية للدفع

---

## What's Been Implemented

### Session: December 2025 (Latest - 19 Dec)

#### إصلاح مشكلة القفز عند استعادة التمرير (Completed ✅)
- **المشكلة**: عند الضغط على زر الرجوع من صفحة المنتجات، كانت الصفحة الرئيسية تقفز قبل أن تستقر
- **السبب الجذري**: متغير `isNavigating` لم يُلغى بعد اكتمال استعادة التمرير في حالة POP
- **الإصلاحات**:
  - تحديث `ScrollContext.js` لإضافة `isNavigating.current = false` عند اكتمال الاستعادة
  - إزالة استدعاءات `window.scrollTo(0, 0)` غير الضرورية من صفحات المنتجات
  - تحسين منطق حفظ التمرير لمنع الكتابة فوق القيم أثناء التنقل
- **الملفات المعدلة**:
  - `/app/frontend/src/context/ScrollContext.js`
  - `/app/frontend/src/pages/FlashSaleProductsPage.js`
  - `/app/frontend/src/pages/BestSellersPage.js`
  - `/app/frontend/src/pages/FreeShippingProductsPage.js`
  - `/app/frontend/src/pages/NewArrivalsPage.js`
  - `/app/frontend/src/pages/SponsoredProductsPage.js`
- **الاختبار**: ✅ نجح اختبار التمرير للأسفل والأعلى مع استعادة صحيحة

### Session: December 2025

#### 1. تحسين إرشادات إشعارات PWA (Completed - Latest)
- **مكون جديد**: `NotificationGuide.js` - دليل تفصيلي لتفعيل الإشعارات
- **تبويب جديد**: "الإشعارات" في صفحة الإعدادات
- **دعم العملاء**: تحديث `PushNotificationPrompt.js` ليدعم العملاء (buyer)
- **رسائل مخصصة** حسب نوع المستخدم:
  - العميل: "تتبع طلبك لحظة بلحظة"
  - السائق: "استلم طلبات جديدة فوراً"
  - البائع: "لا يفوتك أي طلب"
- **خطوات تفعيل** لكل متصفح: Chrome Mobile, Chrome Desktop, Safari, Android PWA

#### 2. اختبار E2E شامل للنظام (Completed)
- **سيناريو البائع**: تسجيل ← موافقة الأدمن ← إعداد المتجر ✅
- **سيناريو السائق**: تسجيل ← موافقة الأدمن ← إعداد الموقع ✅
- **سيناريو العميل**: تسجيل ← عنوان ← سلة ← طلب ✅
- **الأخطاء المصلحة**:
  - إصلاح حفظ موقع منزل السائق (auth.py)
  - إصلاح خطأ datetime في إنشاء الطلبات (orders.py)

#### 3. نظام المتاجر المميزة (Completed)
- تبديل بين المتاجر المختارة يدوياً أو الأعلى تقييماً
- لوحة تحكم في صفحة الأدمن

#### 4. إلزامية تحديد الموقع على الخريطة (Completed)
- للعملاء: عند إضافة عنوان
- للبائعين: عند إعداد المتجر
- للسائقين: عند تحديد موقع المنزل

#### 5. تحسينات واجهة المستخدم (Completed)
- إصلاح مشكلة التمرير في صفحة المنتجات
- تبسيط شبكة المتاجر (2×2 ثابتة)
- توحيد حساب الشحن المجاني
- إضافة قسم "المزيد من المنتجات" في الصفحة الرئيسية

---

## Prioritized Backlog

### P1 - High Priority
- **تكامل بوابة الدفع السورية**: تفعيل شحن المحفظة الإلكترونية
- **التسوق عبر المحافظات**: السماح بالشراء من متاجر في محافظات أخرى

### P2 - Medium Priority
- زر اتصال العميل بالسائق
- نظام تقييم المكالمات (1-5 نجوم)

### P3 - Low Priority
- تحسين أداء تحميل الصور
- إضافة مزيد من اللغات

---

## Technical Architecture

### Frontend
- React.js with Tailwind CSS
- Shadcn/UI components
- Framer Motion for animations
- React Router for navigation

### Backend
- FastAPI (Python)
- MongoDB database
- WebSocket for real-time features

### Key Files (Session Updates)
```
/app/
├── backend/
│   └── routes/
│       └── auth.py        # تم إضافة حقول موقع منزل السائق
├── frontend/src/
│   ├── App.js             # أضيف BuyerNotificationPrompt
│   ├── components/
│   │   ├── NotificationGuide.js      # جديد - دليل الإشعارات
│   │   └── PushNotificationPrompt.js # تحديث - دعم العملاء
│   └── pages/
│       ├── SettingsPage.js            # أضيف تبويب الإشعارات
│       ├── ProductsPage.js            # أضيف قسم "شحنها مجاني"
│       └── FoodPage.js                # أضيف قسم "توصيلها مجاني"
```

---

## Test Reports
- `/app/test_reports/iteration_83.json` - سيناريو البائع (13/13 ✅)
- `/app/test_reports/iteration_84.json` - سيناريو السائق (20/20 ✅)
- `/app/test_reports/iteration_85.json` - سيناريو العميل (25/25 ✅)

## Test Credentials
- **Admin**: Phone: `0911111111`, Password: `Admin@123`
- **Customer**: Phone: `0933333333`, Password: `buyer123`
- **Driver**: Phone: `0900000000`, Password: `Delivery@123`

---

## Session Update: March 2026

### قسم "شحنها مجاني" في المنتجات (Completed ✅)
- **الملف**: `ProductsPage.js`
- **الوظيفة**: يعرض المنتجات التي سعرها >= حد الشحن المجاني (150,000 ل.س)
- **التصميم**: 
  - عنوان "شحنها مجاني" مع أيقونة شاحنة خضراء
  - وصف "اطلب واحصل على شحن مجاني فوراً!"
  - كروسيل أفقي للمنتجات مع شارة "شحن مجاني" خضراء
- **API**: يستخدم `/api/settings/public` للحصول على `free_shipping_threshold`

### قسم "توصيلها مجاني" في الطعام (Completed ✅)
- **الملف**: `FoodPage.js`
- **الوظيفة**: يعرض منتجات الطعام التي سعرها >= حد التوصيل المجاني (75,000 ل.س)
- **ملاحظة**: القسم لا يظهر حالياً لأن جميع منتجات الطعام أسعارها أقل من الحد
- **التصميم**: مشابه لقسم المنتجات مع تعديل النص ليناسب الطعام

---

*Last Updated: March 2026*
