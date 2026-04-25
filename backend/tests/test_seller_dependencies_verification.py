"""
Test Suite: Seller Dependencies Verification (Iteration 211)
============================================================
Testing the seller authorization dependencies added during backend restructuring:
- require_seller_user (auth.py) - for seller-only endpoints
- require_any_seller_user (auth.py, categories.py, image_templates.py) - for seller/food_seller endpoints
- require_admin_user (categories.py) - for admin-only endpoints

Endpoints tested:
- /api/auth/login
- /api/auth/me
- /api/categories
- /api/templates/list
- /api/auth/seller/store-settings (requires seller token)
- /api/templates/check-balance (requires seller token)
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
OTP_CODE = "123456"


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """Test successful admin login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Token missing from response"
        assert "user" in data, "User data missing from response"
        assert data["user"]["phone"] == ADMIN_PHONE
        assert data["user"]["user_type"] in ["admin", "sub_admin"]
        
        print(f"✅ Login successful - user_type: {data['user']['user_type']}")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "0999999999", "password": "wrongpassword"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid credentials correctly rejected with 401")
    
    def test_auth_me_with_token(self):
        """Test /api/auth/me endpoint with valid token"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Test /me endpoint
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "phone" in data
        assert "user_type" in data
        assert data["phone"] == ADMIN_PHONE
        
        print(f"✅ /api/auth/me working - user: {data.get('name', data.get('full_name', 'N/A'))}")
    
    def test_auth_me_without_token(self):
        """Test /api/auth/me endpoint without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/auth/me correctly requires authentication")


class TestPublicEndpoints:
    """Test public endpoints that don't require authentication"""
    
    def test_categories_public(self):
        """Test /api/categories is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/categories")
        
        assert response.status_code == 200, f"Categories failed: {response.text}"
        data = response.json()
        
        # Should return a list of categories
        assert isinstance(data, list), "Categories should return a list"
        
        if len(data) > 0:
            # Verify category structure
            cat = data[0]
            assert "id" in cat
            assert "name" in cat
            print(f"✅ /api/categories public - returned {len(data)} categories")
        else:
            print("✅ /api/categories public - returned empty list (no categories)")
    
    def test_templates_list_public(self):
        """Test /api/templates/list is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/templates/list")
        
        assert response.status_code == 200, f"Templates list failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "templates" in data, "Templates key missing"
        assert "ai_price" in data, "AI price missing"
        
        templates = data["templates"]
        assert isinstance(templates, list), "Templates should be a list"
        
        if len(templates) > 0:
            template = templates[0]
            assert "id" in template
            assert "name" in template
            assert "is_free" in template
        
        print(f"✅ /api/templates/list public - returned {len(templates)} templates, AI price: {data['ai_price']}")


class TestSellerDependencies:
    """Test seller authorization dependencies"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for testing"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_store_settings_requires_seller(self, admin_token):
        """Test /api/auth/seller/store-settings requires seller user"""
        # Admin should get 403 (not a seller)
        response = requests.get(
            f"{BASE_URL}/api/auth/seller/store-settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Admin is not a seller, should get 403
        assert response.status_code == 403, f"Expected 403 for admin, got {response.status_code}: {response.text}"
        print("✅ /api/auth/seller/store-settings correctly rejects admin (403 - للبائعين فقط)")
    
    def test_store_settings_requires_auth(self):
        """Test /api/auth/seller/store-settings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/seller/store-settings")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/auth/seller/store-settings correctly requires authentication")
    
    def test_check_balance_requires_seller(self, admin_token):
        """Test /api/templates/check-balance requires seller user"""
        # Admin should get 403 (not a seller)
        response = requests.get(
            f"{BASE_URL}/api/templates/check-balance",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Admin is not a seller, should get 403
        assert response.status_code == 403, f"Expected 403 for admin, got {response.status_code}: {response.text}"
        print("✅ /api/templates/check-balance correctly rejects admin (403 - للبائعين فقط)")
    
    def test_check_balance_requires_auth(self):
        """Test /api/templates/check-balance requires authentication"""
        response = requests.get(f"{BASE_URL}/api/templates/check-balance")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/templates/check-balance correctly requires authentication")


class TestAdminDependencies:
    """Test admin authorization dependencies in categories.py"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for testing"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_create_category_requires_admin(self, admin_token):
        """Test POST /api/categories requires admin"""
        # Admin should be able to create category
        response = requests.post(
            f"{BASE_URL}/api/categories",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_فئة_اختبار",
                "name_en": "TEST_Category",
                "icon": "Package",
                "type": "shopping"
            }
        )
        
        # Admin should succeed (200 or 201) or get 400 if category exists
        assert response.status_code in [200, 201, 400], f"Unexpected status: {response.status_code}: {response.text}"
        
        if response.status_code in [200, 201]:
            print("✅ POST /api/categories works for admin")
            # Clean up - delete the test category
            data = response.json()
            if "category" in data and "id" in data["category"]:
                cat_id = data["category"]["id"]
                requests.delete(
                    f"{BASE_URL}/api/categories/{cat_id}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
        else:
            print("✅ POST /api/categories - category already exists (expected)")
    
    def test_create_category_requires_auth(self):
        """Test POST /api/categories requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/categories",
            json={
                "name": "TEST_فئة",
                "name_en": "TEST",
                "icon": "Package",
                "type": "shopping"
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ POST /api/categories correctly requires authentication")
    
    def test_update_category_requires_admin(self, admin_token):
        """Test PUT /api/categories/{id} requires admin"""
        # Try to update a category
        response = requests.put(
            f"{BASE_URL}/api/categories/electronics",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"color": "#3B82F6"}  # Just update color
        )
        
        # Admin should succeed
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}: {response.text}"
        
        if response.status_code == 200:
            print("✅ PUT /api/categories/{id} works for admin")
        else:
            print("✅ PUT /api/categories/{id} - category not found (expected if not seeded)")
    
    def test_delete_category_requires_main_admin(self, admin_token):
        """Test DELETE /api/categories/{id} requires main admin"""
        # Try to delete a non-existent category
        response = requests.delete(
            f"{BASE_URL}/api/categories/nonexistent_test_category",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Should get 404 (not found) or 403 (not main admin) or 400 (has products)
        assert response.status_code in [403, 404, 400], f"Unexpected status: {response.status_code}: {response.text}"
        print(f"✅ DELETE /api/categories correctly handled - status: {response.status_code}")


class TestCategorySuggestions:
    """Test category suggestion endpoints (require_any_seller_user)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for testing"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_suggest_category_requires_seller(self, admin_token):
        """Test POST /api/categories/suggest requires seller"""
        # Admin should get 403 (not a seller)
        response = requests.post(
            f"{BASE_URL}/api/categories/suggest",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_اقتراح",
                "name_en": "TEST_Suggestion",
                "type": "shopping"
            }
        )
        
        # Admin is not a seller, should get 403
        assert response.status_code == 403, f"Expected 403 for admin, got {response.status_code}: {response.text}"
        print("✅ POST /api/categories/suggest correctly rejects admin (403 - للبائعين فقط)")
    
    def test_get_all_suggestions_requires_admin(self, admin_token):
        """Test GET /api/categories/suggestions/all requires admin"""
        response = requests.get(
            f"{BASE_URL}/api/categories/suggestions/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Admin should succeed
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✅ GET /api/categories/suggestions/all works for admin - {len(data)} suggestions")


class TestDatetimeHelper:
    """Verify datetime helper is being used correctly"""
    
    def test_categories_have_created_at(self):
        """Test that categories have created_at field (uses get_now helper)"""
        response = requests.get(f"{BASE_URL}/api/categories")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            cat = data[0]
            if "created_at" in cat:
                # Verify ISO format
                created_at = cat["created_at"]
                assert "T" in created_at, "created_at should be ISO format"
                print(f"✅ Categories use ISO datetime format: {created_at[:25]}...")
            else:
                print("⚠️ Categories don't have created_at field (may be default categories)")
        else:
            print("⚠️ No categories to verify datetime format")


class TestRegressionChecks:
    """Regression tests to ensure no breaking changes"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for testing"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_food_categories(self):
        """Test /api/categories/food endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories/food")
        
        assert response.status_code == 200, f"Food categories failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # All should be food type
        for cat in data:
            assert cat.get("type") == "food", f"Non-food category in food list: {cat}"
        
        print(f"✅ /api/categories/food - returned {len(data)} food categories")
    
    def test_shopping_categories(self):
        """Test /api/categories/shopping endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories/shopping")
        
        assert response.status_code == 200, f"Shopping categories failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # All should be shopping type
        for cat in data:
            assert cat.get("type") == "shopping", f"Non-shopping category in shopping list: {cat}"
        
        print(f"✅ /api/categories/shopping - returned {len(data)} shopping categories")
    
    def test_hierarchical_categories(self):
        """Test /api/categories/hierarchical endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories/hierarchical")
        
        assert response.status_code == 200, f"Hierarchical categories failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✅ /api/categories/hierarchical - returned {len(data)} parent categories")
    
    def test_templates_apply_free(self):
        """Test /api/templates/apply-free endpoint exists"""
        # Just check the endpoint exists (would need file upload to fully test)
        response = requests.post(f"{BASE_URL}/api/templates/apply-free")
        
        # Should get 422 (validation error - missing file) not 404
        assert response.status_code in [422, 400], f"Unexpected status: {response.status_code}"
        print("✅ /api/templates/apply-free endpoint exists")
    
    def test_seller_documents_endpoint(self, admin_token):
        """Test /api/seller/documents/status endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/seller/documents/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Admin should get response (may be not_submitted)
        assert response.status_code == 200, f"Unexpected status: {response.status_code}: {response.text}"
        data = response.json()
        assert "status" in data
        print(f"✅ /api/seller/documents/status - status: {data['status']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
