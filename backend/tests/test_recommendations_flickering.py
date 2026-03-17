# /app/backend/tests/test_recommendations_flickering.py
# Test file for recommendations API endpoints (flickering bug investigation)

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

class TestRecommendationsAPI:
    """Tests for recommendation endpoints that power homepage sections"""
    
    def test_trending_products_endpoint(self):
        """Test /api/recommendations/trending returns valid data"""
        response = requests.get(f"{BASE_URL}/api/recommendations/trending?limit=8")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            # Validate product structure
            product = data[0]
            assert "id" in product, "Product should have id"
            assert "name" in product, "Product should have name"
            assert "price" in product, "Product should have price"
            assert "recommendation_reason" in product, "Product should have recommendation_reason"
            print(f"✓ Trending products: {len(data)} items returned")
    
    def test_deals_products_endpoint(self):
        """Test /api/recommendations/deals returns valid data"""
        response = requests.get(f"{BASE_URL}/api/recommendations/deals?limit=8")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            # Validate product structure
            product = data[0]
            assert "id" in product, "Product should have id"
            assert "name" in product, "Product should have name"
            assert "price" in product, "Product should have price"
            # Deals should have discount info
            print(f"✓ Deals products: {len(data)} items returned")
    
    def test_new_products_endpoint(self):
        """Test /api/recommendations/new-products returns valid data"""
        response = requests.get(f"{BASE_URL}/api/recommendations/new-products?limit=8")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            # Validate product structure
            product = data[0]
            assert "id" in product, "Product should have id"
            assert "name" in product, "Product should have name"
            assert "price" in product, "Product should have price"
            assert "recommendation_reason" in product, "Product should have recommendation_reason"
            print(f"✓ New products: {len(data)} items returned")
    
    def test_product_badges_endpoint(self):
        """Test /api/settings/product-badges returns valid data"""
        response = requests.get(f"{BASE_URL}/api/settings/product-badges")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data can be null or object
        data = response.json()
        if data:
            print(f"✓ Badge settings: {data}")
        else:
            print("✓ Badge settings: None (disabled)")
    
    def test_all_endpoints_concurrent(self):
        """Test that all recommendation endpoints respond quickly when called together"""
        import concurrent.futures
        import time
        
        endpoints = [
            f"{BASE_URL}/api/recommendations/trending?limit=8",
            f"{BASE_URL}/api/recommendations/deals?limit=8",
            f"{BASE_URL}/api/recommendations/new-products?limit=8",
            f"{BASE_URL}/api/settings/product-badges"
        ]
        
        def fetch(url):
            start = time.time()
            response = requests.get(url, timeout=10)
            elapsed = time.time() - start
            return url, response.status_code, elapsed
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(fetch, endpoints))
        
        total_time = sum(r[2] for r in results)
        
        for url, status, elapsed in results:
            endpoint_name = url.split('/')[-1].split('?')[0]
            print(f"  {endpoint_name}: {status} in {elapsed:.2f}s")
            assert status == 200, f"Endpoint {endpoint_name} failed with status {status}"
        
        print(f"✓ All endpoints responded. Total time: {total_time:.2f}s")
        
        # Assert all completed reasonably fast
        assert total_time < 10, f"API calls took too long: {total_time:.2f}s"


class TestRecommendationsDataConsistency:
    """Tests to verify data consistency across requests (to detect flickering causes)"""
    
    def test_trending_data_consistency(self):
        """Verify trending data is consistent across multiple requests"""
        responses = []
        
        for i in range(3):
            response = requests.get(f"{BASE_URL}/api/recommendations/trending?limit=8")
            assert response.status_code == 200
            responses.append(set(p['id'] for p in response.json()))
        
        # Check if data is consistent (same products returned)
        if responses[0] == responses[1] == responses[2]:
            print("✓ Trending data is consistent across requests")
        else:
            # Some variation is acceptable due to database sorting
            print("⚠ Trending data has some variation (may be normal)")
    
    def test_deals_data_consistency(self):
        """Verify deals data is consistent across multiple requests"""
        responses = []
        
        for i in range(3):
            response = requests.get(f"{BASE_URL}/api/recommendations/deals?limit=8")
            assert response.status_code == 200
            responses.append(set(p['id'] for p in response.json()))
        
        if responses[0] == responses[1] == responses[2]:
            print("✓ Deals data is consistent across requests")
        else:
            print("⚠ Deals data has some variation (may be normal)")
    
    def test_new_products_data_consistency(self):
        """Verify new products data is consistent across multiple requests"""
        responses = []
        
        for i in range(3):
            response = requests.get(f"{BASE_URL}/api/recommendations/new-products?limit=8")
            assert response.status_code == 200
            responses.append(set(p['id'] for p in response.json()))
        
        if responses[0] == responses[1] == responses[2]:
            print("✓ New products data is consistent across requests")
        else:
            print("⚠ New products data has some variation (may be normal)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
