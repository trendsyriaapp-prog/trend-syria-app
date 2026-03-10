# 🔒 دليل الأمان - ترند سورية

## طبقات الحماية المُطبقة

### 1. Rate Limiting ⏱️
- **تسجيل الدخول**: 5 محاولات/دقيقة
- **التسجيل**: 3 محاولات/دقيقة
- **API عام**: 100 طلب/دقيقة
- **استعادة كلمة المرور**: 3 محاولات/ساعة

### 2. تشفير كلمات المرور 🔐
- استخدام **bcrypt** بـ 12 rounds
- تحديث تلقائي من SHA256 القديم إلى bcrypt

### 3. حماية من Injection 💉
- تنظيف جميع المدخلات من HTML/JavaScript
- حماية من MongoDB Injection
- حظر أنماط خطيرة ($where, $regex, etc.)

### 4. CORS محسّن 🌐
- تقييد Origins المسموحة
- تحديد Methods المسموحة
- تحديد Headers المسموحة

### 5. Security Headers 🛡️
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'...
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### 6. JWT محسّن 🎫
- مفتاح سري قوي (64 حرف)
- صلاحية 7 أيام
- تجديد تلقائي عند الاقتراب من الانتهاء
- Refresh Token لمدة 30 يوم

### 7. حماية Brute Force 🚫
- قفل الحساب بعد 5 محاولات فاشلة
- مدة القفل: 15 دقيقة
- تسجيل المحاولات المشبوهة

### 8. تسجيل الأنشطة الأمنية 📝
- ملف السجلات: `/app/backend/logs/security.log`
- تسجيل: محاولات الدخول الفاشلة، تجاوز Rate Limit، أنشطة مشبوهة

### 9. التحقق من البيانات ✅
- التحقق من صحة أرقام الهواتف السورية
- التحقق من قوة كلمة المرور
- التحقق من صحة البريد الإلكتروني والروابط

### 10. قائمة IPs المحظورة ⛔
- إمكانية حظر IPs مشبوهة
- حظر تلقائي بعد أنشطة خطيرة

---

## كيفية المراقبة

### مراقبة السجلات الأمنية:
```bash
tail -f /app/backend/logs/security.log
```

### التحقق من محاولات الاختراق:
```bash
grep "CRITICAL" /app/backend/logs/security.log
```

---

## ملاحظات للمطورين

1. **لا تستخدم** `hash_password()` - استخدم `hash_password_secure()` من security.py
2. **دائماً** استخدم `sanitize_input()` للمدخلات من المستخدم
3. **لا تعرض** رسائل خطأ تفصيلية للمستخدم
4. **سجّل** أي نشاط مشبوه باستخدام `log_suspicious_activity()`

---

آخر تحديث: مارس 2026
