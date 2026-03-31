"""
Test Suite for Unified Flash Promotion System
Tests the new unified Flash system with scheduled events:
- GET /api/flash/status - Flash status (live/upcoming) with countdown
- POST /api/seller/promote-product - Promote product to Flash
- GET /api/seller/my-promotions - Active, pending, expired promotions
- GET /api/promoted-products - Only products where starts_at <= now
- GET /api/admin/promotions/settings - Flash settings
- PUT /api/admin/promotions/settings - Update Flash settings
"""

import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0912345678"
ADMIN_PASSWORD = "admin123"
PRODUCT_SELLER_PHONE = "0922222222"
PRODUCT_SELLER_PASSWORD = "seller123"
FOOD_SELLER_PHONE = "0966666666"
FOOD_SELLER_PASSWORD = "food123"
CUSTOMER_PHONE = "0933333333"
CUSTOMER_PASSWORD = "buyer123"


class TestFlashStatusAPI:
    """Tests for GET /api/flash/status endpoint"""
    
    def test_flash_status_returns_valid_response(self):
        """Flash status should return status, timestamps, and countdown"""
        response = requests.get(f"{BASE_URL}/api/flash/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Response should contain 'status' field"
        assert data["status"] in ["live", "upcoming"], f"Status should be 'live' or 'upcoming', got {data['status']}"
        
        if data["status"] == "live":
            assert "ends_at" in data, "Live status should have 'ends_at'"
            assert "remaining_formatted" in data, "Live status should have 'remaining_formatted'"
        else:
            assert "starts_at" in data, "Upcoming status should have 'starts_at'"
            assert "until_start_formatted" in data, "Upcoming status should have 'until_start_formatted'"
        
        print(f"Flash status: {data['status']}")
        print(f"Response: {data}")
    
    def test_flash_status_has_message(self):
        """Flash status should include a user-friendly message"""
        response = requests.get(f"{BASE_URL}/api/flash/status")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data, "Response should contain 'message' field"
        print(f"Flash message: {data['message']}")


class TestSellerPromoteProduct:
    """Tests for POST /api/seller/promote-product endpoint"""
    
    @pytest.fixture
    def seller_token(self):
        """Get seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": PRODUCT_SELLER_PHONE,
            "password": PRODUCT_SELLER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Seller login failed")
    
    @pytest.fixture
    def seller_products(self, seller_token):
        """Get seller's products"""
        response = requests.get(
            f"{BASE_URL}/api/seller/products",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        if response.status_code == 200:
            return response.json()
        return []
    
    def test_promote_product_requires_auth(self):
        """Promote product should require authentication"""
        response = requests.post(f"{BASE_URL}/api/seller/promote-product", json={
            "product_id": "test-id",
            "discount_percentage": 10
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_promote_product_requires_product_id(self, seller_token):
        """Promote product should require product_id"""
        response = requests.post(
            f"{BASE_URL}/api/seller/promote-product",
            json={"discount_percentage": 10},
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_promote_product_validates_discount(self, seller_token, seller_products):
        """Discount percentage should be between 0 and 90"""
        if not seller_products:
            pytest.skip("No seller products available")
        
        product_id = seller_products[0]["id"]
        
        # Test invalid discount (>90%)
        response = requests.post(
            f"{BASE_URL}/api/seller/promote-product",
            json={"product_id": product_id, "discount_percentage": 95},
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 400, f"Expected 400 for discount >90%, got {response.status_code}"
    
    def test_promote_product_checks_wallet_balance(self, seller_token, seller_products):
        """Should check wallet balance before promoting"""
        if not seller_products:
            pytest.skip("No seller products available")
        
        # Get wallet balance
        wallet_response = requests.get(
            f"{BASE_URL}/api/wallet",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        if wallet_response.status_code == 200:
            balance = wallet_response.json().get("balance", 0)
            print(f"Seller wallet balance: {balance}")


class TestSellerMyPromotions:
    """Tests for GET /api/seller/my-promotions endpoint"""
    
    @pytest.fixture
    def seller_token(self):
        """Get seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": PRODUCT_SELLER_PHONE,
            "password": PRODUCT_SELLER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Seller login failed")
    
    def test_my_promotions_requires_auth(self):
        """My promotions should require authentication"""
        response = requests.get(f"{BASE_URL}/api/seller/my-promotions")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_my_promotions_returns_categorized_list(self, seller_token):
        """My promotions should return active, pending, and expired lists"""
        response = requests.get(
            f"{BASE_URL}/api/seller/my-promotions",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "active" in data, "Response should contain 'active' list"
        assert "pending" in data, "Response should contain 'pending' list"
        assert "expired" in data, "Response should contain 'expired' list"
        
        print(f"Active promotions: {len(data['active'])}")
        print(f"Pending promotions: {len(data['pending'])}")
        print(f"Expired promotions: {len(data['expired'])}")
    
    def test_my_promotions_has_total_active(self, seller_token):
        """My promotions should include total_active count"""
        response = requests.get(
            f"{BASE_URL}/api/seller/my-promotions",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_active" in data, "Response should contain 'total_active' count"


class TestPromotedProducts:
    """Tests for GET /api/promoted-products endpoint"""
    
    def test_promoted_products_is_public(self):
        """Promoted products should be publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/promoted-products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_promoted_products_returns_list(self):
        """Promoted products should return a list"""
        response = requests.get(f"{BASE_URL}/api/promoted-products")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Promoted products count: {len(data)}")
    
    def test_promoted_products_filter_by_type(self):
        """Promoted products should support filtering by type"""
        # Test products filter
        response = requests.get(f"{BASE_URL}/api/promoted-products?product_type=products")
        assert response.status_code == 200
        
        # Test food filter
        response = requests.get(f"{BASE_URL}/api/promoted-products?product_type=food")
        assert response.status_code == 200
    
    def test_promoted_products_only_shows_started(self):
        """Promoted products should only show products where starts_at <= now"""
        response = requests.get(f"{BASE_URL}/api/promoted-products")
        assert response.status_code == 200
        
        data = response.json()
        now = datetime.now(timezone.utc).isoformat()
        
        for product in data:
            if "starts_at" in product:
                assert product["starts_at"] <= now, f"Product {product.get('product_name')} has starts_at in future"
        
        print(f"All {len(data)} promoted products have valid start times")


class TestAdminPromotionSettings:
    """Tests for admin promotion settings endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def seller_token(self):
        """Get seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": PRODUCT_SELLER_PHONE,
            "password": PRODUCT_SELLER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Seller login failed")
    
    def test_get_settings_requires_admin(self, seller_token):
        """Get promotion settings should require admin role"""
        response = requests.get(
            f"{BASE_URL}/api/admin/promotions/settings",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
    
    def test_get_settings_returns_flash_config(self, admin_token):
        """Get settings should return flash_start_hour and flash_duration_hours"""
        response = requests.get(
            f"{BASE_URL}/api/admin/promotions/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "cost_per_product" in data, "Settings should contain 'cost_per_product'"
        assert "flash_start_hour" in data, "Settings should contain 'flash_start_hour'"
        assert "flash_duration_hours" in data, "Settings should contain 'flash_duration_hours'"
        
        # Validate flash_start_hour is 0-23
        assert 0 <= data["flash_start_hour"] <= 23, f"flash_start_hour should be 0-23, got {data['flash_start_hour']}"
        
        # Validate flash_duration_hours is reasonable
        assert data["flash_duration_hours"] in [6, 12, 24, 48, 72], f"flash_duration_hours should be 6/12/24/48/72, got {data['flash_duration_hours']}"
        
        print(f"Flash settings: start_hour={data['flash_start_hour']}, duration={data['flash_duration_hours']}h, cost={data['cost_per_product']}")
    
    def test_update_settings_requires_admin(self, seller_token):
        """Update promotion settings should require admin role"""
        response = requests.put(
            f"{BASE_URL}/api/admin/promotions/settings",
            json={"cost_per_product": 2000},
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
    
    def test_update_flash_start_hour(self, admin_token):
        """Admin should be able to update flash_start_hour"""
        # Get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/promotions/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_hour = get_response.json().get("flash_start_hour", 13)
        
        # Update to a different hour
        new_hour = 14 if original_hour != 14 else 15
        response = requests.put(
            f"{BASE_URL}/api/admin/promotions/settings",
            json={"flash_start_hour": new_hour},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/promotions/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_response.json()["flash_start_hour"] == new_hour
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/promotions/settings",
            json={"flash_start_hour": original_hour},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Successfully updated flash_start_hour from {original_hour} to {new_hour} and back")
    
    def test_update_flash_duration_hours(self, admin_token):
        """Admin should be able to update flash_duration_hours"""
        # Get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/promotions/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_duration = get_response.json().get("flash_duration_hours", 24)
        
        # Update to a different duration
        new_duration = 12 if original_duration != 12 else 48
        response = requests.put(
            f"{BASE_URL}/api/admin/promotions/settings",
            json={"flash_duration_hours": new_duration},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/promotions/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_response.json()["flash_duration_hours"] == new_duration
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/promotions/settings",
            json={"flash_duration_hours": original_duration},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"Successfully updated flash_duration_hours from {original_duration} to {new_duration} and back")


class TestSellerPromotionSettings:
    """Tests for seller-facing promotion settings"""
    
    @pytest.fixture
    def seller_token(self):
        """Get seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": PRODUCT_SELLER_PHONE,
            "password": PRODUCT_SELLER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Seller login failed")
    
    def test_seller_can_view_promotion_settings(self, seller_token):
        """Seller should be able to view promotion settings (cost, duration)"""
        response = requests.get(
            f"{BASE_URL}/api/seller/promotion-settings",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "cost_per_product" in data, "Settings should contain 'cost_per_product'"
        assert "duration_hours" in data, "Settings should contain 'duration_hours'"
        
        print(f"Seller sees: cost={data['cost_per_product']}, duration={data['duration_hours']}h")


class TestAdminAllPromotions:
    """Tests for GET /api/admin/promotions/all endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_get_all_promotions_requires_admin(self):
        """Get all promotions should require admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/promotions/all")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_get_all_promotions_returns_stats(self, admin_token):
        """Get all promotions should return active, expired lists and stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/promotions/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "active" in data, "Response should contain 'active' list"
        assert "expired" in data, "Response should contain 'expired' list"
        assert "stats" in data, "Response should contain 'stats'"
        
        stats = data["stats"]
        assert "active_count" in stats, "Stats should contain 'active_count'"
        assert "expired_count" in stats, "Stats should contain 'expired_count'"
        assert "total_revenue" in stats, "Stats should contain 'total_revenue'"
        
        print(f"Admin stats: active={stats['active_count']}, expired={stats['expired_count']}, revenue={stats['total_revenue']}")


class TestAuthenticationFlow:
    """Tests for authentication with test credentials"""
    
    def test_admin_login(self):
        """Admin should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Login response should contain token"
        assert "user" in data, "Login response should contain user"
        assert data["user"]["user_type"] == "admin", f"Expected admin, got {data['user']['user_type']}"
        print("Admin login successful")
    
    def test_product_seller_login(self):
        """Product seller should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": PRODUCT_SELLER_PHONE,
            "password": PRODUCT_SELLER_PASSWORD
        })
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Login response should contain token"
        assert data["user"]["user_type"] == "seller", f"Expected seller, got {data['user']['user_type']}"
        print("Product seller login successful")
    
    def test_food_seller_login(self):
        """Food seller should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": FOOD_SELLER_PHONE,
            "password": FOOD_SELLER_PASSWORD
        })
        assert response.status_code == 200, f"Food seller login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Login response should contain token"
        print("Food seller login successful")


class TestWalletIntegration:
    """Tests for wallet balance integration with promotions"""
    
    @pytest.fixture
    def seller_token(self):
        """Get seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": PRODUCT_SELLER_PHONE,
            "password": PRODUCT_SELLER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Seller login failed")
    
    def test_seller_wallet_balance(self, seller_token):
        """Seller should be able to check wallet balance"""
        response = requests.get(
            f"{BASE_URL}/api/wallet",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "balance" in data, "Wallet response should contain 'balance'"
        print(f"Seller wallet balance: {data['balance']} SYP")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
