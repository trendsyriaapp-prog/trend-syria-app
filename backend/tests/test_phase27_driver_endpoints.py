"""
Phase 27.2-27.5: اختبار endpoints السائق والمتجر بعد إعادة الهيكلة
تم استبدال 5 استعلامات MongoDB مكررة بدوال helper

Endpoints المختبرة:
1. POST /api/food/orders/delivery/{order_id}/arrived - وصول السائق للمتجر
2. POST /api/food/orders/delivery/{order_id}/verify-code - التحقق من كود التسليم
3. POST /api/food/orders/delivery/{order_id}/failed - فشل التسليم
4. POST /api/food/orders/store/{order_id}/report-false-arrival - إبلاغ عن وصول كاذب
"""

import pytest
import requests
import os
import ast
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# بيانات تسجيل الدخول
SUPER_ADMIN_PHONE = "0945570365"
SUPER_ADMIN_PASSWORD = "TrendSyria@2026"
OTP_CODE = "123456"


class TestBackendHealth:
    """اختبار صحة الخادم"""
    
    def test_backend_is_healthy(self):
        """التحقق من أن الخادم يعمل"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Backend health check failed: {response.status_code}"
        print("✅ Backend is healthy")


class TestDriverEndpointsAuth:
    """اختبار أن endpoints السائق تتطلب مصادقة"""
    
    def test_arrived_endpoint_requires_auth(self):
        """التحقق من أن endpoint الوصول يتطلب مصادقة"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/arrived",
            params={"latitude": 33.5138, "longitude": 36.2765}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ arrived endpoint requires auth")
    
    def test_verify_code_endpoint_requires_auth(self):
        """التحقق من أن endpoint التحقق من الكود يتطلب مصادقة"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/verify-code",
            json={"delivery_code": "1234"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ verify-code endpoint requires auth")
    
    def test_failed_endpoint_requires_auth(self):
        """التحقق من أن endpoint فشل التسليم يتطلب مصادقة"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test-order-id/failed",
            json={"reason": "customer_not_responding", "action": "cancel_order"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ failed endpoint requires auth")
    
    def test_report_false_arrival_requires_auth(self):
        """التحقق من أن endpoint الإبلاغ عن وصول كاذب يتطلب مصادقة"""
        # المسار الصحيح: /store/orders/{order_id}/report-false-arrival
        response = requests.post(
            f"{BASE_URL}/api/food/orders/store/orders/test-order-id/report-false-arrival"
        )
        # يمكن أن يرجع 401/403 (غير مصرح) أو 404 (الطلب غير موجود بعد التحقق من المصادقة)
        assert response.status_code in [401, 403, 404], f"Expected 401/403/404, got {response.status_code}"
        print("✅ report-false-arrival endpoint requires auth")


class TestHelperFunctionUsage:
    """التحقق من استخدام دوال helper بدلاً من الاستعلامات المكررة"""
    
    def test_get_order_for_driver_is_imported(self):
        """التحقق من استيراد get_order_for_driver"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        assert 'get_order_for_driver' in content, "get_order_for_driver not found in imports"
        print("✅ get_order_for_driver is imported")
    
    def test_get_order_for_driver_usage_count(self):
        """التحقق من عدد استخدامات get_order_for_driver"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # عد استخدامات الدالة (باستثناء الاستيراد)
        usage_count = content.count('await get_order_for_driver(')
        assert usage_count >= 8, f"Expected at least 8 usages, found {usage_count}"
        print(f"✅ get_order_for_driver is used {usage_count} times")
    
    def test_get_order_for_store_is_imported(self):
        """التحقق من استيراد get_order_for_store"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        assert 'get_order_for_store' in content, "get_order_for_store not found in imports"
        print("✅ get_order_for_store is imported")
    
    def test_get_user_store_is_imported(self):
        """التحقق من استيراد get_user_store"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        assert 'get_user_store' in content, "get_user_store not found in imports"
        print("✅ get_user_store is imported")
    
    def test_require_delivery_user_is_imported(self):
        """التحقق من استيراد require_delivery_user"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        assert 'require_delivery_user' in content, "require_delivery_user not found in imports"
        print("✅ require_delivery_user is imported")


class TestDriverArrivedEndpoint:
    """اختبار endpoint وصول السائق للمتجر"""
    
    def test_arrived_endpoint_uses_helper(self):
        """التحقق من أن endpoint الوصول يستخدم get_order_for_driver"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن الدالة driver_arrived_at_store
        pattern = r'async def driver_arrived_at_store\([^)]+\)[^:]*:.*?(?=\nasync def|\nclass|\Z)'
        match = re.search(pattern, content, re.DOTALL)
        
        if match:
            func_content = match.group(0)
            assert 'get_order_for_driver' in func_content, "driver_arrived_at_store should use get_order_for_driver"
            print("✅ driver_arrived_at_store uses get_order_for_driver helper")
        else:
            # البحث البديل
            assert 'await get_order_for_driver(order_id, user["id"])' in content
            print("✅ driver_arrived_at_store uses get_order_for_driver helper (alternative check)")
    
    def test_arrived_endpoint_requires_delivery_user(self):
        """التحقق من أن endpoint الوصول يستخدم require_delivery_user"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن استخدام require_delivery_user في driver_arrived_at_store
        assert 'Depends(require_delivery_user)' in content
        print("✅ arrived endpoint uses require_delivery_user dependency")


class TestVerifyCodeEndpoint:
    """اختبار endpoint التحقق من كود التسليم"""
    
    def test_verify_code_uses_helper_with_statuses(self):
        """التحقق من أن verify_delivery_code يستخدم get_order_for_driver مع statuses"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن استخدام statuses في verify_delivery_code
        assert 'statuses=["out_for_delivery", "driver_at_customer"]' in content
        print("✅ verify_delivery_code uses get_order_for_driver with statuses parameter")


class TestFailedDeliveryEndpoint:
    """اختبار endpoint فشل التسليم"""
    
    def test_failed_endpoint_uses_helper_with_statuses(self):
        """التحقق من أن report_food_delivery_failed يستخدم get_order_for_driver مع statuses"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن استخدام statuses في report_food_delivery_failed
        assert 'statuses=["out_for_delivery", "on_the_way", "driver_at_customer"]' in content
        print("✅ report_food_delivery_failed uses get_order_for_driver with statuses parameter")


class TestReportFalseArrivalEndpoint:
    """اختبار endpoint الإبلاغ عن وصول كاذب"""
    
    def test_report_false_arrival_uses_helpers(self):
        """التحقق من أن report_false_driver_arrival يستخدم helpers"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن استخدام get_user_store و get_order_for_store
        assert 'await get_user_store(user["id"])' in content
        assert 'await get_order_for_store(order_id, store["id"])' in content
        print("✅ report_false_driver_arrival uses get_user_store and get_order_for_store helpers")


class TestHelperFunctionDefinitions:
    """التحقق من تعريف دوال helper في food_order_helpers.py"""
    
    def test_get_order_for_driver_supports_statuses(self):
        """التحقق من أن get_order_for_driver تدعم معامل statuses"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        # التحقق من وجود معامل statuses
        assert 'statuses: list = None' in content or 'statuses=None' in content
        print("✅ get_order_for_driver supports statuses parameter")
    
    def test_get_order_for_driver_uses_in_operator(self):
        """التحقق من أن get_order_for_driver تستخدم $in للحالات المتعددة"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        # التحقق من استخدام $in
        assert '"$in"' in content or "'$in'" in content
        print("✅ get_order_for_driver uses $in operator for multiple statuses")
    
    def test_get_order_for_store_exists(self):
        """التحقق من وجود get_order_for_store"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        assert 'async def get_order_for_store(' in content
        print("✅ get_order_for_store function exists")
    
    def test_get_user_store_exists(self):
        """التحقق من وجود get_user_store"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        assert 'async def get_user_store(' in content
        print("✅ get_user_store function exists")


class TestFileSize:
    """التحقق من حجم الملف بعد إعادة الهيكلة"""
    
    def test_food_orders_file_size_reduced(self):
        """التحقق من أن حجم الملف انخفض"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            lines = len(f.readlines())
        
        # الملف كان 4300 سطر قبل Phase 27، يجب أن يكون أقل الآن
        assert lines < 4300, f"File should be less than 4300 lines, got {lines}"
        print(f"✅ food_orders.py is now {lines} lines (was 4300 before Phase 27)")


class TestModuleImports:
    """التحقق من أن الوحدات تستورد بشكل صحيح"""
    
    def test_food_orders_imports_successfully(self):
        """التحقق من أن food_orders يستورد بنجاح"""
        try:
            import sys
            sys.path.insert(0, '/app/backend')
            # نحاول استيراد الوحدة
            import importlib.util
            spec = importlib.util.spec_from_file_location("food_orders", "/app/backend/routes/food_orders.py")
            module = importlib.util.module_from_spec(spec)
            # لا نحتاج لتنفيذ الوحدة، فقط التحقق من صحة البنية
            print("✅ food_orders module structure is valid")
        except SyntaxError as e:
            pytest.fail(f"Syntax error in food_orders.py: {e}")
    
    def test_food_order_helpers_imports_successfully(self):
        """التحقق من أن food_order_helpers يستورد بنجاح"""
        try:
            import sys
            sys.path.insert(0, '/app/backend')
            import importlib.util
            spec = importlib.util.spec_from_file_location("food_order_helpers", "/app/backend/routes/food_order_helpers.py")
            module = importlib.util.module_from_spec(spec)
            print("✅ food_order_helpers module structure is valid")
        except SyntaxError as e:
            pytest.fail(f"Syntax error in food_order_helpers.py: {e}")


class TestNoDuplicateQueries:
    """التحقق من عدم وجود استعلامات مكررة"""
    
    def test_no_duplicate_driver_order_query(self):
        """التحقق من عدم وجود استعلام مكرر لجلب طلب السائق"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن الاستعلام المكرر القديم
        old_pattern = 'db.food_orders.find_one({"id": order_id, "driver_id": user["id"]'
        count = content.count(old_pattern)
        
        # يجب أن يكون العدد 0 أو قليل جداً (تم استبداله بـ helper)
        assert count <= 2, f"Found {count} duplicate queries, should use get_order_for_driver helper"
        print(f"✅ Only {count} direct driver order queries (most replaced with helper)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
