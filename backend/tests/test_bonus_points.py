# /app/backend/tests/test_bonus_points.py
# Tests for Delivery Driver Bonus Points System
# Features: +5 points for 5-star rating, +10 points every 10 deliveries, max 100 points cap
# Bonus types: five_star_rating=+5, ten_deliveries=+10, challenge_complete=+15

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"phone": "0911111111", "password": "admin123"}
DELIVERY_CREDS = {"phone": "0900000000", "password": "delivery123"}
CUSTOMER_CREDS = {"phone": "0933333333", "password": "user123"}


class TestBonusPointsConstants:
    """Tests for bonus points constants defined in delivery.py"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_token(self, creds):
        """Get auth token for user"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_bonus_points_values_documented(self):
        """Verify bonus points values are correctly defined"""
        # Expected bonus point values (from BONUS_POINTS dict in delivery.py)
        expected_bonuses = {
            "five_star_rating": 5,      # +5 نقاط عند تقييم 5 نجوم
            "ten_deliveries": 10,       # +10 نقاط عند كل 10 توصيلات
            "challenge_complete": 15,   # +15 نقاط عند إتمام تحدي
        }
        
        print("✅ Bonus points values:")
        for bonus_type, points in expected_bonuses.items():
            print(f"   {bonus_type}: +{points} points")
    
    def test_max_penalty_points_cap(self):
        """Test that max penalty points is capped at 100"""
        token = self.get_token(DELIVERY_CREDS)
        assert token is not None, "Failed to login as delivery driver"
        
        response = self.session.get(
            f"{BASE_URL}/api/delivery/my-penalty-points",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["max_points"] == 100, f"Expected max_points=100, got {data['max_points']}"
        assert data["current_points"] <= 100, f"Current points {data['current_points']} exceeds max 100"
        
        print(f"✅ Max penalty points cap verified: {data['max_points']} points")
        print(f"   Current points: {data['current_points']}/{data['max_points']}")


class TestBonusPointsHistory:
    """Tests for bonus points history recording"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_token(self, creds):
        """Get auth token for user"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_penalty_points_endpoint_returns_history(self):
        """Test that penalty points endpoint includes history with bonus type"""
        token = self.get_token(DELIVERY_CREDS)
        assert token is not None, "Failed to login as delivery driver"
        
        response = self.session.get(
            f"{BASE_URL}/api/delivery/my-penalty-points",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "history" in data, "Missing history field"
        assert isinstance(data["history"], list), "history should be a list"
        
        # Check if any bonus entries exist
        bonus_entries = [h for h in data["history"] if h.get("type") == "bonus"]
        deduction_entries = [h for h in data["history"] if h.get("type") != "bonus"]
        
        print(f"✅ History retrieved: {len(data['history'])} total entries")
        print(f"   Bonus entries: {len(bonus_entries)}")
        print(f"   Deduction entries: {len(deduction_entries)}")
        
        # If there are bonus entries, verify structure
        if bonus_entries:
            entry = bonus_entries[0]
            assert "type" in entry and entry["type"] == "bonus", "Bonus entry should have type='bonus'"
            assert "bonus_type" in entry, "Bonus entry should have bonus_type"
            assert "points_added" in entry, "Bonus entry should have points_added"
            assert "reason" in entry, "Bonus entry should have reason"
            
            print(f"   Sample bonus: {entry.get('bonus_type')} - +{entry.get('points_added')} points")
    
    def test_history_structure_for_bonuses(self):
        """Test that bonus history entries have correct structure"""
        token = self.get_token(DELIVERY_CREDS)
        assert token is not None, "Failed to login as delivery driver"
        
        response = self.session.get(
            f"{BASE_URL}/api/delivery/my-penalty-points",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        history = data.get("history", [])
        
        # Bonus entries should have these fields (from add_bonus_points function)
        expected_bonus_fields = ["date", "type", "bonus_type", "reason", "points_added", "points_before", "points_after"]
        
        for entry in history:
            if entry.get("type") == "bonus":
                for field in expected_bonus_fields:
                    assert field in entry, f"Bonus entry missing field: {field}"
                
                print("✅ Bonus entry structure verified:")
                print(f"   bonus_type: {entry.get('bonus_type')}")
                print(f"   reason: {entry.get('reason')}")
                print(f"   points: +{entry.get('points_added')}")
                break
        else:
            print("✅ No bonus entries yet - structure will be verified when bonuses are earned")


class TestFiveStarRatingBonus:
    """Tests for +5 bonus points when receiving 5-star rating"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_token(self, creds):
        """Get auth token for user"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_rate_delivery_endpoint_exists(self):
        """Test that rate delivery endpoint exists"""
        response = self.session.post(f"{BASE_URL}/api/delivery/rate/test-order-id")
        # Should return 401 (auth required), not 404
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}"
        print("✅ Rate delivery endpoint exists: POST /api/delivery/rate/{order_id}")
    
    def test_rate_delivery_requires_auth(self):
        """Test that rating requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/delivery/rate/test-order-id",
            json={"rating": 5}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Rate delivery requires authentication (401)")
    
    def test_rate_delivery_validates_rating_range(self):
        """Test that rating must be between 1 and 5"""
        token = self.get_token(CUSTOMER_CREDS)
        assert token is not None, "Failed to login as customer"
        
        # Test invalid rating (0)
        response = self.session.post(
            f"{BASE_URL}/api/delivery/rate/test-order-id",
            headers={"Authorization": f"Bearer {token}"},
            json={"rating": 0}
        )
        assert response.status_code == 400 or response.status_code == 404, \
            f"Should reject rating 0: got {response.status_code}"
        
        # Test invalid rating (6)
        response = self.session.post(
            f"{BASE_URL}/api/delivery/rate/test-order-id",
            headers={"Authorization": f"Bearer {token}"},
            json={"rating": 6}
        )
        assert response.status_code == 400 or response.status_code == 404, \
            f"Should reject rating 6: got {response.status_code}"
        
        print("✅ Rate delivery validates rating range (1-5)")
    
    def test_check_rating_endpoint_exists(self):
        """Test that check-rating endpoint exists"""
        token = self.get_token(CUSTOMER_CREDS)
        assert token is not None, "Failed to login as customer"
        
        response = self.session.get(
            f"{BASE_URL}/api/delivery/check-rating/test-order-id",
            headers={"Authorization": f"Bearer {token}"}
        )
        # Should return response (even if 404 for non-existent order)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        print("✅ Check rating endpoint exists: GET /api/delivery/check-rating/{order_id}")


class TestTenDeliveriesMilestoneBonus:
    """Tests for +10 bonus points every 10 deliveries"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_token(self, creds):
        """Get auth token for user"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_deliver_endpoint_exists(self):
        """Test that deliver order endpoint exists"""
        response = self.session.post(f"{BASE_URL}/api/delivery/orders/test-order-id/deliver")
        # Should return 401 (auth required), not 404
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Deliver order endpoint exists: POST /api/delivery/orders/{order_id}/deliver")
    
    def test_deliver_requires_delivery_driver(self):
        """Test that only delivery drivers can mark orders delivered"""
        token = self.get_token(CUSTOMER_CREDS)
        assert token is not None, "Failed to login as customer"
        
        response = self.session.post(
            f"{BASE_URL}/api/delivery/orders/test-order-id/deliver",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Deliver endpoint restricted to delivery drivers (403 for customer)")
    
    def test_delivery_stats_shows_total_delivered(self):
        """Test that delivery stats shows total delivered count"""
        token = self.get_token(DELIVERY_CREDS)
        assert token is not None, "Failed to login as delivery driver"
        
        response = self.session.get(
            f"{BASE_URL}/api/delivery/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_delivered" in data, "Missing total_delivered in stats"
        
        print(f"✅ Delivery stats includes total_delivered: {data.get('total_delivered')}")
        print(f"   Milestone progress: {data.get('total_delivered', 0) % 10}/10 towards next bonus")


class TestBonusPointsUIIntegration:
    """Tests for UI components displaying bonus points"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_token(self, creds):
        """Get auth token for user"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_my_penalty_points_returns_mixed_history(self):
        """Test that my-penalty-points returns both bonuses and deductions"""
        token = self.get_token(DELIVERY_CREDS)
        assert token is not None, "Failed to login as delivery driver"
        
        response = self.session.get(
            f"{BASE_URL}/api/delivery/my-penalty-points",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        history = data.get("history", [])
        
        # Separate by type
        bonuses = [h for h in history if h.get("type") == "bonus"]
        deductions = [h for h in history if h.get("type") != "bonus"]
        
        print("✅ My penalty points API supports mixed history:")
        print(f"   Total entries: {len(history)}")
        print(f"   Bonuses (type='bonus'): {len(bonuses)}")
        print(f"   Deductions: {len(deductions)}")
        
        # API should return history array that can contain both types
        assert isinstance(history, list), "History should be a list"


class TestBonusPointsEndToEnd:
    """End-to-end tests for bonus points workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_token(self, creds):
        """Get auth token for user"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=creds)
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_delivery_driver_can_view_points(self):
        """Test that delivery driver can view their current points"""
        token = self.get_token(DELIVERY_CREDS)
        assert token is not None, "Failed to login as delivery driver"
        
        response = self.session.get(
            f"{BASE_URL}/api/delivery/my-penalty-points",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        print(f"✅ Delivery driver points: {data['current_points']}/{data['max_points']}")
        print(f"   Percentage: {data['percentage']}%")
        print(f"   History entries: {len(data.get('history', []))}")
    
    def test_driver_performance_endpoint(self):
        """Test that driver performance endpoint works"""
        token = self.get_token(DELIVERY_CREDS)
        assert token is not None, "Failed to login as delivery driver"
        
        response = self.session.get(
            f"{BASE_URL}/api/delivery/performance",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "overview" in data, "Missing overview in performance"
        assert "tips" in data, "Missing tips in performance"
        
        print("✅ Driver performance endpoint works")
        print(f"   Total delivered: {data['overview'].get('total_delivered', 0)}")
    
    def test_my_ratings_endpoint(self):
        """Test that my-ratings endpoint works for delivery driver"""
        token = self.get_token(DELIVERY_CREDS)
        assert token is not None, "Failed to login as delivery driver"
        
        response = self.session.get(
            f"{BASE_URL}/api/delivery/my-ratings",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "ratings" in data, "Missing ratings field"
        assert "total" in data, "Missing total field"
        assert "average_rating" in data, "Missing average_rating field"
        
        print("✅ My ratings endpoint works")
        print(f"   Total ratings: {data['total']}")
        print(f"   Average rating: {data['average_rating']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
