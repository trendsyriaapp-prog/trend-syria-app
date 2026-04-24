"""
Phase 7 Refactoring Tests - food_orders.py
Testing that helper functions are properly imported and endpoints work correctly.
Phase 7 added: update_order_status_with_history, assign_driver_to_order
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhase7BackendHealth:
    """Test backend health and startup"""
    
    def test_backend_health(self):
        """Backend should be healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Backend health check passed")


class TestPhase7EndpointsAuth:
    """Test that endpoints require authentication (return 401)"""
    
    def test_store_orders_status_requires_auth(self):
        """POST /api/food/orders/store/orders/{order_id}/status should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/store/orders/test-order-id/status",
            params={"new_status": "confirmed"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /store/orders/{order_id}/status returns 401 without auth")
    
    def test_delivery_accept_requires_auth(self):
        """POST /api/food/orders/delivery/{order_id}/accept should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/accept"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /delivery/{order_id}/accept returns 401 without auth")
    
    def test_driver_orders_accept_requires_auth(self):
        """POST /api/food/orders/driver/orders/{order_id}/accept should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/driver/orders/test-order-id/accept"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /driver/orders/{order_id}/accept returns 401 without auth")
    
    def test_store_request_driver_requires_auth(self):
        """POST /api/food/orders/store/orders/{order_id}/request-driver should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/store/orders/test-order-id/request-driver"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /store/orders/{order_id}/request-driver returns 401 without auth")


class TestPhase7OtherEndpoints:
    """Test other food order endpoints still work"""
    
    def test_my_orders_requires_auth(self):
        """GET /api/food/orders/my-orders should return 401"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code == 401
        print("✅ /my-orders returns 401 without auth")
    
    def test_seller_orders_requires_auth(self):
        """GET /api/food/orders/seller should return 401"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller")
        assert response.status_code == 401
        print("✅ /seller returns 401 without auth")
    
    def test_store_orders_requires_auth(self):
        """GET /api/food/orders/store/orders should return 401"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code == 401
        print("✅ /store/orders returns 401 without auth")
    
    def test_delivery_available_requires_auth(self):
        """GET /api/food/orders/delivery/available should return 401"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/available")
        assert response.status_code == 401
        print("✅ /delivery/available returns 401 without auth")
    
    def test_check_distance_works(self):
        """POST /api/food/orders/check-distance should work (no auth required)"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": "test-store",
                "customer_lat": 33.5138,
                "customer_lng": 36.2765
            }
        )
        # Should return 404 (store not found) or 200, not 401
        assert response.status_code in [200, 404, 422], f"Expected 200/404/422, got {response.status_code}"
        print(f"✅ /check-distance works (status: {response.status_code})")


class TestPhase7HelperImports:
    """Test that helper functions are properly imported in food_orders.py"""
    
    def test_helper_functions_importable(self):
        """Helper functions should be importable from food_order_helpers"""
        import sys
        sys.path.insert(0, '/app/backend')
        try:
            from routes.food_order_helpers import (
                get_order_by_id,
                get_store_by_id,
                get_driver_by_id,
                get_customer_by_id,
                get_driver_active_food_orders,
                get_available_orders_for_delivery,
                get_stores_by_ids,
                count_driver_hot_fresh_orders,
                can_driver_accept_order,
                update_order_status_with_history,
                assign_driver_to_order,
                HOT_FRESH_STORE_TYPES,
                COLD_DRY_STORE_TYPES,
                DEFAULT_HOT_FRESH_LIMIT,
                DEFAULT_COLD_DRY_LIMIT,
                ORDER_STATUSES,
                PLATFORM_WALLET_ID
            )
            print("✅ All Phase 7 helper functions and constants are importable")
            
            # Verify they are callable
            assert callable(get_order_by_id)
            assert callable(get_store_by_id)
            assert callable(update_order_status_with_history)
            assert callable(assign_driver_to_order)
            print("✅ Helper functions are callable")
            
        except ImportError as e:
            pytest.fail(f"Failed to import helper functions: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
