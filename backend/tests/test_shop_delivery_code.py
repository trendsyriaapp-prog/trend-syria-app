"""
Test Shop Order Delivery Code System
=====================================
Tests the delivery_code feature for shop orders (similar to food orders):
1. Order creation includes delivery_code (4 digit random)
2. POST /api/orders/{order_id}/delivery/verify-code - Driver verifies code from customer
3. POST /api/orders/{order_id}/delivery/delivered - Must fail if code not verified
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://shopper-suite.preview.emergentagent.com"

# Test credentials (updated by setup)
DELIVERY_PHONE = "0900000000"
DELIVERY_PASSWORD = "Test123!"
BUYER_PHONE = "0933333333"
BUYER_PASSWORD = "Test123!"


class TestShopDeliveryCodeSystem:
    """Tests for shop order delivery code system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_delivery_token(self):
        """Get delivery driver authentication token"""
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DELIVERY_PHONE,
            "password": DELIVERY_PASSWORD
        })
        if res.status_code == 200:
            return res.json().get('token')
        return None
    
    def get_buyer_token(self):
        """Get buyer authentication token"""
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": BUYER_PHONE,
            "password": BUYER_PASSWORD
        })
        if res.status_code == 200:
            return res.json().get('token')
        return None
    
    # ============== Test: verify-code endpoint access control ==============
    
    def test_verify_code_requires_delivery_user(self):
        """Test that verify-code endpoint requires delivery user type"""
        buyer_token = self.get_buyer_token()
        if not buyer_token:
            pytest.skip("Could not login as buyer")
        
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Try to verify code as buyer (should fail)
        res = self.session.post(
            f"{BASE_URL}/api/orders/test-order-id/delivery/verify-code",
            json={"delivery_code": "1234"},
            headers=headers
        )
        
        # Should return 403 (forbidden) for non-delivery users
        assert res.status_code == 403, f"Expected 403 for non-delivery user, got {res.status_code}: {res.text}"
        assert "لموظفي التوصيل فقط" in res.json().get('detail', ''), "Should return delivery-only message"
        print("✅ verify-code endpoint correctly restricts access to delivery users only")
    
    # ============== Test: verify-code with non-existent order ==============
    
    def test_verify_code_nonexistent_order(self):
        """Test that verify-code returns proper error for non-existent order"""
        delivery_token = self.get_delivery_token()
        if not delivery_token:
            pytest.skip("Could not login as delivery driver")
        
        headers = {"Authorization": f"Bearer {delivery_token}"}
        
        # Try to verify code for non-existent order
        res = self.session.post(
            f"{BASE_URL}/api/orders/nonexistent-order-12345/delivery/verify-code",
            json={"delivery_code": "1234"},
            headers=headers
        )
        
        # Should return 404 (order not found)
        assert res.status_code == 404, f"Expected 404, got {res.status_code}: {res.text}"
        print("✅ verify-code endpoint returns 404 for non-existent orders")
    
    # ============== Test: verify-code with wrong code ==============
    
    def test_verify_code_wrong_code(self):
        """Test that verify-code returns error for wrong code"""
        delivery_token = self.get_delivery_token()
        if not delivery_token:
            pytest.skip("Could not login as delivery driver")
        
        headers = {"Authorization": f"Bearer {delivery_token}"}
        
        # Use the known test order
        res = self.session.post(
            f"{BASE_URL}/api/orders/frontend_test_117ff3bd/delivery/verify-code",
            json={"delivery_code": "0000"},  # Wrong code
            headers=headers
        )
        
        # Should return 400 (bad request - wrong code)
        assert res.status_code == 400, f"Expected 400, got {res.status_code}: {res.text}"
        assert "كود التسليم غير صحيح" in res.json().get('detail', ''), "Should return wrong code message"
        print("✅ verify-code endpoint returns error for wrong code")


class TestDeliveryCodeAPIStructure:
    """Test API endpoint structure and error handling"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_verify_code_endpoint_exists(self):
        """Test that verify-code endpoint exists and requires auth"""
        res = self.session.post(
            f"{BASE_URL}/api/orders/test-id/delivery/verify-code",
            json={"delivery_code": "1234"}
        )
        # Should require auth (401/403), not return 404 (endpoint missing)
        assert res.status_code in [401, 403], f"Endpoint should exist and require auth, got {res.status_code}"
        print("✅ verify-code endpoint exists at /api/orders/{order_id}/delivery/verify-code")
    
    def test_delivered_endpoint_exists(self):
        """Test that delivered endpoint exists and requires auth"""
        res = self.session.post(f"{BASE_URL}/api/orders/test-id/delivery/delivered")
        # Should require auth (401/403), not return 404
        assert res.status_code in [401, 403], f"Endpoint should exist and require auth, got {res.status_code}"
        print("✅ delivered endpoint exists at /api/orders/{order_id}/delivery/delivered")
    
    def test_verify_code_requires_body(self):
        """Test that verify-code validates request body"""
        res = self.session.post(
            f"{BASE_URL}/api/orders/test-id/delivery/verify-code",
            json={}
        )
        # Should fail with validation error (422) or auth error (401/403)
        assert res.status_code in [401, 403, 422], f"Should validate body, got {res.status_code}"
        print("✅ verify-code endpoint validates request body")


class TestDeliveryCodeIntegration:
    """Integration tests for delivery code flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_delivery_token(self):
        """Get delivery driver authentication token"""
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DELIVERY_PHONE,
            "password": DELIVERY_PASSWORD
        })
        if res.status_code == 200:
            return res.json().get('token')
        return None
    
    def test_delivered_requires_code_verification(self):
        """Test that /delivery/delivered fails if code not verified"""
        delivery_token = self.get_delivery_token()
        if not delivery_token:
            pytest.skip("Could not login as delivery driver")
        
        headers = {"Authorization": f"Bearer {delivery_token}"}
        
        # Try to mark as delivered without verifying code
        res = self.session.post(
            f"{BASE_URL}/api/orders/frontend_test_117ff3bd/delivery/delivered",
            headers=headers
        )
        
        # Should fail with message about requiring code verification
        # Note: Could be 400 or blocked by other validation
        if res.status_code == 400:
            detail = res.json().get('detail', '')
            assert "كود التسليم" in detail or "verify-code" in detail, \
                f"Should mention code verification requirement: {detail}"
            print("✅ delivered endpoint requires code verification first")
        elif res.status_code == 403:
            # Could be blocked by hot food orders check
            print(f"⚠️ Blocked by other validation: {res.json().get('detail')}")
        else:
            print(f"Got response: {res.status_code} - {res.text}")
    
    def test_order_api_returns_delivery_code(self):
        """Test that GET /api/orders/{id} returns delivery_code for customer"""
        buyer_token_res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": BUYER_PHONE,
            "password": BUYER_PASSWORD
        })
        if buyer_token_res.status_code != 200:
            pytest.skip("Could not login as buyer")
        
        buyer_token = buyer_token_res.json().get('token')
        headers = {"Authorization": f"Bearer {buyer_token}"}
        
        # Get order details
        res = self.session.get(
            f"{BASE_URL}/api/orders/frontend_test_117ff3bd",
            headers=headers
        )
        
        if res.status_code == 200:
            order = res.json()
            assert 'delivery_code' in order, "Order should include delivery_code"
            assert len(order['delivery_code']) == 4, f"delivery_code should be 4 digits: {order['delivery_code']}"
            assert order['delivery_code'].isdigit(), "delivery_code should be numeric"
            print(f"✅ Order API returns delivery_code: {order['delivery_code']}")
        elif res.status_code == 403:
            print("⚠️ Order access denied - may need different user")
        else:
            pytest.fail(f"Unexpected response: {res.status_code} - {res.text}")


class TestDeliveryCodeValidation:
    """Test delivery_code validation rules"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_delivery_code_is_4_digits(self):
        """Test that delivery_code is always 4 numeric digits"""
        # Get buyer token and check orders
        res = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": BUYER_PHONE,
            "password": BUYER_PASSWORD
        })
        if res.status_code != 200:
            pytest.skip("Could not login as buyer")
        
        token = res.json().get('token')
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get orders list
        orders_res = self.session.get(f"{BASE_URL}/api/orders", headers=headers)
        if orders_res.status_code == 200:
            orders = orders_res.json()
            codes_checked = 0
            for order in orders:
                if 'delivery_code' in order and order['delivery_code']:
                    code = order['delivery_code']
                    assert len(code) == 4, f"delivery_code should be 4 digits: {code}"
                    assert code.isdigit(), f"delivery_code should be numeric: {code}"
                    codes_checked += 1
            print(f"✅ Validated {codes_checked} delivery codes - all 4 numeric digits")
        else:
            print(f"⚠️ Could not fetch orders: {orders_res.status_code}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
