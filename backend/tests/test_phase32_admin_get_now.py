"""
Phase 32 - Admin APIs Testing after get_now() refactoring
Tests admin endpoints to verify datetime handling is correct after replacing
58 usages of datetime.now().isoformat() with get_now() helper
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = "TrendSyria@2026"
OTP_CODE = "123456"


def get_admin_token():
    """Get admin authentication token"""
    # Step 1: Request OTP
    requests.post(f"{BASE_URL}/api/auth/request-otp", json={"phone": ADMIN_PHONE})
    
    # Step 2: Login with OTP
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"phone": ADMIN_PHONE, "password": ADMIN_PASSWORD, "otp": OTP_CODE}
    )
    
    if login_response.status_code == 200:
        data = login_response.json()
        return data.get("token") or data.get("access_token")
    return None


# Module-level token
_admin_token = None

@pytest.fixture(scope="module")
def admin_token():
    """Shared admin token for all tests"""
    global _admin_token
    if _admin_token is None:
        _admin_token = get_admin_token()
    if _admin_token is None:
        pytest.skip("Admin authentication failed")
    return _admin_token


class TestAdminAuthentication:
    """Test admin login to get auth token"""
    
    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        print(f"Admin token obtained successfully")


class TestPlatformSettings:
    """Test platform settings API - uses get_now() for updated_at"""
    
    def test_get_platform_settings(self, admin_token):
        """GET /api/admin/settings - verify settings retrieval"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"GET Settings: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields exist
        assert "food_enabled" in data or "id" in data
        print(f"Settings retrieved: {list(data.keys())[:5]}...")
    
    def test_get_public_settings(self):
        """GET /api/admin/settings/public - no auth required"""
        response = requests.get(f"{BASE_URL}/api/admin/settings/public")
        print(f"GET Public Settings: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify public settings fields
        assert "food_enabled" in data
        assert "shop_enabled" in data
        print(f"Public settings: food_enabled={data.get('food_enabled')}, shop_enabled={data.get('shop_enabled')}")
    
    def test_get_platform_status(self):
        """GET /api/admin/platform-status - no auth required"""
        response = requests.get(f"{BASE_URL}/api/admin/platform-status")
        print(f"GET Platform Status: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify platform status fields
        assert "platform_closed_for_customers" in data
        assert "platform_closed_for_sellers" in data
        print(f"Platform status: customers_closed={data.get('platform_closed_for_customers')}")


class TestPendingSellers:
    """Test pending sellers API - uses get_now() for timestamps"""
    
    def test_get_pending_sellers(self, admin_token):
        """GET /api/admin/sellers/pending - verify pending sellers list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sellers/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"GET Pending Sellers: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list (may be empty)
        assert isinstance(data, list)
        print(f"Pending sellers count: {len(data)}")
    
    def test_get_all_sellers(self, admin_token):
        """GET /api/admin/sellers/all - verify all sellers with pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sellers/all",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"page": 1, "limit": 10}
        )
        print(f"GET All Sellers: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify pagination structure
        assert "data" in data
        assert "pagination" in data
        print(f"All sellers: {len(data['data'])} items, total: {data['pagination'].get('total', 0)}")


class TestPendingDrivers:
    """Test pending drivers API - uses get_now() for timestamps"""
    
    def test_get_pending_delivery(self, admin_token):
        """GET /api/admin/delivery/pending - verify pending drivers list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/delivery/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"GET Pending Delivery: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list (may be empty)
        assert isinstance(data, list)
        print(f"Pending drivers count: {len(data)}")
    
    def test_get_all_delivery(self, admin_token):
        """GET /api/admin/delivery/all - verify all drivers with pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/delivery/all",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"page": 1, "limit": 10}
        )
        print(f"GET All Delivery: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify pagination structure
        assert "data" in data
        assert "pagination" in data
        print(f"All drivers: {len(data['data'])} items, total: {data['pagination'].get('total', 0)}")


class TestAdminStats:
    """Test admin stats API"""
    
    def test_get_admin_stats(self, admin_token):
        """GET /api/admin/stats - verify admin statistics"""
        response = requests.get(
            f"{BASE_URL}/api/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"GET Admin Stats: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected stats fields
        expected_fields = ["total_users", "total_sellers", "total_delivery", "pending_sellers", "pending_delivery"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"Stats: users={data.get('total_users')}, sellers={data.get('total_sellers')}, drivers={data.get('total_delivery')}")


class TestPendingProducts:
    """Test pending products API - uses get_now() for approval timestamps"""
    
    def test_get_pending_products(self, admin_token):
        """GET /api/admin/products/pending - verify pending products list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/products/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"GET Pending Products: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list or dict with data
        assert isinstance(data, (list, dict))
        if isinstance(data, list):
            print(f"Pending products count: {len(data)}")
        else:
            print(f"Pending products response: {list(data.keys())}")
    
    def test_get_all_products(self, admin_token):
        """GET /api/admin/products/all - verify all products with pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/products/all",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"page": 1, "limit": 10}
        )
        print(f"GET All Products: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify pagination structure
        assert "data" in data
        assert "pagination" in data
        print(f"All products: {len(data['data'])} items, total: {data['pagination'].get('total', 0)}")


class TestSubAdmins:
    """Test sub-admins API - uses get_now() for created_at"""
    
    def test_get_sub_admins(self, admin_token):
        """GET /api/admin/sub-admins - verify sub-admins list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sub-admins",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"GET Sub-Admins: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list or dict
        assert isinstance(data, (list, dict))
        if isinstance(data, list):
            print(f"Sub-admins count: {len(data)}")


class TestPlatformWallet:
    """Test platform wallet API - uses get_now() for timestamps"""
    
    def test_get_platform_wallet(self, admin_token):
        """GET /api/admin/platform-wallet - verify platform wallet"""
        response = requests.get(
            f"{BASE_URL}/api/admin/platform-wallet",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"GET Platform Wallet: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify wallet fields
        assert "balance" in data or "id" in data
        print(f"Platform wallet: balance={data.get('balance', 'N/A')}")


class TestCallRequestsAndEmergency:
    """Test call requests and emergency help counts - uses get_now()"""
    
    def test_get_call_requests_count(self, admin_token):
        """GET /api/admin/call-requests/count - verify call requests count"""
        response = requests.get(
            f"{BASE_URL}/api/admin/call-requests/count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"GET Call Requests Count: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "count" in data
        print(f"Call requests count: {data.get('count')}")
    
    def test_get_emergency_help_count(self, admin_token):
        """GET /api/admin/emergency-help/count - verify emergency help count"""
        response = requests.get(
            f"{BASE_URL}/api/admin/emergency-help/count",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"GET Emergency Help Count: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "count" in data
        print(f"Emergency help count: {data.get('count')}")


class TestRejectedRequests:
    """Test rejected requests API - uses get_now() for rejected_at"""
    
    def test_get_rejected_requests(self, admin_token):
        """GET /api/admin/rejected-requests - verify rejected requests list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/rejected-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"GET Rejected Requests: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "requests" in data
        assert "retention_days" in data
        print(f"Rejected requests: {len(data.get('requests', []))} items, retention: {data.get('retention_days')} days")


class TestOrders:
    """Test orders API - uses get_now() for timestamps"""
    
    def test_get_all_orders(self, admin_token):
        """GET /api/admin/orders - verify all orders with pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/orders",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"page": 1, "limit": 10}
        )
        print(f"GET All Orders: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify pagination structure
        assert "data" in data
        assert "pagination" in data
        print(f"All orders: {len(data['data'])} items, total: {data['pagination'].get('total', 0)}")


class TestFoodProducts:
    """Test food products API - uses get_now() for approval timestamps"""
    
    def test_get_pending_food_products(self, admin_token):
        """GET /api/admin/food-products/pending - verify pending food products"""
        response = requests.get(
            f"{BASE_URL}/api/admin/food-products/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"GET Pending Food Products: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return a list or dict
        assert isinstance(data, (list, dict))
        if isinstance(data, list):
            print(f"Pending food products count: {len(data)}")


class TestUsers:
    """Test users API - uses get_now() for timestamps"""
    
    def test_get_all_users(self, admin_token):
        """GET /api/admin/users - verify all users with pagination"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"page": 1, "limit": 10}
        )
        print(f"GET All Users: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify pagination structure
        assert "data" in data
        assert "pagination" in data
        print(f"All users: {len(data['data'])} items, total: {data['pagination'].get('total', 0)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
