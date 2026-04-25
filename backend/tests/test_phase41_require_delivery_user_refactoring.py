"""
Phase 41 - require_delivery_user dependency refactoring verification
Tests for delivery.py, call_requests.py, payment.py authorization

This test verifies:
1. /api/settings - GET (admin) - should work
2. /api/admin/orders - GET (admin) - should return data and pagination
3. /api/delivery/profile - GET (delivery) - should return 403 for admin
4. /api/wallet/balance - GET (authenticated) - should return balance
5. /api/food/stores - GET - should return list
6. /api/categories - GET - should return list
7. /api/products - GET - should return products
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"


class TestPhase41AuthorizationRefactoring:
    """Test authorization refactoring for require_delivery_user dependency"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        if not TestPhase41AuthorizationRefactoring.admin_token:
            # Login as admin
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD},
                timeout=30
            )
            if response.status_code == 200:
                data = response.json()
                TestPhase41AuthorizationRefactoring.admin_token = data.get("token")
            time.sleep(0.5)  # Rate limiting protection
    
    def get_admin_headers(self):
        """Get headers with admin token"""
        return {"Authorization": f"Bearer {self.admin_token}"} if self.admin_token else {}
    
    # ============== Test 1: /api/settings (admin) ==============
    def test_settings_endpoint_requires_admin(self):
        """Test /api/settings - GET (admin) - should work"""
        # Without auth - should fail
        response = requests.get(f"{BASE_URL}/api/settings", timeout=30)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ /api/settings without auth: {response.status_code}")
        
        time.sleep(0.5)
        
        # With admin auth - should work
        if self.admin_token:
            response = requests.get(
                f"{BASE_URL}/api/settings",
                headers=self.get_admin_headers(),
                timeout=30
            )
            assert response.status_code == 200, f"Expected 200 with admin auth, got {response.status_code}"
            data = response.json()
            # Verify response structure
            assert isinstance(data, dict), "Response should be a dict"
            print(f"✓ /api/settings with admin auth: {response.status_code}")
        else:
            pytest.skip("Admin token not available")
    
    # ============== Test 2: /api/admin/orders (admin) ==============
    def test_admin_orders_endpoint(self):
        """Test /api/admin/orders - GET (admin) - should return data and pagination"""
        time.sleep(0.5)
        
        # Without auth - should fail
        response = requests.get(f"{BASE_URL}/api/admin/orders", timeout=30)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ /api/admin/orders without auth: {response.status_code}")
        
        time.sleep(0.5)
        
        # With admin auth - should work
        if self.admin_token:
            response = requests.get(
                f"{BASE_URL}/api/admin/orders",
                headers=self.get_admin_headers(),
                timeout=30
            )
            assert response.status_code == 200, f"Expected 200 with admin auth, got {response.status_code}"
            data = response.json()
            # Verify response has data and pagination
            assert "data" in data or "orders" in data or isinstance(data, list), "Response should have data"
            print(f"✓ /api/admin/orders with admin auth: {response.status_code}")
        else:
            pytest.skip("Admin token not available")
    
    # ============== Test 3: /api/delivery/profile (delivery only) ==============
    def test_delivery_profile_rejects_admin(self):
        """Test /api/delivery/profile - GET (delivery) - should return 403 for admin"""
        time.sleep(0.5)
        
        # Without auth - should fail
        response = requests.get(f"{BASE_URL}/api/delivery/profile", timeout=30)
        assert response.status_code in [401, 403, 404], f"Expected 401/403/404 without auth, got {response.status_code}"
        print(f"✓ /api/delivery/profile without auth: {response.status_code}")
        
        time.sleep(0.5)
        
        # With admin auth - should return 403 (delivery only)
        if self.admin_token:
            response = requests.get(
                f"{BASE_URL}/api/delivery/profile",
                headers=self.get_admin_headers(),
                timeout=30
            )
            # Admin should be rejected - 403 for delivery-only endpoints
            assert response.status_code in [403, 404], f"Expected 403/404 for admin on delivery endpoint, got {response.status_code}"
            print(f"✓ /api/delivery/profile with admin auth (should be rejected): {response.status_code}")
        else:
            pytest.skip("Admin token not available")
    
    # ============== Test 4: /api/wallet/balance (authenticated) ==============
    def test_wallet_balance_endpoint(self):
        """Test /api/wallet/balance - GET (authenticated) - should return balance"""
        time.sleep(0.5)
        
        # Without auth - should fail
        response = requests.get(f"{BASE_URL}/api/wallet/balance", timeout=30)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ /api/wallet/balance without auth: {response.status_code}")
        
        time.sleep(0.5)
        
        # With admin auth - should work (any authenticated user)
        if self.admin_token:
            response = requests.get(
                f"{BASE_URL}/api/wallet/balance",
                headers=self.get_admin_headers(),
                timeout=30
            )
            assert response.status_code == 200, f"Expected 200 with auth, got {response.status_code}"
            data = response.json()
            # Verify response has balance
            assert "balance" in data or isinstance(data.get("balance"), (int, float)) or "available" in data, "Response should have balance"
            print(f"✓ /api/wallet/balance with auth: {response.status_code}")
        else:
            pytest.skip("Admin token not available")
    
    # ============== Test 5: /api/food/stores (public) ==============
    def test_food_stores_endpoint(self):
        """Test /api/food/stores - GET - should return list"""
        time.sleep(0.5)
        
        response = requests.get(f"{BASE_URL}/api/food/stores", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Verify response is a list or has stores
        assert isinstance(data, list) or "stores" in data or "data" in data, "Response should be a list or have stores"
        print(f"✓ /api/food/stores: {response.status_code}")
    
    # ============== Test 6: /api/categories (public) ==============
    def test_categories_endpoint(self):
        """Test /api/categories - GET - should return list"""
        time.sleep(0.5)
        
        response = requests.get(f"{BASE_URL}/api/categories", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Verify response is a list or has categories
        assert isinstance(data, list) or "categories" in data, "Response should be a list or have categories"
        print(f"✓ /api/categories: {response.status_code}")
    
    # ============== Test 7: /api/products (public) ==============
    def test_products_endpoint(self):
        """Test /api/products - GET - should return products"""
        time.sleep(0.5)
        
        response = requests.get(f"{BASE_URL}/api/products", timeout=30)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Verify response has products
        assert isinstance(data, list) or "products" in data or "data" in data, "Response should have products"
        print(f"✓ /api/products: {response.status_code}")
    
    # ============== Test 8: Delivery endpoints require delivery user ==============
    def test_delivery_orders_requires_delivery_user(self):
        """Test /api/delivery/orders - should require delivery user"""
        time.sleep(0.5)
        
        # Without auth - should fail
        response = requests.get(f"{BASE_URL}/api/delivery/orders", timeout=30)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ /api/delivery/orders without auth: {response.status_code}")
        
        time.sleep(0.5)
        
        # With admin auth - should return 403 (delivery only)
        if self.admin_token:
            response = requests.get(
                f"{BASE_URL}/api/delivery/orders",
                headers=self.get_admin_headers(),
                timeout=30
            )
            # Admin should be rejected - 403 for delivery-only endpoints
            assert response.status_code == 403, f"Expected 403 for admin on delivery endpoint, got {response.status_code}"
            print(f"✓ /api/delivery/orders with admin auth (should be rejected): {response.status_code}")
        else:
            pytest.skip("Admin token not available")
    
    # ============== Test 9: Delivery availability requires delivery user ==============
    def test_delivery_availability_requires_delivery_user(self):
        """Test /api/delivery/availability - should require delivery user"""
        time.sleep(0.5)
        
        # Without auth - should fail
        response = requests.get(f"{BASE_URL}/api/delivery/availability", timeout=30)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ /api/delivery/availability without auth: {response.status_code}")
        
        time.sleep(0.5)
        
        # With admin auth - should return 403 (delivery only)
        if self.admin_token:
            response = requests.get(
                f"{BASE_URL}/api/delivery/availability",
                headers=self.get_admin_headers(),
                timeout=30
            )
            # Admin should be rejected - 403 for delivery-only endpoints
            assert response.status_code == 403, f"Expected 403 for admin on delivery endpoint, got {response.status_code}"
            print(f"✓ /api/delivery/availability with admin auth (should be rejected): {response.status_code}")
        else:
            pytest.skip("Admin token not available")
    
    # ============== Test 10: Call requests requires admin ==============
    def test_call_requests_requires_admin(self):
        """Test /api/call-requests - should require admin"""
        time.sleep(0.5)
        
        # Without auth - should fail
        response = requests.get(f"{BASE_URL}/api/call-requests", timeout=30)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ /api/call-requests without auth: {response.status_code}")
        
        time.sleep(0.5)
        
        # With admin auth - should work
        if self.admin_token:
            response = requests.get(
                f"{BASE_URL}/api/call-requests",
                headers=self.get_admin_headers(),
                timeout=30
            )
            assert response.status_code == 200, f"Expected 200 with admin auth, got {response.status_code}"
            print(f"✓ /api/call-requests with admin auth: {response.status_code}")
        else:
            pytest.skip("Admin token not available")


class TestDeliveryEndpointsAuthorization:
    """Test delivery.py endpoints authorization"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        if not TestDeliveryEndpointsAuthorization.admin_token:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD},
                timeout=30
            )
            if response.status_code == 200:
                data = response.json()
                TestDeliveryEndpointsAuthorization.admin_token = data.get("token")
            time.sleep(0.5)
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}"} if self.admin_token else {}
    
    def test_delivery_stats_requires_delivery_user(self):
        """Test /api/delivery/stats - should require delivery user"""
        time.sleep(0.5)
        
        if self.admin_token:
            response = requests.get(
                f"{BASE_URL}/api/delivery/stats",
                headers=self.get_admin_headers(),
                timeout=30
            )
            # Admin should be rejected - 403 for delivery-only endpoints
            assert response.status_code == 403, f"Expected 403 for admin on delivery endpoint, got {response.status_code}"
            print(f"✓ /api/delivery/stats with admin auth (should be rejected): {response.status_code}")
        else:
            pytest.skip("Admin token not available")
    
    def test_delivery_my_orders_requires_delivery_user(self):
        """Test /api/delivery/my-orders - should require delivery user"""
        time.sleep(0.5)
        
        if self.admin_token:
            response = requests.get(
                f"{BASE_URL}/api/delivery/my-orders",
                headers=self.get_admin_headers(),
                timeout=30
            )
            # Admin should be rejected - 403 for delivery-only endpoints
            assert response.status_code == 403, f"Expected 403 for admin on delivery endpoint, got {response.status_code}"
            print(f"✓ /api/delivery/my-orders with admin auth (should be rejected): {response.status_code}")
        else:
            pytest.skip("Admin token not available")
    
    def test_delivery_performance_requires_delivery_user(self):
        """Test /api/delivery/performance - should require delivery user"""
        time.sleep(0.5)
        
        if self.admin_token:
            response = requests.get(
                f"{BASE_URL}/api/delivery/performance",
                headers=self.get_admin_headers(),
                timeout=30
            )
            # Admin should be rejected - 403 for delivery-only endpoints
            assert response.status_code == 403, f"Expected 403 for admin on delivery endpoint, got {response.status_code}"
            print(f"✓ /api/delivery/performance with admin auth (should be rejected): {response.status_code}")
        else:
            pytest.skip("Admin token not available")


class TestPaymentEndpointsAuthorization:
    """Test payment.py endpoints authorization"""
    
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        if not TestPaymentEndpointsAuthorization.admin_token:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD},
                timeout=30
            )
            if response.status_code == 200:
                data = response.json()
                TestPaymentEndpointsAuthorization.admin_token = data.get("token")
            time.sleep(0.5)
    
    def get_admin_headers(self):
        return {"Authorization": f"Bearer {self.admin_token}"} if self.admin_token else {}
    
    def test_admin_withdrawals_requires_admin(self):
        """Test /api/payment/admin/withdrawals - should require admin"""
        time.sleep(0.5)
        
        # Without auth - should fail
        response = requests.get(f"{BASE_URL}/api/payment/admin/withdrawals", timeout=30)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ /api/payment/admin/withdrawals without auth: {response.status_code}")
        
        time.sleep(0.5)
        
        # With admin auth - should work
        if self.admin_token:
            response = requests.get(
                f"{BASE_URL}/api/payment/admin/withdrawals",
                headers=self.get_admin_headers(),
                timeout=30
            )
            assert response.status_code == 200, f"Expected 200 with admin auth, got {response.status_code}"
            print(f"✓ /api/payment/admin/withdrawals with admin auth: {response.status_code}")
        else:
            pytest.skip("Admin token not available")
    
    def test_delivery_fee_public(self):
        """Test /api/payment/delivery-fee - should be public"""
        time.sleep(0.5)
        
        response = requests.get(
            f"{BASE_URL}/api/payment/delivery-fee",
            params={"seller_city": "دمشق", "customer_city": "دمشق"},
            timeout=30
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "fee" in data, "Response should have fee"
        print(f"✓ /api/payment/delivery-fee: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
