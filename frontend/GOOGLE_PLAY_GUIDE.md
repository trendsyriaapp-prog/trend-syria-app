# 📱 تطبيق ترند سوريا - دليل رفع التطبيق على Google Play

## 🚀 الخطوات:

### الخطوة 1: رفع المشروع على GitHub

1. أنشئ حساب على [GitHub](https://github.com) إذا لم يكن لديك
2. أنشئ Repository جديد باسم `trend-syria-app`
3. من Emergent، اضغط على **"Save to GitHub"** لرفع الكود

---

### الخطوة 2: إعداد GitHub Secrets

1. افتح Repository على GitHub
2. اذهب إلى **Settings** → **Secrets and variables** → **Actions**
3. أضف Secret جديد:
   - Name: `REACT_APP_BACKEND_URL`
   - Value: `https://shopper-suite.preview.emergentagent.com`

---

### الخطوة 3: بناء التطبيق

1. اذهب إلى **Actions** في Repository
2. اختر **Build Android APK**
3. اضغط **Run workflow**
4. انتظر 5-10 دقائق
5. حمّل الملفات من **Artifacts**:
   - `app-debug.apk` (للاختبار)
   - `app-release.aab` (لـ Google Play)

---

### الخطوة 4: إنشاء حساب Google Play Developer

1. اذهب إلى [Google Play Console](https://play.google.com/console)
2. ادفع رسوم التسجيل ($25 مرة واحدة)
3. أكمل معلومات الحساب

---

### الخطوة 5: رفع التطبيق على Google Play

1. في Google Play Console، اضغط **Create app**
2. املأ المعلومات:
   - **اسم التطبيق**: ترند سوريا
   - **اللغة**: العربية
   - **نوع التطبيق**: تطبيق
   - **مجاني/مدفوع**: مجاني

3. ارفع ملف `app-release.aab`
4. أضف:
   - وصف التطبيق
   - لقطات شاشة (Screenshots)
   - أيقونة التطبيق
   - سياسة الخصوصية

5. أرسل للمراجعة

---

## 📋 معلومات التطبيق:

| البند | القيمة |
|-------|--------|
| **Package ID** | com.trendsyria.app |
| **اسم التطبيق** | ترند سوريا |
| **الإصدار** | 1.0.0 |
| **الحد الأدنى Android** | 5.1 (API 22) |

---

## ⚠️ ملاحظات مهمة:

1. **لقطات الشاشة**: تحتاج 2 على الأقل بحجم 1080x1920
2. **سياسة الخصوصية**: يجب إنشاء صفحة على موقعك
3. **المراجعة**: تستغرق 1-7 أيام

---

## 🔑 توقيع التطبيق (للإصدارات المستقبلية):

Google Play سيُنشئ مفتاح توقيع تلقائياً عند رفع أول AAB.
احتفظ بنسخة احتياطية من المفتاح!
