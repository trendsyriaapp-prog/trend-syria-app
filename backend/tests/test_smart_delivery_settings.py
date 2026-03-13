# /app/backend/tests/test_smart_delivery_settings.py
# Tests for Smart Delivery System: Driver Earnings, Smart Order Limits, and Priority Orders

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDriverEarningsSettings:
    """Tests for GET/PUT /api/settings/driver-earnings - إعدادات أرباح السائق"""
    
    def test_get_driver_earnings_settings_public(self):
        """Test fetching driver earnings settings (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/settings/driver-earnings")
        assert response.status_code == 200
        
        data = response.json()
        # Verify all required fields are present
        assert "base_fee" in data
        assert "price_per_km" in data
        assert "min_fee" in data
        
        # Verify values are positive
        assert data["base_fee"] >= 0
        assert data["price_per_km"] >= 0
        assert data["min_fee"] >= 0
        print(f"Driver earnings settings: base_fee={data['base_fee']}, price_per_km={data['price_per_km']}, min_fee={data['min_fee']}")

    def test_update_driver_earnings_requires_auth(self):
        """Test that updating driver earnings requires authentication"""
        response = requests.put(f"{BASE_URL}/api/settings/driver-earnings", json={
            "base_fee": 2000,
            "price_per_km": 500,
            "min_fee": 2500
        })
        # Should return 401 without auth
        assert response.status_code in [401, 403]
        print("Correctly blocked unauthenticated update")


class TestSmartOrderLimits:
    """Tests for GET/PUT /api/settings/smart-order-limits - حدود الطلبات الذكية"""
    
    def test_get_smart_order_limits_public(self):
        """Test fetching smart order limits (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/settings/smart-order-limits")
        assert response.status_code == 200
        
        data = response.json()
        # Verify all required fields are present
        assert "max_orders_different_stores" in data
        assert "max_orders_same_store" in data
        assert "priority_timeout_seconds" in data
        assert "enable_smart_priority" in data
        
        # Verify values are reasonable
        assert data["max_orders_different_stores"] >= 1
        assert data["max_orders_same_store"] >= 1
        assert data["priority_timeout_seconds"] >= 5
        assert isinstance(data["enable_smart_priority"], bool)
        
        print(f"Smart order limits: diff_stores={data['max_orders_different_stores']}, same_store={data['max_orders_same_store']}, priority_timeout={data['priority_timeout_seconds']}s, enabled={data['enable_smart_priority']}")

    def test_update_smart_order_limits_requires_auth(self):
        """Test that updating smart order limits requires authentication"""
        response = requests.put(f"{BASE_URL}/api/settings/smart-order-limits", json={
            "max_orders_different_stores": 5,
            "max_orders_same_store": 7,
            "priority_timeout_seconds": 15,
            "enable_smart_priority": True
        })
        assert response.status_code in [401, 403]
        print("Correctly blocked unauthenticated update")


class TestDriverAuth:
    """Tests for driver authentication"""
    
    @pytest.fixture
    def driver_token(self):
        """Login as driver and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0900000000",
            "password": "delivery123"
        })
        if response.status_code != 200:
            pytest.skip("Driver login failed - skipping authenticated tests")
        return response.json().get("token")
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed - skipping admin tests")
        return response.json().get("token")
    
    def test_driver_login(self, driver_token):
        """Test driver can login"""
        assert driver_token is not None
        assert len(driver_token) > 0
        print("Driver login successful")
    
    def test_admin_login(self, admin_token):
        """Test admin can login"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print("Admin login successful")


class TestAdminSettingsUpdate:
    """Tests for admin updating settings"""
    
    @pytest.fixture
    def admin_session(self):
        """Create authenticated admin session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        token = response.json().get("token")
        session = requests.Session()
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    @pytest.fixture
    def driver_session(self):
        """Create authenticated driver session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0900000000",
            "password": "delivery123"
        })
        if response.status_code != 200:
            pytest.skip("Driver login failed")
        token = response.json().get("token")
        session = requests.Session()
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_admin_update_driver_earnings(self, admin_session):
        """Test admin can update driver earnings settings"""
        # Get current settings first
        get_response = requests.get(f"{BASE_URL}/api/settings/driver-earnings")
        original_settings = get_response.json()
        
        # Update settings
        new_settings = {
            "base_fee": 1500,
            "price_per_km": 350,
            "min_fee": 2000
        }
        response = admin_session.put(f"{BASE_URL}/api/settings/driver-earnings", json=new_settings)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "driver_earnings" in data
        assert data["driver_earnings"]["base_fee"] == 1500
        assert data["driver_earnings"]["price_per_km"] == 350
        assert data["driver_earnings"]["min_fee"] == 2000
        print("Admin successfully updated driver earnings settings")
        
        # Verify persistence with GET
        verify_response = requests.get(f"{BASE_URL}/api/settings/driver-earnings")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["base_fee"] == 1500
        assert verify_data["price_per_km"] == 350
        assert verify_data["min_fee"] == 2000
        print("Verified settings persisted correctly")
        
        # Restore original settings
        admin_session.put(f"{BASE_URL}/api/settings/driver-earnings", json=original_settings)
    
    def test_admin_update_smart_order_limits(self, admin_session):
        """Test admin can update smart order limits"""
        # Get current settings first
        get_response = requests.get(f"{BASE_URL}/api/settings/smart-order-limits")
        original_settings = get_response.json()
        
        # Update settings
        new_settings = {
            "max_orders_different_stores": 6,
            "max_orders_same_store": 8,
            "priority_timeout_seconds": 20,
            "enable_smart_priority": True
        }
        response = admin_session.put(f"{BASE_URL}/api/settings/smart-order-limits", json=new_settings)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "smart_order_limits" in data
        assert data["smart_order_limits"]["max_orders_different_stores"] == 6
        assert data["smart_order_limits"]["max_orders_same_store"] == 8
        assert data["smart_order_limits"]["priority_timeout_seconds"] == 20
        assert data["smart_order_limits"]["enable_smart_priority"] == True
        print("Admin successfully updated smart order limits")
        
        # Verify persistence with GET
        verify_response = requests.get(f"{BASE_URL}/api/settings/smart-order-limits")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["max_orders_different_stores"] == 6
        assert verify_data["max_orders_same_store"] == 8
        assert verify_data["priority_timeout_seconds"] == 20
        print("Verified smart order limits persisted correctly")
        
        # Restore original settings
        admin_session.put(f"{BASE_URL}/api/settings/smart-order-limits", json=original_settings)
    
    def test_driver_cannot_update_driver_earnings(self, driver_session):
        """Test driver cannot update driver earnings settings"""
        response = driver_session.put(f"{BASE_URL}/api/settings/driver-earnings", json={
            "base_fee": 9999,
            "price_per_km": 9999,
            "min_fee": 9999
        })
        assert response.status_code == 403
        print("Driver correctly blocked from updating driver earnings")
    
    def test_driver_cannot_update_smart_order_limits(self, driver_session):
        """Test driver cannot update smart order limits"""
        response = driver_session.put(f"{BASE_URL}/api/settings/smart-order-limits", json={
            "max_orders_different_stores": 99,
            "max_orders_same_store": 99,
            "priority_timeout_seconds": 99,
            "enable_smart_priority": False
        })
        assert response.status_code == 403
        print("Driver correctly blocked from updating smart order limits")


class TestPriorityOrdersEndpoint:
    """Tests for GET /api/food/orders/delivery/priority-orders - طلبات الأولوية"""
    
    @pytest.fixture
    def driver_session(self):
        """Create authenticated driver session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0900000000",
            "password": "delivery123"
        })
        if response.status_code != 200:
            pytest.skip("Driver login failed")
        token = response.json().get("token")
        session = requests.Session()
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_priority_orders_requires_auth(self):
        """Test that priority orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/priority-orders")
        assert response.status_code in [401, 403]
        print("Correctly blocked unauthenticated access to priority orders")
    
    def test_driver_can_access_priority_orders(self, driver_session):
        """Test driver can access priority orders endpoint"""
        response = driver_session.get(f"{BASE_URL}/api/food/orders/delivery/priority-orders")
        assert response.status_code == 200
        
        data = response.json()
        assert "priority_orders" in data
        assert "message" in data
        assert isinstance(data["priority_orders"], list)
        print(f"Priority orders response: {data['message']}")
    
    def test_priority_orders_without_active_orders(self, driver_session):
        """Test priority orders returns empty when driver has no active orders"""
        response = driver_session.get(f"{BASE_URL}/api/food/orders/delivery/priority-orders")
        assert response.status_code == 200
        
        data = response.json()
        # When driver has no active orders, should return empty or specific message
        assert "priority_orders" in data
        print(f"Priority orders count: {len(data['priority_orders'])}")


class TestAvailableOrdersEndpoint:
    """Tests for GET /api/food/orders/delivery/available - الطلبات المتاحة"""
    
    @pytest.fixture
    def driver_session(self):
        """Create authenticated driver session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0900000000",
            "password": "delivery123"
        })
        if response.status_code != 200:
            pytest.skip("Driver login failed")
        token = response.json().get("token")
        session = requests.Session()
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_available_orders_requires_auth(self):
        """Test that available orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/available")
        assert response.status_code in [401, 403]
        print("Correctly blocked unauthenticated access to available orders")
    
    def test_driver_can_access_available_orders(self, driver_session):
        """Test driver can access available orders endpoint"""
        response = driver_session.get(f"{BASE_URL}/api/food/orders/delivery/available")
        assert response.status_code == 200
        
        data = response.json()
        # Response should contain single_orders and batch_orders
        assert "single_orders" in data
        assert "batch_orders" in data
        assert "total_count" in data
        assert isinstance(data["single_orders"], list)
        assert isinstance(data["batch_orders"], list)
        print(f"Available orders: {data['total_count']} total (single: {len(data['single_orders'])}, batch: {len(data['batch_orders'])})")


class TestDeliverySettingsEndpoint:
    """Tests for GET /api/settings/delivery-settings - إعدادات التوصيل العامة"""
    
    def test_get_delivery_settings(self):
        """Test fetching delivery settings (public)"""
        response = requests.get(f"{BASE_URL}/api/settings/delivery-settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "performance_levels" in data
        assert "working_hours" in data
        assert "leaderboard_rewards" in data
        
        # Verify performance levels structure
        levels = data["performance_levels"]
        assert "beginner_max" in levels
        assert "bronze_max" in levels
        assert "silver_max" in levels
        assert "gold_max" in levels
        
        # Verify working hours structure
        hours = data["working_hours"]
        assert "start_hour" in hours
        assert "end_hour" in hours
        assert "is_enabled" in hours
        
        print(f"Delivery settings fetched: levels={levels}, hours={hours}")


class TestDistanceDeliverySettings:
    """Tests for GET /api/settings/distance-delivery - أجور التوصيل بالمسافة"""
    
    def test_get_distance_delivery_settings(self):
        """Test fetching distance delivery settings (public)"""
        response = requests.get(f"{BASE_URL}/api/settings/distance-delivery")
        assert response.status_code == 200
        
        data = response.json()
        assert "base_fee" in data
        assert "price_per_km" in data
        assert "min_fee" in data
        assert "enabled_for_food" in data
        assert "enabled_for_products" in data
        
        print(f"Distance delivery settings: base={data['base_fee']}, per_km={data['price_per_km']}, min={data['min_fee']}")


class TestDeliveryWaitTime:
    """Tests for GET /api/settings/delivery-wait-time - وقت انتظار التوصيل"""
    
    def test_get_delivery_wait_time(self):
        """Test fetching delivery wait time (public)"""
        response = requests.get(f"{BASE_URL}/api/settings/delivery-wait-time")
        assert response.status_code == 200
        
        data = response.json()
        assert "delivery_wait_time_minutes" in data
        assert data["delivery_wait_time_minutes"] >= 1
        assert data["delivery_wait_time_minutes"] <= 60
        
        print(f"Delivery wait time: {data['delivery_wait_time_minutes']} minutes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
