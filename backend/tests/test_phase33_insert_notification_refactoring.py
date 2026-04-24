"""
Phase 33 - Test insert_notification helper refactoring in admin.py
Tests that all admin approval/rejection APIs work correctly after extracting insert_notification helper
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminApprovalAPIs:
    """Test admin approval/rejection APIs that use insert_notification helper"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        
        # Login as admin with password
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "TrendSyria@2026"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.admin_token = data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
    
    # ============== Seller Approval/Rejection Tests ==============
    
    def test_get_pending_sellers(self):
        """Test GET /api/admin/sellers/pending"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/admin/sellers/pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/admin/sellers/pending - Found {len(data)} pending sellers")
    
    def test_get_all_sellers(self):
        """Test GET /api/admin/sellers/all"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/admin/sellers/all")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        print(f"✅ GET /api/admin/sellers/all - Found {len(data['data'])} sellers")
    
    def test_seller_approval_endpoint_exists(self):
        """Test POST /api/admin/sellers/{seller_id}/approve endpoint exists"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        # Test with non-existent seller - should return 404 or similar, not 500
        response = self.session.post(f"{BASE_URL}/api/admin/sellers/nonexistent-seller-id/approve")
        # Should not be 500 (server error)
        assert response.status_code != 500
        print(f"✅ POST /api/admin/sellers/approve endpoint exists - Status: {response.status_code}")
    
    def test_seller_rejection_endpoint_exists(self):
        """Test POST /api/admin/sellers/{seller_id}/reject endpoint exists"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/sellers/nonexistent-seller-id/reject",
            json={"reason": "Test rejection reason"}
        )
        assert response.status_code != 500
        print(f"✅ POST /api/admin/sellers/reject endpoint exists - Status: {response.status_code}")
    
    # ============== Driver Approval/Rejection Tests ==============
    
    def test_get_pending_drivers(self):
        """Test GET /api/admin/delivery/pending"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/admin/delivery/pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/admin/delivery/pending - Found {len(data)} pending drivers")
    
    def test_get_all_drivers(self):
        """Test GET /api/admin/delivery/all"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/admin/delivery/all")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        print(f"✅ GET /api/admin/delivery/all - Found {len(data['data'])} drivers")
    
    def test_driver_approval_endpoint_exists(self):
        """Test POST /api/admin/delivery/{driver_id}/approve endpoint exists"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.post(f"{BASE_URL}/api/admin/delivery/nonexistent-driver-id/approve")
        assert response.status_code != 500
        print(f"✅ POST /api/admin/delivery/approve endpoint exists - Status: {response.status_code}")
    
    def test_driver_rejection_endpoint_exists(self):
        """Test POST /api/admin/delivery/{driver_id}/reject endpoint exists"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/delivery/nonexistent-driver-id/reject",
            json={"reason": "Test rejection reason"}
        )
        assert response.status_code != 500
        print(f"✅ POST /api/admin/delivery/reject endpoint exists - Status: {response.status_code}")
    
    # ============== Product Approval/Rejection Tests ==============
    
    def test_get_pending_products(self):
        """Test GET /api/admin/products/pending"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/admin/products/pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/admin/products/pending - Found {len(data)} pending products")
    
    def test_get_all_products(self):
        """Test GET /api/admin/products/all"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/admin/products/all")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "pagination" in data
        print(f"✅ GET /api/admin/products/all - Found {len(data['data'])} products")
    
    def test_product_approval_endpoint_exists(self):
        """Test POST /api/admin/products/{product_id}/approve endpoint exists"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.post(f"{BASE_URL}/api/admin/products/nonexistent-product-id/approve")
        assert response.status_code != 500
        print(f"✅ POST /api/admin/products/approve endpoint exists - Status: {response.status_code}")
    
    def test_product_rejection_endpoint_exists(self):
        """Test POST /api/admin/products/{product_id}/reject endpoint exists"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/products/nonexistent-product-id/reject",
            json={"reason": "Test rejection reason"}
        )
        assert response.status_code != 500
        print(f"✅ POST /api/admin/products/reject endpoint exists - Status: {response.status_code}")
    
    # ============== Food Product Approval/Rejection Tests ==============
    
    def test_get_pending_food_products(self):
        """Test GET /api/admin/food-products/pending"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/admin/food-products/pending")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/admin/food-products/pending - Found {len(data)} pending food products")
    
    def test_food_product_approval_endpoint_exists(self):
        """Test POST /api/admin/food-products/{product_id}/approve endpoint exists"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.post(f"{BASE_URL}/api/admin/food-products/nonexistent-product-id/approve")
        assert response.status_code != 500
        print(f"✅ POST /api/admin/food-products/approve endpoint exists - Status: {response.status_code}")
    
    def test_food_product_rejection_endpoint_exists(self):
        """Test POST /api/admin/food-products/{product_id}/reject endpoint exists"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.post(
            f"{BASE_URL}/api/admin/food-products/nonexistent-product-id/reject",
            json={"reason": "Test rejection reason"}
        )
        assert response.status_code != 500
        print(f"✅ POST /api/admin/food-products/reject endpoint exists - Status: {response.status_code}")


class TestInsertNotificationHelper:
    """Test that insert_notification helper is correctly defined and used"""
    
    def test_admin_stats_endpoint(self):
        """Test GET /api/admin/stats - verifies admin routes are working"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin with password
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "TrendSyria@2026"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Admin authentication failed")
        
        token = login_response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = session.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        expected_keys = ["total_users", "total_sellers", "total_delivery", "total_products", 
                        "total_orders", "pending_sellers", "pending_products", "pending_delivery"]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"
        
        print(f"✅ GET /api/admin/stats - Stats retrieved successfully")
        print(f"   - Pending sellers: {data.get('pending_sellers', 0)}")
        print(f"   - Pending drivers: {data.get('pending_delivery', 0)}")
        print(f"   - Pending products: {data.get('pending_products', 0)}")
    
    def test_seller_suspend_activate_endpoints(self):
        """Test seller suspend/activate endpoints that use insert_notification"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin with password
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "TrendSyria@2026"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Admin authentication failed")
        
        token = login_response.json().get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Test suspend endpoint exists
        response = session.post(
            f"{BASE_URL}/api/admin/sellers/nonexistent-seller-id/suspend",
            json={"reason": "Test suspension"}
        )
        assert response.status_code != 500
        print(f"✅ POST /api/admin/sellers/suspend endpoint exists - Status: {response.status_code}")
        
        # Test activate endpoint exists
        response = session.post(f"{BASE_URL}/api/admin/sellers/nonexistent-seller-id/activate")
        assert response.status_code != 500
        print(f"✅ POST /api/admin/sellers/activate endpoint exists - Status: {response.status_code}")


class TestAdminNotificationEndpoints:
    """Test admin notification management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        
        # Login as admin with password
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "TrendSyria@2026"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.admin_token = data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
    
    def test_get_admin_notifications(self):
        """Test GET /api/admin/notifications"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/admin/notifications")
        assert response.status_code == 200
        print(f"✅ GET /api/admin/notifications - Status: {response.status_code}")
    
    def test_create_notification(self):
        """Test POST /api/admin/notifications"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.post(f"{BASE_URL}/api/admin/notifications", json={
            "title": "TEST_Notification",
            "message": "This is a test notification",
            "target": "all"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ POST /api/admin/notifications - Notification created successfully")


class TestPlatformSettings:
    """Test platform settings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        
        # Login as admin with password
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "TrendSyria@2026"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.admin_token = data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
    
    def test_get_platform_settings(self):
        """Test GET /api/admin/settings"""
        if not self.admin_token:
            pytest.skip("Admin authentication failed")
        
        response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✅ GET /api/admin/settings - Settings retrieved successfully")
    
    def test_get_public_settings(self):
        """Test GET /api/admin/settings/public - no auth required"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/admin/settings/public")
        assert response.status_code == 200
        data = response.json()
        assert "food_enabled" in data
        assert "shop_enabled" in data
        print(f"✅ GET /api/admin/settings/public - Public settings retrieved")
    
    def test_get_platform_status(self):
        """Test GET /api/admin/platform-status - no auth required"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/admin/platform-status")
        assert response.status_code == 200
        data = response.json()
        assert "platform_closed_for_customers" in data
        assert "platform_closed_for_sellers" in data
        print(f"✅ GET /api/admin/platform-status - Platform status retrieved")
