"""
Phase 40 - Testing require_admin_user dependency refactoring
Tests authorization for endpoints in:
- settings.py (25 endpoints updated)
- daily_deals.py (require_admin_user added)
- categories.py (require_admin_user added)
- wallet.py (require_admin_user added)
- coupons.py (authorization testing)
- admin.py (orders endpoint)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"


class TestAuthorizationRefactoring:
    """Test authorization after require_admin_user refactoring"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
    
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.admin_token = data.get("token")
            return self.admin_token
        elif response.status_code == 429:
            pytest.skip("Rate limited - skipping auth tests")
        else:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    # ============== Settings Endpoints ==============
    
    def test_settings_get_admin_only(self):
        """GET /api/settings - should require admin auth"""
        # Without auth - should fail
        response = self.session.get(f"{BASE_URL}/api/settings")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # With admin auth - should succeed
        token = self.get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        
        response = self.session.get(
            f"{BASE_URL}/api/settings",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200 with admin auth, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "id" in data or "min_seller_withdrawal" in data or "delivery_fees" in data, \
            f"Settings response missing expected fields: {data}"
        print(f"✅ GET /api/settings - returns settings data")
    
    def test_settings_public_no_auth(self):
        """GET /api/settings/public - should be accessible without auth"""
        response = self.session.get(f"{BASE_URL}/api/settings/public")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "delivery_fees" in data or "free_shipping_threshold" in data, \
            f"Public settings missing expected fields: {data}"
        print(f"✅ GET /api/settings/public - accessible without auth")
    
    def test_settings_featured_stores_admin_only(self):
        """GET /api/settings/featured-stores - should require admin auth"""
        # Without auth - should fail
        response = self.session.get(f"{BASE_URL}/api/settings/featured-stores")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # With admin auth - should succeed
        token = self.get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        
        response = self.session.get(
            f"{BASE_URL}/api/settings/featured-stores",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200 with admin auth, got {response.status_code}"
        print(f"✅ GET /api/settings/featured-stores - requires admin auth")
    
    # ============== Daily Deals Endpoints ==============
    
    def test_daily_deals_active_no_auth(self):
        """GET /api/daily-deals/active - should be accessible without auth"""
        response = self.session.get(f"{BASE_URL}/api/daily-deals/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "deal" in data, f"Response missing 'deal' field: {data}"
        print(f"✅ GET /api/daily-deals/active - accessible without auth, deal: {data.get('deal')}")
    
    def test_daily_deals_admin_all_requires_auth(self):
        """GET /api/daily-deals/admin/all - should require admin auth"""
        # Without auth - should fail
        response = self.session.get(f"{BASE_URL}/api/daily-deals/admin/all")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # With admin auth - should succeed
        token = self.get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        
        response = self.session.get(
            f"{BASE_URL}/api/daily-deals/admin/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200 with admin auth, got {response.status_code}"
        
        data = response.json()
        assert "deals" in data, f"Response missing 'deals' field: {data}"
        print(f"✅ GET /api/daily-deals/admin/all - requires admin auth, deals count: {len(data.get('deals', []))}")
    
    # ============== Categories Endpoints ==============
    
    def test_categories_get_no_auth(self):
        """GET /api/categories - should be accessible without auth"""
        response = self.session.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✅ GET /api/categories - returns list with {len(data)} categories")
    
    def test_categories_shopping_no_auth(self):
        """GET /api/categories/shopping - should be accessible without auth"""
        response = self.session.get(f"{BASE_URL}/api/categories/shopping")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✅ GET /api/categories/shopping - returns list with {len(data)} shopping categories")
    
    def test_categories_food_no_auth(self):
        """GET /api/categories/food - should be accessible without auth"""
        response = self.session.get(f"{BASE_URL}/api/categories/food")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✅ GET /api/categories/food - returns list with {len(data)} food categories")
    
    def test_categories_create_requires_admin(self):
        """POST /api/categories - should require admin auth"""
        # Without auth - should fail
        response = self.session.post(f"{BASE_URL}/api/categories", json={
            "name": "TEST_Category",
            "icon": "Package",
            "type": "shopping"
        })
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✅ POST /api/categories - requires admin auth (got {response.status_code})")
    
    # ============== Wallet Endpoints ==============
    
    def test_wallet_balance_requires_auth(self):
        """GET /api/wallet/balance - should require authentication"""
        # Without auth - should fail
        response = self.session.get(f"{BASE_URL}/api/wallet/balance")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # With admin auth - should succeed
        token = self.get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        
        response = self.session.get(
            f"{BASE_URL}/api/wallet/balance",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200 with auth, got {response.status_code}"
        
        data = response.json()
        assert "balance" in data, f"Response missing 'balance' field: {data}"
        print(f"✅ GET /api/wallet/balance - returns balance: {data.get('balance')}")
    
    def test_wallet_transactions_requires_auth(self):
        """GET /api/wallet/transactions - should require authentication"""
        # Without auth - should fail
        response = self.session.get(f"{BASE_URL}/api/wallet/transactions")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # With admin auth - should succeed
        token = self.get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        
        response = self.session.get(
            f"{BASE_URL}/api/wallet/transactions",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200 with auth, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✅ GET /api/wallet/transactions - returns list with {len(data)} transactions")
    
    # ============== Products Endpoints ==============
    
    def test_products_get_no_auth(self):
        """GET /api/products - should be accessible without auth"""
        response = self.session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "products" in data or isinstance(data, list), f"Unexpected response format: {data}"
        print(f"✅ GET /api/products - accessible without auth")
    
    # ============== Admin Orders Endpoints ==============
    
    def test_admin_orders_requires_admin(self):
        """GET /api/admin/orders - should require admin auth"""
        # Without auth - should fail
        response = self.session.get(f"{BASE_URL}/api/admin/orders")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # With admin auth - should succeed
        token = self.get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        
        response = self.session.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200 with admin auth, got {response.status_code}"
        
        data = response.json()
        assert "data" in data, f"Response missing 'data' field: {data}"
        assert "pagination" in data, f"Response missing 'pagination' field: {data}"
        print(f"✅ GET /api/admin/orders - returns data and pagination")
    
    # ============== Coupons Endpoints ==============
    
    def test_coupons_admin_list_requires_admin(self):
        """GET /api/coupons/admin/list - should require admin auth"""
        # Without auth - should fail
        response = self.session.get(f"{BASE_URL}/api/coupons/admin/list")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # With admin auth - should succeed
        token = self.get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        
        response = self.session.get(
            f"{BASE_URL}/api/coupons/admin/list",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200 with admin auth, got {response.status_code}"
        
        data = response.json()
        assert "coupons" in data, f"Response missing 'coupons' field: {data}"
        print(f"✅ GET /api/coupons/admin/list - requires admin auth, coupons count: {len(data.get('coupons', []))}")
    
    def test_coupons_create_requires_admin(self):
        """POST /api/coupons/admin/create - should require admin auth"""
        # Without auth - should fail
        response = self.session.post(f"{BASE_URL}/api/coupons/admin/create", json={
            "code": "TEST_COUPON",
            "discount_type": "percentage",
            "discount_value": 10
        })
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✅ POST /api/coupons/admin/create - requires admin auth (got {response.status_code})")


class TestPublicEndpoints:
    """Test that public endpoints remain accessible"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_settings_public(self):
        """GET /api/settings/public - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/public")
        assert response.status_code == 200
        print(f"✅ /api/settings/public - accessible")
    
    def test_settings_homepage_sections(self):
        """GET /api/settings/homepage-sections - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/homepage-sections")
        assert response.status_code == 200
        print(f"✅ /api/settings/homepage-sections - accessible")
    
    def test_settings_product_badges(self):
        """GET /api/settings/product-badges - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/product-badges")
        assert response.status_code == 200
        print(f"✅ /api/settings/product-badges - accessible")
    
    def test_settings_global_free_shipping(self):
        """GET /api/settings/global-free-shipping - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/global-free-shipping")
        assert response.status_code == 200
        print(f"✅ /api/settings/global-free-shipping - accessible")
    
    def test_settings_distance_delivery(self):
        """GET /api/settings/distance-delivery - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/distance-delivery")
        assert response.status_code == 200
        print(f"✅ /api/settings/distance-delivery - accessible")
    
    def test_settings_driver_earnings(self):
        """GET /api/settings/driver-earnings - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/driver-earnings")
        assert response.status_code == 200
        print(f"✅ /api/settings/driver-earnings - accessible")
    
    def test_settings_delivery_wait_time(self):
        """GET /api/settings/delivery-wait-time - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/delivery-wait-time")
        assert response.status_code == 200
        print(f"✅ /api/settings/delivery-wait-time - accessible")
    
    def test_settings_delivery_wait_compensation(self):
        """GET /api/settings/delivery-wait-compensation - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/delivery-wait-compensation")
        assert response.status_code == 200
        print(f"✅ /api/settings/delivery-wait-compensation - accessible")
    
    def test_settings_smart_order_limits(self):
        """GET /api/settings/smart-order-limits - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/smart-order-limits")
        assert response.status_code == 200
        print(f"✅ /api/settings/smart-order-limits - accessible")
    
    def test_settings_low_stock_threshold(self):
        """GET /api/settings/low-stock-threshold - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/low-stock-threshold")
        assert response.status_code == 200
        print(f"✅ /api/settings/low-stock-threshold - accessible")
    
    def test_settings_wallet(self):
        """GET /api/settings/wallet - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/wallet")
        assert response.status_code == 200
        print(f"✅ /api/settings/wallet - accessible")
    
    def test_settings_delivery_settings(self):
        """GET /api/settings/delivery-settings - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/delivery-settings")
        assert response.status_code == 200
        print(f"✅ /api/settings/delivery-settings - accessible")
    
    def test_settings_surge_pricing(self):
        """GET /api/settings/surge-pricing - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/surge-pricing")
        assert response.status_code == 200
        print(f"✅ /api/settings/surge-pricing - accessible")
    
    def test_daily_deals_active(self):
        """GET /api/daily-deals/active - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/daily-deals/active")
        assert response.status_code == 200
        print(f"✅ /api/daily-deals/active - accessible")
    
    def test_daily_deals_upcoming(self):
        """GET /api/daily-deals/upcoming - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/daily-deals/upcoming")
        assert response.status_code == 200
        print(f"✅ /api/daily-deals/upcoming - accessible")
    
    def test_categories(self):
        """GET /api/categories - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        print(f"✅ /api/categories - accessible")
    
    def test_products(self):
        """GET /api/products - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        print(f"✅ /api/products - accessible")


class TestAdminOnlyEndpoints:
    """Test that admin-only endpoints properly reject unauthorized access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
    
    def get_admin_token(self):
        """Get admin authentication token"""
        if self.admin_token:
            return self.admin_token
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.admin_token = data.get("token")
            return self.admin_token
        elif response.status_code == 429:
            pytest.skip("Rate limited")
        return None
    
    def test_settings_main_requires_admin(self):
        """GET /api/settings - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/settings")
        assert response.status_code in [401, 403]
        print(f"✅ /api/settings - properly rejects unauthorized (got {response.status_code})")
    
    def test_settings_featured_stores_requires_admin(self):
        """GET /api/settings/featured-stores - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/settings/featured-stores")
        assert response.status_code in [401, 403]
        print(f"✅ /api/settings/featured-stores - properly rejects unauthorized")
    
    def test_settings_weather_api_requires_admin(self):
        """GET /api/settings/weather-api - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/settings/weather-api")
        assert response.status_code in [401, 403]
        print(f"✅ /api/settings/weather-api - properly rejects unauthorized")
    
    def test_settings_driver_km_settings_requires_admin(self):
        """GET /api/settings/driver-km-settings - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/settings/driver-km-settings")
        assert response.status_code in [401, 403]
        print(f"✅ /api/settings/driver-km-settings - properly rejects unauthorized")
    
    def test_settings_food_delivery_limits_requires_admin(self):
        """GET /api/settings/food-delivery-limits - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/settings/food-delivery-limits")
        assert response.status_code in [401, 403]
        print(f"✅ /api/settings/food-delivery-limits - properly rejects unauthorized")
    
    def test_settings_store_customer_distance_requires_admin(self):
        """GET /api/settings/store-customer-distance - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/settings/store-customer-distance")
        assert response.status_code in [401, 403]
        print(f"✅ /api/settings/store-customer-distance - properly rejects unauthorized")
    
    def test_settings_driver_cancel_requires_admin(self):
        """GET /api/settings/driver-cancel - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/settings/driver-cancel")
        assert response.status_code in [401, 403]
        print(f"✅ /api/settings/driver-cancel - properly rejects unauthorized")
    
    def test_daily_deals_admin_all_requires_admin(self):
        """GET /api/daily-deals/admin/all - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/daily-deals/admin/all")
        assert response.status_code in [401, 403]
        print(f"✅ /api/daily-deals/admin/all - properly rejects unauthorized")
    
    def test_daily_deals_requests_requires_admin(self):
        """GET /api/daily-deals/requests - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/daily-deals/requests")
        assert response.status_code in [401, 403]
        print(f"✅ /api/daily-deals/requests - properly rejects unauthorized")
    
    def test_admin_orders_requires_admin(self):
        """GET /api/admin/orders - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/admin/orders")
        assert response.status_code in [401, 403]
        print(f"✅ /api/admin/orders - properly rejects unauthorized")
    
    def test_coupons_admin_list_requires_admin(self):
        """GET /api/coupons/admin/list - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/coupons/admin/list")
        assert response.status_code in [401, 403]
        print(f"✅ /api/coupons/admin/list - properly rejects unauthorized")
    
    def test_wallet_admin_topup_requests_requires_admin(self):
        """GET /api/wallet/admin/topup-requests - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/topup-requests")
        assert response.status_code in [401, 403]
        print(f"✅ /api/wallet/admin/topup-requests - properly rejects unauthorized")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
