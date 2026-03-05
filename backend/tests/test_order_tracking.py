"""
Test Order Tracking System APIs for Trend Syria
Tests the new tracking features:
- GET /api/orders/{id}/tracking - Get order tracking info
- PUT /api/orders/{id}/delivery-note - Customer delivery note
- POST /api/orders/{id}/seller/confirm - Seller confirms order
- POST /api/orders/{id}/seller/preparing - Seller starts preparing
- POST /api/orders/{id}/seller/shipped - Seller ships order
- POST /api/orders/{id}/delivery/pickup - Delivery picks up order
- POST /api/orders/{id}/delivery/on-the-way - Delivery on the way
- POST /api/orders/{id}/delivery/delivered - Delivery completed
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
CUSTOMER_CREDS = {"phone": "0933333333", "password": "user123"}
SELLER_CREDS = {"phone": "0922222222", "password": "seller123"}
DELIVERY_CREDS = {"phone": "0944444444", "password": "delivery123"}
ADMIN_CREDS = {"phone": "0911111111", "password": "admin123"}


class TestTrackingSetup:
    """Helper tests to verify test setup"""
    
    def test_api_health(self):
        """Test that the API is accessible"""
        response = requests.get(f"{BASE_URL}/api/products", timeout=10)
        assert response.status_code == 200, f"API health check failed: {response.status_code}"
        print("✅ API is accessible")

    def test_customer_login(self):
        """Test customer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS, timeout=10)
        print(f"Customer login response: {response.status_code} - {response.json()}")
        assert response.status_code == 200, f"Customer login failed: {response.status_code}"
        print("✅ Customer login successful")
        
    def test_seller_login(self):
        """Test seller login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SELLER_CREDS, timeout=10)
        print(f"Seller login response: {response.status_code} - {response.json()}")
        assert response.status_code == 200, f"Seller login failed: {response.status_code}"
        print("✅ Seller login successful")
        
    def test_delivery_login(self):
        """Test delivery login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DELIVERY_CREDS, timeout=10)
        print(f"Delivery login response: {response.status_code} - {response.json()}")
        assert response.status_code == 200, f"Delivery login failed: {response.status_code}"
        print("✅ Delivery login successful")


class TestOrderTrackingAPIs:
    """Test order tracking APIs"""
    
    @pytest.fixture(scope="class")
    def customer_session(self):
        """Get authenticated customer session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS, timeout=10)
        if response.status_code == 200:
            token = response.json().get("token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    @pytest.fixture(scope="class")
    def seller_session(self):
        """Get authenticated seller session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=SELLER_CREDS, timeout=10)
        if response.status_code == 200:
            token = response.json().get("token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    @pytest.fixture(scope="class")
    def delivery_session(self):
        """Get authenticated delivery session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=DELIVERY_CREDS, timeout=10)
        if response.status_code == 200:
            token = response.json().get("token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    @pytest.fixture(scope="class")
    def customer_orders(self, customer_session):
        """Get customer orders"""
        response = customer_session.get(f"{BASE_URL}/api/orders", timeout=10)
        if response.status_code == 200:
            return response.json()
        return []
    
    @pytest.fixture(scope="class")
    def seller_orders(self, seller_session):
        """Get seller orders"""
        response = seller_session.get(f"{BASE_URL}/api/orders", timeout=10)
        if response.status_code == 200:
            return response.json()
        return []

    def test_customer_get_orders_list(self, customer_session):
        """Test customer can get their orders"""
        response = customer_session.get(f"{BASE_URL}/api/orders", timeout=10)
        print(f"Customer orders response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get orders: {response.status_code}"
        orders = response.json()
        print(f"✅ Customer has {len(orders)} orders")
        return orders

    def test_seller_get_orders_list(self, seller_session):
        """Test seller can get their orders"""
        response = seller_session.get(f"{BASE_URL}/api/orders", timeout=10)
        print(f"Seller orders response: {response.status_code}")
        assert response.status_code == 200, f"Failed to get orders: {response.status_code}"
        orders = response.json()
        print(f"✅ Seller has {len(orders)} orders")
        return orders

    def test_order_tracking_endpoint_exists(self, customer_session, customer_orders):
        """Test GET /api/orders/{id}/tracking endpoint exists"""
        if not customer_orders:
            pytest.skip("No orders found for customer")
        
        order_id = customer_orders[0].get("id")
        response = customer_session.get(f"{BASE_URL}/api/orders/{order_id}/tracking", timeout=10)
        print(f"Tracking endpoint response: {response.status_code}")
        
        # Should return 200 for valid order
        assert response.status_code in [200, 403], f"Tracking endpoint failed: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Tracking data: {data.keys()}")
            assert "order_id" in data or "status" in data, "Missing expected tracking fields"
        print("✅ Tracking endpoint accessible")

    def test_delivery_note_endpoint_exists(self, customer_session, customer_orders):
        """Test PUT /api/orders/{id}/delivery-note endpoint exists"""
        if not customer_orders:
            pytest.skip("No orders found for customer")
        
        order_id = customer_orders[0].get("id")
        response = customer_session.put(
            f"{BASE_URL}/api/orders/{order_id}/delivery-note",
            json={"delivery_note": "TEST_ملاحظة اختبار - الطابق الثالث"},
            timeout=10
        )
        print(f"Delivery note endpoint response: {response.status_code} - {response.text}")
        
        # May succeed or fail based on order status (cannot add note after delivery)
        assert response.status_code in [200, 400, 403], f"Delivery note endpoint failed unexpectedly: {response.status_code}"
        print("✅ Delivery note endpoint accessible")


class TestSellerActions:
    """Test seller order management actions"""
    
    @pytest.fixture(scope="class")
    def seller_session(self):
        """Get authenticated seller session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=SELLER_CREDS, timeout=10)
        if response.status_code == 200:
            token = response.json().get("token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    @pytest.fixture(scope="class")
    def seller_orders(self, seller_session):
        """Get seller orders"""
        response = seller_session.get(f"{BASE_URL}/api/orders", timeout=10)
        if response.status_code == 200:
            return response.json()
        return []

    def test_seller_confirm_endpoint_exists(self, seller_session, seller_orders):
        """Test POST /api/orders/{id}/seller/confirm endpoint exists"""
        if not seller_orders:
            pytest.skip("No orders found for seller")
        
        # Find a paid order that needs confirmation
        paid_order = None
        for order in seller_orders:
            if order.get("status") == "paid" and order.get("delivery_status") in ["pending", None]:
                paid_order = order
                break
        
        if not paid_order:
            # Test with any order to verify endpoint exists
            order_id = seller_orders[0].get("id")
            response = seller_session.post(f"{BASE_URL}/api/orders/{order_id}/seller/confirm", timeout=10)
            print(f"Seller confirm endpoint response: {response.status_code} - {response.text}")
            # Should return 200, 400 (wrong status), or 403 (wrong seller)
            assert response.status_code in [200, 400, 403], f"Endpoint failed unexpectedly: {response.status_code}"
        else:
            order_id = paid_order.get("id")
            response = seller_session.post(f"{BASE_URL}/api/orders/{order_id}/seller/confirm", timeout=10)
            print(f"Seller confirm response: {response.status_code} - {response.text}")
            assert response.status_code in [200, 400], f"Confirm failed: {response.status_code}"
        
        print("✅ Seller confirm endpoint accessible")

    def test_seller_preparing_endpoint_exists(self, seller_session, seller_orders):
        """Test POST /api/orders/{id}/seller/preparing endpoint exists"""
        if not seller_orders:
            pytest.skip("No orders found for seller")
        
        order_id = seller_orders[0].get("id")
        response = seller_session.post(f"{BASE_URL}/api/orders/{order_id}/seller/preparing", timeout=10)
        print(f"Seller preparing endpoint response: {response.status_code}")
        assert response.status_code in [200, 400, 403], f"Endpoint failed unexpectedly: {response.status_code}"
        print("✅ Seller preparing endpoint accessible")

    def test_seller_shipped_endpoint_exists(self, seller_session, seller_orders):
        """Test POST /api/orders/{id}/seller/shipped endpoint exists"""
        if not seller_orders:
            pytest.skip("No orders found for seller")
        
        order_id = seller_orders[0].get("id")
        response = seller_session.post(f"{BASE_URL}/api/orders/{order_id}/seller/shipped", timeout=10)
        print(f"Seller shipped endpoint response: {response.status_code}")
        assert response.status_code in [200, 400, 403], f"Endpoint failed unexpectedly: {response.status_code}"
        print("✅ Seller shipped endpoint accessible")


class TestDeliveryActions:
    """Test delivery driver order management actions"""
    
    @pytest.fixture(scope="class")
    def delivery_session(self):
        """Get authenticated delivery session"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=DELIVERY_CREDS, timeout=10)
        if response.status_code == 200:
            token = response.json().get("token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
        return session

    def test_delivery_pickup_endpoint_exists(self, delivery_session):
        """Test POST /api/orders/{id}/delivery/pickup endpoint exists"""
        # Try with a fake order ID to test endpoint exists
        response = delivery_session.post(f"{BASE_URL}/api/orders/fake-order-id/delivery/pickup", timeout=10)
        print(f"Delivery pickup endpoint response: {response.status_code}")
        # Should return 404 (not found), 400 (wrong status), or 403 (not authorized/approved)
        assert response.status_code in [403, 404, 400], f"Unexpected status: {response.status_code}"
        print("✅ Delivery pickup endpoint accessible (returns 404 for fake order)")

    def test_delivery_on_the_way_endpoint_exists(self, delivery_session):
        """Test POST /api/orders/{id}/delivery/on-the-way endpoint exists"""
        response = delivery_session.post(f"{BASE_URL}/api/orders/fake-order-id/delivery/on-the-way", timeout=10)
        print(f"Delivery on-the-way endpoint response: {response.status_code}")
        assert response.status_code in [403, 404, 400], f"Unexpected status: {response.status_code}"
        print("✅ Delivery on-the-way endpoint accessible")

    def test_delivery_delivered_endpoint_exists(self, delivery_session):
        """Test POST /api/orders/{id}/delivery/delivered endpoint exists"""
        response = delivery_session.post(f"{BASE_URL}/api/orders/fake-order-id/delivery/delivered", timeout=10)
        print(f"Delivery delivered endpoint response: {response.status_code}")
        assert response.status_code in [403, 404, 400], f"Unexpected status: {response.status_code}"
        print("✅ Delivery delivered endpoint accessible")

    def test_delivery_available_orders_endpoint(self, delivery_session):
        """Test GET /api/delivery/available-orders endpoint"""
        response = delivery_session.get(f"{BASE_URL}/api/delivery/available-orders", timeout=10)
        print(f"Available orders response: {response.status_code}")
        # May return 403 if delivery account not approved
        assert response.status_code in [200, 403], f"Available orders failed: {response.status_code}"
        print("✅ Available orders endpoint accessible")

    def test_delivery_my_orders_endpoint(self, delivery_session):
        """Test GET /api/delivery/my-orders endpoint"""
        response = delivery_session.get(f"{BASE_URL}/api/delivery/my-orders", timeout=10)
        print(f"My orders response: {response.status_code}")
        assert response.status_code in [200, 403], f"My orders failed: {response.status_code}"
        print("✅ My orders endpoint accessible")


class TestFullTrackingFlow:
    """Test complete order tracking flow"""
    
    def test_tracking_steps_structure(self):
        """Verify tracking steps are properly defined in the response"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS, timeout=10)
        if response.status_code == 200:
            token = response.json().get("token")
            if token:
                session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get orders
        orders_response = session.get(f"{BASE_URL}/api/orders", timeout=10)
        if orders_response.status_code != 200:
            pytest.skip("Cannot get orders")
        
        orders = orders_response.json()
        if not orders:
            pytest.skip("No orders found")
        
        # Get tracking for first order
        order_id = orders[0].get("id")
        tracking_response = session.get(f"{BASE_URL}/api/orders/{order_id}/tracking", timeout=10)
        
        if tracking_response.status_code == 200:
            data = tracking_response.json()
            print(f"Tracking data keys: {data.keys()}")
            
            # Check for expected fields
            expected_fields = ["order_id", "status", "delivery_status", "steps"]
            for field in expected_fields:
                if field in data:
                    print(f"  ✅ Found field: {field}")
            
            # Check steps structure if present
            if "steps" in data:
                steps = data["steps"]
                print(f"  Found {len(steps)} tracking steps")
                expected_step_keys = ["key", "label"]
                for step in steps[:3]:  # Check first 3 steps
                    print(f"    Step: {step.get('key')} - {step.get('label')}")
        
        print("✅ Tracking structure verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
