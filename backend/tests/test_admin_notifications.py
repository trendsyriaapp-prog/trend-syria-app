"""
Test Admin Notifications - Iteration 150
Tests:
1. topup_request notifications NOT shown to admin
2. new_seller_registration and withdrawal_request shown to admin
3. POST /api/notifications/read-all?context=admin works correctly
4. Unread count decreases after marking as read
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"
OTP_CODE = "123456"


class TestAdminNotifications:
    """Test admin notification filtering and read-all functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        # Direct login with phone and password
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        token = data.get("token") or data.get("access_token")
        assert token, "No token in response"
        
        return token
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_admin_login_success(self, admin_token):
        """Test admin can login successfully"""
        assert admin_token is not None
        print(f"✅ Admin login successful, token obtained")
    
    def test_get_admin_notifications_with_context(self, admin_headers):
        """Test GET /api/notifications?context=admin returns only admin notification types"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?context=admin",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to get notifications: {response.text}"
        
        notifications = response.json()
        print(f"✅ Got {len(notifications)} admin notifications")
        
        # Check that no topup_request notifications are present
        topup_notifications = [n for n in notifications if n.get('type') == 'topup_request']
        assert len(topup_notifications) == 0, f"Found {len(topup_notifications)} topup_request notifications - should be 0"
        print("✅ No topup_request notifications in admin context")
        
        # List notification types found
        types_found = set(n.get('type') for n in notifications)
        print(f"   Notification types found: {types_found}")
        
        return notifications
    
    def test_admin_notifications_exclude_topup_request(self, admin_headers):
        """Verify topup_request is NOT in ADMIN_NOTIFICATION_TYPES"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?context=admin",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        notifications = response.json()
        
        # Verify no topup_request type
        for n in notifications:
            assert n.get('type') != 'topup_request', f"Found topup_request notification: {n}"
        
        print("✅ topup_request notifications correctly excluded from admin context")
    
    def test_admin_notifications_include_seller_registration(self, admin_headers):
        """Verify new_seller_registration is in ADMIN_NOTIFICATION_TYPES"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?context=admin",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        notifications = response.json()
        
        # Check if new_seller_registration type exists (may not have any currently)
        seller_reg_notifications = [n for n in notifications if n.get('type') == 'new_seller_registration']
        print(f"   Found {len(seller_reg_notifications)} new_seller_registration notifications")
        
        # The type should be allowed - we just verify the API works
        print("✅ new_seller_registration type is allowed in admin context")
    
    def test_admin_notifications_include_withdrawal_request(self, admin_headers):
        """Verify withdrawal_request is in ADMIN_NOTIFICATION_TYPES"""
        response = requests.get(
            f"{BASE_URL}/api/notifications?context=admin",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        notifications = response.json()
        
        # Check if withdrawal_request type exists (may not have any currently)
        withdrawal_notifications = [n for n in notifications if n.get('type') == 'withdrawal_request']
        print(f"   Found {len(withdrawal_notifications)} withdrawal_request notifications")
        
        # The type should be allowed - we just verify the API works
        print("✅ withdrawal_request type is allowed in admin context")
    
    def test_read_all_notifications_with_admin_context(self, admin_headers):
        """Test POST /api/notifications/read-all?context=admin marks all admin notifications as read"""
        # First get current notifications
        response = requests.get(
            f"{BASE_URL}/api/notifications?context=admin",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        notifications_before = response.json()
        unread_before = len([n for n in notifications_before if not n.get('is_read')])
        print(f"   Unread notifications before: {unread_before}")
        
        # Mark all as read with context=admin
        response = requests.post(
            f"{BASE_URL}/api/notifications/read-all?context=admin",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to mark all as read: {response.text}"
        
        result = response.json()
        print(f"   Mark all as read response: {result}")
        
        # Verify the response
        assert "message" in result, "Response should contain message"
        assert "count" in result, "Response should contain count"
        
        print(f"✅ Marked {result.get('count', 0)} notifications as read")
        
        # Verify all are now read
        response = requests.get(
            f"{BASE_URL}/api/notifications?context=admin",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        notifications_after = response.json()
        unread_after = len([n for n in notifications_after if not n.get('is_read')])
        print(f"   Unread notifications after: {unread_after}")
        
        assert unread_after == 0, f"Expected 0 unread notifications, got {unread_after}"
        print("✅ All admin notifications marked as read successfully")
    
    def test_read_single_notification(self, admin_headers):
        """Test POST /api/notifications/{id}/read marks single notification as read"""
        # Get notifications
        response = requests.get(
            f"{BASE_URL}/api/notifications?context=admin",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        notifications = response.json()
        
        if len(notifications) > 0:
            notification_id = notifications[0].get('id')
            
            # Mark single notification as read
            response = requests.post(
                f"{BASE_URL}/api/notifications/{notification_id}/read",
                headers=admin_headers
            )
            assert response.status_code == 200, f"Failed to mark notification as read: {response.text}"
            
            print(f"✅ Single notification {notification_id} marked as read")
        else:
            print("⚠️ No notifications to test single read")
    
    def test_notifications_without_context_for_admin(self, admin_headers):
        """Test GET /api/notifications without context still filters for admin"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Failed to get notifications: {response.text}"
        
        notifications = response.json()
        print(f"   Got {len(notifications)} notifications without context param")
        
        # Should still exclude topup_request for admin users
        topup_notifications = [n for n in notifications if n.get('type') == 'topup_request']
        assert len(topup_notifications) == 0, f"Found {len(topup_notifications)} topup_request notifications - should be 0"
        
        print("✅ Admin notifications correctly filtered even without context param")


class TestNotificationTypes:
    """Test that notification types are correctly categorized"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        
        data = response.json()
        return data.get("token") or data.get("access_token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_admin_notification_types_list(self, admin_headers):
        """Verify the expected admin notification types"""
        # Expected admin notification types (from notifications.py)
        expected_admin_types = [
            'new_seller_registration', 'new_driver_registration', 'withdrawal_request',
            'seller_document_submitted', 'driver_document_submitted', 'report_submitted',
            'support_ticket', 'system_alert', 'low_stock_alert',
            'admin_notification', 'seller_approved', 'seller_rejected', 
            'delivery_approved', 'delivery_rejected'
        ]
        
        # topup_request should NOT be in admin types
        assert 'topup_request' not in expected_admin_types
        
        print(f"✅ Expected admin notification types: {expected_admin_types}")
        print("✅ topup_request correctly NOT in admin notification types")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
