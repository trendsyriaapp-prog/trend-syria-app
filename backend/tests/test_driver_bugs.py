"""
Tests for Driver Dashboard Bugs
- P0: Driver Availability Bug (GET/PUT /api/delivery/availability)
- P2: Admin approval/rejection notifications
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com').rstrip('/')

# Test credentials
DRIVER_PHONE = "0955555555"
DRIVER_PASSWORD = "test1234"
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "admin123"


class TestDriverAvailability:
    """Tests for P0: Driver Availability Bug"""
    
    @pytest.fixture(scope="class")
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        return response.json()["token"]
    
    def test_driver_login_success(self, driver_token):
        """Test driver can login successfully"""
        assert driver_token is not None
        assert len(driver_token) > 0
        print(f"✅ Driver login successful, token: {driver_token[:50]}...")
    
    def test_get_availability_returns_boolean(self, driver_token):
        """Test GET /api/delivery/availability returns is_available boolean"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/availability",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200, f"GET availability failed: {response.text}"
        
        data = response.json()
        assert "is_available" in data, "Response missing 'is_available' field"
        assert isinstance(data["is_available"], bool), "is_available should be boolean"
        print(f"✅ GET availability: is_available = {data['is_available']}")
    
    def test_set_availability_to_true(self, driver_token):
        """Test PUT /api/delivery/availability can set to true"""
        response = requests.put(
            f"{BASE_URL}/api/delivery/availability",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={"is_available": True}
        )
        assert response.status_code == 200, f"PUT availability (true) failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True or data.get("is_available") == True, \
            f"Setting available failed: {data}"
        print(f"✅ PUT availability (true): {data}")
    
    def test_availability_persists_after_get(self, driver_token):
        """Test that availability state persists - simulates page reload"""
        # First, set to available
        requests.put(
            f"{BASE_URL}/api/delivery/availability",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={"is_available": True}
        )
        
        # Then, GET to verify it persisted
        response = requests.get(
            f"{BASE_URL}/api/delivery/availability",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_available"] == True, "Availability state did not persist"
        print(f"✅ Availability persisted correctly: is_available = {data['is_available']}")
    
    def test_set_unavailable_with_active_orders_fails(self, driver_token):
        """Test that driver cannot set unavailable when they have active orders"""
        # First check if driver has active orders
        food_orders = requests.get(
            f"{BASE_URL}/api/delivery/my-food-orders",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        product_orders = requests.get(
            f"{BASE_URL}/api/delivery/my-product-orders",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        
        has_food_orders = len(food_orders.json()) > 0 if food_orders.status_code == 200 else False
        has_product_orders = product_orders.json().get("count", 0) > 0 if product_orders.status_code == 200 else False
        
        if has_food_orders or has_product_orders:
            # Try to set unavailable - should fail
            response = requests.put(
                f"{BASE_URL}/api/delivery/availability",
                headers={"Authorization": f"Bearer {driver_token}"},
                json={"is_available": False}
            )
            assert response.status_code == 400, \
                f"Expected 400 when setting unavailable with active orders, got: {response.status_code}"
            
            data = response.json()
            assert "لا يمكنك" in data.get("detail", "") or "طلب نشط" in data.get("detail", ""), \
                f"Expected error about active orders: {data}"
            print(f"✅ Correctly blocked setting unavailable with active orders: {data['detail']}")
        else:
            # No active orders, setting unavailable should work
            response = requests.put(
                f"{BASE_URL}/api/delivery/availability",
                headers={"Authorization": f"Bearer {driver_token}"},
                json={"is_available": False}
            )
            assert response.status_code == 200
            print("✅ Set unavailable successfully (no active orders)")
            
            # Reset to available
            requests.put(
                f"{BASE_URL}/api/delivery/availability",
                headers={"Authorization": f"Bearer {driver_token}"},
                json={"is_available": True}
            )
    
    def test_my_orders_endpoint_works(self, driver_token):
        """Test that my-food-orders endpoint returns driver's assigned orders"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-food-orders",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200, f"my-food-orders failed: {response.text}"
        
        orders = response.json()
        assert isinstance(orders, list), "Response should be a list"
        print(f"✅ my-food-orders returns {len(orders)} orders")
    
    def test_my_product_orders_endpoint_works(self, driver_token):
        """Test that my-product-orders endpoint returns driver's assigned product orders"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-product-orders",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200, f"my-product-orders failed: {response.text}"
        
        data = response.json()
        assert "orders" in data, "Response missing 'orders' field"
        assert "count" in data, "Response missing 'count' field"
        print(f"✅ my-product-orders returns {data['count']} orders, is_locked={data.get('is_locked')}")


class TestAdminApprovalNotifications:
    """Tests for P2: Admin approval/rejection notifications"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json()["token"]
    
    def test_admin_can_get_pending_sellers(self, admin_token):
        """Test admin can fetch pending sellers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sellers/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get pending sellers failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Admin can get pending sellers (count: {len(data)})")
    
    def test_admin_can_get_pending_delivery(self, admin_token):
        """Test admin can fetch pending delivery drivers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/delivery/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Get pending delivery failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Admin can get pending delivery drivers (count: {len(data)})")
    
    def test_approve_driver_endpoint_exists(self, admin_token):
        """Test that approve driver endpoint exists and handles invalid ID"""
        response = requests.post(
            f"{BASE_URL}/api/admin/delivery/fake-driver-id/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 404 for non-existent driver, not 500 or 422
        assert response.status_code in [404, 400], \
            f"Approve endpoint should return 404 for invalid ID, got: {response.status_code}"
        print(f"✅ Approve driver endpoint exists (returns {response.status_code} for invalid ID)")
    
    def test_reject_driver_endpoint_exists(self, admin_token):
        """Test that reject driver endpoint exists and handles invalid ID"""
        response = requests.post(
            f"{BASE_URL}/api/admin/delivery/fake-driver-id/reject",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"reason": "Test rejection"}
        )
        # Should return 404 for non-existent driver
        assert response.status_code in [404, 400], \
            f"Reject endpoint should return 404 for invalid ID, got: {response.status_code}"
        print(f"✅ Reject driver endpoint exists (returns {response.status_code} for invalid ID)")
    
    def test_approve_seller_endpoint_exists(self, admin_token):
        """Test that approve seller endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/admin/sellers/fake-seller-id/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 404 or handle invalid ID
        assert response.status_code != 500, \
            f"Approve seller endpoint should not return 500: {response.text}"
        print(f"✅ Approve seller endpoint exists (returns {response.status_code} for invalid ID)")
    
    def test_reject_seller_endpoint_exists(self, admin_token):
        """Test that reject seller endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/admin/sellers/fake-seller-id/reject",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"reason": "Test rejection"}
        )
        # Should return 404 or handle invalid ID
        assert response.status_code != 500, \
            f"Reject seller endpoint should not return 500: {response.text}"
        print(f"✅ Reject seller endpoint exists (returns {response.status_code} for invalid ID)")


class TestNotificationSoundHook:
    """Tests for P1: Ringtone selection - verify the hook doesn't error"""
    
    @pytest.fixture(scope="class")
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_driver_can_access_dashboard_without_errors(self, driver_token):
        """Test driver dashboard loads without JS errors (basic API check)"""
        # Just verify the basic driver endpoints work
        availability = requests.get(
            f"{BASE_URL}/api/delivery/availability",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert availability.status_code == 200
        
        stats = requests.get(
            f"{BASE_URL}/api/delivery/stats",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert stats.status_code == 200
        
        print("✅ Driver dashboard endpoints working (sound toggle is frontend-only)")
