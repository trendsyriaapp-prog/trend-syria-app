# /app/backend/tests/test_flash_promotions.py
# Tests for the new Flash ⚡ self-serve promotion system

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
ADMIN_CREDENTIALS = {"phone": "0912345678", "password": "admin123"}
PRODUCT_SELLER_CREDENTIALS = {"phone": "0922222222", "password": "seller123"}
FOOD_SELLER_CREDENTIALS = {"phone": "0966666666", "password": "food123"}
# Note: 0944444444 is actually a food_seller, using buyer account instead
CUSTOMER_CREDENTIALS = {"phone": "0933333333", "password": "buyer123"}


class TestFlashPromotionSystem:
    """Tests for the Flash ⚡ self-serve promotion system"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def product_seller_token(self):
        """Get product seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PRODUCT_SELLER_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Product seller login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def food_seller_token(self):
        """Get food seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FOOD_SELLER_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Food seller login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")
    
    # ============== Admin Promotion Settings Tests ==============
    
    def test_admin_get_promotion_settings(self, admin_token):
        """Test admin can get promotion settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/promotions/settings", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify settings structure
        assert "cost_per_product" in data, "Missing cost_per_product in settings"
        assert "duration_hours" in data, "Missing duration_hours in settings"
        assert isinstance(data["cost_per_product"], int), "cost_per_product should be int"
        assert isinstance(data["duration_hours"], int), "duration_hours should be int"
        print(f"✓ Admin promotion settings: cost={data['cost_per_product']}, duration={data['duration_hours']}h")
    
    def test_admin_update_promotion_settings(self, admin_token):
        """Test admin can update promotion settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update settings
        new_settings = {
            "cost_per_product": 1000,
            "duration_hours": 24,
            "max_products_per_day": 5,
            "enabled": True
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/promotions/settings",
            json=new_settings,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message in response"
        print(f"✓ Admin updated promotion settings successfully")
    
    def test_admin_get_all_promotions(self, admin_token):
        """Test admin can view all promotions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/promotions/all", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "active" in data, "Missing active promotions list"
        assert "expired" in data, "Missing expired promotions list"
        assert "stats" in data, "Missing stats"
        assert isinstance(data["active"], list), "active should be a list"
        assert isinstance(data["expired"], list), "expired should be a list"
        print(f"✓ Admin can view promotions: {len(data['active'])} active, {len(data['expired'])} expired")
    
    def test_non_admin_cannot_access_promotion_settings(self, product_seller_token):
        """Test non-admin cannot access admin promotion settings"""
        headers = {"Authorization": f"Bearer {product_seller_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/promotions/settings", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Non-admin correctly denied access to admin promotion settings")
    
    # ============== Seller Promotion Settings Tests ==============
    
    def test_seller_get_promotion_settings(self, product_seller_token):
        """Test seller can get promotion settings"""
        headers = {"Authorization": f"Bearer {product_seller_token}"}
        response = requests.get(f"{BASE_URL}/api/seller/promotion-settings", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify settings structure
        assert "cost_per_product" in data, "Missing cost_per_product"
        assert "duration_hours" in data, "Missing duration_hours"
        print(f"✓ Seller can view promotion settings: cost={data['cost_per_product']}, duration={data['duration_hours']}h")
    
    def test_food_seller_get_promotion_settings(self, food_seller_token):
        """Test food seller can get promotion settings"""
        headers = {"Authorization": f"Bearer {food_seller_token}"}
        response = requests.get(f"{BASE_URL}/api/seller/promotion-settings", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "cost_per_product" in data, "Missing cost_per_product"
        print(f"✓ Food seller can view promotion settings")
    
    # ============== Seller My Promotions Tests ==============
    
    def test_seller_get_my_promotions(self, product_seller_token):
        """Test seller can get their promotions"""
        headers = {"Authorization": f"Bearer {product_seller_token}"}
        response = requests.get(f"{BASE_URL}/api/seller/my-promotions", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "active" in data, "Missing active promotions"
        assert "expired" in data, "Missing expired promotions"
        assert isinstance(data["active"], list), "active should be a list"
        assert isinstance(data["expired"], list), "expired should be a list"
        print(f"✓ Seller can view their promotions: {len(data['active'])} active, {len(data['expired'])} expired")
    
    def test_food_seller_get_my_promotions(self, food_seller_token):
        """Test food seller can get their promotions"""
        headers = {"Authorization": f"Bearer {food_seller_token}"}
        response = requests.get(f"{BASE_URL}/api/seller/my-promotions", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "active" in data, "Missing active promotions"
        assert "expired" in data, "Missing expired promotions"
        print(f"✓ Food seller can view their promotions")
    
    # ============== Public Promoted Products Tests ==============
    
    def test_get_promoted_products_public(self):
        """Test public endpoint for promoted products"""
        response = requests.get(f"{BASE_URL}/api/promoted-products")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Public promoted products endpoint works: {len(data)} promoted products")
    
    def test_get_promoted_products_filter_by_type(self):
        """Test filtering promoted products by type"""
        # Test products filter
        response = requests.get(f"{BASE_URL}/api/promoted-products?product_type=products")
        assert response.status_code == 200, f"Expected 200 for products filter, got {response.status_code}"
        
        # Test food filter
        response = requests.get(f"{BASE_URL}/api/promoted-products?product_type=food")
        assert response.status_code == 200, f"Expected 200 for food filter, got {response.status_code}"
        
        print("✓ Promoted products filtering by type works")
    
    # ============== Seller Promote Product Tests ==============
    
    def test_seller_promote_product_requires_auth(self):
        """Test promote product endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/seller/promote-product",
            json={"product_id": "test123", "discount_percentage": 10}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Promote product endpoint requires authentication")
    
    def test_seller_promote_product_requires_product_id(self, product_seller_token):
        """Test promote product requires product_id"""
        headers = {"Authorization": f"Bearer {product_seller_token}"}
        response = requests.post(
            f"{BASE_URL}/api/seller/promote-product",
            json={"discount_percentage": 10},
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Promote product correctly requires product_id")
    
    def test_seller_promote_product_invalid_discount(self, product_seller_token):
        """Test promote product rejects invalid discount percentage"""
        headers = {"Authorization": f"Bearer {product_seller_token}"}
        
        # Test discount > 90%
        response = requests.post(
            f"{BASE_URL}/api/seller/promote-product",
            json={"product_id": "test123", "discount_percentage": 95},
            headers=headers
        )
        
        assert response.status_code == 400, f"Expected 400 for discount > 90%, got {response.status_code}"
        print("✓ Promote product correctly rejects invalid discount percentage")
    
    # ============== Customer Cannot Access Seller Endpoints ==============
    
    def test_customer_cannot_access_seller_promotions(self, customer_token):
        """Test customer cannot access seller promotion endpoints"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        # Note: promotion-settings endpoint allows any authenticated user to view settings
        # This is by design - customers can see the cost/duration info
        # But they cannot use my-promotions or promote-product
        
        # Try to get my promotions - should be denied for non-sellers
        response = requests.get(f"{BASE_URL}/api/seller/my-promotions", headers=headers)
        assert response.status_code == 403, f"Expected 403 for my-promotions, got {response.status_code}"
        
        # Try to promote a product - should be denied for non-sellers
        response = requests.post(
            f"{BASE_URL}/api/seller/promote-product",
            json={"product_id": "test123"},
            headers=headers
        )
        assert response.status_code == 403, f"Expected 403 for promote-product, got {response.status_code}"
        
        print("✓ Customer correctly denied access to seller promotion endpoints")


class TestSellerWalletAndPromotion:
    """Tests for seller wallet integration with promotions"""
    
    @pytest.fixture(scope="class")
    def product_seller_token(self):
        """Get product seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PRODUCT_SELLER_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Product seller login failed: {response.status_code}")
    
    def test_seller_wallet_balance(self, product_seller_token):
        """Test seller can check wallet balance"""
        headers = {"Authorization": f"Bearer {product_seller_token}"}
        response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Wallet should have balance field
        assert "balance" in data, "Missing balance in wallet response"
        print(f"✓ Seller wallet balance: {data.get('balance', 0)} SYP")
    
    def test_seller_products_list(self, product_seller_token):
        """Test seller can get their products list"""
        headers = {"Authorization": f"Bearer {product_seller_token}"}
        response = requests.get(f"{BASE_URL}/api/seller/products", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list of products"
        print(f"✓ Seller has {len(data)} products available")
        
        # Return first product ID for potential promotion test
        if data:
            return data[0].get("id")
        return None


class TestAuthenticationFlow:
    """Test authentication for all user types"""
    
    def test_admin_login(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        
        assert response.status_code == 200, f"Admin login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "Missing token in login response"
        assert "user" in data, "Missing user in login response"
        assert data["user"].get("user_type") == "admin", f"Expected admin user_type, got {data['user'].get('user_type')}"
        print(f"✓ Admin login successful: {data['user'].get('name', 'Admin')}")
    
    def test_product_seller_login(self):
        """Test product seller can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=PRODUCT_SELLER_CREDENTIALS)
        
        assert response.status_code == 200, f"Product seller login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "Missing token in login response"
        assert "user" in data, "Missing user in login response"
        user_type = data["user"].get("user_type")
        assert user_type in ["seller", "food_seller"], f"Expected seller user_type, got {user_type}"
        print(f"✓ Product seller login successful: {data['user'].get('name', 'Seller')}")
    
    def test_food_seller_login(self):
        """Test food seller can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=FOOD_SELLER_CREDENTIALS)
        
        assert response.status_code == 200, f"Food seller login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "Missing token in login response"
        print(f"✓ Food seller login successful: {data['user'].get('name', 'Food Seller')}")
    
    def test_customer_login(self):
        """Test customer can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDENTIALS)
        
        assert response.status_code == 200, f"Customer login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "Missing token in login response"
        print(f"✓ Customer login successful: {data['user'].get('name', 'Customer')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
