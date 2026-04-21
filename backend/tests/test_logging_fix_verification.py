"""
Test file to verify logging imports fix and API functionality
Tests: health, auth/login, products, food/stores
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"
DUMMY_OTP = "123456"


class TestHealthAPI:
    """Health endpoint tests"""
    
    def test_health_endpoint_returns_200(self):
        """Test /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
        print(f"✅ Health check passed: {data}")


class TestAuthAPI:
    """Authentication endpoint tests"""
    
    def test_login_with_admin_credentials(self):
        """Test admin login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "token" in data
        assert "user" in data
        assert data["user"]["phone"] == ADMIN_PHONE
        assert data["user"]["user_type"] == "admin"
        print(f"✅ Admin login successful: user_type={data['user']['user_type']}")
        
        return data["token"]
    
    def test_login_with_wrong_password(self):
        """Test login with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✅ Wrong password correctly rejected with 401")
    
    def test_login_with_nonexistent_user(self):
        """Test login with non-existent user returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "0999999999", "password": "anypassword"}
        )
        assert response.status_code == 401
        print("✅ Non-existent user correctly rejected with 401")


class TestProductsAPI:
    """Products endpoint tests"""
    
    def test_get_products_list(self):
        """Test /api/products returns product list"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "products" in data
        assert isinstance(data["products"], list)
        assert len(data["products"]) > 0
        
        # Verify product structure
        product = data["products"][0]
        assert "id" in product
        assert "name" in product
        assert "price" in product
        
        print(f"✅ Products API returned {len(data['products'])} products")
    
    def test_get_homepage_data(self):
        """Test /api/products/homepage-data returns homepage data"""
        response = requests.get(f"{BASE_URL}/api/products/homepage-data")
        assert response.status_code == 200
        data = response.json()
        print("✅ Homepage data API working")


class TestFoodStoresAPI:
    """Food stores endpoint tests"""
    
    def test_get_food_stores_list(self):
        """Test /api/food/stores returns store list"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200
        data = response.json()
        
        # Response is a list of stores
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify store structure
        store = data[0]
        assert "id" in store
        assert "name" in store
        
        print(f"✅ Food stores API returned {len(data)} stores")


class TestLoggingImportsFix:
    """Tests to verify logging imports are working correctly"""
    
    def test_auth_login_no_500_error(self):
        """Verify auth.py logging import fix - no 500 error on login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        # Should not return 500 (which would indicate missing import)
        assert response.status_code != 500
        assert response.status_code == 200
        print("✅ auth.py logging import working - no 500 error")
    
    def test_orders_endpoint_no_500_error(self):
        """Verify orders.py logging import fix - endpoint accessible"""
        # Get token first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        token = login_response.json()["token"]
        
        # Try to access orders endpoint
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should not return 500 (which would indicate missing import)
        assert response.status_code != 500
        print(f"✅ orders.py logging import working - status {response.status_code}")
    
    def test_food_orders_endpoint_no_500_error(self):
        """Verify food_orders.py logging import fix - endpoint accessible"""
        # Get token first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        token = login_response.json()["token"]
        
        # Try to access food orders endpoint
        response = requests.get(
            f"{BASE_URL}/api/food/orders/my-orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should not return 500 (which would indicate missing import)
        assert response.status_code != 500
        print(f"✅ food_orders.py logging import working - status {response.status_code}")


class TestPublicSettings:
    """Public settings endpoint tests"""
    
    def test_public_settings(self):
        """Test /api/settings/public returns settings"""
        response = requests.get(f"{BASE_URL}/api/settings/public")
        assert response.status_code == 200
        print("✅ Public settings API working")
    
    def test_admin_public_settings(self):
        """Test /api/admin/settings/public returns settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/public")
        assert response.status_code == 200
        print("✅ Admin public settings API working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
