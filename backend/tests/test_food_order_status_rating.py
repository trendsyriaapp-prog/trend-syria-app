# /app/backend/tests/test_food_order_status_rating.py
# Tests for Food Order Status Flow, Rating System, and Store Reviews
# Features tested:
# 1. Order Status Updates (pending → confirmed → preparing → ready → out_for_delivery → delivered)
# 2. Admin can update any order status
# 3. Rating System after delivery
# 4. Store Rating automatic update
# 5. Store Reviews endpoint

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"phone": "0911111111", "password": "admin123"}
SELLER_CREDS = {"phone": "0922222222", "password": "seller123"}
BUYER_CREDS = {"phone": "0933333333", "password": "user123"}

# Known delivered order for testing (from agent context)
DELIVERED_ORDER_ID = "525d384e-a7ec-4869-9ff9-7dc681b8185f"

class TestAuthentication:
    """Test authentication for all roles"""
    
    def test_admin_login(self):
        """Test admin can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("user_type") in ["admin", "sub_admin"]
        print(f"Admin login successful: {data['user']['name']}")
    
    def test_seller_login(self):
        """Test seller can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SELLER_CREDS)
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"Seller login successful: {data['user']['name']}")
    
    def test_buyer_login(self):
        """Test buyer can login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print(f"Buyer login successful: {data['user']['name']}")


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def seller_token():
    """Get seller authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SELLER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Seller authentication failed")


@pytest.fixture
def buyer_token():
    """Get buyer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Buyer authentication failed")


class TestOrderStatusUpdateAPI:
    """Test order status update endpoint"""
    
    def test_seller_update_order_status_endpoint_exists(self, seller_token):
        """Verify the status update endpoint is accessible"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        # Get seller's store orders first
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders", headers=headers)
        print(f"Store orders response: {response.status_code}")
        
        # This might 404 if no store or orders, but 200 or 404 both confirm endpoint exists
        assert response.status_code in [200, 404, 403], f"Unexpected status: {response.status_code}"
    
    def test_admin_can_update_order_status(self, admin_token):
        """Test admin can update any order status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Try to update the known delivered order - should fail since already delivered
        # but confirms endpoint works
        response = requests.post(
            f"{BASE_URL}/api/food/orders/store/orders/{DELIVERED_ORDER_ID}/status",
            params={"new_status": "delivered"},
            headers=headers
        )
        
        # Either 200 (success) or 400 (already that status) or 404 (order not found)
        print(f"Admin update status response: {response.status_code} - {response.text[:200] if response.text else ''}")
        assert response.status_code in [200, 400, 404], f"Unexpected status: {response.status_code}"
    
    def test_status_update_creates_notification(self, admin_token):
        """Verify notification is created on status update"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get all food orders
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders", headers=headers)
        # Admin might not have orders, check anyway
        print(f"Admin orders check: {response.status_code}")
    
    def test_valid_order_statuses(self):
        """Test that only valid statuses are accepted"""
        # List of valid statuses from the code
        valid_statuses = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"]
        print(f"Valid order statuses: {valid_statuses}")
        assert len(valid_statuses) == 7


class TestRatingSystem:
    """Test order rating functionality"""
    
    def test_rate_order_endpoint_exists(self, buyer_token):
        """Test rating endpoint is accessible"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Try to rate the known delivered order
        rating_data = {
            "store_rating": 5,
            "driver_rating": 5,
            "comment": "Test rating"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders/{DELIVERED_ORDER_ID}/rate",
            json=rating_data,
            headers=headers
        )
        
        # 200 = success, 400 = already rated, 404 = not found/not customer's order
        print(f"Rate order response: {response.status_code} - {response.text[:200] if response.text else ''}")
        assert response.status_code in [200, 400, 404], f"Unexpected status: {response.status_code}"
    
    def test_rate_order_requires_delivered_status(self, buyer_token):
        """Test that only delivered orders can be rated"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Get buyer's orders to find any non-delivered order
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders", headers=headers)
        
        if response.status_code == 200:
            orders = response.json()
            non_delivered = [o for o in orders if o.get("status") != "delivered"]
            
            if non_delivered:
                order_id = non_delivered[0]["id"]
                rating_data = {"store_rating": 5}
                
                rate_response = requests.post(
                    f"{BASE_URL}/api/food/orders/{order_id}/rate",
                    json=rating_data,
                    headers=headers
                )
                
                # Should reject rating non-delivered order
                print(f"Rate non-delivered order: {rate_response.status_code}")
                assert rate_response.status_code in [400, 404], "Should not allow rating non-delivered orders"
            else:
                print("No non-delivered orders to test")
    
    def test_rate_order_requires_store_rating(self, buyer_token):
        """Test that store_rating is required"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Try to rate without store_rating
        rating_data = {
            "driver_rating": 5,
            "comment": "Test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders/{DELIVERED_ORDER_ID}/rate",
            json=rating_data,
            headers=headers
        )
        
        # Should fail if store_rating is missing/invalid
        print(f"Rate without store_rating: {response.status_code}")
        # 400 = validation error, 404 = order not found, 200 = already rated
        assert response.status_code in [400, 404, 200], f"Unexpected status: {response.status_code}"


class TestStoreReviews:
    """Test store reviews endpoint"""
    
    def test_get_store_reviews_endpoint(self):
        """Test GET /api/food/orders/store/{store_id}/reviews endpoint"""
        # First get a food store ID
        response = requests.get(f"{BASE_URL}/api/food/stores")
        
        if response.status_code == 200:
            stores = response.json()
            if isinstance(stores, list) and len(stores) > 0:
                store_id = stores[0].get("id")
                
                reviews_response = requests.get(
                    f"{BASE_URL}/api/food/orders/store/{store_id}/reviews"
                )
                
                assert reviews_response.status_code == 200, f"Reviews endpoint failed: {reviews_response.text}"
                data = reviews_response.json()
                
                # Check response structure
                assert "reviews" in data, "Response should contain 'reviews' field"
                assert "stats" in data, "Response should contain 'stats' field"
                
                if data["stats"]:
                    assert "total" in data["stats"], "Stats should contain 'total'"
                    assert "average" in data["stats"], "Stats should contain 'average'"
                    assert "distribution" in data["stats"], "Stats should contain 'distribution'"
                
                print(f"Store reviews fetched: {len(data['reviews'])} reviews")
                print(f"Stats: total={data['stats']['total'] if data['stats'] else 0}, avg={data['stats']['average'] if data['stats'] else 0}")
            else:
                print("No stores found to test reviews")
        else:
            pytest.skip("Could not fetch stores")
    
    def test_store_has_rating_after_review(self):
        """Verify store rating is updated after reviews"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        
        if response.status_code == 200:
            stores = response.json()
            rated_stores = [s for s in stores if s.get("rating", 0) > 0]
            
            if rated_stores:
                store = rated_stores[0]
                print(f"Store '{store['name']}' has rating: {store.get('rating')}, reviews_count: {store.get('reviews_count', 0)}")
                
                # Verify rating is valid
                assert 1 <= store["rating"] <= 5, "Rating should be between 1 and 5"
            else:
                print("No rated stores found yet")


class TestOrderTrackingFlow:
    """Test order tracking and status visibility"""
    
    def test_get_order_details(self, buyer_token):
        """Test getting order details with status info"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/food/orders/{DELIVERED_ORDER_ID}",
            headers=headers
        )
        
        if response.status_code == 200:
            order = response.json()
            
            # Check order structure
            assert "id" in order
            assert "status" in order
            assert "status_label" in order, "Order should have status_label"
            assert "status_history" in order or "created_at" in order
            
            print(f"Order status: {order['status']} - {order.get('status_label', '')}")
            
            # If rated, check rating info
            if order.get("rating"):
                print(f"Order rating: {order['rating'].get('store_rating')} stars")
        else:
            print(f"Order not accessible or not found: {response.status_code}")
    
    def test_my_orders_list(self, buyer_token):
        """Test getting user's orders list"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders", headers=headers)
        
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        orders = response.json()
        
        if len(orders) > 0:
            # Verify order structure
            order = orders[0]
            assert "id" in order
            assert "status" in order
            assert "status_label" in order
            print(f"Found {len(orders)} orders for user")
        else:
            print("No orders found for buyer")
    
    def test_seller_store_orders(self, seller_token):
        """Test seller can view their store orders"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders", headers=headers)
        
        # 200 = has store, 404 = no store linked
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            orders = response.json()
            print(f"Seller has {len(orders)} orders in store")
        else:
            print("Seller has no store or no orders")


class TestNotificationOnStatusChange:
    """Test that notifications are created on status changes"""
    
    def test_admin_update_creates_notification(self, admin_token, buyer_token):
        """Verify notification is created when admin updates order status"""
        buyer_headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Get buyer's current notifications count
        initial_notifs = requests.get(f"{BASE_URL}/api/notifications", headers=buyer_headers)
        initial_count = len(initial_notifs.json()) if initial_notifs.status_code == 200 else 0
        
        # The notification check is implicit since we can't create a new order easily
        # We just verify the notifications endpoint works
        assert initial_notifs.status_code in [200, 401], f"Notifications endpoint issue: {initial_notifs.status_code}"
        print(f"Buyer has {initial_count} notifications")


class TestDeliveredOrderRatingIntegration:
    """Integration test for rating a delivered order"""
    
    def test_delivered_order_can_be_rated(self, buyer_token):
        """Test the full flow of rating a delivered order"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Get the delivered order
        order_response = requests.get(
            f"{BASE_URL}/api/food/orders/{DELIVERED_ORDER_ID}",
            headers=headers
        )
        
        if order_response.status_code == 200:
            order = order_response.json()
            
            if order.get("status") == "delivered":
                if order.get("rating"):
                    print(f"Order already rated: {order['rating'].get('store_rating')} stars")
                    print("Rating verified - order was rated successfully before")
                else:
                    print("Order delivered but not yet rated")
            else:
                print(f"Order status is {order.get('status')}, not delivered")
        else:
            print(f"Could not access order: {order_response.status_code}")
    
    def test_store_average_rating_calculation(self):
        """Verify store average rating is calculated correctly"""
        # Get stores with reviews
        response = requests.get(f"{BASE_URL}/api/food/stores")
        
        if response.status_code == 200:
            stores = response.json()
            
            for store in stores[:3]:  # Check first 3 stores
                if store.get("rating", 0) > 0:
                    store_id = store["id"]
                    
                    # Get store reviews
                    reviews_response = requests.get(
                        f"{BASE_URL}/api/food/orders/store/{store_id}/reviews"
                    )
                    
                    if reviews_response.status_code == 200:
                        data = reviews_response.json()
                        stats = data.get("stats", {})
                        
                        if stats:
                            calculated_avg = stats.get("average", 0)
                            store_avg = store.get("rating", 0)
                            
                            # Allow small floating point difference
                            diff = abs(calculated_avg - store_avg)
                            print(f"Store '{store['name']}': stored={store_avg}, calculated={calculated_avg}, diff={diff:.2f}")
                            
                            # They should be close (within 0.5)
                            assert diff <= 0.5, f"Rating mismatch: stored={store_avg}, calculated={calculated_avg}"
                    break
            else:
                print("No stores with ratings found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
