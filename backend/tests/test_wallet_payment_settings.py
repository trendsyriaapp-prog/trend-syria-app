# /app/backend/tests/test_wallet_payment_settings.py
# Tests for Wallet, Payment, and Settings APIs - Trend Syria E-commerce
# Features: Wallet balance, Withdrawal requests, Delivery fee calculation, Platform settings

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the system
ADMIN_CREDS = {"phone": "0911111111", "password": "admin123"}
SELLER_CREDS = {"phone": "0922222222", "password": "seller123"}
CUSTOMER_CREDS = {"phone": "0933333333", "password": "user123"}


class TestAuth:
    """Authentication helper tests"""
    
    def test_admin_login(self):
        """Test admin login to get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print("✅ Admin login successful")
        return data["token"]
    
    def test_seller_login(self):
        """Test seller login to get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SELLER_CREDS)
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print("✅ Seller login successful")
        return data["token"]
    
    def test_customer_login(self):
        """Test customer login to get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "token" in data
        print("✅ Customer login successful")
        return data["token"]


# Fixtures for authenticated clients
@pytest.fixture(scope="module")
def admin_token():
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")

@pytest.fixture(scope="module")
def seller_token():
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SELLER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Seller authentication failed")

@pytest.fixture(scope="module")
def customer_token():
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Customer authentication failed")


class TestWalletAPI:
    """Wallet API tests - /api/wallet/*"""
    
    def test_wallet_balance_for_seller(self, seller_token):
        """GET /api/wallet/balance - Get wallet balance for seller"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify wallet structure
        assert "balance" in data
        assert "pending_balance" in data
        assert "total_earned" in data
        assert "available_balance" in data
        assert "user_id" in data
        assert "user_type" in data
        assert data["user_type"] == "seller"
        
        print(f"✅ Wallet balance for seller: {data['available_balance']} ل.س")
    
    def test_wallet_balance_forbidden_for_customer(self, customer_token):
        """GET /api/wallet/balance - Should return 403 for regular customers"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}"
        print("✅ Wallet balance correctly forbidden for customers")
    
    def test_wallet_balance_unauthorized(self):
        """GET /api/wallet/balance - Should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/wallet/balance")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Wallet balance correctly requires authentication")
    
    def test_wallet_transactions(self, seller_token):
        """GET /api/wallet/transactions - Get transaction history"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/wallet/transactions", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Wallet transactions: {len(data)} records")
    
    def test_wallet_withdrawals_history(self, seller_token):
        """GET /api/wallet/withdrawals - Get withdrawal history"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/wallet/withdrawals", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Withdrawal history: {len(data)} records")


class TestWithdrawalAPI:
    """Withdrawal request API tests - /api/wallet/withdraw"""
    
    def test_withdraw_insufficient_balance(self, seller_token):
        """POST /api/wallet/withdraw - Should fail with insufficient balance"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        # Try to withdraw more than available
        response = requests.post(
            f"{BASE_URL}/api/wallet/withdraw",
            params={"amount": 999999999, "shamcash_phone": "0911234567"},
            headers=headers
        )
        
        # Should fail due to insufficient balance
        assert response.status_code == 400, f"Expected 400 for insufficient balance, got {response.status_code}"
        print("✅ Withdrawal correctly rejected for insufficient balance")
    
    def test_withdraw_below_minimum(self, seller_token):
        """POST /api/wallet/withdraw - Should fail below minimum amount"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        # Try to withdraw below minimum (50000 for seller)
        response = requests.post(
            f"{BASE_URL}/api/wallet/withdraw",
            params={"amount": 1000, "shamcash_phone": "0911234567"},
            headers=headers
        )
        
        # Should fail due to minimum requirement
        assert response.status_code == 400, f"Expected 400 for below minimum, got {response.status_code}"
        data = response.json()
        assert "50,000" in data.get("detail", "") or "50000" in data.get("detail", "")
        print("✅ Withdrawal correctly rejected for below minimum")
    
    def test_withdraw_forbidden_for_customer(self, customer_token):
        """POST /api/wallet/withdraw - Should be forbidden for customers"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/wallet/withdraw",
            params={"amount": 50000, "shamcash_phone": "0911234567"},
            headers=headers
        )
        
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}"
        print("✅ Withdrawal correctly forbidden for customers")


class TestDeliveryFeeAPI:
    """Delivery fee calculation API tests - /api/payment/delivery-fee"""
    
    def test_delivery_fee_same_city(self):
        """GET /api/payment/delivery-fee - Same city should be 3000"""
        response = requests.get(
            f"{BASE_URL}/api/payment/delivery-fee",
            params={"seller_city": "دمشق", "customer_city": "دمشق"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "fee" in data
        assert "distance_type" in data
        assert data["distance_type"] == "same_city"
        assert data["fee"] == 3000
        print(f"✅ Same city delivery fee: {data['fee']} ل.س")
    
    def test_delivery_fee_nearby(self):
        """GET /api/payment/delivery-fee - Nearby cities should be 5000"""
        response = requests.get(
            f"{BASE_URL}/api/payment/delivery-fee",
            params={"seller_city": "دمشق", "customer_city": "ريف دمشق"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data["distance_type"] == "nearby"
        assert data["fee"] == 5000
        print(f"✅ Nearby city delivery fee: {data['fee']} ل.س")
    
    def test_delivery_fee_medium(self):
        """GET /api/payment/delivery-fee - Medium distance should be 8000"""
        response = requests.get(
            f"{BASE_URL}/api/payment/delivery-fee",
            params={"seller_city": "دمشق", "customer_city": "حمص"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data["distance_type"] == "medium"
        assert data["fee"] == 8000
        print(f"✅ Medium distance delivery fee: {data['fee']} ل.س")
    
    def test_delivery_fee_far(self):
        """GET /api/payment/delivery-fee - Far cities should be 12000"""
        response = requests.get(
            f"{BASE_URL}/api/payment/delivery-fee",
            params={"seller_city": "دمشق", "customer_city": "حلب"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data["distance_type"] == "far"
        assert data["fee"] == 12000
        print(f"✅ Far distance delivery fee: {data['fee']} ل.س")


class TestSettingsAPI:
    """Platform settings API tests - /api/settings"""
    
    def test_settings_get_for_admin(self, admin_token):
        """GET /api/settings - Admin should see full settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/settings", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify settings structure
        assert "min_seller_withdrawal" in data
        assert "min_delivery_withdrawal" in data
        assert "delivery_fees" in data
        assert "free_shipping_threshold" in data
        
        # Verify delivery fees structure
        assert "same_city" in data["delivery_fees"]
        assert "nearby" in data["delivery_fees"]
        assert "medium" in data["delivery_fees"]
        assert "far" in data["delivery_fees"]
        
        print("✅ Settings retrieved for admin")
        print(f"   - Min seller withdrawal: {data['min_seller_withdrawal']} ل.س")
        print(f"   - Min delivery withdrawal: {data['min_delivery_withdrawal']} ل.س")
        print(f"   - Delivery fees: {data['delivery_fees']}")
    
    def test_settings_forbidden_for_seller(self, seller_token):
        """GET /api/settings - Should be forbidden for non-admin"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/settings", headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for seller, got {response.status_code}"
        print("✅ Settings correctly forbidden for seller")
    
    def test_settings_public(self):
        """GET /api/settings/public - Public settings available to all"""
        response = requests.get(f"{BASE_URL}/api/settings/public")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "delivery_fees" in data
        assert "free_shipping_threshold" in data
        print("✅ Public settings accessible")
    
    def test_update_delivery_fees(self, admin_token):
        """PUT /api/settings/delivery-fees - Admin can update delivery fees"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        new_fees = {
            "same_city": 3000,
            "nearby": 5000,
            "medium": 8000,
            "far": 12000
        }
        
        response = requests.put(
            f"{BASE_URL}/api/settings/delivery-fees",
            json=new_fees,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        print("✅ Delivery fees updated successfully")
    
    def test_update_delivery_fees_forbidden_for_seller(self, seller_token):
        """PUT /api/settings/delivery-fees - Should be forbidden for non-admin"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        new_fees = {"same_city": 3000, "nearby": 5000, "medium": 8000, "far": 12000}
        
        response = requests.put(
            f"{BASE_URL}/api/settings/delivery-fees",
            json=new_fees,
            headers=headers
        )
        
        assert response.status_code == 403, f"Expected 403 for seller, got {response.status_code}"
        print("✅ Delivery fees update correctly forbidden for seller")


class TestAdminWithdrawalsAPI:
    """Admin withdrawals management API tests - /api/payment/admin/withdrawals"""
    
    def test_admin_get_all_withdrawals(self, admin_token):
        """GET /api/payment/admin/withdrawals - Admin can see all withdrawals"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/payment/admin/withdrawals", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Admin retrieved {len(data)} withdrawal requests")
    
    def test_admin_filter_withdrawals_by_status(self, admin_token):
        """GET /api/payment/admin/withdrawals?status=pending - Filter by status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/payment/admin/withdrawals",
            params={"status": "pending"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        
        # All should be pending if any exist
        for withdrawal in data:
            assert withdrawal.get("status") == "pending"
        
        print(f"✅ Admin filtered pending withdrawals: {len(data)} records")
    
    def test_admin_withdrawals_forbidden_for_seller(self, seller_token):
        """GET /api/payment/admin/withdrawals - Should be forbidden for non-admin"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/payment/admin/withdrawals", headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for seller, got {response.status_code}"
        print("✅ Admin withdrawals correctly forbidden for seller")
    
    def test_admin_withdrawals_forbidden_for_customer(self, customer_token):
        """GET /api/payment/admin/withdrawals - Should be forbidden for customer"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/payment/admin/withdrawals", headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}"
        print("✅ Admin withdrawals correctly forbidden for customer")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
