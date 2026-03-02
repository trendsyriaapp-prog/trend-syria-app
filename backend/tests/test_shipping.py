"""
Test Shipping Cart API - تريند سورية
Tests for conditional free shipping feature:
1. Single seller + same city + total >= 150,000 = FREE
2. Single seller + same city + total < 150,000 = 15,000 + message
3. Single seller + different city = shipping charged (no free option)
4. Multiple sellers = shipping charged (no free option)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test products from the problem statement
TEST_PRODUCTS = [
    {"id": "3328c412-f7a7-45af-b3b7-d9022b5f79fb", "name": "قميص رجالي", "price": 85000, "city": "دمشق"},
    {"id": "760ef5b7-1a73-4f73-a6fc-1b4f92e783d3", "name": "فستان سهرة", "price": 250000, "city": "حلب"}
]

# Customer credentials
CUSTOMER_PHONE = "0933333333"
CUSTOMER_PASSWORD = "user123"

# Shipping costs
FREE_SHIPPING_THRESHOLD = 150000
NEARBY_SHIPPING_COST = 15000
FAR_SHIPPING_COST = 25000


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for customer"""
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": CUSTOMER_PHONE,
        "password": CUSTOMER_PASSWORD
    })
    if res.status_code == 200:
        return res.json().get("token")
    pytest.skip(f"Authentication failed: {res.text}")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def clean_cart(auth_headers):
    """Ensure cart is empty before each test"""
    # Get current cart
    cart_res = requests.get(f"{BASE_URL}/api/cart", headers=auth_headers)
    if cart_res.status_code == 200:
        cart = cart_res.json()
        for item in cart.get("items", []):
            requests.delete(f"{BASE_URL}/api/cart/{item['product_id']}", headers=auth_headers)
    yield
    # Cleanup after test
    cart_res = requests.get(f"{BASE_URL}/api/cart", headers=auth_headers)
    if cart_res.status_code == 200:
        cart = cart_res.json()
        for item in cart.get("items", []):
            requests.delete(f"{BASE_URL}/api/cart/{item['product_id']}", headers=auth_headers)


class TestShippingCartAPI:
    """Test /api/shipping/cart endpoint"""

    def test_shipping_info_endpoint(self):
        """Test shipping info endpoint returns correct thresholds"""
        res = requests.get(f"{BASE_URL}/api/shipping/info")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}"
        
        data = res.json()
        assert data["free_shipping_threshold"] == FREE_SHIPPING_THRESHOLD
        assert data["nearby_cost"] == NEARBY_SHIPPING_COST
        assert data["far_cost"] == FAR_SHIPPING_COST
        print(f"✅ Shipping info: threshold={data['free_shipping_threshold']}, nearby={data['nearby_cost']}, far={data['far_cost']}")

    def test_shipping_cities_endpoint(self):
        """Test cities endpoint returns Syrian cities"""
        res = requests.get(f"{BASE_URL}/api/shipping/cities")
        assert res.status_code == 200
        
        cities = res.json()
        assert "دمشق" in cities
        assert "حلب" in cities
        assert len(cities) >= 10
        print(f"✅ Cities endpoint returned {len(cities)} cities")

    def test_shipping_cart_empty_cart(self, auth_headers, clean_cart):
        """Test shipping calculation with empty cart"""
        res = requests.get(f"{BASE_URL}/api/shipping/cart?customer_city=دمشق", headers=auth_headers)
        assert res.status_code == 200
        
        data = res.json()
        assert data["shipping_cost"] == 0
        assert data["cart_total"] == 0
        print(f"✅ Empty cart: shipping={data['shipping_cost']}, message={data.get('message')}")

    def test_scenario1_free_shipping_same_city_high_total(self, auth_headers, clean_cart):
        """
        السيناريو 1: متجر واحد + نفس المحافظة + مبلغ >= 150,000 = شحن مجاني
        Add expensive product (250,000 from حلب) and check shipping to حلب
        """
        # Add product from حلب (250,000 ل.س)
        add_res = requests.post(f"{BASE_URL}/api/cart/add", 
            json={"product_id": TEST_PRODUCTS[1]["id"], "quantity": 1},
            headers=auth_headers
        )
        assert add_res.status_code == 200, f"Failed to add product: {add_res.text}"
        
        # Check shipping to same city (حلب)
        ship_res = requests.get(
            f"{BASE_URL}/api/shipping/cart?customer_city=حلب",
            headers=auth_headers
        )
        assert ship_res.status_code == 200
        
        data = ship_res.json()
        assert data["shipping_cost"] == 0, f"Expected free shipping, got {data['shipping_cost']}"
        assert data["qualifies_for_free"] == True
        assert data["shipping_type"] == "free_same_city"
        assert data["cart_total"] >= FREE_SHIPPING_THRESHOLD
        print(f"✅ Scenario 1 PASS: Free shipping! cart_total={data['cart_total']}, shipping={data['shipping_cost']}, message={data.get('message')}")

    def test_scenario2_same_city_below_threshold(self, auth_headers, clean_cart):
        """
        السيناريو 2: متجر واحد + نفس المحافظة + مبلغ < 150,000 = شحن 15,000 + رسالة
        Add cheaper product (85,000 from دمشق) and check shipping to دمشق
        """
        # Add product from دمشق (85,000 ل.س)
        add_res = requests.post(f"{BASE_URL}/api/cart/add", 
            json={"product_id": TEST_PRODUCTS[0]["id"], "quantity": 1},
            headers=auth_headers
        )
        assert add_res.status_code == 200, f"Failed to add product: {add_res.text}"
        
        # Check shipping to same city (دمشق)
        ship_res = requests.get(
            f"{BASE_URL}/api/shipping/cart?customer_city=دمشق",
            headers=auth_headers
        )
        assert ship_res.status_code == 200
        
        data = ship_res.json()
        assert data["shipping_cost"] == NEARBY_SHIPPING_COST, f"Expected {NEARBY_SHIPPING_COST}, got {data['shipping_cost']}"
        assert data["qualifies_for_free"] == False
        assert data["shipping_type"] == "same_city_below_threshold"
        assert "remaining_for_free" in data
        assert data["remaining_for_free"] > 0
        print(f"✅ Scenario 2 PASS: Shipping={data['shipping_cost']}, remaining_for_free={data['remaining_for_free']}, message={data.get('message')}")

    def test_scenario3_different_city_no_free_option(self, auth_headers, clean_cart):
        """
        السيناريو 3: متجر واحد + محافظة مختلفة = شحن يُحسب (لا يوجد خيار مجاني)
        Add product from دمشق and check shipping to حلب (far city)
        """
        # Add product from دمشق (85,000 ل.س)
        add_res = requests.post(f"{BASE_URL}/api/cart/add", 
            json={"product_id": TEST_PRODUCTS[0]["id"], "quantity": 1},
            headers=auth_headers
        )
        assert add_res.status_code == 200, f"Failed to add product: {add_res.text}"
        
        # Check shipping to different city (حلب - far from دمشق)
        ship_res = requests.get(
            f"{BASE_URL}/api/shipping/cart?customer_city=حلب",
            headers=auth_headers
        )
        assert ship_res.status_code == 200
        
        data = ship_res.json()
        assert data["shipping_cost"] > 0, f"Expected shipping cost, got {data['shipping_cost']}"
        assert data["qualifies_for_free"] == False
        assert data.get("no_free_option") == True
        print(f"✅ Scenario 3 PASS: Different city shipping={data['shipping_cost']}, no_free_option={data.get('no_free_option')}, message={data.get('message')}")

    def test_scenario3_nearby_city(self, auth_headers, clean_cart):
        """
        Test nearby city shipping cost
        Add product from دمشق and check shipping to ريف دمشق (nearby)
        """
        # Add product from دمشق
        add_res = requests.post(f"{BASE_URL}/api/cart/add", 
            json={"product_id": TEST_PRODUCTS[0]["id"], "quantity": 1},
            headers=auth_headers
        )
        assert add_res.status_code == 200
        
        # Check shipping to nearby city (ريف دمشق)
        ship_res = requests.get(
            f"{BASE_URL}/api/shipping/cart?customer_city=ريف دمشق",
            headers=auth_headers
        )
        assert ship_res.status_code == 200
        
        data = ship_res.json()
        assert data["shipping_cost"] == NEARBY_SHIPPING_COST, f"Expected {NEARBY_SHIPPING_COST}, got {data['shipping_cost']}"
        assert data["qualifies_for_free"] == False
        print(f"✅ Nearby city shipping={data['shipping_cost']}, message={data.get('message')}")


class TestSingleProductShippingAPI:
    """Test /api/shipping/calculate endpoint for single product"""

    def test_single_product_free_shipping(self):
        """Test single product shipping calculation - free shipping scenario"""
        res = requests.get(
            f"{BASE_URL}/api/shipping/calculate",
            params={
                "product_id": TEST_PRODUCTS[1]["id"],  # Product from حلب
                "customer_city": "حلب",
                "order_total": 200000  # Above threshold
            }
        )
        assert res.status_code == 200
        
        data = res.json()
        assert data["shipping_cost"] == 0
        assert data["qualifies_for_free"] == True
        print(f"✅ Single product free shipping: {data.get('message')}")

    def test_single_product_below_threshold(self):
        """Test single product shipping - below threshold"""
        res = requests.get(
            f"{BASE_URL}/api/shipping/calculate",
            params={
                "product_id": TEST_PRODUCTS[0]["id"],  # Product from دمشق (85,000)
                "customer_city": "دمشق",
                "order_total": 85000  # Below threshold
            }
        )
        assert res.status_code == 200
        
        data = res.json()
        assert data["shipping_cost"] == NEARBY_SHIPPING_COST
        assert data["qualifies_for_free"] == False
        assert "remaining_for_free" in data
        print(f"✅ Single product below threshold: shipping={data['shipping_cost']}, remaining={data['remaining_for_free']}")


class TestCartIntegration:
    """Integration tests for cart + shipping"""

    def test_add_to_cart_and_verify(self, auth_headers, clean_cart):
        """Test adding product to cart and verifying cart contents"""
        # Add product
        add_res = requests.post(f"{BASE_URL}/api/cart/add", 
            json={"product_id": TEST_PRODUCTS[0]["id"], "quantity": 2},
            headers=auth_headers
        )
        assert add_res.status_code == 200
        
        # Get cart
        cart_res = requests.get(f"{BASE_URL}/api/cart", headers=auth_headers)
        assert cart_res.status_code == 200
        
        cart = cart_res.json()
        assert len(cart["items"]) == 1
        assert cart["items"][0]["quantity"] == 2
        assert cart["total"] == TEST_PRODUCTS[0]["price"] * 2
        print(f"✅ Cart integration: {len(cart['items'])} items, total={cart['total']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
