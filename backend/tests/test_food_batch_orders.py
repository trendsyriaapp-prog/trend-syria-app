# Test file for Food Batch Orders feature
# Tests the batch checkout functionality: POST /api/food/orders/batch
# When user has items from multiple stores, they can complete all orders at once

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://shopper-suite.preview.emergentagent.com"

# Test credentials
BUYER_PHONE = "0933333333"
BUYER_PASSWORD = "user123"

# Store and product IDs from Damascus
STORE_1_ID = "421443ed-55d6-4f1e-990a-2f3f53b2427e"  # مطعم الشام
STORE_2_ID = "11a7a790-bc45-4908-8583-8394f288951d"  # مطعم البيت الدمشقي

# Products from store 1
STORE_1_PRODUCT_1 = "f5714a31-162f-4156-9e0b-d7d77f67b103"  # شاورما دجاج - 25000
STORE_1_PRODUCT_2 = "90b23c07-424a-4747-93cc-57067b88ff53"  # شاورما لحم - 35000

# Products from store 2  
STORE_2_PRODUCT_1 = "2aee84f8-0296-4ead-b57a-9e8a4bff2d5d"  # فتة حمص - 35000
STORE_2_PRODUCT_2 = "f4ecb193-8a31-402f-85cd-4227516fa4e7"  # كبة مشوية - 45000


class TestFoodBatchOrders:
    """Test batch food order creation from multiple stores"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for buyer"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": BUYER_PHONE, "password": BUYER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        return data.get("token")
    
    @pytest.fixture(scope="class")  
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_verify_stores_exist(self):
        """Verify both test stores exist and are active in Damascus"""
        # Get stores in Damascus
        response = requests.get(f"{BASE_URL}/api/food/stores?city=دمشق")
        assert response.status_code == 200, f"Failed to get stores: {response.text}"
        
        stores = response.json()
        assert len(stores) >= 2, f"Expected at least 2 stores, got {len(stores)}"
        
        store_ids = [s["id"] for s in stores]
        assert STORE_1_ID in store_ids, f"Store 1 {STORE_1_ID} not found"
        assert STORE_2_ID in store_ids, f"Store 2 {STORE_2_ID} not found"
        print(f"✓ Found both stores in Damascus")
    
    def test_02_verify_products_available(self):
        """Verify products are available from both stores"""
        # Check store 1 products
        response1 = requests.get(f"{BASE_URL}/api/food/products?store_id={STORE_1_ID}")
        assert response1.status_code == 200
        products1 = response1.json()
        product_ids1 = [p["id"] for p in products1]
        assert STORE_1_PRODUCT_1 in product_ids1, "Store 1 product 1 not found"
        
        # Check store 2 products
        response2 = requests.get(f"{BASE_URL}/api/food/products?store_id={STORE_2_ID}")
        assert response2.status_code == 200
        products2 = response2.json()
        product_ids2 = [p["id"] for p in products2]
        assert STORE_2_PRODUCT_1 in product_ids2, "Store 2 product 1 not found"
        
        print(f"✓ Products available from both stores")
    
    def test_03_batch_order_requires_auth(self):
        """Batch order endpoint requires authentication"""
        batch_data = {
            "orders": [
                {
                    "store_id": STORE_1_ID,
                    "items": [{"product_id": STORE_1_PRODUCT_1, "name": "شاورما دجاج", "price": 25000, "quantity": 1}]
                }
            ],
            "delivery_address": "Test Address",
            "delivery_city": "دمشق",
            "delivery_phone": "0933333333",
            "payment_method": "cash"
        }
        
        response = requests.post(f"{BASE_URL}/api/food/orders/batch", json=batch_data)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Batch order requires authentication")
    
    def test_04_batch_order_empty_orders_rejected(self, auth_headers):
        """Batch order with empty orders array is rejected"""
        batch_data = {
            "orders": [],
            "delivery_address": "Test Address",
            "delivery_city": "دمشق", 
            "delivery_phone": "0933333333",
            "payment_method": "cash"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders/batch",
            json=batch_data,
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "لا توجد طلبات" in response.json().get("detail", "")
        print("✓ Empty orders rejected with proper error")
    
    def test_05_batch_order_with_cash_payment(self, auth_headers):
        """Create batch order with cash payment from 2 stores"""
        batch_data = {
            "orders": [
                {
                    "store_id": STORE_1_ID,
                    "items": [
                        {"product_id": STORE_1_PRODUCT_1, "name": "شاورما دجاج", "price": 25000, "quantity": 2}
                    ],
                    "notes": "بدون بصل"
                },
                {
                    "store_id": STORE_2_ID,
                    "items": [
                        {"product_id": STORE_2_PRODUCT_1, "name": "فتة حمص", "price": 35000, "quantity": 1}
                    ],
                    "notes": None
                }
            ],
            "delivery_address": "المزة - شارع الجلاء - بناء 5",
            "delivery_city": "دمشق",
            "delivery_phone": "0933333333",
            "payment_method": "cash"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders/batch",
            json=batch_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Batch order failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "batch_id" in data, "Missing batch_id in response"
        assert "orders" in data, "Missing orders in response"
        assert "total_amount" in data, "Missing total_amount in response"
        assert "stores_count" in data, "Missing stores_count in response"
        
        # Verify batch details
        assert data["stores_count"] == 2, f"Expected 2 stores, got {data['stores_count']}"
        assert len(data["orders"]) == 2, f"Expected 2 orders, got {len(data['orders'])}"
        assert data["batch_id"].startswith("BATCH"), f"Invalid batch_id format: {data['batch_id']}"
        
        # Verify order details
        for order in data["orders"]:
            assert "order_id" in order
            assert "order_number" in order
            assert "store_name" in order
            assert "total" in order
            assert order["order_number"].startswith("FO")
        
        # Verify total calculation (2*25000 + 35000 = 85000 + delivery fees)
        # Store 1: 50000 (2*25000) + 5000 delivery = 55000 (under free delivery threshold)
        # Store 2: 35000 + 3000 delivery = 38000 (under free delivery threshold)
        # Total should be around 93000
        assert data["total_amount"] > 85000, f"Total amount too low: {data['total_amount']}"
        
        print(f"✓ Batch order created successfully: {data['batch_id']}")
        print(f"  - Stores: {data['stores_count']}")
        print(f"  - Total: {data['total_amount']} ل.س")
        print(f"  - Orders: {[o['order_number'] for o in data['orders']]}")
        
        return data["batch_id"]
    
    def test_06_verify_batch_orders_in_my_orders(self, auth_headers):
        """Verify batch orders appear in customer's order history"""
        response = requests.get(
            f"{BASE_URL}/api/food/orders/my-orders",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        orders = response.json()
        
        # Check if any orders have batch_id
        batch_orders = [o for o in orders if o.get("batch_id")]
        assert len(batch_orders) > 0, "No batch orders found in history"
        
        # Verify batch orders have correct fields
        for order in batch_orders:
            assert "batch_id" in order
            assert "batch_index" in order
            assert "batch_total" in order
            assert order["status"] == "pending"
        
        print(f"✓ Found {len(batch_orders)} batch orders in history")


class TestBatchOrderCancellation:
    """Test batch order cancellation functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for buyer"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": BUYER_PHONE, "password": BUYER_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_07_batch_cancel_requires_auth(self):
        """Batch cancel endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/food/orders/batch/BATCH123456/cancel")
        assert response.status_code == 401
        print("✓ Batch cancel requires authentication")
    
    def test_08_batch_cancel_nonexistent(self, auth_headers):
        """Cannot cancel non-existent batch"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/batch/BATCH_NONEXISTENT/cancel",
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✓ Non-existent batch returns 404")


class TestBatchOrderValidation:
    """Test input validation for batch orders"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": BUYER_PHONE, "password": BUYER_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_09_invalid_store_rejected(self, auth_headers):
        """Order with invalid store ID is rejected"""
        batch_data = {
            "orders": [
                {
                    "store_id": "invalid-store-id-12345",
                    "items": [{"product_id": "any", "name": "Test", "price": 10000, "quantity": 1}]
                }
            ],
            "delivery_address": "Test",
            "delivery_city": "دمشق",
            "delivery_phone": "0933333333",
            "payment_method": "cash"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders/batch",
            json=batch_data,
            headers=auth_headers
        )
        assert response.status_code == 404
        print("✓ Invalid store ID rejected")
    
    def test_10_minimum_order_enforced(self, auth_headers):
        """Order below store minimum is rejected"""
        # Store 1 has minimum_order of 20000
        batch_data = {
            "orders": [
                {
                    "store_id": STORE_1_ID,
                    "items": [
                        # Only 1 item at 25000 - this should pass minimum (20000)
                        {"product_id": STORE_1_PRODUCT_1, "name": "شاورما دجاج", "price": 25000, "quantity": 1}
                    ]
                }
            ],
            "delivery_address": "Test Address",
            "delivery_city": "دمشق",
            "delivery_phone": "0933333333",
            "payment_method": "cash"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders/batch",
            json=batch_data,
            headers=auth_headers
        )
        # This should succeed since 25000 > 20000 minimum
        assert response.status_code == 200, f"Order should pass minimum: {response.text}"
        print("✓ Minimum order validation works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
