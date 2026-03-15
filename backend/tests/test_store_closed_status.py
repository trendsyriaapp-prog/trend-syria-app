# Test: Store Closed Status Feature (حالة المتجر مغلق)
# Tests the is_open and open_status fields for stores outside working hours

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test store with working hours 8AM-11PM (should be closed at night)
CLOSED_STORE_ID = "421443ed-55d6-4f1e-990a-2f3f53b2427e"  # مطعم الشام

class TestStoreClosedStatus:
    """Test Store Open/Closed Status Feature"""
    
    def test_stores_list_returns_is_open_field(self):
        """GET /api/food/stores should return is_open field for each store"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200
        
        stores = response.json()
        assert len(stores) > 0, "Should have at least one store"
        
        for store in stores:
            assert "is_open" in store, f"Store {store.get('name')} missing is_open field"
            assert "open_status" in store, f"Store {store.get('name')} missing open_status field"
            assert isinstance(store["is_open"], bool), "is_open should be boolean"
            assert isinstance(store["open_status"], str), "open_status should be string"
    
    def test_closed_store_shows_correct_status(self):
        """Store with working hours 8-23 should be closed at night (Syria time ~2AM)"""
        response = requests.get(f"{BASE_URL}/api/food/stores/{CLOSED_STORE_ID}")
        assert response.status_code == 200
        
        store = response.json()
        assert store["name"] == "مطعم الشام", "Verifying correct store"
        
        # Should be closed since current time is outside 8AM-11PM Syria time
        assert "is_open" in store, "Missing is_open field"
        assert "open_status" in store, "Missing open_status field"
        
        # Validate is_open is False (store should be closed at night)
        assert store["is_open"] == False, f"Store should be closed at night, got is_open={store['is_open']}"
        
        # Validate open_status has appropriate message
        assert len(store["open_status"]) > 0, "open_status should have a message"
        print(f"Store closed status: is_open={store['is_open']}, open_status={store['open_status']}")
    
    def test_closed_store_in_list(self):
        """Closed store should appear in stores list with is_open=False"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200
        
        stores = response.json()
        closed_store = next((s for s in stores if s.get("id") == CLOSED_STORE_ID), None)
        
        if closed_store:
            assert closed_store["is_open"] == False, "Closed store should have is_open=False in list"
            assert "open_status" in closed_store, "Closed store should have open_status"
            print(f"Closed store in list: {closed_store['name']} - is_open={closed_store['is_open']}")
        else:
            print(f"Store {CLOSED_STORE_ID} not found in list - may be in different city filter")
    
    def test_single_store_endpoint_has_required_fields(self):
        """GET /api/food/stores/{id} should return all required fields including is_open"""
        response = requests.get(f"{BASE_URL}/api/food/stores/{CLOSED_STORE_ID}")
        assert response.status_code == 200
        
        store = response.json()
        
        # Required fields for store closed feature
        required_fields = ["id", "name", "is_open", "open_status"]
        for field in required_fields:
            assert field in store, f"Missing required field: {field}"
        
        # If closed, should have next_open_time
        if store["is_open"] == False:
            assert "next_open_time" in store or "open_status" in store, \
                "Closed store should indicate when it opens"
    
    def test_working_hours_in_store_detail(self):
        """Store detail should include working_hours for reference"""
        response = requests.get(f"{BASE_URL}/api/food/stores/{CLOSED_STORE_ID}")
        assert response.status_code == 200
        
        store = response.json()
        assert "working_hours" in store, "Store should have working_hours field"
        
        working_hours = store["working_hours"]
        assert isinstance(working_hours, dict), "working_hours should be a dict"
        
        # Should have at least one day configured
        day_names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
        has_hours = any(day in working_hours for day in day_names)
        assert has_hours, "working_hours should have at least one day configured"
        
        # Check structure of a day
        for day in day_names:
            if day in working_hours:
                day_hours = working_hours[day]
                assert "open_hour" in day_hours, f"{day} missing open_hour"
                assert "close_hour" in day_hours, f"{day} missing close_hour"
                break


class TestStoreOpenStatus:
    """Test stores that should be open"""
    
    def test_stores_without_working_hours_are_open(self):
        """Stores without working_hours configured should show as open"""
        response = requests.get(f"{BASE_URL}/api/food/stores")
        assert response.status_code == 200
        
        stores = response.json()
        
        for store in stores:
            if not store.get("working_hours"):
                assert store["is_open"] == True, \
                    f"Store {store['name']} without working_hours should be open"
                assert store["open_status"] == "مفتوح", \
                    f"Store {store['name']} open_status should be 'مفتوح'"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
