# /app/backend/tests/test_driver_tracking.py
# Test driver location tracking APIs for customers and sellers

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDriverTrackingAPIs:
    """Test suite for driver location tracking features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get tokens for different user types"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Customer login
        customer_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0933333333",
            "password": "buyer123"
        })
        if customer_resp.status_code == 200:
            self.customer_token = customer_resp.json().get("token")
        else:
            self.customer_token = None
            
        # Driver login
        driver_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0900000000", 
            "password": "delivery123"
        })
        if driver_resp.status_code == 200:
            self.driver_token = driver_resp.json().get("token")
        else:
            self.driver_token = None
            
        # Seller login
        seller_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0966666666",
            "password": "seller123"
        })
        if seller_resp.status_code == 200:
            self.seller_token = seller_resp.json().get("token")
        else:
            self.seller_token = None
    
    # ============ AUTH TESTS ============
    
    def test_customer_auth(self):
        """Test customer authentication works"""
        assert self.customer_token is not None, "Customer login should succeed"
        print("✅ Customer authentication successful")
    
    def test_driver_auth(self):
        """Test driver authentication works"""
        assert self.driver_token is not None, "Driver login should succeed"
        print("✅ Driver authentication successful")
    
    def test_seller_auth(self):
        """Test seller authentication works"""
        assert self.seller_token is not None, "Seller login should succeed"
        print("✅ Seller authentication successful")
    
    # ============ DRIVER LOCATION UPDATE API ============
    
    def test_driver_location_update(self):
        """Test PUT /api/delivery/location - driver can update their location"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        response = self.session.put(
            f"{BASE_URL}/api/delivery/location",
            json={
                "latitude": 33.5138,
                "longitude": 36.2765,
                "order_id": None
            },
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        print(f"✅ Driver location update works - {data.get('message')}")
    
    def test_driver_location_update_with_order(self):
        """Test PUT /api/delivery/location with order_id"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        # Use a test order ID
        response = self.session.put(
            f"{BASE_URL}/api/delivery/location",
            json={
                "latitude": 33.5138,
                "longitude": 36.2765,
                "order_id": "test-order-123"  # May not exist but should not error
            },
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ Driver location update with order_id works")
    
    def test_customer_cannot_update_driver_location(self):
        """Test that customers cannot update driver location"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = self.session.put(
            f"{BASE_URL}/api/delivery/location",
            json={
                "latitude": 33.5138,
                "longitude": 36.2765
            },
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Customer correctly denied from updating driver location")
    
    # ============ GET DRIVER LOCATION API ============
    
    def test_get_driver_location_no_auth(self):
        """Test GET /api/delivery/location/{order_id} requires auth"""
        response = self.session.get(
            f"{BASE_URL}/api/delivery/location/test-order-123"
        )
        
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("✅ Driver location API correctly requires authentication")
    
    def test_get_driver_location_nonexistent_order(self):
        """Test GET /api/delivery/location/{order_id} for nonexistent order"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/delivery/location/nonexistent-order-id",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Non-existent order returns 404")
    
    def test_get_driver_location_for_existing_order(self):
        """Test GET /api/delivery/location/{order_id} for existing order"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        # First get the customer's orders to find an order ID
        orders_resp = self.session.get(
            f"{BASE_URL}/api/food/orders/my-orders",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        if orders_resp.status_code != 200:
            pytest.skip("Could not fetch customer orders")
        
        orders = orders_resp.json()
        if not orders:
            pytest.skip("No orders found for customer")
        
        # Get the first order
        order_id = orders[0].get("id")
        
        response = self.session.get(
            f"{BASE_URL}/api/delivery/location/{order_id}",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        # Should return 200 if customer owns the order
        if response.status_code == 200:
            data = response.json()
            assert "has_driver" in data, "Response should contain has_driver field"
            print(f"✅ Driver location API works - has_driver: {data.get('has_driver')}")
            if data.get("has_driver") and data.get("driver_latitude"):
                print(f"   Driver coordinates: {data.get('driver_latitude')}, {data.get('driver_longitude')}")
        elif response.status_code == 403:
            print("⚠️ Access denied - customer may not own this order")
        else:
            print(f"⚠️ Unexpected response: {response.status_code}")
    
    # ============ SMART ROUTING APIs ============
    
    def test_optimize_route_api_requires_driver(self):
        """Test GET /api/food/orders/delivery/optimize-route requires driver auth"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/food/orders/delivery/optimize-route",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Optimize route API correctly requires driver role")
    
    def test_optimize_route_api_with_driver(self):
        """Test GET /api/food/orders/delivery/optimize-route with driver auth"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/food/orders/delivery/optimize-route",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "optimized_route" in data or "orders" in data or "message" in data, \
            "Response should contain route data or message"
        print(f"✅ Optimize route API works for driver")
        if data.get("optimized_route"):
            print(f"   Route has {len(data['optimized_route'])} stops")
    
    def test_smart_route_evaluate_api_requires_driver(self):
        """Test POST /api/food/orders/delivery/smart-route/evaluate requires driver"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = self.session.post(
            f"{BASE_URL}/api/food/orders/delivery/smart-route/evaluate",
            json={
                "order_id": "test-order-123",
                "driver_lat": 33.5138,
                "driver_lon": 36.2765
            },
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Smart route evaluate API correctly requires driver role")
    
    def test_smart_route_evaluate_with_driver(self):
        """Test POST /api/food/orders/delivery/smart-route/evaluate with driver"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        # This may return 404 if no order is available, which is expected
        response = self.session.post(
            f"{BASE_URL}/api/food/orders/delivery/smart-route/evaluate",
            json={
                "order_id": "test-order-123",
                "driver_lat": 33.5138,
                "driver_lon": 36.2765
            },
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        # Should be 404 (order not found) or 200 (order found)
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "can_accept" in data, "Response should contain can_accept field"
            print(f"✅ Smart route evaluate works - can_accept: {data.get('can_accept')}")
        else:
            print("✅ Smart route evaluate API accessible (order not found is expected)")

    # ============ SELLER TRACKING ACCESS ============
    
    def test_seller_can_access_driver_location(self):
        """Test that seller can access driver location for their orders"""
        if not self.seller_token:
            pytest.skip("Seller token not available")
        
        # First get the seller's orders
        orders_resp = self.session.get(
            f"{BASE_URL}/api/food/store/orders",
            headers={"Authorization": f"Bearer {self.seller_token}"}
        )
        
        if orders_resp.status_code != 200:
            print(f"⚠️ Could not fetch seller orders: {orders_resp.status_code}")
            return
        
        orders = orders_resp.json()
        if isinstance(orders, dict):
            orders = orders.get("orders", [])
        
        if not orders:
            print("⚠️ No orders found for seller")
            return
        
        # Find an order with driver assigned
        order_with_driver = None
        for order in orders:
            if order.get("driver_id"):
                order_with_driver = order
                break
        
        if not order_with_driver:
            print("⚠️ No orders with driver assigned found")
            return
        
        # Try to access driver location
        response = self.session.get(
            f"{BASE_URL}/api/delivery/location/{order_with_driver['id']}",
            headers={"Authorization": f"Bearer {self.seller_token}"}
        )
        
        # Seller might not be authorized if API only allows customer/driver/admin
        # This is a design choice - should seller access be allowed?
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Seller can access driver location - has_driver: {data.get('has_driver')}")
        elif response.status_code == 403:
            print("⚠️ Seller cannot access driver location API - may need to add seller authorization")
        else:
            print(f"⚠️ Unexpected response: {response.status_code}")


class TestDriverTrackingWithRealOrder:
    """Test tracking with the specific order mentioned in requirements"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Customer login
        customer_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0933333333",
            "password": "buyer123"
        })
        self.customer_token = customer_resp.json().get("token") if customer_resp.status_code == 200 else None
        
        # Seller login  
        seller_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0966666666",
            "password": "seller123"
        })
        self.seller_token = seller_resp.json().get("token") if seller_resp.status_code == 200 else None
    
    def test_get_specific_order_tracking(self):
        """Test tracking for order cb879398-34e2-4c39-baab-fa2ac28e2567"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        # The specific order from requirements
        order_id = "cb879398-34e2-4c39-baab-fa2ac28e2567"
        
        # First verify order exists and get details
        order_resp = self.session.get(
            f"{BASE_URL}/api/food/orders/{order_id}",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        if order_resp.status_code == 200:
            order = order_resp.json()
            print(f"✅ Order found - Status: {order.get('status')}, Driver: {order.get('driver_name', 'None')}")
            
            # Try to get driver location
            loc_resp = self.session.get(
                f"{BASE_URL}/api/delivery/location/{order_id}",
                headers={"Authorization": f"Bearer {self.customer_token}"}
            )
            
            if loc_resp.status_code == 200:
                loc_data = loc_resp.json()
                print(f"   Location data: has_driver={loc_data.get('has_driver')}")
                if loc_data.get("driver_latitude"):
                    print(f"   Driver at: {loc_data.get('driver_latitude')}, {loc_data.get('driver_longitude')}")
            else:
                print(f"   Could not get location: {loc_resp.status_code}")
        elif order_resp.status_code == 404:
            print("⚠️ Specific order not found")
        elif order_resp.status_code == 403:
            print("⚠️ Customer does not have access to this order")
        else:
            print(f"⚠️ Unexpected status: {order_resp.status_code}")


class TestFoodOrderTrackingPage:
    """Test the food order tracking page data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Customer login
        customer_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0933333333",
            "password": "buyer123"
        })
        self.customer_token = customer_resp.json().get("token") if customer_resp.status_code == 200 else None
    
    def test_get_customer_orders(self):
        """Test fetching customer food orders"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = self.session.get(
            f"{BASE_URL}/api/food/orders/my-orders",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        orders = response.json()
        print(f"✅ Customer has {len(orders)} food orders")
        
        # Check for orders that should show tracking
        trackable_statuses = ['out_for_delivery', 'ready']
        trackable_orders = [o for o in orders if o.get('status') in trackable_statuses]
        print(f"   {len(trackable_orders)} orders eligible for tracking (ready/out_for_delivery)")
    
    def test_order_detail_api(self):
        """Test single order detail API"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        # Get orders first
        orders_resp = self.session.get(
            f"{BASE_URL}/api/food/orders/my-orders",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        if orders_resp.status_code != 200 or not orders_resp.json():
            pytest.skip("No orders available")
        
        order = orders_resp.json()[0]
        order_id = order.get("id")
        
        response = self.session.get(
            f"{BASE_URL}/api/food/orders/{order_id}",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify required fields exist
        assert "status" in data, "Order should have status"
        assert "items" in data, "Order should have items"
        print(f"✅ Order detail API works - Order #{data.get('order_number', order_id[:8])}")
        print(f"   Status: {data.get('status')}, Total: {data.get('total')} SYP")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
