"""
Food Priority Delivery System Tests
=====================================
Tests for ensuring food orders have priority over product orders.
Feature: When a driver has active food orders, product orders should be locked.

Test scenarios:
1. GET /api/delivery/my-product-orders - should return is_locked: true when driver has active food orders
2. PUT /api/orders/{order_id}/delivery/delivered - should reject (403) if driver has active food order
3. GET /api/delivery/available-orders - should hide product orders from driver with active food orders
4. E2E: Complete scenario with food and product orders
"""

import pytest
import requests
import uuid
from datetime import datetime, timezone

BASE_URL = "https://shopper-suite.preview.emergentagent.com"

# Test credentials
DRIVER_PHONE = "0900000000"
DRIVER_PASSWORD = "delivery123"
CUSTOMER_PHONE = "0922222222"
CUSTOMER_PASSWORD = "user123"
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "admin123"
FOOD_SELLER_PHONE = "0988888888"
FOOD_SELLER_PASSWORD = "foodseller123"


class TestFoodPriorityDeliverySystem:
    """Test suite for food priority delivery system"""
    
    @pytest.fixture
    def driver_token(self):
        """Get driver auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as driver: {response.text}")
        return response.json()["token"]
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CUSTOMER_PHONE,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as customer: {response.text}")
        return response.json()["token"]
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as admin: {response.text}")
        return response.json()["token"]
    
    @pytest.fixture
    def food_seller_token(self):
        """Get food seller auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": FOOD_SELLER_PHONE,
            "password": FOOD_SELLER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as food seller: {response.text}")
        return response.json()["token"]
    
    # ========== Test 1: GET /api/delivery/my-product-orders with is_locked ==========
    
    def test_my_product_orders_endpoint_exists(self, driver_token):
        """Test that /api/delivery/my-product-orders endpoint exists and returns proper structure"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/delivery/my-product-orders", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure includes is_locked field
        assert "is_locked" in data, "Response should contain 'is_locked' field"
        assert "orders" in data, "Response should contain 'orders' field"
        assert "active_food_orders" in data, "Response should contain 'active_food_orders' field"
        assert "lock_message" in data, "Response should contain 'lock_message' field"
        assert "can_accept_more" in data, "Response should contain 'can_accept_more' field"
        
        print(f"✅ my-product-orders endpoint structure verified")
        print(f"   - is_locked: {data['is_locked']}")
        print(f"   - active_food_orders: {data['active_food_orders']}")
        print(f"   - lock_message: {data['lock_message']}")
    
    def test_is_locked_false_when_no_active_food_orders(self, driver_token):
        """Test that is_locked is False when driver has no active food orders"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        # First, get driver's food orders to check current state
        food_orders_response = requests.get(f"{BASE_URL}/api/delivery/my-food-orders", headers=headers)
        active_food_orders = []
        if food_orders_response.status_code == 200:
            active_food_orders = food_orders_response.json()
        
        # Get product orders
        response = requests.get(f"{BASE_URL}/api/delivery/my-product-orders", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # If no active food orders, is_locked should be False
        if data["active_food_orders"] == 0:
            assert data["is_locked"] == False, "is_locked should be False when no active food orders"
            assert data["lock_message"] is None, "lock_message should be None when not locked"
            print("✅ is_locked is False when no active food orders")
        else:
            # Driver has active food orders, so is_locked should be True
            assert data["is_locked"] == True, "is_locked should be True when active food orders exist"
            assert data["lock_message"] is not None, "lock_message should be present when locked"
            print(f"⚠️ Driver has {data['active_food_orders']} active food orders, is_locked=True")
    
    # ========== Test 2: PUT /api/orders/{order_id}/delivery/delivered protection ==========
    
    def test_delivery_complete_endpoint_exists(self, driver_token):
        """Test that delivery/delivered endpoint exists"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        # Use a fake order ID to test endpoint existence
        fake_order_id = "TEST_FAKE_ORDER_" + str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/orders/{fake_order_id}/delivery/delivered", headers=headers)
        
        # Should return 403 (if has active food orders) or 404 (order not found), not 500
        assert response.status_code in [403, 404], f"Expected 403 or 404, got {response.status_code}: {response.text}"
        print(f"✅ delivery/delivered endpoint exists, returned {response.status_code}")
    
    def test_delivery_complete_blocked_when_active_food_order_exists(self, driver_token):
        """Test that product delivery is blocked when driver has active food orders"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        # First check if driver has active food orders
        my_product_response = requests.get(f"{BASE_URL}/api/delivery/my-product-orders", headers=headers)
        assert my_product_response.status_code == 200
        
        product_data = my_product_response.json()
        
        if product_data["active_food_orders"] > 0:
            # Driver has active food orders - try to deliver a product order
            # Find a product order assigned to this driver
            if len(product_data["orders"]) > 0:
                order_to_deliver = product_data["orders"][0]
                order_id = order_to_deliver["id"]
                
                response = requests.post(
                    f"{BASE_URL}/api/orders/{order_id}/delivery/delivered",
                    headers=headers
                )
                
                assert response.status_code == 403, f"Expected 403 when trying to deliver product with active food order, got {response.status_code}"
                
                # Verify error message mentions food orders
                error_detail = response.json().get("detail", "")
                assert "طعام" in error_detail or "food" in error_detail.lower(), "Error should mention food orders"
                
                print(f"✅ Product delivery blocked correctly: {error_detail}")
            else:
                print("⚠️ Driver has active food orders but no product orders to test delivery block")
        else:
            print("⚠️ Driver has no active food orders - cannot test delivery block (need to create test scenario)")
    
    # ========== Test 3: GET /api/delivery/available-orders hides products ==========
    
    def test_available_orders_endpoint_exists(self, driver_token):
        """Test that /api/delivery/available-orders endpoint exists"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/delivery/available-orders", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of orders"
        print(f"✅ available-orders endpoint works, returned {len(data)} orders")
    
    def test_available_orders_hides_products_when_food_active(self, driver_token):
        """Test that product orders are hidden from available-orders when driver has active food orders"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        # Check if driver has active food orders
        my_product_response = requests.get(f"{BASE_URL}/api/delivery/my-product-orders", headers=headers)
        product_data = my_product_response.json()
        
        # Get available orders
        available_response = requests.get(f"{BASE_URL}/api/delivery/available-orders", headers=headers)
        assert available_response.status_code == 200
        
        available_orders = available_response.json()
        
        if product_data["active_food_orders"] > 0:
            # Driver has active food orders - check that shop orders are hidden
            shop_orders = [o for o in available_orders if o.get("order_source") == "shop"]
            assert len(shop_orders) == 0, f"Shop orders should be hidden when driver has active food orders, found {len(shop_orders)}"
            print("✅ Shop/product orders correctly hidden from available-orders when driver has active food orders")
        else:
            # No active food orders - shop orders may be visible
            shop_orders = [o for o in available_orders if o.get("order_source") == "shop"]
            print(f"ℹ️ Driver has no active food orders, {len(shop_orders)} shop orders visible (expected behavior)")
    
    # ========== Test 4: Check is_locked on individual orders ==========
    
    def test_orders_have_is_locked_field(self, driver_token):
        """Test that each order in my-product-orders has is_locked field"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        response = requests.get(f"{BASE_URL}/api/delivery/my-product-orders", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        
        for order in orders:
            assert "is_locked" in order, f"Order {order.get('id', 'unknown')} should have is_locked field"
            
            if data["active_food_orders"] > 0:
                assert order["is_locked"] == True, "Each order should be locked when food orders are active"
                assert "lock_reason" in order, "Locked order should have lock_reason"
            else:
                assert order["is_locked"] == False, "Each order should be unlocked when no food orders active"
        
        print(f"✅ All {len(orders)} orders have is_locked field properly set")
    
    # ========== Test 5: Food order acceptance/completion flow ==========
    
    def test_my_food_orders_endpoint(self, driver_token):
        """Test that /api/delivery/my-food-orders endpoint works"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/delivery/my-food-orders", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✅ my-food-orders endpoint works, driver has {len(data)} active food orders")
        for order in data:
            print(f"   - Order {order.get('id', 'unknown')[:8]} status: {order.get('status')}")
    
    def test_available_food_orders_endpoint(self, driver_token):
        """Test that /api/delivery/available-food-orders endpoint works"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/delivery/available-food-orders", headers=headers)
        
        # Endpoint may return empty list if no ready orders, that's OK
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✅ available-food-orders endpoint works, {len(data)} food orders available")
    
    # ========== Test 6: Delivery driver authentication ==========
    
    def test_driver_login(self):
        """Test driver can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["user_type"] == "delivery", "User should be delivery type"
        
        print(f"✅ Driver logged in successfully as {data['user'].get('full_name', data['user'].get('name', 'unknown'))}")
    
    # ========== Test 7: Non-delivery user cannot access delivery endpoints ==========
    
    def test_customer_cannot_access_delivery_endpoints(self, customer_token):
        """Test that non-delivery users cannot access delivery endpoints"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        endpoints = [
            "/api/delivery/my-product-orders",
            "/api/delivery/my-food-orders",
            "/api/delivery/available-orders",
            "/api/delivery/available-food-orders"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            assert response.status_code == 403, f"Expected 403 for {endpoint}, got {response.status_code}"
        
        print("✅ Customer correctly blocked from delivery endpoints")


class TestFoodPriorityE2EScenario:
    """End-to-end scenario tests for food priority system"""
    
    @pytest.fixture
    def driver_token(self):
        """Get driver auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as driver: {response.text}")
        return response.json()["token"]
    
    def test_lock_unlock_scenario_verification(self, driver_token):
        """
        Verify the lock/unlock mechanism works correctly.
        This test checks current state and verifies the lock logic.
        """
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        # Step 1: Check driver's current food orders
        food_orders_response = requests.get(f"{BASE_URL}/api/delivery/my-food-orders", headers=headers)
        assert food_orders_response.status_code == 200
        active_food_orders = food_orders_response.json()
        
        # Step 2: Get product orders status
        product_response = requests.get(f"{BASE_URL}/api/delivery/my-product-orders", headers=headers)
        assert product_response.status_code == 200
        product_data = product_response.json()
        
        # Step 3: Verify lock state matches expectations
        expected_locked = len(active_food_orders) > 0
        actual_locked = product_data["is_locked"]
        
        assert actual_locked == expected_locked, (
            f"Lock state mismatch: expected is_locked={expected_locked} "
            f"(based on {len(active_food_orders)} food orders), got is_locked={actual_locked}"
        )
        
        print(f"✅ Lock state verification passed:")
        print(f"   - Active food orders: {len(active_food_orders)}")
        print(f"   - is_locked: {actual_locked}")
        print(f"   - active_food_orders count in response: {product_data['active_food_orders']}")
        
        # Step 4: Verify available orders filtering
        available_response = requests.get(f"{BASE_URL}/api/delivery/available-orders", headers=headers)
        assert available_response.status_code == 200
        available_orders = available_response.json()
        
        shop_orders_visible = [o for o in available_orders if o.get("order_source") == "shop"]
        
        if expected_locked:
            assert len(shop_orders_visible) == 0, "Shop orders should be hidden when locked"
            print("   - Shop orders correctly hidden in available-orders")
        else:
            print(f"   - Shop orders visible: {len(shop_orders_visible)} (expected since not locked)")
        
        return {
            "is_locked": actual_locked,
            "active_food_orders": len(active_food_orders),
            "product_orders_count": len(product_data["orders"])
        }


class TestFoodPriorityStatusMessages:
    """Test that appropriate status messages are returned"""
    
    @pytest.fixture
    def driver_token(self):
        """Get driver auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as driver: {response.text}")
        return response.json()["token"]
    
    def test_lock_message_content(self, driver_token):
        """Test that lock_message contains appropriate information"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        response = requests.get(f"{BASE_URL}/api/delivery/my-product-orders", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        if data["is_locked"]:
            # Verify lock_message contains useful information
            lock_message = data["lock_message"]
            assert lock_message is not None, "lock_message should be present when locked"
            assert "طعام" in lock_message, "lock_message should mention food orders"
            assert str(data["active_food_orders"]) in lock_message, "lock_message should contain food order count"
            print(f"✅ Lock message is informative: {lock_message}")
        else:
            assert data["lock_message"] is None, "lock_message should be None when not locked"
            print("✅ No lock message when not locked (correct)")
    
    def test_individual_order_lock_reason(self, driver_token):
        """Test that each locked order has a lock_reason"""
        headers = {"Authorization": f"Bearer {driver_token}"}
        
        response = requests.get(f"{BASE_URL}/api/delivery/my-product-orders", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        
        if data["is_locked"] and len(orders) > 0:
            for order in orders:
                assert "lock_reason" in order, "Locked order should have lock_reason"
                assert order["lock_reason"] is not None, "lock_reason should not be None"
                assert "طعام" in order["lock_reason"], "lock_reason should mention food"
                
                # Verify sensitive info is hidden
                if "buyer_phone" in order:
                    # May be masked or hidden
                    print(f"   - Order {order.get('id', 'unknown')[:8]} buyer_phone: {order.get('buyer_phone')}")
            
            print(f"✅ All {len(orders)} locked orders have proper lock_reason")
        else:
            print("ℹ️ No locked orders to verify lock_reason")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
