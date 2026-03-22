"""
Admin Dashboard API Tests - ترند سورية
Tests for admin dashboard endpoints including:
- Admin stats
- Users management
- Sellers management
- Delivery management
- Platform settings
- Notifications
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

# Admin credentials
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "Admin@123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": ADMIN_PHONE,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        # Try both 'token' and 'access_token' keys
        token = data.get("token") or data.get("access_token")
        if token:
            print(f"✅ Admin login successful, user: {data.get('user', {}).get('name')}")
            return token
    print(f"❌ Admin login failed: {response.status_code} - {response.text}")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def auth_headers(admin_token):
    """Headers with admin token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestAdminStats:
    """Test admin statistics endpoints"""
    
    def test_get_admin_stats(self, auth_headers):
        """Test getting admin dashboard stats"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # Verify expected fields exist
        assert "total_users" in data
        assert "total_sellers" in data
        assert "total_delivery" in data
        assert "total_products" in data
        assert "total_orders" in data
        assert "pending_sellers" in data
        assert "pending_products" in data
        assert "pending_delivery" in data
        print(f"✅ Admin stats: {data}")


class TestUsersManagement:
    """Test users management endpoints"""
    
    def test_get_all_users(self, auth_headers):
        """Test getting all users (customers)"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} users")


class TestSellersManagement:
    """Test sellers management endpoints"""
    
    def test_get_pending_sellers(self, auth_headers):
        """Test getting pending sellers"""
        response = requests.get(f"{BASE_URL}/api/admin/sellers/pending", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} pending sellers")
    
    def test_get_all_sellers(self, auth_headers):
        """Test getting all sellers"""
        response = requests.get(f"{BASE_URL}/api/admin/sellers/all", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} sellers")


class TestDeliveryManagement:
    """Test delivery management endpoints"""
    
    def test_get_pending_delivery(self, auth_headers):
        """Test getting pending delivery drivers"""
        response = requests.get(f"{BASE_URL}/api/admin/delivery/pending", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} pending delivery drivers")
    
    def test_get_all_delivery(self, auth_headers):
        """Test getting all delivery drivers"""
        response = requests.get(f"{BASE_URL}/api/admin/delivery/all", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} delivery drivers")


class TestProductsManagement:
    """Test products management endpoints"""
    
    def test_get_pending_products(self, auth_headers):
        """Test getting pending products"""
        response = requests.get(f"{BASE_URL}/api/admin/products/pending", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} pending products")
    
    def test_get_all_products(self, auth_headers):
        """Test getting all products"""
        response = requests.get(f"{BASE_URL}/api/admin/products/all", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} products")


class TestOrdersManagement:
    """Test orders management endpoints"""
    
    def test_get_all_orders(self, auth_headers):
        """Test getting all orders"""
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} orders")


class TestPlatformSettings:
    """Test platform settings endpoints"""
    
    def test_get_platform_settings(self, auth_headers):
        """Test getting platform settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        # Verify expected settings fields
        assert "food_enabled" in data or data.get("id") == "main"
        print(f"✅ Platform settings retrieved")
    
    def test_get_public_settings(self):
        """Test getting public settings (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/public")
        assert response.status_code == 200
        
        data = response.json()
        assert "food_enabled" in data
        assert "shop_enabled" in data
        assert "delivery_enabled" in data
        print(f"✅ Public settings: food={data.get('food_enabled')}, shop={data.get('shop_enabled')}")


class TestNotifications:
    """Test notifications endpoints"""
    
    def test_get_admin_notifications(self, auth_headers):
        """Test getting admin notifications"""
        response = requests.get(f"{BASE_URL}/api/admin/notifications", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} notifications")


class TestCommissions:
    """Test commissions endpoints"""
    
    def test_get_commissions_report(self, auth_headers):
        """Test getting commissions report"""
        response = requests.get(f"{BASE_URL}/api/admin/commissions", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        print(f"✅ Commissions report retrieved")
    
    def test_get_commission_rates(self, auth_headers):
        """Test getting commission rates"""
        response = requests.get(f"{BASE_URL}/api/admin/commissions/rates", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "rates" in data or "default_rate" in data
        print(f"✅ Commission rates retrieved")


class TestSubAdmins:
    """Test sub-admins management endpoints"""
    
    def test_get_sub_admins(self, auth_headers):
        """Test getting sub-admins list"""
        response = requests.get(f"{BASE_URL}/api/admin/sub-admins", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} sub-admins")


class TestCallRequestsAndEmergency:
    """Test call requests and emergency endpoints"""
    
    def test_get_call_requests_count(self, auth_headers):
        """Test getting call requests count"""
        response = requests.get(f"{BASE_URL}/api/admin/call-requests/count", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "count" in data
        print(f"✅ Call requests count: {data.get('count')}")
    
    def test_get_emergency_help_count(self, auth_headers):
        """Test getting emergency help count"""
        response = requests.get(f"{BASE_URL}/api/admin/emergency-help/count", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "count" in data
        print(f"✅ Emergency help count: {data.get('count')}")


class TestFoodStores:
    """Test food stores management endpoints"""
    
    def test_get_food_stores(self, auth_headers):
        """Test getting food stores"""
        response = requests.get(f"{BASE_URL}/api/admin/food/stores", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} food stores")
    
    def test_get_food_stats(self, auth_headers):
        """Test getting food stats"""
        response = requests.get(f"{BASE_URL}/api/admin/food/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total_stores" in data
        print(f"✅ Food stats: {data.get('total_stores')} stores")


class TestDeliverySettings:
    """Test delivery settings endpoints"""
    
    def test_get_delivery_settings(self, auth_headers):
        """Test getting delivery settings"""
        response = requests.get(f"{BASE_URL}/api/settings/delivery-settings")
        assert response.status_code == 200
        
        data = response.json()
        print(f"✅ Delivery settings retrieved")
    
    def test_get_distance_delivery_settings(self):
        """Test getting distance delivery settings"""
        response = requests.get(f"{BASE_URL}/api/settings/distance-delivery")
        assert response.status_code == 200
        
        data = response.json()
        assert "base_fee" in data or "price_per_km" in data
        print(f"✅ Distance delivery settings retrieved")
    
    def test_get_driver_earnings_settings(self):
        """Test getting driver earnings settings"""
        response = requests.get(f"{BASE_URL}/api/settings/driver-earnings")
        assert response.status_code == 200
        
        data = response.json()
        print(f"✅ Driver earnings settings retrieved")


class TestDriverReports:
    """Test driver reports endpoints"""
    
    def test_get_driver_reports(self, auth_headers):
        """Test getting driver reports"""
        response = requests.get(f"{BASE_URL}/api/admin/driver-reports", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "reports" in data
        assert "stats" in data
        print(f"✅ Driver reports: {data.get('stats', {}).get('total', 0)} total")


class TestLowStock:
    """Test low stock endpoints"""
    
    def test_get_low_stock_products(self, auth_headers):
        """Test getting low stock products"""
        response = requests.get(f"{BASE_URL}/api/admin/products/low-stock", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "threshold" in data
        print(f"✅ Low stock: {data.get('count', 0)} products below threshold {data.get('threshold')}")


class TestFlashSales:
    """Test flash sales endpoints"""
    
    def test_get_flash_sales(self, auth_headers):
        """Test getting flash sales"""
        response = requests.get(f"{BASE_URL}/api/admin/flash-sales", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} flash sales")


class TestFoodOffers:
    """Test food offers endpoints"""
    
    def test_get_food_offers(self, auth_headers):
        """Test getting food offers"""
        response = requests.get(f"{BASE_URL}/api/admin/food-offers", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Found {len(data)} food offers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
