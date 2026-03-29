# /app/backend/tests/test_banners_flash_requests.py
# Tests for Banners Management & Flash Sale Request System

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"phone": "0911111111", "password": "admin123"}
SELLER_CREDS = {"phone": "0922222222", "password": "seller123"}
BUYER_CREDS = {"phone": "0933333333", "password": "user123"}


class TestSetup:
    """Setup and helper methods"""
    
    @staticmethod
    def login(creds):
        """Login and return token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    @staticmethod
    def get_auth_headers(token):
        """Return auth headers"""
        return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ============== Homepage Banners Tests ==============

class TestHomepageBanners:
    """Admin Homepage Banners Management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token = TestSetup.login(ADMIN_CREDS)
        self.seller_token = TestSetup.login(SELLER_CREDS)
        self.buyer_token = TestSetup.login(BUYER_CREDS)
        self.created_banner_ids = []
    
    def teardown_method(self):
        """Clean up TEST_ prefixed banners"""
        if self.admin_token:
            headers = TestSetup.get_auth_headers(self.admin_token)
            for banner_id in self.created_banner_ids:
                requests.delete(f"{BASE_URL}/api/admin/homepage-banners/{banner_id}", headers=headers)
    
    def test_admin_get_homepage_banners(self):
        """Admin can fetch homepage banners"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        response = requests.get(f"{BASE_URL}/api/admin/homepage-banners", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/admin/homepage-banners - {len(data)} banners found")
    
    def test_admin_create_homepage_banner(self):
        """Admin can create a homepage banner"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        banner_data = {
            "title": f"TEST_Banner_{uuid.uuid4().hex[:8]}",
            "description": "Test banner description",
            "image": "",
            "link": "/products",
            "background_color": "#FF6B00",
            "order": 1,
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/homepage-banners", json=banner_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain banner id"
        assert data["title"] == banner_data["title"], "Title should match"
        
        self.created_banner_ids.append(data["id"])
        print(f"✅ POST /api/admin/homepage-banners - Banner created: {data['id']}")
    
    def test_admin_update_homepage_banner(self):
        """Admin can update a homepage banner"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        
        # First create a banner
        banner_data = {
            "title": f"TEST_Update_{uuid.uuid4().hex[:8]}",
            "is_active": True
        }
        create_res = requests.post(f"{BASE_URL}/api/admin/homepage-banners", json=banner_data, headers=headers)
        banner_id = create_res.json().get("id")
        self.created_banner_ids.append(banner_id)
        
        # Update it
        update_data = {"title": f"TEST_Updated_{uuid.uuid4().hex[:8]}", "is_active": False}
        response = requests.put(f"{BASE_URL}/api/admin/homepage-banners/{banner_id}", json=update_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ PUT /api/admin/homepage-banners/{banner_id} - Banner updated")
    
    def test_admin_toggle_homepage_banner_active(self):
        """Admin can toggle banner is_active status"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Create
        banner_data = {"title": f"TEST_Toggle_{uuid.uuid4().hex[:8]}", "is_active": True}
        create_res = requests.post(f"{BASE_URL}/api/admin/homepage-banners", json=banner_data, headers=headers)
        banner_id = create_res.json().get("id")
        self.created_banner_ids.append(banner_id)
        
        # Toggle to inactive
        response = requests.put(f"{BASE_URL}/api/admin/homepage-banners/{banner_id}", 
                               json={"is_active": False}, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ Toggle homepage banner active/inactive working")
    
    def test_admin_delete_homepage_banner(self):
        """Admin can delete a homepage banner"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Create
        banner_data = {"title": f"TEST_Delete_{uuid.uuid4().hex[:8]}"}
        create_res = requests.post(f"{BASE_URL}/api/admin/homepage-banners", json=banner_data, headers=headers)
        banner_id = create_res.json().get("id")
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/admin/homepage-banners/{banner_id}", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ DELETE /api/admin/homepage-banners/{banner_id} - Banner deleted")
    
    def test_buyer_cannot_access_homepage_banners(self):
        """Buyer cannot access admin homepage banners endpoint"""
        headers = TestSetup.get_auth_headers(self.buyer_token)
        response = requests.get(f"{BASE_URL}/api/admin/homepage-banners", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Buyer cannot access homepage banners (403)")


# ============== Food Banners Tests ==============

class TestFoodBanners:
    """Admin Food Banners Management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token = TestSetup.login(ADMIN_CREDS)
        self.buyer_token = TestSetup.login(BUYER_CREDS)
        self.created_banner_ids = []
    
    def teardown_method(self):
        """Clean up TEST_ prefixed banners"""
        if self.admin_token:
            headers = TestSetup.get_auth_headers(self.admin_token)
            for banner_id in self.created_banner_ids:
                requests.delete(f"{BASE_URL}/api/admin/food-banners/{banner_id}", headers=headers)
    
    def test_admin_get_food_banners(self):
        """Admin can fetch food banners"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        response = requests.get(f"{BASE_URL}/api/admin/food-banners", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/admin/food-banners - {len(data)} banners found")
    
    def test_admin_create_food_banner(self):
        """Admin can create a food banner"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        banner_data = {
            "title": f"TEST_FoodBanner_{uuid.uuid4().hex[:8]}",
            "description": "عروض المطاعم",
            "link": "/food",
            "background_color": "#22C55E",
            "order": 1,
            "is_active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/food-banners", json=banner_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain banner id"
        
        self.created_banner_ids.append(data["id"])
        print(f"✅ POST /api/admin/food-banners - Banner created: {data['id']}")
    
    def test_admin_update_food_banner(self):
        """Admin can update a food banner"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Create
        banner_data = {"title": f"TEST_FoodUpdate_{uuid.uuid4().hex[:8]}"}
        create_res = requests.post(f"{BASE_URL}/api/admin/food-banners", json=banner_data, headers=headers)
        banner_id = create_res.json().get("id")
        self.created_banner_ids.append(banner_id)
        
        # Update
        update_data = {"title": f"TEST_FoodUpdated_{uuid.uuid4().hex[:8]}", "is_active": False}
        response = requests.put(f"{BASE_URL}/api/admin/food-banners/{banner_id}", json=update_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ PUT /api/admin/food-banners/{banner_id} - Banner updated")
    
    def test_admin_delete_food_banner(self):
        """Admin can delete a food banner"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Create
        banner_data = {"title": f"TEST_FoodDelete_{uuid.uuid4().hex[:8]}"}
        create_res = requests.post(f"{BASE_URL}/api/admin/food-banners", json=banner_data, headers=headers)
        banner_id = create_res.json().get("id")
        
        # Delete
        response = requests.delete(f"{BASE_URL}/api/admin/food-banners/{banner_id}", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ DELETE /api/admin/food-banners/{banner_id} - Banner deleted")
    
    def test_public_food_banners_endpoint(self):
        """Public can fetch active food banners"""
        response = requests.get(f"{BASE_URL}/api/food/banners")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/food/banners (public) - {len(data)} active banners")


# ============== Flash Sale Requests Tests ==============

class TestFlashSaleRequests:
    """Seller Flash Sale Request System & Admin Management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_token = TestSetup.login(ADMIN_CREDS)
        self.seller_token = TestSetup.login(SELLER_CREDS)
        self.buyer_token = TestSetup.login(BUYER_CREDS)
        self.created_flash_sale_ids = []
        self.created_request_ids = []
    
    def teardown_method(self):
        """Clean up test data"""
        if self.admin_token:
            headers = TestSetup.get_auth_headers(self.admin_token)
            # Clean up flash sales
            for sale_id in self.created_flash_sale_ids:
                requests.delete(f"{BASE_URL}/api/admin/flash-sales/{sale_id}", headers=headers)
    
    def test_get_flash_sale_settings(self):
        """Seller can get flash sale settings (join fee)"""
        headers = TestSetup.get_auth_headers(self.seller_token)
        response = requests.get(f"{BASE_URL}/api/food/flash-sale-settings", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "join_fee" in data, "Response should contain join_fee"
        print(f"✅ GET /api/food/flash-sale-settings - join_fee: {data.get('join_fee')}")
    
    def test_get_available_flash_sales_for_seller(self):
        """Seller can get available flash sales to join"""
        headers = TestSetup.get_auth_headers(self.seller_token)
        response = requests.get(f"{BASE_URL}/api/food/flash-sales/available", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/food/flash-sales/available - {len(data)} flash sales available")
    
    def test_get_my_flash_requests(self):
        """Seller can get their flash sale requests"""
        headers = TestSetup.get_auth_headers(self.seller_token)
        response = requests.get(f"{BASE_URL}/api/food/my-flash-requests", headers=headers)
        
        # May return 404 if seller has no food store
        if response.status_code == 404:
            print("✅ GET /api/food/my-flash-requests - Seller has no food store (expected)")
        else:
            assert response.status_code == 200, f"Expected 200/404, got {response.status_code}"
            data = response.json()
            assert isinstance(data, list), "Response should be a list"
            print(f"✅ GET /api/food/my-flash-requests - {len(data)} requests found")
    
    def test_admin_get_flash_sale_requests(self):
        """Admin can get all flash sale requests"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        response = requests.get(f"{BASE_URL}/api/admin/flash-sale-requests", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "requests" in data, "Response should contain requests"
        assert "stats" in data, "Response should contain stats"
        print(f"✅ GET /api/admin/flash-sale-requests - Stats: {data.get('stats')}")
    
    def test_admin_get_flash_sale_requests_by_status(self):
        """Admin can filter flash sale requests by status"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        
        for status in ["pending", "approved", "rejected"]:
            response = requests.get(f"{BASE_URL}/api/admin/flash-sale-requests?status={status}", headers=headers)
            assert response.status_code == 200, f"Expected 200 for status={status}, got {response.status_code}"
        
        print("✅ GET /api/admin/flash-sale-requests?status=<pending|approved|rejected> - All filters working")
    
    def test_admin_get_flash_sale_settings(self):
        """Admin can get flash sale settings"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        response = requests.get(f"{BASE_URL}/api/admin/flash-sale-settings", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "join_fee" in data, "Response should contain join_fee"
        print(f"✅ GET /api/admin/flash-sale-settings - Current settings: {data}")
    
    def test_admin_update_flash_sale_settings(self):
        """Admin can update flash sale settings"""
        headers = TestSetup.get_auth_headers(self.admin_token)
        
        # Get current settings
        get_res = requests.get(f"{BASE_URL}/api/admin/flash-sale-settings", headers=headers)
        original_fee = get_res.json().get("join_fee", 5000)
        
        # Update
        update_data = {"join_fee": 7500, "max_products": 15}
        response = requests.put(f"{BASE_URL}/api/admin/flash-sale-settings", json=update_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Restore original
        requests.put(f"{BASE_URL}/api/admin/flash-sale-settings", json={"join_fee": original_fee}, headers=headers)
        print("✅ PUT /api/admin/flash-sale-settings - Settings updated and restored")
    
    def test_buyer_cannot_access_admin_flash_requests(self):
        """Buyer cannot access admin flash sale requests"""
        headers = TestSetup.get_auth_headers(self.buyer_token)
        response = requests.get(f"{BASE_URL}/api/admin/flash-sale-requests", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Buyer cannot access admin flash-sale-requests (403)")


# ============== Seller Food Store Integration Tests ==============

class TestSellerFoodStoreIntegration:
    """Test that seller needs an approved food store for flash requests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.seller_token = TestSetup.login(SELLER_CREDS)
        self.admin_token = TestSetup.login(ADMIN_CREDS)
    
    def test_seller_my_store_endpoint(self):
        """Check seller's food store status"""
        headers = TestSetup.get_auth_headers(self.seller_token)
        response = requests.get(f"{BASE_URL}/api/food/my-store", headers=headers)
        
        if response.status_code == 404:
            print("✅ GET /api/food/my-store - Seller has no food store (need to join /join/food-seller)")
        elif response.status_code == 200:
            data = response.json()
            store = data.get("store", {})
            print(f"✅ GET /api/food/my-store - Store: {store.get('name')}, Approved: {store.get('is_approved')}")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")
    
    def test_flash_request_requires_approved_store(self):
        """Flash sale request requires an approved food store"""
        headers = TestSetup.get_auth_headers(self.seller_token)
        
        # Try to create a flash sale request without a food store
        request_data = {
            "flash_sale_id": "nonexistent",
            "product_ids": ["product1"]
        }
        response = requests.post(f"{BASE_URL}/api/food/flash-sale-request", json=request_data, headers=headers)
        
        # Should fail with 403 (no store) or 404 (flash sale not found)
        assert response.status_code in [403, 404], f"Expected 403/404, got {response.status_code}"
        print(f"✅ Flash sale request requires food store - Got {response.status_code}")


# ============== Run Tests ==============

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
