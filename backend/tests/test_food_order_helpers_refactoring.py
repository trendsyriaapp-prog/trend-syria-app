"""
Test file for Phase 3 refactoring of food_orders.py
Tests the extraction of batch and earnings functions to food_order_helpers.py

Extracted functions in Phase 3:
- check_batch_readiness_and_notify_driver
- calculate_optimal_pickup_order
- add_driver_earnings_food
- add_seller_earnings_food
- add_earnings_directly
- add_seller_earnings_directly
"""

import pytest
import requests
import os
import sys

# Add backend to path for imports
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestBackendStartup:
    """Test that backend starts without import errors"""
    
    def test_health_endpoint(self):
        """Test backend health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Backend health check passed")
    
    def test_food_orders_router_loaded(self):
        """Test that food orders router is loaded (returns 401 without auth)"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        # 401 means the router is loaded and auth is working
        assert response.status_code == 401
        print("✅ Food orders router loaded correctly")


class TestPhase3Imports:
    """Test that Phase 3 extracted functions are importable"""
    
    def test_import_batch_functions(self):
        """Test importing batch-related functions"""
        from routes.food_order_helpers import (
            check_batch_readiness_and_notify_driver,
            calculate_optimal_pickup_order
        )
        assert callable(check_batch_readiness_and_notify_driver)
        assert callable(calculate_optimal_pickup_order)
        print("✅ Batch functions imported successfully")
    
    def test_import_earnings_functions(self):
        """Test importing earnings-related functions"""
        from routes.food_order_helpers import (
            add_driver_earnings_food,
            add_seller_earnings_food,
            add_earnings_directly,
            add_seller_earnings_directly
        )
        assert callable(add_driver_earnings_food)
        assert callable(add_seller_earnings_food)
        assert callable(add_earnings_directly)
        assert callable(add_seller_earnings_directly)
        print("✅ Earnings functions imported successfully")
    
    def test_import_all_phase1_functions(self):
        """Test that Phase 1 functions are still importable"""
        from routes.food_order_helpers import (
            get_first_name,
            calculate_haversine_distance,
            get_driver_km_settings,
            calculate_driver_fee_by_km,
            get_store_delivery_category,
            get_driver_cancel_settings,
            calculate_driver_cancel_rate,
            add_commission_to_platform_wallet_food,
            send_priority_order_push_notification
        )
        assert callable(get_first_name)
        assert callable(calculate_haversine_distance)
        assert callable(get_driver_km_settings)
        assert callable(calculate_driver_fee_by_km)
        assert callable(get_store_delivery_category)
        assert callable(get_driver_cancel_settings)
        assert callable(calculate_driver_cancel_rate)
        assert callable(add_commission_to_platform_wallet_food)
        assert callable(send_priority_order_push_notification)
        print("✅ Phase 1 functions still importable")
    
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
    
    def test_food_orders_imports_phase3_functions(self):
        """Test that food_orders.py imports Phase 3 functions"""
        # This tests that the import statement in food_orders.py works
        import routes.food_orders as food_orders_module
        
        # Check that the module loaded without errors
        assert hasattr(food_orders_module, 'router')
        print("✅ food_orders.py loaded successfully with Phase 3 imports")
    
    def test_food_orders_uses_imported_functions(self):
        """Verify food_orders.py has access to imported functions"""
        # Read the file and check imports
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # Check Phase 3 imports are present
        assert 'check_batch_readiness_and_notify_driver' in content
        assert 'calculate_optimal_pickup_order' in content
        assert 'add_driver_earnings_food' in content
        assert 'add_seller_earnings_food' in content
        assert 'add_earnings_directly' in content
        assert 'add_seller_earnings_directly' in content
        print("✅ Phase 3 function imports found in food_orders.py")


class TestEndpointsAuth:
    """Test that endpoints require authentication"""
    
    def test_my_orders_requires_auth(self):
        """Test /api/food/orders/my-orders requires auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code == 401
        print("✅ /api/food/orders/my-orders returns 401 without auth")
    
    def test_batch_requires_auth(self):
        """Test /api/food/orders/batch requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/batch",
            json={"orders": [], "delivery_address": "test", "delivery_city": "test", "delivery_phone": "123"}
        )
        assert response.status_code == 401
        print("✅ /api/food/orders/batch returns 401 without auth")
    
    def test_seller_orders_requires_auth(self):
        """Test /api/food/orders/seller requires auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller")
        assert response.status_code == 401
        print("✅ /api/food/orders/seller returns 401 without auth")
    
    def test_store_orders_requires_auth(self):
        """Test /api/food/orders/store/orders requires auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code == 401
        print("✅ /api/food/orders/store/orders returns 401 without auth")
    
    def test_delivery_available_requires_auth(self):
        """Test /api/food/orders/delivery/available requires auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/available")
        assert response.status_code == 401
        print("✅ /api/food/orders/delivery/available returns 401 without auth")


class TestFunctionLogic:
    """Test the logic of extracted functions"""
    
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


class TestFileStructure:
    """Test file structure after refactoring"""
    
    def test_food_orders_file_size_reduced(self):
        """Test that food_orders.py file size was reduced"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            lines = len(f.readlines())
        
        # After Phase 3, should be around 4595 lines (reduced from 4758)
        # Allow some tolerance
        assert lines < 4700, f"food_orders.py has {lines} lines, expected < 4700"
        print(f"✅ food_orders.py has {lines} lines (reduced from original)")
    
    def test_food_order_helpers_exists(self):
        """Test that food_order_helpers.py exists and has content"""
        import os
        path = '/app/backend/routes/food_order_helpers.py'
        assert os.path.exists(path)
        
        with open(path, 'r') as f:
            content = f.read()
        
        # Should have the extracted functions
        assert 'check_batch_readiness_and_notify_driver' in content
        assert 'calculate_optimal_pickup_order' in content
        assert 'add_driver_earnings_food' in content
        assert 'add_seller_earnings_food' in content
        print("✅ food_order_helpers.py exists with Phase 3 functions")
    
    def test_food_order_models_exists(self):
        """Test that food_order_models.py exists (from Phase 2)"""
        import os
        path = '/app/backend/routes/food_order_models.py'
        assert os.path.exists(path)
        print("✅ food_order_models.py exists (Phase 2)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
