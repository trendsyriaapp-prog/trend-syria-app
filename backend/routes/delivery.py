# /app/backend/routes/delivery.py
# مسارات التوصيل

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid

from core.database import db, get_current_user, create_notification_for_user

router = APIRouter(prefix="/delivery", tags=["Delivery"])

# ===== تتبع موقع السائق =====

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    order_id: Optional[str] = None  # معرف الطلب الحالي

@router.put("/location")
async def update_driver_location(data: LocationUpdate, user: dict = Depends(get_current_user)):
    """تحديث موقع السائق - يُستدعى تلقائياً كل 30 ثانية"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # تحديث موقع السائق في جدول المواقع
    await db.driver_locations.update_one(
        {"driver_id": user["id"]},
        {
            "$set": {
                "driver_id": user["id"],
                "driver_name": user.get("full_name", user.get("name", "")),
                "latitude": data.latitude,
                "longitude": data.longitude,
                "current_order_id": data.order_id,
                "updated_at": now
            }
        },
        upsert=True
    )
    
    # إذا كان هناك طلب، تحديث موقع السائق في الطلب أيضاً
    if data.order_id:
        # تحديث طلب الطعام
        await db.food_orders.update_one(
            {"id": data.order_id, "driver_id": user["id"]},
            {
                "$set": {
                    "driver_latitude": data.latitude,
                    "driver_longitude": data.longitude,
                    "driver_location_updated_at": now
                }
            }
        )
        # تحديث طلب المنتجات
        await db.orders.update_one(
            {"id": data.order_id, "driver_id": user["id"]},
            {
                "$set": {
                    "driver_latitude": data.latitude,
                    "driver_longitude": data.longitude,
                    "driver_location_updated_at": now
                }
            }
        )
    
    return {"success": True, "message": "تم تحديث الموقع"}

@router.get("/location/{order_id}")
async def get_driver_location_for_order(order_id: str, user: dict = Depends(get_current_user)):
    """الحصول على موقع السائق لطلب معين - للعميل"""
    
    # البحث في طلبات الطعام
    order = await db.food_orders.find_one(
        {"id": order_id},
        {"_id": 0, "customer_id": 1, "driver_id": 1, "driver_latitude": 1, "driver_longitude": 1, 
         "driver_location_updated_at": 1, "status": 1, "latitude": 1, "longitude": 1,
         "delivery_address": 1}
    )
    
    # البحث في طلبات المنتجات
    if not order:
        order = await db.orders.find_one(
            {"id": order_id},
            {"_id": 0, "user_id": 1, "driver_id": 1, "driver_latitude": 1, "driver_longitude": 1,
             "driver_location_updated_at": 1, "status": 1, "delivery_status": 1, 
             "latitude": 1, "longitude": 1, "address": 1}
        )
        if order:
            order["customer_id"] = order.get("user_id")
            order["delivery_address"] = order.get("address")
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من أن المستخدم هو صاحب الطلب أو السائق أو الأدمن
    if (user["id"] != order.get("customer_id") and 
        user["id"] != order.get("driver_id") and 
        user["user_type"] != "admin"):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # إذا لم يكن هناك سائق معين
    if not order.get("driver_id"):
        return {
            "has_driver": False,
            "message": "لم يتم تعيين سائق بعد"
        }
    
    # إذا لم يكن هناك موقع للسائق
    if not order.get("driver_latitude"):
        # جلب آخر موقع معروف للسائق
        driver_loc = await db.driver_locations.find_one(
            {"driver_id": order["driver_id"]},
            {"_id": 0}
        )
        if driver_loc:
            return {
                "has_driver": True,
                "driver_latitude": driver_loc.get("latitude"),
                "driver_longitude": driver_loc.get("longitude"),
                "updated_at": driver_loc.get("updated_at"),
                "customer_latitude": order.get("latitude"),
                "customer_longitude": order.get("longitude"),
                "delivery_address": order.get("delivery_address")
            }
        return {
            "has_driver": True,
            "message": "موقع السائق غير متاح حالياً"
        }
    
    return {
        "has_driver": True,
        "driver_latitude": order.get("driver_latitude"),
        "driver_longitude": order.get("driver_longitude"),
        "updated_at": order.get("driver_location_updated_at"),
        "customer_latitude": order.get("latitude"),
        "customer_longitude": order.get("longitude"),
        "delivery_address": order.get("delivery_address")
    }

# ===== نهاية تتبع الموقع =====

# ===== حالة توفر السائق =====

class AvailabilityUpdate(BaseModel):
    is_available: bool

@router.get("/availability")
async def get_availability(user: dict = Depends(get_current_user)):
    """الحصول على حالة توفر السائق"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    driver_doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
        {"_id": 0, "is_available": 1}
    )
    
    # افتراضياً السائق غير متاح
    is_available = driver_doc.get("is_available", False) if driver_doc else False
    
    return {"is_available": is_available}

@router.put("/availability")
async def update_availability(data: AvailabilityUpdate, user: dict = Depends(get_current_user)):
    """تحديث حالة توفر السائق"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # إذا كان السائق يريد تعيين نفسه "غير متاح"، نتحقق من عدم وجود طلبات نشطة
    if not data.is_available:
        # التحقق من طلبات المنتجات النشطة
        active_product_orders = await db.orders.count_documents({
            "delivery_driver_id": user["id"],
            "delivery_status": {"$in": ["out_for_delivery", "on_the_way", "picked_up"]}
        })
        
        # التحقق من طلبات الطعام النشطة
        active_food_orders = await db.food_orders.count_documents({
            "driver_id": user["id"],
            "status": "out_for_delivery"
        })
        
        total_active = active_product_orders + active_food_orders
        
        if total_active > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"لا يمكنك تعيين نفسك غير متاح - لديك {total_active} طلب نشط يجب تسليمه أولاً"
            )
    
    # تحديث حالة التوفر في وثائق السائق
    result = await db.delivery_documents.update_one(
        {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
        {
            "$set": {
                "is_available": data.is_available,
                "availability_updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="لم يتم العثور على بيانات السائق")
    
    status_text = "متاح" if data.is_available else "غير متاح"
    return {
        "success": True, 
        "is_available": data.is_available,
        "message": f"تم تحديث حالتك إلى: {status_text}"
    }

# ===== نهاية حالة التوفر =====

@router.get("/orders")
async def get_delivery_orders(user: dict = Depends(get_current_user)):
    """الطلبات المتاحة للتوصيل - في نفس مدينة السائق"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # Check if approved
    doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
        {"_id": 0}
    )
    if not doc or doc.get("status") != "approved":
        raise HTTPException(status_code=403, detail="يجب اعتماد حسابك أولاً")
    
    # الحصول على مدينة السائق
    driver_city = user.get("city") or doc.get("city")
    
    # Get orders ready for delivery in driver's city
    query = {"delivery_status": {"$in": ["shipped", "out_for_delivery"]}}
    if driver_city:
        query["shipping_city"] = driver_city
    
    orders = await db.orders.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return orders

@router.get("/orders/all")
async def get_all_available_orders(user: dict = Depends(get_current_user)):
    """جميع الطلبات المتاحة للتوصيل - في نفس مدينة السائق"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
        {"_id": 0}
    )
    if not doc or doc.get("status") != "approved":
        raise HTTPException(status_code=403, detail="يجب اعتماد حسابك أولاً")
    
    # الحصول على مدينة السائق
    driver_city = user.get("city") or doc.get("city")
    
    query = {"delivery_status": {"$in": ["shipped", "out_for_delivery"]}}
    if driver_city:
        query["shipping_city"] = driver_city
    
    orders = await db.orders.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return orders

# Alias for frontend compatibility
@router.get("/available-orders")
async def get_available_orders_alias(user: dict = Depends(get_current_user)):
    """جميع الطلبات المتاحة للتوصيل (طلبات المتجر + طلبات الطعام) - في نفس مدينة السائق فقط"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
        {"_id": 0}
    )
    if not doc or doc.get("status") != "approved":
        raise HTTPException(status_code=403, detail="يجب اعتماد حسابك أولاً")
    
    # الحصول على مدينة السائق
    driver_city = user.get("city") or doc.get("city")
    
    # جلب طلبات المتجر العادية - في نفس مدينة السائق فقط
    shop_query = {"delivery_status": {"$in": ["shipped", "out_for_delivery"]}}
    if driver_city:
        shop_query["shipping_city"] = driver_city
    
    shop_orders = await db.orders.find(
        shop_query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # تحويل طلبات المتجر لتنسيق موحد
    for order in shop_orders:
        order["order_source"] = "shop"
    
    # جلب طلبات الطعام الجاهزة - في نفس مدينة السائق فقط
    food_query = {"status": "ready", "driver_id": None}
    if driver_city:
        food_query["delivery_city"] = driver_city
    
    food_orders = await db.food_orders.find(
        food_query,
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    
    # تحويل طلبات الطعام لتنسيق يناسب عرض السائق
    for order in food_orders:
        order["order_source"] = "food"
        order["total"] = order.get("total", 0)
        # إضافة معلومات المتجر كـ seller
        store = await db.food_stores.find_one({"id": order["store_id"]}, {"_id": 0})
        if store:
            order["seller_addresses"] = [{
                "name": store.get("name"),
                "business_name": store.get("name"),
                "address": store.get("address", ""),
                "city": store.get("city", ""),
                "phone": store.get("phone", "")
            }]
        # إضافة معلومات المشتري
        order["buyer_address"] = {
            "name": order.get("customer_name", ""),
            "address": order.get("delivery_address", ""),
            "city": order.get("delivery_city", ""),
            "phone": order.get("delivery_phone", "")
        }
        order["items"] = order.get("items", [])
    
    # دمج الطلبات
    all_orders = shop_orders + food_orders
    
    return all_orders

@router.get("/my-orders")
async def get_my_delivery_orders(user: dict = Depends(get_current_user)):
    """الطلبات التي استلمها موظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    orders = await db.orders.find(
        {"delivery_driver_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # إضافة معلومات البائع لكل طلب
    for order in orders:
        if order.get("seller_id"):
            seller = await db.users.find_one(
                {"id": order["seller_id"]},
                {"_id": 0, "phone": 1, "name": 1, "full_name": 1, "store_name": 1}
            )
            if seller:
                order["seller_phone"] = seller.get("phone")
                order["seller_name"] = seller.get("store_name") or seller.get("full_name") or seller.get("name")
    
    return orders

@router.get("/available-food-orders")
async def get_available_food_orders(user: dict = Depends(get_current_user)):
    """طلبات الطعام المتاحة للتوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
        {"_id": 0}
    )
    if not doc or doc.get("status") != "approved":
        return []  # Return empty list instead of error
    
    driver_city = user.get("city") or doc.get("city")
    
    # طلبات الطعام الجاهزة
    food_query = {"status": "ready", "driver_id": None}
    if driver_city:
        food_query["$or"] = [
            {"delivery_city": driver_city},
            {"delivery_city": {"$exists": False}}
        ]
    
    food_orders = await db.food_orders.find(
        food_query,
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    
    # تحويل طلبات الطعام لتنسيق يناسب عرض السائق
    for order in food_orders:
        order["order_source"] = "food"
        # إضافة معلومات المتجر
        store = await db.food_stores.find_one({"id": order.get("store_id")}, {"_id": 0})
        if store:
            order["store_name"] = store.get("name", "متجر")
            order["store_type"] = "restaurant"
            order["seller_addresses"] = [{
                "name": store.get("name"),
                "address": store.get("address", ""),
                "city": store.get("city", ""),
                "phone": store.get("phone", "")
            }]
        order["buyer_address"] = {
            "name": order.get("customer_name", ""),
            "address": order.get("delivery_address", ""),
            "city": order.get("delivery_city", ""),
            "phone": order.get("customer_phone", "")
        }
    
    return food_orders

@router.get("/my-food-orders")
async def get_my_food_orders(user: dict = Depends(get_current_user)):
    """طلبات الطعام النشطة التي استلمها السائق (غير المسلّمة)"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # جلب فقط الطلبات النشطة (غير المسلّمة وغير الملغاة)
    active_statuses = ["accepted", "picked_up", "on_the_way", "out_for_delivery", "arriving", "driver_assigned", "ready_for_pickup"]
    
    food_orders = await db.food_orders.find(
        {
            "driver_id": user["id"],
            "status": {"$in": active_statuses}
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # إضافة معلومات المتجر
    for order in food_orders:
        order["order_source"] = "food"
        store = await db.food_stores.find_one({"id": order.get("store_id")}, {"_id": 0})
        if store:
            order["store_name"] = store.get("name", "متجر")
            order["seller_phone"] = store.get("phone", "")
    
    return food_orders

@router.post("/orders/{order_id}/accept")
async def accept_delivery_order(order_id: str, user: dict = Depends(get_current_user)):
    """قبول طلب للتوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
        {"_id": 0}
    )
    if not doc or doc.get("status") != "approved":
        raise HTTPException(status_code=403, detail="يجب اعتماد حسابك أولاً")
    
    # التحقق من أن السائق متاح
    if not doc.get("is_available", False):
        raise HTTPException(
            status_code=403, 
            detail="يجب تعيين حالتك إلى 'متاح' قبل قبول الطلبات"
        )
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("delivery_driver_id"):
        raise HTTPException(status_code=400, detail="تم قبول هذا الطلب من قبل موظف آخر")
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "delivery_driver_id": user["id"],
                "delivery_driver_name": user.get("full_name", user.get("name", "")),
                "delivery_status": "out_for_delivery",
                "accepted_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Notify customer
    await create_notification_for_user(
        user_id=order["user_id"],
        title="طلبك في الطريق!",
        message=f"موظف التوصيل {user.get('full_name', user.get('name', ''))} في طريقه إليك",
        notification_type="delivery",
        order_id=order_id
    )
    
    return {"message": "تم قبول الطلب"}

@router.post("/orders/{order_id}/deliver")
async def mark_order_delivered(order_id: str, user: dict = Depends(get_current_user)):
    """تأكيد تسليم الطلب"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("delivery_driver_id") != user["id"]:
        raise HTTPException(status_code=403, detail="هذا الطلب ليس مسنداً إليك")
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "delivery_status": "delivered",
                "status": "completed",
                "delivered_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Notify customer
    await create_notification_for_user(
        user_id=order["user_id"],
        title="تم التسليم!",
        message="تم تسليم طلبك بنجاح. شكراً لتسوقك معنا!",
        notification_type="delivery",
        order_id=order_id
    )
    
    # التحقق من مكافأة كل 10 توصيلات
    await check_delivery_milestone_bonus(user["id"])
    
    return {"message": "تم تأكيد التسليم"}


async def check_delivery_milestone_bonus(driver_id: str):
    """التحقق من مكافأة كل 10 توصيلات"""
    # عدد التوصيلات المكتملة
    delivered_count = await db.orders.count_documents({
        "delivery_driver_id": driver_id,
        "delivery_status": "delivered"
    })
    
    # جلب آخر milestone تم مكافأته
    driver = await db.users.find_one({"id": driver_id}, {"_id": 0, "last_delivery_milestone": 1})
    last_milestone = driver.get("last_delivery_milestone", 0) if driver else 0
    
    # التحقق من الوصول لـ milestone جديد (كل 10 توصيلات)
    current_milestone = (delivered_count // 10) * 10
    
    if current_milestone > last_milestone and current_milestone > 0:
        # إضافة مكافأة
        await add_bonus_points(
            driver_id=driver_id,
            bonus_type="ten_deliveries",
            reason=f"أكملت {current_milestone} توصيلة!"
        )
        
        # تحديث آخر milestone
        await db.users.update_one(
            {"id": driver_id},
            {"$set": {"last_delivery_milestone": current_milestone}}
        )

@router.get("/stats")
async def get_delivery_stats(user: dict = Depends(get_current_user)):
    """إحصائيات موظف التوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    total_delivered = await db.orders.count_documents({
        "delivery_driver_id": user["id"],
        "delivery_status": "delivered"
    })
    
    pending_delivery = await db.orders.count_documents({
        "delivery_driver_id": user["id"],
        "delivery_status": "out_for_delivery"
    })
    
    # جلب الأرباح الفعلية من الطلبات
    product_orders = await db.orders.find(
        {"delivery_driver_id": user["id"], "delivery_status": "delivered"},
        {"_id": 0, "driver_earnings": 1}
    ).to_list(1000)
    
    food_orders = await db.food_orders.find(
        {"driver_id": user["id"], "status": "delivered"},
        {"_id": 0, "driver_earnings": 1}
    ).to_list(1000)
    
    # حساب الأرباح الفعلية
    product_earnings = sum(o.get("driver_earnings", 5000) for o in product_orders)
    food_earnings = sum(o.get("driver_earnings", 5000) for o in food_orders)
    total_earnings = product_earnings + food_earnings
    
    return {
        "total_delivered": total_delivered + len(food_orders),
        "pending_delivery": pending_delivery,
        "total_earnings": total_earnings,
        "product_earnings": product_earnings,
        "food_earnings": food_earnings,
        "total_product_orders": len(product_orders),
        "total_food_orders": len(food_orders)
    }

# ============== إحصائيات الأرباح التفصيلية ==============

@router.get("/earnings/stats")
async def get_earnings_statistics(
    period: str = Query("week", regex="^(today|week|month|year)$"),
    user: dict = Depends(get_current_user)
):
    """إحصائيات الأرباح التفصيلية مع مقارنة بالفترات السابقة"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    
    # تحديد نطاق الفترة الحالية والسابقة
    if period == "today":
        current_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        previous_start = current_start - timedelta(days=1)
        previous_end = current_start
        period_label = "اليوم"
        previous_label = "أمس"
    elif period == "week":
        current_start = now - timedelta(days=now.weekday())
        current_start = current_start.replace(hour=0, minute=0, second=0, microsecond=0)
        previous_start = current_start - timedelta(days=7)
        previous_end = current_start
        period_label = "هذا الأسبوع"
        previous_label = "الأسبوع الماضي"
    elif period == "month":
        current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if now.month == 1:
            previous_start = datetime(now.year - 1, 12, 1, tzinfo=timezone.utc)
        else:
            previous_start = datetime(now.year, now.month - 1, 1, tzinfo=timezone.utc)
        previous_end = current_start
        period_label = "هذا الشهر"
        previous_label = "الشهر الماضي"
    else:  # year
        current_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        previous_start = datetime(now.year - 1, 1, 1, tzinfo=timezone.utc)
        previous_end = current_start
        period_label = "هذا العام"
        previous_label = "العام الماضي"
    
    # جلب أرباح الفترة الحالية
    current_product = await db.orders.find({
        "delivery_driver_id": user["id"],
        "delivery_status": "delivered",
        "delivered_at": {"$gte": current_start.isoformat()}
    }, {"_id": 0, "driver_earnings": 1}).to_list(1000)
    
    current_food = await db.food_orders.find({
        "driver_id": user["id"],
        "status": "delivered",
        "delivered_at": {"$gte": current_start.isoformat()}
    }, {"_id": 0, "driver_earnings": 1}).to_list(1000)
    
    current_earnings = sum(o.get("driver_earnings", 5000) for o in current_product) + \
                       sum(o.get("driver_earnings", 5000) for o in current_food)
    current_orders = len(current_product) + len(current_food)
    
    # جلب أرباح الفترة السابقة
    previous_product = await db.orders.find({
        "delivery_driver_id": user["id"],
        "delivery_status": "delivered",
        "delivered_at": {
            "$gte": previous_start.isoformat(),
            "$lt": previous_end.isoformat()
        }
    }, {"_id": 0, "driver_earnings": 1}).to_list(1000)
    
    previous_food = await db.food_orders.find({
        "driver_id": user["id"],
        "status": "delivered",
        "delivered_at": {
            "$gte": previous_start.isoformat(),
            "$lt": previous_end.isoformat()
        }
    }, {"_id": 0, "driver_earnings": 1}).to_list(1000)
    
    previous_earnings = sum(o.get("driver_earnings", 5000) for o in previous_product) + \
                        sum(o.get("driver_earnings", 5000) for o in previous_food)
    previous_orders = len(previous_product) + len(previous_food)
    
    # حساب نسبة التغير
    if previous_earnings > 0:
        earnings_change = round(((current_earnings - previous_earnings) / previous_earnings) * 100, 1)
    else:
        earnings_change = 100 if current_earnings > 0 else 0
    
    if previous_orders > 0:
        orders_change = round(((current_orders - previous_orders) / previous_orders) * 100, 1)
    else:
        orders_change = 100 if current_orders > 0 else 0
    
    # متوسط الربح لكل طلب
    avg_earning_current = round(current_earnings / current_orders) if current_orders > 0 else 0
    avg_earning_previous = round(previous_earnings / previous_orders) if previous_orders > 0 else 0
    
    return {
        "period": period,
        "period_label": period_label,
        "current": {
            "earnings": current_earnings,
            "orders": current_orders,
            "avg_per_order": avg_earning_current,
            "product_orders": len(current_product),
            "food_orders": len(current_food)
        },
        "previous": {
            "label": previous_label,
            "earnings": previous_earnings,
            "orders": previous_orders,
            "avg_per_order": avg_earning_previous
        },
        "comparison": {
            "earnings_change": earnings_change,
            "orders_change": orders_change,
            "is_improvement": earnings_change > 0
        }
    }

@router.get("/earnings/chart")
async def get_earnings_chart_data(
    chart_type: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    user: dict = Depends(get_current_user)
):
    """بيانات الرسم البياني للأرباح"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    chart_data = []
    
    arabic_days = ["الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"]
    arabic_months = {
        1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل",
        5: "مايو", 6: "يونيو", 7: "يوليو", 8: "أغسطس",
        9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر"
    }
    
    if chart_type == "daily":
        # آخر 7 أيام
        for i in range(6, -1, -1):
            day_date = now - timedelta(days=i)
            day_start = day_date.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            # طلبات المنتجات
            product_orders = await db.orders.find({
                "delivery_driver_id": user["id"],
                "delivery_status": "delivered",
                "delivered_at": {
                    "$gte": day_start.isoformat(),
                    "$lt": day_end.isoformat()
                }
            }, {"_id": 0, "driver_earnings": 1}).to_list(100)
            
            # طلبات الطعام
            food_orders = await db.food_orders.find({
                "driver_id": user["id"],
                "status": "delivered",
                "delivered_at": {
                    "$gte": day_start.isoformat(),
                    "$lt": day_end.isoformat()
                }
            }, {"_id": 0, "driver_earnings": 1}).to_list(100)
            
            earnings = sum(o.get("driver_earnings", 5000) for o in product_orders) + \
                       sum(o.get("driver_earnings", 5000) for o in food_orders)
            orders = len(product_orders) + len(food_orders)
            
            chart_data.append({
                "label": arabic_days[day_date.weekday()],
                "date": day_date.strftime("%d/%m"),
                "earnings": earnings,
                "orders": orders,
                "product_orders": len(product_orders),
                "food_orders": len(food_orders)
            })
    
    elif chart_type == "weekly":
        # آخر 4 أسابيع
        for i in range(3, -1, -1):
            week_end = now - timedelta(weeks=i)
            week_start = week_end - timedelta(days=7)
            
            product_orders = await db.orders.find({
                "delivery_driver_id": user["id"],
                "delivery_status": "delivered",
                "delivered_at": {
                    "$gte": week_start.isoformat(),
                    "$lt": week_end.isoformat()
                }
            }, {"_id": 0, "driver_earnings": 1}).to_list(500)
            
            food_orders = await db.food_orders.find({
                "driver_id": user["id"],
                "status": "delivered",
                "delivered_at": {
                    "$gte": week_start.isoformat(),
                    "$lt": week_end.isoformat()
                }
            }, {"_id": 0, "driver_earnings": 1}).to_list(500)
            
            earnings = sum(o.get("driver_earnings", 5000) for o in product_orders) + \
                       sum(o.get("driver_earnings", 5000) for o in food_orders)
            orders = len(product_orders) + len(food_orders)
            
            chart_data.append({
                "label": f"أسبوع {4-i}",
                "date": f"{week_start.strftime('%d/%m')} - {week_end.strftime('%d/%m')}",
                "earnings": earnings,
                "orders": orders
            })
    
    else:  # monthly
        # آخر 6 أشهر
        for i in range(5, -1, -1):
            month_date = now - timedelta(days=i * 30)
            month_num = month_date.month
            year = month_date.year
            
            month_start = datetime(year, month_num, 1, tzinfo=timezone.utc)
            if month_num == 12:
                month_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                month_end = datetime(year, month_num + 1, 1, tzinfo=timezone.utc)
            
            product_orders = await db.orders.find({
                "delivery_driver_id": user["id"],
                "delivery_status": "delivered",
                "delivered_at": {
                    "$gte": month_start.isoformat(),
                    "$lt": month_end.isoformat()
                }
            }, {"_id": 0, "driver_earnings": 1}).to_list(1000)
            
            food_orders = await db.food_orders.find({
                "driver_id": user["id"],
                "status": "delivered",
                "delivered_at": {
                    "$gte": month_start.isoformat(),
                    "$lt": month_end.isoformat()
                }
            }, {"_id": 0, "driver_earnings": 1}).to_list(1000)
            
            earnings = sum(o.get("driver_earnings", 5000) for o in product_orders) + \
                       sum(o.get("driver_earnings", 5000) for o in food_orders)
            orders = len(product_orders) + len(food_orders)
            
            chart_data.append({
                "label": arabic_months[month_num],
                "month": month_num,
                "year": year,
                "earnings": earnings,
                "orders": orders
            })
    
    # حساب الإحصائيات
    total_earnings = sum(d["earnings"] for d in chart_data)
    total_orders = sum(d["orders"] for d in chart_data)
    max_earnings = max(d["earnings"] for d in chart_data) if chart_data else 0
    avg_earnings = round(total_earnings / len(chart_data)) if chart_data else 0
    
    return {
        "chart_type": chart_type,
        "data": chart_data,
        "summary": {
            "total_earnings": total_earnings,
            "total_orders": total_orders,
            "max_earnings": max_earnings,
            "avg_earnings": avg_earnings,
            "best_period": next((d["label"] for d in chart_data if d["earnings"] == max_earnings), None)
        }
    }

@router.get("/earnings/history")
async def get_earnings_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """سجل الأرباح التفصيلي"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    skip = (page - 1) * limit
    
    # جلب طلبات المنتجات المسلمة
    product_orders = await db.orders.find(
        {"delivery_driver_id": user["id"], "delivery_status": "delivered"},
        {"_id": 0, "id": 1, "order_number": 1, "driver_earnings": 1, "delivered_at": 1, "total": 1}
    ).sort("delivered_at", -1).to_list(1000)
    
    # جلب طلبات الطعام المسلمة
    food_orders = await db.food_orders.find(
        {"driver_id": user["id"], "status": "delivered"},
        {"_id": 0, "id": 1, "order_code": 1, "driver_earnings": 1, "delivered_at": 1, "total": 1, "restaurant_name": 1}
    ).sort("delivered_at", -1).to_list(1000)
    
    # دمج وترتيب
    all_orders = []
    
    for o in product_orders:
        all_orders.append({
            "id": o["id"],
            "order_number": o.get("order_number", o["id"][:8]),
            "type": "product",
            "type_label": "منتجات",
            "earnings": o.get("driver_earnings", 5000),
            "order_total": o.get("total", 0),
            "delivered_at": o.get("delivered_at"),
            "source": "متجر"
        })
    
    for o in food_orders:
        all_orders.append({
            "id": o["id"],
            "order_number": o.get("order_code", o["id"][:8]),
            "type": "food",
            "type_label": "طعام",
            "earnings": o.get("driver_earnings", 5000),
            "order_total": o.get("total", 0),
            "delivered_at": o.get("delivered_at"),
            "source": o.get("restaurant_name", "مطعم")
        })
    
    # ترتيب حسب التاريخ
    all_orders.sort(key=lambda x: x.get("delivered_at", ""), reverse=True)
    
    # تطبيق pagination
    total = len(all_orders)
    paginated = all_orders[skip:skip + limit]
    
    return {
        "orders": paginated,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/performance")
async def get_driver_performance(user: dict = Depends(get_current_user)):
    """تقرير أداء موظف التوصيل الشامل مع بيانات الرسوم البيانية"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    from datetime import timedelta
    
    # الأسماء العربية للأشهر
    arabic_months = {
        1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل",
        5: "مايو", 6: "يونيو", 7: "يوليو", 8: "أغسطس",
        9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر"
    }
    
    # ======= إحصائيات عامة =======
    total_delivered = await db.orders.count_documents({
        "delivery_driver_id": user["id"],
        "delivery_status": "delivered"
    })
    
    pending_delivery = await db.orders.count_documents({
        "delivery_driver_id": user["id"],
        "delivery_status": "out_for_delivery"
    })
    
    total_earnings = total_delivered * 5000  # 5000 ل.س لكل طلب
    
    # ======= بيانات آخر 6 أشهر =======
    monthly_data = []
    now = datetime.now(timezone.utc)
    
    for i in range(5, -1, -1):
        month_date = now - timedelta(days=i*30)
        month_num = month_date.month
        year = month_date.year
        
        # حساب بداية ونهاية الشهر
        month_start = datetime(year, month_num, 1, tzinfo=timezone.utc)
        if month_num == 12:
            month_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            month_end = datetime(year, month_num + 1, 1, tzinfo=timezone.utc)
        
        # عدد الطلبات المسلمة في هذا الشهر
        month_orders = await db.orders.count_documents({
            "delivery_driver_id": user["id"],
            "delivery_status": "delivered",
            "delivered_at": {
                "$gte": month_start.isoformat(),
                "$lt": month_end.isoformat()
            }
        })
        
        monthly_data.append({
            "month": arabic_months[month_num],
            "orders": month_orders,
            "earnings": month_orders * 5000
        })
    
    # ======= بيانات آخر 7 أيام =======
    daily_data = []
    arabic_days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
    
    for i in range(6, -1, -1):
        day_date = now - timedelta(days=i)
        day_start = datetime(day_date.year, day_date.month, day_date.day, tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)
        
        day_orders = await db.orders.count_documents({
            "delivery_driver_id": user["id"],
            "delivery_status": "delivered",
            "delivered_at": {
                "$gte": day_start.isoformat(),
                "$lt": day_end.isoformat()
            }
        })
        
        daily_data.append({
            "day": arabic_days[day_date.weekday()] if day_date.weekday() < 7 else day_date.strftime("%d/%m"),
            "date": day_date.strftime("%d/%m"),
            "orders": day_orders,
            "earnings": day_orders * 5000
        })
    
    # ======= التقييمات =======
    ratings = await db.driver_ratings.find(
        {"driver_id": user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    avg_rating = round(sum(r["rating"] for r in ratings) / len(ratings), 1) if ratings else 0
    total_ratings = len(ratings)
    
    # توزيع التقييمات
    rating_distribution = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0}
    for r in ratings:
        rating_distribution[r["rating"]] = rating_distribution.get(r["rating"], 0) + 1
    
    rating_chart_data = [
        {"stars": "5 نجوم", "count": rating_distribution[5]},
        {"stars": "4 نجوم", "count": rating_distribution[4]},
        {"stars": "3 نجوم", "count": rating_distribution[3]},
        {"stars": "2 نجوم", "count": rating_distribution[2]},
        {"stars": "1 نجمة", "count": rating_distribution[1]},
    ]
    
    # ======= معدل الأداء =======
    # حساب الطلبات اليوم
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    today_orders = await db.orders.count_documents({
        "delivery_driver_id": user["id"],
        "delivery_status": "delivered",
        "delivered_at": {"$gte": today_start.isoformat()}
    })
    
    # حساب الطلبات هذا الأسبوع
    week_start = today_start - timedelta(days=now.weekday())
    week_orders = await db.orders.count_documents({
        "delivery_driver_id": user["id"],
        "delivery_status": "delivered",
        "delivered_at": {"$gte": week_start.isoformat()}
    })
    
    # حساب الطلبات هذا الشهر
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    month_orders = await db.orders.count_documents({
        "delivery_driver_id": user["id"],
        "delivery_status": "delivered",
        "delivered_at": {"$gte": month_start.isoformat()}
    })
    
    # ======= مستوى الأداء =======
    # جلب إعدادات المستويات من قاعدة البيانات
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    levels = settings.get("performance_levels", {}) if settings else {}
    
    beginner_max = levels.get("beginner_max", 9)
    bronze_max = levels.get("bronze_max", 29)
    silver_max = levels.get("silver_max", 59)
    gold_max = levels.get("gold_max", 99)
    
    # بناءً على معدل الطلبات الشهرية
    if month_orders > gold_max:
        performance_level = {"level": "ماسي", "color": "#7c3aed", "icon": "💎"}
    elif month_orders > silver_max:
        performance_level = {"level": "ذهبي", "color": "#f59e0b", "icon": "🥇"}
    elif month_orders > bronze_max:
        performance_level = {"level": "فضي", "color": "#6b7280", "icon": "🥈"}
    elif month_orders > beginner_max:
        performance_level = {"level": "برونزي", "color": "#b45309", "icon": "🥉"}
    else:
        performance_level = {"level": "مبتدئ", "color": "#10b981", "icon": "🌱"}
    
    # إضافة معلومات الحدود للواجهة
    performance_level["thresholds"] = {
        "beginner": f"0-{beginner_max}",
        "bronze": f"{beginner_max+1}-{bronze_max}",
        "silver": f"{bronze_max+1}-{silver_max}",
        "gold": f"{silver_max+1}-{gold_max}",
        "diamond": f"{gold_max+1}+"
    }
    performance_level["next_level"] = None
    if month_orders <= beginner_max:
        performance_level["next_level"] = {"name": "برونزي", "orders_needed": beginner_max + 1 - month_orders}
    elif month_orders <= bronze_max:
        performance_level["next_level"] = {"name": "فضي", "orders_needed": bronze_max + 1 - month_orders}
    elif month_orders <= silver_max:
        performance_level["next_level"] = {"name": "ذهبي", "orders_needed": silver_max + 1 - month_orders}
    elif month_orders <= gold_max:
        performance_level["next_level"] = {"name": "ماسي", "orders_needed": gold_max + 1 - month_orders}
    
    return {
        "overview": {
            "total_delivered": total_delivered,
            "pending_delivery": pending_delivery,
            "total_earnings": total_earnings,
            "avg_rating": avg_rating,
            "total_ratings": total_ratings
        },
        "period_stats": {
            "today": {"orders": today_orders, "earnings": today_orders * 5000},
            "week": {"orders": week_orders, "earnings": week_orders * 5000},
            "month": {"orders": month_orders, "earnings": month_orders * 5000}
        },
        "charts": {
            "monthly": monthly_data,
            "daily": daily_data,
            "ratings": rating_chart_data
        },
        "performance_level": performance_level,
        "tips": get_performance_tips(avg_rating, month_orders)
    }

def get_performance_tips(avg_rating: float, month_orders: int) -> list:
    """نصائح لتحسين الأداء"""
    tips = []
    
    if avg_rating < 4:
        tips.append({
            "type": "rating",
            "title": "تحسين التقييم",
            "description": "حاول الابتسام والتعامل بلطف مع العملاء لتحسين تقييمك"
        })
    
    if month_orders < 30:
        tips.append({
            "type": "orders",
            "title": "زيادة الطلبات",
            "description": "حاول العمل في أوقات الذروة (12-2 ظهراً و 6-9 مساءً) لزيادة طلباتك"
        })
    
    if avg_rating >= 4.5 and month_orders >= 50:
        tips.append({
            "type": "excellent",
            "title": "أداء ممتاز! 🌟",
            "description": "استمر على هذا المستوى الرائع!"
        })
    
    if not tips:
        tips.append({
            "type": "general",
            "title": "نصيحة",
            "description": "تأكد من التحقق من الطلب قبل التسليم لتجنب الأخطاء"
        })
    
    return tips

# ============== Leaderboard ==============

@router.get("/leaderboard")
async def get_driver_leaderboard(user: dict = Depends(get_current_user)):
    """لوحة صدارة السائقين - أفضل 10 سائقين هذا الشهر"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    
    # جلب إعدادات الجوائز من قاعدة البيانات
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    leaderboard_settings = settings.get("leaderboard_rewards", {}) if settings else {}
    
    # الجوائز الافتراضية
    rewards = {
        "first": leaderboard_settings.get("first", 50000),   # المركز الأول
        "second": leaderboard_settings.get("second", 30000), # المركز الثاني
        "third": leaderboard_settings.get("third", 15000)    # المركز الثالث
    }
    
    # جلب جميع السائقين المعتمدين
    approved_docs = await db.delivery_documents.find(
        {"status": "approved"},
        {"_id": 0, "driver_id": 1, "delivery_id": 1}
    ).to_list(1000)
    
    # إزالة التكرارات
    driver_ids = list(set(doc.get("driver_id") or doc.get("delivery_id") for doc in approved_docs))
    
    # حساب طلبات كل سائق هذا الشهر
    leaderboard_data = []
    
    for driver_id in driver_ids:
        # جلب معلومات السائق
        driver = await db.users.find_one({"id": driver_id}, {"_id": 0, "id": 1, "name": 1, "full_name": 1})
        if not driver:
            continue
        
        # عدد الطلبات المسلمة هذا الشهر
        month_orders = await db.orders.count_documents({
            "delivery_driver_id": driver_id,
            "delivery_status": "delivered",
            "delivered_at": {"$gte": month_start.isoformat()}
        })
        
        # معدل التقييم
        ratings = await db.driver_ratings.find(
            {"driver_id": driver_id},
            {"_id": 0, "rating": 1}
        ).to_list(1000)
        avg_rating = round(sum(r["rating"] for r in ratings) / len(ratings), 1) if ratings else 0
        
        leaderboard_data.append({
            "driver_id": driver_id,
            "name": driver.get("full_name") or driver.get("name"),
            "orders_count": month_orders,
            "avg_rating": avg_rating,
            "earnings": month_orders * 5000
        })
    
    # ترتيب حسب عدد الطلبات ثم التقييم
    leaderboard_data.sort(key=lambda x: (-x["orders_count"], -x["avg_rating"]))
    
    # إضافة المراكز والجوائز
    for i, driver in enumerate(leaderboard_data):
        driver["rank"] = i + 1
        if i == 0:
            driver["reward"] = rewards["first"]
            driver["badge"] = "🥇"
            driver["badge_color"] = "#FFD700"
        elif i == 1:
            driver["reward"] = rewards["second"]
            driver["badge"] = "🥈"
            driver["badge_color"] = "#C0C0C0"
        elif i == 2:
            driver["reward"] = rewards["third"]
            driver["badge"] = "🥉"
            driver["badge_color"] = "#CD7F32"
        else:
            driver["reward"] = 0
            driver["badge"] = None
            driver["badge_color"] = None
    
    # أخذ أفضل 10 فقط
    top_10 = leaderboard_data[:10]
    
    # إيجاد مركز السائق الحالي
    my_rank = None
    my_data = None
    for driver in leaderboard_data:
        if driver["driver_id"] == user["id"]:
            my_rank = driver["rank"]
            my_data = driver
            break
    
    # إذا لم يكن في القائمة، أضفه بصفر طلبات
    if my_data is None:
        my_data = {
            "driver_id": user["id"],
            "name": user.get("full_name") or user.get("name"),
            "orders_count": 0,
            "avg_rating": 0,
            "earnings": 0,
            "rank": len(leaderboard_data) + 1,
            "reward": 0,
            "badge": None,
            "badge_color": None
        }
        my_rank = my_data["rank"]
    
    # حساب الأيام المتبقية في الشهر
    if now.month == 12:
        next_month = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        next_month = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    days_remaining = (next_month - now).days
    
    # الأسماء العربية للأشهر
    arabic_months = {
        1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل",
        5: "مايو", 6: "يونيو", 7: "يوليو", 8: "أغسطس",
        9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر"
    }
    
    return {
        "leaderboard": top_10,
        "my_position": {
            "rank": my_rank,
            "data": my_data,
            "is_in_top_10": my_rank <= 10 if my_rank else False
        },
        "rewards": rewards,
        "month_info": {
            "name": arabic_months[now.month],
            "year": now.year,
            "days_remaining": days_remaining
        },
        "total_participants": len(leaderboard_data)
    }

# ============== Driver Rating System ==============

from pydantic import BaseModel
from typing import Optional

class DriverRating(BaseModel):
    rating: int  # 1-5 stars
    comment: Optional[str] = None

@router.post("/rate/{order_id}")
async def rate_delivery_driver(order_id: str, rating_data: DriverRating, user: dict = Depends(get_current_user)):
    """تقييم موظف التوصيل بعد استلام الطلب"""
    
    # التحقق من أن التقييم بين 1 و 5
    if rating_data.rating < 1 or rating_data.rating > 5:
        raise HTTPException(status_code=400, detail="التقييم يجب أن يكون بين 1 و 5")
    
    # جلب الطلب
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التأكد من أن المستخدم هو صاحب الطلب
    if order.get("user_id") != user["id"]:
        raise HTTPException(status_code=403, detail="يمكنك تقييم طلباتك فقط")
    
    # التأكد من أن الطلب تم تسليمه
    if order.get("delivery_status") != "delivered":
        raise HTTPException(status_code=400, detail="يمكن التقييم بعد التسليم فقط")
    
    # التأكد من عدم وجود تقييم سابق
    existing_rating = await db.driver_ratings.find_one({
        "order_id": order_id,
        "customer_id": user["id"]
    })
    if existing_rating:
        raise HTTPException(status_code=400, detail="لقد قمت بتقييم هذا الطلب مسبقاً")
    
    # الحصول على معرف موظف التوصيل
    driver_id = order.get("delivery_driver_id")
    if not driver_id:
        raise HTTPException(status_code=400, detail="لا يوجد موظف توصيل لهذا الطلب")
    
    # إنشاء التقييم
    rating_doc = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "driver_id": driver_id,
        "customer_id": user["id"],
        "customer_name": user.get("full_name", user.get("name", "")),
        "rating": rating_data.rating,
        "comment": rating_data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.driver_ratings.insert_one(rating_doc)
    
    # تحديث متوسط تقييم موظف التوصيل
    await update_driver_average_rating(driver_id)
    
    # إضافة نقاط مكافأة عند تقييم 5 نجوم
    if rating_data.rating == 5:
        await add_bonus_points(
            driver_id=driver_id,
            bonus_type="five_star_rating",
            reason="حصلت على تقييم 5 نجوم من عميل"
        )
    
    # إشعار موظف التوصيل
    await create_notification_for_user(
        user_id=driver_id,
        title="تقييم جديد!",
        message=f"حصلت على تقييم {rating_data.rating} نجوم من عميل",
        notification_type="rating",
        order_id=order_id
    )
    
    return {"message": "تم إرسال التقييم بنجاح", "rating": rating_data.rating}

async def update_driver_average_rating(driver_id: str):
    """تحديث متوسط تقييم موظف التوصيل"""
    ratings = await db.driver_ratings.find({"driver_id": driver_id}).to_list(1000)
    
    if ratings:
        total = sum(r["rating"] for r in ratings)
        average = round(total / len(ratings), 1)
        
        await db.users.update_one(
            {"id": driver_id},
            {"$set": {
                "average_rating": average,
                "total_ratings": len(ratings)
            }}
        )
        
        return average
    return 0

@router.get("/ratings/{driver_id}")
async def get_driver_ratings(driver_id: str, page: int = 1, limit: int = 10):
    """جلب تقييمات موظف التوصيل"""
    
    skip = (page - 1) * limit
    
    ratings = await db.driver_ratings.find(
        {"driver_id": driver_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.driver_ratings.count_documents({"driver_id": driver_id})
    
    # جلب معلومات موظف التوصيل
    driver = await db.users.find_one({"id": driver_id}, {"_id": 0, "password": 0})
    
    return {
        "ratings": ratings,
        "total": total,
        "average_rating": driver.get("average_rating", 0) if driver else 0,
        "total_ratings": driver.get("total_ratings", 0) if driver else 0
    }

@router.get("/my-ratings")
async def get_my_ratings(user: dict = Depends(get_current_user), page: int = 1, limit: int = 20):
    """جلب تقييماتي كموظف توصيل"""
    
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    skip = (page - 1) * limit
    
    ratings = await db.driver_ratings.find(
        {"driver_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.driver_ratings.count_documents({"driver_id": user["id"]})
    
    return {
        "ratings": ratings,
        "total": total,
        "average_rating": user.get("average_rating", 0),
        "total_ratings": user.get("total_ratings", 0)
    }

@router.get("/check-rating/{order_id}")
async def check_order_rating(order_id: str, user: dict = Depends(get_current_user)):
    """التحقق مما إذا كان العميل قد قيّم الطلب"""
    
    existing_rating = await db.driver_ratings.find_one({
        "order_id": order_id,
        "customer_id": user["id"]
    }, {"_id": 0})
    
    return {
        "has_rated": existing_rating is not None,
        "rating": existing_rating
    }


# ============== نظام البلاغات الأخلاقية ==============

from pydantic import BaseModel
from typing import Optional

class DriverReport(BaseModel):
    driver_id: str
    order_id: str
    category: str  # سلوك_غير_لائق, تحرش, سرقة_احتيال, أخرى
    details: str

REPORT_CATEGORIES = {
    "سلوك_غير_لائق": "سلوك غير لائق",
    "تحرش": "تحرش",
    "سرقة_احتيال": "سرقة / احتيال",
    "أخرى": "أخرى"
}

# نقاط الخصم حسب نوع البلاغ
PENALTY_POINTS = {
    "سلوك_غير_لائق": 15,  # خصم 15 نقطة
    "تحرش": 50,           # خصم 50 نقطة - خطير جداً
    "سرقة_احتيال": 100,   # فصل فوري
    "أخرى": 10            # خصم 10 نقاط
}

# نقاط المكافآت الإيجابية
BONUS_POINTS = {
    "five_star_rating": 5,      # +5 نقاط عند تقييم 5 نجوم
    "ten_deliveries": 10,       # +10 نقاط عند كل 10 توصيلات
    "challenge_complete": 15,   # +15 نقاط عند إتمام تحدي
}

# الحد الأقصى للنقاط
MAX_PENALTY_POINTS = 100


async def add_bonus_points(driver_id: str, bonus_type: str, reason: str):
    """إضافة نقاط مكافأة للموظف"""
    bonus = BONUS_POINTS.get(bonus_type, 5)
    now = datetime.now(timezone.utc).isoformat()
    
    # جلب النقاط الحالية
    driver = await db.users.find_one({"id": driver_id}, {"_id": 0, "penalty_points": 1})
    current_points = driver.get("penalty_points", MAX_PENALTY_POINTS) if driver else MAX_PENALTY_POINTS
    new_points = min(MAX_PENALTY_POINTS, current_points + bonus)
    
    # لا نضيف إذا وصلنا للحد الأقصى
    if current_points >= MAX_PENALTY_POINTS:
        return {"added": False, "reason": "النقاط في الحد الأقصى"}
    
    # تحديث النقاط
    bonus_record = {
        "date": now,
        "type": "bonus",
        "bonus_type": bonus_type,
        "reason": reason,
        "points_added": bonus,
        "points_before": current_points,
        "points_after": new_points
    }
    
    await db.users.update_one(
        {"id": driver_id},
        {
            "$set": {"penalty_points": new_points},
            "$push": {"penalty_history": bonus_record}
        }
    )
    
    # إشعار الموظف
    await create_notification_for_user(
        user_id=driver_id,
        title=f"🎉 +{bonus} نقاط مكافأة!",
        message=f"{reason}. رصيدك الحالي: {new_points} نقطة",
        notification_type="bonus_points"
    )
    
    return {"added": True, "bonus": bonus, "new_points": new_points}

@router.post("/report-driver")
async def report_driver(data: DriverReport, user: dict = Depends(get_current_user)):
    """تقديم بلاغ أخلاقي ضد موظف توصيل (للعميل أو البائع)"""
    
    # التحقق من أن المستخدم عميل أو بائع
    if user["user_type"] not in ["buyer", "seller"]:
        raise HTTPException(status_code=403, detail="للعملاء والبائعين فقط")
    
    # التحقق من صحة التصنيف
    if data.category not in REPORT_CATEGORIES:
        raise HTTPException(status_code=400, detail="تصنيف البلاغ غير صحيح")
    
    # التحقق من أن التفاصيل ليست فارغة
    if not data.details or len(data.details.strip()) < 10:
        raise HTTPException(status_code=400, detail="يرجى كتابة تفاصيل البلاغ (10 أحرف على الأقل)")
    
    # التحقق من وجود الطلب
    order = await db.orders.find_one({"id": data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من أن المستخدم مرتبط بالطلب
    is_customer = order.get("user_id") == user["id"]
    is_seller = order.get("seller_id") == user["id"]
    
    if not is_customer and not is_seller:
        raise HTTPException(status_code=403, detail="لست مرتبطاً بهذا الطلب")
    
    # التحقق من وجود موظف التوصيل
    driver = await db.users.find_one({"id": data.driver_id, "user_type": "delivery"}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="موظف التوصيل غير موجود")
    
    # التحقق من عدم وجود بلاغ سابق على نفس الطلب من نفس المستخدم
    existing_report = await db.driver_reports.find_one({
        "reporter_id": user["id"],
        "order_id": data.order_id
    })
    if existing_report:
        raise HTTPException(status_code=400, detail="لقد قدمت بلاغاً على هذا الطلب مسبقاً")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # إنشاء البلاغ
    report = {
        "id": str(uuid.uuid4()),
        "driver_id": data.driver_id,
        "driver_name": driver.get("full_name") or driver.get("name"),
        "driver_phone": driver.get("phone"),
        "reporter_id": user["id"],
        "reporter_name": user.get("full_name") or user.get("name"),
        "reporter_phone": user.get("phone"),
        "reporter_type": "عميل" if is_customer else "بائع",
        "order_id": data.order_id,
        "category": data.category,
        "category_label": REPORT_CATEGORIES[data.category],
        "details": data.details.strip(),
        "status": "pending",  # pending, reviewed, dismissed, terminated
        "created_at": now
    }
    
    await db.driver_reports.insert_one(report)
    
    # ملاحظة: لا نقوم بتعليق الحساب مباشرة، فقط نُشعر المدير للمراجعة
    # المدير هو من يقرر تعليق الحساب أو رفض البلاغ
    
    # إشعار المدير
    from core.database import create_notification_for_role
    await create_notification_for_role(
        role="admin",
        title="⚠️ بلاغ أخلاقي جديد - يتطلب مراجعة",
        message=f"بلاغ ضد موظف التوصيل {report['driver_name']} - {REPORT_CATEGORIES[data.category]}. يرجى مراجعة البلاغ واتخاذ الإجراء المناسب.",
        notification_type="driver_report"
    )
    
    # إشعار موظف التوصيل بوجود بلاغ (بدون تعليق)
    await create_notification_for_user(
        user_id=data.driver_id,
        title="📋 تم استلام بلاغ بحقك",
        message="تم تقديم بلاغ بحقك وسيتم مراجعته من قبل الإدارة. سيتم إبلاغك بالنتيجة.",
        notification_type="report_received"
    )
    
    return {
        "message": "تم تقديم البلاغ بنجاح. سيتم مراجعته من قبل الإدارة.",
        "report_id": report["id"]
    }

@router.get("/my-suspension-status")
async def get_suspension_status(user: dict = Depends(get_current_user)):
    """التحقق من حالة التعليق (لموظف التوصيل)"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    driver = await db.users.find_one({"id": user["id"]}, {"_id": 0, "is_suspended": 1, "suspended_at": 1, "suspension_reason": 1})
    
    return {
        "is_suspended": driver.get("is_suspended", False),
        "suspended_at": driver.get("suspended_at"),
        "reason": driver.get("suspension_reason")
    }


@router.get("/my-penalty-points")
async def get_my_penalty_points(user: dict = Depends(get_current_user)):
    """جلب نقاط الموظف الحالية"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    driver = await db.users.find_one(
        {"id": user["id"]}, 
        {"_id": 0, "penalty_points": 1, "penalty_history": 1}
    )
    
    current_points = driver.get("penalty_points", MAX_PENALTY_POINTS)
    history = driver.get("penalty_history", [])
    
    return {
        "current_points": current_points,
        "max_points": MAX_PENALTY_POINTS,
        "percentage": round((current_points / MAX_PENALTY_POINTS) * 100),
        "history": history[-10:]  # آخر 10 سجلات
    }


# ============== Live Location Tracking ==============

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    heading: Optional[float] = None  # اتجاه الحركة
    speed: Optional[float] = None    # السرعة بالكم/ساعة

@router.post("/location/update")
async def update_driver_location_v2(location: LocationUpdate, user: dict = Depends(get_current_user)):
    """تحديث موقع السائق الحالي"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # حفظ الموقع في collection منفصل للأداء
    await db.driver_locations.update_one(
        {"driver_id": user["id"]},
        {
            "$set": {
                "driver_id": user["id"],
                "latitude": location.latitude,
                "longitude": location.longitude,
                "heading": location.heading,
                "speed": location.speed,
                "updated_at": now
            }
        },
        upsert=True
    )
    
    return {"message": "تم تحديث الموقع", "timestamp": now}

@router.get("/location/{driver_id}")
async def get_driver_location(driver_id: str, user: dict = Depends(get_current_user)):
    """جلب موقع السائق الحالي (للعميل أو المدير)"""
    
    # التحقق من الصلاحية - العميل يمكنه رؤية موقع السائق الذي يوصل له
    if user["user_type"] == "buyer":
        # التحقق من وجود طلب نشط من هذا السائق لهذا العميل
        active_order = await db.orders.find_one({
            "user_id": user["id"],
            "delivery_driver_id": driver_id,
            "delivery_status": {"$in": ["out_for_delivery", "on_the_way", "picked_up"]}
        })
        
        if not active_order:
            raise HTTPException(status_code=403, detail="لا يوجد طلب نشط من هذا السائق")
    
    elif user["user_type"] not in ["admin", "sub_admin", "delivery", "seller"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # جلب الموقع
    location = await db.driver_locations.find_one(
        {"driver_id": driver_id},
        {"_id": 0}
    )
    
    if not location:
        return {
            "available": False,
            "message": "موقع السائق غير متاح حالياً"
        }
    
    # التحقق من أن الموقع حديث (آخر 5 دقائق)
    from datetime import timedelta
    location_time = datetime.fromisoformat(location["updated_at"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    
    is_stale = (now - location_time) > timedelta(minutes=5)
    
    return {
        "available": True,
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "heading": location.get("heading"),
        "speed": location.get("speed"),
        "updated_at": location["updated_at"],
        "is_stale": is_stale  # موقع قديم
    }

@router.get("/order-tracking/{order_id}/live")
async def get_order_live_tracking(order_id: str, user: dict = Depends(get_current_user)):
    """جلب بيانات التتبع الحي للطلب"""
    
    # جلب الطلب
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        # محاولة جلب من طلبات الطعام
        order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من الصلاحية
    is_owner = order.get("user_id") == user["id"]
    is_seller = order.get("seller_id") == user["id"]
    is_driver = order.get("delivery_driver_id") == user["id"]
    is_admin = user["user_type"] in ["admin", "sub_admin"]
    
    if not (is_owner or is_seller or is_driver or is_admin):
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # جلب موقع السائق إذا كان متاحاً
    driver_location = None
    driver_id = order.get("delivery_driver_id")
    
    if driver_id and order.get("delivery_status") in ["out_for_delivery", "on_the_way", "picked_up"]:
        location = await db.driver_locations.find_one(
            {"driver_id": driver_id},
            {"_id": 0}
        )
        if location:
            from datetime import timedelta
            location_time = datetime.fromisoformat(location["updated_at"].replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            is_stale = (now - location_time) > timedelta(minutes=5)
            
            driver_location = {
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "heading": location.get("heading"),
                "speed": location.get("speed"),
                "updated_at": location["updated_at"],
                "is_stale": is_stale
            }
    
    # جلب معلومات السائق
    driver_info = None
    if driver_id:
        driver = await db.users.find_one(
            {"id": driver_id},
            {"_id": 0, "id": 1, "name": 1, "full_name": 1, "phone": 1, "average_rating": 1}
        )
        if driver:
            driver_info = {
                "id": driver["id"],
                "name": driver.get("full_name") or driver.get("name"),
                "phone": driver.get("phone"),
                "rating": driver.get("average_rating", 0)
            }
    
    return {
        "order_id": order_id,
        "status": order.get("delivery_status") or order.get("status"),
        "driver": driver_info,
        "driver_location": driver_location,
        "delivery_address": order.get("address") or order.get("delivery_address"),
        "delivery_city": order.get("city") or order.get("delivery_city"),
        "estimated_time": calculate_eta(driver_location, order) if driver_location else None
    }

def calculate_eta(driver_location: dict, order: dict) -> dict:
    """حساب الوقت المتوقع للوصول (تقديري)"""
    if not driver_location or driver_location.get("is_stale"):
        return None
    
    # تقدير بسيط - في الواقع يحتاج حساب المسافة الفعلية
    speed = driver_location.get("speed", 30)  # افتراضي 30 كم/ساعة
    
    # نفترض مسافة متوسطة 5 كم
    estimated_minutes = max(5, min(30, int(5 / (speed / 60)) if speed > 0 else 15))
    
    return {
        "minutes": estimated_minutes,
        "text": f"خلال {estimated_minutes} دقيقة تقريباً"
    }


@router.delete("/location")
async def clear_driver_location(user: dict = Depends(get_current_user)):
    """حذف موقع السائق (عند انتهاء العمل)"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    await db.driver_locations.delete_one({"driver_id": user["id"]})
    
    return {"message": "تم حذف الموقع"}


@router.get("/penalty-info/{driver_id}")
async def get_driver_penalty_info(driver_id: str, user: dict = Depends(get_current_user)):
    """جلب نقاط موظف معين (للمدير)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    driver = await db.users.find_one(
        {"id": driver_id, "user_type": "delivery"}, 
        {"_id": 0, "penalty_points": 1, "penalty_history": 1, "full_name": 1, "name": 1}
    )
    
    if not driver:
        raise HTTPException(status_code=404, detail="موظف التوصيل غير موجود")
    
    current_points = driver.get("penalty_points", MAX_PENALTY_POINTS)
    
    return {
        "driver_name": driver.get("full_name") or driver.get("name"),
        "current_points": current_points,
        "max_points": MAX_PENALTY_POINTS,
        "percentage": round((current_points / MAX_PENALTY_POINTS) * 100),
        "history": driver.get("penalty_history", [])[-20:]
    }



# ============== نظام مخالفات طلبات المنتجات ==============

class ViolationCreate(BaseModel):
    driver_id: str
    order_id: str
    violation_type: str  # "late_delivery", "undelivered"
    amount: float
    reason: str

@router.get("/violations")
async def get_driver_violations(user: dict = Depends(get_current_user)):
    """الحصول على مخالفات السائق"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    violations = await db.driver_violations.find(
        {"driver_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=50)
    
    total_deductions = sum(v.get("amount", 0) for v in violations if v.get("status") == "applied")
    
    return {
        "violations": violations,
        "total_deductions": total_deductions,
        "total_count": len(violations)
    }

@router.post("/check-undelivered-orders")
async def check_undelivered_product_orders(user: dict = Depends(get_current_user)):
    """
    التحقق من الطلبات غير المُسلّمة في نهاية اليوم
    يُستدعى تلقائياً أو يدوياً من المدير
    """
    if user["user_type"] not in ["admin", "delivery"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # جلب إعدادات ساعات العمل
    settings = await db.platform_settings.find_one({"id": "main"})
    working_hours = settings.get("working_hours", {}) if settings else {}
    end_hour = working_hours.get("end_hour", 22)
    
    now = datetime.now(timezone.utc)
    current_hour = now.hour
    
    # فقط التحقق بعد انتهاء ساعات العمل
    if current_hour < end_hour:
        return {"message": "لم تنتهِ ساعات العمل بعد", "end_hour": end_hour, "current_hour": current_hour}
    
    # البحث عن طلبات المنتجات غير المُسلّمة للسائق
    driver_id = user["id"] if user["user_type"] == "delivery" else None
    
    query = {
        "status": {"$in": ["shipped", "out_for_delivery"]},
        "delivery_status": {"$in": ["picked_up", "in_transit", "pending"]},
        "driver_id": {"$ne": None}
    }
    
    if driver_id:
        query["driver_id"] = driver_id
    
    undelivered_orders = await db.orders.find(query, {"_id": 0}).to_list(length=100)
    
    violations_created = []
    
    for order in undelivered_orders:
        order_driver_id = order.get("driver_id")
        order_id = order.get("id")
        order_total = order.get("total", 0)
        
        # التحقق من عدم وجود مخالفة سابقة لنفس الطلب اليوم
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        existing_violation = await db.driver_violations.find_one({
            "order_id": order_id,
            "created_at": {"$gte": today_start}
        })
        
        if existing_violation:
            continue
        
        # إنشاء مخالفة جديدة
        violation = {
            "id": str(uuid.uuid4()),
            "driver_id": order_driver_id,
            "order_id": order_id,
            "order_number": order.get("order_number", order_id[:8]),
            "violation_type": "undelivered",
            "amount": order_total,
            "reason": "لم يتم تسليم الطلب قبل نهاية ساعات العمل",
            "status": "pending",  # pending, applied, disputed, cancelled
            "created_at": now.isoformat(),
            "applied_at": None
        }
        
        await db.driver_violations.insert_one(violation)
        violations_created.append(violation)
        
        # إشعار السائق
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": order_driver_id,
            "title": "⚠️ مخالفة: طلب غير مُسلّم",
            "message": f"لم تقم بتسليم الطلب #{order.get('order_number', order_id[:8])} قبل نهاية ساعات العمل. سيتم خصم {order_total:,.0f} ل.س",
            "type": "violation",
            "is_read": False,
            "created_at": now.isoformat()
        })
    
    return {
        "message": f"تم إنشاء {len(violations_created)} مخالفة",
        "violations": violations_created
    }

@router.post("/violations/{violation_id}/apply")
async def apply_violation(violation_id: str, user: dict = Depends(get_current_user)):
    """تطبيق المخالفة (خصم من رصيد السائق)"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    violation = await db.driver_violations.find_one({"id": violation_id})
    if not violation:
        raise HTTPException(status_code=404, detail="المخالفة غير موجودة")
    
    if violation.get("status") == "applied":
        raise HTTPException(status_code=400, detail="تم تطبيق هذه المخالفة مسبقاً")
    
    driver_id = violation.get("driver_id")
    amount = violation.get("amount", 0)
    
    # خصم من رصيد السائق
    driver = await db.users.find_one({"id": driver_id})
    if driver:
        current_balance = driver.get("wallet_balance", 0)
        new_balance = current_balance - amount
        
        await db.users.update_one(
            {"id": driver_id},
            {
                "$set": {"wallet_balance": new_balance},
                "$push": {
                    "wallet_history": {
                        "type": "violation_deduction",
                        "amount": -amount,
                        "balance_after": new_balance,
                        "description": f"خصم مخالفة: {violation.get('reason')}",
                        "violation_id": violation_id,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                }
            }
        )
    
    # تحديث حالة المخالفة
    await db.driver_violations.update_one(
        {"id": violation_id},
        {
            "$set": {
                "status": "applied",
                "applied_at": datetime.now(timezone.utc).isoformat(),
                "applied_by": user["id"]
            }
        }
    )
    
    return {"message": "تم تطبيق المخالفة وخصم المبلغ من رصيد السائق"}

@router.post("/violations/{violation_id}/cancel")
async def cancel_violation(violation_id: str, reason: str = "", user: dict = Depends(get_current_user)):
    """إلغاء المخالفة"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    violation = await db.driver_violations.find_one({"id": violation_id})
    if not violation:
        raise HTTPException(status_code=404, detail="المخالفة غير موجودة")
    
    if violation.get("status") == "applied":
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء مخالفة تم تطبيقها")
    
    await db.driver_violations.update_one(
        {"id": violation_id},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_at": datetime.now(timezone.utc).isoformat(),
                "cancelled_by": user["id"],
                "cancellation_reason": reason
            }
        }
    )
    
    # إشعار السائق
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": violation.get("driver_id"),
        "title": "✅ تم إلغاء المخالفة",
        "message": f"تم إلغاء المخالفة للطلب #{violation.get('order_number')}",
        "type": "violation_cancelled",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "تم إلغاء المخالفة"}

# Admin endpoint للحصول على جميع المخالفات
@router.get("/admin/violations")
async def get_all_violations(
    status: str = None,
    user: dict = Depends(get_current_user)
):
    """الحصول على جميع المخالفات (للمدير)"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    query = {}
    if status:
        query["status"] = status
    
    violations = await db.driver_violations.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=200)
    
    # إضافة معلومات السائق لكل مخالفة
    for v in violations:
        driver = await db.users.find_one({"id": v.get("driver_id")}, {"_id": 0, "name": 1, "phone": 1})
        v["driver_name"] = driver.get("name") if driver else "غير معروف"
        v["driver_phone"] = driver.get("phone") if driver else ""
    
    stats = {
        "total": len(violations),
        "pending": len([v for v in violations if v.get("status") == "pending"]),
        "applied": len([v for v in violations if v.get("status") == "applied"]),
        "cancelled": len([v for v in violations if v.get("status") == "cancelled"]),
        "total_amount": sum(v.get("amount", 0) for v in violations if v.get("status") == "applied")
    }
    
    return {
        "violations": violations,
        "stats": stats
    }
