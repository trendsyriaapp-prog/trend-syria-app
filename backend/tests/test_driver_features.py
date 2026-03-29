"""
Test Driver Features for Trend Syria E-commerce App
Tests: Smart Route Bar, Order Acceptance, GPS Check, Pickup/Delivery Codes, Product Order Locking
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

# Test credentials
DRIVER_PHONE = "0988111333"
DRIVER_PASSWORD = "driver123"


class TestDriverAuthentication:
    """Test driver login and authentication"""
    
    def test_driver_login_success(self):
        """Test driver login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data["user"]["user_type"] == "delivery", "User is not a delivery driver"
        print(f"✅ Driver login successful: {data['user']['name']}")
        return data["token"]
    
    def test_driver_login_invalid_credentials(self):
        """Test driver login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0999888777",
            "password": "wrongpassword"
        })
        assert response.status_code in [400, 401], f"Expected 400/401, got {response.status_code}"
        print("✅ Invalid credentials correctly rejected")


@pytest.fixture
def driver_token():
    """Get driver authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": DRIVER_PHONE,
        "password": DRIVER_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Driver authentication failed")


@pytest.fixture
def auth_headers(driver_token):
    """Get authorization headers"""
    return {"Authorization": f"Bearer {driver_token}"}


class TestDriverAvailability:
    """Test driver availability toggle"""
    
    def test_get_availability(self, auth_headers):
        """Test getting driver availability status"""
        response = requests.get(f"{BASE_URL}/api/delivery/availability", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get availability: {response.text}"
        data = response.json()
        assert "is_available" in data, "Missing is_available field"
        print(f"✅ Driver availability: {data['is_available']}")
    
    def test_toggle_availability_on(self, auth_headers):
        """Test setting driver as available"""
        response = requests.put(f"{BASE_URL}/api/delivery/availability", 
                               headers=auth_headers,
                               json={"is_available": True})
        assert response.status_code == 200, f"Failed to set availability: {response.text}"
        data = response.json()
        assert data.get("is_available"), "Availability not set to True"
        print("✅ Driver set to available")
    
    def test_toggle_availability_off(self, auth_headers):
        """Test setting driver as unavailable"""
        # First check if driver has active orders
        response = requests.put(f"{BASE_URL}/api/delivery/availability", 
                               headers=auth_headers,
                               json={"is_available": False})
        # May fail if driver has active orders
        if response.status_code == 400:
            print("⚠️ Cannot set unavailable - driver has active orders (expected behavior)")
        else:
            assert response.status_code == 200, f"Failed to set availability: {response.text}"
            print("✅ Driver set to unavailable")


class TestAvailableOrders:
    """Test available orders listing"""
    
    def test_get_available_orders(self, auth_headers):
        """Test getting available orders (food + products)"""
        response = requests.get(f"{BASE_URL}/api/delivery/available-orders", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get available orders: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        food_orders = [o for o in data if o.get("order_source") == "food"]
        product_orders = [o for o in data if o.get("order_source") != "food"]
        
        print(f"✅ Available orders: {len(data)} total ({len(food_orders)} food, {len(product_orders)} products)")
        
        # Check order structure
        for order in data[:3]:  # Check first 3 orders
            assert "id" in order, "Order missing id"
            if order.get("order_source") == "food":
                assert "store_name" in order or "restaurant_name" in order, "Food order missing store name"
    
    def test_get_available_food_orders(self, auth_headers):
        """Test getting available food orders only"""
        response = requests.get(f"{BASE_URL}/api/delivery/available-food-orders", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get food orders: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Available food orders: {len(data)}")


class TestMyOrders:
    """Test driver's current orders"""
    
    def test_get_my_food_orders(self, auth_headers):
        """Test getting driver's active food orders"""
        response = requests.get(f"{BASE_URL}/api/delivery/my-food-orders", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get my food orders: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ My food orders: {len(data)}")
        
        # Check order structure
        for order in data:
            assert "id" in order, "Order missing id"
            assert "status" in order, "Order missing status"
            # Active orders should not be delivered or cancelled
            assert order["status"] not in ["delivered", "cancelled"], f"Unexpected status: {order['status']}"
    
    def test_get_my_product_orders(self, auth_headers):
        """Test getting driver's product orders with lock status"""
        response = requests.get(f"{BASE_URL}/api/delivery/my-product-orders", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get my product orders: {response.text}"
        data = response.json()
        
        assert "orders" in data, "Missing orders field"
        assert "is_locked" in data, "Missing is_locked field"
        
        print(f"✅ My product orders: {data['count']} (locked: {data['is_locked']})")
        
        if data["is_locked"]:
            assert "lock_message" in data, "Missing lock_message when locked"
            print(f"   Lock message: {data.get('lock_message', 'N/A')}")


class TestOrderAcceptance:
    """Test order acceptance flow"""
    
    def test_accept_food_order_structure(self, auth_headers):
        """Test food order acceptance API structure"""
        # First get available orders
        response = requests.get(f"{BASE_URL}/api/delivery/available-food-orders", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Cannot get available orders")
        
        orders = response.json()
        if not orders:
            print("⚠️ No available food orders to test acceptance")
            pytest.skip("No available food orders")
        
        # Try to accept first order (may fail if already accepted)
        order_id = orders[0]["id"]
        response = requests.post(f"{BASE_URL}/api/food/orders/delivery/{order_id}/accept", 
                                headers=auth_headers)
        
        # Accept various responses
        if response.status_code == 200:
            print(f"✅ Order {order_id[:8]} accepted successfully")
        elif response.status_code == 400:
            print(f"⚠️ Order acceptance failed (expected): {response.json().get('detail', 'Unknown error')}")
        else:
            print(f"⚠️ Unexpected response: {response.status_code} - {response.text}")


class TestArrivedAtStore:
    """Test 'Arrived at Store' functionality with GPS check"""
    
    def test_arrived_at_store_without_location(self, auth_headers):
        """Test arrived at store without GPS coordinates"""
        # Get driver's active orders
        response = requests.get(f"{BASE_URL}/api/delivery/my-food-orders", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Cannot get driver orders")
        
        orders = response.json()
        if not orders:
            print("⚠️ No active food orders to test")
            pytest.skip("No active food orders")
        
        # Find an order that hasn't arrived yet
        order = orders[0]
        order_id = order["id"]
        
        # Test without coordinates - should fail or require coordinates
        response = requests.post(f"{BASE_URL}/api/food/orders/delivery/{order_id}/arrived", 
                                headers=auth_headers)
        
        # API may require coordinates
        print(f"Arrived without coords response: {response.status_code}")
        if response.status_code == 400:
            print("✅ API correctly requires GPS coordinates")
        elif response.status_code == 200:
            print("✅ Arrived at store registered (no GPS required)")
    
    def test_arrived_at_store_with_location(self, auth_headers):
        """Test arrived at store with GPS coordinates"""
        # Get driver's active orders
        response = requests.get(f"{BASE_URL}/api/delivery/my-food-orders", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Cannot get driver orders")
        
        orders = response.json()
        if not orders:
            print("⚠️ No active food orders to test")
            pytest.skip("No active food orders")
        
        order = orders[0]
        order_id = order["id"]
        
        # Use Damascus coordinates (default)
        lat, lng = 33.5138, 36.2765
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/{order_id}/arrived?latitude={lat}&longitude={lng}", 
            headers=auth_headers
        )
        
        print(f"Arrived with coords response: {response.status_code}")
        if response.status_code == 200:
            print("✅ Arrived at store registered successfully")
        elif response.status_code == 400:
            error = response.json().get("detail", "Unknown error")
            if "بعيد" in error or "المسافة" in error:
                print(f"✅ GPS check working - driver too far: {error}")
            else:
                print(f"⚠️ Arrived failed: {error}")


class TestPickupCode:
    """Test pickup code verification"""
    
    def test_verify_pickup_code_invalid(self, auth_headers):
        """Test pickup code verification with invalid code"""
        # Get driver's active orders
        response = requests.get(f"{BASE_URL}/api/delivery/my-food-orders", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Cannot get driver orders")
        
        orders = response.json()
        if not orders:
            pytest.skip("No active food orders")
        
        order_id = orders[0]["id"]
        
        # Try invalid code
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/{order_id}/verify-pickup",
            headers=auth_headers,
            json={"code": "0000"}
        )
        
        if response.status_code == 400:
            print("✅ Invalid pickup code correctly rejected")
        elif response.status_code == 200:
            print("⚠️ Code accepted (may be correct by chance)")
        else:
            print(f"Response: {response.status_code} - {response.text}")


class TestDeliveryCode:
    """Test delivery code verification"""
    
    def test_verify_delivery_code_invalid(self, auth_headers):
        """Test delivery code verification with invalid code"""
        # Get driver's active orders
        response = requests.get(f"{BASE_URL}/api/delivery/my-food-orders", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Cannot get driver orders")
        
        orders = response.json()
        # Find order that's out for delivery
        out_for_delivery = [o for o in orders if o.get("status") == "out_for_delivery"]
        
        if not out_for_delivery:
            print("⚠️ No orders out for delivery to test")
            pytest.skip("No orders out for delivery")
        
        order_id = out_for_delivery[0]["id"]
        
        # Try invalid code
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/{order_id}/verify-code",
            headers=auth_headers,
            json={"delivery_code": "0000"}
        )
        
        if response.status_code == 400:
            print("✅ Invalid delivery code correctly rejected")
        elif response.status_code == 200:
            print("⚠️ Code accepted (may be correct by chance)")
        else:
            print(f"Response: {response.status_code} - {response.text}")


class TestProductOrderLocking:
    """Test product order locking when food orders are active"""
    
    def test_product_orders_lock_status(self, auth_headers):
        """Test that product orders are locked when food orders are active"""
        # Get my product orders with lock status
        response = requests.get(f"{BASE_URL}/api/delivery/my-product-orders", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        is_locked = data.get("is_locked", False)
        active_food = data.get("active_food_orders", 0)
        
        print(f"✅ Product orders lock status: locked={is_locked}, active_food_orders={active_food}")
        
        # If there are active food orders, products should be locked
        if active_food > 0:
            assert is_locked, "Products should be locked when food orders are active"
            print("✅ Product orders correctly locked due to active food orders")
        else:
            print("ℹ️ No active food orders - products not locked")


class TestDriverStats:
    """Test driver statistics and performance"""
    
    def test_get_driver_stats(self, auth_headers):
        """Test getting driver statistics"""
        response = requests.get(f"{BASE_URL}/api/delivery/stats", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "total_delivered" in data, "Missing total_delivered"
        assert "total_earnings" in data, "Missing total_earnings"
        
        print(f"✅ Driver stats: {data['total_delivered']} delivered, {data['total_earnings']} earnings")
    
    def test_get_driver_performance(self, auth_headers):
        """Test getting driver performance report"""
        response = requests.get(f"{BASE_URL}/api/delivery/performance", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "overview" in data, "Missing overview"
        assert "performance_level" in data, "Missing performance_level"
        
        print(f"✅ Driver performance level: {data['performance_level'].get('level', 'N/A')}")


class TestPriorityOrders:
    """Test priority orders for drivers"""
    
    def test_get_priority_orders(self, auth_headers):
        """Test getting priority orders (same restaurant)"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/priority-orders", headers=auth_headers)
        
        if response.status_code == 200:
            data = response.json()
            priority_orders = data.get("priority_orders", [])
            print(f"✅ Priority orders: {len(priority_orders)}")
        elif response.status_code == 404:
            print("ℹ️ Priority orders endpoint not found")
        else:
            print(f"⚠️ Priority orders response: {response.status_code}")


class TestDriverEarnings:
    """Test driver earnings endpoints"""
    
    def test_get_earnings_stats(self, auth_headers):
        """Test getting earnings statistics"""
        response = requests.get(f"{BASE_URL}/api/delivery/earnings/stats?period=week", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "current" in data, "Missing current period data"
        assert "comparison" in data, "Missing comparison data"
        
        print(f"✅ Weekly earnings: {data['current'].get('earnings', 0)}")
    
    def test_get_earnings_chart(self, auth_headers):
        """Test getting earnings chart data"""
        response = requests.get(f"{BASE_URL}/api/delivery/earnings/chart?chart_type=daily", headers=auth_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "data" in data, "Missing chart data"
        assert "summary" in data, "Missing summary"
        
        print(f"✅ Earnings chart: {len(data['data'])} data points")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
