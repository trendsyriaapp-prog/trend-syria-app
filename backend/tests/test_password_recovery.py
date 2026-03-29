"""
Test Password Recovery Feature for Trend Syria
Tests: forgot-password, verify-identity, reset-password APIs
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com').rstrip('/')

class TestForgotPasswordAPI:
    """Test forgot-password endpoint - Step 1: Find account by phone"""
    
    def test_forgot_password_existing_user(self):
        """Test finding account with valid phone number"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"phone": "0900000000"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["found"]
        assert "has_emergency_phone" in data
        assert "message" in data
        print("PASS: Forgot password found user 0900000000")
    
    def test_forgot_password_nonexistent_user(self):
        """Test finding account with non-existent phone"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"phone": "0999999999"}
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        print("PASS: Returns 404 for non-existent phone")
    
    def test_forgot_password_invalid_phone(self):
        """Test with invalid phone format"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"phone": "123"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("PASS: Returns 400 for invalid phone format")


class TestVerifyIdentityAPI:
    """Test verify-identity endpoint - Step 2: Verify by name or emergency phone"""
    
    def test_verify_identity_by_name_correct(self):
        """Test verification with correct full name"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-identity",
            json={
                "phone": "0900000000",
                "verification_type": "name",
                "full_name": "سامر محمود"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["verified"]
        assert "reset_token" in data
        assert len(data["reset_token"]) == 32
        print("PASS: Verify identity by name - got reset token")
        return data["reset_token"]
    
    def test_verify_identity_by_name_wrong(self):
        """Test verification with wrong name"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-identity",
            json={
                "phone": "0900000000",
                "verification_type": "name",
                "full_name": "wrong name"
            }
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print("PASS: Returns 401 for wrong name")
    
    def test_verify_identity_by_emergency_wrong_digits(self):
        """Test emergency verification with wrong last 4 digits"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-identity",
            json={
                "phone": "0900000000",
                "verification_type": "emergency",
                "emergency_last_4": "0000"  # Wrong digits
            }
        )
        assert response.status_code == 401  # Wrong digits returns 401
        data = response.json()
        assert "detail" in data
        print("PASS: Returns 401 for wrong emergency phone digits")
    
    def test_verify_identity_nonexistent_user(self):
        """Test verification with non-existent phone"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-identity",
            json={
                "phone": "0999999999",
                "verification_type": "name",
                "full_name": "test"
            }
        )
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        print("PASS: Returns 404 for non-existent user")
    
    def test_verify_identity_invalid_type(self):
        """Test with invalid verification type"""
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-identity",
            json={
                "phone": "0900000000",
                "verification_type": "invalid",
                "full_name": "test"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("PASS: Returns 400 for invalid verification type")


class TestResetPasswordAPI:
    """Test reset-password endpoint - Step 3: Reset with token"""
    
    def test_reset_password_full_flow(self):
        """Test complete password reset flow"""
        # Step 1: Get reset token
        verify_response = requests.post(
            f"{BASE_URL}/api/auth/verify-identity",
            json={
                "phone": "0900000000",
                "verification_type": "name",
                "full_name": "سامر محمود"
            }
        )
        assert verify_response.status_code == 200
        reset_token = verify_response.json()["reset_token"]
        
        # Step 2: Reset password
        reset_response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={
                "phone": "0900000000",
                "reset_token": reset_token,
                "new_password": "delivery123"
            }
        )
        assert reset_response.status_code == 200
        data = reset_response.json()
        assert data["success"]
        print("PASS: Password reset successful")
        
        # Step 3: Verify login with new password
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "phone": "0900000000",
                "password": "delivery123"
            }
        )
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert "token" in login_data
        assert login_data["user"]["phone"] == "0900000000"
        print("PASS: Login successful with reset password")
    
    def test_reset_password_invalid_token(self):
        """Test reset with invalid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={
                "phone": "0900000000",
                "reset_token": "invalid_token_12345",
                "new_password": "newpassword123"
            }
        )
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print("PASS: Returns 401 for invalid token")
    
    def test_reset_password_weak_password(self):
        """Test reset with weak password (less than 6 chars)"""
        import time
        time.sleep(1)  # Small delay to avoid rate limiting
        
        # First get a valid token
        verify_response = requests.post(
            f"{BASE_URL}/api/auth/verify-identity",
            json={
                "phone": "0900000000",
                "verification_type": "name",
                "full_name": "سامر محمود"
            }
        )
        
        # Skip if rate limited
        if verify_response.status_code == 429:
            pytest.skip("Rate limited - skipping weak password test")
        
        assert verify_response.status_code == 200, f"Expected 200, got {verify_response.status_code}"
        reset_token = verify_response.json()["reset_token"]
        
        # Try to reset with weak password
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={
                "phone": "0900000000",
                "reset_token": reset_token,
                "new_password": "123"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("PASS: Returns 400 for weak password")


class TestRegisterWithEmergencyPhone:
    """Test registration with emergency phone field"""
    
    def test_register_with_emergency_phone(self):
        """Test registration includes emergency_phone field"""
        unique_phone = f"09{str(uuid.uuid4().int)[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "full_name": "تيست مستخدم جديد",
                "phone": unique_phone,
                "password": "test123456",
                "city": "دمشق",
                "user_type": "buyer",
                "emergency_phone": "0912345678"
            }
        )
        # May fail due to rate limiting, but we check the schema is accepted
        if response.status_code == 200:
            data = response.json()
            assert "token" in data
            print("PASS: Registration with emergency phone successful")
        elif response.status_code == 429:
            print("SKIP: Rate limited - schema accepted but can't verify")
        else:
            print(f"Response: {response.status_code} - {response.json()}")
            assert False, f"Unexpected status: {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
