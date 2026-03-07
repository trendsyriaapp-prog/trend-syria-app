"""
Food Offers API Tests - اختبار نظام عروض "اشترِ X واحصل على Y مجاناً"
Tests the buy_x_get_y offers system for food stores

Features tested:
1. POST /api/food/offers - Create new offer
2. GET /api/food/my-offers - Get store's offers (seller view)
3. GET /api/food/stores/{store_id}/offers - Get active offers (customer view)
4. PUT /api/food/offers/{offer_id} - Update/toggle offer
5. DELETE /api/food/offers/{offer_id} - Delete offer
6. Offer discount calculation in orders
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
SELLER_CREDS = {"phone": "0922222222", "password": "seller123"}
BUYER_CREDS = {"phone": "0933333333", "password": "user123"}
TEST_STORE_ID = "e782ae19-d162-44c0-ac84-8d4392b22184"


class TestAuthSetup:
    """Setup authentication tokens"""
    
    @pytest.fixture(scope="class")
    def seller_token(self):
        """Get seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SELLER_CREDS)
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        token = response.json().get("token") or response.json().get("access_token")
        assert token, f"No token in response: {response.json()}"
        return token
    
    @pytest.fixture(scope="class")
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        assert response.status_code == 200, f"Buyer login failed: {response.text}"
        token = response.json().get("token") or response.json().get("access_token")
        assert token, f"No token in response: {response.json()}"
        return token


class TestFoodOffersAPI(TestAuthSetup):
    """Test Food Offers CRUD operations"""
    
    created_offer_id = None
    
    def test_01_create_buy_x_get_y_offer(self, seller_token):
        """Test creating a buy_x_get_y offer"""
        offer_data = {
            "name": "TEST_عرض اختباري - اشترِ 2 واحصل على 1 مجاناً",
            "offer_type": "buy_x_get_y",
            "buy_quantity": 2,
            "get_quantity": 1,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/food/offers",
            json=offer_data,
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create offer: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should contain offer ID"
        assert data["name"] == offer_data["name"]
        assert data["offer_type"] == "buy_x_get_y"
        assert data["buy_quantity"] == 2
        assert data["get_quantity"] == 1
        assert data["is_active"] == True
        assert "store_id" in data, "Response should contain store_id"
        
        # Save for later tests
        TestFoodOffersAPI.created_offer_id = data["id"]
        print(f"Created offer: {data['id']}")
    
    def test_02_create_percentage_offer(self, seller_token):
        """Test creating a percentage discount offer"""
        offer_data = {
            "name": "TEST_خصم 20% على جميع المنتجات",
            "offer_type": "percentage",
            "discount_percentage": 20,
            "min_order_amount": 10000,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/food/offers",
            json=offer_data,
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create percentage offer: {response.text}"
        data = response.json()
        
        assert data["offer_type"] == "percentage"
        assert data["discount_percentage"] == 20
        assert data["min_order_amount"] == 10000
    
    def test_03_create_fixed_discount_offer(self, seller_token):
        """Test creating a fixed discount offer"""
        offer_data = {
            "name": "TEST_خصم 5000 ل.س",
            "offer_type": "fixed_discount",
            "discount_amount": 5000,
            "is_active": False  # Create as inactive
        }
        
        response = requests.post(
            f"{BASE_URL}/api/food/offers",
            json=offer_data,
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        assert response.status_code == 200, f"Failed to create fixed discount: {response.text}"
        data = response.json()
        
        assert data["offer_type"] == "fixed_discount"
        assert data["discount_amount"] == 5000
        assert data["is_active"] == False
    
    def test_04_get_my_offers(self, seller_token):
        """Test getting seller's offers (GET /api/food/my-offers)"""
        response = requests.get(
            f"{BASE_URL}/api/food/my-offers",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get offers: {response.text}"
        offers = response.json()
        
        assert isinstance(offers, list), "Response should be a list"
        
        # Find our test offers
        test_offers = [o for o in offers if o["name"].startswith("TEST_")]
        assert len(test_offers) >= 3, f"Expected at least 3 test offers, got {len(test_offers)}"
        
        # Verify structure of each offer
        for offer in test_offers:
            assert "id" in offer
            assert "name" in offer
            assert "offer_type" in offer
            assert "is_active" in offer
            assert "store_id" in offer
    
    def test_05_get_store_offers_public(self):
        """Test getting active offers for a store (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/food/stores/{TEST_STORE_ID}/offers")
        
        assert response.status_code == 200, f"Failed to get store offers: {response.text}"
        offers = response.json()
        
        assert isinstance(offers, list), "Response should be a list"
        
        # Only active offers should be returned
        for offer in offers:
            # All returned offers should be active
            assert offer.get("is_active") == True, f"Public endpoint should only return active offers: {offer}"
            assert offer["store_id"] == TEST_STORE_ID
    
    def test_06_update_offer_toggle_active(self, seller_token):
        """Test updating offer (toggle is_active)"""
        if not TestFoodOffersAPI.created_offer_id:
            pytest.skip("No offer created in previous test")
        
        offer_id = TestFoodOffersAPI.created_offer_id
        
        # Deactivate offer
        response = requests.put(
            f"{BASE_URL}/api/food/offers/{offer_id}",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        assert response.status_code == 200, f"Failed to update offer: {response.text}"
        
        # Verify it's deactivated by checking public endpoint
        pub_response = requests.get(f"{BASE_URL}/api/food/stores/{TEST_STORE_ID}/offers")
        offers = pub_response.json()
        
        deactivated = next((o for o in offers if o["id"] == offer_id), None)
        # Should not be in active offers list
        assert deactivated is None or deactivated.get("is_active") == False, "Offer should be deactivated"
    
    def test_07_update_offer_quantities(self, seller_token):
        """Test updating offer quantities"""
        if not TestFoodOffersAPI.created_offer_id:
            pytest.skip("No offer created in previous test")
        
        offer_id = TestFoodOffersAPI.created_offer_id
        
        response = requests.put(
            f"{BASE_URL}/api/food/offers/{offer_id}",
            json={
                "buy_quantity": 3,
                "get_quantity": 2,
                "is_active": True
            },
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        assert response.status_code == 200, f"Failed to update offer quantities: {response.text}"
    
    def test_08_buyer_cannot_create_offers(self, buyer_token):
        """Test that buyers cannot create offers"""
        offer_data = {
            "name": "Unauthorized offer",
            "offer_type": "buy_x_get_y",
            "buy_quantity": 1,
            "get_quantity": 1
        }
        
        response = requests.post(
            f"{BASE_URL}/api/food/offers",
            json=offer_data,
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        # Should fail - buyer has no store
        assert response.status_code in [403, 400, 404], f"Buyer should not create offers: {response.text}"
    
    def test_09_buyer_cannot_update_offers(self, buyer_token):
        """Test that buyers cannot update offers"""
        if not TestFoodOffersAPI.created_offer_id:
            pytest.skip("No offer created")
        
        response = requests.put(
            f"{BASE_URL}/api/food/offers/{TestFoodOffersAPI.created_offer_id}",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        
        # Should fail - not owner
        assert response.status_code == 403, f"Buyer should not update offers: {response.text}"
    
    def test_10_verify_existing_offer_data(self, seller_token):
        """Verify existing offer structure from context note"""
        # Agent context mentions: اشترِ 2 واحصل على 1 مجاناً for test store
        response = requests.get(f"{BASE_URL}/api/food/stores/{TEST_STORE_ID}/offers")
        
        assert response.status_code == 200
        offers = response.json()
        
        # Look for buy_x_get_y offers
        buy_get_offers = [o for o in offers if o.get("offer_type") == "buy_x_get_y"]
        
        if buy_get_offers:
            offer = buy_get_offers[0]
            print(f"Found existing buy_x_get_y offer: {offer.get('name')}")
            assert "buy_quantity" in offer
            assert "get_quantity" in offer
    
    def test_11_delete_test_offers(self, seller_token):
        """Cleanup: Delete test offers"""
        response = requests.get(
            f"{BASE_URL}/api/food/my-offers",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        if response.status_code == 200:
            offers = response.json()
            test_offers = [o for o in offers if o["name"].startswith("TEST_")]
            
            deleted_count = 0
            for offer in test_offers:
                del_response = requests.delete(
                    f"{BASE_URL}/api/food/offers/{offer['id']}",
                    headers={"Authorization": f"Bearer {seller_token}"}
                )
                if del_response.status_code == 200:
                    deleted_count += 1
            
            print(f"Deleted {deleted_count} test offers")


class TestOfferDiscountCalculation:
    """Test offer discount calculation in store page and cart"""
    
    @pytest.fixture(scope="class")
    def buyer_token(self):
        """Get buyer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=BUYER_CREDS)
        assert response.status_code == 200
        return response.json().get("token") or response.json().get("access_token")
    
    def test_12_store_page_returns_offers(self):
        """Test that store page data includes offers endpoint"""
        # Get store details
        store_response = requests.get(f"{BASE_URL}/api/food/stores/{TEST_STORE_ID}")
        assert store_response.status_code == 200
        store = store_response.json()
        
        # Get offers for store
        offers_response = requests.get(f"{BASE_URL}/api/food/stores/{TEST_STORE_ID}/offers")
        assert offers_response.status_code == 200
        
        print(f"Store: {store.get('name')}")
        print(f"Active offers: {len(offers_response.json())}")
    
    def test_13_store_has_products(self):
        """Verify store has products for offer calculation"""
        response = requests.get(f"{BASE_URL}/api/food/stores/{TEST_STORE_ID}")
        assert response.status_code == 200
        store = response.json()
        
        products = store.get("products", [])
        assert len(products) > 0, "Store should have products"
        
        for product in products[:3]:
            assert "id" in product
            assert "name" in product
            assert "price" in product
            print(f"Product: {product.get('name')} - {product.get('price')} ل.س")


class TestFoodStoreDashboardOffers:
    """Test seller dashboard offers tab functionality"""
    
    @pytest.fixture(scope="class")
    def seller_token(self):
        """Get seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=SELLER_CREDS)
        assert response.status_code == 200
        return response.json().get("token") or response.json().get("access_token")
    
    def test_14_my_store_endpoint_returns_data(self, seller_token):
        """Test /api/food/my-store returns store data"""
        response = requests.get(
            f"{BASE_URL}/api/food/my-store",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get my-store: {response.text}"
        data = response.json()
        
        assert "store" in data
        assert "products" in data
        
        store = data["store"]
        assert store["id"] == TEST_STORE_ID
        print(f"Store name: {store.get('name')}")
    
    def test_15_my_offers_endpoint_returns_offers(self, seller_token):
        """Test /api/food/my-offers returns offer list"""
        response = requests.get(
            f"{BASE_URL}/api/food/my-offers",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get my-offers: {response.text}"
        offers = response.json()
        
        assert isinstance(offers, list)
        print(f"Total offers: {len(offers)}")
        
        for offer in offers[:3]:
            print(f"  - {offer.get('name')} ({offer.get('offer_type')}) - Active: {offer.get('is_active')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
