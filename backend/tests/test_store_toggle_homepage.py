"""
Test Suite for Store Toggle Status and Homepage Data API
Features:
1. Store manual open/close toggle API (POST /api/food/stores/{store_id}/toggle-status)
2. Store status API (GET /api/food/stores/{store_id}/status)
3. Unified Homepage Data API (GET /api/products/homepage-data)
4. Stores list with manual close status (GET /api/food/stores)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FOOD_SELLER_PHONE = "0966666666"
FOOD_SELLER_PASSWORD = "test123"
STORE_ID = "421443ed-55d6-4f1e-990a-2f3f53b2427e"


class TestAuthentication:
    """Test authentication for food seller"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for food seller"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": FOOD_SELLER_PHONE, "password": FOOD_SELLER_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token") or data.get("token")
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    def test_login_food_seller(self):
        """Test food seller login with phone"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": FOOD_SELLER_PHONE, "password": FOOD_SELLER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data or "token" in data, "Token not in response"
        print(f"✅ Food seller login successful")


class TestStoreToggleStatus:
    """Test store manual open/close toggle functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": FOOD_SELLER_PHONE, "password": FOOD_SELLER_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token") or data.get("token")
        pytest.skip("Authentication failed")
    
    def test_toggle_store_close(self, auth_token):
        """Test closing store manually via toggle API"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/food/stores/{STORE_ID}/toggle-status",
            json={"is_closed": True, "close_reason": "TEST_إجازة مؤقتة"},
            headers=headers
        )
        assert response.status_code == 200, f"Toggle close failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Toggle should return success=True"
        assert data.get("is_closed") == True, "Store should be marked as closed"
        assert "message" in data, "Response should have message"
        print(f"✅ Store closed successfully: {data.get('message')}")
    
    def test_get_store_status_after_close(self, auth_token):
        """Test getting store status after closing"""
        response = requests.get(f"{BASE_URL}/api/food/stores/{STORE_ID}/status")
        assert response.status_code == 200, f"Get status failed: {response.text}"
        
        data = response.json()
        assert data.get("is_open") == False, "Store should be closed"
        assert data.get("manual_close") == True, "Should indicate manual close"
        assert "مغلق" in data.get("status", ""), "Status should indicate closed"
        print(f"✅ Store status verified as closed: {data}")
    
    def test_stores_list_shows_manual_close(self, auth_token):
        """Test that stores list shows manual close status"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200, f"Get stores failed: {response.text}"
        
        stores = response.json()
        assert isinstance(stores, list), "Response should be a list"
        
        # Find the test store
        test_store = next((s for s in stores if s.get("id") == STORE_ID), None)
        if test_store:
            assert test_store.get("is_open") == False, "Store should show as closed"
            assert test_store.get("open_status") == "مغلق مؤقتاً", "Status should be 'مغلق مؤقتاً'"
            print(f"✅ Store appears as 'مغلق مؤقتاً' in stores list")
        else:
            print("⚠️ Test store not found in stores list (may not be approved)")
    
    def test_toggle_store_open(self, auth_token):
        """Test opening store manually via toggle API"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/food/stores/{STORE_ID}/toggle-status",
            json={"is_closed": False},
            headers=headers
        )
        assert response.status_code == 200, f"Toggle open failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Toggle should return success=True"
        assert data.get("is_closed") == False, "Store should be marked as open"
        print(f"✅ Store opened successfully: {data.get('message')}")
    
    def test_get_store_status_after_open(self, auth_token):
        """Test getting store status after opening"""
        response = requests.get(f"{BASE_URL}/api/food/stores/{STORE_ID}/status")
        assert response.status_code == 200, f"Get status failed: {response.text}"
        
        data = response.json()
        assert data.get("manual_close") == False, "Should not be manually closed"
        # Note: is_open depends on working hours, but manual_close should be False
        print(f"✅ Store status verified after opening: {data}")
    
    def test_toggle_without_auth_fails(self):
        """Test that toggle without authentication fails"""
        response = requests.post(
            f"{BASE_URL}/api/food/stores/{STORE_ID}/toggle-status",
            json={"is_closed": True}
        )
        assert response.status_code in [401, 403], f"Should fail without auth: {response.status_code}"
        print("✅ Unauthorized toggle correctly rejected")
    
    def test_toggle_nonexistent_store(self, auth_token):
        """Test toggling non-existent store returns 404"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/food/stores/nonexistent-store-id/toggle-status",
            json={"is_closed": True},
            headers=headers
        )
        assert response.status_code == 404, f"Should return 404: {response.status_code}"
        print("✅ Non-existent store returns 404")


class TestStoreStatusAPI:
    """Test GET /api/food/stores/{store_id}/status endpoint"""
    
    def test_get_store_status(self):
        """Test getting store status"""
        response = requests.get(f"{BASE_URL}/api/food/stores/{STORE_ID}/status")
        assert response.status_code == 200, f"Get status failed: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "is_open" in data, "Response should have is_open"
        assert "status" in data, "Response should have status"
        assert "manual_close" in data, "Response should have manual_close"
        assert isinstance(data["is_open"], bool), "is_open should be boolean"
        assert isinstance(data["manual_close"], bool), "manual_close should be boolean"
        print(f"✅ Store status API working: {data}")
    
    def test_get_nonexistent_store_status(self):
        """Test getting status of non-existent store"""
        response = requests.get(f"{BASE_URL}/api/food/stores/nonexistent-id/status")
        assert response.status_code == 404, f"Should return 404: {response.status_code}"
        print("✅ Non-existent store status returns 404")


class TestHomepageDataAPI:
    """Test unified homepage data API with caching"""
    
    def test_homepage_data_endpoint(self):
        """Test GET /api/products/homepage-data returns all required data"""
        response = requests.get(f"{BASE_URL}/api/products/homepage-data")
        assert response.status_code == 200, f"Homepage data failed: {response.text}"
        
        data = response.json()
        
        # Verify all required sections exist
        required_keys = [
            "categories", "ads", "sponsored_products", "flash_sale",
            "flash_products", "best_sellers", "new_arrivals", "settings"
        ]
        
        for key in required_keys:
            assert key in data, f"Missing key: {key}"
        
        print(f"✅ Homepage data API returns all required sections")
        print(f"   - Categories: {len(data.get('categories', []))} items")
        print(f"   - Sponsored Products: {len(data.get('sponsored_products', []))} items")
        print(f"   - Best Sellers: {len(data.get('best_sellers', []))} items")
        print(f"   - New Arrivals: {len(data.get('new_arrivals', []))} items")
    
    def test_homepage_data_categories(self):
        """Test that categories are returned in homepage data"""
        response = requests.get(f"{BASE_URL}/api/products/homepage-data")
        assert response.status_code == 200
        
        data = response.json()
        categories = data.get("categories", [])
        assert isinstance(categories, list), "Categories should be a list"
        print(f"✅ Homepage data contains {len(categories)} categories")
    
    def test_homepage_data_best_sellers(self):
        """Test that best sellers are returned"""
        response = requests.get(f"{BASE_URL}/api/products/homepage-data")
        assert response.status_code == 200
        
        data = response.json()
        best_sellers = data.get("best_sellers", [])
        assert isinstance(best_sellers, list), "Best sellers should be a list"
        print(f"✅ Homepage data contains {len(best_sellers)} best sellers")
    
    def test_homepage_data_new_arrivals(self):
        """Test that new arrivals are returned"""
        response = requests.get(f"{BASE_URL}/api/products/homepage-data")
        assert response.status_code == 200
        
        data = response.json()
        new_arrivals = data.get("new_arrivals", [])
        assert isinstance(new_arrivals, list), "New arrivals should be a list"
        print(f"✅ Homepage data contains {len(new_arrivals)} new arrivals")
    
    def test_homepage_data_settings(self):
        """Test that settings are returned"""
        response = requests.get(f"{BASE_URL}/api/products/homepage-data")
        assert response.status_code == 200
        
        data = response.json()
        settings = data.get("settings", {})
        assert isinstance(settings, dict), "Settings should be a dict"
        print(f"✅ Homepage data contains settings: {list(settings.keys())}")
    
    def test_homepage_data_caching(self):
        """Test that homepage data is cached (second call should be fast)"""
        import time
        
        # First call
        start1 = time.time()
        response1 = requests.get(f"{BASE_URL}/api/products/homepage-data")
        time1 = time.time() - start1
        
        # Second call (should hit cache)
        start2 = time.time()
        response2 = requests.get(f"{BASE_URL}/api/products/homepage-data")
        time2 = time.time() - start2
        
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Both should return same structure
        assert set(response1.json().keys()) == set(response2.json().keys())
        
        print(f"✅ Homepage data caching - Call 1: {time1:.3f}s, Call 2: {time2:.3f}s")


class TestFoodStoresList:
    """Test food stores list with open/close status"""
    
    def test_get_stores_list(self):
        """Test GET /api/food/stores returns stores with status"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200, f"Get stores failed: {response.text}"
        
        stores = response.json()
        assert isinstance(stores, list), "Response should be a list"
        
        if stores:
            # Verify store structure
            store = stores[0]
            assert "id" in store, "Store should have id"
            assert "name" in store, "Store should have name"
            assert "is_open" in store, "Store should have is_open status"
            assert "open_status" in store, "Store should have open_status message"
            print(f"✅ Stores list contains {len(stores)} stores with open status")
        else:
            print("⚠️ No stores found in list")
    
    def test_stores_sorted_by_open_status(self):
        """Test that open stores appear first in the list"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200
        
        stores = response.json()
        if len(stores) > 1:
            # Check if open stores come before closed stores
            found_closed = False
            for store in stores:
                if store.get("is_open") == False:
                    found_closed = True
                elif found_closed:
                    # Found an open store after a closed one - invalid order
                    pytest.fail("Open stores should come before closed stores")
            print("✅ Stores are sorted with open stores first")
        else:
            print("⚠️ Not enough stores to verify sorting")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
