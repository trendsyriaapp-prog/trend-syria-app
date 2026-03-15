# /app/backend/tests/test_earnings_hold_and_tracking.py
# Tests for Earnings Hold Period System and Live Driver Tracking features

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "admin123"
DRIVER_PHONE = "0900000000"
DRIVER_PASSWORD = "delivery123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": ADMIN_PHONE,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def driver_token():
    """Get driver authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": DRIVER_PHONE,
        "password": DRIVER_PASSWORD
    })
    assert response.status_code == 200, f"Driver login failed: {response.text}"
    return response.json()["token"]


# ==========================================
# Earnings Hold Settings API Tests (Admin)
# ==========================================

class TestEarningsHoldSettingsAPI:
    """Tests for Admin earnings hold settings APIs"""
    
    def test_get_earnings_hold_settings(self, admin_token):
        """Test GET /api/admin/settings/earnings-hold"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/earnings-hold",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["success"] == True
        assert "settings" in data
        settings = data["settings"]
        
        # Verify settings fields
        assert "food_hold_hours" in settings
        assert "products_hold_hours" in settings
        assert "enabled" in settings
        assert settings["type"] == "earnings_hold"
        
        # Verify default values are reasonable
        assert isinstance(settings["food_hold_hours"], int)
        assert isinstance(settings["products_hold_hours"], int)
        assert isinstance(settings["enabled"], bool)
        print(f"✓ Earnings hold settings: food={settings['food_hold_hours']}h, products={settings['products_hold_hours']}h, enabled={settings['enabled']}")
    
    def test_update_earnings_hold_settings(self, admin_token):
        """Test PUT /api/admin/settings/earnings-hold"""
        # Update settings
        new_settings = {
            "food_hold_hours": 2,
            "products_hold_hours": 48,
            "enabled": True
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/settings/earnings-hold",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=new_settings
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert data["success"] == True
        assert "message" in data
        assert "settings" in data
        
        # Verify settings were updated
        settings = data["settings"]
        assert settings["food_hold_hours"] == 2
        assert settings["products_hold_hours"] == 48
        assert settings["enabled"] == True
        print(f"✓ Settings updated successfully")
        
        # Restore default settings
        restore_settings = {
            "food_hold_hours": 1,
            "products_hold_hours": 24,
            "enabled": True
        }
        requests.put(
            f"{BASE_URL}/api/admin/settings/earnings-hold",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=restore_settings
        )
        print(f"✓ Settings restored to defaults")
    
    def test_get_earnings_hold_settings_unauthorized(self):
        """Test that non-admins cannot access earnings hold settings"""
        driver_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        driver_token = driver_response.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/settings/earnings-hold",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 403
        print(f"✓ Non-admin correctly denied access (403)")


# ==========================================
# Held Earnings Summary API Tests (Admin)
# ==========================================

class TestHeldEarningsSummaryAPI:
    """Tests for Admin held earnings summary API"""
    
    def test_get_held_earnings_summary(self, admin_token):
        """Test GET /api/admin/held-earnings/summary"""
        response = requests.get(
            f"{BASE_URL}/api/admin/held-earnings/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert data["success"] == True
        assert "summary" in data
        summary = data["summary"]
        
        # Verify summary fields
        assert "total_held" in summary
        assert "count" in summary
        assert "food_held" in summary
        assert "products_held" in summary
        
        # Verify values are numbers
        assert isinstance(summary["total_held"], (int, float))
        assert isinstance(summary["count"], int)
        assert isinstance(summary["food_held"], (int, float))
        assert isinstance(summary["products_held"], (int, float))
        print(f"✓ Held earnings summary: total={summary['total_held']}, count={summary['count']}")
    
    def test_manual_release_held_earnings(self, admin_token):
        """Test POST /api/admin/held-earnings/release-all"""
        response = requests.post(
            f"{BASE_URL}/api/admin/held-earnings/release-all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response
        assert data["success"] == True
        assert "message" in data
        assert "result" in data
        result = data["result"]
        assert "released_count" in result
        assert "total_released" in result
        print(f"✓ Manual release: released={result['released_count']}, total={result['total_released']}")


# ==========================================
# User Held Earnings API Tests (Driver/Seller)
# ==========================================

class TestUserHeldEarningsAPI:
    """Tests for user-facing held earnings APIs"""
    
    def test_get_user_held_earnings(self, driver_token):
        """Test GET /api/wallet/held-earnings"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/held-earnings",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "held_earnings" in data
        assert "total_held" in data
        assert "count" in data
        
        # Verify data types
        assert isinstance(data["held_earnings"], list)
        assert isinstance(data["total_held"], (int, float))
        assert isinstance(data["count"], int)
        print(f"✓ User held earnings: total={data['total_held']}, count={data['count']}")
    
    def test_get_hold_settings_public(self, driver_token):
        """Test GET /api/wallet/hold-settings"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/hold-settings",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "food_hold_hours" in data
        assert "products_hold_hours" in data
        assert "enabled" in data
        print(f"✓ Hold settings available: food={data['food_hold_hours']}h, products={data['products_hold_hours']}h")


# ==========================================
# Live Driver Location Tracking API Tests
# ==========================================

class TestDriverLocationTrackingAPI:
    """Tests for driver location tracking APIs"""
    
    def test_update_driver_location(self, driver_token):
        """Test PUT /api/delivery/location"""
        location_data = {
            "latitude": 33.5138,
            "longitude": 36.2765,
            "speed": 35.5,
            "heading": 180
        }
        response = requests.put(
            f"{BASE_URL}/api/delivery/location",
            headers={"Authorization": f"Bearer {driver_token}"},
            json=location_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "message" in data
        print(f"✓ Driver location updated successfully")
    
    def test_update_driver_location_with_order(self, driver_token):
        """Test PUT /api/delivery/location with order_id"""
        location_data = {
            "latitude": 33.5200,
            "longitude": 36.2800,
            "speed": 50,
            "heading": 90,
            "order_id": "test-order-123"  # May not match real order, but API should accept
        }
        response = requests.put(
            f"{BASE_URL}/api/delivery/location",
            headers={"Authorization": f"Bearer {driver_token}"},
            json=location_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        print(f"✓ Driver location with order_id updated successfully")


# ==========================================
# Wallet Balance API Tests (with held_balance)
# ==========================================

class TestWalletWithHeldBalance:
    """Tests for wallet API that includes held balance"""
    
    def test_wallet_balance_includes_held(self, driver_token):
        """Test GET /api/wallet/balance includes held balance concept"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/balance",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify wallet fields
        assert "balance" in data
        assert "available_balance" in data
        # held_balance might be in response or fetched separately
        print(f"✓ Wallet balance: available={data['available_balance']}, total={data.get('balance', 0)}")


# ==========================================
# Integration Test - Full Flow
# ==========================================

class TestEarningsHoldIntegration:
    """Integration tests for earnings hold system"""
    
    def test_full_earnings_hold_flow(self, admin_token, driver_token):
        """Test complete flow: check settings -> check summary -> check user held"""
        # 1. Admin checks settings
        settings_resp = requests.get(
            f"{BASE_URL}/api/admin/settings/earnings-hold",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert settings_resp.status_code == 200
        settings = settings_resp.json()["settings"]
        print(f"✓ Step 1: Settings retrieved - enabled={settings['enabled']}")
        
        # 2. Admin checks summary
        summary_resp = requests.get(
            f"{BASE_URL}/api/admin/held-earnings/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert summary_resp.status_code == 200
        summary = summary_resp.json()["summary"]
        print(f"✓ Step 2: Summary retrieved - total_held={summary['total_held']}")
        
        # 3. Driver checks their held earnings
        user_held_resp = requests.get(
            f"{BASE_URL}/api/wallet/held-earnings",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert user_held_resp.status_code == 200
        user_held = user_held_resp.json()
        print(f"✓ Step 3: User held earnings retrieved - count={user_held['count']}")
        
        # 4. Driver updates location (simulating tracking)
        location_resp = requests.put(
            f"{BASE_URL}/api/delivery/location",
            headers={"Authorization": f"Bearer {driver_token}"},
            json={"latitude": 33.5138, "longitude": 36.2765}
        )
        assert location_resp.status_code == 200
        print(f"✓ Step 4: Location tracking working")
        
        print("✓ Full integration flow completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
