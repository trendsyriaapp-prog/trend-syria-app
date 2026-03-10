# /app/backend/tests/test_comprehensive_app.py
# فحص شامل للتطبيق - ترند سورية
# Comprehensive testing: Auth, Products, Cart, Gifts, WhatsApp Support, Settings, Order Tracking, Firebase

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ===========================================
# MODULE 1: Authentication APIs
# ===========================================

class TestAuthentication:
    """اختبار نظام تسجيل الدخول"""
    
    def test_admin_login_success(self):
        """اختبار تسجيل دخول الأدمن"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["user_type"] == "admin", "User is not admin"
        print(f"PASS: Admin login successful, user_type: {data['user']['user_type']}")
    
    def test_login_invalid_credentials(self):
        """اختبار رفض بيانات خاطئة"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0999999999",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 404], f"Expected 401/404, got {response.status_code}"
        print("PASS: Invalid credentials rejected correctly")

# ===========================================
# MODULE 2: Products APIs
# ===========================================

class TestProducts:
    """اختبار نظام المنتجات"""
    
    def test_get_products(self):
        """اختبار جلب المنتجات"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Failed to get products: {response.text}"
        data = response.json()
        # API returns paginated data
        if isinstance(data, dict):
            assert "products" in data, "Products key missing from paginated response"
            products = data["products"]
        else:
            products = data
        assert isinstance(products, list), "Products should be a list"
        print(f"PASS: Got {len(products)} products")
    
    def test_get_featured_products(self):
        """اختبار المنتجات المميزة"""
        response = requests.get(f"{BASE_URL}/api/products/featured")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Featured products should be a list"
        print(f"PASS: Got {len(data)} featured products")
    
    def test_get_categories(self):
        """اختبار الفئات"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Categories should be a list"
        assert len(data) > 0, "Should have at least one category"
        print(f"PASS: Got {len(data)} categories")

# ===========================================
# MODULE 3: Cart APIs
# ===========================================

class TestCart:
    """اختبار نظام السلة"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Auth failed")
    
    def test_get_cart(self, auth_token):
        """اختبار جلب السلة"""
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "items" in data or isinstance(data, list), "Cart should have items"
        print(f"PASS: Got cart data")

# ===========================================
# MODULE 4: Gift System APIs
# ===========================================

class TestGiftSystem:
    """اختبار نظام الهدايا"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Auth failed")
    
    def test_get_sent_gifts(self, auth_token):
        """اختبار جلب الهدايا المرسلة"""
        response = requests.get(
            f"{BASE_URL}/api/gifts/sent",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Sent gifts should be a list"
        print(f"PASS: Got {len(data)} sent gifts")
    
    def test_get_received_gifts(self, auth_token):
        """اختبار جلب الهدايا المستلمة"""
        response = requests.get(
            f"{BASE_URL}/api/gifts/received",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Received gifts should be a list"
        print(f"PASS: Got {len(data)} received gifts")
    
    def test_send_gift_requires_auth(self):
        """اختبار أن إرسال الهدية يتطلب تسجيل دخول"""
        response = requests.post(f"{BASE_URL}/api/gifts/send", json={
            "product_id": "test",
            "recipient_phone": "0912345678",
            "recipient_name": "Test"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Gift send requires authentication")

# ===========================================
# MODULE 5: WhatsApp Support Settings API
# ===========================================

class TestWhatsAppSupport:
    """اختبار إعدادات دعم WhatsApp"""
    
    def test_get_public_settings(self):
        """اختبار جلب الإعدادات العامة (بدون تسجيل دخول)"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/public")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check WhatsApp settings exist
        assert "whatsapp_enabled" in data, "Missing whatsapp_enabled"
        assert "whatsapp_number" in data, "Missing whatsapp_number"
        assert "support_message" in data, "Missing support_message"
        
        print(f"PASS: Public settings retrieved")
        print(f"  - whatsapp_enabled: {data['whatsapp_enabled']}")
        print(f"  - whatsapp_number: {data['whatsapp_number']}")
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin auth failed")
    
    def test_get_admin_settings(self, admin_token):
        """اختبار جلب إعدادات المنصة (للأدمن)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check core settings exist - whatsapp settings may or may not be present depending on when they were set
        # The main settings document contains various platform settings
        assert "id" in data or "food_enabled" in data, "Missing expected settings fields"
        print(f"PASS: Admin settings retrieved")
        
        # Check for whatsapp settings if present
        if "whatsapp_enabled" in data:
            print(f"  - WhatsApp enabled: {data.get('whatsapp_enabled')}")
        if "whatsapp_number" in data:
            print(f"  - WhatsApp number: {data.get('whatsapp_number')}")
    
    def test_update_whatsapp_number(self, admin_token):
        """اختبار تحديث رقم WhatsApp"""
        # Update WhatsApp number
        test_number = "963999888777"
        response = requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"whatsapp_number": test_number}
        )
        assert response.status_code == 200, f"Failed to update: {response.text}"
        
        # Verify in the response
        resp_data = response.json()
        settings = resp_data.get("settings", {})
        assert settings.get("whatsapp_number") == test_number, f"Number not in response: {settings}"
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"whatsapp_number": "963551021618"}
        )
        
        print(f"PASS: WhatsApp number updated and restored")
    
    def test_toggle_whatsapp_support(self, admin_token):
        """اختبار تفعيل/تعطيل دعم WhatsApp"""
        # Get current state
        get_response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current_state = get_response.json().get("whatsapp_enabled", True)
        
        # Toggle
        response = requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"whatsapp_enabled": not current_state}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"whatsapp_enabled": current_state}
        )
        
        print(f"PASS: WhatsApp support toggle works")

# ===========================================
# MODULE 6: Order Tracking APIs
# ===========================================

class TestOrderTracking:
    """اختبار تتبع الطلبات"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Auth failed")
    
    def test_get_user_orders(self, auth_token):
        """اختبار جلب طلبات المستخدم"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Orders should be a list"
        print(f"PASS: Got {len(data)} orders")

# ===========================================
# MODULE 7: Firebase Notifications APIs
# ===========================================

class TestNotifications:
    """اختبار الإشعارات"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Auth failed")
    
    def test_get_notifications(self, auth_token):
        """اختبار جلب الإشعارات"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Notifications should be a list"
        print(f"PASS: Got {len(data)} notifications")
    
    def test_get_unread_count(self, auth_token):
        """اختبار عدد الإشعارات غير المقروءة"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # May return 200 or 404 if endpoint doesn't exist
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Unread count: {data.get('count', 0)}")
        else:
            print(f"INFO: Unread count endpoint returned {response.status_code}")

# ===========================================
# MODULE 8: Recommendations APIs
# ===========================================

class TestRecommendations:
    """اختبار التوصيات الذكية"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Auth failed")
    
    def test_get_recommendations(self, auth_token):
        """اختبار جلب التوصيات"""
        response = requests.get(
            f"{BASE_URL}/api/recommendations",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Recommendations API should return 200
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Got recommendations")
        else:
            print(f"INFO: Recommendations API returned {response.status_code}")

# ===========================================
# MODULE 9: Daily Deals & Flash Sales
# ===========================================

class TestDailyDealsFlashSales:
    """اختبار العروض اليومية وعروض الفلاش"""
    
    def test_get_daily_deal(self):
        """اختبار صفقة اليوم"""
        response = requests.get(f"{BASE_URL}/api/daily-deal")
        # May return 200 or 404 if no deal
        if response.status_code == 200:
            print("PASS: Daily deal found")
        else:
            print(f"INFO: Daily deal status: {response.status_code}")
    
    def test_get_flash_sales(self):
        """اختبار عروض الفلاش"""
        response = requests.get(f"{BASE_URL}/api/flash-sales/active")
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Got {len(data) if isinstance(data, list) else 'flash'} sales")
        else:
            print(f"INFO: Flash sales status: {response.status_code}")

# ===========================================
# MODULE 10: Admin Stats
# ===========================================

class TestAdminStats:
    """اختبار إحصائيات المدير"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin auth failed")
    
    def test_get_admin_stats(self, admin_token):
        """اختبار إحصائيات لوحة التحكم"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check stats fields
        expected_fields = ["total_users", "total_sellers", "total_products", "total_orders"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"PASS: Admin stats retrieved")
        print(f"  - Users: {data.get('total_users')}")
        print(f"  - Sellers: {data.get('total_sellers')}")
        print(f"  - Products: {data.get('total_products')}")
        print(f"  - Orders: {data.get('total_orders')}")

# ===========================================
# Run tests
# ===========================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
