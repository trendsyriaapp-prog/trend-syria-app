# Phase 22: Code Cleanup Tests
# تنظيف الكود - حذف import غير مستخدم (logging) + إزالة سطور فارغة زائدة

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhase22CodeCleanup:
    """Phase 22: Code cleanup verification tests"""
    
    def test_backend_health(self):
        """Test backend is healthy after cleanup"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Backend is healthy after Phase 22 cleanup")
    
    def test_food_orders_router_loaded(self):
        """Test food orders router is loaded correctly"""
        # Test an endpoint that requires auth - should return 401/403, not 500
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code in [401, 403, 422]
        print("✅ Food orders router loaded correctly")
    
    def test_check_distance_endpoint_works(self):
        """Test check-distance endpoint works (no regression)"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": "nonexistent",
                "customer_lat": 33.5138,
                "customer_lng": 36.2765
            }
        )
        # Should return 404 for non-existent store, not 500
        assert response.status_code == 404
        data = response.json()
        assert "المتجر غير موجود" in data.get("detail", "")
        print("✅ check-distance endpoint works correctly")
    
    def test_store_orders_requires_auth(self):
        """Test store orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code in [401, 403, 422]
        print("✅ store/orders requires authentication")
    
    def test_seller_orders_requires_auth(self):
        """Test seller orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller")
        assert response.status_code in [401, 403, 422]
        print("✅ seller orders requires authentication")


class TestPhase22FileVerification:
    """Verify file changes from Phase 22"""
    
    def test_no_logging_import(self):
        """Verify logging import was removed"""
        file_path = "/app/backend/routes/food_orders.py"
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check that 'import logging' is not present at the start of a line
        lines = content.split('\n')
        for line in lines:
            stripped = line.strip()
            if stripped == "import logging":
                pytest.fail("Found 'import logging' - should have been removed")
        
        print("✅ 'import logging' was successfully removed")
    
    def test_file_size_reduced(self):
        """Verify file size was reduced from 4310 to 4305 lines"""
        file_path = "/app/backend/routes/food_orders.py"
        with open(file_path, 'r') as f:
            lines = f.readlines()
        
        line_count = len(lines)
        # Phase 21 had 4310 lines, Phase 22 should have 4305 lines (-5 lines)
        assert line_count == 4305, f"Expected 4305 lines, got {line_count}"
        print(f"✅ File size is correct: {line_count} lines (reduced from 4310)")
    
    def test_no_excessive_blank_lines(self):
        """Verify no excessive blank lines (more than 2 consecutive)"""
        file_path = "/app/backend/routes/food_orders.py"
        with open(file_path, 'r') as f:
            content = f.read()
        
        # Check for more than 2 consecutive blank lines
        if '\n\n\n\n' in content:
            pytest.fail("Found more than 3 consecutive blank lines")
        
        print("✅ No excessive blank lines found")
    
    def test_imports_are_valid(self):
        """Verify all imports at the top of the file are valid"""
        file_path = "/app/backend/routes/food_orders.py"
        with open(file_path, 'r') as f:
            lines = f.readlines()
        
        # Check first 80 lines for imports
        import_lines = []
        for i, line in enumerate(lines[:80]):
            stripped = line.strip()
            if stripped.startswith('import ') or stripped.startswith('from '):
                import_lines.append((i+1, stripped))
        
        # Verify logging is not in imports
        for line_num, import_line in import_lines:
            if 'logging' in import_line:
                pytest.fail(f"Found logging import at line {line_num}: {import_line}")
        
        print(f"✅ All {len(import_lines)} imports are valid (no logging)")


class TestPhase22NoRegression:
    """Ensure no regression after cleanup"""
    
    def test_batch_orders_endpoint_exists(self):
        """Test batch orders endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/batch",
            json={}
        )
        # Should return 422 (validation error) or 401 (auth required), not 404
        assert response.status_code in [401, 403, 422]
        print("✅ batch orders endpoint exists")
    
    def test_scheduled_orders_endpoint_exists(self):
        """Test scheduled orders endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-scheduled")
        # Should return 401 (auth required), not 404
        assert response.status_code in [401, 403, 422]
        print("✅ my-scheduled endpoint exists")
    
    def test_drivers_availability_endpoint_exists(self):
        """Test drivers availability endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/food/orders/check-drivers-availability/test-order-id")
        # Should return 401 (auth required), not 404
        assert response.status_code in [401, 403, 422]
        print("✅ check-drivers-availability endpoint exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
