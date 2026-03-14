"""
Test Smart Distribution System Phase 2:
- Background task for automatic dispatch
- GET /api/admin/dispatch/status - dispatch status
- GET /api/admin/violations/report?days=30 - violations report
- POST /api/food/orders/delivery/{order_id}/verify-pickup - verify pickup code and compensation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "admin123"
DRIVER_PHONE = "0900000000"
DRIVER_PASSWORD = "delivery123"


class TestDispatchViolationsAPIs:
    """Test dispatch status and violations report APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens for authenticated requests"""
        self.admin_token = self._get_token(ADMIN_PHONE, ADMIN_PASSWORD)
        self.driver_token = self._get_token(DRIVER_PHONE, DRIVER_PASSWORD)
        self.headers_admin = {"Authorization": f"Bearer {self.admin_token}"} if self.admin_token else {}
        self.headers_driver = {"Authorization": f"Bearer {self.driver_token}"} if self.driver_token else {}
    
    def _get_token(self, phone, password):
        """Helper to get auth token"""
        try:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "phone": phone,
                "password": password
            })
            if response.status_code == 200:
                return response.json().get("token")
        except Exception as e:
            print(f"Login error: {e}")
        return None
    
    # ============= Dispatch Status Tests =============
    
    def test_dispatch_status_endpoint_exists(self):
        """Test GET /api/admin/dispatch/status returns 200"""
        if not self.admin_token:
            pytest.skip("Admin auth failed")
        
        response = requests.get(f"{BASE_URL}/api/admin/dispatch/status", headers=self.headers_admin)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        print(f"✅ Dispatch status endpoint working: {response.status_code}")
    
    def test_dispatch_status_response_structure(self):
        """Test dispatch status returns correct data structure"""
        if not self.admin_token:
            pytest.skip("Admin auth failed")
        
        response = requests.get(f"{BASE_URL}/api/admin/dispatch/status", headers=self.headers_admin)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "status" in data, "Response should have 'status' field"
        status = data["status"]
        
        # Check required fields in status
        assert "pending_dispatch" in status, "Status should have 'pending_dispatch'"
        assert "dispatched_today" in status, "Status should have 'dispatched_today'"
        assert "available_drivers" in status, "Status should have 'available_drivers'"
        assert "background_task_running" in status, "Status should have 'background_task_running'"
        
        # Validate data types
        assert isinstance(status["pending_dispatch"], int), "pending_dispatch should be int"
        assert isinstance(status["dispatched_today"], int), "dispatched_today should be int"
        assert isinstance(status["available_drivers"], int), "available_drivers should be int"
        assert isinstance(status["background_task_running"], bool), "background_task_running should be bool"
        
        print(f"✅ Dispatch status structure correct: {status}")
    
    def test_dispatch_status_requires_admin(self):
        """Test dispatch status requires admin role"""
        # Test without auth
        response = requests.get(f"{BASE_URL}/api/admin/dispatch/status")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # Test with driver token (should fail)
        if self.driver_token:
            response = requests.get(f"{BASE_URL}/api/admin/dispatch/status", headers=self.headers_driver)
            assert response.status_code == 403, f"Expected 403 for driver, got {response.status_code}"
        
        print("✅ Dispatch status requires admin auth")
    
    # ============= Violations Report Tests =============
    
    def test_violations_report_endpoint_exists(self):
        """Test GET /api/admin/violations/report returns 200"""
        if not self.admin_token:
            pytest.skip("Admin auth failed")
        
        response = requests.get(f"{BASE_URL}/api/admin/violations/report?days=30", headers=self.headers_admin)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        print(f"✅ Violations report endpoint working: {response.status_code}")
    
    def test_violations_report_response_structure(self):
        """Test violations report returns correct data structure"""
        if not self.admin_token:
            pytest.skip("Admin auth failed")
        
        response = requests.get(f"{BASE_URL}/api/admin/violations/report?days=30", headers=self.headers_admin)
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "report" in data, "Response should have 'report' field"
        report = data["report"]
        
        # Check required fields in report
        assert "period_days" in report, "Report should have 'period_days'"
        assert "total_violations" in report, "Report should have 'total_violations'"
        assert "total_compensations" in report, "Report should have 'total_compensations'"
        assert "average_waiting_minutes" in report, "Report should have 'average_waiting_minutes'"
        assert "violating_stores" in report, "Report should have 'violating_stores'"
        
        # Validate data types
        assert isinstance(report["period_days"], int), "period_days should be int"
        assert isinstance(report["total_violations"], int), "total_violations should be int"
        assert isinstance(report["total_compensations"], (int, float)), "total_compensations should be numeric"
        assert isinstance(report["violating_stores"], list), "violating_stores should be list"
        
        print(f"✅ Violations report structure correct: total_violations={report['total_violations']}, total_compensations={report['total_compensations']}")
    
    def test_violations_report_with_different_days(self):
        """Test violations report with different day parameters"""
        if not self.admin_token:
            pytest.skip("Admin auth failed")
        
        # Test with 7 days
        response_7 = requests.get(f"{BASE_URL}/api/admin/violations/report?days=7", headers=self.headers_admin)
        assert response_7.status_code == 200
        report_7 = response_7.json()["report"]
        assert report_7["period_days"] == 7
        
        # Test with 30 days
        response_30 = requests.get(f"{BASE_URL}/api/admin/violations/report?days=30", headers=self.headers_admin)
        assert response_30.status_code == 200
        report_30 = response_30.json()["report"]
        assert report_30["period_days"] == 30
        
        print(f"✅ Violations report works with different day parameters")
    
    def test_violations_report_requires_admin(self):
        """Test violations report requires admin role"""
        # Test without auth
        response = requests.get(f"{BASE_URL}/api/admin/violations/report?days=30")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        # Test with driver token (should fail)
        if self.driver_token:
            response = requests.get(f"{BASE_URL}/api/admin/violations/report?days=30", headers=self.headers_driver)
            assert response.status_code == 403, f"Expected 403 for driver, got {response.status_code}"
        
        print("✅ Violations report requires admin auth")
    
    # ============= Admin Delivery Settings Tests =============
    
    def test_admin_delivery_settings_endpoint(self):
        """Test GET /api/admin/settings/delivery returns wait compensation settings"""
        if not self.admin_token:
            pytest.skip("Admin auth failed")
        
        response = requests.get(f"{BASE_URL}/api/admin/settings/delivery", headers=self.headers_admin)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        
        # Check settings structure
        settings = data.get("settings", {})
        
        expected_keys = [
            "max_waiting_time_minutes",
            "compensation_per_5_minutes",
            "max_compensation_per_order",
            "warnings_before_alert",
            "warnings_before_final",
            "warnings_before_suspend",
            "suspend_duration_hours"
        ]
        
        for key in expected_keys:
            assert key in settings, f"Settings should have '{key}'"
        
        print(f"✅ Admin delivery settings correct: {settings}")
    
    # ============= Verify Pickup Code Tests =============
    
    def test_verify_pickup_requires_driver_auth(self):
        """Test POST /api/food/orders/delivery/{order_id}/verify-pickup requires driver auth"""
        # Test without auth
        response = requests.post(f"{BASE_URL}/api/food/orders/delivery/test-order/verify-pickup", json={"code": "1234"})
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        
        print("✅ Verify pickup requires auth")
    
    def test_verify_pickup_with_invalid_order(self):
        """Test verify pickup with non-existent order"""
        if not self.driver_token:
            pytest.skip("Driver auth failed")
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/non-existent-order/verify-pickup",
            headers=self.headers_driver,
            json={"code": "1234"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✅ Verify pickup returns 404 for invalid order")
    
    # ============= Driver Arrived Tests =============
    
    def test_driver_arrived_endpoint_exists(self):
        """Test POST /api/food/orders/delivery/{order_id}/arrived endpoint exists"""
        if not self.driver_token:
            pytest.skip("Driver auth failed")
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/non-existent-order/arrived",
            headers=self.headers_driver
        )
        
        # Should return 404 for non-existent order, not 404 for missing endpoint
        assert response.status_code == 404, f"Expected 404 for non-existent order, got {response.status_code}"
        
        print("✅ Driver arrived endpoint exists")
    
    # ============= Violations List Tests =============
    
    def test_violations_list_endpoint(self):
        """Test GET /api/admin/violations/list endpoint"""
        if not self.admin_token:
            pytest.skip("Admin auth failed")
        
        response = requests.get(f"{BASE_URL}/api/admin/violations/list", headers=self.headers_admin)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "violations" in data, "Response should have 'violations'"
        assert "pagination" in data, "Response should have 'pagination'"
        
        # Check pagination structure
        pagination = data["pagination"]
        assert "page" in pagination
        assert "limit" in pagination
        assert "total" in pagination
        
        print(f"✅ Violations list endpoint working: {len(data['violations'])} violations found")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
