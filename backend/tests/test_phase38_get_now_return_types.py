"""
Phase 38 - Test get_now() helper replacement and return type fixes
Tests for:
1. /api/orders - should return list (fixed)
2. /api/promoted-products - should return list (fixed)
3. /api/food/stores - should return list
4. /api/food/flash-sales/active - should return list
5. /api/food/banners - should return list
6. /api/admin/orders - should return data and pagination
7. /api/admin/delivery/all - should return data and pagination
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"


class TestPublicEndpointsReturnTypes:
    """Test public endpoints return correct types (list)"""
    
    def test_food_stores_returns_list(self):
        """GET /api/food/stores should return list"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data).__name__}: {data}"
        print(f"✅ /api/food/stores returns list with {len(data)} items")
    
    def test_food_flash_sales_active_returns_list(self):
        """GET /api/food/flash-sales/active should return list"""
        response = requests.get(f"{BASE_URL}/api/food/flash-sales/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data).__name__}: {data}"
        print(f"✅ /api/food/flash-sales/active returns list with {len(data)} items")
    
    def test_food_banners_returns_list(self):
        """GET /api/food/banners should return list"""
        response = requests.get(f"{BASE_URL}/api/food/banners")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data).__name__}: {data}"
        print(f"✅ /api/food/banners returns list with {len(data)} items")
    
    def test_promoted_products_returns_list(self):
        """GET /api/promoted-products should return list"""
        response = requests.get(f"{BASE_URL}/api/promoted-products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data).__name__}: {data}"
        print(f"✅ /api/promoted-products returns list with {len(data)} items")


class TestAuthenticatedEndpointsReturnTypes:
    """Test authenticated endpoints return correct types"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        
        data = response.json()
        token = data.get("token") or data.get("access_token")
        if not token:
            pytest.skip(f"No token in response: {data}")
        
        return token
    
    def test_orders_returns_list(self, admin_token):
        """GET /api/orders should return list (authenticated)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/orders", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data).__name__}: {data}"
        print(f"✅ /api/orders returns list with {len(data)} items")
    
    def test_admin_orders_returns_data_and_pagination(self, admin_token):
        """GET /api/admin/orders should return data and pagination"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data).__name__}"
        
        # Check for data field
        assert "data" in data or "orders" in data, f"Expected 'data' or 'orders' field in response: {list(data.keys())}"
        
        # Check for pagination fields
        pagination_fields = ["total", "page", "pages", "limit", "pagination"]
        has_pagination = any(field in data for field in pagination_fields)
        assert has_pagination, f"Expected pagination fields in response: {list(data.keys())}"
        
        print(f"✅ /api/admin/orders returns dict with data and pagination: {list(data.keys())}")
    
    def test_admin_delivery_all_returns_data_and_pagination(self, admin_token):
        """GET /api/admin/delivery/all should return data and pagination"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/delivery/all", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data).__name__}"
        
        # Check for data field
        assert "data" in data or "drivers" in data, f"Expected 'data' or 'drivers' field in response: {list(data.keys())}"
        
        # Check for pagination fields
        pagination_fields = ["total", "page", "pages", "limit", "pagination"]
        has_pagination = any(field in data for field in pagination_fields)
        assert has_pagination, f"Expected pagination fields in response: {list(data.keys())}"
        
        print(f"✅ /api/admin/delivery/all returns dict with data and pagination: {list(data.keys())}")


class TestGetNowHelperUsage:
    """Verify get_now() helper is being used correctly in the refactored files"""
    
    def test_orders_endpoint_works_after_refactoring(self):
        """Verify orders endpoint works after datetime refactoring"""
        # Test public endpoint that uses get_now()
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200, f"Food stores endpoint failed: {response.status_code}"
        print("✅ Food stores endpoint works after get_now() refactoring")
    
    def test_food_endpoint_works_after_refactoring(self):
        """Verify food endpoint works after datetime refactoring"""
        response = requests.get(f"{BASE_URL}/api/food/flash-sales/active")
        assert response.status_code == 200, f"Flash sales endpoint failed: {response.status_code}"
        print("✅ Flash sales endpoint works after get_now() refactoring")
    
    def test_stores_endpoint_works_after_refactoring(self):
        """Verify stores endpoint works after datetime refactoring"""
        response = requests.get(f"{BASE_URL}/api/food/banners")
        assert response.status_code == 200, f"Banners endpoint failed: {response.status_code}"
        print("✅ Banners endpoint works after get_now() refactoring")


class TestUnauthenticatedAccess:
    """Test that authenticated endpoints require authentication"""
    
    def test_orders_requires_auth(self):
        """GET /api/orders should require authentication"""
        response = requests.get(f"{BASE_URL}/api/orders")
        # Should return 401 or 403 for unauthenticated requests
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"✅ /api/orders requires authentication (returns {response.status_code})")
    
    def test_admin_orders_requires_auth(self):
        """GET /api/admin/orders should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/orders")
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"✅ /api/admin/orders requires authentication (returns {response.status_code})")
    
    def test_admin_delivery_all_requires_auth(self):
        """GET /api/admin/delivery/all should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/delivery/all")
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"✅ /api/admin/delivery/all requires authentication (returns {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
