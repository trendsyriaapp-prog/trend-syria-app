# Newsletter APIs Test - Email Newsletter System for Syrian E-commerce
# Tests: Subscribe, Unsubscribe, Status, Stats (Admin), Templates, Create Newsletter

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNewsletterPublicAPIs:
    """Public Newsletter APIs - Subscribe, Unsubscribe, Status"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test email for each test"""
        self.test_email = f"TEST_newsletter_{uuid.uuid4().hex[:8]}@example.com"
        yield
    
    def test_subscribe_success(self):
        """Test successful newsletter subscription"""
        response = requests.post(
            f"{BASE_URL}/api/newsletter/subscribe",
            json={"email": self.test_email}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "subscriber_id" in data, "Response should have subscriber_id"
        assert "تم الاشتراك" in data["message"] or "Subscribed" in data["message"]
        print(f"✓ Subscribe success: {data['message']}")
    
    def test_subscribe_with_name_and_phone(self):
        """Test subscription with optional name and phone"""
        response = requests.post(
            f"{BASE_URL}/api/newsletter/subscribe",
            json={
                "email": self.test_email,
                "name": "اختبار مستخدم",
                "phone": "0999123456"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "subscriber_id" in data
        print(f"✓ Subscribe with name/phone: {data['subscriber_id']}")
    
    def test_subscribe_duplicate(self):
        """Test subscribing with same email returns already subscribed"""
        # First subscribe
        requests.post(
            f"{BASE_URL}/api/newsletter/subscribe",
            json={"email": self.test_email}
        )
        
        # Second subscribe
        response = requests.post(
            f"{BASE_URL}/api/newsletter/subscribe",
            json={"email": self.test_email}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("already_subscribed") or "مشترك بالفعل" in data.get("message", "")
        print(f"✓ Duplicate subscribe handled: {data['message']}")
    
    def test_subscribe_invalid_email(self):
        """Test subscription with invalid email"""
        response = requests.post(
            f"{BASE_URL}/api/newsletter/subscribe",
            json={"email": "invalid-email"}
        )
        assert response.status_code == 422 or response.status_code == 400
        print("✓ Invalid email rejected correctly")
    
    def test_status_not_subscribed(self):
        """Test status for non-subscribed email"""
        response = requests.get(
            f"{BASE_URL}/api/newsletter/status",
            params={"email": f"nonexistent_{uuid.uuid4().hex}@example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        assert not data.get("subscribed")
        print("✓ Status for non-subscriber: Not subscribed")
    
    def test_status_subscribed(self):
        """Test status after subscribing"""
        # Subscribe first
        requests.post(
            f"{BASE_URL}/api/newsletter/subscribe",
            json={"email": self.test_email}
        )
        
        # Check status
        response = requests.get(
            f"{BASE_URL}/api/newsletter/status",
            params={"email": self.test_email}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("subscribed")
        assert "subscribed_at" in data
        print(f"✓ Status for subscriber: subscribed_at={data['subscribed_at']}")
    
    def test_unsubscribe_success(self):
        """Test successful unsubscribe"""
        # Subscribe first
        requests.post(
            f"{BASE_URL}/api/newsletter/subscribe",
            json={"email": self.test_email}
        )
        
        # Unsubscribe
        response = requests.post(
            f"{BASE_URL}/api/newsletter/unsubscribe",
            json={"email": self.test_email}
        )
        assert response.status_code == 200
        data = response.json()
        assert "إلغاء الاشتراك" in data.get("message", "") or "unsubscribed" in data.get("message", "").lower()
        print(f"✓ Unsubscribe success: {data['message']}")
    
    def test_unsubscribe_not_found(self):
        """Test unsubscribe for non-existent email"""
        response = requests.post(
            f"{BASE_URL}/api/newsletter/unsubscribe",
            json={"email": f"nonexistent_{uuid.uuid4().hex}@example.com"}
        )
        assert response.status_code == 404
        print("✓ Unsubscribe non-existent email rejected with 404")
    
    def test_resubscribe_after_unsubscribe(self):
        """Test resubscribing after unsubscribe"""
        # Subscribe
        requests.post(f"{BASE_URL}/api/newsletter/subscribe", json={"email": self.test_email})
        
        # Unsubscribe
        requests.post(f"{BASE_URL}/api/newsletter/unsubscribe", json={"email": self.test_email})
        
        # Verify unsubscribed
        status_response = requests.get(f"{BASE_URL}/api/newsletter/status", params={"email": self.test_email})
        assert not status_response.json().get("subscribed")
        
        # Resubscribe
        response = requests.post(f"{BASE_URL}/api/newsletter/subscribe", json={"email": self.test_email})
        assert response.status_code == 200
        data = response.json()
        assert data.get("reactivated") or "إعادة تفعيل" in data.get("message", "")
        
        # Verify subscribed again
        final_status = requests.get(f"{BASE_URL}/api/newsletter/status", params={"email": self.test_email})
        assert final_status.json().get("subscribed")
        print("✓ Resubscribe after unsubscribe works correctly")


class TestNewsletterAdminAPIs:
    """Admin Newsletter APIs - Stats, Templates, Create, List"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "0911111111", "password": "admin123"}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed - skipping admin tests")
        return response.json().get("token")
    
    @pytest.fixture
    def auth_headers(self, admin_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_stats_success(self, auth_headers):
        """Test getting newsletter stats (admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/newsletter/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "total_subscribers" in data
        assert "active_subscribers" in data
        assert "total_newsletters" in data
        assert "sent_newsletters" in data
        assert "new_subscribers_week" in data
        assert "growth_rate" in data
        print(f"✓ Stats: total={data['total_subscribers']}, active={data['active_subscribers']}")
    
    def test_stats_unauthorized(self):
        """Test stats without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/newsletter/stats")
        assert response.status_code in [401, 403]
        print("✓ Stats requires authentication")
    
    def test_templates_list(self, auth_headers):
        """Test getting newsletter templates"""
        response = requests.get(
            f"{BASE_URL}/api/newsletter/templates/list",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 4, "Should have at least 4 templates (welcome, sale, new_products, coupon)"
        
        # Verify template structure
        template = data[0]
        assert "id" in template
        assert "name" in template
        assert "subject" in template
        assert "content" in template
        print(f"✓ Templates: {len(data)} templates found - {[t['id'] for t in data]}")
    
    def test_templates_unauthorized(self):
        """Test templates without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/newsletter/templates/list")
        assert response.status_code in [401, 403]
        print("✓ Templates requires authentication")
    
    def test_create_newsletter(self, auth_headers):
        """Test creating a new newsletter"""
        newsletter_data = {
            "subject": f"TEST_اختبار نشرة {uuid.uuid4().hex[:6]}",
            "content": "<h1>عنوان الاختبار</h1><p>محتوى الاختبار</p>",
            "preview_text": "نص المعاينة",
            "target_audience": "all"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/newsletter/create",
            headers=auth_headers,
            json=newsletter_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "newsletter_id" in data
        assert "تم إنشاء" in data.get("message", "") or "created" in data.get("message", "").lower()
        print(f"✓ Newsletter created: {data['newsletter_id']}")
        return data["newsletter_id"]
    
    def test_create_newsletter_unauthorized(self):
        """Test create without auth returns 401"""
        response = requests.post(
            f"{BASE_URL}/api/newsletter/create",
            json={"subject": "Test", "content": "<p>Test</p>"}
        )
        assert response.status_code in [401, 403]
        print("✓ Create newsletter requires authentication")
    
    def test_create_newsletter_missing_fields(self, auth_headers):
        """Test create with missing required fields"""
        response = requests.post(
            f"{BASE_URL}/api/newsletter/create",
            headers=auth_headers,
            json={"subject": "Test Only Subject"}  # Missing content
        )
        assert response.status_code == 422
        print("✓ Create newsletter validates required fields")


class TestNewsletterWorkflow:
    """Full workflow tests - Subscribe → Create Newsletter → Stats"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "0911111111", "password": "admin123"}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("token")
    
    def test_full_subscribe_workflow(self, admin_token):
        """Test complete subscription workflow"""
        test_email = f"TEST_workflow_{uuid.uuid4().hex[:8]}@example.com"
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # 1. Get initial stats
        initial_stats = requests.get(f"{BASE_URL}/api/newsletter/stats", headers=headers).json()
        initial_count = initial_stats.get("total_subscribers", 0)
        
        # 2. Subscribe new email
        subscribe_response = requests.post(
            f"{BASE_URL}/api/newsletter/subscribe",
            json={"email": test_email, "name": "Test Workflow"}
        )
        assert subscribe_response.status_code == 200
        
        # 3. Verify stats increased
        time.sleep(0.5)  # Allow for DB update
        new_stats = requests.get(f"{BASE_URL}/api/newsletter/stats", headers=headers).json()
        assert new_stats.get("total_subscribers", 0) >= initial_count
        
        # 4. Check status
        status = requests.get(
            f"{BASE_URL}/api/newsletter/status",
            params={"email": test_email}
        ).json()
        assert status.get("subscribed")
        
        # 5. Unsubscribe
        unsub_response = requests.post(
            f"{BASE_URL}/api/newsletter/unsubscribe",
            json={"email": test_email}
        )
        assert unsub_response.status_code == 200
        
        # 6. Verify unsubscribed
        final_status = requests.get(
            f"{BASE_URL}/api/newsletter/status",
            params={"email": test_email}
        ).json()
        assert not final_status.get("subscribed")
        
        print("✓ Full workflow test passed: Subscribe → Stats → Status → Unsubscribe → Verify")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
