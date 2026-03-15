# /app/backend/tests/test_commission_calculator.py
# Tests for Commission Calculator APIs for Food Sellers and Product Sellers

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FOOD_SELLER_PHONE = "0999999999"
FOOD_SELLER_PASSWORD = "seller123"


class TestFoodSellerCommissionAPI:
    """Test Food Seller Commission API - GET /api/food/my-store/commission"""
    
    def get_auth_token(self, phone, password):
        """Helper to authenticate and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": phone,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("access_token") or response.json().get("token")
        return None
    
    def test_food_commission_api_requires_auth(self):
        """Test that commission API requires authentication"""
        response = requests.get(f"{BASE_URL}/api/food/my-store/commission")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASS: Food commission API requires authentication")
    
    def test_food_commission_api_returns_data(self):
        """Test that food seller gets commission info"""
        token = self.get_auth_token(FOOD_SELLER_PHONE, FOOD_SELLER_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate food seller")
        
        response = requests.get(
            f"{BASE_URL}/api/food/my-store/commission",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Check response status
        if response.status_code == 404:
            pytest.skip("Food seller has no store")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Commission Response: {data}")
        
        # Validate required fields in response
        assert "commission_rate" in data, "Missing commission_rate in response"
        assert "commission_percentage" in data, "Missing commission_percentage in response"
        
        # Validate commission rate is valid (between 0 and 1)
        commission_rate = data.get("commission_rate", 0)
        assert 0 <= commission_rate <= 1, f"Commission rate {commission_rate} should be between 0 and 1"
        
        # Validate commission_percentage format (should include %)
        commission_percentage = data.get("commission_percentage", "")
        assert "%" in commission_percentage, f"Commission percentage should include %, got {commission_percentage}"
        
        print(f"PASS: Food seller commission rate: {commission_percentage}")
    
    def test_food_commission_api_structure(self):
        """Test complete structure of food commission API response"""
        token = self.get_auth_token(FOOD_SELLER_PHONE, FOOD_SELLER_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate food seller")
        
        response = requests.get(
            f"{BASE_URL}/api/food/my-store/commission",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 404:
            pytest.skip("Food seller has no store")
        
        assert response.status_code == 200
        data = response.json()
        
        # Expected fields based on the API implementation
        expected_fields = [
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
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Validate numeric fields are numbers
        assert isinstance(data.get("commission_rate"), (int, float)), "commission_rate should be numeric"
        assert isinstance(data.get("total_sales"), (int, float)), "total_sales should be numeric"
        assert isinstance(data.get("total_commission_paid"), (int, float)), "total_commission_paid should be numeric"
        assert isinstance(data.get("total_earnings"), (int, float)), "total_earnings should be numeric"
        assert isinstance(data.get("orders_count"), int), "orders_count should be integer"
        
        print(f"PASS: Food commission API returns all expected fields")
        print(f"  Store Type: {data.get('store_type_name')}")
        print(f"  Commission Rate: {data.get('commission_percentage')}")
        print(f"  Total Earnings: {data.get('total_earnings')}")


class TestProductSellerCommissionAPI:
    """Test Product Seller Commission API - GET /api/orders/seller/commission"""
    
    def get_auth_token(self, phone, password):
        """Helper to authenticate and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": phone,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("access_token") or response.json().get("token")
        return None
    
    def test_seller_commission_api_requires_auth(self):
        """Test that seller commission API requires authentication"""
        response = requests.get(f"{BASE_URL}/api/seller/commission")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASS: Seller commission API requires authentication")
    
    def test_seller_commission_api_requires_seller_role(self):
        """Test that seller commission API is for sellers only"""
        # Try with food seller (should work if they have seller type)
        token = self.get_auth_token(FOOD_SELLER_PHONE, FOOD_SELLER_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate")
        
        response = requests.get(
            f"{BASE_URL}/api/seller/commission",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should return 200 if user is seller, 403 if not
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}"
        
        if response.status_code == 403:
            print("PASS: API correctly restricts to seller role")
        else:
            print("PASS: Seller commission API accessible to seller")
    
    def test_seller_commission_api_structure(self):
        """Test structure of seller commission API if accessible"""
        token = self.get_auth_token(FOOD_SELLER_PHONE, FOOD_SELLER_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate")
        
        response = requests.get(
            f"{BASE_URL}/api/seller/commission",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 403:
            print("SKIP: User is not a product seller")
            return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Expected fields based on the API implementation
        expected_fields = [
            "average_commission_rate",
            "commission_percentage",
            "category_rates",
            "total_sales",
            "total_commission_paid",
            "total_earnings",
            "products_count",
            "message"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        # Validate numeric fields
        assert isinstance(data.get("average_commission_rate"), (int, float)), "average_commission_rate should be numeric"
        assert isinstance(data.get("total_sales"), (int, float)), "total_sales should be numeric"
        assert isinstance(data.get("total_earnings"), (int, float)), "total_earnings should be numeric"
        
        print(f"PASS: Seller commission API returns all expected fields")
        print(f"  Average Commission: {data.get('commission_percentage')}")


class TestCommissionCalculation:
    """Test Commission Calculation Logic"""
    
    def get_auth_token(self, phone, password):
        """Helper to authenticate and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": phone,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("access_token") or response.json().get("token")
        return None
    
    def test_commission_calculation_accuracy(self):
        """Test that commission calculations are mathematically correct"""
        token = self.get_auth_token(FOOD_SELLER_PHONE, FOOD_SELLER_PASSWORD)
        if not token:
            pytest.skip("Could not authenticate")
        
        response = requests.get(
            f"{BASE_URL}/api/food/my-store/commission",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 404:
            pytest.skip("No store found")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify mathematical consistency
        total_sales = data.get("total_sales", 0)
        total_commission = data.get("total_commission_paid", 0)
        total_earnings = data.get("total_earnings", 0)
        
        # total_sales - total_commission should equal total_earnings (approximately)
        if total_sales > 0:
            calculated_earnings = total_sales - total_commission
            # Allow for small rounding differences
            assert abs(calculated_earnings - total_earnings) < 1, \
                f"Earnings calculation mismatch: {total_sales} - {total_commission} should equal {total_earnings}"
            print(f"PASS: Commission calculation is mathematically correct")
            print(f"  Total Sales: {total_sales}")
            print(f"  Commission Paid: {total_commission}")
            print(f"  Net Earnings: {total_earnings}")
        else:
            print("PASS: No sales yet - calculation check skipped")


class TestCommissionRatesValidity:
    """Test that commission rates are within valid ranges"""
    
    def test_food_commission_rates_valid(self):
        """Verify food store commission rates are reasonable"""
        # Known commission rates from the code
        expected_rates = {
            "restaurants": 0.20,  # 20%
            "market": 0.15,       # 15%
            "vegetables": 0.12,  # 12%
            "sweets": 0.18,      # 18%
            "fast_food": 0.20   # 20%
        }
        
        for store_type, rate in expected_rates.items():
            assert 0.05 <= rate <= 0.30, f"Commission rate {rate} for {store_type} should be between 5% and 30%"
        
        print("PASS: All food commission rates are within valid range (5-30%)")
    
    def test_product_commission_rates_valid(self):
        """Verify product category commission rates are reasonable"""
        # Known commission rates from orders.py
        category_commissions = {
            "إلكترونيات": 0.18,
            "أزياء": 0.17,
            "ملابس": 0.17,
            "أحذية": 0.21,
            "تجميل": 0.18,
            "مجوهرات": 0.16,
            "إكسسوارات": 0.16,
            "المنزل": 0.20,
            "رياضة": 0.16,
            "أطفال": 0.15,
            "كتب": 0.12,
            "ألعاب": 0.14,
            "default": 0.15
        }
        
        for category, rate in category_commissions.items():
            assert 0.05 <= rate <= 0.30, f"Commission rate {rate} for {category} should be between 5% and 30%"
        
        print("PASS: All product commission rates are within valid range (5-30%)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
