# /app/backend/tests/test_buy_x_get_y_daily_deals.py
# Tests for Buy X Get Y offers (Admin) and Daily Deal Requests (Seller)

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "Admin@123"
FOOD_SELLER_PHONE = "0966666666"
FOOD_SELLER_PASSWORD = "test1234"


class TestAdminBuyXGetYOffers:
    """Tests for Admin creating 'Buy X Get Y' offers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_admin_login(self):
        """Test admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✅ Admin login successful")
    
    def test_create_buy_x_get_y_offer(self):
        """Test creating a Buy X Get Y offer from admin"""
        offer_data = {
            "name": "TEST_اشترِ 2 واحصل على 1 مجاناً",
            "offer_type": "buy_x_get_y",
            "buy_quantity": 2,
            "get_quantity": 1,
            "apply_to_all": True,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/food-offers/create",
            json=offer_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create offer failed: {response.text}"
        data = response.json()
        assert "offer" in data
        assert data["offer"]["name"] == offer_data["name"]
        assert data["offer"]["offer_type"] == "buy_x_get_y"
        assert data["offer"]["buy_quantity"] == 2
        assert data["offer"]["get_quantity"] == 1
        assert data["offer"]["created_by_admin"] == True
        print(f"✅ Created Buy X Get Y offer: {data['offer']['id']}")
        
        # Store offer ID for cleanup
        self.created_offer_id = data["offer"]["id"]
    
    def test_create_percentage_discount_offer(self):
        """Test creating a percentage discount offer from admin"""
        offer_data = {
            "name": "TEST_خصم 20%",
            "offer_type": "percentage",
            "discount_percentage": 20,
            "apply_to_all": True,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/food-offers/create",
            json=offer_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create offer failed: {response.text}"
        data = response.json()
        assert data["offer"]["offer_type"] == "percentage"
        assert data["offer"]["discount_percentage"] == 20
        print(f"✅ Created percentage discount offer: {data['offer']['id']}")
    
    def test_create_fixed_discount_offer(self):
        """Test creating a fixed discount offer from admin"""
        offer_data = {
            "name": "TEST_خصم 5000 ل.س",
            "offer_type": "fixed_discount",
            "discount_amount": 5000,
            "apply_to_all": True,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/food-offers/create",
            json=offer_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Create offer failed: {response.text}"
        data = response.json()
        assert data["offer"]["offer_type"] == "fixed_discount"
        assert data["offer"]["discount_amount"] == 5000
        print(f"✅ Created fixed discount offer: {data['offer']['id']}")
    
    def test_create_offer_for_specific_store(self):
        """Test creating an offer for a specific store"""
        # First get list of stores
        stores_response = requests.get(
            f"{BASE_URL}/api/admin/food-stores/list",
            headers=self.headers
        )
        
        if stores_response.status_code == 200 and stores_response.json():
            store_id = stores_response.json()[0]["id"]
            
            offer_data = {
                "name": "TEST_عرض لمتجر محدد",
                "offer_type": "buy_x_get_y",
                "buy_quantity": 3,
                "get_quantity": 1,
                "apply_to_all": False,
                "store_id": store_id,
                "is_active": True
            }
            
            response = requests.post(
                f"{BASE_URL}/api/admin/food-offers/create",
                json=offer_data,
                headers=self.headers
            )
            
            assert response.status_code == 200, f"Create offer failed: {response.text}"
            data = response.json()
            assert data["offer"]["store_id"] == store_id
            assert data["offer"]["apply_to_all"] == False
            print(f"✅ Created offer for specific store: {store_id}")
        else:
            pytest.skip("No food stores available for testing")
    
    def test_get_all_food_offers(self):
        """Test getting all food offers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/food-offers",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get offers failed: {response.text}"
        offers = response.json()
        assert isinstance(offers, list)
        print(f"✅ Retrieved {len(offers)} food offers")
    
    def test_create_offer_missing_name(self):
        """Test creating offer without name fails"""
        offer_data = {
            "offer_type": "buy_x_get_y",
            "buy_quantity": 2,
            "get_quantity": 1
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/food-offers/create",
            json=offer_data,
            headers=self.headers
        )
        
        assert response.status_code == 400, "Should fail without name"
        print("✅ Correctly rejected offer without name")
    
    def test_create_offer_missing_type(self):
        """Test creating offer without type fails"""
        offer_data = {
            "name": "TEST_عرض بدون نوع",
            "buy_quantity": 2,
            "get_quantity": 1
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/food-offers/create",
            json=offer_data,
            headers=self.headers
        )
        
        assert response.status_code == 400, "Should fail without offer_type"
        print("✅ Correctly rejected offer without type")
    
    def test_get_food_stores_list(self):
        """Test getting food stores list for selection"""
        response = requests.get(
            f"{BASE_URL}/api/admin/food-stores/list",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get stores list failed: {response.text}"
        stores = response.json()
        assert isinstance(stores, list)
        print(f"✅ Retrieved {len(stores)} food stores for selection")


class TestSellerDailyDealRequests:
    """Tests for Seller requesting daily deals"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as food seller before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": FOOD_SELLER_PHONE,
            "password": FOOD_SELLER_PASSWORD
        })
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        self.seller_token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.seller_token}"}
    
    def test_seller_login(self):
        """Test seller can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": FOOD_SELLER_PHONE,
            "password": FOOD_SELLER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("✅ Seller login successful")
    
    def test_get_seller_store_and_products(self):
        """Test getting seller's store and products"""
        response = requests.get(
            f"{BASE_URL}/api/food/my-store",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get store failed: {response.text}"
        data = response.json()
        assert "store" in data
        assert "products" in data
        print(f"✅ Seller has store: {data['store']['name']} with {len(data['products'])} products")
        
        # Store for later tests
        self.store = data["store"]
        self.products = data["products"]
        return data
    
    def test_create_daily_deal_request(self):
        """Test seller creating a daily deal request"""
        # First get products
        store_response = requests.get(
            f"{BASE_URL}/api/food/my-store",
            headers=self.headers
        )
        
        if store_response.status_code != 200:
            pytest.skip("Could not get seller store")
        
        products = store_response.json().get("products", [])
        
        if not products:
            pytest.skip("No products available for testing")
        
        product = products[0]
        
        request_data = {
            "product_id": product["id"],
            "discount_percentage": 25,
            "message": "TEST_طلب عرض يومي للاختبار"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/daily-deals/requests/create",
            json=request_data,
            headers=self.headers
        )
        
        # Could be 200 or 400 if request already exists
        if response.status_code == 200:
            data = response.json()
            assert "request_id" in data
            print(f"✅ Created daily deal request: {data['request_id']}")
        elif response.status_code == 400 and "معلق" in response.json().get("detail", ""):
            print("✅ Request already exists (expected behavior)")
        else:
            assert False, f"Unexpected response: {response.status_code} - {response.text}"
    
    def test_create_daily_deal_request_invalid_discount(self):
        """Test creating request with invalid discount fails"""
        store_response = requests.get(
            f"{BASE_URL}/api/food/my-store",
            headers=self.headers
        )
        
        if store_response.status_code != 200:
            pytest.skip("Could not get seller store")
        
        products = store_response.json().get("products", [])
        
        if not products:
            pytest.skip("No products available for testing")
        
        product = products[0]
        
        # Test with discount too low
        request_data = {
            "product_id": product["id"],
            "discount_percentage": 2,  # Less than 5%
            "message": "TEST_خصم منخفض جداً"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/daily-deals/requests/create",
            json=request_data,
            headers=self.headers
        )
        
        assert response.status_code == 400, "Should fail with discount < 5%"
        print("✅ Correctly rejected discount < 5%")
    
    def test_create_daily_deal_request_high_discount(self):
        """Test creating request with too high discount fails"""
        store_response = requests.get(
            f"{BASE_URL}/api/food/my-store",
            headers=self.headers
        )
        
        if store_response.status_code != 200:
            pytest.skip("Could not get seller store")
        
        products = store_response.json().get("products", [])
        
        if not products:
            pytest.skip("No products available for testing")
        
        product = products[0]
        
        # Test with discount too high
        request_data = {
            "product_id": product["id"],
            "discount_percentage": 95,  # More than 90%
            "message": "TEST_خصم مرتفع جداً"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/daily-deals/requests/create",
            json=request_data,
            headers=self.headers
        )
        
        assert response.status_code == 400, "Should fail with discount > 90%"
        print("✅ Correctly rejected discount > 90%")
    
    def test_get_my_deal_requests(self):
        """Test seller getting their deal requests"""
        response = requests.get(
            f"{BASE_URL}/api/daily-deals/seller/my-requests",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get requests failed: {response.text}"
        data = response.json()
        assert "requests" in data
        print(f"✅ Seller has {len(data['requests'])} deal requests")


class TestAdminDealRequestsManagement:
    """Tests for Admin managing seller deal requests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_all_deal_requests(self):
        """Test admin getting all deal requests"""
        response = requests.get(
            f"{BASE_URL}/api/daily-deals/requests",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get requests failed: {response.text}"
        data = response.json()
        assert "requests" in data
        print(f"✅ Admin can see {len(data['requests'])} deal requests")


class TestFlashSaleRequestsInAdmin:
    """Tests for Flash Sale Requests in Admin Panel"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_flash_sale_requests(self):
        """Test getting flash sale requests"""
        response = requests.get(
            f"{BASE_URL}/api/admin/flash-sale-requests",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get flash requests failed: {response.text}"
        data = response.json()
        assert "requests" in data or isinstance(data, list)
        print(f"✅ Retrieved flash sale requests")
    
    def test_get_flash_sales(self):
        """Test getting all flash sales"""
        response = requests.get(
            f"{BASE_URL}/api/admin/flash-sales",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Get flash sales failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Retrieved {len(data)} flash sales")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin for cleanup"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_cleanup_test_offers(self):
        """Clean up TEST_ prefixed offers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/food-offers",
            headers=self.headers
        )
        
        if response.status_code == 200:
            offers = response.json()
            deleted = 0
            for offer in offers:
                if offer.get("name", "").startswith("TEST_"):
                    del_response = requests.delete(
                        f"{BASE_URL}/api/admin/food-offers/{offer['id']}",
                        headers=self.headers
                    )
                    if del_response.status_code == 200:
                        deleted += 1
            print(f"✅ Cleaned up {deleted} test offers")
