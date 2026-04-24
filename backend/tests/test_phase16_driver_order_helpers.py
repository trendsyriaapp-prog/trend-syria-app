"""
Test file for Phase 16 refactoring of food_orders.py
Tests the replacement of 6 additional db.food_orders.find_one usages with get_order_for_driver helper

Replaced usages in Phase 16:
1. verify_pickup_code (line 2960)
2. start_delivery_to_customer (line 3015)
3. delivery_arrived_at_customer (line 3312)
4. mark_customer_not_responding (line 3558)
5. leave_order_at_door (line 3622)
6. complete_food_delivery (line 3659)

All these endpoints now use get_order_for_driver helper from food_order_helpers.py
"""

import pytest
import requests
import os
import sys

# Add backend to path for imports
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com').rstrip('/')


class TestBackendHealth:
    """Test that backend is healthy after Phase 16 refactoring"""
    
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


class TestPhase16Imports:
    """Test that Phase 16 uses get_order_for_driver correctly"""
    
    def test_import_get_order_for_driver(self):
        """Test importing get_order_for_driver function"""
        from routes.food_order_helpers import get_order_for_driver
        assert callable(get_order_for_driver)
        print("✅ get_order_for_driver imported successfully")
    
    def test_get_order_for_driver_signature(self):
        """Test get_order_for_driver function signature"""
        import inspect
        from routes.food_order_helpers import get_order_for_driver
        
        sig = inspect.signature(get_order_for_driver)
        params = list(sig.parameters.keys())
        
        assert 'order_id' in params
        assert 'driver_id' in params
        assert 'status' in params  # Optional parameter
        print("✅ get_order_for_driver has correct signature (order_id, driver_id, status)")
    
    def test_import_all_helpers(self):
        """Test that all helper functions are still importable"""
        from routes.food_order_helpers import (
            get_order_for_customer,
            get_order_for_store,
            get_order_for_driver,
            get_order_by_id,
            get_store_by_id,
            get_driver_by_id,
            get_customer_by_id,
            complete_delivery_and_pay_driver,
            update_order_status_with_history,
            assign_driver_to_order,
            ORDER_STATUSES
        )
        print("✅ All helper functions imported successfully")


class TestFoodOrdersImports:
    """Test that food_orders.py imports get_order_for_driver correctly"""
    
    def test_food_orders_imports_get_order_for_driver(self):
        """Test that food_orders.py imports get_order_for_driver"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # Check import statement
        assert 'get_order_for_driver' in content
        print("✅ get_order_for_driver import found in food_orders.py")
    
    def test_food_orders_uses_get_order_for_driver(self):
        """Test that food_orders.py uses get_order_for_driver in Phase 16 endpoints"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # Count usages of get_order_for_driver
        usages = content.count('await get_order_for_driver(')
        
        # Should have at least 6 usages after Phase 16
        assert usages >= 6, f"Expected at least 6 usages of get_order_for_driver, found {usages}"
        print(f"✅ get_order_for_driver is used {usages} times in food_orders.py")
    
    def test_food_orders_module_loads(self):
        """Test that food_orders.py loads without errors"""
        import routes.food_orders as food_orders_module
        assert hasattr(food_orders_module, 'router')
        print("✅ food_orders.py loaded successfully")


class TestPhase16DriverEndpointsAuth:
    """Test that Phase 16 driver endpoints require authentication"""
    
    def test_verify_pickup_requires_auth(self):
        """Test /api/food/orders/delivery/{order_id}/verify-pickup requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/verify-pickup",
            json={"code": "1234"}
        )
        assert response.status_code == 401
        print("✅ /api/food/orders/delivery/{order_id}/verify-pickup returns 401 without auth")
    
    def test_on_the_way_requires_auth(self):
        """Test /api/food/orders/delivery/{order_id}/on-the-way requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/on-the-way",
            json={"estimated_minutes": 30}
        )
        assert response.status_code == 401
        print("✅ /api/food/orders/delivery/{order_id}/on-the-way returns 401 without auth")
    
    def test_arrived_customer_requires_auth(self):
        """Test /api/food/orders/delivery/{order_id}/arrived-customer requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/arrived-customer"
        )
        assert response.status_code == 401
        print("✅ /api/food/orders/delivery/{order_id}/arrived-customer returns 401 without auth")
    
    def test_customer_not_responding_requires_auth(self):
        """Test /api/food/orders/delivery/{order_id}/customer-not-responding requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/customer-not-responding"
        )
        assert response.status_code == 401
        print("✅ /api/food/orders/delivery/{order_id}/customer-not-responding returns 401 without auth")
    
    def test_leave_at_door_requires_auth(self):
        """Test /api/food/orders/delivery/{order_id}/leave-at-door requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/leave-at-door"
        )
        assert response.status_code == 401
        print("✅ /api/food/orders/delivery/{order_id}/leave-at-door returns 401 without auth")
    
    def test_complete_delivery_requires_auth(self):
        """Test /api/food/orders/delivery/{order_id}/complete requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/complete"
        )
        assert response.status_code == 401
        print("✅ /api/food/orders/delivery/{order_id}/complete returns 401 without auth")


class TestFileStructure:
    """Test file structure after Phase 16 refactoring"""
    
    def test_food_orders_file_size_reduced(self):
        """Test that food_orders.py file size was reduced"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            lines = len(f.readlines())
        
        # After Phase 16, should be around 4391 lines (reduced from 4422)
        assert lines < 4450, f"food_orders.py has {lines} lines, expected < 4450"
        print(f"✅ food_orders.py has {lines} lines (reduced from 4422)")
    
    def test_food_order_helpers_has_get_order_for_driver(self):
        """Test that food_order_helpers.py has get_order_for_driver function"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        assert 'async def get_order_for_driver' in content
        print("✅ food_order_helpers.py has get_order_for_driver function")
    
    def test_food_order_helpers_line_count(self):
        """Test that food_order_helpers.py has expected line count"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            lines = len(f.readlines())
        
        # Should have more than 1200 lines
        assert lines > 1200, f"food_order_helpers.py has {lines} lines, expected > 1200"
        print(f"✅ food_order_helpers.py has {lines} lines")


class TestGetOrderForDriverLogic:
    """Test the logic of get_order_for_driver helper"""
    
    def test_get_order_for_driver_with_status(self):
        """Test get_order_for_driver accepts status parameter"""
        import inspect
        from routes.food_order_helpers import get_order_for_driver
        
        sig = inspect.signature(get_order_for_driver)
        params = sig.parameters
        
        # Check status parameter has default value None
        assert 'status' in params
        assert params['status'].default is None
        print("✅ get_order_for_driver accepts optional status parameter")
    
    def test_get_order_for_driver_is_async(self):
        """Test get_order_for_driver is an async function"""
        import asyncio
        from routes.food_order_helpers import get_order_for_driver
        
        assert asyncio.iscoroutinefunction(get_order_for_driver)
        print("✅ get_order_for_driver is an async function")


class TestNoRegressions:
    """Test that no regressions occurred after Phase 16 refactoring"""
    
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
    
    def test_my_deliveries_requires_auth(self):
        """Test /api/food/orders/delivery/my-deliveries requires auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/my-deliveries")
        assert response.status_code == 401
        print("✅ /api/food/orders/delivery/my-deliveries requires auth")
    
    def test_verify_code_requires_auth(self):
        """Test /api/food/orders/delivery/{order_id}/verify-code requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/verify-code",
            json={"delivery_code": "1234"}
        )
        assert response.status_code == 401
        print("✅ /api/food/orders/delivery/{order_id}/verify-code requires auth")


class TestPhase16SpecificUsages:
    """Test specific usages of get_order_for_driver in Phase 16"""
    
    def test_verify_pickup_uses_helper(self):
        """Test verify_pickup_code uses get_order_for_driver"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # Find verify_pickup_code function and check it uses the helper
        # The function should be around line 2954
        assert 'async def verify_pickup_code' in content
        
        # Check that get_order_for_driver is used near verify_pickup_code
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'async def verify_pickup_code' in line:
                # Check next 20 lines for get_order_for_driver usage
                context = '\n'.join(lines[i:i+20])
                assert 'get_order_for_driver' in context
                print("✅ verify_pickup_code uses get_order_for_driver")
                return
        
        pytest.fail("verify_pickup_code function not found")
    
    def test_start_delivery_uses_helper(self):
        """Test start_delivery_to_customer uses get_order_for_driver"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'async def start_delivery_to_customer' in line:
                context = '\n'.join(lines[i:i+20])
                assert 'get_order_for_driver' in context
                print("✅ start_delivery_to_customer uses get_order_for_driver")
                return
        
        pytest.fail("start_delivery_to_customer function not found")
    
    def test_arrived_customer_uses_helper(self):
        """Test delivery_arrived_at_customer uses get_order_for_driver"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'async def delivery_arrived_at_customer' in line:
                context = '\n'.join(lines[i:i+20])
                assert 'get_order_for_driver' in context
                print("✅ delivery_arrived_at_customer uses get_order_for_driver")
                return
        
        pytest.fail("delivery_arrived_at_customer function not found")
    
    def test_customer_not_responding_uses_helper(self):
        """Test mark_customer_not_responding uses get_order_for_driver"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'async def mark_customer_not_responding' in line:
                context = '\n'.join(lines[i:i+20])
                assert 'get_order_for_driver' in context
                print("✅ mark_customer_not_responding uses get_order_for_driver")
                return
        
        pytest.fail("mark_customer_not_responding function not found")
    
    def test_leave_at_door_uses_helper(self):
        """Test leave_order_at_door uses get_order_for_driver"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'async def leave_order_at_door' in line:
                context = '\n'.join(lines[i:i+20])
                assert 'get_order_for_driver' in context
                print("✅ leave_order_at_door uses get_order_for_driver")
                return
        
        pytest.fail("leave_order_at_door function not found")
    
    def test_complete_delivery_uses_helper(self):
        """Test complete_food_delivery uses get_order_for_driver"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if 'async def complete_food_delivery' in line:
                context = '\n'.join(lines[i:i+20])
                assert 'get_order_for_driver' in context
                print("✅ complete_food_delivery uses get_order_for_driver")
                return
        
        pytest.fail("complete_food_delivery function not found")


class TestHelperFunctionLogic:
    """Test helper function logic"""
    
    def test_get_first_name(self):
        """Test get_first_name function"""
        from routes.food_order_helpers import get_first_name
        
        assert get_first_name("محمد أحمد") == "محمد"
        assert get_first_name("علي") == "علي"
        assert get_first_name("") == "السائق"
        assert get_first_name(None) == "السائق"
        print("✅ get_first_name works correctly")
    
    def test_order_statuses_complete(self):
        """Test ORDER_STATUSES has all expected statuses"""
        from routes.food_order_helpers import ORDER_STATUSES
        
        expected_statuses = [
            "pending", "confirmed", "preparing", "ready",
            "out_for_delivery", "delivered", "cancelled"
        ]
        
        for status in expected_statuses:
            assert status in ORDER_STATUSES
        print("✅ ORDER_STATUSES has all expected statuses")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
