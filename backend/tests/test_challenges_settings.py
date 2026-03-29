# /app/backend/tests/test_challenges_settings.py
# Backend API tests for Challenges & Delivery Settings features
# Tests: Admin challenge CRUD, Delivery settings (performance levels, working hours)

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "admin123"
DELIVERY_PHONE = "0900000000"
DELIVERY_PASSWORD = "delivery123"


class TestSetup:
    """Setup tests - verify API is accessible"""
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ API health check passed")


class TestAdminLogin:
    """Admin authentication tests"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        return data["token"]
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["user_type"] == "admin"
        print("✅ Admin login successful")


class TestDeliveryLogin:
    """Delivery user authentication tests"""
    
    def test_delivery_login_success(self):
        """Test delivery user login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DELIVERY_PHONE,
            "password": DELIVERY_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["user_type"] == "delivery"
        print("✅ Delivery user login successful")


class TestDeliverySettings:
    """Tests for GET /api/settings/delivery-settings"""
    
    def test_get_delivery_settings_success(self):
        """Test getting delivery settings (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/settings/delivery-settings")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "performance_levels" in data
        assert "working_hours" in data
        
        # Verify performance_levels structure
        levels = data["performance_levels"]
        assert "beginner_max" in levels
        assert "bronze_max" in levels
        assert "silver_max" in levels
        assert "gold_max" in levels
        
        # Verify working_hours structure
        hours = data["working_hours"]
        assert "start_hour" in hours
        assert "end_hour" in hours
        assert "is_enabled" in hours
        
        print(f"✅ Delivery settings retrieved: {data}")
    
    def test_delivery_settings_performance_levels_ascending(self):
        """Verify performance levels are in ascending order"""
        response = requests.get(f"{BASE_URL}/api/settings/delivery-settings")
        assert response.status_code == 200
        data = response.json()
        
        levels = data["performance_levels"]
        assert levels["beginner_max"] < levels["bronze_max"]
        assert levels["bronze_max"] < levels["silver_max"]
        assert levels["silver_max"] < levels["gold_max"]
        print("✅ Performance levels are in ascending order")


class TestAdminPerformanceLevels:
    """Tests for PUT /api/settings/performance-levels (admin only)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_update_performance_levels_without_auth(self):
        """Test updating performance levels without authentication"""
        response = requests.put(f"{BASE_URL}/api/settings/performance-levels", json={
            "beginner_max": 10,
            "bronze_max": 30,
            "silver_max": 60,
            "gold_max": 100
        })
        assert response.status_code in [401, 403]
        print("✅ Unauthorized access rejected as expected")
    
    def test_update_performance_levels_with_admin(self, admin_token):
        """Test updating performance levels with admin auth"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/settings/performance-levels", 
            headers=headers,
            json={
                "beginner_max": 9,
                "bronze_max": 29,
                "silver_max": 59,
                "gold_max": 99
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ Performance levels updated: {data}")
    
    def test_invalid_performance_levels_order(self, admin_token):
        """Test updating with invalid order (should fail)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/settings/performance-levels", 
            headers=headers,
            json={
                "beginner_max": 50,  # Invalid: larger than bronze_max
                "bronze_max": 29,
                "silver_max": 59,
                "gold_max": 99
            }
        )
        assert response.status_code == 400
        print("✅ Invalid performance levels order rejected")


class TestAdminWorkingHours:
    """Tests for PUT /api/settings/working-hours (admin only)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_update_working_hours_without_auth(self):
        """Test updating working hours without authentication"""
        response = requests.put(f"{BASE_URL}/api/settings/working-hours", json={
            "start_hour": 8,
            "end_hour": 18,
            "is_enabled": True
        })
        assert response.status_code in [401, 403]
        print("✅ Unauthorized access rejected as expected")
    
    def test_update_working_hours_with_admin(self, admin_token):
        """Test updating working hours with admin auth"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/settings/working-hours", 
            headers=headers,
            json={
                "start_hour": 8,
                "end_hour": 18,
                "is_enabled": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "working_hours" in data
        print(f"✅ Working hours updated: {data}")
    
    def test_disable_working_hours(self, admin_token):
        """Test disabling working hours restriction"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/settings/working-hours", 
            headers=headers,
            json={
                "start_hour": 8,
                "end_hour": 18,
                "is_enabled": False
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert not data["working_hours"]["is_enabled"]
        print("✅ Working hours disabled successfully")
        
        # Re-enable for other tests
        requests.put(f"{BASE_URL}/api/settings/working-hours", 
            headers=headers,
            json={"start_hour": 8, "end_hour": 18, "is_enabled": True}
        )
    
    def test_invalid_working_hours(self, admin_token):
        """Test updating with invalid hours (start >= end)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/settings/working-hours", 
            headers=headers,
            json={
                "start_hour": 18,  # Invalid: start >= end
                "end_hour": 8,
                "is_enabled": True
            }
        )
        assert response.status_code == 400
        print("✅ Invalid working hours rejected")


class TestChallengesAdmin:
    """Tests for admin challenge management endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def test_challenge_id(self, admin_token):
        """Create a test challenge and return its ID"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_title = f"TEST_تحدي_اختبار_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/challenges/admin/create",
            headers=headers,
            json={
                "title": unique_title,
                "description": "تحدي اختباري للتأكد من عمل النظام",
                "challenge_type": "weekly",
                "target_orders": 10,
                "reward_amount": 5000,
                "is_active": True
            }
        )
        assert response.status_code == 200
        return response.json()["challenge_id"]
    
    def test_get_all_challenges_without_auth(self):
        """Test getting challenges without auth"""
        response = requests.get(f"{BASE_URL}/api/challenges/admin/all")
        assert response.status_code in [401, 403]
        print("✅ Unauthorized access rejected")
    
    def test_get_all_challenges_with_admin(self, admin_token):
        """Test getting all challenges with admin auth"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/challenges/admin/all", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "challenges" in data
        assert "stats" in data
        assert isinstance(data["challenges"], list)
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_challenges" in stats
        assert "active_challenges" in stats
        assert "total_completions" in stats
        assert "total_rewards_paid" in stats
        
        print(f"✅ Retrieved {len(data['challenges'])} challenges, stats: {stats}")
    
    def test_create_weekly_challenge(self, admin_token):
        """Test creating a weekly challenge"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_title = f"TEST_تحدي_أسبوعي_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/challenges/admin/create",
            headers=headers,
            json={
                "title": unique_title,
                "description": "اكمل 20 طلب هذا الأسبوع",
                "challenge_type": "weekly",
                "target_orders": 20,
                "reward_amount": 15000,
                "is_active": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "challenge_id" in data
        assert "message" in data
        print(f"✅ Weekly challenge created: {data}")
        
        # Cleanup - delete the test challenge
        requests.delete(f"{BASE_URL}/api/challenges/admin/{data['challenge_id']}", headers=headers)
    
    def test_create_monthly_challenge(self, admin_token):
        """Test creating a monthly challenge"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        unique_title = f"TEST_تحدي_شهري_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/challenges/admin/create",
            headers=headers,
            json={
                "title": unique_title,
                "description": "اكمل 50 طلب هذا الشهر",
                "challenge_type": "monthly",
                "target_orders": 50,
                "reward_amount": 30000,
                "is_active": True
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "challenge_id" in data
        print(f"✅ Monthly challenge created: {data}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/challenges/admin/{data['challenge_id']}", headers=headers)
    
    def test_update_challenge(self, admin_token, test_challenge_id):
        """Test updating a challenge"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/challenges/admin/{test_challenge_id}",
            headers=headers,
            json={
                "target_orders": 15,
                "reward_amount": 7500
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ Challenge updated: {data}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/challenges/admin/{test_challenge_id}", headers=headers)
    
    def test_toggle_challenge_active(self, admin_token, test_challenge_id):
        """Test toggling challenge active status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        # Deactivate
        response = requests.put(f"{BASE_URL}/api/challenges/admin/{test_challenge_id}",
            headers=headers,
            json={"is_active": False}
        )
        assert response.status_code == 200
        print("✅ Challenge deactivated")
        
        # Reactivate
        response = requests.put(f"{BASE_URL}/api/challenges/admin/{test_challenge_id}",
            headers=headers,
            json={"is_active": True}
        )
        assert response.status_code == 200
        print("✅ Challenge reactivated")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/challenges/admin/{test_challenge_id}", headers=headers)
    
    def test_delete_challenge(self, admin_token):
        """Test deleting a challenge"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a challenge to delete
        unique_title = f"TEST_تحدي_للحذف_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(f"{BASE_URL}/api/challenges/admin/create",
            headers=headers,
            json={
                "title": unique_title,
                "description": "تحدي للحذف",
                "challenge_type": "special",
                "target_orders": 5,
                "reward_amount": 2500,
                "is_active": True
            }
        )
        assert create_response.status_code == 200
        challenge_id = create_response.json()["challenge_id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/challenges/admin/{challenge_id}", headers=headers)
        assert response.status_code == 200
        print("✅ Challenge deleted successfully")
    
    def test_delete_nonexistent_challenge(self, admin_token):
        """Test deleting a non-existent challenge"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.delete(f"{BASE_URL}/api/challenges/admin/nonexistent-id-12345", headers=headers)
        assert response.status_code == 404
        print("✅ Non-existent challenge deletion rejected")


class TestChallengesDriver:
    """Tests for driver challenge endpoints"""
    
    @pytest.fixture
    def delivery_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DELIVERY_PHONE,
            "password": DELIVERY_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_get_active_challenges_without_auth(self):
        """Test getting active challenges without auth"""
        response = requests.get(f"{BASE_URL}/api/challenges/active")
        assert response.status_code in [401, 403]
        print("✅ Unauthorized access rejected")
    
    def test_get_active_challenges_with_driver(self, delivery_token):
        """Test getting active challenges with driver auth"""
        headers = {"Authorization": f"Bearer {delivery_token}"}
        response = requests.get(f"{BASE_URL}/api/challenges/active", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # If there are challenges, verify structure
        if len(data) > 0:
            challenge = data[0]
            assert "id" in challenge
            assert "title" in challenge
            assert "description" in challenge
            assert "target_orders" in challenge
            assert "reward_amount" in challenge
            assert "my_progress" in challenge
            assert "time_remaining" in challenge
            
            # Verify my_progress structure
            progress = challenge["my_progress"]
            assert "completed_orders" in progress
            assert "target_orders" in progress
            assert "progress_percent" in progress
            assert "remaining_orders" in progress
            assert "is_completed" in progress
            assert "is_claimed" in progress
            
            # Verify time_remaining structure
            time_remaining = challenge["time_remaining"]
            assert "days" in time_remaining
            assert "hours" in time_remaining
            assert "is_ending_soon" in time_remaining
            
            print(f"✅ Retrieved {len(data)} active challenges with progress data")
        else:
            print("✅ No active challenges found (empty list)")
    
    def test_get_challenge_history(self, delivery_token):
        """Test getting challenge history for driver"""
        headers = {"Authorization": f"Bearer {delivery_token}"}
        response = requests.get(f"{BASE_URL}/api/challenges/my-history", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "completed" in data
        assert "participated" in data
        assert "stats" in data
        
        stats = data["stats"]
        assert "total_completed" in stats
        assert "total_participated" in stats
        assert "total_rewards_earned" in stats
        
        print(f"✅ Challenge history retrieved: {stats}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_challenges(self):
        """Clean up any TEST_ prefixed challenges"""
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            print("⚠️ Could not login for cleanup")
            return
        
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all challenges
        response = requests.get(f"{BASE_URL}/api/challenges/admin/all", headers=headers)
        if response.status_code != 200:
            return
        
        challenges = response.json().get("challenges", [])
        deleted = 0
        
        for challenge in challenges:
            if challenge.get("title", "").startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/challenges/admin/{challenge['id']}", 
                    headers=headers
                )
                if delete_response.status_code == 200:
                    deleted += 1
        
        print(f"✅ Cleaned up {deleted} test challenges")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
