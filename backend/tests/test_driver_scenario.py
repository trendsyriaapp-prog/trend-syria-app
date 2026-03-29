"""
Test Driver Scenario - Part 2 of 3
Tests the complete driver (delivery) workflow:
1. Driver registration
2. Admin approval
3. Driver login and permissions
4. Driver settings with mandatory home location
"""
import pytest
import requests
import os
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://shopper-suite.preview.emergentagent.com"

# Test credentials
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "Admin@123"

# Generate random phone for new driver
def generate_random_phone():
    return f"09{''.join(random.choices(string.digits, k=8))}"


class TestDriverScenario:
    """Complete driver workflow testing"""
    
    # Class-level storage for test data
    driver_phone = None
    driver_password = "Driver@123Test"
    driver_id = None
    driver_token = None
    admin_token = None
    
    @classmethod
    def setup_class(cls):
        """Generate random phone once for all tests"""
        cls.driver_phone = generate_random_phone()
        print(f"\n=== Test Driver Phone: {cls.driver_phone} ===")

    # ==================== 1. DRIVER REGISTRATION ====================
    
    def test_01_register_new_driver(self):
        """Test registering a new driver with user_type=delivery"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone": self.__class__.driver_phone,
            "password": self.__class__.driver_password,
            "full_name": "TEST_سائق اختباري جديد",
            "city": "دمشق",
            "user_type": "delivery",
            "emergency_phone": "0912345678"
        })
        
        print(f"Register Driver Response: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200, f"Failed to register driver: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["user_type"] == "delivery", "Wrong user_type"
        # New delivery users are NOT auto-approved
        assert not data["user"]["is_approved"], "New driver should NOT be approved initially"
        
        # Store driver ID for later tests
        self.__class__.driver_id = data["user"]["id"]
        self.__class__.driver_token = data["token"]
        print(f"Driver ID: {self.__class__.driver_id}")

    def test_02_duplicate_phone_rejected(self):
        """Test that duplicate phone registration is rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone": self.__class__.driver_phone,
            "password": "AnotherPassword@123",
            "full_name": "سائق مكرر",
            "city": "حلب",
            "user_type": "delivery"
        })
        
        assert response.status_code == 400, "Should reject duplicate phone"
        print("Duplicate phone correctly rejected")

    # ==================== 2. ADMIN LOGIN AND APPROVAL ====================
    
    def test_03_admin_login(self):
        """Test admin login to approve driver"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        
        print(f"Admin Login Response: {response.status_code}")
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in admin response"
        assert data["user"]["user_type"] == "admin", "Not admin user"
        
        self.__class__.admin_token = data["token"]
        print("Admin logged in successfully")

    def test_04_get_pending_drivers(self):
        """Test getting list of pending drivers"""
        headers = {"Authorization": f"Bearer {self.__class__.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/delivery/pending", headers=headers)
        
        print(f"Pending Drivers Response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get pending drivers: {response.text}"
        
        data = response.json()
        print(f"Pending drivers count: {len(data)}")
        # Note: This may be empty if no documents submitted yet
        # The driver exists but documents may not be submitted

    def test_05_get_all_drivers(self):
        """Test getting all delivery drivers"""
        headers = {"Authorization": f"Bearer {self.__class__.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/delivery/all", headers=headers)
        
        print(f"All Drivers Response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get all drivers: {response.text}"
        
        data = response.json()
        print(f"Total drivers: {len(data)}")
        
        # Find our test driver
        test_driver = next((d for d in data if d["id"] == self.__class__.driver_id), None)
        if test_driver:
            print(f"Found test driver: is_approved={test_driver.get('is_approved')}")

    def test_06_approve_driver(self):
        """Test admin approving the driver"""
        headers = {"Authorization": f"Bearer {self.__class__.admin_token}"}
        
        # First, we need to check if the driver has documents
        # If not, we'll directly approve via driver documents update
        
        response = requests.post(
            f"{BASE_URL}/api/admin/delivery/{self.__class__.driver_id}/approve",
            headers=headers
        )
        
        print(f"Approve Driver Response: {response.status_code}")
        print(f"Response: {response.json() if response.text else 'No content'}")
        
        # It may return 404 if no documents exist, which is expected
        # The approval endpoint requires documents to exist
        if response.status_code == 404:
            print("Note: No documents found for driver (expected for new registration)")
            # We need to create documents first
            # Let's use the driver's token to submit documents
            driver_headers = {"Authorization": f"Bearer {self.__class__.driver_token}"}
            doc_response = requests.post(
                f"{BASE_URL}/api/delivery/documents",
                headers=driver_headers,
                json={
                    "national_id": "12345678901",
                    "personal_photo": "https://example.com/photo.jpg",
                    "id_photo": "https://example.com/id.jpg",
                    "motorcycle_license": "SYR-123456"
                }
            )
            print(f"Submit Documents Response: {doc_response.status_code}")
            
            # Now try to approve again
            response = requests.post(
                f"{BASE_URL}/api/admin/delivery/{self.__class__.driver_id}/approve",
                headers=headers
            )
            print(f"Second Approve Attempt: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to approve driver: {response.text}"
        print("Driver approved successfully")

    # ==================== 3. DRIVER LOGIN AFTER APPROVAL ====================
    
    def test_07_driver_login_after_approval(self):
        """Test driver login after admin approval"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": self.__class__.driver_phone,
            "password": self.__class__.driver_password
        })
        
        print(f"Driver Login After Approval: {response.status_code}")
        
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        
        data = response.json()
        assert data["user"]["is_approved"], "Driver should be approved now"
        assert data["user"]["user_type"] == "delivery", "Wrong user type"
        
        # Update token
        self.__class__.driver_token = data["token"]
        print(f"Driver is_approved: {data['user']['is_approved']}")

    # ==================== 4. DRIVER SETTINGS TESTS ====================
    
    def test_08_get_driver_settings(self):
        """Test getting driver settings"""
        headers = {"Authorization": f"Bearer {self.__class__.driver_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/delivery/settings", headers=headers)
        
        print(f"Get Driver Settings Response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get driver settings: {response.text}"
        
        data = response.json()
        print(f"Current Settings: {data}")
        
        # Check expected fields exist
        assert "vehicle_type" in data, "Missing vehicle_type"
        assert "working_city" in data, "Missing working_city"

    def test_09_update_driver_settings_without_location(self):
        """Test updating driver settings (backend accepts without location)"""
        headers = {"Authorization": f"Bearer {self.__class__.driver_token}"}
        response = requests.put(
            f"{BASE_URL}/api/auth/delivery/settings",
            headers=headers,
            json={
                "vehicle_type": "motorcycle",
                "vehicle_number": "دمشق 123456",
                "working_city": "دمشق",
                "working_hours": "8 صباحاً - 8 مساءً"
            }
        )
        
        print(f"Update Settings Without Location: {response.status_code}")
        
        # Backend should accept this (location validation is on frontend)
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        print("Settings updated without location (frontend enforces location)")

    def test_10_update_driver_settings_with_location(self):
        """Test updating driver settings with home location (full update)"""
        headers = {"Authorization": f"Bearer {self.__class__.driver_token}"}
        response = requests.put(
            f"{BASE_URL}/api/auth/delivery/settings",
            headers=headers,
            json={
                "vehicle_type": "motorcycle",
                "vehicle_number": "دمشق 654321",
                "working_city": "دمشق",
                "working_hours": "9 صباحاً - 9 مساءً",
                "home_address": "شارع الثورة، دمشق",
                "home_latitude": 33.5138,
                "home_longitude": 36.2765
            }
        )
        
        print(f"Update Settings With Location: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to update settings with location: {response.text}"
        print("Settings updated with home location")

    def test_11_verify_settings_persistence(self):
        """Test that settings are correctly persisted"""
        headers = {"Authorization": f"Bearer {self.__class__.driver_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/delivery/settings", headers=headers)
        
        print(f"Verify Persistence Response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get settings: {response.text}"
        
        data = response.json()
        print(f"Persisted Settings: {data}")
        
        # Verify updates were saved
        assert data.get("vehicle_type") == "motorcycle", "vehicle_type not persisted"
        assert data.get("vehicle_number") == "دمشق 654321", "vehicle_number not persisted"
        assert data.get("working_city") == "دمشق", "working_city not persisted"

    # ==================== 5. DRIVER PAYMENT ACCOUNTS ====================
    
    def test_12_get_payment_accounts_empty(self):
        """Test getting empty payment accounts list"""
        headers = {"Authorization": f"Bearer {self.__class__.driver_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/delivery/payment-accounts", headers=headers)
        
        print(f"Get Payment Accounts: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get payment accounts: {response.text}"
        
        data = response.json()
        print(f"Payment accounts: {data}")
        assert isinstance(data, list), "Should return a list"

    def test_13_add_payment_account(self):
        """Test adding a payment account"""
        headers = {"Authorization": f"Bearer {self.__class__.driver_token}"}
        response = requests.post(
            f"{BASE_URL}/api/auth/delivery/payment-accounts",
            headers=headers,
            json={
                "type": "shamcash",
                "account_number": "0912345678",
                "holder_name": "TEST_سائق اختباري",
                "is_default": True
            }
        )
        
        print(f"Add Payment Account: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to add payment account: {response.text}"
        
        data = response.json()
        print(f"Added account: {data}")
        assert "id" in data, "No account ID returned"

    def test_14_verify_payment_account_added(self):
        """Test verifying payment account was added"""
        headers = {"Authorization": f"Bearer {self.__class__.driver_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/delivery/payment-accounts", headers=headers)
        
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 1, "Payment account should be added"
        
        account = data[0]
        assert account["type"] == "shamcash", "Wrong account type"
        assert account["is_default"], "Should be default"
        print(f"Payment account verified: {account}")

    # ==================== 6. DRIVER STATS AND AVAILABILITY ====================
    
    def test_15_get_driver_stats(self):
        """Test getting driver stats"""
        headers = {"Authorization": f"Bearer {self.__class__.driver_token}"}
        response = requests.get(f"{BASE_URL}/api/delivery/stats", headers=headers)
        
        print(f"Get Driver Stats: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        
        data = response.json()
        print(f"Driver Stats: {data}")
        assert "total_delivered" in data, "Missing total_delivered"
        assert "total_earnings" in data, "Missing total_earnings"

    def test_16_get_availability(self):
        """Test getting driver availability status"""
        headers = {"Authorization": f"Bearer {self.__class__.driver_token}"}
        response = requests.get(f"{BASE_URL}/api/delivery/availability", headers=headers)
        
        print(f"Get Availability: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get availability: {response.text}"
        
        data = response.json()
        print(f"Availability: {data}")
        assert "is_available" in data, "Missing is_available field"

    def test_17_set_availability(self):
        """Test setting driver availability"""
        headers = {"Authorization": f"Bearer {self.__class__.driver_token}"}
        response = requests.put(
            f"{BASE_URL}/api/delivery/availability",
            headers=headers,
            json={"is_available": True}
        )
        
        print(f"Set Availability: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to set availability: {response.text}"
        print("Driver set to available")

    # ==================== 7. UNAUTHORIZED ACCESS TESTS ====================
    
    def test_18_unauthorized_settings_access(self):
        """Test that settings require authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/delivery/settings")
        
        assert response.status_code == 401, "Should require authentication"
        print("Unauthorized access correctly blocked")

    def test_19_wrong_user_type_access(self):
        """Test that non-delivery user cannot access delivery settings"""
        # Use admin token (not a delivery user)
        headers = {"Authorization": f"Bearer {self.__class__.admin_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/delivery/settings", headers=headers)
        
        assert response.status_code == 403, "Should reject non-delivery users"
        print("Non-delivery user correctly rejected from delivery settings")

    def test_20_invalid_credentials_rejected(self):
        """Test that invalid credentials are rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": self.__class__.driver_phone,
            "password": "WrongPassword@123"
        })
        
        assert response.status_code == 401, "Should reject invalid password"
        print("Invalid credentials correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
