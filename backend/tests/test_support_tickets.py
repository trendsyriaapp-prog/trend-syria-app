# /app/backend/tests/test_support_tickets.py
# Test cases for Admin Support Tickets management feature

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

class TestSupportTicketsAdmin:
    """Tests for admin support tickets management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin authentication"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "0911111111", "password": "admin123"}
        )
        assert login_response.status_code == 200
        self.admin_token = login_response.json()["token"]
        self.headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_support_requests_returns_list_and_stats(self):
        """GET /api/chatbot/admin/support-requests returns requests list and stats"""
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/support-requests",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "requests" in data
        assert "stats" in data
        assert isinstance(data["requests"], list)
        
        # Verify stats structure
        stats = data["stats"]
        assert "pending" in stats
        assert "assigned" in stats
        assert "resolved" in stats
        assert isinstance(stats["pending"], int)
        assert isinstance(stats["assigned"], int)
        assert isinstance(stats["resolved"], int)
    
    def test_support_request_has_required_fields(self):
        """Support requests contain all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/support-requests",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data["requests"]) > 0:
            ticket = data["requests"][0]
            # Required fields for each ticket
            assert "id" in ticket
            assert "user_name" in ticket
            assert "user_phone" in ticket
            assert "initial_message" in ticket
            assert "status" in ticket
            assert "created_at" in ticket
            
            # Status should be one of valid values
            assert ticket["status"] in ["pending", "assigned", "resolved"]
    
    def test_update_support_request_status_to_assigned(self):
        """PUT /api/chatbot/admin/support-requests/{id}?status=assigned works"""
        # First get a ticket
        get_response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/support-requests",
            headers=self.headers
        )
        assert get_response.status_code == 200
        tickets = get_response.json()["requests"]
        
        if len(tickets) == 0:
            pytest.skip("No support tickets available for testing")
        
        ticket_id = tickets[0]["id"]
        original_status = tickets[0]["status"]
        
        # Update to assigned status
        update_response = requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/{ticket_id}?status=assigned",
            headers=self.headers
        )
        assert update_response.status_code == 200
        assert update_response.json()["message"] == "تم تحديث الحالة"
        
        # Verify update was persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/support-requests",
            headers=self.headers
        )
        updated_ticket = next((t for t in verify_response.json()["requests"] if t["id"] == ticket_id), None)
        assert updated_ticket is not None
        assert updated_ticket["status"] == "assigned"
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/{ticket_id}?status={original_status}",
            headers=self.headers
        )
    
    def test_update_support_request_status_to_resolved(self):
        """PUT /api/chatbot/admin/support-requests/{id}?status=resolved works"""
        get_response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/support-requests",
            headers=self.headers
        )
        tickets = get_response.json()["requests"]
        
        if len(tickets) == 0:
            pytest.skip("No support tickets available for testing")
        
        ticket_id = tickets[0]["id"]
        original_status = tickets[0]["status"]
        
        # Update to resolved status
        update_response = requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/{ticket_id}?status=resolved",
            headers=self.headers
        )
        assert update_response.status_code == 200
        
        # Verify update was persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/support-requests",
            headers=self.headers
        )
        updated_ticket = next((t for t in verify_response.json()["requests"] if t["id"] == ticket_id), None)
        assert updated_ticket["status"] == "resolved"
        
        # Restore original status
        requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/{ticket_id}?status={original_status}",
            headers=self.headers
        )
    
    def test_update_support_request_status_to_pending(self):
        """PUT /api/chatbot/admin/support-requests/{id}?status=pending works (reopen)"""
        get_response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/support-requests",
            headers=self.headers
        )
        tickets = get_response.json()["requests"]
        
        if len(tickets) == 0:
            pytest.skip("No support tickets available for testing")
        
        ticket_id = tickets[0]["id"]
        
        # Update to pending status (reopen)
        update_response = requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/{ticket_id}?status=pending",
            headers=self.headers
        )
        assert update_response.status_code == 200
    
    def test_update_support_request_invalid_status(self):
        """PUT with invalid status returns 400"""
        get_response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/support-requests",
            headers=self.headers
        )
        tickets = get_response.json()["requests"]
        
        if len(tickets) == 0:
            pytest.skip("No support tickets available for testing")
        
        ticket_id = tickets[0]["id"]
        
        update_response = requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/{ticket_id}?status=invalid_status",
            headers=self.headers
        )
        assert update_response.status_code == 400
        assert "حالة غير صحيحة" in update_response.json()["detail"]
    
    def test_update_non_existent_ticket(self):
        """PUT for non-existent ticket returns 404"""
        update_response = requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/non-existent-id-12345?status=assigned",
            headers=self.headers
        )
        assert update_response.status_code == 404
        assert "الطلب غير موجود" in update_response.json()["detail"]
    
    def test_stats_count_accuracy(self):
        """Stats correctly count tickets by status"""
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/support-requests",
            headers=self.headers
        )
        data = response.json()
        
        # Manual count
        pending_count = len([t for t in data["requests"] if t["status"] == "pending"])
        assigned_count = len([t for t in data["requests"] if t["status"] == "assigned"])
        resolved_count = len([t for t in data["requests"] if t["status"] == "resolved"])
        
        # Verify stats match manual count
        assert data["stats"]["pending"] == pending_count
        assert data["stats"]["assigned"] == assigned_count
        assert data["stats"]["resolved"] == resolved_count


class TestSupportTicketsAuthorization:
    """Tests for authorization on support tickets endpoints"""
    
    def test_get_support_requests_requires_auth(self):
        """GET /api/chatbot/admin/support-requests requires authentication"""
        response = requests.get(f"{BASE_URL}/api/chatbot/admin/support-requests")
        assert response.status_code == 401
    
    def test_get_support_requests_requires_admin(self):
        """GET /api/chatbot/admin/support-requests requires admin role"""
        # Login as regular customer
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"phone": "0933333333", "password": "user123"}
        )
        if login_response.status_code != 200:
            pytest.skip("Customer user not available")
        
        customer_token = login_response.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/support-requests",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403
        assert "للمدراء فقط" in response.json()["detail"]
    
    def test_update_support_request_requires_auth(self):
        """PUT /api/chatbot/admin/support-requests/{id} requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/chatbot/admin/support-requests/some-id?status=assigned"
        )
        assert response.status_code == 401
