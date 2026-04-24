"""
Phase 34 - Test FastAPI Dependencies for Admin Permission Checks
Tests:
1. require_admin_user dependency - allows admin and sub_admin
2. require_main_admin dependency - allows only admin
3. Platform settings endpoints using new dependencies
4. Other admin endpoints still working with manual checks
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Module-level token cache to avoid rate limiting
_admin_token = None

def get_admin_token_once():
    """Get admin authentication token - cached at module level"""
    global _admin_token
    if _admin_token:
        return _admin_token
    
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Direct login with phone and password
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "phone": "0945570365",
        "password": "TrendSyria@2026"
    })
    
    if login_response.status_code != 200:
        pytest.skip(f"Login failed: {login_response.text}")
    
    data = login_response.json()
    _admin_token = data.get("token")
    if not _admin_token:
        pytest.skip("No token in login response")
    
    return _admin_token


class TestAdminDependencies:
    """Test the new FastAPI dependencies for admin permission checks"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = get_admin_token_once()
    
    # ============== Test require_main_admin dependency ==============
    
    def test_get_platform_settings_with_admin(self):
        """Test GET /api/admin/settings - requires main admin (require_main_admin)"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify settings structure
        assert "id" in data or "food_enabled" in data, "Settings should have expected fields"
        print(f"✅ GET /api/admin/settings works with admin token")
    
    def test_update_platform_settings_with_admin(self):
        """Test PUT /api/admin/settings - requires main admin (require_main_admin)"""
        # Get current settings first
        get_response = self.session.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update with same values (no actual change)
        response = self.session.put(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={"food_enabled": current_settings.get("food_enabled", True)}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "message" in data or "settings" in data, "Should return success message or settings"
        print(f"✅ PUT /api/admin/settings works with admin token")
    
    def test_platform_settings_without_token(self):
        """Test GET /api/admin/settings without token - should fail"""
        response = self.session.get(f"{BASE_URL}/api/admin/settings")
        
        assert response.status_code in [401, 403], f"Should fail without token: {response.status_code}"
        print(f"✅ GET /api/admin/settings correctly rejects unauthenticated requests")
    
    # ============== Test other admin endpoints (manual checks) ==============
    
    def test_admin_stats_endpoint(self):
        """Test GET /api/admin/stats - uses manual check"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify stats structure
        expected_fields = ["total_users", "total_sellers", "total_delivery", "total_products", "total_orders"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✅ GET /api/admin/stats works correctly")
    
    def test_admin_users_endpoint(self):
        """Test GET /api/admin/users - uses manual check"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify pagination structure
        assert "data" in data, "Should have data field"
        assert "pagination" in data, "Should have pagination field"
        print(f"✅ GET /api/admin/users works correctly")
    
    def test_admin_sellers_pending(self):
        """Test GET /api/admin/sellers/pending - uses manual check"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/sellers/pending",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        # Returns list
        assert isinstance(response.json(), list), "Should return a list"
        print(f"✅ GET /api/admin/sellers/pending works correctly")
    
    def test_admin_sellers_all(self):
        """Test GET /api/admin/sellers/all - uses manual check"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/sellers/all",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "data" in data, "Should have data field"
        assert "pagination" in data, "Should have pagination field"
        print(f"✅ GET /api/admin/sellers/all works correctly")
    
    def test_admin_delivery_pending(self):
        """Test GET /api/admin/delivery/pending - uses manual check"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/delivery/pending",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        assert isinstance(response.json(), list), "Should return a list"
        print(f"✅ GET /api/admin/delivery/pending works correctly")
    
    def test_admin_delivery_all(self):
        """Test GET /api/admin/delivery/all - uses manual check"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/delivery/all",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "data" in data, "Should have data field"
        assert "pagination" in data, "Should have pagination field"
        print(f"✅ GET /api/admin/delivery/all works correctly")
    
    def test_admin_products_pending(self):
        """Test GET /api/admin/products/pending - uses manual check"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/products/pending",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        assert isinstance(response.json(), list), "Should return a list"
        print(f"✅ GET /api/admin/products/pending works correctly")
    
    def test_admin_products_all(self):
        """Test GET /api/admin/products/all - uses manual check"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/products/all",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "data" in data, "Should have data field"
        assert "pagination" in data, "Should have pagination field"
        print(f"✅ GET /api/admin/products/all works correctly")
    
    def test_admin_orders(self):
        """Test GET /api/admin/orders - uses manual check"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "data" in data, "Should have data field"
        assert "pagination" in data, "Should have pagination field"
        print(f"✅ GET /api/admin/orders works correctly")
    
    # ============== Test public endpoints (no auth required) ==============
    
    def test_platform_status_public(self):
        """Test GET /api/admin/platform-status - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/admin/platform-status")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "platform_closed_for_customers" in data
        assert "platform_closed_for_sellers" in data
        print(f"✅ GET /api/admin/platform-status works (public)")
    
    def test_public_settings(self):
        """Test GET /api/admin/settings/public - public endpoint"""
        response = self.session.get(f"{BASE_URL}/api/admin/settings/public")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "food_enabled" in data
        assert "shop_enabled" in data
        print(f"✅ GET /api/admin/settings/public works (public)")
    
    # ============== Test sub-admin management (require main admin) ==============
    
    def test_get_sub_admins(self):
        """Test GET /api/admin/sub-admins - requires main admin"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/sub-admins",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        assert isinstance(response.json(), list), "Should return a list"
        print(f"✅ GET /api/admin/sub-admins works correctly")
    
    # ============== Test call requests and emergency counts ==============
    
    def test_call_requests_count(self):
        """Test GET /api/admin/call-requests/count - uses manual check"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/call-requests/count",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "count" in data, "Should have count field"
        print(f"✅ GET /api/admin/call-requests/count works correctly")
    
    def test_emergency_help_count(self):
        """Test GET /api/admin/emergency-help/count - uses manual check"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/emergency-help/count",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "count" in data, "Should have count field"
        print(f"✅ GET /api/admin/emergency-help/count works correctly")
    
    # ============== Test rejected requests ==============
    
    def test_rejected_requests(self):
        """Test GET /api/admin/rejected-requests - uses manual check"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/rejected-requests",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "requests" in data, "Should have requests field"
        print(f"✅ GET /api/admin/rejected-requests works correctly")
    
    # ============== Test platform wallet (require main admin) ==============
    
    def test_platform_wallet(self):
        """Test GET /api/admin/platform-wallet - requires main admin"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/platform-wallet",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "balance" in data, "Should have balance field"
        print(f"✅ GET /api/admin/platform-wallet works correctly")
    
    def test_platform_wallet_transactions(self):
        """Test GET /api/admin/platform-wallet/transactions - requires main admin"""
        response = self.session.get(
            f"{BASE_URL}/api/admin/platform-wallet/transactions",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        # Returns list or dict with transactions
        print(f"✅ GET /api/admin/platform-wallet/transactions works correctly")


class TestDependencyImplementation:
    """Verify the dependency implementation is correct"""
    
    def test_require_admin_user_definition(self):
        """Verify require_admin_user dependency is correctly defined"""
        # Read the admin.py file and check the implementation
        import subprocess
        result = subprocess.run(
            ["grep", "-A", "4", "async def require_admin_user", "/app/backend/routes/admin.py"],
            capture_output=True, text=True
        )
        
        output = result.stdout
        assert "user_type" in output, "Should check user_type"
        assert "admin" in output, "Should check for admin"
        assert "sub_admin" in output, "Should check for sub_admin"
        assert "403" in output, "Should return 403 for unauthorized"
        print(f"✅ require_admin_user dependency correctly defined")
    
    def test_require_main_admin_definition(self):
        """Verify require_main_admin dependency is correctly defined"""
        import subprocess
        result = subprocess.run(
            ["grep", "-A", "4", "async def require_main_admin", "/app/backend/routes/admin.py"],
            capture_output=True, text=True
        )
        
        output = result.stdout
        assert "user_type" in output, "Should check user_type"
        assert "admin" in output, "Should check for admin"
        assert "403" in output, "Should return 403 for unauthorized"
        print(f"✅ require_main_admin dependency correctly defined")
    
    def test_dependencies_used_in_settings(self):
        """Verify dependencies are used in platform settings endpoints"""
        import subprocess
        result = subprocess.run(
            ["grep", "-n", "require_main_admin", "/app/backend/routes/admin.py"],
            capture_output=True, text=True
        )
        
        output = result.stdout
        lines = output.strip().split('\n')
        
        # Should have at least 3 usages: definition + get_settings + update_settings
        assert len(lines) >= 3, f"Should have at least 3 usages of require_main_admin, found {len(lines)}"
        print(f"✅ require_main_admin used in {len(lines)} places")
    
    def test_remaining_manual_checks_count(self):
        """Count remaining manual permission checks to be replaced"""
        import subprocess
        result = subprocess.run(
            ["grep", "-c", 'user\\["user_type"\\] not in \\["admin", "sub_admin"\\]', "/app/backend/routes/admin.py"],
            capture_output=True, text=True
        )
        
        count = int(result.stdout.strip()) if result.stdout.strip() else 0
        print(f"ℹ️ Remaining manual checks to replace: {count}")
        # This is informational - not a failure
        assert True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
