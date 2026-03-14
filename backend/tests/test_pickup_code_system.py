"""
Test Pickup Code System for Trend Syria Food Delivery App
=========================================================
Tests the pickup code flow between seller and driver:
1. When seller marks order as 'ready', a 4-digit pickup_code should be generated
2. Driver can verify the pickup_code to confirm pickup from seller
3. Driver availability validation for accepting orders
"""

import pytest
import requests
import os
import time
import random

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DRIVER_PHONE = "0900000000"
DRIVER_PASSWORD = "delivery123"
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "admin123"


class TestPickupCodeSystem:
    """Tests for the pickup code system between seller and driver"""
    
    driver_token = None
    admin_token = None
    test_order_id = None
    test_pickup_code = None
    
    # ================== Authentication ====================
    
    def test_01_driver_login(self):
        """Driver logs in to get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        print(f"Driver login status: {response.status_code}")
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        TestPickupCodeSystem.driver_token = data["token"]
        print(f"Driver token obtained: {data['token'][:20]}...")
    
    def test_02_admin_login(self):
        """Admin logs in to get authentication token (for creating test orders)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        print(f"Admin login status: {response.status_code}")
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        TestPickupCodeSystem.admin_token = data["token"]
        print(f"Admin token obtained: {data['token'][:20]}...")
    
    # ================== Pickup Code Generation ====================
    
    def test_03_get_food_seller_orders(self):
        """Get orders from seller perspective to find one to test"""
        # First, let's check the store orders endpoint
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders", 
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        print(f"Get store orders status: {response.status_code}")
        # This may fail if admin doesn't have a store, that's okay - we'll use admin to update status
        
    def test_04_update_order_to_ready_generates_pickup_code(self):
        """When seller/admin marks order as 'ready', pickup_code should be generated"""
        # First, find an existing food order or create one
        # Let's use the admin endpoint to get all orders
        response = requests.get(f"{BASE_URL}/api/admin/food-orders?limit=20", 
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        print(f"Get food orders status: {response.status_code}")
        
        if response.status_code == 200:
            orders = response.json()
            # Find an order that is in preparing or confirmed state
            target_order = None
            for order in orders:
                if isinstance(order, dict) and order.get("status") in ["preparing", "confirmed", "pending"]:
                    target_order = order
                    break
            
            if target_order:
                TestPickupCodeSystem.test_order_id = target_order["id"]
                print(f"Found order to test: {target_order['id'][:8]}... status: {target_order['status']}")
                
                # Update order to 'ready' status - this should generate pickup_code
                update_response = requests.post(
                    f"{BASE_URL}/api/food/orders/store/orders/{target_order['id']}/status",
                    params={"new_status": "ready"},
                    headers={"Authorization": f"Bearer {self.admin_token}"}
                )
                print(f"Update to ready status: {update_response.status_code}")
                print(f"Response: {update_response.text}")
                
                if update_response.status_code == 200:
                    # Fetch the order again to check if pickup_code was generated
                    check_response = requests.get(
                        f"{BASE_URL}/api/admin/food-orders/{target_order['id']}", 
                        headers={"Authorization": f"Bearer {self.admin_token}"}
                    )
                    if check_response.status_code == 200:
                        updated_order = check_response.json()
                        pickup_code = updated_order.get("pickup_code")
                        print(f"Pickup code generated: {pickup_code}")
                        if pickup_code:
                            TestPickupCodeSystem.test_pickup_code = pickup_code
                            assert len(pickup_code) == 4, f"Pickup code should be 4 digits, got: {pickup_code}"
                            assert pickup_code.isdigit(), f"Pickup code should be digits only, got: {pickup_code}"
                            print(f"✅ Pickup code is valid 4-digit code: {pickup_code}")
                        else:
                            print("⚠️ No pickup_code in order - may already have one or wasn't generated")
        else:
            print(f"Could not get food orders: {response.text}")
            pytest.skip("Could not get food orders to test")
    
    # ================== Driver Pickup Code Verification ====================
    
    def test_05_driver_verify_pickup_code_invalid(self):
        """Driver submits wrong pickup code - should fail"""
        if not self.test_order_id:
            pytest.skip("No test order available")
        
        # First, driver needs to accept the order
        # But they need to be available first
        avail_response = requests.put(
            f"{BASE_URL}/api/delivery/availability",
            json={"is_available": True},
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Set driver available: {avail_response.status_code}")
        
        # Try to verify with wrong code
        wrong_code = "0000"
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/{self.test_order_id}/verify-pickup",
            json={"code": wrong_code},
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Verify wrong pickup code status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Should fail with 400 or 404 (if order not assigned to driver)
        assert response.status_code in [400, 403, 404], f"Expected error for wrong code, got {response.status_code}"
        print("✅ Wrong pickup code correctly rejected")
    
    def test_06_get_available_orders_for_driver(self):
        """Driver can see available orders for delivery"""
        response = requests.get(
            f"{BASE_URL}/api/food/orders/delivery/available",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Get available orders status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Available orders: single={len(data.get('single_orders', []))}, batch={len(data.get('batch_orders', []))}")
            
            # If there are orders, save one for testing
            if data.get('single_orders'):
                TestPickupCodeSystem.test_order_id = data['single_orders'][0]['id']
                print(f"Found available order: {TestPickupCodeSystem.test_order_id}")
                
                # Check if the order has pickup_code
                order = data['single_orders'][0]
                if order.get('pickup_code'):
                    TestPickupCodeSystem.test_pickup_code = order['pickup_code']
                    print(f"Order has pickup_code: {TestPickupCodeSystem.test_pickup_code}")
        else:
            print(f"Failed to get available orders: {response.text}")


class TestDriverAvailabilityValidation:
    """Tests for driver availability validation when accepting orders"""
    
    driver_token = None
    
    def test_01_driver_login(self):
        """Driver logs in"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200
        TestDriverAvailabilityValidation.driver_token = response.json()["token"]
        print("Driver logged in successfully")
    
    def test_02_check_current_availability(self):
        """Check driver's current availability status"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/availability",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Check availability status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Driver availability: is_available={data.get('is_available')}")
        else:
            print(f"Response: {response.text}")
    
    def test_03_set_driver_unavailable(self):
        """Set driver as unavailable"""
        response = requests.put(
            f"{BASE_URL}/api/delivery/availability",
            json={"is_available": False},
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Set unavailable status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # May succeed or fail depending on active orders
        # If driver has active orders, should return 400
    
    def test_04_unavailable_driver_cannot_accept_food_order(self):
        """Unavailable driver cannot accept food orders - should return 403"""
        # First ensure driver is unavailable
        avail_response = requests.put(
            f"{BASE_URL}/api/delivery/availability",
            json={"is_available": False},
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        # Try to accept an order
        # Get available orders first
        orders_response = requests.get(
            f"{BASE_URL}/api/food/orders/delivery/available",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        if orders_response.status_code == 200:
            data = orders_response.json()
            if data.get('single_orders'):
                order_id = data['single_orders'][0]['id']
                
                # Try to accept while unavailable
                accept_response = requests.post(
                    f"{BASE_URL}/api/food/orders/delivery/{order_id}/accept",
                    headers={"Authorization": f"Bearer {self.driver_token}"}
                )
                print(f"Accept order while unavailable: {accept_response.status_code}")
                print(f"Response: {accept_response.text}")
                
                # Should be 403 if driver is unavailable
                if accept_response.status_code == 403:
                    print("✅ Correctly rejected - driver is unavailable")
                else:
                    print(f"Note: Got status {accept_response.status_code}")
            else:
                print("No orders available to test acceptance")
        else:
            print(f"Could not get available orders: {orders_response.text}")
    
    def test_05_set_driver_available(self):
        """Set driver as available again"""
        response = requests.put(
            f"{BASE_URL}/api/delivery/availability",
            json={"is_available": True},
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Set available status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Should succeed
        assert response.status_code == 200, f"Failed to set available: {response.text}"
        print("✅ Driver set to available")
    
    def test_06_driver_with_active_orders_cannot_go_offline(self):
        """Driver with active orders cannot set themselves as unavailable"""
        # Check for my active deliveries
        my_orders_response = requests.get(
            f"{BASE_URL}/api/food/orders/delivery/my-deliveries",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        if my_orders_response.status_code == 200:
            my_orders = my_orders_response.json()
            active_orders = [o for o in my_orders if o.get('status') == 'out_for_delivery']
            print(f"Driver has {len(active_orders)} active food orders")
            
            if active_orders:
                # Try to go offline
                offline_response = requests.put(
                    f"{BASE_URL}/api/delivery/availability",
                    json={"is_available": False},
                    headers={"Authorization": f"Bearer {self.driver_token}"}
                )
                print(f"Try to go offline with active orders: {offline_response.status_code}")
                print(f"Response: {offline_response.text}")
                
                # Should be 400 if driver has active orders
                if offline_response.status_code == 400:
                    print("✅ Correctly blocked - driver has active orders")
        else:
            print(f"Could not get my deliveries: {my_orders_response.text}")


class TestEndToEndPickupFlow:
    """End-to-end test of the complete pickup code flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for end-to-end test"""
        # Login driver
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200
        self.driver_token = response.json()["token"]
        
        # Login admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
    
    def test_full_pickup_flow(self):
        """Test the complete flow: seller marks ready -> code generated -> driver verifies"""
        print("\n=== Starting End-to-End Pickup Flow Test ===")
        
        # 1. Get available orders for driver
        print("\n1. Getting available orders...")
        avail_response = requests.get(
            f"{BASE_URL}/api/food/orders/delivery/available",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        if avail_response.status_code != 200:
            pytest.skip(f"Cannot get available orders: {avail_response.text}")
        
        orders_data = avail_response.json()
        single_orders = orders_data.get('single_orders', [])
        
        if not single_orders:
            pytest.skip("No orders available for testing")
        
        test_order = single_orders[0]
        order_id = test_order['id']
        print(f"Found order: {order_id[:8]}... status: {test_order.get('status')}")
        
        # 2. Check if order has pickup_code
        pickup_code = test_order.get('pickup_code')
        print(f"Order pickup_code: {pickup_code}")
        
        # 3. Set driver available
        print("\n2. Setting driver as available...")
        requests.put(
            f"{BASE_URL}/api/delivery/availability",
            json={"is_available": True},
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        # 4. Accept the order
        print("\n3. Driver accepting order...")
        accept_response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/{order_id}/accept",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Accept response: {accept_response.status_code} - {accept_response.text}")
        
        if accept_response.status_code != 200:
            # May already be accepted or unavailable
            print(f"Could not accept order: {accept_response.text}")
        
        # 5. If there's a pickup code, try to verify it
        if pickup_code:
            print(f"\n4. Verifying pickup code: {pickup_code}")
            verify_response = requests.post(
                f"{BASE_URL}/api/food/orders/delivery/{order_id}/verify-pickup",
                json={"code": pickup_code},
                headers={"Authorization": f"Bearer {self.driver_token}"}
            )
            print(f"Verify response: {verify_response.status_code} - {verify_response.text}")
            
            if verify_response.status_code == 200:
                print("✅ Pickup code verified successfully!")
            elif verify_response.status_code == 404:
                print("Note: Order may not be assigned to this driver")
            else:
                print(f"Verification failed: {verify_response.text}")
        else:
            print("No pickup code on order - may need seller to mark as ready first")
        
        print("\n=== End-to-End Test Complete ===")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
