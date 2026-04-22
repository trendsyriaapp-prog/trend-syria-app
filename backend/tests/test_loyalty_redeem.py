# /app/backend/tests/test_loyalty_redeem.py
# اختبار نظام استبدال نقاط الولاء - Loyalty Points Redemption Tests
# Tests for: GET /api/loyalty/points, POST /api/loyalty/redeem

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLoyaltyAPIs:
    """اختبار APIs نقاط الولاء"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """إعداد الاختبار - تسجيل الدخول كمشتري"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # تسجيل الدخول كمشتري للحصول على token
        # استخدام حساب اختباري
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0977123456",
            "password": os.getenv("TEST_USER_PASSWORD", "Test@123456")
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("token")
            self.user = data.get("user")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            # إنشاء حساب جديد إذا لم يكن موجوداً
            self._create_test_buyer()
    
    def _create_test_buyer(self):
        """إنشاء حساب مشتري اختباري"""
        # طلب OTP
        otp_response = self.session.post(f"{BASE_URL}/api/auth/request-otp", json={
            "phone": "0977123456"
        })
        
        # التحقق من OTP (الرمز الثابت 123456)
        verify_response = self.session.post(f"{BASE_URL}/api/auth/verify-otp", json={
            "phone": "0977123456",
            "otp": "123456"
        })
        
        if verify_response.status_code == 200:
            data = verify_response.json()
            if data.get("is_new_user"):
                # إكمال التسجيل
                register_response = self.session.post(f"{BASE_URL}/api/auth/complete-registration", json={
                    "phone": "0977123456",
                    "name": "Test Buyer",
                    "password": os.getenv("TEST_USER_PASSWORD", "Test@123456"),
                    "role": "buyer"
                })
                if register_response.status_code == 200:
                    reg_data = register_response.json()
                    self.token = reg_data.get("token")
                    self.user = reg_data.get("user")
                    self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            else:
                self.token = data.get("token")
                self.user = data.get("user")
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    # ============ اختبارات GET /api/loyalty/points ============
    
    def test_get_loyalty_points_success(self):
        """اختبار جلب نقاط الولاء بنجاح"""
        response = self.session.get(f"{BASE_URL}/api/loyalty/points")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # التحقق من وجود الحقول المطلوبة
        assert "available_points" in data, "Missing available_points field"
        assert "lifetime_points" in data, "Missing lifetime_points field"
        assert "redeemed_points" in data, "Missing redeemed_points field"
        assert "current_tier" in data, "Missing current_tier field"
        assert "points_value" in data, "Missing points_value field"
        assert "min_redeem" in data, "Missing min_redeem field"
        
        # التحقق من أن min_redeem = 100
        assert data["min_redeem"] == 100, f"Expected min_redeem=100, got {data['min_redeem']}"
        
        print("✅ GET /api/loyalty/points - Success")
        print(f"   Available points: {data['available_points']}")
        print(f"   Min redeem: {data['min_redeem']}")
    
    def test_get_loyalty_points_without_auth(self):
        """اختبار جلب النقاط بدون تسجيل دخول - يجب أن يفشل"""
        session = requests.Session()
        response = session.get(f"{BASE_URL}/api/loyalty/points")
        
        # يجب أن يرجع 401 أو 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ GET /api/loyalty/points without auth - Correctly returns {response.status_code}")
    
    # ============ اختبارات POST /api/loyalty/redeem ============
    
    def test_redeem_points_below_minimum(self):
        """اختبار استبدال نقاط أقل من الحد الأدنى (100) - يجب أن يفشل"""
        response = self.session.post(f"{BASE_URL}/api/loyalty/redeem", json={
            "points": 50  # أقل من 100
        })
        
        # يجب أن يرجع 400
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Missing error detail"
        print("✅ POST /api/loyalty/redeem (below minimum) - Correctly returns 400")
        print(f"   Error: {data.get('detail')}")
    
    def test_redeem_points_exceeds_balance(self):
        """اختبار استبدال نقاط أكثر من الرصيد - يجب أن يفشل"""
        # أولاً جلب الرصيد الحالي
        points_response = self.session.get(f"{BASE_URL}/api/loyalty/points")
        if points_response.status_code != 200:
            pytest.skip("Could not get loyalty points")
        
        available = points_response.json().get("available_points", 0)
        
        # محاولة استبدال أكثر من الرصيد
        redeem_amount = available + 1000
        response = self.session.post(f"{BASE_URL}/api/loyalty/redeem", json={
            "points": redeem_amount
        })
        
        # يجب أن يرجع 400
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Missing error detail"
        print("✅ POST /api/loyalty/redeem (exceeds balance) - Correctly returns 400")
        print(f"   Tried to redeem: {redeem_amount}, Available: {available}")
        print(f"   Error: {data.get('detail')}")
    
    def test_redeem_points_without_auth(self):
        """اختبار استبدال النقاط بدون تسجيل دخول - يجب أن يفشل"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/loyalty/redeem", json={
            "points": 100
        })
        
        # يجب أن يرجع 401 أو 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ POST /api/loyalty/redeem without auth - Correctly returns {response.status_code}")
    
    # ============ اختبارات GET /api/loyalty/history ============
    
    def test_get_loyalty_history(self):
        """اختبار جلب سجل النقاط"""
        response = self.session.get(f"{BASE_URL}/api/loyalty/history?limit=10")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print("✅ GET /api/loyalty/history - Success")
        print(f"   History entries: {len(data)}")
    
    # ============ اختبارات GET /api/loyalty/tiers ============
    
    def test_get_loyalty_tiers(self):
        """اختبار جلب مستويات الولاء"""
        response = self.session.get(f"{BASE_URL}/api/loyalty/tiers")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        assert len(data) > 0, "Expected at least one tier"
        
        # التحقق من وجود المستوى البرونزي
        tier_names = [t.get("name_en") for t in data]
        assert "bronze" in tier_names, "Missing bronze tier"
        
        print("✅ GET /api/loyalty/tiers - Success")
        print(f"   Tiers: {tier_names}")
    
    # ============ اختبارات GET /api/loyalty/settings ============
    
    def test_get_loyalty_settings(self):
        """اختبار جلب إعدادات نظام الولاء"""
        response = self.session.get(f"{BASE_URL}/api/loyalty/settings")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "min_redeem_points" in data, "Missing min_redeem_points"
        assert data["min_redeem_points"] == 100, f"Expected min_redeem_points=100, got {data['min_redeem_points']}"
        
        print("✅ GET /api/loyalty/settings - Success")
        print(f"   Min redeem points: {data['min_redeem_points']}")
        print(f"   Points value: {data.get('points_value_syp')} SYP")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
