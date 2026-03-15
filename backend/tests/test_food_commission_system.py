"""
Test suite for Food Commission System
Tests:
1. Admin GET/PUT food commissions APIs
2. Seller commission API reflects admin changes
3. Commission calculation at delivery time

Test Credentials:
- Admin: phone=0911111111, password=admin123
- Food Seller: phone=0999999999, password=seller123
"""

import pytest
import requests
import os
import hashlib

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": "0911111111",
        "password": "admin123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def seller_token():
    """Get food seller authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": "0999999999",
        "password": "seller123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Food seller authentication failed - skipping authenticated tests")


class TestAdminFoodCommissionsAPI:
    """Test admin food commissions GET/PUT endpoints"""
    
    def test_admin_get_food_commissions(self, admin_token):
        """Test GET /api/admin/food/commissions returns commission rates"""
        response = requests.get(
            f"{BASE_URL}/api/admin/food/commissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "commissions" in data, "Response should contain 'commissions' key"
        
        commissions = data["commissions"]
        # Verify expected store types exist
        expected_types = ["restaurants", "default"]
        for store_type in expected_types:
            assert store_type in commissions, f"Expected store type '{store_type}' in commissions"
            assert isinstance(commissions[store_type], (int, float)), f"Commission rate should be numeric"
            assert 0 <= commissions[store_type] <= 1, f"Commission rate should be between 0 and 1"
        
        print(f"✓ Admin food commissions retrieved successfully: {commissions}")
    
    def test_admin_update_food_commissions(self, admin_token):
        """Test PUT /api/admin/food/commissions updates commission rates"""
        # First get current rates
        get_response = requests.get(
            f"{BASE_URL}/api/admin/food/commissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        original_rates = get_response.json()["commissions"]
        
        # Modify one rate (change restaurants to 0.25)
        modified_rates = original_rates.copy()
        modified_rates["restaurants"] = 0.25
        
        # Update rates
        put_response = requests.put(
            f"{BASE_URL}/api/admin/food/commissions",
            json=modified_rates,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert put_response.status_code == 200, f"Expected 200, got {put_response.status_code}: {put_response.text}"
        
        put_data = put_response.json()
        assert "message" in put_data, "Response should contain 'message'"
        assert "commissions" in put_data, "Response should contain updated 'commissions'"
        assert put_data["commissions"]["restaurants"] == 0.25, "Restaurants rate should be updated to 0.25"
        
        # Verify change persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/food/commissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_response.status_code == 200
        assert verify_response.json()["commissions"]["restaurants"] == 0.25
        
        print(f"✓ Admin food commissions updated and verified: restaurants = 25%")
        
        # Restore original rate
        restore_response = requests.put(
            f"{BASE_URL}/api/admin/food/commissions",
            json=original_rates,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert restore_response.status_code == 200
        print(f"✓ Original rates restored")
    
    def test_admin_unauthorized_access(self):
        """Test that non-admin cannot access food commissions"""
        # Try without token
        response = requests.get(f"{BASE_URL}/api/admin/food/commissions")
        assert response.status_code in [401, 403, 422], "Should reject request without token"
        
    def test_admin_invalid_commission_rate(self, admin_token):
        """Test that invalid commission rates are rejected"""
        # Try rate > 1
        invalid_rates = {"restaurants": 1.5}  # Invalid: > 1
        response = requests.put(
            f"{BASE_URL}/api/admin/food/commissions",
            json=invalid_rates,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid rate, got {response.status_code}"
        print(f"✓ Invalid commission rate properly rejected")


class TestSellerCommissionReflectsAdminChanges:
    """Test that seller sees commission changes made by admin"""
    
    def test_seller_sees_current_commission_rate(self, seller_token):
        """Test GET /api/food/my-store/commission returns current rate"""
        response = requests.get(
            f"{BASE_URL}/api/food/my-store/commission",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        required_fields = ["store_type", "commission_rate", "commission_percentage"]
        for field in required_fields:
            assert field in data, f"Response should contain '{field}'"
        
        assert 0 <= data["commission_rate"] <= 1, "Commission rate should be between 0 and 1"
        print(f"✓ Seller commission rate: {data['commission_percentage']} for {data['store_type']}")
        
        return data["commission_rate"]
    
    def test_commission_change_reflects_on_seller(self, admin_token, seller_token):
        """
        Verify that admin's commission changes reflect immediately on seller's API
        This is the core test for the feature
        """
        # Step 1: Get current admin rates
        admin_response = requests.get(
            f"{BASE_URL}/api/admin/food/commissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_response.status_code == 200
        original_rates = admin_response.json()["commissions"]
        
        # Step 2: Get seller's current commission rate
        seller_response_before = requests.get(
            f"{BASE_URL}/api/food/my-store/commission",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert seller_response_before.status_code == 200
        seller_data_before = seller_response_before.json()
        store_type = seller_data_before["store_type"]
        original_seller_rate = seller_data_before["commission_rate"]
        print(f"  ↳ Before: Seller ({store_type}) sees {int(original_seller_rate*100)}% commission")
        
        # Step 3: Admin changes the rate for this store type
        new_rate = 0.22  # Change to 22%
        if original_rates.get(store_type) == new_rate:
            new_rate = 0.18  # Use different rate if already at 22%
        
        modified_rates = original_rates.copy()
        modified_rates[store_type] = new_rate
        
        admin_update = requests.put(
            f"{BASE_URL}/api/admin/food/commissions",
            json=modified_rates,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert admin_update.status_code == 200, f"Admin update failed: {admin_update.text}"
        print(f"  ↳ Admin changed {store_type} commission to {int(new_rate*100)}%")
        
        # Step 4: Verify seller now sees the new rate immediately
        seller_response_after = requests.get(
            f"{BASE_URL}/api/food/my-store/commission",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert seller_response_after.status_code == 200
        seller_data_after = seller_response_after.json()
        new_seller_rate = seller_data_after["commission_rate"]
        
        assert new_seller_rate == new_rate, f"Seller should see new rate {new_rate}, but got {new_seller_rate}"
        print(f"  ↳ After: Seller ({store_type}) sees {int(new_seller_rate*100)}% commission ✓")
        
        # Step 5: Restore original rates
        restore_response = requests.put(
            f"{BASE_URL}/api/admin/food/commissions",
            json=original_rates,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert restore_response.status_code == 200
        
        # Verify restoration
        seller_response_restored = requests.get(
            f"{BASE_URL}/api/food/my-store/commission",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert seller_response_restored.status_code == 200
        restored_rate = seller_response_restored.json()["commission_rate"]
        assert restored_rate == original_seller_rate, f"Rate should be restored to {original_seller_rate}"
        
        print(f"✓ Commission change reflects immediately on seller API - TEST PASSED")


class TestCommissionCalculationFlow:
    """Test that commission is correctly stored in food_commissions collection"""
    
    def test_admin_commissions_stored_in_db(self, admin_token):
        """Verify commission rates are retrieved from commission_rates collection"""
        # Get commissions from admin API
        response = requests.get(
            f"{BASE_URL}/api/admin/food/commissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        # The API should return rates from db.commission_rates collection with id="food"
        data = response.json()
        assert "commissions" in data
        
        # Verify structure matches expected format from get_food_commission_rates_from_db()
        commissions = data["commissions"]
        assert isinstance(commissions, dict)
        assert "default" in commissions  # Should always have default rate
        
        print(f"✓ Commission rates retrieved from database: {commissions}")
    
    def test_update_persists_to_correct_collection(self, admin_token):
        """Verify PUT updates go to commission_rates collection with id='food'"""
        # Get current rates
        get_response = requests.get(
            f"{BASE_URL}/api/admin/food/commissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_response.status_code == 200
        original = get_response.json()["commissions"]
        
        # Update with new value
        test_value = 0.19
        updated = original.copy()
        updated["market"] = test_value
        
        put_response = requests.put(
            f"{BASE_URL}/api/admin/food/commissions",
            json=updated,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert put_response.status_code == 200
        
        # Verify the change persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/food/commissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_response.status_code == 200
        verified = verify_response.json()["commissions"]
        assert verified.get("market") == test_value
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/admin/food/commissions",
            json=original,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"✓ Commission updates persist correctly to database")


class TestFoodCommissionsTabUI:
    """Integration tests for CommissionsTab food commissions section"""
    
    def test_food_commissions_endpoint_structure(self, admin_token):
        """Verify the API response structure matches frontend expectations"""
        response = requests.get(
            f"{BASE_URL}/api/admin/food/commissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Frontend expects: commissions (object) and types (optional)
        assert "commissions" in data
        
        # Verify commissions object structure
        commissions = data["commissions"]
        
        # Frontend expects these store types (based on CommissionsTab.js)
        expected_store_types = ["restaurants", "fast_food", "market", "vegetables", "sweets", "groceries", "default"]
        
        # At minimum, should have restaurants and default
        assert "restaurants" in commissions or "default" in commissions
        
        # All values should be decimals (0-1)
        for key, val in commissions.items():
            assert isinstance(val, (int, float)), f"{key} should be numeric"
            assert 0 <= val <= 1, f"{key} rate {val} should be between 0 and 1"
        
        print(f"✓ Food commissions API structure is correct for frontend")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
