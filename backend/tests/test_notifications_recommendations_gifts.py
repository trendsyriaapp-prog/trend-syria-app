# /app/backend/tests/test_notifications_recommendations_gifts.py
# Tests for Firebase Push Notifications, Smart Recommendations, and Gift System
# الاختبارات للميزات الجديدة: الإشعارات، التوصيات، والهدايا

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

# Credentials
ADMIN_CREDS = {"phone": "0911111111", "password": "admin123"}
BUYER_CREDS = {"phone": "0933333333", "password": "user123"}

@pytest.fixture(scope="module")
def admin_token():
    """Get admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")

@pytest.fixture(scope="module")
def buyer_token():
    """Get buyer token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Buyer authentication failed")

@pytest.fixture(scope="module")
def sample_product_id():
    """Get a sample product ID for testing"""
    response = requests.get(f"{BASE_URL}/api/products?limit=1")
    if response.status_code == 200:
        products = response.json()
        if isinstance(products, dict):
            products = products.get("products", [])
        if products and len(products) > 0:
            return products[0]["id"]
    pytest.skip("No products available for testing")


# ============== NOTIFICATIONS API TESTS ==============

class TestNotificationsAPI:
    """Tests for Notifications and FCM Token APIs"""
    
    def test_get_notifications_unauthorized(self):
        """Test getting notifications without auth"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401
        print("✅ GET /api/notifications returns 401 without auth")
    
    def test_get_notifications_as_buyer(self, buyer_token):
        """Test getting notifications as authenticated buyer"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✅ GET /api/notifications returns {len(response.json())} notifications")
    
    def test_save_fcm_token_unauthorized(self):
        """Test saving FCM token without auth"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/fcm-token",
            json={"fcm_token": "test_token_123"}
        )
        assert response.status_code == 401
        print("✅ POST /api/notifications/fcm-token returns 401 without auth")
    
    def test_save_fcm_token_as_buyer(self, buyer_token):
        """Test saving FCM token as authenticated user"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        test_fcm_token = "TEST_FCM_TOKEN_" + str(os.urandom(8).hex())
        
        response = requests.post(
            f"{BASE_URL}/api/notifications/fcm-token",
            json={"fcm_token": test_fcm_token},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ POST /api/notifications/fcm-token: {data['message']}")
    
    def test_delete_fcm_token_as_buyer(self, buyer_token):
        """Test deleting FCM token"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.delete(
            f"{BASE_URL}/api/notifications/fcm-token",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ DELETE /api/notifications/fcm-token: {data['message']}")
    
    def test_push_test_without_token(self, buyer_token):
        """Test push notification test without registered FCM token"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.post(
            f"{BASE_URL}/api/notifications/push/test",
            headers=headers
        )
        # Should return 400 because no FCM token is registered
        assert response.status_code == 400
        print("✅ POST /api/notifications/push/test returns 400 when no FCM token registered")
    
    def test_push_stats_as_buyer(self, buyer_token):
        """Test that buyers cannot access push stats (admin only)"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(
            f"{BASE_URL}/api/notifications/push/stats",
            headers=headers
        )
        assert response.status_code == 403
        print("✅ GET /api/notifications/push/stats returns 403 for non-admin")
    
    def test_push_stats_as_admin(self, admin_token):
        """Test getting push stats as admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(
            f"{BASE_URL}/api/notifications/push/stats",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_registered_tokens" in data
        assert "recent_notifications" in data
        print(f"✅ GET /api/notifications/push/stats: {data['total_registered_tokens']} registered tokens")
    
    def test_mark_notification_read_unauthorized(self):
        """Test marking notification as read without auth"""
        response = requests.post(f"{BASE_URL}/api/notifications/test-id/read")
        assert response.status_code == 401
        print("✅ POST /api/notifications/{id}/read returns 401 without auth")
    
    def test_read_all_notifications(self, buyer_token):
        """Test marking all notifications as read"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.post(
            f"{BASE_URL}/api/notifications/read-all",
            headers=headers
        )
        assert response.status_code == 200
        print("✅ POST /api/notifications/read-all successful")


# ============== RECOMMENDATIONS API TESTS ==============

class TestRecommendationsAPI:
    """Tests for Smart Recommendations APIs"""
    
    def test_trending_products_public(self):
        """Test getting trending products (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/recommendations/trending?limit=5")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✅ GET /api/recommendations/trending returns {len(response.json())} products")
    
    def test_deals_products_public(self):
        """Test getting deals/discounts (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/recommendations/deals?limit=5")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✅ GET /api/recommendations/deals returns {len(response.json())} products")
    
    def test_personalized_recommendations_unauthorized(self):
        """Test personalized recommendations without auth"""
        response = requests.get(f"{BASE_URL}/api/recommendations/for-you")
        assert response.status_code == 401
        print("✅ GET /api/recommendations/for-you returns 401 without auth")
    
    def test_personalized_recommendations_as_buyer(self, buyer_token):
        """Test personalized recommendations as authenticated user"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(
            f"{BASE_URL}/api/recommendations/for-you?limit=5",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/recommendations/for-you returns {len(data)} personalized products")
    
    def test_similar_products(self, sample_product_id):
        """Test getting similar products for a specific product"""
        response = requests.get(
            f"{BASE_URL}/api/recommendations/similar/{sample_product_id}?limit=3"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/recommendations/similar/{sample_product_id} returns {len(data)} similar products")
    
    def test_similar_products_invalid_id(self):
        """Test similar products with invalid product ID"""
        response = requests.get(
            f"{BASE_URL}/api/recommendations/similar/invalid-product-id"
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0  # Should return empty list for invalid ID
        print("✅ GET /api/recommendations/similar/invalid returns empty list")
    
    def test_track_product_view_unauthorized(self):
        """Test tracking product view without auth"""
        response = requests.post(f"{BASE_URL}/api/recommendations/track-view/test-id")
        assert response.status_code == 401
        print("✅ POST /api/recommendations/track-view returns 401 without auth")
    
    def test_track_product_view_as_buyer(self, buyer_token, sample_product_id):
        """Test tracking product view as authenticated user"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.post(
            f"{BASE_URL}/api/recommendations/track-view/{sample_product_id}",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ POST /api/recommendations/track-view: {data['message']}")


# ============== GIFTS API TESTS ==============

class TestGiftsAPI:
    """Tests for Gift System APIs"""
    
    def test_send_gift_unauthorized(self):
        """Test sending gift without auth"""
        response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json={
                "product_id": "test-id",
                "recipient_phone": "0912345678",
                "recipient_name": "Test User"
            }
        )
        assert response.status_code == 401
        print("✅ POST /api/gifts/send returns 401 without auth")
    
    def test_send_gift_invalid_product(self, buyer_token):
        """Test sending gift with invalid product ID"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json={
                "product_id": "invalid-product-id",
                "recipient_phone": "0912345678",
                "recipient_name": "صديق"
            },
            headers=headers
        )
        assert response.status_code == 404
        print("✅ POST /api/gifts/send returns 404 for invalid product")
    
    def test_send_gift_valid(self, buyer_token, sample_product_id):
        """Test sending gift successfully"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json={
                "product_id": sample_product_id,
                "recipient_phone": "0912345678",
                "recipient_name": "صديق عزيز",
                "message": "هدية من القلب",
                "is_anonymous": False
            },
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "gift_id" in data
        assert "message" in data
        assert data["status"] == "pending"
        print(f"✅ POST /api/gifts/send: Gift sent with ID {data['gift_id']}")
        return data["gift_id"]
    
    def test_send_gift_anonymous(self, buyer_token, sample_product_id):
        """Test sending anonymous gift"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json={
                "product_id": sample_product_id,
                "recipient_phone": "0987654321",
                "recipient_name": "شخص مجهول",
                "message": "هدية مجهولة",
                "is_anonymous": True
            },
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "gift_id" in data
        print(f"✅ POST /api/gifts/send (anonymous): Gift sent with ID {data['gift_id']}")
    
    def test_get_sent_gifts_unauthorized(self):
        """Test getting sent gifts without auth"""
        response = requests.get(f"{BASE_URL}/api/gifts/sent")
        assert response.status_code == 401
        print("✅ GET /api/gifts/sent returns 401 without auth")
    
    def test_get_sent_gifts(self, buyer_token):
        """Test getting sent gifts as authenticated user"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(
            f"{BASE_URL}/api/gifts/sent",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/gifts/sent returns {len(data)} sent gifts")
        return data
    
    def test_get_received_gifts_unauthorized(self):
        """Test getting received gifts without auth"""
        response = requests.get(f"{BASE_URL}/api/gifts/received")
        assert response.status_code == 401
        print("✅ GET /api/gifts/received returns 401 without auth")
    
    def test_get_received_gifts(self, buyer_token):
        """Test getting received gifts as authenticated user"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.get(
            f"{BASE_URL}/api/gifts/received",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/gifts/received returns {len(data)} received gifts")
    
    def test_accept_gift_invalid_id(self, buyer_token):
        """Test accepting gift with invalid ID"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.post(
            f"{BASE_URL}/api/gifts/invalid-gift-id/accept",
            headers=headers
        )
        assert response.status_code == 404
        print("✅ POST /api/gifts/{invalid}/accept returns 404")
    
    def test_reject_gift_invalid_id(self, buyer_token):
        """Test rejecting gift with invalid ID"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.post(
            f"{BASE_URL}/api/gifts/invalid-gift-id/reject",
            headers=headers
        )
        assert response.status_code == 404
        print("✅ POST /api/gifts/{invalid}/reject returns 404")


# ============== PUSH SEND API (ADMIN) ==============

class TestAdminPushSend:
    """Tests for admin push notification sending"""
    
    def test_push_send_unauthorized(self):
        """Test sending push without auth"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/push/send",
            json={
                "title": "Test",
                "body": "Test notification"
            }
        )
        assert response.status_code == 401
        print("✅ POST /api/notifications/push/send returns 401 without auth")
    
    def test_push_send_as_buyer(self, buyer_token):
        """Test that buyers cannot send push notifications"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        response = requests.post(
            f"{BASE_URL}/api/notifications/push/send",
            json={
                "title": "Test",
                "body": "Test notification"
            },
            headers=headers
        )
        assert response.status_code == 403
        print("✅ POST /api/notifications/push/send returns 403 for non-admin")
    
    def test_push_send_as_admin_no_tokens(self, admin_token):
        """Test sending push notification as admin (may have no tokens)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(
            f"{BASE_URL}/api/notifications/push/send",
            json={
                "title": "اختبار الإشعارات",
                "body": "هذا إشعار تجريبي",
                "target": "all"
            },
            headers=headers
        )
        # Should succeed even if no tokens (returns message about no tokens)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "total" in data
        print(f"✅ POST /api/notifications/push/send: {data['message']} (total: {data['total']})")


# ============== INTEGRATION TEST ==============

class TestGiftIntegration:
    """Integration test for gift workflow"""
    
    def test_gift_workflow(self, buyer_token, sample_product_id):
        """Test complete gift send workflow"""
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Step 1: Send a gift
        send_response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json={
                "product_id": sample_product_id,
                "recipient_phone": "0999888777",
                "recipient_name": "اختبار التكامل",
                "message": "رسالة اختبار التكامل",
                "is_anonymous": False
            },
            headers=headers
        )
        assert send_response.status_code == 200
        gift_id = send_response.json()["gift_id"]
        print(f"✅ Gift created: {gift_id}")
        
        # Step 2: Verify it appears in sent gifts
        sent_response = requests.get(
            f"{BASE_URL}/api/gifts/sent",
            headers=headers
        )
        assert sent_response.status_code == 200
        sent_gifts = sent_response.json()
        gift_found = any(g["id"] == gift_id for g in sent_gifts)
        assert gift_found, "Gift should appear in sent gifts"
        print(f"✅ Gift verified in sent gifts list")
        
        # Step 3: Verify gift details
        for gift in sent_gifts:
            if gift["id"] == gift_id:
                assert gift["status"] == "pending"
                assert gift["recipient_name"] == "اختبار التكامل"
                assert gift["product_id"] == sample_product_id
                print(f"✅ Gift details verified: status={gift['status']}, recipient={gift['recipient_name']}")
                break


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
