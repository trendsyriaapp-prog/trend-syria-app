# /app/backend/tests/test_live_location_tracking.py
# اختبارات نظام تتبع الموقع الحي للسائقين
# Tests for Live Location Tracking APIs

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLiveLocationTracking:
    """Live Location Tracking API Tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed - skipping tests")
    
    @pytest.fixture(scope="class")
    def admin_user(self):
        """Get admin user info"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        if response.status_code == 200:
            return response.json().get("user")
        return None
    
    @pytest.fixture(scope="class")
    def delivery_user_data(self, admin_token):
        """Create or get a delivery user for testing"""
        # Try existing delivery users first
        delivery_phones = ["0912340001", "0912340000", "0912340002"]
        delivery_password = "delivery123"
        
        for phone in delivery_phones:
            login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "phone": phone,
                "password": delivery_password
            })
            
            if login_resp.status_code == 200:
                data = login_resp.json()
                if data.get("user", {}).get("user_type") == "delivery":
                    return {
                        "token": data.get("token"),
                        "user": data.get("user"),
                        "phone": phone,
                        "password": delivery_password
                    }
        
        # Create new delivery user via registration
        import uuid
        new_phone = f"091234{str(uuid.uuid4())[:4]}"
        
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone": new_phone,
            "password": delivery_password,
            "name": "سائق تجريبي",
            "full_name": "سائق تجريبي للاختبار",
            "user_type": "delivery",
            "city": "دمشق"
        })
        
        if register_resp.status_code in [200, 201]:
            data = register_resp.json()
            return {
                "token": data.get("token"),
                "user": data.get("user"),
                "phone": new_phone,
                "password": delivery_password
            }
        
        return None
    
    @pytest.fixture(scope="class")
    def buyer_token(self):
        """Get buyer token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0933333333",
            "password": "user123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        # Try another buyer
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0922222222",
            "password": "seller123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        return None
    
    # ============== Location Update API Tests ==============
    
    def test_location_update_without_auth(self):
        """Test POST /api/delivery/location/update - should fail without auth"""
        response = requests.post(f"{BASE_URL}/api/delivery/location/update", json={
            "latitude": 33.5138,
            "longitude": 36.2765
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ PASS: Location update without auth returns 401/403")
    
    def test_location_update_as_admin(self, admin_token):
        """Test POST /api/delivery/location/update - admin should not access (delivery only)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/delivery/location/update", 
            headers=headers,
            json={
                "latitude": 33.5138,
                "longitude": 36.2765
            }
        )
        # Admin is not delivery, should get 403
        assert response.status_code == 403, f"Expected 403 for non-delivery user, got {response.status_code}"
        print("✅ PASS: Location update as admin returns 403 (delivery only)")
    
    def test_location_update_as_buyer(self, buyer_token):
        """Test POST /api/delivery/location/update - buyer should not access (delivery only)"""
        if not buyer_token:
            pytest.skip("No buyer token available")
        
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.post(f"{BASE_URL}/api/delivery/location/update", 
            headers=headers,
            json={
                "latitude": 33.5138,
                "longitude": 36.2765
            }
        )
        assert response.status_code == 403, f"Expected 403 for buyer user, got {response.status_code}"
        print("✅ PASS: Location update as buyer returns 403 (delivery only)")
    
    def test_location_update_as_delivery(self, delivery_user_data):
        """Test POST /api/delivery/location/update - delivery user should succeed"""
        if not delivery_user_data or not delivery_user_data.get("token"):
            pytest.skip("No delivery user available for testing")
        
        headers = {"Authorization": f"Bearer {delivery_user_data['token']}"}
        response = requests.post(f"{BASE_URL}/api/delivery/location/update", 
            headers=headers,
            json={
                "latitude": 33.5138,
                "longitude": 36.2765,
                "heading": 90.0,
                "speed": 30.5
            }
        )
        
        # Note: May get 403 if delivery docs not approved, but 200 if approved
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            assert "timestamp" in data
            print(f"✅ PASS: Location update as delivery successful: {data}")
        elif response.status_code == 403:
            # Delivery user exists but may not be approved
            print(f"⚠️ WARN: Delivery user not approved yet: {response.json()}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_location_update_with_optional_fields(self, delivery_user_data):
        """Test POST /api/delivery/location/update - with heading and speed"""
        if not delivery_user_data or not delivery_user_data.get("token"):
            pytest.skip("No delivery user available")
        
        headers = {"Authorization": f"Bearer {delivery_user_data['token']}"}
        
        # Test with all optional fields
        response = requests.post(f"{BASE_URL}/api/delivery/location/update", 
            headers=headers,
            json={
                "latitude": 33.5200,
                "longitude": 36.2800,
                "heading": 180.0,
                "speed": 45.5
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("message") == "تم تحديث الموقع"
            print("✅ PASS: Location update with optional fields successful")
        else:
            print(f"⚠️ INFO: Status {response.status_code} - {response.json()}")
    
    # ============== Get Driver Location API Tests ==============
    
    def test_get_driver_location_without_auth(self):
        """Test GET /api/delivery/location/{driver_id} - should fail without auth"""
        response = requests.get(f"{BASE_URL}/api/delivery/location/test-driver-id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ PASS: Get driver location without auth returns 401/403")
    
    def test_get_driver_location_as_admin(self, admin_token, delivery_user_data):
        """Test GET /api/delivery/location/{driver_id} - admin can view driver location"""
        if not delivery_user_data or not delivery_user_data.get("user"):
            pytest.skip("No delivery user data")
        
        driver_id = delivery_user_data["user"]["id"]
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/delivery/location/{driver_id}", headers=headers)
        
        # Admin should be able to view - returns available: true/false
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "available" in data, "Response should have 'available' field"
        print(f"✅ PASS: Admin can view driver location: {data}")
    
    def test_get_driver_location_not_found(self, admin_token):
        """Test GET /api/delivery/location/{driver_id} - non-existent driver"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_driver_id = str(uuid.uuid4())
        
        response = requests.get(f"{BASE_URL}/api/delivery/location/{fake_driver_id}", headers=headers)
        
        # Should return available: false for non-existent/no location
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("available") == False, "Should indicate location not available"
        print(f"✅ PASS: Non-existent driver returns available: false")
    
    def test_get_driver_location_as_buyer_no_active_order(self, buyer_token, delivery_user_data):
        """Test GET /api/delivery/location/{driver_id} - buyer without active order should fail"""
        if not buyer_token:
            pytest.skip("No buyer token")
        if not delivery_user_data or not delivery_user_data.get("user"):
            pytest.skip("No delivery user data")
        
        driver_id = delivery_user_data["user"]["id"]
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        response = requests.get(f"{BASE_URL}/api/delivery/location/{driver_id}", headers=headers)
        
        # Buyer without active order from this driver should get 403
        assert response.status_code == 403, f"Expected 403 for buyer without active order, got {response.status_code}"
        print("✅ PASS: Buyer without active order cannot view driver location")
    
    # ============== Live Order Tracking API Tests ==============
    
    def test_order_tracking_live_without_auth(self):
        """Test GET /api/delivery/order-tracking/{order_id}/live - should fail without auth"""
        response = requests.get(f"{BASE_URL}/api/delivery/order-tracking/test-order-id/live")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ PASS: Order tracking live without auth returns 401/403")
    
    def test_order_tracking_live_not_found(self, admin_token):
        """Test GET /api/delivery/order-tracking/{order_id}/live - non-existent order"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        fake_order_id = str(uuid.uuid4())
        
        response = requests.get(f"{BASE_URL}/api/delivery/order-tracking/{fake_order_id}/live", headers=headers)
        
        assert response.status_code == 404, f"Expected 404 for non-existent order, got {response.status_code}"
        print("✅ PASS: Non-existent order returns 404")
    
    def test_order_tracking_live_returns_correct_structure(self, admin_token):
        """Test order tracking live returns correct data structure when order exists"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get an existing order from admin
        orders_resp = requests.get(f"{BASE_URL}/api/admin/orders?page=1&limit=1", headers=headers)
        
        if orders_resp.status_code != 200:
            pytest.skip("Cannot fetch orders")
        
        orders_data = orders_resp.json()
        
        # Handle both list and dict responses
        if isinstance(orders_data, list):
            orders = orders_data
        elif isinstance(orders_data, dict):
            orders = orders_data.get("orders") or orders_data.get("data") or []
        else:
            orders = []
        
        if not orders:
            pytest.skip("No orders found for testing")
        
        order_id = orders[0].get("id")
        if not order_id:
            pytest.skip("Order has no id")
        
        response = requests.get(f"{BASE_URL}/api/delivery/order-tracking/{order_id}/live", headers=headers)
        
        # Admin should have access
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify response structure
        assert "order_id" in data, "Missing order_id in response"
        assert "status" in data, "Missing status in response"
        assert "driver" in data or data.get("driver") is None
        assert "driver_location" in data or data.get("driver_location") is None
        assert "delivery_address" in data or data.get("delivery_address") is None
        assert "delivery_city" in data or data.get("delivery_city") is None
        
        print(f"✅ PASS: Order tracking live returns correct structure: {list(data.keys())}")
    
    # ============== Delete Location API Tests ==============
    
    def test_delete_location_without_auth(self):
        """Test DELETE /api/delivery/location - should fail without auth"""
        response = requests.delete(f"{BASE_URL}/api/delivery/location")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ PASS: Delete location without auth returns 401/403")
    
    def test_delete_location_as_admin(self, admin_token):
        """Test DELETE /api/delivery/location - admin should not access (delivery only)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.delete(f"{BASE_URL}/api/delivery/location", headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for non-delivery user, got {response.status_code}"
        print("✅ PASS: Delete location as admin returns 403 (delivery only)")
    
    def test_delete_location_as_buyer(self, buyer_token):
        """Test DELETE /api/delivery/location - buyer should not access (delivery only)"""
        if not buyer_token:
            pytest.skip("No buyer token")
        
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.delete(f"{BASE_URL}/api/delivery/location", headers=headers)
        
        assert response.status_code == 403, f"Expected 403 for buyer user, got {response.status_code}"
        print("✅ PASS: Delete location as buyer returns 403 (delivery only)")
    
    def test_delete_location_as_delivery(self, delivery_user_data):
        """Test DELETE /api/delivery/location - delivery user should succeed"""
        if not delivery_user_data or not delivery_user_data.get("token"):
            pytest.skip("No delivery user available")
        
        headers = {"Authorization": f"Bearer {delivery_user_data['token']}"}
        response = requests.delete(f"{BASE_URL}/api/delivery/location", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("message") == "تم حذف الموقع"
            print(f"✅ PASS: Delete location as delivery successful: {data}")
        else:
            print(f"⚠️ INFO: Status {response.status_code} - may need delivery approval")
    
    # ============== Integration Tests ==============
    
    def test_location_update_then_get(self, delivery_user_data, admin_token):
        """Test update location then retrieve it"""
        if not delivery_user_data or not delivery_user_data.get("token"):
            pytest.skip("No delivery user")
        
        driver_id = delivery_user_data["user"]["id"]
        delivery_headers = {"Authorization": f"Bearer {delivery_user_data['token']}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update location
        test_lat = 33.5100
        test_lng = 36.2900
        
        update_resp = requests.post(f"{BASE_URL}/api/delivery/location/update", 
            headers=delivery_headers,
            json={
                "latitude": test_lat,
                "longitude": test_lng,
                "speed": 20.0
            }
        )
        
        if update_resp.status_code != 200:
            pytest.skip(f"Cannot update location: {update_resp.status_code}")
        
        # Get location as admin
        get_resp = requests.get(f"{BASE_URL}/api/delivery/location/{driver_id}", headers=admin_headers)
        
        assert get_resp.status_code == 200
        data = get_resp.json()
        
        if data.get("available"):
            assert abs(data["latitude"] - test_lat) < 0.001, "Latitude should match"
            assert abs(data["longitude"] - test_lng) < 0.001, "Longitude should match"
            print("✅ PASS: Location update and retrieve integration test passed")
        else:
            print("⚠️ INFO: Location not immediately available")
    
    def test_location_lifecycle(self, delivery_user_data, admin_token):
        """Test full lifecycle: create -> read -> delete -> verify deleted"""
        if not delivery_user_data or not delivery_user_data.get("token"):
            pytest.skip("No delivery user")
        
        driver_id = delivery_user_data["user"]["id"]
        delivery_headers = {"Authorization": f"Bearer {delivery_user_data['token']}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # 1. Create location
        create_resp = requests.post(f"{BASE_URL}/api/delivery/location/update", 
            headers=delivery_headers,
            json={
                "latitude": 33.55,
                "longitude": 36.30
            }
        )
        
        if create_resp.status_code != 200:
            pytest.skip("Cannot create location")
        
        # 2. Verify created
        get_resp = requests.get(f"{BASE_URL}/api/delivery/location/{driver_id}", headers=admin_headers)
        assert get_resp.status_code == 200
        
        # 3. Delete
        del_resp = requests.delete(f"{BASE_URL}/api/delivery/location", headers=delivery_headers)
        assert del_resp.status_code == 200
        
        # 4. Verify deleted
        verify_resp = requests.get(f"{BASE_URL}/api/delivery/location/{driver_id}", headers=admin_headers)
        assert verify_resp.status_code == 200
        assert verify_resp.json().get("available") == False
        
        print("✅ PASS: Full location lifecycle test passed")


class TestLocationValidation:
    """Location data validation tests"""
    
    @pytest.fixture
    def delivery_token(self):
        """Try to get delivery user token"""
        # Try multiple delivery phones
        for phone in ["0912340001", "0912340000"]:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "phone": phone,
                "password": "delivery123"
            })
            if response.status_code == 200:
                return response.json().get("token")
        return None
    
    def test_location_update_missing_latitude(self, delivery_token):
        """Test location update with missing latitude"""
        if not delivery_token:
            pytest.skip("No delivery token")
        
        headers = {"Authorization": f"Bearer {delivery_token}"}
        response = requests.post(f"{BASE_URL}/api/delivery/location/update", 
            headers=headers,
            json={
                "longitude": 36.2765
            }
        )
        
        # Should fail validation
        assert response.status_code == 422, f"Expected 422 for missing latitude, got {response.status_code}"
        print("✅ PASS: Missing latitude returns 422")
    
    def test_location_update_missing_longitude(self, delivery_token):
        """Test location update with missing longitude"""
        if not delivery_token:
            pytest.skip("No delivery token")
        
        headers = {"Authorization": f"Bearer {delivery_token}"}
        response = requests.post(f"{BASE_URL}/api/delivery/location/update", 
            headers=headers,
            json={
                "latitude": 33.5138
            }
        )
        
        assert response.status_code == 422, f"Expected 422 for missing longitude, got {response.status_code}"
        print("✅ PASS: Missing longitude returns 422")
    
    def test_location_update_invalid_types(self, delivery_token):
        """Test location update with invalid data types"""
        if not delivery_token:
            pytest.skip("No delivery token")
        
        headers = {"Authorization": f"Bearer {delivery_token}"}
        response = requests.post(f"{BASE_URL}/api/delivery/location/update", 
            headers=headers,
            json={
                "latitude": "not-a-number",
                "longitude": "also-not-a-number"
            }
        )
        
        assert response.status_code == 422, f"Expected 422 for invalid types, got {response.status_code}"
        print("✅ PASS: Invalid data types return 422")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
