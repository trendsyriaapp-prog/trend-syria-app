"""
Tests for Driver Availability System - P0 Backend Validation
============================================================
Features tested:
1. P0: Unavailable driver cannot accept food orders
2. P0: Unavailable driver cannot accept product delivery orders 
3. P0: Unavailable driver cannot accept batch orders
4. P0: Driver with active orders cannot set himself unavailable
5. Driver can toggle availability when no active orders
6. Driver can set available regardless of active orders
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DRIVER_CREDENTIALS = {
    "phone": "0900000000",
    "password": "delivery123"
}

ADMIN_CREDENTIALS = {
    "phone": os.getenv("TEST_ADMIN_PHONE", "0911111111"), 
    "password": "admin123"
}


class TestDriverAvailabilityValidation:
    """P0 Tests: Driver availability system backend validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup driver authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as driver
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json=DRIVER_CREDENTIALS
        )
        assert login_response.status_code == 200, f"Driver login failed: {login_response.text}"
        
        data = login_response.json()
        self.driver_token = data["token"]
        self.driver_id = data["user"]["id"]
        self.session.headers.update({"Authorization": f"Bearer {self.driver_token}"})
        
    def test_01_get_current_availability_status(self):
        """Test fetching driver's current availability status"""
        response = self.session.get(f"{BASE_URL}/api/delivery/availability")
        
        assert response.status_code == 200, f"Failed to get availability: {response.text}"
        data = response.json()
        
        assert "is_available" in data, "Response should contain is_available field"
        print(f"✅ Current availability status: {data['is_available']}")
        
    def test_02_unavailable_driver_cannot_accept_food_order(self):
        """P0: Unavailable driver should NOT be able to accept food orders"""
        # First, ensure driver is unavailable
        # Try setting unavailable (might fail if active orders - that's OK)
        self.session.put(
            f"{BASE_URL}/api/delivery/availability",
            json={"is_available": False}
        )
        
        # Get current availability
        avail_check = self.session.get(f"{BASE_URL}/api/delivery/availability")
        current_status = avail_check.json().get("is_available", True)
        
        if not current_status:
            # Driver is unavailable - try to accept an order
            # Get available food orders first
            food_orders = self.session.get(f"{BASE_URL}/api/food/orders/delivery/available")
            
            if food_orders.status_code == 200:
                orders_data = food_orders.json()
                single_orders = orders_data.get("single_orders", [])
                
                if single_orders:
                    # Try to accept the first available order
                    order_id = single_orders[0]["id"]
                    accept_response = self.session.post(
                        f"{BASE_URL}/api/food/orders/delivery/{order_id}/accept"
                    )
                    
                    # Should be rejected with 403
                    assert accept_response.status_code == 403, \
                        f"Unavailable driver should NOT accept food order. Got: {accept_response.status_code} - {accept_response.text}"
                    
                    error_detail = accept_response.json().get("detail", "")
                    assert "متاح" in error_detail or "available" in error_detail.lower(), \
                        f"Error should mention availability. Got: {error_detail}"
                    
                    print(f"✅ Unavailable driver correctly rejected from accepting food order: {error_detail}")
                else:
                    print("⚠️ No food orders available to test acceptance rejection")
            else:
                print(f"⚠️ Could not fetch available food orders: {food_orders.status_code}")
        else:
            print("⚠️ Driver has active orders, cannot set unavailable to test rejection")
            
    def test_03_unavailable_driver_cannot_accept_product_delivery(self):
        """P0: Unavailable driver should NOT be able to accept product delivery orders"""
        # Check availability
        avail_check = self.session.get(f"{BASE_URL}/api/delivery/availability")
        current_status = avail_check.json().get("is_available", True)
        
        if not current_status:
            # Get available product orders
            orders_response = self.session.get(f"{BASE_URL}/api/delivery/available-orders")
            
            if orders_response.status_code == 200:
                orders = orders_response.json()
                
                if orders and len(orders) > 0:
                    # Try to accept product order
                    order_id = orders[0]["id"]
                    accept_response = self.session.post(
                        f"{BASE_URL}/api/delivery/orders/{order_id}/accept"
                    )
                    
                    # Should be rejected with 403
                    assert accept_response.status_code == 403, \
                        f"Unavailable driver should NOT accept product order. Got: {accept_response.status_code}"
                    
                    print("✅ Unavailable driver correctly rejected from accepting product order")
                else:
                    print("⚠️ No product orders available to test")
            else:
                print(f"⚠️ Could not fetch available orders: {orders_response.status_code}")
        else:
            print("⚠️ Driver is available, skipping unavailable rejection test")
            
    def test_04_unavailable_driver_cannot_accept_batch_orders(self):
        """P0: Unavailable driver should NOT be able to accept batch food orders"""
        avail_check = self.session.get(f"{BASE_URL}/api/delivery/availability")
        current_status = avail_check.json().get("is_available", True)
        
        if not current_status:
            # Get available batch orders
            food_orders = self.session.get(f"{BASE_URL}/api/food/orders/delivery/available")
            
            if food_orders.status_code == 200:
                orders_data = food_orders.json()
                batch_orders = orders_data.get("batch_orders", [])
                
                if batch_orders:
                    batch_id = batch_orders[0].get("batch_id")
                    if batch_id:
                        accept_response = self.session.post(
                            f"{BASE_URL}/api/food/orders/delivery/batch/{batch_id}/accept"
                        )
                        
                        # Should be rejected
                        assert accept_response.status_code == 403, \
                            f"Unavailable driver should NOT accept batch. Got: {accept_response.status_code}"
                        print("✅ Unavailable driver correctly rejected from accepting batch orders")
                else:
                    print("⚠️ No batch orders available to test")
        else:
            print("⚠️ Driver is available, skipping batch rejection test")
            
    def test_05_driver_with_active_orders_cannot_set_unavailable(self):
        """P0: Driver with active orders should NOT be able to set unavailable"""
        # First check if driver has active orders
        my_orders = self.session.get(f"{BASE_URL}/api/delivery/my-food-orders")
        my_product_orders = self.session.get(f"{BASE_URL}/api/delivery/my-orders")
        
        active_food = 0
        active_product = 0
        
        if my_orders.status_code == 200:
            food_orders = my_orders.json()
            active_food = sum(1 for o in food_orders if o.get("status") == "out_for_delivery")
            
        if my_product_orders.status_code == 200:
            product_orders = my_product_orders.json()
            active_product = sum(1 for o in product_orders if o.get("delivery_status") in ["out_for_delivery", "on_the_way", "picked_up"])
        
        total_active = active_food + active_product
        print(f"📊 Driver has {total_active} active orders (Food: {active_food}, Product: {active_product})")
        
        if total_active > 0:
            # Driver has active orders - try to set unavailable
            unavail_response = self.session.put(
                f"{BASE_URL}/api/delivery/availability",
                json={"is_available": False}
            )
            
            # Should be rejected with 400
            assert unavail_response.status_code == 400, \
                f"Driver with active orders should NOT set unavailable. Got: {unavail_response.status_code} - {unavail_response.text}"
            
            error_detail = unavail_response.json().get("detail", "")
            assert "طلب" in error_detail or "order" in error_detail.lower() or "نشط" in error_detail, \
                f"Error should mention active orders. Got: {error_detail}"
            
            print(f"✅ Driver with {total_active} active orders correctly prevented from setting unavailable: {error_detail}")
        else:
            print("⚠️ Driver has no active orders - cannot test prevention. Setting available first.")
            # Set available first then try unavailable
            self.session.put(f"{BASE_URL}/api/delivery/availability", json={"is_available": True})
            
            # Now set unavailable should work
            unavail_response = self.session.put(
                f"{BASE_URL}/api/delivery/availability",
                json={"is_available": False}
            )
            
            if unavail_response.status_code == 200:
                print("✅ Driver with no active orders CAN set unavailable")
            else:
                print(f"⚠️ Unexpected error setting unavailable: {unavail_response.text}")
                
    def test_06_driver_can_always_set_available(self):
        """Driver can always set himself available (even with active orders)"""
        # Try to set available
        avail_response = self.session.put(
            f"{BASE_URL}/api/delivery/availability",
            json={"is_available": True}
        )
        
        assert avail_response.status_code == 200, \
            f"Driver should always be able to set available. Got: {avail_response.status_code} - {avail_response.text}"
        
        data = avail_response.json()
        assert data.get("is_available"), "Driver should now be available"
        
        print(f"✅ Driver successfully set available: {data.get('message', '')}")
        
    def test_07_available_driver_can_accept_food_order(self):
        """Available driver should be able to accept food orders"""
        # Ensure driver is available
        self.session.put(f"{BASE_URL}/api/delivery/availability", json={"is_available": True})
        
        # Get available food orders
        food_orders = self.session.get(f"{BASE_URL}/api/food/orders/delivery/available")
        
        if food_orders.status_code == 200:
            orders_data = food_orders.json()
            single_orders = orders_data.get("single_orders", [])
            
            if single_orders:
                order_id = single_orders[0]["id"]
                accept_response = self.session.post(
                    f"{BASE_URL}/api/food/orders/delivery/{order_id}/accept"
                )
                
                # Should succeed with 200 (or 404 if order already taken, or 400 for limits)
                assert accept_response.status_code in [200, 404, 400], \
                    f"Available driver should accept order or get proper error. Got: {accept_response.status_code} - {accept_response.text}"
                
                if accept_response.status_code == 200:
                    print("✅ Available driver successfully accepted food order")
                elif accept_response.status_code == 404:
                    print("⚠️ Order already taken by another driver")
                else:
                    print(f"⚠️ Order acceptance blocked by limits: {accept_response.text}")
            else:
                print("⚠️ No food orders available to test")
        else:
            print(f"⚠️ Could not fetch food orders: {food_orders.status_code}")


class TestDriverAvailabilityAPI:
    """Test driver availability API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as driver
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json=DRIVER_CREDENTIALS
        )
        assert login_response.status_code == 200
        
        data = login_response.json()
        self.session.headers.update({"Authorization": f"Bearer {data['token']}"})
        
    def test_availability_endpoint_exists(self):
        """GET /api/delivery/availability should exist and return proper structure"""
        response = self.session.get(f"{BASE_URL}/api/delivery/availability")
        
        assert response.status_code == 200, f"Availability endpoint should exist: {response.status_code}"
        data = response.json()
        
        assert "is_available" in data
        assert isinstance(data["is_available"], bool)
        
        print(f"✅ Availability endpoint working. Status: {'متاح' if data['is_available'] else 'غير متاح'}")
        
    def test_availability_update_endpoint_exists(self):
        """PUT /api/delivery/availability should exist"""
        response = self.session.put(
            f"{BASE_URL}/api/delivery/availability",
            json={"is_available": True}
        )
        
        # Either 200 (success) or 400 (has active orders) are valid
        assert response.status_code in [200, 400], \
            f"Availability update endpoint should exist: {response.status_code}"
        
        print(f"✅ Availability update endpoint working. Response: {response.status_code}")


class TestDriverOrdersVisibility:
    """Test that unavailable drivers don't see orders in their list"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json=DRIVER_CREDENTIALS
        )
        assert login_response.status_code == 200
        
        data = login_response.json()
        self.session.headers.update({"Authorization": f"Bearer {data['token']}"})
        
    def test_available_orders_endpoint(self):
        """GET /api/delivery/available-orders should return orders list"""
        response = self.session.get(f"{BASE_URL}/api/delivery/available-orders")
        
        assert response.status_code == 200, f"Available orders endpoint failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return a list of orders"
        print(f"✅ Available orders endpoint working. Found {len(data)} orders")
        
    def test_available_food_orders_endpoint(self):
        """GET /api/food/orders/delivery/available should return food orders"""
        response = self.session.get(f"{BASE_URL}/api/food/orders/delivery/available")
        
        assert response.status_code == 200, f"Food orders endpoint failed: {response.text}"
        data = response.json()
        
        assert "single_orders" in data or "batch_orders" in data, \
            "Should return structured food orders data"
        
        single_count = len(data.get("single_orders", []))
        batch_count = len(data.get("batch_orders", []))
        
        print(f"✅ Food orders endpoint working. Single: {single_count}, Batch: {batch_count}")
        
    def test_my_food_orders_endpoint(self):
        """GET /api/delivery/my-food-orders should return driver's food orders"""
        response = self.session.get(f"{BASE_URL}/api/delivery/my-food-orders")
        
        assert response.status_code == 200, f"My food orders endpoint failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Should return a list"
        print(f"✅ My food orders endpoint working. Found {len(data)} orders")
        
        # Count active orders
        active = sum(1 for o in data if o.get("status") == "out_for_delivery")
        print(f"   Active food orders: {active}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
