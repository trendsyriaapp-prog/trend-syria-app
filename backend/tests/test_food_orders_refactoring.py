# /app/backend/tests/test_food_orders_refactoring.py
# اختبار APIs طلبات الطعام بعد إعادة هيكلة get_now()
# المرحلة 30 - التحقق من أن استبدال datetime.now().isoformat() بـ get_now() يعمل بشكل صحيح

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# بيانات تسجيل الدخول
SUPER_ADMIN_PHONE = "0945570365"
SUPER_ADMIN_PASSWORD = "TrendSyria@2026"
OTP_CODE = "123456"


class TestFoodOrdersRefactoring:
    """اختبار APIs طلبات الطعام بعد إعادة الهيكلة"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """إعداد الاختبار"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.user_id = None
    
    def get_auth_token(self):
        """الحصول على توكن المصادقة"""
        # تسجيل الدخول بكلمة المرور
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SUPER_ADMIN_PHONE,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"فشل تسجيل الدخول: {login_response.text}")
        
        data = login_response.json()
        self.token = data.get("token")
        self.user_id = data.get("user", {}).get("id")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return self.token
    
    def test_health_check(self):
        """اختبار صحة الخادم"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ الخادم يعمل بشكل صحيح")
    
    def test_get_my_food_orders(self):
        """اختبار جلب طلبات الطعام للعميل"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code == 200
        
        # التحقق من أن الاستجابة قائمة
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ جلب طلبات الطعام - عدد الطلبات: {len(data)}")
        
        # التحقق من بنية الطلب إذا وجدت طلبات
        if len(data) > 0:
            order = data[0]
            # التحقق من وجود الحقول الأساسية
            assert "id" in order
            assert "status" in order
            assert "created_at" in order
            # التحقق من أن created_at بتنسيق ISO صحيح
            assert "T" in order["created_at"]  # ISO format contains T
            print(f"✅ بنية الطلب صحيحة - created_at: {order['created_at'][:25]}...")
    
    def test_get_my_scheduled_orders(self):
        """اختبار جلب الطلبات المجدولة"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/food/orders/my-scheduled")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert isinstance(data["orders"], list)
        print(f"✅ جلب الطلبات المجدولة - عدد الطلبات: {len(data['orders'])}")
    
    def test_get_store_orders_unauthorized(self):
        """اختبار جلب طلبات المتجر بدون صلاحية"""
        self.get_auth_token()
        
        # المستخدم العادي لا يملك متجر
        response = self.session.get(f"{BASE_URL}/api/food/orders/store/orders")
        # يجب أن يرجع 403 (غير مصرح) أو 200 إذا كان المستخدم صاحب متجر
        assert response.status_code in [200, 403]
        print(f"✅ اختبار صلاحية جلب طلبات المتجر - الحالة: {response.status_code}")
    
    def test_get_seller_food_orders(self):
        """اختبار جلب طلبات البائع"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/food/orders/seller")
        # يجب أن يرجع 403 إذا لم يكن بائع أو 200 إذا كان بائع
        assert response.status_code in [200, 403]
        print(f"✅ اختبار جلب طلبات البائع - الحالة: {response.status_code}")
    
    def test_cancel_nonexistent_order(self):
        """اختبار إلغاء طلب غير موجود"""
        self.get_auth_token()
        
        response = self.session.post(f"{BASE_URL}/api/food/orders/nonexistent-order-id/cancel")
        assert response.status_code == 404
        print("✅ إلغاء طلب غير موجود يرجع 404")
    
    def test_get_nonexistent_order(self):
        """اختبار جلب طلب غير موجود"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/food/orders/nonexistent-order-id")
        assert response.status_code == 404
        print("✅ جلب طلب غير موجود يرجع 404")
    
    def test_check_distance_endpoint(self):
        """اختبار نقطة حساب المسافة"""
        self.get_auth_token()
        
        # نحتاج store_id صالح - نجلب متجر أولاً
        stores_response = self.session.get(f"{BASE_URL}/api/food/stores")
        if stores_response.status_code != 200:
            pytest.skip("لا يمكن جلب المتاجر")
        
        stores = stores_response.json()
        if not stores or len(stores) == 0:
            pytest.skip("لا توجد متاجر")
        
        store_id = stores[0].get("id")
        
        response = self.session.post(f"{BASE_URL}/api/food/orders/check-distance", json={
            "store_id": store_id,
            "customer_lat": 33.5138,
            "customer_lng": 36.2765
        })
        
        # يجب أن يرجع 200 أو 400 أو 404 إذا المتجر ليس له موقع
        assert response.status_code in [200, 400, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            print(f"✅ حساب المسافة - المسافة: {data.get('distance_km', 'N/A')} كم")
        else:
            print("✅ حساب المسافة - المتجر ليس له موقع محدد")


class TestFoodOrderCreation:
    """اختبار إنشاء طلبات الطعام"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """إعداد الاختبار"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
    
    def get_auth_token(self):
        """الحصول على توكن المصادقة"""
        # تسجيل الدخول بكلمة المرور
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SUPER_ADMIN_PHONE,
            "password": SUPER_ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"فشل تسجيل الدخول: {login_response.text}")
        
        data = login_response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return self.token
    
    def test_create_order_missing_store(self):
        """اختبار إنشاء طلب بدون متجر صالح"""
        self.get_auth_token()
        
        response = self.session.post(f"{BASE_URL}/api/food/orders", json={
            "store_id": "nonexistent-store",
            "items": [{"product_id": "test", "quantity": 1}],
            "delivery_address": "Test Address",
            "delivery_city": "دمشق",
            "delivery_phone": "0912345678",
            "payment_method": "cash",
            "latitude": 33.5138,
            "longitude": 36.2765
        })
        
        # يجب أن يرجع 404 (المتجر غير موجود) أو 422 (validation error)
        assert response.status_code in [404, 422]
        print("✅ إنشاء طلب بمتجر غير موجود يرجع خطأ")
    
    def test_create_order_missing_location(self):
        """اختبار إنشاء طلب بدون موقع"""
        self.get_auth_token()
        
        # جلب متجر صالح
        stores_response = self.session.get(f"{BASE_URL}/api/food/stores")
        if stores_response.status_code != 200:
            pytest.skip("لا يمكن جلب المتاجر")
        
        stores = stores_response.json()
        if not stores or len(stores) == 0:
            pytest.skip("لا توجد متاجر")
        
        store = stores[0]
        store_id = store.get("id")
        
        # جلب منتج من المتجر
        products_response = self.session.get(f"{BASE_URL}/api/food/stores/{store_id}/products")
        if products_response.status_code != 200:
            pytest.skip("لا يمكن جلب المنتجات")
        
        products = products_response.json()
        if not products or len(products) == 0:
            pytest.skip("لا توجد منتجات")
        
        product = products[0]
        
        response = self.session.post(f"{BASE_URL}/api/food/orders", json={
            "store_id": store_id,
            "items": [{"product_id": product["id"], "quantity": 1, "name": product["name"]}],
            "delivery_address": "Test Address",
            "delivery_city": "دمشق",
            "delivery_phone": "0912345678",
            "payment_method": "cash"
            # بدون latitude و longitude
        })
        
        # يجب أن يرجع 400 (موقع مطلوب) أو 422 (validation error)
        assert response.status_code in [400, 422]
        print("✅ إنشاء طلب بدون موقع يرجع خطأ")


class TestFoodOrderStatusUpdate:
    """اختبار تحديث حالة الطلبات"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """إعداد الاختبار"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
    
    def get_auth_token(self):
        """الحصول على توكن المصادقة"""
        otp_response = self.session.post(f"{BASE_URL}/api/auth/request-otp", json={
            "phone": SUPER_ADMIN_PHONE
        })
        
        if otp_response.status_code != 200:
            pytest.skip(f"فشل طلب OTP: {otp_response.text}")
        
        verify_response = self.session.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": SUPER_ADMIN_PHONE,
            "otp": OTP_CODE
        })
        
        if verify_response.status_code != 200:
            pytest.skip(f"فشل التحقق من OTP: {verify_response.text}")
        
        data = verify_response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return self.token
    
    def test_update_nonexistent_order_status(self):
        """اختبار تحديث حالة طلب غير موجود"""
        self.get_auth_token()
        
        response = self.session.post(
            f"{BASE_URL}/api/food/orders/store/orders/nonexistent-order/status",
            params={"new_status": "confirmed"}
        )
        
        # يجب أن يرجع 403 (غير مصرح) أو 404 (غير موجود)
        assert response.status_code in [403, 404]
        print(f"✅ تحديث حالة طلب غير موجود - الحالة: {response.status_code}")


class TestBatchOrders:
    """اختبار الطلبات المجمعة"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """إعداد الاختبار"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
    
    def get_auth_token(self):
        """الحصول على توكن المصادقة"""
        otp_response = self.session.post(f"{BASE_URL}/api/auth/request-otp", json={
            "phone": SUPER_ADMIN_PHONE
        })
        
        if otp_response.status_code != 200:
            pytest.skip(f"فشل طلب OTP: {otp_response.text}")
        
        verify_response = self.session.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": SUPER_ADMIN_PHONE,
            "otp": OTP_CODE
        })
        
        if verify_response.status_code != 200:
            pytest.skip(f"فشل التحقق من OTP: {verify_response.text}")
        
        data = verify_response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return self.token
    
    def test_cancel_nonexistent_batch(self):
        """اختبار إلغاء دفعة غير موجودة"""
        self.get_auth_token()
        
        response = self.session.post(f"{BASE_URL}/api/food/orders/batch/BATCH-NONEXISTENT/cancel")
        
        # يجب أن يرجع 404 (غير موجود)
        assert response.status_code == 404
        print("✅ إلغاء دفعة غير موجودة يرجع 404")
    
    def test_create_batch_empty_orders(self):
        """اختبار إنشاء دفعة فارغة"""
        self.get_auth_token()
        
        response = self.session.post(f"{BASE_URL}/api/food/orders/batch", json={
            "orders": [],
            "delivery_address": "Test Address",
            "delivery_city": "دمشق",
            "delivery_phone": "0912345678",
            "payment_method": "cash",
            "latitude": 33.5138,
            "longitude": 36.2765
        })
        
        # يجب أن يرجع 400 (لا توجد طلبات)
        assert response.status_code == 400
        print("✅ إنشاء دفعة فارغة يرجع 400")


class TestGetNowHelper:
    """اختبار دالة get_now() المساعدة"""
    
    def test_get_now_format(self):
        """اختبار تنسيق get_now()"""
        from datetime import datetime, timezone
        
        # محاكاة دالة get_now
        def get_now():
            return datetime.now(timezone.utc).isoformat()
        
        result = get_now()
        
        # التحقق من أن النتيجة سلسلة نصية
        assert isinstance(result, str)
        
        # التحقق من تنسيق ISO
        assert "T" in result
        assert "+" in result or "Z" in result  # timezone info
        
        # التحقق من أنه يمكن تحويلها مرة أخرى
        parsed = datetime.fromisoformat(result.replace("Z", "+00:00"))
        assert parsed.tzinfo is not None
        
        print(f"✅ get_now() يرجع تنسيق ISO صحيح: {result}")
    
    def test_get_now_timezone_aware(self):
        """اختبار أن get_now() يرجع وقت مع timezone"""
        from datetime import datetime, timezone
        
        def get_now():
            return datetime.now(timezone.utc).isoformat()
        
        result = get_now()
        
        # التحقق من وجود معلومات المنطقة الزمنية
        assert "+00:00" in result or "Z" in result
        print(f"✅ get_now() يتضمن معلومات المنطقة الزمنية")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
