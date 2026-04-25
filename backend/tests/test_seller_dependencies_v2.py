"""
Test Suite: Seller Dependencies Verification (Iteration 211) - With Rate Limit Handling
========================================================================================
Testing the seller authorization dependencies with delays to avoid rate limiting.
"""

import pytest
import requests
import os
import time

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable is required")

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"

# Global token cache to avoid multiple logins
_cached_token = None

def get_admin_token():
    """Get admin token with caching to avoid rate limits"""
    global _cached_token
    if _cached_token:
        return _cached_token
    
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
    )
    
    if response.status_code == 200:
        _cached_token = response.json()["token"]
        return _cached_token
    elif response.status_code == 429:
        pytest.skip("Rate limited - skipping test")
    else:
        pytest.fail(f"Login failed: {response.status_code} - {response.text}")


class TestCoreAuthEndpoints:
    """Test core authentication endpoints"""
    
    def test_01_login_success(self):
        """Test successful admin login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["phone"] == ADMIN_PHONE
        
        global _cached_token
        _cached_token = data["token"]
        
        print(f"✅ Login successful - user_type: {data['user']['user_type']}")
        time.sleep(1)
    
    def test_02_auth_me_with_token(self):
        """Test /api/auth/me endpoint"""
        token = get_admin_token()
        
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "phone" in data
        assert "user_type" in data
        
        print(f"✅ /api/auth/me working - user: {data.get('name', 'N/A')}")
        time.sleep(1)
    
    def test_03_auth_me_without_token(self):
        """Test /api/auth/me requires auth"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 401
        print("✅ /api/auth/me correctly requires authentication")
        time.sleep(1)


class TestPublicEndpoints:
    """Test public endpoints"""
    
    def test_04_categories_public(self):
        """Test /api/categories is public"""
        response = requests.get(f"{BASE_URL}/api/categories")
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 200, f"Categories failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✅ /api/categories public - {len(data)} categories")
        time.sleep(1)
    
    def test_05_templates_list_public(self):
        """Test /api/templates/list is public"""
        response = requests.get(f"{BASE_URL}/api/templates/list")
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 200, f"Templates failed: {response.text}"
        data = response.json()
        
        assert "templates" in data
        assert "ai_price" in data
        
        print(f"✅ /api/templates/list public - {len(data['templates'])} templates")
        time.sleep(1)


class TestSellerDependencies:
    """Test seller authorization dependencies"""
    
    def test_06_store_settings_requires_seller(self):
        """Test /api/auth/seller/store-settings requires seller"""
        token = get_admin_token()
        
        response = requests.get(
            f"{BASE_URL}/api/auth/seller/store-settings",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        # Admin should get 403 (not a seller)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ /api/auth/seller/store-settings rejects admin (403)")
        time.sleep(1)
    
    def test_07_store_settings_requires_auth(self):
        """Test /api/auth/seller/store-settings requires auth"""
        response = requests.get(f"{BASE_URL}/api/auth/seller/store-settings")
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 401
        print("✅ /api/auth/seller/store-settings requires auth")
        time.sleep(1)
    
    def test_08_check_balance_requires_seller(self):
        """Test /api/templates/check-balance requires seller"""
        token = get_admin_token()
        
        response = requests.get(
            f"{BASE_URL}/api/templates/check-balance",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        # Admin should get 403 (not a seller)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ /api/templates/check-balance rejects admin (403)")
        time.sleep(1)
    
    def test_09_check_balance_requires_auth(self):
        """Test /api/templates/check-balance requires auth"""
        response = requests.get(f"{BASE_URL}/api/templates/check-balance")
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 401
        print("✅ /api/templates/check-balance requires auth")
        time.sleep(1)


class TestAdminDependencies:
    """Test admin authorization dependencies"""
    
    def test_10_create_category_requires_auth(self):
        """Test POST /api/categories requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/categories",
            json={"name": "TEST", "icon": "Package", "type": "shopping"}
        )
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 401
        print("✅ POST /api/categories requires auth")
        time.sleep(1)
    
    def test_11_create_category_admin_works(self):
        """Test POST /api/categories works for admin"""
        token = get_admin_token()
        
        response = requests.post(
            f"{BASE_URL}/api/categories",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "TEST_فئة_اختبار_211",
                "name_en": "TEST_Category_211",
                "icon": "Package",
                "type": "shopping"
            }
        )
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        # Should succeed or get 400 if exists
        assert response.status_code in [200, 201, 400], f"Unexpected: {response.status_code}"
        
        if response.status_code in [200, 201]:
            print("✅ POST /api/categories works for admin")
            # Cleanup
            data = response.json()
            if "category" in data and "id" in data["category"]:
                time.sleep(1)
                requests.delete(
                    f"{BASE_URL}/api/categories/{data['category']['id']}",
                    headers={"Authorization": f"Bearer {token}"}
                )
        else:
            print("✅ POST /api/categories - category exists (expected)")
        time.sleep(1)
    
    def test_12_get_all_suggestions_admin(self):
        """Test GET /api/categories/suggestions/all works for admin"""
        token = get_admin_token()
        
        response = requests.get(
            f"{BASE_URL}/api/categories/suggestions/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✅ GET /api/categories/suggestions/all works - {len(data)} suggestions")
        time.sleep(1)


class TestCategorySuggestions:
    """Test category suggestion endpoints"""
    
    def test_13_suggest_category_requires_seller(self):
        """Test POST /api/categories/suggest requires seller"""
        token = get_admin_token()
        
        response = requests.post(
            f"{BASE_URL}/api/categories/suggest",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "TEST", "type": "shopping"}
        )
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        # Admin should get 403
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ POST /api/categories/suggest rejects admin (403)")
        time.sleep(1)


class TestRegressionChecks:
    """Regression tests"""
    
    def test_14_food_categories(self):
        """Test /api/categories/food"""
        response = requests.get(f"{BASE_URL}/api/categories/food")
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        for cat in data:
            assert cat.get("type") == "food"
        
        print(f"✅ /api/categories/food - {len(data)} food categories")
        time.sleep(1)
    
    def test_15_shopping_categories(self):
        """Test /api/categories/shopping"""
        response = requests.get(f"{BASE_URL}/api/categories/shopping")
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        for cat in data:
            assert cat.get("type") == "shopping"
        
        print(f"✅ /api/categories/shopping - {len(data)} shopping categories")
        time.sleep(1)
    
    def test_16_seller_documents_status(self):
        """Test /api/seller/documents/status"""
        token = get_admin_token()
        
        response = requests.get(
            f"{BASE_URL}/api/seller/documents/status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 429:
            pytest.skip("Rate limited")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        
        print(f"✅ /api/seller/documents/status - status: {data['status']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
