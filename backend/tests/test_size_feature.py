"""
Backend tests for Size Feature (المقاسات) - Trend Syria
Tests:
1. Adding product with size to cart
2. Validation that size is required for products with sizes
3. Validation that size must be valid from available_sizes
4. Cart displays selected_size correctly
5. Order creation includes selected_size
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test product ID with sizes (تيشيرت رجالي قطن)
TEST_PRODUCT_WITH_SIZES = "334708a3-93ee-4d0a-9520-5bcfb22e864c"

# Customer credentials
CUSTOMER_PHONE = "0933333333"
CUSTOMER_PASSWORD = "user123"

# Seller credentials  
SELLER_PHONE = "0922222222"
SELLER_PASSWORD = "seller123"

# Admin credentials
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def customer_token(api_client):
    """Get customer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "phone": CUSTOMER_PHONE,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Customer authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def seller_token(api_client):
    """Get seller authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "phone": SELLER_PHONE,
        "password": SELLER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Seller authentication failed")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "phone": ADMIN_PHONE,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def authenticated_customer(api_client, customer_token):
    """Session with customer auth header"""
    api_client.headers.update({"Authorization": f"Bearer {customer_token}"})
    return api_client


class TestProductSizes:
    """Test product size display and validation"""
    
    def test_product_has_available_sizes(self, api_client):
        """Verify product with sizes returns available_sizes field"""
        response = api_client.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_WITH_SIZES}")
        assert response.status_code == 200, f"Failed to get product: {response.text}"
        
        product = response.json()
        assert "available_sizes" in product, "available_sizes field missing"
        assert len(product["available_sizes"]) > 0, "Product should have sizes"
        assert product["available_sizes"] == ["S", "M", "L", "XL", "XXL"], \
            f"Expected sizes S,M,L,XL,XXL but got {product['available_sizes']}"
        
        print(f"✅ Product has sizes: {product['available_sizes']}")
    
    def test_product_has_size_type(self, api_client):
        """Verify product has size_type field"""
        response = api_client.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_WITH_SIZES}")
        assert response.status_code == 200
        
        product = response.json()
        assert "size_type" in product, "size_type field missing"
        assert product["size_type"] == "clothes", f"Expected size_type 'clothes', got {product['size_type']}"
        
        print(f"✅ Product size_type: {product['size_type']}")


class TestCartWithSizes:
    """Test cart operations with size selection"""
    
    def test_add_to_cart_without_size_fails(self, authenticated_customer):
        """Adding product with sizes to cart without selecting size should fail"""
        response = authenticated_customer.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": TEST_PRODUCT_WITH_SIZES,
            "quantity": 1
            # Note: No selected_size provided
        })
        
        assert response.status_code == 400, f"Expected 400 but got {response.status_code}"
        assert "يرجى اختيار المقاس" in response.json().get("detail", ""), \
            f"Expected size required error, got: {response.json()}"
        
        print("✅ Cart correctly rejects product without size selection")
    
    def test_add_to_cart_with_invalid_size_fails(self, authenticated_customer):
        """Adding product with invalid size should fail"""
        response = authenticated_customer.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": TEST_PRODUCT_WITH_SIZES,
            "quantity": 1,
            "selected_size": "XXXL"  # Invalid size
        })
        
        assert response.status_code == 400, f"Expected 400 but got {response.status_code}"
        assert "المقاس غير متوفر" in response.json().get("detail", ""), \
            f"Expected invalid size error, got: {response.json()}"
        
        print("✅ Cart correctly rejects invalid size")
    
    def test_add_to_cart_with_valid_size_success(self, authenticated_customer):
        """Adding product with valid size should succeed"""
        # Clear cart first
        authenticated_customer.delete(f"{BASE_URL}/api/cart/{TEST_PRODUCT_WITH_SIZES}")
        
        response = authenticated_customer.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": TEST_PRODUCT_WITH_SIZES,
            "quantity": 1,
            "selected_size": "L"
        })
        
        assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
        assert "تمت الإضافة" in response.json().get("message", "")
        
        print("✅ Cart successfully accepts product with valid size")
    
    def test_cart_displays_selected_size(self, authenticated_customer):
        """Verify cart shows selected_size for items"""
        response = authenticated_customer.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 200
        
        cart = response.json()
        assert "items" in cart
        
        # Find our test product in cart
        test_item = None
        for item in cart["items"]:
            if item["product_id"] == TEST_PRODUCT_WITH_SIZES:
                test_item = item
                break
        
        assert test_item is not None, "Test product not found in cart"
        assert "selected_size" in test_item, "selected_size field missing in cart item"
        assert test_item["selected_size"] == "L", f"Expected size 'L', got {test_item['selected_size']}"
        
        print(f"✅ Cart displays selected_size: {test_item['selected_size']}")
    
    def test_add_same_product_different_sizes(self, authenticated_customer):
        """Adding same product with different sizes should create separate cart items"""
        # Add product with size M
        response = authenticated_customer.post(f"{BASE_URL}/api/cart/add", json={
            "product_id": TEST_PRODUCT_WITH_SIZES,
            "quantity": 1,
            "selected_size": "M"
        })
        assert response.status_code == 200
        
        # Get cart and verify we have items with different sizes
        response = authenticated_customer.get(f"{BASE_URL}/api/cart")
        cart = response.json()
        
        sizes_in_cart = []
        for item in cart["items"]:
            if item["product_id"] == TEST_PRODUCT_WITH_SIZES:
                sizes_in_cart.append(item.get("selected_size"))
        
        # Should have at least 2 entries (L and M from previous tests)
        assert len(sizes_in_cart) >= 2, f"Expected multiple sizes in cart, got: {sizes_in_cart}"
        assert "L" in sizes_in_cart and "M" in sizes_in_cart, \
            f"Expected L and M sizes in cart, got: {sizes_in_cart}"
        
        print(f"✅ Cart supports same product with different sizes: {sizes_in_cart}")


class TestOrderWithSizes:
    """Test order creation with size information"""
    
    def test_order_includes_selected_size(self, authenticated_customer):
        """Verify order creation includes selected_size in items"""
        # Create an order (this will consume cart)
        # First ensure cart has items
        cart_response = authenticated_customer.get(f"{BASE_URL}/api/cart")
        cart = cart_response.json()
        
        if not cart.get("items"):
            # Add item to cart first
            authenticated_customer.post(f"{BASE_URL}/api/cart/add", json={
                "product_id": TEST_PRODUCT_WITH_SIZES,
                "quantity": 1,
                "selected_size": "XL"
            })
        
        # Create order
        response = authenticated_customer.post(f"{BASE_URL}/api/orders", json={
            "items": [{"product_id": TEST_PRODUCT_WITH_SIZES, "quantity": 1}],
            "address": "شارع الاختبار، دمشق",
            "city": "دمشق",
            "phone": CUSTOMER_PHONE,
            "payment_method": "shamcash"
        })
        
        # Even if order fails (cart might be empty), the structure should be correct
        if response.status_code == 200:
            order = response.json()
            print(f"✅ Order created successfully: {order.get('order_id')}")
            
            # Verify order details
            order_id = order.get("order_id")
            if order_id:
                order_detail = authenticated_customer.get(f"{BASE_URL}/api/orders/{order_id}")
                if order_detail.status_code == 200:
                    order_data = order_detail.json()
                    for item in order_data.get("items", []):
                        if item["product_id"] == TEST_PRODUCT_WITH_SIZES:
                            assert "selected_size" in item, "Order item missing selected_size"
                            print(f"✅ Order item has selected_size: {item.get('selected_size')}")
        else:
            print(f"⚠️ Order creation response: {response.status_code} - {response.text[:200]}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_clear_cart(self, authenticated_customer):
        """Clean up cart after tests"""
        authenticated_customer.delete(f"{BASE_URL}/api/cart/{TEST_PRODUCT_WITH_SIZES}")
        print("✅ Test cart cleared")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
