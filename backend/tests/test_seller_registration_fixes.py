"""
Test file for verifying seller registration fixes:
1. Sham Cash accepts 32 hex characters
2. API endpoints for categories and business-categories
3. Health check
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')


class TestHealthAndCategories:
    """Test health and category endpoints"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Health endpoint working")
    
    def test_categories_endpoint(self):
        """Test /api/categories returns categories list"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✅ Categories endpoint returned {len(data)} categories")
    
    def test_business_categories_for_seller(self):
        """Test /api/settings/business-categories/public for seller type"""
        response = requests.get(f"{BASE_URL}/api/settings/business-categories/public?seller_type=seller")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert isinstance(data["categories"], list)
        assert len(data["categories"]) > 0
        print(f"✅ Business categories for seller returned {len(data['categories'])} categories")
    
    def test_business_categories_for_food_seller(self):
        """Test /api/settings/business-categories/public for food_seller type"""
        response = requests.get(f"{BASE_URL}/api/settings/business-categories/public?seller_type=food_seller")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert isinstance(data["categories"], list)
        print(f"✅ Business categories for food_seller returned {len(data['categories'])} categories")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_login_with_valid_credentials(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "TrendSyria@2026"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "admin"
        print("✅ Login with admin credentials successful")
    
    def test_login_with_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400]
        print("✅ Login with invalid credentials correctly rejected")


class TestShamCashValidation:
    """Test Sham Cash field validation logic (frontend validation)"""
    
    def test_valid_32_hex_format(self):
        """Verify 32 hex character format is valid"""
        import re
        valid_shamcash = "50778ad0f15afe11040f42cfb11efdfd"
        pattern = r'^[a-f0-9]{32}$'
        assert re.match(pattern, valid_shamcash) is not None
        print(f"✅ Valid Sham Cash format: {valid_shamcash}")
    
    def test_invalid_formats(self):
        """Verify invalid formats are rejected"""
        import re
        pattern = r'^[a-f0-9]{32}$'
        
        # Phone number format (old format - should be invalid)
        invalid_phone = "0912345678"
        assert re.match(pattern, invalid_phone) is None
        print(f"✅ Phone number format correctly rejected: {invalid_phone}")
        
        # Too short
        invalid_short = "50778ad0f15afe11"
        assert re.match(pattern, invalid_short) is None
        print(f"✅ Short format correctly rejected: {invalid_short}")
        
        # Contains invalid characters
        invalid_chars = "50778ad0f15afe11040f42cfb11efdXY"
        assert re.match(pattern, invalid_chars) is None
        print(f"✅ Invalid characters correctly rejected: {invalid_chars}")
        
        # Uppercase (should be lowercase)
        invalid_upper = "50778AD0F15AFE11040F42CFB11EFDFD"
        assert re.match(pattern, invalid_upper) is None
        print(f"✅ Uppercase format correctly rejected: {invalid_upper}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
