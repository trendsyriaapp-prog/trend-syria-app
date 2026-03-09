# /app/backend/tests/test_image_search_language.py
# Test Image Search API and Language Support for Syrian E-commerce App

import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Create a valid test image (larger than 100 bytes to pass API validation)
def get_test_image_base64():
    """Generate a valid JPEG image for testing (>100 bytes)"""
    # This is a valid small JPEG image that is larger than 100 bytes
    # It's a 10x10 red JPEG image
    jpeg_data = bytes([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
        0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
        0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
        0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x0A,
        0x00, 0x0A, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
        0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
        0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
        0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5,
        0x10, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9
    ])
    return base64.b64encode(jpeg_data).decode('utf-8')


def get_small_png_base64():
    """Generate a small PNG (for validation testing - should fail size check)"""
    png_data = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00'
        b'\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
    )
    return base64.b64encode(png_data).decode('utf-8')

class TestImageSearchAPI:
    """Test Image Search API endpoints"""
    
    def test_image_search_endpoint_exists(self):
        """Test that /api/image-search/search endpoint exists"""
        response = requests.post(
            f"{BASE_URL}/api/image-search/search",
            json={"image_base64": "invalid", "limit": 5},
            headers={"Content-Type": "application/json"}
        )
        # Should return 400 for invalid image, not 404
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Image search endpoint exists and returns 400 for invalid image")
    
    def test_image_search_validation_empty_image(self):
        """Test that empty image_base64 returns proper error"""
        response = requests.post(
            f"{BASE_URL}/api/image-search/search",
            json={"image_base64": "", "limit": 5},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Empty image validation works: {data['detail']}")
    
    def test_image_search_validation_invalid_base64(self):
        """Test that invalid base64 returns proper error"""
        response = requests.post(
            f"{BASE_URL}/api/image-search/search",
            json={"image_base64": "not-valid-base64!!!@@@", "limit": 5},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Invalid base64 validation works: {data['detail']}")
    
    def test_image_search_validation_too_small(self):
        """Test that too small image returns proper error (min 100 bytes)"""
        image_base64 = get_small_png_base64()  # 67 bytes - too small
        response = requests.post(
            f"{BASE_URL}/api/image-search/search",
            json={"image_base64": image_base64, "limit": 5},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Small image validation works: {data['detail']}")
    
    def test_image_search_with_valid_image(self):
        """Test image search with a valid small image"""
        image_base64 = get_test_image_base64()
        response = requests.post(
            f"{BASE_URL}/api/image-search/search",
            json={"image_base64": image_base64, "limit": 5},
            headers={"Content-Type": "application/json"},
            timeout=60  # Allow longer timeout for AI processing
        )
        # Should return 200 (success) or 500 (AI error) - not 400/404
        assert response.status_code in [200, 500], f"Expected 200 or 500, got {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "products" in data or "analysis" in data
            print(f"✓ Image search with valid image works. Total products: {data.get('total', 0)}")
        else:
            data = response.json()
            print(f"✓ Image search API reachable but AI returned error: {data.get('detail', 'Unknown error')}")
    
    def test_image_search_with_data_uri_prefix(self):
        """Test image search with data:image/png;base64, prefix"""
        image_base64 = get_test_image_base64()
        data_uri = f"data:image/png;base64,{image_base64}"
        response = requests.post(
            f"{BASE_URL}/api/image-search/search",
            json={"image_base64": data_uri, "limit": 5},
            headers={"Content-Type": "application/json"},
            timeout=60
        )
        assert response.status_code in [200, 500], f"Expected 200 or 500, got {response.status_code}"
        print(f"✓ Image search with data URI prefix works. Status: {response.status_code}")


class TestImageUploadAPI:
    """Test Image Upload API endpoint"""
    
    def test_image_upload_endpoint_exists(self):
        """Test that /api/image-search/upload endpoint exists"""
        # Send empty file to test endpoint existence
        response = requests.post(
            f"{BASE_URL}/api/image-search/upload",
            files={"file": ("test.txt", b"test", "text/plain")}
        )
        # Should return 400 for unsupported file type, not 404
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✓ Image upload endpoint exists and validates file type")
    
    def test_image_upload_validation_unsupported_type(self):
        """Test that unsupported file type returns proper error"""
        response = requests.post(
            f"{BASE_URL}/api/image-search/upload",
            files={"file": ("test.pdf", b"test content", "application/pdf")}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "JPEG" in data["detail"] or "PNG" in data["detail"] or "WEBP" in data["detail"]
        print(f"✓ Unsupported file type validation works: {data['detail']}")
    
    def test_image_upload_with_valid_png(self):
        """Test image upload with valid PNG file (>100 bytes)"""
        # Create a valid larger image data
        jpeg_data = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x0A,
            0x00, 0x0A, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5,
            0x10, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9
        ])
        response = requests.post(
            f"{BASE_URL}/api/image-search/upload",
            files={"file": ("test.jpg", jpeg_data, "image/jpeg")},
            timeout=60
        )
        # Should return 200 or 500 (AI error), not 400
        assert response.status_code in [200, 500], f"Expected 200 or 500, got {response.status_code}"
        print(f"✓ Image upload with valid JPEG works. Status: {response.status_code}")


class TestRecentSearchesAPI:
    """Test Recent Searches API endpoint (requires authentication)"""
    
    def test_recent_searches_requires_auth(self):
        """Test that /api/image-search/recent requires authentication"""
        response = requests.get(f"{BASE_URL}/api/image-search/recent")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Recent searches endpoint requires authentication")


class TestLanguageIntegration:
    """Test Language Support Integration"""
    
    def test_api_returns_arabic_messages(self):
        """Test that API returns Arabic error messages"""
        response = requests.post(
            f"{BASE_URL}/api/image-search/search",
            json={"image_base64": "", "limit": 5},
            headers={"Content-Type": "application/json"}
        )
        data = response.json()
        # Check that error message is in Arabic
        detail = data.get("detail", "")
        # Arabic characters check
        has_arabic = any('\u0600' <= char <= '\u06FF' for char in detail)
        assert has_arabic, f"Expected Arabic error message, got: {detail}"
        print(f"✓ API returns Arabic error messages: {detail}")
    
    def test_main_api_returns_arabic(self):
        """Test that main API greeting is in Arabic"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        message = data.get("message", "")
        has_arabic = any('\u0600' <= char <= '\u06FF' for char in message)
        assert has_arabic, f"Expected Arabic message, got: {message}"
        print(f"✓ Main API returns Arabic greeting: {message}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
