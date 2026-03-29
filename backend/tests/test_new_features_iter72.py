# /app/backend/tests/test_new_features_iter72.py
# اختبار الميزات الجديدة: FreeShippingBanner, الإعلانات, فلاش, التوجيه الذكي, تقييم الأسعار, الإحالات
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_PHONE = "0933333333"
CUSTOMER_PASSWORD = "buyer123"
DRIVER_PHONE = "0900000000"
DRIVER_PASSWORD = "delivery123"
TEST_STORE_ID = "421443ed-55d6-4f1e-990a-2f3f53b2427e"


class TestProductsPageAPIs:
    """اختبار APIs صفحة المنتجات - الإعلانات، فلاش، الأكثر مبيعاً، وصل حديثاً"""
    
    def test_ads_active_endpoint(self):
        """اختبار GET /api/ads/active"""
        response = requests.get(f"{BASE_URL}/api/ads/active")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Ads active: {len(data)} ads found")
    
    def test_flash_products_endpoint(self):
        """اختبار GET /api/products/flash-products"""
        response = requests.get(f"{BASE_URL}/api/products/flash-products")
        assert response.status_code == 200
        data = response.json()
        # يجب أن يكون dict مع products و flash_sale
        assert "products" in data or isinstance(data, dict)
        print("✅ Flash products endpoint working")
    
    def test_best_sellers_endpoint(self):
        """اختبار GET /api/products/best-sellers"""
        response = requests.get(f"{BASE_URL}/api/products/best-sellers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Best sellers: {len(data)} products found")
    
    def test_newly_added_endpoint(self):
        """اختبار GET /api/products/newly-added"""
        response = requests.get(f"{BASE_URL}/api/products/newly-added")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Newly added: {len(data)} products found")
    
    def test_global_free_shipping(self):
        """اختبار GET /api/settings/global-free-shipping"""
        response = requests.get(f"{BASE_URL}/api/settings/global-free-shipping")
        assert response.status_code == 200
        data = response.json()
        assert "is_active" in data
        assert "applies_to" in data
        print(f"✅ Global free shipping: active={data['is_active']}, applies_to={data['applies_to']}")


class TestFoodPageAPIs:
    """اختبار APIs صفحة الطعام"""
    
    def test_food_stores_endpoint(self):
        """اختبار GET /api/food/stores"""
        response = requests.get(f"{BASE_URL}/api/food/stores", params={"city": "دمشق"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Food stores: {len(data)} stores found in Damascus")
    
    def test_food_products_endpoint(self):
        """اختبار GET /api/food/products"""
        response = requests.get(f"{BASE_URL}/api/food/products", params={"city": "دمشق"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Food products: {len(data)} products found")
    
    def test_food_flash_sales(self):
        """اختبار GET /api/food/flash-sales/active"""
        response = requests.get(f"{BASE_URL}/api/food/flash-sales/active")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Food flash sales: {len(data)} active sales")
    
    def test_food_banners(self):
        """اختبار GET /api/food/banners"""
        response = requests.get(f"{BASE_URL}/api/food/banners")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Food banners: {len(data)} banners found")


class TestFoodStorePageAPIs:
    """اختبار APIs صفحة المتجر - تقييم الأسعار"""
    
    def test_store_price_rating(self):
        """اختبار GET /api/price-reports/store/{store_id}/rating"""
        response = requests.get(f"{BASE_URL}/api/price-reports/store/{TEST_STORE_ID}/rating")
        assert response.status_code == 200
        data = response.json()
        assert "rating" in data
        assert "status" in data
        assert "status_text" in data
        print(f"✅ Store price rating: {data['rating']}/5 - {data['status_text']}")
        return data
    
    def test_store_details(self):
        """اختبار GET /api/food/stores/{store_id}"""
        response = requests.get(f"{BASE_URL}/api/food/stores/{TEST_STORE_ID}")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "name" in data
        print(f"✅ Store details: {data.get('name', 'Unknown')}")
    
    def test_store_offers(self):
        """اختبار GET /api/food/stores/{store_id}/offers"""
        response = requests.get(f"{BASE_URL}/api/food/stores/{TEST_STORE_ID}/offers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Store offers: {len(data)} offers found")


class TestSmartRoutingAPI:
    """اختبار API التوجيه الذكي للسائقين"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """تسجيل دخول السائق"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": DRIVER_PHONE,
            "password": DRIVER_PASSWORD
        })
        if response.status_code == 200:
            self.driver_token = response.json().get("token")
        else:
            self.driver_token = None
            print(f"⚠️ Driver login failed: {response.status_code}")
    
    def test_optimize_route_requires_auth(self):
        """اختبار أن التوجيه الذكي يتطلب تسجيل الدخول"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/optimize-route")
        # يجب أن يكون 401 أو 403 بدون auth
        assert response.status_code in [401, 403, 422]
        print("✅ Optimize route requires authentication")
    
    def test_optimize_route_with_driver_auth(self):
        """اختبار التوجيه الذكي مع توثيق السائق"""
        if not self.driver_token:
            pytest.skip("Driver login failed")
        
        headers = {"Authorization": f"Bearer {self.driver_token}"}
        response = requests.get(
            f"{BASE_URL}/api/food/orders/delivery/optimize-route",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "optimized_route" in data
        assert "total_distance_km" in data
        assert "estimated_time_min" in data
        print(f"✅ Optimize route working: {len(data['optimized_route'])} points, {data['total_distance_km']}km")
    
    def test_optimize_route_returns_empty_for_no_orders(self):
        """اختبار أن التوجيه الذكي يرجع قائمة فارغة إذا لا توجد طلبات"""
        if not self.driver_token:
            pytest.skip("Driver login failed")
        
        headers = {"Authorization": f"Bearer {self.driver_token}"}
        response = requests.get(
            f"{BASE_URL}/api/food/orders/delivery/optimize-route",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        # قد تكون القائمة فارغة إذا لا توجد طلبات للسائق
        assert isinstance(data.get("optimized_route"), list)
        print("✅ Optimize route returns proper structure even with no orders")


class TestReferralsAPI:
    """اختبار API الإحالات"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """تسجيل دخول العميل"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CUSTOMER_PHONE,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            self.customer_token = response.json().get("token")
        else:
            self.customer_token = None
            print(f"⚠️ Customer login failed: {response.status_code}")
    
    def test_my_code_requires_auth(self):
        """اختبار أن جلب كود الإحالة يتطلب تسجيل الدخول"""
        response = requests.get(f"{BASE_URL}/api/referrals/my-code")
        assert response.status_code in [401, 403, 422]
        print("✅ My referral code requires authentication")
    
    def test_get_my_referral_code(self):
        """اختبار GET /api/referrals/my-code"""
        if not self.customer_token:
            pytest.skip("Customer login failed")
        
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        response = requests.get(f"{BASE_URL}/api/referrals/my-code", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # التحقق من البنية
        assert "code" in data
        assert "share_link" in data
        assert "stats" in data
        assert "rewards" in data
        
        # التحقق من الإحصائيات
        stats = data["stats"]
        assert "total_referrals" in stats
        assert "successful_referrals" in stats
        assert "total_earnings" in stats
        
        print(f"✅ Referral code: {data['code']}")
        print(f"   Total referrals: {stats['total_referrals']}")
        print(f"   Successful: {stats['successful_referrals']}")
        return data
    
    def test_referral_code_format(self):
        """اختبار أن كود الإحالة بالصيغة الصحيحة"""
        if not self.customer_token:
            pytest.skip("Customer login failed")
        
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        response = requests.get(f"{BASE_URL}/api/referrals/my-code", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        code = data.get("code", "")
        # الكود يجب أن يكون 8 أحرف أبجدية رقمية
        assert len(code) == 8
        assert code.isalnum()
        print(f"✅ Referral code format valid: {code}")


class TestProductsPageIntegration:
    """اختبار تكامل صفحة المنتجات"""
    
    def test_products_page_all_data_loads(self):
        """اختبار أن جميع البيانات تحمل في صفحة المنتجات"""
        # جلب جميع البيانات بالتوازي كما تفعل الصفحة
        ads_response = requests.get(f"{BASE_URL}/api/ads/active")
        flash_response = requests.get(f"{BASE_URL}/api/products/flash-products")
        best_response = requests.get(f"{BASE_URL}/api/products/best-sellers")
        new_response = requests.get(f"{BASE_URL}/api/products/newly-added")
        shipping_response = requests.get(f"{BASE_URL}/api/settings/global-free-shipping")
        
        # جميع الطلبات يجب أن تنجح
        assert ads_response.status_code == 200, f"Ads failed: {ads_response.status_code}"
        assert flash_response.status_code == 200, f"Flash failed: {flash_response.status_code}"
        assert best_response.status_code == 200, f"Best sellers failed: {best_response.status_code}"
        assert new_response.status_code == 200, f"Newly added failed: {new_response.status_code}"
        assert shipping_response.status_code == 200, f"Shipping failed: {shipping_response.status_code}"
        
        print("✅ All ProductsPage APIs working correctly")
        print(f"   - Ads: {len(ads_response.json())} items")
        print(f"   - Best sellers: {len(best_response.json())} items")
        print(f"   - Newly added: {len(new_response.json())} items")


class TestFoodPageIntegration:
    """اختبار تكامل صفحة الطعام"""
    
    def test_food_page_all_data_loads(self):
        """اختبار أن جميع البيانات تحمل في صفحة الطعام"""
        params = {"city": "دمشق"}
        
        stores_response = requests.get(f"{BASE_URL}/api/food/stores", params=params)
        products_response = requests.get(f"{BASE_URL}/api/food/products", params=params)
        flash_response = requests.get(f"{BASE_URL}/api/food/flash-sales/active")
        banners_response = requests.get(f"{BASE_URL}/api/food/banners")
        shipping_response = requests.get(f"{BASE_URL}/api/settings/global-free-shipping")
        
        assert stores_response.status_code == 200, f"Stores failed: {stores_response.status_code}"
        assert products_response.status_code == 200, f"Products failed: {products_response.status_code}"
        assert flash_response.status_code == 200, f"Flash failed: {flash_response.status_code}"
        assert banners_response.status_code == 200, f"Banners failed: {banners_response.status_code}"
        assert shipping_response.status_code == 200, f"Shipping failed: {shipping_response.status_code}"
        
        shipping_data = shipping_response.json()
        
        print("✅ All FoodPage APIs working correctly")
        print(f"   - Stores: {len(stores_response.json())} items")
        print(f"   - Products: {len(products_response.json())} items")
        print(f"   - Free shipping active: {shipping_data.get('is_active', False)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
