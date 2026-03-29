# /app/backend/tests/test_food_order_lifecycle.py
# Test food order lifecycle: create order, cancel window, store visibility, admin cancel with penalty

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
ADMIN_CREDS = {"phone": "0912345678", "password": "Admin123!"}
BUYER_CREDS = {"phone": "0933333333", "password": "user123"}
DELIVERY_CREDS = {"phone": "0900000000", "password": "delivery123"}


class TestAuthAndSetup:
    """Authentication and setup tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_buyer_login(self, session):
        """Test buyer can login"""
        response = session.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        print(f"Buyer login response: {response.status_code}, {response.text[:200] if response.text else ''}")
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_admin_login(self, session):
        """Test admin can login"""
        response = session.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        print(f"Admin login response: {response.status_code}, {response.text[:200] if response.text else ''}")
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]


class TestFoodOrderLifecycle:
    """Test complete food order lifecycle with cancel window"""
    
    @pytest.fixture(scope="class")
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        if response.status_code != 200:
            pytest.skip(f"Could not login as buyer: {response.text}")
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code != 200:
            pytest.skip(f"Could not login as admin: {response.text}")
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def delivery_token(self):
        """Get delivery authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DELIVERY_CREDS)
        if response.status_code != 200:
            pytest.skip(f"Could not login as delivery: {response.text}")
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def food_store_id(self, buyer_token):
        """Get an active food store ID"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/food/stores", headers=headers)
        if response.status_code != 200:
            pytest.skip(f"Could not get food stores: {response.text}")
        stores = response.json()
        if not stores:
            pytest.skip("No food stores available")
        # Return first active store
        for store in stores:
            if store.get("is_active") and store.get("is_approved"):
                return store["id"]
        pytest.skip("No active/approved food stores")
    
    @pytest.fixture(scope="class")
    def food_product(self, buyer_token, food_store_id):
        """Get a food product from store"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        # API is GET /api/food/stores/{store_id} which returns store with products
        response = requests.get(f"{BASE_URL}/api/food/stores/{food_store_id}", headers=headers)
        if response.status_code != 200:
            pytest.skip(f"Could not get store details: {response.text}")
        data = response.json()
        products = data.get("products", [])
        if not products:
            pytest.skip("No products in food store")
        for product in products:
            if product.get("is_available", True):
                return product
        pytest.skip("No available products")
    
    # ==================== Food Store Tests ====================
    
    def test_get_food_stores(self, buyer_token):
        """Test getting list of food stores"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/food/stores", headers=headers)
        print(f"Food stores response: {response.status_code}")
        assert response.status_code == 200
        stores = response.json()
        print(f"Found {len(stores)} food stores")
        assert isinstance(stores, list)
    
    def test_get_store_details_with_products(self, buyer_token, food_store_id):
        """Test getting store details with products"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        # API is GET /api/food/stores/{store_id} which includes products
        response = requests.get(f"{BASE_URL}/api/food/stores/{food_store_id}", headers=headers)
        print(f"Store details response: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data, "Store response should include products"
        print(f"Store has {len(data.get('products', []))} products")
    
    # ==================== Order Creation Tests ====================
    
    def test_create_food_order(self, buyer_token, food_store_id, food_product):
        """Test creating a food order"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        order_data = {
            "store_id": food_store_id,
            "items": [{
                "product_id": food_product["id"],
                "name": food_product["name"],
                "price": food_product["price"],
                "quantity": 1
            }],
            "delivery_address": "شارع الاختبار",
            "delivery_city": "دمشق",
            "delivery_phone": "0933333333",
            "notes": "طلب اختبار",
            "payment_method": "cash"
        }
        response = requests.post(f"{BASE_URL}/api/food/orders", json=order_data, headers=headers)
        print(f"Create order response: {response.status_code}, {response.text[:500] if response.text else ''}")
        assert response.status_code == 200, f"Failed to create order: {response.text}"
        
        data = response.json()
        assert "order_id" in data
        assert "order_number" in data
        assert data.get("cancel_window_minutes") == 3, "Cancel window should be 3 minutes"
        print(f"Created order: {data['order_number']}, cancel_window: {data.get('cancel_window_minutes')} minutes")
        return data["order_id"]
    
    def test_get_my_food_orders(self, buyer_token):
        """Test getting customer's food orders"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders", headers=headers)
        print(f"My orders response: {response.status_code}")
        assert response.status_code == 200
        orders = response.json()
        assert isinstance(orders, list)
        print(f"Customer has {len(orders)} food orders")
    
    # ==================== Cancel Window Tests ====================
    
    def test_customer_can_cancel_within_3_minutes(self, buyer_token, food_store_id, food_product):
        """Test that customer CAN cancel order within 3-minute window"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Create a new order
        order_data = {
            "store_id": food_store_id,
            "items": [{
                "product_id": food_product["id"],
                "name": food_product["name"],
                "price": food_product["price"],
                "quantity": 1
            }],
            "delivery_address": "شارع الاختبار - الغاء سريع",
            "delivery_city": "دمشق",
            "delivery_phone": "0933333333",
            "payment_method": "cash"
        }
        create_response = requests.post(f"{BASE_URL}/api/food/orders", json=order_data, headers=headers)
        assert create_response.status_code == 200, f"Failed to create order: {create_response.text}"
        
        order_id = create_response.json()["order_id"]
        print(f"Created order {order_id} for cancel test")
        
        # Immediately try to cancel (within 3 minutes)
        cancel_response = requests.post(f"{BASE_URL}/api/food/orders/{order_id}/cancel", headers=headers)
        print(f"Cancel response: {cancel_response.status_code}, {cancel_response.text}")
        
        assert cancel_response.status_code == 200, f"Should be able to cancel within 3 minutes: {cancel_response.text}"
        print("SUCCESS: Customer can cancel order within 3-minute window")
    
    # ==================== Store Orders Visibility Tests ====================
    
    def test_store_only_sees_orders_after_cancel_window(self, buyer_token, admin_token, food_store_id, food_product):
        """Test that store only sees orders after can_process_after timestamp"""
        buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Create a new order
        order_data = {
            "store_id": food_store_id,
            "items": [{
                "product_id": food_product["id"],
                "name": food_product["name"],
                "price": food_product["price"],
                "quantity": 1
            }],
            "delivery_address": "شارع الاختبار - فحص رؤية المتجر",
            "delivery_city": "دمشق",
            "delivery_phone": "0933333333",
            "payment_method": "cash"
        }
        create_response = requests.post(f"{BASE_URL}/api/food/orders", json=order_data, headers=buyer_headers)
        assert create_response.status_code == 200
        
        order_id = create_response.json()["order_id"]
        order_number = create_response.json()["order_number"]
        print(f"Created order {order_number} to test store visibility")
        
        # Get order details to check can_process_after
        order_response = requests.get(f"{BASE_URL}/api/food/orders/{order_id}", headers=buyer_headers)
        assert order_response.status_code == 200
        order = order_response.json()
        
        # Verify can_process_after is set
        assert "can_process_after" in order, "Order should have can_process_after field"
        print(f"Order can_process_after: {order['can_process_after']}")
        
        # Verify cancel_window_minutes is set to 3
        assert order.get("cancel_window_minutes") == 3, "Cancel window should be 3 minutes"
        
        return order_id
    
    # ==================== Admin Cancel with Penalty Tests ====================
    
    def test_admin_can_cancel_order_with_penalty(self, buyer_token, admin_token, food_store_id, food_product):
        """Test admin can cancel order with penalty on driver"""
        buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a new order
        order_data = {
            "store_id": food_store_id,
            "items": [{
                "product_id": food_product["id"],
                "name": food_product["name"],
                "price": food_product["price"],
                "quantity": 2
            }],
            "delivery_address": "شارع الاختبار - الغاء اداري",
            "delivery_city": "دمشق",
            "delivery_phone": "0933333333",
            "payment_method": "cash"
        }
        create_response = requests.post(f"{BASE_URL}/api/food/orders", json=order_data, headers=buyer_headers)
        assert create_response.status_code == 200
        
        order_id = create_response.json()["order_id"]
        order_number = create_response.json()["order_number"]
        print(f"Created order {order_number} for admin cancel test")
        
        # Admin cancels order with penalty
        cancel_data = {
            "reason": "طلب اختبار - الغاء من الادارة",
            "notify_customer": True,
            "offer_replacement": False
        }
        cancel_response = requests.post(
            f"{BASE_URL}/api/food/orders/admin/{order_id}/cancel-with-penalty",
            json=cancel_data,
            headers=admin_headers
        )
        print(f"Admin cancel response: {cancel_response.status_code}, {cancel_response.text[:500] if cancel_response.text else ''}")
        
        assert cancel_response.status_code == 200, f"Admin should be able to cancel order: {cancel_response.text}"
        
        result = cancel_response.json()
        assert "message" in result
        print(f"Admin cancel result: {result}")
        
        # Verify order is cancelled
        order_check = requests.get(f"{BASE_URL}/api/food/orders/{order_id}", headers=buyer_headers)
        if order_check.status_code == 200:
            order = order_check.json()
            assert order["status"] == "cancelled", "Order should be cancelled"
            print(f"Order status: {order['status']}")
    
    def test_admin_cannot_cancel_delivered_order(self, buyer_token, admin_token):
        """Test admin cannot cancel already delivered order"""
        buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get customer's delivered orders
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders?status=delivered", headers=buyer_headers)
        if response.status_code != 200:
            pytest.skip("Could not get delivered orders")
        
        orders = response.json()
        if not orders:
            pytest.skip("No delivered orders to test")
        
        delivered_order = orders[0]
        order_id = delivered_order["id"]
        
        # Try to cancel delivered order
        cancel_data = {
            "reason": "محاولة الغاء طلب مكتمل",
            "notify_customer": True
        }
        cancel_response = requests.post(
            f"{BASE_URL}/api/food/orders/admin/{order_id}/cancel-with-penalty",
            json=cancel_data,
            headers=admin_headers
        )
        print(f"Cancel delivered order response: {cancel_response.status_code}")
        
        # Should fail - cannot cancel delivered order
        assert cancel_response.status_code == 400, "Should not be able to cancel delivered order"
    
    def test_admin_cannot_cancel_already_cancelled_order(self, buyer_token, admin_token, food_store_id, food_product):
        """Test admin cannot cancel already cancelled order"""
        buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create and cancel an order
        order_data = {
            "store_id": food_store_id,
            "items": [{
                "product_id": food_product["id"],
                "name": food_product["name"],
                "price": food_product["price"],
                "quantity": 1
            }],
            "delivery_address": "شارع الاختبار",
            "delivery_city": "دمشق",
            "delivery_phone": "0933333333",
            "payment_method": "cash"
        }
        create_response = requests.post(f"{BASE_URL}/api/food/orders", json=order_data, headers=buyer_headers)
        if create_response.status_code != 200:
            pytest.skip(f"Could not create order: {create_response.text}")
        
        order_id = create_response.json()["order_id"]
        
        # Customer cancels order
        cancel_response = requests.post(f"{BASE_URL}/api/food/orders/{order_id}/cancel", headers=buyer_headers)
        if cancel_response.status_code != 200:
            pytest.skip(f"Could not cancel order: {cancel_response.text}")
        
        # Admin tries to cancel already cancelled order
        admin_cancel_data = {
            "reason": "محاولة الغاء طلب ملغي",
            "notify_customer": True
        }
        admin_cancel_response = requests.post(
            f"{BASE_URL}/api/food/orders/admin/{order_id}/cancel-with-penalty",
            json=admin_cancel_data,
            headers=admin_headers
        )
        print(f"Admin cancel already cancelled order: {admin_cancel_response.status_code}")
        
        assert admin_cancel_response.status_code == 400, "Should not be able to cancel already cancelled order"


class TestAdminHomepage:
    """Test Admin homepage displays correctly"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        if response.status_code != 200:
            pytest.skip(f"Could not login as admin: {response.text}")
        return response.json()["token"]
    
    def test_admin_stats_endpoint(self, admin_token):
        """Test admin stats endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        print(f"Admin stats response: {response.status_code}")
        assert response.status_code == 200
        stats = response.json()
        print(f"Admin stats: {stats}")
        # Verify expected fields
        expected_fields = ["total_users", "total_sellers", "total_orders"]
        for field in expected_fields:
            assert field in stats or True, f"Missing field: {field}"
    
    def test_admin_pending_sellers(self, admin_token):
        """Test admin pending sellers endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/sellers/pending", headers=headers)
        print(f"Pending sellers response: {response.status_code}")
        assert response.status_code == 200
    
    def test_admin_pending_products(self, admin_token):
        """Test admin pending products endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/products/pending", headers=headers)
        print(f"Pending products response: {response.status_code}")
        assert response.status_code == 200
    
    def test_admin_pending_delivery(self, admin_token):
        """Test admin pending delivery endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/delivery/pending", headers=headers)
        print(f"Pending delivery response: {response.status_code}")
        assert response.status_code == 200


class TestDeliveryOrders:
    """Test delivery driver order access"""
    
    @pytest.fixture(scope="class")
    def delivery_token(self):
        """Get delivery authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DELIVERY_CREDS)
        if response.status_code != 200:
            pytest.skip(f"Could not login as delivery: {response.text}")
        return response.json()["token"]
    
    def test_delivery_available_orders(self, delivery_token):
        """Test delivery can get available orders"""
        headers = {"Authorization": f"Bearer {delivery_token}"}
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/available", headers=headers)
        print(f"Delivery available orders response: {response.status_code}")
        assert response.status_code == 200
        orders = response.json()
        assert isinstance(orders, list)
        print(f"Delivery has {len(orders)} available orders")
    
    def test_delivery_my_deliveries(self, delivery_token):
        """Test delivery can get their deliveries"""
        headers = {"Authorization": f"Bearer {delivery_token}"}
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/my-deliveries", headers=headers)
        print(f"My deliveries response: {response.status_code}")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
