# /app/backend/tests/test_ai_chatbot.py
# AI Chatbot API Tests - Testing emergentintegrations LLM integration
# Tests: send message, quick questions, session continuity, Arabic responses

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIChatbotQuickQuestions:
    """Test GET /api/ai-chatbot/quick-questions endpoint"""
    
    def test_get_quick_questions_success(self):
        """Test fetching quick questions returns expected structure"""
        response = requests.get(f"{BASE_URL}/api/ai-chatbot/quick-questions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "questions" in data, "Response should contain 'questions' key"
        assert isinstance(data["questions"], list), "Questions should be a list"
        assert len(data["questions"]) > 0, "Should have at least one question"
        
        # Verify question structure
        first_question = data["questions"][0]
        assert "text" in first_question, "Question should have 'text' field"
        assert "icon" in first_question, "Question should have 'icon' field"
        
        print(f"✅ Quick questions returned {len(data['questions'])} questions")


class TestAIChatbotSendMessage:
    """Test POST /api/ai-chatbot/send endpoint"""
    
    def test_send_message_hello(self):
        """Test sending 'مرحبا' message and getting AI response"""
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "مرحبا", "session_id": None},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_id" in data, "Response should contain 'session_id'"
        assert "response" in data, "Response should contain 'response'"
        assert "quick_replies" in data, "Response should contain 'quick_replies'"
        assert "category" in data, "Response should contain 'category'"
        
        # Verify AI responded in Arabic
        assert len(data["response"]) > 0, "AI response should not be empty"
        
        print(f"✅ AI responded to 'مرحبا': {data['response'][:100]}...")
        return data["session_id"]
    
    def test_send_message_track_order(self):
        """Test asking about order tracking"""
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "كيف أتتبع طلبي", "session_id": None},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0
        
        # Check if response mentions tracking-related keywords
        response_text = data["response"]
        tracking_keywords = ["طلب", "تتبع", "طلباتي", "حالة"]
        has_tracking_keyword = any(kw in response_text for kw in tracking_keywords)
        assert has_tracking_keyword, f"Response should mention tracking: {response_text[:200]}"
        
        print("✅ AI responded to order tracking question")
    
    def test_send_message_return_product(self):
        """Test asking about product return"""
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "كيف أرجع منتج", "session_id": None},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0
        
        # Check if response mentions return-related keywords
        response_text = data["response"]
        return_keywords = ["إرجاع", "رجع", "تسليم", "سائق"]
        has_return_keyword = any(kw in response_text for kw in return_keywords)
        assert has_return_keyword, f"Response should mention return policy: {response_text[:200]}"
        
        print("✅ AI responded to return product question")
    
    def test_send_message_payment_methods(self):
        """Test asking about payment methods"""
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "طرق الدفع", "session_id": None},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "response" in data
        assert len(data["response"]) > 0
        
        # Check if response mentions payment-related keywords
        response_text = data["response"]
        payment_keywords = ["دفع", "محفظة", "شام كاش", "كاش"]
        has_payment_keyword = any(kw in response_text for kw in payment_keywords)
        assert has_payment_keyword, f"Response should mention payment methods: {response_text[:200]}"
        
        print("✅ AI responded to payment methods question")


class TestAIChatbotSessionContinuity:
    """Test session continuity - multiple messages in same session"""
    
    def test_session_continuity(self):
        """Test that session_id is maintained across messages"""
        # First message - create session
        response1 = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "مرحبا", "session_id": None},
            headers={"Content-Type": "application/json"}
        )
        
        assert response1.status_code == 200
        data1 = response1.json()
        session_id = data1["session_id"]
        assert session_id is not None, "Session ID should be created"
        
        # Wait a bit for AI processing
        time.sleep(1)
        
        # Second message - use same session
        response2 = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "كيف أتتبع طلبي", "session_id": session_id},
            headers={"Content-Type": "application/json"}
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["session_id"] == session_id, "Session ID should be maintained"
        
        # Wait a bit
        time.sleep(1)
        
        # Third message - continue session
        response3 = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "شكرا", "session_id": session_id},
            headers={"Content-Type": "application/json"}
        )
        
        assert response3.status_code == 200
        data3 = response3.json()
        assert data3["session_id"] == session_id, "Session ID should still be maintained"
        
        print(f"✅ Session continuity verified across 3 messages with session: {session_id}")


class TestAIChatbotResponseStructure:
    """Test response structure and fields"""
    
    def test_response_has_all_required_fields(self):
        """Test that response contains all required fields"""
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "مرحبا", "session_id": None},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["session_id", "response", "quick_replies", "category", "needs_human"]
        for field in required_fields:
            assert field in data, f"Response should contain '{field}' field"
        
        # Verify types
        assert isinstance(data["session_id"], str), "session_id should be string"
        assert isinstance(data["response"], str), "response should be string"
        assert isinstance(data["quick_replies"], list), "quick_replies should be list"
        assert isinstance(data["category"], str), "category should be string"
        assert isinstance(data["needs_human"], bool), "needs_human should be boolean"
        
        print("✅ Response structure verified with all required fields")
    
    def test_quick_replies_are_strings(self):
        """Test that quick_replies are list of strings"""
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "أين طلبي", "session_id": None},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "quick_replies" in data
        assert isinstance(data["quick_replies"], list)
        
        for reply in data["quick_replies"]:
            assert isinstance(reply, str), f"Quick reply should be string, got {type(reply)}"
        
        print(f"✅ Quick replies verified: {data['quick_replies']}")


class TestAIChatbotArabicResponses:
    """Test that AI responds in Arabic"""
    
    def test_response_is_in_arabic(self):
        """Test that AI response contains Arabic characters"""
        response = requests.post(
            f"{BASE_URL}/api/ai-chatbot/send",
            json={"message": "ما هي ساعات العمل", "session_id": None},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        response_text = data["response"]
        
        # Check for Arabic characters (Unicode range for Arabic)
        arabic_chars = [c for c in response_text if '\u0600' <= c <= '\u06FF']
        assert len(arabic_chars) > 0, f"Response should contain Arabic characters: {response_text[:100]}"
        
        print(f"✅ AI response is in Arabic with {len(arabic_chars)} Arabic characters")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
