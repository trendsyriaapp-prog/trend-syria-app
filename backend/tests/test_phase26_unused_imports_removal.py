"""
Phase 26: Verify removal of 4 unused imports from food_orders.py
Removed imports:
- get_driver_active_food_orders
- get_available_orders_for_delivery
- get_stores_by_ids
- count_driver_hot_fresh_orders
"""
import pytest
import requests
import os
import subprocess

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhase26UnusedImportsRemoval:
    """Phase 26: Verify 4 unused imports removed from food_orders.py"""
    
    def test_backend_health(self):
        """Backend should be healthy after import removal"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Backend is healthy")
    
    def test_imports_removed(self):
        """Verify 4 imports are removed from food_orders.py"""
        file_path = "/app/backend/routes/food_orders.py"
        with open(file_path, 'r') as f:
            content = f.read()
        
        removed_imports = [
            "get_driver_active_food_orders",
            "get_available_orders_for_delivery",
            "get_stores_by_ids",
            "count_driver_hot_fresh_orders"
        ]
        
        for imp in removed_imports:
            assert imp not in content, f"Import {imp} should be removed"
            print(f"✅ {imp} removed")
        
        print("✅ All 4 imports successfully removed")
    
    def test_file_size_reduced(self):
        """File should be 4300 lines (was 4304 in Phase 25)"""
        file_path = "/app/backend/routes/food_orders.py"
        with open(file_path, 'r') as f:
            lines = len(f.readlines())
        
        assert lines == 4300, f"Expected 4300 lines, got {lines}"
        print(f"✅ File size: {lines} lines (was 4304, -4 lines)")
    
    def test_module_imports_successfully(self):
        """Module should import without errors"""
        result = subprocess.run(
            ["python", "-c", "from routes.food_orders import router; print('OK')"],
            cwd="/app/backend",
            capture_output=True,
            text=True
        )
        assert result.returncode == 0, f"Import failed: {result.stderr}"
        print("✅ Module imports successfully")
    
    def test_no_syntax_errors(self):
        """No syntax errors in food_orders.py"""
        result = subprocess.run(
            ["python", "-m", "py_compile", "/app/backend/routes/food_orders.py"],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0, f"Syntax error: {result.stderr}"
        print("✅ No syntax errors")


class TestRegressionEndpoints:
    """Regression tests for food order endpoints"""
    
    def test_check_distance_endpoint(self):
        """check-distance endpoint should work"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": "test-store",
                "customer_lat": 33.5138,
                "customer_lng": 36.2765
            }
        )
        # 404 is expected for non-existent store
        assert response.status_code in [200, 404]
        print(f"✅ check-distance endpoint: {response.status_code}")
    
    def test_my_orders_requires_auth(self):
        """my-orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code in [401, 403]
        print(f"✅ my-orders requires auth: {response.status_code}")
    
    def test_store_orders_requires_auth(self):
        """store/orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code in [401, 403]
        print(f"✅ store/orders requires auth: {response.status_code}")
    
    def test_seller_orders_requires_auth(self):
        """seller orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller")
        assert response.status_code in [401, 403]
        print(f"✅ seller orders requires auth: {response.status_code}")
    
    def test_my_scheduled_requires_auth(self):
        """my-scheduled endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-scheduled")
        assert response.status_code in [401, 403]
        print(f"✅ my-scheduled requires auth: {response.status_code}")
    
    def test_batch_orders_endpoint_exists(self):
        """batch orders endpoint should exist"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/batch",
            json={}
        )
        # 401/403 for auth or 422 for validation error
        assert response.status_code in [401, 403, 422]
        print(f"✅ batch orders endpoint exists: {response.status_code}")
