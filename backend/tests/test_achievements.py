# /app/backend/tests/test_achievements.py
# Tests for Driver Achievements/Badges System

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDriverAchievements:
    """Tests for driver achievements endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.delivery_credentials = {"phone": "0900000000", "password": "delivery123"}
        self.customer_credentials = {"phone": "0933333333", "password": "user123"}
        self.delivery_token = None
        self.customer_token = None
        
        # Login delivery user
        res = requests.post(f"{BASE_URL}/api/auth/login", json=self.delivery_credentials)
        if res.status_code == 200:
            self.delivery_token = res.json().get("token")
        
        # Login customer
        res = requests.post(f"{BASE_URL}/api/auth/login", json=self.customer_credentials)
        if res.status_code == 200:
            self.customer_token = res.json().get("token")
    
    # ===========================================
    # /api/achievements/my-achievements tests
    # ===========================================
    
    def test_delivery_user_can_access_achievements(self):
        """Delivery driver can access my-achievements endpoint"""
        if not self.delivery_token:
            pytest.skip("Delivery login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {self.delivery_token}"}
        )
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        print("✅ Delivery user can access achievements (200 OK)")
    
    def test_achievements_response_structure(self):
        """Response has achievements, stats, categories"""
        if not self.delivery_token:
            pytest.skip("Delivery login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {self.delivery_token}"}
        )
        data = res.json()
        
        assert "achievements" in data, "Missing achievements array"
        assert "stats" in data, "Missing stats object"
        assert "categories" in data, "Missing categories object"
        print("✅ Response has correct structure (achievements, stats, categories)")
    
    def test_achievements_count_is_18(self):
        """Total achievements should be 18"""
        if not self.delivery_token:
            pytest.skip("Delivery login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {self.delivery_token}"}
        )
        data = res.json()
        
        assert len(data["achievements"]) == 18, f"Expected 18 achievements, got {len(data['achievements'])}"
        assert data["stats"]["total_achievements"] == 18
        print("✅ Total achievements count is 18")
    
    def test_achievement_has_required_fields(self):
        """Each achievement has id, title, description, icon, category, requirement, reward, rarity, is_unlocked, progress"""
        if not self.delivery_token:
            pytest.skip("Delivery login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {self.delivery_token}"}
        )
        data = res.json()
        
        required_fields = ["id", "title", "description", "icon", "category", "requirement", "reward", "rarity", "is_unlocked", "progress"]
        
        for ach in data["achievements"]:
            for field in required_fields:
                assert field in ach, f"Achievement {ach.get('id', 'unknown')} missing field: {field}"
        
        print("✅ All achievements have required fields")
    
    def test_achievement_categories(self):
        """Achievements span 5 categories: orders, rating, speed, loyalty, special"""
        if not self.delivery_token:
            pytest.skip("Delivery login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {self.delivery_token}"}
        )
        data = res.json()
        
        categories = set(a["category"] for a in data["achievements"])
        expected_categories = {"orders", "rating", "speed", "loyalty", "special"}
        
        assert categories == expected_categories, f"Expected {expected_categories}, got {categories}"
        print("✅ All 5 categories present (orders, rating, speed, loyalty, special)")
    
    def test_achievement_rarities(self):
        """Achievements have rarity: common, uncommon, rare, legendary"""
        if not self.delivery_token:
            pytest.skip("Delivery login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {self.delivery_token}"}
        )
        data = res.json()
        
        rarities = set(a["rarity"] for a in data["achievements"])
        expected_rarities = {"common", "uncommon", "rare", "legendary"}
        
        assert rarities == expected_rarities, f"Expected {expected_rarities}, got {rarities}"
        print("✅ All 4 rarities present (common, uncommon, rare, legendary)")
    
    def test_first_delivery_achievement_unlocked(self):
        """Driver 'فهد المندوب' has 'first_delivery' achievement unlocked"""
        if not self.delivery_token:
            pytest.skip("Delivery login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {self.delivery_token}"}
        )
        data = res.json()
        
        first_delivery = next((a for a in data["achievements"] if a["id"] == "first_delivery"), None)
        
        assert first_delivery is not None, "first_delivery achievement not found"
        assert first_delivery["is_unlocked"] == True, "first_delivery should be unlocked"
        assert first_delivery["unlocked_at"] is not None, "unlocked_at should be set"
        assert first_delivery["icon"] == "🚀"
        assert first_delivery["reward"] == 1000
        print("✅ first_delivery achievement unlocked with 🚀 icon and 1000 SYP reward")
    
    def test_stats_show_correct_progress(self):
        """Stats show 1/18 unlocked (5.6%)"""
        if not self.delivery_token:
            pytest.skip("Delivery login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {self.delivery_token}"}
        )
        data = res.json()
        stats = data["stats"]
        
        assert stats["total_unlocked"] == 1, f"Expected 1 unlocked, got {stats['total_unlocked']}"
        assert stats["total_achievements"] == 18
        assert stats["completion_percent"] == 5.6, f"Expected 5.6%, got {stats['completion_percent']}%"
        assert stats["total_rewards_earned"] == 1000, f"Expected 1000 SYP reward, got {stats['total_rewards_earned']}"
        print("✅ Stats show 1/18 (5.6%), 1,000 SYP rewards earned")
    
    def test_categories_info(self):
        """Categories have name and icon"""
        if not self.delivery_token:
            pytest.skip("Delivery login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {self.delivery_token}"}
        )
        data = res.json()
        categories = data["categories"]
        
        expected = {
            "orders": {"name": "الطلبات", "icon": "📦"},
            "rating": {"name": "التقييمات", "icon": "⭐"},
            "speed": {"name": "السرعة", "icon": "⚡"},
            "loyalty": {"name": "الولاء", "icon": "❤️"},
            "special": {"name": "خاصة", "icon": "🎯"}
        }
        
        for cat_id, expected_data in expected.items():
            assert cat_id in categories, f"Missing category: {cat_id}"
            assert categories[cat_id]["name"] == expected_data["name"]
            assert categories[cat_id]["icon"] == expected_data["icon"]
        
        print("✅ Categories have correct Arabic names and icons")
    
    def test_progress_structure(self):
        """Progress has current, target, percent"""
        if not self.delivery_token:
            pytest.skip("Delivery login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {self.delivery_token}"}
        )
        data = res.json()
        
        for ach in data["achievements"]:
            progress = ach["progress"]
            assert "current" in progress, f"{ach['id']} missing current"
            assert "target" in progress, f"{ach['id']} missing target"
            assert "percent" in progress, f"{ach['id']} missing percent"
            assert isinstance(progress["percent"], (int, float))
        
        print("✅ All achievements have progress with current, target, percent")
    
    # ===========================================
    # /api/achievements/check-and-unlock tests
    # ===========================================
    
    def test_check_and_unlock_returns_new_unlocked(self):
        """check-and-unlock returns list of newly unlocked achievements"""
        if not self.delivery_token:
            pytest.skip("Delivery login failed")
        
        res = requests.post(
            f"{BASE_URL}/api/achievements/check-and-unlock",
            headers={"Authorization": f"Bearer {self.delivery_token}"}
        )
        
        assert res.status_code == 200
        data = res.json()
        assert "new_unlocked" in data
        assert "count" in data
        assert isinstance(data["new_unlocked"], list)
        assert isinstance(data["count"], int)
        print(f"✅ check-and-unlock returned {data['count']} new achievements")
    
    # ===========================================
    # /api/achievements/recent tests
    # ===========================================
    
    def test_recent_achievements_endpoint(self):
        """recent endpoint returns list of recent unlocks"""
        if not self.delivery_token:
            pytest.skip("Delivery login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/recent",
            headers={"Authorization": f"Bearer {self.delivery_token}"}
        )
        
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            # Verify structure of recent achievement
            item = data[0]
            assert "driver_name" in item
            assert "achievement" in item
            assert "icon" in item
            assert "unlocked_at" in item
            assert item["driver_name"] == "فهد المندوب"
            assert item["achievement"] == "أول توصيل"
            assert item["icon"] == "🚀"
        
        print(f"✅ Recent achievements returned {len(data)} items with correct structure")
    
    # ===========================================
    # Access control tests
    # ===========================================
    
    def test_customer_cannot_access_my_achievements(self):
        """Customer (buyer) cannot access achievements (403)"""
        if not self.customer_token:
            pytest.skip("Customer login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert res.status_code == 403, f"Expected 403, got {res.status_code}"
        assert "لموظفي التوصيل فقط" in res.text
        print("✅ Customer correctly denied access to achievements (403)")
    
    def test_customer_cannot_check_and_unlock(self):
        """Customer cannot call check-and-unlock (403)"""
        if not self.customer_token:
            pytest.skip("Customer login failed")
        
        res = requests.post(
            f"{BASE_URL}/api/achievements/check-and-unlock",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert res.status_code == 403, f"Expected 403, got {res.status_code}"
        print("✅ Customer cannot access check-and-unlock (403)")
    
    def test_customer_cannot_view_recent(self):
        """Customer cannot view recent achievements (403)"""
        if not self.customer_token:
            pytest.skip("Customer login failed")
        
        res = requests.get(
            f"{BASE_URL}/api/achievements/recent",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert res.status_code == 403, f"Expected 403, got {res.status_code}"
        print("✅ Customer cannot view recent achievements (403)")
    
    def test_unauthenticated_cannot_access_achievements(self):
        """Unauthenticated user gets 401"""
        res = requests.get(f"{BASE_URL}/api/achievements/my-achievements")
        
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"
        print("✅ Unauthenticated user denied (401)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
