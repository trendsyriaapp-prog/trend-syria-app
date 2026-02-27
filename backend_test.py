#!/usr/bin/env python3
"""
Trend Syria E-commerce Backend API Test Suite
Tests all major API endpoints and functionality
"""

import requests
import json
import sys
from datetime import datetime

class TrendSyriaAPITester:
    def __init__(self):
        self.base_url = "https://shopper-suite.preview.emergentagent.com/api"
        self.admin_token = None
        self.seller_token = None
        self.buyer_token = None
        self.test_product_id = None
        self.test_order_id = None
        self.tests_run = 0
        self.tests_passed = 0
        
    def run_test(self, name, method, endpoint, expected_status, data=None, auth_token=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_token:
            headers['Authorization'] = f'Bearer {auth_token}'
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"   ✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"   ❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error details: {error_detail}")
                except:
                    print(f"   Response text: {response.text[:200]}")
                return False, {}
                
        except Exception as e:
            print(f"   ❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root endpoint", "GET", "", 200)

    def test_seed_data(self):
        """Test seeding demo data"""
        return self.run_test("Seed demo data", "POST", "seed", 200)

    def test_categories(self):
        """Test categories endpoint"""
        success, response = self.run_test("Get categories", "GET", "categories", 200)
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   📋 Found {len(response)} categories")
            return True
        return False

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin login",
            "POST", 
            "auth/login",
            200,
            {"email": "admin@trendsy.sy", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   🔑 Admin token obtained")
            return True
        return False

    def test_seller_login(self):
        """Test seller login"""
        success, response = self.run_test(
            "Seller login",
            "POST",
            "auth/login", 
            200,
            {"email": "seller@trendsy.sy", "password": "seller123"}
        )
        if success and 'token' in response:
            self.seller_token = response['token']
            print(f"   🔑 Seller token obtained")
            return True
        return False

    def test_user_registration(self):
        """Test new user registration"""
        test_email = f"buyer_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "Buyer registration",
            "POST",
            "auth/register",
            200,
            {
                "name": "Test Buyer",
                "email": test_email,
                "password": "test123",
                "phone": "0991234567",
                "city": "دمشق",
                "user_type": "buyer"
            }
        )
        if success and 'token' in response:
            self.buyer_token = response['token']
            print(f"   🔑 Buyer token obtained")
            return True
        return False

    def test_auth_me(self):
        """Test auth/me endpoint"""
        if not self.admin_token:
            return False
        success, response = self.run_test(
            "Get current user info",
            "GET",
            "auth/me",
            200,
            auth_token=self.admin_token
        )
        return success and 'user_type' in response

    def test_get_products(self):
        """Test get products endpoint"""
        success, response = self.run_test("Get products", "GET", "products", 200)
        if success and 'products' in response:
            products = response['products']
            print(f"   📦 Found {len(products)} products")
            if len(products) > 0:
                self.test_product_id = products[0]['id']
                print(f"   🆔 Test product ID: {self.test_product_id}")
            return True
        return False

    def test_get_featured_products(self):
        """Test featured products endpoint"""
        success, response = self.run_test("Get featured products", "GET", "products/featured", 200)
        if success and isinstance(response, list):
            print(f"   ⭐ Found {len(response)} featured products")
            return True
        return False

    def test_product_detail(self):
        """Test product detail endpoint"""
        if not self.test_product_id:
            return False
        success, response = self.run_test(
            "Get product detail",
            "GET", 
            f"products/{self.test_product_id}",
            200
        )
        return success and 'name' in response

    def test_create_product(self):
        """Test creating a new product (seller only)"""
        if not self.seller_token:
            return False
        success, response = self.run_test(
            "Create product",
            "POST",
            "products",
            200,
            {
                "name": "Test Product",
                "description": "Test product description",
                "price": 100000,
                "category": "electronics",
                "stock": 10,
                "images": ["https://via.placeholder.com/400"]
            },
            auth_token=self.seller_token
        )
        if success and 'id' in response:
            print(f"   🆕 Created product with ID: {response['id']}")
            return True
        return False

    def test_cart_operations(self):
        """Test cart operations (add, get, update)"""
        if not self.buyer_token or not self.test_product_id:
            print("   ⚠️ Skipping cart tests - missing buyer token or product ID")
            return False
        
        # Add to cart
        success, _ = self.run_test(
            "Add to cart",
            "POST",
            "cart/add",
            200,
            {"product_id": self.test_product_id, "quantity": 2},
            auth_token=self.buyer_token
        )
        if not success:
            return False
        
        # Get cart
        success, response = self.run_test(
            "Get cart",
            "GET",
            "cart",
            200,
            auth_token=self.buyer_token
        )
        if success and 'items' in response:
            print(f"   🛒 Cart has {len(response['items'])} items, total: {response.get('total', 0)}")
            return True
        return False

    def test_create_order(self):
        """Test order creation"""
        if not self.buyer_token or not self.test_product_id:
            print("   ⚠️ Skipping order test - missing buyer token or product ID")
            return False
        
        success, response = self.run_test(
            "Create order",
            "POST",
            "orders",
            200,
            {
                "items": [{"product_id": self.test_product_id, "quantity": 1}],
                "address": "Test address",
                "city": "دمشق",
                "phone": "0991234567",
                "payment_method": "shamcash",
                "shamcash_phone": "0991234567"
            },
            auth_token=self.buyer_token
        )
        if success and 'order_id' in response:
            self.test_order_id = response['order_id']
            print(f"   📝 Created order with ID: {self.test_order_id}")
            return True
        return False

    def test_shamcash_payment(self):
        """Test ShamCash payment simulation"""
        if not self.buyer_token or not self.test_order_id:
            print("   ⚠️ Skipping payment test - missing buyer token or order ID")
            return False
        
        # Initialize payment
        success, _ = self.run_test(
            "Initialize ShamCash payment",
            "POST",
            f"payment/shamcash/init?order_id={self.test_order_id}",
            200,
            auth_token=self.buyer_token
        )
        if not success:
            return False
        
        # Verify payment with demo OTP
        success, response = self.run_test(
            "Verify ShamCash payment",
            "POST",
            "payment/shamcash/verify",
            200,
            {
                "order_id": self.test_order_id,
                "phone": "0991234567", 
                "otp": "123456"
            },
            auth_token=self.buyer_token
        )
        return success and response.get('success', False)

    def test_admin_stats(self):
        """Test admin statistics"""
        if not self.admin_token:
            return False
        success, response = self.run_test(
            "Get admin stats",
            "GET",
            "admin/stats",
            200,
            auth_token=self.admin_token
        )
        if success and 'total_users' in response:
            stats = response
            print(f"   📊 Stats - Users: {stats.get('total_users')}, Products: {stats.get('total_products')}, Orders: {stats.get('total_orders')}")
            return True
        return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Trend Syria API Tests")
        print("=" * 50)
        
        # Core tests
        test_results = []
        test_results.append(self.test_root_endpoint())
        test_results.append(self.test_seed_data())
        test_results.append(self.test_categories())
        
        # Authentication tests
        test_results.append(self.test_admin_login())
        test_results.append(self.test_seller_login()) 
        test_results.append(self.test_user_registration())
        test_results.append(self.test_auth_me())
        
        # Product tests
        test_results.append(self.test_get_products())
        test_results.append(self.test_get_featured_products())
        test_results.append(self.test_product_detail())
        test_results.append(self.test_create_product())
        
        # E-commerce flow tests
        test_results.append(self.test_cart_operations())
        test_results.append(self.test_create_order())
        test_results.append(self.test_shamcash_payment())
        
        # Admin tests
        test_results.append(self.test_admin_stats())
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"✅ Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            failed = self.tests_run - self.tests_passed
            print(f"❌ {failed} tests failed")
            return 1

if __name__ == "__main__":
    tester = TrendSyriaAPITester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)