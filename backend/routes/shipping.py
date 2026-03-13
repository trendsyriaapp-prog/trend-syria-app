# /app/backend/routes/shipping.py
# مسارات الشحن

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
import math

from core.database import db, get_current_user

router = APIRouter(prefix="/shipping", tags=["Shipping"])

# القيم الافتراضية (تُستخدم إذا لم توجد إعدادات في قاعدة البيانات)
DEFAULT_SHIPPING_COSTS = {
    "same_city": 0,
    "nearby": 15000,
    "far": 25000,
}
DEFAULT_FREE_SHIPPING_THRESHOLD = 150000

# إعدادات التوصيل بالمسافة الافتراضية
DEFAULT_DISTANCE_DELIVERY = {
    "base_fee": 500,
    "price_per_km": 200,
    "min_fee": 1000,
    "enabled_for_food": True,
    "enabled_for_products": True
}

# المحافظات القريبة
NEARBY_CITIES = {
    "دمشق": ["ريف دمشق", "درعا", "السويداء", "القنيطرة"],
    "ريف دمشق": ["دمشق", "درعا", "السويداء", "القنيطرة"],
    "حلب": ["إدلب", "الرقة", "الحسكة"],
    "حمص": ["حماة", "طرطوس"],
    "حماة": ["حمص", "إدلب", "طرطوس"],
    "اللاذقية": ["طرطوس", "إدلب"],
    "طرطوس": ["اللاذقية", "حمص", "حماة"],
    "درعا": ["دمشق", "ريف دمشق", "السويداء"],
    "السويداء": ["دمشق", "ريف دمشق", "درعا"],
    "إدلب": ["حلب", "حماة", "اللاذقية"],
    "الرقة": ["حلب", "دير الزور", "الحسكة"],
    "دير الزور": ["الرقة", "الحسكة"],
    "الحسكة": ["الرقة", "دير الزور", "حلب"],
    "القنيطرة": ["دمشق", "ريف دمشق", "درعا"],
}

async def get_shipping_settings():
    """جلب إعدادات الشحن من قاعدة البيانات"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    if settings:
        delivery_fees = settings.get("delivery_fees", {})
        return {
            "same_city": delivery_fees.get("same_city", 0),
            "nearby": delivery_fees.get("nearby", DEFAULT_SHIPPING_COSTS["nearby"]),
            "far": delivery_fees.get("far", DEFAULT_SHIPPING_COSTS["far"]),
            "free_threshold": settings.get("free_shipping_threshold", DEFAULT_FREE_SHIPPING_THRESHOLD)
        }
    
    return {
        "same_city": 0,
        "nearby": DEFAULT_SHIPPING_COSTS["nearby"],
        "far": DEFAULT_SHIPPING_COSTS["far"],
        "free_threshold": DEFAULT_FREE_SHIPPING_THRESHOLD
    }

async def get_distance_delivery_settings():
    """جلب إعدادات التوصيل بالمسافة"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    if settings and "distance_delivery" in settings:
        return settings["distance_delivery"]
    
    return DEFAULT_DISTANCE_DELIVERY

def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    حساب المسافة بين نقطتين بالكيلومتر باستخدام صيغة Haversine
    """
    R = 6371  # نصف قطر الأرض بالكيلومتر
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat / 2) ** 2 + \
        math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    distance = R * c
    return round(distance, 2)

async def calculate_delivery_fee_by_distance(
    store_lat: float,
    store_lon: float,
    customer_lat: float,
    customer_lon: float,
    order_total: float,
    order_type: str = "food"  # "food" or "products"
) -> dict:
    """
    حساب رسوم التوصيل بناءً على المسافة
    
    Returns:
        dict: {
            "fee": رسوم التوصيل,
            "distance_km": المسافة بالكيلومتر,
            "is_free": هل التوصيل مجاني,
            "message": رسالة للعرض
        }
    """
    # جلب الإعدادات
    distance_settings = await get_distance_delivery_settings()
    shipping_settings = await get_shipping_settings()
    
    # التحقق من تفعيل النظام لهذا النوع
    if order_type == "food" and not distance_settings.get("enabled_for_food", True):
        return {"fee": 0, "distance_km": 0, "is_free": True, "message": "نظام المسافة غير مفعل للطعام"}
    
    if order_type == "products" and not distance_settings.get("enabled_for_products", True):
        return {"fee": 0, "distance_km": 0, "is_free": True, "message": "نظام المسافة غير مفعل للمنتجات"}
    
    # حساب المسافة
    distance_km = calculate_distance_km(store_lat, store_lon, customer_lat, customer_lon)
    
    # التحقق من حد الشحن المجاني
    free_threshold = shipping_settings.get("free_threshold", DEFAULT_FREE_SHIPPING_THRESHOLD)
    
    if order_total >= free_threshold:
        return {
            "fee": 0,
            "distance_km": distance_km,
            "is_free": True,
            "message": f"🎉 توصيل مجاني! طلبك تجاوز {free_threshold:,} ل.س"
        }
    
    # حساب الرسوم
    base_fee = distance_settings.get("base_fee", 500)
    price_per_km = distance_settings.get("price_per_km", 200)
    min_fee = distance_settings.get("min_fee", 1000)
    
    calculated_fee = base_fee + (distance_km * price_per_km)
    final_fee = max(calculated_fee, min_fee)
    final_fee = round(final_fee)
    
    # حساب كم يحتاج للشحن المجاني
    remaining_for_free = free_threshold - order_total
    
    return {
        "fee": final_fee,
        "distance_km": distance_km,
        "is_free": False,
        "base_fee": base_fee,
        "price_per_km": price_per_km,
        "message": f"رسوم التوصيل ({distance_km} كم)",
        "remaining_for_free": remaining_for_free,
        "free_threshold": free_threshold
    }

@router.get("/calculate-by-distance")
async def calculate_shipping_by_distance(
    store_lat: float,
    store_lon: float,
    customer_lat: float,
    customer_lon: float,
    order_total: float = 0,
    order_type: str = "food"
):
    """
    حساب رسوم التوصيل بناءً على المسافة بين المتجر والعميل
    """
    result = await calculate_delivery_fee_by_distance(
        store_lat, store_lon,
        customer_lat, customer_lon,
        order_total, order_type
    )
    return result

# استخدام متغيرات عالمية يتم تحديثها
SHIPPING_COSTS = DEFAULT_SHIPPING_COSTS.copy()
FREE_SHIPPING_THRESHOLD = DEFAULT_FREE_SHIPPING_THRESHOLD

@router.get("/calculate")
async def calculate_shipping(product_id: str, customer_city: str, order_total: float = 0):
    # جلب الإعدادات الديناميكية
    settings = await get_shipping_settings()
    shipping_costs = {"same_city": settings["same_city"], "nearby": settings["nearby"], "far": settings["far"]}
    free_threshold = settings["free_threshold"]
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    seller_city = product.get("city", "")
    
    # نفس المحافظة + تجاوز الحد الأدنى = مجاني
    if seller_city == customer_city and order_total >= free_threshold:
        return {
            "shipping_cost": 0,
            "shipping_type": "free_same_city",
            "message": f"توصيل مجاني - نفس المحافظة وتجاوزت {free_threshold:,} ل.س",
            "seller_city": seller_city,
            "customer_city": customer_city,
            "free_shipping_threshold": free_threshold,
            "qualifies_for_free": True
        }
    
    # نفس المحافظة لكن لم يتجاوز الحد الأدنى
    if seller_city == customer_city:
        remaining = free_threshold - order_total
        return {
            "shipping_cost": shipping_costs["nearby"],
            "shipping_type": "same_city_below_threshold",
            "message": "نفس المحافظة - أضف المزيد للتوصيل المجاني",
            "seller_city": seller_city,
            "customer_city": customer_city,
            "free_shipping_threshold": free_threshold,
            "remaining_for_free": remaining,
            "qualifies_for_free": False
        }
    
    # محافظات مختلفة
    nearby = NEARBY_CITIES.get(seller_city, [])
    if customer_city in nearby:
        return {
            "shipping_cost": shipping_costs["nearby"],
            "shipping_type": "nearby",
            "message": f"تكلفة الشحن من {seller_city} إلى {customer_city}",
            "seller_city": seller_city,
            "customer_city": customer_city,
            "free_shipping_threshold": free_threshold,
            "qualifies_for_free": False,
            "no_free_option": True
        }
    
    # محافظات بعيدة
    return {
        "shipping_cost": shipping_costs["far"],
        "shipping_type": "far",
        "message": f"تكلفة الشحن من {seller_city} إلى {customer_city}",
        "seller_city": seller_city,
        "customer_city": customer_city,
        "free_shipping_threshold": free_threshold,
        "qualifies_for_free": False,
        "no_free_option": True
    }

@router.get("/info")
async def get_shipping_info():
    """جلب معلومات الشحن العامة"""
    settings = await get_shipping_settings()
    return {
        "free_shipping_threshold": settings["free_threshold"],
        "same_city_cost": settings["same_city"],
        "nearby_cost": settings["nearby"],
        "far_cost": settings["far"],
        "message": f"توصيل مجاني للطلبات فوق {settings['free_threshold']:,} ل.س"
    }

@router.get("/cart")
async def calculate_cart_shipping(customer_city: str, user: dict = Depends(get_current_user)):
    # جلب الإعدادات الديناميكية
    settings = await get_shipping_settings()
    shipping_costs = {"same_city": settings["same_city"], "nearby": settings["nearby"], "far": settings["far"]}
    free_threshold = settings["free_threshold"]
    
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart or not cart.get("items"):
        return {
            "shipping_cost": 0,
            "message": "السلة فارغة",
            "qualifies_for_free": False,
            "cart_total": 0
        }
    
    seller_ids = set()
    seller_cities = {}
    cart_total = 0
    
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            seller_id = product.get("seller_id", "")
            seller_ids.add(seller_id)
            seller_cities[seller_id] = product.get("city", "")
            cart_total += product["price"] * item["quantity"]
    
    is_single_seller = len(seller_ids) == 1
    
    if not is_single_seller:
        max_shipping = 0
        for seller_id, seller_city in seller_cities.items():
            if seller_city != customer_city:
                nearby = NEARBY_CITIES.get(seller_city, [])
                if customer_city in nearby:
                    max_shipping = max(max_shipping, shipping_costs["nearby"])
                else:
                    max_shipping = max(max_shipping, shipping_costs["far"])
            else:
                max_shipping = max(max_shipping, shipping_costs["nearby"])
        
        return {
            "shipping_cost": max_shipping,
            "shipping_type": "multiple_sellers",
            "message": "الشحن المجاني متاح فقط عند الشراء من متجر واحد",
            "qualifies_for_free": False,
            "no_free_option": True,
            "cart_total": cart_total,
            "seller_count": len(seller_ids),
            "free_shipping_threshold": free_threshold
        }
    
    single_seller_id = list(seller_ids)[0]
    seller_city = seller_cities[single_seller_id]
    
    if seller_city == customer_city:
        if cart_total >= free_threshold:
            return {
                "shipping_cost": 0,
                "shipping_type": "free_same_city",
                "message": f"توصيل مجاني! نفس المحافظة ومجموع الطلب فوق {free_threshold:,} ل.س",
                "qualifies_for_free": True,
                "cart_total": cart_total,
                "seller_city": seller_city,
                "customer_city": customer_city,
                "free_shipping_threshold": free_threshold
            }
        else:
            remaining = free_threshold - cart_total
            return {
                "shipping_cost": shipping_costs["nearby"],
                "shipping_type": "same_city_below_threshold",
                "message": f"أضف {remaining:,.0f} ل.س للتوصيل المجاني",
                "qualifies_for_free": False,
                "cart_total": cart_total,
                "seller_city": seller_city,
                "customer_city": customer_city,
                "remaining_for_free": remaining,
                "free_shipping_threshold": free_threshold
            }
    
    nearby = NEARBY_CITIES.get(seller_city, [])
    if customer_city in nearby:
        return {
            "shipping_cost": shipping_costs["nearby"],
            "shipping_type": "nearby",
            "message": f"تكلفة الشحن من {seller_city} إلى {customer_city}",
            "qualifies_for_free": False,
            "no_free_option": True,
            "cart_total": cart_total,
            "seller_city": seller_city,
            "customer_city": customer_city,
            "free_shipping_threshold": free_threshold
        }
    
    return {
        "shipping_cost": shipping_costs["far"],
        "shipping_type": "far",
        "message": f"تكلفة الشحن من {seller_city} إلى {customer_city}",
        "qualifies_for_free": False,
        "no_free_option": True,
        "cart_total": cart_total,
        "seller_city": seller_city,
        "customer_city": customer_city,
        "free_shipping_threshold": free_threshold
    }

@router.get("/cities")
async def get_cities():
    return [
        "دمشق", "ريف دمشق", "حلب", "حمص", "حماة", 
        "اللاذقية", "طرطوس", "درعا", "السويداء", 
        "إدلب", "الرقة", "دير الزور", "الحسكة", "القنيطرة"
    ]

@router.get("/cart/detailed")
async def calculate_cart_shipping_detailed(customer_city: str, user: dict = Depends(get_current_user)):
    """
    حساب تفاصيل الشحن لكل بائع على حدة
    يُظهر للعميل تكلفة الشحن لكل متجر بشكل منفصل
    """
    # جلب الإعدادات الديناميكية
    settings = await get_shipping_settings()
    shipping_costs = {"same_city": settings["same_city"], "nearby": settings["nearby"], "far": settings["far"]}
    free_threshold = settings["free_threshold"]
    
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart or not cart.get("items"):
        return {
            "sellers": [],
            "total_shipping": 0,
            "message": "السلة فارغة"
        }
    
    # تجميع المنتجات حسب البائع
    sellers_data = {}
    
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            seller_id = product.get("seller_id", "unknown")
            
            if seller_id not in sellers_data:
                # جلب معلومات البائع
                seller = await db.users.find_one({"id": seller_id}, {"_id": 0, "password": 0})
                seller_city = product.get("city", "")
                
                sellers_data[seller_id] = {
                    "seller_id": seller_id,
                    "seller_name": seller.get("business_name") or seller.get("full_name") or "متجر",
                    "seller_city": seller_city,
                    "items": [],
                    "subtotal": 0
                }
            
            sellers_data[seller_id]["items"].append({
                "product_id": product["id"],
                "name": product["name"],
                "price": product["price"],
                "quantity": item["quantity"],
                "total": product["price"] * item["quantity"],
                "image": product.get("images", [""])[0] if product.get("images") else "",
                "selected_size": item.get("selected_size"),
                "selected_weight": item.get("selected_weight")
            })
            sellers_data[seller_id]["subtotal"] += product["price"] * item["quantity"]
    
    # حساب الشحن لكل بائع
    sellers_result = []
    total_shipping = 0
    
    for seller_id, seller_data in sellers_data.items():
        seller_city = seller_data["seller_city"]
        subtotal = seller_data["subtotal"]
        
        shipping_info = {
            "seller_id": seller_id,
            "seller_name": seller_data["seller_name"],
            "seller_city": seller_city,
            "customer_city": customer_city,
            "items": seller_data["items"],
            "subtotal": subtotal,
            "is_same_city": seller_city == customer_city
        }
        
        # نفس المحافظة
        if seller_city == customer_city:
            if subtotal >= free_threshold:
                # شحن مجاني
                shipping_info["shipping_cost"] = 0
                shipping_info["shipping_status"] = "free"
                shipping_info["message"] = "شحن مجاني ✓"
            else:
                # لم يصل للحد الأدنى
                remaining = free_threshold - subtotal
                shipping_info["shipping_cost"] = shipping_costs["nearby"]
                shipping_info["shipping_status"] = "paid_can_be_free"
                shipping_info["remaining_for_free"] = remaining
                shipping_info["message"] = f"أضف {remaining:,.0f} ل.س للشحن المجاني"
        else:
            # محافظة مختلفة - لا يوجد شحن مجاني
            nearby = NEARBY_CITIES.get(seller_city, [])
            if customer_city in nearby:
                shipping_info["shipping_cost"] = shipping_costs["nearby"]
            else:
                shipping_info["shipping_cost"] = shipping_costs["far"]
            
            shipping_info["shipping_status"] = "paid_no_free_option"
            shipping_info["message"] = f"شحن من {seller_city}"
        
        total_shipping += shipping_info["shipping_cost"]
        sellers_result.append(shipping_info)
    
    return {
        "sellers": sellers_result,
        "total_shipping": total_shipping,
        "customer_city": customer_city,
        "free_shipping_threshold": free_threshold
    }
