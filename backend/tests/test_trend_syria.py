#!/usr/bin/env python3
"""
Trend Syria E-commerce Backend API Test Suite
Tests for: Authentication, Products, Reviews with Images, Orders, Payments
"""

import pytest
import requests
import os

# Get BASE_URL from environment variable
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data constants
TEST_BUYER_PHONE = "0933333333"
TEST_BUYER_PASSWORD = "user123"
TEST_SELLER_PHONE = "0922222222"
TEST_SELLER_PASSWORD = "seller123"
TEST_ADMIN_PHONE = "0911111111"
TEST_ADMIN_PASSWORD = "admin123"


class TestHealthAndCategories:
    """Health check and categories tests"""
    
    def test_api_root(self):
        """Test root endpoint returns OK"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print(f"✅ API Root accessible - Response: {response.json()}")
    
    def test_seed_data(self):
        """Test seed endpoint to ensure data exists"""
        response = requests.post(f"{BASE_URL}/api/seed")
        assert response.status_code == 200
        print(f"✅ Seed data endpoint OK - Response: {response.json()}")
    
    def test_get_categories(self):
        """Test categories endpoint returns list of categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify category structure
        assert "id" in data[0]
        assert "name" in data[0]
        print(f"✅ Categories: Found {len(data)} categories")


class TestAuthentication:
    """Authentication flow tests with phone-based login"""
    
    def test_buyer_login(self):
        """Test buyer login with phone number"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_BUYER_PHONE,
            "password": TEST_BUYER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "buyer"
        print(f"✅ Buyer login successful - User: {data['user'].get('name', data['user'].get('full_name'))}")
    
    def test_seller_login(self):
        """Test seller login with phone number"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_SELLER_PHONE,
            "password": TEST_SELLER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "seller"
        print(f"✅ Seller login successful - User: {data['user'].get('name', data['user'].get('full_name'))}")
    
    def test_admin_login(self):
        """Test admin login with phone number"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_ADMIN_PHONE,
            "password": TEST_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "admin"
        print(f"✅ Admin login successful - User: {data['user'].get('name', data['user'].get('full_name'))}")
    
    def test_invalid_login(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0999999999",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid login correctly returns 401")
    
    def test_auth_me_with_token(self):
        """Test /auth/me returns user info with valid token"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_BUYER_PHONE,
            "password": TEST_BUYER_PASSWORD
        })
        token = login_response.json()["token"]
        
        # Test /auth/me
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "user_type" in data
        print("✅ Auth/me returns correct user info")
    
    def test_auth_me_without_token(self):
        """Test /auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✅ Auth/me without token correctly returns 401")


class TestProducts:
    """Product listing and detail tests"""
    
    def test_get_products(self):
        """Test products listing endpoint"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        assert "total" in data
        assert len(data["products"]) > 0
        print(f"✅ Products: Found {len(data['products'])} products, total: {data['total']}")
    
    def test_get_featured_products(self):
        """Test featured products endpoint"""
        response = requests.get(f"{BASE_URL}/api/products/featured")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Featured products: Found {len(data)} products")
    
    def test_get_product_detail(self):
        """Test product detail with reviews"""
        # First get a product ID
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()["products"]
        assert len(products) > 0
        product_id = products[0]["id"]
        
        # Get product detail
        response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert "price" in data
        assert "description" in data
        assert "reviews" in data  # Reviews should be included
        print(f"✅ Product detail: {data['name']} - Price: {data['price']}, Reviews: {len(data.get('reviews', []))}")
    
    def test_get_nonexistent_product(self):
        """Test getting non-existent product returns 404"""
        response = requests.get(f"{BASE_URL}/api/products/nonexistent-id-12345")
        assert response.status_code == 404
        print("✅ Non-existent product correctly returns 404")
    
    def test_products_by_category(self):
        """Test filtering products by category"""
        response = requests.get(f"{BASE_URL}/api/products?category=electronics")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data
        print(f"✅ Electronics category: Found {len(data['products'])} products")


class TestCartAndOrders:
    """Cart operations and order flow tests"""
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_BUYER_PHONE,
            "password": TEST_BUYER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Buyer login failed")
        return response.json()["token"]
    
    @pytest.fixture
    def product_id(self):
        """Get a valid product ID"""
        response = requests.get(f"{BASE_URL}/api/products")
        if response.status_code != 200 or not response.json().get("products"):
            pytest.skip("No products available")
        return response.json()["products"][0]["id"]
    
    def test_add_to_cart(self, buyer_token, product_id):
        """Test adding item to cart"""
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 2},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 200
        print("✅ Added product to cart successfully")
    
    def test_get_cart(self, buyer_token):
        """Test getting cart contents"""
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        print(f"✅ Cart: {len(data['items'])} items, Total: {data['total']}")
    
    def test_create_order_with_shamcash(self, buyer_token, product_id):
        """Test creating order with ShamCash payment method"""
        # Add to cart first
        requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        # Create order
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{"product_id": product_id, "quantity": 1}],
                "address": "شارع التجارة، دمشق",
                "city": "دمشق",
                "phone": "0933333333",
                "payment_method": "shamcash",
                "payment_phone": "0933333333"
            },
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "order_id" in data
        assert "total" in data
        print(f"✅ Order created: ID={data['order_id'][:8]}..., Total: {data['total']}")
        return data["order_id"]
    
    def test_get_orders(self, buyer_token):
        """Test getting user orders"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} orders for buyer")


class TestPayments:
    """Payment flow tests (MOCKED - ShamCash, Syriatel Cash, MTN Cash)"""
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_BUYER_PHONE,
            "password": TEST_BUYER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Buyer login failed")
        return response.json()["token"]
    
    @pytest.fixture
    def order_with_shamcash(self, buyer_token):
        """Create an order for payment testing"""
        # Get a product
        products_response = requests.get(f"{BASE_URL}/api/products")
        product_id = products_response.json()["products"][0]["id"]
        
        # Add to cart
        requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        # Create order
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{"product_id": product_id, "quantity": 1}],
                "address": "عنوان الاختبار",
                "city": "دمشق",
                "phone": "0933333333",
                "payment_method": "shamcash",
                "payment_phone": "0933333333"
            },
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        return response.json()["order_id"]
    
    def test_init_shamcash_payment(self, buyer_token, order_with_shamcash):
        """Test initializing ShamCash payment (MOCKED)"""
        response = requests.post(
            f"{BASE_URL}/api/payment/shamcash/init?order_id={order_with_shamcash}",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "amount" in data
        print(f"✅ ShamCash payment initialized (MOCKED) - Amount: {data['amount']}")
    
    def test_verify_shamcash_payment(self, buyer_token, order_with_shamcash):
        """Test verifying ShamCash payment with 6-digit OTP (MOCKED)"""
        # First init
        requests.post(
            f"{BASE_URL}/api/payment/shamcash/init?order_id={order_with_shamcash}",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        # Verify with any 6-digit OTP
        response = requests.post(
            f"{BASE_URL}/api/payment/shamcash/verify",
            json={
                "order_id": order_with_shamcash,
                "phone": "0933333333",
                "otp": "123456"
            },
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success")
        print("✅ ShamCash payment verified (MOCKED) - Order status: paid")
    
    def test_verify_shamcash_invalid_otp(self, buyer_token, order_with_shamcash):
        """Test invalid OTP returns error"""
        response = requests.post(
            f"{BASE_URL}/api/payment/shamcash/verify",
            json={
                "order_id": order_with_shamcash,
                "phone": "0933333333",
                "otp": "12345"  # 5 digits - invalid
            },
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 400
        print("✅ Invalid OTP correctly returns 400")


class TestReviewsWithImages:
    """Review creation with image upload tests"""
    
    @pytest.fixture
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_BUYER_PHONE,
            "password": TEST_BUYER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Buyer login failed")
        return response.json()["token"]
    
    @pytest.fixture
    def paid_order_product_id(self, buyer_token):
        """Create a paid order and return the product ID"""
        # Get a product
        products_response = requests.get(f"{BASE_URL}/api/products")
        product_id = products_response.json()["products"][0]["id"]
        
        # Add to cart
        requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        # Create order
        order_response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{"product_id": product_id, "quantity": 1}],
                "address": "عنوان الاختبار للتقييم",
                "city": "حلب",
                "phone": "0933333333",
                "payment_method": "shamcash",
                "payment_phone": "0933333333"
            },
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        order_id = order_response.json()["order_id"]
        
        # Pay for the order
        requests.post(
            f"{BASE_URL}/api/payment/shamcash/init?order_id={order_id}",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        requests.post(
            f"{BASE_URL}/api/payment/shamcash/verify",
            json={"order_id": order_id, "phone": "0933333333", "otp": "123456"},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        return product_id
    
    def test_create_review_without_purchase(self, buyer_token):
        """Test creating review without purchase returns error"""
        # Use a unique product ID that buyer hasn't purchased
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json()["products"]
        # Find the last product (less likely to have been purchased)
        product_id = products[-1]["id"] if len(products) > 1 else products[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/reviews",
            json={
                "product_id": product_id,
                "rating": 5,
                "comment": "تقييم بدون شراء",
                "images": []
            },
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        # Should return 400 - must purchase first
        assert response.status_code == 400
        print("✅ Review without purchase correctly blocked")
    
    def test_create_review_with_images(self, buyer_token, paid_order_product_id):
        """Test creating review with Base64 images after purchase"""
        # Simple base64 encoded 1x1 red pixel PNG for testing
        test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        
        response = requests.post(
            f"{BASE_URL}/api/reviews",
            json={
                "product_id": paid_order_product_id,
                "rating": 5,
                "comment": "منتج ممتاز! أنصح به بشدة. التوصيل كان سريع جداً.",
                "images": [test_image, test_image]  # 2 images
            },
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        # Should succeed or return 400 if already reviewed
        if response.status_code == 200:
            print("✅ Review with images created successfully")
        elif response.status_code == 400 and "مسبقاً" in response.json().get("detail", ""):
            print("⚠️ Product already reviewed (expected if test ran before)")
        else:
            assert False, f"Unexpected response: {response.status_code} - {response.text}"
    
    def test_get_reviews_for_product(self):
        """Test getting reviews for a product"""
        # Get a product
        products_response = requests.get(f"{BASE_URL}/api/products")
        product_id = products_response.json()["products"][0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/reviews/{product_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Product reviews: Found {len(data)} reviews")
        
        # If reviews exist, check structure
        if len(data) > 0:
            review = data[0]
            assert "rating" in review
            assert "comment" in review
            assert "user_name" in review
            # Images should be included if present
            if "images" in review and review["images"]:
                print(f"   - Review has {len(review['images'])} image(s)")
    
    def test_product_detail_includes_reviews(self):
        """Test that product detail includes reviews"""
        products_response = requests.get(f"{BASE_URL}/api/products")
        product_id = products_response.json()["products"][0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert response.status_code == 200
        data = response.json()
        assert "reviews" in data
        print(f"✅ Product detail includes reviews array: {len(data['reviews'])} reviews")


class TestAdminFunctions:
    """Admin dashboard and functions tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_ADMIN_PHONE,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_get_admin_stats(self, admin_token):
        """Test admin statistics endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_products" in data
        assert "total_orders" in data
        print(f"✅ Admin stats: Users={data['total_users']}, Products={data['total_products']}, Orders={data['total_orders']}")
    
    def test_admin_stats_unauthorized(self, buyer_token=None):
        """Test admin stats without admin role returns 403"""
        # Login as buyer
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_BUYER_PHONE,
            "password": TEST_BUYER_PASSWORD
        })
        token = response.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        print("✅ Non-admin correctly blocked from admin stats")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
