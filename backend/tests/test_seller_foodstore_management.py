"""
Test Suite for Seller and Food Store Management APIs
نظام إدارة حسابات البائعين ومتاجر الطعام

Tests:
- GET /api/admin/sellers/with-status - جلب البائعين مع حالاتهم
- POST /api/admin/sellers/{id}/suspend - إيقاف بائع
- POST /api/admin/sellers/{id}/activate - تفعيل بائع
- GET /api/admin/food/stores/with-status - جلب متاجر الطعام مع حالاتها
- POST /api/admin/food/stores/{id}/suspend - إيقاف متجر طعام
- POST /api/admin/food/stores/{id}/activate - تفعيل متجر طعام
- DELETE /api/user/account - حذف الحساب الذاتي (للبائع/بائع الطعام/العميل)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0912345678"
ADMIN_PASSWORD = "admin123"


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login(self):
        """Test admin login to get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data.get("user", {}).get("user_type") in ["admin", "sub_admin"], "User is not admin"
        print(f"✅ Admin login successful - user_type: {data['user']['user_type']}")
        return data["token"]


class TestSellerManagement:
    """Test seller management APIs - إدارة البائعين"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_sellers_with_status(self):
        """GET /api/admin/sellers/with-status - جلب البائعين مع حالاتهم"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sellers/with-status",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get sellers: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/admin/sellers/with-status - Found {len(data)} sellers")
        
        # Verify response structure if sellers exist
        if len(data) > 0:
            seller = data[0]
            assert "id" in seller, "Seller should have id"
            assert "name" in seller or "store_name" in seller, "Seller should have name or store_name"
            print(f"   First seller: {seller.get('name', seller.get('store_name', 'N/A'))}")
        return data
    
    def test_get_sellers_with_status_unauthorized(self):
        """Test unauthorized access to sellers list"""
        response = requests.get(f"{BASE_URL}/api/admin/sellers/with-status")
        assert response.status_code in [401, 403], "Should require authentication"
        print("✅ Unauthorized access correctly rejected")
    
    def test_suspend_seller_not_found(self):
        """POST /api/admin/sellers/{id}/suspend - Test with non-existent seller"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/sellers/{fake_id}/suspend",
            headers=self.headers,
            json={"reason": "Test suspension"}
        )
        assert response.status_code == 404, f"Expected 404 for non-existent seller: {response.text}"
        print("✅ Suspend non-existent seller returns 404")
    
    def test_activate_seller_not_found(self):
        """POST /api/admin/sellers/{id}/activate - Test with non-existent seller"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/sellers/{fake_id}/activate",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404 for non-existent seller: {response.text}"
        print("✅ Activate non-existent seller returns 404")
    
    def test_suspend_and_activate_seller_flow(self):
        """Test suspend and activate flow for existing seller"""
        # First get sellers list
        response = requests.get(
            f"{BASE_URL}/api/admin/sellers/with-status",
            headers=self.headers
        )
        assert response.status_code == 200
        sellers = response.json()
        
        if len(sellers) == 0:
            pytest.skip("No sellers available to test suspend/activate")
        
        # Find a seller that is not suspended
        test_seller = None
        for seller in sellers:
            if not seller.get("is_suspended", False):
                test_seller = seller
                break
        
        if not test_seller:
            # Use first seller even if suspended
            test_seller = sellers[0]
        
        seller_id = test_seller["id"]
        seller_name = test_seller.get("name", test_seller.get("store_name", "Unknown"))
        print(f"   Testing with seller: {seller_name} (ID: {seller_id})")
        
        # Test suspend
        suspend_response = requests.post(
            f"{BASE_URL}/api/admin/sellers/{seller_id}/suspend",
            headers=self.headers,
            json={"reason": "اختبار الإيقاف - Test suspension"}
        )
        assert suspend_response.status_code == 200, f"Suspend failed: {suspend_response.text}"
        print(f"✅ Seller suspended successfully")
        
        # Verify suspension
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/sellers/with-status",
            headers=self.headers
        )
        sellers_after_suspend = verify_response.json()
        suspended_seller = next((s for s in sellers_after_suspend if s["id"] == seller_id), None)
        assert suspended_seller is not None, "Seller not found after suspension"
        assert suspended_seller.get("is_suspended") == True, "Seller should be suspended"
        print(f"✅ Verified seller is suspended")
        
        # Test activate
        activate_response = requests.post(
            f"{BASE_URL}/api/admin/sellers/{seller_id}/activate",
            headers=self.headers
        )
        assert activate_response.status_code == 200, f"Activate failed: {activate_response.text}"
        print(f"✅ Seller activated successfully")
        
        # Verify activation
        verify_response2 = requests.get(
            f"{BASE_URL}/api/admin/sellers/with-status",
            headers=self.headers
        )
        sellers_after_activate = verify_response2.json()
        activated_seller = next((s for s in sellers_after_activate if s["id"] == seller_id), None)
        assert activated_seller is not None, "Seller not found after activation"
        assert activated_seller.get("is_suspended") == False, "Seller should be active"
        print(f"✅ Verified seller is active")


class TestFoodStoreManagement:
    """Test food store management APIs - إدارة متاجر الطعام"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_food_stores_with_status(self):
        """GET /api/admin/food/stores/with-status - جلب متاجر الطعام مع حالاتها"""
        response = requests.get(
            f"{BASE_URL}/api/admin/food/stores/with-status",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get food stores: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/admin/food/stores/with-status - Found {len(data)} food stores")
        
        # Verify response structure if stores exist
        if len(data) > 0:
            store = data[0]
            assert "id" in store, "Store should have id"
            assert "name" in store, "Store should have name"
            print(f"   First store: {store.get('name', 'N/A')}")
        return data
    
    def test_get_food_stores_with_status_unauthorized(self):
        """Test unauthorized access to food stores list"""
        response = requests.get(f"{BASE_URL}/api/admin/food/stores/with-status")
        assert response.status_code in [401, 403], "Should require authentication"
        print("✅ Unauthorized access correctly rejected")
    
    def test_suspend_food_store_not_found(self):
        """POST /api/admin/food/stores/{id}/suspend - Test with non-existent store"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/food/stores/{fake_id}/suspend",
            headers=self.headers,
            json={"reason": "Test suspension"}
        )
        assert response.status_code == 404, f"Expected 404 for non-existent store: {response.text}"
        print("✅ Suspend non-existent food store returns 404")
    
    def test_activate_food_store_not_found(self):
        """POST /api/admin/food/stores/{id}/activate - Test with non-existent store"""
        fake_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/food/stores/{fake_id}/activate",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404 for non-existent store: {response.text}"
        print("✅ Activate non-existent food store returns 404")
    
    def test_suspend_and_activate_food_store_flow(self):
        """Test suspend and activate flow for existing food store"""
        # First get food stores list
        response = requests.get(
            f"{BASE_URL}/api/admin/food/stores/with-status",
            headers=self.headers
        )
        assert response.status_code == 200
        stores = response.json()
        
        if len(stores) == 0:
            pytest.skip("No food stores available to test suspend/activate")
        
        # Find a store that is not suspended
        test_store = None
        for store in stores:
            if not store.get("is_suspended", False):
                test_store = store
                break
        
        if not test_store:
            # Use first store even if suspended
            test_store = stores[0]
        
        store_id = test_store["id"]
        store_name = test_store.get("name", "Unknown")
        print(f"   Testing with food store: {store_name} (ID: {store_id})")
        
        # Test suspend
        suspend_response = requests.post(
            f"{BASE_URL}/api/admin/food/stores/{store_id}/suspend",
            headers=self.headers,
            json={"reason": "اختبار الإيقاف - Test suspension"}
        )
        assert suspend_response.status_code == 200, f"Suspend failed: {suspend_response.text}"
        print(f"✅ Food store suspended successfully")
        
        # Verify suspension
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/food/stores/with-status",
            headers=self.headers
        )
        stores_after_suspend = verify_response.json()
        suspended_store = next((s for s in stores_after_suspend if s["id"] == store_id), None)
        assert suspended_store is not None, "Store not found after suspension"
        assert suspended_store.get("is_suspended") == True, "Store should be suspended"
        print(f"✅ Verified food store is suspended")
        
        # Test activate
        activate_response = requests.post(
            f"{BASE_URL}/api/admin/food/stores/{store_id}/activate",
            headers=self.headers
        )
        assert activate_response.status_code == 200, f"Activate failed: {activate_response.text}"
        print(f"✅ Food store activated successfully")
        
        # Verify activation
        verify_response2 = requests.get(
            f"{BASE_URL}/api/admin/food/stores/with-status",
            headers=self.headers
        )
        stores_after_activate = verify_response2.json()
        activated_store = next((s for s in stores_after_activate if s["id"] == store_id), None)
        assert activated_store is not None, "Store not found after activation"
        assert activated_store.get("is_suspended") == False, "Store should be active"
        print(f"✅ Verified food store is active")


class TestSelfAccountDeletion:
    """Test self account deletion API - حذف الحساب الذاتي
    
    Note: We only test the API structure and error handling.
    We do NOT actually delete any accounts to preserve test data.
    """
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_delete_account_unauthorized(self):
        """DELETE /api/user/account - Test without authentication"""
        response = requests.delete(f"{BASE_URL}/api/user/account")
        assert response.status_code in [401, 403], "Should require authentication"
        print("✅ DELETE /api/user/account - Unauthorized access correctly rejected")
    
    def test_delete_account_admin_not_allowed(self):
        """DELETE /api/user/account - Admin should not be able to delete their account via this endpoint"""
        response = requests.delete(
            f"{BASE_URL}/api/user/account",
            headers=self.headers
        )
        # Admin accounts should not be deletable via this endpoint
        # Expected: 400 error with message about account type
        assert response.status_code == 400, f"Admin should not be able to delete account: {response.text}"
        print("✅ Admin account deletion correctly rejected")


class TestAllSellersEndpoint:
    """Test the /api/admin/sellers/all endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_all_sellers(self):
        """GET /api/admin/sellers/all - جلب جميع البائعين"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sellers/all",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get all sellers: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/admin/sellers/all - Found {len(data)} sellers")


class TestAllFoodStoresEndpoint:
    """Test the /api/admin/food/stores endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_all_food_stores(self):
        """GET /api/admin/food/stores - جلب جميع متاجر الطعام"""
        response = requests.get(
            f"{BASE_URL}/api/admin/food/stores",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get all food stores: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/admin/food/stores - Found {len(data)} food stores")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
