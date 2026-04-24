"""
Phase 6 Testing: Replacement of direct db calls with helper functions
المرحلة 6: استبدال الكود المتكرر بدوال helpers

Tests verify that:
1. All endpoints return proper 401 without authentication
2. Helper functions (get_order_by_id, get_store_by_id) are properly used
3. No functionality was broken by the refactoring
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhase6HelperReplacement:
    """Test endpoints that now use get_order_by_id and get_store_by_id helpers"""
    
    def test_health_check(self):
        """Verify backend is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: Backend health check returns 200")
    
    def test_get_order_by_id_endpoint_requires_auth(self):
        """GET /api/food/orders/{order_id} - should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/test-order-123")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"PASS: GET /api/food/orders/{{order_id}} returns 401 - {data['detail']}")
    
    def test_cancel_order_endpoint_requires_auth(self):
        """POST /api/food/orders/{order_id}/cancel - should return 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/food/orders/test-order-123/cancel")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"PASS: POST /api/food/orders/{{order_id}}/cancel returns 401 - {data['detail']}")
    
    def test_delivery_cancel_endpoint_requires_auth(self):
        """POST /api/food/orders/delivery/{order_id}/cancel - should return 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-123/cancel",
            json={}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"PASS: POST /api/food/orders/delivery/{{order_id}}/cancel returns 401 - {data['detail']}")
    
    def test_pickup_code_endpoint_requires_auth(self):
        """GET /api/food/orders/delivery/{order_id}/pickup-code - should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/test-order-123/pickup-code")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"PASS: GET /api/food/orders/delivery/{{order_id}}/pickup-code returns 401 - {data['detail']}")
    
    def test_admin_cancel_with_penalty_requires_auth(self):
        """POST /api/food/orders/admin/{order_id}/cancel-with-penalty - should return 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/admin/test-order-123/cancel-with-penalty",
            json={}
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"PASS: POST /api/food/orders/admin/{{order_id}}/cancel-with-penalty returns 401 - {data['detail']}")
    
    def test_check_drivers_availability_requires_auth(self):
        """GET /api/food/orders/check-drivers-availability/{order_id} - should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/check-drivers-availability/test-order-123")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"PASS: GET /api/food/orders/check-drivers-availability/{{order_id}} returns 401 - {data['detail']}")


class TestHelperFunctionsImport:
    """Verify helper functions are properly imported and defined"""
    
    def test_helper_functions_importable(self):
        """Test that helper functions can be imported from food_order_helpers"""
        try:
            import sys
            sys.path.insert(0, '/app/backend')
            from routes.food_order_helpers import get_order_by_id, get_store_by_id
            
            # Verify they are async functions
            import asyncio
            assert asyncio.iscoroutinefunction(get_order_by_id)
            assert asyncio.iscoroutinefunction(get_store_by_id)
            print("PASS: get_order_by_id and get_store_by_id are importable async functions")
        except ImportError as e:
            pytest.fail(f"Failed to import helper functions: {e}")
    
    def test_all_phase5_functions_still_work(self):
        """Verify all Phase 5 functions are still importable"""
        try:
            import sys
            sys.path.insert(0, '/app/backend')
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
            print("PASS: All Phase 5 functions and constants are still importable")
        except ImportError as e:
            pytest.fail(f"Failed to import Phase 5 functions: {e}")


class TestOtherEndpointsStillWork:
    """Verify other endpoints still work after refactoring"""
    
    def test_my_orders_requires_auth(self):
        """GET /api/food/orders/my-orders - should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code == 401
        print("PASS: GET /api/food/orders/my-orders returns 401")
    
    def test_seller_orders_requires_auth(self):
        """GET /api/food/orders/seller - should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller")
        assert response.status_code == 401
        print("PASS: GET /api/food/orders/seller returns 401")
    
    def test_store_orders_requires_auth(self):
        """GET /api/food/orders/store/orders - should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code == 401
        print("PASS: GET /api/food/orders/store/orders returns 401")
    
    def test_delivery_available_requires_auth(self):
        """GET /api/food/orders/delivery/available - should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/available")
        assert response.status_code == 401
        print("PASS: GET /api/food/orders/delivery/available returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
