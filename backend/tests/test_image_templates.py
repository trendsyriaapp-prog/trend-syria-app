# /app/backend/tests/test_image_templates.py
# Tests for Image Templates System - Free 3D Templates + Paid AI (Gemini Imagen)
# نظام قوالب صور المنتجات مع خيارات مجانية (12 قالب 3D) وخيار مدفوع بالذكاء الاصطناعي

import pytest
import requests
import os
from PIL import Image
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
FOOD_SELLER = {"phone": "0966666666", "password": "seller123"}
ADMIN = {"phone": "0911111111", "password": "admin123"}
CUSTOMER = {"phone": "0933333333", "password": "buyer123"}

# Create test image
def create_test_image():
    """Create a small test image for API tests"""
    img = Image.new('RGB', (200, 200), color='blue')
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    buffer.seek(0)
    return buffer


class TestTemplatesList:
    """Test GET /api/templates/list - جلب قائمة القوالب الـ 12"""
    
    def test_get_templates_list(self):
        """Should return all 12 templates"""
        response = requests.get(f"{BASE_URL}/api/templates/list")
        assert response.status_code == 200
        
        data = response.json()
        assert "templates" in data
        assert len(data["templates"]) == 12
        assert "categories" in data
        assert "ai_price" in data
        assert data["ai_price"] == 3000
        
    def test_templates_have_required_fields(self):
        """All templates should have required fields"""
        response = requests.get(f"{BASE_URL}/api/templates/list")
        data = response.json()
        
        for template in data["templates"]:
            assert "id" in template
            assert "name" in template
            assert "name_en" in template
            assert "icon" in template
            assert "category" in template
            assert "is_free" in template
            assert "colors" in template
            assert template["is_free"] == True  # All templates are free
            
    def test_all_templates_are_free(self):
        """Verify all 12 templates are marked as free"""
        response = requests.get(f"{BASE_URL}/api/templates/list")
        data = response.json()
        
        free_count = sum(1 for t in data["templates"] if t["is_free"])
        assert free_count == 12
        
    def test_template_categories(self):
        """Verify template categories"""
        response = requests.get(f"{BASE_URL}/api/templates/list")
        data = response.json()
        
        categories = data["categories"]
        assert "seasonal" in categories
        assert "promotion" in categories
        assert "luxury" in categories
        assert "category" in categories


class TestApplyFreeTemplate:
    """Test POST /api/templates/apply-free - تطبيق قالب مجاني على صورة"""
    
    def test_apply_free_template_no_auth(self):
        """Free templates work without authentication"""
        test_image = create_test_image()
        response = requests.post(
            f"{BASE_URL}/api/templates/apply-free",
            files={"file": ("test.jpg", test_image, "image/jpeg")},
            data={"template_id": "ramadan"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "image" in data
        assert data["image"].startswith("data:image/jpeg;base64,")
        assert data["template_used"] == "ramadan"
        assert data["cost"] == 0
        assert data["method"] == "free_template"
        
    def test_apply_different_free_templates(self):
        """Test applying different free templates"""
        templates_to_test = ["eid", "hot_sale", "premium", "tech", "fashion"]
        
        for template_id in templates_to_test:
            test_image = create_test_image()
            response = requests.post(
                f"{BASE_URL}/api/templates/apply-free",
                files={"file": ("test.jpg", test_image, "image/jpeg")},
                data={"template_id": template_id}
            )
            assert response.status_code == 200, f"Failed for template: {template_id}"
            assert response.json()["template_used"] == template_id
            
    def test_apply_free_invalid_template(self):
        """Should reject invalid template ID"""
        test_image = create_test_image()
        response = requests.post(
            f"{BASE_URL}/api/templates/apply-free",
            files={"file": ("test.jpg", test_image, "image/jpeg")},
            data={"template_id": "invalid_template_xyz"}
        )
        assert response.status_code == 400
        
    def test_apply_free_non_image_file(self):
        """Should reject non-image files"""
        response = requests.post(
            f"{BASE_URL}/api/templates/apply-free",
            files={"file": ("test.txt", io.BytesIO(b"not an image"), "text/plain")},
            data={"template_id": "ramadan"}
        )
        assert response.status_code == 400


class TestCheckBalance:
    """Test GET /api/templates/check-balance - فحص رصيد البائع للصور AI"""
    
    @pytest.fixture
    def seller_token(self):
        """Get food seller token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=FOOD_SELLER
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not authenticate as food seller")
    
    def test_check_balance_requires_auth(self):
        """Balance check requires authentication"""
        response = requests.get(f"{BASE_URL}/api/templates/check-balance")
        assert response.status_code == 401
        
    def test_check_balance_returns_info(self, seller_token):
        """Balance check returns wallet info"""
        response = requests.get(
            f"{BASE_URL}/api/templates/check-balance",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "wallet_balance" in data
        assert "ai_image_price" in data
        assert "can_use_ai" in data
        assert "images_available" in data
        assert "message" in data
        assert data["ai_image_price"] == 3000
        
    def test_customer_cannot_check_balance(self):
        """Customer user type should be rejected"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CUSTOMER
        )
        if response.status_code != 200:
            pytest.skip("Could not authenticate as customer")
            
        token = response.json().get("token")
        response = requests.get(
            f"{BASE_URL}/api/templates/check-balance",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403


class TestApplyAITemplate:
    """Test POST /api/templates/apply-ai - تطبيق قالب AI مدفوع"""
    
    @pytest.fixture
    def seller_token(self):
        """Get food seller token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=FOOD_SELLER
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not authenticate as food seller")
    
    def test_apply_ai_requires_auth(self):
        """AI templates require authentication"""
        test_image = create_test_image()
        response = requests.post(
            f"{BASE_URL}/api/templates/apply-ai",
            files={"file": ("test.jpg", test_image, "image/jpeg")},
            data={"template_id": "premium"}
        )
        assert response.status_code == 401
        
    def test_apply_ai_insufficient_balance(self, seller_token):
        """Should return 402 when balance is insufficient"""
        # First check current balance
        balance_response = requests.get(
            f"{BASE_URL}/api/templates/check-balance",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        balance_data = balance_response.json()
        
        # If balance is sufficient, skip this test
        if balance_data.get("can_use_ai", False):
            pytest.skip("Seller has sufficient balance, skipping insufficient balance test")
        
        test_image = create_test_image()
        response = requests.post(
            f"{BASE_URL}/api/templates/apply-ai",
            headers={"Authorization": f"Bearer {seller_token}"},
            files={"file": ("test.jpg", test_image, "image/jpeg")},
            data={"template_id": "premium"}
        )
        assert response.status_code == 402
        
        data = response.json()
        assert "detail" in data
        detail = data["detail"]
        assert "error" in detail
        assert "required" in detail
        assert detail["required"] == 3000
        
    def test_apply_ai_with_balance(self, seller_token):
        """Should process image and deduct balance when sufficient"""
        # First check if balance is sufficient
        balance_response = requests.get(
            f"{BASE_URL}/api/templates/check-balance",
            headers={"Authorization": f"Bearer {seller_token}"}
        )
        balance_data = balance_response.json()
        
        if not balance_data.get("can_use_ai", False):
            pytest.skip("Seller has insufficient balance for AI test")
        
        initial_balance = balance_data["wallet_balance"]
        
        test_image = create_test_image()
        response = requests.post(
            f"{BASE_URL}/api/templates/apply-ai",
            headers={"Authorization": f"Bearer {seller_token}"},
            files={"file": ("test.jpg", test_image, "image/jpeg")},
            data={"template_id": "premium"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "image" in data
        assert data["cost"] == 3000
        assert data["new_balance"] == initial_balance - 3000
        
    def test_customer_cannot_use_ai(self):
        """Customer user type should be rejected from AI endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=CUSTOMER
        )
        if response.status_code != 200:
            pytest.skip("Could not authenticate as customer")
            
        token = response.json().get("token")
        test_image = create_test_image()
        
        response = requests.post(
            f"{BASE_URL}/api/templates/apply-ai",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("test.jpg", test_image, "image/jpeg")},
            data={"template_id": "premium"}
        )
        assert response.status_code == 403


class TestTemplateIntegration:
    """Integration tests for template workflow"""
    
    def test_full_free_template_workflow(self):
        """Test complete free template workflow"""
        # 1. Get templates list
        templates_response = requests.get(f"{BASE_URL}/api/templates/list")
        assert templates_response.status_code == 200
        templates = templates_response.json()["templates"]
        
        # 2. Select a template and apply
        template_id = templates[0]["id"]  # Use first template
        test_image = create_test_image()
        
        apply_response = requests.post(
            f"{BASE_URL}/api/templates/apply-free",
            files={"file": ("test.jpg", test_image, "image/jpeg")},
            data={"template_id": template_id}
        )
        assert apply_response.status_code == 200
        
        # 3. Verify response has valid image
        result = apply_response.json()
        assert result["success"] == True
        assert result["template_used"] == template_id
        assert result["cost"] == 0
        
    def test_settings_images_public(self):
        """Test GET /api/settings/images/public endpoint if exists"""
        response = requests.get(f"{BASE_URL}/api/settings/images/public")
        # This endpoint may or may not exist
        if response.status_code == 200:
            data = response.json()
            print(f"Image settings: {data}")
        else:
            print(f"Image settings endpoint returned: {response.status_code}")
