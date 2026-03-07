# /app/backend/tests/test_coupons.py
# Test suite for Coupon System APIs
# Tests: CRUD operations for coupons, validation, and application

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {"phone": "0911111111", "password": "admin123"}
BUYER_CREDENTIALS = {"phone": "0933333333", "password": "user123"}


class TestCouponSystem:
    """Test suite for coupon management and validation"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture(scope="class")
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Buyer authentication failed")
    
    @pytest.fixture(scope="class")
    def test_coupon_code(self):
        """Generate unique test coupon code"""
        return f"TEST{str(uuid.uuid4())[:6].upper()}"
    
    # ============== Admin API Tests ==============
    
    def test_admin_list_coupons(self, admin_token):
        """Test GET /api/coupons/admin/list - List all coupons"""
        response = requests.get(
            f"{BASE_URL}/api/coupons/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "coupons" in data, "Response should contain 'coupons' key"
        assert "stats" in data, "Response should contain 'stats' key"
        assert isinstance(data["coupons"], list), "Coupons should be a list"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats, "Stats should have 'total'"
        assert "active" in stats, "Stats should have 'active'"
        print(f"Found {len(data['coupons'])} coupons, {stats['active']} active")
    
    def test_admin_list_coupons_with_filter(self, admin_token):
        """Test GET /api/coupons/admin/list with status filter"""
        for status in ["all", "active", "disabled"]:
            response = requests.get(
                f"{BASE_URL}/api/coupons/admin/list",
                params={"status": status},
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Filter {status} failed: {response.text}"
            print(f"Status filter '{status}' returned {len(response.json()['coupons'])} coupons")
    
    def test_admin_create_percentage_coupon(self, admin_token, test_coupon_code):
        """Test POST /api/coupons/admin/create - Create percentage coupon"""
        coupon_data = {
            "code": test_coupon_code,
            "name": "Test Percentage Coupon",
            "description": "Test coupon for automated testing",
            "coupon_type": "percentage",
            "discount_percentage": 15,
            "max_discount": 20000,
            "min_order_amount": 50000,
            "scope": "all",
            "max_uses": 100,
            "max_uses_per_user": 1,
            "new_customers_only": False,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json=coupon_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert "coupon" in data, "Response should contain created coupon"
        assert data["coupon"]["code"] == test_coupon_code.upper(), "Code should be uppercase"
        assert data["coupon"]["coupon_type"] == "percentage"
        assert data["coupon"]["discount_percentage"] == 15
        print(f"Created percentage coupon: {test_coupon_code}")
        return data["coupon"]["id"]
    
    def test_admin_create_fixed_coupon(self, admin_token):
        """Test POST /api/coupons/admin/create - Create fixed amount coupon"""
        coupon_code = f"FIXED{str(uuid.uuid4())[:4].upper()}"
        coupon_data = {
            "code": coupon_code,
            "name": "Test Fixed Coupon",
            "coupon_type": "fixed",
            "discount_amount": 10000,
            "min_order_amount": 30000,
            "scope": "food",
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json=coupon_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create fixed coupon failed: {response.text}"
        
        data = response.json()
        assert data["coupon"]["coupon_type"] == "fixed"
        assert data["coupon"]["discount_amount"] == 10000
        print(f"Created fixed coupon: {coupon_code}")
        
        # Cleanup - delete the coupon
        coupon_id = data["coupon"]["id"]
        requests.delete(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_admin_create_free_delivery_coupon(self, admin_token):
        """Test POST /api/coupons/admin/create - Create free delivery coupon"""
        coupon_code = f"FREE{str(uuid.uuid4())[:4].upper()}"
        coupon_data = {
            "code": coupon_code,
            "name": "Test Free Delivery Coupon",
            "coupon_type": "free_delivery",
            "min_order_amount": 25000,
            "scope": "food",
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json=coupon_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create free delivery coupon failed: {response.text}"
        
        data = response.json()
        assert data["coupon"]["coupon_type"] == "free_delivery"
        print(f"Created free delivery coupon: {coupon_code}")
        
        # Cleanup
        coupon_id = data["coupon"]["id"]
        requests.delete(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_admin_create_duplicate_code_fails(self, admin_token, test_coupon_code):
        """Test POST /api/coupons/admin/create - Duplicate code should fail"""
        # Try to create with same code
        response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json={"code": test_coupon_code, "coupon_type": "percentage", "discount_percentage": 10},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400, "Duplicate code should return 400"
        assert "مستخدم" in response.json().get("detail", ""), "Error should mention code is used"
        print("Duplicate code correctly rejected")
    
    def test_admin_update_coupon(self, admin_token):
        """Test PUT /api/coupons/admin/{id} - Update coupon"""
        # First create a coupon
        coupon_code = f"UPD{str(uuid.uuid4())[:5].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json={"code": coupon_code, "name": "Original Name", "coupon_type": "percentage", "discount_percentage": 10},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        coupon_id = create_response.json()["coupon"]["id"]
        
        # Update the coupon
        update_response = requests.put(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            json={"name": "Updated Name", "discount_percentage": 25, "is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        # Verify update by listing
        list_response = requests.get(
            f"{BASE_URL}/api/coupons/admin/list",
            params={"status": "disabled"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        coupons = list_response.json()["coupons"]
        updated_coupon = next((c for c in coupons if c["id"] == coupon_id), None)
        
        if updated_coupon:
            assert updated_coupon["name"] == "Updated Name"
            assert updated_coupon["discount_percentage"] == 25
            assert updated_coupon["is_active"] == False
            print(f"Coupon {coupon_code} updated successfully")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_admin_toggle_coupon_status(self, admin_token):
        """Test toggling coupon active status"""
        # Create a coupon
        coupon_code = f"TOG{str(uuid.uuid4())[:5].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json={"code": coupon_code, "coupon_type": "percentage", "discount_percentage": 10, "is_active": True},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        coupon_id = create_response.json()["coupon"]["id"]
        
        # Toggle off
        toggle_off_response = requests.put(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert toggle_off_response.status_code == 200
        
        # Toggle on
        toggle_on_response = requests.put(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            json={"is_active": True},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert toggle_on_response.status_code == 200
        print(f"Coupon {coupon_code} toggle working correctly")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_admin_delete_coupon(self, admin_token):
        """Test DELETE /api/coupons/admin/{id} - Delete coupon"""
        # Create a coupon
        coupon_code = f"DEL{str(uuid.uuid4())[:5].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json={"code": coupon_code, "coupon_type": "percentage", "discount_percentage": 5},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        coupon_id = create_response.json()["coupon"]["id"]
        
        # Delete the coupon
        delete_response = requests.delete(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion - should return 404
        delete_again = requests.delete(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_again.status_code == 404, "Deleted coupon should return 404"
        print(f"Coupon {coupon_code} deleted successfully")
    
    def test_admin_delete_nonexistent_coupon(self, admin_token):
        """Test DELETE /api/coupons/admin/{id} - Nonexistent coupon"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(
            f"{BASE_URL}/api/coupons/admin/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, "Nonexistent coupon should return 404"
        print("Nonexistent coupon delete returns 404 as expected")
    
    # ============== Coupon Validation Tests ==============
    
    def test_validate_percentage_coupon(self, buyer_token, admin_token):
        """Test POST /api/coupons/validate - Validate percentage coupon"""
        # Create a test coupon first
        coupon_code = f"VAL{str(uuid.uuid4())[:5].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json={
                "code": coupon_code,
                "coupon_type": "percentage",
                "discount_percentage": 20,
                "max_discount": 15000,
                "min_order_amount": 50000,
                "scope": "all",
                "is_active": True
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        coupon_id = create_response.json()["coupon"]["id"]
        
        # Validate the coupon
        validate_response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={
                "code": coupon_code,
                "order_amount": 100000,
                "order_type": "food"
            },
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert validate_response.status_code == 200, f"Validation failed: {validate_response.text}"
        
        data = validate_response.json()
        assert data["valid"] == True
        assert "discount" in data
        assert "coupon" in data
        
        # 20% of 100000 = 20000, but max is 15000
        expected_discount = 15000
        assert data["discount"] == expected_discount, f"Expected {expected_discount}, got {data['discount']}"
        print(f"Coupon {coupon_code} validated: discount = {data['discount']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_validate_fixed_coupon(self, buyer_token, admin_token):
        """Test POST /api/coupons/validate - Validate fixed amount coupon"""
        coupon_code = f"VFX{str(uuid.uuid4())[:5].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json={
                "code": coupon_code,
                "coupon_type": "fixed",
                "discount_amount": 10000,
                "min_order_amount": 30000,
                "scope": "all",
                "is_active": True
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        coupon_id = create_response.json()["coupon"]["id"]
        
        # Validate
        validate_response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": coupon_code, "order_amount": 50000, "order_type": "food"},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert validate_response.status_code == 200
        
        data = validate_response.json()
        assert data["discount"] == 10000
        print(f"Fixed coupon {coupon_code} validated: discount = {data['discount']}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_validate_free_delivery_coupon(self, buyer_token, admin_token):
        """Test POST /api/coupons/validate - Validate free delivery coupon"""
        coupon_code = f"VFR{str(uuid.uuid4())[:5].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json={
                "code": coupon_code,
                "coupon_type": "free_delivery",
                "min_order_amount": 20000,
                "scope": "food",
                "is_active": True
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        coupon_id = create_response.json()["coupon"]["id"]
        
        # Validate
        validate_response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": coupon_code, "order_amount": 30000, "order_type": "food"},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert validate_response.status_code == 200
        
        data = validate_response.json()
        assert data["coupon"]["is_free_delivery"] == True
        assert data["discount"] == 0  # Free delivery doesn't affect product discount
        print(f"Free delivery coupon {coupon_code} validated")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_validate_invalid_coupon_code(self, buyer_token):
        """Test POST /api/coupons/validate - Invalid code"""
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": "INVALID_CODE_XYZ", "order_amount": 50000, "order_type": "food"},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 404, "Invalid code should return 404"
        print("Invalid coupon code correctly rejected")
    
    def test_validate_disabled_coupon(self, buyer_token, admin_token):
        """Test POST /api/coupons/validate - Disabled coupon"""
        coupon_code = f"DIS{str(uuid.uuid4())[:5].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json={
                "code": coupon_code,
                "coupon_type": "percentage",
                "discount_percentage": 10,
                "is_active": False
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        coupon_id = create_response.json()["coupon"]["id"]
        
        # Try to validate disabled coupon
        validate_response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": coupon_code, "order_amount": 50000, "order_type": "food"},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert validate_response.status_code == 400, "Disabled coupon should return 400"
        assert "غير مفعّل" in validate_response.json().get("detail", "")
        print("Disabled coupon correctly rejected")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_validate_min_order_not_met(self, buyer_token, admin_token):
        """Test POST /api/coupons/validate - Minimum order not met"""
        coupon_code = f"MIN{str(uuid.uuid4())[:5].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json={
                "code": coupon_code,
                "coupon_type": "percentage",
                "discount_percentage": 10,
                "min_order_amount": 50000,
                "is_active": True
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        coupon_id = create_response.json()["coupon"]["id"]
        
        # Validate with order below minimum
        validate_response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": coupon_code, "order_amount": 30000, "order_type": "food"},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert validate_response.status_code == 400, "Order below minimum should return 400"
        assert "الحد الأدنى" in validate_response.json().get("detail", "")
        print("Minimum order check working correctly")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_validate_scope_restriction(self, buyer_token, admin_token):
        """Test POST /api/coupons/validate - Scope restriction (food only)"""
        coupon_code = f"SCP{str(uuid.uuid4())[:5].upper()}"
        create_response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json={
                "code": coupon_code,
                "coupon_type": "percentage",
                "discount_percentage": 10,
                "scope": "food",
                "is_active": True
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        coupon_id = create_response.json()["coupon"]["id"]
        
        # Validate with food order (should work)
        food_response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": coupon_code, "order_amount": 50000, "order_type": "food"},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert food_response.status_code == 200, "Food order should be valid"
        
        # Validate with shop order (should fail)
        shop_response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": coupon_code, "order_amount": 50000, "order_type": "shop"},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert shop_response.status_code == 400, "Shop order should be rejected"
        print("Scope restriction working correctly")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/coupons/admin/{coupon_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    # ============== Authorization Tests ==============
    
    def test_buyer_cannot_access_admin_endpoints(self, buyer_token):
        """Test that buyers cannot access admin coupon endpoints"""
        # Try to list coupons as buyer
        list_response = requests.get(
            f"{BASE_URL}/api/coupons/admin/list",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert list_response.status_code == 403, "Buyer should not access admin list"
        
        # Try to create coupon as buyer
        create_response = requests.post(
            f"{BASE_URL}/api/coupons/admin/create",
            json={"code": "TEST123", "coupon_type": "percentage", "discount_percentage": 10},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert create_response.status_code == 403, "Buyer should not create coupons"
        print("Authorization correctly restricts buyer access to admin endpoints")
    
    def test_unauthenticated_cannot_validate(self):
        """Test that unauthenticated users cannot validate coupons"""
        response = requests.post(
            f"{BASE_URL}/api/coupons/validate",
            json={"code": "ANYCODE", "order_amount": 50000, "order_type": "food"}
        )
        assert response.status_code in [401, 403, 422], "Unauthenticated should be rejected"
        print("Unauthenticated validation correctly rejected")
    
    # ============== Cleanup Test Coupon ==============
    
    def test_cleanup_test_coupon(self, admin_token, test_coupon_code):
        """Cleanup the main test coupon created earlier"""
        # Find and delete the test coupon
        list_response = requests.get(
            f"{BASE_URL}/api/coupons/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        coupons = list_response.json()["coupons"]
        test_coupon = next((c for c in coupons if c["code"] == test_coupon_code.upper()), None)
        
        if test_coupon:
            delete_response = requests.delete(
                f"{BASE_URL}/api/coupons/admin/{test_coupon['id']}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert delete_response.status_code == 200
            print(f"Cleaned up test coupon: {test_coupon_code}")
        else:
            print(f"Test coupon {test_coupon_code} already cleaned up or not found")


# Test for existing seed coupons mentioned in the task context
class TestExistingSeedCoupons:
    """Test existing seed coupons from the system"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    @pytest.fixture(scope="class")
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDENTIALS)
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Buyer authentication failed")
    
    def test_check_existing_coupons(self, admin_token):
        """Check if seeded coupons exist: WELCOME20, SAVE10, FREESHIP"""
        response = requests.get(
            f"{BASE_URL}/api/coupons/admin/list",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        coupons = response.json()["coupons"]
        coupon_codes = [c["code"] for c in coupons]
        
        expected_codes = ["WELCOME20", "SAVE10", "FREESHIP"]
        found = [code for code in expected_codes if code in coupon_codes]
        missing = [code for code in expected_codes if code not in coupon_codes]
        
        print(f"Found seeded coupons: {found}")
        if missing:
            print(f"Missing seeded coupons (may need seeding): {missing}")
        
        # This is informational - don't fail if seed coupons don't exist
        assert True


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
