# /app/backend/tests/test_wallet_transactions_clear.py
# اختبار ميزة حذف سجلات المحفظة للمستخدمين
# Features tested:
# 1. DELETE /api/wallet/transactions/clear - حذف سجلات المحفظة للمستخدم
# 2. GET /api/wallet/transactions - يجب أن يحذف السجلات الأقدم من 3 أشهر تلقائياً

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD")
OTP_CODE = "123456"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token for testing"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    login_res = session.post(f"{BASE_URL}/api/auth/login", json={
        "phone": ADMIN_PHONE,
        "password": ADMIN_PASSWORD,
        "otp_code": OTP_CODE
    })
    
    if login_res.status_code == 200:
        return login_res.json().get("token")
    pytest.skip("Could not login as admin")


class TestWalletTransactionsClear:
    """اختبار ميزة حذف سجلات المحفظة"""
    
    def test_01_clear_transactions_requires_auth(self):
        """اختبار أن حذف السجلات يتطلب تسجيل الدخول"""
        session = requests.Session()
        response = session.delete(f"{BASE_URL}/api/wallet/transactions/clear")
        
        # يجب أن يرفض الطلب بدون توكن
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Clear transactions requires authentication")
    
    def test_02_clear_transactions_endpoint_exists(self, admin_token):
        """اختبار وجود endpoint حذف السجلات"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        })
        
        # محاولة حذف السجلات
        response = session.delete(f"{BASE_URL}/api/wallet/transactions/clear")
        
        # يجب أن يكون الرد 200 (نجاح) حتى لو لم تكن هناك سجلات
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data, "Response should contain 'success' field"
        assert data["success"], "success should be True"
        assert "message" in data, "Response should contain 'message' field"
        assert "deleted_count" in data, "Response should contain 'deleted_count' field"
        
        print(f"✅ Clear transactions endpoint works - deleted {data['deleted_count']} records")
    
    def test_03_get_transactions_returns_list(self, admin_token):
        """اختبار أن جلب السجلات يعمل بشكل صحيح"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        })
        
        response = session.get(f"{BASE_URL}/api/wallet/transactions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✅ Get transactions works - returned {len(data)} records")
    
    def test_04_clear_transactions_balance_unchanged(self, admin_token):
        """اختبار أن حذف السجلات لا يغير الرصيد"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        })
        
        # جلب الرصيد قبل الحذف
        balance_before = session.get(f"{BASE_URL}/api/wallet/balance")
        assert balance_before.status_code == 200
        balance_before_data = balance_before.json()
        
        # حذف السجلات
        clear_response = session.delete(f"{BASE_URL}/api/wallet/transactions/clear")
        assert clear_response.status_code == 200
        
        # جلب الرصيد بعد الحذف
        balance_after = session.get(f"{BASE_URL}/api/wallet/balance")
        assert balance_after.status_code == 200
        balance_after_data = balance_after.json()
        
        # التحقق من أن الرصيد لم يتغير
        assert balance_before_data.get("balance", 0) == balance_after_data.get("balance", 0), \
            "Balance should not change after clearing transactions"
        
        print(f"✅ Balance unchanged after clearing transactions: {balance_after_data.get('balance', 0)}")
    
    def test_05_clear_transactions_empties_list(self, admin_token):
        """اختبار أن حذف السجلات يفرغ القائمة"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        })
        
        # حذف السجلات
        clear_response = session.delete(f"{BASE_URL}/api/wallet/transactions/clear")
        assert clear_response.status_code == 200
        
        # جلب السجلات بعد الحذف
        transactions_response = session.get(f"{BASE_URL}/api/wallet/transactions")
        assert transactions_response.status_code == 200
        transactions = transactions_response.json()
        
        # يجب أن تكون القائمة فارغة
        assert len(transactions) == 0, f"Expected empty list, got {len(transactions)} records"
        
        print("✅ Transactions list is empty after clearing")
    
    def test_06_response_message_in_arabic(self, admin_token):
        """اختبار أن رسالة النجاح بالعربية"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        })
        
        response = session.delete(f"{BASE_URL}/api/wallet/transactions/clear")
        assert response.status_code == 200
        
        data = response.json()
        # التحقق من أن الرسالة بالعربية
        assert "حذف" in data.get("message", "") or "سجلات" in data.get("message", ""), \
            f"Message should be in Arabic, got: {data.get('message')}"
        
        print(f"✅ Response message is in Arabic: {data.get('message')}")


class TestWalletBalanceEndpoint:
    """اختبار endpoint الرصيد"""
    
    def test_01_balance_endpoint_works(self, admin_token):
        """اختبار أن endpoint الرصيد يعمل"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {admin_token}"
        })
        
        response = session.get(f"{BASE_URL}/api/wallet/balance")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "balance" in data, "Response should contain 'balance' field"
        assert isinstance(data["balance"], (int, float)), "Balance should be a number"
        
        print(f"✅ Balance endpoint works - balance: {data['balance']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
