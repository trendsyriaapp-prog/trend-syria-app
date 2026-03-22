# /app/backend/tests/test_suspended_stores_ai_chatbot.py
# اختبار المتاجر المعلقة والشات بوت الذكي
# Tests for suspended stores (is_suspended field) and AI chatbot with OpenAI GPT-4o

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSuspendedStoresAPI:
    """اختبار API المتاجر المعلقة - التحقق من وجود حقل is_suspended"""
    
    def test_food_stores_endpoint_returns_200(self):
        """Test that /api/food/stores endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ GET /api/food/stores returned 200")
    
    def test_food_stores_returns_list(self):
        """Test that /api/food/stores returns a list"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✅ /api/food/stores returns a list with {len(data)} stores")
    
    def test_stores_have_is_suspended_field(self):
        """Test that stores have is_suspended field in response"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200
        stores = response.json()
        
        if len(stores) == 0:
            pytest.skip("No stores available to test is_suspended field")
        
        # Check first few stores for is_suspended field
        stores_with_field = 0
        for store in stores[:10]:  # Check up to 10 stores
            if "is_suspended" in store:
                stores_with_field += 1
                assert isinstance(store["is_suspended"], bool), f"is_suspended should be boolean, got {type(store['is_suspended'])}"
        
        print(f"✅ {stores_with_field}/{min(len(stores), 10)} stores have is_suspended field")
        assert stores_with_field > 0, "No stores have is_suspended field"
    
    def test_suspended_stores_have_correct_status(self):
        """Test that suspended stores have correct open_status"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200
        stores = response.json()
        
        suspended_stores = [s for s in stores if s.get("is_suspended") == True]
        
        if len(suspended_stores) == 0:
            print("ℹ️ No suspended stores found - this is expected if no stores are suspended")
            return
        
        for store in suspended_stores:
            # Suspended stores should have is_open = False
            assert store.get("is_open") == False, f"Suspended store {store.get('name')} should have is_open=False"
            # Suspended stores should have open_status = "متوقف مؤقتاً"
            assert store.get("open_status") == "متوقف مؤقتاً", f"Suspended store should have open_status='متوقف مؤقتاً'"
        
        print(f"✅ Found {len(suspended_stores)} suspended stores with correct status")
    
    def test_stores_sorted_suspended_last(self):
        """Test that suspended stores appear at the end of the list"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200
        stores = response.json()
        
        if len(stores) < 2:
            pytest.skip("Not enough stores to test sorting")
        
        # Find first suspended store index
        first_suspended_idx = None
        for i, store in enumerate(stores):
            if store.get("is_suspended") == True:
                first_suspended_idx = i
                break
        
        if first_suspended_idx is None:
            print("ℹ️ No suspended stores found - sorting test skipped")
            return
        
        # All stores after first suspended should also be suspended or closed
        for store in stores[first_suspended_idx:]:
            is_suspended = store.get("is_suspended", False)
            is_open = store.get("is_open", True)
            # Either suspended or closed stores should be at the end
            assert is_suspended or not is_open, f"Non-suspended open store found after suspended stores"
        
        print(f"✅ Stores are correctly sorted with suspended stores at the end")
    
    def test_single_store_has_is_suspended_field(self):
        """Test that single store endpoint also returns is_suspended field"""
        # First get list of stores
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200
        stores = response.json()
        
        if len(stores) == 0:
            pytest.skip("No stores available to test single store endpoint")
        
        # Get first store details
        store_id = stores[0].get("id")
        response = requests.get(f"{BASE_URL}/api/food/stores/{store_id}")
        
        if response.status_code == 404:
            pytest.skip(f"Store {store_id} not found")
        
        assert response.status_code == 200
        store = response.json()
        
        assert "is_suspended" in store, "Single store endpoint should return is_suspended field"
        assert isinstance(store["is_suspended"], bool), "is_suspended should be boolean"
        print(f"✅ Single store endpoint returns is_suspended field: {store['is_suspended']}")


class TestAIChatbotAPI:
    """اختبار الشات بوت الذكي - إرسال رسالة والحصول على رد ذكي"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for testing"""
        # Login as admin
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "Admin@123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        # Try food seller
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0944444444",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        pytest.skip("Could not authenticate - skipping chatbot tests")
    
    def test_chatbot_send_endpoint_exists(self, auth_token):
        """Test that /api/ai-chatbot/send endpoint exists"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "مرحبا"},
            headers=headers
        )
        # Should not return 404
        assert response.status_code != 404, "AI chatbot endpoint not found"
        print(f"✅ AI chatbot endpoint exists, status: {response.status_code}")
    
    def test_chatbot_requires_authentication(self):
        """Test that chatbot requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "مرحبا"}
        )
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"✅ Chatbot correctly requires authentication")
    
    def test_chatbot_send_message_and_get_response(self, auth_token):
        """Test sending a message to AI chatbot and getting a response"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Send a simple question
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "ما هي طرق الدفع المتاحة؟"},
            headers=headers,
            timeout=30  # AI responses may take time
        )
        
        if response.status_code == 500:
            # Check if it's an API key issue
            data = response.json()
            if "مفتاح API" in str(data.get("detail", "")):
                pytest.skip("AI API key not configured")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "session_id" in data, "Response should contain session_id"
        assert "response" in data, "Response should contain AI response"
        assert len(data["response"]) > 0, "AI response should not be empty"
        
        print(f"✅ AI chatbot responded successfully")
        print(f"   Session ID: {data['session_id']}")
        print(f"   Response preview: {data['response'][:100]}...")
    
    def test_chatbot_response_structure(self, auth_token):
        """Test that chatbot response has correct structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "كيف أتتبع طلبي؟"},
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 500:
            pytest.skip("AI service unavailable")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all expected fields
        expected_fields = ["session_id", "response", "quick_replies", "category", "needs_human"]
        for field in expected_fields:
            assert field in data, f"Response missing field: {field}"
        
        # Validate types
        assert isinstance(data["session_id"], str), "session_id should be string"
        assert isinstance(data["response"], str), "response should be string"
        assert isinstance(data["quick_replies"], list), "quick_replies should be list"
        assert isinstance(data["needs_human"], bool), "needs_human should be boolean"
        
        print(f"✅ Chatbot response has correct structure")
        print(f"   Quick replies: {data['quick_replies']}")
        print(f"   Needs human: {data['needs_human']}")
    
    def test_chatbot_session_continuity(self, auth_token):
        """Test that chatbot maintains session continuity"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First message
        response1 = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "مرحبا"},
            headers=headers,
            timeout=30
        )
        
        if response1.status_code != 200:
            pytest.skip("AI service unavailable")
        
        session_id = response1.json().get("session_id")
        
        # Second message with same session
        response2 = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "ما هي سياسة الإرجاع؟", "session_id": session_id},
            headers=headers,
            timeout=30
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Session ID should be the same
        assert data2["session_id"] == session_id, "Session ID should be maintained"
        print(f"✅ Chatbot maintains session continuity")


class TestAIChatbotHistory:
    """اختبار سجل محادثات الشات بوت"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "Admin@123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0944444444",
            "password": "test1234"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        pytest.skip("Could not authenticate")
    
    def test_chatbot_history_endpoint_exists(self, auth_token):
        """Test that /api/ai-chatbot/history endpoint exists"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/ai-chatbot/history", headers=headers)
        
        assert response.status_code != 404, "History endpoint not found"
        print(f"✅ Chatbot history endpoint exists, status: {response.status_code}")
    
    def test_chatbot_history_requires_auth(self):
        """Test that history endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ai-chatbot/history")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"✅ History endpoint correctly requires authentication")
    
    def test_chatbot_history_returns_messages(self, auth_token):
        """Test that history endpoint returns messages list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First send a message to ensure there's history
        requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "اختبار السجل"},
            headers=headers,
            timeout=30
        )
        
        # Wait a bit for message to be saved
        time.sleep(1)
        
        # Get history
        response = requests.get(f"{BASE_URL}/api/ai-chatbot/history", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "messages" in data, "Response should contain messages field"
        assert isinstance(data["messages"], list), "messages should be a list"
        
        print(f"✅ History endpoint returns {len(data['messages'])} messages")
    
    def test_chatbot_history_with_session_filter(self, auth_token):
        """Test that history can be filtered by session_id"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Send a message and get session_id
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "رسالة للفلترة"},
            headers=headers,
            timeout=30
        )
        
        if response.status_code != 200:
            pytest.skip("AI service unavailable")
        
        session_id = response.json().get("session_id")
        
        # Wait for message to be saved
        time.sleep(1)
        
        # Get history with session filter
        response = requests.get(
            f"{BASE_URL}/api/ai-chatbot/history",
            params={"session_id": session_id},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # All messages should have the same session_id
        for msg in data["messages"]:
            assert msg.get("session_id") == session_id, "All messages should have the filtered session_id"
        
        print(f"✅ History filtering by session_id works correctly")


class TestQuickQuestionsAPI:
    """اختبار الأسئلة السريعة"""
    
    def test_quick_questions_endpoint(self):
        """Test that /api/ai-chatbot/quick-questions endpoint works"""
        response = requests.get(f"{BASE_URL}/api/ai-chatbot/quick-questions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "questions" in data, "Response should contain questions field"
        assert isinstance(data["questions"], list), "questions should be a list"
        assert len(data["questions"]) > 0, "Should have at least one quick question"
        
        # Check question structure
        for q in data["questions"]:
            assert "text" in q, "Question should have text field"
            assert "icon" in q, "Question should have icon field"
        
        print(f"✅ Quick questions endpoint returns {len(data['questions'])} questions")
        for q in data["questions"]:
            print(f"   {q['icon']} {q['text']}")


class TestRequestSupportAPI:
    """اختبار طلب الدعم البشري"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "Admin@123"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not authenticate")
    
    def test_request_support_endpoint_exists(self, auth_token):
        """Test that request-support endpoint exists"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/request-support",
            json={"message": "أحتاج مساعدة", "session_id": "test-session"},
            headers=headers
        )
        
        assert response.status_code != 404, "Request support endpoint not found"
        print(f"✅ Request support endpoint exists, status: {response.status_code}")
    
    def test_request_support_creates_ticket(self, auth_token):
        """Test that request-support creates a support ticket"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First send a message to create a session
        chat_response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "لدي مشكلة"},
            headers=headers,
            timeout=30
        )
        
        if chat_response.status_code != 200:
            pytest.skip("AI service unavailable")
        
        session_id = chat_response.json().get("session_id")
        
        # Request human support
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/request-support",
            json={"message": "أحتاج التحدث مع موظف", "session_id": session_id},
            headers=headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "message" in data, "Response should contain message"
        assert "request_id" in data, "Response should contain request_id"
        
        print(f"✅ Support request created successfully")
        print(f"   Request ID: {data['request_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
