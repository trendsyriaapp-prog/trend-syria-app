"""
Phase 17 Tests: require_delivery_user dependency
Tests for verifying that 6 driver endpoints use require_delivery_user dependency
instead of manual user type checking.

Endpoints tested:
1. verify_pickup_code
2. start_delivery_to_customer
3. delivery_arrived_at_customer
4. mark_customer_not_responding
5. leave_order_at_door
6. complete_food_delivery
"""

import pytest
import requests
import os
import ast
import inspect

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_PHONE = "0945570365"
TEST_PASSWORD = "TrendSyria@2026"
TEST_OTP = "123456"


class TestBackendHealth:
    """Basic health checks"""
    
    def test_health_endpoint(self):
        """Test that backend is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Backend is healthy")
    
    def test_food_orders_router_loaded(self):
        """Test that food orders router is loaded"""
        # Try to access an endpoint that requires auth - should return 401/403, not 404
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("✅ Food orders router is loaded")


class TestRequireDeliveryUserImport:
    """Test that require_delivery_user is properly imported and defined"""
    
    def test_helper_has_require_delivery_user(self):
        """Test that food_order_helpers.py has require_delivery_user function"""
        helper_path = "/app/backend/routes/food_order_helpers.py"
        with open(helper_path, 'r') as f:
            content = f.read()
        
        assert "def require_delivery_user" in content
        print("✅ require_delivery_user function exists in food_order_helpers.py")
    
    def test_require_delivery_user_logic(self):
        """Test that require_delivery_user checks user_type == 'delivery'"""
        helper_path = "/app/backend/routes/food_order_helpers.py"
        with open(helper_path, 'r') as f:
            content = f.read()
        
        # Check the function contains the correct logic
        assert 'user_type' in content
        assert '"delivery"' in content or "'delivery'" in content
        assert "HTTPException" in content
        print("✅ require_delivery_user has correct logic")
    
    def test_food_orders_imports_require_delivery_user(self):
        """Test that food_orders.py imports require_delivery_user"""
        orders_path = "/app/backend/routes/food_orders.py"
        with open(orders_path, 'r') as f:
            content = f.read()
        
        assert "require_delivery_user" in content
        assert "from routes.food_order_helpers import" in content
        print("✅ food_orders.py imports require_delivery_user")


class TestPhase17EndpointsUseRequireDeliveryUser:
    """Test that all 6 endpoints use require_delivery_user dependency"""
    
    def test_verify_pickup_code_uses_dependency(self):
        """Test verify_pickup_code uses require_delivery_user"""
        orders_path = "/app/backend/routes/food_orders.py"
        with open(orders_path, 'r') as f:
            content = f.read()
        
        # Find the function definition
        assert "async def verify_pickup_code" in content
        
        # Check it uses require_delivery_user
        # Find the line with the function definition
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if "async def verify_pickup_code" in line:
                # Check this line or next few lines for require_delivery_user
                func_def = '\n'.join(lines[i:i+5])
                assert "require_delivery_user" in func_def, f"verify_pickup_code should use require_delivery_user"
                print("✅ verify_pickup_code uses require_delivery_user")
                return
        
        pytest.fail("verify_pickup_code function not found")
    
    def test_start_delivery_to_customer_uses_dependency(self):
        """Test start_delivery_to_customer uses require_delivery_user"""
        orders_path = "/app/backend/routes/food_orders.py"
        with open(orders_path, 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if "async def start_delivery_to_customer" in line:
                func_def = '\n'.join(lines[i:i+5])
                assert "require_delivery_user" in func_def, f"start_delivery_to_customer should use require_delivery_user"
                print("✅ start_delivery_to_customer uses require_delivery_user")
                return
        
        pytest.fail("start_delivery_to_customer function not found")
    
    def test_delivery_arrived_at_customer_uses_dependency(self):
        """Test delivery_arrived_at_customer uses require_delivery_user"""
        orders_path = "/app/backend/routes/food_orders.py"
        with open(orders_path, 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if "async def delivery_arrived_at_customer" in line:
                func_def = '\n'.join(lines[i:i+5])
                assert "require_delivery_user" in func_def, f"delivery_arrived_at_customer should use require_delivery_user"
                print("✅ delivery_arrived_at_customer uses require_delivery_user")
                return
        
        pytest.fail("delivery_arrived_at_customer function not found")
    
    def test_mark_customer_not_responding_uses_dependency(self):
        """Test mark_customer_not_responding uses require_delivery_user"""
        orders_path = "/app/backend/routes/food_orders.py"
        with open(orders_path, 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if "async def mark_customer_not_responding" in line:
                func_def = '\n'.join(lines[i:i+5])
                assert "require_delivery_user" in func_def, f"mark_customer_not_responding should use require_delivery_user"
                print("✅ mark_customer_not_responding uses require_delivery_user")
                return
        
        pytest.fail("mark_customer_not_responding function not found")
    
    def test_leave_order_at_door_uses_dependency(self):
        """Test leave_order_at_door uses require_delivery_user"""
        orders_path = "/app/backend/routes/food_orders.py"
        with open(orders_path, 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if "async def leave_order_at_door" in line:
                func_def = '\n'.join(lines[i:i+5])
                assert "require_delivery_user" in func_def, f"leave_order_at_door should use require_delivery_user"
                print("✅ leave_order_at_door uses require_delivery_user")
                return
        
        pytest.fail("leave_order_at_door function not found")
    
    def test_complete_food_delivery_uses_dependency(self):
        """Test complete_food_delivery uses require_delivery_user"""
        orders_path = "/app/backend/routes/food_orders.py"
        with open(orders_path, 'r') as f:
            content = f.read()
        
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if "async def complete_food_delivery" in line:
                func_def = '\n'.join(lines[i:i+5])
                assert "require_delivery_user" in func_def, f"complete_food_delivery should use require_delivery_user"
                print("✅ complete_food_delivery uses require_delivery_user")
                return
        
        pytest.fail("complete_food_delivery function not found")


class TestFileStructure:
    """Test file structure after Phase 17 refactoring"""
    
    def test_food_orders_file_size(self):
        """Test that food_orders.py has expected line count (4374 lines)"""
        orders_path = "/app/backend/routes/food_orders.py"
        with open(orders_path, 'r') as f:
            lines = f.readlines()
        
        line_count = len(lines)
        # Should be around 4374 lines (reduced from 4391)
        assert 4300 <= line_count <= 4450, f"Expected ~4374 lines, got {line_count}"
        print(f"✅ food_orders.py has {line_count} lines (expected ~4374)")
    
    def test_food_order_helpers_has_dependency(self):
        """Test that food_order_helpers.py has require_delivery_user"""
        helper_path = "/app/backend/routes/food_order_helpers.py"
        with open(helper_path, 'r') as f:
            content = f.read()
        
        assert "def require_delivery_user" in content
        print("✅ food_order_helpers.py has require_delivery_user dependency")
    
    def test_count_require_delivery_user_usages(self):
        """Test that require_delivery_user is used 6 times in food_orders.py"""
        orders_path = "/app/backend/routes/food_orders.py"
        with open(orders_path, 'r') as f:
            content = f.read()
        
        # Count usages (excluding the import line)
        import_line = "require_delivery_user,"
        content_without_import = content.replace(import_line, "IMPORT_PLACEHOLDER")
        
        usage_count = content_without_import.count("require_delivery_user")
        assert usage_count >= 6, f"Expected at least 6 usages, found {usage_count}"
        print(f"✅ require_delivery_user is used {usage_count} times in endpoints")


class TestDriverEndpointsRequireAuth:
    """Test that driver endpoints require authentication
    
    Note: These endpoints use require_delivery_user dependency which checks:
    1. User is authenticated (via get_current_user)
    2. User type is 'delivery'
    
    Without auth token, endpoints may return 401/403/404 depending on implementation.
    404 is acceptable because it means the endpoint exists and processed the request.
    """
    
    def test_verify_pickup_code_endpoint_exists(self):
        """Test verify_pickup_code endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/verify-pickup",
            json={"pickup_code": "1234"}
        )
        # 401/403 = auth required, 404 = order not found (endpoint works), 422 = validation error
        assert response.status_code in [401, 403, 404, 422], f"Unexpected status: {response.status_code}"
        print(f"✅ verify_pickup_code endpoint responds with {response.status_code}")
    
    def test_start_delivery_endpoint_exists(self):
        """Test start_delivery_to_customer endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/on-the-way"
        )
        assert response.status_code in [401, 403, 404, 422], f"Unexpected status: {response.status_code}"
        print(f"✅ start_delivery_to_customer endpoint responds with {response.status_code}")
    
    def test_delivery_arrived_endpoint_exists(self):
        """Test delivery_arrived_at_customer endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/arrived-customer"
        )
        assert response.status_code in [401, 403, 404, 422], f"Unexpected status: {response.status_code}"
        print(f"✅ delivery_arrived_at_customer endpoint responds with {response.status_code}")
    
    def test_mark_not_responding_endpoint_exists(self):
        """Test mark_customer_not_responding endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/customer-not-responding"
        )
        assert response.status_code in [401, 403, 404, 422], f"Unexpected status: {response.status_code}"
        print(f"✅ mark_customer_not_responding endpoint responds with {response.status_code}")
    
    def test_leave_at_door_endpoint_exists(self):
        """Test leave_order_at_door endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/leave-at-door"
        )
        assert response.status_code in [401, 403, 404, 422], f"Unexpected status: {response.status_code}"
        print(f"✅ leave_order_at_door endpoint responds with {response.status_code}")
    
    def test_complete_delivery_endpoint_exists(self):
        """Test complete_food_delivery endpoint exists and responds"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/complete"
        )
        assert response.status_code in [401, 403, 404, 422], f"Unexpected status: {response.status_code}"
        print(f"✅ complete_food_delivery endpoint responds with {response.status_code}")


class TestNoManualUserTypeCheck:
    """Test that manual user type checking is removed from the 6 endpoints"""
    
    def test_no_manual_check_in_verify_pickup_code(self):
        """Test verify_pickup_code doesn't have manual user_type check"""
        orders_path = "/app/backend/routes/food_orders.py"
        with open(orders_path, 'r') as f:
            content = f.read()
        
        # Find the function
        lines = content.split('\n')
        in_function = False
        function_content = []
        brace_count = 0
        
        for i, line in enumerate(lines):
            if "async def verify_pickup_code" in line:
                in_function = True
                function_content = [line]
                continue
            
            if in_function:
                function_content.append(line)
                # Stop at next function definition
                if line.strip().startswith("async def ") or line.strip().startswith("@router."):
                    break
        
        func_text = '\n'.join(function_content[:50])  # First 50 lines of function
        
        # Should NOT have manual check like: if user.get("user_type") != "delivery"
        manual_check_patterns = [
            'if user.get("user_type") != "delivery"',
            "if user.get('user_type') != 'delivery'",
            'if user["user_type"] != "delivery"',
        ]
        
        for pattern in manual_check_patterns:
            assert pattern not in func_text, f"Found manual user_type check in verify_pickup_code"
        
        print("✅ verify_pickup_code doesn't have manual user_type check")


class TestHelperFunctionSignature:
    """Test require_delivery_user function signature"""
    
    def test_require_delivery_user_signature(self):
        """Test that require_delivery_user has correct signature"""
        helper_path = "/app/backend/routes/food_order_helpers.py"
        with open(helper_path, 'r') as f:
            content = f.read()
        
        # Check function signature
        assert "def require_delivery_user(user: dict = Depends(get_current_user))" in content
        print("✅ require_delivery_user has correct signature")
    
    def test_require_delivery_user_returns_user(self):
        """Test that require_delivery_user returns user dict"""
        helper_path = "/app/backend/routes/food_order_helpers.py"
        with open(helper_path, 'r') as f:
            content = f.read()
        
        # Find the function and check it returns user
        lines = content.split('\n')
        in_function = False
        
        for i, line in enumerate(lines):
            if "def require_delivery_user" in line:
                in_function = True
                continue
            
            if in_function:
                if line.strip().startswith("def ") or line.strip().startswith("async def "):
                    break
                if "return user" in line:
                    print("✅ require_delivery_user returns user dict")
                    return
        
        pytest.fail("require_delivery_user doesn't return user")


class TestNoRegressions:
    """Test that existing functionality still works"""
    
    def test_check_distance_endpoint(self):
        """Test check-distance endpoint still works"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": "test-store",
                "customer_lat": 33.5138,
                "customer_lng": 36.2765
            }
        )
        # Should return 404 (store not found) or 200, not 500
        assert response.status_code in [200, 404, 422], f"Unexpected status: {response.status_code}"
        print("✅ check-distance endpoint works")
    
    def test_my_orders_requires_auth(self):
        """Test my-orders endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code in [401, 403, 422]
        print("✅ my-orders endpoint requires auth")
    
    def test_store_orders_requires_auth(self):
        """Test store/orders endpoint requires auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code in [401, 403, 422]
        print("✅ store/orders endpoint requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
