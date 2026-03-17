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

## What's Been Implemented (Latest Session - Dec 2025)

### ✅ Session Completed Tasks

#### 1. إصلاح مشكلة Carousels (الصفحة الرئيسية)
- المشكلة: الـ Carousels كانت تعيد التعيين كل بضع ثوان
- الحل: نقل تعريفات المكونات خارج دالة الـ render واستخدام `React.memo`
- الملف: `/app/frontend/src/components/RecommendedProducts.js`

#### 2. صفحات "عرض الكل" المخصصة
- تم إضافة filtering في الـ backend لـ `trending`, `deals`, `flash`, `popular`, `sponsored`
- الملفات:
  - `/app/backend/routes/products.py`
  - `/app/frontend/src/pages/ProductsPage.js`
  - `/app/frontend/src/pages/HomePage.js`

#### 3. أنيميشن بانر قسم الطعام
- تم إضافة gradient pulsating animation للبانر
- الملف: `/app/frontend/src/pages/FoodPage.js`

#### 4. ✅ إصلاح استعادة موقع التمرير (Scroll Restoration)
- **المشكلة**: عند الضغط على "رجوع"، الصفحة كانت تبقى في الأعلى
- **الحل النهائي**: 
  - حفظ مستمر لموقع التمرير كل 100ms
  - قفل الحفظ عند النقر على الروابط
  - محاولات استعادة متكررة للتعامل مع المحتوى الديناميكي
- **الملفات**:
  - `/app/frontend/src/components/ScrollToTop.js` (أُعيد كتابته بالكامل)
  - `/app/frontend/src/context/ScrollContext.js` (مُبسّط)
- **نتائج الاختبار**: الفرق < 50px في جميع الحالات ✅

---

## Prioritized Backlog

### P0 - Critical (Resolved)
- ~~استعادة موقع التمرير على الموبايل~~ ✅

### P1 - High Priority
- **تكامل بوابة الدفع السورية**: تفعيل شحن المحفظة الإلكترونية
- **التسوق عبر المحافظات**: السماح بالشراء من متاجر في محافظات أخرى

### P2 - Medium Priority
- تحسينات إشعارات PWA (شرح كيفية تفعيلها)
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

### Key Files
```
/app/
├── backend/
│   └── routes/products.py    # Product filtering & sorting
├── frontend/src/
│   ├── components/
│   │   ├── ScrollToTop.js    # Scroll restoration (REWRITTEN)
│   │   └── RecommendedProducts.js
│   ├── context/
│   │   └── ScrollContext.js  # Simplified context
│   └── pages/
│       ├── HomePage.js
│       ├── ProductsPage.js
│       └── FoodPage.js
```

---

## Test Credentials
- **Admin**: Phone: `0911111111`, Password: `Admin@123`
- **Customer**: Phone: `0933333333`, Password: `buyer123`
- **Driver**: Phone: `0900000000`, Password: `Delivery@123`

---

*Last Updated: December 2025*
