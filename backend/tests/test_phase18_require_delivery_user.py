"""
Phase 18 Testing: require_delivery_user in 6 additional endpoints
المرحلة 18: استبدال التحقق اليدوي من نوع المستخدم في 6 endpoints إضافية

Endpoints tested:
1. get_available_food_orders - جلب الطلبات المتاحة للسائق
2. accept_batch_orders - قبول طلبات مجمعة
3. get_batch_pickup_plan - جلب خطة الاستلام للطلبات المجمعة
4. complete_batch_delivery - إتمام توصيل الطلبات المجمعة
5. accept_food_order - قبول طلب طعام
6. driver_cancel_order - إلغاء طلب من السائق
"""

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_PHONE = "0945570365"
TEST_PASSWORD = "TrendSyria@2026"
TEST_OTP = "123456"


class TestBackendHealth:
    """اختبار صحة الخادم"""
    
    def test_health_endpoint(self):
        """التحقق من أن الخادم يعمل"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Backend health check passed")
    
    def test_food_orders_router_loaded(self):
        """التحقق من تحميل router طلبات الطعام"""
        # Test an endpoint that requires auth - should return 401/403, not 404
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("✅ Food orders router loaded correctly")


class TestPhase18Imports:
    """اختبار استيراد require_delivery_user"""
    
    def test_require_delivery_user_exists_in_helpers(self):
        """التحقق من وجود require_delivery_user في food_order_helpers.py"""
        helpers_path = "/app/backend/routes/food_order_helpers.py"
        with open(helpers_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        assert "def require_delivery_user" in content
        print("✅ require_delivery_user function exists in helpers")
    
    def test_require_delivery_user_logic(self):
        """التحقق من منطق require_delivery_user"""
        helpers_path = "/app/backend/routes/food_order_helpers.py"
        with open(helpers_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for correct logic
        assert 'user.get("user_type") != "delivery"' in content or "user_type" in content
        assert "403" in content
        print("✅ require_delivery_user has correct logic")
    
    def test_food_orders_imports_require_delivery_user(self):
        """التحقق من استيراد require_delivery_user في food_orders.py"""
        food_orders_path = "/app/backend/routes/food_orders.py"
        with open(food_orders_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        assert "require_delivery_user" in content
        assert "from routes.food_order_helpers import" in content
        print("✅ food_orders.py imports require_delivery_user")


class TestPhase18EndpointUsage:
    """اختبار استخدام require_delivery_user في 6 endpoints إضافية"""
    
    def _get_function_lines(self, endpoint_name: str) -> list:
        """Get lines around the function definition"""
        food_orders_path = "/app/backend/routes/food_orders.py"
        with open(food_orders_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        result = []
        for i, line in enumerate(lines):
            if f"async def {endpoint_name}" in line:
                # Get the function definition (next 5 lines)
                result = lines[i:i+6]
                break
        return result
    
    def test_get_available_food_orders_uses_require_delivery_user(self):
        """التحقق من استخدام require_delivery_user في get_available_food_orders"""
        func_lines = self._get_function_lines("get_available_food_orders")
        func_text = "".join(func_lines)
        assert "require_delivery_user" in func_text, \
            f"get_available_food_orders should use require_delivery_user. Found: {func_text[:200]}"
        print("✅ get_available_food_orders uses require_delivery_user")
    
    def test_accept_batch_orders_uses_require_delivery_user(self):
        """التحقق من استخدام require_delivery_user في accept_batch_orders"""
        func_lines = self._get_function_lines("accept_batch_orders")
        func_text = "".join(func_lines)
        assert "require_delivery_user" in func_text, \
            f"accept_batch_orders should use require_delivery_user. Found: {func_text[:200]}"
        print("✅ accept_batch_orders uses require_delivery_user")
    
    def test_get_batch_pickup_plan_uses_require_delivery_user(self):
        """التحقق من استخدام require_delivery_user في get_batch_pickup_plan"""
        func_lines = self._get_function_lines("get_batch_pickup_plan")
        func_text = "".join(func_lines)
        assert "require_delivery_user" in func_text, \
            f"get_batch_pickup_plan should use require_delivery_user. Found: {func_text[:200]}"
        print("✅ get_batch_pickup_plan uses require_delivery_user")
    
    def test_complete_batch_delivery_uses_require_delivery_user(self):
        """التحقق من استخدام require_delivery_user في complete_batch_delivery"""
        func_lines = self._get_function_lines("complete_batch_delivery")
        func_text = "".join(func_lines)
        assert "require_delivery_user" in func_text, \
            f"complete_batch_delivery should use require_delivery_user. Found: {func_text[:200]}"
        print("✅ complete_batch_delivery uses require_delivery_user")
    
    def test_accept_food_order_uses_require_delivery_user(self):
        """التحقق من استخدام require_delivery_user في accept_food_order"""
        func_lines = self._get_function_lines("accept_food_order")
        func_text = "".join(func_lines)
        assert "require_delivery_user" in func_text, \
            f"accept_food_order should use require_delivery_user. Found: {func_text[:200]}"
        print("✅ accept_food_order uses require_delivery_user")
    
    def test_driver_cancel_order_uses_require_delivery_user(self):
        """التحقق من استخدام require_delivery_user في driver_cancel_order"""
        func_lines = self._get_function_lines("driver_cancel_order")
        func_text = "".join(func_lines)
        assert "require_delivery_user" in func_text, \
            f"driver_cancel_order should use require_delivery_user. Found: {func_text[:200]}"
        print("✅ driver_cancel_order uses require_delivery_user")


class TestFileStructure:
    """اختبار بنية الملفات"""
    
    def test_food_orders_file_size_reduced(self):
        """التحقق من تقليل حجم food_orders.py"""
        food_orders_path = "/app/backend/routes/food_orders.py"
        with open(food_orders_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        line_count = len(lines)
        # Phase 17 had 4374 lines, Phase 18 should have 4356 lines (-18 lines)
        assert line_count <= 4374, f"File should be reduced from Phase 17. Current: {line_count} lines"
        print(f"✅ food_orders.py has {line_count} lines (reduced from 4374)")
    
    def test_require_delivery_user_usage_count(self):
        """التحقق من عدد استخدامات require_delivery_user"""
        food_orders_path = "/app/backend/routes/food_orders.py"
        with open(food_orders_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Count occurrences of require_delivery_user in Depends()
        count = content.count("Depends(require_delivery_user)")
        # Phase 17 had 6 usages, Phase 18 adds 6 more = 12 total
        assert count >= 12, f"Expected at least 12 usages of require_delivery_user, found {count}"
        print(f"✅ require_delivery_user used {count} times in endpoints")
    
    def test_no_manual_user_type_checks_in_new_endpoints(self):
        """التحقق من عدم وجود تحقق يدوي من نوع المستخدم في الـ endpoints الجديدة"""
        food_orders_path = "/app/backend/routes/food_orders.py"
        with open(food_orders_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the 6 new endpoints and check they don't have manual checks
        endpoints = [
            "get_available_food_orders",
            "accept_batch_orders",
            "get_batch_pickup_plan",
            "complete_batch_delivery",
            "accept_food_order",
            "driver_cancel_order"
        ]
        
        for endpoint in endpoints:
            # Find the function
            pattern = rf'async def {endpoint}\([^)]*\)[^:]*:'
            match = re.search(pattern, content)
            if match:
                # Get the function body (next 20 lines)
                start_pos = match.end()
                func_body = content[start_pos:start_pos + 1000]
                
                # Check for manual user_type check (should not exist)
                manual_check = 'if user.get("user_type") != "delivery"' in func_body[:500]
                manual_check2 = "if user['user_type'] != 'delivery'" in func_body[:500]
                
                assert not manual_check and not manual_check2, f"{endpoint} still has manual user_type check"
        
        print("✅ No manual user_type checks in new endpoints")


class TestEndpointExistence:
    """اختبار وجود الـ endpoints"""
    
    def test_delivery_available_orders_endpoint_exists(self):
        """التحقق من وجود endpoint الطلبات المتاحة للسائق"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/available")
        # Should return 401/403 (auth required), not 404
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("✅ /delivery/available endpoint exists")
    
    def test_accept_batch_endpoint_exists(self):
        """التحقق من وجود endpoint قبول الطلبات المجمعة"""
        response = requests.post(f"{BASE_URL}/api/food/orders/delivery/batch/TEST123/accept")
        # Should return 401/403 (auth required), not 404
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("✅ /delivery/batch/{batch_id}/accept endpoint exists")
    
    def test_batch_pickup_plan_endpoint_exists(self):
        """التحقق من وجود endpoint خطة الاستلام"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/batch/TEST123/pickup-plan")
        # Should return 401/403 (auth required), not 404
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("✅ /delivery/batch/{batch_id}/pickup-plan endpoint exists")
    
    def test_complete_batch_endpoint_exists(self):
        """التحقق من وجود endpoint إتمام التوصيل المجمع"""
        response = requests.post(f"{BASE_URL}/api/food/orders/delivery/batch/TEST123/complete")
        # Should return 401/403 (auth required) or 404 (batch not found after auth)
        assert response.status_code in [401, 403, 404, 422], f"Expected auth/not found error, got {response.status_code}"
        print("✅ /delivery/batch/{batch_id}/complete endpoint exists")
    
    def test_accept_order_endpoint_exists(self):
        """التحقق من وجود endpoint قبول الطلب"""
        response = requests.post(f"{BASE_URL}/api/food/orders/delivery/TEST123/accept")
        # Should return 401/403 (auth required), not 404
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("✅ /delivery/{order_id}/accept endpoint exists")
    
    def test_driver_cancel_endpoint_exists(self):
        """التحقق من وجود endpoint إلغاء الطلب من السائق"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/TEST123/cancel",
            json={"reason": "test"}
        )
        # Should return 401/403 (auth required), not 404
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("✅ /delivery/{order_id}/cancel endpoint exists")


class TestNoRegressions:
    """اختبار عدم حدوث regression"""
    
    def test_check_distance_endpoint_works(self):
        """التحقق من عمل endpoint حساب المسافة"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": "test-store",
                "customer_lat": 33.5138,
                "customer_lng": 36.2765
            }
        )
        # Should return 404 (store not found) or 200, not 500
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print("✅ check-distance endpoint works")
    
    def test_my_orders_requires_auth(self):
        """التحقق من أن my-orders يتطلب مصادقة"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code in [401, 403, 422]
        print("✅ my-orders requires authentication")
    
    def test_store_orders_requires_auth(self):
        """التحقق من أن store/orders يتطلب مصادقة"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code in [401, 403, 422]
        print("✅ store/orders requires authentication")
    
    def test_previous_phase17_endpoints_still_work(self):
        """التحقق من أن endpoints المرحلة 17 لا تزال تعمل"""
        # Test verify-pickup endpoint
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/TEST123/verify-pickup",
            json={"pickup_code": "1234"}
        )
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        
        # Test on-the-way endpoint
        response = requests.post(f"{BASE_URL}/api/food/orders/delivery/TEST123/on-the-way")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        
        print("✅ Phase 17 endpoints still work")


class TestHelperSignature:
    """اختبار توقيع الدالة المساعدة"""
    
    def test_require_delivery_user_signature(self):
        """التحقق من توقيع require_delivery_user"""
        helpers_path = "/app/backend/routes/food_order_helpers.py"
        with open(helpers_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check signature
        assert "def require_delivery_user(user: dict = Depends(get_current_user))" in content
        print("✅ require_delivery_user has correct signature")
    
    def test_require_delivery_user_returns_user(self):
        """التحقق من أن require_delivery_user يرجع المستخدم"""
        helpers_path = "/app/backend/routes/food_order_helpers.py"
        with open(helpers_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find the function and check it returns user
        pattern = r'def require_delivery_user\([^)]*\)[^:]*:\s*"""[^"]*"""\s*if[^:]*:\s*raise[^)]*\)\s*return user'
        match = re.search(pattern, content, re.DOTALL)
        assert match is not None, "require_delivery_user should return user"
        print("✅ require_delivery_user returns user dict")


class TestPhase18Summary:
    """ملخص اختبارات المرحلة 18"""
    
    def _get_function_lines(self, endpoint_name: str) -> list:
        """Get lines around the function definition"""
        food_orders_path = "/app/backend/routes/food_orders.py"
        with open(food_orders_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        result = []
        for i, line in enumerate(lines):
            if f"async def {endpoint_name}" in line:
                # Get the function definition (next 6 lines)
                result = lines[i:i+6]
                break
        return result
    
    def test_all_6_endpoints_use_require_delivery_user(self):
        """التحقق من أن جميع الـ 6 endpoints تستخدم require_delivery_user"""
        endpoints = {
            "get_available_food_orders": False,
            "accept_batch_orders": False,
            "get_batch_pickup_plan": False,
            "complete_batch_delivery": False,
            "accept_food_order": False,
            "driver_cancel_order": False
        }
        
        for endpoint in endpoints:
            func_lines = self._get_function_lines(endpoint)
            func_text = "".join(func_lines)
            endpoints[endpoint] = "require_delivery_user" in func_text
        
        all_passed = all(endpoints.values())
        
        for endpoint, passed in endpoints.items():
            status = "✅" if passed else "❌"
            print(f"{status} {endpoint}: {'uses require_delivery_user' if passed else 'MISSING require_delivery_user'}")
        
        assert all_passed, f"Some endpoints don't use require_delivery_user: {[k for k, v in endpoints.items() if not v]}"
        print("\n✅ All 6 Phase 18 endpoints use require_delivery_user")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
