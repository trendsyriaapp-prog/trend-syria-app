# /app/backend/tests/test_chatbot_support_flow.py
# Test full chatbot support flow: user sends message -> requests support -> admin replies -> reply appears for user
# Also tests check-replies endpoint for polling

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_PHONE = "0933333333"
CUSTOMER_PASSWORD = "user123"
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "admin123"


class TestChatbotSupportFlow:
    """Complete chatbot support flow tests including admin reply and check-replies"""
    
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
    
    # ============== Check-Replies Endpoint ==============
    
    def test_check_replies_endpoint_exists(self, customer_headers):
        """Test GET /api/chatbot/check-replies/{session_id} endpoint exists"""
        # First create a session by sending a message
        msg_response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "مرحبا"},
            headers=customer_headers
        )
        assert msg_response.status_code == 200
        session_id = msg_response.json()["session_id"]
        
        # Now check replies endpoint
        response = requests.get(
            f"{BASE_URL}/api/chatbot/check-replies/{session_id}?last_count=0",
            headers=customer_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "has_new" in data, "Response should have 'has_new' field"
        assert "new_messages" in data, "Response should have 'new_messages' field"
        assert "total_count" in data, "Response should have 'total_count' field"
        
        print(f"✅ Check-replies endpoint works, total_count: {data['total_count']}")
    
    def test_check_replies_returns_correct_counts(self, customer_headers):
        """Test check-replies returns correct message counts"""
        # Send 2 messages to create a session with known count
        msg1 = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "سؤال أول"},
            headers=customer_headers
        )
        session_id = msg1.json()["session_id"]
        
        msg2 = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "سؤال ثاني", "session_id": session_id},
            headers=customer_headers
        )
        
        # Check replies - should have 4 messages (2 user + 2 bot)
        response = requests.get(
            f"{BASE_URL}/api/chatbot/check-replies/{session_id}?last_count=0",
            headers=customer_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["total_count"] >= 4, f"Expected at least 4 messages, got {data['total_count']}"
        assert data["has_new"] == True, "Should have new messages when last_count=0"
        
        print(f"✅ Check-replies count accurate: {data['total_count']} messages")
    
    def test_check_replies_no_new_when_caught_up(self, customer_headers):
        """Test check-replies returns has_new=False when last_count equals total"""
        msg_response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "رسالة اختبار"},
            headers=customer_headers
        )
        session_id = msg_response.json()["session_id"]
        
        # Get total count first
        first_check = requests.get(
            f"{BASE_URL}/api/chatbot/check-replies/{session_id}?last_count=0",
            headers=customer_headers
        )
        total = first_check.json()["total_count"]
        
        # Check with last_count = total
        second_check = requests.get(
            f"{BASE_URL}/api/chatbot/check-replies/{session_id}?last_count={total}",
            headers=customer_headers
        )
        assert second_check.status_code == 200
        
        data = second_check.json()
        assert data["has_new"] == False, "Should have no new messages when caught up"
        assert len(data["new_messages"]) == 0, "new_messages should be empty"
        
        print(f"✅ Check-replies correctly returns has_new=False when caught up")
    
    def test_check_replies_requires_auth(self):
        """Test check-replies requires authentication"""
        response = requests.get(f"{BASE_URL}/api/chatbot/check-replies/test-session?last_count=0")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print(f"✅ Check-replies correctly requires auth (401)")
    
    # ============== Admin Reply Endpoint ==============
    
    def test_admin_reply_endpoint_exists(self, customer_headers, admin_headers, customer_id):
        """Test POST /api/chatbot/admin/reply endpoint exists"""
        # Create a support request first
        msg_response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "أحتاج مساعدة"},
            headers=customer_headers
        )
        session_id = msg_response.json()["session_id"]
        
        support_response = requests.post(
            f"{BASE_URL}/api/chatbot/request-support",
            json={"message": "مشكلة تحتاج دعم بشري", "session_id": session_id},
            headers=customer_headers
        )
        assert support_response.status_code == 200
        ticket_id = support_response.json()["request_id"]
        
        # Admin sends reply
        reply_response = requests.post(
            f"{BASE_URL}/api/chatbot/admin/reply",
            json={
                "ticket_id": ticket_id,
                "user_id": customer_id,
                "message": "مرحباً، فريق الدعم هنا. كيف يمكننا مساعدتك؟"
            },
            headers=admin_headers
        )
        assert reply_response.status_code == 200, f"Expected 200, got {reply_response.status_code}: {reply_response.text}"
        
        data = reply_response.json()
        assert "message" in data, "Response should have confirmation message"
        
        print(f"✅ Admin reply sent successfully")
    
    def test_admin_reply_requires_admin_role(self, customer_headers, customer_id):
        """Test admin reply requires admin/sub_admin role"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/admin/reply",
            json={
                "ticket_id": "fake-ticket",
                "user_id": customer_id,
                "message": "test"
            },
            headers=customer_headers  # Using customer token, not admin
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print(f"✅ Admin reply correctly requires admin role (403 for customer)")
    
    def test_admin_reply_requires_auth(self):
        """Test admin reply requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/admin/reply",
            json={
                "ticket_id": "fake-ticket",
                "user_id": "fake-user",
                "message": "test"
            }
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print(f"✅ Admin reply correctly requires auth (401)")
    
    def test_admin_reply_invalid_ticket_returns_404(self, admin_headers):
        """Test admin reply with non-existent ticket returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/admin/reply",
            json={
                "ticket_id": "non-existent-ticket-id",
                "user_id": "some-user-id",
                "message": "test reply"
            },
            headers=admin_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print(f"✅ Admin reply correctly returns 404 for non-existent ticket")
    
    # ============== Full Support Flow Integration Test ==============
    
    def test_full_support_flow_admin_reply_appears_in_chat(self, customer_headers, admin_headers, customer_id):
        """Test complete flow: user message -> support request -> admin reply -> reply appears in check-replies"""
        
        # Step 1: Customer sends a message
        msg_response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "لدي مشكلة في طلبي"},
            headers=customer_headers
        )
        assert msg_response.status_code == 200
        session_id = msg_response.json()["session_id"]
        print(f"✅ Step 1: Customer sent message, session_id: {session_id}")
        
        # Step 2: Customer requests human support
        support_response = requests.post(
            f"{BASE_URL}/api/chatbot/request-support",
            json={"message": "أريد التحدث مع موظف الدعم", "session_id": session_id},
            headers=customer_headers
        )
        assert support_response.status_code == 200
        ticket_id = support_response.json()["request_id"]
        print(f"✅ Step 2: Support request created, ticket_id: {ticket_id}")
        
        # Step 3: Get current message count
        before_reply = requests.get(
            f"{BASE_URL}/api/chatbot/check-replies/{session_id}?last_count=0",
            headers=customer_headers
        )
        assert before_reply.status_code == 200
        count_before = before_reply.json()["total_count"]
        print(f"✅ Step 3: Message count before admin reply: {count_before}")
        
        # Step 4: Admin sends reply
        admin_reply_response = requests.post(
            f"{BASE_URL}/api/chatbot/admin/reply",
            json={
                "ticket_id": ticket_id,
                "user_id": customer_id,
                "message": "مرحباً، هذا رد من فريق الدعم الفني. سنساعدك في حل مشكلتك."
            },
            headers=admin_headers
        )
        assert admin_reply_response.status_code == 200
        print(f"✅ Step 4: Admin reply sent")
        
        # Step 5: Check if admin reply appears in chat messages
        after_reply = requests.get(
            f"{BASE_URL}/api/chatbot/check-replies/{session_id}?last_count={count_before}",
            headers=customer_headers
        )
        assert after_reply.status_code == 200
        data = after_reply.json()
        
        # Verify new message appeared
        assert data["has_new"] == True, "Should have new messages after admin reply"
        assert data["total_count"] > count_before, f"Count should increase after reply, was {count_before}, now {data['total_count']}"
        
        # Verify admin reply is in new messages
        new_messages = data["new_messages"]
        support_messages = [m for m in new_messages if m.get("sender") == "support"]
        assert len(support_messages) > 0, "Should have support message in new_messages"
        
        # Verify message content
        support_msg = support_messages[0]
        assert "رد من فريق الدعم" in support_msg["message"], "Support message should contain admin reply text"
        
        print(f"✅ Step 5: Admin reply appears in check-replies!")
        print(f"✅ FULL FLOW TEST PASSED: User -> Support Request -> Admin Reply -> Reply visible to User")


class TestChatbotHistory:
    """Test chat history endpoint"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CUSTOMER_PHONE,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Customer authentication failed")
    
    @pytest.fixture
    def customer_headers(self, customer_token):
        return {"Authorization": f"Bearer {customer_token}"}
    
    def test_chat_history_endpoint(self, customer_headers):
        """Test GET /api/chatbot/history endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/chatbot/history",
            headers=customer_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "messages" in data, "Response should have 'messages' field"
        
        print(f"✅ Chat history works, {len(data['messages'])} messages found")
    
    def test_chat_history_with_session_filter(self, customer_headers):
        """Test chat history filtered by session_id"""
        # Create a message to get session
        msg = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "test history"},
            headers=customer_headers
        )
        session_id = msg.json()["session_id"]
        
        # Get history for this session
        response = requests.get(
            f"{BASE_URL}/api/chatbot/history?session_id={session_id}",
            headers=customer_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # All messages should be from this session
        for msg in data["messages"]:
            assert msg["session_id"] == session_id, "All messages should have same session_id"
        
        print(f"✅ Chat history filter by session works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
