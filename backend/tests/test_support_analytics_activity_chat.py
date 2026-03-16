# /app/backend/tests/test_support_analytics_activity_chat.py
# Tests for Support Tickets, Seller Analytics, Activity Log, Chat, and Driver Achievements

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"phone": "0911111111", "password": "admin123"}
CUSTOMER_CREDS = {"phone": "0933333333", "password": "buyer123"}
DRIVER_CREDS = {"phone": "0900000000", "password": "delivery123"}
SELLER_CREDS = {"phone": "0966666666", "password": "seller123"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code}")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Customer login failed: {response.status_code}")


@pytest.fixture(scope="module")
def driver_token():
    """Get driver auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=DRIVER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Driver login failed: {response.status_code}")


@pytest.fixture(scope="module")
def seller_token():
    """Get seller auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SELLER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Seller login failed: {response.status_code}")


class TestDriverAchievements:
    """Test Driver Achievements APIs"""
    
    def test_get_driver_achievements(self, driver_token):
        """Test GET /api/achievements/my-achievements"""
        response = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "achievements" in data
        assert "stats" in data
        assert "categories" in data
        
        # Check stats structure
        assert "total_unlocked" in data["stats"]
        assert "total_achievements" in data["stats"]
        assert "completion_percent" in data["stats"]
        assert "total_rewards_earned" in data["stats"]
        
        # Check categories
        assert "orders" in data["categories"]
        assert "rating" in data["categories"]
        
        print(f"✅ Driver achievements - Total: {data['stats']['total_achievements']}, Unlocked: {data['stats']['total_unlocked']}")
    
    def test_check_and_unlock_achievements(self, driver_token):
        """Test POST /api/achievements/check-and-unlock"""
        response = requests.post(
            f"{BASE_URL}/api/achievements/check-and-unlock",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "new_unlocked" in data
        assert "count" in data
        assert isinstance(data["new_unlocked"], list)
        print(f"✅ Check achievements - New unlocked: {data['count']}")
    
    def test_get_recent_achievements(self, driver_token):
        """Test GET /api/achievements/recent"""
        response = requests.get(
            f"{BASE_URL}/api/achievements/recent",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Recent achievements - Count: {len(data)}")
    
    def test_achievements_requires_driver_role(self, customer_token):
        """Test that achievements API is restricted to drivers"""
        response = requests.get(
            f"{BASE_URL}/api/achievements/my-achievements",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403
        print("✅ Achievements API correctly restricted to drivers only")


class TestSellerAnalytics:
    """Test Seller Analytics Dashboard API"""
    
    def test_seller_dashboard_analytics(self, seller_token):
        """Test GET /api/analytics/seller-dashboard"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/seller-dashboard?period=week",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "orders" in data
        assert "revenue" in data
        
        print(f"✅ Seller analytics - Orders: {data['orders']}, Revenue: {data['revenue']}")
    
    def test_seller_dashboard_different_periods(self, seller_token):
        """Test different period filters"""
        for period in ["today", "week", "month", "all"]:
            response = requests.get(
                f"{BASE_URL}/api/analytics/seller-dashboard?period={period}",
                headers={"Authorization": f"Bearer {seller_token}"}
            )
            assert response.status_code == 200
            print(f"✅ Seller analytics period '{period}' works")


class TestSupportTickets:
    """Test Support Tickets System APIs"""
    
    def test_create_support_ticket(self, customer_token):
        """Test POST /api/support/tickets - Create new ticket"""
        response = requests.post(
            f"{BASE_URL}/api/support/tickets",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "subject": "TEST_اختبار تذكرة دعم",
                "message": "هذه رسالة اختبار للتذكرة",
                "category": "general",
                "priority": "normal"
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "ticket_id" in data
        assert "ticket_number" in data
        assert data["ticket_number"].startswith("TKT")
        
        print(f"✅ Created support ticket: {data['ticket_number']}")
        return data["ticket_id"]
    
    def test_get_my_tickets(self, customer_token):
        """Test GET /api/support/tickets/my"""
        response = requests.get(
            f"{BASE_URL}/api/support/tickets/my",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "tickets" in data
        assert isinstance(data["tickets"], list)
        print(f"✅ User tickets count: {len(data['tickets'])}")
    
    def test_admin_get_all_tickets(self, admin_token):
        """Test GET /api/support/admin/tickets"""
        response = requests.get(
            f"{BASE_URL}/api/support/admin/tickets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "tickets" in data
        assert "total" in data
        assert "pages" in data
        print(f"✅ Admin tickets - Total: {data['total']}, Pages: {data['pages']}")
    
    def test_admin_get_support_stats(self, admin_token):
        """Test GET /api/support/admin/stats"""
        response = requests.get(
            f"{BASE_URL}/api/support/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "by_status" in data
        assert "open" in data["by_status"]
        assert "in_progress" in data["by_status"]
        
        print(f"✅ Support stats - Total: {data['total']}, Open: {data['by_status']['open']}")
    
    def test_admin_tickets_with_filters(self, admin_token):
        """Test GET /api/support/admin/tickets with filters"""
        response = requests.get(
            f"{BASE_URL}/api/support/admin/tickets?status=open&category=general",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ Admin tickets filters work correctly")
    
    def test_support_admin_requires_admin_role(self, customer_token):
        """Test that admin support APIs are restricted"""
        response = requests.get(
            f"{BASE_URL}/api/support/admin/tickets",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403
        print("✅ Admin support API correctly restricted")


class TestActivityLog:
    """Test Admin Activity Log APIs"""
    
    def test_get_activity_logs(self, admin_token):
        """Test GET /api/activity-log/"""
        response = requests.get(
            f"{BASE_URL}/api/activity-log/",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "logs" in data
        assert "total" in data
        assert "pages" in data
        print(f"✅ Activity logs - Total: {data['total']}")
    
    def test_get_activity_stats(self, admin_token):
        """Test GET /api/activity-log/stats"""
        response = requests.get(
            f"{BASE_URL}/api/activity-log/stats?days=7",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert "by_type" in data
        print(f"✅ Activity stats - Total activities: {data['total']}")
    
    def test_get_admins_list(self, admin_token):
        """Test GET /api/activity-log/admins"""
        response = requests.get(
            f"{BASE_URL}/api/activity-log/admins",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "admins" in data
        assert isinstance(data["admins"], list)
        print(f"✅ Admin list for activity log - Count: {len(data['admins'])}")
    
    def test_get_action_types(self, admin_token):
        """Test GET /api/activity-log/action-types"""
        response = requests.get(
            f"{BASE_URL}/api/activity-log/action-types",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "action_types" in data
        print(f"✅ Action types available: {list(data['action_types'].keys())}")
    
    def test_activity_log_with_filters(self, admin_token):
        """Test activity log with various filters"""
        response = requests.get(
            f"{BASE_URL}/api/activity-log/?action_type=user&days=30&page=1&limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("✅ Activity log filters work correctly")
    
    def test_activity_log_requires_admin_role(self, customer_token):
        """Test that activity log API is restricted to admins"""
        response = requests.get(
            f"{BASE_URL}/api/activity-log/",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403
        print("✅ Activity log API correctly restricted to admins")


class TestChatAPI:
    """Test Chat API endpoints"""
    
    def test_get_unread_count(self, customer_token):
        """Test GET /api/chat/unread-count"""
        response = requests.get(
            f"{BASE_URL}/api/chat/unread-count",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
        print(f"✅ Chat unread count: {data['unread_count']}")
    
    def test_get_active_conversations(self, customer_token):
        """Test GET /api/chat/active-conversations"""
        response = requests.get(
            f"{BASE_URL}/api/chat/active-conversations",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "conversations" in data
        assert isinstance(data["conversations"], list)
        print(f"✅ Active conversations: {len(data['conversations'])}")
    
    def test_driver_active_conversations(self, driver_token):
        """Test GET /api/chat/active-conversations for driver"""
        response = requests.get(
            f"{BASE_URL}/api/chat/active-conversations",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "conversations" in data
        print(f"✅ Driver active conversations: {len(data['conversations'])}")
    
    def test_conversation_requires_valid_order(self, customer_token):
        """Test that conversation API requires valid order"""
        response = requests.get(
            f"{BASE_URL}/api/chat/conversation/invalid-order-id",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 404
        print("✅ Chat conversation correctly validates order ID")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
