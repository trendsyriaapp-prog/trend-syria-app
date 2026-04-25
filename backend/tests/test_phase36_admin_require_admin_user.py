"""
Phase 36 - Test admin.py require_admin_user dependency replacement
Tests 10 additional endpoints that now use require_admin_user dependency:
- POST /api/admin/sellers/{seller_id}/suspend
- POST /api/admin/sellers/{seller_id}/activate
- GET /api/admin/sellers/with-status
- GET /api/admin/products/pending
- GET /api/admin/products/all
- POST /api/admin/products/{product_id}/approve
- POST /api/admin/products/{product_id}/reject
- GET /api/admin/food-products/pending
- POST /api/admin/food-products/{product_id}/approve
- POST /api/admin/food-products/{product_id}/reject
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"
OTP_CODE = "123456"

# Shared token for all tests
_admin_token = None

def get_shared_admin_token():
    """Get shared admin authentication token"""
    global _admin_token
    if _admin_token:
        return _admin_token
        
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Direct login (no OTP required for admin)
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "phone": ADMIN_PHONE,
        "password": ADMIN_PASSWORD
    })
    
    if login_response.status_code != 200:
        return None
        
    _admin_token = login_response.json().get("token")
    return _admin_token


class TestPhase36AdminRequireAdminUser:
    """Test Phase 36 - 10 additional endpoints using require_admin_user dependency"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        
    def get_admin_token(self):
        """Get admin authentication token"""
        token = get_shared_admin_token()
        if not token:
            pytest.skip("Failed to get admin token")
        return token
    
    # ============== Test 401 Unauthorized (No Token) ==============
    
    def test_suspend_seller_requires_auth(self):
        """Test POST /api/admin/sellers/{seller_id}/suspend returns 401 without token"""
        response = self.session.post(f"{BASE_URL}/api/admin/sellers/test-id/suspend")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: suspend_seller returns 401 without auth")
        
    def test_activate_seller_requires_auth(self):
        """Test POST /api/admin/sellers/{seller_id}/activate returns 401 without token"""
        response = self.session.post(f"{BASE_URL}/api/admin/sellers/test-id/activate")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: activate_seller returns 401 without auth")
        
    def test_sellers_with_status_requires_auth(self):
        """Test GET /api/admin/sellers/with-status returns 401 without token"""
        response = self.session.get(f"{BASE_URL}/api/admin/sellers/with-status")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: sellers/with-status returns 401 without auth")
        
    def test_pending_products_requires_auth(self):
        """Test GET /api/admin/products/pending returns 401 without token"""
        response = self.session.get(f"{BASE_URL}/api/admin/products/pending")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: products/pending returns 401 without auth")
        
    def test_all_products_requires_auth(self):
        """Test GET /api/admin/products/all returns 401 without token"""
        response = self.session.get(f"{BASE_URL}/api/admin/products/all")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: products/all returns 401 without auth")
        
    def test_approve_product_requires_auth(self):
        """Test POST /api/admin/products/{product_id}/approve returns 401 without token"""
        response = self.session.post(f"{BASE_URL}/api/admin/products/test-id/approve")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: products/approve returns 401 without auth")
        
    def test_reject_product_requires_auth(self):
        """Test POST /api/admin/products/{product_id}/reject returns 401 without token"""
        response = self.session.post(f"{BASE_URL}/api/admin/products/test-id/reject")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: products/reject returns 401 without auth")
        
    def test_pending_food_products_requires_auth(self):
        """Test GET /api/admin/food-products/pending returns 401 without token"""
        response = self.session.get(f"{BASE_URL}/api/admin/food-products/pending")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: food-products/pending returns 401 without auth")
        
    def test_approve_food_product_requires_auth(self):
        """Test POST /api/admin/food-products/{product_id}/approve returns 401 without token"""
        response = self.session.post(f"{BASE_URL}/api/admin/food-products/test-id/approve")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: food-products/approve returns 401 without auth")
        
    def test_reject_food_product_requires_auth(self):
        """Test POST /api/admin/food-products/{product_id}/reject returns 401 without token"""
        response = self.session.post(f"{BASE_URL}/api/admin/food-products/test-id/reject")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: food-products/reject returns 401 without auth")
    
    # ============== Test Admin Access (With Token) ==============
    
    def test_sellers_with_status_admin_access(self):
        """Test GET /api/admin/sellers/with-status works with admin token"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/sellers/with-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return 200 or empty list
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: sellers/with-status accessible with admin token")
        
    def test_pending_products_admin_access(self):
        """Test GET /api/admin/products/pending works with admin token"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/products/pending",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: products/pending accessible with admin token")
        
    def test_all_products_admin_access(self):
        """Test GET /api/admin/products/all works with admin token"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/products/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "data" in data, "Response should contain 'data' field"
        assert "pagination" in data, "Response should contain 'pagination' field"
        print("PASS: products/all accessible with admin token")
        
    def test_pending_food_products_admin_access(self):
        """Test GET /api/admin/food-products/pending works with admin token"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/food-products/pending",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: food-products/pending accessible with admin token")
        
    def test_approve_product_not_found(self):
        """Test POST /api/admin/products/{product_id}/approve returns 404 for non-existent product"""
        token = self.get_admin_token()
        response = self.session.post(
            f"{BASE_URL}/api/admin/products/non-existent-id/approve",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return 404 (not found) not 401/403
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: products/approve returns 404 for non-existent product")
        
    def test_reject_product_not_found(self):
        """Test POST /api/admin/products/{product_id}/reject returns 404 for non-existent product"""
        token = self.get_admin_token()
        response = self.session.post(
            f"{BASE_URL}/api/admin/products/non-existent-id/reject",
            headers={"Authorization": f"Bearer {token}"},
            json={"reason": "Test rejection"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: products/reject returns 404 for non-existent product")
        
    def test_approve_food_product_not_found(self):
        """Test POST /api/admin/food-products/{product_id}/approve returns 404 for non-existent product"""
        token = self.get_admin_token()
        response = self.session.post(
            f"{BASE_URL}/api/admin/food-products/non-existent-id/approve",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: food-products/approve returns 404 for non-existent product")
        
    def test_reject_food_product_not_found(self):
        """Test POST /api/admin/food-products/{product_id}/reject returns 404 for non-existent product"""
        token = self.get_admin_token()
        response = self.session.post(
            f"{BASE_URL}/api/admin/food-products/non-existent-id/reject",
            headers={"Authorization": f"Bearer {token}"},
            json={"reason": "Test rejection"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: food-products/reject returns 404 for non-existent product")
        
    def test_suspend_seller_not_found(self):
        """Test POST /api/admin/sellers/{seller_id}/suspend returns 404 for non-existent seller"""
        token = self.get_admin_token()
        response = self.session.post(
            f"{BASE_URL}/api/admin/sellers/non-existent-id/suspend",
            headers={"Authorization": f"Bearer {token}"},
            json={"reason": "Test suspension"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: sellers/suspend returns 404 for non-existent seller")
        
    def test_activate_seller_not_found(self):
        """Test POST /api/admin/sellers/{seller_id}/activate returns 404 for non-existent seller"""
        token = self.get_admin_token()
        response = self.session.post(
            f"{BASE_URL}/api/admin/sellers/non-existent-id/activate",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: sellers/activate returns 404 for non-existent seller")


class TestPhase36PreviousEndpointsStillWork:
    """Verify previously refactored endpoints still work correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        
    def get_admin_token(self):
        """Get admin authentication token"""
        token = get_shared_admin_token()
        if not token:
            pytest.skip("Failed to get admin token")
        return token
    
    def test_admin_stats_still_works(self):
        """Test GET /api/admin/stats still works"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: admin/stats still works")
        
    def test_pending_sellers_still_works(self):
        """Test GET /api/admin/sellers/pending still works"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/sellers/pending",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: sellers/pending still works")
        
    def test_all_sellers_still_works(self):
        """Test GET /api/admin/sellers/all still works"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/sellers/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: sellers/all still works")
        
    def test_all_users_still_works(self):
        """Test GET /api/admin/users still works"""
        token = self.get_admin_token()
        response = self.session.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: admin/users still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
