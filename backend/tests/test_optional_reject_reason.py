# /app/backend/tests/test_optional_reject_reason.py
# Tests for optional rejection reason feature - All admin rejection APIs should accept requests without 'reason' field

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": "0912345678",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")

@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestSellerRejectOptionalReason:
    """Test /api/admin/sellers/{id}/reject - reason should be optional"""
    
    def test_reject_seller_without_reason(self, api_client, admin_headers):
        """Test rejecting a seller without providing a reason - should succeed"""
        # First get pending sellers
        response = api_client.get(f"{BASE_URL}/api/admin/sellers/pending", headers=admin_headers)
        assert response.status_code == 200
        
        pending = response.json()
        if len(pending) == 0:
            # No pending sellers, create a test scenario by checking all sellers
            api_client.get(f"{BASE_URL}/api/admin/sellers/all", headers=admin_headers)
            pytest.skip("No pending sellers available to test rejection")
        
        # Use first pending seller
        seller_id = pending[0].get("seller_id")
        
        # Reject without reason - using empty body
        reject_response = api_client.post(
            f"{BASE_URL}/api/admin/sellers/{seller_id}/reject",
            headers=admin_headers,
            json={}  # Empty body - no reason
        )
        
        # Should succeed with 200
        assert reject_response.status_code == 200, f"Expected 200, got {reject_response.status_code}: {reject_response.text}"
        
        data = reject_response.json()
        assert "message" in data
        # Reason should be None or empty
        assert data.get("reason") is None or data.get("reason") == ""
    
    def test_reject_seller_with_reason(self, api_client, admin_headers):
        """Test rejecting a seller with a reason - should succeed and return reason"""
        response = api_client.get(f"{BASE_URL}/api/admin/sellers/pending", headers=admin_headers)
        
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No pending sellers available")
        
        seller_id = response.json()[0].get("seller_id")
        test_reason = "وثائق غير مكتملة - يرجى إعادة التقديم"
        
        reject_response = api_client.post(
            f"{BASE_URL}/api/admin/sellers/{seller_id}/reject",
            headers=admin_headers,
            json={"reason": test_reason}
        )
        
        assert reject_response.status_code == 200
        data = reject_response.json()
        assert data.get("reason") == test_reason


class TestDeliveryRejectOptionalReason:
    """Test /api/admin/delivery/{id}/reject - reason should be optional"""
    
    def test_reject_delivery_without_reason(self, api_client, admin_headers):
        """Test rejecting a delivery driver without providing a reason"""
        response = api_client.get(f"{BASE_URL}/api/admin/delivery/pending", headers=admin_headers)
        assert response.status_code == 200
        
        pending = response.json()
        if len(pending) == 0:
            pytest.skip("No pending delivery drivers available")
        
        driver_id = pending[0].get("driver_id") or pending[0].get("delivery_id")
        
        # Reject without reason
        reject_response = api_client.post(
            f"{BASE_URL}/api/admin/delivery/{driver_id}/reject",
            headers=admin_headers,
            json={}
        )
        
        assert reject_response.status_code == 200, f"Expected 200, got {reject_response.status_code}: {reject_response.text}"
        data = reject_response.json()
        assert "message" in data
        assert data.get("reason") is None or data.get("reason") == ""
    
    def test_reject_delivery_with_reason(self, api_client, admin_headers):
        """Test rejecting a delivery driver with a reason"""
        response = api_client.get(f"{BASE_URL}/api/admin/delivery/pending", headers=admin_headers)
        
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No pending delivery drivers available")
        
        driver_id = response.json()[0].get("driver_id") or response.json()[0].get("delivery_id")
        test_reason = "صورة الهوية غير واضحة"
        
        reject_response = api_client.post(
            f"{BASE_URL}/api/admin/delivery/{driver_id}/reject",
            headers=admin_headers,
            json={"reason": test_reason}
        )
        
        assert reject_response.status_code == 200
        data = reject_response.json()
        assert data.get("reason") == test_reason


class TestFoodStoreRejectOptionalReason:
    """Test /api/admin/food/stores/{id}/reject - reason should be optional"""
    
    def test_reject_food_store_without_reason(self, api_client, admin_headers):
        """Test rejecting a food store without providing a reason"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/food/stores",
            headers=admin_headers,
            params={"status": "pending"}
        )
        assert response.status_code == 200
        
        pending = response.json()
        if len(pending) == 0:
            pytest.skip("No pending food stores available")
        
        store_id = pending[0].get("id")
        
        # Reject without reason
        reject_response = api_client.post(
            f"{BASE_URL}/api/admin/food/stores/{store_id}/reject",
            headers=admin_headers,
            json={}
        )
        
        assert reject_response.status_code == 200, f"Expected 200, got {reject_response.status_code}: {reject_response.text}"
        data = reject_response.json()
        assert "message" in data
        assert data.get("reason") is None or data.get("reason") == ""
    
    def test_reject_food_store_with_reason(self, api_client, admin_headers):
        """Test rejecting a food store with a reason"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/food/stores",
            headers=admin_headers,
            params={"status": "pending"}
        )
        
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No pending food stores available")
        
        store_id = response.json()[0].get("id")
        test_reason = "المعلومات غير مكتملة"
        
        reject_response = api_client.post(
            f"{BASE_URL}/api/admin/food/stores/{store_id}/reject",
            headers=admin_headers,
            json={"reason": test_reason}
        )
        
        assert reject_response.status_code == 200
        data = reject_response.json()
        assert data.get("reason") == test_reason


class TestFoodOfferRejectOptionalReason:
    """Test PUT /api/admin/food-offers/{id}/reject - reason should be optional"""
    
    def test_reject_food_offer_without_reason(self, api_client, admin_headers):
        """Test rejecting a food offer without providing a reason"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/food-offers",
            headers=admin_headers,
            params={"status": "pending"}
        )
        assert response.status_code == 200
        
        pending = response.json()
        if len(pending) == 0:
            # Try to get all offers
            all_response = api_client.get(
                f"{BASE_URL}/api/admin/food-offers",
                headers=admin_headers
            )
            if all_response.status_code == 200 and len(all_response.json()) > 0:
                # Test with first offer that is not already rejected
                offers = [o for o in all_response.json() if not o.get("admin_rejected")]
                if len(offers) == 0:
                    pytest.skip("No food offers available to test rejection")
                pending = offers
            else:
                pytest.skip("No food offers available")
        
        offer_id = pending[0].get("id")
        
        # Reject without reason using PUT
        reject_response = api_client.put(
            f"{BASE_URL}/api/admin/food-offers/{offer_id}/reject",
            headers=admin_headers,
            json={}
        )
        
        assert reject_response.status_code == 200, f"Expected 200, got {reject_response.status_code}: {reject_response.text}"
        data = reject_response.json()
        assert "message" in data
        assert data.get("reason") is None or data.get("reason") == ""
    
    def test_reject_food_offer_with_reason(self, api_client, admin_headers):
        """Test rejecting a food offer with a reason"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/food-offers",
            headers=admin_headers
        )
        
        if response.status_code != 200:
            pytest.skip("Cannot fetch food offers")
        
        offers = [o for o in response.json() if not o.get("admin_rejected")]
        if len(offers) == 0:
            pytest.skip("No food offers available to test rejection")
        
        offer_id = offers[0].get("id")
        test_reason = "العرض لا يتوافق مع سياسة المنصة"
        
        reject_response = api_client.put(
            f"{BASE_URL}/api/admin/food-offers/{offer_id}/reject",
            headers=admin_headers,
            json={"reason": test_reason}
        )
        
        assert reject_response.status_code == 200
        data = reject_response.json()
        assert data.get("reason") == test_reason


class TestRejectAPIsRequireAuth:
    """Test that rejection APIs require admin authentication"""
    
    def test_reject_seller_requires_auth(self, api_client):
        """Reject seller should return 401 without auth"""
        response = api_client.post(
            f"{BASE_URL}/api/admin/sellers/test-id/reject",
            json={}
        )
        assert response.status_code == 401
    
    def test_reject_delivery_requires_auth(self, api_client):
        """Reject delivery should return 401 without auth"""
        response = api_client.post(
            f"{BASE_URL}/api/admin/delivery/test-id/reject",
            json={}
        )
        assert response.status_code == 401
    
    def test_reject_food_store_requires_auth(self, api_client):
        """Reject food store should return 401 without auth"""
        response = api_client.post(
            f"{BASE_URL}/api/admin/food/stores/test-id/reject",
            json={}
        )
        assert response.status_code == 401
    
    def test_reject_food_offer_requires_auth(self, api_client):
        """Reject food offer should return 401 without auth"""
        response = api_client.put(
            f"{BASE_URL}/api/admin/food-offers/test-id/reject",
            json={}
        )
        assert response.status_code == 401


class TestRejectAPIsNonAdminForbidden:
    """Test that rejection APIs require admin role"""
    
    @pytest.fixture
    def buyer_headers(self, api_client):
        """Get buyer authentication token"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0933333333",
            "password": "user123"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        pytest.skip("Buyer authentication failed")
    
    def test_reject_seller_forbidden_for_buyer(self, api_client, buyer_headers):
        """Reject seller should return 403 for non-admin"""
        response = api_client.post(
            f"{BASE_URL}/api/admin/sellers/test-id/reject",
            headers=buyer_headers,
            json={}
        )
        assert response.status_code == 403
    
    def test_reject_delivery_forbidden_for_buyer(self, api_client, buyer_headers):
        """Reject delivery should return 403 for non-admin"""
        response = api_client.post(
            f"{BASE_URL}/api/admin/delivery/test-id/reject",
            headers=buyer_headers,
            json={}
        )
        assert response.status_code == 403
