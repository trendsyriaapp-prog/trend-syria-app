# /app/backend/tests/test_driver_leaderboard.py
# Tests for Driver Leaderboard feature
# - GET /api/delivery/leaderboard - returns top 10 drivers monthly with rewards
# - PUT /api/settings/leaderboard-rewards - admin configures rewards

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {"phone": "0911111111", "password": "admin123"}
DELIVERY_CREDENTIALS = {"phone": "0900000000", "password": "delivery123"}
CUSTOMER_CREDENTIALS = {"phone": "0933333333", "password": "user123"}


class TestDriverLeaderboard:
    """Tests for driver leaderboard endpoint - delivery users only"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, credentials):
        """Helper to login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=credentials)
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return token
        return None
    
    # ==================== Delivery User Tests ====================
    
    def test_delivery_user_can_access_leaderboard(self):
        """Delivery user should be able to access leaderboard"""
        token = self.login(DELIVERY_CREDENTIALS)
        assert token is not None, "Delivery login failed"
        
        response = self.session.get(f"{BASE_URL}/api/delivery/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leaderboard" in data, "Response missing 'leaderboard' key"
        assert "my_position" in data, "Response missing 'my_position' key"
        assert "rewards" in data, "Response missing 'rewards' key"
        assert "month_info" in data, "Response missing 'month_info' key"
        assert "total_participants" in data, "Response missing 'total_participants' key"
        print(f"✅ Delivery user can access leaderboard - {len(data['leaderboard'])} drivers in top 10")
    
    def test_leaderboard_structure(self):
        """Verify leaderboard response structure"""
        token = self.login(DELIVERY_CREDENTIALS)
        assert token is not None, "Delivery login failed"
        
        response = self.session.get(f"{BASE_URL}/api/delivery/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check leaderboard entries structure
        leaderboard = data["leaderboard"]
        assert isinstance(leaderboard, list), "Leaderboard should be a list"
        assert len(leaderboard) <= 10, "Leaderboard should have max 10 entries"
        
        if len(leaderboard) > 0:
            driver = leaderboard[0]
            required_fields = ["driver_id", "name", "orders_count", "avg_rating", "earnings", "rank"]
            for field in required_fields:
                assert field in driver, f"Driver entry missing '{field}'"
            print(f"✅ Leaderboard structure verified - Top driver: {driver['name']} with {driver['orders_count']} orders")
    
    def test_leaderboard_my_position(self):
        """Verify my_position data in leaderboard"""
        token = self.login(DELIVERY_CREDENTIALS)
        assert token is not None, "Delivery login failed"
        
        response = self.session.get(f"{BASE_URL}/api/delivery/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        my_position = data["my_position"]
        
        assert "rank" in my_position, "my_position missing 'rank'"
        assert "data" in my_position, "my_position missing 'data'"
        assert "is_in_top_10" in my_position, "my_position missing 'is_in_top_10'"
        
        assert isinstance(my_position["rank"], int), "rank should be integer"
        assert my_position["rank"] >= 1, "rank should be at least 1"
        
        my_data = my_position["data"]
        assert "driver_id" in my_data, "my_data missing 'driver_id'"
        assert "orders_count" in my_data, "my_data missing 'orders_count'"
        
        print(f"✅ My position verified - Rank #{my_position['rank']}, Orders: {my_data['orders_count']}")
    
    def test_leaderboard_rewards_structure(self):
        """Verify rewards structure in leaderboard"""
        token = self.login(DELIVERY_CREDENTIALS)
        assert token is not None, "Delivery login failed"
        
        response = self.session.get(f"{BASE_URL}/api/delivery/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        rewards = data["rewards"]
        
        assert "first" in rewards, "rewards missing 'first'"
        assert "second" in rewards, "rewards missing 'second'"
        assert "third" in rewards, "rewards missing 'third'"
        
        assert rewards["first"] >= 0, "first reward should be non-negative"
        assert rewards["second"] >= 0, "second reward should be non-negative"
        assert rewards["third"] >= 0, "third reward should be non-negative"
        
        print(f"✅ Rewards structure verified - 1st: {rewards['first']}, 2nd: {rewards['second']}, 3rd: {rewards['third']}")
    
    def test_leaderboard_month_info(self):
        """Verify month_info structure in leaderboard"""
        token = self.login(DELIVERY_CREDENTIALS)
        assert token is not None, "Delivery login failed"
        
        response = self.session.get(f"{BASE_URL}/api/delivery/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        month_info = data["month_info"]
        
        assert "name" in month_info, "month_info missing 'name'"
        assert "year" in month_info, "month_info missing 'year'"
        assert "days_remaining" in month_info, "month_info missing 'days_remaining'"
        
        assert isinstance(month_info["year"], int), "year should be integer"
        assert month_info["days_remaining"] >= 0, "days_remaining should be non-negative"
        
        print(f"✅ Month info verified - {month_info['name']} {month_info['year']}, {month_info['days_remaining']} days remaining")
    
    def test_top_3_drivers_have_rewards(self):
        """Top 3 drivers should have rewards, others should have 0"""
        token = self.login(DELIVERY_CREDENTIALS)
        assert token is not None, "Delivery login failed"
        
        response = self.session.get(f"{BASE_URL}/api/delivery/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data["leaderboard"]
        rewards = data["rewards"]
        
        for i, driver in enumerate(leaderboard):
            if i == 0:
                assert driver.get("reward") == rewards["first"], f"1st place should have {rewards['first']} reward"
                assert driver.get("badge") == "🥇", "1st place should have 🥇 badge"
            elif i == 1:
                assert driver.get("reward") == rewards["second"], f"2nd place should have {rewards['second']} reward"
                assert driver.get("badge") == "🥈", "2nd place should have 🥈 badge"
            elif i == 2:
                assert driver.get("reward") == rewards["third"], f"3rd place should have {rewards['third']} reward"
                assert driver.get("badge") == "🥉", "3rd place should have 🥉 badge"
            else:
                assert driver.get("reward") == 0, f"Rank {i+1} should have 0 reward"
        
        print(f"✅ Top 3 rewards verification passed")
    
    # ==================== Access Control Tests ====================
    
    def test_customer_cannot_access_leaderboard(self):
        """Customer should NOT be able to access leaderboard"""
        token = self.login(CUSTOMER_CREDENTIALS)
        assert token is not None, "Customer login failed"
        
        response = self.session.get(f"{BASE_URL}/api/delivery/leaderboard")
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}"
        print(f"✅ Customer correctly denied access to leaderboard (403)")
    
    def test_unauthenticated_cannot_access_leaderboard(self):
        """Unauthenticated user should NOT be able to access leaderboard"""
        # Create new session without auth
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.get(f"{BASE_URL}/api/delivery/leaderboard")
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated, got {response.status_code}"
        print(f"✅ Unauthenticated user correctly denied access to leaderboard ({response.status_code})")


class TestAdminLeaderboardRewards:
    """Tests for admin leaderboard rewards configuration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, credentials):
        """Helper to login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=credentials)
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return token
        return None
    
    # ==================== Admin Rewards Settings Tests ====================
    
    def test_admin_can_get_delivery_settings(self):
        """Admin should be able to get delivery settings including leaderboard rewards"""
        token = self.login(ADMIN_CREDENTIALS)
        assert token is not None, "Admin login failed"
        
        response = self.session.get(f"{BASE_URL}/api/settings/delivery-settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "leaderboard_rewards" in data, "Response missing 'leaderboard_rewards'"
        
        rewards = data["leaderboard_rewards"]
        assert "first" in rewards, "leaderboard_rewards missing 'first'"
        assert "second" in rewards, "leaderboard_rewards missing 'second'"
        assert "third" in rewards, "leaderboard_rewards missing 'third'"
        
        print(f"✅ Admin can get delivery settings - Rewards: 1st={rewards['first']}, 2nd={rewards['second']}, 3rd={rewards['third']}")
    
    def test_admin_can_update_leaderboard_rewards(self):
        """Admin should be able to update leaderboard rewards"""
        token = self.login(ADMIN_CREDENTIALS)
        assert token is not None, "Admin login failed"
        
        # Get current rewards
        response = self.session.get(f"{BASE_URL}/api/settings/delivery-settings")
        original_rewards = response.json().get("leaderboard_rewards", {})
        
        # Update rewards with test values
        test_rewards = {
            "first": 60000,
            "second": 35000,
            "third": 20000
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/settings/leaderboard-rewards",
            json=test_rewards
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response missing 'message'"
        assert "leaderboard_rewards" in data, "Response missing 'leaderboard_rewards'"
        
        updated_rewards = data["leaderboard_rewards"]
        assert updated_rewards["first"] == test_rewards["first"], "first reward not updated"
        assert updated_rewards["second"] == test_rewards["second"], "second reward not updated"
        assert updated_rewards["third"] == test_rewards["third"], "third reward not updated"
        
        # Verify persistence via GET
        response = self.session.get(f"{BASE_URL}/api/settings/delivery-settings")
        assert response.status_code == 200
        persisted_rewards = response.json()["leaderboard_rewards"]
        assert persisted_rewards["first"] == test_rewards["first"], "first reward not persisted"
        assert persisted_rewards["second"] == test_rewards["second"], "second reward not persisted"
        assert persisted_rewards["third"] == test_rewards["third"], "third reward not persisted"
        
        # Restore original rewards
        if original_rewards:
            restore_rewards = {
                "first": original_rewards.get("first", 50000),
                "second": original_rewards.get("second", 30000),
                "third": original_rewards.get("third", 15000)
            }
            self.session.put(f"{BASE_URL}/api/settings/leaderboard-rewards", json=restore_rewards)
        
        print(f"✅ Admin can update and persist leaderboard rewards")
    
    def test_admin_rejects_negative_rewards(self):
        """Admin should not be able to set negative rewards"""
        token = self.login(ADMIN_CREDENTIALS)
        assert token is not None, "Admin login failed"
        
        negative_rewards = {
            "first": -1000,
            "second": 30000,
            "third": 15000
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/settings/leaderboard-rewards",
            json=negative_rewards
        )
        assert response.status_code == 400, f"Expected 400 for negative rewards, got {response.status_code}"
        print(f"✅ Admin correctly rejected negative rewards (400)")
    
    # ==================== Access Control Tests ====================
    
    def test_delivery_user_cannot_update_rewards(self):
        """Delivery user should NOT be able to update leaderboard rewards"""
        token = self.login(DELIVERY_CREDENTIALS)
        assert token is not None, "Delivery login failed"
        
        test_rewards = {"first": 100000, "second": 50000, "third": 25000}
        
        response = self.session.put(
            f"{BASE_URL}/api/settings/leaderboard-rewards",
            json=test_rewards
        )
        assert response.status_code == 403, f"Expected 403 for delivery user, got {response.status_code}"
        print(f"✅ Delivery user correctly denied rewards update (403)")
    
    def test_customer_cannot_update_rewards(self):
        """Customer should NOT be able to update leaderboard rewards"""
        token = self.login(CUSTOMER_CREDENTIALS)
        assert token is not None, "Customer login failed"
        
        test_rewards = {"first": 100000, "second": 50000, "third": 25000}
        
        response = self.session.put(
            f"{BASE_URL}/api/settings/leaderboard-rewards",
            json=test_rewards
        )
        assert response.status_code == 403, f"Expected 403 for customer, got {response.status_code}"
        print(f"✅ Customer correctly denied rewards update (403)")
    
    def test_unauthenticated_cannot_update_rewards(self):
        """Unauthenticated user should NOT be able to update leaderboard rewards"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        test_rewards = {"first": 100000, "second": 50000, "third": 25000}
        
        response = session.put(
            f"{BASE_URL}/api/settings/leaderboard-rewards",
            json=test_rewards
        )
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated, got {response.status_code}"
        print(f"✅ Unauthenticated user correctly denied rewards update ({response.status_code})")


class TestLeaderboardIntegration:
    """Integration tests - verify leaderboard uses updated rewards"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, credentials):
        """Helper to login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=credentials)
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return token
        return None
    
    def test_leaderboard_uses_configured_rewards(self):
        """Leaderboard should use rewards configured by admin"""
        # Login as admin and set specific rewards
        admin_token = self.login(ADMIN_CREDENTIALS)
        assert admin_token is not None, "Admin login failed"
        
        test_rewards = {"first": 55000, "second": 33000, "third": 18000}
        
        response = self.session.put(
            f"{BASE_URL}/api/settings/leaderboard-rewards",
            json=test_rewards
        )
        assert response.status_code == 200, "Failed to update rewards"
        
        # Login as delivery and check leaderboard shows updated rewards
        delivery_token = self.login(DELIVERY_CREDENTIALS)
        assert delivery_token is not None, "Delivery login failed"
        
        response = self.session.get(f"{BASE_URL}/api/delivery/leaderboard")
        assert response.status_code == 200, "Failed to get leaderboard"
        
        data = response.json()
        rewards = data["rewards"]
        
        assert rewards["first"] == test_rewards["first"], f"Expected first={test_rewards['first']}, got {rewards['first']}"
        assert rewards["second"] == test_rewards["second"], f"Expected second={test_rewards['second']}, got {rewards['second']}"
        assert rewards["third"] == test_rewards["third"], f"Expected third={test_rewards['third']}, got {rewards['third']}"
        
        # Restore default rewards
        self.login(ADMIN_CREDENTIALS)
        default_rewards = {"first": 50000, "second": 30000, "third": 15000}
        self.session.put(f"{BASE_URL}/api/settings/leaderboard-rewards", json=default_rewards)
        
        print(f"✅ Leaderboard correctly uses configured rewards")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
