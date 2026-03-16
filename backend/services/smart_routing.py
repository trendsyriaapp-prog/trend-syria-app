# /app/backend/services/smart_routing.py
"""
خدمة التوجيه الذكي للسائقين
تسمح للسائق بقبول طلبات متعددة إذا كانت على نفس المسار
"""
import math
import httpx
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timezone

# ========== حساب المسافة (Haversine) ==========

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """حساب المسافة بين نقطتين بالكيلومتر"""
    R = 6371  # نصف قطر الأرض بالكيلومتر
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c


# ========== جلب المسار من OSRM ==========

async def get_route_from_osrm(waypoints: List[Tuple[float, float]]) -> Optional[Dict]:
    """
    جلب المسار الأمثل من OSRM
    waypoints: قائمة من (lat, lon) tuples
    """
    if len(waypoints) < 2:
        return None
    
    try:
        # تحويل الإحداثيات لصيغة OSRM (lon,lat)
        coords_string = ";".join([f"{lon},{lat}" for lat, lon in waypoints])
        url = f"https://router.project-osrm.org/route/v1/driving/{coords_string}?overview=full&geometries=geojson"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            data = response.json()
        
        if data.get("routes") and data["routes"]:
            route = data["routes"][0]
            return {
                "distance_km": route["distance"] / 1000,
                "duration_min": route["duration"] / 60,
                "geometry": route["geometry"]
            }
    except Exception as e:
        print(f"OSRM Error: {e}")
    
    return None


# ========== تحقق إذا كان الطلب على المسار ==========

async def is_order_on_route(
    driver_location: Tuple[float, float],
    current_orders: List[Dict],
    new_order: Dict,
    max_deviation_km: float = 2.0
) -> Dict:
    """
    التحقق مما إذا كان الطلب الجديد على مسار السائق الحالي
    
    Args:
        driver_location: موقع السائق (lat, lon)
        current_orders: الطلبات الحالية للسائق
        new_order: الطلب الجديد
        max_deviation_km: الحد الأقصى للانحراف عن المسار (كم)
    
    Returns:
        Dict مع:
        - is_on_route: هل الطلب على المسار
        - added_distance_km: المسافة الإضافية
        - added_time_min: الوقت الإضافي
        - optimal_position: أفضل موقع لإضافة الطلب في الترتيب
    """
    result = {
        "is_on_route": False,
        "added_distance_km": 0,
        "added_time_min": 0,
        "optimal_position": 0,
        "reason": ""
    }
    
    if not current_orders:
        # لا توجد طلبات حالية - أي طلب مقبول
        result["is_on_route"] = True
        result["optimal_position"] = 0
        result["reason"] = "أول طلب"
        return result
    
    # جمع نقاط التوصيل الحالية
    current_waypoints = [driver_location]
    
    for order in current_orders:
        # إضافة موقع المتجر (إذا لم يتم الاستلام بعد)
        if not order.get("pickup_code_verified"):
            store_lat = order.get("store_lat") or order.get("store_latitude")
            store_lon = order.get("store_lng") or order.get("store_longitude")
            if store_lat and store_lon:
                current_waypoints.append((store_lat, store_lon))
        
        # إضافة موقع العميل
        customer_lat = order.get("latitude") or order.get("delivery_latitude")
        customer_lon = order.get("longitude") or order.get("delivery_longitude")
        if customer_lat and customer_lon:
            current_waypoints.append((customer_lat, customer_lon))
    
    if len(current_waypoints) < 2:
        result["is_on_route"] = True
        result["reason"] = "لا توجد نقاط كافية للمقارنة"
        return result
    
    # حساب المسار الحالي
    current_route = await get_route_from_osrm(current_waypoints)
    if not current_route:
        # إذا فشل OSRM، نستخدم المسافة المباشرة
        result["is_on_route"] = True
        result["reason"] = "فشل حساب المسار، القبول التلقائي"
        return result
    
    current_distance = current_route["distance_km"]
    
    # إضافة الطلب الجديد
    new_store_lat = new_order.get("store_lat") or new_order.get("store_latitude")
    new_store_lon = new_order.get("store_lng") or new_order.get("store_longitude")
    new_customer_lat = new_order.get("latitude") or new_order.get("delivery_latitude")
    new_customer_lon = new_order.get("longitude") or new_order.get("delivery_longitude")
    
    # إيجاد أفضل موقع لإضافة الطلب
    min_added_distance = float('inf')
    best_position = 0
    
    for i in range(len(current_waypoints)):
        # إنشاء مسار جديد مع إضافة الطلب في الموقع i
        new_waypoints = current_waypoints[:i+1].copy()
        
        # إضافة المتجر الجديد
        if new_store_lat and new_store_lon:
            new_waypoints.append((new_store_lat, new_store_lon))
        
        # إضافة العميل الجديد
        if new_customer_lat and new_customer_lon:
            new_waypoints.append((new_customer_lat, new_customer_lon))
        
        # إضافة باقي النقاط
        new_waypoints.extend(current_waypoints[i+1:])
        
        # حساب المسار الجديد
        new_route = await get_route_from_osrm(new_waypoints)
        if new_route:
            added_distance = new_route["distance_km"] - current_distance
            if added_distance < min_added_distance:
                min_added_distance = added_distance
                best_position = i
                result["added_time_min"] = new_route["duration_min"] - current_route["duration_min"]
    
    result["added_distance_km"] = min_added_distance
    result["optimal_position"] = best_position
    
    # التحقق من الانحراف
    if min_added_distance <= max_deviation_km:
        result["is_on_route"] = True
        result["reason"] = f"الطلب على المسار (انحراف: {min_added_distance:.1f} كم)"
    else:
        result["is_on_route"] = False
        result["reason"] = f"الطلب بعيد عن المسار (انحراف: {min_added_distance:.1f} كم، الحد: {max_deviation_km} كم)"
    
    return result


# ========== تحسين ترتيب الطلبات ==========

async def optimize_delivery_order(
    driver_location: Tuple[float, float],
    orders: List[Dict],
    mode: str = "mixed"
) -> List[Dict]:
    """
    تحسين ترتيب توصيل الطلبات
    
    Args:
        driver_location: موقع السائق (lat, lon)
        orders: قائمة الطلبات
        mode: 'food' (أولوية الطعام) | 'products' | 'mixed'
    
    Returns:
        قائمة الطلبات مرتبة بشكل أمثل مع تفاصيل كل نقطة
    """
    if not orders:
        return []
    
    # بناء قائمة النقاط
    points = []
    order_map = {}
    
    for order in orders:
        order_id = order.get("id")
        order_map[order_id] = order
        
        # نقطة الاستلام (المتجر)
        if not order.get("pickup_code_verified"):
            store_lat = order.get("store_lat") or order.get("store_latitude")
            store_lon = order.get("store_lng") or order.get("store_longitude")
            if store_lat and store_lon:
                points.append({
                    "type": "pickup",
                    "order_id": order_id,
                    "lat": store_lat,
                    "lon": store_lon,
                    "name": order.get("store_name", "متجر"),
                    "is_food": order.get("is_food", True),
                    "order": order
                })
        
        # نقطة التوصيل (العميل)
        customer_lat = order.get("latitude") or order.get("delivery_latitude")
        customer_lon = order.get("longitude") or order.get("delivery_longitude")
        if customer_lat and customer_lon:
            points.append({
                "type": "delivery",
                "order_id": order_id,
                "lat": customer_lat,
                "lon": customer_lon,
                "name": order.get("customer_name", "عميل"),
                "is_food": order.get("is_food", True),
                "order": order,
                "requires_pickup_first": not order.get("pickup_code_verified")
            })
    
    if not points:
        return orders
    
    # ترتيب النقاط باستخدام خوارزمية "الأقرب فالأقرب" مع مراعاة القيود
    optimized = []
    current_lat, current_lon = driver_location
    picked_up_orders = set()
    remaining = points.copy()
    
    while remaining:
        # إيجاد أقرب نقطة صالحة
        best_point = None
        best_distance = float('inf')
        
        for point in remaining:
            # التحقق من القيود
            if point["type"] == "delivery" and point.get("requires_pickup_first"):
                if point["order_id"] not in picked_up_orders:
                    continue  # لا يمكن التوصيل قبل الاستلام
            
            distance = calculate_distance(current_lat, current_lon, point["lat"], point["lon"])
            
            # أولوية للطعام في وضع mixed
            if mode == "mixed" and point.get("is_food"):
                distance *= 0.8  # تخفيض المسافة الفعلية للطعام
            
            if distance < best_distance:
                best_distance = distance
                best_point = point
        
        if best_point:
            remaining.remove(best_point)
            optimized.append(best_point)
            current_lat, current_lon = best_point["lat"], best_point["lon"]
            
            if best_point["type"] == "pickup":
                picked_up_orders.add(best_point["order_id"])
        else:
            # لا توجد نقطة صالحة - إضافة الباقي كما هي
            optimized.extend(remaining)
            break
    
    return optimized


# ========== تقييم جدوى الطلب الجديد ==========

async def evaluate_new_order(
    driver_id: str,
    driver_location: Tuple[float, float],
    current_orders: List[Dict],
    new_order: Dict,
    settings: Dict
) -> Dict:
    """
    تقييم شامل لجدوى قبول طلب جديد
    
    Returns:
        Dict مع:
        - can_accept: هل يمكن قبول الطلب
        - score: درجة الطلب (0-100)
        - reasons: أسباب القرار
        - added_earnings: الأرباح الإضافية المتوقعة
    """
    max_deviation = settings.get("smart_routing_max_deviation_km", 2.0)
    
    # تحليل المسار
    route_analysis = await is_order_on_route(
        driver_location, 
        current_orders, 
        new_order,
        max_deviation
    )
    
    # حساب الأرباح
    delivery_fee = new_order.get("delivery_fee", 5000)
    
    # حساب الدرجة
    score = 100
    reasons = []
    
    # خصم للانحراف عن المسار
    if route_analysis["added_distance_km"] > 0:
        deviation_penalty = min(route_analysis["added_distance_km"] * 20, 60)
        score -= deviation_penalty
        reasons.append(f"انحراف {route_analysis['added_distance_km']:.1f} كم (-{deviation_penalty:.0f} نقطة)")
    
    # مكافأة للطعام الساخن
    if new_order.get("is_food") and new_order.get("store_type") in ["restaurants", "fast_food", "cafes"]:
        score += 10
        reasons.append("طعام ساخن (+10 نقاط)")
    
    # خصم إذا كان بعيداً
    if not route_analysis["is_on_route"]:
        score -= 30
        reasons.append("بعيد عن المسار (-30 نقطة)")
    
    return {
        "can_accept": route_analysis["is_on_route"] and score >= 40,
        "score": max(0, min(100, score)),
        "route_analysis": route_analysis,
        "added_earnings": delivery_fee,
        "added_distance_km": route_analysis["added_distance_km"],
        "added_time_min": route_analysis["added_time_min"],
        "optimal_position": route_analysis["optimal_position"],
        "reasons": reasons
    }
