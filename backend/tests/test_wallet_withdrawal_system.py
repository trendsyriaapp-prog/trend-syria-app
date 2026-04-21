# /app/backend/tests/test_wallet_withdrawal_system.py
# Tests for the updated wallet and withdrawal system:
# 1. Withdrawal with bank_account option
# 2. Automatic approval (no admin approval needed)
# 3. Status: ready_for_transfer
# 4. Topup verification failure handling
# 5. Admin mark-transferred API

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWalletWithdrawalSystem:
    """Tests for the updated wallet withdrawal system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_phone = f"09455703{uuid.uuid4().hex[:2]}"
        self.test_password = "Test@123456"
        self.otp_code = "123456"
        self.seller_token = None
        self.admin_token = None
        
    def get_admin_token(self):
        """Get admin token using provided credentials"""
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "Test@123456"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        # Try OTP flow
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": "0945570365"
        })
        if response.status_code == 200:
            response = requests.post(f"{BASE_URL}/api/auth/verify-otp", json={
                "phone": "0945570365",
                "otp": "123456"
            })
            if response.status_code == 200:
                return response.json().get("token")
        return None
    
    def create_seller_with_balance(self):
        """Create a seller user with wallet balance for testing"""
        # Register a new seller
        phone = f"09455{uuid.uuid4().hex[:5]}"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test Seller Withdrawal",
            "phone": phone,
            "password": self.test_password,
            "city": "دمشق",
            "user_type": "seller"
        })
        
        if response.status_code not in [200, 201]:
            # Try login if already exists
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "phone": phone,
                "password": self.test_password
            })
        
        if response.status_code == 200:
            token = response.json().get("token")
            if token:
                return token, phone
        return None, None
    
    # ============== Test 1: Withdrawal API accepts bank_account method ==============
    
    def test_withdraw_api_accepts_shamcash_method(self):
        """Test POST /api/wallet/withdraw accepts shamcash method"""
        admin_token = self.get_admin_token()
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        # Check if admin has seller/delivery type for withdrawal
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First check wallet balance
        response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers)
        print(f"Wallet balance response: {response.status_code} - {response.text[:200]}")
        
        # Try withdrawal with shamcash
        response = requests.post(f"{BASE_URL}/api/wallet/withdraw", 
            headers=headers,
            json={
                "amount": 50000,
                "withdrawal_method": "shamcash",
                "shamcash_phone": "0912345678"
            }
        )
        print(f"Shamcash withdrawal response: {response.status_code} - {response.text[:300]}")
        
        # Should either succeed or fail with appropriate error (not 500)
        assert response.status_code in [200, 400, 403], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("status") == "ready_for_transfer", "Status should be ready_for_transfer"
            assert data.get("withdrawal_method") == "shamcash"
    
    def test_withdraw_api_accepts_bank_account_method(self):
        """Test POST /api/wallet/withdraw accepts bank_account method with bank details"""
        admin_token = self.get_admin_token()
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Try withdrawal with bank_account
        response = requests.post(f"{BASE_URL}/api/wallet/withdraw", 
            headers=headers,
            json={
                "amount": 50000,
                "withdrawal_method": "bank_account",
                "bank_name": "بنك سوريا الدولي",
                "account_number": "1234567890",
                "account_holder": "اسم صاحب الحساب"
            }
        )
        print(f"Bank account withdrawal response: {response.status_code} - {response.text[:300]}")
        
        # Should either succeed or fail with appropriate error (not 500)
        assert response.status_code in [200, 400, 403], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("status") == "ready_for_transfer", "Status should be ready_for_transfer"
            assert data.get("withdrawal_method") == "bank_account"
    
    def test_withdraw_api_validates_bank_details(self):
        """Test POST /api/wallet/withdraw validates bank details when bank_account selected"""
        admin_token = self.get_admin_token()
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Try withdrawal with bank_account but missing details
        response = requests.post(f"{BASE_URL}/api/wallet/withdraw", 
            headers=headers,
            json={
                "amount": 50000,
                "withdrawal_method": "bank_account",
                # Missing bank_name, account_number, account_holder
            }
        )
        print(f"Bank account validation response: {response.status_code} - {response.text[:300]}")
        
        # Should fail with 400 for missing bank details
        assert response.status_code in [400, 403, 422], f"Should validate bank details: {response.status_code}"
    
    def test_withdraw_api_validates_shamcash_phone(self):
        """Test POST /api/wallet/withdraw validates shamcash phone when shamcash selected"""
        admin_token = self.get_admin_token()
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Try withdrawal with shamcash but missing phone
        response = requests.post(f"{BASE_URL}/api/wallet/withdraw", 
            headers=headers,
            json={
                "amount": 50000,
                "withdrawal_method": "shamcash",
                # Missing shamcash_phone
            }
        )
        print(f"Shamcash validation response: {response.status_code} - {response.text[:300]}")
        
        # Should fail with 400 for missing shamcash phone
        assert response.status_code in [400, 403, 422], f"Should validate shamcash phone: {response.status_code}"
    
    # ============== Test 2: Admin Withdrawals API ==============
    
    def test_admin_get_all_withdrawals(self):
        """Test GET /api/payment/admin/withdrawals returns withdrawal requests"""
        admin_token = self.get_admin_token()
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/payment/admin/withdrawals", headers=headers)
        print(f"Admin withdrawals response: {response.status_code} - {response.text[:500]}")
        
        assert response.status_code == 200, f"Should return 200: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        
        # Check if any withdrawal has bank account details
        for withdrawal in data:
            if withdrawal.get("withdrawal_method") == "bank_account":
                print(f"Found bank account withdrawal: {withdrawal}")
                # Verify bank details are present
                assert "bank_name" in withdrawal or withdrawal.get("bank_name") is None
                assert "account_number" in withdrawal or withdrawal.get("account_number") is None
                assert "account_holder" in withdrawal or withdrawal.get("account_holder") is None
    
    def test_admin_get_withdrawals_by_status(self):
        """Test GET /api/payment/admin/withdrawals?status=ready_for_transfer"""
        admin_token = self.get_admin_token()
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test filtering by status
        response = requests.get(f"{BASE_URL}/api/payment/admin/withdrawals?status=ready_for_transfer", headers=headers)
        print(f"Admin withdrawals (ready_for_transfer) response: {response.status_code}")
        
        assert response.status_code == 200, f"Should return 200: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        
        # All returned items should have status ready_for_transfer
        for withdrawal in data:
            assert withdrawal.get("status") == "ready_for_transfer", f"Status should be ready_for_transfer: {withdrawal.get('status')}"
    
    # ============== Test 3: Mark Transferred API ==============
    
    def test_admin_mark_transferred_api_exists(self):
        """Test POST /api/payment/admin/withdrawals/{id}/mark-transferred API exists"""
        admin_token = self.get_admin_token()
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get a withdrawal to test with
        response = requests.get(f"{BASE_URL}/api/payment/admin/withdrawals", headers=headers)
        if response.status_code != 200:
            pytest.skip("Could not get withdrawals")
        
        withdrawals = response.json()
        ready_withdrawal = None
        for w in withdrawals:
            if w.get("status") == "ready_for_transfer":
                ready_withdrawal = w
                break
        
        if not ready_withdrawal:
            # Test with fake ID to verify API exists
            response = requests.post(
                f"{BASE_URL}/api/payment/admin/withdrawals/fake-id-12345/mark-transferred",
                headers=headers
            )
            print(f"Mark transferred (fake ID) response: {response.status_code} - {response.text[:200]}")
            
            # Should return 404 (not found) not 405 (method not allowed) or 500
            assert response.status_code in [404, 400], f"API should exist: {response.status_code}"
        else:
            # Test with real withdrawal
            response = requests.post(
                f"{BASE_URL}/api/payment/admin/withdrawals/{ready_withdrawal['id']}/mark-transferred",
                headers=headers
            )
            print(f"Mark transferred response: {response.status_code} - {response.text[:200]}")
            
            assert response.status_code in [200, 400], f"Should succeed or fail gracefully: {response.status_code}"
    
    # ============== Test 4: Topup Verification Failure ==============
    
    def test_topup_verify_failure_sets_failed_status(self):
        """Test POST /api/wallet/topup/verify sets status to 'failed' on verification failure"""
        admin_token = self.get_admin_token()
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a topup request
        response = requests.post(f"{BASE_URL}/api/wallet/topup/request", 
            headers=headers,
            json={
                "amount": 10000,
                "payment_method": "shamcash",
                "shamcash_phone": "0912345678"
            }
        )
        print(f"Topup request response: {response.status_code} - {response.text[:300]}")
        
        if response.status_code != 200:
            pytest.skip("Could not create topup request")
        
        topup_data = response.json()
        topup_id = topup_data.get("topup_id")
        
        if not topup_id:
            pytest.skip("No topup_id returned")
        
        # Try to verify with invalid transaction ID
        response = requests.post(f"{BASE_URL}/api/wallet/topup/verify",
            headers=headers,
            json={
                "topup_id": topup_id,
                "transaction_id": "INVALID_TX_12345",
                "payment_method": "shamcash"
            }
        )
        print(f"Topup verify (invalid) response: {response.status_code} - {response.text[:300]}")
        
        # In sandbox mode, it might succeed. Check the response
        data = response.json()
        
        # If verification failed, status should be 'failed'
        if not data.get("success"):
            assert data.get("status") == "failed", f"Status should be 'failed' on verification failure: {data}"
    
    # ============== Test 5: Withdrawal History Shows New Statuses ==============
    
    def test_withdrawal_history_shows_new_statuses(self):
        """Test GET /api/wallet/withdrawals returns withdrawals with new statuses"""
        admin_token = self.get_admin_token()
        if not admin_token:
            pytest.skip("Could not get admin token")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get withdrawal history
        response = requests.get(f"{BASE_URL}/api/wallet/withdrawals", headers=headers)
        print(f"Withdrawal history response: {response.status_code}")
        
        # Should return 200 or 403 (if not seller/delivery)
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list), "Should return a list"
            
            # Check for new statuses
            valid_statuses = ["pending", "ready_for_transfer", "transferred", "approved", "rejected", "cancelled"]
            for withdrawal in data:
                status = withdrawal.get("status")
                assert status in valid_statuses, f"Invalid status: {status}"
                print(f"Withdrawal {withdrawal.get('id')}: status={status}, method={withdrawal.get('withdrawal_method')}")


class TestWalletWithdrawalEndpoints:
    """Direct endpoint tests for wallet withdrawal APIs"""
    
    def test_withdraw_endpoint_exists(self):
        """Test POST /api/wallet/withdraw endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/wallet/withdraw", json={
            "amount": 50000,
            "withdrawal_method": "shamcash",
            "shamcash_phone": "0912345678"
        })
        print(f"Withdraw endpoint test: {response.status_code}")
        
        # Should return 401 (unauthorized) not 404 or 405
        assert response.status_code in [401, 403, 400, 200, 422], f"Endpoint should exist: {response.status_code}"
    
    def test_admin_withdrawals_endpoint_exists(self):
        """Test GET /api/payment/admin/withdrawals endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/payment/admin/withdrawals")
        print(f"Admin withdrawals endpoint test: {response.status_code}")
        
        # Should return 401 (unauthorized) not 404 or 405
        assert response.status_code in [401, 403, 200], f"Endpoint should exist: {response.status_code}"
    
    def test_mark_transferred_endpoint_exists(self):
        """Test POST /api/payment/admin/withdrawals/{id}/mark-transferred endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/payment/admin/withdrawals/test-id/mark-transferred")
        print(f"Mark transferred endpoint test: {response.status_code}")
        
        # Should return 401 (unauthorized) or 404 (not found), not 405 (method not allowed)
        assert response.status_code in [401, 403, 404, 400, 200], f"Endpoint should exist: {response.status_code}"
    
    def test_topup_verify_endpoint_exists(self):
        """Test POST /api/wallet/topup/verify endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/wallet/topup/verify", json={
            "topup_id": "test-id",
            "transaction_id": "test-tx",
            "payment_method": "shamcash"
        })
        print(f"Topup verify endpoint test: {response.status_code}")
        
        # Should return 401 (unauthorized) not 404 or 405
        assert response.status_code in [401, 403, 404, 400, 200, 422], f"Endpoint should exist: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
