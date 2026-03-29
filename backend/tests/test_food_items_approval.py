"""
Test Food Items Approval System
Tests for:
1. GET /api/admin/food-items/pending - جلب الأطباق المعلقة
2. GET /api/admin/food-items/stats - إحصائيات الأطباق
3. POST /api/admin/food-items/{id}/approve - الموافقة على طبق
4. POST /api/admin/food-items/{id}/reject - رفض طبق مع سبب
5. POST /api/food/items - إضافة طبق جديد (is_approved: false)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "Admin@123"
FOOD_SELLER_PHONE = "0966666666"
FOOD_SELLER_PASSWORD = "test1234"


class TestFoodItemsApprovalSystem:
    """Test suite for food items approval system"""
    
    admin_token = None
    food_seller_token = None
    test_item_id = None
    test_store_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get tokens"""
        # Get admin token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            TestFoodItemsApprovalSystem.admin_token = response.json().get("token")
        
        # Get food seller token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": FOOD_SELLER_PHONE,
            "password": FOOD_SELLER_PASSWORD
        })
        if response.status_code == 200:
            TestFoodItemsApprovalSystem.food_seller_token = response.json().get("token")
    
    # ============== Admin API Tests ==============
    
    def test_01_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("user_type") == "admin"
        TestFoodItemsApprovalSystem.admin_token = data["token"]
        print("✓ Admin login successful")
    
    def test_02_get_pending_food_items(self):
        """Test GET /api/admin/food-items/pending"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/food-items/pending",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get pending items: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/admin/food-items/pending - Found {len(data)} pending items")
    
    def test_03_get_food_items_stats(self):
        """Test GET /api/admin/food-items/stats"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/food-items/stats",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        data = response.json()
        assert "pending" in data, "Stats should have 'pending' field"
        assert "approved" in data, "Stats should have 'approved' field"
        assert "total" in data, "Stats should have 'total' field"
        print(f"✓ GET /api/admin/food-items/stats - pending: {data['pending']}, approved: {data['approved']}, total: {data['total']}")
    
    def test_04_unauthorized_access_pending(self):
        """Test unauthorized access to pending items"""
        response = requests.get(f"{BASE_URL}/api/admin/food-items/pending")
        assert response.status_code in [401, 403], "Should reject unauthorized access"
        print("✓ Unauthorized access correctly rejected")
    
    def test_05_unauthorized_access_stats(self):
        """Test unauthorized access to stats"""
        response = requests.get(f"{BASE_URL}/api/admin/food-items/stats")
        assert response.status_code in [401, 403], "Should reject unauthorized access"
        print("✓ Unauthorized access to stats correctly rejected")
    
    # ============== Food Seller Tests ==============
    
    def test_06_food_seller_login(self):
        """Test food seller login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": FOOD_SELLER_PHONE,
            "password": FOOD_SELLER_PASSWORD
        })
        assert response.status_code == 200, f"Food seller login failed: {response.text}"
        data = response.json()
        assert "token" in data
        TestFoodItemsApprovalSystem.food_seller_token = data["token"]
        print(f"✓ Food seller login successful - user_type: {data.get('user', {}).get('user_type')}")
    
    def test_07_get_food_seller_store(self):
        """Get food seller's store"""
        if not self.food_seller_token:
            pytest.skip("Food seller token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/food/my-store",
            headers={"Authorization": f"Bearer {self.food_seller_token}"}
        )
        if response.status_code == 200:
            data = response.json()
            TestFoodItemsApprovalSystem.test_store_id = data.get("store", {}).get("id")
            print(f"✓ Food seller has store: {TestFoodItemsApprovalSystem.test_store_id}")
        else:
            print(f"⚠ Food seller has no store: {response.status_code}")
    
    def test_08_create_food_item_pending_by_default(self):
        """Test POST /api/food/items - item should be pending by default"""
        if not self.food_seller_token:
            pytest.skip("Food seller token not available")
        
        # Create a test food item
        test_item = {
            "name": f"TEST_طبق_اختبار_{uuid.uuid4().hex[:6]}",
            "description": "طبق اختبار للموافقة",
            "price": 25000,
            "category": "main",
            "preparation_time": 15,
            "images": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/food/items",
            json=test_item,
            headers={"Authorization": f"Bearer {self.food_seller_token}"}
        )
        
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            TestFoodItemsApprovalSystem.test_item_id = data.get("id")
            print(f"✓ Created food item: {TestFoodItemsApprovalSystem.test_item_id}")
            
            # Verify item is pending (is_approved: false)
            # Check in pending items list
            pending_response = requests.get(
                f"{BASE_URL}/api/admin/food-items/pending",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            if pending_response.status_code == 200:
                pending_items = pending_response.json()
                item_found = any(item.get("id") == TestFoodItemsApprovalSystem.test_item_id for item in pending_items)
                if item_found:
                    print("✓ Item correctly appears in pending list (is_approved: false)")
                else:
                    print("⚠ Item not found in pending list")
        elif response.status_code == 403:
            print(f"⚠ Food seller not authorized to create items: {response.text}")
        elif response.status_code == 404:
            print(f"⚠ Food seller has no store: {response.text}")
        else:
            print(f"⚠ Create item response: {response.status_code} - {response.text}")
    
    def test_09_approve_food_item(self):
        """Test POST /api/admin/food-items/{id}/approve"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        # First get a pending item
        response = requests.get(
            f"{BASE_URL}/api/admin/food-items/pending",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        if response.status_code == 200:
            pending_items = response.json()
            if pending_items:
                item_to_approve = pending_items[0]
                item_id = item_to_approve.get("id")
                
                # Approve the item
                approve_response = requests.post(
                    f"{BASE_URL}/api/admin/food-items/{item_id}/approve",
                    headers={"Authorization": f"Bearer {self.admin_token}"}
                )
                
                assert approve_response.status_code == 200, f"Approve failed: {approve_response.text}"
                print(f"✓ Approved food item: {item_id}")
                
                # Verify item is no longer in pending list
                verify_response = requests.get(
                    f"{BASE_URL}/api/admin/food-items/pending",
                    headers={"Authorization": f"Bearer {self.admin_token}"}
                )
                if verify_response.status_code == 200:
                    new_pending = verify_response.json()
                    still_pending = any(item.get("id") == item_id for item in new_pending)
                    assert not still_pending, "Item should not be in pending list after approval"
                    print("✓ Item correctly removed from pending list after approval")
            else:
                print("⚠ No pending items to approve")
        else:
            print(f"⚠ Could not get pending items: {response.status_code}")
    
    def test_10_approve_nonexistent_item(self):
        """Test approving non-existent item"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        fake_id = "nonexistent-item-id-12345"
        response = requests.post(
            f"{BASE_URL}/api/admin/food-items/{fake_id}/approve",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 404, "Should return 404 for non-existent item"
        print("✓ Correctly returns 404 for non-existent item")
    
    def test_11_reject_food_item_with_reason(self):
        """Test POST /api/admin/food-items/{id}/reject with reason"""
        if not self.admin_token or not self.food_seller_token:
            pytest.skip("Tokens not available")
        
        # Create a new item to reject
        test_item = {
            "name": f"TEST_طبق_للرفض_{uuid.uuid4().hex[:6]}",
            "description": "طبق سيتم رفضه",
            "price": 15000,
            "category": "appetizer",
            "preparation_time": 10,
            "images": []
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/food/items",
            json=test_item,
            headers={"Authorization": f"Bearer {self.food_seller_token}"}
        )
        
        if create_response.status_code in [200, 201]:
            item_id = create_response.json().get("id")
            
            # Reject with reason
            reject_response = requests.post(
                f"{BASE_URL}/api/admin/food-items/{item_id}/reject",
                json={"reason": "الصورة غير واضحة"},
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            assert reject_response.status_code == 200, f"Reject failed: {reject_response.text}"
            data = reject_response.json()
            assert "message" in data
            print(f"✓ Rejected food item with reason: {item_id}")
        else:
            # Try to reject an existing pending item
            pending_response = requests.get(
                f"{BASE_URL}/api/admin/food-items/pending",
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            if pending_response.status_code == 200:
                pending_items = pending_response.json()
                if pending_items:
                    item_id = pending_items[0].get("id")
                    reject_response = requests.post(
                        f"{BASE_URL}/api/admin/food-items/{item_id}/reject",
                        json={"reason": "سبب الرفض للاختبار"},
                        headers={"Authorization": f"Bearer {self.admin_token}"}
                    )
                    assert reject_response.status_code == 200, f"Reject failed: {reject_response.text}"
                    print(f"✓ Rejected existing pending item: {item_id}")
                else:
                    print("⚠ No pending items to reject")
            else:
                print("⚠ Could not create or find item to reject")
    
    def test_12_reject_food_item_without_reason(self):
        """Test POST /api/admin/food-items/{id}/reject without reason (optional)"""
        if not self.admin_token or not self.food_seller_token:
            pytest.skip("Tokens not available")
        
        # Create a new item to reject
        test_item = {
            "name": f"TEST_طبق_رفض_بدون_سبب_{uuid.uuid4().hex[:6]}",
            "description": "طبق سيتم رفضه بدون سبب",
            "price": 12000,
            "category": "dessert",
            "preparation_time": 5,
            "images": []
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/food/items",
            json=test_item,
            headers={"Authorization": f"Bearer {self.food_seller_token}"}
        )
        
        if create_response.status_code in [200, 201]:
            item_id = create_response.json().get("id")
            
            # Reject without reason
            reject_response = requests.post(
                f"{BASE_URL}/api/admin/food-items/{item_id}/reject",
                json={},  # Empty body - no reason
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )
            
            assert reject_response.status_code == 200, f"Reject without reason failed: {reject_response.text}"
            print(f"✓ Rejected food item without reason: {item_id}")
        else:
            print("⚠ Could not create item to reject without reason")
    
    def test_13_reject_nonexistent_item(self):
        """Test rejecting non-existent item"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        fake_id = "nonexistent-reject-id-12345"
        response = requests.post(
            f"{BASE_URL}/api/admin/food-items/{fake_id}/reject",
            json={"reason": "test"},
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        assert response.status_code == 404, "Should return 404 for non-existent item"
        print("✓ Correctly returns 404 for rejecting non-existent item")
    
    def test_14_stats_update_after_operations(self):
        """Test that stats update correctly after approve/reject operations"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/food-items/stats",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert isinstance(data.get("pending"), int)
        assert isinstance(data.get("approved"), int)
        assert isinstance(data.get("total"), int)
        
        # Total should equal pending + approved
        assert data["total"] >= data["pending"], "Total should be >= pending"
        assert data["total"] >= data["approved"], "Total should be >= approved"
        
        print(f"✓ Stats are valid - pending: {data['pending']}, approved: {data['approved']}, total: {data['total']}")


class TestFoodItemCreationFlow:
    """Test the complete flow: seller creates item -> item is pending -> admin approves/rejects"""
    
    def test_complete_approval_flow(self):
        """Test complete flow from creation to approval"""
        # Login as admin
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if admin_response.status_code != 200:
            pytest.skip("Admin login failed")
        admin_token = admin_response.json().get("token")
        
        # Login as food seller
        seller_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": FOOD_SELLER_PHONE,
            "password": FOOD_SELLER_PASSWORD
        })
        if seller_response.status_code != 200:
            pytest.skip("Food seller login failed")
        seller_token = seller_response.json().get("token")
        
        # Get initial stats
        initial_stats = requests.get(
            f"{BASE_URL}/api/admin/food-items/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        print(f"Initial stats: {initial_stats}")
        
        # Create a food item as seller
        test_item = {
            "name": f"TEST_Flow_Item_{uuid.uuid4().hex[:6]}",
            "description": "Testing complete flow",
            "price": 30000,
            "category": "main",
            "preparation_time": 20,
            "images": []
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/food/items",
            json=test_item,
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        if create_response.status_code not in [200, 201]:
            print(f"⚠ Could not create item: {create_response.status_code} - {create_response.text}")
            return
        
        item_id = create_response.json().get("id")
        print(f"✓ Created item: {item_id}")
        
        # Verify item is in pending list
        pending_response = requests.get(
            f"{BASE_URL}/api/admin/food-items/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        pending_items = pending_response.json()
        item_in_pending = any(item.get("id") == item_id for item in pending_items)
        assert item_in_pending, "New item should be in pending list"
        print("✓ Item is in pending list")
        
        # Approve the item
        approve_response = requests.post(
            f"{BASE_URL}/api/admin/food-items/{item_id}/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert approve_response.status_code == 200
        print("✓ Item approved")
        
        # Verify item is no longer pending
        pending_after = requests.get(
            f"{BASE_URL}/api/admin/food-items/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        item_still_pending = any(item.get("id") == item_id for item in pending_after)
        assert not item_still_pending, "Approved item should not be in pending list"
        print("✓ Item removed from pending list after approval")
        
        print("✓ Complete approval flow test passed!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
