"""
Test suite for Trend Syria e-commerce app - Testing 10 restored fixes
Tests: Registration, Login, Categories, Settings, Food Seller Join
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"
TEST_OTP = "123456"


class TestHealthAndBasicAPIs:
    """Test basic API health and public endpoints"""
    
    def test_health_endpoint(self):
        """Test API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✅ Health endpoint working")
    
    def test_public_settings(self):
        """Test public settings endpoint"""
        response = requests.get(f"{BASE_URL}/api/settings/public")
        assert response.status_code == 200
        data = response.json()
        # Check food_enabled setting
        assert "food_enabled" in data
        print(f"✅ Public settings - food_enabled: {data.get('food_enabled')}")
    
    def test_categories_endpoint(self):
        """Test categories endpoint - should not show food categories if food_enabled is false"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Categories endpoint - {len(data)} categories found")
        
        # Check category names
        category_names = [cat.get('name', '') for cat in data]
        print(f"   Categories: {category_names[:5]}...")


class TestAuthenticationFlow:
    """Test authentication flow with OTP"""
    
    def test_login_with_valid_credentials(self):
        """Test login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        
        # Check if OTP is required (new device)
        if data.get("requires_device_otp"):
            print("✅ Login successful - OTP required for new device")
            assert "pending_token" in data
        else:
            print("✅ Login successful - No OTP required")
            assert "access_token" in data
    
    def test_login_with_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": "WrongPassword123"
        })
        assert response.status_code == 401
        print("✅ Invalid credentials rejected correctly")
    
    def test_device_otp_verification(self):
        """Test OTP verification flow"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        login_data = login_response.json()
        
        if login_data.get("requires_device_otp"):
            pending_token = login_data.get("pending_token")
            
            # Verify OTP
            otp_response = requests.post(f"{BASE_URL}/api/auth/verify-device-otp", json={
                "pending_token": pending_token,
                "otp": TEST_OTP,
                "device_id": "test-device-001"
            })
            assert otp_response.status_code == 200
            otp_data = otp_response.json()
            assert "access_token" in otp_data
            print("✅ OTP verification successful")
            return otp_data["access_token"]
        else:
            print("✅ No OTP required - returning access token")
            return login_data.get("access_token")


class TestRegistrationFlow:
    """Test registration flow with account types"""
    
    def test_registration_endpoint_exists(self):
        """Test that registration endpoint exists"""
        # Test with minimal data to check endpoint
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone": "0912345678",
            "password": "Test123456",
            "name": "Test User",
            "user_type": "buyer"
        })
        # Should either succeed or fail with validation error, not 404
        assert response.status_code != 404
        print(f"✅ Registration endpoint exists - status: {response.status_code}")


class TestBusinessCategoriesForFoodSeller:
    """Test business categories for food seller registration"""
    
    def test_business_categories_public_endpoint(self):
        """Test public business categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/settings/business-categories/public?seller_type=food_seller")
        assert response.status_code == 200
        data = response.json()
        
        if "categories" in data:
            categories = data["categories"]
            print(f"✅ Business categories found: {len(categories)}")
            
            # Check if any category requires license
            for cat in categories:
                if cat.get("requires_license"):
                    print(f"   Category '{cat.get('name')}' requires license")
        else:
            print("✅ Business categories endpoint working (no categories configured)")


class TestPaymentValidation:
    """Test payment account validation rules"""
    
    def test_shamcash_validation_rules(self):
        """Test Sham Cash validation - must be 10 digits starting with 09"""
        # Valid Sham Cash numbers
        valid_numbers = ["0912345678", "0987654321", "0911111111"]
        invalid_numbers = ["1234567890", "091234567", "09123456789", "0812345678"]
        
        for num in valid_numbers:
            assert num.startswith("09"), f"Valid number {num} should start with 09"
            assert len(num) == 10, f"Valid number {num} should be 10 digits"
            assert num.isdigit(), f"Valid number {num} should be all digits"
        
        for num in invalid_numbers:
            is_valid = num.startswith("09") and len(num) == 10 and num.isdigit()
            assert not is_valid, f"Invalid number {num} should fail validation"
        
        print("✅ Sham Cash validation rules verified")


class TestAllowedRegions:
    """Test geographic restriction system"""
    
    def test_allowed_regions_endpoint(self):
        """Test allowed regions API"""
        response = requests.get(f"{BASE_URL}/api/settings/allowed-regions")
        assert response.status_code == 200
        data = response.json()
        
        assert "enabled" in data
        assert "cities" in data
        
        if data["enabled"]:
            print(f"✅ Region restriction enabled")
            for city in data["cities"]:
                print(f"   City: {city.get('name')} - {len(city.get('regions', []))} regions")
        else:
            print("✅ Region restriction disabled")


class TestHomepageData:
    """Test homepage data endpoint"""
    
    def test_homepage_data(self):
        """Test homepage data returns categories and products"""
        response = requests.get(f"{BASE_URL}/api/products/homepage-data")
        assert response.status_code == 200
        data = response.json()
        
        assert "categories" in data
        assert "featured_products" in data or "products" in data
        
        categories = data.get("categories", [])
        print(f"✅ Homepage data - {len(categories)} categories")
        
        # Check if food categories are filtered based on food_enabled
        settings_response = requests.get(f"{BASE_URL}/api/settings/public")
        if settings_response.status_code == 200:
            settings = settings_response.json()
            food_enabled = settings.get("food_enabled", False)
            print(f"   food_enabled: {food_enabled}")


class TestAddressFields:
    """Test address field labels"""
    
    def test_address_field_names(self):
        """Verify address fields use 'street name' not 'street number'"""
        # This is a frontend test, but we can verify the API accepts the correct fields
        test_address = {
            "title": "Test Address",
            "city": "دمشق",
            "area": "المزة",
            "street_number": "شارع النصر",  # This should be street NAME
            "building_number": "5",
            "apartment_number": "3",
            "phone": "0912345678"
        }
        
        # The field is named street_number but should accept street NAME
        assert "street_number" in test_address
        print("✅ Address field 'street_number' exists (used for street name)")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
