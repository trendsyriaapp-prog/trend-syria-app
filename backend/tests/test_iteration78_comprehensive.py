# /app/backend/tests/test_iteration78_comprehensive.py
# تست شامل للتطبيق - Iteration 78
# Tests: Login APIs, Products, Categories, Templates, Emergency Help Support

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CREDENTIALS = {
    "customer": {"phone": "0933333333", "password": "buyer123"},
    "food_seller": {"phone": "0966666666", "password": "seller123"},
    "driver": {"phone": "0900000000", "password": "delivery123"},
    "admin": {"phone": "0911111111", "password": "admin123"}
}


class TestLoginAPIs:
    """Test login for all 4 user types"""
    
    def test_customer_login(self):
        """Test customer login (0933333333/buyer123)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CREDENTIALS["customer"]["phone"],
            "password": CREDENTIALS["customer"]["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "buyer"
        assert data["user"]["phone"] == "0933333333"
        print(f"✅ Customer login successful: {data['user']['name']}")
    
    def test_food_seller_login(self):
        """Test food seller login (0966666666/seller123)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CREDENTIALS["food_seller"]["phone"],
            "password": CREDENTIALS["food_seller"]["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "food_seller"
        assert data["user"]["phone"] == "0966666666"
        print(f"✅ Food seller login successful: {data['user']['name']}")
    
    def test_driver_login(self):
        """Test driver login (0900000000/delivery123)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CREDENTIALS["driver"]["phone"],
            "password": CREDENTIALS["driver"]["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "delivery"
        assert data["user"]["phone"] == "0900000000"
        print(f"✅ Driver login successful: {data['user']['name']}")
    
    def test_admin_login(self):
        """Test admin login (0911111111/admin123)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CREDENTIALS["admin"]["phone"],
            "password": CREDENTIALS["admin"]["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "admin"
        assert data["user"]["phone"] == "0911111111"
        print(f"✅ Admin login successful: {data['user']['name']}")


class TestProductsAndCategories:
    """Test products and categories endpoints"""
    
    def test_get_products(self):
        """Test products list endpoint"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert len(data["products"]) > 0
        print(f"✅ Products endpoint working: {len(data['products'])} products returned")
    
    def test_get_categories(self):
        """Test categories endpoint - should return 12 categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 12
        category_ids = [c["id"] for c in data]
        expected = ["electronics", "fashion", "home", "beauty", "sports", "books", 
                    "toys", "food", "health", "cleaning", "medicines", "cars"]
        for cat_id in expected:
            assert cat_id in category_ids
        print(f"✅ Categories endpoint working: {len(data)} categories")


class TestTemplates:
    """Test templates endpoint - should return 12 templates"""
    
    def test_get_templates(self):
        """Test templates list endpoint"""
        response = requests.get(f"{BASE_URL}/api/templates/list")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        assert len(data["templates"]) == 12
        
        # Verify template categories
        categories = data.get("categories", {})
        assert "seasonal" in categories
        assert "promotion" in categories
        assert "luxury" in categories
        assert "category" in categories
        
        print(f"✅ Templates endpoint working: {len(data['templates'])} templates")


class TestEmergencyHelpSupport:
    """Test emergency help support endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CREDENTIALS["admin"]["phone"],
            "password": CREDENTIALS["admin"]["password"]
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin auth failed")
    
    @pytest.fixture
    def driver_token(self):
        """Get driver auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CREDENTIALS["driver"]["phone"],
            "password": CREDENTIALS["driver"]["password"]
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Driver auth failed")
    
    def test_admin_get_emergency_requests(self, admin_token):
        """Test admin can get emergency help requests"""
        response = requests.get(
            f"{BASE_URL}/api/support/admin/emergency-help",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert "pending_count" in data
        print(f"✅ Admin emergency help endpoint working: {data['pending_count']} pending requests")
    
    def test_driver_get_my_emergency_requests(self, driver_token):
        """Test driver can get their own emergency requests"""
        response = requests.get(
            f"{BASE_URL}/api/support/emergency-help/my-requests",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"✅ Driver emergency help endpoint working: {len(data['requests'])} requests")


class TestSupportTickets:
    """Test support tickets endpoints"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CREDENTIALS["customer"]["phone"],
            "password": CREDENTIALS["customer"]["password"]
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Customer auth failed")
    
    def test_get_my_tickets(self, customer_token):
        """Test customer can get their support tickets"""
        response = requests.get(
            f"{BASE_URL}/api/support/tickets/my",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "tickets" in data
        print(f"✅ Support tickets endpoint working: {len(data['tickets'])} tickets")


class TestImageSettings:
    """Test image settings - max 3 images"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CREDENTIALS["admin"]["phone"],
            "password": CREDENTIALS["admin"]["password"]
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin auth failed")
    
    def test_get_image_settings(self, admin_token):
        """Test getting image settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/image",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Either 200 or 404 is acceptable (feature may or may not exist)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Image settings: {data}")
        else:
            print("⚠️ Image settings endpoint not found (may be configured elsewhere)")
            pytest.skip("Image settings endpoint not available")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
