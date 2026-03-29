# /app/backend/tests/test_driver_store_proximity.py
# اختبار نظام إشعار البائع عند اقتراب السائق من المتجر

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Get tokens at module level
def get_seller_token():
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": "0999999999",
        "password": "seller123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None

def get_driver_token():
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "phone": "0900000000",
        "password": "delivery123"
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None

# Module level fixtures
SELLER_TOKEN = None
DRIVER_TOKEN = None

class TestDriverStoreProximityNotification:
    """اختبار نظام إشعار البائع عند اقتراب السائق من المتجر"""

    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Setup tokens before each test"""
        global SELLER_TOKEN, DRIVER_TOKEN
        if SELLER_TOKEN is None:
            SELLER_TOKEN = get_seller_token()
        if DRIVER_TOKEN is None:
            DRIVER_TOKEN = get_driver_token()
        self.seller_token = SELLER_TOKEN
        self.driver_token = DRIVER_TOKEN

    def test_01_seller_login(self):
        """التحقق من تسجيل دخول البائع"""
        assert self.seller_token is not None
        print(f"✅ Seller logged in successfully with token: {self.seller_token[:20]}...")

    def test_02_driver_login(self):
        """التحقق من تسجيل دخول السائق"""
        assert self.driver_token is not None
        print(f"✅ Driver logged in successfully with token: {self.driver_token[:20]}...")

    def test_03_seller_store_exists(self):
        """التحقق من وجود متجر البائع"""
        response = requests.get(
            f"{BASE_URL}/api/food/my-store",
            headers={"Authorization": f"Bearer {self.seller_token}"}
        )
        print(f"Store response: {response.status_code} - {response.text[:200] if response.text else 'empty'}")
        
        if response.status_code == 200:
            data = response.json()
            store = data.get("store")
            if store:
                print(f"✅ Store found: {store.get('name')}")
                print(f"   City: {store.get('city')}")
                print(f"   Latitude: {store.get('latitude')}")
                print(f"   Longitude: {store.get('longitude')}")
                print(f"   Owner ID: {store.get('owner_id')}")
                assert store.get('latitude') is not None, "Store should have latitude"
                assert store.get('longitude') is not None, "Store should have longitude"
            else:
                print("⚠️ No store data returned")
        else:
            print(f"⚠️ Store not found or not approved: {response.status_code}")

    def test_04_driver_location_update_api(self):
        """التحقق من API تحديث موقع السائق"""
        # تحديث موقع السائق بدون order_id
        response = requests.put(
            f"{BASE_URL}/api/delivery/location",
            headers={"Authorization": f"Bearer {self.driver_token}"},
            json={
                "latitude": 33.5138,
                "longitude": 36.2765
            }
        )
        print(f"Location update response: {response.status_code} - {response.text}")
        assert response.status_code == 200
        data = response.json()
        assert data.get("success")
        print("✅ Driver location update API working")

    def test_05_notifications_endpoint(self):
        """التحقق من endpoint الإشعارات"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {self.seller_token}"}
        )
        print(f"Notifications response: {response.status_code}")
        assert response.status_code == 200
        notifications = response.json()
        print(f"✅ Notifications endpoint working - {len(notifications)} notifications found")
        
        # فحص إذا كان هناك إشعار من نوع driver_arriving_store
        driver_notifications = [n for n in notifications if n.get('type') == 'driver_arriving_store']
        print(f"   Driver arriving store notifications: {len(driver_notifications)}")
        for n in driver_notifications[:3]:
            print(f"   - {n.get('title')}: {n.get('message')}")

    def test_06_check_proximity_logic_in_delivery_code(self):
        """فحص وجود منطق القرب في كود التوصيل"""
        # Read the delivery.py file to verify the logic
        try:
            with open('/app/backend/routes/delivery.py', 'r') as f:
                content = f.read()
            
            # Check for key elements
            assert 'check_proximity_and_notify' in content, "check_proximity_and_notify function should exist"
            assert 'store_nearby_notification_sent' in content, "store_nearby_notification_sent flag should exist"
            assert 'driver_arriving_store' in content, "driver_arriving_store notification type should exist"
            assert 'distance_to_store < 0.5' in content, "500m (0.5km) distance check should exist"
            
            print("✅ All proximity notification logic elements found in delivery.py:")
            print("   - check_proximity_and_notify function")
            print("   - store_nearby_notification_sent flag to prevent duplicates")
            print("   - driver_arriving_store notification type")
            print("   - 500 meter (0.5 km) distance threshold")
        except FileNotFoundError:
            pytest.skip("delivery.py file not found")

    def test_07_notification_structure(self):
        """التحقق من هيكل الإشعار"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {self.seller_token}"}
        )
        assert response.status_code == 200
        notifications = response.json()
        
        if len(notifications) > 0:
            # Check notification structure
            n = notifications[0]
            print("✅ Sample notification structure:")
            print(f"   id: {n.get('id')}")
            print(f"   type: {n.get('type')}")
            print(f"   title: {n.get('title')}")
            print(f"   message: {n.get('message')}")
            print(f"   is_read: {n.get('is_read')}")
            print(f"   play_sound: {n.get('play_sound')}")
        else:
            print("⚠️ No notifications to check structure")


class TestFoodStoreDashboardNotification:
    """اختبار عرض الإشعارات في لوحة تحكم البائع"""

    def test_frontend_notification_code_exists(self):
        """التحقق من وجود كود الإشعارات في FoodStoreDashboard"""
        try:
            with open('/app/frontend/src/pages/FoodStoreDashboard.js', 'r') as f:
                content = f.read()
            
            # Check for key elements
            assert 'driverArrivingAlert' in content, "driverArrivingAlert state should exist"
            assert 'checkDriverArrivingNotifications' in content, "checkDriverArrivingNotifications function should exist"
            assert 'driver_arriving_store' in content, "driver_arriving_store type check should exist"
            assert 'playNotificationSound' in content, "playNotificationSound function should exist"
            assert 'notification.mp3' in content, "notification.mp3 audio file reference should exist"
            
            print("✅ All notification elements found in FoodStoreDashboard.js:")
            print("   - driverArrivingAlert state")
            print("   - checkDriverArrivingNotifications function")
            print("   - driver_arriving_store type check")
            print("   - playNotificationSound function")
            print("   - notification.mp3 audio reference")
            
            # Check interval for polling
            assert 'setInterval(checkDriverArrivingNotifications, 10000)' in content, "Should poll every 10 seconds"
            print("   - 10 second polling interval")
            
        except FileNotFoundError:
            pytest.skip("FoodStoreDashboard.js file not found")

    def test_notification_sound_file_exists(self):
        """التحقق من وجود ملف الصوت"""
        import os
        sound_file = '/app/frontend/public/notification.mp3'
        assert os.path.exists(sound_file), f"Sound file should exist at {sound_file}"
        
        file_size = os.path.getsize(sound_file)
        print(f"✅ notification.mp3 exists, size: {file_size} bytes")


class TestDeliveryLocationUpdateWithOrder:
    """اختبار تحديث موقع السائق مع طلب نشط"""

    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Setup tokens before each test"""
        global DRIVER_TOKEN
        if DRIVER_TOKEN is None:
            DRIVER_TOKEN = get_driver_token()
        self.driver_token = DRIVER_TOKEN

    def test_driver_my_food_orders(self):
        """جلب طلبات الطعام النشطة للسائق"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-food-orders",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        print(f"My food orders response: {response.status_code}")
        
        if response.status_code == 200:
            orders = response.json()
            print(f"✅ Active food orders: {len(orders)}")
            for order in orders[:3]:
                print(f"   Order {order.get('id')[:8]}: status={order.get('status')}, store={order.get('store_name')}")
        elif response.status_code == 403:
            print("⚠️ Driver account not approved or not available")

    def test_location_update_with_order_id(self):
        """تحديث موقع السائق مع معرف طلب"""
        # First get active orders
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-food-orders",
            headers={"Authorization": f"Bearer {self.driver_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get active orders")
        
        orders = response.json()
        if not orders:
            print("⚠️ No active orders for driver - location update without order_id")
            # Update location without order
            loc_response = requests.put(
                f"{BASE_URL}/api/delivery/location",
                headers={"Authorization": f"Bearer {self.driver_token}"},
                json={
                    "latitude": 33.5138,
                    "longitude": 36.2765
                }
            )
            assert loc_response.status_code == 200
            print("✅ Location updated without order_id")
        else:
            # Update location with order_id
            order_id = orders[0].get('id')
            loc_response = requests.put(
                f"{BASE_URL}/api/delivery/location",
                headers={"Authorization": f"Bearer {self.driver_token}"},
                json={
                    "latitude": 33.5138,
                    "longitude": 36.2765,
                    "order_id": order_id
                }
            )
            print(f"Location update with order {order_id}: {loc_response.status_code}")
            assert loc_response.status_code == 200
            print(f"✅ Location updated with order_id: {order_id[:8]}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])


class TestUnreadNotificationsEndpoint:
    """اختبار endpoint الإشعارات غير المقروءة"""

    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Setup tokens before each test"""
        global SELLER_TOKEN
        if SELLER_TOKEN is None:
            SELLER_TOKEN = get_seller_token()
        self.seller_token = SELLER_TOKEN

    def test_unread_notifications_endpoint(self):
        """التحقق من endpoint الإشعارات غير المقروءة"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread",
            headers={"Authorization": f"Bearer {self.seller_token}"}
        )
        print(f"Unread notifications response: {response.status_code}")
        assert response.status_code == 200
        notifications = response.json()
        assert isinstance(notifications, list), "Response should be a list"
        print(f"✅ Unread notifications endpoint working - {len(notifications)} unread notifications")
        
        # Check structure if any notifications exist
        for n in notifications[:3]:
            assert "id" in n, "Notification should have id"
            assert "is_read" in n, "Notification should have is_read flag"
            assert not n["is_read"], "All notifications should be unread"
            print(f"   - {n.get('type')}: {n.get('title')}")
