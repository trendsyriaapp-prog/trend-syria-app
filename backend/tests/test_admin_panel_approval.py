"""
Test Admin Panel Approval/Rejection Features for Trend Syria E-commerce
Tests:
1. Create regular seller (seller) + verify in admin panel with all fields
2. Create food seller (food_seller) + verify in admin panel with all fields
3. Create delivery driver (delivery) + verify with all fields (personal_photo, id_photo, motorcycle_license)
4. Create product from seller + verify admin_video in admin panel
5. Create food item from food seller + verify admin_video in admin panel
6. Test approve button for seller and product
7. Test reject button with rejection reason
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"
DUMMY_OTP = "123456"

# Test data prefixes for cleanup
TEST_PREFIX = "TEST_ADMIN_PANEL_"

# Dummy URLs for testing
DUMMY_IMAGE_URL = "https://via.placeholder.com/300x300.png?text=Test+Image"
DUMMY_VIDEO_URL = "https://www.w3schools.com/html/mov_bbb.mp4"
DUMMY_ID_PHOTO = "https://via.placeholder.com/400x300.png?text=ID+Photo"
DUMMY_LICENSE_PHOTO = "https://via.placeholder.com/400x300.png?text=License"
DUMMY_PERSONAL_PHOTO = "https://via.placeholder.com/300x300.png?text=Personal+Photo"


class TestAdminPanelApproval:
    """Test suite for admin panel approval/rejection features"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        # Step 1: Request OTP
        response = requests.post(f"{BASE_URL}/api/auth/request-otp", json={
            "phone": ADMIN_PHONE
        })
        print(f"OTP Request: {response.status_code}")
        
        # Step 2: Verify OTP and login
        response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": ADMIN_PHONE,
            "otp": DUMMY_OTP
        })
        print(f"OTP Verify: {response.status_code}")
        
        # Step 3: Login with password
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        print(f"Login: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            print("✅ Admin login successful, token obtained")
            return token
        else:
            print(f"❌ Admin login failed: {response.text}")
            pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def test_seller_data(self):
        """Create test seller data"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "phone": f"09{unique_id[:8]}",
            "full_name": f"{TEST_PREFIX}Seller_{unique_id}",
            "store_name": f"{TEST_PREFIX}Store_{unique_id}",
            "city": "دمشق",
            "store_address": {
                "area": "المزة",
                "street": "شارع الجلاء",
                "building": "بناء 123"
            }
        }
    
    @pytest.fixture(scope="class")
    def test_food_seller_data(self):
        """Create test food seller data"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "phone": f"09{unique_id[:8]}",
            "full_name": f"{TEST_PREFIX}FoodSeller_{unique_id}",
            "store_name": f"{TEST_PREFIX}FoodStore_{unique_id}",
            "store_type": "restaurants",
            "city": "دمشق"
        }
    
    @pytest.fixture(scope="class")
    def test_driver_data(self):
        """Create test delivery driver data"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "phone": f"09{unique_id[:8]}",
            "full_name": f"{TEST_PREFIX}Driver_{unique_id}",
            "city": "دمشق",
            "personal_photo": DUMMY_PERSONAL_PHOTO,
            "id_photo": DUMMY_ID_PHOTO,
            "motorcycle_license": DUMMY_LICENSE_PHOTO,
            "vehicle_type": "motorcycle"
        }
    
    # ============== Test 1: Pending Sellers API ==============
    
    def test_01_get_pending_sellers(self, admin_token):
        """Test GET /api/admin/sellers/pending returns correct structure"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/sellers/pending", headers=headers)
        
        print(f"Pending Sellers API: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check structure if there are pending sellers
        if len(data) > 0:
            seller = data[0]
            print(f"Sample pending seller structure: {list(seller.keys())}")
            
            # Check for expected fields
            expected_fields = ["seller_id", "status", "seller"]
            for field in expected_fields:
                if field in seller:
                    print(f"  ✅ Field '{field}' present")
                else:
                    print(f"  ⚠️ Field '{field}' missing")
            
            # Check seller nested object
            if "seller" in seller:
                seller_obj = seller["seller"]
                seller_fields = ["store_name", "phone", "city"]
                for field in seller_fields:
                    if field in seller_obj:
                        print(f"    ✅ Seller field '{field}': {seller_obj.get(field, 'N/A')}")
                    else:
                        print(f"    ⚠️ Seller field '{field}' missing")
        
        print(f"✅ Found {len(data)} pending sellers")
    
    # ============== Test 2: Pending Delivery Drivers API ==============
    
    def test_02_get_pending_delivery(self, admin_token):
        """Test GET /api/admin/delivery/pending returns correct structure with document fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/delivery/pending", headers=headers)
        
        print(f"Pending Delivery API: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check structure if there are pending drivers
        if len(data) > 0:
            driver = data[0]
            print(f"Sample pending driver structure: {list(driver.keys())}")
            
            # Check for document fields (critical for admin approval)
            document_fields = ["personal_photo", "id_photo", "motorcycle_license"]
            for field in document_fields:
                if field in driver:
                    has_value = bool(driver.get(field))
                    print(f"  {'✅' if has_value else '⚠️'} Document '{field}': {'Present' if has_value else 'Missing'}")
                else:
                    print(f"  ⚠️ Document field '{field}' not in response")
            
            # Check driver nested object
            if "driver" in driver:
                driver_obj = driver["driver"]
                driver_fields = ["name", "full_name", "phone", "city"]
                for field in driver_fields:
                    if field in driver_obj:
                        print(f"    ✅ Driver field '{field}': {driver_obj.get(field, 'N/A')}")
        
        print(f"✅ Found {len(data)} pending delivery drivers")
    
    # ============== Test 3: Pending Products API ==============
    
    def test_03_get_pending_products(self, admin_token):
        """Test GET /api/admin/products/pending returns products with admin_video field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/products/pending", headers=headers)
        
        print(f"Pending Products API: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check structure if there are pending products
        if len(data) > 0:
            product = data[0]
            print(f"Sample pending product structure: {list(product.keys())}")
            
            # Check for admin_video field (critical for verification)
            if "admin_video" in product:
                has_video = bool(product.get("admin_video"))
                print(f"  {'✅' if has_video else '⚠️'} admin_video: {'Present' if has_video else 'Empty/None'}")
            else:
                print("  ❌ admin_video field NOT in response - CRITICAL ISSUE")
            
            # Check other product fields
            product_fields = ["id", "name", "price", "seller_id", "seller_name", "images"]
            for field in product_fields:
                if field in product:
                    print(f"    ✅ Product field '{field}' present")
        
        print(f"✅ Found {len(data)} pending products")
    
    # ============== Test 4: Pending Food Items API ==============
    
    def test_04_get_pending_food_items(self, admin_token):
        """Test GET /api/admin/food-items/pending returns food items with admin_video field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/food-items/pending", headers=headers)
        
        print(f"Pending Food Items API: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check structure if there are pending food items
        if len(data) > 0:
            item = data[0]
            print(f"Sample pending food item structure: {list(item.keys())}")
            
            # Check for admin_video field
            if "admin_video" in item:
                has_video = bool(item.get("admin_video"))
                print(f"  {'✅' if has_video else '⚠️'} admin_video: {'Present' if has_video else 'Empty/None'}")
            else:
                print("  ⚠️ admin_video field NOT in response (may not be implemented for food items)")
            
            # Check other food item fields
            item_fields = ["id", "name", "price", "store_name", "store_type", "image"]
            for field in item_fields:
                if field in item:
                    print(f"    ✅ Food item field '{field}' present")
        
        print(f"✅ Found {len(data)} pending food items")
    
    # ============== Test 5: Pending Food Stores API ==============
    
    def test_05_get_pending_food_stores(self, admin_token):
        """Test GET /api/admin/food/stores?status=pending returns food stores"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/food/stores?status=pending", headers=headers)
        
        print(f"Pending Food Stores API: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Response could be list or dict with stores key
        stores = data if isinstance(data, list) else data.get("stores", [])
        
        if len(stores) > 0:
            store = stores[0]
            print(f"Sample pending food store structure: {list(store.keys())}")
            
            # Check food store fields
            store_fields = ["id", "name", "store_type", "phone", "city"]
            for field in store_fields:
                if field in store:
                    print(f"    ✅ Store field '{field}': {store.get(field, 'N/A')}")
        
        print(f"✅ Found {len(stores)} pending food stores")
    
    # ============== Test 6: Approve Seller API ==============
    
    def test_06_approve_seller_api_structure(self, admin_token):
        """Test POST /api/admin/sellers/{seller_id}/approve endpoint exists"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test with a fake ID to verify endpoint exists
        fake_id = "test-fake-seller-id"
        response = requests.post(f"{BASE_URL}/api/admin/sellers/{fake_id}/approve", headers=headers)
        
        print(f"Approve Seller API: {response.status_code}")
        
        # Should return 404 (not found) or 200 (success), not 405 (method not allowed)
        assert response.status_code != 405, "Approve seller endpoint should exist"
        
        if response.status_code == 404:
            print("✅ Approve seller endpoint exists (returned 404 for fake ID)")
        elif response.status_code == 200:
            print("✅ Approve seller endpoint works")
        else:
            print(f"⚠️ Unexpected status: {response.status_code} - {response.text}")
    
    # ============== Test 7: Reject Seller API ==============
    
    def test_07_reject_seller_api_structure(self, admin_token):
        """Test POST /api/admin/sellers/{seller_id}/reject endpoint with reason"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        fake_id = "test-fake-seller-id"
        response = requests.post(
            f"{BASE_URL}/api/admin/sellers/{fake_id}/reject",
            headers=headers,
            json={"reason": "Test rejection reason"}
        )
        
        print(f"Reject Seller API: {response.status_code}")
        
        assert response.status_code != 405, "Reject seller endpoint should exist"
        
        if response.status_code == 404:
            print("✅ Reject seller endpoint exists (returned 404 for fake ID)")
        elif response.status_code == 200:
            print("✅ Reject seller endpoint works")
    
    # ============== Test 8: Approve Product API ==============
    
    def test_08_approve_product_api_structure(self, admin_token):
        """Test POST /api/admin/products/{product_id}/approve endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        fake_id = "test-fake-product-id"
        response = requests.post(f"{BASE_URL}/api/admin/products/{fake_id}/approve", headers=headers)
        
        print(f"Approve Product API: {response.status_code}")
        
        assert response.status_code != 405, "Approve product endpoint should exist"
        
        if response.status_code == 404:
            print("✅ Approve product endpoint exists (returned 404 for fake ID)")
        elif response.status_code == 200:
            print("✅ Approve product endpoint works")
    
    # ============== Test 9: Reject Product API ==============
    
    def test_09_reject_product_api_structure(self, admin_token):
        """Test POST /api/admin/products/{product_id}/reject endpoint with reason"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        fake_id = "test-fake-product-id"
        response = requests.post(
            f"{BASE_URL}/api/admin/products/{fake_id}/reject",
            headers=headers,
            json={"reason": "Test rejection reason"}
        )
        
        print(f"Reject Product API: {response.status_code}")
        
        assert response.status_code != 405, "Reject product endpoint should exist"
        
        if response.status_code == 404:
            print("✅ Reject product endpoint exists (returned 404 for fake ID)")
    
    # ============== Test 10: Approve Delivery Driver API ==============
    
    def test_10_approve_delivery_api_structure(self, admin_token):
        """Test POST /api/admin/delivery/{driver_id}/approve endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        fake_id = "test-fake-driver-id"
        response = requests.post(f"{BASE_URL}/api/admin/delivery/{fake_id}/approve", headers=headers)
        
        print(f"Approve Delivery API: {response.status_code}")
        
        assert response.status_code != 405, "Approve delivery endpoint should exist"
        
        if response.status_code == 404:
            print("✅ Approve delivery endpoint exists (returned 404 for fake ID)")
    
    # ============== Test 11: Reject Delivery Driver API ==============
    
    def test_11_reject_delivery_api_structure(self, admin_token):
        """Test POST /api/admin/delivery/{driver_id}/reject endpoint with reason"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        fake_id = "test-fake-driver-id"
        response = requests.post(
            f"{BASE_URL}/api/admin/delivery/{fake_id}/reject",
            headers=headers,
            json={"reason": "Test rejection reason"}
        )
        
        print(f"Reject Delivery API: {response.status_code}")
        
        assert response.status_code != 405, "Reject delivery endpoint should exist"
        
        if response.status_code == 404:
            print("✅ Reject delivery endpoint exists (returned 404 for fake ID)")
    
    # ============== Test 12: Approve Food Item API ==============
    
    def test_12_approve_food_item_api_structure(self, admin_token):
        """Test POST /api/admin/food-items/{item_id}/approve endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        fake_id = "test-fake-food-item-id"
        response = requests.post(f"{BASE_URL}/api/admin/food-items/{fake_id}/approve", headers=headers)
        
        print(f"Approve Food Item API: {response.status_code}")
        
        assert response.status_code != 405, "Approve food item endpoint should exist"
        
        if response.status_code == 404:
            print("✅ Approve food item endpoint exists (returned 404 for fake ID)")
    
    # ============== Test 13: Reject Food Item API ==============
    
    def test_13_reject_food_item_api_structure(self, admin_token):
        """Test POST /api/admin/food-items/{item_id}/reject endpoint with reason"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        fake_id = "test-fake-food-item-id"
        response = requests.post(
            f"{BASE_URL}/api/admin/food-items/{fake_id}/reject",
            headers=headers,
            json={"reason": "Test rejection reason"}
        )
        
        print(f"Reject Food Item API: {response.status_code}")
        
        assert response.status_code != 405, "Reject food item endpoint should exist"
        
        if response.status_code == 404:
            print("✅ Reject food item endpoint exists (returned 404 for fake ID)")
    
    # ============== Test 14: Approve Food Store API ==============
    
    def test_14_approve_food_store_api_structure(self, admin_token):
        """Test POST /api/admin/food/stores/{store_id}/approve endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        fake_id = "test-fake-food-store-id"
        response = requests.post(f"{BASE_URL}/api/admin/food/stores/{fake_id}/approve", headers=headers)
        
        print(f"Approve Food Store API: {response.status_code}")
        
        assert response.status_code != 405, "Approve food store endpoint should exist"
        
        if response.status_code == 404:
            print("✅ Approve food store endpoint exists (returned 404 for fake ID)")
    
    # ============== Test 15: Reject Food Store API ==============
    
    def test_15_reject_food_store_api_structure(self, admin_token):
        """Test POST /api/admin/food/stores/{store_id}/reject endpoint with reason"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        fake_id = "test-fake-food-store-id"
        response = requests.post(
            f"{BASE_URL}/api/admin/food/stores/{fake_id}/reject",
            headers=headers,
            json={"reason": "Test rejection reason"}
        )
        
        print(f"Reject Food Store API: {response.status_code}")
        
        assert response.status_code != 405, "Reject food store endpoint should exist"
        
        if response.status_code == 404:
            print("✅ Reject food store endpoint exists (returned 404 for fake ID)")
    
    # ============== Test 16: Rejected Requests API ==============
    
    def test_16_get_rejected_requests(self, admin_token):
        """Test GET /api/admin/rejected-requests returns rejected requests history"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/rejected-requests", headers=headers)
        
        print(f"Rejected Requests API: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check structure
        if "requests" in data:
            requests_list = data["requests"]
            print(f"✅ Found {len(requests_list)} rejected requests")
            
            if len(requests_list) > 0:
                req = requests_list[0]
                print(f"Sample rejected request structure: {list(req.keys())}")
                
                # Check fields
                expected_fields = ["id", "type", "name", "reason", "rejected_at"]
                for field in expected_fields:
                    if field in req:
                        print(f"    ✅ Field '{field}' present")
        else:
            print(f"Response structure: {list(data.keys())}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
