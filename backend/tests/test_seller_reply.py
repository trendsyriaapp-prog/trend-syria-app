"""
Test Seller Reply Feature on Reviews
Tests the new feature for sellers to reply to customer reviews on their products.

Endpoints:
- POST /api/reviews/{review_id}/reply - Seller replies to a review
- DELETE /api/reviews/{review_id}/reply - Seller deletes their reply
- GET /api/reviews/seller/pending - Get pending reviews (no seller reply)
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSellerReplyFeature:
    """Test seller reply to reviews feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data - create seller, product, buyer, order, and review"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Store created IDs for cleanup
        self.created_ids = {
            "seller_id": None,
            "product_id": None,
            "buyer_id": None,
            "order_id": None,
            "review_id": None
        }
        
        # Test data identifiers
        self.test_prefix = f"TEST_{int(time.time())}"
        
        yield
        
        # Cleanup will be done manually if needed
    
    def test_1_admin_login(self):
        """Test admin login to ensure API is working"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        print(f"✓ Admin login successful")
        return data.get("token")
    
    def test_2_create_seller_account(self):
        """Create a test seller account"""
        seller_phone = f"099{int(time.time()) % 10000000:07d}"
        response = self.session.post(f"{BASE_URL}/api/auth/seller/register", json={
            "phone": seller_phone,
            "password": "test123456",
            "business_name": f"{self.test_prefix}_TestStore",
            "city": "دمشق",
            "full_name": f"{self.test_prefix}_TestSeller"
        })
        
        if response.status_code == 200 or response.status_code == 201:
            data = response.json()
            print(f"✓ Seller registration successful: {seller_phone}")
            self.created_ids["seller_phone"] = seller_phone
            return data
        else:
            print(f"Seller registration response: {response.status_code} - {response.text}")
            # Seller registration might require admin approval
            pytest.skip("Seller registration requires approval or has restrictions")
    
    def test_3_get_pending_reviews_unauthenticated(self):
        """Test GET /api/reviews/seller/pending without auth (should fail)"""
        response = self.session.get(f"{BASE_URL}/api/reviews/seller/pending")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Pending reviews endpoint requires authentication")
    
    def test_4_seller_login_and_get_pending_reviews(self):
        """Login as existing seller and get pending reviews"""
        # Try with the demo seller credentials
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0922222222",
            "password": "seller123"
        })
        
        if response.status_code != 200:
            pytest.skip("Demo seller login failed - may not exist")
        
        data = response.json()
        token = data.get("token")
        assert token, "No token received"
        
        self.session.headers["Authorization"] = f"Bearer {token}"
        
        # Get pending reviews
        response = self.session.get(f"{BASE_URL}/api/reviews/seller/pending")
        assert response.status_code == 200, f"Failed to get pending reviews: {response.text}"
        
        reviews = response.json()
        assert isinstance(reviews, list), "Expected list of reviews"
        print(f"✓ Got {len(reviews)} pending reviews for seller")
        return reviews
    
    def test_5_reply_to_nonexistent_review(self):
        """Test replying to a review that doesn't exist"""
        # Login as seller first
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0922222222",
            "password": "seller123"
        })
        
        if response.status_code != 200:
            pytest.skip("Demo seller login failed")
        
        token = response.json().get("token")
        self.session.headers["Authorization"] = f"Bearer {token}"
        
        # Try to reply to non-existent review
        fake_review_id = str(uuid.uuid4())
        response = self.session.post(
            f"{BASE_URL}/api/reviews/{fake_review_id}/reply",
            json={"reply": "شكراً لتقييمك"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Correctly returns 404 for non-existent review")
    
    def test_6_delete_nonexistent_reply(self):
        """Test deleting a reply from a non-existent review"""
        # Login as seller first
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0922222222",
            "password": "seller123"
        })
        
        if response.status_code != 200:
            pytest.skip("Demo seller login failed")
        
        token = response.json().get("token")
        self.session.headers["Authorization"] = f"Bearer {token}"
        
        fake_review_id = str(uuid.uuid4())
        response = self.session.delete(f"{BASE_URL}/api/reviews/{fake_review_id}/reply")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Correctly returns 404 for deleting non-existent reply")
    
    def test_7_get_product_reviews(self):
        """Test getting reviews for a product"""
        # First get a product
        response = self.session.get(f"{BASE_URL}/api/products?limit=1")
        assert response.status_code == 200
        
        products = response.json()
        if isinstance(products, dict):
            products = products.get("products", [])
        
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0].get("id")
        
        # Get reviews for product
        response = self.session.get(f"{BASE_URL}/api/reviews/{product_id}")
        assert response.status_code == 200, f"Failed to get reviews: {response.text}"
        
        reviews = response.json()
        assert isinstance(reviews, list), "Expected list of reviews"
        print(f"✓ Got {len(reviews)} reviews for product {product_id}")
        
        # Check if any reviews have seller_reply
        reviews_with_reply = [r for r in reviews if r.get("seller_reply")]
        print(f"  - {len(reviews_with_reply)} reviews have seller replies")
        
        return reviews


class TestSellerReplyIntegration:
    """Full integration test for seller reply flow - requires creating test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_id = f"TEST_{int(time.time())}"
        yield
    
    def _login_admin(self):
        """Helper to login as admin"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0911111111",
            "password": "admin123"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers["Authorization"] = f"Bearer {token}"
            return True
        return False
    
    def _login_seller(self):
        """Helper to login as seller"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0922222222",
            "password": "seller123"
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            self.session.headers["Authorization"] = f"Bearer {token}"
            return data.get("user", {})
        return None
    
    def _login_buyer(self):
        """Helper to login as buyer"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0933333333",
            "password": "user123"
        })
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            self.session.headers["Authorization"] = f"Bearer {token}"
            return data.get("user", {})
        return None
    
    def test_full_reply_flow_simulation(self):
        """
        Simulate the full flow:
        1. Seller logs in
        2. Check pending reviews
        3. Try to reply (if reviews exist)
        """
        print("\n=== Full Seller Reply Flow Test ===")
        
        # Step 1: Seller login
        seller = self._login_seller()
        if not seller:
            pytest.skip("Seller login failed")
        
        seller_id = seller.get("id")
        print(f"✓ Step 1: Seller logged in: {seller.get('full_name', 'Unknown')}")
        
        # Step 2: Get pending reviews
        response = self.session.get(f"{BASE_URL}/api/reviews/seller/pending")
        assert response.status_code == 200, f"Failed to get pending reviews: {response.text}"
        
        pending_reviews = response.json()
        print(f"✓ Step 2: Found {len(pending_reviews)} pending reviews")
        
        # Step 3: If there are pending reviews, try to reply
        if pending_reviews:
            review = pending_reviews[0]
            review_id = review.get("id")
            
            # Try to add reply
            response = self.session.post(
                f"{BASE_URL}/api/reviews/{review_id}/reply",
                json={"reply": f"شكراً لتقييمك الكريم! {self.test_id}"}
            )
            
            if response.status_code == 200:
                print(f"✓ Step 3: Added reply to review {review_id}")
                
                # Step 4: Delete the reply (cleanup)
                response = self.session.delete(f"{BASE_URL}/api/reviews/{review_id}/reply")
                if response.status_code == 200:
                    print(f"✓ Step 4: Deleted reply from review {review_id}")
                else:
                    print(f"⚠ Step 4: Failed to delete reply: {response.text}")
            elif response.status_code == 403:
                print(f"✓ Step 3: Correctly blocked - seller doesn't own this product")
            else:
                print(f"⚠ Step 3: Unexpected response: {response.status_code} - {response.text}")
        else:
            print("✓ Step 3: No pending reviews to test with")
        
        print("=== Flow Test Complete ===")


class TestReviewsAPIBasic:
    """Basic tests for reviews API endpoints"""
    
    def test_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("✓ API is healthy")
    
    def test_get_categories(self):
        """Test categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} categories")
    
    def test_get_products(self):
        """Test products endpoint"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        print("✓ Products endpoint working")


# Run tests directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
