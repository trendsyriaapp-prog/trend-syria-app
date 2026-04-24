"""
Phase 35 - Test Admin APIs with require_admin_user dependency
Tests all 16 endpoints that now use require_admin_user dependency
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"
OTP_CODE = "123456"


class TestAdminAuthentication:
    """Test admin login flow"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        # Direct login (admin doesn't require OTP)
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        data = login_response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_admin_login_success(self, admin_token):
        """Verify admin can login successfully"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"Admin login successful, token length: {len(admin_token)}")


class TestRequireAdminUserEndpoints:
    """Test all 16 endpoints using require_admin_user dependency"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Cannot login as admin")
        
        return login_response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    # ============== Endpoint 1: GET /api/admin/call-requests/count ==============
    def test_get_call_requests_count(self, auth_headers):
        """Test GET /api/admin/call-requests/count - uses require_admin_user"""
        response = requests.get(f"{BASE_URL}/api/admin/call-requests/count", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "count" in data
        print(f"Call requests count: {data['count']}")
    
    # ============== Endpoint 2: GET /api/admin/emergency-help/count ==============
    def test_get_emergency_help_count(self, auth_headers):
        """Test GET /api/admin/emergency-help/count - uses require_admin_user"""
        response = requests.get(f"{BASE_URL}/api/admin/emergency-help/count", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "count" in data
        print(f"Emergency help count: {data['count']}")
    
    # ============== Endpoint 3: GET /api/admin/stats ==============
    def test_get_admin_stats(self, auth_headers):
        """Test GET /api/admin/stats - uses require_admin_user"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total_users" in data
        assert "total_sellers" in data
        assert "pending_sellers" in data
        print(f"Admin stats: users={data['total_users']}, sellers={data['total_sellers']}")
    
    # ============== Endpoint 4: GET /api/admin/users ==============
    def test_get_all_users(self, auth_headers):
        """Test GET /api/admin/users - uses require_admin_user"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        print(f"Users count: {data['pagination']['total']}")
    
    # ============== Endpoint 5: DELETE /api/admin/users/{user_id} ==============
    def test_delete_user_not_found(self, auth_headers):
        """Test DELETE /api/admin/users/{user_id} - uses require_admin_user (404 case)"""
        response = requests.delete(f"{BASE_URL}/api/admin/users/nonexistent-user-id", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Delete user (not found) - correctly returns 404")
    
    # ============== Endpoint 6: POST /api/admin/users/{user_id}/ban ==============
    def test_ban_user_not_found(self, auth_headers):
        """Test POST /api/admin/users/{user_id}/ban - uses require_admin_user (404 case)"""
        response = requests.post(f"{BASE_URL}/api/admin/users/nonexistent-user-id/ban", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Ban user (not found) - correctly returns 404")
    
    # ============== Endpoint 7: GET /api/admin/sellers/pending ==============
    def test_get_pending_sellers(self, auth_headers):
        """Test GET /api/admin/sellers/pending - uses require_admin_user"""
        response = requests.get(f"{BASE_URL}/api/admin/sellers/pending", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"Pending sellers count: {len(data)}")
    
    # ============== Endpoint 8: GET /api/admin/rejected-requests ==============
    def test_get_rejected_requests(self, auth_headers):
        """Test GET /api/admin/rejected-requests - uses require_admin_user"""
        response = requests.get(f"{BASE_URL}/api/admin/rejected-requests", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "requests" in data
        assert "retention_days" in data
        print(f"Rejected requests count: {len(data['requests'])}")
    
    # ============== Endpoint 9: DELETE /api/admin/rejected-requests/{request_id} ==============
    def test_delete_rejected_request_not_found(self, auth_headers):
        """Test DELETE /api/admin/rejected-requests/{request_id} - uses require_admin_user (404 case)"""
        response = requests.delete(f"{BASE_URL}/api/admin/rejected-requests/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Delete rejected request (not found) - correctly returns 404")
    
    # ============== Endpoint 10: DELETE /api/admin/sellers/pending/{seller_id} ==============
    def test_delete_pending_seller_not_found(self, auth_headers):
        """Test DELETE /api/admin/sellers/pending/{seller_id} - uses require_admin_user (404 case)"""
        response = requests.delete(f"{BASE_URL}/api/admin/sellers/pending/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Delete pending seller (not found) - correctly returns 404")
    
    # ============== Endpoint 11: DELETE /api/admin/delivery/pending/{driver_id} ==============
    def test_delete_pending_driver_not_found(self, auth_headers):
        """Test DELETE /api/admin/delivery/pending/{driver_id} - uses require_admin_user (404 case)"""
        response = requests.delete(f"{BASE_URL}/api/admin/delivery/pending/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Delete pending driver (not found) - correctly returns 404")
    
    # ============== Endpoint 12: DELETE /api/admin/products/pending/{product_id} ==============
    def test_delete_pending_product_not_found(self, auth_headers):
        """Test DELETE /api/admin/products/pending/{product_id} - uses require_admin_user (404 case)"""
        response = requests.delete(f"{BASE_URL}/api/admin/products/pending/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Delete pending product (not found) - correctly returns 404")
    
    # ============== Endpoint 13: DELETE /api/admin/food-items/pending/{item_id} ==============
    def test_delete_pending_food_item_not_found(self, auth_headers):
        """Test DELETE /api/admin/food-items/pending/{item_id} - uses require_admin_user (404 case)"""
        response = requests.delete(f"{BASE_URL}/api/admin/food-items/pending/nonexistent-id", headers=auth_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Delete pending food item (not found) - correctly returns 404")
    
    # ============== Endpoint 14: GET /api/admin/sellers/all ==============
    def test_get_all_sellers(self, auth_headers):
        """Test GET /api/admin/sellers/all - uses require_admin_user"""
        response = requests.get(f"{BASE_URL}/api/admin/sellers/all", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        print(f"All sellers count: {data['pagination']['total']}")
    
    # ============== Endpoint 15: POST /api/admin/sellers/{seller_id}/approve ==============
    def test_approve_seller_not_found(self, auth_headers):
        """Test POST /api/admin/sellers/{seller_id}/approve - uses require_admin_user"""
        response = requests.post(f"{BASE_URL}/api/admin/sellers/nonexistent-id/approve", headers=auth_headers)
        # Should succeed even if seller doesn't exist (just updates nothing)
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Approve seller - endpoint works correctly")
    
    # ============== Endpoint 16: POST /api/admin/sellers/{seller_id}/reject ==============
    def test_reject_seller(self, auth_headers):
        """Test POST /api/admin/sellers/{seller_id}/reject - uses require_admin_user"""
        response = requests.post(
            f"{BASE_URL}/api/admin/sellers/nonexistent-id/reject",
            headers=auth_headers,
            json={"reason": "Test rejection"}
        )
        # Should succeed even if seller doesn't exist (just updates nothing)
        assert response.status_code == 200, f"Failed: {response.text}"
        print("Reject seller - endpoint works correctly")


class TestRequireMainAdminEndpoints:
    """Test endpoints using require_main_admin dependency"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if login_response.status_code != 200:
            pytest.skip("Cannot login as admin")
        
        return login_response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    # ============== Endpoint 1: GET /api/admin/settings ==============
    def test_get_platform_settings(self, auth_headers):
        """Test GET /api/admin/settings - uses require_main_admin"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert "food_enabled" in data
        print(f"Platform settings retrieved successfully")
    
    # ============== Endpoint 2: PUT /api/admin/settings ==============
    def test_update_platform_settings(self, auth_headers):
        """Test PUT /api/admin/settings - uses require_main_admin"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=auth_headers)
        current_settings = get_response.json()
        
        # Update with same values (no actual change)
        response = requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers=auth_headers,
            json={"food_enabled": current_settings.get("food_enabled", True)}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"Platform settings updated successfully")


class TestUnauthorizedAccess:
    """Test that endpoints reject unauthorized access"""
    
    def test_stats_without_auth(self):
        """Test GET /api/admin/stats without authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Stats endpoint correctly rejects unauthenticated requests")
    
    def test_pending_sellers_without_auth(self):
        """Test GET /api/admin/sellers/pending without authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/sellers/pending")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Pending sellers endpoint correctly rejects unauthenticated requests")
    
    def test_settings_without_auth(self):
        """Test GET /api/admin/settings without authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Settings endpoint correctly rejects unauthenticated requests")


class TestPublicEndpoints:
    """Test public endpoints that don't require authentication"""
    
    def test_platform_status_public(self):
        """Test GET /api/admin/platform-status - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/platform-status")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "platform_closed_for_customers" in data
        print("Platform status (public) works correctly")
    
    def test_settings_public(self):
        """Test GET /api/admin/settings/public - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/public")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "food_enabled" in data
        print("Public settings works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
