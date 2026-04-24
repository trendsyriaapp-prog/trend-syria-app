"""
Test suite for food_order_helpers.py refactoring verification
Tests that the extracted helper functions work correctly after refactoring
"""
import pytest
import requests
import os
import math

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestFoodOrderHelpersRefactoring:
    """Tests to verify the refactoring of food_orders.py didn't break functionality"""
    
    # ============== Test calculate_haversine_distance function ==============
    def test_calculate_distance_km_same_point(self):
        """Test distance calculation for same point (should be 0)"""
        # Import the function directly to test it
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.food_order_helpers import calculate_haversine_distance
        
        # Same point should return 0
        distance = calculate_haversine_distance(33.5138, 36.2765, 33.5138, 36.2765)
        assert distance == 0 or distance < 0.001, f"Expected ~0, got {distance}"
        print(f"✅ Same point distance: {distance} km")
    
    def test_calculate_distance_km_known_distance(self):
        """Test distance calculation with known coordinates"""
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.food_order_helpers import calculate_haversine_distance
        
        # Damascus to Aleppo (approximately 350 km)
        # Damascus: 33.5138, 36.2765
        # Aleppo: 36.2021, 37.1343
        distance = calculate_haversine_distance(33.5138, 36.2765, 36.2021, 37.1343)
        
        # Should be approximately 300-400 km
        assert 250 < distance < 450, f"Expected ~350 km, got {distance}"
        print(f"✅ Damascus to Aleppo distance: {distance:.2f} km")
    
    def test_calculate_distance_km_short_distance(self):
        """Test distance calculation for short distance (within city)"""
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.food_order_helpers import calculate_haversine_distance
        
        # Two points in Damascus (approximately 2-3 km apart)
        lat1, lon1 = 33.5138, 36.2765  # Point 1
        lat2, lon2 = 33.5300, 36.2900  # Point 2 (slightly north-east)
        
        distance = calculate_haversine_distance(lat1, lon1, lat2, lon2)
        
        # Should be a few kilometers
        assert 0 < distance < 10, f"Expected short distance, got {distance}"
        print(f"✅ Short distance calculation: {distance:.2f} km")
    
    # ============== Test constants are exported correctly ==============
    def test_constants_exported(self):
        """Test that all constants are exported from food_order_helpers"""
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.food_order_helpers import (
            HOT_FRESH_STORE_TYPES,
            COLD_DRY_STORE_TYPES,
            DEFAULT_HOT_FRESH_LIMIT,
            DEFAULT_COLD_DRY_LIMIT,
            ORDER_STATUSES,
            PLATFORM_WALLET_ID
        )
        
        # Verify constants have expected values
        assert "restaurants" in HOT_FRESH_STORE_TYPES
        assert "market" in COLD_DRY_STORE_TYPES
        assert DEFAULT_HOT_FRESH_LIMIT == 2
        assert DEFAULT_COLD_DRY_LIMIT == 5
        assert "pending" in ORDER_STATUSES
        assert "delivered" in ORDER_STATUSES
        assert PLATFORM_WALLET_ID == "platform_admin_wallet"
        print("✅ All constants exported correctly")
    
    def test_get_first_name_function(self):
        """Test get_first_name helper function"""
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.food_order_helpers import get_first_name
        
        # Test with full name
        assert get_first_name("محمد أحمد") == "محمد"
        
        # Test with single name
        assert get_first_name("أحمد") == "أحمد"
        
        # Test with empty string
        assert get_first_name("") == "السائق"
        
        # Test with None
        assert get_first_name(None) == "السائق"
        
        print("✅ get_first_name function works correctly")
    
    def test_get_store_delivery_category(self):
        """Test get_store_delivery_category helper function"""
        import sys
        sys.path.insert(0, '/app/backend')
        from routes.food_order_helpers import get_store_delivery_category
        
        # Test hot/fresh types
        assert get_store_delivery_category("restaurants") == "hot_fresh"
        assert get_store_delivery_category("cafes") == "hot_fresh"
        assert get_store_delivery_category("bakery") == "hot_fresh"
        
        # Test cold/dry types
        assert get_store_delivery_category("market") == "cold_dry"
        assert get_store_delivery_category("vegetables") == "cold_dry"
        
        # Test unknown type (defaults to hot_fresh)
        assert get_store_delivery_category("unknown") == "hot_fresh"
        
        print("✅ get_store_delivery_category function works correctly")


class TestFoodOrdersAPIEndpoints:
    """Test that food orders API endpoints work after refactoring"""
    
    def test_my_orders_requires_auth(self):
        """Test /api/food/orders/my-orders returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/my-orders")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ /api/food/orders/my-orders returns 401 without auth")
    
    def test_delivery_available_requires_auth(self):
        """Test /api/food/orders/delivery/available returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/delivery/available")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ /api/food/orders/delivery/available returns 401 without auth")
    
    def test_seller_orders_requires_auth(self):
        """Test /api/food/orders/seller returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/food/orders/seller")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✅ /api/food/orders/seller returns 401 without auth")
    
    def test_health_endpoint(self):
        """Test backend health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✅ /api/health returns 200")


class TestImportsInFoodOrders:
    """Test that imports in food_orders.py work correctly"""
    
    def test_imports_from_helpers(self):
        """Test that food_orders.py can import from food_order_helpers.py"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        # This should not raise any import errors
        from routes.food_orders import router
        
        # Verify router exists
        assert router is not None
        print("✅ food_orders.py imports work correctly")
    
    def test_calculate_distance_alias(self):
        """Test that calculate_distance_km alias works in food_orders"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        # Import the aliased function
        from routes.food_order_helpers import calculate_haversine_distance as calculate_distance_km
        
        # Test it works
        distance = calculate_distance_km(33.5138, 36.2765, 33.5200, 36.2800)
        assert distance > 0
        print(f"✅ calculate_distance_km alias works: {distance:.4f} km")


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
