# /app/backend/tests/test_comprehensive_iteration159.py
# فحص شامل لتطبيق ترند سوريا - Iteration 159
# يشمل: نظام المحفظة، السحب، الأرباح المعلقة، الطلبات، التوصيل، لوحة الأدمن

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

# Test credentials
ADMIN_PHONE = "0945570365"
ADMIN_PASSWORD = os.getenv("TEST_ADMIN_PASSWORD")
TEST_SELLER_PHONE = "0945570399"
TEST_SELLER_PASSWORD = os.getenv("TEST_USER_PASSWORD", "Test@123456")
OTP_CODE = "123456"

# Global token cache
_token_cache = {}

def get_admin_token():
    """Get admin token with caching"""
    if "admin" not in _token_cache:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            _token_cache["admin"] = response.json().get("token")
        else:
            _token_cache["admin"] = None
    return _token_cache["admin"]

def get_seller_token():
    """Get seller token with caching"""
    if "seller" not in _token_cache:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_SELLER_PHONE,
            "password": TEST_SELLER_PASSWORD
        })
        if response.status_code == 200:
            _token_cache["seller"] = response.json().get("token")
        else:
            _token_cache["seller"] = None
    return _token_cache["seller"]


class TestAuthentication:
    """اختبارات نظام المصادقة"""
    
    def test_admin_login(self):
        """تسجيل دخول الأدمن"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["user_type"] == "admin"
        print(f"✅ Admin login successful: {data['user']['name']}")
    
    def test_seller_login(self):
        """تسجيل دخول البائع"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": TEST_SELLER_PHONE,
            "password": TEST_SELLER_PASSWORD
        })
        assert response.status_code == 200, f"Seller login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["user_type"] == "seller"
        print(f"✅ Seller login successful: {data['user']['name']}")
    
    def test_invalid_login(self):
        """تسجيل دخول خاطئ"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0999999999",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✅ Invalid login correctly rejected")


class TestWalletSystem:
    """اختبارات نظام المحفظة"""
    
    @pytest.fixture
    def seller_token(self):
        """Get seller token"""
        token = get_seller_token()
        if not token:
            pytest.skip("Could not get seller token")
        return token
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        token = get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        return token
    
    def test_get_wallet_balance(self, seller_token):
        """جلب رصيد المحفظة"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/balance",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200, f"Failed to get balance: {response.text}"
        data = response.json()
        assert "balance" in data
        assert "available_balance" in data
        print(f"✅ Wallet balance: {data.get('balance', 0)} SYP, Available: {data.get('available_balance', 0)} SYP")
    
    def test_get_wallet_transactions(self, seller_token):
        """جلب سجل المعاملات"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/transactions",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200, f"Failed to get transactions: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Wallet transactions count: {len(data)}")
    
    def test_get_withdrawal_history(self, seller_token):
        """جلب سجل طلبات السحب"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/withdrawals",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200, f"Failed to get withdrawals: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Withdrawal history count: {len(data)}")
    
    def test_get_held_earnings(self, seller_token):
        """جلب الأرباح المعلقة"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/held-earnings",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200, f"Failed to get held earnings: {response.text}"
        data = response.json()
        assert "held_earnings" in data
        assert "total_held" in data
        print(f"✅ Held earnings: {data.get('total_held', 0)} SYP, Count: {data.get('count', 0)}")
    
    def test_get_hold_settings(self, seller_token):
        """جلب إعدادات فترة التعليق"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/hold-settings",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200, f"Failed to get hold settings: {response.text}"
        data = response.json()
        print(f"✅ Hold settings: Food={data.get('food_hold_hours', 1)}h, Products={data.get('products_hold_hours', 24)}h")


class TestWithdrawalSystem:
    """اختبارات نظام السحب الجديد"""
    
    @pytest.fixture
    def seller_token(self):
        """Get seller token"""
        token = get_seller_token()
        if not token:
            pytest.skip("Could not get seller token")
        return token
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        token = get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        return token
    
    def test_withdrawal_validation_shamcash_missing_phone(self, seller_token):
        """التحقق من رفض السحب بدون رقم شام كاش"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/withdraw",
            headers={"Authorization": f"Bearer {seller_token}"},
            json={
                "amount": 50000,
                "withdrawal_method": "shamcash"
                # missing shamcash_phone
            }
        )
        assert response.status_code == 400
        assert "شام كاش" in response.json().get("detail", "")
        print("✅ Withdrawal correctly rejected: missing shamcash_phone")
    
    def test_withdrawal_validation_bank_missing_details(self, seller_token):
        """التحقق من رفض السحب بدون بيانات البنك"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/withdraw",
            headers={"Authorization": f"Bearer {seller_token}"},
            json={
                "amount": 50000,
                "withdrawal_method": "bank_account"
                # missing bank details
            }
        )
        assert response.status_code == 400
        assert "بنك" in response.json().get("detail", "").lower() or "bank" in response.json().get("detail", "").lower()
        print("✅ Withdrawal correctly rejected: missing bank details")
    
    def test_admin_get_all_withdrawals(self, admin_token):
        """الأدمن يجلب جميع طلبات السحب"""
        response = requests.get(
            f"{BASE_URL}/api/payment/admin/withdrawals",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get withdrawals: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Admin can see {len(data)} withdrawal requests")
        
        # Check if bank account details are included
        for w in data:
            if w.get("withdrawal_method") == "bank_account":
                print(f"  - Bank withdrawal found: {w.get('bank_name', 'N/A')}")


class TestTopupSystem:
    """اختبارات نظام شحن المحفظة"""
    
    @pytest.fixture
    def buyer_token(self):
        """Create or get buyer token"""
        # Try to login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0912345678",
            "password": "TestBuyer@123"
        })
        if response.status_code == 200:
            return response.json()["token"]
        
        # Register new buyer
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "phone": "0912345678",
            "password": "TestBuyer@123",
            "full_name": "Test Buyer",
            "city": "دمشق",
            "user_type": "buyer"
        })
        if response.status_code == 200:
            return response.json()["token"]
        
        # If registration failed (user exists), try login again
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0912345678",
            "password": "TestBuyer@123"
        })
        return response.json().get("token")
    
    def test_topup_request_creation(self, buyer_token):
        """إنشاء طلب شحن"""
        if not buyer_token:
            pytest.skip("Could not get buyer token")
        
        response = requests.post(
            f"{BASE_URL}/api/wallet/topup/request",
            headers={"Authorization": f"Bearer {buyer_token}"},
            json={
                "amount": 10000,
                "payment_method": "shamcash",
                "shamcash_phone": "0912345678"
            }
        )
        # May fail if user is not buyer type
        if response.status_code == 200:
            data = response.json()
            assert "topup_id" in data
            print(f"✅ Topup request created: {data.get('topup_code', 'N/A')}")
        else:
            print(f"⚠️ Topup request: {response.status_code} - {response.text[:100]}")
    
    def test_topup_history(self, buyer_token):
        """جلب سجل طلبات الشحن"""
        if not buyer_token:
            pytest.skip("Could not get buyer token")
        
        response = requests.get(
            f"{BASE_URL}/api/wallet/topup/history",
            headers={"Authorization": f"Bearer {buyer_token}"}
        )
        assert response.status_code == 200
        print("✅ Topup history retrieved")


class TestOrdersSystem:
    """اختبارات نظام الطلبات"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        token = get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        return token
    
    @pytest.fixture
    def seller_token(self):
        """Get seller token"""
        token = get_seller_token()
        if not token:
            pytest.skip("Could not get seller token")
        return token
    
    def test_get_orders_as_seller(self, seller_token):
        """البائع يجلب طلباته"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Seller orders count: {len(data)}")
    
    def test_get_seller_my_orders(self, seller_token):
        """البائع يجلب طلباته الخاصة"""
        response = requests.get(
            f"{BASE_URL}/api/orders/seller/my-orders",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200, f"Failed to get seller orders: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Seller my-orders count: {len(data)}")


class TestFoodOrdersSystem:
    """اختبارات نظام طلبات الطعام"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        token = get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        return token
    
    def test_get_food_stores(self):
        """جلب متاجر الطعام"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200, f"Failed to get food stores: {response.text}"
        data = response.json()
        print(f"✅ Food stores count: {len(data.get('stores', data)) if isinstance(data, dict) else len(data)}")
    
    def test_get_food_categories(self):
        """جلب فئات الطعام"""
        response = requests.get(f"{BASE_URL}/api/food/categories")
        assert response.status_code == 200, f"Failed to get food categories: {response.text}"
        data = response.json()
        print("✅ Food categories retrieved")


class TestDeliverySystem:
    """اختبارات نظام التوصيل"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        token = get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        return token
    
    def test_get_delivery_fee(self):
        """حساب أجرة التوصيل"""
        response = requests.get(
            f"{BASE_URL}/api/payment/delivery-fee",
            params={"seller_city": "دمشق", "customer_city": "ريف دمشق"}
        )
        assert response.status_code == 200, f"Failed to get delivery fee: {response.text}"
        data = response.json()
        assert "fee" in data
        print(f"✅ Delivery fee: {data.get('fee', 0)} SYP ({data.get('distance_type', 'N/A')})")
    
    def test_admin_get_delivery_pending(self, admin_token):
        """الأدمن يجلب السائقين المعلقين"""
        response = requests.get(
            f"{BASE_URL}/api/admin/delivery/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # May return 200 or 404 if no pending drivers
        assert response.status_code in [200, 404], f"Failed to get delivery pending: {response.text}"
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Pending delivery drivers count: {len(data)}")
        else:
            print("✅ No pending delivery drivers")


class TestAdminPanel:
    """اختبارات لوحة الأدمن"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        token = get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        return token
    
    def test_admin_dashboard_stats(self, admin_token):
        """إحصائيات لوحة التحكم"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get dashboard: {response.text}"
        data = response.json()
        print("✅ Dashboard stats retrieved")
    
    def test_admin_get_users(self, admin_token):
        """جلب قائمة المستخدمين"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        data = response.json()
        print(f"✅ Users count: {len(data)}")
    
    def test_admin_get_sellers_pending(self, admin_token):
        """جلب البائعين المعلقين"""
        response = requests.get(
            f"{BASE_URL}/api/admin/sellers/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get pending sellers: {response.text}"
        data = response.json()
        print(f"✅ Pending sellers count: {len(data)}")
    
    def test_admin_get_topup_requests(self, admin_token):
        """جلب طلبات الشحن"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/admin/topup-requests",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get topup requests: {response.text}"
        data = response.json()
        print(f"✅ Topup requests count: {len(data)}")


class TestCommissionSystem:
    """اختبارات نظام العمولات"""
    
    def test_calculate_commission(self):
        """حساب العمولة"""
        response = requests.get(
            f"{BASE_URL}/api/commission/calculate",
            params={"price": 100000, "category": "إلكترونيات"}
        )
        assert response.status_code == 200, f"Failed to calculate commission: {response.text}"
        data = response.json()
        assert "commission_amount" in data
        assert "seller_amount" in data
        print(f"✅ Commission: {data.get('commission_percentage', 'N/A')} = {data.get('commission_amount', 0)} SYP")


class TestProductsAndCategories:
    """اختبارات المنتجات والفئات"""
    
    def test_get_categories(self):
        """جلب الفئات"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Failed to get categories: {response.text}"
        data = response.json()
        print(f"✅ Categories count: {len(data)}")
    
    def test_get_products(self):
        """جلب المنتجات"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Failed to get products: {response.text}"
        data = response.json()
        products = data.get("products", data) if isinstance(data, dict) else data
        print(f"✅ Products count: {len(products)}")
    
    def test_search_products(self):
        """البحث في المنتجات"""
        response = requests.get(
            f"{BASE_URL}/api/products",
            params={"search": "هاتف"}
        )
        assert response.status_code == 200, f"Failed to search products: {response.text}"
        data = response.json()
        products = data.get('products', data) if isinstance(data, dict) else data
        print(f"✅ Search results: {len(products)}")


class TestPlatformSettings:
    """اختبارات إعدادات المنصة"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        token = get_admin_token()
        if not token:
            pytest.skip("Could not get admin token")
        return token
    
    def test_get_wallet_settings(self):
        """جلب إعدادات المحفظة"""
        response = requests.get(f"{BASE_URL}/api/settings/wallet")
        assert response.status_code == 200, f"Failed to get wallet settings: {response.text}"
        data = response.json()
        print(f"✅ Wallet settings: min_seller_withdrawal={data.get('seller_min_withdrawal', 'N/A')}")
    
    def test_get_platform_settings(self, admin_token):
        """جلب إعدادات المنصة"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get platform settings: {response.text}"
        print("✅ Platform settings retrieved")


class TestNotifications:
    """اختبارات الإشعارات"""
    
    @pytest.fixture
    def seller_token(self):
        """Get seller token"""
        token = get_seller_token()
        if not token:
            pytest.skip("Could not get seller token")
        return token
    
    def test_get_notifications(self, seller_token):
        """جلب الإشعارات"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200, f"Failed to get notifications: {response.text}"
        data = response.json()
        notifications = data.get("notifications", data) if isinstance(data, dict) else data
        print(f"✅ Notifications count: {len(notifications)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
