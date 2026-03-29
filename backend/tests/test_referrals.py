# /app/backend/tests/test_referrals.py
# Tests for Referral System APIs - دعوة الأصدقاء والحصول على مكافآت

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestReferralSystem:
    """Test Referral System APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test tokens"""
        # Admin login
        admin_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        assert admin_res.status_code == 200
        self.admin_token = admin_res.json()["token"]
        
        # Buyer login
        buyer_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0933333333",
            "password": "user123"
        })
        assert buyer_res.status_code == 200
        self.buyer_token = buyer_res.json()["token"]
    
    # ===============================
    # GET /api/referrals/my-code
    # ===============================
    
    def test_get_my_referral_code(self):
        """Test getting user's referral code"""
        res = requests.get(
            f"{BASE_URL}/api/referrals/my-code",
            headers={"Authorization": f"Bearer {self.buyer_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        
        # Verify response structure
        assert "code" in data
        assert "share_link" in data
        assert "stats" in data
        assert "rewards" in data
        
        # Verify code format (8 uppercase chars)
        assert len(data["code"]) == 8
        assert data["code"].isupper()
        
        # Verify stats structure
        assert "total_referrals" in data["stats"]
        assert "successful_referrals" in data["stats"]
        assert "total_earnings" in data["stats"]
        
        # Verify rewards structure
        assert "you_get" in data["rewards"]
        assert "friend_gets" in data["rewards"]
        assert data["rewards"]["you_get"] == 10000
    
    def test_get_my_referral_code_admin(self):
        """Test getting admin's referral code"""
        res = requests.get(
            f"{BASE_URL}/api/referrals/my-code",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "code" in data
        assert len(data["code"]) == 8
    
    def test_get_my_referral_code_unauthorized(self):
        """Test getting referral code without auth"""
        res = requests.get(f"{BASE_URL}/api/referrals/my-code")
        assert res.status_code == 401
    
    # ===============================
    # POST /api/referrals/validate-code
    # ===============================
    
    def test_validate_referral_code_valid(self):
        """Test validating a valid referral code"""
        res = requests.post(
            f"{BASE_URL}/api/referrals/validate-code",
            json={"code": "RDTZFFCE"}
        )
        assert res.status_code == 200
        data = res.json()
        
        assert data["valid"]
        assert "referrer_name" in data
        assert "discount" in data
        assert "20%" in data["discount"]
    
    def test_validate_referral_code_case_insensitive(self):
        """Test that code validation is case insensitive"""
        res = requests.post(
            f"{BASE_URL}/api/referrals/validate-code",
            json={"code": "rdtzffce"}  # lowercase
        )
        assert res.status_code == 200
        assert res.json()["valid"]
    
    def test_validate_referral_code_invalid(self):
        """Test validating an invalid referral code"""
        res = requests.post(
            f"{BASE_URL}/api/referrals/validate-code",
            json={"code": "INVALIDCODE"}
        )
        assert res.status_code == 404
        assert "غير صحيح" in res.json()["detail"]
    
    def test_validate_referral_code_empty(self):
        """Test validating empty code"""
        res = requests.post(
            f"{BASE_URL}/api/referrals/validate-code",
            json={"code": ""}
        )
        assert res.status_code == 400
        assert "مطلوب" in res.json()["detail"]
    
    # ===============================
    # POST /api/referrals/apply
    # ===============================
    
    def test_apply_referral_code_own_code(self):
        """Test applying own referral code (should fail)"""
        res = requests.post(
            f"{BASE_URL}/api/referrals/apply",
            headers={"Authorization": f"Bearer {self.buyer_token}"},
            json={"code": "RDTZFFCE"}
        )
        # Should fail - either because not new customer or using own code
        assert res.status_code == 400
        detail = res.json()["detail"]
        assert "الجدد" in detail or "الخاص بك" in detail
    
    def test_apply_referral_code_empty(self):
        """Test applying empty code"""
        res = requests.post(
            f"{BASE_URL}/api/referrals/apply",
            headers={"Authorization": f"Bearer {self.buyer_token}"},
            json={"code": ""}
        )
        assert res.status_code == 400
    
    def test_apply_referral_code_invalid(self):
        """Test applying invalid code"""
        res = requests.post(
            f"{BASE_URL}/api/referrals/apply",
            headers={"Authorization": f"Bearer {self.buyer_token}"},
            json={"code": "INVALIDCODE"}
        )
        # Could be 400 (not new) or 404 (invalid code)
        assert res.status_code in [400, 404]
    
    # ===============================
    # GET /api/referrals/my-referrals
    # ===============================
    
    def test_get_my_referrals(self):
        """Test getting list of referred users"""
        res = requests.get(
            f"{BASE_URL}/api/referrals/my-referrals",
            headers={"Authorization": f"Bearer {self.buyer_token}"}
        )
        assert res.status_code == 200
        assert isinstance(res.json(), list)
    
    def test_get_my_referrals_unauthorized(self):
        """Test getting referrals without auth"""
        res = requests.get(f"{BASE_URL}/api/referrals/my-referrals")
        assert res.status_code == 401
    
    # ===============================
    # GET /api/referrals/admin/stats
    # ===============================
    
    def test_admin_stats_as_admin(self):
        """Test getting admin stats as admin"""
        res = requests.get(
            f"{BASE_URL}/api/referrals/admin/stats",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        
        assert "stats" in data
        assert "top_referrers" in data
        
        stats = data["stats"]
        assert "total_codes" in stats
        assert "total_referrals" in stats
        assert "completed_referrals" in stats
        assert "pending_referrals" in stats
        assert "conversion_rate" in stats
        assert "total_rewards_given" in stats
    
    def test_admin_stats_as_buyer(self):
        """Test getting admin stats as buyer (should fail)"""
        res = requests.get(
            f"{BASE_URL}/api/referrals/admin/stats",
            headers={"Authorization": f"Bearer {self.buyer_token}"}
        )
        assert res.status_code == 403
        # Check detail contains admin-related error message
        detail = res.json()["detail"]
        assert "فقط" in detail  # "للمدراء فقط"
    
    # ===============================
    # GET /api/referrals/admin/settings
    # ===============================
    
    def test_admin_settings_get(self):
        """Test getting referral settings"""
        res = requests.get(
            f"{BASE_URL}/api/referrals/admin/settings",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        
        assert "referrer_reward" in data
        assert "referee_discount" in data
        assert "is_active" in data
        assert data["referrer_reward"] == 10000
        assert data["referee_discount"] == 20
    
    def test_admin_settings_get_as_buyer(self):
        """Test getting settings as buyer (should fail)"""
        res = requests.get(
            f"{BASE_URL}/api/referrals/admin/settings",
            headers={"Authorization": f"Bearer {self.buyer_token}"}
        )
        assert res.status_code == 403
    
    # ===============================
    # PUT /api/referrals/admin/settings
    # ===============================
    
    def test_admin_settings_update(self):
        """Test updating referral settings"""
        res = requests.put(
            f"{BASE_URL}/api/referrals/admin/settings",
            headers={"Authorization": f"Bearer {self.admin_token}"},
            json={
                "referrer_reward": 10000,
                "referee_discount": 20,
                "is_active": True
            }
        )
        assert res.status_code == 200
        assert "تم تحديث" in res.json()["message"]
        
        # Verify update
        verify = requests.get(
            f"{BASE_URL}/api/referrals/admin/settings",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert verify.json()["referrer_reward"] == 10000
    
    def test_admin_settings_update_as_buyer(self):
        """Test updating settings as buyer (should fail)"""
        res = requests.put(
            f"{BASE_URL}/api/referrals/admin/settings",
            headers={"Authorization": f"Bearer {self.buyer_token}"},
            json={"referrer_reward": 5000}
        )
        assert res.status_code == 403


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
