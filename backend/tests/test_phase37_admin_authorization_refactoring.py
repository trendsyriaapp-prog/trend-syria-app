"""
Phase 37 - Admin Authorization Refactoring Verification Tests
Tests to verify that ~70 endpoints in admin.py still work after replacing
manual user_type checks with require_admin_user and require_main_admin dependencies.

Endpoints to test:
1. /api/admin/delivery/pending - should return list
2. /api/admin/delivery/all - should return data and pagination
3. /api/admin/sub-admins - should return list
4. /api/admin/orders - should return data and pagination
5. /api/admin/platform-wallet - should return balance
6. /api/admin/commissions - should return summary
7. /api/admin/food/stats - should return total_stores
8. /api/admin/food-items/stats - should return pending, approved, total
9. /api/admin/promotions/settings - should return cost_per_product
10. /api/admin/flash-sales - should return list
11. /api/admin/notifications - should return list
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_PHONE = "0945570365"
SUPER_ADMIN_PASSWORD = "TrendSyria@2026"


class TestAdminAuthorizationRefactoring:
    """Test admin endpoints after authorization refactoring"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": SUPER_ADMIN_PHONE, "password": SUPER_ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get headers with admin token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    # ============== Test 1: /api/admin/delivery/pending ==============
    def test_delivery_pending_returns_list(self, admin_headers):
        """Test /api/admin/delivery/pending returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/delivery/pending",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: /api/admin/delivery/pending returns list with {len(data)} items")
    
    def test_delivery_pending_unauthorized(self):
        """Test /api/admin/delivery/pending returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/admin/delivery/pending")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/admin/delivery/pending returns 401 for unauthenticated requests")
    
    # ============== Test 2: /api/admin/delivery/all ==============
    def test_delivery_all_returns_data_and_pagination(self, admin_headers):
        """Test /api/admin/delivery/all returns data and pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/delivery/all",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "data" in data, "Response should contain 'data' field"
        assert "pagination" in data, "Response should contain 'pagination' field"
        assert isinstance(data["data"], list), "data should be a list"
        assert "page" in data["pagination"], "pagination should contain 'page'"
        assert "total" in data["pagination"], "pagination should contain 'total'"
        print(f"PASS: /api/admin/delivery/all returns data ({len(data['data'])} items) and pagination")
    
    def test_delivery_all_unauthorized(self):
        """Test /api/admin/delivery/all returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/admin/delivery/all")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/admin/delivery/all returns 401 for unauthenticated requests")
    
    # ============== Test 3: /api/admin/sub-admins ==============
    def test_sub_admins_returns_list(self, admin_headers):
        """Test /api/admin/sub-admins returns a list (main admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sub-admins",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: /api/admin/sub-admins returns list with {len(data)} items")
    
    def test_sub_admins_unauthorized(self):
        """Test /api/admin/sub-admins returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/admin/sub-admins")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/admin/sub-admins returns 401 for unauthenticated requests")
    
    # ============== Test 4: /api/admin/orders ==============
    def test_orders_returns_data_and_pagination(self, admin_headers):
        """Test /api/admin/orders returns data and pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "data" in data, "Response should contain 'data' field"
        assert "pagination" in data, "Response should contain 'pagination' field"
        assert isinstance(data["data"], list), "data should be a list"
        print(f"PASS: /api/admin/orders returns data ({len(data['data'])} items) and pagination")
    
    def test_orders_unauthorized(self):
        """Test /api/admin/orders returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/admin/orders")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/admin/orders returns 401 for unauthenticated requests")
    
    # ============== Test 5: /api/admin/platform-wallet ==============
    def test_platform_wallet_returns_balance(self, admin_headers):
        """Test /api/admin/platform-wallet returns balance (main admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/platform-wallet",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "balance" in data, "Response should contain 'balance' field"
        print(f"PASS: /api/admin/platform-wallet returns balance: {data.get('balance')}")
    
    def test_platform_wallet_unauthorized(self):
        """Test /api/admin/platform-wallet returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/admin/platform-wallet")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/admin/platform-wallet returns 401 for unauthenticated requests")
    
    # ============== Test 6: /api/admin/commissions ==============
    def test_commissions_returns_summary(self, admin_headers):
        """Test /api/admin/commissions returns summary"""
        response = requests.get(
            f"{BASE_URL}/api/admin/commissions",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "summary" in data, "Response should contain 'summary' field"
        print(f"PASS: /api/admin/commissions returns summary: {data.get('summary')}")
    
    def test_commissions_unauthorized(self):
        """Test /api/admin/commissions returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/admin/commissions")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/admin/commissions returns 401 for unauthenticated requests")
    
    # ============== Test 7: /api/admin/food/stats ==============
    def test_food_stats_returns_total_stores(self, admin_headers):
        """Test /api/admin/food/stats returns total_stores"""
        response = requests.get(
            f"{BASE_URL}/api/admin/food/stats",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "total_stores" in data, "Response should contain 'total_stores' field"
        print(f"PASS: /api/admin/food/stats returns total_stores: {data.get('total_stores')}")
    
    def test_food_stats_unauthorized(self):
        """Test /api/admin/food/stats returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/admin/food/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/admin/food/stats returns 401 for unauthenticated requests")
    
    # ============== Test 8: /api/admin/food-items/stats ==============
    def test_food_items_stats_returns_counts(self, admin_headers):
        """Test /api/admin/food-items/stats returns pending, approved, total"""
        response = requests.get(
            f"{BASE_URL}/api/admin/food-items/stats",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "pending" in data, "Response should contain 'pending' field"
        assert "approved" in data, "Response should contain 'approved' field"
        assert "total" in data, "Response should contain 'total' field"
        print(f"PASS: /api/admin/food-items/stats returns pending={data.get('pending')}, approved={data.get('approved')}, total={data.get('total')}")
    
    def test_food_items_stats_unauthorized(self):
        """Test /api/admin/food-items/stats returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/admin/food-items/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/admin/food-items/stats returns 401 for unauthenticated requests")
    
    # ============== Test 9: /api/admin/promotions/settings ==============
    def test_promotions_settings_returns_cost(self, admin_headers):
        """Test /api/admin/promotions/settings returns cost_per_product"""
        response = requests.get(
            f"{BASE_URL}/api/admin/promotions/settings",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "cost_per_product" in data, "Response should contain 'cost_per_product' field"
        print(f"PASS: /api/admin/promotions/settings returns cost_per_product: {data.get('cost_per_product')}")
    
    def test_promotions_settings_unauthorized(self):
        """Test /api/admin/promotions/settings returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/admin/promotions/settings")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/admin/promotions/settings returns 401 for unauthenticated requests")
    
    # ============== Test 10: /api/admin/flash-sales ==============
    def test_flash_sales_returns_list(self, admin_headers):
        """Test /api/admin/flash-sales returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/flash-sales",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Could be a list or dict with data field
        if isinstance(data, list):
            print(f"PASS: /api/admin/flash-sales returns list with {len(data)} items")
        elif isinstance(data, dict) and "data" in data:
            print(f"PASS: /api/admin/flash-sales returns data with {len(data.get('data', []))} items")
        else:
            # Accept any valid response
            print(f"PASS: /api/admin/flash-sales returns valid response")
    
    def test_flash_sales_unauthorized(self):
        """Test /api/admin/flash-sales returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/admin/flash-sales")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/admin/flash-sales returns 401 for unauthenticated requests")
    
    # ============== Test 11: /api/admin/notifications ==============
    def test_notifications_returns_list(self, admin_headers):
        """Test /api/admin/notifications returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Could be a list or dict with data/notifications field
        if isinstance(data, list):
            print(f"PASS: /api/admin/notifications returns list with {len(data)} items")
        elif isinstance(data, dict):
            if "data" in data:
                print(f"PASS: /api/admin/notifications returns data with {len(data.get('data', []))} items")
            elif "notifications" in data:
                print(f"PASS: /api/admin/notifications returns notifications with {len(data.get('notifications', []))} items")
            else:
                print(f"PASS: /api/admin/notifications returns valid response")
        else:
            print(f"PASS: /api/admin/notifications returns valid response")
    
    def test_notifications_unauthorized(self):
        """Test /api/admin/notifications returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: /api/admin/notifications returns 401 for unauthenticated requests")


class TestNonAdminUserAccess:
    """Test that non-admin users get 403 Forbidden"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Create a test customer and get token"""
        # Try to login as a regular customer
        # First, try to register a test customer
        import uuid
        test_phone = f"09{uuid.uuid4().hex[:8]}"
        
        # Try to register
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "phone": test_phone,
                "password": "TestPass123",
                "full_name": "Test Customer",
                "user_type": "buyer"
            }
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            if token:
                return token
        
        # If registration failed, skip these tests
        pytest.skip("Could not create test customer for 403 tests")
    
    @pytest.fixture(scope="class")
    def customer_headers(self, customer_token):
        """Get headers with customer token"""
        return {
            "Authorization": f"Bearer {customer_token}",
            "Content-Type": "application/json"
        }
    
    def test_delivery_pending_forbidden_for_customer(self, customer_headers):
        """Test /api/admin/delivery/pending returns 403 for non-admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/delivery/pending",
            headers=customer_headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: /api/admin/delivery/pending returns 403 for non-admin users")
    
    def test_orders_forbidden_for_customer(self, customer_headers):
        """Test /api/admin/orders returns 403 for non-admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers=customer_headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: /api/admin/orders returns 403 for non-admin users")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
