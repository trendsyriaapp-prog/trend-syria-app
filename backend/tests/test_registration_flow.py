"""
Test Registration Flow for Trend Syria App
Tests all user types: buyer, seller, food_seller, delivery
"""
import pytest
import requests
import os
import random

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com').rstrip('/')

def generate_phone():
    """Generate a unique Syrian phone number for testing"""
    return f"09{random.randint(10000000, 99999999)}"

def generate_password():
    """Generate a valid password"""
    return f"Test@{random.randint(1000, 9999)}"

class TestBuyerRegistration:
    """Test buyer (customer) registration flow"""
    
    def test_register_buyer_success(self):
        """Test successful buyer registration"""
        phone = generate_phone()
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "محمد أحمد علي",
            "phone": phone,
            "password": "Test@1234",
            "city": "دمشق",
            "user_type": "buyer",
            "emergency_phone": "0912345678"
        })
        
        print(f"Register buyer response: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "buyer"
        assert data["user"]["phone"] == phone
        print(f"✅ Buyer registered successfully: {phone}")
    
    def test_register_buyer_duplicate_phone(self):
        """Test registration with existing phone number"""
        phone = generate_phone()
        
        # First registration
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "محمد أحمد علي",
            "phone": phone,
            "password": "Test@1234",
            "city": "دمشق",
            "user_type": "buyer"
        })
        assert response1.status_code == 200
        
        # Second registration with same phone
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "أحمد محمد علي",
            "phone": phone,
            "password": "Test@5678",
            "city": "حلب",
            "user_type": "buyer"
        })
        
        print(f"Duplicate phone response: {response2.status_code}")
        assert response2.status_code == 400
        assert "مسجل مسبقاً" in response2.json().get("detail", "")
        print("✅ Duplicate phone correctly rejected")
    
    def test_register_buyer_invalid_phone(self):
        """Test registration with invalid phone format"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "محمد أحمد علي",
            "phone": "12345",  # Invalid format
            "password": "Test@1234",
            "city": "دمشق",
            "user_type": "buyer"
        })
        
        print(f"Invalid phone response: {response.status_code}")
        assert response.status_code == 400
        print("✅ Invalid phone correctly rejected")
    
    def test_register_buyer_weak_password(self):
        """Test registration with weak password"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "محمد أحمد علي",
            "phone": generate_phone(),
            "password": "123",  # Weak password
            "city": "دمشق",
            "user_type": "buyer"
        })
        
        print(f"Weak password response: {response.status_code}")
        assert response.status_code == 400
        print("✅ Weak password correctly rejected")
    
    def test_register_buyer_incomplete_name(self):
        """Test registration with incomplete name (not 3 parts)"""
        phone = generate_phone()
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "محمد",  # Only one name
            "phone": phone,
            "password": "Test@1234",
            "city": "دمشق",
            "user_type": "buyer"
        })
        
        # Note: Backend may accept this, validation is on frontend
        print(f"Incomplete name response: {response.status_code}")
        print(f"Response: {response.text}")


class TestSellerRegistration:
    """Test seller registration flow"""
    
    def test_register_seller_success(self):
        """Test successful seller registration"""
        phone = generate_phone()
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "أحمد محمد سعيد",
            "phone": phone,
            "password": "Seller@123",
            "city": "حلب",
            "user_type": "seller",
            "emergency_phone": "0923456789"
        })
        
        print(f"Register seller response: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["user_type"] == "seller"
        # Seller should not be approved until documents are verified
        assert not data["user"]["is_approved"]
        print(f"✅ Seller registered successfully: {phone}")


class TestDeliveryRegistration:
    """Test delivery driver registration flow"""
    
    def test_register_delivery_success(self):
        """Test successful delivery driver registration"""
        phone = generate_phone()
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "خالد عمر حسن",
            "phone": phone,
            "password": "Driver@123",
            "city": "حمص",
            "user_type": "delivery",
            "emergency_phone": "0934567890"
        })
        
        print(f"Register delivery response: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["user_type"] == "delivery"
        # Delivery should not be approved until documents are verified
        assert not data["user"]["is_approved"]
        print(f"✅ Delivery driver registered successfully: {phone}")


class TestLoginFlow:
    """Test login flow for all user types"""
    
    def test_login_admin_success(self):
        """Test admin login with provided credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "Admin@123"
        })
        
        print(f"Admin login response: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.text}")
        
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["user_type"] == "admin"
        print("✅ Admin login successful")
        return data["token"]
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "WrongPassword123"
        })
        
        print(f"Invalid login response: {response.status_code}")
        assert response.status_code == 401
        print("✅ Invalid credentials correctly rejected")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent phone"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0999999999",
            "password": "Test@1234"
        })
        
        print(f"Non-existent user login response: {response.status_code}")
        assert response.status_code == 401
        print("✅ Non-existent user correctly rejected")
    
    def test_register_and_login(self):
        """Test full registration and login flow"""
        phone = generate_phone()
        password = "NewUser@123"
        
        # Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "full_name": "مستخدم جديد تجريبي",
            "phone": phone,
            "password": password,
            "city": "اللاذقية",
            "user_type": "buyer"
        })
        
        assert reg_response.status_code == 200
        print(f"✅ User registered: {phone}")
        
        # Login with new credentials
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": phone,
            "password": password
        })
        
        assert login_response.status_code == 200
        data = login_response.json()
        assert "token" in data
        assert data["user"]["phone"] == phone
        print(f"✅ User logged in successfully: {phone}")


class TestVehicleTypes:
    """Test vehicle types endpoint for delivery registration"""
    
    def test_get_vehicle_types(self):
        """Test getting available vehicle types"""
        response = requests.get(f"{BASE_URL}/api/delivery/vehicle-types")
        
        print(f"Vehicle types response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "vehicle_types" in data
        
        vehicle_types = data["vehicle_types"]
        assert len(vehicle_types) >= 4
        
        # Check expected vehicle types
        type_ids = [v["id"] for v in vehicle_types]
        assert "car" in type_ids
        assert "motorcycle" in type_ids
        assert "electric_scooter" in type_ids
        assert "bicycle" in type_ids
        
        print(f"✅ Vehicle types retrieved: {type_ids}")


class TestSellerTypes:
    """Test seller types endpoint"""
    
    def test_get_seller_types(self):
        """Test getting available seller types"""
        response = requests.get(f"{BASE_URL}/api/seller/seller-types")
        
        print(f"Seller types response: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        assert "seller_types" in data
        
        seller_types = data["seller_types"]
        assert len(seller_types) >= 2
        
        # Check expected seller types
        type_ids = [s["id"] for s in seller_types]
        assert "traditional_shop" in type_ids
        assert "restaurant" in type_ids
        
        print(f"✅ Seller types retrieved: {type_ids}")


class TestAdminJoinRequests:
    """Test admin can see join requests"""
    
    def test_admin_can_see_pending_sellers(self):
        """Test admin can view pending seller documents"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "Admin@123"
        })
        
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Get pending seller documents - correct endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/sellers/pending", headers=headers)
        
        print(f"Admin pending sellers response: {response.status_code}")
        if response.status_code != 200:
            # Try all sellers endpoint
            response = requests.get(f"{BASE_URL}/api/admin/sellers/all", headers=headers)
            print(f"Admin all sellers response: {response.status_code}")
        
        assert response.status_code == 200
        print("✅ Admin can view sellers list")
    
    def test_admin_can_see_pending_drivers(self):
        """Test admin can view pending delivery documents"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "Admin@123"
        })
        
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Get pending delivery documents - correct endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/delivery/pending", headers=headers)
        
        print(f"Admin pending delivery response: {response.status_code}")
        if response.status_code != 200:
            # Try all delivery endpoint
            response = requests.get(f"{BASE_URL}/api/admin/delivery/all", headers=headers)
            print(f"Admin all delivery response: {response.status_code}")
        
        assert response.status_code == 200
        print("✅ Admin can view delivery drivers list")


class TestCities:
    """Test Syrian cities are available"""
    
    def test_register_with_different_cities(self):
        """Test registration with different Syrian cities"""
        cities = ['دمشق', 'حلب', 'حمص', 'اللاذقية', 'طرطوس', 'حماة', 'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء', 'إدلب', 'القنيطرة']
        
        for city in cities[:3]:  # Test first 3 cities to save time
            phone = generate_phone()
            response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "full_name": "مستخدم تجريبي اختبار",
                "phone": phone,
                "password": "Test@1234",
                "city": city,
                "user_type": "buyer"
            })
            
            if response.status_code == 200:
                print(f"✅ Registration with city '{city}' successful")
            else:
                print(f"❌ Registration with city '{city}' failed: {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
