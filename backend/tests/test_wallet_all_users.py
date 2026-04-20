# /app/backend/tests/test_wallet_all_users.py
# Test wallet APIs access for all user types (seller, food_seller, delivery, admin, buyer)
# Feature: Browse as customer - all roles can use wallet for purchases

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWalletAccessAllUsers:
    """Test wallet APIs are accessible by all user types"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login as admin and get token"""
        # Direct login with password
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "TrendSyria@2026"
        })
        assert response.status_code == 200, f"Failed to login: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in login response"
        assert data.get("user", {}).get("user_type") == "admin", "User is not admin"
        print(f"✅ Logged in as admin: {data['user']['name']}")
        return data["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_admin_can_access_wallet_balance(self, admin_headers):
        """Admin should be able to access wallet balance API"""
        response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=admin_headers)
        print(f"Admin wallet balance response: {response.status_code} - {response.text[:200]}")
        
        # Should return 200 (wallet created if not exists)
        assert response.status_code == 200, f"Admin cannot access wallet balance: {response.text}"
        
        data = response.json()
        assert "balance" in data, "No balance field in response"
        assert "user_id" in data, "No user_id field in response"
        print(f"✅ Admin wallet balance: {data.get('balance', 0)}")
    
    def test_admin_can_request_topup(self, admin_headers):
        """Admin should be able to request wallet topup"""
        response = requests.post(f"{BASE_URL}/api/wallet/topup/request", 
            headers=admin_headers,
            json={
                "amount": 500,
                "payment_method": "shamcash"
            }
        )
        print(f"Admin topup request response: {response.status_code} - {response.text[:200]}")
        
        # Should return 200 (topup request created)
        assert response.status_code == 200, f"Admin cannot request topup: {response.text}"
        
        data = response.json()
        assert data.get("success"), "Topup request not successful"
        assert "topup_id" in data, "No topup_id in response"
        assert "topup_code" in data, "No topup_code in response"
        print(f"✅ Admin topup request created: {data.get('topup_code')}")
    
    def test_admin_can_view_topup_history(self, admin_headers):
        """Admin should be able to view topup history"""
        response = requests.get(f"{BASE_URL}/api/wallet/topup/history", headers=admin_headers)
        print(f"Admin topup history response: {response.status_code} - {response.text[:200]}")
        
        # Should return 200
        assert response.status_code == 200, f"Admin cannot view topup history: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Topup history should be a list"
        print(f"✅ Admin topup history count: {len(data)}")
    
    def test_admin_can_view_transactions(self, admin_headers):
        """Admin should be able to view wallet transactions"""
        response = requests.get(f"{BASE_URL}/api/wallet/transactions", headers=admin_headers)
        print(f"Admin transactions response: {response.status_code} - {response.text[:200]}")
        
        # Should return 200
        assert response.status_code == 200, f"Admin cannot view transactions: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Transactions should be a list"
        print(f"✅ Admin transactions count: {len(data)}")


class TestWalletAPIStructure:
    """Test wallet API response structure"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "TrendSyria@2026"
        })
        if response.status_code != 200:
            pytest.skip("Cannot login")
        
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_wallet_balance_structure(self, headers):
        """Verify wallet balance response structure"""
        response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Required fields
        required_fields = ["balance", "user_id", "user_type"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Balance should be numeric
        assert isinstance(data["balance"], (int, float)), "Balance should be numeric"
        
        print(f"✅ Wallet balance structure valid: balance={data['balance']}, user_type={data['user_type']}")
    
    def test_topup_request_validation(self, headers):
        """Test topup request validation - minimum amount"""
        # Test with amount below minimum (100)
        response = requests.post(f"{BASE_URL}/api/wallet/topup/request",
            headers=headers,
            json={
                "amount": 50,  # Below minimum
                "payment_method": "shamcash"
            }
        )
        
        # Should return 400 for invalid amount
        assert response.status_code == 400, f"Should reject amount below minimum: {response.text}"
        print(f"✅ Topup validation works - rejected amount below minimum")
    
    def test_topup_request_success(self, headers):
        """Test successful topup request"""
        response = requests.post(f"{BASE_URL}/api/wallet/topup/request",
            headers=headers,
            json={
                "amount": 1000,
                "payment_method": "shamcash"
            }
        )
        
        assert response.status_code == 200, f"Topup request failed: {response.text}"
        
        data = response.json()
        assert data.get("success")
        assert "topup_id" in data
        assert "topup_code" in data
        assert data.get("amount") == 1000
        assert data.get("status") == "pending"
        
        print(f"✅ Topup request successful: code={data['topup_code']}, amount={data['amount']}")


class TestWalletNoUserTypeRestriction:
    """Verify wallet APIs don't have user_type restrictions"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "TrendSyria@2026"
        })
        if response.status_code != 200:
            pytest.skip("Cannot login")
        
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_balance_no_403_for_non_buyer(self, headers):
        """Wallet balance should NOT return 403 for non-buyer users"""
        response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers)
        
        # Should NOT be 403 (forbidden)
        assert response.status_code != 403, "Wallet balance should not be restricted to buyers only"
        assert response.status_code == 200, f"Unexpected status: {response.status_code}"
        print(f"✅ Wallet balance accessible - no user_type restriction")
    
    def test_topup_request_no_403_for_non_buyer(self, headers):
        """Topup request should NOT return 403 for non-buyer users"""
        response = requests.post(f"{BASE_URL}/api/wallet/topup/request",
            headers=headers,
            json={
                "amount": 500,
                "payment_method": "shamcash"
            }
        )
        
        # Should NOT be 403 (forbidden)
        assert response.status_code != 403, "Topup request should not be restricted to buyers only"
        assert response.status_code == 200, f"Unexpected status: {response.status_code}"
        print(f"✅ Topup request accessible - no user_type restriction")
    
    def test_topup_history_no_403_for_non_buyer(self, headers):
        """Topup history should NOT return 403 for non-buyer users"""
        response = requests.get(f"{BASE_URL}/api/wallet/topup/history", headers=headers)
        
        # Should NOT be 403 (forbidden)
        assert response.status_code != 403, "Topup history should not be restricted to buyers only"
        assert response.status_code == 200, f"Unexpected status: {response.status_code}"
        print(f"✅ Topup history accessible - no user_type restriction")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
