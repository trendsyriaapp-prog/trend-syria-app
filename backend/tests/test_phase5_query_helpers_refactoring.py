"""
Phase 5 Testing: Query Helper Functions Refactoring
Tests for the 11 new query helper functions added to food_order_helpers.py

New functions:
1. get_order_by_id
2. get_store_by_id
3. get_driver_by_id
4. get_customer_by_id
5. get_driver_active_food_orders
6. get_available_orders_for_delivery
7. get_stores_by_ids
8. count_driver_hot_fresh_orders
9. can_driver_accept_order
10. update_order_status_with_history
11. assign_driver_to_order
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestBackendStartup:
    """Test that backend starts without import errors"""
    
    def test_health_endpoint(self):
        """Test backend health check"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✅ Backend health check: PASS")
    
    def test_food_orders_router_loaded(self):
        """Test that food orders router is loaded (returns 401 without auth)"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders", timeout=10)
        # 401 means router is loaded but requires auth
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Food orders router loaded: PASS")


class TestPhase5Imports:
    """Test that all Phase 5 functions are importable"""
    
    def test_my_orders_endpoint_requires_auth(self):
        """Test /api/food/orders/my-orders returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders", timeout=10)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/food/orders/my-orders requires auth: PASS")
    
    def test_delivery_available_endpoint_requires_auth(self):
        """Test /api/food/orders/delivery/available returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/available", timeout=10)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/food/orders/delivery/available requires auth: PASS")
    
    def test_seller_endpoint_requires_auth(self):
        """Test /api/food/orders/seller returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller", timeout=10)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/food/orders/seller requires auth: PASS")
    
    def test_store_orders_endpoint_requires_auth(self):
        """Test /api/food/orders/store/orders returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders", timeout=10)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/food/orders/store/orders requires auth: PASS")


class TestPhase5FunctionImports:
    """Test that all 11 new functions are correctly imported"""
    
    def test_import_get_order_by_id(self):
        """Test get_order_by_id is importable"""
        from routes.food_order_helpers import get_order_by_id
        assert callable(get_order_by_id)
        print("✅ get_order_by_id importable: PASS")
    
    def test_import_get_store_by_id(self):
        """Test get_store_by_id is importable"""
        from routes.food_order_helpers import get_store_by_id
        assert callable(get_store_by_id)
        print("✅ get_store_by_id importable: PASS")
    
    def test_import_get_driver_by_id(self):
        """Test get_driver_by_id is importable"""
        from routes.food_order_helpers import get_driver_by_id
        assert callable(get_driver_by_id)
        print("✅ get_driver_by_id importable: PASS")
    
    def test_import_get_customer_by_id(self):
        """Test get_customer_by_id is importable"""
        from routes.food_order_helpers import get_customer_by_id
        assert callable(get_customer_by_id)
        print("✅ get_customer_by_id importable: PASS")
    
    def test_import_get_driver_active_food_orders(self):
        """Test get_driver_active_food_orders is importable"""
        from routes.food_order_helpers import get_driver_active_food_orders
        assert callable(get_driver_active_food_orders)
        print("✅ get_driver_active_food_orders importable: PASS")
    
    def test_import_get_available_orders_for_delivery(self):
        """Test get_available_orders_for_delivery is importable"""
        from routes.food_order_helpers import get_available_orders_for_delivery
        assert callable(get_available_orders_for_delivery)
        print("✅ get_available_orders_for_delivery importable: PASS")
    
    def test_import_get_stores_by_ids(self):
        """Test get_stores_by_ids is importable"""
        from routes.food_order_helpers import get_stores_by_ids
        assert callable(get_stores_by_ids)
        print("✅ get_stores_by_ids importable: PASS")
    
    def test_import_count_driver_hot_fresh_orders(self):
        """Test count_driver_hot_fresh_orders is importable"""
        from routes.food_order_helpers import count_driver_hot_fresh_orders
        assert callable(count_driver_hot_fresh_orders)
        print("✅ count_driver_hot_fresh_orders importable: PASS")
    
    def test_import_can_driver_accept_order(self):
        """Test can_driver_accept_order is importable"""
        from routes.food_order_helpers import can_driver_accept_order
        assert callable(can_driver_accept_order)
        print("✅ can_driver_accept_order importable: PASS")
    
    def test_import_update_order_status_with_history(self):
        """Test update_order_status_with_history is importable"""
        from routes.food_order_helpers import update_order_status_with_history
        assert callable(update_order_status_with_history)
        print("✅ update_order_status_with_history importable: PASS")
    
    def test_import_assign_driver_to_order(self):
        """Test assign_driver_to_order is importable"""
        from routes.food_order_helpers import assign_driver_to_order
        assert callable(assign_driver_to_order)
        print("✅ assign_driver_to_order importable: PASS")


class TestPhase5Constants:
    """Test that constants are still correctly defined"""
    
    def test_hot_fresh_store_types(self):
        """Test HOT_FRESH_STORE_TYPES constant"""
        from routes.food_order_helpers import HOT_FRESH_STORE_TYPES
        expected = ["restaurants", "cafes", "bakery", "drinks", "sweets"]
        assert HOT_FRESH_STORE_TYPES == expected
        print("✅ HOT_FRESH_STORE_TYPES correct: PASS")
    
    def test_cold_dry_store_types(self):
        """Test COLD_DRY_STORE_TYPES constant"""
        from routes.food_order_helpers import COLD_DRY_STORE_TYPES
        expected = ["market", "vegetables"]
        assert COLD_DRY_STORE_TYPES == expected
        print("✅ COLD_DRY_STORE_TYPES correct: PASS")
    
    def test_default_limits(self):
        """Test default limit constants"""
        from routes.food_order_helpers import DEFAULT_HOT_FRESH_LIMIT, DEFAULT_COLD_DRY_LIMIT
        assert DEFAULT_HOT_FRESH_LIMIT == 2
        assert DEFAULT_COLD_DRY_LIMIT == 5
        print("✅ Default limits correct: PASS")
    
    def test_order_statuses(self):
        """Test ORDER_STATUSES constant"""
        from routes.food_order_helpers import ORDER_STATUSES
        expected_keys = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"]
        assert all(key in ORDER_STATUSES for key in expected_keys)
        assert len(ORDER_STATUSES) == 7
        print("✅ ORDER_STATUSES correct: PASS")
    
    def test_platform_wallet_id(self):
        """Test PLATFORM_WALLET_ID constant"""
        from routes.food_order_helpers import PLATFORM_WALLET_ID
        assert PLATFORM_WALLET_ID == "platform_admin_wallet"
        print("✅ PLATFORM_WALLET_ID correct: PASS")


class TestPreviousPhaseFunctions:
    """Test that previous phase functions still work"""
    
    def test_phase1_helper_functions(self):
        """Test Phase 1 helper functions"""
        from routes.food_order_helpers import (
            get_first_name,
            calculate_haversine_distance,
            get_store_delivery_category
        )
        
        # Test get_first_name
        assert get_first_name("محمد أحمد") == "محمد"
        assert get_first_name("") == "السائق"
        
        # Test calculate_haversine_distance
        distance = calculate_haversine_distance(33.5138, 36.2765, 33.5200, 36.2800)
        assert 0 < distance < 2  # Should be less than 2 km
        
        # Test get_store_delivery_category
        assert get_store_delivery_category("restaurants") == "hot_fresh"
        assert get_store_delivery_category("market") == "cold_dry"
        
        print("✅ Phase 1 helper functions: PASS")
    
    def test_phase2_pydantic_models(self):
        """Test Phase 2 Pydantic models"""
        from routes.food_order_models import (
            FoodOrderCreate,
            FoodOrderItem,
            DistanceCheckRequest
        )
        
        # Test FoodOrderItem
        item = FoodOrderItem(product_id="test", name="Test", quantity=1)
        assert item.product_id == "test"
        
        # Test DistanceCheckRequest
        req = DistanceCheckRequest(store_id="store1", customer_lat=33.5, customer_lng=36.2)
        assert req.store_id == "store1"
        
        print("✅ Phase 2 Pydantic models: PASS")
    
    def test_phase3_batch_functions(self):
        """Test Phase 3 batch functions are importable"""
        from routes.food_order_helpers import (
            check_batch_readiness_and_notify_driver,
            calculate_optimal_pickup_order,
            add_driver_earnings_food,
            add_seller_earnings_food
        )
        
        assert callable(check_batch_readiness_and_notify_driver)
        assert callable(calculate_optimal_pickup_order)
        assert callable(add_driver_earnings_food)
        assert callable(add_seller_earnings_food)
        
        print("✅ Phase 3 batch functions: PASS")
    
    def test_phase4_complete_delivery_function(self):
        """Test Phase 4 complete_delivery_and_pay_driver function"""
        from routes.food_order_helpers import complete_delivery_and_pay_driver
        assert callable(complete_delivery_and_pay_driver)
        print("✅ Phase 4 complete_delivery_and_pay_driver: PASS")


class TestFileStructure:
    """Test file structure and sizes"""
    
    def test_food_order_helpers_size(self):
        """Test food_order_helpers.py has correct size"""
        import subprocess
        result = subprocess.run(
            ["wc", "-l", "/app/backend/routes/food_order_helpers.py"],
            capture_output=True, text=True
        )
        lines = int(result.stdout.split()[0])
        assert lines == 1175, f"Expected 1175 lines, got {lines}"
        print(f"✅ food_order_helpers.py size: {lines} lines (expected 1175)")
    
    def test_new_functions_defined_in_helpers(self):
        """Test that all 11 new functions are defined in helpers"""
        import subprocess
        
        new_functions = [
            "get_order_by_id",
            "get_store_by_id",
            "get_driver_by_id",
            "get_customer_by_id",
            "get_driver_active_food_orders",
            "get_available_orders_for_delivery",
            "get_stores_by_ids",
            "count_driver_hot_fresh_orders",
            "can_driver_accept_order",
            "update_order_status_with_history",
            "assign_driver_to_order"
        ]
        
        for func in new_functions:
            result = subprocess.run(
                ["grep", "-n", f"async def {func}", "/app/backend/routes/food_order_helpers.py"],
                capture_output=True, text=True
            )
            assert result.returncode == 0, f"Function {func} not found in helpers"
        
        print(f"✅ All 11 new functions defined in helpers: PASS")
    
    def test_functions_imported_in_food_orders(self):
        """Test that all 11 new functions are imported in food_orders.py"""
        import subprocess
        
        new_functions = [
            "get_order_by_id",
            "get_store_by_id",
            "get_driver_by_id",
            "get_customer_by_id",
            "get_driver_active_food_orders",
            "get_available_orders_for_delivery",
            "get_stores_by_ids",
            "count_driver_hot_fresh_orders",
            "can_driver_accept_order",
            "update_order_status_with_history",
            "assign_driver_to_order"
        ]
        
        for func in new_functions:
            result = subprocess.run(
                ["grep", "-n", func, "/app/backend/routes/food_orders.py"],
                capture_output=True, text=True
            )
            assert result.returncode == 0, f"Function {func} not imported in food_orders.py"
        
        print(f"✅ All 11 new functions imported in food_orders.py: PASS")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
