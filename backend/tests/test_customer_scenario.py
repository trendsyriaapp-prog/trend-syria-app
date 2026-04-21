"""
Test Customer Scenario - Part 3 of 3
Tests the complete customer journey:
1. Customer registration (user_type=buyer)
2. Customer login
3. Add address with mandatory location
4. Browse products
5. Add product to cart
6. Create order
"""

import pytest
import requests
import os
import secrets
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

class TestCustomerScenario:
    """Complete customer journey test suite"""
    
    # Class-level variables to share state between tests
    customer_phone = None
    customer_password = "Customer@123Test"
    customer_token = None
    customer_id = None
    address_id = None
    product_id = None
    order_id = None
    
    @classmethod
    def generate_phone(cls):
        """Generate random Syrian phone number"""
        return f"09{''.join(secrets.choice(string.digits) for _ in range(8))}"
    
    # ============== REGISTRATION TESTS ==============
    
    def test_01_customer_registration_success(self):
        """Test customer registration with user_type=buyer"""
        TestCustomerScenario.customer_phone = self.generate_phone()
        
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "full_name": "TEST_عميل اختباري جديد",
                "phone": TestCustomerScenario.customer_phone,
                "password": TestCustomerScenario.customer_password,
                "city": "دمشق",
                "user_type": "buyer"  # Customer type
            }
        )
        
        print(f"Registration response status: {response.status_code}")
        print(f"Registration response: {response.json()}")
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        # Note: Response uses 'token' not 'access_token'
        assert "token" in data, "Missing 'token' in response"
        assert "user" in data, "Missing 'user' in response"
        assert data["user"]["user_type"] == "buyer", "User type should be 'buyer'"
        assert data["user"]["is_approved"], "Buyer should be auto-approved"
        
        TestCustomerScenario.customer_token = data["token"]
        TestCustomerScenario.customer_id = data["user"]["id"]
        
        print(f"✅ Customer registered successfully: {TestCustomerScenario.customer_phone}")
        print(f"   Customer ID: {TestCustomerScenario.customer_id}")
    
    def test_02_customer_registration_duplicate_phone(self):
        """Test that duplicate phone registration fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "full_name": "Test Duplicate",
                "phone": TestCustomerScenario.customer_phone,  # Same phone
                "password": "Test@12345",
                "city": "دمشق",
                "user_type": "buyer"
            }
        )
        
        assert response.status_code == 400, "Duplicate phone should fail"
        assert "مسجل مسبقاً" in response.json().get("detail", ""), "Should indicate phone already registered"
        print("✅ Duplicate phone registration correctly rejected")
    
    # ============== LOGIN TESTS ==============
    
    def test_03_customer_login_success(self):
        """Test customer login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone": TestCustomerScenario.customer_phone,
                "password": TestCustomerScenario.customer_password
            }
        )
        
        print(f"Login response status: {response.status_code}")
        print(f"Login response: {response.json()}")
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Missing 'token' in response"
        assert data["user"]["user_type"] == "buyer", "User type mismatch"
        assert data["user"]["is_approved"], "Customer should be approved"
        
        # Update token (might be refreshed)
        TestCustomerScenario.customer_token = data["token"]
        
        print("✅ Customer login successful")
    
    def test_04_customer_login_wrong_password(self):
        """Test login with wrong password fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone": TestCustomerScenario.customer_phone,
                "password": "WrongPassword@123"
            }
        )
        
        assert response.status_code == 401, "Wrong password should return 401"
        print("✅ Wrong password correctly rejected")
    
    def test_05_customer_get_me(self):
        """Test /auth/me endpoint returns customer data"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert response.status_code == 200, f"Get me failed: {response.text}"
        
        data = response.json()
        assert data["user_type"] == "buyer", "User type should be buyer"
        assert data["id"] == TestCustomerScenario.customer_id, "User ID mismatch"
        
        print("✅ Customer /auth/me endpoint working")
    
    # ============== ADDRESS TESTS ==============
    
    def test_06_add_address_with_location(self):
        """Test adding address with mandatory latitude/longitude"""
        response = requests.post(
            f"{BASE_URL}/api/user/addresses",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"},
            json={
                "title": "TEST_عنوان المنزل",
                "city": "دمشق",
                "area": "المزة",
                "street_number": "شارع 15",
                "building_number": "25",
                "apartment_number": "3",
                "phone": TestCustomerScenario.customer_phone,
                "is_default": True,
                "latitude": 33.5138,  # Damascus coordinates
                "longitude": 36.2765
            }
        )
        
        print(f"Add address response status: {response.status_code}")
        print(f"Add address response: {response.json()}")
        
        assert response.status_code == 200, f"Add address failed: {response.text}"
        
        data = response.json()
        assert "id" in data, "Missing address ID in response"
        
        TestCustomerScenario.address_id = data["id"]
        print(f"✅ Address added successfully: {TestCustomerScenario.address_id}")
    
    def test_07_get_addresses(self):
        """Test getting customer addresses"""
        response = requests.get(
            f"{BASE_URL}/api/user/addresses",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert response.status_code == 200, f"Get addresses failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Addresses should be a list"
        assert len(data) > 0, "Should have at least one address"
        
        # Verify the address we added
        added_address = next((a for a in data if a["id"] == TestCustomerScenario.address_id), None)
        assert added_address is not None, "Added address not found"
        assert added_address["latitude"] == 33.5138, "Latitude not persisted"
        assert added_address["longitude"] == 36.2765, "Longitude not persisted"
        assert added_address["is_default"], "Should be default address"
        
        print(f"✅ Addresses retrieved successfully: {len(data)} address(es)")
    
    def test_08_update_address(self):
        """Test updating an address"""
        response = requests.put(
            f"{BASE_URL}/api/user/addresses/{TestCustomerScenario.address_id}",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"},
            json={
                "title": "TEST_عنوان المنزل المحدث",
                "city": "دمشق",
                "area": "المالكي",  # Changed area
                "street_number": "شارع 20",
                "building_number": "30",
                "apartment_number": "5",
                "phone": TestCustomerScenario.customer_phone,
                "is_default": True,
                "latitude": 33.5200,  # Updated coordinates
                "longitude": 36.2800
            }
        )
        
        assert response.status_code == 200, f"Update address failed: {response.text}"
        print("✅ Address updated successfully")
    
    # ============== PRODUCTS TESTS ==============
    
    def test_09_browse_products(self):
        """Test browsing products"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        print(f"Browse products response status: {response.status_code}")
        
        assert response.status_code == 200, f"Browse products failed: {response.text}"
        
        data = response.json()
        assert "products" in data, "Missing 'products' in response"
        assert "total" in data, "Missing 'total' in response"
        
        if data["products"]:
            TestCustomerScenario.product_id = data["products"][0]["id"]
            print(f"✅ Products retrieved: {len(data['products'])} products, total: {data['total']}")
            print(f"   Selected product for cart: {TestCustomerScenario.product_id}")
        else:
            print("⚠️ No products available in the system")
    
    def test_10_browse_products_by_category(self):
        """Test browsing products by category"""
        response = requests.get(
            f"{BASE_URL}/api/products?category=إلكترونيات",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert response.status_code == 200, f"Browse by category failed: {response.text}"
        print("✅ Browse by category working")
    
    def test_11_get_product_categories(self):
        """Test getting product categories"""
        response = requests.get(
            f"{BASE_URL}/api/products/categories",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert response.status_code == 200, f"Get categories failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Categories should be a list"
        assert len(data) > 0, "Should have categories"
        
        print(f"✅ Categories retrieved: {len(data)} categories")
    
    def test_12_get_featured_products(self):
        """Test getting featured products"""
        response = requests.get(
            f"{BASE_URL}/api/products/featured",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert response.status_code == 200, f"Get featured failed: {response.text}"
        print("✅ Featured products endpoint working")
    
    # ============== CART TESTS ==============
    
    def test_13_get_empty_cart(self):
        """Test getting empty cart"""
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert response.status_code == 200, f"Get cart failed: {response.text}"
        
        data = response.json()
        assert "items" in data, "Missing 'items' in cart"
        assert "total" in data, "Missing 'total' in cart"
        assert data["total"] == 0, "Empty cart should have 0 total"
        
        print("✅ Empty cart retrieved successfully")
    
    def test_14_add_to_cart(self):
        """Test adding product to cart"""
        if not TestCustomerScenario.product_id:
            pytest.skip("No product available to add to cart")
        
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"},
            json={
                "product_id": TestCustomerScenario.product_id,
                "quantity": 2
            }
        )
        
        print(f"Add to cart response status: {response.status_code}")
        print(f"Add to cart response: {response.json()}")
        
        assert response.status_code == 200, f"Add to cart failed: {response.text}"
        print("✅ Product added to cart successfully")
    
    def test_15_get_cart_with_items(self):
        """Test getting cart with items"""
        if not TestCustomerScenario.product_id:
            pytest.skip("No product in cart to verify")
        
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert response.status_code == 200, f"Get cart failed: {response.text}"
        
        data = response.json()
        assert len(data["items"]) > 0, "Cart should have items"
        assert data["total"] > 0, "Cart total should be > 0"
        
        # Verify our product is in cart
        cart_item = next((i for i in data["items"] if i["product_id"] == TestCustomerScenario.product_id), None)
        assert cart_item is not None, "Added product not found in cart"
        assert cart_item["quantity"] == 2, "Quantity mismatch"
        
        print(f"✅ Cart has {len(data['items'])} item(s), total: {data['total']}")
    
    def test_16_update_cart_quantity(self):
        """Test updating cart item quantity"""
        if not TestCustomerScenario.product_id:
            pytest.skip("No product in cart to update")
        
        response = requests.put(
            f"{BASE_URL}/api/cart/update",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"},
            json={
                "product_id": TestCustomerScenario.product_id,
                "quantity": 3
            }
        )
        
        assert response.status_code == 200, f"Update cart failed: {response.text}"
        
        # Verify quantity updated
        cart_response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        cart_data = cart_response.json()
        cart_item = next((i for i in cart_data["items"] if i["product_id"] == TestCustomerScenario.product_id), None)
        assert cart_item["quantity"] == 3, "Quantity not updated"
        
        print("✅ Cart quantity updated successfully")
    
    # ============== ORDER TESTS ==============
    
    def test_17_create_order(self):
        """Test creating an order from cart"""
        if not TestCustomerScenario.product_id:
            pytest.skip("No product in cart to order")
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"},
            json={
                "items": [
                    {"product_id": TestCustomerScenario.product_id, "quantity": 1}
                ],
                "address": "TEST_المالكي - شارع 20 - بناء 30 - شقة 5",
                "city": "دمشق",
                "phone": TestCustomerScenario.customer_phone,
                "payment_method": "shamcash",
                "payment_phone": TestCustomerScenario.customer_phone,
                "latitude": 33.5200,
                "longitude": 36.2800,
                "delivery_fee": 5000
            }
        )
        
        print(f"Create order response status: {response.status_code}")
        print(f"Create order response: {response.json()}")
        
        assert response.status_code == 200, f"Create order failed: {response.text}"
        
        data = response.json()
        assert "order_id" in data, "Missing 'order_id' in response"
        assert "total" in data, "Missing 'total' in response"
        
        TestCustomerScenario.order_id = data["order_id"]
        print(f"✅ Order created successfully: {TestCustomerScenario.order_id}")
        print(f"   Order total: {data['total']}")
    
    def test_18_get_order_details(self):
        """Test getting order details"""
        if not TestCustomerScenario.order_id:
            pytest.skip("No order created to get details")
        
        response = requests.get(
            f"{BASE_URL}/api/orders/{TestCustomerScenario.order_id}",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        print(f"Get order response status: {response.status_code}")
        
        assert response.status_code == 200, f"Get order failed: {response.text}"
        
        data = response.json()
        assert data["id"] == TestCustomerScenario.order_id, "Order ID mismatch"
        assert data["status"] == "pending_payment", "Initial status should be pending_payment"
        assert "items" in data, "Missing 'items' in order"
        
        print(f"✅ Order details retrieved: status={data['status']}")
    
    def test_19_get_customer_orders(self):
        """Test getting customer's orders list"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert response.status_code == 200, f"Get orders failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Orders should be a list"
        
        # Verify our order is in the list
        our_order = next((o for o in data if o["id"] == TestCustomerScenario.order_id), None)
        if TestCustomerScenario.order_id:
            assert our_order is not None, "Created order not found in list"
        
        print(f"✅ Customer orders retrieved: {len(data)} order(s)")
    
    def test_20_get_order_tracking(self):
        """Test getting order tracking info"""
        if not TestCustomerScenario.order_id:
            pytest.skip("No order created to track")
        
        response = requests.get(
            f"{BASE_URL}/api/orders/{TestCustomerScenario.order_id}/tracking",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        print(f"Tracking response status: {response.status_code}")
        
        assert response.status_code == 200, f"Get tracking failed: {response.text}"
        
        data = response.json()
        assert "order_id" in data, "Missing 'order_id' in tracking"
        assert "status" in data, "Missing 'status' in tracking"
        assert "steps" in data, "Missing 'steps' in tracking"
        
        print(f"✅ Order tracking retrieved: status={data['status']}")
    
    # ============== CLEANUP ==============
    
    def test_21_clear_cart(self):
        """Test clearing the cart"""
        response = requests.delete(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert response.status_code == 200, f"Clear cart failed: {response.text}"
        
        # Verify cart is empty
        cart_response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        assert cart_response.json()["total"] == 0, "Cart should be empty"
        
        print("✅ Cart cleared successfully")
    
    # ============== ADDITIONAL FEATURES ==============
    
    def test_22_payment_methods_crud(self):
        """Test payment methods CRUD operations"""
        # Add payment method
        add_response = requests.post(
            f"{BASE_URL}/api/user/payment-methods",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"},
            json={
                "type": "shamcash",
                "phone": TestCustomerScenario.customer_phone,
                "holder_name": "TEST_عميل اختباري",
                "is_default": True
            }
        )
        
        assert add_response.status_code == 200, f"Add payment method failed: {add_response.text}"
        payment_id = add_response.json()["id"]
        print(f"✅ Payment method added: {payment_id}")
        
        # Get payment methods
        get_response = requests.get(
            f"{BASE_URL}/api/user/payment-methods",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert get_response.status_code == 200, "Get payment methods failed"
        assert len(get_response.json()) > 0, "Should have payment methods"
        print("✅ Payment methods retrieved")
        
        # Delete payment method
        delete_response = requests.delete(
            f"{BASE_URL}/api/user/payment-methods/{payment_id}",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert delete_response.status_code == 200, "Delete payment method failed"
        print("✅ Payment method deleted")
    
    def test_23_unauthorized_access(self):
        """Test that unauthorized access is rejected"""
        # Without token
        response = requests.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 401, "Should reject unauthorized access"
        
        # With invalid token
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": "Bearer invalid_token_12345"}
        )
        assert response.status_code == 401, "Should reject invalid token"
        
        print("✅ Unauthorized access correctly rejected")
    
    def test_24_best_sellers_products(self):
        """Test getting best sellers products"""
        response = requests.get(
            f"{BASE_URL}/api/products/best-sellers",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert response.status_code == 200, f"Get best sellers failed: {response.text}"
        print("✅ Best sellers endpoint working")
    
    def test_25_newly_added_products(self):
        """Test getting newly added products"""
        response = requests.get(
            f"{BASE_URL}/api/products/newly-added",
            headers={"Authorization": f"Bearer {TestCustomerScenario.customer_token}"}
        )
        
        assert response.status_code == 200, f"Get newly added failed: {response.text}"
        print("✅ Newly added products endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
