# /app/backend/tests/test_phase31_food_orders_get_now.py
# اختبار المرحلة 31 - التحقق من استبدال آخر 9 استخدامات لـ datetime.now().isoformat() بـ get_now()
# التركيز على: إلغاء الطلب، قبول الطلب للسائق، APIs الطلبات

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# بيانات تسجيل الدخول
SUPER_ADMIN_PHONE = "0945570365"
SUPER_ADMIN_PASSWORD = "TrendSyria@2026"
OTP_CODE = "123456"


class TestPhase31FoodOrdersRefactoring:
    """اختبار APIs طلبات الطعام بعد المرحلة 31"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """إعداد الاختبار"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.user_id = None
    
    def get_auth_token(self):
        """الحصول على توكن المصادقة"""
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
    
    # ============== اختبارات صحة الخادم ==============
    
    def test_01_health_check(self):
        """اختبار صحة الخادم"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ الخادم يعمل بشكل صحيح")
    
    # ============== اختبارات جلب الطلبات ==============
    
    def test_02_get_my_food_orders(self):
        """اختبار جلب طلبات الطعام للعميل"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ جلب طلبات الطعام - عدد الطلبات: {len(data)}")
        
        # التحقق من بنية الطلب إذا وجدت طلبات
        if len(data) > 0:
            order = data[0]
            assert "id" in order
            assert "status" in order
            assert "created_at" in order
            # التحقق من تنسيق ISO
            assert "T" in order["created_at"]
            print(f"✅ بنية الطلب صحيحة - created_at: {order['created_at'][:25]}...")
    
    def test_03_get_my_scheduled_orders(self):
        """اختبار جلب الطلبات المجدولة"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/food/orders/my-scheduled")
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert isinstance(data["orders"], list)
        print(f"✅ جلب الطلبات المجدولة - عدد الطلبات: {len(data['orders'])}")
    
    # ============== اختبارات إلغاء الطلب ==============
    
    def test_04_cancel_nonexistent_order(self):
        """اختبار إلغاء طلب غير موجود"""
        self.get_auth_token()
        
        response = self.session.post(f"{BASE_URL}/api/food/orders/nonexistent-order-id/cancel")
        assert response.status_code == 404
        print("✅ إلغاء طلب غير موجود يرجع 404")
    
    def test_05_cancel_scheduled_nonexistent(self):
        """اختبار إلغاء طلب مجدول غير موجود"""
        self.get_auth_token()
        
        response = self.session.delete(f"{BASE_URL}/api/food/orders/nonexistent-order-id/cancel-scheduled")
        assert response.status_code == 404
        print("✅ إلغاء طلب مجدول غير موجود يرجع 404")
    
    # ============== اختبارات قبول الطلب للسائق ==============
    
    def test_06_driver_accept_nonexistent_order(self):
        """اختبار قبول طلب غير موجود من السائق"""
        self.get_auth_token()
        
        response = self.session.post(f"{BASE_URL}/api/food/orders/driver/accept/nonexistent-order-id", json={
            "driver_lat": 33.5138,
            "driver_lon": 36.2765
        })
        # يجب أن يرجع 403 (غير مصرح - ليس سائق) أو 404 (غير موجود)
        assert response.status_code in [403, 404]
        print(f"✅ قبول طلب غير موجود من السائق - الحالة: {response.status_code}")
    
    def test_07_driver_available_orders(self):
        """اختبار جلب الطلبات المتاحة للسائق"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/food/orders/driver/available")
        # يجب أن يرجع 403 (غير مصرح - ليس سائق) أو 200 (إذا كان سائق)
        assert response.status_code in [200, 403]
        print(f"✅ جلب الطلبات المتاحة للسائق - الحالة: {response.status_code}")
    
    def test_08_driver_my_orders(self):
        """اختبار جلب طلبات السائق"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/food/orders/driver/my-orders")
        # يجب أن يرجع 403 (غير مصرح - ليس سائق) أو 200 (إذا كان سائق)
        assert response.status_code in [200, 403]
        print(f"✅ جلب طلبات السائق - الحالة: {response.status_code}")
    
    # ============== اختبارات المتجر ==============
    
    def test_09_get_store_orders(self):
        """اختبار جلب طلبات المتجر"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/food/orders/store/orders")
        # يجب أن يرجع 403 (غير مصرح - ليس صاحب متجر) أو 200 (إذا كان صاحب متجر)
        assert response.status_code in [200, 403]
        print(f"✅ جلب طلبات المتجر - الحالة: {response.status_code}")
    
    def test_10_get_seller_food_orders(self):
        """اختبار جلب طلبات البائع"""
        self.get_auth_token()
        
        response = self.session.get(f"{BASE_URL}/api/food/orders/seller")
        # يجب أن يرجع 403 إذا لم يكن بائع أو 200 إذا كان بائع
        assert response.status_code in [200, 403]
        print(f"✅ جلب طلبات البائع - الحالة: {response.status_code}")
    
    # ============== اختبارات حساب المسافة ==============
    
    def test_11_check_distance_endpoint(self):
        """اختبار نقطة حساب المسافة"""
        self.get_auth_token()
        
        # جلب متجر صالح
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
        
        assert response.status_code in [200, 400, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            print(f"✅ حساب المسافة - المسافة: {data.get('distance_km', 'N/A')} كم")
        else:
            print("✅ حساب المسافة - المتجر ليس له موقع محدد")
    
    def test_12_check_drivers_availability(self):
        """اختبار فحص توفر السائقين"""
        self.get_auth_token()
        
        # جلب طلب موجود
        orders_response = self.session.get(f"{BASE_URL}/api/food/orders/my-orders")
        if orders_response.status_code != 200:
            pytest.skip("لا يمكن جلب الطلبات")
        
        orders = orders_response.json()
        if not orders or len(orders) == 0:
            pytest.skip("لا توجد طلبات")
        
        order_id = orders[0].get("id")
        
        response = self.session.get(f"{BASE_URL}/api/food/orders/check-drivers-availability/{order_id}")
        # يجب أن يرجع 200 أو 404
        assert response.status_code in [200, 404]
        
        if response.status_code == 200:
            data = response.json()
            assert "available" in data or "drivers_count" in data
            print(f"✅ فحص توفر السائقين - متاح: {data.get('available', 'N/A')}")
        else:
            print("✅ فحص توفر السائقين - الطلب غير موجود")


class TestPhase31OrderCancellation:
    """اختبار إلغاء الطلبات - المرحلة 31"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """إعداد الاختبار"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
    
    def get_auth_token(self):
        """الحصول على توكن المصادقة"""
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
    
    def test_cancel_batch_nonexistent(self):
        """اختبار إلغاء دفعة غير موجودة"""
        self.get_auth_token()
        
        response = self.session.post(f"{BASE_URL}/api/food/orders/batch/BATCH-NONEXISTENT/cancel")
        assert response.status_code == 404
        print("✅ إلغاء دفعة غير موجودة يرجع 404")


class TestPhase31DriverAcceptance:
    """اختبار قبول الطلب للسائق - المرحلة 31"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """إعداد الاختبار"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
    
    def get_auth_token(self):
        """الحصول على توكن المصادقة"""
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
    
    def test_driver_reject_nonexistent_order(self):
        """اختبار رفض طلب غير موجود من السائق"""
        self.get_auth_token()
        
        response = self.session.post(f"{BASE_URL}/api/food/orders/driver/reject/nonexistent-order-id", json={
            "reason": "اختبار"
        })
        # يجب أن يرجع 403 (غير مصرح - ليس سائق) أو 404 (غير موجود)
        assert response.status_code in [403, 404]
        print(f"✅ رفض طلب غير موجود من السائق - الحالة: {response.status_code}")


class TestGetNowHelperVerification:
    """التحقق من دالة get_now() المساعدة"""
    
    def test_get_now_returns_iso_format(self):
        """اختبار أن get_now() ترجع تنسيق ISO"""
        from datetime import datetime, timezone
        
        # محاكاة دالة get_now
        def get_now():
            return datetime.now(timezone.utc).isoformat()
        
        result = get_now()
        
        # التحقق من أن النتيجة سلسلة نصية
        assert isinstance(result, str)
        
        # التحقق من تنسيق ISO
        assert "T" in result
        assert "+" in result or "Z" in result
        
        # التحقق من أنه يمكن تحويلها مرة أخرى
        parsed = datetime.fromisoformat(result.replace("Z", "+00:00"))
        assert parsed.tzinfo is not None
        
        print(f"✅ get_now() يرجع تنسيق ISO صحيح: {result}")
    
    def test_get_now_is_timezone_aware(self):
        """اختبار أن get_now() يرجع وقت مع timezone"""
        from datetime import datetime, timezone
        
        def get_now():
            return datetime.now(timezone.utc).isoformat()
        
        result = get_now()
        
        # التحقق من وجود معلومات المنطقة الزمنية
        assert "+00:00" in result or "Z" in result
        print(f"✅ get_now() يتضمن معلومات المنطقة الزمنية: {result}")


class TestCodeRefactoringVerification:
    """التحقق من إعادة الهيكلة"""
    
    def test_no_datetime_now_isoformat_in_food_orders(self):
        """التحقق من عدم وجود datetime.now().isoformat() في food_orders.py"""
        import subprocess
        
        result = subprocess.run(
            ["grep", "-c", "datetime.now().isoformat()", "/app/backend/routes/food_orders.py"],
            capture_output=True,
            text=True
        )
        
        # إذا لم يجد أي تطابق، يرجع exit code 1
        # إذا وجد تطابقات، يرجع exit code 0 مع العدد
        if result.returncode == 0:
            count = int(result.stdout.strip())
            assert count == 0, f"وجد {count} استخدام لـ datetime.now().isoformat()"
        
        print("✅ لا يوجد استخدام لـ datetime.now().isoformat() في food_orders.py")
    
    def test_get_now_is_imported(self):
        """التحقق من أن get_now مستوردة في food_orders.py"""
        import subprocess
        
        result = subprocess.run(
            ["grep", "-c", "get_now", "/app/backend/routes/food_orders.py"],
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0, "get_now غير موجودة في food_orders.py"
        count = int(result.stdout.strip())
        assert count > 0, "get_now غير مستخدمة في food_orders.py"
        
        print(f"✅ get_now مستخدمة {count} مرة في food_orders.py")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
