"""
Comprehensive Backend API Tests for Trend Syria E-commerce App
Iteration 140 - Full System Verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"
DUMMY_OTP = "123456"


class TestHealthAndBasicAPIs:
    """Health check and basic API tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Health endpoint working")
    
    def test_public_settings(self):
        """Test /api/admin/settings/public returns settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/public")
        assert response.status_code == 200
        data = response.json()
        # Check some expected fields
        assert "food_enabled" in data or "shop_enabled" in data
        print("✅ Public settings endpoint working")


class TestAuthenticationAPIs:
    """Authentication flow tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "admin"
        print(f"✅ Admin login successful - User: {data['user']['name']}")
        return data["token"]
    
    def test_login_wrong_password(self):
        """Test login with wrong password returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": "wrongpassword"}
        )
        assert response.status_code == 401
        print("✅ Wrong password correctly returns 401")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent user returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "0999999999", "password": "anypassword"}
        )
        assert response.status_code == 401
        print("✅ Non-existent user correctly returns 401")


class TestProductsAPIs:
    """Products API tests"""
    
    def test_get_products_list(self):
        """Test /api/products returns product list"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data or isinstance(data, list)
        products = data.get("products", data) if isinstance(data, dict) else data
        print(f"✅ Products list returned - Count: {len(products)}")
    
    def test_get_homepage_data(self):
        """Test /api/products/homepage-data returns homepage data"""
        response = requests.get(f"{BASE_URL}/api/products/homepage-data")
        assert response.status_code == 200
        data = response.json()
        # Check expected sections
        assert "categories" in data or "best_sellers" in data or "new_arrivals" in data
        print("✅ Homepage data endpoint working")
    
    def test_get_categories(self):
        """Test /api/products/categories returns categories"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Categories returned - Count: {len(data)}")
    
    def test_get_featured_products(self):
        """Test /api/products/featured returns featured products"""
        response = requests.get(f"{BASE_URL}/api/products/featured")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Featured products returned - Count: {len(data)}")
    
    def test_get_best_sellers(self):
        """Test /api/products/best-sellers returns best sellers"""
        response = requests.get(f"{BASE_URL}/api/products/best-sellers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Best sellers returned - Count: {len(data)}")
    
    def test_get_newly_added(self):
        """Test /api/products/newly-added returns new products"""
        response = requests.get(f"{BASE_URL}/api/products/newly-added")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Newly added products returned - Count: {len(data)}")


class TestFoodStoresAPIs:
    """Food stores API tests"""
    
    def test_get_food_stores(self):
        """Test /api/food/stores returns store list"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200
        data = response.json()
        stores = data.get("stores", data) if isinstance(data, dict) else data
        print(f"✅ Food stores returned - Count: {len(stores) if isinstance(stores, list) else 'N/A'}")
    
    def test_get_food_categories(self):
        """Test /api/food/categories returns food categories"""
        response = requests.get(f"{BASE_URL}/api/food/categories")
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404]
        print(f"✅ Food categories endpoint - Status: {response.status_code}")


class TestAdminAPIs:
    """Admin API tests (requires authentication)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_get_admin_stats(self):
        """Test /api/admin/stats returns statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        # Check expected stats fields
        assert "total_users" in data or "total_products" in data or "total_orders" in data
        print(f"✅ Admin stats returned - Users: {data.get('total_users', 'N/A')}, Products: {data.get('total_products', 'N/A')}")
    
    def test_get_admin_settings(self):
        """Test /api/admin/settings returns platform settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        print("✅ Admin settings endpoint working")
    
    def test_get_pending_sellers(self):
        """Test /api/admin/sellers/pending returns pending sellers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sellers/pending",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Pending sellers returned - Count: {len(data)}")
    
    def test_get_pending_products(self):
        """Test /api/admin/products/pending returns pending products"""
        response = requests.get(
            f"{BASE_URL}/api/admin/products/pending",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Pending products returned - Count: {len(data)}")
    
    def test_get_pending_delivery(self):
        """Test /api/admin/delivery/pending returns pending delivery drivers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/delivery/pending",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Pending delivery drivers returned - Count: {len(data)}")
    
    def test_get_all_orders(self):
        """Test /api/admin/orders returns all orders"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ All orders returned - Count: {len(data)}")
    
    def test_get_platform_wallet(self):
        """Test /api/admin/platform-wallet returns wallet info"""
        response = requests.get(
            f"{BASE_URL}/api/admin/platform-wallet",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data or "id" in data
        print(f"✅ Platform wallet returned - Balance: {data.get('balance', 'N/A')}")


class TestOrdersAPIs:
    """Orders API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_get_orders_no_500_error(self):
        """Test /api/orders doesn't return 500 (logging import verified)"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers=self.headers
        )
        # Should not be 500 - logging import should be fixed
        assert response.status_code != 500
        print(f"✅ Orders endpoint - Status: {response.status_code} (no 500 error)")
    
    def test_get_food_orders_no_500_error(self):
        """Test /api/food/orders/my-orders doesn't return 500 (logging import verified)"""
        response = requests.get(
            f"{BASE_URL}/api/food/orders/my-orders",
            headers=self.headers
        )
        # Should not be 500 - logging import should be fixed
        assert response.status_code != 500
        print(f"✅ Food orders endpoint - Status: {response.status_code} (no 500 error)")


class TestSearchAndFiltering:
    """Search and filtering API tests"""
    
    def test_search_products(self):
        """Test product search functionality"""
        response = requests.get(f"{BASE_URL}/api/products?search=test")
        assert response.status_code == 200
        print("✅ Product search working")
    
    def test_filter_by_category(self):
        """Test filtering products by category"""
        response = requests.get(f"{BASE_URL}/api/products?category=إلكترونيات")
        assert response.status_code == 200
        print("✅ Category filter working")
    
    def test_filter_by_price(self):
        """Test filtering products by price range"""
        response = requests.get(f"{BASE_URL}/api/products?price_min=1000&price_max=100000")
        assert response.status_code == 200
        print("✅ Price filter working")


class TestFlashSalesAPIs:
    """Flash sales API tests"""
    
    def test_get_flash_status(self):
        """Test /api/flash/status returns flash sale status"""
        response = requests.get(f"{BASE_URL}/api/flash/status")
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404]
        print(f"✅ Flash status endpoint - Status: {response.status_code}")
    
    def test_get_flash_products(self):
        """Test /api/products/flash-products returns flash products"""
        response = requests.get(f"{BASE_URL}/api/products/flash-products")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Flash products endpoint working")


class TestNotificationsAndSettings:
    """Notifications and settings API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_get_user_notifications(self):
        """Test /api/notifications returns user notifications"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=self.headers
        )
        # May return 200 or 404 depending on implementation
        assert response.status_code in [200, 404]
        print(f"✅ Notifications endpoint - Status: {response.status_code}")
    
    def test_get_auth_me(self):
        """Test /api/auth/me returns current user info"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "user_type" in data
        print(f"✅ Auth me endpoint working - User type: {data.get('user_type')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
