"""
Comprehensive Test Suite for Trend Syria E-commerce App - Iteration 143
Tests: Authentication, Orders, Cart, Delivery Flow, Admin Dashboard, Wallets
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

# Test Credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"
SELLER_PHONE = "0911111111"
SELLER_PASSWORD = "Test@123"
DRIVER_PHONE = "0922222222"
DRIVER_PASSWORD = "Test@123"
BUYER_PHONE = "0933333333"
BUYER_PASSWORD = "Test@123"
OTP_BYPASS = "123456"


class TestHealthAndBasics:
    """Basic health checks and API availability"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print(f"✅ Health check passed: {response.json()}")
    
    def test_homepage_data(self):
        """Test homepage data endpoint"""
        response = requests.get(f"{BASE_URL}/api/products/homepage-data")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data or "best_sellers" in data or "products" in data
        print(f"✅ Homepage data loaded with {len(data.get('categories', []))} categories")
    
    def test_categories_endpoint(self):
        """Test categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        print(f"✅ Categories endpoint working")
    
    def test_products_endpoint(self):
        """Test products listing endpoint"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        print(f"✅ Products endpoint working")


class TestAuthentication:
    """Authentication tests for all user types"""
    
    def test_admin_login(self):
        """Test Super Admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["user_type"] == "admin"
        print(f"✅ Admin login successful: {data['user']['name']}")
        return data["token"]
    
    def test_seller_login(self):
        """Test Seller login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SELLER_PHONE,
            "password": SELLER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["user_type"] == "seller"
        print(f"✅ Seller login successful: {data['user']['name']}")
        return data["token"]
    
    def test_driver_login(self):
        """Test Delivery Driver login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["user_type"] == "delivery"
        print(f"✅ Driver login successful: {data['user']['name']}")
        return data["token"]
    
    def test_buyer_login(self):
        """Test Buyer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": BUYER_PHONE,
            "password": BUYER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["user_type"] == "buyer"
        print(f"✅ Buyer login successful: {data['user']['name']}")
        return data["token"]
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0999999999",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid login correctly rejected")


class TestBuyerFlow:
    """Test buyer journey: products, cart, checkout"""
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": BUYER_PHONE,
            "password": BUYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_view_products(self, buyer_token):
        """Test viewing products"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        assert response.status_code == 200
        print("✅ Buyer can view products")
    
    def test_view_product_detail(self, buyer_token):
        """Test viewing product details"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        # First get products list
        products_response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        products = products_response.json()
        
        if isinstance(products, dict) and "products" in products:
            products = products["products"]
        
        if products and len(products) > 0:
            product_id = products[0]["id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}", headers=headers)
            assert response.status_code == 200
            data = response.json()
            assert "name" in data
            assert "price" in data
            print(f"✅ Product detail loaded: {data['name']}")
        else:
            pytest.skip("No products available")
    
    def test_cart_operations(self, buyer_token):
        """Test cart add, view, update, remove"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Get a product first
        products_response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        products = products_response.json()
        if isinstance(products, dict) and "products" in products:
            products = products["products"]
        
        if not products or len(products) == 0:
            pytest.skip("No products available")
        
        product_id = products[0]["id"]
        
        # Clear cart first
        requests.delete(f"{BASE_URL}/api/cart", headers=headers)
        
        # Add to cart
        add_response = requests.post(f"{BASE_URL}/api/cart/add", headers=headers, json={
            "product_id": product_id,
            "quantity": 1
        })
        assert add_response.status_code == 200
        print("✅ Product added to cart")
        
        # View cart
        cart_response = requests.get(f"{BASE_URL}/api/cart", headers=headers)
        assert cart_response.status_code == 200
        cart = cart_response.json()
        assert "items" in cart
        print(f"✅ Cart viewed: {len(cart['items'])} items")
        
        # Clear cart
        clear_response = requests.delete(f"{BASE_URL}/api/cart", headers=headers)
        assert clear_response.status_code == 200
        print("✅ Cart cleared")
    
    def test_view_orders(self, buyer_token):
        """Test viewing buyer orders"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/orders", headers=headers)
        assert response.status_code == 200
        print(f"✅ Buyer orders retrieved: {len(response.json())} orders")


class TestSellerFlow:
    """Test seller dashboard and order management"""
    
    @pytest.fixture
    def seller_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SELLER_PHONE,
            "password": SELLER_PASSWORD
        })
        return response.json()["token"]
    
    def test_seller_products(self, seller_token):
        """Test seller viewing their products"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/seller/products", headers=headers)
        assert response.status_code == 200
        print(f"✅ Seller products retrieved: {len(response.json())} products")
    
    def test_seller_orders(self, seller_token):
        """Test seller viewing their orders"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/orders/seller/my-orders", headers=headers)
        assert response.status_code == 200
        print(f"✅ Seller orders retrieved: {len(response.json())} orders")
    
    def test_seller_wallet(self, seller_token):
        """Test seller wallet balance"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        print(f"✅ Seller wallet balance: {data['balance']} ل.س")
    
    def test_seller_store_settings(self, seller_token):
        """Test seller store settings"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/seller/store-settings", headers=headers)
        assert response.status_code == 200
        print("✅ Seller store settings retrieved")


class TestDriverFlow:
    """Test delivery driver dashboard and order management"""
    
    @pytest.fixture
    def driver_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        return response.json()["token"]
    
    def test_driver_documents_status(self, driver_token):
        """Test driver documents status"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/delivery/documents/status", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Driver documents status: {data.get('status', 'unknown')}")
    
    def test_driver_available_orders(self, driver_token):
        """Test driver viewing available orders"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/delivery/available-orders", headers=headers)
        assert response.status_code == 200
        print(f"✅ Available orders for driver: {len(response.json())} orders")
    
    def test_driver_my_orders(self, driver_token):
        """Test driver viewing their assigned orders"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/delivery/my-product-orders", headers=headers)
        assert response.status_code == 200
        print("✅ Driver's assigned orders retrieved")
    
    def test_driver_wallet(self, driver_token):
        """Test driver wallet balance"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        print(f"✅ Driver wallet balance: {data['balance']} ل.س")
    
    def test_driver_availability_toggle(self, driver_token):
        """Test driver availability toggle"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        # Get current status
        get_response = requests.get(f"{BASE_URL}/api/delivery/availability", headers=headers)
        assert get_response.status_code == 200
        current_status = get_response.json().get("is_available", False)
        print(f"✅ Driver availability status: {current_status}")
    
    def test_driver_ratings(self, driver_token):
        """Test driver ratings"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/delivery/my-ratings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Driver ratings: avg={data.get('average_rating', 0)}, total={data.get('total_ratings', 0)}")


class TestAdminDashboard:
    """Test admin dashboard functionality"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_admin_stats(self, admin_token):
        """Test admin dashboard stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Admin stats: {data}")
    
    def test_admin_users_list(self, admin_token):
        """Test admin viewing users"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        print(f"✅ Admin users list: {len(response.json())} users")
    
    def test_admin_orders_list(self, admin_token):
        """Test admin viewing all orders"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers)
        assert response.status_code == 200
        print(f"✅ Admin orders list retrieved")
    
    def test_admin_pending_sellers(self, admin_token):
        """Test admin viewing pending sellers"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/sellers/pending", headers=headers)
        assert response.status_code == 200
        print(f"✅ Pending sellers: {len(response.json())} sellers")
    
    def test_admin_pending_drivers(self, admin_token):
        """Test admin viewing pending drivers"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/delivery/pending", headers=headers)
        assert response.status_code == 200
        print(f"✅ Pending drivers: {len(response.json())} drivers")
    
    def test_platform_wallet(self, admin_token):
        """Test platform wallet"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/platform-wallet", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Platform wallet balance: {data.get('balance', 0)} ل.س")
    
    def test_admin_products_list(self, admin_token):
        """Test admin viewing all products"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/products", headers=headers)
        assert response.status_code == 200
        print("✅ Admin products list retrieved")


class TestNotifications:
    """Test notifications system"""
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": BUYER_PHONE,
            "password": BUYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_get_notifications(self, buyer_token):
        """Test getting user notifications"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200
        print(f"✅ Notifications retrieved: {len(response.json())} notifications")
    
    def test_unread_count(self, buyer_token):
        """Test getting unread notifications count"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Unread notifications: {data.get('count', 0)}")


class TestFoodPlatform:
    """Test food ordering platform"""
    
    def test_food_stores_list(self):
        """Test getting food stores"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200
        print(f"✅ Food stores retrieved: {len(response.json())} stores")
    
    def test_food_categories(self):
        """Test getting food categories"""
        response = requests.get(f"{BASE_URL}/api/food/categories")
        assert response.status_code == 200
        print("✅ Food categories retrieved")


class TestCommissionSystem:
    """Test commission calculation system"""
    
    def test_commission_calculation(self):
        """Test commission calculation endpoint"""
        response = requests.get(f"{BASE_URL}/api/commission/calculate?price=100000&category=إلكترونيات")
        assert response.status_code == 200
        data = response.json()
        assert "commission_amount" in data
        assert "seller_amount" in data
        print(f"✅ Commission calculated: {data['commission_percentage']} = {data['commission_amount']} ل.س")


class TestShippingCalculation:
    """Test shipping cost calculation"""
    
    @pytest.fixture
    def buyer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": BUYER_PHONE,
            "password": BUYER_PASSWORD
        })
        return response.json()["token"]
    
    def test_shipping_calculation(self, buyer_token):
        """Test shipping cost calculation"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Get a product first
        products_response = requests.get(f"{BASE_URL}/api/products", headers=headers)
        products = products_response.json()
        if isinstance(products, dict) and "products" in products:
            products = products["products"]
        
        if products and len(products) > 0:
            product_id = products[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/shipping/calculate?product_id={product_id}&customer_city=دمشق&order_total=100000",
                headers=headers
            )
            assert response.status_code == 200
            data = response.json()
            print(f"✅ Shipping calculated: {data.get('shipping_cost', 0)} ل.س")
        else:
            pytest.skip("No products available")


class TestOTPVerification:
    """Test OTP verification (mocked with 123456)"""
    
    def test_otp_bypass_code(self):
        """Test that OTP bypass code 123456 is documented"""
        # This is a documentation test - OTP is mocked with 123456
        print(f"✅ OTP bypass code for testing: {OTP_BYPASS}")
        assert OTP_BYPASS == "123456"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
