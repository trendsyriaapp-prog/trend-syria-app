# /app/backend/tests/test_phase21_get_user_store.py
# Phase 21: اختبار استبدال استخدامين إضافيين من db.food_stores.find_one({owner_id}) بـ get_user_store
# الـ endpoints المحدثة: get_pickup_code (line 3190), get_order_driver_status (line 4289)

import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPhase21BackendHealth:
    """اختبار صحة الـ Backend"""
    
    def test_health_endpoint(self):
        """التحقق من أن الـ Backend يعمل"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Backend health check passed")
    
    def test_food_orders_router_loaded(self):
        """التحقق من تحميل router طلبات الطعام"""
        # نختبر endpoint عام لا يحتاج auth
        response = requests.post(f"{BASE_URL}/api/food/orders/check-distance", json={
            "store_id": "test",
            "customer_lat": 33.5,
            "customer_lng": 36.3
        })
        # 404 يعني الـ router محمل لكن المتجر غير موجود
        assert response.status_code in [404, 422, 400]
        print("✅ Food orders router is loaded")


class TestPhase21HelperExists:
    """التحقق من وجود الدالة المساعدة get_user_store"""
    
    def test_get_user_store_function_exists(self):
        """التحقق من وجود get_user_store في food_order_helpers.py"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        assert 'async def get_user_store' in content
        print("✅ get_user_store function exists in food_order_helpers.py")
    
    def test_get_user_store_implementation(self):
        """التحقق من صحة تنفيذ get_user_store"""
        with open('/app/backend/routes/food_order_helpers.py', 'r') as f:
            content = f.read()
        
        # التحقق من أن الدالة تستعلم عن food_stores بـ owner_id
        assert 'db.food_stores.find_one({"owner_id": user_id})' in content or \
               "db.food_stores.find_one({'owner_id': user_id})" in content
        print("✅ get_user_store queries food_stores with owner_id")
    
    def test_get_user_store_imported_in_food_orders(self):
        """التحقق من استيراد get_user_store في food_orders.py"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        assert 'get_user_store' in content
        # التحقق من الاستيراد
        assert 'from routes.food_order_helpers import' in content
        print("✅ get_user_store is imported in food_orders.py")


class TestPhase21HelperUsage:
    """التحقق من استخدام get_user_store في الـ endpoints المحدثة في Phase 21"""
    
    def test_get_pickup_code_uses_helper(self):
        """التحقق من أن get_pickup_code يستخدم get_user_store (line 3190)"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            lines = f.readlines()
        
        # البحث عن get_pickup_code
        found_endpoint = False
        uses_helper = False
        
        for i, line in enumerate(lines):
            if 'def get_pickup_code' in line or 'async def get_pickup_code' in line:
                found_endpoint = True
                # البحث في الـ 20 سطر التالية عن استخدام get_user_store
                for j in range(i, min(i + 20, len(lines))):
                    if 'get_user_store' in lines[j]:
                        uses_helper = True
                        print(f"✅ get_pickup_code uses get_user_store at line {j + 1}")
                        break
                break
        
        assert found_endpoint, "get_pickup_code endpoint not found"
        assert uses_helper, "get_pickup_code does not use get_user_store"
    
    def test_get_order_driver_status_uses_helper(self):
        """التحقق من أن get_order_driver_status يستخدم get_user_store (line 4289)"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            lines = f.readlines()
        
        # البحث عن get_order_driver_status
        found_endpoint = False
        uses_helper = False
        
        for i, line in enumerate(lines):
            if 'def get_order_driver_status' in line or 'async def get_order_driver_status' in line:
                found_endpoint = True
                # البحث في الـ 20 سطر التالية عن استخدام get_user_store
                for j in range(i, min(i + 20, len(lines))):
                    if 'get_user_store' in lines[j]:
                        uses_helper = True
                        print(f"✅ get_order_driver_status uses get_user_store at line {j + 1}")
                        break
                break
        
        assert found_endpoint, "get_order_driver_status endpoint not found"
        assert uses_helper, "get_order_driver_status does not use get_user_store"


class TestPhase21TotalUsages:
    """التحقق من إجمالي استخدامات get_user_store"""
    
    def test_total_get_user_store_usages(self):
        """التحقق من عدد استخدامات get_user_store في food_orders.py"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # عد استخدامات await get_user_store (الاستخدامات الفعلية)
        usages = content.count('await get_user_store')
        print(f"📊 Total get_user_store usages in food_orders.py: {usages}")
        
        # يجب أن يكون 8 استخدامات بعد Phase 21
        assert usages == 8, f"Expected 8 usages, found {usages}"
        print("✅ get_user_store is used 8 times in food_orders.py")
    
    def test_remaining_manual_lookups(self):
        """التحقق من عدد الاستخدامات اليدوية المتبقية"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # البحث عن الاستخدامات اليدوية المتبقية
        manual_pattern = r'db\.food_stores\.find_one\(\{["\']owner_id'
        manual_usages = len(re.findall(manual_pattern, content))
        
        print(f"📊 Remaining manual store lookups: {manual_usages}")
        
        # يجب أن يكون 1 استخدام يدوي متبقي (get_seller_food_orders)
        assert manual_usages == 1, f"Expected 1 remaining manual lookup, found {manual_usages}"
        print("✅ Only 1 manual store lookup remaining (get_seller_food_orders)")


class TestPhase21FileSize:
    """التحقق من حجم الملف"""
    
    def test_file_size_reduced(self):
        """التحقق من أن حجم الملف انخفض"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            lines = f.readlines()
        
        line_count = len(lines)
        print(f"📊 food_orders.py has {line_count} lines")
        
        # يجب أن يكون 4310 سطر (انخفض من 4312 في Phase 20)
        # ملاحظة: قد يكون 4310 أو 4311 حسب الـ newline في نهاية الملف
        assert line_count in [4310, 4311], f"Expected 4310-4311 lines, found {line_count}"
        print(f"✅ File size is {line_count} lines (reduced from 4312 in Phase 20)")


class TestPhase21NoRegressions:
    """اختبار عدم وجود regression"""
    
    def test_check_distance_endpoint(self):
        """اختبار endpoint حساب المسافة"""
        response = requests.post(f"{BASE_URL}/api/food/orders/check-distance", json={
            "store_id": "nonexistent",
            "customer_lat": 33.5,
            "customer_lng": 36.3
        })
        # 404 متوقع لأن المتجر غير موجود
        assert response.status_code == 404
        print("✅ check-distance endpoint works correctly")
    
    def test_my_orders_requires_auth(self):
        """اختبار أن my-orders يتطلب مصادقة"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code == 401
        print("✅ my-orders requires authentication")
    
    def test_store_orders_requires_auth(self):
        """اختبار أن store/orders يتطلب مصادقة"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders")
        assert response.status_code == 401
        print("✅ store/orders requires authentication")
    
    def test_seller_orders_requires_auth(self):
        """اختبار أن seller orders يتطلب مصادقة"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller")
        assert response.status_code == 401
        print("✅ seller orders requires authentication")


class TestPhase21Summary:
    """ملخص Phase 21"""
    
    def test_phase21_complete(self):
        """التحقق من اكتمال Phase 21"""
        # قراءة الملف
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            content = f.read()
        
        # التحقق من جميع المتطلبات
        checks = {
            "get_user_store imported": "get_user_store" in content,
            "8 usages of get_user_store": content.count("await get_user_store") == 8,
            "1 remaining manual lookup": len(re.findall(r'db\.food_stores\.find_one\(\{["\']owner_id', content)) == 1,
        }
        
        all_passed = all(checks.values())
        
        for check, passed in checks.items():
            status = "✅" if passed else "❌"
            print(f"{status} {check}")
        
        assert all_passed, "Not all Phase 21 checks passed"
        print("\n🎉 Phase 21 refactoring verified complete!")


class TestPhase21AllEndpointsUsingHelper:
    """التحقق من جميع الـ endpoints التي تستخدم get_user_store"""
    
    def test_all_8_endpoints_use_helper(self):
        """التحقق من أن 8 endpoints تستخدم get_user_store"""
        with open('/app/backend/routes/food_orders.py', 'r') as f:
            lines = f.readlines()
        
        # البحث عن جميع استخدامات get_user_store
        usages = []
        for i, line in enumerate(lines):
            if 'await get_user_store' in line:
                usages.append(i + 1)
        
        print(f"📊 get_user_store used at lines: {usages}")
        
        # التحقق من أن هناك 8 استخدامات
        assert len(usages) == 8, f"Expected 8 usages, found {len(usages)}"
        
        # التحقق من الأسطر المتوقعة (تقريباً)
        expected_lines = [1432, 1497, 1603, 1674, 3190, 3929, 4176, 4289]
        for expected, actual in zip(expected_lines, usages):
            # السماح بفرق ±5 أسطر
            assert abs(expected - actual) <= 5, f"Expected line ~{expected}, found {actual}"
        
        print("✅ All 8 endpoints correctly use get_user_store")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
