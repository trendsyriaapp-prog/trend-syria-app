"""
Test file for Product Edit functionality and Stock Decrement on Order Creation
Tests:
1. Seller can update product price and stock
2. Stock decrements automatically when order is created
3. Authorization checks for product updates
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials from previous test reports
SELLER_PHONE = "0922222222"
SELLER_PASSWORD = "seller123"
CUSTOMER_PHONE = "0933333333"
CUSTOMER_PASSWORD = "user123"

class TestProductEdit:
    """Test product edit functionality for sellers"""
    
    @pytest.fixture(scope="class")
    def seller_token(self):
        """Get seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SELLER_PHONE,
            "password": SELLER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Seller login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CUSTOMER_PHONE,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def seller_products(self, seller_token):
        """Get seller's products"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/seller/my-products", headers=headers)
        if response.status_code == 200:
            products = response.json()
            if products and len(products) > 0:
                return products
        pytest.skip("No seller products found")
    
    def test_seller_login_success(self):
        """Test seller can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SELLER_PHONE,
            "password": SELLER_PASSWORD
        })
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["user_type"] == "seller", "User is not a seller"
        print(f"✅ Seller login successful - user_type: {data['user']['user_type']}")
    
    def test_get_seller_products(self, seller_token):
        """Test seller can get their products"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/seller/my-products", headers=headers)
        
        assert response.status_code == 200, f"Get seller products failed: {response.text}"
        products = response.json()
        assert isinstance(products, list), "Products should be a list"
        print(f"✅ Seller has {len(products)} products")
        
        if products:
            product = products[0]
            assert "id" in product, "Product should have id"
            assert "price" in product, "Product should have price"
            assert "stock" in product, "Product should have stock"
            assert "name" in product, "Product should have name"
            print(f"✅ First product: {product['name']}, Price: {product['price']}, Stock: {product['stock']}")
    
    def test_update_product_price(self, seller_token, seller_products):
        """Test seller can update product price"""
        product = seller_products[0]
        original_price = product['price']
        new_price = original_price + 1000  # Add 1000 to price
        
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.put(
            f"{BASE_URL}/api/products/{product['id']}",
            headers=headers,
            json={"price": new_price}
        )
        
        assert response.status_code == 200, f"Update product price failed: {response.text}"
        print(f"✅ Product price update API returned 200")
        
        # Verify the change by fetching the product
        get_response = requests.get(f"{BASE_URL}/api/products/{product['id']}")
        assert get_response.status_code == 200
        updated_product = get_response.json()
        assert updated_product['price'] == new_price, f"Price not updated. Expected {new_price}, got {updated_product['price']}"
        print(f"✅ Price updated from {original_price} to {new_price}")
        
        # Restore original price
        restore_response = requests.put(
            f"{BASE_URL}/api/products/{product['id']}",
            headers=headers,
            json={"price": original_price}
        )
        assert restore_response.status_code == 200
        print(f"✅ Price restored to original: {original_price}")
    
    def test_update_product_stock(self, seller_token, seller_products):
        """Test seller can update product stock"""
        product = seller_products[0]
        original_stock = product['stock']
        new_stock = original_stock + 10  # Add 10 to stock
        
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.put(
            f"{BASE_URL}/api/products/{product['id']}",
            headers=headers,
            json={"stock": new_stock}
        )
        
        assert response.status_code == 200, f"Update product stock failed: {response.text}"
        print(f"✅ Product stock update API returned 200")
        
        # Verify the change by fetching the product
        get_response = requests.get(f"{BASE_URL}/api/products/{product['id']}")
        assert get_response.status_code == 200
        updated_product = get_response.json()
        assert updated_product['stock'] == new_stock, f"Stock not updated. Expected {new_stock}, got {updated_product['stock']}"
        print(f"✅ Stock updated from {original_stock} to {new_stock}")
        
        # Restore original stock
        restore_response = requests.put(
            f"{BASE_URL}/api/products/{product['id']}",
            headers=headers,
            json={"stock": original_stock}
        )
        assert restore_response.status_code == 200
        print(f"✅ Stock restored to original: {original_stock}")
    
    def test_update_both_price_and_stock(self, seller_token, seller_products):
        """Test seller can update both price and stock simultaneously"""
        product = seller_products[0]
        original_price = product['price']
        original_stock = product['stock']
        new_price = original_price + 500
        new_stock = original_stock + 5
        
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.put(
            f"{BASE_URL}/api/products/{product['id']}",
            headers=headers,
            json={"price": new_price, "stock": new_stock}
        )
        
        assert response.status_code == 200, f"Update product failed: {response.text}"
        
        # Verify changes
        get_response = requests.get(f"{BASE_URL}/api/products/{product['id']}")
        assert get_response.status_code == 200
        updated_product = get_response.json()
        assert updated_product['price'] == new_price, "Price not updated"
        assert updated_product['stock'] == new_stock, "Stock not updated"
        print(f"✅ Both price and stock updated successfully")
        
        # Restore original values
        restore_response = requests.put(
            f"{BASE_URL}/api/products/{product['id']}",
            headers=headers,
            json={"price": original_price, "stock": original_stock}
        )
        assert restore_response.status_code == 200
        print(f"✅ Original values restored")
    
    def test_unauthorized_product_update_rejected(self, customer_token, seller_products):
        """Test that customer cannot update seller's product"""
        product = seller_products[0]
        
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.put(
            f"{BASE_URL}/api/products/{product['id']}",
            headers=headers,
            json={"price": 99999}
        )
        
        assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}"
        print(f"✅ Unauthorized update correctly rejected with 403")
    
    def test_unauthenticated_product_update_rejected(self, seller_products):
        """Test that unauthenticated request cannot update product"""
        product = seller_products[0]
        
        response = requests.put(
            f"{BASE_URL}/api/products/{product['id']}",
            json={"price": 99999}
        )
        
        assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"
        print(f"✅ Unauthenticated update correctly rejected with 401")


class TestStockDecrement:
    """Test stock decrement on order creation"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CUSTOMER_PHONE,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def seller_token(self):
        """Get seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SELLER_PHONE,
            "password": SELLER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Seller login failed: {response.status_code}")
    
    def test_customer_login_success(self):
        """Test customer can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CUSTOMER_PHONE,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"✅ Customer login successful")
    
    def test_get_available_products(self):
        """Test we can get products with stock"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Get products failed: {response.text}"
        data = response.json()
        assert "products" in data
        products = data["products"]
        
        # Find a product with stock > 0
        products_with_stock = [p for p in products if p.get("stock", 0) > 0]
        assert len(products_with_stock) > 0, "No products with stock found"
        print(f"✅ Found {len(products_with_stock)} products with stock available")
        
        for p in products_with_stock[:3]:
            print(f"   - {p['name']}: Stock={p.get('stock', 'N/A')}")
    
    def test_add_to_cart(self, customer_token):
        """Test customer can add product to cart"""
        # First get a product with stock
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()["products"]
        products_with_stock = [p for p in products if p.get("stock", 0) > 0]
        
        if not products_with_stock:
            pytest.skip("No products with stock")
        
        product = products_with_stock[0]
        
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        # Clear cart first
        requests.delete(f"{BASE_URL}/api/cart", headers=headers)
        
        # Add to cart
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            headers=headers,
            json={
                "product_id": product["id"],
                "quantity": 1
            }
        )
        
        assert response.status_code == 200, f"Add to cart failed: {response.text}"
        print(f"✅ Added {product['name']} to cart")
    
    def test_stock_decrements_on_order(self, customer_token, seller_token):
        """Test that stock decrements when order is created"""
        headers_customer = {"Authorization": f"Bearer {customer_token}"}
        headers_seller = {"Authorization": f"Bearer {seller_token}"}
        
        # Get seller's product
        response = requests.get(f"{BASE_URL}/api/seller/my-products", headers=headers_seller)
        if response.status_code != 200:
            pytest.skip("Could not get seller products")
        
        seller_products = response.json()
        products_with_stock = [p for p in seller_products if p.get("stock", 0) > 0]
        
        if not products_with_stock:
            pytest.skip("Seller has no products with stock")
        
        product = products_with_stock[0]
        original_stock = product['stock']
        print(f"📦 Testing with product: {product['name']}, Original stock: {original_stock}")
        
        # Clear cart and add this product
        requests.delete(f"{BASE_URL}/api/cart", headers=headers_customer)
        
        add_response = requests.post(
            f"{BASE_URL}/api/cart/add",
            headers=headers_customer,
            json={
                "product_id": product["id"],
                "quantity": 1
            }
        )
        
        if add_response.status_code != 200:
            pytest.skip(f"Could not add to cart: {add_response.text}")
        
        print(f"✅ Added product to cart")
        
        # Create order
        order_response = requests.post(
            f"{BASE_URL}/api/orders",
            headers=headers_customer,
            json={
                "address": "شارع الحمرا، بناء 5، طابق 2",
                "city": "دمشق",
                "phone": CUSTOMER_PHONE,
                "payment_method": "shamcash",
                "payment_phone": CUSTOMER_PHONE
            }
        )
        
        if order_response.status_code != 200:
            print(f"⚠️ Order creation response: {order_response.status_code} - {order_response.text}")
            pytest.skip(f"Could not create order: {order_response.text}")
        
        order_data = order_response.json()
        order_id = order_data.get("order_id")
        print(f"✅ Order created: {order_id}")
        
        # Check stock after order
        get_response = requests.get(f"{BASE_URL}/api/products/{product['id']}")
        assert get_response.status_code == 200
        updated_product = get_response.json()
        new_stock = updated_product['stock']
        
        expected_stock = original_stock - 1
        assert new_stock == expected_stock, f"Stock should decrement. Expected {expected_stock}, got {new_stock}"
        print(f"✅ Stock decremented: {original_stock} -> {new_stock} (expected: {expected_stock})")
        
        # Restore stock for next tests
        restore_response = requests.put(
            f"{BASE_URL}/api/products/{product['id']}",
            headers=headers_seller,
            json={"stock": original_stock}
        )
        if restore_response.status_code == 200:
            print(f"✅ Stock restored to {original_stock}")


class TestProductUpdateSchema:
    """Test ProductUpdate schema accepts price and stock"""
    
    @pytest.fixture(scope="class")
    def seller_token(self):
        """Get seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SELLER_PHONE,
            "password": SELLER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Seller login failed")
    
    def test_update_with_price_only(self, seller_token):
        """Test updating with only price field"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        # Get seller products
        response = requests.get(f"{BASE_URL}/api/seller/my-products", headers=headers)
        if response.status_code != 200 or not response.json():
            pytest.skip("No seller products")
        
        product = response.json()[0]
        original_price = product['price']
        
        # Update with price only
        update_response = requests.put(
            f"{BASE_URL}/api/products/{product['id']}",
            headers=headers,
            json={"price": original_price + 100}
        )
        
        assert update_response.status_code == 200, f"Price-only update failed: {update_response.text}"
        print("✅ Price-only update works")
        
        # Restore
        requests.put(f"{BASE_URL}/api/products/{product['id']}", headers=headers, json={"price": original_price})
    
    def test_update_with_stock_only(self, seller_token):
        """Test updating with only stock field"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        # Get seller products
        response = requests.get(f"{BASE_URL}/api/seller/my-products", headers=headers)
        if response.status_code != 200 or not response.json():
            pytest.skip("No seller products")
        
        product = response.json()[0]
        original_stock = product['stock']
        
        # Update with stock only
        update_response = requests.put(
            f"{BASE_URL}/api/products/{product['id']}",
            headers=headers,
            json={"stock": original_stock + 1}
        )
        
        assert update_response.status_code == 200, f"Stock-only update failed: {update_response.text}"
        print("✅ Stock-only update works")
        
        # Restore
        requests.put(f"{BASE_URL}/api/products/{product['id']}", headers=headers, json={"stock": original_stock})


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
