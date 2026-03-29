# /app/backend/tests/load_test.py
# اختبار الأحمال (Load Testing) باستخدام Locust
# لتشغيل: locust -f /app/backend/tests/load_test.py --host=http://localhost:8001

from locust import HttpUser, task, between
import random

class TrendSyriaUser(HttpUser):
    """محاكاة مستخدم عادي للتطبيق"""
    wait_time = between(1, 3)  # انتظار 1-3 ثانية بين الطلبات
    
    def on_start(self):
        """تسجيل الدخول عند بدء المحاكاة"""
        response = self.client.post("/api/auth/login", json={
            "phone": "0933333333",
            "password": "buyer123"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
        else:
            self.token = None
    
    @property
    def headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    @task(10)
    def view_home(self):
        """عرض الصفحة الرئيسية - الأكثر شيوعاً"""
        self.client.get("/api/categories")
    
    @task(8)
    def browse_products(self):
        """تصفح المنتجات"""
        categories = ["electronics", "fashion", "home", "food"]
        category = random.choice(categories)
        self.client.get(f"/api/products?category={category}&limit=20")
    
    @task(5)
    def search_products(self):
        """البحث عن منتجات"""
        queries = ["هاتف", "حقيبة", "ساعة", "لابتوب", "عطر"]
        query = random.choice(queries)
        self.client.get(f"/api/products/search?q={query}")
    
    @task(3)
    def view_product_details(self):
        """عرض تفاصيل منتج"""
        # جلب المنتجات أولاً
        response = self.client.get("/api/products?limit=5")
        if response.status_code == 200:
            products = response.json().get("products", [])
            if products:
                product_id = random.choice(products).get("id")
                self.client.get(f"/api/products/{product_id}")
    
    @task(4)
    def view_food_stores(self):
        """عرض المطاعم"""
        self.client.get("/api/food/stores?city=دمشق")
    
    @task(2)
    def view_cart(self):
        """عرض السلة"""
        self.client.get("/api/cart", headers=self.headers)
    
    @task(2)
    def view_notifications(self):
        """عرض الإشعارات"""
        self.client.get("/api/notifications", headers=self.headers)
    
    @task(1)
    def view_orders(self):
        """عرض الطلبات"""
        self.client.get("/api/orders/my-orders", headers=self.headers)


class TrendSyriaSellerUser(HttpUser):
    """محاكاة بائع"""
    wait_time = between(2, 5)
    
    def on_start(self):
        """تسجيل دخول البائع"""
        response = self.client.post("/api/auth/login", json={
            "phone": "0988888888",
            "password": "seller456"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
        else:
            self.token = None
    
    @property
    def headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    @task(5)
    def view_my_products(self):
        """عرض منتجاتي"""
        self.client.get("/api/products/my-products", headers=self.headers)
    
    @task(4)
    def view_seller_orders(self):
        """عرض طلبات البائع"""
        self.client.get("/api/orders/seller-orders", headers=self.headers)
    
    @task(2)
    def view_analytics(self):
        """عرض التحليلات"""
        self.client.get("/api/analytics/seller", headers=self.headers)


class TrendSyriaDeliveryUser(HttpUser):
    """محاكاة سائق توصيل"""
    wait_time = between(3, 8)
    
    def on_start(self):
        """تسجيل دخول السائق"""
        response = self.client.post("/api/auth/login", json={
            "phone": "0900000000",
            "password": "delivery123"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
        else:
            self.token = None
    
    @property
    def headers(self):
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    @task(5)
    def view_available_orders(self):
        """عرض الطلبات المتاحة"""
        self.client.get("/api/delivery/available-orders", headers=self.headers)
    
    @task(3)
    def view_my_deliveries(self):
        """عرض توصيلاتي"""
        self.client.get("/api/delivery/my-orders", headers=self.headers)
    
    @task(1)
    def update_location(self):
        """تحديث الموقع"""
        self.client.post("/api/delivery/update-location", 
            headers=self.headers,
            json={
                "latitude": 33.5138 + random.uniform(-0.01, 0.01),
                "longitude": 36.2765 + random.uniform(-0.01, 0.01)
            }
        )


# لتشغيل الاختبار:
# locust -f /app/backend/tests/load_test.py --host=http://localhost:8001 --users=50 --spawn-rate=5 --run-time=5m
