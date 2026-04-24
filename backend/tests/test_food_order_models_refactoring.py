# /app/backend/tests/test_food_order_models_refactoring.py
# اختبار إعادة هيكلة food_orders.py - المرحلة 2: استخراج النماذج (Pydantic)
# Tests for Phase 2 refactoring: Pydantic models extraction to food_order_models.py

import pytest
import requests
import os
import sys

# Add backend to path for direct imports
sys.path.insert(0, '/app/backend')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestBackendStartup:
    """اختبار أن الـ backend يبدأ بدون أخطاء import"""
    
    def test_health_endpoint(self):
        """اختبار أن الـ backend يعمل"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✅ Backend health check passed")


class TestModelsImport:
    """اختبار استيراد النماذج من food_order_models.py"""
    
    def test_import_all_models(self):
        """اختبار استيراد جميع الـ 16 نموذج"""
        from routes.food_order_models import (
            DistanceCheckRequest,
            FoodOrderItem,
            FoodOrderCreate,
            BatchOrderItem,
            BatchOrderCreate,
            PreparationStartRequest,
            DriverCancelRequest,
            SmartRouteEvaluateRequest,
            VerifyPickupCode,
            StartDeliveryData,
            DeliveryCodeVerification,
            FoodDeliveryFailedRequest,
            AdminCancelRequest,
            RequestDriverData,
            AcceptOrderData,
            SetPreparationTimeData
        )
        
        # Verify all models are Pydantic BaseModel subclasses
        from pydantic import BaseModel
        
        models = [
            DistanceCheckRequest,
            FoodOrderItem,
            FoodOrderCreate,
            BatchOrderItem,
            BatchOrderCreate,
            PreparationStartRequest,
            DriverCancelRequest,
            SmartRouteEvaluateRequest,
            VerifyPickupCode,
            StartDeliveryData,
            DeliveryCodeVerification,
            FoodDeliveryFailedRequest,
            AdminCancelRequest,
            RequestDriverData,
            AcceptOrderData,
            SetPreparationTimeData
        ]
        
        for model in models:
            assert issubclass(model, BaseModel), f"{model.__name__} is not a Pydantic BaseModel"
        
        print(f"✅ All 16 models imported successfully and are Pydantic BaseModel subclasses")
    
    def test_food_orders_imports_from_models(self):
        """اختبار أن food_orders.py يستورد من food_order_models.py بنجاح"""
        # This will fail if there are import errors in food_orders.py
        from routes.food_orders import router
        assert router is not None
        print("✅ food_orders.py imports from food_order_models.py successfully")


class TestModelValidation:
    """اختبار صحة النماذج"""
    
    def test_distance_check_request(self):
        """اختبار نموذج DistanceCheckRequest"""
        from routes.food_order_models import DistanceCheckRequest
        
        data = DistanceCheckRequest(
            store_id="store123",
            customer_lat=33.5138,
            customer_lng=36.2765
        )
        assert data.store_id == "store123"
        assert data.customer_lat == 33.5138
        assert data.customer_lng == 36.2765
        print("✅ DistanceCheckRequest model validation passed")
    
    def test_food_order_item(self):
        """اختبار نموذج FoodOrderItem"""
        from routes.food_order_models import FoodOrderItem
        
        item = FoodOrderItem(
            product_id="prod123",
            name="شاورما",
            price=5000,
            quantity=2,
            notes="بدون بصل"
        )
        assert item.product_id == "prod123"
        assert item.name == "شاورما"
        assert item.price == 5000
        assert item.quantity == 2
        assert item.notes == "بدون بصل"
        print("✅ FoodOrderItem model validation passed")
    
    def test_food_order_create(self):
        """اختبار نموذج FoodOrderCreate"""
        from routes.food_order_models import FoodOrderCreate, FoodOrderItem
        
        order = FoodOrderCreate(
            store_id="store123",
            items=[
                FoodOrderItem(product_id="p1", name="Item 1", price=1000, quantity=1)
            ],
            delivery_address="دمشق - المزة",
            delivery_city="دمشق",
            delivery_phone="0912345678"
        )
        assert order.store_id == "store123"
        assert len(order.items) == 1
        assert order.delivery_city == "دمشق"
        assert order.payment_method == "wallet"  # default value
        print("✅ FoodOrderCreate model validation passed")
    
    def test_batch_order_create(self):
        """اختبار نموذج BatchOrderCreate"""
        from routes.food_order_models import BatchOrderCreate, BatchOrderItem, FoodOrderItem
        
        batch = BatchOrderCreate(
            orders=[
                BatchOrderItem(
                    store_id="store1",
                    items=[FoodOrderItem(product_id="p1", name="Item 1", price=1000, quantity=1)]
                ),
                BatchOrderItem(
                    store_id="store2",
                    items=[FoodOrderItem(product_id="p2", name="Item 2", price=2000, quantity=2)]
                )
            ],
            delivery_address="دمشق - المزة",
            delivery_city="دمشق",
            delivery_phone="0912345678"
        )
        assert len(batch.orders) == 2
        assert batch.delivery_city == "دمشق"
        print("✅ BatchOrderCreate model validation passed")
    
    def test_driver_cancel_request(self):
        """اختبار نموذج DriverCancelRequest"""
        from routes.food_order_models import DriverCancelRequest
        
        cancel = DriverCancelRequest(reason="العميل غير متواجد")
        assert cancel.reason == "العميل غير متواجد"
        print("✅ DriverCancelRequest model validation passed")
    
    def test_admin_cancel_request(self):
        """اختبار نموذج AdminCancelRequest"""
        from routes.food_order_models import AdminCancelRequest
        
        cancel = AdminCancelRequest(
            reason="طلب العميل الإلغاء",
            notify_customer=True,
            offer_replacement=False
        )
        assert cancel.reason == "طلب العميل الإلغاء"
        assert cancel.notify_customer == True
        assert cancel.offer_replacement == False
        print("✅ AdminCancelRequest model validation passed")


class TestEndpointsWithoutAuth:
    """اختبار الـ endpoints بدون مصادقة - يجب أن ترجع 401"""
    
    def test_my_orders_requires_auth(self):
        """اختبار /api/food/orders/my-orders - يجب 401 بدون auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders", timeout=10)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/food/orders/my-orders returns 401 without auth")
    
    def test_delivery_available_requires_auth(self):
        """اختبار /api/food/orders/delivery/available - يجب 401"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/available", timeout=10)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/food/orders/delivery/available returns 401 without auth")
    
    def test_seller_orders_requires_auth(self):
        """اختبار /api/food/orders/seller - يجب 401"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller", timeout=10)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/food/orders/seller returns 401 without auth")
    
    def test_store_orders_requires_auth(self):
        """اختبار /api/food/orders/store/orders - يجب 401"""
        response = requests.get(f"{BASE_URL}/api/food/orders/store/orders", timeout=10)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/food/orders/store/orders returns 401 without auth")


class TestEndpointsExist:
    """اختبار وجود الـ endpoints (لا تكسرت بسبب إعادة الهيكلة)"""
    
    def test_check_distance_endpoint_exists(self):
        """اختبار وجود endpoint فحص المسافة"""
        # POST without body should return 422 (validation error), not 404
        response = requests.post(f"{BASE_URL}/api/food/orders/check-distance", timeout=10)
        assert response.status_code in [422, 400], f"Expected 422 or 400, got {response.status_code}"
        print("✅ /api/food/orders/check-distance endpoint exists")
    
    def test_create_order_endpoint_exists(self):
        """اختبار وجود endpoint إنشاء الطلب"""
        # POST without auth should return 401
        response = requests.post(f"{BASE_URL}/api/food/orders", timeout=10)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/food/orders (POST) endpoint exists")
    
    def test_batch_orders_endpoint_exists(self):
        """اختبار وجود endpoint الطلبات المجمعة"""
        # POST without auth should return 401
        response = requests.post(f"{BASE_URL}/api/food/orders/batch", timeout=10)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ /api/food/orders/batch endpoint exists")


class TestModelFieldsComplete:
    """اختبار أن جميع الحقول موجودة في النماذج"""
    
    def test_food_order_create_has_all_fields(self):
        """اختبار أن FoodOrderCreate يحتوي على جميع الحقول"""
        from routes.food_order_models import FoodOrderCreate
        
        expected_fields = [
            'store_id', 'items', 'delivery_address', 'delivery_city', 
            'delivery_phone', 'delivery_latitude', 'delivery_longitude',
            'detailed_address', 'notes', 'delivery_note', 'payment_method',
            'batch_id', 'latitude', 'longitude', 'delivery_fee',
            'delivery_distance_km', 'scheduled_for', 'is_scheduled'
        ]
        
        model_fields = FoodOrderCreate.model_fields.keys()
        
        for field in expected_fields:
            assert field in model_fields, f"Missing field: {field}"
        
        print(f"✅ FoodOrderCreate has all {len(expected_fields)} expected fields")
    
    def test_batch_order_create_has_all_fields(self):
        """اختبار أن BatchOrderCreate يحتوي على جميع الحقول"""
        from routes.food_order_models import BatchOrderCreate
        
        expected_fields = [
            'orders', 'delivery_address', 'delivery_city', 'delivery_phone',
            'detailed_address', 'delivery_note', 'payment_method',
            'latitude', 'longitude', 'delivery_latitude', 'delivery_longitude'
        ]
        
        model_fields = BatchOrderCreate.model_fields.keys()
        
        for field in expected_fields:
            assert field in model_fields, f"Missing field: {field}"
        
        print(f"✅ BatchOrderCreate has all {len(expected_fields)} expected fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
