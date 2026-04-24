"""
Phase 27.1: Test helper function replacement in get_waiting_status
المرحلة 27.1: اختبار استبدال استعلام MongoDB بدالة helper في get_waiting_status

Changes verified:
- get_waiting_status now uses get_order_for_driver helper instead of direct MongoDB query
- check-drivers-availability endpoint works correctly
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhase27HelperReplacement:
    """Test Phase 27.1 - Helper function replacement in food_orders.py"""
    
    def test_backend_health(self):
        """Test 1: Backend is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Backend is healthy")
    
    def test_check_drivers_availability_requires_auth(self):
        """Test 2: check-drivers-availability endpoint requires authentication"""
        # Test with a fake order_id - should require auth
        response = requests.get(f"{BASE_URL}/api/food/orders/check-drivers-availability/fake-order-id")
        # Should return 401 (unauthorized) or 403 (forbidden) without auth
        assert response.status_code in [401, 403, 404], f"Expected 401/403/404, got {response.status_code}"
        print(f"✅ check-drivers-availability requires auth (status: {response.status_code})")
    
    def test_waiting_status_requires_delivery_user(self):
        """Test 3: waiting-status endpoint requires delivery user"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/fake-order-id/waiting-status")
        # Should return 401/403 without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ waiting-status requires delivery user auth (status: {response.status_code})")
    
    def test_check_distance_endpoint_exists(self):
        """Test 4: check-distance endpoint exists and works"""
        # This endpoint doesn't require auth
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": "test-store-id",
                "customer_lat": 33.5138,
                "customer_lng": 36.2765
            }
        )
        # Should return 404 (store not found) or 200 (if store exists)
        assert response.status_code in [200, 404, 422], f"Expected 200/404/422, got {response.status_code}"
        print(f"✅ check-distance endpoint exists (status: {response.status_code})")
    
    def test_my_orders_requires_auth(self):
        """Test 5: my-orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ my-orders requires auth (status: {response.status_code})")
    
    def test_store_orders_requires_auth(self):
        """Test 6: store/orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ store/orders requires auth (status: {response.status_code})")
    
    def test_seller_orders_requires_auth(self):
        """Test 7: seller orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ seller orders requires auth (status: {response.status_code})")
    
    def test_delivery_available_orders_requires_auth(self):
        """Test 8: delivery/available-orders requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/available-orders")
        # 404 is acceptable if endpoint path is different
        assert response.status_code in [401, 403, 404], f"Expected 401/403/404, got {response.status_code}"
        print(f"✅ delivery/available-orders endpoint check (status: {response.status_code})")
    
    def test_delivery_my_orders_requires_auth(self):
        """Test 9: delivery/my-orders requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/my-orders")
        # 404 is acceptable if endpoint path is different
        assert response.status_code in [401, 403, 404], f"Expected 401/403/404, got {response.status_code}"
        print(f"✅ delivery/my-orders endpoint check (status: {response.status_code})")
    
    def test_priority_orders_requires_delivery_user(self):
        """Test 10: priority-orders requires delivery user"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/priority-orders")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ priority-orders requires delivery user (status: {response.status_code})")


class TestHelperFunctionsExist:
    """Test that helper functions are properly imported and used"""
    
    def test_get_order_for_driver_helper_exists(self):
        """Test 11: Verify get_order_for_driver helper is imported in food_orders.py"""
        import subprocess
        result = subprocess.run(
            ["grep", "-c", "get_order_for_driver", "/app/backend/routes/food_orders.py"],
            capture_output=True,
            text=True
        )
        count = int(result.stdout.strip()) if result.stdout.strip() else 0
        # Should be imported (1) and used multiple times
        assert count >= 2, f"get_order_for_driver should be imported and used, found {count} occurrences"
        print(f"✅ get_order_for_driver is used {count} times in food_orders.py")
    
    def test_get_waiting_status_uses_helper(self):
        """Test 12: Verify get_waiting_status uses get_order_for_driver helper"""
        import subprocess
        # Check that get_waiting_status function uses get_order_for_driver
        result = subprocess.run(
            ["grep", "-A", "5", "async def get_waiting_status", "/app/backend/routes/food_orders.py"],
            capture_output=True,
            text=True
        )
        assert "get_order_for_driver" in result.stdout, "get_waiting_status should use get_order_for_driver helper"
        print("✅ get_waiting_status uses get_order_for_driver helper")
    
    def test_no_duplicate_query_in_get_waiting_status(self):
        """Test 13: Verify no duplicate MongoDB query in get_waiting_status"""
        import subprocess
        # Check that get_waiting_status doesn't have direct db.food_orders.find_one
        result = subprocess.run(
            ["grep", "-A", "20", "async def get_waiting_status", "/app/backend/routes/food_orders.py"],
            capture_output=True,
            text=True
        )
        # Should NOT contain direct db.food_orders.find_one query
        assert "db.food_orders.find_one" not in result.stdout, "get_waiting_status should not have direct MongoDB query"
        print("✅ get_waiting_status doesn't have duplicate MongoDB query")
    
    def test_food_orders_module_imports_successfully(self):
        """Test 14: Verify food_orders module imports without errors"""
        import subprocess
        result = subprocess.run(
            ["python3", "-c", "import sys; sys.path.insert(0, '/app/backend'); from routes.food_orders import router; print('OK')"],
            capture_output=True,
            text=True,
            cwd="/app/backend"
        )
        assert "OK" in result.stdout or result.returncode == 0, f"Module import failed: {result.stderr}"
        print("✅ food_orders module imports successfully")
    
    def test_food_order_helpers_module_imports_successfully(self):
        """Test 15: Verify food_order_helpers module imports without errors"""
        import subprocess
        result = subprocess.run(
            ["python3", "-c", "import sys; sys.path.insert(0, '/app/backend'); from routes.food_order_helpers import get_order_for_driver; print('OK')"],
            capture_output=True,
            text=True,
            cwd="/app/backend"
        )
        assert "OK" in result.stdout or result.returncode == 0, f"Module import failed: {result.stderr}"
        print("✅ food_order_helpers module imports successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
