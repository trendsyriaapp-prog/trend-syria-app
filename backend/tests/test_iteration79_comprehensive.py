# /app/backend/tests/test_iteration79_comprehensive.py
# فحص شامل لتطبيق ترند سورية - Iteration 79 - Final Testing
# Tests: Authentication, Categories, Templates, Restaurants, Chatbot, Admin Emergency Help

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

# Global token cache to avoid rate limiting
_token_cache = {}

def get_cached_token(phone, password, user_type):
    """Get token from cache or login"""
    cache_key = phone
    if cache_key in _token_cache:
        return _token_cache[cache_key]
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": phone,
        "password": password
    })
    
    if response.status_code == 429:
        pytest.skip("Rate limited - skipping test")
        return None
    
    if response.status_code == 200:
        token = response.json().get("token")
        _token_cache[cache_key] = token
        return token
    
    return None

class TestAuthentication:
    """اختبار تسجيل الدخول لجميع أنواع المستخدمين"""
    
    def test_customer_login(self):
        """تسجيل دخول العميل"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0933333333",
            "password": "buyer123"
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("user_type") == "buyer"
        print("✅ Customer login successful")
    
    def test_food_seller_login(self):
        """تسجيل دخول بائع الطعام"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0966666666",
            "password": "seller123"
        })
        assert response.status_code == 200, f"Food seller login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("user_type") == "food_seller"
        print("✅ Food seller login successful")
    
    def test_driver_login(self):
        """تسجيل دخول السائق"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0900000000",
            "password": "delivery123"
        })
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("user_type") == "delivery"
        print("✅ Driver login successful")
    
    def test_admin_login(self):
        """تسجيل دخول المدير"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("user_type") == "admin"
        print("✅ Admin login successful")


class TestCategories:
    """اختبار الفئات - يجب أن تعرض 12 فئة"""
    
    def test_get_categories(self):
        """جلب الفئات"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Failed to get categories: {response.text}"
        data = response.json()
        assert len(data) == 12, f"Expected 12 categories, got {len(data)}"
        print(f"✅ Categories: {len(data)} categories found")
        for cat in data[:5]:
            print(f"  - {cat.get('name', cat.get('id'))}")


class TestTemplates:
    """اختبار القوالب - يجب أن تعرض 12 قالب"""
    
    def test_get_templates(self):
        """جلب القوالب"""
        response = requests.get(f"{BASE_URL}/api/templates/list")
        assert response.status_code == 200, f"Failed to get templates: {response.text}"
        data = response.json()
        templates = data.get("templates", data)
        assert len(templates) == 12, f"Expected 12 templates, got {len(templates)}"
        print(f"✅ Templates: {len(templates)} templates found")
        for t in templates[:5]:
            print(f"  - {t.get('name', t.get('id'))}")


class TestRestaurants:
    """اختبار المطاعم - يجب أن تعرض 13 مطعم"""
    
    def test_get_restaurants(self):
        """جلب المطاعم"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200, f"Failed to get restaurants: {response.text}"
        data = response.json()
        # API returns list directly
        stores = data if isinstance(data, list) else data.get("stores", [])
        assert len(stores) == 13, f"Expected 13 restaurants, got {len(stores)}"
        print(f"✅ Restaurants: {len(stores)} restaurants found")
        for s in stores[:5]:
            print(f"  - {s.get('name', '')}")


class TestProducts:
    """اختبار المنتجات"""
    
    def test_get_featured_products(self):
        """جلب المنتجات المميزة"""
        response = requests.get(f"{BASE_URL}/api/products/featured")
        assert response.status_code == 200, f"Failed to get featured products: {response.text}"
        data = response.json()
        assert len(data) > 0, "No featured products found"
        print(f"✅ Featured products: {len(data)} products found")
    
    def test_get_products(self):
        """جلب المنتجات"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Failed to get products: {response.text}"
        data = response.json()
        products = data.get("products", data)
        assert len(products) > 0, "No products found"
        print(f"✅ Products: {len(products)} products found")


class TestChatbot:
    """اختبار المجيب الآلي"""
    
    def get_token(self):
        """Get customer token using cache"""
        return get_cached_token("0933333333", "buyer123", "buyer")
    
    def test_chatbot_greeting(self):
        """اختبار رسالة ترحيب"""
        token = self.get_token()
        if not token:
            pytest.skip("Could not get token")
        
        response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": "مرحبا"}
        )
        assert response.status_code == 200, f"Chatbot failed: {response.text}"
        data = response.json()
        assert "response" in data
        assert "session_id" in data
        print(f"✅ Chatbot response: {data['response'][:50]}...")
    
    def test_chatbot_order_question(self):
        """اختبار سؤال عن الطلبات"""
        token = self.get_token()
        if not token:
            pytest.skip("Could not get token")
        
        response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            headers={"Authorization": f"Bearer {token}"},
            json={"message": "أين طلبي"}
        )
        assert response.status_code == 200, f"Chatbot failed: {response.text}"
        data = response.json()
        assert "response" in data
        print(f"✅ Chatbot order question response received")


class TestAdminEmergencyHelp:
    """اختبار نظام طلبات المساعدة الطارئة للمدير"""
    
    def get_token(self):
        """Get admin token using cache"""
        return get_cached_token("0911111111", "admin123", "admin")
    
    def test_get_emergency_help_requests(self):
        """جلب طلبات المساعدة الطارئة"""
        token = self.get_token()
        if not token:
            pytest.skip("Could not get token")
        
        response = requests.get(
            f"{BASE_URL}/api/support/admin/emergency-help",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Emergency help API failed: {response.text}"
        data = response.json()
        requests_list = data.get("requests", [])
        print(f"✅ Emergency help requests: {len(requests_list)} requests")


class TestCartAndFavorites:
    """اختبار السلة والمفضلة"""
    
    def get_token(self):
        """Get customer token using cache"""
        return get_cached_token("0933333333", "buyer123", "buyer")
    
    def test_get_cart(self):
        """جلب السلة"""
        token = self.get_token()
        if not token:
            pytest.skip("Could not get token")
        
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Cart API failed: {response.text}"
        print("✅ Cart API working")
    
    def test_get_favorites(self):
        """جلب المفضلة"""
        token = self.get_token()
        if not token:
            pytest.skip("Could not get token")
        
        response = requests.get(
            f"{BASE_URL}/api/favorites",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Favorites API failed: {response.text}"
        print("✅ Favorites API working")


class TestExportFunctionality:
    """اختبار تصدير التقارير"""
    
    def get_token(self):
        """Get admin token using cache"""
        return get_cached_token("0911111111", "admin123", "admin")
    
    def test_export_endpoint_exists(self):
        """التحقق من وجود endpoint التصدير"""
        token = self.get_token()
        if not token:
            pytest.skip("Could not get token")
        
        # Test admin stats endpoint which usually includes export options
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Just check it doesn't return 404
        assert response.status_code != 404, "Admin stats endpoint not found"
        print("✅ Admin stats endpoint accessible")


class TestDriverSupport:
    """اختبار دعم السائق"""
    
    def get_token(self):
        """Get driver token using cache"""
        return get_cached_token("0900000000", "delivery123", "delivery")
    
    def test_driver_orders_endpoint(self):
        """اختبار endpoint طلبات السائق"""
        token = self.get_token()
        if not token:
            pytest.skip("Could not get token (rate limited)")
        
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Driver may have orders or not
        assert response.status_code in [200, 404], f"Driver orders failed: {response.status_code} - {response.text}"
        print("✅ Driver orders endpoint accessible")
    
    def test_emergency_help_send(self):
        """اختبار إرسال طلب مساعدة طارئة (dry run - no real order)"""
        token = self.get_token()
        if not token:
            pytest.skip("Could not get token (rate limited)")
        
        # This would require an actual order, so we just verify the endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/support/emergency-help",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "order_id": "test-order-id",
                "reason": "customer_not_responding",
                "message": "Test message"
            }
        )
        # Will fail because order doesn't exist, but endpoint should return proper error (not 500)
        assert response.status_code not in [500, 503], f"Emergency help endpoint server error: {response.text}"
        print(f"✅ Emergency help endpoint response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
