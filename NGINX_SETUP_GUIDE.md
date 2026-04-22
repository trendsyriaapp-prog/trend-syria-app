# دليل إعداد Nginx لـ ترند سوريا
## تحسين الأداء للشبكات السورية البطيئة

---

## الخطوة 1: الاتصال بالسيرفر

```bash
ssh root@130.94.57.227 -p 2222
```

---

## الخطوة 2: التأكد من تثبيت Nginx

```bash
nginx -v
# إذا لم يكن مثبتاً:
apt update && apt install nginx -y
```

---

## الخطوة 3: إنشاء ملف التكوين

```bash
nano /etc/nginx/sites-available/trendsyria
```

انسخ المحتوى التالي:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name trendsyria.com www.trendsyria.com;  # عدّل حسب الدومين

    root /var/www/trendsyria/build;  # مسار مجلد build
    index index.html;

    # ضغط Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/json application/xml 
               application/vnd.ms-fontobject font/opentype image/svg+xml;

    # ============================================
    # Cache-Control للملفات الثابتة (مهم جداً!)
    # ============================================

    # JavaScript و CSS - سنة كاملة
    location ~* \.(?:js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable, max-age=31536000";
        access_log off;
    }

    # الصور - 30 يوم
    location ~* \.(?:png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }

    # الخطوط - سنة
    location ~* \.(?:woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable, max-age=31536000";
        add_header Access-Control-Allow-Origin "*";
        access_log off;
    }

    # Service Worker - يوم واحد
    location ~* ^/(sw\.js|service-worker\.js|workbox-.*\.js)$ {
        expires 1d;
        add_header Cache-Control "public, max-age=86400";
    }

    # React SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        add_header Cache-Control "no-store";
    }
}
```

---

## الخطوة 4: تفعيل التكوين

```bash
# إنشاء الرابط
ln -sf /etc/nginx/sites-available/trendsyria /etc/nginx/sites-enabled/

# حذف التكوين الافتراضي (اختياري)
rm -f /etc/nginx/sites-enabled/default

# اختبار التكوين
nginx -t

# إعادة تشغيل Nginx
systemctl reload nginx
```

---

## الخطوة 5: التحقق من الـ Headers

```bash
# اختبار ملف JavaScript
curl -I https://trendsyria.com/static/js/main.xxxxx.js

# يجب أن ترى:
# cache-control: public, immutable, max-age=31536000
```

---

## ملاحظات مهمة:

### إذا كنت تستخدم Cloudflare:
Cloudflare قد يتجاوز headers المحلية. لتفعيل التخزين المؤقت:
1. اذهب لـ **Cloudflare Dashboard** > **Caching** > **Configuration**
2. عيّن **Browser Cache TTL** إلى "Respect Existing Headers"
3. أو أنشئ **Page Rule** لـ `*trendsyria.com/static/*` مع **Cache Level: Cache Everything**

### إذا كنت تستخدم SSL (Let's Encrypt):
```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d trendsyria.com -d www.trendsyria.com
```

---

## النتيجة المتوقعة:

| نوع الملف | مدة التخزين | التأثير |
|-----------|-------------|---------|
| JS/CSS | سنة | لن يُعاد تحميلها إلا عند التحديث |
| الصور | 30 يوم | تحميل أسرع للصفحات |
| الخطوط | سنة | تحسين أداء النصوص |
| HTML | 0 | تحديثات فورية |

**للشبكات السورية البطيئة**: بعد الزيارة الأولى، سيكون التطبيق أسرع بـ 80%+ لأن معظم الملفات ستُحمَّل من ذاكرة المتصفح!
