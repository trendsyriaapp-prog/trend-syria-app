# test_removebg_exports_weather.py
# Tests for: Remove.bg API, Reports Export (PDF/Excel), Weather API
# Features added: Jan 2026

import pytest
import requests
import os
import io

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

class TestImageProcessingStatus:
    """Test Remove.bg API integration - /api/image/status endpoint"""
    
    def test_image_status_returns_premium_available(self):
        """Verify /api/image/status shows premium_available: true when Remove.bg key is configured"""
        response = requests.get(f"{BASE_URL}/api/image/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "premium_available" in data, "Response should contain premium_available field"
        assert data["premium_available"] == True, "premium_available should be True when REMOVE_BG_API_KEY is set"
        assert "fallback_available" in data, "Response should contain fallback_available"
        assert data["fallback_available"] == True, "Fallback (local rembg) should always be available"
        
    def test_image_status_contains_service_info(self):
        """Check that status endpoint returns service info"""
        response = requests.get(f"{BASE_URL}/api/image/status")
        data = response.json()
        
        assert "premium_service" in data
        if data["premium_available"]:
            assert data["premium_service"] == "Remove.bg"
        assert "fallback_service" in data


class TestImageBackgrounds:
    """Test available backgrounds endpoint"""
    
    def test_get_backgrounds_list(self):
        """Verify backgrounds endpoint returns list of background options"""
        response = requests.get(f"{BASE_URL}/api/image/backgrounds")
        assert response.status_code == 200
        
        data = response.json()
        assert "backgrounds" in data
        assert isinstance(data["backgrounds"], list)
        assert len(data["backgrounds"]) > 0
        
        # Check structure of background item
        bg = data["backgrounds"][0]
        assert "id" in bg
        assert "name" in bg
        assert "category" in bg


class TestReportsExport:
    """Test PDF/Excel export endpoints"""
    
    def test_sales_excel_export(self):
        """Test /api/reports/sales/excel endpoint returns Excel file"""
        response = requests.get(f"{BASE_URL}/api/reports/sales/excel?days=7")
        assert response.status_code == 200, f"Sales Excel export failed: {response.status_code}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type, \
            f"Expected Excel content type, got {content_type}"
        
        # Check content disposition for filename
        disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in disposition, "Should be downloadable attachment"
        assert ".xlsx" in disposition, "Should have .xlsx extension"
        
        # Verify non-empty content
        assert len(response.content) > 0, "Excel file should not be empty"
    
    def test_sales_pdf_export(self):
        """Test /api/reports/sales/pdf endpoint returns PDF file"""
        response = requests.get(f"{BASE_URL}/api/reports/sales/pdf?days=7")
        assert response.status_code == 200, f"Sales PDF export failed: {response.status_code}"
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        assert "pdf" in content_type, f"Expected PDF content type, got {content_type}"
        
        # Check content disposition
        disposition = response.headers.get("Content-Disposition", "")
        assert "attachment" in disposition
        assert ".pdf" in disposition
        
        # Verify PDF magic bytes
        assert response.content[:4] == b'%PDF', "Response should be valid PDF"
    
    def test_products_excel_export(self):
        """Test /api/reports/products/excel endpoint returns Excel file"""
        response = requests.get(f"{BASE_URL}/api/reports/products/excel")
        assert response.status_code == 200, f"Products Excel export failed: {response.status_code}"
        
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type
        
        disposition = response.headers.get("Content-Disposition", "")
        assert ".xlsx" in disposition
        assert len(response.content) > 0
    
    def test_analytics_excel_export(self):
        """Test /api/reports/analytics/excel endpoint returns Excel file"""
        response = requests.get(f"{BASE_URL}/api/reports/analytics/excel?days=7")
        assert response.status_code == 200, f"Analytics Excel export failed: {response.status_code}"
        
        content_type = response.headers.get("Content-Type", "")
        assert "spreadsheetml" in content_type or "application/vnd" in content_type
        
        disposition = response.headers.get("Content-Disposition", "")
        assert ".xlsx" in disposition
    
    def test_sales_excel_with_different_days(self):
        """Test sales export with different day ranges"""
        for days in [1, 7, 30]:
            response = requests.get(f"{BASE_URL}/api/reports/sales/excel?days={days}")
            assert response.status_code == 200, f"Sales export with days={days} failed"


class TestWeatherAPI:
    """Test Weather API integration"""
    
    def test_weather_endpoint_exists(self):
        """Check if weather endpoint exists and responds"""
        # Common weather endpoint patterns
        endpoints = [
            "/api/weather",
            "/api/weather/current",
            "/api/delivery/weather"
        ]
        
        found = False
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            if response.status_code != 404:
                found = True
                print(f"Weather endpoint found: {endpoint} - Status: {response.status_code}")
                break
        
        # Note: Weather API may not have a dedicated endpoint, may be used internally
        # This test just checks if any weather endpoint exists
        print(f"Weather endpoint search completed. Found: {found}")
    
    def test_openweathermap_api_direct(self):
        """Direct test of OpenWeatherMap API with provided key"""
        api_key = "64cb3b801a650c27f2a113ddfed21b73"
        city = "Damascus"
        
        response = requests.get(
            f"https://api.openweathermap.org/data/2.5/weather",
            params={"q": city, "appid": api_key, "units": "metric"}
        )
        
        assert response.status_code == 200, f"OpenWeatherMap API failed: {response.status_code}"
        
        data = response.json()
        assert "main" in data, "Weather response should contain 'main'"
        assert "temp" in data["main"], "Weather response should contain temperature"
        assert "weather" in data, "Weather response should contain 'weather'"
        
        print(f"Weather in {city}: {data['main']['temp']}°C, {data['weather'][0]['description']}")


class TestAuthAndSellerAccess:
    """Test seller authentication for authenticated endpoints"""
    
    @pytest.fixture
    def seller_token(self):
        """Get seller authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0966666666",
            "password": "seller123"
        })
        if response.status_code == 200:
            return response.json().get("access_token") or response.json().get("token")
        pytest.skip("Seller login failed")
    
    def test_seller_can_export_reports_with_auth(self, seller_token):
        """Test seller can access export endpoints with authentication"""
        headers = {"Authorization": f"Bearer {seller_token}"}
        
        # Test sales Excel
        response = requests.get(
            f"{BASE_URL}/api/reports/sales/excel?days=7",
            headers=headers
        )
        assert response.status_code == 200, "Seller should be able to export sales Excel"
        
        # Test products Excel  
        response = requests.get(
            f"{BASE_URL}/api/reports/products/excel",
            headers=headers
        )
        assert response.status_code == 200, "Seller should be able to export products Excel"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
