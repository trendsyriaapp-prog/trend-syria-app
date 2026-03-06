# /app/backend/tests/test_delivery_boxes.py
# Test cases for Delivery Box Management System
# Tests delivery user box endpoints and admin box management endpoints

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DELIVERY_USER = {"phone": "0900000000", "password": "delivery123"}
ADMIN_USER = {"phone": "0911111111", "password": "admin123"}


class TestDeliveryBoxAPIs:
    """Test delivery box API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.delivery_token = None
        self.admin_token = None
        
    def get_delivery_token(self):
        """Get delivery user authentication token"""
        if not self.delivery_token:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json=DELIVERY_USER,
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 200:
                self.delivery_token = response.json().get("token")
        return self.delivery_token
    
    def get_admin_token(self):
        """Get admin authentication token"""
        if not self.admin_token:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json=ADMIN_USER,
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 200:
                self.admin_token = response.json().get("token")
        return self.admin_token
    
    # ========== Delivery User Login Tests ==========
    
    def test_delivery_user_login(self):
        """Test delivery user can login with phone 0900000000 and password delivery123"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=DELIVERY_USER,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["user_type"] == "delivery", "User type should be delivery"
        assert data["user"]["phone"] == "0900000000", "Phone should match"
        assert data["user"]["is_approved"] == True, "User should be approved"
        print(f"✓ Delivery user login successful: {data['user']['full_name']}")
    
    # ========== Admin User Login Tests ==========
    
    def test_admin_user_login(self):
        """Test admin user can login with phone 0911111111 and password admin123"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ADMIN_USER,
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["user_type"] == "admin", "User type should be admin"
        print(f"✓ Admin user login successful: {data['user']['full_name']}")
    
    # ========== Delivery Box API Tests ==========
    
    def test_delivery_my_box_endpoint(self):
        """Test GET /api/delivery-boxes/my-box returns box data for delivery user"""
        token = self.get_delivery_token()
        assert token, "Failed to get delivery token"
        
        response = requests.get(
            f"{BASE_URL}/api/delivery-boxes/my-box",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"My-box endpoint failed: {response.text}"
        
        data = response.json()
        assert "has_box" in data, "has_box field missing"
        assert data["has_box"] == True, "Delivery user should have a box assigned"
        assert data["box_serial"] == "BOX-001", f"Box serial should be BOX-001, got {data.get('box_serial')}"
        assert data["deposit_paid"] == 15000, f"Deposit should be 15000, got {data.get('deposit_paid')}"
        assert data["progress_percent"] == 25, f"Progress should be 25%, got {data.get('progress_percent')}"
        assert data["remaining_installments"] == 10, f"Remaining installments should be 10"
        
        print(f"✓ My box endpoint returns correct data: {data['box_serial']}, {data['progress_percent']}% progress")
    
    def test_delivery_my_box_has_payments_history(self):
        """Test that my-box endpoint includes payments history"""
        token = self.get_delivery_token()
        assert token, "Failed to get delivery token"
        
        response = requests.get(
            f"{BASE_URL}/api/delivery-boxes/my-box",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "payments" in data, "payments field missing"
        assert len(data["payments"]) > 0, "Should have at least one payment"
        
        payment = data["payments"][0]
        assert payment["type"] == "deposit", "First payment should be deposit"
        assert payment["amount"] == 15000, "Deposit amount should be 15000"
        print(f"✓ Payments history available: {len(data['payments'])} payment(s)")
    
    def test_delivery_my_box_has_settings(self):
        """Test that my-box endpoint includes box settings"""
        token = self.get_delivery_token()
        assert token, "Failed to get delivery token"
        
        response = requests.get(
            f"{BASE_URL}/api/delivery-boxes/my-box",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "settings" in data, "settings field missing"
        settings = data["settings"]
        assert settings["deposit_amount"] == 30000, "Deposit amount should be 30000"
        assert settings["monthly_installment"] == 3000, "Monthly installment should be 3000"
        assert settings["total_installments"] == 10, "Total installments should be 10"
        print(f"✓ Box settings included: deposit={settings['deposit_amount']}, installment={settings['monthly_installment']}")
    
    # ========== Admin Box Management Tests ==========
    
    def test_admin_get_all_boxes(self):
        """Test GET /api/delivery-boxes/admin/all returns all boxes"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/delivery-boxes/admin/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Admin all boxes failed: {response.text}"
        
        data = response.json()
        assert "boxes" in data, "boxes field missing"
        assert "stats" in data, "stats field missing"
        assert "settings" in data, "settings field missing"
        
        # Verify BOX-001 is in the list
        box_serials = [box["serial"] for box in data["boxes"]]
        assert "BOX-001" in box_serials, "BOX-001 should be in boxes list"
        
        # Verify stats
        stats = data["stats"]
        assert stats["total_boxes"] >= 1, "Should have at least 1 box"
        assert stats["assigned"] >= 1, "Should have at least 1 assigned box"
        
        print(f"✓ Admin all boxes endpoint works: {stats['total_boxes']} boxes, {stats['assigned']} assigned")
    
    def test_admin_boxes_show_box001_assigned(self):
        """Test that BOX-001 shows as assigned in admin panel"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/delivery-boxes/admin/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        boxes = data["boxes"]
        
        # Find BOX-001
        box001 = next((b for b in boxes if b["serial"] == "BOX-001"), None)
        assert box001 is not None, "BOX-001 not found"
        assert box001["status"] == "assigned", f"BOX-001 should be assigned, got {box001.get('status')}"
        assert box001["assigned_to_name"] == "فهد المندوب", "Should be assigned to فهد المندوب"
        assert box001["total_paid"] == 15000, "Total paid should be 15000"
        
        print(f"✓ BOX-001 correctly shows as assigned to {box001['assigned_to_name']}")
    
    def test_admin_boxes_stats(self):
        """Test admin boxes endpoint returns correct stats"""
        token = self.get_admin_token()
        assert token, "Failed to get admin token"
        
        response = requests.get(
            f"{BASE_URL}/api/delivery-boxes/admin/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        stats = data["stats"]
        
        assert "total_boxes" in stats, "total_boxes missing"
        assert "assigned" in stats, "assigned missing"
        assert "available" in stats, "available missing"
        assert "owned" in stats, "owned missing"
        assert "damaged" in stats, "damaged missing"
        
        print(f"✓ Admin stats: total={stats['total_boxes']}, assigned={stats['assigned']}, available={stats['available']}")
    
    # ========== Delivery Document Status Tests ==========
    
    def test_delivery_documents_status(self):
        """Test delivery documents status endpoint"""
        token = self.get_delivery_token()
        assert token, "Failed to get delivery token"
        
        response = requests.get(
            f"{BASE_URL}/api/delivery/documents/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Documents status failed: {response.text}"
        
        data = response.json()
        assert "status" in data, "status field missing"
        assert data["status"] == "approved", f"Status should be approved, got {data.get('status')}"
        print(f"✓ Delivery documents status: {data['status']}")
    
    # ========== Authorization Tests ==========
    
    def test_my_box_requires_auth(self):
        """Test my-box endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/delivery-boxes/my-box")
        assert response.status_code == 401 or response.status_code == 403, \
            f"Should require auth, got {response.status_code}"
        print("✓ My-box endpoint requires authentication")
    
    def test_admin_boxes_requires_admin(self):
        """Test admin boxes endpoint requires admin role"""
        # First, try without any token
        response = requests.get(f"{BASE_URL}/api/delivery-boxes/admin/all")
        assert response.status_code in [401, 403], \
            f"Should require auth, got {response.status_code}"
        
        # Try with delivery token (should fail)
        delivery_token = self.get_delivery_token()
        response = requests.get(
            f"{BASE_URL}/api/delivery-boxes/admin/all",
            headers={"Authorization": f"Bearer {delivery_token}"}
        )
        assert response.status_code in [401, 403], \
            f"Delivery user should not access admin endpoint, got {response.status_code}"
        
        print("✓ Admin boxes endpoint requires admin role")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
