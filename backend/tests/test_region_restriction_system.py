"""
Test Region Restriction System - Iteration 160
Tests the geographic restriction system that allows free browsing but checks at checkout
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://shopper-suite.preview.emergentagent.com')

class TestAllowedRegionsAPI:
    """Tests for /api/settings/allowed-regions endpoint"""
    
    def test_allowed_regions_endpoint_returns_200(self):
        """Test that the allowed-regions endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/settings/allowed-regions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /api/settings/allowed-regions returns 200")
    
    def test_allowed_regions_has_required_fields(self):
        """Test that response has all required fields"""
        response = requests.get(f"{BASE_URL}/api/settings/allowed-regions")
        data = response.json()
        
        # Check required fields
        assert "enabled" in data, "Missing 'enabled' field"
        assert "cities" in data, "Missing 'cities' field"
        assert "blocked_message" in data, "Missing 'blocked_message' field"
        
        print(f"PASS: Response has all required fields: enabled={data['enabled']}")
    
    def test_allowed_regions_cities_structure(self):
        """Test that cities array has correct structure"""
        response = requests.get(f"{BASE_URL}/api/settings/allowed-regions")
        data = response.json()
        
        assert isinstance(data["cities"], list), "cities should be a list"
        
        if len(data["cities"]) > 0:
            city = data["cities"][0]
            assert "name" in city, "City should have 'name' field"
            assert "regions" in city, "City should have 'regions' field"
            assert isinstance(city["regions"], list), "regions should be a list"
            
            print(f"PASS: Found {len(data['cities'])} cities with proper structure")
            print(f"  - First city: {city['name']} with {len(city['regions'])} regions")
    
    def test_aleppo_is_allowed(self):
        """Test that Aleppo (حلب) is in the allowed cities"""
        response = requests.get(f"{BASE_URL}/api/settings/allowed-regions")
        data = response.json()
        
        city_names = [city["name"] for city in data["cities"]]
        assert "حلب" in city_names, "Aleppo (حلب) should be in allowed cities"
        
        # Check Aleppo has regions
        aleppo = next((c for c in data["cities"] if c["name"] == "حلب"), None)
        assert aleppo is not None, "Aleppo city data not found"
        assert len(aleppo["regions"]) > 0, "Aleppo should have regions"
        
        print(f"PASS: Aleppo (حلب) is allowed with {len(aleppo['regions'])} regions")
    
    def test_blocked_message_is_set(self):
        """Test that blocked message is properly set"""
        response = requests.get(f"{BASE_URL}/api/settings/allowed-regions")
        data = response.json()
        
        assert data["blocked_message"], "blocked_message should not be empty"
        assert len(data["blocked_message"]) > 10, "blocked_message should be meaningful"
        
        print(f"PASS: Blocked message is set: '{data['blocked_message'][:50]}...'")


class TestPublicAPIsAccessible:
    """Test that public APIs are accessible without authentication"""
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("PASS: Health endpoint working")
    
    def test_categories_endpoint(self):
        """Test categories are accessible"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should have categories"
        print(f"PASS: Categories endpoint returns {len(data)} categories")
    
    def test_products_endpoint(self):
        """Test products are accessible"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert "products" in data or isinstance(data, list)
        print("PASS: Products endpoint accessible")
    
    def test_public_settings_endpoint(self):
        """Test public settings are accessible"""
        response = requests.get(f"{BASE_URL}/api/settings/public")
        assert response.status_code == 200
        print("PASS: Public settings endpoint accessible")


class TestRegionServiceIntegration:
    """Test that region service is properly integrated"""
    
    def test_region_check_does_not_block_browsing(self):
        """Verify that browsing APIs don't require region check"""
        # These should all work without any region restriction
        endpoints = [
            "/api/categories",
            "/api/products",
            "/api/food/stores",
            "/api/settings/public"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code in [200, 401], f"{endpoint} should be accessible (got {response.status_code})"
        
        print("PASS: All browsing endpoints accessible without region check")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
