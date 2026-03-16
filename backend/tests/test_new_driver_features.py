"""
Tests for new driver features (Jan 2026):
- GET /api/delivery/admin/all-drivers-locations - خريطة السائقين للمدير
- GET /api/analytics/drivers-performance - إحصائيات أداء السائقين  
- GET /api/settings/driver-shortage-alert - إعدادات إشعارات النقص
- PUT /api/settings/driver-shortage-alert - تحديث إعدادات النقص
- WebSocket /api/ws - التحديثات الفورية
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Credentials
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "admin123"
DRIVER_PHONE = "0900000000"
DRIVER_PASSWORD = "delivery123"

class TestNewDriverFeatures:
    """Test suite for new driver management features"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Driver login failed: {response.status_code} - {response.text}")
    
    # ============== All Drivers Locations Map API ==============
    
    def test_get_all_drivers_locations_as_admin(self, admin_token):
        """Admin can view all drivers locations on map"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/admin/all-drivers-locations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "drivers" in data, "Response should contain 'drivers' array"
        assert "stats" in data, "Response should contain 'stats' object"
        
        stats = data.get("stats", {})
        # Verify stats structure
        assert "total" in stats or stats == {}, "Stats should have 'total' or be empty"
        
        print(f"✅ All drivers locations API: {len(data['drivers'])} drivers found")
    
    def test_get_all_drivers_locations_with_city_filter(self, admin_token):
        """Admin can filter drivers by city"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/admin/all-drivers-locations?city=دمشق",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "drivers" in data
        print(f"✅ City filter works: {len(data['drivers'])} drivers in Damascus")
    
    def test_get_all_drivers_locations_available_only(self, admin_token):
        """Admin can filter available drivers only"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/admin/all-drivers-locations?available_only=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "drivers" in data
        
        # Verify all returned drivers are available (if any)
        for driver in data["drivers"]:
            if "is_available" in driver:
                assert driver["is_available"] == True, f"Driver {driver.get('id')} should be available"
        
        print(f"✅ Available only filter: {len(data['drivers'])} available drivers")
    
    def test_get_all_drivers_locations_unauthorized_for_driver(self, driver_token):
        """Driver should not access admin-only drivers map API"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/admin/all-drivers-locations",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}"
        print("✅ Drivers map API correctly blocks non-admin users")
    
    # ============== Drivers Performance API ==============
    
    def test_get_drivers_performance_as_admin(self, admin_token):
        """Admin can view drivers performance analytics"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/drivers-performance",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "drivers" in data, "Response should contain 'drivers' array"
        assert "summary" in data, "Response should contain 'summary' object"
        
        summary = data.get("summary", {})
        # Verify summary has expected fields
        expected_fields = ["total_drivers", "online_drivers", "available_drivers"]
        for field in expected_fields:
            if summary:  # Only check if summary is not empty
                assert field in summary or len(summary) == 0, f"Summary should contain '{field}'"
        
        print(f"✅ Drivers performance API: {len(data['drivers'])} drivers, summary: {summary}")
    
    def test_get_drivers_performance_with_period_filter(self, admin_token):
        """Admin can filter performance by period (day/week/month/all)"""
        for period in ["day", "week", "month", "all"]:
            response = requests.get(
                f"{BASE_URL}/api/analytics/drivers-performance?period={period}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Period {period} failed: {response.status_code}"
            
            data = response.json()
            assert data.get("period") == period, f"Response period should be {period}"
        
        print("✅ Drivers performance period filter works for all periods")
    
    def test_get_drivers_performance_with_sort(self, admin_token):
        """Admin can sort drivers by different metrics"""
        for sort_by in ["orders_count", "avg_time", "rating", "acceptance_rate", "earnings"]:
            response = requests.get(
                f"{BASE_URL}/api/analytics/drivers-performance?sort_by={sort_by}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Sort by {sort_by} failed: {response.status_code}"
        
        print("✅ Drivers performance sort options all work")
    
    def test_get_drivers_performance_unauthorized_for_driver(self, driver_token):
        """Driver should not access admin performance analytics"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/drivers-performance",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}"
        print("✅ Drivers performance API correctly blocks non-admin users")
    
    # ============== Driver Shortage Alert Settings ==============
    
    def test_get_driver_shortage_alert_settings(self, admin_token):
        """Admin can get driver shortage alert settings"""
        response = requests.get(
            f"{BASE_URL}/api/settings/driver-shortage-alert",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify default settings structure
        assert "enabled" in data, "Response should contain 'enabled' field"
        assert "min_available_drivers" in data, "Response should contain 'min_available_drivers'"
        assert "monitored_cities" in data, "Response should contain 'monitored_cities'"
        assert "cooldown_minutes" in data, "Response should contain 'cooldown_minutes'"
        
        print(f"✅ Driver shortage alert settings: enabled={data['enabled']}, min_drivers={data['min_available_drivers']}")
    
    def test_update_driver_shortage_alert_settings(self, admin_token):
        """Admin can update driver shortage alert settings"""
        # First get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/settings/driver-shortage-alert",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_settings = get_response.json()
        
        # Update settings
        new_settings = {
            "enabled": True,
            "min_available_drivers": 5,
            "monitored_cities": ["دمشق"],
            "cooldown_minutes": 45
        }
        
        response = requests.put(
            f"{BASE_URL}/api/settings/driver-shortage-alert",
            json=new_settings,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Update should return success=true"
        
        # Verify settings were updated
        verify_response = requests.get(
            f"{BASE_URL}/api/settings/driver-shortage-alert",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        verify_data = verify_response.json()
        assert verify_data.get("min_available_drivers") == 5, "min_available_drivers should be updated to 5"
        
        # Restore original settings
        restore_settings = {
            "enabled": original_settings.get("enabled", False),
            "min_available_drivers": original_settings.get("min_available_drivers", 3),
            "monitored_cities": original_settings.get("monitored_cities", []),
            "cooldown_minutes": original_settings.get("cooldown_minutes", 30)
        }
        requests.put(
            f"{BASE_URL}/api/settings/driver-shortage-alert",
            json=restore_settings,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print("✅ Driver shortage alert settings update works correctly")
    
    def test_get_cities_for_monitoring(self, admin_token):
        """Admin can get list of cities available for monitoring"""
        response = requests.get(
            f"{BASE_URL}/api/settings/driver-shortage-alert/cities",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "cities" in data, "Response should contain 'cities' array"
        
        # If cities exist, verify structure
        if data["cities"]:
            city_data = data["cities"][0]
            assert "city" in city_data, "City data should contain 'city' name"
            assert "total_drivers" in city_data, "City data should contain 'total_drivers'"
            assert "available_drivers" in city_data, "City data should contain 'available_drivers'"
        
        print(f"✅ Cities for monitoring: {len(data['cities'])} cities available")
    
    def test_driver_shortage_alert_unauthorized_for_driver(self, driver_token):
        """Driver should not access shortage alert settings"""
        response = requests.get(
            f"{BASE_URL}/api/settings/driver-shortage-alert",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403, f"Expected 403 Forbidden, got {response.status_code}"
        print("✅ Driver shortage alert API correctly blocks non-admin users")
    
    # ============== WebSocket Stats ==============
    
    def test_websocket_stats_endpoint(self, admin_token):
        """WebSocket stats endpoint returns connection info"""
        response = requests.get(
            f"{BASE_URL}/api/ws/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Note: This endpoint may not require auth as it's for stats
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "total_connections" in data, "Stats should contain 'total_connections'"
            print(f"✅ WebSocket stats: {data.get('total_connections', 0)} connections")
        else:
            print("⚠️ WebSocket stats endpoint requires authentication or is not accessible")


class TestWebSocketEndpoint:
    """Test WebSocket endpoint availability"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code}")
    
    def test_websocket_endpoint_exists(self, admin_token):
        """Verify WebSocket endpoint is properly configured"""
        # We can't test actual WebSocket connection with requests library
        # But we can verify the /api/ws/stats endpoint works
        response = requests.get(f"{BASE_URL}/api/ws/stats")
        
        # The endpoint should either return stats or require auth
        assert response.status_code in [200, 401, 403], f"WS endpoint issue: {response.status_code}"
        print("✅ WebSocket endpoint is configured")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
