"""
Test suite for OrdersMap.js refactoring verification
Tests basic API endpoints to ensure no regression after extracting 11 UI components
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBasicAPIs:
    """Test basic API endpoints to verify app is working after refactoring"""
    
    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ Health endpoint working")
    
    def test_categories_endpoint(self):
        """Test /api/categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check category structure
        first_cat = data[0]
        assert "id" in first_cat
        assert "name" in first_cat
        print(f"✅ Categories endpoint working - {len(data)} categories found")
    
    def test_settings_public_endpoint(self):
        """Test /api/settings/public endpoint"""
        response = requests.get(f"{BASE_URL}/api/settings/public")
        assert response.status_code == 200
        print("✅ Public settings endpoint working")
    
    def test_ticker_messages_endpoint(self):
        """Test /api/settings/ticker-messages endpoint"""
        response = requests.get(f"{BASE_URL}/api/settings/ticker-messages")
        assert response.status_code == 200
        print("✅ Ticker messages endpoint working")
    
    def test_flash_status_endpoint(self):
        """Test /api/flash/status endpoint"""
        response = requests.get(f"{BASE_URL}/api/flash/status")
        assert response.status_code == 200
        print("✅ Flash status endpoint working")
    
    def test_homepage_data_endpoint(self):
        """Test /api/products/homepage-data endpoint"""
        response = requests.get(f"{BASE_URL}/api/products/homepage-data")
        assert response.status_code == 200
        print("✅ Homepage data endpoint working")
    
    def test_daily_deals_endpoint(self):
        """Test /api/daily-deals/active endpoint"""
        response = requests.get(f"{BASE_URL}/api/daily-deals/active")
        assert response.status_code == 200
        print("✅ Daily deals endpoint working")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0000000000",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Login endpoint properly rejects invalid credentials")
    
    def test_auth_me_without_token(self):
        """Test /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✅ Auth me endpoint properly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
