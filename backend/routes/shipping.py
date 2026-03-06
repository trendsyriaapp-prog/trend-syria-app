# /app/backend/routes/shipping.py
# مسارات الشحن

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional

from core.database import db, get_current_user

router = APIRouter(prefix="/shipping", tags=["Shipping"])

# تكلفة الشحن بين المحافظات
SHIPPING_COSTS = {
    "same_city": 0,
    "nearby": 15000,
    "far": 25000,
}

# الحد الأدنى للتوصيل المجاني
FREE_SHIPPING_THRESHOLD = 150000

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

@router.get("/calculate")
async def calculate_shipping(product_id: str, customer_city: str, order_total: float = 0):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    seller_city = product.get("city", "")
    
    # نفس المحافظة + تجاوز الحد الأدنى = مجاني
    if seller_city == customer_city and order_total >= FREE_SHIPPING_THRESHOLD:
        return {
            "shipping_cost": 0,
            "shipping_type": "free_same_city",
            "message": f"توصيل مجاني - نفس المحافظة وتجاوزت {FREE_SHIPPING_THRESHOLD:,} ل.س",
            "seller_city": seller_city,
            "customer_city": customer_city,
            "free_shipping_threshold": FREE_SHIPPING_THRESHOLD,
            "qualifies_for_free": True
        }
    
    # نفس المحافظة لكن لم يتجاوز الحد الأدنى
    if seller_city == customer_city:
        remaining = FREE_SHIPPING_THRESHOLD - order_total
        return {
            "shipping_cost": SHIPPING_COSTS["nearby"],
            "shipping_type": "same_city_below_threshold",
            "message": "نفس المحافظة - أضف المزيد للتوصيل المجاني",
            "seller_city": seller_city,
            "customer_city": customer_city,
            "free_shipping_threshold": FREE_SHIPPING_THRESHOLD,
            "remaining_for_free": remaining,
            "qualifies_for_free": False
        }
    
    # محافظات مختلفة
    nearby = NEARBY_CITIES.get(seller_city, [])
    if customer_city in nearby:
        return {
            "shipping_cost": SHIPPING_COSTS["nearby"],
            "shipping_type": "nearby",
            "message": f"تكلفة الشحن من {seller_city} إلى {customer_city}",
            "seller_city": seller_city,
            "customer_city": customer_city,
            "free_shipping_threshold": FREE_SHIPPING_THRESHOLD,
            "qualifies_for_free": False,
            "no_free_option": True
        }
    
    # محافظات بعيدة
    return {
        "shipping_cost": SHIPPING_COSTS["far"],
        "shipping_type": "far",
        "message": f"تكلفة الشحن من {seller_city} إلى {customer_city}",
        "seller_city": seller_city,
        "customer_city": customer_city,
        "free_shipping_threshold": FREE_SHIPPING_THRESHOLD,
        "qualifies_for_free": False,
        "no_free_option": True
    }

@router.get("/info")
async def get_shipping_info():
    return {
        "free_shipping_threshold": FREE_SHIPPING_THRESHOLD,
        "same_city_cost": SHIPPING_COSTS["same_city"],
        "nearby_cost": SHIPPING_COSTS["nearby"],
        "far_cost": SHIPPING_COSTS["far"],
        "message": f"توصيل مجاني للطلبات فوق {FREE_SHIPPING_THRESHOLD:,} ل.س"
    }

@router.get("/cart")
async def calculate_cart_shipping(customer_city: str, user: dict = Depends(get_current_user)):
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
                    max_shipping = max(max_shipping, SHIPPING_COSTS["nearby"])
                else:
                    max_shipping = max(max_shipping, SHIPPING_COSTS["far"])
            else:
                max_shipping = max(max_shipping, SHIPPING_COSTS["nearby"])
        
        return {
            "shipping_cost": max_shipping,
            "shipping_type": "multiple_sellers",
            "message": "الشحن المجاني متاح فقط عند الشراء من متجر واحد",
            "qualifies_for_free": False,
            "no_free_option": True,
            "cart_total": cart_total,
            "seller_count": len(seller_ids),
            "free_shipping_threshold": FREE_SHIPPING_THRESHOLD
        }
    
    single_seller_id = list(seller_ids)[0]
    seller_city = seller_cities[single_seller_id]
    
    if seller_city == customer_city:
        if cart_total >= FREE_SHIPPING_THRESHOLD:
            return {
                "shipping_cost": 0,
                "shipping_type": "free_same_city",
                "message": f"توصيل مجاني! نفس المحافظة ومجموع الطلب فوق {FREE_SHIPPING_THRESHOLD:,} ل.س",
                "qualifies_for_free": True,
                "cart_total": cart_total,
                "seller_city": seller_city,
                "customer_city": customer_city,
                "free_shipping_threshold": FREE_SHIPPING_THRESHOLD
            }
        else:
            remaining = FREE_SHIPPING_THRESHOLD - cart_total
            return {
                "shipping_cost": SHIPPING_COSTS["nearby"],
                "shipping_type": "same_city_below_threshold",
                "message": f"أضف {remaining:,.0f} ل.س للتوصيل المجاني",
                "qualifies_for_free": False,
                "cart_total": cart_total,
                "seller_city": seller_city,
                "customer_city": customer_city,
                "remaining_for_free": remaining,
                "free_shipping_threshold": FREE_SHIPPING_THRESHOLD
            }
    
    nearby = NEARBY_CITIES.get(seller_city, [])
    if customer_city in nearby:
        return {
            "shipping_cost": SHIPPING_COSTS["nearby"],
            "shipping_type": "nearby",
            "message": f"تكلفة الشحن من {seller_city} إلى {customer_city}",
            "qualifies_for_free": False,
            "no_free_option": True,
            "cart_total": cart_total,
            "seller_city": seller_city,
            "customer_city": customer_city,
            "free_shipping_threshold": FREE_SHIPPING_THRESHOLD
        }
    
    return {
        "shipping_cost": SHIPPING_COSTS["far"],
        "shipping_type": "far",
        "message": f"تكلفة الشحن من {seller_city} إلى {customer_city}",
        "qualifies_for_free": False,
        "no_free_option": True,
        "cart_total": cart_total,
        "seller_city": seller_city,
        "customer_city": customer_city,
        "free_shipping_threshold": FREE_SHIPPING_THRESHOLD
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
                "image": product.get("images", [""])[0] if product.get("images") else ""
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
            if subtotal >= FREE_SHIPPING_THRESHOLD:
                # شحن مجاني
                shipping_info["shipping_cost"] = 0
                shipping_info["shipping_status"] = "free"
                shipping_info["message"] = "شحن مجاني ✓"
            else:
                # لم يصل للحد الأدنى
                remaining = FREE_SHIPPING_THRESHOLD - subtotal
                shipping_info["shipping_cost"] = SHIPPING_COSTS["nearby"]
                shipping_info["shipping_status"] = "paid_can_be_free"
                shipping_info["remaining_for_free"] = remaining
                shipping_info["message"] = f"أضف {remaining:,.0f} ل.س للشحن المجاني"
        else:
            # محافظة مختلفة - لا يوجد شحن مجاني
            nearby = NEARBY_CITIES.get(seller_city, [])
            if customer_city in nearby:
                shipping_info["shipping_cost"] = SHIPPING_COSTS["nearby"]
            else:
                shipping_info["shipping_cost"] = SHIPPING_COSTS["far"]
            
            shipping_info["shipping_status"] = "paid_no_free_option"
            shipping_info["message"] = f"شحن من {seller_city}"
        
        total_shipping += shipping_info["shipping_cost"]
        sellers_result.append(shipping_info)
    
    return {
        "sellers": sellers_result,
        "total_shipping": total_shipping,
        "customer_city": customer_city,
        "free_shipping_threshold": FREE_SHIPPING_THRESHOLD
    }
