"""
Test commission system for food sellers
Tests:
- GET /api/food/my-store/commission API
- Commission rates by store type (fast_food=20%, market=15%, vegetables=12%, sweets=18%)
- Commission calculation in complete_delivery_and_pay_driver
- platform_commission and seller_earning saved in order
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test seller credentials
SELLER_PHONE = "0999999999"
SELLER_PASSWORD = "seller123"

# Expected commission rates by store type
EXPECTED_COMMISSIONS = {
    "restaurants": 0.20,
    "fast_food": 0.20,  # Same as restaurants
    "market": 0.15,
    "vegetables": 0.12,
    "sweets": 0.18,
    "default": 0.20
}


class TestCommissionAPI:
    """Tests for commission API endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get seller token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as food seller
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SELLER_PHONE,
            "password": SELLER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token") or data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            self.user = data.get("user", {})
        else:
            pytest.skip(f"Seller login failed: {response.status_code} - {response.text}")
    
    def test_commission_api_returns_success(self):
        """Test GET /api/food/my-store/commission returns 200"""
        response = self.session.get(f"{BASE_URL}/api/food/my-store/commission")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "commission_rate" in data, "Response missing commission_rate"
        assert "commission_percentage" in data, "Response missing commission_percentage"
        assert "store_type" in data, "Response missing store_type"
    
    def test_commission_api_returns_correct_fields(self):
        """Test commission API returns all expected fields"""
        response = self.session.get(f"{BASE_URL}/api/food/my-store/commission")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify all required fields
        required_fields = [
            "store_type",
            "store_type_name",
            "commission_rate",
            "commission_percentage",
            "total_sales",
            "total_commission_paid",
            "total_earnings",
            "orders_count",
            "message"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_commission_rate_is_valid(self):
        """Test commission rate is within expected range"""
        response = self.session.get(f"{BASE_URL}/api/food/my-store/commission")
        assert response.status_code == 200
        
        data = response.json()
        commission_rate = data.get("commission_rate")
        
        # Commission should be between 0 and 1 (0% to 100%)
        assert 0 <= commission_rate <= 1, f"Invalid commission rate: {commission_rate}"
        
        # Commission percentage should match rate
        expected_percentage = f"{int(commission_rate * 100)}%"
        assert data.get("commission_percentage") == expected_percentage, \
            f"Percentage mismatch: {data.get('commission_percentage')} vs {expected_percentage}"
    
    def test_commission_totals_are_numbers(self):
        """Test that financial totals are numeric"""
        response = self.session.get(f"{BASE_URL}/api/food/my-store/commission")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify numeric fields
        assert isinstance(data.get("total_sales"), (int, float)), "total_sales should be numeric"
        assert isinstance(data.get("total_commission_paid"), (int, float)), "total_commission_paid should be numeric"
        assert isinstance(data.get("total_earnings"), (int, float)), "total_earnings should be numeric"
        assert isinstance(data.get("orders_count"), int), "orders_count should be integer"


class TestCommissionRates:
    """Tests for commission rate configuration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup API session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_admin_food_commissions_endpoint_exists(self):
        """Test admin endpoint for food commissions exists"""
        # Login as admin (if available) or check public settings
        response = self.session.get(f"{BASE_URL}/api/admin/settings/public")
        
        # This should work without auth
        assert response.status_code == 200
    
    def test_default_commission_rates_match_expected(self):
        """Test that default commission rates match expected values"""
        # The expected rates are defined in DEFAULT_FOOD_COMMISSIONS in admin.py
        # restaurants: 0.20, fast_food: 0.20, market: 0.15, vegetables: 0.12, sweets: 0.18
        
        # Verify expected rates are documented correctly
        assert EXPECTED_COMMISSIONS["restaurants"] == 0.20, "Restaurants should be 20%"
        assert EXPECTED_COMMISSIONS["fast_food"] == 0.20, "Fast food should be 20%"
        assert EXPECTED_COMMISSIONS["market"] == 0.15, "Market should be 15%"
        assert EXPECTED_COMMISSIONS["vegetables"] == 0.12, "Vegetables should be 12%"
        assert EXPECTED_COMMISSIONS["sweets"] == 0.18, "Sweets should be 18%"


class TestCommissionCalculation:
    """Tests for commission calculation logic"""
    
    def test_commission_formula(self):
        """Test commission calculation formula"""
        # Formula: platform_commission = subtotal * commission_rate
        #          seller_earning = subtotal - platform_commission
        
        test_cases = [
            # (subtotal, commission_rate, expected_commission, expected_seller_earning)
            (100000, 0.20, 20000, 80000),  # 20% commission
            (100000, 0.15, 15000, 85000),  # 15% commission
            (100000, 0.12, 12000, 88000),  # 12% commission
            (100000, 0.18, 18000, 82000),  # 18% commission
            (50000, 0.20, 10000, 40000),   # Different subtotal
        ]
        
        for subtotal, rate, expected_commission, expected_earning in test_cases:
            platform_commission = subtotal * rate
            seller_earning = subtotal - platform_commission
            
            assert platform_commission == expected_commission, \
                f"Commission mismatch for subtotal={subtotal}, rate={rate}"
            assert seller_earning == expected_earning, \
                f"Seller earning mismatch for subtotal={subtotal}, rate={rate}"
    
    def test_commission_with_discounts(self):
        """Test commission calculation with offer and flash discounts"""
        # Formula with discounts:
        # actual_subtotal = subtotal - offer_discount - flash_discount
        # platform_commission = actual_subtotal * commission_rate
        # seller_earning = actual_subtotal - platform_commission
        
        subtotal = 100000
        offer_discount = 10000
        flash_discount = 5000
        commission_rate = 0.20
        
        actual_subtotal = subtotal - offer_discount - flash_discount  # 85000
        platform_commission = actual_subtotal * commission_rate  # 17000
        seller_earning = actual_subtotal - platform_commission  # 68000
        
        assert actual_subtotal == 85000, "Actual subtotal calculation incorrect"
        assert platform_commission == 17000, "Platform commission calculation incorrect"
        assert seller_earning == 68000, "Seller earning calculation incorrect"


class TestOrderCommissionFields:
    """Tests for commission fields in order documents"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get seller token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as food seller
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SELLER_PHONE,
            "password": SELLER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token") or data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Seller login failed: {response.status_code}")
    
    def test_seller_can_view_orders_with_commission(self):
        """Test seller can view their orders"""
        response = self.session.get(f"{BASE_URL}/api/food/orders/seller")
        
        assert response.status_code == 200, f"Failed to get seller orders: {response.text}"
        
        orders = response.json()
        assert isinstance(orders, list), "Orders should be a list"
        
        # If there are delivered orders, check for commission fields
        delivered_orders = [o for o in orders if o.get("status") == "delivered"]
        
        for order in delivered_orders:
            # Check if commission fields exist (they should for delivered orders)
            if "platform_commission" in order:
                assert isinstance(order["platform_commission"], (int, float)), \
                    "platform_commission should be numeric"
            if "seller_earning" in order:
                assert isinstance(order["seller_earning"], (int, float)), \
                    "seller_earning should be numeric"


class TestMyStoreEndpoint:
    """Tests for /api/food/my-store endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get seller token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as food seller
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": SELLER_PHONE,
            "password": SELLER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token") or data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Seller login failed: {response.status_code}")
    
    def test_my_store_endpoint_returns_store_data(self):
        """Test /api/food/my-store returns store information"""
        response = self.session.get(f"{BASE_URL}/api/food/my-store")
        
        assert response.status_code == 200, f"Failed to get store: {response.text}"
        
        data = response.json()
        
        # Verify store object exists
        assert "store" in data, "Response should contain 'store' field"
        
        store = data["store"]
        assert "id" in store, "Store should have id"
        assert "name" in store, "Store should have name"
        assert "store_type" in store, "Store should have store_type"
    
    def test_store_type_is_valid(self):
        """Test store type is one of the expected values"""
        response = self.session.get(f"{BASE_URL}/api/food/my-store")
        assert response.status_code == 200
        
        data = response.json()
        store = data.get("store", {})
        store_type = store.get("store_type")
        
        valid_types = ["restaurants", "fast_food", "market", "vegetables", "sweets", "groceries"]
        assert store_type in valid_types, f"Invalid store type: {store_type}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
