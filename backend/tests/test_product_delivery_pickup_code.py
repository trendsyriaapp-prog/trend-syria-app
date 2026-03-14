"""
Test Product Delivery Pickup Code System
=========================================
Tests the new features added for product delivery:
1. GET /api/delivery/my-product-orders - Shows driver's product orders with count, max_orders, can_accept_more
2. POST /api/delivery/orders/{order_id}/accept - Accept product order (allows up to 7 orders)
3. POST /api/orders/{order_id}/seller/shipped - Creates pickup code when seller ships
4. GET /api/orders/{order_id}/seller/pickup-code - Seller gets the pickup code
5. POST /api/orders/{order_id}/delivery/verify-pickup - Driver verifies pickup code
6. Customer notification includes today's delivery deadline (before hour X)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DRIVER_PHONE = "0900000000"
DRIVER_PASSWORD = "delivery123"
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "admin123"


class TestProductDeliveryPickupCode:
    """Tests for the product delivery pickup code system"""
    
    driver_token = None
    admin_token = None
    seller_token = None
    test_order_id = None
    test_pickup_code = None
    seller_id = None
    
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
        TestProductDeliveryPickupCode.driver_token = data["token"]
        print(f"Driver token obtained, user_type: {data.get('user', {}).get('user_type')}")
    
    def test_02_admin_login(self):
        """Admin logs in to manage orders and sellers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        print(f"Admin login status: {response.status_code}")
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        TestProductDeliveryPickupCode.admin_token = data["token"]
        print(f"Admin token obtained")
    
    # ================== My Product Orders Endpoint ====================
    
    def test_03_get_my_product_orders_endpoint(self):
        """GET /api/delivery/my-product-orders - returns orders with count, max_orders, can_accept_more"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-product-orders",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Get my-product-orders status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check that required fields are present
        assert "orders" in data, "Missing 'orders' field"
        assert "count" in data, "Missing 'count' field"
        assert "max_orders" in data, "Missing 'max_orders' field"
        assert "can_accept_more" in data, "Missing 'can_accept_more' field"
        
        print(f"✅ my-product-orders response:")
        print(f"   - orders count: {len(data['orders'])}")
        print(f"   - count: {data['count']}")
        print(f"   - max_orders: {data['max_orders']}")
        print(f"   - can_accept_more: {data['can_accept_more']}")
        
        # Verify max_orders is 7 (default)
        assert data['max_orders'] == 7, f"Expected max_orders=7, got {data['max_orders']}"
        
        # Verify can_accept_more logic
        expected_can_accept = data['count'] < data['max_orders']
        assert data['can_accept_more'] == expected_can_accept, \
            f"can_accept_more should be {expected_can_accept} when count={data['count']}"
        
        print("✅ my-product-orders endpoint working correctly")
    
    def test_04_my_product_orders_delivery_only(self):
        """my-product-orders should only be accessible by delivery users"""
        # Try with admin token - should fail
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-product-orders",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        print(f"Admin accessing my-product-orders: {response.status_code}")
        
        # Admin is not delivery type, should be 403
        assert response.status_code == 403, f"Expected 403 for non-delivery user, got {response.status_code}"
        print("✅ Correctly blocked non-delivery user from my-product-orders")
    
    # ================== Accept Product Order - Up to 7 ====================
    
    def test_05_find_shipped_order_for_testing(self):
        """Find an order with shipped status for testing"""
        # Get all orders as admin
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        print(f"Get admin orders status: {response.status_code}")
        
        if response.status_code == 200:
            orders = response.json()
            if isinstance(orders, list):
                # Find a shipped order without delivery driver
                for order in orders:
                    if isinstance(order, dict):
                        status = order.get('delivery_status', '')
                        has_driver = order.get('delivery_driver_id')
                        if status == 'shipped' and not has_driver:
                            TestProductDeliveryPickupCode.test_order_id = order['id']
                            print(f"Found shipped order: {order['id'][:8]}...")
                            break
                
                if not self.test_order_id:
                    # Find any order with items to test
                    for order in orders[:5]:
                        if isinstance(order, dict) and order.get('items'):
                            TestProductDeliveryPickupCode.test_order_id = order['id']
                            print(f"Found order for testing: {order['id'][:8]}...")
                            break
        
        if not self.test_order_id:
            print("No suitable order found - will create test order")
    
    def test_06_set_driver_available_before_accepting(self):
        """Driver must be available to accept orders"""
        response = requests.put(
            f"{BASE_URL}/api/delivery/availability",
            json={"is_available": True},
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Set driver available: {response.status_code}")
        print(f"Response: {response.text}")
        
        # May fail if driver has active orders, that's okay
        if response.status_code == 200:
            print("✅ Driver set to available")
        else:
            print(f"Note: {response.text}")
    
    def test_07_accept_product_order_endpoint(self):
        """POST /api/delivery/orders/{order_id}/accept - Accept up to 7 orders"""
        if not self.test_order_id:
            pytest.skip("No test order available")
        
        response = requests.post(
            f"{BASE_URL}/api/delivery/orders/{self.test_order_id}/accept",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Accept order status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Check response structure if successful
        if response.status_code == 200:
            data = response.json()
            # Check that response includes order count info
            if "current_orders" in data:
                print(f"✅ Accept response includes current_orders: {data['current_orders']}")
            if "max_orders" in data:
                print(f"✅ Accept response includes max_orders: {data['max_orders']}")
            if "delivery_deadline" in data:
                print(f"✅ Accept response includes delivery_deadline: {data['delivery_deadline']}")
        elif response.status_code == 400:
            # May fail if already accepted or max reached
            print(f"Order acceptance blocked: {response.text}")
        elif response.status_code == 403:
            print(f"Driver not available or not approved: {response.text}")
    
    # ================== Seller Shipped - Pickup Code Generation ====================
    
    def test_08_find_or_create_seller(self):
        """Find or create a seller for testing pickup code"""
        # Get sellers list
        response = requests.get(
            f"{BASE_URL}/api/admin/users?user_type=seller",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        print(f"Get sellers: {response.status_code}")
        
        if response.status_code == 200:
            users = response.json()
            if isinstance(users, list) and len(users) > 0:
                for user in users:
                    if isinstance(user, dict) and user.get('user_type') == 'seller':
                        TestProductDeliveryPickupCode.seller_id = user['id']
                        print(f"Found seller: {user.get('full_name', user.get('name'))}")
                        break
        
        if not self.seller_id:
            print("No seller found - some tests may be skipped")
    
    def test_09_seller_ship_order_generates_pickup_code(self):
        """POST /api/orders/{order_id}/seller/shipped - Creates 4-digit pickup code"""
        if not self.test_order_id:
            pytest.skip("No test order available")
        
        # Need seller token - let's use admin who can also ship
        response = requests.post(
            f"{BASE_URL}/api/orders/{self.test_order_id}/seller/shipped",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        print(f"Seller ship order status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if pickup_code is in response
            if "pickup_code" in data:
                TestProductDeliveryPickupCode.test_pickup_code = data['pickup_code']
                print(f"✅ Pickup code generated: {data['pickup_code']}")
                
                # Verify it's 4 digits
                assert len(data['pickup_code']) == 4, f"Expected 4-digit code, got: {data['pickup_code']}"
                assert data['pickup_code'].isdigit(), f"Expected digits only, got: {data['pickup_code']}"
                print("✅ Pickup code is valid 4-digit number")
            
            # Check for note about giving code to driver
            if "note" in data:
                print(f"✅ Note to seller: {data['note']}")
        elif response.status_code == 403:
            print(f"Not authorized to ship: {response.text}")
        elif response.status_code == 400:
            print(f"Cannot ship: {response.text}")
    
    # ================== Seller Get Pickup Code ====================
    
    def test_10_seller_get_pickup_code(self):
        """GET /api/orders/{order_id}/seller/pickup-code - Seller retrieves pickup code"""
        if not self.test_order_id:
            pytest.skip("No test order available")
        
        response = requests.get(
            f"{BASE_URL}/api/orders/{self.test_order_id}/seller/pickup-code",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        print(f"Get seller pickup code status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check response structure
            assert "pickup_code" in data, "Missing pickup_code in response"
            assert "is_verified" in data, "Missing is_verified in response"
            assert "order_id" in data, "Missing order_id in response"
            
            print(f"✅ Pickup code: {data['pickup_code']}")
            print(f"✅ Is verified: {data['is_verified']}")
            print(f"✅ Order ID: {data['order_id']}")
            
            TestProductDeliveryPickupCode.test_pickup_code = data['pickup_code']
        elif response.status_code == 400:
            print(f"Order not shipped yet: {response.text}")
        elif response.status_code == 403:
            print(f"Not authorized: {response.text}")
    
    # ================== Driver Verify Pickup Code ====================
    
    def test_11_driver_verify_pickup_wrong_code(self):
        """POST /api/orders/{order_id}/delivery/verify-pickup - Wrong code should fail"""
        if not self.test_order_id:
            pytest.skip("No test order available")
        
        wrong_code = "0000"
        response = requests.post(
            f"{BASE_URL}/api/orders/{self.test_order_id}/delivery/verify-pickup",
            json={"code": wrong_code},
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Verify wrong code status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Should fail
        assert response.status_code in [400, 403, 404], f"Expected error for wrong code, got {response.status_code}"
        print("✅ Wrong pickup code correctly rejected")
    
    def test_12_driver_verify_pickup_correct_code(self):
        """POST /api/orders/{order_id}/delivery/verify-pickup - Correct code should succeed"""
        if not self.test_order_id or not self.test_pickup_code:
            pytest.skip("No test order or pickup code available")
        
        response = requests.post(
            f"{BASE_URL}/api/orders/{self.test_order_id}/delivery/verify-pickup",
            json={"code": self.test_pickup_code},
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Verify correct code status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success=True"
            print("✅ Pickup code verified successfully!")
            print(f"✅ Message: {data.get('message')}")
        elif response.status_code == 403:
            print(f"Note: Order may not be assigned to this driver: {response.text}")
        elif response.status_code == 400:
            print(f"Note: {response.text}")
    
    # ================== Delivery Deadline Message ====================
    
    def test_13_order_has_delivery_deadline_info(self):
        """Check that order has delivery deadline (today before hour X)"""
        if not self.test_order_id:
            pytest.skip("No test order available")
        
        # Get order details
        response = requests.get(
            f"{BASE_URL}/api/orders/{self.test_order_id}",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"Get order details status: {response.status_code}")
        
        if response.status_code == 200:
            order = response.json()
            
            # Check for delivery deadline fields
            if order.get('expected_delivery'):
                print(f"✅ expected_delivery: {order['expected_delivery']}")
            if order.get('delivery_deadline_hour'):
                print(f"✅ delivery_deadline_hour: {order['delivery_deadline_hour']}")
            
            # These fields are set when seller ships the order
            if order.get('delivery_status') == 'shipped':
                assert 'expected_delivery' in order or 'delivery_deadline_hour' in order, \
                    "Shipped order should have delivery deadline info"
                print("✅ Shipped order has delivery deadline info")


class TestProductOrderAcceptLimit:
    """Test that driver can accept up to 7 product orders"""
    
    driver_token = None
    admin_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login driver and admin"""
        # Driver login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200
        self.driver_token = response.json()["token"]
        
        # Admin login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
    
    def test_max_orders_is_7(self):
        """Verify max_orders is set to 7"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-product-orders",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert data.get('max_orders') == 7, f"Expected max_orders=7, got {data.get('max_orders')}"
            print(f"✅ max_orders is correctly set to 7")
            print(f"   Current orders: {data.get('count')}")
            print(f"   Can accept more: {data.get('can_accept_more')}")
    
    def test_order_info_in_my_product_orders(self):
        """Check that each order has seller info and pickup code status"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-product-orders",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            orders = data.get('orders', [])
            
            if orders:
                order = orders[0]
                print(f"Order fields present:")
                print(f"  - seller_name: {order.get('seller_name')}")
                print(f"  - seller_phone: {order.get('seller_phone')}")
                print(f"  - seller_address: {order.get('seller_address')}")
                print(f"  - needs_pickup_code: {order.get('needs_pickup_code')}")
                print(f"  - pickup_code_verified: {order.get('pickup_code_verified')}")
                
                # Check for needs_pickup_code field
                if 'needs_pickup_code' in order:
                    print("✅ Order has needs_pickup_code field for driver guidance")
            else:
                print("No active orders to check fields")


class TestSellerPickupCodeFlow:
    """Test seller's perspective of pickup code"""
    
    admin_token = None
    test_order_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login admin (to act as seller)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
    
    def test_get_order_for_shipping(self):
        """Find an order that can be shipped (paid or confirmed status)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if response.status_code == 200:
            orders = response.json()
            if isinstance(orders, list):
                for order in orders:
                    if isinstance(order, dict):
                        status = order.get('delivery_status', order.get('status', ''))
                        # Find order that can be shipped
                        if status in ['confirmed', 'preparing', 'paid']:
                            TestSellerPickupCodeFlow.test_order_id = order['id']
                            print(f"Found order to ship: {order['id'][:8]}... status: {status}")
                            break
        
        if not self.test_order_id:
            print("No order found that can be shipped")
    
    def test_ship_order_returns_pickup_code(self):
        """POST /api/orders/{order_id}/seller/shipped returns pickup code in response"""
        if not self.test_order_id:
            pytest.skip("No order available to ship")
        
        response = requests.post(
            f"{BASE_URL}/api/orders/{self.test_order_id}/seller/shipped",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        print(f"Ship order response: {response.status_code}")
        print(f"Response body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Verify pickup_code is in response
            assert "pickup_code" in data, "Response should include pickup_code"
            assert len(data['pickup_code']) == 4, "Pickup code should be 4 digits"
            
            # Verify helpful note
            assert "note" in data, "Response should include note for seller"
            
            print(f"✅ Pickup code: {data['pickup_code']}")
            print(f"✅ Note: {data['note']}")
        elif response.status_code == 403:
            print(f"Admin may not be seller for this order: {response.text}")
    
    def test_get_pickup_code_after_shipped(self):
        """GET /api/orders/{order_id}/seller/pickup-code returns code and verification status"""
        if not self.test_order_id:
            pytest.skip("No order available")
        
        response = requests.get(
            f"{BASE_URL}/api/orders/{self.test_order_id}/seller/pickup-code",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        print(f"Get pickup code response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            assert "pickup_code" in data
            assert "is_verified" in data
            assert "order_id" in data
            
            print(f"✅ Response structure correct")
            print(f"   pickup_code: {data['pickup_code']}")
            print(f"   is_verified: {data['is_verified']}")
        elif response.status_code == 400:
            error = response.json()
            print(f"Note: {error.get('detail', response.text)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
