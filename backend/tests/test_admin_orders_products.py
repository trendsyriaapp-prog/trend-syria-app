# /app/backend/tests/test_admin_orders_products.py
# Tests for Admin Orders and Products Management APIs
# Features: Cancel Order, Change Status, Refund, Toggle Product Visibility, Delete Product

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "Admin@123"


class TestAdminAuth:
    """Test admin authentication"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"✅ Admin login successful, token length: {len(admin_token)}")


class TestAdminOrdersAPIs:
    """Test Admin Orders Management APIs"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_all_orders(self, auth_headers):
        """Test fetching all orders"""
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        orders = response.json()
        assert isinstance(orders, list), "Orders should be a list"
        print(f"✅ Got {len(orders)} orders")
        return orders
    
    def test_cancel_order_api_exists(self, auth_headers):
        """Test that cancel order API endpoint exists"""
        # Test with a fake order ID to verify endpoint exists
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{fake_order_id}/cancel",
            headers=auth_headers,
            json={"reason": "test", "admin_note": "test"}
        )
        # Should return 404 (order not found) not 405 (method not allowed)
        assert response.status_code in [404, 400], f"Unexpected status: {response.status_code}, {response.text}"
        print(f"✅ Cancel order API exists (returned {response.status_code} for non-existent order)")
    
    def test_change_status_api_exists(self, auth_headers):
        """Test that change status API endpoint exists"""
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{fake_order_id}/status",
            headers=auth_headers,
            json={"status": "confirmed", "admin_note": "test"}
        )
        # Should return 404 (order not found) not 405 (method not allowed)
        assert response.status_code in [404, 400], f"Unexpected status: {response.status_code}, {response.text}"
        print(f"✅ Change status API exists (returned {response.status_code} for non-existent order)")
    
    def test_refund_api_exists(self, auth_headers):
        """Test that refund API endpoint exists"""
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{fake_order_id}/refund",
            headers=auth_headers,
            json={"admin_note": "test"}
        )
        # Should return 404 (order not found) not 405 (method not allowed)
        assert response.status_code in [404, 400], f"Unexpected status: {response.status_code}, {response.text}"
        print(f"✅ Refund API exists (returned {response.status_code} for non-existent order)")
    
    def test_change_status_invalid_status(self, auth_headers):
        """Test that invalid status is rejected"""
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{fake_order_id}/status",
            headers=auth_headers,
            json={"status": "invalid_status", "admin_note": "test"}
        )
        # Should return 400 for invalid status
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print(f"✅ Invalid status correctly rejected")
    
    def test_change_status_missing_status(self, auth_headers):
        """Test that missing status is rejected"""
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{fake_order_id}/status",
            headers=auth_headers,
            json={"admin_note": "test"}  # Missing status
        )
        # Should return 400 for missing status
        assert response.status_code == 400, f"Expected 400 for missing status, got {response.status_code}"
        print(f"✅ Missing status correctly rejected")


class TestAdminProductsAPIs:
    """Test Admin Products Management APIs"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_all_products(self, auth_headers):
        """Test fetching all products"""
        response = requests.get(f"{BASE_URL}/api/admin/products/all", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get products: {response.text}"
        products = response.json()
        assert isinstance(products, list), "Products should be a list"
        print(f"✅ Got {len(products)} products")
        return products
    
    def test_toggle_visibility_api_exists(self, auth_headers):
        """Test that toggle visibility API endpoint exists"""
        fake_product_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/products/{fake_product_id}/toggle-visibility",
            headers=auth_headers
        )
        # Should return 404 (product not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Unexpected status: {response.status_code}, {response.text}"
        print(f"✅ Toggle visibility API exists (returned 404 for non-existent product)")
    
    def test_delete_product_api_exists(self, auth_headers):
        """Test that delete product API endpoint exists"""
        fake_product_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/admin/products/{fake_product_id}",
            headers=auth_headers
        )
        # Should return 404 (product not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Unexpected status: {response.status_code}, {response.text}"
        print(f"✅ Delete product API exists (returned 404 for non-existent product)")


class TestAdminOrdersWithRealData:
    """Test Admin Orders APIs with real data if available"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def existing_order(self, auth_headers):
        """Get an existing order for testing"""
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Cannot fetch orders")
        orders = response.json()
        # Find an order that's not delivered or cancelled
        for order in orders:
            if order.get("status") not in ["delivered", "cancelled", "refunded", "completed"]:
                return order
        pytest.skip("No suitable order found for testing")
    
    def test_cancel_real_order(self, auth_headers, existing_order):
        """Test cancelling a real order"""
        order_id = existing_order["id"]
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{order_id}/cancel",
            headers=auth_headers,
            json={"reason": "customer_request", "admin_note": "Test cancellation"}
        )
        assert response.status_code == 200, f"Failed to cancel order: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✅ Successfully cancelled order {order_id[:8]}")


class TestAdminProductsWithRealData:
    """Test Admin Products APIs with real data if available"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    @pytest.fixture(scope="class")
    def existing_product(self, auth_headers):
        """Get an existing product for testing"""
        response = requests.get(f"{BASE_URL}/api/admin/products/all", headers=auth_headers)
        if response.status_code != 200:
            pytest.skip("Cannot fetch products")
        products = response.json()
        if not products:
            pytest.skip("No products found for testing")
        return products[0]
    
    def test_toggle_product_visibility(self, auth_headers, existing_product):
        """Test toggling product visibility"""
        product_id = existing_product["id"]
        original_hidden = existing_product.get("is_hidden", False)
        
        # Toggle visibility
        response = requests.post(
            f"{BASE_URL}/api/admin/products/{product_id}/toggle-visibility",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed to toggle visibility: {response.text}"
        data = response.json()
        assert "is_hidden" in data
        assert data["is_hidden"] != original_hidden, "Visibility should have toggled"
        print(f"✅ Toggled product visibility from {original_hidden} to {data['is_hidden']}")
        
        # Toggle back to original state
        response2 = requests.post(
            f"{BASE_URL}/api/admin/products/{product_id}/toggle-visibility",
            headers=auth_headers
        )
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["is_hidden"] == original_hidden, "Should have toggled back"
        print(f"✅ Toggled product visibility back to {original_hidden}")


class TestUnauthorizedAccess:
    """Test that APIs reject unauthorized access"""
    
    def test_cancel_order_without_auth(self):
        """Test cancel order without authentication"""
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{fake_order_id}/cancel",
            json={"reason": "test"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Cancel order correctly requires authentication")
    
    def test_change_status_without_auth(self):
        """Test change status without authentication"""
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{fake_order_id}/status",
            json={"status": "confirmed"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Change status correctly requires authentication")
    
    def test_refund_without_auth(self):
        """Test refund without authentication"""
        fake_order_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/orders/{fake_order_id}/refund",
            json={}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Refund correctly requires authentication")
    
    def test_toggle_visibility_without_auth(self):
        """Test toggle visibility without authentication"""
        fake_product_id = str(uuid.uuid4())
        response = requests.post(
            f"{BASE_URL}/api/admin/products/{fake_product_id}/toggle-visibility"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Toggle visibility correctly requires authentication")
    
    def test_delete_product_without_auth(self):
        """Test delete product without authentication"""
        fake_product_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/admin/products/{fake_product_id}"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✅ Delete product correctly requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
