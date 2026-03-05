# /app/backend/tests/test_ads_system.py
# Backend API tests for Trend Syria Ads System (نظام إعلانات البائعين)
# Tests: Ad Prices, Featured Products, Create Ad, My Ads, Admin Ads, Admin Stats

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

# Test credentials
ADMIN_CREDS = {"phone": "0911111111", "password": "admin123"}
SELLER_CREDS = {"phone": "0922222222", "password": "seller123"}
CUSTOMER_CREDS = {"phone": "0933333333", "password": "user123"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin login failed - skipping admin tests")


@pytest.fixture(scope="module")
def seller_token():
    """Get seller authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SELLER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Seller login failed - skipping seller tests")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Customer login failed - skipping customer tests")


class TestAdPricesAPI:
    """Test GET /api/ads/prices - Returns ad prices (public endpoint)"""
    
    def test_get_ad_prices_returns_200(self):
        """Ad prices endpoint should return 200 status code"""
        response = requests.get(f"{BASE_URL}/api/ads/prices")
        assert response.status_code == 200
        print("✅ GET /api/ads/prices returns 200")
    
    def test_get_ad_prices_contains_required_fields(self):
        """Ad prices should include featured_product, banner, and search_top prices"""
        response = requests.get(f"{BASE_URL}/api/ads/prices")
        data = response.json()
        
        # Check featured product prices
        assert "featured_product_day" in data
        assert "featured_product_week" in data
        assert "featured_product_month" in data
        
        # Check banner prices
        assert "banner_day" in data
        assert "banner_week" in data
        
        # Check search top prices
        assert "search_top_day" in data
        assert "search_top_week" in data
        
        print(f"✅ Ad prices contain all required fields: {list(data.keys())}")
    
    def test_ad_prices_are_positive_numbers(self):
        """All ad prices should be positive numbers"""
        response = requests.get(f"{BASE_URL}/api/ads/prices")
        data = response.json()
        
        for key, value in data.items():
            assert isinstance(value, (int, float)), f"{key} should be a number"
            assert value > 0, f"{key} should be positive"
        
        print("✅ All ad prices are positive numbers")


class TestFeaturedProductsAPI:
    """Test GET /api/ads/featured-products - Returns featured products (public endpoint)"""
    
    def test_get_featured_products_returns_200(self):
        """Featured products endpoint should return 200 status code"""
        response = requests.get(f"{BASE_URL}/api/ads/featured-products")
        assert response.status_code == 200
        print("✅ GET /api/ads/featured-products returns 200")
    
    def test_featured_products_is_list(self):
        """Featured products should return a list"""
        response = requests.get(f"{BASE_URL}/api/ads/featured-products")
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Featured products returns list with {len(data)} items")
    
    def test_featured_product_structure(self):
        """Featured products should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/ads/featured-products")
        data = response.json()
        
        if len(data) > 0:
            item = data[0]
            assert "ad_id" in item
            assert "product" in item
            assert "is_featured" in item
            
            product = item["product"]
            assert "id" in product
            assert "name" in product
            assert "price" in product
            assert "images" in product
            
            print(f"✅ Featured product structure is correct. Sample: {item['product']['name']}")
        else:
            print("⚠️ No featured products available (may be expected)")


class TestMyAdsAPI:
    """Test GET /api/ads/my-ads - Returns seller's ads (requires seller auth)"""
    
    def test_my_ads_returns_200_for_seller(self, seller_token):
        """Seller should be able to get their ads"""
        response = requests.get(
            f"{BASE_URL}/api/ads/my-ads",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200
        print("✅ GET /api/ads/my-ads returns 200 for seller")
    
    def test_my_ads_returns_403_for_customer(self, customer_token):
        """Customer should not be able to access seller ads endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/ads/my-ads",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403
        print("✅ GET /api/ads/my-ads returns 403 for customer (correctly restricted)")
    
    def test_my_ads_returns_401_without_auth(self):
        """Request without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/ads/my-ads")
        assert response.status_code == 401
        print("✅ GET /api/ads/my-ads returns 401 without authentication")
    
    def test_my_ads_is_list(self, seller_token):
        """Seller's ads should return a list"""
        response = requests.get(
            f"{BASE_URL}/api/ads/my-ads",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Seller has {len(data)} ad(s)")
    
    def test_my_ads_structure(self, seller_token):
        """Seller's ads should have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/ads/my-ads",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        data = response.json()
        
        if len(data) > 0:
            ad = data[0]
            required_fields = ["id", "product_id", "product_name", "ad_type", "duration", 
                             "cost", "status", "views", "clicks"]
            for field in required_fields:
                assert field in ad, f"Missing field: {field}"
            
            # Validate status is a valid value
            assert ad["status"] in ["pending", "active", "expired", "rejected"]
            
            print(f"✅ Ad structure is correct. Sample ad: {ad['product_name']} ({ad['status']})")
        else:
            print("⚠️ Seller has no ads yet")


class TestAdminAdsAPI:
    """Test GET /api/ads/admin/all - Returns all ads (requires admin auth)"""
    
    def test_admin_all_ads_returns_200_for_admin(self, admin_token):
        """Admin should be able to get all ads"""
        response = requests.get(
            f"{BASE_URL}/api/ads/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ GET /api/ads/admin/all returns 200 for admin")
    
    def test_admin_all_ads_returns_403_for_seller(self, seller_token):
        """Seller should not be able to access admin endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/ads/admin/all",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 403
        print("✅ GET /api/ads/admin/all returns 403 for seller (correctly restricted)")
    
    def test_admin_all_ads_returns_401_without_auth(self):
        """Request without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/ads/admin/all")
        assert response.status_code == 401
        print("✅ GET /api/ads/admin/all returns 401 without authentication")
    
    def test_admin_all_ads_filter_by_status(self, admin_token):
        """Admin should be able to filter ads by status"""
        response = requests.get(
            f"{BASE_URL}/api/ads/admin/all?status=active",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned ads should have active status
        for ad in data:
            assert ad["status"] == "active"
        
        print(f"✅ Admin filter by status works. Found {len(data)} active ads")
    
    def test_admin_ads_contains_seller_info(self, admin_token):
        """Admin ads should include seller information"""
        response = requests.get(
            f"{BASE_URL}/api/ads/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        if len(data) > 0:
            ad = data[0]
            assert "seller_id" in ad
            assert "seller_name" in ad
            print(f"✅ Admin ads include seller info: {ad['seller_name']}")
        else:
            print("⚠️ No ads available to verify seller info")


class TestAdminStatsAPI:
    """Test GET /api/ads/admin/stats - Returns ad statistics (requires admin auth)"""
    
    def test_admin_stats_returns_200_for_admin(self, admin_token):
        """Admin should be able to get ad statistics"""
        response = requests.get(
            f"{BASE_URL}/api/ads/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ GET /api/ads/admin/stats returns 200 for admin")
    
    def test_admin_stats_returns_403_for_seller(self, seller_token):
        """Seller should not be able to access admin stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/ads/admin/stats",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 403
        print("✅ GET /api/ads/admin/stats returns 403 for seller (correctly restricted)")
    
    def test_admin_stats_contains_required_fields(self, admin_token):
        """Admin stats should contain required statistical fields"""
        response = requests.get(
            f"{BASE_URL}/api/ads/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        
        required_fields = ["total_ads", "active_ads", "total_revenue", 
                          "total_views", "total_clicks"]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], (int, float)), f"{field} should be numeric"
        
        print(f"✅ Admin stats: total_ads={data['total_ads']}, active={data['active_ads']}, "
              f"revenue={data['total_revenue']}, views={data['total_views']}, clicks={data['total_clicks']}")


class TestCreateAdAPI:
    """Test POST /api/ads/create - Create new ad (requires seller auth)"""
    
    def test_create_ad_returns_403_for_customer(self, customer_token):
        """Customer should not be able to create ads"""
        response = requests.post(
            f"{BASE_URL}/api/ads/create",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"product_id": "test", "ad_type": "featured_product", "duration": "day"}
        )
        assert response.status_code == 403
        print("✅ POST /api/ads/create returns 403 for customer (correctly restricted)")
    
    def test_create_ad_returns_401_without_auth(self):
        """Request without auth should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/ads/create",
            json={"product_id": "test", "ad_type": "featured_product", "duration": "day"}
        )
        assert response.status_code == 401
        print("✅ POST /api/ads/create returns 401 without authentication")
    
    def test_create_ad_validates_product_exists(self, seller_token):
        """Create ad should return 404 for non-existent product"""
        response = requests.post(
            f"{BASE_URL}/api/ads/create",
            headers={"Authorization": f"Bearer {seller_token}"},
            json={"product_id": "non-existent-product", "ad_type": "featured_product", "duration": "day"}
        )
        assert response.status_code == 404
        print("✅ POST /api/ads/create returns 404 for non-existent product")


class TestAdClickAPI:
    """Test POST /api/ads/click/{ad_id} - Record ad click (public endpoint)"""
    
    def test_ad_click_returns_200(self):
        """Ad click endpoint should return 200"""
        # First get an active ad
        response = requests.get(f"{BASE_URL}/api/ads/featured-products")
        data = response.json()
        
        if len(data) > 0:
            ad_id = data[0]["ad_id"]
            click_response = requests.post(f"{BASE_URL}/api/ads/click/{ad_id}")
            assert click_response.status_code == 200
            print(f"✅ POST /api/ads/click/{ad_id} returns 200")
        else:
            pytest.skip("No active ads available to test click")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
