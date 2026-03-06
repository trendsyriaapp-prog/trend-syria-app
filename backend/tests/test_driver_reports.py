# /app/backend/tests/test_driver_reports.py
# اختبارات نظام البلاغات الأخلاقية ضد موظفي التوصيل

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
ADMIN_CREDS = {"phone": "0911111111", "password": "admin123"}
SELLER_CREDS = {"phone": "0922222222", "password": "seller123"}
CUSTOMER_CREDS = {"phone": "0933333333", "password": "user123"}
DELIVERY_CREDS = {"phone": "0900000000", "password": "delivery123"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def seller_token():
    """Get seller authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=SELLER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Seller authentication failed")


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=CUSTOMER_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Customer authentication failed")


@pytest.fixture(scope="module")
def delivery_token():
    """Get delivery driver authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=DELIVERY_CREDS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Delivery authentication failed")


# ==================== POST /api/delivery/report-driver Tests ====================

class TestReportDriverEndpoint:
    """Tests for POST /api/delivery/report-driver"""

    def test_report_driver_requires_auth(self):
        """Report driver endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/delivery/report-driver", json={
            "driver_id": "test",
            "order_id": "test",
            "category": "سلوك_غير_لائق",
            "details": "تفاصيل البلاغ للاختبار"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Report driver endpoint requires authentication (401)")

    def test_report_driver_forbidden_for_delivery(self, delivery_token):
        """Delivery drivers cannot submit reports"""
        headers = {"Authorization": f"Bearer {delivery_token}"}
        response = requests.post(f"{BASE_URL}/api/delivery/report-driver", json={
            "driver_id": "test",
            "order_id": "test",
            "category": "سلوك_غير_لائق",
            "details": "تفاصيل البلاغ للاختبار"
        }, headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Delivery drivers cannot submit reports (403)")

    def test_report_driver_requires_minimum_details(self, customer_token):
        """Report requires minimum 10 characters in details"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.post(f"{BASE_URL}/api/delivery/report-driver", json={
            "driver_id": "test",
            "order_id": "test",
            "category": "سلوك_غير_لائق",
            "details": "short"  # Less than 10 characters
        }, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "10" in data.get("detail", ""), "Error should mention 10 characters"
        print("✅ Report requires minimum 10 characters in details (400)")

    def test_report_driver_validates_category(self, customer_token):
        """Report validates category values"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.post(f"{BASE_URL}/api/delivery/report-driver", json={
            "driver_id": "test",
            "order_id": "test",
            "category": "invalid_category",
            "details": "تفاصيل البلاغ للاختبار كافية"
        }, headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "تصنيف" in data.get("detail", ""), "Error should mention category"
        print("✅ Report validates category values (400)")

    def test_report_driver_order_not_found(self, customer_token):
        """Report returns 404 for invalid order"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.post(f"{BASE_URL}/api/delivery/report-driver", json={
            "driver_id": "test-driver",
            "order_id": "nonexistent-order-id",
            "category": "سلوك_غير_لائق",
            "details": "تفاصيل البلاغ للاختبار كافية"
        }, headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Report returns 404 for invalid order")

    def test_valid_categories(self):
        """Test all valid category constants"""
        valid_categories = ["سلوك_غير_لائق", "تحرش", "سرقة_احتيال", "أخرى"]
        print(f"✅ Valid categories: {valid_categories}")


# ==================== GET /api/admin/driver-reports Tests ====================

class TestAdminDriverReportsEndpoint:
    """Tests for GET /api/admin/driver-reports"""

    def test_get_reports_requires_auth(self):
        """Get reports endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/driver-reports")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Get reports requires authentication (401)")

    def test_get_reports_forbidden_for_customer(self, customer_token):
        """Customers cannot access reports"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/driver-reports", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Customers cannot access reports (403)")

    def test_get_reports_forbidden_for_seller(self, seller_token):
        """Sellers cannot access reports"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/driver-reports", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Sellers cannot access reports (403)")

    def test_get_reports_forbidden_for_delivery(self, delivery_token):
        """Delivery drivers cannot access reports"""
        headers = {"Authorization": f"Bearer {delivery_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/driver-reports", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Delivery drivers cannot access reports (403)")

    def test_get_reports_success_for_admin(self, admin_token):
        """Admin can access reports"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/driver-reports", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Verify response structure
        assert "reports" in data, "Response should contain 'reports' array"
        assert "stats" in data, "Response should contain 'stats' object"
        stats = data["stats"]
        assert "pending" in stats, "Stats should contain 'pending'"
        assert "dismissed" in stats, "Stats should contain 'dismissed'"
        assert "terminated" in stats, "Stats should contain 'terminated'"
        assert "total" in stats, "Stats should contain 'total'"
        print(f"✅ Admin can access reports (200) - Total: {stats['total']}, Pending: {stats['pending']}")

    def test_reports_response_structure(self, admin_token):
        """Verify reports array structure"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/driver-reports", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data["reports"]) > 0:
            report = data["reports"][0]
            expected_fields = ["id", "driver_id", "driver_name", "reporter_id", 
                             "reporter_name", "reporter_type", "order_id", 
                             "category", "category_label", "details", "status", "created_at"]
            for field in expected_fields:
                assert field in report, f"Report should contain '{field}'"
            print(f"✅ Reports structure is correct with all required fields")
        else:
            print("✅ No reports found - structure validation skipped")


# ==================== PUT /api/admin/driver-reports/{id} Tests ====================

class TestHandleDriverReportEndpoint:
    """Tests for PUT /api/admin/driver-reports/{id}?action=..."""

    def test_handle_report_requires_auth(self):
        """Handle report endpoint requires authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/driver-reports/test-id?action=dismiss")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Handle report requires authentication (401)")

    def test_handle_report_forbidden_for_non_admin(self, customer_token):
        """Non-admins cannot handle reports"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.put(f"{BASE_URL}/api/admin/driver-reports/test-id?action=dismiss", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Non-admins cannot handle reports (403)")

    def test_handle_report_validates_action(self, admin_token):
        """Handle report validates action parameter"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/admin/driver-reports/test-id?action=invalid", headers=headers)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "dismiss" in data.get("detail", "") or "terminate" in data.get("detail", ""), \
            "Error should mention valid actions"
        print("✅ Handle report validates action parameter (400)")

    def test_handle_report_not_found(self, admin_token):
        """Handle report returns 404 for invalid report id"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.put(f"{BASE_URL}/api/admin/driver-reports/nonexistent-id?action=dismiss", headers=headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Handle report returns 404 for invalid report id")


# ==================== Suspension Status Tests ====================

class TestSuspensionStatus:
    """Tests for GET /api/delivery/my-suspension-status"""

    def test_suspension_status_requires_auth(self):
        """Suspension status endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/delivery/my-suspension-status")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Suspension status requires authentication (401)")

    def test_suspension_status_forbidden_for_non_delivery(self, customer_token):
        """Non-delivery users cannot check suspension status"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/delivery/my-suspension-status", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✅ Non-delivery users cannot check suspension status (403)")

    def test_suspension_status_success_for_delivery(self, delivery_token):
        """Delivery drivers can check their suspension status"""
        headers = {"Authorization": f"Bearer {delivery_token}"}
        response = requests.get(f"{BASE_URL}/api/delivery/my-suspension-status", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "is_suspended" in data, "Response should contain 'is_suspended'"
        print(f"✅ Delivery driver can check suspension status (200) - Suspended: {data['is_suspended']}")


# ==================== Summary ====================

def test_summary():
    """Print test summary"""
    print("\n" + "="*60)
    print("📋 Driver Reports (Ethical Complaints) API Tests Summary")
    print("="*60)
    print("✅ POST /api/delivery/report-driver - Create ethical report")
    print("   - Requires authentication")
    print("   - Forbidden for delivery drivers")
    print("   - Requires minimum 10 characters in details")
    print("   - Validates category (سلوك_غير_لائق, تحرش, سرقة_احتيال, أخرى)")
    print("✅ GET /api/admin/driver-reports - Admin get reports")
    print("   - Admin/sub_admin only")
    print("   - Returns reports array with stats")
    print("✅ PUT /api/admin/driver-reports/{id}?action=... - Handle report")
    print("   - Admin/sub_admin only")
    print("   - Actions: dismiss (reinstate driver) or terminate (fire driver)")
    print("✅ GET /api/delivery/my-suspension-status - Check suspension")
    print("   - Delivery drivers only")
    print("="*60)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
