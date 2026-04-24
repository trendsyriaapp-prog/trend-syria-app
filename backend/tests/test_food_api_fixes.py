# /app/backend/tests/test_food_api_fixes.py
# Tests for API 500 error fixes - Food and Notifications endpoints

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

class TestFoodProductsAPI:
    """Tests for /api/food/products endpoint"""
    
    def test_food_products_returns_200(self):
        """Test that /api/food/products returns 200 status code"""
        response = requests.get(f"{BASE_URL}/api/food/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/food/products returns 200")
    
    def test_food_products_returns_correct_format(self):
        """Test that /api/food/products returns {products: [], total: 0} format"""
        response = requests.get(f"{BASE_URL}/api/food/products")
        data = response.json()
        
        assert "products" in data, "Response should contain 'products' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["products"], list), "'products' should be a list"
        assert isinstance(data["total"], int), "'total' should be an integer"
        print(f"✅ /api/food/products returns correct format: products={len(data['products'])}, total={data['total']}")


class TestNotificationsUnreadAPI:
    """Tests for /api/notifications/unread endpoint"""
    
    def test_notifications_unread_without_auth_returns_401(self):
        """Test that /api/notifications/unread returns 401 without auth (not 500)"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/notifications/unread returns 401 without auth (not 500)")
    
    def test_notifications_unread_error_message(self):
        """Test that /api/notifications/unread returns proper error message"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread")
        data = response.json()
        
        assert "detail" in data, "Response should contain 'detail' key"
        print(f"✅ /api/notifications/unread error message: {data['detail']}")


class TestFoodMyItemsAPI:
    """Tests for /api/food/my-items endpoint"""
    
    def test_food_my_items_without_auth_returns_401(self):
        """Test that /api/food/my-items returns 401 without auth (not 500)"""
        response = requests.get(f"{BASE_URL}/api/food/my-items")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/food/my-items returns 401 without auth (not 500)")
    
    def test_food_my_items_error_message(self):
        """Test that /api/food/my-items returns proper error message"""
        response = requests.get(f"{BASE_URL}/api/food/my-items")
        data = response.json()
        
        assert "detail" in data, "Response should contain 'detail' key"
        print(f"✅ /api/food/my-items error message: {data['detail']}")


class TestFoodCategoriesAPI:
    """Tests for /api/categories/food endpoint"""
    
    def test_food_categories_returns_200(self):
        """Test that /api/categories/food returns 200 status code"""
        response = requests.get(f"{BASE_URL}/api/categories/food")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/categories/food returns 200")
    
    def test_food_categories_returns_list(self):
        """Test that /api/categories/food returns a list"""
        response = requests.get(f"{BASE_URL}/api/categories/food")
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ /api/categories/food returns list with {len(data)} categories")
    
    def test_food_categories_have_required_fields(self):
        """Test that food categories have required fields"""
        response = requests.get(f"{BASE_URL}/api/categories/food")
        data = response.json()
        
        if len(data) > 0:
            category = data[0]
            required_fields = ["id", "name", "icon", "type"]
            for field in required_fields:
                assert field in category, f"Category should have '{field}' field"
            print(f"✅ Food categories have required fields: {required_fields}")
        else:
            print("⚠️ No food categories found to validate fields")


class TestFoodStoresAPI:
    """Tests for /api/food/stores endpoint"""
    
    def test_food_stores_returns_200(self):
        """Test that /api/food/stores returns 200 status code"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✅ /api/food/stores returns 200")
    
    def test_food_stores_returns_list(self):
        """Test that /api/food/stores returns a list"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ /api/food/stores returns list with {len(data)} stores")


class TestFoodMyFlashRequestsAPI:
    """Tests for /api/food/my-flash-requests endpoint"""
    
    def test_food_my_flash_requests_without_auth_returns_401(self):
        """Test that /api/food/my-flash-requests returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/my-flash-requests")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/food/my-flash-requests returns 401 without auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
