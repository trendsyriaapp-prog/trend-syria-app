# /app/backend/tests/test_support_rating.py
# Test support rating system: rate-support, my-pending-rating, admin/rating-stats endpoints

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_PHONE = "0933333333"
CUSTOMER_PASSWORD = "user123"
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "admin123"


class TestSupportRating:
    """Support rating system endpoint tests"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CUSTOMER_PHONE,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Customer authentication failed")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture(scope="class")
    def customer_id(self, customer_token):
        """Get customer user ID"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        if response.status_code == 200:
            return response.json().get("id")
        pytest.skip("Could not get customer ID")
    
    @pytest.fixture
    def customer_headers(self, customer_token):
        return {"Authorization": f"Bearer {customer_token}"}
    
    @pytest.fixture
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}
    
    # ============== POST /api/chatbot/rate-support Tests ==============
    
    def test_rate_support_requires_auth(self):
        """Test rate-support requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/rate-support",
            json={"ticket_id": "test", "rating": 5}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ rate-support correctly requires auth (401)")
    
    def test_rate_support_validates_rating_range(self, customer_headers):
        """Test rate-support validates rating between 1-5"""
        # Test rating below 1
        response = requests.post(
            f"{BASE_URL}/api/chatbot/rate-support",
            json={"ticket_id": "test", "rating": 0},
            headers=customer_headers
        )
        assert response.status_code == 400, f"Expected 400 for rating=0, got {response.status_code}"
        
        # Test rating above 5
        response2 = requests.post(
            f"{BASE_URL}/api/chatbot/rate-support",
            json={"ticket_id": "test", "rating": 6},
            headers=customer_headers
        )
        assert response2.status_code == 400, f"Expected 400 for rating=6, got {response2.status_code}"
        
        print("✅ rate-support validates rating range (1-5)")
    
    def test_rate_support_invalid_ticket_returns_404(self, customer_headers):
        """Test rate-support returns 404 for non-existent ticket"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/rate-support",
            json={"ticket_id": "non-existent-ticket-xyz", "rating": 5},
            headers=customer_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ rate-support returns 404 for non-existent ticket")
    
    def test_rate_support_success_flow(self, customer_headers, admin_headers, customer_id):
        """Test full flow: create ticket -> resolve -> rate"""
        # Step 1: Create support request
        msg_response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "TEST_RATING: مشكلة تحتاج حل"},
            headers=customer_headers
        )
        assert msg_response.status_code == 200
        session_id = msg_response.json()["session_id"]
        
        support_response = requests.post(
            f"{BASE_URL}/api/chatbot/request-support",
            json={"message": "TEST_RATING: طلب دعم للتقييم", "session_id": session_id},
            headers=customer_headers
        )
        assert support_response.status_code == 200
        ticket_id = support_response.json()["request_id"]
        print(f"✅ Step 1: Created ticket {ticket_id}")
        
        # Step 2: Resolve the ticket (admin)
        resolve_response = requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/{ticket_id}?status=resolved",
            headers=admin_headers
        )
        assert resolve_response.status_code == 200
        print("✅ Step 2: Ticket resolved")
        
        # Step 3: Rate the ticket
        rate_response = requests.post(
            f"{BASE_URL}/api/chatbot/rate-support",
            json={
                "ticket_id": ticket_id,
                "rating": 5,
                "comment": "خدمة ممتازة! شكراً"
            },
            headers=customer_headers
        )
        assert rate_response.status_code == 200, f"Expected 200, got {rate_response.status_code}: {rate_response.text}"
        
        data = rate_response.json()
        assert "message" in data, "Response should have message"
        assert "شكراً" in data["message"], "Should thank user for rating"
        
        print("✅ Step 3: Rating submitted successfully")
        print(f"✅ Full rating flow works! Response: {data['message']}")
    
    def test_rate_support_prevents_duplicate_rating(self, customer_headers, admin_headers, customer_id):
        """Test that a ticket can only be rated once"""
        # Create and resolve a new ticket
        msg_response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "TEST_DUPLICATE: طلب اختبار تكرار التقييم"},
            headers=customer_headers
        )
        session_id = msg_response.json()["session_id"]
        
        support_response = requests.post(
            f"{BASE_URL}/api/chatbot/request-support",
            json={"message": "TEST_DUPLICATE", "session_id": session_id},
            headers=customer_headers
        )
        ticket_id = support_response.json()["request_id"]
        
        # Resolve the ticket
        requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/{ticket_id}?status=resolved",
            headers=admin_headers
        )
        
        # First rating - should succeed
        rate1 = requests.post(
            f"{BASE_URL}/api/chatbot/rate-support",
            json={"ticket_id": ticket_id, "rating": 4},
            headers=customer_headers
        )
        assert rate1.status_code == 200
        
        # Second rating - should fail
        rate2 = requests.post(
            f"{BASE_URL}/api/chatbot/rate-support",
            json={"ticket_id": ticket_id, "rating": 5},
            headers=customer_headers
        )
        assert rate2.status_code == 400, f"Expected 400 for duplicate rating, got {rate2.status_code}"
        
        print("✅ Prevents duplicate rating on same ticket")
    
    # ============== GET /api/chatbot/my-pending-rating Tests ==============
    
    def test_my_pending_rating_requires_auth(self):
        """Test my-pending-rating requires authentication"""
        response = requests.get(f"{BASE_URL}/api/chatbot/my-pending-rating")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ my-pending-rating correctly requires auth (401)")
    
    def test_my_pending_rating_returns_ticket_structure(self, customer_headers):
        """Test my-pending-rating returns correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/chatbot/my-pending-rating",
            headers=customer_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "ticket" in data, "Response should have 'ticket' field"
        # ticket can be null if no pending rating
        
        print(f"✅ my-pending-rating returns correct structure, ticket: {data['ticket'] is not None}")
    
    def test_my_pending_rating_finds_resolved_unrated_ticket(self, customer_headers, admin_headers, customer_id):
        """Test my-pending-rating finds resolved ticket without rating"""
        # Create a new support ticket
        msg_response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "TEST_PENDING: طلب اختبار pending rating"},
            headers=customer_headers
        )
        session_id = msg_response.json()["session_id"]
        
        support_response = requests.post(
            f"{BASE_URL}/api/chatbot/request-support",
            json={"message": "TEST_PENDING: طلب جديد", "session_id": session_id},
            headers=customer_headers
        )
        ticket_id = support_response.json()["request_id"]
        
        # Resolve the ticket (without rating)
        requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/{ticket_id}?status=resolved",
            headers=admin_headers
        )
        
        # Check for pending rating
        pending_response = requests.get(
            f"{BASE_URL}/api/chatbot/my-pending-rating",
            headers=customer_headers
        )
        assert pending_response.status_code == 200
        
        data = pending_response.json()
        assert data["ticket"] is not None, "Should find the resolved unrated ticket"
        assert data["ticket"]["status"] == "resolved", "Ticket should be resolved"
        assert "rating" not in data["ticket"] or data["ticket"].get("rating") is None, "Ticket should not have rating"
        
        print(f"✅ my-pending-rating correctly finds resolved unrated ticket: {data['ticket']['id']}")
        
        # Now rate it so it doesn't interfere with other tests
        requests.post(
            f"{BASE_URL}/api/chatbot/rate-support",
            json={"ticket_id": ticket_id, "rating": 3},
            headers=customer_headers
        )
    
    # ============== GET /api/chatbot/admin/rating-stats Tests ==============
    
    def test_admin_rating_stats_requires_auth(self):
        """Test admin/rating-stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/chatbot/admin/rating-stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ admin/rating-stats correctly requires auth (401)")
    
    def test_admin_rating_stats_requires_admin_role(self, customer_headers):
        """Test admin/rating-stats requires admin role"""
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/rating-stats",
            headers=customer_headers  # Customer, not admin
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ admin/rating-stats correctly requires admin role (403)")
    
    def test_admin_rating_stats_returns_correct_structure(self, admin_headers):
        """Test admin/rating-stats returns correct data structure"""
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/rating-stats",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check required fields
        assert "average_rating" in data, "Response should have 'average_rating'"
        assert "total_ratings" in data, "Response should have 'total_ratings'"
        assert "rating_distribution" in data, "Response should have 'rating_distribution'"
        assert "recent_ratings" in data, "Response should have 'recent_ratings'"
        
        # Check rating_distribution structure
        distribution = data["rating_distribution"]
        for star in [1, 2, 3, 4, 5]:
            assert star in distribution or str(star) in distribution, f"Distribution should have key {star}"
        
        # Check types
        assert isinstance(data["average_rating"], (int, float)), "average_rating should be numeric"
        assert isinstance(data["total_ratings"], int), "total_ratings should be int"
        assert isinstance(data["recent_ratings"], list), "recent_ratings should be list"
        
        print("✅ admin/rating-stats structure correct:")
        print(f"   - Average: {data['average_rating']}")
        print(f"   - Total: {data['total_ratings']}")
        print(f"   - Distribution: {data['rating_distribution']}")
        print(f"   - Recent ratings count: {len(data['recent_ratings'])}")
    
    def test_admin_rating_stats_reflects_new_rating(self, customer_headers, admin_headers, customer_id):
        """Test that admin/rating-stats updates after new rating"""
        # Get current stats
        before = requests.get(
            f"{BASE_URL}/api/chatbot/admin/rating-stats",
            headers=admin_headers
        )
        stats_before = before.json()
        total_before = stats_before["total_ratings"]
        
        # Create, resolve and rate a new ticket
        msg_response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "TEST_STATS: اختبار الإحصائيات"},
            headers=customer_headers
        )
        session_id = msg_response.json()["session_id"]
        
        support_response = requests.post(
            f"{BASE_URL}/api/chatbot/request-support",
            json={"message": "TEST_STATS", "session_id": session_id},
            headers=customer_headers
        )
        ticket_id = support_response.json()["request_id"]
        
        # Resolve
        requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/{ticket_id}?status=resolved",
            headers=admin_headers
        )
        
        # Rate with comment
        requests.post(
            f"{BASE_URL}/api/chatbot/rate-support",
            json={
                "ticket_id": ticket_id,
                "rating": 5,
                "comment": "TEST_STATS: تعليق اختبار الإحصائيات"
            },
            headers=customer_headers
        )
        
        # Get updated stats
        after = requests.get(
            f"{BASE_URL}/api/chatbot/admin/rating-stats",
            headers=admin_headers
        )
        stats_after = after.json()
        total_after = stats_after["total_ratings"]
        
        assert total_after == total_before + 1, f"Total should increase by 1, was {total_before}, now {total_after}"
        
        print(f"✅ Rating stats correctly updates: {total_before} -> {total_after}")


class TestRatingEdgeCases:
    """Edge case tests for rating system"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CUSTOMER_PHONE,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Customer authentication failed")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture
    def customer_headers(self, customer_token):
        return {"Authorization": f"Bearer {customer_token}"}
    
    def test_rate_support_without_comment(self, customer_headers, admin_token):
        """Test rating without comment (optional field)"""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create ticket
        msg = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "TEST_NO_COMMENT"},
            headers=customer_headers
        )
        session_id = msg.json()["session_id"]
        
        support = requests.post(
            f"{BASE_URL}/api/chatbot/request-support",
            json={"message": "TEST_NO_COMMENT", "session_id": session_id},
            headers=customer_headers
        )
        ticket_id = support.json()["request_id"]
        
        # Resolve
        requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/{ticket_id}?status=resolved",
            headers=admin_headers
        )
        
        # Rate without comment
        rate = requests.post(
            f"{BASE_URL}/api/chatbot/rate-support",
            json={"ticket_id": ticket_id, "rating": 4},  # No comment
            headers=customer_headers
        )
        assert rate.status_code == 200, f"Should accept rating without comment, got {rate.status_code}"
        
        print("✅ Rating without comment works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
