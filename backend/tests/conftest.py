# /app/backend/tests/conftest.py
# إعدادات مشتركة للاختبارات - pytest fixtures

import os
import pytest
from dotenv import load_dotenv

# تحميل متغيرات البيئة
load_dotenv()


# ============== Test Configuration ==============

@pytest.fixture(scope="session")
def api_url():
    """URL الخادم للاختبار"""
    return os.getenv("TEST_API_URL", "http://localhost:8001")


@pytest.fixture(scope="session")
def admin_phone():
    """رقم هاتف المدير للاختبار"""
    return os.getenv("TEST_ADMIN_PHONE", "0945570365")


@pytest.fixture(scope="session")
def admin_password():
    """كلمة مرور المدير للاختبار"""
    return os.getenv("TEST_ADMIN_PASSWORD", "123456")


@pytest.fixture(scope="session")
def test_otp():
    """كود OTP للاختبار"""
    return os.getenv("TEST_OTP_CODE", "123456")


@pytest.fixture(scope="session")
def test_user_phone():
    """رقم هاتف مستخدم الاختبار"""
    return os.getenv("TEST_USER_PHONE", "0999888777")


@pytest.fixture(scope="session")
def test_seller_phone():
    """رقم هاتف البائع للاختبار"""
    return os.getenv("TEST_SELLER_PHONE", "0999777666")


@pytest.fixture(scope="session")
def test_driver_phone():
    """رقم هاتف السائق للاختبار"""
    return os.getenv("TEST_DRIVER_PHONE", "0999666555")


# ============== Helper Fixtures ==============

@pytest.fixture
def auth_headers(api_url, admin_phone, admin_password):
    """
    توليد headers المصادقة للمدير
    يُستخدم في الاختبارات التي تتطلب صلاحيات إدارية
    """
    import requests
    
    response = requests.post(
        f"{api_url}/api/auth/login",
        json={"phone": admin_phone, "password": admin_password}
    )
    
    if response.status_code == 200:
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    pytest.skip("فشل في تسجيل الدخول - تحقق من بيانات الاختبار")


@pytest.fixture
def buyer_headers(api_url, test_user_phone, admin_password):
    """
    توليد headers المصادقة للمشتري
    """
    import requests
    
    response = requests.post(
        f"{api_url}/api/auth/login",
        json={"phone": test_user_phone, "password": admin_password}
    )
    
    if response.status_code == 200:
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    return None


@pytest.fixture
def seller_headers(api_url, test_seller_phone, admin_password):
    """
    توليد headers المصادقة للبائع
    """
    import requests
    
    response = requests.post(
        f"{api_url}/api/auth/login",
        json={"phone": test_seller_phone, "password": admin_password}
    )
    
    if response.status_code == 200:
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    return None


# ============== Test Data Fixtures ==============

@pytest.fixture
def sample_product():
    """بيانات منتج نموذجي للاختبار"""
    return {
        "name": "منتج اختبار",
        "description": "وصف المنتج للاختبار",
        "price": 10000,
        "category": "electronics",
        "stock": 100,
        "images": ["https://example.com/image.jpg"],
        "city": "دمشق"
    }


@pytest.fixture
def sample_order():
    """بيانات طلب نموذجي للاختبار"""
    return {
        "address": "دمشق - المزة",
        "city": "دمشق",
        "phone": "0999888777",
        "payment_method": "cod",
        "delivery_note": "ملاحظة اختبار"
    }
