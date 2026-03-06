"""
Tests for Support Analytics API - GET /api/chatbot/admin/analytics
This endpoint provides advanced support analytics for admins including:
- peak_hours: Distribution of tickets by hour of day
- avg_response_time_minutes: Average time to first admin reply
- staff_performance: Top staff by tickets handled with ratings
- daily_tickets: Tickets per day (last 7 days)
- status_breakdown: Count of pending/assigned/resolved tickets
- total_tickets: Total number of tickets
- resolved_rate: Percentage of resolved tickets
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSupportAnalytics:
    """Tests for GET /api/chatbot/admin/analytics endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test credentials"""
        self.admin_creds = {"phone": "0911111111", "password": "admin123"}
        self.customer_creds = {"phone": "0933333333", "password": "user123"}
        
    def get_token(self, credentials):
        """Helper to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=credentials)
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    # ============== Authentication Tests ==============
    
    def test_analytics_requires_authentication(self):
        """Analytics endpoint returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/chatbot/admin/analytics")
        assert response.status_code == 401
        print("✅ Analytics requires authentication (401)")
    
    def test_analytics_requires_admin_role(self):
        """Analytics endpoint returns 403 for non-admin users"""
        token = self.get_token(self.customer_creds)
        assert token is not None, "Customer login should succeed"
        
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/analytics",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403
        assert "للمدراء فقط" in response.json().get("detail", "")
        print("✅ Analytics requires admin role (403 for customer)")
    
    # ============== Response Structure Tests ==============
    
    def test_analytics_returns_required_fields(self):
        """Analytics endpoint returns all required fields"""
        token = self.get_token(self.admin_creds)
        assert token is not None, "Admin login should succeed"
        
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/analytics",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Check all required fields exist
        required_fields = [
            "peak_hours", 
            "avg_response_time_minutes", 
            "staff_performance", 
            "daily_tickets", 
            "status_breakdown", 
            "total_tickets", 
            "resolved_rate"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        print("✅ Analytics response contains all required fields")
    
    def test_peak_hours_structure(self):
        """peak_hours is a list of {hour, count} objects"""
        token = self.get_token(self.admin_creds)
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/analytics",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        assert isinstance(data["peak_hours"], list)
        
        if len(data["peak_hours"]) > 0:
            sample = data["peak_hours"][0]
            assert "hour" in sample
            assert "count" in sample
            assert isinstance(sample["hour"], int)
            assert isinstance(sample["count"], int)
            assert 0 <= sample["hour"] <= 23, "Hour should be 0-23"
        
        print("✅ peak_hours structure is correct")
    
    def test_staff_performance_structure(self):
        """staff_performance is a list of staff stats"""
        token = self.get_token(self.admin_creds)
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/analytics",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        assert isinstance(data["staff_performance"], list)
        
        if len(data["staff_performance"]) > 0:
            staff = data["staff_performance"][0]
            assert "id" in staff
            assert "name" in staff
            assert "tickets_handled" in staff
            assert "avg_rating" in staff
            assert "total_ratings" in staff
        
        print("✅ staff_performance structure is correct")
    
    def test_daily_tickets_structure(self):
        """daily_tickets is a list of {date, count} objects"""
        token = self.get_token(self.admin_creds)
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/analytics",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        assert isinstance(data["daily_tickets"], list)
        
        if len(data["daily_tickets"]) > 0:
            day = data["daily_tickets"][0]
            assert "date" in day
            assert "count" in day
            # Date format should be YYYY-MM-DD
            assert len(day["date"]) == 10
            assert day["date"][4] == "-" and day["date"][7] == "-"
        
        print("✅ daily_tickets structure is correct")
    
    def test_status_breakdown_structure(self):
        """status_breakdown has pending, assigned, resolved counts"""
        token = self.get_token(self.admin_creds)
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/analytics",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        status = data["status_breakdown"]
        assert isinstance(status, dict)
        assert "pending" in status
        assert "assigned" in status
        assert "resolved" in status
        
        assert isinstance(status["pending"], int)
        assert isinstance(status["assigned"], int)
        assert isinstance(status["resolved"], int)
        
        print("✅ status_breakdown structure is correct")
    
    def test_numeric_fields_types(self):
        """avg_response_time, total_tickets, resolved_rate are numbers"""
        token = self.get_token(self.admin_creds)
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/analytics",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        assert isinstance(data["avg_response_time_minutes"], (int, float))
        assert isinstance(data["total_tickets"], int)
        assert isinstance(data["resolved_rate"], (int, float))
        
        # Logical constraints
        assert data["avg_response_time_minutes"] >= 0
        assert data["total_tickets"] >= 0
        assert 0 <= data["resolved_rate"] <= 100
        
        print("✅ Numeric fields have correct types and ranges")
    
    def test_total_matches_status_sum(self):
        """total_tickets should equal sum of status counts"""
        token = self.get_token(self.admin_creds)
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/analytics",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        status = data["status_breakdown"]
        status_sum = status["pending"] + status["assigned"] + status["resolved"]
        
        assert data["total_tickets"] == status_sum, \
            f"total_tickets ({data['total_tickets']}) != sum of statuses ({status_sum})"
        
        print("✅ total_tickets matches sum of status_breakdown")
    
    def test_resolved_rate_calculation(self):
        """resolved_rate should be (resolved / total) * 100"""
        token = self.get_token(self.admin_creds)
        response = requests.get(
            f"{BASE_URL}/api/chatbot/admin/analytics",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = response.json()
        
        total = data["total_tickets"]
        resolved = data["status_breakdown"]["resolved"]
        
        if total > 0:
            expected_rate = round((resolved / total) * 100, 1)
            assert abs(data["resolved_rate"] - expected_rate) < 0.5, \
                f"resolved_rate ({data['resolved_rate']}) != expected ({expected_rate})"
        else:
            assert data["resolved_rate"] == 0
        
        print("✅ resolved_rate calculation is correct")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
