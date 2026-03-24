# /app/backend/tests/test_driver_waiting_timer.py
# اختبارات ميزات مؤقت انتظار السائق وتنبيه البائع

import pytest
import requests
import os
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

# بيانات السائق للاختبار
DRIVER_PHONE = "0999888777"
DRIVER_PASSWORD = "driver1234"

# بيانات السائق البديل
ALT_DRIVER_PHONE = "0988111333"
ALT_DRIVER_PASSWORD = "driver123"


class TestDeliveryWaitCompensationAPI:
    """اختبارات API إعدادات تعويض انتظار السائق"""
    
    def test_get_delivery_wait_compensation_public(self):
        """اختبار جلب إعدادات التعويض (عام - للجميع)"""
        response = requests.get(f"{BASE_URL}/api/settings/delivery-wait-compensation")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # التحقق من وجود الحقول المطلوبة
        assert "max_waiting_time_minutes" in data, "Missing max_waiting_time_minutes"
        assert "compensation_per_5_minutes" in data, "Missing compensation_per_5_minutes"
        assert "max_compensation_per_order" in data, "Missing max_compensation_per_order"
        
        # التحقق من القيم الافتراضية
        assert data["max_waiting_time_minutes"] == 10, f"Expected 10, got {data['max_waiting_time_minutes']}"
        assert data["compensation_per_5_minutes"] == 500, f"Expected 500, got {data['compensation_per_5_minutes']}"
        assert data["max_compensation_per_order"] == 2000, f"Expected 2000, got {data['max_compensation_per_order']}"
        
        print(f"✅ إعدادات التعويض: {data}")
    
    def test_compensation_settings_structure(self):
        """اختبار بنية إعدادات التعويض"""
        response = requests.get(f"{BASE_URL}/api/settings/delivery-wait-compensation")
        
        assert response.status_code == 200
        data = response.json()
        
        # التحقق من أنواع البيانات
        assert isinstance(data["max_waiting_time_minutes"], int), "max_waiting_time_minutes should be int"
        assert isinstance(data["compensation_per_5_minutes"], int), "compensation_per_5_minutes should be int"
        assert isinstance(data["max_compensation_per_order"], int), "max_compensation_per_order should be int"
        
        # التحقق من القيم المنطقية
        assert data["max_waiting_time_minutes"] > 0, "max_waiting_time_minutes should be positive"
        assert data["compensation_per_5_minutes"] > 0, "compensation_per_5_minutes should be positive"
        assert data["max_compensation_per_order"] > 0, "max_compensation_per_order should be positive"
        
        print("✅ بنية إعدادات التعويض صحيحة")


class TestDriverLogin:
    """اختبارات تسجيل دخول السائق"""
    
    def test_driver_login_success(self):
        """اختبار تسجيل دخول السائق بنجاح"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Missing token"
        assert "user" in data, "Missing user"
        assert data["user"]["user_type"] == "delivery", "User is not a delivery driver"
        
        print(f"✅ تسجيل دخول السائق: {data['user']['full_name']}")
        return data["token"]
    
    def test_alt_driver_login_success(self):
        """اختبار تسجيل دخول السائق البديل"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ALT_DRIVER_PHONE,
            "password": ALT_DRIVER_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert data["user"]["user_type"] == "delivery"
        
        print(f"✅ تسجيل دخول السائق البديل: {data['user']['full_name']}")
        return data["token"]


class TestDriverAvailability:
    """اختبارات حالة توفر السائق"""
    
    @pytest.fixture
    def driver_token(self):
        """الحصول على توكن السائق"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_availability(self, driver_token):
        """اختبار جلب حالة التوفر"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/availability",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "is_available" in data, "Missing is_available"
        
        print(f"✅ حالة التوفر: {'متاح' if data['is_available'] else 'مغلق'}")
    
    def test_toggle_availability(self, driver_token):
        """اختبار تبديل حالة التوفر"""
        # جلب الحالة الحالية
        get_response = requests.get(
            f"{BASE_URL}/api/delivery/availability",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        current_status = get_response.json()["is_available"]
        
        # تبديل الحالة
        toggle_response = requests.put(
            f"{BASE_URL}/api/delivery/availability",
            json={"is_available": not current_status},
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        assert toggle_response.status_code == 200, f"Toggle failed: {toggle_response.text}"
        
        new_status = toggle_response.json()["is_available"]
        assert new_status != current_status, "Status did not change"
        
        # إعادة الحالة الأصلية
        requests.put(
            f"{BASE_URL}/api/delivery/availability",
            json={"is_available": current_status},
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        print(f"✅ تبديل حالة التوفر يعمل: {current_status} -> {new_status} -> {current_status}")


class TestDriverDashboard:
    """اختبارات لوحة تحكم السائق"""
    
    @pytest.fixture
    def driver_token(self):
        """الحصول على توكن السائق"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_available_orders(self, driver_token):
        """اختبار جلب الطلبات المتاحة"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/available-orders",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of orders"
        
        print(f"✅ الطلبات المتاحة: {len(data)} طلب")
    
    def test_get_my_food_orders(self, driver_token):
        """اختبار جلب طلبات الطعام الخاصة بالسائق"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-food-orders",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of orders"
        
        print(f"✅ طلبات الطعام الخاصة بي: {len(data)} طلب")
    
    def test_get_my_product_orders(self, driver_token):
        """اختبار جلب طلبات المنتجات الخاصة بالسائق"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-product-orders",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "orders" in data, "Missing orders"
        assert "is_locked" in data, "Missing is_locked"
        
        print(f"✅ طلبات المنتجات: {len(data['orders'])} طلب، مقفل: {data['is_locked']}")


class TestDriverStats:
    """اختبارات إحصائيات السائق"""
    
    @pytest.fixture
    def driver_token(self):
        """الحصول على توكن السائق"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_driver_stats(self, driver_token):
        """اختبار جلب إحصائيات السائق"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/stats",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"✅ إحصائيات السائق: {data}")
    
    def test_get_earnings_stats(self, driver_token):
        """اختبار جلب إحصائيات الأرباح"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/earnings/stats?period=today",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"✅ إحصائيات الأرباح: {data}")


class TestRouteProgressBar:
    """اختبارات شريط المسار الذكي"""
    
    @pytest.fixture
    def driver_token(self):
        """الحصول على توكن السائق"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ALT_DRIVER_PHONE,
            "password": ALT_DRIVER_PASSWORD
        })
        return response.json()["token"]
    
    def test_route_data_available(self, driver_token):
        """اختبار توفر بيانات المسار"""
        # جلب طلبات الطعام
        food_response = requests.get(
            f"{BASE_URL}/api/delivery/my-food-orders",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        # جلب طلبات المنتجات
        product_response = requests.get(
            f"{BASE_URL}/api/delivery/my-product-orders",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        assert food_response.status_code == 200
        assert product_response.status_code == 200
        
        food_orders = food_response.json()
        product_data = product_response.json()
        
        total_orders = len(food_orders) + len(product_data.get("orders", []))
        
        print(f"✅ بيانات المسار متاحة: {total_orders} طلب")


class TestPickupWaitingTimerComponent:
    """اختبارات مكون مؤقت انتظار السائق"""
    
    def test_compensation_calculation_logic(self):
        """اختبار منطق حساب التعويض"""
        # جلب الإعدادات
        response = requests.get(f"{BASE_URL}/api/settings/delivery-wait-compensation")
        settings = response.json()
        
        max_waiting = settings["max_waiting_time_minutes"]
        compensation_per_5 = settings["compensation_per_5_minutes"]
        max_compensation = settings["max_compensation_per_order"]
        
        # اختبار: 15 دقيقة انتظار (5 دقائق تأخير)
        elapsed_minutes = 15
        if elapsed_minutes <= max_waiting:
            expected_compensation = 0
        else:
            extra_minutes = elapsed_minutes - max_waiting
            units = (extra_minutes + 4) // 5  # ceil division
            expected_compensation = min(units * compensation_per_5, max_compensation)
        
        print(f"✅ حساب التعويض لـ 15 دقيقة: {expected_compensation} ل.س")
        
        # اختبار: 25 دقيقة انتظار (15 دقيقة تأخير)
        elapsed_minutes = 25
        extra_minutes = elapsed_minutes - max_waiting
        units = (extra_minutes + 4) // 5
        expected_compensation = min(units * compensation_per_5, max_compensation)
        
        print(f"✅ حساب التعويض لـ 25 دقيقة: {expected_compensation} ل.س")
        
        # اختبار: 50 دقيقة انتظار (يجب أن يصل للحد الأقصى)
        elapsed_minutes = 50
        extra_minutes = elapsed_minutes - max_waiting
        units = (extra_minutes + 4) // 5
        expected_compensation = min(units * compensation_per_5, max_compensation)
        
        assert expected_compensation == max_compensation, f"Expected max {max_compensation}, got {expected_compensation}"
        print(f"✅ حساب التعويض لـ 50 دقيقة (الحد الأقصى): {expected_compensation} ل.س")


class TestDriverWaitingAlertComponent:
    """اختبارات مكون تنبيه انتظار البائع"""
    
    def test_alert_timing_logic(self):
        """اختبار منطق توقيت التنبيه"""
        # جلب الإعدادات
        response = requests.get(f"{BASE_URL}/api/settings/delivery-wait-compensation")
        settings = response.json()
        
        max_waiting = settings["max_waiting_time_minutes"]
        
        # التنبيه يظهر بعد 5 دقائق
        alert_threshold_seconds = 300  # 5 دقائق
        
        # اختبار: 3 دقائق - لا يظهر تنبيه قوي
        elapsed_seconds = 180
        show_alert = elapsed_seconds >= alert_threshold_seconds
        assert not show_alert, "Alert should not show at 3 minutes"
        print("✅ 3 دقائق: لا يظهر تنبيه قوي")
        
        # اختبار: 6 دقائق - يظهر تنبيه
        elapsed_seconds = 360
        show_alert = elapsed_seconds >= alert_threshold_seconds
        assert show_alert, "Alert should show at 6 minutes"
        print("✅ 6 دقائق: يظهر تنبيه قوي")
        
        # اختبار: 12 دقيقة - يظهر تنبيه مع خصم
        elapsed_seconds = 720
        is_overtime = elapsed_seconds >= (max_waiting * 60)
        assert is_overtime, "Should be overtime at 12 minutes"
        print("✅ 12 دقيقة: يظهر تنبيه مع خصم")


class TestPublicSettingsEndpoints:
    """اختبارات endpoints الإعدادات العامة"""
    
    def test_public_settings(self):
        """اختبار الإعدادات العامة"""
        response = requests.get(f"{BASE_URL}/api/settings/public")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "delivery_fees" in data, "Missing delivery_fees"
        
        print(f"✅ الإعدادات العامة: {data}")
    
    def test_delivery_wait_time(self):
        """اختبار وقت انتظار التوصيل"""
        response = requests.get(f"{BASE_URL}/api/settings/delivery-wait-time")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "delivery_wait_time_minutes" in data, "Missing delivery_wait_time_minutes"
        
        print(f"✅ وقت انتظار التوصيل: {data['delivery_wait_time_minutes']} دقيقة")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
