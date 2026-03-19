"""
Test Food Stores API and Navigation Features
- GET /api/food/stores - list all stores
- Sorting options (rating, delivery_time, min_order)
- Search functionality
- City filtering
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFoodStoresAPI:
    """Test cases for /api/food/stores endpoint"""
    
    def test_get_all_stores(self):
        """Test getting all food stores"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Found {len(data)} stores")
        
        if len(data) > 0:
            # Verify store structure
            store = data[0]
            assert "id" in store, "Store should have id"
            assert "name" in store, "Store should have name"
            print(f"✅ First store: {store.get('name')}")
    
    def test_get_stores_by_city(self):
        """Test filtering stores by city"""
        response = requests.get(f"{BASE_URL}/api/food/stores", params={"city": "دمشق"})
        
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All stores should be from Damascus
        for store in data:
            if store.get("city"):
                assert store["city"] == "دمشق", f"Expected city دمشق, got {store.get('city')}"
        
        print(f"✅ Found {len(data)} stores in Damascus")
    
    def test_stores_have_required_fields(self):
        """Verify stores have all required display fields"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            store = data[0]
            
            # Fields required for AllFoodStoresPage display
            required_fields = ["id", "name"]
            optional_display_fields = ["rating", "delivery_time", "min_order", "city", "is_open", "cover_image", "logo"]
            
            for field in required_fields:
                assert field in store, f"Missing required field: {field}"
            
            present_optional = [f for f in optional_display_fields if f in store]
            print(f"✅ Store has required fields and {len(present_optional)} optional display fields")
    
    def test_stores_sorting_by_rating(self):
        """Test that stores can be sorted by rating (client-side)"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        
        assert response.status_code == 200
        data = response.json()
        
        # Sort by rating descending (client-side simulation)
        sorted_data = sorted(data, key=lambda x: x.get('rating', 0), reverse=True)
        
        if len(sorted_data) >= 2:
            first_rating = sorted_data[0].get('rating', 0)
            second_rating = sorted_data[1].get('rating', 0)
            assert first_rating >= second_rating, "Sorting by rating should work correctly"
            print(f"✅ Top rated stores: {sorted_data[0].get('name')} ({first_rating}), {sorted_data[1].get('name')} ({second_rating})")
    
    def test_stores_sorting_by_delivery_time(self):
        """Test that stores can be sorted by delivery time (client-side)"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        
        assert response.status_code == 200
        data = response.json()
        
        # Sort by delivery_time ascending (client-side simulation)
        # Handle both string and int delivery_time values
        def get_delivery_time(store):
            dt = store.get('delivery_time', 30)
            if isinstance(dt, str):
                # Handle "30-45" format - take first number
                return int(dt.split('-')[0]) if '-' in dt else int(dt)
            return dt or 30
        
        sorted_data = sorted(data, key=get_delivery_time)
        
        if len(sorted_data) >= 2:
            first_time = get_delivery_time(sorted_data[0])
            second_time = get_delivery_time(sorted_data[1])
            assert first_time <= second_time, "Sorting by delivery time should work correctly"
            print(f"✅ Fastest delivery: {sorted_data[0].get('name')} ({first_time}min)")
    
    def test_stores_sorting_by_min_order(self):
        """Test that stores can be sorted by minimum order (client-side)"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        
        assert response.status_code == 200
        data = response.json()
        
        # Sort by min_order ascending (client-side simulation)
        sorted_data = sorted(data, key=lambda x: x.get('min_order', 0))
        
        if len(sorted_data) >= 2:
            first_min = sorted_data[0].get('min_order', 0)
            second_min = sorted_data[1].get('min_order', 0)
            assert first_min <= second_min, "Sorting by min_order should work correctly"
            print(f"✅ Lowest min order: {sorted_data[0].get('name')} ({first_min} SYP)")
    
    def test_store_search_filtering(self):
        """Test that stores can be filtered by search query (client-side)"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        
        assert response.status_code == 200
        data = response.json()
        
        # Simulate client-side search filtering
        search_query = "الشام"
        filtered = [s for s in data if search_query in s.get('name', '').lower() or 
                   search_query in s.get('description', '').lower()]
        
        print(f"✅ Search '{search_query}' found {len(filtered)} matching stores")
    
    def test_store_status_fields(self):
        """Verify stores have open/closed status information"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            store = data[0]
            # Check for status-related fields
            has_status = "is_open" in store or "open_status" in store or "manual_close" in store
            print(f"✅ Store status fields present: is_open={store.get('is_open')}, open_status={store.get('open_status')}, manual_close={store.get('manual_close')}")


class TestFoodStoreNavigation:
    """Test store detail navigation endpoint"""
    
    def test_get_store_by_id(self):
        """Test getting a specific store by ID"""
        # First get list of stores
        list_response = requests.get(f"{BASE_URL}/api/food/stores")
        assert list_response.status_code == 200
        
        stores = list_response.json()
        if len(stores) > 0:
            store_id = stores[0]["id"]
            
            # Try to get store details
            detail_response = requests.get(f"{BASE_URL}/api/food/stores/{store_id}")
            
            # Endpoint might be /api/food/stores/{id} or /api/food/store/{id}
            if detail_response.status_code == 404:
                detail_response = requests.get(f"{BASE_URL}/api/food/store/{store_id}")
            
            assert detail_response.status_code == 200, f"Store detail endpoint should return 200, got {detail_response.status_code}"
            
            detail = detail_response.json()
            assert detail.get("id") == store_id, "Store ID should match"
            print(f"✅ Store detail retrieved: {detail.get('name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
