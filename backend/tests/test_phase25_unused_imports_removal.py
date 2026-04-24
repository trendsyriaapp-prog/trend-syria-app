"""
Phase 25: Test removal of 3 unused imports from food_orders.py
- can_driver_accept_order
- update_order_status_with_history  
- assign_driver_to_order
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhase25UnusedImportsRemoval:
    """Verify Phase 25 changes - removal of 3 unused imports"""
    
    def test_backend_health(self):
        """Backend should be healthy after import removal"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ Backend is healthy")
    
    def test_imports_removed_from_food_orders(self):
        """Verify the 3 imports are no longer in food_orders.py"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        removed_imports = [
            'can_driver_accept_order',
            'update_order_status_with_history',
            'assign_driver_to_order'
        ]
        
        for imp in removed_imports:
            assert imp not in content, f"Import '{imp}' should be removed"
            print(f"✅ '{imp}' is removed from food_orders.py")
    
    def test_file_size_reduced(self):
        """File should be 4304 lines (was 4307, -3 lines)"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            lines = len(f.readlines())
        
        assert lines == 4304, f"Expected 4304 lines, got {lines}"
        print(f"✅ File size is correct: {lines} lines")
    
    def test_module_imports_successfully(self):
        """food_orders module should import without errors"""
        import subprocess
        result = subprocess.run(
            ['python', '-c', 'import routes.food_orders; print("OK")'],
            cwd='/app/backend',
            capture_output=True,
            text=True
        )
        assert result.returncode == 0, f"Import failed: {result.stderr}"
        assert "OK" in result.stdout
        print("✅ food_orders module imports successfully")
    
    def test_no_syntax_errors(self):
        """No syntax errors in food_orders.py"""
        import py_compile
        try:
            py_compile.compile('/app/backend/routes/food_orders.py', doraise=True)
            print("✅ No syntax errors in food_orders.py")
        except py_compile.PyCompileError as e:
            pytest.fail(f"Syntax error: {e}")
    
    # Regression tests - verify key endpoints still work
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
        # 404 is expected for non-existent store, but endpoint works
        assert response.status_code in [200, 404]
        print(f"✅ check-distance endpoint works (status: {response.status_code})")
    
    def test_my_orders_requires_auth(self):
        """my-orders endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code in [401, 403]
        print("✅ my-orders requires authentication")
    
    def test_store_orders_requires_auth(self):
        """store/orders endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code in [401, 403]
        print("✅ store/orders requires authentication")
    
    def test_seller_orders_requires_auth(self):
        """seller orders endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller")
        assert response.status_code in [401, 403]
        print("✅ seller orders requires authentication")
    
    def test_batch_orders_endpoint_exists(self):
        """batch orders endpoint should exist"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/batch",
            json={}
        )
        # 401/403 for auth or 422 for validation - endpoint exists
        assert response.status_code in [401, 403, 422]
        print(f"✅ batch orders endpoint exists (status: {response.status_code})")
    
    def test_my_scheduled_endpoint_exists(self):
        """my-scheduled endpoint should exist"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-scheduled")
        assert response.status_code in [401, 403]
        print("✅ my-scheduled endpoint exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
