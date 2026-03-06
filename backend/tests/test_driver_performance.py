# /app/backend/tests/test_driver_performance.py
# Tests for Driver Performance Dashboard API endpoint

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DELIVERY_USER = {"phone": "0900000000", "password": "delivery123"}

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def delivery_auth_token(api_client):
    """Get authentication token for delivery user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=DELIVERY_USER)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Delivery user authentication failed")

@pytest.fixture(scope="module")
def authenticated_delivery_client(api_client, delivery_auth_token):
    """Session with delivery user auth header"""
    api_client.headers.update({"Authorization": f"Bearer {delivery_auth_token}"})
    return api_client


class TestDriverPerformanceAPI:
    """Tests for GET /api/delivery/performance endpoint"""
    
    def test_delivery_user_login(self, api_client):
        """Test delivery user can login with correct credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=DELIVERY_USER)
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["user_type"] == "delivery"
        assert data["user"]["phone"] == DELIVERY_USER["phone"]
        print(f"✅ Delivery user login successful: {data['user']['name']}")
    
    def test_performance_endpoint_returns_200(self, authenticated_delivery_client):
        """Test that performance endpoint returns 200 for authenticated delivery user"""
        response = authenticated_delivery_client.get(f"{BASE_URL}/api/delivery/performance")
        assert response.status_code == 200
        print("✅ Performance endpoint returns 200 OK")
    
    def test_performance_has_overview_section(self, authenticated_delivery_client):
        """Test that response contains overview section with required fields"""
        response = authenticated_delivery_client.get(f"{BASE_URL}/api/delivery/performance")
        data = response.json()
        
        assert "overview" in data
        overview = data["overview"]
        assert "total_delivered" in overview
        assert "pending_delivery" in overview
        assert "total_earnings" in overview
        assert "avg_rating" in overview
        assert "total_ratings" in overview
        
        assert isinstance(overview["total_delivered"], int)
        assert isinstance(overview["total_earnings"], int)
        print(f"✅ Overview section valid: {overview['total_delivered']} delivered, {overview['total_earnings']} SYP earnings")
    
    def test_performance_has_period_stats(self, authenticated_delivery_client):
        """Test that response contains period_stats with today/week/month data"""
        response = authenticated_delivery_client.get(f"{BASE_URL}/api/delivery/performance")
        data = response.json()
        
        assert "period_stats" in data
        period_stats = data["period_stats"]
        
        # Check today stats
        assert "today" in period_stats
        assert "orders" in period_stats["today"]
        assert "earnings" in period_stats["today"]
        
        # Check week stats
        assert "week" in period_stats
        assert "orders" in period_stats["week"]
        assert "earnings" in period_stats["week"]
        
        # Check month stats
        assert "month" in period_stats
        assert "orders" in period_stats["month"]
        assert "earnings" in period_stats["month"]
        
        print(f"✅ Period stats valid - Today: {period_stats['today']['orders']}, Week: {period_stats['week']['orders']}, Month: {period_stats['month']['orders']}")
    
    def test_performance_has_charts_data(self, authenticated_delivery_client):
        """Test that response contains charts data for monthly, daily, and ratings"""
        response = authenticated_delivery_client.get(f"{BASE_URL}/api/delivery/performance")
        data = response.json()
        
        assert "charts" in data
        charts = data["charts"]
        
        # Check monthly chart data
        assert "monthly" in charts
        assert isinstance(charts["monthly"], list)
        assert len(charts["monthly"]) == 6  # Last 6 months
        for month_data in charts["monthly"]:
            assert "month" in month_data  # Arabic month name
            assert "orders" in month_data
            assert "earnings" in month_data
        
        # Check daily chart data
        assert "daily" in charts
        assert isinstance(charts["daily"], list)
        assert len(charts["daily"]) == 7  # Last 7 days
        for day_data in charts["daily"]:
            assert "day" in day_data  # Arabic day name
            assert "date" in day_data
            assert "orders" in day_data
            assert "earnings" in day_data
        
        # Check ratings chart data
        assert "ratings" in charts
        assert isinstance(charts["ratings"], list)
        assert len(charts["ratings"]) == 5  # 5 rating levels (1-5 stars)
        for rating_data in charts["ratings"]:
            assert "stars" in rating_data
            assert "count" in rating_data
        
        print(f"✅ Charts data valid - Monthly: {len(charts['monthly'])} months, Daily: {len(charts['daily'])} days, Ratings: {len(charts['ratings'])} levels")
    
    def test_performance_has_performance_level(self, authenticated_delivery_client):
        """Test that response contains performance_level with level, color, and icon"""
        response = authenticated_delivery_client.get(f"{BASE_URL}/api/delivery/performance")
        data = response.json()
        
        assert "performance_level" in data
        level = data["performance_level"]
        
        assert "level" in level
        assert "color" in level
        assert "icon" in level
        
        # Valid levels: مبتدئ, برونزي, فضي, ذهبي, ماسي
        valid_levels = ["مبتدئ", "برونزي", "فضي", "ذهبي", "ماسي"]
        assert level["level"] in valid_levels
        
        # Color should be a valid hex color
        assert level["color"].startswith("#")
        
        print(f"✅ Performance level valid: {level['level']} ({level['icon']})")
    
    def test_performance_has_tips(self, authenticated_delivery_client):
        """Test that response contains tips array with title and description"""
        response = authenticated_delivery_client.get(f"{BASE_URL}/api/delivery/performance")
        data = response.json()
        
        assert "tips" in data
        tips = data["tips"]
        
        assert isinstance(tips, list)
        assert len(tips) > 0
        
        for tip in tips:
            assert "type" in tip
            assert "title" in tip
            assert "description" in tip
        
        print(f"✅ Tips valid: {len(tips)} tips provided")
    
    def test_performance_level_logic_for_beginner(self, authenticated_delivery_client):
        """Test that driver with <10 monthly orders gets 'مبتدئ' (Beginner) level"""
        response = authenticated_delivery_client.get(f"{BASE_URL}/api/delivery/performance")
        data = response.json()
        
        month_orders = data["period_stats"]["month"]["orders"]
        level = data["performance_level"]["level"]
        
        # According to backend logic:
        # < 10 orders = مبتدئ
        # >= 10 orders = برونزي
        # >= 30 orders = فضي
        # >= 60 orders = ذهبي
        # >= 100 orders = ماسي
        
        if month_orders < 10:
            assert level == "مبتدئ", f"Expected 'مبتدئ' for {month_orders} orders, got '{level}'"
            print(f"✅ Correct level 'مبتدئ' for {month_orders} monthly orders")
        elif month_orders >= 10 and month_orders < 30:
            assert level == "برونزي"
            print(f"✅ Correct level 'برونزي' for {month_orders} monthly orders")


class TestPerformanceEndpointSecurity:
    """Security tests for performance endpoint"""
    
    def test_performance_requires_authentication(self, api_client):
        """Test that performance endpoint requires authentication"""
        # Create a fresh session without auth
        fresh_session = requests.Session()
        fresh_session.headers.update({"Content-Type": "application/json"})
        
        response = fresh_session.get(f"{BASE_URL}/api/delivery/performance")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
        print("✅ Performance endpoint correctly requires authentication")
    
    def test_performance_requires_delivery_user(self, api_client):
        """Test that only delivery users can access performance endpoint"""
        # Login as non-delivery user (seller)
        seller_creds = {"phone": "0922222222", "password": "seller123"}
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=seller_creds)
        
        if response.status_code == 200:
            seller_token = response.json().get("token")
            
            # Try to access performance with seller token
            seller_session = requests.Session()
            seller_session.headers.update({
                "Content-Type": "application/json",
                "Authorization": f"Bearer {seller_token}"
            })
            
            perf_response = seller_session.get(f"{BASE_URL}/api/delivery/performance")
            assert perf_response.status_code == 403, f"Expected 403 for non-delivery user, got {perf_response.status_code}"
            print("✅ Performance endpoint correctly rejects non-delivery users")
        else:
            pytest.skip("Seller user not available for testing")
