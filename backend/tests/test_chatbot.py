# /app/backend/tests/test_chatbot.py
# Test chatbot API endpoints - FAQ responses, quick questions, human support request

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_PHONE = "0933333333"
CUSTOMER_PASSWORD = "user123"


class TestChatbotAPI:
    """Chatbot API endpoint tests"""
    
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
    
    @pytest.fixture
    def auth_headers(self, customer_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {customer_token}"}
    
    # ============== Quick Questions API ==============
    
    def test_get_quick_questions(self):
        """Test GET /api/chatbot/quick-questions - should return questions list"""
        response = requests.get(f"{BASE_URL}/api/chatbot/quick-questions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "questions" in data, "Response should have 'questions' field"
        assert len(data["questions"]) > 0, "Should have at least one question"
        
        # Check structure of questions
        for q in data["questions"]:
            assert "text" in q, "Each question should have 'text'"
            assert "icon" in q, "Each question should have 'icon'"
        
        print(f"✅ Quick questions returned: {len(data['questions'])} questions")
    
    def test_quick_questions_include_expected_items(self):
        """Test that quick questions include expected FAQ items"""
        response = requests.get(f"{BASE_URL}/api/chatbot/quick-questions")
        assert response.status_code == 200
        
        data = response.json()
        question_texts = [q["text"] for q in data["questions"]]
        
        # Check for expected questions
        expected_topics = ["أين طلبي؟", "طرق الدفع", "تكلفة الشحن"]
        for topic in expected_topics:
            assert topic in question_texts, f"Missing expected question: {topic}"
        
        print(f"✅ Found expected FAQ topics: {expected_topics}")
    
    # ============== Send Message API (Authenticated) ==============
    
    def test_send_message_order_tracking(self, auth_headers):
        """Test POST /api/chatbot/send - order tracking question"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "أين طلبي؟"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "response" in data, "Response should have 'response' field"
        assert "session_id" in data, "Response should have 'session_id' field"
        assert "quick_replies" in data, "Response should have 'quick_replies' field"
        assert "category" in data, "Response should have 'category' field"
        
        # Should get order-related response
        assert data["category"] == "orders", f"Expected category 'orders', got '{data['category']}'"
        assert "تتبع" in data["response"] or "طلب" in data["response"], "Response should mention order tracking"
        
        print(f"✅ Order tracking response category: {data['category']}")
        print(f"✅ Quick replies: {data['quick_replies']}")
    
    def test_send_message_returns_response(self, auth_headers):
        """Test POST /api/chatbot/send - returns FAQ response for returns question"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "كيف أرجع منتج؟"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["category"] == "returns", f"Expected 'returns', got '{data['category']}'"
        assert "إرجاع" in data["response"], "Response should mention returns"
        
        print(f"✅ Returns question - category: {data['category']}")
    
    def test_send_message_payment_methods(self, auth_headers):
        """Test POST /api/chatbot/send - payment methods question"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "طرق الدفع"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["category"] == "payment", f"Expected 'payment', got '{data['category']}'"
        assert "الدفع" in data["response"], "Response should mention payment"
        
        print(f"✅ Payment question - category: {data['category']}")
    
    def test_send_message_shipping_cost(self, auth_headers):
        """Test POST /api/chatbot/send - shipping cost question"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "تكلفة الشحن"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["category"] == "shipping", f"Expected 'shipping', got '{data['category']}'"
        
        print(f"✅ Shipping question - category: {data['category']}")
    
    def test_send_message_become_seller(self, auth_headers):
        """Test POST /api/chatbot/send - become seller question"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "كيف اصبح بائع"},  # Match exact pattern without alif
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["category"] == "seller", f"Expected 'seller', got '{data['category']}'"
        
        print(f"✅ Seller question - category: {data['category']}")
    
    def test_send_message_become_driver(self, auth_headers):
        """Test POST /api/chatbot/send - become driver question"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "كيف اصبح سائق"},  # Match exact pattern without alif
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["category"] == "delivery", f"Expected 'delivery', got '{data['category']}'"
        
        print(f"✅ Delivery question - category: {data['category']}")
    
    def test_send_message_unknown_triggers_needs_human(self, auth_headers):
        """Test unknown question triggers needs_human flag"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "هذا سؤال غير معروف تماماً xyz123"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "needs_human" in data, "Response should have 'needs_human' field"
        assert data["needs_human"] == True, "Unknown question should trigger needs_human=True"
        assert data["category"] == "unknown", "Unknown question should have category 'unknown'"
        
        print(f"✅ Unknown question correctly triggers needs_human=True")
    
    def test_send_message_greeting(self, auth_headers):
        """Test greeting message gets friendly response"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "السلام عليكم"},
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["category"] == "greeting", f"Expected 'greeting', got '{data['category']}'"
        assert "أهلاً" in data["response"] or "مرحبا" in data["response"].lower(), "Greeting should be welcoming"
        
        print(f"✅ Greeting response works")
    
    def test_send_message_session_persistence(self, auth_headers):
        """Test session_id is returned and can be reused"""
        # First message
        response1 = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "مرحبا"},
            headers=auth_headers
        )
        assert response1.status_code == 200
        session_id = response1.json()["session_id"]
        assert session_id is not None, "Should return session_id"
        
        # Second message with same session
        response2 = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "أين طلبي؟", "session_id": session_id},
            headers=auth_headers
        )
        assert response2.status_code == 200
        assert response2.json()["session_id"] == session_id, "Session should persist"
        
        print(f"✅ Session persistence works")
    
    # ============== Request Human Support API ==============
    
    def test_request_support_requires_session(self, auth_headers):
        """Test request support requires session_id"""
        # First get a session
        msg_response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "مشكلة"},
            headers=auth_headers
        )
        session_id = msg_response.json()["session_id"]
        
        # Request support
        response = requests.post(
            f"{BASE_URL}/api/chatbot/request-support",
            json={"message": "أحتاج مساعدة بشرية", "session_id": session_id},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        assert "request_id" in data, "Response should have request_id"
        
        print(f"✅ Request support successful, request_id: {data['request_id']}")
    
    # ============== Authentication Tests ==============
    
    def test_send_message_requires_auth(self):
        """Test /api/chatbot/send requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/send",
            json={"message": "test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print(f"✅ Send message correctly requires auth (401)")
    
    def test_request_support_requires_auth(self):
        """Test /api/chatbot/request-support requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/chatbot/request-support",
            json={"message": "test", "session_id": "test-session"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print(f"✅ Request support correctly requires auth (401)")
    
    def test_quick_questions_no_auth_required(self):
        """Test /api/chatbot/quick-questions does NOT require auth"""
        response = requests.get(f"{BASE_URL}/api/chatbot/quick-questions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        print(f"✅ Quick questions accessible without auth (public endpoint)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
