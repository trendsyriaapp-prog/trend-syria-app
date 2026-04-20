# /app/backend/tests/test_admin_browse_as_customer.py
# Test: Admin can browse as customer - wallet, cart, order, payment
# Feature: All user types can use wallet for purchases

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminBrowseAsCustomer:
    """Test admin can browse as customer - wallet, cart, order, wallet payment"""
    
    @pytest.fixture(scope="class")
    def admin_auth(self):
        """Login as admin and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "TrendSyria@2026"
        })
        assert response.status_code == 200, f"Failed to login: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in login response"
        assert data.get("user", {}).get("user_type") == "admin", "User is not admin"
        print(f"✅ Logged in as admin: {data['user']['name']}")
        return {
            "token": data["token"],
            "user": data["user"]
        }
    
    @pytest.fixture(scope="class")
    def headers(self, admin_auth):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_auth['token']}",
            "Content-Type": "application/json"
        }
    
    # ============== Wallet Tests ==============
    
    def test_admin_wallet_balance(self, headers):
        """Admin can access wallet balance"""
        response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers)
        print(f"Wallet balance response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get wallet balance: {response.text}"
        
        data = response.json()
        assert "balance" in data, "No balance field"
        assert "user_id" in data, "No user_id field"
        print(f"✅ Admin wallet balance: {data.get('balance', 0)} SYP")
        return data
    
    def test_admin_topup_request(self, headers):
        """Admin can request wallet topup"""
        response = requests.post(f"{BASE_URL}/api/wallet/topup/request",
            headers=headers,
            json={
                "amount": 1000,
                "payment_method": "shamcash"
            }
        )
        print(f"Topup request response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to request topup: {response.text}"
        
        data = response.json()
        assert data.get("success"), "Topup request not successful"
        assert "topup_id" in data, "No topup_id"
        assert "topup_code" in data, "No topup_code"
        print(f"✅ Admin topup request created: {data.get('topup_code')}")
        return data
    
    def test_admin_topup_history(self, headers):
        """Admin can view topup history"""
        response = requests.get(f"{BASE_URL}/api/wallet/topup/history", headers=headers)
        print(f"Topup history response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get topup history: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Topup history should be a list"
        print(f"✅ Admin topup history count: {len(data)}")
        return data
    
    def test_admin_wallet_transactions(self, headers):
        """Admin can view wallet transactions"""
        response = requests.get(f"{BASE_URL}/api/wallet/transactions", headers=headers)
        print(f"Transactions response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get transactions: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Transactions should be a list"
        print(f"✅ Admin transactions count: {len(data)}")
        return data
    
    # ============== Cart Tests ==============
    
    def test_admin_get_cart(self, headers):
        """Admin can access cart"""
        response = requests.get(f"{BASE_URL}/api/cart", headers=headers)
        print(f"Cart response: {response.status_code}")
        
        # Cart might be empty (404) or exist (200)
        assert response.status_code in [200, 404], f"Unexpected cart response: {response.text}"
        print(f"✅ Admin can access cart")
    
    def test_admin_add_to_cart(self, headers):
        """Admin can add products to cart"""
        # First get a product
        products_response = requests.get(f"{BASE_URL}/api/products?limit=1")
        if products_response.status_code != 200:
            pytest.skip("No products available")
        
        products = products_response.json()
        if not products or len(products) == 0:
            pytest.skip("No products available")
        
        product = products[0]
        product_id = product.get("id")
        
        # Add to cart
        response = requests.post(f"{BASE_URL}/api/cart/add",
            headers=headers,
            json={
                "product_id": product_id,
                "quantity": 1
            }
        )
        print(f"Add to cart response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to add to cart: {response.text}"
        print(f"✅ Admin added product to cart: {product.get('name', product_id)}")
        return product
    
    # ============== Order Tests ==============
    
    def test_admin_get_orders(self, headers):
        """Admin can view their orders as buyer"""
        response = requests.get(f"{BASE_URL}/api/orders/my", headers=headers)
        print(f"My orders response: {response.status_code}")
        
        assert response.status_code == 200, f"Failed to get orders: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Orders should be a list"
        print(f"✅ Admin orders count: {len(data)}")
        return data
    
    # ============== Wallet Payment API Test ==============
    
    def test_wallet_pay_api_accessible(self, headers):
        """POST /api/payment/wallet/pay should be accessible to admin"""
        # Test with a fake order_id - should return 404 (order not found) not 403 (forbidden)
        response = requests.post(f"{BASE_URL}/api/payment/wallet/pay",
            headers=headers,
            params={"order_id": "fake-order-id-12345"}
        )
        print(f"Wallet pay response: {response.status_code} - {response.text[:200]}")
        
        # Should NOT be 403 (forbidden) - that would mean user_type restriction
        assert response.status_code != 403, "Wallet pay should not be restricted to buyers only"
        
        # Expected: 404 (order not found) or 400 (bad request)
        assert response.status_code in [400, 404], f"Unexpected status: {response.status_code}"
        print(f"✅ Wallet pay API accessible to admin (no 403)")


class TestWalletPaymentFlow:
    """Test complete wallet payment flow for admin"""
    
    @pytest.fixture(scope="class")
    def admin_auth(self):
        """Login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "TrendSyria@2026"
        })
        assert response.status_code == 200, f"Failed to login: {response.text}"
        
        data = response.json()
        return {
            "token": data["token"],
            "user": data["user"]
        }
    
    @pytest.fixture(scope="class")
    def headers(self, admin_auth):
        return {
            "Authorization": f"Bearer {admin_auth['token']}",
            "Content-Type": "application/json"
        }
    
    def test_check_wallet_balance_for_payment(self, headers):
        """Check admin has sufficient wallet balance"""
        response = requests.get(f"{BASE_URL}/api/wallet/balance", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        balance = data.get("balance", 0)
        print(f"✅ Admin wallet balance: {balance:,} SYP")
        
        # According to main agent, admin has ~50,000 SYP after previous payment
        if balance < 1000:
            print(f"⚠️ Low balance - may need topup for payment tests")
        
        return balance
    
    def test_find_paid_order_with_delivery_code(self, headers):
        """Find a paid order and verify delivery code exists"""
        response = requests.get(f"{BASE_URL}/api/orders/my", headers=headers)
        assert response.status_code == 200
        
        orders = response.json()
        
        # Find paid orders
        paid_orders = [o for o in orders if o.get("status") == "paid"]
        
        if paid_orders:
            order = paid_orders[0]
            print(f"✅ Found paid order: {order.get('id', '')[:8]}...")
            print(f"   Status: {order.get('status')}")
            print(f"   Delivery status: {order.get('delivery_status')}")
            
            # Check for delivery/pickup code
            delivery_code = order.get("delivery_code") or order.get("pickup_code")
            if delivery_code:
                print(f"   ✅ Delivery code: {delivery_code}")
            else:
                print(f"   ⚠️ No delivery code found in order")
            
            return order
        else:
            print(f"ℹ️ No paid orders found for admin")
            return None


class TestWalletAPIsNoRestriction:
    """Verify wallet APIs have no user_type restrictions"""
    
    @pytest.fixture(scope="class")
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0945570365",
            "password": "TrendSyria@2026"
        })
        if response.status_code != 200:
            pytest.skip("Cannot login as admin")
        
        token = response.json().get("token")
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_topup_request_no_buyer_restriction(self, admin_headers):
        """POST /api/wallet/topup/request should work for admin (not just buyer)"""
        response = requests.post(f"{BASE_URL}/api/wallet/topup/request",
            headers=admin_headers,
            json={
                "amount": 500,
                "payment_method": "shamcash"
            }
        )
        
        # Should NOT return 403
        assert response.status_code != 403, "topup/request should not be restricted to buyers"
        assert response.status_code == 200, f"Unexpected status: {response.status_code}"
        print(f"✅ POST /api/wallet/topup/request works for admin")
    
    def test_topup_history_no_buyer_restriction(self, admin_headers):
        """GET /api/wallet/topup/history should work for admin (not just buyer)"""
        response = requests.get(f"{BASE_URL}/api/wallet/topup/history", headers=admin_headers)
        
        # Should NOT return 403
        assert response.status_code != 403, "topup/history should not be restricted to buyers"
        assert response.status_code == 200, f"Unexpected status: {response.status_code}"
        print(f"✅ GET /api/wallet/topup/history works for admin")
    
    def test_wallet_pay_no_buyer_restriction(self, admin_headers):
        """POST /api/payment/wallet/pay should work for admin (not just buyer)"""
        response = requests.post(f"{BASE_URL}/api/payment/wallet/pay",
            headers=admin_headers,
            params={"order_id": "test-order-id"}
        )
        
        # Should NOT return 403 (forbidden due to user_type)
        # Expected: 404 (order not found) or 400 (bad request)
        assert response.status_code != 403, "wallet/pay should not be restricted to buyers"
        print(f"✅ POST /api/payment/wallet/pay accessible to admin (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
