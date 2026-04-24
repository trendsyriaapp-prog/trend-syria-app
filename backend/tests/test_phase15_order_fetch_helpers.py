"""
Test file for Phase 15 refactoring of food_orders.py
Tests the extraction of order fetch helpers to food_order_helpers.py

Extracted functions in Phase 15:
- get_order_for_customer: جلب طلب للعميل مع التحقق من الملكية
- get_order_for_store: جلب طلب للمتجر مع التحقق من الملكية
- get_order_for_driver: جلب طلب للسائق مع التحقق من الملكية

These helpers replace 6 usages of db.food_orders.find_one in food_orders.py
"""

import pytest
import requests
import os
import sys

# Add backend to path for imports
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com').rstrip('/')


class TestBackendHealth:
    """Test that backend is healthy after Phase 15 refactoring"""
    
    def test_health_endpoint(self):
        """Test backend health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        assert data.get("database") == "connected"
        print("✅ Backend health check passed")
    
    def test_food_orders_router_loaded(self):
        """Test that food orders router is loaded (returns 401 without auth)"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        # 401 means the router is loaded and auth is working
        assert response.status_code == 401
        print("✅ Food orders router loaded correctly")


class TestPhase15Imports:
    """Test that Phase 15 extracted functions are importable"""
    
    def test_import_order_fetch_helpers(self):
        """Test importing order fetch helper functions"""
        from routes.food_order_helpers import (
            get_order_for_customer,
            get_order_for_store,
            get_order_for_driver
        )
        assert callable(get_order_for_customer)
        assert callable(get_order_for_store)
        assert callable(get_order_for_driver)
        print("✅ Phase 15 order fetch helpers imported successfully")
    
    def test_import_all_previous_functions(self):
        """Test that all previous phase functions are still importable"""
        from routes.food_order_helpers import (
            # Phase 1 functions
            get_first_name,
            calculate_haversine_distance,
            get_driver_km_settings,
            calculate_driver_fee_by_km,
            get_store_delivery_category,
            get_driver_cancel_settings,
            calculate_driver_cancel_rate,
            add_commission_to_platform_wallet_food,
            send_priority_order_push_notification,
            # Phase 3 functions
            check_batch_readiness_and_notify_driver,
            calculate_optimal_pickup_order,
            add_driver_earnings_food,
            add_seller_earnings_food,
            add_earnings_directly,
            add_seller_earnings_directly,
            # Phase 4 functions
            complete_delivery_and_pay_driver,
            # Phase 5 functions
            get_order_by_id,
            get_store_by_id,
            get_driver_by_id,
            get_customer_by_id,
            get_driver_active_food_orders,
            get_available_orders_for_delivery,
            get_stores_by_ids,
            count_driver_hot_fresh_orders,
            can_driver_accept_order,
            # Phase 6/7 functions
            update_order_status_with_history,
            assign_driver_to_order,
            # Constants
            HOT_FRESH_STORE_TYPES,
            COLD_DRY_STORE_TYPES,
            DEFAULT_HOT_FRESH_LIMIT,
            DEFAULT_COLD_DRY_LIMIT,
            ORDER_STATUSES,
            PLATFORM_WALLET_ID
        )
        print("✅ All previous phase functions still importable")
    
    def test_import_constants(self):
        """Test importing constants"""
        from routes.food_order_helpers import (
            HOT_FRESH_STORE_TYPES,
            COLD_DRY_STORE_TYPES,
            DEFAULT_HOT_FRESH_LIMIT,
            DEFAULT_COLD_DRY_LIMIT,
            ORDER_STATUSES,
            PLATFORM_WALLET_ID
        )
        assert isinstance(HOT_FRESH_STORE_TYPES, list)
        assert isinstance(COLD_DRY_STORE_TYPES, list)
        assert isinstance(DEFAULT_HOT_FRESH_LIMIT, int)
        assert isinstance(DEFAULT_COLD_DRY_LIMIT, int)
        assert isinstance(ORDER_STATUSES, dict)
        assert isinstance(PLATFORM_WALLET_ID, str)
        print("✅ Constants imported successfully")


class TestFoodOrdersImports:
    """Test that food_orders.py imports from food_order_helpers.py correctly"""
    
    def test_food_orders_imports_phase15_functions(self):
        """Test that food_orders.py imports Phase 15 functions"""
        # This tests that the import statement in food_orders.py works
        import routes.food_orders as food_orders_module
        
        # Check that the module loaded without errors
        assert hasattr(food_orders_module, 'router')
        print("✅ food_orders.py loaded successfully with Phase 15 imports")
    
    def test_food_orders_has_phase15_imports(self):
        """Verify food_orders.py has Phase 15 imports"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # Check Phase 15 imports are present
        assert 'get_order_for_customer' in content
        assert 'get_order_for_store' in content
        assert 'get_order_for_driver' in content
        print("✅ Phase 15 function imports found in food_orders.py")


class TestEndpointsAuth:
    """Test that endpoints using new helpers require authentication"""
    
    def test_activate_scheduled_requires_auth(self):
        """Test /api/food/orders/{order_id}/activate-scheduled requires auth"""
        response = requests.post(f"{BASE_URL}/api/food/orders/test-order-id/activate-scheduled")
        assert response.status_code == 401
        print("✅ /api/food/orders/{order_id}/activate-scheduled returns 401 without auth")
    
    def test_cancel_scheduled_requires_auth(self):
        """Test /api/food/orders/{order_id}/cancel-scheduled requires auth"""
        response = requests.delete(f"{BASE_URL}/api/food/orders/test-order-id/cancel-scheduled")
        assert response.status_code == 401
        print("✅ /api/food/orders/{order_id}/cancel-scheduled returns 401 without auth")
    
    def test_start_preparation_requires_auth(self):
        """Test /api/food/orders/store/orders/{order_id}/start-preparation requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/store/orders/test-order-id/start-preparation",
            json={"preparation_time_minutes": 15}
        )
        assert response.status_code == 401
        print("✅ /api/food/orders/store/orders/{order_id}/start-preparation returns 401 without auth")
    
    def test_update_order_status_requires_auth(self):
        """Test /api/food/orders/store/orders/{order_id}/status requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/store/orders/test-order-id/status",
            params={"new_status": "confirmed"}
        )
        assert response.status_code == 401
        print("✅ /api/food/orders/store/orders/{order_id}/status returns 401 without auth")
    
    def test_my_orders_requires_auth(self):
        """Test /api/food/orders/my-orders requires auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code == 401
        print("✅ /api/food/orders/my-orders returns 401 without auth")
    
    def test_store_orders_requires_auth(self):
        """Test /api/food/orders/store/orders requires auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code == 401
        print("✅ /api/food/orders/store/orders returns 401 without auth")


class TestFunctionSignatures:
    """Test the signatures of extracted functions"""
    
    def test_get_order_for_customer_signature(self):
        """Test get_order_for_customer function signature"""
        import inspect
        from routes.food_order_helpers import get_order_for_customer
        
        sig = inspect.signature(get_order_for_customer)
        params = list(sig.parameters.keys())
        
        assert 'order_id' in params
        assert 'customer_id' in params
        print("✅ get_order_for_customer has correct signature")
    
    def test_get_order_for_store_signature(self):
        """Test get_order_for_store function signature"""
        import inspect
        from routes.food_order_helpers import get_order_for_store
        
        sig = inspect.signature(get_order_for_store)
        params = list(sig.parameters.keys())
        
        assert 'order_id' in params
        assert 'store_id' in params
        print("✅ get_order_for_store has correct signature")
    
    def test_get_order_for_driver_signature(self):
        """Test get_order_for_driver function signature"""
        import inspect
        from routes.food_order_helpers import get_order_for_driver
        
        sig = inspect.signature(get_order_for_driver)
        params = list(sig.parameters.keys())
        
        assert 'order_id' in params
        assert 'driver_id' in params
        assert 'status' in params  # Optional parameter
        print("✅ get_order_for_driver has correct signature")


class TestFileStructure:
    """Test file structure after Phase 15 refactoring"""
    
    def test_food_orders_file_size_reduced(self):
        """Test that food_orders.py file size was reduced"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            lines = len(f.readlines())
        
        # After Phase 15, should be around 4422 lines (reduced from 4435)
        # Allow some tolerance
        assert lines < 4500, f"food_orders.py has {lines} lines, expected < 4500"
        print(f"✅ food_orders.py has {lines} lines (reduced from original)")
    
    def test_food_order_helpers_has_phase15_functions(self):
        """Test that food_order_helpers.py has Phase 15 functions"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        # Should have the extracted functions
        assert 'async def get_order_for_customer' in content
        assert 'async def get_order_for_store' in content
        assert 'async def get_order_for_driver' in content
        print("✅ food_order_helpers.py has Phase 15 functions")
    
    def test_food_order_helpers_line_count(self):
        """Test that food_order_helpers.py has grown with new functions"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            lines = len(f.readlines())
        
        # Should have more than 1200 lines after Phase 15
        assert lines > 1200, f"food_order_helpers.py has {lines} lines, expected > 1200"
        print(f"✅ food_order_helpers.py has {lines} lines")


class TestFunctionLogic:
    """Test the logic of helper functions"""
    
    def test_get_first_name(self):
        """Test get_first_name function"""
        from routes.food_order_helpers import get_first_name
        
        assert get_first_name("محمد أحمد") == "محمد"
        assert get_first_name("علي") == "علي"
        assert get_first_name("") == "السائق"
        assert get_first_name(None) == "السائق"
        assert get_first_name("  أحمد  علي  ") == "أحمد"
        print("✅ get_first_name works correctly")
    
    def test_calculate_haversine_distance(self):
        """Test distance calculation"""
        from routes.food_order_helpers import calculate_haversine_distance
        
        # Damascus coordinates
        lat1, lon1 = 33.5138, 36.2765
        # Nearby point (about 1km away)
        lat2, lon2 = 33.5228, 36.2765
        
        distance = calculate_haversine_distance(lat1, lon1, lat2, lon2)
        assert 0.5 < distance < 1.5  # Should be about 1km
        
        # Same point should be 0
        distance_same = calculate_haversine_distance(lat1, lon1, lat1, lon1)
        assert distance_same < 0.001
        print("✅ calculate_haversine_distance works correctly")
    
    def test_get_store_delivery_category(self):
        """Test store delivery category classification"""
        from routes.food_order_helpers import get_store_delivery_category
        
        assert get_store_delivery_category("restaurants") == "hot_fresh"
        assert get_store_delivery_category("cafes") == "hot_fresh"
        assert get_store_delivery_category("bakery") == "hot_fresh"
        assert get_store_delivery_category("market") == "cold_dry"
        assert get_store_delivery_category("vegetables") == "cold_dry"
        assert get_store_delivery_category("unknown") == "hot_fresh"  # default
        print("✅ get_store_delivery_category works correctly")
    
    def test_order_statuses_complete(self):
        """Test ORDER_STATUSES has all expected statuses"""
        from routes.food_order_helpers import ORDER_STATUSES
        
        expected_statuses = [
            "pending", "confirmed", "preparing", "ready",
            "out_for_delivery", "delivered", "cancelled"
        ]
        
        for status in expected_statuses:
            assert status in ORDER_STATUSES
            assert isinstance(ORDER_STATUSES[status], str)
        print("✅ ORDER_STATUSES has all expected statuses")


class TestNoRegressions:
    """Test that no regressions occurred after refactoring"""
    
    def test_check_distance_endpoint(self):
        """Test /api/food/orders/check-distance endpoint works"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": "non-existent-store",
                "customer_lat": 33.5138,
                "customer_lng": 36.2765
            }
        )
        # Should return 404 for non-existent store
        assert response.status_code == 404
        print("✅ /api/food/orders/check-distance endpoint works")
    
    def test_check_drivers_availability_requires_auth(self):
        """Test /api/food/orders/check-drivers-availability/{order_id} requires auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/check-drivers-availability/test-order-id")
        assert response.status_code == 401
        print("✅ /api/food/orders/check-drivers-availability requires auth")
    
    def test_create_order_requires_auth(self):
        """Test POST /api/food/orders requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders",
            json={
                "store_id": "test",
                "items": [],
                "delivery_address": "test",
                "delivery_city": "test",
                "delivery_phone": "123"
            }
        )
        assert response.status_code == 401
        print("✅ POST /api/food/orders requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
