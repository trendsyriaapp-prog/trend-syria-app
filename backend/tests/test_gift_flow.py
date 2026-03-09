# /app/backend/tests/test_gift_flow.py
# Tests for the enhanced gift flow:
# 1. Sender sends gift
# 2. Recipient accepts gift (status -> pending_address)
# 3. Recipient submits shipping address
# 4. Order is created with recipient's address

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Global tokens to avoid rate limiting
_buyer_token = None
_seller_token = None
_buyer_user = None
_seller_user = None
_test_product = None

def get_tokens():
    """Get tokens once and cache them"""
    global _buyer_token, _seller_token, _buyer_user, _seller_user, _test_product
    
    if _buyer_token and _seller_token:
        return
    
    # Login as buyer with retry
    for i in range(3):
        buyer_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0933333333",
            "password": "user123"
        })
        if buyer_login.status_code == 200:
            _buyer_token = buyer_login.json()["token"]
            _buyer_user = buyer_login.json()["user"]
            break
        time.sleep(2)
    
    time.sleep(1)
    
    # Login as seller with retry
    for i in range(3):
        seller_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0922222222",
            "password": "seller123"
        })
        if seller_login.status_code == 200:
            _seller_token = seller_login.json()["token"]
            _seller_user = seller_login.json()["user"]
            break
        time.sleep(2)
    
    # Get a product
    products_res = requests.get(f"{BASE_URL}/api/products?limit=1")
    if products_res.status_code == 200:
        products = products_res.json().get("products", [])
        if products:
            _test_product = products[0]


class TestGiftFlow:
    """Test the complete gift flow from sending to order creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup tokens and test data"""
        get_tokens()
        
        if not _buyer_token or not _seller_token:
            pytest.skip("Could not get auth tokens - rate limited")
        
        if not _test_product:
            pytest.skip("Could not get test product")
        
        self.buyer_token = _buyer_token
        self.seller_token = _seller_token
        self.buyer_user = _buyer_user
        self.seller_user = _seller_user
        self.test_product = _test_product
        
        self.headers_buyer = {"Authorization": f"Bearer {self.buyer_token}"}
        self.headers_seller = {"Authorization": f"Bearer {self.seller_token}"}
    
    # =========== POST /api/gifts/send Tests ===========
    
    def test_send_gift_success(self):
        """Test sending a gift successfully"""
        gift_data = {
            "product_id": self.test_product["id"],
            "recipient_phone": "0933333333",
            "recipient_name": "محمد العميل",
            "message": "هدية اختبار من pytest",
            "is_anonymous": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json=gift_data,
            headers=self.headers_seller
        )
        
        assert response.status_code == 200, f"Send gift failed: {response.text}"
        data = response.json()
        
        assert "gift_id" in data, "Response should contain gift_id"
        assert data["status"] == "pending", "Initial status should be pending"
        assert "message" in data, "Response should contain message"
        print(f"Created gift: {data['gift_id']}")
    
    def test_send_gift_anonymous(self):
        """Test sending an anonymous gift"""
        gift_data = {
            "product_id": self.test_product["id"],
            "recipient_phone": "0933333333",
            "recipient_name": "محمد العميل",
            "message": "هدية مجهولة",
            "is_anonymous": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json=gift_data,
            headers=self.headers_seller
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "gift_id" in data
        assert data["status"] == "pending"
    
    def test_send_gift_invalid_product(self):
        """Test sending gift with non-existent product"""
        gift_data = {
            "product_id": "non-existent-product-id",
            "recipient_phone": "0933333333",
            "recipient_name": "Test User",
            "message": "Test message"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json=gift_data,
            headers=self.headers_seller
        )
        
        assert response.status_code == 404
        assert "المنتج غير موجود" in response.json().get("detail", "")
    
    def test_send_gift_unauthorized(self):
        """Test sending gift without authentication"""
        gift_data = {
            "product_id": self.test_product["id"],
            "recipient_phone": "0933333333",
            "recipient_name": "Test User"
        }
        
        response = requests.post(f"{BASE_URL}/api/gifts/send", json=gift_data)
        assert response.status_code in [401, 403], "Should reject unauthenticated request"
    
    # =========== GET /api/gifts/received Tests ===========
    
    def test_get_received_gifts(self):
        """Test getting received gifts - should hide product details for pending gifts"""
        response = requests.get(
            f"{BASE_URL}/api/gifts/received",
            headers=self.headers_buyer
        )
        
        assert response.status_code == 200
        gifts = response.json()
        assert isinstance(gifts, list), "Response should be a list"
        
        # Check that pending gifts hide product details
        for gift in gifts:
            if gift.get("status") == "pending":
                assert gift.get("is_surprise") == True, "Pending gift should be marked as surprise"
                assert gift.get("product_name") == "🎁 مفاجأة!", "Product name should be hidden"
            elif gift.get("status") == "pending_address":
                assert gift.get("requires_address") == True, "pending_address should require address"
    
    def test_get_received_gifts_unauthorized(self):
        """Test getting received gifts without authentication"""
        response = requests.get(f"{BASE_URL}/api/gifts/received")
        assert response.status_code in [401, 403]
    
    # =========== GET /api/gifts/sent Tests ===========
    
    def test_get_sent_gifts(self):
        """Test getting sent gifts"""
        response = requests.get(
            f"{BASE_URL}/api/gifts/sent",
            headers=self.headers_seller
        )
        
        assert response.status_code == 200
        gifts = response.json()
        assert isinstance(gifts, list), "Response should be a list"
    
    # =========== Complete Flow Test ===========
    
    def test_complete_gift_flow(self):
        """Test the complete flow: send -> accept -> submit address -> order created"""
        
        # Step 1: Send a gift
        gift_data = {
            "product_id": self.test_product["id"],
            "recipient_phone": "0933333333",
            "recipient_name": "محمد العميل",
            "message": "هدية اختبار تدفق كامل",
            "is_anonymous": False
        }
        
        send_response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json=gift_data,
            headers=self.headers_seller
        )
        
        assert send_response.status_code == 200, f"Send gift failed: {send_response.text}"
        gift_id = send_response.json()["gift_id"]
        assert send_response.json()["status"] == "pending"
        print(f"Step 1 PASS: Gift sent with id {gift_id}")
        
        # Step 2: Accept the gift
        accept_response = requests.post(
            f"{BASE_URL}/api/gifts/{gift_id}/accept",
            json={},
            headers=self.headers_buyer
        )
        
        assert accept_response.status_code == 200, f"Accept gift failed: {accept_response.text}"
        accept_data = accept_response.json()
        assert accept_data["status"] == "pending_address", "Status should change to pending_address"
        assert accept_data.get("requires_address") == True, "Should require address"
        print(f"Step 2 PASS: Gift accepted, status is pending_address")
        
        # Step 3: Submit shipping address
        address_data = {
            "city": "دمشق",
            "area": "المزة",
            "street": "شارع الجلاء",
            "building": "15",
            "floor": "3",
            "phone": "0933333333",
            "notes": "بجانب الصيدلية"
        }
        
        address_response = requests.post(
            f"{BASE_URL}/api/gifts/{gift_id}/submit-address",
            json=address_data,
            headers=self.headers_buyer
        )
        
        assert address_response.status_code == 200, f"Submit address failed: {address_response.text}"
        address_result = address_response.json()
        assert address_result["status"] == "completed", "Status should be completed"
        assert "order_id" in address_result, "Response should contain order_id"
        order_id = address_result["order_id"]
        print(f"Step 3 PASS: Address submitted, order created with id {order_id}")
        
        # Step 4: Verify gift is now completed
        received_response = requests.get(
            f"{BASE_URL}/api/gifts/received",
            headers=self.headers_buyer
        )
        assert received_response.status_code == 200
        received_gifts = received_response.json()
        completed_gift = next((g for g in received_gifts if g["id"] == gift_id), None)
        assert completed_gift is not None
        assert completed_gift.get("status") == "completed"
        assert completed_gift.get("order_id") == order_id
        print(f"Step 4 PASS: Gift marked as completed with order_id")
        
        print(f"COMPLETE FLOW TEST PASSED! Gift ID: {gift_id}, Order ID: {order_id}")
    
    # =========== POST /api/gifts/{id}/accept Tests ===========
    
    def test_accept_gift_twice(self):
        """Test accepting a gift that's already been processed"""
        # First send a gift
        gift_data = {
            "product_id": self.test_product["id"],
            "recipient_phone": "0933333333",
            "recipient_name": "محمد العميل"
        }
        
        send_response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json=gift_data,
            headers=self.headers_seller
        )
        assert send_response.status_code == 200
        gift_id = send_response.json()["gift_id"]
        
        # Accept once
        accept1 = requests.post(
            f"{BASE_URL}/api/gifts/{gift_id}/accept",
            json={},
            headers=self.headers_buyer
        )
        assert accept1.status_code == 200
        
        # Try to accept again - should fail
        accept2 = requests.post(
            f"{BASE_URL}/api/gifts/{gift_id}/accept",
            json={},
            headers=self.headers_buyer
        )
        assert accept2.status_code == 400
    
    def test_accept_nonexistent_gift(self):
        """Test accepting a non-existent gift"""
        response = requests.post(
            f"{BASE_URL}/api/gifts/nonexistent-id/accept",
            json={},
            headers=self.headers_buyer
        )
        assert response.status_code == 404
    
    def test_accept_gift_wrong_user(self):
        """Test that only recipient can accept gift"""
        # Send gift from seller to buyer
        gift_data = {
            "product_id": self.test_product["id"],
            "recipient_phone": "0933333333",
            "recipient_name": "محمد العميل"
        }
        
        send_response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json=gift_data,
            headers=self.headers_seller
        )
        assert send_response.status_code == 200
        gift_id = send_response.json()["gift_id"]
        
        # Try to accept with seller (not recipient) - should fail
        accept_response = requests.post(
            f"{BASE_URL}/api/gifts/{gift_id}/accept",
            json={},
            headers=self.headers_seller
        )
        assert accept_response.status_code == 403
    
    # =========== POST /api/gifts/{id}/submit-address Tests ===========
    
    def test_submit_address_invalid_gift(self):
        """Test submitting address for non-existent gift"""
        address_data = {
            "city": "دمشق",
            "area": "المزة",
            "phone": "0933333333"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gifts/nonexistent-id/submit-address",
            json=address_data,
            headers=self.headers_buyer
        )
        assert response.status_code == 404
    
    def test_submit_address_missing_fields(self):
        """Test submitting address with missing required fields"""
        # First create and accept a gift
        gift_data = {
            "product_id": self.test_product["id"],
            "recipient_phone": "0933333333",
            "recipient_name": "محمد العميل"
        }
        
        send_response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json=gift_data,
            headers=self.headers_seller
        )
        gift_id = send_response.json()["gift_id"]
        
        requests.post(
            f"{BASE_URL}/api/gifts/{gift_id}/accept",
            json={},
            headers=self.headers_buyer
        )
        
        # Try to submit incomplete address
        incomplete_address = {
            "city": "دمشق"
            # Missing area and phone
        }
        
        response = requests.post(
            f"{BASE_URL}/api/gifts/{gift_id}/submit-address",
            json=incomplete_address,
            headers=self.headers_buyer
        )
        # Should fail validation (422) due to missing required fields
        assert response.status_code == 422
    
    # =========== GET /api/gifts/{id}/details Tests ===========
    
    def test_get_gift_details_as_recipient(self):
        """Test getting gift details as recipient"""
        # Send a gift
        gift_data = {
            "product_id": self.test_product["id"],
            "recipient_phone": "0933333333",
            "recipient_name": "محمد العميل",
            "message": "رسالة اختبار التفاصيل"
        }
        
        send_response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json=gift_data,
            headers=self.headers_seller
        )
        gift_id = send_response.json()["gift_id"]
        
        # Get details as recipient - should hide product for pending
        details_response = requests.get(
            f"{BASE_URL}/api/gifts/{gift_id}/details",
            headers=self.headers_buyer
        )
        
        assert details_response.status_code == 200
        details = details_response.json()
        assert details.get("is_surprise") == True, "Pending gift should be surprise"
        assert details.get("product_name") == "🎁 مفاجأة!"
    
    def test_get_gift_details_as_sender(self):
        """Test getting gift details as sender - should see full details"""
        # Send a gift
        gift_data = {
            "product_id": self.test_product["id"],
            "recipient_phone": "0933333333",
            "recipient_name": "محمد العميل"
        }
        
        send_response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json=gift_data,
            headers=self.headers_seller
        )
        gift_id = send_response.json()["gift_id"]
        
        # Get details as sender - should see product even if pending
        details_response = requests.get(
            f"{BASE_URL}/api/gifts/{gift_id}/details",
            headers=self.headers_seller
        )
        
        assert details_response.status_code == 200
        details = details_response.json()
        # Sender should see full details
        assert details.get("product_name") == self.test_product["name"]
    
    # =========== POST /api/gifts/{id}/reject Tests ===========
    
    def test_reject_gift(self):
        """Test rejecting a gift"""
        gift_data = {
            "product_id": self.test_product["id"],
            "recipient_phone": "0933333333",
            "recipient_name": "محمد العميل"
        }
        
        send_response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json=gift_data,
            headers=self.headers_seller
        )
        gift_id = send_response.json()["gift_id"]
        
        reject_response = requests.post(
            f"{BASE_URL}/api/gifts/{gift_id}/reject",
            json={},
            headers=self.headers_buyer
        )
        
        assert reject_response.status_code == 200
        assert reject_response.json()["status"] == "rejected"
    
    def test_reject_already_processed_gift(self):
        """Test rejecting an already accepted gift"""
        gift_data = {
            "product_id": self.test_product["id"],
            "recipient_phone": "0933333333",
            "recipient_name": "محمد العميل"
        }
        
        send_response = requests.post(
            f"{BASE_URL}/api/gifts/send",
            json=gift_data,
            headers=self.headers_seller
        )
        gift_id = send_response.json()["gift_id"]
        
        # Accept first
        requests.post(
            f"{BASE_URL}/api/gifts/{gift_id}/accept",
            json={},
            headers=self.headers_buyer
        )
        
        # Try to reject after accepting - should fail
        reject_response = requests.post(
            f"{BASE_URL}/api/gifts/{gift_id}/reject",
            json={},
            headers=self.headers_buyer
        )
        
        assert reject_response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
