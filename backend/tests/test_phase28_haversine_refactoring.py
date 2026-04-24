"""
Phase 28: اختبار استبدال 3 حسابات Haversine مكررة بدالة calculate_distance_km
المرحلة 28 - تم استبدال 3 حسابات Haversine مكررة بدالة calculate_distance_km الموجودة
الملف انخفض من 4274 إلى 4247 سطر (-27 سطر)
"""

import pytest
import requests
import os
import math

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# ============== اختبارات الصحة والاتصال ==============

class TestBackendHealth:
    """اختبار صحة الـ Backend"""
    
    def test_backend_is_healthy(self):
        """التحقق من أن الـ Backend يعمل"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Backend is healthy")


# ============== اختبارات دالة calculate_distance_km ==============

class TestCalculateDistanceKmUsage:
    """اختبار استخدام دالة calculate_distance_km بدلاً من حسابات Haversine المكررة"""
    
    def test_calculate_distance_km_is_imported(self):
        """التحقق من أن calculate_distance_km مستوردة من food_order_helpers"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # التحقق من الاستيراد
        assert "calculate_haversine_distance as calculate_distance_km" in content
        print("✅ calculate_distance_km is imported from food_order_helpers")
    
    def test_remaining_inline_haversine_calculations(self):
        """التحقق من عدد حسابات Haversine المتبقية inline"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن أنماط حساب Haversine المكررة
        # ملاحظة: هناك دالة calculate_distance محلية واحدة متبقية في get_delivery_orders
        # هذه يمكن استبدالها في مرحلة لاحقة
        inline_patterns = [
            "R = 6371"  # نصف قطر الأرض - مؤشر على حساب Haversine inline
        ]
        
        # عد الأنماط
        lines = content.split('\n')
        inline_count = 0
        for line in lines:
            if line.strip().startswith('#'):
                continue
            for pattern in inline_patterns:
                if pattern in line:
                    inline_count += 1
        
        # يجب أن يكون هناك حساب واحد فقط متبقي (في get_delivery_orders)
        # هذا يمكن استبداله في مرحلة لاحقة
        assert inline_count <= 1, f"Found {inline_count} inline Haversine patterns, expected max 1"
        print(f"✅ Found {inline_count} remaining inline Haversine calculation (in get_delivery_orders - can be refactored later)")
    
    def test_calculate_distance_km_usage_count(self):
        """التحقق من عدد استخدامات calculate_distance_km"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # عد استخدامات الدالة
        usage_count = content.count("calculate_distance_km(")
        
        # يجب أن يكون هناك على الأقل 10 استخدامات (بعد الاستبدال)
        assert usage_count >= 10, f"Expected at least 10 usages, found {usage_count}"
        print(f"✅ calculate_distance_km is used {usage_count} times")


# ============== اختبارات حجم الملف ==============

class TestFileSizeReduction:
    """اختبار تقليل حجم الملف"""
    
    def test_food_orders_file_size(self):
        """التحقق من أن حجم الملف انخفض"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            lines = len(f.readlines())
        
        # الملف كان 4274 سطر في المرحلة 27، يجب أن يكون 4247 الآن
        assert lines == 4247, f"Expected 4247 lines, found {lines}"
        print(f"✅ food_orders.py is now {lines} lines (was 4274 in Phase 27, -27 lines)")
    
    def test_helper_function_exists(self):
        """التحقق من وجود دالة calculate_haversine_distance في food_order_helpers"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        assert "def calculate_haversine_distance(" in content
        print("✅ calculate_haversine_distance function exists in food_order_helpers.py")


# ============== اختبارات صحة حساب المسافة ==============

class TestDistanceCalculationAccuracy:
    """اختبار صحة حساب المسافة"""
    
    def test_haversine_formula_correctness(self):
        """التحقق من صحة صيغة Haversine"""
        # استيراد الدالة من الملف
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.food_order_helpers import calculate_haversine_distance
        
        # اختبار المسافة بين دمشق وحلب (حوالي 350 كم)
        damascus_lat, damascus_lon = 33.5138, 36.2765
        aleppo_lat, aleppo_lon = 36.2021, 37.1343
        
        distance = calculate_haversine_distance(damascus_lat, damascus_lon, aleppo_lat, aleppo_lon)
        
        # المسافة الفعلية حوالي 350 كم
        assert 300 < distance < 400, f"Expected ~350 km, got {distance}"
        print(f"✅ Distance Damascus-Aleppo: {distance:.2f} km (expected ~350 km)")
    
    def test_short_distance_calculation(self):
        """اختبار حساب مسافة قصيرة"""
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.food_order_helpers import calculate_haversine_distance
        
        # نقطتان قريبتان في دمشق (حوالي 1 كم)
        lat1, lon1 = 33.5138, 36.2765
        lat2, lon2 = 33.5228, 36.2865  # ~1 كم
        
        distance = calculate_haversine_distance(lat1, lon1, lat2, lon2)
        
        # المسافة يجب أن تكون بين 0.5 و 2 كم
        assert 0.5 < distance < 2, f"Expected ~1 km, got {distance}"
        print(f"✅ Short distance: {distance:.2f} km (expected ~1 km)")
    
    def test_zero_distance(self):
        """اختبار المسافة صفر (نفس النقطة)"""
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.food_order_helpers import calculate_haversine_distance
        
        lat, lon = 33.5138, 36.2765
        
        distance = calculate_haversine_distance(lat, lon, lat, lon)
        
        assert distance == 0, f"Expected 0, got {distance}"
        print("✅ Zero distance for same point")


# ============== اختبارات API المسافة ==============

class TestDistanceCheckAPI:
    """اختبار API فحص المسافة"""
    
    def test_check_distance_endpoint_exists(self):
        """التحقق من وجود endpoint فحص المسافة"""
        # هذا الـ endpoint يحتاج store_id صالح
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": "test_store_id",
                "customer_lat": 33.5138,
                "customer_lng": 36.2765
            }
        )
        
        # يجب أن يرجع 404 (المتجر غير موجود) وليس 500
        assert response.status_code in [404, 422], f"Unexpected status: {response.status_code}"
        print(f"✅ check-distance endpoint exists (status: {response.status_code})")


# ============== اختبارات endpoints السائق ==============

class TestDriverEndpointsAuth:
    """اختبار أن endpoints السائق تتطلب مصادقة"""
    
    def test_accept_order_requires_auth(self):
        """التحقق من أن قبول الطلب يتطلب مصادقة"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test_order/accept",
            json={}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ accept endpoint requires auth")
    
    def test_arrived_endpoint_requires_auth(self):
        """التحقق من أن وصول السائق يتطلب مصادقة"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/delivery/test_order/arrived",
            json={}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ arrived endpoint requires auth")


# ============== اختبارات استخدام الدالة في endpoints محددة ==============

class TestEndpointHelperUsage:
    """اختبار استخدام calculate_distance_km في endpoints محددة"""
    
    def test_check_drivers_availability_uses_helper(self):
        """التحقق من أن check_drivers_availability يستخدم calculate_distance_km"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن الدالة
        func_start = content.find("async def check_drivers_availability_for_order")
        func_end = content.find("async def ", func_start + 1)
        func_content = content[func_start:func_end]
        
        assert "calculate_distance_km(" in func_content
        print("✅ check_drivers_availability_for_order uses calculate_distance_km")
    
    def test_check_distance_uses_helper(self):
        """التحقق من أن check_delivery_distance يستخدم calculate_distance_km"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن الدالة
        func_start = content.find("async def check_delivery_distance")
        func_end = content.find("async def ", func_start + 1)
        func_content = content[func_start:func_end]
        
        assert "calculate_distance_km(" in func_content
        print("✅ check_delivery_distance uses calculate_distance_km")
    
    def test_create_food_order_uses_helper(self):
        """التحقق من أن create_food_order يستخدم calculate_distance_km"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن الدالة
        func_start = content.find("async def create_food_order")
        func_end = content.find("async def ", func_start + 1)
        func_content = content[func_start:func_end]
        
        # يجب أن تستخدم calculate_distance_km مرتين على الأقل
        usage_count = func_content.count("calculate_distance_km(")
        assert usage_count >= 2, f"Expected at least 2 usages, found {usage_count}"
        print(f"✅ create_food_order uses calculate_distance_km {usage_count} times")
    
    def test_create_batch_food_orders_uses_helper(self):
        """التحقق من أن create_batch_food_orders يستخدم calculate_distance_km"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن الدالة
        func_start = content.find("async def create_batch_food_orders")
        func_end = content.find("async def ", func_start + 1)
        func_content = content[func_start:func_end]
        
        # يجب أن تستخدم calculate_distance_km
        usage_count = func_content.count("calculate_distance_km(")
        assert usage_count >= 2, f"Expected at least 2 usages, found {usage_count}"
        print(f"✅ create_batch_food_orders uses calculate_distance_km {usage_count} times")


# ============== اختبارات الاستيراد والبنية ==============

class TestImportsAndStructure:
    """اختبار الاستيرادات وبنية الملف"""
    
    def test_food_orders_imports_are_valid(self):
        """التحقق من صحة الاستيرادات في food_orders.py"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # التحقق من الاستيرادات المطلوبة
        required_imports = [
            "from routes.food_order_helpers import",
            "calculate_haversine_distance as calculate_distance_km"
        ]
        
        for imp in required_imports:
            assert imp in content, f"Missing import: {imp}"
        
        print("✅ All required imports are present")
    
    def test_no_duplicate_haversine_definition(self):
        """التحقق من عدم وجود تعريف مكرر لـ Haversine في food_orders.py"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # يجب ألا يكون هناك تعريف للدالة في الملف
        assert "def calculate_haversine_distance(" not in content
        assert "def haversine(" not in content
        print("✅ No duplicate Haversine definition in food_orders.py")


# ============== اختبارات التكامل ==============

class TestIntegration:
    """اختبارات التكامل"""
    
    def test_food_orders_module_loads(self):
        """التحقق من أن الوحدة تُحمّل بدون أخطاء"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        try:
            from routes import food_orders
            print("✅ food_orders module loads successfully")
        except Exception as e:
            pytest.fail(f"Failed to load food_orders module: {e}")
    
    def test_food_order_helpers_module_loads(self):
        """التحقق من أن وحدة المساعدات تُحمّل بدون أخطاء"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        try:
            from routes import food_order_helpers
            print("✅ food_order_helpers module loads successfully")
        except Exception as e:
            pytest.fail(f"Failed to load food_order_helpers module: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
