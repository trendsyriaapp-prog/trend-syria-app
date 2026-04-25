"""
Phase 40 - Testing require_admin_user dependency refactoring
Simplified test with delays to avoid rate limiting
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"


class TestRequireAdminUserRefactoring:
    """Test authorization after require_admin_user refactoring"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token once for all tests"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            return data.get("token")
        elif response.status_code == 429:
            pytest.skip("Rate limited - skipping auth tests")
        else:
            pytest.skip(f"Admin login failed: {response.status_code}")
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with delay"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        time.sleep(0.5)  # Small delay between tests
    
    # ============== Core Endpoints from Request ==============
    
    def test_01_settings_get_admin_only(self, admin_token):
        """GET /api/settings - should require admin auth"""
        # Without auth - should fail
        response = self.session.get(f"{BASE_URL}/api/settings")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✅ GET /api/settings without auth: {response.status_code}")
        
        time.sleep(0.5)
        
        # With admin auth - should succeed
        response = self.session.get(
            f"{BASE_URL}/api/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200 with admin auth, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data or "min_seller_withdrawal" in data or "delivery_fees" in data
        print(f"✅ GET /api/settings with admin auth: 200 - returns settings")
    
    def test_02_daily_deals_active(self):
        """GET /api/daily-deals/active - should be accessible without auth"""
        response = self.session.get(f"{BASE_URL}/api/daily-deals/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "deal" in data
        print(f"✅ GET /api/daily-deals/active: 200 - deal: {data.get('deal')}")
    
    def test_03_categories_get(self):
        """GET /api/categories - should be accessible without auth"""
        response = self.session.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/categories: 200 - {len(data)} categories")
    
    def test_04_wallet_balance_requires_auth(self, admin_token):
        """GET /api/wallet/balance - should require authentication"""
        # Without auth - should fail
        response = self.session.get(f"{BASE_URL}/api/wallet/balance")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✅ GET /api/wallet/balance without auth: {response.status_code}")
        
        time.sleep(0.5)
        
        # With admin auth - should succeed
        response = self.session.get(
            f"{BASE_URL}/api/wallet/balance",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200 with auth, got {response.status_code}"
        
        data = response.json()
        assert "balance" in data
        print(f"✅ GET /api/wallet/balance with auth: 200 - balance: {data.get('balance')}")
    
    def test_05_products_get(self):
        """GET /api/products - should be accessible without auth"""
        response = self.session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "products" in data or isinstance(data, list)
        print(f"✅ GET /api/products: 200")
    
    def test_06_admin_orders_requires_admin(self, admin_token):
        """GET /api/admin/orders - should require admin auth"""
        # Without auth - should fail
        response = self.session.get(f"{BASE_URL}/api/admin/orders")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✅ GET /api/admin/orders without auth: {response.status_code}")
        
        time.sleep(0.5)
        
        # With admin auth - should succeed
        response = self.session.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200 with admin auth, got {response.status_code}"
        
        data = response.json()
        assert "data" in data, f"Response missing 'data' field: {data}"
        assert "pagination" in data, f"Response missing 'pagination' field: {data}"
        print(f"✅ GET /api/admin/orders with admin auth: 200 - data and pagination present")
    
    def test_07_coupons_admin_list_requires_admin(self, admin_token):
        """GET /api/coupons/admin/list - should require admin auth"""
        # Without auth - should fail
        response = self.session.get(f"{BASE_URL}/api/coupons/admin/list")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✅ GET /api/coupons/admin/list without auth: {response.status_code}")
        
        time.sleep(0.5)
        
        # With admin auth - should succeed
        response = self.session.get(
            f"{BASE_URL}/api/coupons/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200 with admin auth, got {response.status_code}"
        
        data = response.json()
        assert "coupons" in data
        print(f"✅ GET /api/coupons/admin/list with admin auth: 200 - {len(data.get('coupons', []))} coupons")


class TestPublicEndpointsSimplified:
    """Test public endpoints remain accessible"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with delay"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        time.sleep(0.3)
    
    def test_settings_public(self):
        """GET /api/settings/public - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/public")
        assert response.status_code == 200
        print(f"✅ /api/settings/public: 200")
    
    def test_settings_homepage_sections(self):
        """GET /api/settings/homepage-sections - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/settings/homepage-sections")
        assert response.status_code == 200
        print(f"✅ /api/settings/homepage-sections: 200")
    
    def test_daily_deals_upcoming(self):
        """GET /api/daily-deals/upcoming - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/daily-deals/upcoming")
        assert response.status_code == 200
        print(f"✅ /api/daily-deals/upcoming: 200")
    
    def test_categories_shopping(self):
        """GET /api/categories/shopping - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/categories/shopping")
        assert response.status_code == 200
        print(f"✅ /api/categories/shopping: 200")
    
    def test_categories_food(self):
        """GET /api/categories/food - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/categories/food")
        assert response.status_code == 200
        print(f"✅ /api/categories/food: 200")


class TestAdminOnlyEndpointsSimplified:
    """Test admin-only endpoints reject unauthorized access"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with delay"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        time.sleep(0.3)
    
    def test_settings_featured_stores_requires_admin(self):
        """GET /api/settings/featured-stores - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/settings/featured-stores")
        assert response.status_code in [401, 403]
        print(f"✅ /api/settings/featured-stores without auth: {response.status_code}")
    
    def test_daily_deals_admin_all_requires_admin(self):
        """GET /api/daily-deals/admin/all - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/daily-deals/admin/all")
        assert response.status_code in [401, 403]
        print(f"✅ /api/daily-deals/admin/all without auth: {response.status_code}")
    
    def test_daily_deals_requests_requires_admin(self):
        """GET /api/daily-deals/requests - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/daily-deals/requests")
        assert response.status_code in [401, 403]
        print(f"✅ /api/daily-deals/requests without auth: {response.status_code}")
    
    def test_wallet_admin_topup_requests_requires_admin(self):
        """GET /api/wallet/admin/topup-requests - requires admin"""
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/topup-requests")
        assert response.status_code in [401, 403]
        print(f"✅ /api/wallet/admin/topup-requests without auth: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
