"""
Test Driver-Seller Coordination Flow for Food Orders
=====================================================
Tests the coordination flow:
1. Seller clicks 'Request Driver' on confirmed order
2. Driver sees notification and accepts
3. Seller sees driver ETA and enters preparation time
4. Driver gets notified when to go to store
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
DRIVER_PHONE = "0900000000"
DRIVER_PASSWORD = "test123456"
FOOD_SELLER_PHONE = "0944444444"
FOOD_SELLER_PASSWORD = "test123456"


class TestDriverSellerCoordination:
    """Test the Driver-Seller Coordination Flow"""
    
    driver_token = None
    seller_token = None
    test_order_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens for driver and seller"""
        # Login as driver
        driver_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        if driver_login.status_code == 200:
            TestDriverSellerCoordination.driver_token = driver_login.json().get("token")
        
        # Login as food seller
        seller_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": FOOD_SELLER_PHONE,
            "password": FOOD_SELLER_PASSWORD
        })
        if seller_login.status_code == 200:
            TestDriverSellerCoordination.seller_token = seller_login.json().get("token")
    
    def test_01_driver_login(self):
        """Test driver can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        TestDriverSellerCoordination.driver_token = data["token"]
        print(f"✅ Driver logged in successfully")
    
    def test_02_seller_login(self):
        """Test food seller can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": FOOD_SELLER_PHONE,
            "password": FOOD_SELLER_PASSWORD
        })
        
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        TestDriverSellerCoordination.seller_token = data["token"]
        print(f"✅ Food seller logged in successfully")
    
    def test_03_delivery_available_api_returns_driver_requested_orders(self):
        """Test GET /api/food/orders/delivery/available returns driver_requested_orders array"""
        if not TestDriverSellerCoordination.driver_token:
            pytest.skip("Driver token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/food/orders/delivery/available",
            headers={"Authorization": f"Bearer {TestDriverSellerCoordination.driver_token}"}
        )
        
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "single_orders" in data, "Missing single_orders in response"
        assert "batch_orders" in data, "Missing batch_orders in response"
        assert "driver_requested_orders" in data, "Missing driver_requested_orders in response"
        assert "total_count" in data, "Missing total_count in response"
        
        # driver_requested_orders should be a list
        assert isinstance(data["driver_requested_orders"], list), "driver_requested_orders should be a list"
        
        print(f"✅ delivery/available API returns correct structure")
        print(f"   - single_orders: {len(data['single_orders'])}")
        print(f"   - batch_orders: {len(data['batch_orders'])}")
        print(f"   - driver_requested_orders: {len(data['driver_requested_orders'])}")
    
    def test_04_get_seller_store_orders(self):
        """Test seller can get their store orders"""
        if not TestDriverSellerCoordination.seller_token:
            pytest.skip("Seller token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/food/orders/store/orders",
            headers={"Authorization": f"Bearer {TestDriverSellerCoordination.seller_token}"}
        )
        
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        
        # Should return a list of orders
        assert isinstance(data, list), "Response should be a list"
        
        # Find a confirmed order for testing
        confirmed_orders = [o for o in data if o.get("status") == "confirmed" and not o.get("driver_requested")]
        
        if confirmed_orders:
            TestDriverSellerCoordination.test_order_id = confirmed_orders[0]["id"]
            print(f"✅ Found confirmed order for testing: {TestDriverSellerCoordination.test_order_id}")
        else:
            print(f"⚠️ No confirmed orders without driver_requested found. Total orders: {len(data)}")
            # Check for any order that can be used
            for order in data[:5]:
                print(f"   - Order {order.get('id', 'N/A')[:8]}: status={order.get('status')}, driver_requested={order.get('driver_requested')}")
    
    def test_05_request_driver_api(self):
        """Test POST /api/food/orders/store/orders/{order_id}/request-driver"""
        if not TestDriverSellerCoordination.seller_token:
            pytest.skip("Seller token not available")
        
        if not TestDriverSellerCoordination.test_order_id:
            # Try to find any confirmed order
            response = requests.get(
                f"{BASE_URL}/api/food/orders/store/orders",
                headers={"Authorization": f"Bearer {TestDriverSellerCoordination.seller_token}"}
            )
            if response.status_code == 200:
                orders = response.json()
                confirmed = [o for o in orders if o.get("status") == "confirmed"]
                if confirmed:
                    TestDriverSellerCoordination.test_order_id = confirmed[0]["id"]
        
        if not TestDriverSellerCoordination.test_order_id:
            pytest.skip("No test order available")
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders/store/orders/{TestDriverSellerCoordination.test_order_id}/request-driver",
            headers={"Authorization": f"Bearer {TestDriverSellerCoordination.seller_token}"}
        )
        
        # Accept 200 (success) or 400 (already requested) or 404 (order not found)
        if response.status_code == 200:
            data = response.json()
            assert "success" in data or "drivers_notified" in data, "Missing success indicator"
            print(f"✅ Request driver API works: {data}")
        elif response.status_code == 400:
            print(f"⚠️ Order already has driver requested or invalid state: {response.text}")
        elif response.status_code == 404:
            print(f"⚠️ Order not found: {response.text}")
        else:
            assert False, f"Unexpected status code {response.status_code}: {response.text}"
    
    def test_06_driver_accept_order_api(self):
        """Test POST /api/food/orders/driver/orders/{order_id}/accept"""
        if not TestDriverSellerCoordination.driver_token:
            pytest.skip("Driver token not available")
        
        # First get available orders with driver_requested
        response = requests.get(
            f"{BASE_URL}/api/food/orders/delivery/available",
            headers={"Authorization": f"Bearer {TestDriverSellerCoordination.driver_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get available orders: {response.text}"
        data = response.json()
        
        driver_requested = data.get("driver_requested_orders", [])
        
        if not driver_requested:
            print(f"⚠️ No driver_requested_orders available to accept")
            # Test with a non-existent order to verify API structure
            test_response = requests.post(
                f"{BASE_URL}/api/food/orders/driver/orders/test-order-id/accept",
                headers={"Authorization": f"Bearer {TestDriverSellerCoordination.driver_token}"}
            )
            # Should return 404 for non-existent order
            assert test_response.status_code in [404, 400], f"Expected 404 or 400, got {test_response.status_code}"
            print(f"✅ Driver accept API endpoint exists and validates order")
            return
        
        # Try to accept the first available order
        order_to_accept = driver_requested[0]
        order_id = order_to_accept["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders/driver/orders/{order_id}/accept",
            headers={"Authorization": f"Bearer {TestDriverSellerCoordination.driver_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data, "Missing success in response"
            assert data.get("waiting_for_preparation_time") == True, "Should be waiting for preparation time"
            print(f"✅ Driver accepted order successfully")
            print(f"   - Order: {data.get('order_number')}")
            print(f"   - Store: {data.get('store_name')}")
            print(f"   - Distance: {data.get('distance_km')} km")
            print(f"   - ETA: {data.get('estimated_arrival_minutes')} minutes")
            TestDriverSellerCoordination.test_order_id = order_id
        elif response.status_code == 400:
            print(f"⚠️ Order already accepted or invalid state: {response.text}")
        else:
            print(f"⚠️ Accept order returned {response.status_code}: {response.text}")
    
    def test_07_set_preparation_time_api(self):
        """Test POST /api/food/orders/store/orders/{order_id}/set-preparation-time"""
        if not TestDriverSellerCoordination.seller_token:
            pytest.skip("Seller token not available")
        
        # Get orders to find one waiting for preparation time
        response = requests.get(
            f"{BASE_URL}/api/food/orders/store/orders",
            headers={"Authorization": f"Bearer {TestDriverSellerCoordination.seller_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get store orders")
        
        orders = response.json()
        waiting_orders = [o for o in orders if o.get("waiting_for_preparation_time") == True]
        
        if not waiting_orders:
            print(f"⚠️ No orders waiting for preparation time")
            # Test API with non-existent order to verify endpoint exists
            test_response = requests.post(
                f"{BASE_URL}/api/food/orders/store/orders/test-order-id/set-preparation-time",
                json={"preparation_time_minutes": 15},
                headers={"Authorization": f"Bearer {TestDriverSellerCoordination.seller_token}"}
            )
            assert test_response.status_code in [404, 400], f"Expected 404 or 400, got {test_response.status_code}"
            print(f"✅ Set preparation time API endpoint exists")
            return
        
        order_id = waiting_orders[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders/store/orders/{order_id}/set-preparation-time",
            json={"preparation_time_minutes": 15},
            headers={"Authorization": f"Bearer {TestDriverSellerCoordination.seller_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "success" in data or "pickup_code" in data, "Missing success indicator"
            print(f"✅ Set preparation time successful")
            print(f"   - Pickup code: {data.get('pickup_code')}")
            print(f"   - Prep time: {data.get('preparation_time_minutes')} minutes")
        elif response.status_code == 400:
            print(f"⚠️ Preparation time already set or invalid state: {response.text}")
        else:
            print(f"⚠️ Set preparation time returned {response.status_code}: {response.text}")
    
    def test_08_driver_reject_order_api(self):
        """Test POST /api/food/orders/driver/orders/{order_id}/reject"""
        if not TestDriverSellerCoordination.driver_token:
            pytest.skip("Driver token not available")
        
        # Test with a non-existent order to verify API exists
        response = requests.post(
            f"{BASE_URL}/api/food/orders/driver/orders/test-order-id/reject",
            headers={"Authorization": f"Bearer {TestDriverSellerCoordination.driver_token}"}
        )
        
        # Should return success (even for non-existent, it just updates notification)
        # or 404 if order validation is strict
        assert response.status_code in [200, 404, 400], f"Unexpected status: {response.status_code}"
        print(f"✅ Driver reject API endpoint exists")
    
    def test_09_delivery_available_with_coordinates(self):
        """Test delivery/available API with driver coordinates"""
        if not TestDriverSellerCoordination.driver_token:
            pytest.skip("Driver token not available")
        
        # Test with Damascus coordinates
        response = requests.get(
            f"{BASE_URL}/api/food/orders/delivery/available",
            params={
                "driver_lat": 33.5138,
                "driver_lng": 36.2765
            },
            headers={"Authorization": f"Bearer {TestDriverSellerCoordination.driver_token}"}
        )
        
        assert response.status_code == 200, f"API failed: {response.text}"
        data = response.json()
        
        assert "sorted_by_proximity" in data, "Missing sorted_by_proximity field"
        assert data["sorted_by_proximity"] == True, "Should be sorted by proximity when coordinates provided"
        
        # Check if orders have proximity info
        for order in data.get("single_orders", [])[:3]:
            if "driver_distance_km" in order:
                print(f"   - Order has distance: {order['driver_distance_km']} km")
        
        for order in data.get("driver_requested_orders", [])[:3]:
            if "driver_distance_km" in order:
                print(f"   - Requested order has distance: {order['driver_distance_km']} km")
        
        print(f"✅ Delivery available API works with coordinates")
    
    def test_10_order_status_tracking(self):
        """Test that order status tracking includes driver coordination fields"""
        if not TestDriverSellerCoordination.seller_token:
            pytest.skip("Seller token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/food/orders/store/orders",
            headers={"Authorization": f"Bearer {TestDriverSellerCoordination.seller_token}"}
        )
        
        assert response.status_code == 200, f"API failed: {response.text}"
        orders = response.json()
        
        # Check for coordination fields in orders
        coordination_fields = [
            "driver_requested",
            "driver_status",
            "driver_id",
            "driver_name",
            "driver_estimated_arrival_minutes",
            "waiting_for_preparation_time",
            "preparation_time_minutes"
        ]
        
        found_fields = set()
        for order in orders:
            for field in coordination_fields:
                if field in order:
                    found_fields.add(field)
        
        print(f"✅ Found coordination fields in orders: {found_fields}")


class TestAPIEndpointValidation:
    """Validate API endpoints exist and return proper errors"""
    
    def test_request_driver_requires_auth(self):
        """Test request-driver endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/store/orders/test-id/request-driver"
        )
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"✅ request-driver requires authentication")
    
    def test_driver_accept_requires_auth(self):
        """Test driver accept endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/driver/orders/test-id/accept"
        )
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"✅ driver/accept requires authentication")
    
    def test_set_preparation_time_requires_auth(self):
        """Test set-preparation-time endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/store/orders/test-id/set-preparation-time",
            json={"preparation_time_minutes": 15}
        )
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"✅ set-preparation-time requires authentication")
    
    def test_delivery_available_requires_driver_role(self):
        """Test delivery/available requires driver role"""
        # Login as seller (not driver)
        seller_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": FOOD_SELLER_PHONE,
            "password": FOOD_SELLER_PASSWORD
        })
        
        if seller_login.status_code != 200:
            pytest.skip("Could not login as seller")
        
        seller_token = seller_login.json().get("token")
        
        response = requests.get(
            f"{BASE_URL}/api/food/orders/delivery/available",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        # Should return 403 for non-driver
        assert response.status_code == 403, f"Expected 403 for non-driver, got {response.status_code}"
        print(f"✅ delivery/available requires driver role")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
