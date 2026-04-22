"""
Test Delivery Driver Registration - Syrian Local Requirements
Tests for:
- GET /api/delivery/fuel-types endpoint returns petrol and electric
- POST /api/delivery/documents accepts new fields: bike_photo, fuel_type
- POST /api/delivery/documents rejects empty bike_photo
- POST /api/delivery/documents rejects invalid fuel_type
- POST /api/delivery/documents rejects empty home_latitude/home_longitude
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_PHONE = "0945570365"
OTP_CODE = "123456"


class TestDeliveryFuelTypes:
    """Test GET /api/delivery/fuel-types endpoint"""
    
    def test_fuel_types_endpoint_returns_200(self):
        """Test that fuel-types endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/delivery/fuel-types")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ GET /api/delivery/fuel-types returns 200")
    
    def test_fuel_types_returns_petrol_and_electric(self):
        """Test that fuel-types returns both petrol and electric options"""
        response = requests.get(f"{BASE_URL}/api/delivery/fuel-types")
        assert response.status_code == 200
        
        data = response.json()
        assert "fuel_types" in data, "Response should contain 'fuel_types' key"
        
        fuel_types = data["fuel_types"]
        assert len(fuel_types) == 2, f"Expected 2 fuel types, got {len(fuel_types)}"
        
        fuel_ids = [ft["id"] for ft in fuel_types]
        assert "petrol" in fuel_ids, "Should contain 'petrol' fuel type"
        assert "electric" in fuel_ids, "Should contain 'electric' fuel type"
        
        # Verify structure
        for ft in fuel_types:
            assert "id" in ft, "Each fuel type should have 'id'"
            assert "name" in ft, "Each fuel type should have 'name'"
            assert "icon" in ft, "Each fuel type should have 'icon'"
        
        print("✅ Fuel types endpoint returns petrol and electric")
        print(f"   Fuel types: {fuel_ids}")


class TestDeliveryDocumentsValidation:
    """Test POST /api/delivery/documents validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user - register a delivery driver"""
        self.test_phone = f"09{uuid.uuid4().hex[:8]}"
        self.test_password = os.getenv("TEST_USER_PASSWORD", "Test@123456")
        
        # Register a new delivery user
        register_data = {
            "full_name": "Test Driver",
            "phone": self.test_phone,
            "password": self.test_password,
            "city": "دمشق",
            "user_type": "delivery"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            # If registration fails (phone exists), try login
            login_data = {"phone": self.test_phone, "password": self.test_password}
            response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
            if response.status_code == 200:
                self.token = response.json().get("token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                pytest.skip("Could not create or login test delivery user")
    
    def test_documents_rejects_empty_bike_photo(self):
        """Test that documents endpoint rejects empty bike_photo"""
        docs_data = {
            "national_id": "12345678901",
            "personal_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "id_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "bike_photo": "",  # Empty - should be rejected
            "fuel_type": "petrol",
            "home_address": "دمشق - المزة",
            "home_latitude": 33.5138,
            "home_longitude": 36.2765,
            "home_city": "دمشق"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/delivery/documents",
            json=docs_data,
            headers=self.headers
        )
        
        assert response.status_code == 400, f"Expected 400 for empty bike_photo, got {response.status_code}"
        assert "صورة الدراجة" in response.json().get("detail", ""), "Error should mention bike photo"
        print("✅ Documents endpoint rejects empty bike_photo")
    
    def test_documents_rejects_invalid_fuel_type(self):
        """Test that documents endpoint rejects invalid fuel_type"""
        docs_data = {
            "national_id": "12345678901",
            "personal_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "id_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "bike_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "fuel_type": "diesel",  # Invalid - should be rejected
            "home_address": "دمشق - المزة",
            "home_latitude": 33.5138,
            "home_longitude": 36.2765,
            "home_city": "دمشق"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/delivery/documents",
            json=docs_data,
            headers=self.headers
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid fuel_type, got {response.status_code}"
        assert "الوقود" in response.json().get("detail", ""), "Error should mention fuel type"
        print("✅ Documents endpoint rejects invalid fuel_type")
    
    def test_documents_rejects_empty_latitude(self):
        """Test that documents endpoint rejects empty home_latitude"""
        docs_data = {
            "national_id": "12345678901",
            "personal_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "id_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "bike_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "fuel_type": "petrol",
            "home_address": "دمشق - المزة",
            "home_latitude": None,  # Empty - should be rejected
            "home_longitude": 36.2765,
            "home_city": "دمشق"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/delivery/documents",
            json=docs_data,
            headers=self.headers
        )
        
        # Should fail validation - either 400 or 422
        assert response.status_code in [400, 422], f"Expected 400/422 for empty latitude, got {response.status_code}"
        print("✅ Documents endpoint rejects empty home_latitude")
    
    def test_documents_rejects_empty_longitude(self):
        """Test that documents endpoint rejects empty home_longitude"""
        docs_data = {
            "national_id": "12345678901",
            "personal_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "id_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "bike_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "fuel_type": "electric",
            "home_address": "دمشق - المزة",
            "home_latitude": 33.5138,
            "home_longitude": None,  # Empty - should be rejected
            "home_city": "دمشق"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/delivery/documents",
            json=docs_data,
            headers=self.headers
        )
        
        # Should fail validation - either 400 or 422
        assert response.status_code in [400, 422], f"Expected 400/422 for empty longitude, got {response.status_code}"
        print("✅ Documents endpoint rejects empty home_longitude")


class TestDeliveryDocumentsAcceptsNewFields:
    """Test that POST /api/delivery/documents accepts new fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user - register a delivery driver"""
        self.test_phone = f"09{uuid.uuid4().hex[:8]}"
        self.test_password = os.getenv("TEST_USER_PASSWORD", "Test@123456")
        
        # Register a new delivery user
        register_data = {
            "full_name": "Test Driver Accept",
            "phone": self.test_phone,
            "password": self.test_password,
            "city": "حلب",
            "user_type": "delivery"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not create test delivery user")
    
    def test_documents_accepts_bike_photo_and_fuel_type(self):
        """Test that documents endpoint accepts bike_photo and fuel_type fields"""
        docs_data = {
            "national_id": "12345678901",
            "personal_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "id_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "bike_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "fuel_type": "petrol",
            "home_address": "حلب - الجميلية",
            "home_latitude": 36.2021,
            "home_longitude": 37.1343,
            "home_city": "حلب",
            "payment_account": {
                "type": "shamcash",
                "account_number": "0912345678",
                "holder_name": "Test Driver"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/delivery/documents",
            json=docs_data,
            headers=self.headers
        )
        
        # Should succeed with 200 or fail with 400 if documents already submitted
        if response.status_code == 400 and "مسبقاً" in response.json().get("detail", ""):
            print("⚠️ Documents already submitted for this user (expected in some cases)")
            return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ Documents endpoint accepts bike_photo and fuel_type fields")
    
    def test_documents_accepts_electric_fuel_type(self):
        """Test that documents endpoint accepts electric fuel_type"""
        # Create a new user for this test
        test_phone = f"09{uuid.uuid4().hex[:8]}"
        register_data = {
            "full_name": "Test Electric Driver",
            "phone": test_phone,
            "password": os.getenv("TEST_USER_PASSWORD", "Test@123456"),
            "city": "دمشق",
            "user_type": "delivery"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        if response.status_code != 200:
            pytest.skip("Could not create test user")
        
        token = response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        docs_data = {
            "national_id": "98765432101",
            "personal_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "id_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "bike_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "fuel_type": "electric",  # Electric fuel type
            "home_address": "دمشق - كفرسوسة",
            "home_latitude": 33.4963,
            "home_longitude": 36.2628,
            "home_city": "دمشق",
            "payment_account": {
                "type": "shamcash",
                "account_number": "0987654321",
                "holder_name": "Electric Driver"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/delivery/documents",
            json=docs_data,
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200 for electric fuel_type, got {response.status_code}: {response.text}"
        print("✅ Documents endpoint accepts electric fuel_type")


class TestDeliveryDocumentsStatus:
    """Test GET /api/delivery/documents/status endpoint"""
    
    def test_documents_status_returns_fuel_type(self):
        """Test that documents status returns fuel_type field"""
        # Create a new delivery user and submit documents
        test_phone = f"09{uuid.uuid4().hex[:8]}"
        register_data = {
            "full_name": "Test Status Driver",
            "phone": test_phone,
            "password": os.getenv("TEST_USER_PASSWORD", "Test@123456"),
            "city": "دمشق",
            "user_type": "delivery"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        if response.status_code != 200:
            pytest.skip("Could not create test user")
        
        token = response.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Submit documents
        docs_data = {
            "national_id": "11111111111",
            "personal_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "id_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "bike_photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "fuel_type": "petrol",
            "home_address": "دمشق - المالكي",
            "home_latitude": 33.5231,
            "home_longitude": 36.2876,
            "home_city": "دمشق",
            "payment_account": {
                "type": "shamcash",
                "account_number": "0911111111",
                "holder_name": "Status Driver"
            }
        }
        
        requests.post(f"{BASE_URL}/api/delivery/documents", json=docs_data, headers=headers)
        
        # Check status
        response = requests.get(f"{BASE_URL}/api/delivery/documents/status", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "status" in data, "Response should contain 'status'"
        
        # If documents were submitted, check for fuel_type
        if data.get("status") != "not_submitted":
            assert "fuel_type" in data, "Response should contain 'fuel_type' when documents submitted"
            print(f"✅ Documents status returns fuel_type: {data.get('fuel_type')}")
        else:
            print("⚠️ Documents not submitted yet")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
