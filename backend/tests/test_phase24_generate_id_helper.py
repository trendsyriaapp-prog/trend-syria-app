"""
Phase 24: Test generate_id() helper function
Tests:
1. generate_id() helper exists and works correctly
2. generate_id() is imported in food_orders.py
3. generate_id() is used in 2 places (order_id generation)
4. No regression in API endpoints
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPhase24GenerateIdHelper:
    """Tests for Phase 24 generate_id() helper refactoring"""
    
    def test_backend_health(self):
        """Test backend is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Backend is healthy")
    
    def test_generate_id_helper_exists(self):
        """Test generate_id() helper exists in food_order_helpers.py"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        # Check function definition
        assert 'def generate_id() -> str:' in content, "generate_id() function not found"
        
        # Check implementation uses uuid
        assert "uuid" in content, "uuid import not found"
        print("✅ generate_id() helper exists with correct signature")
    
    def test_generate_id_implementation(self):
        """Test generate_id() implementation is correct"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        # Find the function and check implementation
        pattern = r'def generate_id\(\) -> str:\s*"""[^"]*"""\s*return str\(__import__\(\'uuid\'\)\.uuid4\(\)\)'
        match = re.search(pattern, content)
        assert match, "generate_id() implementation not found or incorrect"
        print("✅ generate_id() has correct implementation")
    
    def test_generate_id_has_docstring(self):
        """Test generate_id() has Arabic docstring"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        # Check for Arabic docstring
        assert 'توليد معرف فريد' in content, "Arabic docstring not found"
        print("✅ generate_id() has proper Arabic docstring")
    
    def test_generate_id_imported_in_food_orders(self):
        """Test generate_id is imported in food_orders.py"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # Check import statement
        assert 'generate_id,' in content or 'generate_id' in content, "generate_id not imported"
        
        # Check it's in the import block from food_order_helpers
        import_pattern = r'from routes\.food_order_helpers import \([^)]*generate_id[^)]*\)'
        match = re.search(import_pattern, content, re.DOTALL)
        assert match, "generate_id not imported from food_order_helpers"
        print("✅ generate_id is properly imported in food_orders.py")
    
    def test_generate_id_used_for_order_id(self):
        """Test generate_id() is used for order_id in 2 places"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # Count usages of generate_id()
        usages = content.count('order_id = generate_id()')
        assert usages == 2, f"Expected 2 usages of generate_id() for order_id, found {usages}"
        print(f"✅ Found exactly 2 usages of generate_id() for order_id")
    
    def test_generate_id_returns_valid_uuid(self):
        """Test generate_id() returns valid UUID format"""
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.food_order_helpers import generate_id
        
        # Generate multiple IDs
        ids = [generate_id() for _ in range(5)]
        
        # Check format
        for id_val in ids:
            assert len(id_val) == 36, f"Invalid UUID length: {len(id_val)}"
            assert id_val.count('-') == 4, f"Invalid UUID format: {id_val}"
        
        # Check uniqueness
        assert len(set(ids)) == 5, "Generated IDs are not unique"
        print("✅ generate_id() returns valid unique UUIDs")
    
    def test_file_sizes(self):
        """Test file sizes are as expected"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            food_orders_lines = len(f.readlines())
        
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            helpers_lines = len(f.readlines())
        
        # food_orders.py should be around 4307 lines (was 4306 in Phase 23)
        assert 4300 <= food_orders_lines <= 4350, f"Unexpected food_orders.py size: {food_orders_lines}"
        
        # food_order_helpers.py should be around 1248 lines (was 1243 in Phase 23, +5 for generate_id)
        assert 1240 <= helpers_lines <= 1260, f"Unexpected food_order_helpers.py size: {helpers_lines}"
        
        print(f"✅ food_orders.py has {food_orders_lines} lines")
        print(f"✅ food_order_helpers.py has {helpers_lines} lines")


class TestNoRegressionPhase24:
    """Test no regression in API endpoints after Phase 24 changes"""
    
    def test_check_distance_endpoint(self):
        """Test check-distance endpoint works"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": "test-store",
                "customer_lat": 33.5138,
                "customer_lng": 36.2765
            }
        )
        # 404 is expected for non-existent store
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print("✅ check-distance endpoint works")
    
    def test_my_orders_requires_auth(self):
        """Test my-orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("✅ my-orders requires authentication")
    
    def test_store_orders_requires_auth(self):
        """Test store/orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("✅ store/orders requires authentication")
    
    def test_seller_orders_requires_auth(self):
        """Test seller orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("✅ seller orders requires authentication")
    
    def test_batch_orders_endpoint_exists(self):
        """Test batch orders endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/batch",
            json={}
        )
        # 401/403 for auth or 422 for validation error - both indicate endpoint exists
        assert response.status_code in [401, 403, 422], f"Unexpected status: {response.status_code}"
        print("✅ batch orders endpoint exists")
    
    def test_my_scheduled_endpoint_exists(self):
        """Test my-scheduled endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-scheduled")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("✅ my-scheduled endpoint exists")


class TestSyntaxValidation:
    """Test Python syntax is valid"""
    
    def test_food_orders_syntax(self):
        """Test food_orders.py has no syntax errors"""
        import py_compile
        try:
            py_compile.compile('/app/backend/routes/food_orders.py', doraise=True)
            print("✅ No syntax errors in food_orders.py")
        except py_compile.PyCompileError as e:
            pytest.fail(f"Syntax error in food_orders.py: {e}")
    
    def test_food_order_helpers_syntax(self):
        """Test food_order_helpers.py has no syntax errors"""
        import py_compile
        try:
            py_compile.compile('/app/backend/routes/food_order_helpers.py', doraise=True)
            print("✅ No syntax errors in food_order_helpers.py")
        except py_compile.PyCompileError as e:
            pytest.fail(f"Syntax error in food_order_helpers.py: {e}")
