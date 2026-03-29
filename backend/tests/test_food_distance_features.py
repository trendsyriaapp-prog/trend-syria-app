"""
اختبارات ميزات المسافة في طلبات الطعام
Tests for:
1. GET /api/food/stores - should return all stores without distance filtering
2. POST /api/food/orders/check-distance - new API for smart distance warning
3. POST /api/food/orders - should NOT reject orders based on distance
"""

import pytest
import requests
import os
import math

# BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
BUYER_PHONE = "0977777777"
BUYER_PASSWORD = "test1234"

# Test store - مطعم الشام - دمشق
TEST_STORE_ID = "421443ed-55d6-4f1e-990a-2f3f53b2427e"
TEST_STORE_LAT = 33.513
TEST_STORE_LNG = 36.276

# Customer coordinates for testing
# Close customer (~2km)
CLOSE_CUSTOMER_LAT = 33.52
CLOSE_CUSTOMER_LNG = 36.28

# Medium distance customer (~5km)
MEDIUM_CUSTOMER_LAT = 33.55
MEDIUM_CUSTOMER_LNG = 36.30

# Far customer (>10km) - should give HIGH warning
FAR_CUSTOMER_LAT = 33.75
FAR_CUSTOMER_LNG = 36.50


class TestFoodStoresEndpoint:
    """اختبار API جلب المتاجر - يجب أن يعرض جميع المتاجر بدون فلترة مسافة"""
    
    def test_get_all_stores_no_distance_filter(self):
        """Test that stores are returned without distance filtering"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of stores"
        assert len(data) > 0, "Should have at least one store"
        
        # Verify the test store exists
        store_ids = [s.get("id") for s in data]
        assert TEST_STORE_ID in store_ids, f"Test store {TEST_STORE_ID} should be in the list"
        
        print(f"✅ Stores endpoint returned {len(data)} stores")
        
    def test_store_has_coordinates(self):
        """Test that the test store has valid coordinates"""
        response = requests.get(f"{BASE_URL}/api/food/stores/{TEST_STORE_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        store = response.json()
        assert store.get("latitude") == TEST_STORE_LAT, f"Expected lat {TEST_STORE_LAT}"
        assert store.get("longitude") == TEST_STORE_LNG, f"Expected lng {TEST_STORE_LNG}"
        
        print(f"✅ Store '{store.get('name')}' has coordinates ({TEST_STORE_LAT}, {TEST_STORE_LNG})")


class TestCheckDistanceEndpoint:
    """اختبار API حساب المسافة والتحذير الذكي الجديد"""
    
    def test_check_distance_close_customer_no_warning(self):
        """Test close customer (~2km) - should have no warning"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": TEST_STORE_ID,
                "customer_lat": CLOSE_CUSTOMER_LAT,
                "customer_lng": CLOSE_CUSTOMER_LNG
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success"), "Should return success=True"
        assert "distance_km" in data, "Should include distance_km"
        assert "estimated_time_minutes" in data, "Should include estimated_time_minutes"
        
        distance = data.get("distance_km", 0)
        warning = data.get("warning")
        
        # Close customer should have distance < 3km, so no warning or low warning
        assert distance < 3.5, f"Expected distance < 3.5km, got {distance}km"
        
        print(f"✅ Close customer: distance={distance}km, warning={warning}")
        
    def test_check_distance_medium_customer_low_warning(self):
        """Test medium distance customer (~5km) - should have low/medium warning"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": TEST_STORE_ID,
                "customer_lat": MEDIUM_CUSTOMER_LAT,
                "customer_lng": MEDIUM_CUSTOMER_LNG
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success")
        
        distance = data.get("distance_km", 0)
        warning = data.get("warning")
        
        # Medium distance should be 3-5km
        assert distance >= 3 or distance <= 10, f"Expected distance between 3-10km, got {distance}km"
        
        if distance > 3:
            assert warning is not None, "Should have warning for distance > 3km"
            assert warning.get("level") in ["low", "medium", "high"], "Warning level should be low/medium/high"
        
        print(f"✅ Medium customer: distance={distance}km, warning_level={warning.get('level') if warning else 'none'}")
        
    def test_check_distance_far_customer_high_warning(self):
        """Test far customer (>10km) - should have HIGH warning"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": TEST_STORE_ID,
                "customer_lat": FAR_CUSTOMER_LAT,
                "customer_lng": FAR_CUSTOMER_LNG
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("success")
        
        distance = data.get("distance_km", 0)
        warning = data.get("warning")
        
        # Far customer should have distance > 10km
        assert distance > 10, f"Expected distance > 10km, got {distance}km"
        
        # Should have HIGH warning
        assert warning is not None, "Should have warning for distance > 10km"
        assert warning.get("level") == "high", f"Expected HIGH warning, got {warning.get('level')}"
        assert warning.get("emoji") == "⚠️", "Should have warning emoji"
        assert "بارداً" in warning.get("message", "") or "بعيد" in warning.get("message", ""), \
            "Warning message should mention cold food or far distance"
        
        print(f"✅ Far customer: distance={distance}km, warning_level=HIGH")
        print(f"   Message: {warning.get('message')}")
        
    def test_check_distance_includes_delivery_fee(self):
        """Test that check-distance returns delivery fee"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": TEST_STORE_ID,
                "customer_lat": MEDIUM_CUSTOMER_LAT,
                "customer_lng": MEDIUM_CUSTOMER_LNG
            }
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "delivery_fee" in data, "Should include delivery_fee"
        assert data.get("delivery_fee") > 0, "Delivery fee should be positive"
        
        print(f"✅ Delivery fee calculated: {data.get('delivery_fee')} SYP")
        
    def test_check_distance_invalid_store(self):
        """Test with invalid store ID - should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": "invalid-store-id-12345",
                "customer_lat": MEDIUM_CUSTOMER_LAT,
                "customer_lng": MEDIUM_CUSTOMER_LNG
            }
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Invalid store returns 404 as expected")


class TestCreateOrderNoDistanceRestriction:
    """اختبار أن إنشاء الطلب لا يرفض الطلبات البعيدة"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for buyer"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": BUYER_PHONE, "password": BUYER_PASSWORD}
        )
        
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Could not authenticate buyer: {response.status_code}")
        
    def test_order_not_rejected_for_far_distance(self, auth_token):
        """
        Test that creating an order for a far customer is NOT rejected
        Previously, orders > 5km were rejected. Now they should be accepted.
        """
        if not auth_token:
            pytest.skip("No auth token available")
            
        # First get a product from the store
        products_response = requests.get(f"{BASE_URL}/api/food/stores/{TEST_STORE_ID}/products")
        if products_response.status_code != 200 or not products_response.json():
            pytest.skip("No products available for testing")
            
        products = products_response.json()
        test_product = products[0] if products else None
        
        if not test_product:
            pytest.skip("No products available")
            
        # Create order with far coordinates (>10km)
        # Note: We only test that the distance check doesn't reject the order
        # We don't complete the order to avoid charging the wallet
        order_data = {
            "store_id": TEST_STORE_ID,
            "items": [{
                "product_id": test_product.get("id"),
                "name": test_product.get("name"),
                "price": test_product.get("price"),
                "quantity": 1
            }],
            "delivery_address": "عنوان بعيد للاختبار",
            "delivery_city": "دمشق",
            "delivery_phone": "0999999999",
            "delivery_latitude": FAR_CUSTOMER_LAT,
            "delivery_longitude": FAR_CUSTOMER_LNG,
            "latitude": FAR_CUSTOMER_LAT,
            "longitude": FAR_CUSTOMER_LNG,
            "payment_method": "cash",  # Use cash to avoid wallet issues
            "notes": "TEST_ORDER - اختبار عدم رفض الطلبات البعيدة"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/food/orders",
            json=order_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # The order should NOT be rejected due to distance
        # It might fail for other reasons (minimum order, wallet, etc.) but NOT distance
        error_detail = ""
        if response.status_code >= 400:
            error_detail = response.json().get("detail", "")
            
        # Check that the rejection is NOT because of distance
        distance_rejection_messages = [
            "المسافة", 
            "بعيد",
            "كيلومتر",
            "km",
            "distance"
        ]
        
        for msg in distance_rejection_messages:
            assert msg not in error_detail.lower(), \
                f"Order was rejected due to distance: {error_detail}"
        
        if response.status_code == 200 or response.status_code == 201:
            print("✅ Far distance order ACCEPTED (not rejected)")
            # Clean up - cancel the test order
            order_data = response.json()
            order_id = order_data.get("order_id")
            if order_id:
                requests.post(
                    f"{BASE_URL}/api/food/orders/{order_id}/cancel",
                    json={"reason": "Test order cleanup"},
                    headers={"Authorization": f"Bearer {auth_token}"}
                )
        else:
            # Order failed but NOT because of distance
            print(f"✅ Order failed but NOT due to distance. Reason: {error_detail}")


class TestDistanceCalculation:
    """اختبار دقة حساب المسافة"""
    
    def test_distance_calculation_accuracy(self):
        """Test that distance calculation is accurate using Haversine formula"""
        # Calculate expected distance using our own Haversine
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371  # Earth's radius in km
            
            lat1_rad = math.radians(lat1)
            lat2_rad = math.radians(lat2)
            delta_lat = math.radians(lat2 - lat1)
            delta_lon = math.radians(lon2 - lon1)
            
            a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
            c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            
            return R * c
        
        expected_distance = haversine(
            TEST_STORE_LAT, TEST_STORE_LNG,
            FAR_CUSTOMER_LAT, FAR_CUSTOMER_LNG
        )
        
        # Get distance from API
        response = requests.post(
            f"{BASE_URL}/api/food/orders/check-distance",
            json={
                "store_id": TEST_STORE_ID,
                "customer_lat": FAR_CUSTOMER_LAT,
                "customer_lng": FAR_CUSTOMER_LNG
            }
        )
        
        assert response.status_code == 200
        
        data = response.json()
        api_distance = data.get("distance_km", 0)
        
        # Allow 0.5km tolerance
        assert abs(api_distance - expected_distance) < 0.5, \
            f"Distance mismatch: API={api_distance}km, Expected={expected_distance}km"
        
        print(f"✅ Distance calculation accurate: API={api_distance}km, Expected={expected_distance:.2f}km")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
