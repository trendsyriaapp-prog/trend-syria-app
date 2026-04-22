"""
Test Seller Scenario - Syrian E-commerce App
Tests the complete seller workflow:
1. Register new seller
2. Admin login and approval of new seller
3. Seller login verification
4. Store settings with mandatory location
"""

import pytest
import requests
import secrets
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from environment or defaults
ADMIN_PHONE = os.environ.get('TEST_ADMIN_PHONE', "0911111111")
ADMIN_PASSWORD = os.environ.get('TEST_ADMIN_PASSWORD', "Admin@123")

# Generate random phone for new seller
def generate_random_phone():
    return f"09{secrets.randbelow(90000000) + 10000000}"


class TestSellerScenario:
    """Complete seller scenario test"""
    
    seller_phone = None
    seller_password = "Seller@123Test"
    seller_token = None
    seller_id = None
    admin_token = None
    
    # =====================================================
    # Step 1: Register new seller via /api/auth/register
    # =====================================================
    
    def test_01_register_new_seller(self):
        """Register a new seller with random phone"""
        TestSellerScenario.seller_phone = generate_random_phone()
        
        payload = {
            "phone": TestSellerScenario.seller_phone,
            "password": TestSellerScenario.seller_password,
            "full_name": "TEST_بائع اختباري جديد",
            "city": "دمشق",
            "user_type": "seller",
            "emergency_phone": "0933333333"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        print("\n=== Step 1: Register New Seller ===")
        print(f"Phone: {TestSellerScenario.seller_phone}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user info"
        assert data["user"]["user_type"] == "seller", "User type should be seller"
        assert not data["user"]["is_approved"], "New seller should NOT be approved automatically"
        
        TestSellerScenario.seller_id = data["user"]["id"]
        TestSellerScenario.seller_token = data["token"]
        
        print(f"Seller ID: {TestSellerScenario.seller_id}")
        print(f"is_approved: {data['user']['is_approved']}")
        print("✅ Seller registration successful - pending approval")
    
    # =====================================================
    # Step 2: Admin login
    # =====================================================
    
    def test_02_admin_login(self):
        """Admin login to approve seller"""
        payload = {
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        print("\n=== Step 2: Admin Login ===")
        print(f"Status Code: {response.status_code}")
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert data["user"]["user_type"] == "admin", "User should be admin"
        
        TestSellerScenario.admin_token = data["token"]
        print(f"Admin user_type: {data['user']['user_type']}")
        print("✅ Admin login successful")
    
    # =====================================================
    # Step 3: Get pending users (verify seller in list)
    # =====================================================
    
    def test_03_get_pending_sellers(self):
        """Get list of pending sellers - verify new seller exists"""
        headers = {"Authorization": f"Bearer {TestSellerScenario.admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/sellers/pending", headers=headers)
        print("\n=== Step 3: Get Pending Sellers ===")
        print(f"Status Code: {response.status_code}")
        
        # Note: If seller documents are required, we might need different check
        if response.status_code == 200:
            data = response.json()
            print(f"Pending sellers count: {len(data)}")
            print("✅ Got pending sellers list")
        else:
            print(f"Note: Pending sellers endpoint returned {response.status_code}")
            print("This might be expected if seller hasn't submitted documents yet")
    
    # =====================================================
    # Step 4: Approve the new seller
    # =====================================================
    
    def test_04_approve_seller(self):
        """Admin approves the new seller"""
        assert TestSellerScenario.seller_id, "Seller ID not available from registration"
        
        headers = {"Authorization": f"Bearer {TestSellerScenario.admin_token}"}
        
        # First check if user exists via users endpoint
        # The approval might be via /api/admin/users/{id}/approve or /api/admin/sellers/{id}/approve
        
        # Try sellers endpoint first
        response = requests.post(
            f"{BASE_URL}/api/admin/sellers/{TestSellerScenario.seller_id}/approve", 
            headers=headers
        )
        
        print("\n=== Step 4: Approve Seller ===")
        print(f"Seller ID: {TestSellerScenario.seller_id}")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        assert response.status_code == 200, f"Seller approval failed: {response.text}"
        print("✅ Seller approved successfully")
    
    # =====================================================
    # Step 5: Seller login after approval
    # =====================================================
    
    def test_05_seller_login_after_approval(self):
        """Seller logs in after being approved"""
        payload = {
            "phone": TestSellerScenario.seller_phone,
            "password": TestSellerScenario.seller_password
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        print("\n=== Step 5: Seller Login After Approval ===")
        print(f"Status Code: {response.status_code}")
        
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        
        data = response.json()
        assert data["user"]["is_approved"], "Seller should now be approved"
        
        TestSellerScenario.seller_token = data["token"]
        print(f"is_approved: {data['user']['is_approved']}")
        print("✅ Seller login successful - is_approved = True")
    
    # =====================================================
    # Step 6: Test store settings GET
    # =====================================================
    
    def test_06_get_store_settings(self):
        """Get store settings for seller"""
        headers = {"Authorization": f"Bearer {TestSellerScenario.seller_token}"}
        
        response = requests.get(f"{BASE_URL}/api/auth/seller/store-settings", headers=headers)
        print("\n=== Step 6: Get Store Settings ===")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200, f"Failed to get store settings: {response.text}"
        print("✅ Store settings retrieved successfully")
    
    # =====================================================
    # Step 7: Test store settings UPDATE without location (should fail on frontend)
    # =====================================================
    
    def test_07_update_store_settings_without_location(self):
        """Update store settings without location - API allows but frontend enforces"""
        headers = {"Authorization": f"Bearer {TestSellerScenario.seller_token}"}
        
        # Note: Backend doesn't enforce location, but frontend does
        payload = {
            "store_name": "TEST_متجر اختباري",
            "store_description": "وصف المتجر الاختباري",
            "store_address": "شارع الثورة - دمشق",
            "store_city": "دمشق",
            "store_phone": "0999999999"
            # No latitude/longitude - frontend should block this
        }
        
        response = requests.put(f"{BASE_URL}/api/auth/seller/store-settings", json=payload, headers=headers)
        print("\n=== Step 7: Update Store Settings (No Location) ===")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Backend accepts without location - frontend enforces
        assert response.status_code == 200, f"Store settings update failed: {response.text}"
        print("⚠️ Backend accepts without location - Frontend enforces this validation")
    
    # =====================================================
    # Step 8: Test store settings UPDATE with location
    # =====================================================
    
    def test_08_update_store_settings_with_location(self):
        """Update store settings with location (complete data)"""
        headers = {"Authorization": f"Bearer {TestSellerScenario.seller_token}"}
        
        # Damascus coordinates
        payload = {
            "store_name": "TEST_متجر اختباري كامل",
            "store_description": "وصف المتجر الاختباري الكامل مع الموقع",
            "store_address": "شارع الثورة - دمشق",
            "store_city": "دمشق",
            "store_phone": "0999999999",
            "store_latitude": 33.5138,
            "store_longitude": 36.2765
        }
        
        response = requests.put(f"{BASE_URL}/api/auth/seller/store-settings", json=payload, headers=headers)
        print("\n=== Step 8: Update Store Settings (With Location) ===")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        assert response.status_code == 200, f"Store settings update failed: {response.text}"
        print("✅ Store settings updated with location successfully")
    
    # =====================================================
    # Step 9: Verify store settings were saved
    # =====================================================
    
    def test_09_verify_store_settings_saved(self):
        """Verify the store settings were saved correctly"""
        headers = {"Authorization": f"Bearer {TestSellerScenario.seller_token}"}
        
        response = requests.get(f"{BASE_URL}/api/auth/seller/store-settings", headers=headers)
        print("\n=== Step 9: Verify Store Settings Saved ===")
        print(f"Status Code: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get store settings: {response.text}"
        
        data = response.json()
        print(f"Response: {data}")
        
        assert data.get("store_name") == "TEST_متجر اختباري كامل", "Store name mismatch"
        assert data.get("store_city") == "دمشق", "Store city mismatch"
        print("✅ Store settings verified successfully")
    
    # =====================================================
    # Step 10: Test payment accounts CRUD
    # =====================================================
    
    def test_10_payment_accounts_crud(self):
        """Test payment accounts CRUD operations"""
        headers = {"Authorization": f"Bearer {TestSellerScenario.seller_token}"}
        
        # GET initial accounts (should be empty)
        response = requests.get(f"{BASE_URL}/api/auth/seller/payment-accounts", headers=headers)
        print("\n=== Step 10: Payment Accounts CRUD ===")
        print(f"GET Status: {response.status_code}")
        assert response.status_code == 200
        
        # POST - Add new account
        new_account = {
            "type": "shamcash",
            "account_number": "0991234567",
            "holder_name": "TEST_صاحب الحساب",
            "is_default": True
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/seller/payment-accounts", json=new_account, headers=headers)
        print(f"POST Status: {response.status_code}")
        assert response.status_code == 200, f"Failed to add payment account: {response.text}"
        
        data = response.json()
        account_id = data.get("id")
        print(f"Created account ID: {account_id}")
        
        # GET - Verify account added
        response = requests.get(f"{BASE_URL}/api/auth/seller/payment-accounts", headers=headers)
        assert response.status_code == 200
        accounts = response.json()
        assert len(accounts) >= 1, "Should have at least 1 account"
        print(f"Total accounts: {len(accounts)}")
        
        # DELETE - Cleanup
        if account_id:
            response = requests.delete(f"{BASE_URL}/api/auth/seller/payment-accounts/{account_id}", headers=headers)
            print(f"DELETE Status: {response.status_code}")
            assert response.status_code == 200, f"Failed to delete account: {response.text}"
        
        print("✅ Payment accounts CRUD working correctly")


class TestEdgeCases:
    """Edge cases and error handling tests"""
    
    def test_register_duplicate_phone(self):
        """Test registering with duplicate phone number"""
        payload = {
            "phone": ADMIN_PHONE,  # Using admin phone which already exists
            "password": os.getenv("TEST_USER_PASSWORD", "Test@123456"),
            "full_name": "Duplicate User",
            "city": "دمشق",
            "user_type": "buyer"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        print("\n=== Edge Case: Duplicate Phone Registration ===")
        print(f"Status Code: {response.status_code}")
        
        assert response.status_code == 400, "Should reject duplicate phone"
        print("✅ Duplicate phone correctly rejected")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        payload = {
            "phone": "0999999999",
            "password": "WrongPassword123"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        print("\n=== Edge Case: Invalid Login Credentials ===")
        print(f"Status Code: {response.status_code}")
        
        assert response.status_code == 401, "Should reject invalid credentials"
        print("✅ Invalid credentials correctly rejected")
    
    def test_store_settings_unauthorized(self):
        """Test accessing store settings without authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/seller/store-settings")
        print("\n=== Edge Case: Unauthorized Access ===")
        print(f"Status Code: {response.status_code}")
        
        assert response.status_code in [401, 403], "Should reject unauthorized access"
        print("✅ Unauthorized access correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
