"""
Phase 39 - Test datetime helpers refactoring
تم استبدال 381 استخدام لـ datetime.now في 42 ملف بـ get_now() من ملف مركزي

Tests:
- /api/food/stores - GET - يجب أن يُرجع list
- /api/categories - GET - يجب أن يُرجع list
- /api/auth/login - POST - يجب أن يُرجع token
- /api/wallet/balance - GET (authenticated) - يجب أن يُرجع balance
- /api/admin/orders - GET (admin) - يجب أن يُرجع data و pagination
- /api/admin/delivery/all - GET (admin) - يجب أن يُرجع data و pagination
- /api/orders - GET (authenticated) - يجب أن يُرجع list
- /api/products - GET - يجب أن يُرجع products
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_PHONE = "0945570365"
SUPER_ADMIN_PASSWORD = "TrendSyria@2026"


class TestDatetimeHelpersRefactoring:
    """Test all endpoints after datetime helpers refactoring"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        yield
        self.session.close()
    
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone": SUPER_ADMIN_PHONE,
                "password": SUPER_ADMIN_PASSWORD
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            self.admin_token = data.get("token")
            return self.admin_token
        return None
    
    # ============== Public Endpoints ==============
    
    def test_food_stores_returns_list(self):
        """Test /api/food/stores returns a list"""
        response = self.session.get(f"{BASE_URL}/api/food/stores")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data).__name__}"
        print(f"✅ /api/food/stores returns list with {len(data)} items")
    
    def test_categories_returns_list(self):
        """Test /api/categories returns a list"""
        response = self.session.get(f"{BASE_URL}/api/categories")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data).__name__}"
        print(f"✅ /api/categories returns list with {len(data)} items")
    
    def test_products_returns_list(self):
        """Test /api/products returns products"""
        response = self.session.get(f"{BASE_URL}/api/products")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Products endpoint may return list or dict with products key
        if isinstance(data, list):
            print(f"✅ /api/products returns list with {len(data)} items")
        elif isinstance(data, dict):
            assert "products" in data or "data" in data, f"Expected 'products' or 'data' key in response"
            products = data.get("products", data.get("data", []))
            print(f"✅ /api/products returns dict with {len(products)} products")
        else:
            pytest.fail(f"Unexpected response type: {type(data).__name__}")
    
    # ============== Authentication Endpoint ==============
    
    def test_auth_login_returns_token(self):
        """Test /api/auth/login returns token"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone": SUPER_ADMIN_PHONE,
                "password": SUPER_ADMIN_PASSWORD
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, f"Expected 'token' in response, got keys: {list(data.keys())}"
        assert isinstance(data["token"], str), f"Expected token to be string"
        assert len(data["token"]) > 0, "Token should not be empty"
        
        # Verify user data is also returned
        assert "user" in data, "Expected 'user' in response"
        assert "id" in data["user"], "Expected 'id' in user data"
        
        print(f"✅ /api/auth/login returns token and user data")
    
    def test_auth_login_invalid_credentials(self):
        """Test /api/auth/login with invalid credentials returns 401"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone": "0999999999",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ /api/auth/login returns 401 for invalid credentials")
    
    # ============== Authenticated Endpoints ==============
    
    def test_wallet_balance_returns_balance(self):
        """Test /api/wallet/balance returns balance (authenticated)"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        response = self.session.get(
            f"{BASE_URL}/api/wallet/balance",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify balance fields
        assert "balance" in data, f"Expected 'balance' in response, got keys: {list(data.keys())}"
        assert isinstance(data["balance"], (int, float)), f"Expected balance to be numeric"
        
        # Verify other wallet fields
        expected_fields = ["user_id", "pending_balance", "total_earned"]
        for field in expected_fields:
            if field in data:
                print(f"  - {field}: {data[field]}")
        
        print(f"✅ /api/wallet/balance returns balance: {data['balance']}")
    
    def test_wallet_balance_unauthenticated(self):
        """Test /api/wallet/balance returns 401 without auth"""
        response = self.session.get(f"{BASE_URL}/api/wallet/balance")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ /api/wallet/balance returns {response.status_code} without auth")
    
    def test_orders_returns_list(self):
        """Test /api/orders returns list (authenticated)"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        response = self.session.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data).__name__}"
        print(f"✅ /api/orders returns list with {len(data)} items")
    
    def test_orders_unauthenticated(self):
        """Test /api/orders returns 401 without auth"""
        response = self.session.get(f"{BASE_URL}/api/orders")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ /api/orders returns {response.status_code} without auth")
    
    # ============== Admin Endpoints ==============
    
    def test_admin_orders_returns_data_and_pagination(self):
        """Test /api/admin/orders returns data and pagination (admin)"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify it's a dict with data and pagination
        assert isinstance(data, dict), f"Expected dict, got {type(data).__name__}"
        assert "data" in data, f"Expected 'data' key in response, got keys: {list(data.keys())}"
        assert isinstance(data["data"], list), f"Expected 'data' to be list"
        
        # Check for pagination fields - can be in root or in 'pagination' key
        pagination_fields = ["total", "page", "limit", "pages", "total_pages"]
        has_pagination = any(field in data for field in pagination_fields) or "pagination" in data
        assert has_pagination, f"Expected pagination fields, got keys: {list(data.keys())}"
        
        print(f"✅ /api/admin/orders returns data ({len(data['data'])} items) with pagination")
    
    def test_admin_orders_unauthenticated(self):
        """Test /api/admin/orders returns 401 without auth"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ /api/admin/orders returns {response.status_code} without auth")
    
    def test_admin_delivery_all_returns_data_and_pagination(self):
        """Test /api/admin/delivery/all returns data and pagination (admin)"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/delivery/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify it's a dict with data and pagination
        assert isinstance(data, dict), f"Expected dict, got {type(data).__name__}"
        assert "data" in data, f"Expected 'data' key in response, got keys: {list(data.keys())}"
        assert isinstance(data["data"], list), f"Expected 'data' to be list"
        
        # Check for pagination fields - can be in root or in 'pagination' key
        pagination_fields = ["total", "page", "limit", "pages", "total_pages"]
        has_pagination = any(field in data for field in pagination_fields) or "pagination" in data
        assert has_pagination, f"Expected pagination fields, got keys: {list(data.keys())}"
        
        print(f"✅ /api/admin/delivery/all returns data ({len(data['data'])} items) with pagination")
    
    def test_admin_delivery_all_unauthenticated(self):
        """Test /api/admin/delivery/all returns 401 without auth"""
        response = self.session.get(f"{BASE_URL}/api/admin/delivery/all")
        
        # 429 is also acceptable if rate limited
        assert response.status_code in [401, 403, 429], f"Expected 401/403/429, got {response.status_code}"
        print(f"✅ /api/admin/delivery/all returns {response.status_code} without auth")


class TestDatetimeHelperFile:
    """Test the datetime helper file exists and works correctly"""
    
    def test_datetime_helpers_file_exists(self):
        """Verify datetime_helpers.py exists"""
        import os
        helper_path = "/app/backend/helpers/datetime_helpers.py"
        assert os.path.exists(helper_path), f"Helper file not found: {helper_path}"
        print(f"✅ datetime_helpers.py exists at {helper_path}")
    
    def test_get_now_function_works(self):
        """Test get_now() function returns ISO format string"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        from helpers.datetime_helpers import get_now
        
        result = get_now()
        assert isinstance(result, str), f"Expected string, got {type(result).__name__}"
        
        # Verify ISO format
        from datetime import datetime
        try:
            # Try parsing the ISO format
            parsed = datetime.fromisoformat(result.replace('Z', '+00:00'))
            assert parsed is not None
            print(f"✅ get_now() returns valid ISO format: {result}")
        except ValueError as e:
            pytest.fail(f"get_now() returned invalid ISO format: {result}, error: {e}")
    
    def test_get_today_function_works(self):
        """Test get_today() function returns date string"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        from helpers.datetime_helpers import get_today
        
        result = get_today()
        assert isinstance(result, str), f"Expected string, got {type(result).__name__}"
        
        # Verify date format (YYYY-MM-DD)
        from datetime import datetime
        try:
            parsed = datetime.strptime(result, "%Y-%m-%d")
            assert parsed is not None
            print(f"✅ get_today() returns valid date format: {result}")
        except ValueError as e:
            pytest.fail(f"get_today() returned invalid date format: {result}, error: {e}")


class TestAdditionalEndpoints:
    """Test additional endpoints to verify datetime refactoring"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        yield
        self.session.close()
    
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone": SUPER_ADMIN_PHONE,
                "password": SUPER_ADMIN_PASSWORD
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            self.admin_token = data.get("token")
            return self.admin_token
        return None
    
    def test_settings_public_endpoint(self):
        """Test /api/settings/public returns settings"""
        response = self.session.get(f"{BASE_URL}/api/settings/public")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data).__name__}"
        print(f"✅ /api/settings/public returns settings dict")
    
    def test_food_banners_endpoint(self):
        """Test /api/food/banners returns list"""
        response = self.session.get(f"{BASE_URL}/api/food/banners")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data).__name__}"
        print(f"✅ /api/food/banners returns list with {len(data)} items")
    
    def test_food_flash_sales_active_endpoint(self):
        """Test /api/food/flash-sales/active returns list"""
        response = self.session.get(f"{BASE_URL}/api/food/flash-sales/active")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data).__name__}"
        print(f"✅ /api/food/flash-sales/active returns list with {len(data)} items")
    
    def test_promoted_products_endpoint(self):
        """Test /api/promoted-products returns list"""
        response = self.session.get(f"{BASE_URL}/api/promoted-products")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data).__name__}"
        print(f"✅ /api/promoted-products returns list with {len(data)} items")
    
    def test_auth_me_endpoint(self):
        """Test /api/auth/me returns user data (authenticated)"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, f"Expected 'id' in response"
        assert "phone" in data, f"Expected 'phone' in response"
        print(f"✅ /api/auth/me returns user data for {data.get('phone', 'unknown')}")
    
    def test_delivery_stats_endpoint(self):
        """Test /api/delivery/stats endpoint (admin)"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        response = self.session.get(
            f"{BASE_URL}/api/delivery/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # This endpoint may return 403 if user is not delivery type
        if response.status_code == 403:
            print(f"✅ /api/delivery/stats returns 403 for non-delivery user (expected)")
        elif response.status_code == 200:
            data = response.json()
            print(f"✅ /api/delivery/stats returns stats data")
        else:
            print(f"⚠️ /api/delivery/stats returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
