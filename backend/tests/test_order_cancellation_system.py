"""
Test Order Cancellation System - نظام إلغاء الطلبات
Tests for:
1. Food Orders: Cannot cancel after seller confirms (confirmed status)
2. Product Orders: Cannot cancel after shipped status

This test creates test orders owned by the test user to properly test cancellation logic.
"""

import pytest
import requests
import os
from datetime import datetime, timezone
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOrderCancellationSystem:
    """Test order cancellation rules for food and product orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "phone": "0912345678",
            "password": "admin123"
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("token")
            self.user = data.get("user", {})
            self.user_id = self.user.get("id")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            print(f"✅ Logged in as: {self.user.get('name', 'Admin')} (ID: {self.user_id})")
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    # ============== Food Order Cancellation Tests ==============
    
    def test_01_food_order_cancel_pending_should_succeed(self):
        """Test: إلغاء طلب طعام pending (يجب أن ينجح)
        
        Business Rule: Food orders can only be cancelled when status is 'pending'
        """
        print("\n📋 Test: Cancel pending food order - should succeed")
        
        # Create a test food order with pending status owned by admin
        order_id = f"TEST_FOOD_{str(uuid.uuid4())[:8]}"
        
        # Insert test order directly via MongoDB
        import subprocess
        result = subprocess.run([
            "python3", "-c", f"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

async def create_order():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client['trend_syria']
    
    order_doc = {{
        "id": "{order_id}",
        "order_number": "FO_TEST_PENDING",
        "order_type": "food",
        "customer_id": "{self.user_id}",
        "customer_name": "Test Admin",
        "store_id": "test_store",
        "store_name": "Test Store",
        "items": [{{"name": "Test Item", "price": 5000, "quantity": 1}}],
        "subtotal": 5000,
        "delivery_fee": 1000,
        "total": 6000,
        "status": "pending",
        "payment_method": "cash",
        "payment_status": "pending",
        "delivery_address": "Test Address",
        "delivery_city": "Damascus",
        "created_at": datetime.now(timezone.utc).isoformat()
    }}
    
    await db.food_orders.insert_one(order_doc)
    print("Order created successfully")
    client.close()

asyncio.run(create_order())
"""
        ], capture_output=True, text=True, cwd="/app/backend")
        
        print(f"Create order result: {result.stdout} {result.stderr}")
        
        # Try to cancel the order
        cancel_response = self.session.post(f"{BASE_URL}/api/food/orders/{order_id}/cancel")
        print(f"Cancel response: {cancel_response.status_code}")
        print(f"Cancel response body: {cancel_response.text[:500]}")
        
        # Pending orders should be cancellable
        assert cancel_response.status_code == 200, f"Expected 200, got {cancel_response.status_code}: {cancel_response.text}"
        print("✅ Pending food order cancelled successfully")
    
    def test_02_food_order_cancel_confirmed_should_fail(self):
        """Test: إلغاء طلب طعام confirmed (يجب أن يفشل مع رسالة: البائع أكد الطلب)
        
        Business Rule: Food orders CANNOT be cancelled after seller confirms
        """
        print("\n📋 Test: Cancel confirmed food order - should fail")
        
        # Create a test food order with confirmed status owned by admin
        order_id = f"TEST_FOOD_{str(uuid.uuid4())[:8]}"
        
        import subprocess
        result = subprocess.run([
            "python3", "-c", f"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

async def create_order():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client['trend_syria']
    
    order_doc = {{
        "id": "{order_id}",
        "order_number": "FO_TEST_CONFIRMED",
        "order_type": "food",
        "customer_id": "{self.user_id}",
        "customer_name": "Test Admin",
        "store_id": "test_store",
        "store_name": "Test Store",
        "items": [{{"name": "Test Item", "price": 5000, "quantity": 1}}],
        "subtotal": 5000,
        "delivery_fee": 1000,
        "total": 6000,
        "status": "confirmed",
        "payment_method": "cash",
        "payment_status": "pending",
        "delivery_address": "Test Address",
        "delivery_city": "Damascus",
        "created_at": datetime.now(timezone.utc).isoformat()
    }}
    
    await db.food_orders.insert_one(order_doc)
    print("Order created successfully")
    client.close()

asyncio.run(create_order())
"""
        ], capture_output=True, text=True, cwd="/app/backend")
        
        print(f"Create order result: {result.stdout} {result.stderr}")
        
        # Try to cancel - should fail
        cancel_response = self.session.post(f"{BASE_URL}/api/food/orders/{order_id}/cancel")
        print(f"Cancel response: {cancel_response.status_code}")
        print(f"Cancel response body: {cancel_response.text[:500]}")
        
        # Should fail with 400
        assert cancel_response.status_code == 400, f"Expected 400, got {cancel_response.status_code}"
        
        # Check error message contains the expected text
        response_data = cancel_response.json()
        detail = response_data.get("detail", "")
        assert "البائع أكد الطلب" in detail or "لا يمكن إلغاء" in detail, \
            f"Expected error about seller confirmation, got: {detail}"
        
        print(f"✅ Confirmed food order correctly rejected: {detail}")
    
    def test_03_food_order_cancel_preparing_should_fail(self):
        """Test: إلغاء طلب طعام preparing (يجب أن يفشل)
        
        Business Rule: Food orders CANNOT be cancelled after seller starts preparing
        """
        print("\n📋 Test: Cancel preparing food order - should fail")
        
        # Create a test food order with preparing status owned by admin
        order_id = f"TEST_FOOD_{str(uuid.uuid4())[:8]}"
        
        import subprocess
        result = subprocess.run([
            "python3", "-c", f"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

async def create_order():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client['trend_syria']
    
    order_doc = {{
        "id": "{order_id}",
        "order_number": "FO_TEST_PREPARING",
        "order_type": "food",
        "customer_id": "{self.user_id}",
        "customer_name": "Test Admin",
        "store_id": "test_store",
        "store_name": "Test Store",
        "items": [{{"name": "Test Item", "price": 5000, "quantity": 1}}],
        "subtotal": 5000,
        "delivery_fee": 1000,
        "total": 6000,
        "status": "preparing",
        "payment_method": "cash",
        "payment_status": "pending",
        "delivery_address": "Test Address",
        "delivery_city": "Damascus",
        "created_at": datetime.now(timezone.utc).isoformat()
    }}
    
    await db.food_orders.insert_one(order_doc)
    print("Order created successfully")
    client.close()

asyncio.run(create_order())
"""
        ], capture_output=True, text=True, cwd="/app/backend")
        
        print(f"Create order result: {result.stdout} {result.stderr}")
        
        # Try to cancel - should fail
        cancel_response = self.session.post(f"{BASE_URL}/api/food/orders/{order_id}/cancel")
        print(f"Cancel response: {cancel_response.status_code}")
        print(f"Cancel response body: {cancel_response.text[:500]}")
        
        # Should fail with 400
        assert cancel_response.status_code == 400, f"Expected 400, got {cancel_response.status_code}"
        
        response_data = cancel_response.json()
        detail = response_data.get("detail", "")
        assert "لا يمكن إلغاء" in detail or "التحضير" in detail, \
            f"Expected error about preparing status, got: {detail}"
        
        print(f"✅ Preparing food order correctly rejected: {detail}")
    
    # ============== Product Order Cancellation Tests ==============
    
    def test_04_product_order_cancel_pending_should_succeed(self):
        """Test: إلغاء طلب منتجات pending (يجب أن ينجح)
        
        Business Rule: Product orders can be cancelled before shipped status
        """
        print("\n📋 Test: Cancel pending product order - should succeed")
        
        # Create a test product order with pending status owned by admin
        order_id = f"TEST_PROD_{str(uuid.uuid4())[:8]}"
        
        import subprocess
        result = subprocess.run([
            "python3", "-c", f"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

async def create_order():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client['trend_syria']
    
    order_doc = {{
        "id": "{order_id}",
        "user_id": "{self.user_id}",
        "user_name": "Test Admin",
        "items": [{{"product_id": "test", "product_name": "Test Product", "price": 10000, "quantity": 1, "seller_id": "test_seller"}}],
        "subtotal": 10000,
        "delivery_fee": 2000,
        "total": 12000,
        "status": "pending",
        "delivery_status": "pending",
        "payment_method": "cash",
        "address": "Test Address",
        "city": "Damascus",
        "phone": "0912345678",
        "created_at": datetime.now(timezone.utc).isoformat()
    }}
    
    await db.orders.insert_one(order_doc)
    print("Order created successfully")
    client.close()

asyncio.run(create_order())
"""
        ], capture_output=True, text=True, cwd="/app/backend")
        
        print(f"Create order result: {result.stdout} {result.stderr}")
        
        # Try to cancel
        cancel_response = self.session.post(f"{BASE_URL}/api/orders/{order_id}/cancel")
        print(f"Cancel response: {cancel_response.status_code}")
        print(f"Cancel response body: {cancel_response.text[:500]}")
        
        # Pending orders should be cancellable
        assert cancel_response.status_code == 200, f"Expected 200, got {cancel_response.status_code}: {cancel_response.text}"
        print("✅ Pending product order cancelled successfully")
    
    def test_05_product_order_cancel_confirmed_should_succeed(self):
        """Test: إلغاء طلب منتجات confirmed (يجب أن ينجح)
        
        Business Rule: Product orders can be cancelled before shipped status (confirmed is before shipped)
        """
        print("\n📋 Test: Cancel confirmed product order - should succeed")
        
        # Create a test product order with confirmed status owned by admin
        order_id = f"TEST_PROD_{str(uuid.uuid4())[:8]}"
        
        import subprocess
        result = subprocess.run([
            "python3", "-c", f"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

async def create_order():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client['trend_syria']
    
    order_doc = {{
        "id": "{order_id}",
        "user_id": "{self.user_id}",
        "user_name": "Test Admin",
        "items": [{{"product_id": "test", "product_name": "Test Product", "price": 10000, "quantity": 1, "seller_id": "test_seller"}}],
        "subtotal": 10000,
        "delivery_fee": 2000,
        "total": 12000,
        "status": "confirmed",
        "delivery_status": "confirmed",
        "payment_method": "cash",
        "address": "Test Address",
        "city": "Damascus",
        "phone": "0912345678",
        "created_at": datetime.now(timezone.utc).isoformat()
    }}
    
    await db.orders.insert_one(order_doc)
    print("Order created successfully")
    client.close()

asyncio.run(create_order())
"""
        ], capture_output=True, text=True, cwd="/app/backend")
        
        print(f"Create order result: {result.stdout} {result.stderr}")
        
        # Try to cancel - should succeed (confirmed is before shipped)
        cancel_response = self.session.post(f"{BASE_URL}/api/orders/{order_id}/cancel")
        print(f"Cancel response: {cancel_response.status_code}")
        print(f"Cancel response body: {cancel_response.text[:500]}")
        
        # Confirmed orders should be cancellable (before shipped)
        assert cancel_response.status_code == 200, f"Expected 200, got {cancel_response.status_code}: {cancel_response.text}"
        print("✅ Confirmed product order cancelled successfully")
    
    def test_06_product_order_cancel_shipped_should_fail(self):
        """Test: إلغاء طلب منتجات shipped (يجب أن يفشل مع رسالة: الطلب جاهز للشحن)
        
        Business Rule: Product orders CANNOT be cancelled after shipped status
        """
        print("\n📋 Test: Cancel shipped product order - should fail")
        
        # Create a test product order with shipped status owned by admin
        order_id = f"TEST_PROD_{str(uuid.uuid4())[:8]}"
        
        import subprocess
        result = subprocess.run([
            "python3", "-c", f"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

async def create_order():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client['trend_syria']
    
    order_doc = {{
        "id": "{order_id}",
        "user_id": "{self.user_id}",
        "user_name": "Test Admin",
        "items": [{{"product_id": "test", "product_name": "Test Product", "price": 10000, "quantity": 1, "seller_id": "test_seller"}}],
        "subtotal": 10000,
        "delivery_fee": 2000,
        "total": 12000,
        "status": "shipped",
        "delivery_status": "shipped",
        "payment_method": "cash",
        "address": "Test Address",
        "city": "Damascus",
        "phone": "0912345678",
        "created_at": datetime.now(timezone.utc).isoformat()
    }}
    
    await db.orders.insert_one(order_doc)
    print("Order created successfully")
    client.close()

asyncio.run(create_order())
"""
        ], capture_output=True, text=True, cwd="/app/backend")
        
        print(f"Create order result: {result.stdout} {result.stderr}")
        
        # Try to cancel - should fail
        cancel_response = self.session.post(f"{BASE_URL}/api/orders/{order_id}/cancel")
        print(f"Cancel response: {cancel_response.status_code}")
        print(f"Cancel response body: {cancel_response.text[:500]}")
        
        # Should fail with 400
        assert cancel_response.status_code == 400, f"Expected 400, got {cancel_response.status_code}"
        
        response_data = cancel_response.json()
        detail = response_data.get("detail", "")
        assert "جاهز للشحن" in detail or "لا يمكن إلغاء" in detail, \
            f"Expected error about shipped status, got: {detail}"
        
        print(f"✅ Shipped product order correctly rejected: {detail}")
    
    def test_07_product_order_cancel_picked_up_should_fail(self):
        """Test: إلغاء طلب منتجات picked_up (يجب أن يفشل)
        
        Business Rule: Product orders CANNOT be cancelled after driver picks up
        """
        print("\n📋 Test: Cancel picked_up product order - should fail")
        
        # Create a test product order with picked_up status owned by admin
        order_id = f"TEST_PROD_{str(uuid.uuid4())[:8]}"
        
        import subprocess
        result = subprocess.run([
            "python3", "-c", f"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

async def create_order():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client['trend_syria']
    
    order_doc = {{
        "id": "{order_id}",
        "user_id": "{self.user_id}",
        "user_name": "Test Admin",
        "items": [{{"product_id": "test", "product_name": "Test Product", "price": 10000, "quantity": 1, "seller_id": "test_seller"}}],
        "subtotal": 10000,
        "delivery_fee": 2000,
        "total": 12000,
        "status": "picked_up",
        "delivery_status": "picked_up",
        "payment_method": "cash",
        "address": "Test Address",
        "city": "Damascus",
        "phone": "0912345678",
        "created_at": datetime.now(timezone.utc).isoformat()
    }}
    
    await db.orders.insert_one(order_doc)
    print("Order created successfully")
    client.close()

asyncio.run(create_order())
"""
        ], capture_output=True, text=True, cwd="/app/backend")
        
        print(f"Create order result: {result.stdout} {result.stderr}")
        
        # Try to cancel - should fail
        cancel_response = self.session.post(f"{BASE_URL}/api/orders/{order_id}/cancel")
        print(f"Cancel response: {cancel_response.status_code}")
        print(f"Cancel response body: {cancel_response.text[:500]}")
        
        # Should fail with 400
        assert cancel_response.status_code == 400, f"Expected 400, got {cancel_response.status_code}"
        
        response_data = cancel_response.json()
        detail = response_data.get("detail", "")
        assert "لا يمكن إلغاء" in detail or "استلم" in detail, \
            f"Expected error about picked_up status, got: {detail}"
        
        print(f"✅ Picked_up product order correctly rejected: {detail}")


class TestCleanup:
    """Cleanup test orders after tests"""
    
    def test_cleanup_test_orders(self):
        """Clean up test orders created during testing"""
        print("\n📋 Cleaning up test orders...")
        
        import subprocess
        result = subprocess.run([
            "python3", "-c", """
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def cleanup():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client['trend_syria']
    
    # Delete test food orders
    food_result = await db.food_orders.delete_many({"id": {"$regex": "^TEST_"}})
    print(f"Deleted {food_result.deleted_count} test food orders")
    
    # Delete test product orders
    prod_result = await db.orders.delete_many({"id": {"$regex": "^TEST_"}})
    print(f"Deleted {prod_result.deleted_count} test product orders")
    
    client.close()

asyncio.run(cleanup())
"""
        ], capture_output=True, text=True, cwd="/app/backend")
        
        print(result.stdout)
        print("✅ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
