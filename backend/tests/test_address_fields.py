"""
Test address_details and landmark fields in user addresses API
Tests for: POST /api/user/addresses, GET /api/user/addresses, PUT /api/user/addresses/{id}
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAddressFields:
    """Test new address_details and landmark fields in address API"""
    
    @pytest.fixture(scope="class")
    def buyer_token(self):
        """Login as buyer and get token"""
        # Try buyer credentials (0933333333 is the actual buyer)
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0933333333",
            "password": "buyer123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        # If buyer doesn't exist, try to register
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "Test Buyer",
            "phone": "0911111111",
            "password": "buyer123",
            "city": "دمشق",
            "user_type": "buyer"
        })
        if register_response.status_code in [200, 201]:
            # Login again
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "phone": "0911111111",
                "password": "buyer123"
            })
            if login_response.status_code == 200:
                return login_response.json().get("token")
        
        pytest.skip("Could not authenticate buyer - skipping address tests")
    
    @pytest.fixture
    def auth_headers(self, buyer_token):
        """Get auth headers with token"""
        return {
            "Authorization": f"Bearer {buyer_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_address_with_new_fields(self, auth_headers):
        """Test creating address with address_details and landmark fields"""
        unique_id = str(uuid.uuid4())[:8]
        address_data = {
            "title": f"TEST_منزل_{unique_id}",
            "city": "دمشق",
            "area": "المزة",
            "street_number": "15",
            "building_number": "3",
            "apartment_number": "5",
            "phone": "0911111111",
            "is_default": False,
            "latitude": 33.5138,
            "longitude": 36.2765,
            "address_details": "الطابق الثالث، الباب الأيسر، بجانب المصعد",
            "landmark": "قرب صيدلية الأمل"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/user/addresses",
            json=address_data,
            headers=auth_headers
        )
        
        print(f"Create address response: {response.status_code} - {response.text}")
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "id" in data, "Response should contain address id"
        assert "message" in data, "Response should contain success message"
        
        return data.get("id")
    
    def test_get_addresses_returns_new_fields(self, auth_headers):
        """Test that GET addresses returns address_details and landmark fields"""
        # First create an address with new fields
        unique_id = str(uuid.uuid4())[:8]
        address_data = {
            "title": f"TEST_عمل_{unique_id}",
            "city": "حلب",
            "area": "العزيزية",
            "street_number": "20",
            "building_number": "7",
            "apartment_number": "2",
            "phone": "0922222222",
            "is_default": False,
            "latitude": 36.2021,
            "longitude": 37.1343,
            "address_details": "مكتب رقم 205، الطابق الثاني، مبنى الأعمال",
            "landmark": "مقابل مسجد الرحمن"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/user/addresses",
            json=address_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200, f"Failed to create address: {create_response.text}"
        
        # Now get all addresses
        get_response = requests.get(
            f"{BASE_URL}/api/user/addresses",
            headers=auth_headers
        )
        
        print(f"Get addresses response: {get_response.status_code}")
        
        # Status assertion
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        
        # Data assertions
        addresses = get_response.json()
        assert isinstance(addresses, list), "Response should be a list"
        
        # Find our test address
        test_address = None
        for addr in addresses:
            if addr.get("title", "").startswith(f"TEST_عمل_{unique_id}"):
                test_address = addr
                break
        
        assert test_address is not None, "Test address not found in response"
        
        # Verify new fields are returned
        assert "address_details" in test_address, "address_details field should be in response"
        assert "landmark" in test_address, "landmark field should be in response"
        assert test_address["address_details"] == "مكتب رقم 205، الطابق الثاني، مبنى الأعمال", "address_details value mismatch"
        assert test_address["landmark"] == "مقابل مسجد الرحمن", "landmark value mismatch"
        
        print(f"✅ Address details: {test_address.get('address_details')}")
        print(f"✅ Landmark: {test_address.get('landmark')}")
    
    def test_update_address_with_new_fields(self, auth_headers):
        """Test updating address with address_details and landmark fields"""
        # First create an address
        unique_id = str(uuid.uuid4())[:8]
        address_data = {
            "title": f"TEST_تحديث_{unique_id}",
            "city": "حمص",
            "area": "الحمراء",
            "street_number": "10",
            "building_number": "5",
            "apartment_number": "1",
            "phone": "0933333333",
            "is_default": False,
            "latitude": 34.7324,
            "longitude": 36.7137,
            "address_details": "العنوان القديم",
            "landmark": "العلامة القديمة"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/user/addresses",
            json=address_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200, f"Failed to create address: {create_response.text}"
        address_id = create_response.json().get("id")
        
        # Update the address with new values
        updated_data = {
            "title": f"TEST_تحديث_{unique_id}",
            "city": "حمص",
            "area": "الحمراء",
            "street_number": "10",
            "building_number": "5",
            "apartment_number": "1",
            "phone": "0933333333",
            "is_default": False,
            "latitude": 34.7324,
            "longitude": 36.7137,
            "address_details": "العنوان الجديد المحدث - الطابق الرابع",
            "landmark": "قرب مطعم الشام الجديد"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/user/addresses/{address_id}",
            json=updated_data,
            headers=auth_headers
        )
        
        print(f"Update address response: {update_response.status_code} - {update_response.text}")
        
        # Status assertion
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        # Verify update by getting addresses
        get_response = requests.get(
            f"{BASE_URL}/api/user/addresses",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        addresses = get_response.json()
        updated_address = None
        for addr in addresses:
            if addr.get("id") == address_id:
                updated_address = addr
                break
        
        assert updated_address is not None, "Updated address not found"
        assert updated_address["address_details"] == "العنوان الجديد المحدث - الطابق الرابع", "address_details not updated"
        assert updated_address["landmark"] == "قرب مطعم الشام الجديد", "landmark not updated"
        
        print(f"✅ Updated address_details: {updated_address.get('address_details')}")
        print(f"✅ Updated landmark: {updated_address.get('landmark')}")
    
    def test_create_address_without_new_fields(self, auth_headers):
        """Test creating address without address_details and landmark (should work - optional fields)"""
        unique_id = str(uuid.uuid4())[:8]
        address_data = {
            "title": f"TEST_بدون_{unique_id}",
            "city": "اللاذقية",
            "area": "الصليبة",
            "street_number": "5",
            "building_number": "2",
            "apartment_number": "3",
            "phone": "0944444444",
            "is_default": False
            # No address_details or landmark
        }
        
        response = requests.post(
            f"{BASE_URL}/api/user/addresses",
            json=address_data,
            headers=auth_headers
        )
        
        print(f"Create address without new fields: {response.status_code}")
        
        # Should succeed - fields are optional
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the address was created
        data = response.json()
        assert "id" in data, "Response should contain address id"
    
    def test_address_fields_validation_length(self, auth_headers):
        """Test that address_details and landmark accept various lengths"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Test with minimum length (frontend requires 10 chars for address_details, 5 for landmark)
        address_data = {
            "title": f"TEST_طول_{unique_id}",
            "city": "طرطوس",
            "area": "المدينة",
            "street_number": "1",
            "building_number": "1",
            "apartment_number": "1",
            "phone": "0955555555",
            "is_default": False,
            "address_details": "1234567890",  # 10 chars minimum
            "landmark": "12345"  # 5 chars minimum
        }
        
        response = requests.post(
            f"{BASE_URL}/api/user/addresses",
            json=address_data,
            headers=auth_headers
        )
        
        print(f"Create address with min length fields: {response.status_code}")
        
        # Backend should accept these - validation is on frontend
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    @pytest.fixture(scope="class", autouse=True)
    def cleanup_test_addresses(self, buyer_token):
        """Cleanup test addresses after all tests"""
        yield
        
        if not buyer_token:
            return
            
        headers = {
            "Authorization": f"Bearer {buyer_token}",
            "Content-Type": "application/json"
        }
        
        try:
            # Get all addresses
            response = requests.get(f"{BASE_URL}/api/user/addresses", headers=headers)
            if response.status_code == 200:
                addresses = response.json()
                # Delete test addresses
                for addr in addresses:
                    if addr.get("title", "").startswith("TEST_"):
                        requests.delete(
                            f"{BASE_URL}/api/user/addresses/{addr['id']}",
                            headers=headers
                        )
                        print(f"Cleaned up test address: {addr['title']}")
        except Exception as e:
            print(f"Cleanup error: {e}")


class TestAddressAPIHealth:
    """Basic health checks for address API"""
    
    def test_addresses_endpoint_requires_auth(self):
        """Test that addresses endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/user/addresses")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
    
    def test_create_address_requires_auth(self):
        """Test that creating address requires authentication"""
        response = requests.post(f"{BASE_URL}/api/user/addresses", json={
            "title": "Test",
            "city": "دمشق",
            "area": "Test",
            "phone": "0911111111"
        })
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
