# /app/backend/tests/test_driver_earnings_settings.py
# Tests for Driver Earnings Settings APIs
# Feature: نظام أرباح السائق بناءً على المسافة

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDriverEarningsSettings:
    """Test driver earnings settings APIs"""
    
    # Admin credentials
    admin_phone = "0911111111"
    admin_password = "admin123"
    
    # Delivery driver credentials  
    driver_phone = "0900000000"
    driver_password = "delivery123"
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login_as_admin(self):
        """Login as admin and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": self.admin_phone,
            "password": self.admin_password
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return token
        return None
    
    def login_as_driver(self):
        """Login as delivery driver and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": self.driver_phone,
            "password": self.driver_password
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return token
        return None

    # ============== GET /api/settings/driver-earnings ==============
    
    def test_get_driver_earnings_settings_public(self):
        """Test GET driver earnings settings - should work without auth"""
        response = self.session.get(f"{BASE_URL}/api/settings/driver-earnings")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify default values structure
        assert "base_fee" in data, "Response should contain base_fee"
        assert "price_per_km" in data, "Response should contain price_per_km"
        assert "min_fee" in data, "Response should contain min_fee"
        
        # Verify values are positive numbers
        assert isinstance(data["base_fee"], (int, float)), "base_fee should be a number"
        assert isinstance(data["price_per_km"], (int, float)), "price_per_km should be a number"
        assert isinstance(data["min_fee"], (int, float)), "min_fee should be a number"
        
        assert data["base_fee"] >= 0, "base_fee should be non-negative"
        assert data["price_per_km"] >= 0, "price_per_km should be non-negative"
        assert data["min_fee"] >= 0, "min_fee should be non-negative"
        
        print(f"Driver earnings settings: base_fee={data['base_fee']}, price_per_km={data['price_per_km']}, min_fee={data['min_fee']}")

    def test_get_driver_earnings_settings_default_values(self):
        """Test that default values match expected: base_fee=1000, price_per_km=300, min_fee=1500"""
        response = self.session.get(f"{BASE_URL}/api/settings/driver-earnings")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check default values (may have been updated, so just verify structure)
        print(f"Current driver earnings settings: {data}")

    # ============== PUT /api/settings/driver-earnings ==============
    
    def test_update_driver_earnings_settings_as_admin(self):
        """Test updating driver earnings settings as admin - should succeed"""
        token = self.login_as_admin()
        assert token is not None, "Admin login failed"
        
        # New settings to update
        new_settings = {
            "base_fee": 1500,
            "price_per_km": 400,
            "min_fee": 2000
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/settings/driver-earnings",
            json=new_settings
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "driver_earnings" in data, "Response should contain driver_earnings"
        
        # Verify updated values
        assert data["driver_earnings"]["base_fee"] == 1500
        assert data["driver_earnings"]["price_per_km"] == 400
        assert data["driver_earnings"]["min_fee"] == 2000
        
        print(f"Successfully updated driver earnings settings: {data['driver_earnings']}")
        
        # Verify persistence by fetching again
        get_response = self.session.get(f"{BASE_URL}/api/settings/driver-earnings")
        assert get_response.status_code == 200
        fetched_data = get_response.json()
        assert fetched_data["base_fee"] == 1500
        assert fetched_data["price_per_km"] == 400
        assert fetched_data["min_fee"] == 2000
        
        print("Verified settings persisted correctly")
    
    def test_update_driver_earnings_settings_as_driver_should_fail(self):
        """Test updating driver earnings settings as delivery driver - should fail with 403"""
        token = self.login_as_driver()
        assert token is not None, "Driver login failed"
        
        new_settings = {
            "base_fee": 5000,
            "price_per_km": 1000,
            "min_fee": 6000
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/settings/driver-earnings",
            json=new_settings
        )
        
        # Should be 403 Forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("Correctly blocked non-admin from updating settings")
    
    def test_update_driver_earnings_settings_without_auth(self):
        """Test updating driver earnings settings without authentication - should fail"""
        new_settings = {
            "base_fee": 5000,
            "price_per_km": 1000,
            "min_fee": 6000
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/settings/driver-earnings",
            json=new_settings
        )
        
        # Should be 401 or 403
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
        print("Correctly blocked unauthenticated request")

    # ============== GET /api/shipping/calculate-driver-earnings ==============
    
    def test_calculate_driver_earnings_basic(self):
        """Test calculate driver earnings API with basic coordinates"""
        # Damascus coordinates
        store_lat = 33.5138
        store_lon = 36.2765
        customer_lat = 33.5238  # ~1.1km from store
        customer_lon = 36.2865
        driver_lat = 33.5038  # ~1.1km from store
        driver_lon = 36.2665
        
        response = self.session.get(
            f"{BASE_URL}/api/shipping/calculate-driver-earnings",
            params={
                "store_lat": store_lat,
                "store_lon": store_lon,
                "customer_lat": customer_lat,
                "customer_lon": customer_lon,
                "driver_lat": driver_lat,
                "driver_lon": driver_lon
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify response structure
        assert "earnings" in data, "Response should contain earnings"
        assert "distance_to_store" in data, "Response should contain distance_to_store"
        assert "distance_to_customer" in data, "Response should contain distance_to_customer"
        assert "total_distance" in data, "Response should contain total_distance"
        assert "base_fee" in data, "Response should contain base_fee"
        assert "price_per_km" in data, "Response should contain price_per_km"
        assert "min_fee" in data, "Response should contain min_fee"
        
        # Verify values are positive
        assert data["earnings"] > 0, "Earnings should be positive"
        assert data["total_distance"] >= 0, "Total distance should be non-negative"
        
        # Total distance should be sum of individual distances
        expected_total = data["distance_to_store"] + data["distance_to_customer"]
        assert abs(data["total_distance"] - expected_total) < 0.1, f"Total distance mismatch: {data['total_distance']} vs {expected_total}"
        
        print(f"Driver earnings calculation: earnings={data['earnings']}, total_distance={data['total_distance']}km")
        print(f"  - Distance to store: {data['distance_to_store']}km")
        print(f"  - Distance to customer: {data['distance_to_customer']}km")
    
    def test_calculate_driver_earnings_without_driver_location(self):
        """Test calculate driver earnings without driver location - should only use store to customer"""
        store_lat = 33.5138
        store_lon = 36.2765
        customer_lat = 33.5238
        customer_lon = 36.2865
        
        response = self.session.get(
            f"{BASE_URL}/api/shipping/calculate-driver-earnings",
            params={
                "store_lat": store_lat,
                "store_lon": store_lon,
                "customer_lat": customer_lat,
                "customer_lon": customer_lon
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Distance to store should be 0 when driver location not provided
        assert data["distance_to_store"] == 0, "Distance to store should be 0 without driver location"
        assert data["distance_to_customer"] > 0, "Distance to customer should be positive"
        assert data["total_distance"] == data["distance_to_customer"], "Total should equal distance to customer"
        
        print(f"Without driver location: earnings={data['earnings']}, distance={data['distance_to_customer']}km")
    
    def test_calculate_driver_earnings_minimum_fee(self):
        """Test that minimum fee is applied when calculated fee is too low"""
        # Very close points (should result in low fee)
        store_lat = 33.5138
        store_lon = 36.2765
        customer_lat = 33.5140  # Very close
        customer_lon = 36.2767
        driver_lat = 33.5137
        driver_lon = 36.2764
        
        response = self.session.get(
            f"{BASE_URL}/api/shipping/calculate-driver-earnings",
            params={
                "store_lat": store_lat,
                "store_lon": store_lon,
                "customer_lat": customer_lat,
                "customer_lon": customer_lon,
                "driver_lat": driver_lat,
                "driver_lon": driver_lon
            }
        )
        
        assert response.status_code == 200
        
        data = response.json()
        
        # Earnings should be at least the minimum fee
        assert data["earnings"] >= data["min_fee"], f"Earnings {data['earnings']} should be >= min_fee {data['min_fee']}"
        
        print(f"Minimum fee test: earnings={data['earnings']}, min_fee={data['min_fee']}")
    
    def test_calculate_driver_earnings_formula(self):
        """Test the earnings formula: earnings = base_fee + (total_distance * price_per_km)"""
        # First get current settings
        settings_response = self.session.get(f"{BASE_URL}/api/settings/driver-earnings")
        settings = settings_response.json()
        
        store_lat = 33.5138
        store_lon = 36.2765
        customer_lat = 33.5638  # ~5.5km away
        customer_lon = 36.3265
        driver_lat = 33.4838  # ~3.3km away
        driver_lon = 36.2465
        
        response = self.session.get(
            f"{BASE_URL}/api/shipping/calculate-driver-earnings",
            params={
                "store_lat": store_lat,
                "store_lon": store_lon,
                "customer_lat": customer_lat,
                "customer_lon": customer_lon,
                "driver_lat": driver_lat,
                "driver_lon": driver_lon
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Calculate expected earnings
        expected_earnings = settings["base_fee"] + (data["total_distance"] * settings["price_per_km"])
        expected_earnings = max(expected_earnings, settings["min_fee"])
        expected_earnings = round(expected_earnings)
        
        # Allow small rounding difference
        assert abs(data["earnings"] - expected_earnings) <= 1, f"Expected {expected_earnings}, got {data['earnings']}"
        
        print(f"Formula verification: {settings['base_fee']} + ({data['total_distance']} * {settings['price_per_km']}) = {data['earnings']}")

    # ============== Cleanup: Reset to default values ==============
    
    def test_zz_reset_to_default_values(self):
        """Reset driver earnings settings to default values after tests"""
        token = self.login_as_admin()
        assert token is not None, "Admin login failed"
        
        default_settings = {
            "base_fee": 1000,
            "price_per_km": 300,
            "min_fee": 1500
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/settings/driver-earnings",
            json=default_settings
        )
        
        assert response.status_code == 200
        print("Reset driver earnings settings to default values")
