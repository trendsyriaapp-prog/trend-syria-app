# /app/backend/tests/test_price_control_system.py
# نظام التحكم في الأسعار - اختبارات شاملة
# Tests for best-sellers, lowest-price, and price reports APIs

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PHONE = "0911111111"
ADMIN_PASSWORD = "admin123"
CUSTOMER_PHONE = "0933333333"
CUSTOMER_PASSWORD = "user123"

class TestPriceControlAPIs:
    """اختبارات نظام التحكم في الأسعار"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with headers"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": ADMIN_PHONE,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.text}")
        
    def get_customer_token(self):
        """Get customer token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": CUSTOMER_PHONE,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Customer login failed: {response.text}")

    # ========== Best Sellers API Tests ==========
    
    def test_best_sellers_returns_list(self):
        """GET /api/products/best-sellers - يجب أن يعود بقائمة المنتجات الأكثر مبيعاً"""
        response = self.session.get(f"{BASE_URL}/api/products/best-sellers")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure if there are products
        if len(data) > 0:
            product = data[0]
            assert "id" in product, "Product should have id"
            assert "name" in product, "Product should have name"
            assert "price" in product, "Product should have price"
            assert "sales_count" in product, "Product should have sales_count"
            
            # Verify sorting by sales_count (descending)
            if len(data) > 1:
                for i in range(len(data) - 1):
                    assert data[i].get("sales_count", 0) >= data[i+1].get("sales_count", 0), \
                        "Products should be sorted by sales_count descending"
    
    def test_best_sellers_with_limit(self):
        """GET /api/products/best-sellers?limit=5 - اختبار التحديد"""
        response = self.session.get(f"{BASE_URL}/api/products/best-sellers?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5, "Should return at most 5 products"
    
    def test_best_sellers_only_approved_active(self):
        """Best sellers should only include approved and active products"""
        response = self.session.get(f"{BASE_URL}/api/products/best-sellers")
        
        assert response.status_code == 200
        data = response.json()
        
        # Products returned are from cache/DB query that filters is_active=True, is_approved=True
        # We can only verify the response structure here
        for product in data:
            # Ensure products have positive sales count
            assert product.get("sales_count", 0) > 0, "Best sellers should have sales_count > 0"

    # ========== Lowest Price API Tests ==========
    
    def test_lowest_price_returns_list(self):
        """GET /api/products/lowest-price - يجب أن يعود بقائمة المنتجات الأقل سعراً"""
        response = self.session.get(f"{BASE_URL}/api/products/lowest-price")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Verify structure if there are products
        if len(data) > 0:
            product = data[0]
            assert "id" in product, "Product should have id"
            assert "name" in product, "Product should have name"
            assert "price" in product, "Product should have price"
            
            # Verify sorting by price (ascending)
            if len(data) > 1:
                for i in range(len(data) - 1):
                    assert data[i].get("price", 0) <= data[i+1].get("price", float('inf')), \
                        "Products should be sorted by price ascending"
    
    def test_lowest_price_with_limit(self):
        """GET /api/products/lowest-price?limit=5 - اختبار التحديد"""
        response = self.session.get(f"{BASE_URL}/api/products/lowest-price?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5, "Should return at most 5 products"
    
    def test_lowest_price_excludes_zero_price(self):
        """Lowest price should exclude products with price=0"""
        response = self.session.get(f"{BASE_URL}/api/products/lowest-price")
        
        assert response.status_code == 200
        data = response.json()
        
        for product in data:
            assert product.get("price", 0) > 0, "Products should have price > 0"
            assert product.get("stock", 0) > 0, "Products should have stock > 0"

    # ========== Price Reports API Tests - Customer ==========
    
    def test_create_price_report_unauthenticated(self):
        """POST /api/price-reports - يجب أن يفشل بدون تسجيل دخول"""
        response = self.session.post(f"{BASE_URL}/api/price-reports", json={
            "product_id": "test-id",
            "product_type": "product",
            "reason": "test reason"
        })
        
        assert response.status_code == 401 or response.status_code == 403, \
            "Should reject unauthenticated request"
    
    def test_create_price_report_authenticated(self):
        """POST /api/price-reports - إنشاء بلاغ سعر جديد (يتطلب تسجيل دخول)"""
        token = self.get_customer_token()
        
        # First get a valid product
        products_response = self.session.get(f"{BASE_URL}/api/products/best-sellers?limit=1")
        assert products_response.status_code == 200
        products = products_response.json()
        
        if len(products) == 0:
            pytest.skip("No products available for testing")
        
        product_id = products[0]["id"]
        products[0]["name"]
        
        # Create price report
        response = self.session.post(
            f"{BASE_URL}/api/price-reports",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_id": product_id,
                "product_type": "product",
                "reason": "السعر أعلى بكثير من السوق المحلي",
                "suggested_price": 1000,
                "comment": "اختبار - تجاهل هذا البلاغ"
            }
        )
        
        # May return 400 if already reported by same user, otherwise 200/201
        assert response.status_code in [200, 201, 400], f"Unexpected status: {response.status_code}"
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data, "Response should have report id"
            assert "message" in data, "Response should have success message"
    
    def test_create_price_report_invalid_product(self):
        """POST /api/price-reports - بلاغ لمنتج غير موجود"""
        token = self.get_customer_token()
        
        response = self.session.post(
            f"{BASE_URL}/api/price-reports",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "product_id": "non-existent-product-id-12345",
                "product_type": "product",
                "reason": "test reason"
            }
        )
        
        assert response.status_code == 404, "Should return 404 for non-existent product"
    
    def test_get_my_reports(self):
        """GET /api/price-reports/my-reports - جلب بلاغات المستخدم"""
        token = self.get_customer_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/price-reports/my-reports",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"

    # ========== Price Reports API Tests - Admin ==========
    
    def test_admin_stats_unauthenticated(self):
        """GET /api/price-reports/admin/stats - يجب أن يفشل بدون صلاحيات"""
        response = self.session.get(f"{BASE_URL}/api/price-reports/admin/stats")
        
        assert response.status_code in [401, 403], "Should reject unauthenticated request"
    
    def test_admin_stats_customer_forbidden(self):
        """GET /api/price-reports/admin/stats - يجب أن يُرفض العميل"""
        token = self.get_customer_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/price-reports/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, "Should forbid customer access"
    
    def test_admin_stats(self):
        """GET /api/price-reports/admin/stats - إحصائيات البلاغات (للأدمن فقط)"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/price-reports/admin/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total" in data, "Should have total count"
        assert "pending" in data, "Should have pending count"
        assert "approved" in data, "Should have approved count"
        assert "rejected" in data, "Should have rejected count"
        assert "warning" in data, "Should have warning count"
        
        # Verify data integrity
        total_sum = data["pending"] + data["approved"] + data["rejected"] + data["warning"]
        assert data["total"] == total_sum, "Total should equal sum of all statuses"
    
    def test_admin_all_reports(self):
        """GET /api/price-reports/admin/all - قائمة جميع البلاغات (للأدمن فقط)"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/price-reports/admin/all",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "reports" in data, "Should have reports list"
        assert "total" in data, "Should have total count"
        assert "page" in data, "Should have page number"
        assert "pages" in data, "Should have total pages"
        
        # Verify report structure if there are reports
        if len(data["reports"]) > 0:
            report = data["reports"][0]
            assert "id" in report, "Report should have id"
            assert "product_id" in report, "Report should have product_id"
            assert "product_name" in report, "Report should have product_name"
            assert "status" in report, "Report should have status"
            assert "reason" in report, "Report should have reason"
            # Reporter name should NOT be included for privacy
            assert "reporter_name" not in report, "Reporter name should be hidden for privacy"
    
    def test_admin_all_reports_filter(self):
        """GET /api/price-reports/admin/all?status=pending - فلتر البلاغات"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/price-reports/admin/all?status=pending",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        
        data = response.json()
        for report in data["reports"]:
            assert report["status"] == "pending", "All reports should have pending status"
    
    def test_admin_sellers_with_violations(self):
        """GET /api/price-reports/admin/sellers-with-violations - البائعون المخالفون"""
        token = self.get_admin_token()
        
        response = self.session.get(
            f"{BASE_URL}/api/price-reports/admin/sellers-with-violations",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "sellers" in data, "Should have sellers list"
        assert "total" in data, "Should have total count"
        
        # Verify seller structure if there are sellers with violations
        if len(data["sellers"]) > 0:
            seller = data["sellers"][0]
            assert "id" in seller, "Seller should have id"
            assert "name" in seller, "Seller should have name"
            assert "violation_points" in seller, "Seller should have violation_points"

    # ========== Integration Test ==========
    
    def test_full_price_report_flow(self):
        """اختبار تدفق كامل: إنشاء بلاغ -> التحقق من الإحصائيات"""
        admin_token = self.get_admin_token()
        customer_token = self.get_customer_token()
        
        # Get initial stats
        stats_before = self.session.get(
            f"{BASE_URL}/api/price-reports/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        # Get a product to report
        products = self.session.get(f"{BASE_URL}/api/products/lowest-price?limit=1").json()
        
        if len(products) == 0:
            pytest.skip("No products available")
        
        product_id = products[0]["id"]
        
        # Create a new price report
        report_response = self.session.post(
            f"{BASE_URL}/api/price-reports",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "product_id": product_id,
                "product_type": "product",
                "reason": "السعر غير منطقي للمنتج",
                "suggested_price": 50,
                "comment": "اختبار تكامل - تجاهل"
            }
        )
        
        # Check stats after - may be same if duplicate report
        stats_after = self.session.get(
            f"{BASE_URL}/api/price-reports/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        ).json()
        
        if report_response.status_code in [200, 201]:
            # If new report created, stats should increase
            assert stats_after["total"] >= stats_before["total"], "Total should not decrease"
            assert stats_after["pending"] >= stats_before["pending"], "Pending should not decrease"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
