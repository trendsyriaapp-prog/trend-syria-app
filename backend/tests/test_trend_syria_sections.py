"""
Test Suite for Trend Syria - New Sections and Features
Tests: Flash Products, Best Sellers, Newly Added, Sponsored, Global Free Shipping, Food Products
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')


class TestProductEndpoints:
    """Test product-related API endpoints"""
    
    def test_flash_products_endpoint(self):
        """Test /api/products/flash-products returns products with flash discount"""
        response = requests.get(f"{BASE_URL}/api/products/flash-products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "products" in data, "Response should have 'products' key"
        
        # If there are flash products, verify structure
        if data["products"]:
            product = data["products"][0]
            assert "id" in product, "Product should have 'id'"
            assert "name" in product, "Product should have 'name'"
            assert "price" in product, "Product should have 'price'"
            assert "flash_discount" in product, "Flash product should have 'flash_discount'"
            assert "flash_price" in product, "Flash product should have 'flash_price'"
            print(f"✅ Flash products: {len(data['products'])} products found")
        else:
            print("⚠️ No flash products currently active")
    
    def test_best_sellers_endpoint(self):
        """Test /api/products/best-sellers returns products sorted by sales"""
        response = requests.get(f"{BASE_URL}/api/products/best-sellers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if data:
            product = data[0]
            assert "id" in product, "Product should have 'id'"
            assert "name" in product, "Product should have 'name'"
            assert "sales_count" in product, "Best seller should have 'sales_count'"
            
            # Verify products are sorted by sales_count (descending)
            if len(data) > 1:
                assert data[0]["sales_count"] >= data[1]["sales_count"], "Products should be sorted by sales_count descending"
            print(f"✅ Best sellers: {len(data)} products, top sales_count: {data[0]['sales_count']}")
        else:
            print("⚠️ No best sellers found")
    
    def test_newly_added_endpoint(self):
        """Test /api/products/newly-added returns recently added products"""
        response = requests.get(f"{BASE_URL}/api/products/newly-added")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if data:
            product = data[0]
            assert "id" in product, "Product should have 'id'"
            assert "name" in product, "Product should have 'name'"
            assert "created_at" in product, "Newly added product should have 'created_at'"
            print(f"✅ Newly added: {len(data)} products")
        else:
            print("⚠️ No newly added products found")
    
    def test_sponsored_products_endpoint(self):
        """Test /api/products/sponsored returns sponsored/advertised products"""
        response = requests.get(f"{BASE_URL}/api/products/sponsored")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if data:
            product = data[0]
            assert "id" in product, "Product should have 'id'"
            assert "name" in product, "Product should have 'name'"
            print(f"✅ Sponsored products: {len(data)} products")
        else:
            print("⚠️ No sponsored products found")
    
    def test_products_list_endpoint(self):
        """Test /api/products returns paginated list"""
        response = requests.get(f"{BASE_URL}/api/products?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "products" in data, "Response should have 'products' key"
        assert "total" in data, "Response should have 'total' key"
        assert "page" in data, "Response should have 'page' key"
        assert "has_more" in data, "Response should have 'has_more' key"
        print(f"✅ Products list: {len(data['products'])} products, total: {data['total']}")


class TestSettingsEndpoints:
    """Test settings-related API endpoints"""
    
    def test_global_free_shipping_endpoint(self):
        """Test /api/settings/global-free-shipping returns promo status"""
        response = requests.get(f"{BASE_URL}/api/settings/global-free-shipping")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "is_active" in data, "Response should have 'is_active' key"
        assert "applies_to" in data, "Response should have 'applies_to' key"
        
        if data["is_active"]:
            assert "end_date" in data, "Active promo should have 'end_date'"
            print(f"✅ Global free shipping: ACTIVE, applies to: {data['applies_to']}")
        else:
            print("⚠️ Global free shipping: NOT ACTIVE")
    
    def test_public_settings_endpoint(self):
        """Test /api/settings/public returns public settings"""
        response = requests.get(f"{BASE_URL}/api/settings/public")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "free_shipping_threshold" in data, "Should have 'free_shipping_threshold'"
        print(f"✅ Public settings: free_shipping_threshold = {data['free_shipping_threshold']}")
    
    def test_product_badges_endpoint(self):
        """Test /api/settings/product-badges returns badge settings"""
        response = requests.get(f"{BASE_URL}/api/settings/product-badges")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "enabled" in data, "Response should have 'enabled' key"
        print(f"✅ Product badges: enabled = {data['enabled']}")


class TestFoodEndpoints:
    """Test food-related API endpoints"""
    
    def test_food_products_endpoint(self):
        """Test /api/food/products returns food products for a city"""
        response = requests.get(f"{BASE_URL}/api/food/products", params={"city": "دمشق", "limit": 10})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if data:
            product = data[0]
            assert "id" in product, "Product should have 'id'"
            assert "name" in product, "Product should have 'name'"
            assert "price" in product, "Product should have 'price'"
            assert "store_name" in product, "Food product should have 'store_name'"
            print(f"✅ Food products: {len(data)} products in دمشق")
        else:
            print("⚠️ No food products found in دمشق")
    
    def test_food_stores_endpoint(self):
        """Test /api/food/stores returns stores for a city"""
        response = requests.get(f"{BASE_URL}/api/food/stores", params={"city": "دمشق"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if data:
            store = data[0]
            assert "id" in store, "Store should have 'id'"
            assert "name" in store, "Store should have 'name'"
            print(f"✅ Food stores: {len(data)} stores in دمشق")
        else:
            print("⚠️ No food stores found in دمشق")
    
    def test_food_flash_sales_endpoint(self):
        """Test /api/food/flash-sales/active returns active flash sales"""
        response = requests.get(f"{BASE_URL}/api/food/flash-sales/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Food flash sales: {len(data)} active sales")


class TestCategoriesEndpoints:
    """Test categories-related API endpoints"""
    
    def test_categories_endpoint(self):
        """Test /api/categories returns all categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if data:
            category = data[0]
            assert "id" in category, "Category should have 'id'"
            assert "name" in category, "Category should have 'name'"
            
            # Check for both shopping and food categories
            shopping_cats = [c for c in data if c.get("type") == "shopping"]
            food_cats = [c for c in data if c.get("type") == "food"]
            print(f"✅ Categories: {len(data)} total ({len(shopping_cats)} shopping, {len(food_cats)} food)")
        else:
            print("⚠️ No categories found")
    
    def test_food_categories_endpoint(self):
        """Test /api/categories/food returns food categories"""
        response = requests.get(f"{BASE_URL}/api/categories/food")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Food categories: {len(data)} categories")


class TestFeaturedStoresEndpoints:
    """Test featured stores API endpoints"""
    
    def test_featured_stores_public_endpoint(self):
        """Test /api/settings/featured-stores/public returns featured stores"""
        response = requests.get(f"{BASE_URL}/api/settings/featured-stores/public")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "is_featured" in data, "Response should have 'is_featured' key"
        assert "stores" in data, "Response should have 'stores' key"
        print(f"✅ Featured stores: is_featured = {data['is_featured']}, {len(data['stores'])} stores")


class TestTickerMessages:
    """Test ticker messages API endpoints"""
    
    def test_ticker_messages_endpoint(self):
        """Test /api/settings/ticker-messages returns ticker messages"""
        response = requests.get(f"{BASE_URL}/api/settings/ticker-messages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "messages" in data, "Response should have 'messages' key"
        assert "is_enabled" in data, "Response should have 'is_enabled' key"
        print(f"✅ Ticker messages: {len(data['messages'])} messages, enabled = {data['is_enabled']}")


class TestAdsEndpoints:
    """Test ads-related API endpoints"""
    
    def test_active_ads_endpoint(self):
        """Test /api/ads/active returns active ads"""
        response = requests.get(f"{BASE_URL}/api/ads/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Active ads: {len(data)} ads")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
