"""
Phase 29: اختبار تبسيط دالة calculate_distance المحلية وإزالة import math
- تم تبسيط دالة calculate_distance المحلية لاستخدام calculate_distance_km
- تم إزالة import math غير المستخدم
- الملف انخفض من 4247 إلى 4239 سطر (-8 أسطر)
"""

import pytest
import requests
import os
import subprocess

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhase29CalculateDistanceSimplification:
    """اختبارات المرحلة 29 - تبسيط calculate_distance وإزالة math import"""
    
    def test_backend_health(self):
        """التحقق من صحة الـ Backend"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Backend is healthy")
    
    def test_no_math_import_in_food_orders(self):
        """التحقق من عدم وجود import math في food_orders.py"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # التحقق من عدم وجود import math
        assert 'import math' not in content, "import math should be removed"
        print("✅ No 'import math' found in food_orders.py")
    
    def test_calculate_distance_uses_helper(self):
        """التحقق من أن calculate_distance المحلية تستخدم calculate_distance_km"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن دالة calculate_distance المحلية
        assert 'def calculate_distance(lat1, lon1, lat2, lon2)' in content
        # التحقق من أنها تستخدم calculate_distance_km
        assert 'return calculate_distance_km(lat1, lon1, lat2, lon2)' in content
        print("✅ Local calculate_distance uses calculate_distance_km helper")
    
    def test_file_size_reduced(self):
        """التحقق من تقليل حجم الملف"""
        result = subprocess.run(['wc', '-l', '/app/backend/routes/food_orders.py'], 
                              capture_output=True, text=True)
        lines = int(result.stdout.split()[0])
        
        # الملف يجب أن يكون 4239 سطر (أو أقل من 4247)
        assert lines <= 4247, f"File should be reduced from 4247 lines, got {lines}"
        assert lines >= 4230, f"File should not be too small, got {lines}"
        print(f"✅ File size: {lines} lines (was 4247 in Phase 28)")
    
    def test_calculate_distance_km_imported(self):
        """التحقق من استيراد calculate_distance_km"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        assert 'calculate_haversine_distance as calculate_distance_km' in content
        print("✅ calculate_distance_km is imported from food_order_helpers")
    
    def test_calculate_distance_km_usage_count(self):
        """التحقق من عدد استخدامات calculate_distance_km"""
        result = subprocess.run(
            ['grep', '-c', 'calculate_distance_km', '/app/backend/routes/food_orders.py'],
            capture_output=True, text=True
        )
        count = int(result.stdout.strip())
        
        # يجب أن يكون هناك استخدامات متعددة
        assert count >= 10, f"Expected at least 10 usages of calculate_distance_km, got {count}"
        print(f"✅ calculate_distance_km is used {count} times")


class TestFoodOrdersAPIs:
    """اختبار APIs الطلبات للتأكد من عدم وجود regression"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """إعداد الاختبارات"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_check_distance_endpoint_exists(self):
        """التحقق من وجود endpoint فحص المسافة"""
        # يجب أن يرجع 404 لمتجر غير موجود (وليس 500)
        response = self.session.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": "nonexistent_store",
                "customer_lat": 33.5138,
                "customer_lng": 36.2765
            }
        )
        # 404 = المتجر غير موجود (سلوك صحيح)
        # 422 = validation error (سلوك صحيح)
        assert response.status_code in [404, 422], f"Expected 404 or 422, got {response.status_code}"
        print(f"✅ check-distance endpoint works (status: {response.status_code})")
    
    def test_driver_available_orders_requires_auth(self):
        """التحقق من أن endpoint الطلبات المتاحة للسائق يتطلب مصادقة"""
        response = self.session.get(f"{BASE_URL}/api/food/orders/delivery/available")
        # 401 = غير مصرح (سلوك صحيح)
        assert response.status_code == 401
        print("✅ delivery/available endpoint requires authentication")
    
    def test_driver_accept_requires_auth(self):
        """التحقق من أن endpoint قبول الطلب يتطلب مصادقة أو يرجع 404 للطلب غير الموجود"""
        response = self.session.post(
            f"{BASE_URL}/api/food/orders/test_order/accept",
            json={}
        )
        # 401 = غير مصرح، 404 = الطلب غير موجود (كلاهما سلوك صحيح)
        assert response.status_code in [401, 404], f"Expected 401 or 404, got {response.status_code}"
        print(f"✅ accept endpoint works correctly (status: {response.status_code})")
    
    def test_driver_arrived_requires_auth(self):
        """التحقق من أن endpoint الوصول يتطلب مصادقة أو يرجع 404 للطلب غير الموجود"""
        response = self.session.post(
            f"{BASE_URL}/api/food/orders/test_order/arrived",
            json={}
        )
        # 401 = غير مصرح، 404 = الطلب غير موجود (كلاهما سلوك صحيح)
        assert response.status_code in [401, 404], f"Expected 401 or 404, got {response.status_code}"
        print(f"✅ arrived endpoint works correctly (status: {response.status_code})")


class TestDistanceCalculationAccuracy:
    """اختبار دقة حساب المسافة"""
    
    def test_haversine_formula_in_helper(self):
        """التحقق من وجود صيغة Haversine في helper"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        # التحقق من وجود الدالة
        assert 'def calculate_haversine_distance' in content
        # التحقق من استخدام صيغة Haversine
        assert 'radians' in content.lower() or 'math.radians' in content or 'sin' in content.lower()
        print("✅ Haversine formula exists in food_order_helpers.py")
    
    def test_helper_module_loads(self):
        """التحقق من تحميل وحدة helpers بنجاح"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        try:
            from routes.food_order_helpers import calculate_haversine_distance
            
            # اختبار حساب المسافة بين دمشق وحلب (~350 كم)
            damascus_lat, damascus_lon = 33.5138, 36.2765
            aleppo_lat, aleppo_lon = 36.2021, 37.1343
            
            distance = calculate_haversine_distance(damascus_lat, damascus_lon, aleppo_lat, aleppo_lon)
            
            # المسافة يجب أن تكون بين 300 و 400 كم
            assert 300 < distance < 400, f"Damascus-Aleppo distance should be ~350km, got {distance}"
            print(f"✅ Damascus-Aleppo distance: {distance:.2f} km (expected ~350 km)")
        finally:
            if '/app/backend' in sys.path:
                sys.path.remove('/app/backend')
    
    def test_short_distance_calculation(self):
        """اختبار حساب مسافة قصيرة"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        try:
            from routes.food_order_helpers import calculate_haversine_distance
            
            # نقطتان قريبتان (~1 كم)
            lat1, lon1 = 33.5138, 36.2765
            lat2, lon2 = 33.5228, 36.2765  # ~1 كم شمالاً
            
            distance = calculate_haversine_distance(lat1, lon1, lat2, lon2)
            
            assert 0.5 < distance < 2, f"Short distance should be ~1km, got {distance}"
            print(f"✅ Short distance: {distance:.2f} km (expected ~1 km)")
        finally:
            if '/app/backend' in sys.path:
                sys.path.remove('/app/backend')
    
    def test_zero_distance(self):
        """اختبار المسافة صفر لنفس النقطة"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        try:
            from routes.food_order_helpers import calculate_haversine_distance
            
            lat, lon = 33.5138, 36.2765
            distance = calculate_haversine_distance(lat, lon, lat, lon)
            
            assert distance < 0.001, f"Same point distance should be 0, got {distance}"
            print(f"✅ Same point distance: {distance:.6f} km (expected 0)")
        finally:
            if '/app/backend' in sys.path:
                sys.path.remove('/app/backend')


class TestFoodOrdersModuleIntegrity:
    """اختبار سلامة وحدة food_orders"""
    
    def test_food_orders_module_loads(self):
        """التحقق من تحميل وحدة food_orders بنجاح"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        try:
            # محاولة استيراد الوحدة
            from routes import food_orders
            assert food_orders.router is not None
            print("✅ food_orders module loads successfully")
        except Exception as e:
            pytest.fail(f"Failed to load food_orders module: {e}")
        finally:
            if '/app/backend' in sys.path:
                sys.path.remove('/app/backend')
    
    def test_food_order_helpers_module_loads(self):
        """التحقق من تحميل وحدة food_order_helpers بنجاح"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        try:
            from routes import food_order_helpers
            assert hasattr(food_order_helpers, 'calculate_haversine_distance')
            print("✅ food_order_helpers module loads successfully")
        except Exception as e:
            pytest.fail(f"Failed to load food_order_helpers module: {e}")
        finally:
            if '/app/backend' in sys.path:
                sys.path.remove('/app/backend')
    
    def test_no_duplicate_haversine_in_food_orders(self):
        """التحقق من عدم وجود تعريف Haversine مكرر في food_orders"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # لا يجب أن يكون هناك تعريف كامل لـ Haversine
        # (الدالة المحلية تستخدم helper فقط)
        haversine_definitions = content.count('def calculate_haversine_distance')
        assert haversine_definitions == 0, "No Haversine definition should be in food_orders.py"
        
        # التحقق من عدم وجود حسابات Haversine مباشرة
        assert 'math.sin' not in content or content.count('math.sin') == 0
        assert 'math.cos' not in content or content.count('math.cos') == 0
        print("✅ No duplicate Haversine definition in food_orders.py")


class TestLocalCalculateDistanceFunction:
    """اختبار دالة calculate_distance المحلية"""
    
    def test_local_function_handles_null_values(self):
        """التحقق من معالجة القيم الفارغة"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # التحقق من وجود معالجة القيم الفارغة
        assert 'if not all([lat1, lon1, lat2, lon2])' in content
        assert 'return 9999' in content
        print("✅ Local calculate_distance handles null values correctly")
    
    def test_local_function_delegates_to_helper(self):
        """التحقق من أن الدالة المحلية تفوض للـ helper"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن الدالة المحلية
        local_func_start = content.find('def calculate_distance(lat1, lon1, lat2, lon2)')
        assert local_func_start != -1, "Local calculate_distance function not found"
        
        # التحقق من أنها تستخدم calculate_distance_km
        local_func_section = content[local_func_start:local_func_start + 300]
        assert 'calculate_distance_km(lat1, lon1, lat2, lon2)' in local_func_section
        print("✅ Local calculate_distance delegates to calculate_distance_km")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
