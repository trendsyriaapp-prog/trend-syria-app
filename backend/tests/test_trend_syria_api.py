# /app/backend/tests/test_trend_syria_api.py
# اختبار API ترند سورية بعد إعادة الهيكلة
# Testing Trend Syria API after backend refactoring

import pytest
import requests
import os

# Base URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"phone": "0911111111", "password": "admin123"}
CUSTOMER_CREDS = {"phone": "0933333333", "password": "user123"}
SELLER_CREDS = {"phone": "0922222222", "password": "seller123"}


class TestRootAndCategories:
    """اختبار نقاط النهاية الأساسية - Root and Categories endpoints"""
    
    def test_root_endpoint(self):
        """Test / endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ Root endpoint: {data['message']}")
    
    def test_categories(self):
        """Test /categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✅ Categories: Found {len(data)} categories")


class TestAuth:
    """اختبار مسارات المصادقة - Authentication routes"""
    
    def test_login_admin_success(self):
        """Test /auth/login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "admin"
        print(f"✅ Admin login: {data['user']['name']}")
    
    def test_login_customer_success(self):
        """Test /auth/login with customer credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "buyer"
        print(f"✅ Customer login: {data['user']['name']}")
    
    def test_login_invalid_credentials(self):
        """Test /auth/login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0999999999",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("✅ Invalid login rejected with 401")
    
    def test_auth_me_with_token(self):
        """Test /auth/me with valid token"""
        # First login to get token
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        token = login_resp.json()["token"]
        
        # Then test /me endpoint
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "phone" in data
        print(f"✅ Auth me: {data['phone']}")
    
    def test_auth_me_without_token(self):
        """Test /auth/me without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✅ Auth me without token rejected with 401")
    
    def test_register_duplicate_phone(self):
        """Test /auth/register with existing phone"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test User",
            "phone": CUSTOMER_CREDS["phone"],  # Already exists
            "password": "test123",
            "city": "دمشق",
            "user_type": "buyer"
        })
        assert response.status_code == 400
        print("✅ Duplicate phone registration rejected with 400")


class TestProducts:
    """اختبار مسارات المنتجات - Products routes"""
    
    def test_get_products(self):
        """Test /products endpoint"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        print(f"✅ Products: Found {data['total']} products")
    
    def test_get_featured_products(self):
        """Test /products/featured endpoint"""
        response = requests.get(f"{BASE_URL}/api/products/featured")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Featured products: {len(data)} products")
    
    def test_get_product_by_id(self):
        """Test /products/{id} endpoint"""
        # First get list to get an ID
        list_resp = requests.get(f"{BASE_URL}/api/products")
        products = list_resp.json()["products"]
        
        if products:
            product_id = products[0]["id"]
            response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == product_id
            print(f"✅ Get product by ID: {data['name']}")
        else:
            pytest.skip("No products available")
    
    def test_get_product_not_found(self):
        """Test /products/{id} with invalid ID"""
        response = requests.get(f"{BASE_URL}/api/products/invalid-id-123")
        assert response.status_code == 404
        print("✅ Invalid product ID returns 404")
    
    def test_get_products_with_search(self):
        """Test /products with search parameter"""
        response = requests.get(f"{BASE_URL}/api/products?search=هاتف")
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Products search: Found {data['total']} products")
    
    def test_get_products_categories(self):
        """Test /products/categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/products/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Product categories: {len(data)} categories")


class TestCart:
    """اختبار مسارات السلة - Cart routes"""
    
    @pytest.fixture
    def auth_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        return response.json()["token"]
    
    def test_get_cart(self, auth_token):
        """Test /cart endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        print(f"✅ Get cart: {len(data['items'])} items, total: {data['total']}")
    
    def test_cart_without_auth(self):
        """Test /cart without authentication"""
        response = requests.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 401
        print("✅ Cart without auth rejected with 401")
    
    def test_add_to_cart_and_verify(self, auth_token):
        """Test /cart/add endpoint"""
        # Get a product first
        products_resp = requests.get(f"{BASE_URL}/api/products")
        products = products_resp.json()["products"]
        
        if products:
            product_id = products[0]["id"]
            
            # Clear cart first
            requests.delete(
                f"{BASE_URL}/api/cart",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            
            # Add to cart
            response = requests.post(
                f"{BASE_URL}/api/cart/add",
                json={"product_id": product_id, "quantity": 1},
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code == 200
            print("✅ Add to cart: Success")
            
            # Verify cart
            cart_resp = requests.get(
                f"{BASE_URL}/api/cart",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            cart_data = cart_resp.json()
            assert len(cart_data["items"]) > 0
            print(f"✅ Cart verification: {len(cart_data['items'])} items")
        else:
            pytest.skip("No products available")


class TestShipping:
    """اختبار مسارات الشحن - Shipping routes"""
    
    def test_get_cities(self):
        """Test /shipping/cities endpoint"""
        response = requests.get(f"{BASE_URL}/api/shipping/cities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert "دمشق" in data
        print(f"✅ Shipping cities: {len(data)} cities")
    
    def test_shipping_info(self):
        """Test /shipping/info endpoint"""
        response = requests.get(f"{BASE_URL}/api/shipping/info")
        assert response.status_code == 200
        data = response.json()
        assert "free_shipping_threshold" in data
        print(f"✅ Shipping info: Free threshold = {data['free_shipping_threshold']}")
    
    def test_calculate_shipping(self):
        """Test /shipping/calculate endpoint"""
        # Get a product first
        products_resp = requests.get(f"{BASE_URL}/api/products")
        products = products_resp.json()["products"]
        
        if products:
            product_id = products[0]["id"]
            response = requests.get(
                f"{BASE_URL}/api/shipping/calculate",
                params={"product_id": product_id, "customer_city": "دمشق", "order_total": 100000}
            )
            assert response.status_code == 200
            data = response.json()
            assert "shipping_cost" in data
            print(f"✅ Shipping calculate: Cost = {data['shipping_cost']}")
        else:
            pytest.skip("No products available")


class TestAdmin:
    """اختبار مسارات الإدارة - Admin routes"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        return response.json()["token"]
    
    def test_admin_stats(self, admin_token):
        """Test /admin/stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_products" in data
        assert "total_orders" in data
        print(f"✅ Admin stats: {data['total_users']} users, {data['total_products']} products, {data['total_orders']} orders")
    
    def test_admin_stats_unauthorized(self):
        """Test /admin/stats without admin role"""
        # Login as customer
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        token = login_resp.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        print("✅ Admin stats denied to non-admin with 403")
    
    def test_commission_rates(self, admin_token):
        """Test /admin/commissions/rates endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/commissions/rates",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "rates" in data
        assert "default_rate" in data
        print(f"✅ Commission rates: {len(data['rates'])} categories, default = {data['default_percentage']}")
    
    def test_pending_sellers(self, admin_token):
        """Test /admin/sellers/pending endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sellers/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Pending sellers: {len(data)} pending")
    
    def test_pending_products(self, admin_token):
        """Test /admin/products/pending endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/products/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Pending products: {len(data)} pending")


class TestNotifications:
    """اختبار مسارات الإشعارات - Notifications routes"""
    
    @pytest.fixture
    def auth_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        return response.json()["token"]
    
    def test_get_notifications(self, auth_token):
        """Test /notifications endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Notifications: {len(data)} notifications")
    
    def test_notifications_without_auth(self):
        """Test /notifications without authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401
        print("✅ Notifications without auth rejected with 401")


class TestStoresAndFavorites:
    """اختبار مسارات المتاجر والمفضلة - Stores and Favorites routes"""
    
    @pytest.fixture
    def auth_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        return response.json()["token"]
    
    def test_get_favorites(self, auth_token):
        """Test /favorites endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/favorites",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Favorites: {len(data)} items")
    
    def test_add_to_favorites(self, auth_token):
        """Test /favorites/{product_id} POST endpoint"""
        # Get a product first
        products_resp = requests.get(f"{BASE_URL}/api/products")
        products = products_resp.json()["products"]
        
        if products:
            product_id = products[0]["id"]
            
            # Remove from favorites first (if exists)
            requests.delete(
                f"{BASE_URL}/api/favorites/{product_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            
            # Add to favorites
            response = requests.post(
                f"{BASE_URL}/api/favorites/{product_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert response.status_code in [200, 400]  # 400 if already exists
            print("✅ Add to favorites: Success")
        else:
            pytest.skip("No products available")
    
    def test_get_store_page(self):
        """Test /stores/{seller_id} endpoint"""
        # Get seller ID from a product
        products_resp = requests.get(f"{BASE_URL}/api/products")
        products = products_resp.json()["products"]
        
        if products:
            seller_id = products[0]["seller_id"]
            response = requests.get(f"{BASE_URL}/api/stores/{seller_id}")
            assert response.status_code == 200
            data = response.json()
            assert "business_name" in data
            assert "products" in data
            print(f"✅ Store page: {data['business_name']}, {data['products_count']} products")
        else:
            pytest.skip("No products available")


class TestOrders:
    """اختبار مسارات الطلبات - Orders routes"""
    
    @pytest.fixture
    def auth_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        return response.json()["token"]
    
    def test_get_orders(self, auth_token):
        """Test /orders endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Orders: {len(data)} orders")
    
    def test_orders_without_auth(self):
        """Test /orders without authentication"""
        response = requests.get(f"{BASE_URL}/api/orders")
        assert response.status_code == 401
        print("✅ Orders without auth rejected with 401")
    
    def test_commission_calculation(self):
        """Test /commission/calculate endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/commission/calculate",
            params={"price": 100000, "category": "إلكترونيات"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "commission_amount" in data
        assert "seller_amount" in data
        print(f"✅ Commission calculate: {data['commission_percentage']} = {data['commission_amount']}")


class TestOtherRoutes:
    """اختبار مسارات أخرى - Other routes"""
    
    @pytest.fixture
    def auth_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        return response.json()["token"]
    
    def test_user_addresses(self, auth_token):
        """Test /user/addresses endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/user/addresses",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ User addresses: {len(data)} addresses")
    
    def test_user_payment_methods(self, auth_token):
        """Test /user/payment-methods endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/user/payment-methods",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ User payment methods: {len(data)} methods")
    
    def test_messages(self, auth_token):
        """Test /messages endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/messages",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Messages: {len(data)} conversations")
    
    def test_user_following(self, auth_token):
        """Test /user/following endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/user/following",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Following stores: {len(data)} stores")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
