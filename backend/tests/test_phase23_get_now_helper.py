"""
Phase 23 Tests: get_now() helper function
المرحلة 23: اختبار دالة get_now() المساعدة

Tests:
1. Verify get_now() helper exists and works correctly
2. Verify get_now() is imported in food_orders.py
3. Verify 5 usages of get_now() in food_orders.py
4. Verify timestamps format is correct
5. No regression in API endpoints
"""

import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPhase23GetNowHelper:
    """Phase 23: get_now() helper function tests"""
    
    def test_health_endpoint(self):
        """Test backend is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Backend is healthy")
    
    def test_get_now_helper_exists(self):
        """Verify get_now() helper exists in food_order_helpers.py"""
        helper_file = "/app/backend/routes/food_order_helpers.py"
        
        with open(helper_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check function definition
        assert "def get_now() -> str:" in content, "get_now() function definition not found"
        assert 'return datetime.now(timezone.utc).isoformat()' in content, "get_now() implementation not correct"
        print("✅ get_now() helper exists with correct implementation")
    
    def test_get_now_helper_docstring(self):
        """Verify get_now() has proper docstring"""
        helper_file = "/app/backend/routes/food_order_helpers.py"
        
        with open(helper_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check docstring exists
        assert '"""الحصول على الوقت الحالي بتنسيق ISO"""' in content, "get_now() docstring not found"
        print("✅ get_now() has proper Arabic docstring")
    
    def test_get_now_imported_in_food_orders(self):
        """Verify get_now is imported in food_orders.py"""
        food_orders_file = "/app/backend/routes/food_orders.py"
        
        with open(food_orders_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check import
        assert "get_now," in content, "get_now not imported in food_orders.py"
        assert "from routes.food_order_helpers import" in content, "food_order_helpers import not found"
        print("✅ get_now is properly imported in food_orders.py")
    
    def test_get_now_usage_count(self):
        """Verify exactly 5 usages of get_now() in food_orders.py"""
        food_orders_file = "/app/backend/routes/food_orders.py"
        
        with open(food_orders_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Count usages (excluding import line)
        usage_count = content.count("now = get_now()")
        
        assert usage_count == 5, f"Expected 5 usages of 'now = get_now()', found {usage_count}"
        print(f"✅ Found exactly 5 usages of get_now() in food_orders.py")
    
    def test_get_now_returns_valid_iso_format(self):
        """Test that get_now() returns valid ISO format timestamp"""
        # Import and test the function directly
        import sys
        sys.path.insert(0, '/app/backend')
        
        from routes.food_order_helpers import get_now
        
        result = get_now()
        
        # Verify it's a string
        assert isinstance(result, str), "get_now() should return a string"
        
        # Verify it can be parsed as ISO format
        try:
            parsed = datetime.fromisoformat(result.replace('Z', '+00:00'))
            assert parsed.tzinfo is not None or '+' in result, "Timestamp should include timezone info"
            print(f"✅ get_now() returns valid ISO format: {result}")
        except ValueError as e:
            pytest.fail(f"get_now() returned invalid ISO format: {result}, error: {e}")
    
    def test_get_now_returns_utc_time(self):
        """Test that get_now() returns UTC time"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        from routes.food_order_helpers import get_now
        
        result = get_now()
        now_utc = datetime.now(timezone.utc)
        
        # Parse the result
        parsed = datetime.fromisoformat(result.replace('Z', '+00:00'))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        
        # Should be within 2 seconds of current UTC time
        diff = abs((now_utc - parsed).total_seconds())
        assert diff < 2, f"get_now() time differs from UTC by {diff} seconds"
        print(f"✅ get_now() returns correct UTC time (diff: {diff:.3f}s)")


class TestPhase23NoRegression:
    """Phase 23: No regression tests for API endpoints"""
    
    def test_check_distance_endpoint(self):
        """Test check-distance endpoint still works"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": "test-store-123",
                "customer_lat": 33.5138,
                "customer_lng": 36.2765
            }
        )
        # 404 is expected if store doesn't exist, but endpoint should respond
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print(f"✅ check-distance endpoint responds (status: {response.status_code})")
    
    def test_my_orders_requires_auth(self):
        """Test my-orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ my-orders endpoint requires authentication")
    
    def test_store_orders_requires_auth(self):
        """Test store/orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ store/orders endpoint requires authentication")
    
    def test_seller_orders_requires_auth(self):
        """Test seller orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ seller orders endpoint requires authentication")
    
    def test_batch_orders_endpoint_exists(self):
        """Test batch orders endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/batch",
            json={}
        )
        # 401/403 (auth required) or 422 (validation error) expected
        assert response.status_code in [401, 403, 422], f"Unexpected status: {response.status_code}"
        print(f"✅ batch orders endpoint exists (status: {response.status_code})")
    
    def test_my_scheduled_endpoint_exists(self):
        """Test my-scheduled endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-scheduled")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ my-scheduled endpoint exists")


class TestPhase23FileIntegrity:
    """Phase 23: File integrity tests"""
    
    def test_food_orders_file_size(self):
        """Verify food_orders.py file size is reasonable"""
        food_orders_file = "/app/backend/routes/food_orders.py"
        
        with open(food_orders_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        line_count = len(lines)
        # Phase 22 had 4305 lines, Phase 23 should be similar (no major changes)
        assert 4200 <= line_count <= 4400, f"Unexpected line count: {line_count}"
        print(f"✅ food_orders.py has {line_count} lines (expected ~4305)")
    
    def test_food_order_helpers_file_size(self):
        """Verify food_order_helpers.py file size"""
        helper_file = "/app/backend/routes/food_order_helpers.py"
        
        with open(helper_file, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        line_count = len(lines)
        # Should have get_now() function added
        assert line_count >= 1200, f"Helper file seems too small: {line_count} lines"
        print(f"✅ food_order_helpers.py has {line_count} lines")
    
    def test_no_syntax_errors_in_food_orders(self):
        """Verify no syntax errors in food_orders.py"""
        import py_compile
        
        try:
            py_compile.compile('/app/backend/routes/food_orders.py', doraise=True)
            print("✅ food_orders.py has no syntax errors")
        except py_compile.PyCompileError as e:
            pytest.fail(f"Syntax error in food_orders.py: {e}")
    
    def test_no_syntax_errors_in_helpers(self):
        """Verify no syntax errors in food_order_helpers.py"""
        import py_compile
        
        try:
            py_compile.compile('/app/backend/routes/food_order_helpers.py', doraise=True)
            print("✅ food_order_helpers.py has no syntax errors")
        except py_compile.PyCompileError as e:
            pytest.fail(f"Syntax error in food_order_helpers.py: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
