# /app/backend/tests/test_driver_security.py
# اختبارات نظام تأمين موظفي التوصيل - Driver Security Deposit System Tests

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
ADMIN_PHONE = "0912345678"
ADMIN_PASSWORD = "admin123"
DRIVER_PHONE = "0988111333"
DRIVER_PASSWORD = "driver123"


class TestDriverSecurityAPIs:
    """اختبارات APIs نظام التأمين والإدارة"""
    
    admin_token = None
    driver_token = None
    driver_id = None
    
    @classmethod
    def setup_class(cls):
        """تسجيل الدخول للأدمن والسائق"""
        # Admin login
        admin_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if admin_res.status_code == 200:
            cls.admin_token = admin_res.json().get("token")
            print(f"✅ Admin login successful")
        else:
            print(f"❌ Admin login failed: {admin_res.status_code} - {admin_res.text}")
        
        # Driver login
        driver_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        if driver_res.status_code == 200:
            cls.driver_token = driver_res.json().get("token")
            cls.driver_id = driver_res.json().get("user", {}).get("id")
            print(f"✅ Driver login successful, ID: {cls.driver_id}")
        else:
            print(f"❌ Driver login failed: {driver_res.status_code} - {driver_res.text}")
    
    # ============== Driver Security Status Tests ==============
    
    def test_01_driver_security_status(self):
        """GET /api/driver/security/status - حالة تأمين السائق"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        res = requests.get(
            f"{BASE_URL}/api/driver/security/status",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        # Validate response structure
        assert "is_enabled" in data, "Missing is_enabled field"
        assert "required_amount" in data, "Missing required_amount field"
        assert "current_amount" in data, "Missing current_amount field"
        assert "remaining_amount" in data, "Missing remaining_amount field"
        assert "status" in data, "Missing status field"
        assert "is_complete" in data, "Missing is_complete field"
        assert "can_receive_orders" in data, "Missing can_receive_orders field"
        assert "message" in data, "Missing message field"
        
        print(f"✅ Security status: {data['status']}, Amount: {data['current_amount']}/{data['required_amount']}")
    
    def test_02_driver_security_settings(self):
        """GET /api/driver/security/settings - إعدادات التأمين"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        res = requests.get(
            f"{BASE_URL}/api/driver/security/settings",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        
        # Validate response structure
        assert "required_amount" in data, "Missing required_amount field"
        assert "is_enabled" in data, "Missing is_enabled field"
        assert "payment_methods" in data, "Missing payment_methods field"
        assert isinstance(data["payment_methods"], list), "payment_methods should be a list"
        
        # Validate payment methods
        if len(data["payment_methods"]) > 0:
            method = data["payment_methods"][0]
            assert "id" in method, "Payment method missing id"
            assert "name" in method, "Payment method missing name"
        
        print(f"✅ Security settings: Required amount = {data['required_amount']}, Methods = {len(data['payment_methods'])}")
    
    def test_03_driver_security_status_unauthorized(self):
        """GET /api/driver/security/status - يجب أن يفشل بدون توكن"""
        res = requests.get(f"{BASE_URL}/api/driver/security/status")
        assert res.status_code in [401, 403], f"Expected 401/403, got {res.status_code}"
        print("✅ Unauthorized access correctly rejected")
    
    # ============== Deposit Request Tests ==============
    
    def test_04_submit_deposit_request(self):
        """POST /api/driver/security/deposit - طلب إيداع تأمين"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        # First get the remaining amount
        status_res = requests.get(
            f"{BASE_URL}/api/driver/security/status",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        if status_res.status_code != 200:
            pytest.skip("Could not get security status")
        
        remaining = status_res.json().get("remaining_amount", 500)
        
        # If deposit is complete, skip this test
        if remaining == 0:
            print("✅ Deposit already complete, skipping deposit request test")
            return
        
        # Submit deposit request
        res = requests.post(
            f"{BASE_URL}/api/driver/security/deposit",
            headers={
                "Authorization": f"Bearer {self.driver_token}",
                "Content-Type": "application/json"
            },
            json={
                "amount": min(100, remaining),  # Request small amount for testing
                "payment_method": "shamcash",
                "payment_reference": f"TEST_{uuid.uuid4().hex[:8]}",
                "notes": "Test deposit request"
            }
        )
        
        # Could be 200 or 400 if already complete
        if res.status_code == 200:
            data = res.json()
            assert "message" in data, "Missing message in response"
            assert "request_id" in data, "Missing request_id in response"
            print(f"✅ Deposit request submitted: {data.get('request_id')}")
        elif res.status_code == 400:
            print(f"✅ Deposit request rejected (expected if complete): {res.json().get('detail')}")
        else:
            assert False, f"Unexpected status {res.status_code}: {res.text}"
    
    def test_05_submit_deposit_invalid_amount(self):
        """POST /api/driver/security/deposit - يجب أن يفشل مع مبلغ سالب"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        res = requests.post(
            f"{BASE_URL}/api/driver/security/deposit",
            headers={
                "Authorization": f"Bearer {self.driver_token}",
                "Content-Type": "application/json"
            },
            json={
                "amount": -100,
                "payment_method": "shamcash"
            }
        )
        
        assert res.status_code == 400, f"Expected 400, got {res.status_code}"
        print("✅ Invalid amount correctly rejected")
    
    def test_06_get_my_deposit_requests(self):
        """GET /api/driver/security/deposit-requests - طلبات الإيداع الخاصة بي"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        res = requests.get(
            f"{BASE_URL}/api/driver/security/deposit-requests",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ My deposit requests: {len(data)} requests")
    
    # ============== Admin Endpoints Tests ==============
    
    def test_07_admin_get_all_drivers(self):
        """GET /api/driver/security/admin/drivers - جلب جميع السائقين (للأدمن)"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        res = requests.get(
            f"{BASE_URL}/api/driver/security/admin/drivers",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Validate driver structure if any exist
        if len(data) > 0:
            driver = data[0]
            assert "id" in driver, "Driver missing id"
            assert "phone" in driver, "Driver missing phone"
            # security_deposit should be present
            assert "security_deposit" in driver, "Driver missing security_deposit info"
        
        print(f"✅ Admin got {len(data)} drivers")
    
    def test_08_admin_get_pending_deposits(self):
        """GET /api/driver/security/admin/pending-deposits - طلبات الإيداع المعلقة"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        res = requests.get(
            f"{BASE_URL}/api/driver/security/admin/pending-deposits",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Admin got {len(data)} pending deposit requests")
    
    def test_09_admin_get_pending_resignations(self):
        """GET /api/driver/security/admin/pending-resignations - طلبات الاستقالة المعلقة"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        res = requests.get(
            f"{BASE_URL}/api/driver/security/admin/pending-resignations",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Admin got {len(data)} pending resignation requests")
    
    def test_10_admin_endpoints_unauthorized(self):
        """Admin endpoints should reject non-admin users"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        # Try to access admin endpoint with driver token
        res = requests.get(
            f"{BASE_URL}/api/driver/security/admin/drivers",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        assert res.status_code == 403, f"Expected 403, got {res.status_code}"
        print("✅ Admin endpoints correctly reject non-admin users")
    
    # ============== Resignation Tests ==============
    
    def test_11_get_my_resignation(self):
        """GET /api/driver/security/my-resignation - جلب طلب الاستقالة"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        res = requests.get(
            f"{BASE_URL}/api/driver/security/my-resignation",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        # Response could be empty object {} or resignation data
        data = res.json()
        print(f"✅ My resignation status: {'Pending' if data.get('status') else 'No pending request'}")
    
    def test_12_submit_resignation_request(self):
        """POST /api/driver/security/resign - طلب استقالة"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        # First check if there's already a pending resignation
        check_res = requests.get(
            f"{BASE_URL}/api/driver/security/my-resignation",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        if check_res.status_code == 200 and check_res.json().get("status") == "pending":
            print("✅ Resignation already pending, skipping submit test")
            return
        
        res = requests.post(
            f"{BASE_URL}/api/driver/security/resign",
            headers={
                "Authorization": f"Bearer {self.driver_token}",
                "Content-Type": "application/json"
            },
            json={
                "reason": "TEST - اختبار طلب استقالة",
                "shamcash_phone": "0988111333"
            }
        )
        
        # Could succeed or fail if driver has pending orders
        if res.status_code == 200:
            data = res.json()
            assert "message" in data, "Missing message"
            assert "request_id" in data, "Missing request_id"
            print(f"✅ Resignation request submitted: {data.get('request_id')}")
            
            # Store for cleanup
            self.__class__.resignation_request_id = data.get("request_id")
        elif res.status_code == 400:
            print(f"✅ Resignation rejected (expected if has pending orders): {res.json().get('detail')}")
        else:
            print(f"⚠️ Unexpected response: {res.status_code} - {res.text}")
    
    def test_13_cancel_resignation_request(self):
        """POST /api/driver/security/resign/cancel - إلغاء طلب الاستقالة"""
        if not self.driver_token:
            pytest.skip("Driver token not available")
        
        # First check if there's a pending resignation to cancel
        check_res = requests.get(
            f"{BASE_URL}/api/driver/security/my-resignation",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        if check_res.status_code != 200 or not check_res.json().get("status"):
            print("✅ No pending resignation to cancel")
            return
        
        res = requests.post(
            f"{BASE_URL}/api/driver/security/resign/cancel",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        if res.status_code == 200:
            data = res.json()
            assert "message" in data, "Missing message"
            print(f"✅ Resignation cancelled: {data.get('message')}")
        elif res.status_code == 404:
            print("✅ No resignation to cancel (expected)")
        else:
            print(f"⚠️ Unexpected response: {res.status_code} - {res.text}")
    
    # ============== Admin Driver Management Tests ==============
    
    def test_14_admin_suspend_driver(self):
        """POST /api/driver/security/admin/driver/{id}/suspend - إيقاف سائق"""
        if not self.admin_token or not self.driver_id:
            pytest.skip("Admin token or driver ID not available")
        
        res = requests.post(
            f"{BASE_URL}/api/driver/security/admin/driver/{self.driver_id}/suspend?reason=TEST_SUSPENSION",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "message" in data, "Missing message"
        print(f"✅ Driver suspended: {data.get('message')}")
    
    def test_15_admin_activate_driver(self):
        """POST /api/driver/security/admin/driver/{id}/activate - تفعيل سائق"""
        if not self.admin_token or not self.driver_id:
            pytest.skip("Admin token or driver ID not available")
        
        res = requests.post(
            f"{BASE_URL}/api/driver/security/admin/driver/{self.driver_id}/activate",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "message" in data, "Missing message"
        print(f"✅ Driver activated: {data.get('message')}")
    
    def test_16_admin_suspend_nonexistent_driver(self):
        """POST /api/driver/security/admin/driver/{id}/suspend - يجب أن يفشل لسائق غير موجود"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        fake_id = str(uuid.uuid4())
        res = requests.post(
            f"{BASE_URL}/api/driver/security/admin/driver/{fake_id}/suspend",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"
        print("✅ Nonexistent driver correctly returns 404")
    
    # ============== Admin Settings Tests ==============
    
    def test_17_admin_update_settings(self):
        """PUT /api/driver/security/admin/settings - تحديث إعدادات التأمين"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        res = requests.put(
            f"{BASE_URL}/api/driver/security/admin/settings?required_amount=500&is_enabled=true&auto_deduct=true&min_behavior_points=50",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert "message" in data, "Missing message"
        print(f"✅ Settings updated: {data.get('message')}")
    
    def test_18_admin_get_all_deposits(self):
        """GET /api/driver/security/admin/all-deposits - جميع تأمينات السائقين"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        res = requests.get(
            f"{BASE_URL}/api/driver/security/admin/all-deposits",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        data = res.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Admin got {len(data)} driver deposits")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
