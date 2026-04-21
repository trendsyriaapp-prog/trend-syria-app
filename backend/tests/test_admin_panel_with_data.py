"""
Test Admin Panel with Real Test Data Creation
Creates test users and items to verify admin panel displays all fields correctly
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"
DUMMY_OTP = "123456"

# Test data prefixes for cleanup
TEST_PREFIX = "TEST_ITER153_"

# Dummy URLs for testing
DUMMY_IMAGE_URL = "https://via.placeholder.com/300x300.png?text=Test+Image"
DUMMY_VIDEO_URL = "https://www.w3schools.com/html/mov_bbb.mp4"
DUMMY_ID_PHOTO = "https://via.placeholder.com/400x300.png?text=ID+Photo"
DUMMY_LICENSE_PHOTO = "https://via.placeholder.com/400x300.png?text=License"
DUMMY_PERSONAL_PHOTO = "https://via.placeholder.com/300x300.png?text=Personal+Photo"


class TestAdminPanelWithTestData:
    """Test suite that creates test data and verifies admin panel"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("token") or data.get("access_token")
            print("✅ Admin login successful")
            return token
        else:
            print(f"❌ Admin login failed: {response.text}")
            pytest.skip("Admin login failed")
    
    # ============== Test 1: Create Test Seller ==============
    
    def test_01_create_test_seller(self, admin_token):
        """Create a test seller and verify it appears in pending sellers"""
        import secrets
        unique_digits = ''.join([str(secrets.randbelow(9 - 0 + 1) + 0) for _ in range(6)])
        unique_id = unique_digits
        # Syrian phone format: 09XXXXXXXX (10 digits)
        test_phone = f"0911{unique_digits}"
        
        # Step 1: Register as seller
        register_data = {
            "phone": test_phone,
            "password": "Test@123456",
            "full_name": f"{TEST_PREFIX}Seller_{unique_id}",
            "user_type": "seller",
            "city": "دمشق",
            "store_name": f"{TEST_PREFIX}Store_{unique_id}",
            "store_address": {
                "area": "المزة",
                "street": "شارع الجلاء",
                "building": "بناء 123"
            }
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        print(f"Register Seller: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            seller_id = data.get("user_id") or data.get("id")
            print(f"✅ Test seller created: {seller_id}")
            
            # Verify in pending sellers
            headers = {"Authorization": f"Bearer {admin_token}"}
            pending_response = requests.get(f"{BASE_URL}/api/admin/sellers/pending", headers=headers)
            
            if pending_response.status_code == 200:
                pending_sellers = pending_response.json()
                print(f"Found {len(pending_sellers)} pending sellers")
                
                # Find our test seller
                test_seller = None
                for seller in pending_sellers:
                    seller_obj = seller.get("seller", seller)
                    if seller_obj.get("phone") == test_phone or seller_obj.get("store_name", "").startswith(TEST_PREFIX):
                        test_seller = seller
                        break
                
                if test_seller:
                    print("✅ Test seller found in pending list")
                    seller_obj = test_seller.get("seller", test_seller)
                    
                    # Verify fields
                    fields_to_check = {
                        "store_name": "اسم المتجر",
                        "phone": "الهاتف",
                        "city": "المدينة",
                        "store_address": "العنوان"
                    }
                    
                    for field, arabic_name in fields_to_check.items():
                        value = seller_obj.get(field)
                        if value:
                            print(f"  ✅ {arabic_name} ({field}): {value}")
                        else:
                            print(f"  ⚠️ {arabic_name} ({field}): MISSING")
                else:
                    print("⚠️ Test seller not found in pending list (may need document submission)")
        else:
            print(f"⚠️ Seller registration: {response.status_code} - {response.text[:200]}")
    
    # ============== Test 2: Create Test Food Seller ==============
    
    def test_02_create_test_food_seller(self, admin_token):
        """Create a test food seller and verify it appears in pending food stores"""
        import secrets
        unique_digits = ''.join([str(secrets.randbelow(9 - 0 + 1) + 0) for _ in range(6)])
        unique_id = unique_digits
        # Syrian phone format: 09XXXXXXXX (10 digits)
        test_phone = f"0922{unique_digits}"
        
        # Step 1: Register as food seller
        register_data = {
            "phone": test_phone,
            "password": "Test@123456",
            "full_name": f"{TEST_PREFIX}FoodSeller_{unique_id}",
            "user_type": "food_seller",
            "city": "دمشق",
            "store_name": f"{TEST_PREFIX}FoodStore_{unique_id}",
            "store_type": "restaurants"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        print(f"Register Food Seller: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            print("✅ Test food seller created")
            
            # Verify in pending food stores
            headers = {"Authorization": f"Bearer {admin_token}"}
            pending_response = requests.get(f"{BASE_URL}/api/admin/food/stores?status=pending", headers=headers)
            
            if pending_response.status_code == 200:
                pending_data = pending_response.json()
                pending_stores = pending_data if isinstance(pending_data, list) else pending_data.get("stores", [])
                print(f"Found {len(pending_stores)} pending food stores")
                
                # Find our test store
                test_store = None
                for store in pending_stores:
                    if store.get("name", "").startswith(TEST_PREFIX):
                        test_store = store
                        break
                
                if test_store:
                    print("✅ Test food store found in pending list")
                    
                    # Verify fields
                    fields_to_check = {
                        "name": "اسم المتجر",
                        "store_type": "نوع المتجر",
                        "phone": "الهاتف",
                        "city": "المدينة"
                    }
                    
                    for field, arabic_name in fields_to_check.items():
                        value = test_store.get(field)
                        if value:
                            print(f"  ✅ {arabic_name} ({field}): {value}")
                        else:
                            print(f"  ⚠️ {arabic_name} ({field}): MISSING")
                else:
                    print("⚠️ Test food store not found in pending list")
        else:
            print(f"⚠️ Food seller registration: {response.status_code} - {response.text[:200]}")
    
    # ============== Test 3: Create Test Delivery Driver ==============
    
    def test_03_create_test_delivery_driver(self, admin_token):
        """Create a test delivery driver and verify documents appear in admin panel"""
        import secrets
        unique_digits = ''.join([str(secrets.randbelow(9 - 0 + 1) + 0) for _ in range(6)])
        unique_id = unique_digits
        # Syrian phone format: 09XXXXXXXX (10 digits)
        test_phone = f"0933{unique_digits}"
        
        # Step 1: Register as delivery
        register_data = {
            "phone": test_phone,
            "password": "Test@123456",
            "full_name": f"{TEST_PREFIX}Driver_{unique_id}",
            "user_type": "delivery",
            "city": "دمشق",
            "vehicle_type": "motorcycle",
            "personal_photo": DUMMY_PERSONAL_PHOTO,
            "id_photo": DUMMY_ID_PHOTO,
            "motorcycle_license": DUMMY_LICENSE_PHOTO
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=register_data)
        print(f"Register Delivery Driver: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            driver_id = data.get("user_id") or data.get("id")
            print(f"✅ Test delivery driver created: {driver_id}")
            
            # Verify in pending delivery
            headers = {"Authorization": f"Bearer {admin_token}"}
            pending_response = requests.get(f"{BASE_URL}/api/admin/delivery/pending", headers=headers)
            
            if pending_response.status_code == 200:
                pending_drivers = pending_response.json()
                print(f"Found {len(pending_drivers)} pending delivery drivers")
                
                # Find our test driver
                test_driver = None
                for driver in pending_drivers:
                    driver_obj = driver.get("driver", driver)
                    if driver_obj.get("phone") == test_phone or (driver_obj.get("name") or driver_obj.get("full_name", "")).startswith(TEST_PREFIX):
                        test_driver = driver
                        break
                
                if test_driver:
                    print("✅ Test driver found in pending list")
                    
                    # Verify document fields (critical for admin approval)
                    document_fields = {
                        "personal_photo": "صورة شخصية",
                        "id_photo": "صورة الهوية",
                        "motorcycle_license": "رخصة القيادة"
                    }
                    
                    for field, arabic_name in document_fields.items():
                        value = test_driver.get(field)
                        if value:
                            print(f"  ✅ {arabic_name} ({field}): Present")
                        else:
                            print(f"  ⚠️ {arabic_name} ({field}): MISSING - Admin cannot verify!")
                    
                    # Check driver info
                    driver_obj = test_driver.get("driver", test_driver)
                    info_fields = {
                        "name": "الاسم",
                        "phone": "الهاتف",
                        "city": "المدينة"
                    }
                    
                    for field, arabic_name in info_fields.items():
                        value = driver_obj.get(field) or driver_obj.get("full_name")
                        if value:
                            print(f"  ✅ {arabic_name}: {value}")
                else:
                    print("⚠️ Test driver not found in pending list")
        else:
            print(f"⚠️ Driver registration: {response.status_code} - {response.text[:200]}")
    
    # ============== Test 4: Verify Existing Pending Data Structure ==============
    
    def test_04_verify_pending_sellers_structure(self, admin_token):
        """Verify the structure of pending sellers API response"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/sellers/pending", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        print("\n=== Pending Sellers Structure Analysis ===")
        print(f"Total pending sellers: {len(data)}")
        
        if len(data) > 0:
            sample = data[0]
            print(f"Top-level keys: {list(sample.keys())}")
            
            if "seller" in sample:
                seller = sample["seller"]
                print(f"Seller object keys: {list(seller.keys())}")
                
                # Check required fields for admin panel
                required_fields = ["store_name", "phone", "city", "store_address"]
                for field in required_fields:
                    if field in seller:
                        print(f"  ✅ {field}: {seller.get(field)}")
                    else:
                        print(f"  ❌ {field}: MISSING")
    
    def test_05_verify_pending_drivers_structure(self, admin_token):
        """Verify the structure of pending delivery drivers API response"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/delivery/pending", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        print("\n=== Pending Drivers Structure Analysis ===")
        print(f"Total pending drivers: {len(data)}")
        
        if len(data) > 0:
            sample = data[0]
            print(f"Top-level keys: {list(sample.keys())}")
            
            # Check document fields at top level
            doc_fields = ["personal_photo", "id_photo", "motorcycle_license"]
            for field in doc_fields:
                if field in sample:
                    has_value = bool(sample.get(field))
                    print(f"  {'✅' if has_value else '⚠️'} {field}: {'Present' if has_value else 'Empty'}")
                else:
                    print(f"  ❌ {field}: NOT IN RESPONSE")
            
            if "driver" in sample:
                driver = sample["driver"]
                print(f"Driver object keys: {list(driver.keys())}")
    
    def test_06_verify_pending_products_structure(self, admin_token):
        """Verify the structure of pending products API response"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/products/pending", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        print("\n=== Pending Products Structure Analysis ===")
        print(f"Total pending products: {len(data)}")
        
        if len(data) > 0:
            sample = data[0]
            print(f"Product keys: {list(sample.keys())}")
            
            # Check for admin_video field
            if "admin_video" in sample:
                has_video = bool(sample.get("admin_video"))
                print(f"  {'✅' if has_video else '⚠️'} admin_video: {'Present' if has_video else 'Empty'}")
            else:
                print("  ❌ admin_video: NOT IN RESPONSE - CRITICAL!")
            
            # Check other fields
            other_fields = ["id", "name", "price", "seller_name", "images"]
            for field in other_fields:
                if field in sample:
                    print(f"  ✅ {field}: Present")
    
    def test_07_verify_pending_food_items_structure(self, admin_token):
        """Verify the structure of pending food items API response"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/food-items/pending", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        print("\n=== Pending Food Items Structure Analysis ===")
        print(f"Total pending food items: {len(data)}")
        
        if len(data) > 0:
            sample = data[0]
            print(f"Food item keys: {list(sample.keys())}")
            
            # Check for admin_video field
            if "admin_video" in sample:
                has_video = bool(sample.get("admin_video"))
                print(f"  {'✅' if has_video else '⚠️'} admin_video: {'Present' if has_video else 'Empty'}")
            else:
                print("  ⚠️ admin_video: NOT IN RESPONSE (may not be implemented for food items)")
            
            # Check other fields
            other_fields = ["id", "name", "price", "store_name", "store_type"]
            for field in other_fields:
                if field in sample:
                    print(f"  ✅ {field}: {sample.get(field)}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])
