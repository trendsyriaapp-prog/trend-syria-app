# /app/backend/routes/settings.py
# إعدادات المنصة (للمدير)

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional

from core.database import db, get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])

class PlatformSettings(BaseModel):
    min_seller_withdrawal: Optional[int] = 50000
    min_delivery_withdrawal: Optional[int] = 25000
    delivery_fees: Optional[dict] = None

class DeliveryFees(BaseModel):
    same_city: int = 3000
    nearby: int = 5000
    medium: int = 8000
    far: int = 12000

# ============== Get Settings ==============

@router.get("")
async def get_platform_settings(user: dict = Depends(get_current_user)):
    """جلب إعدادات المنصة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    if not settings:
        # إنشاء إعدادات افتراضية
        settings = {
            "id": "main",
            "min_seller_withdrawal": 50000,
            "min_delivery_withdrawal": 25000,
            "delivery_fees": {
                "same_city": 3000,
                "nearby": 5000,
                "medium": 8000,
                "far": 12000
            },
            "free_shipping_threshold": 150000,
            "low_stock_threshold": 5,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.platform_settings.insert_one(settings)
        settings.pop("_id", None)
    
    return settings

@router.get("/public")
async def get_public_settings():
    """إعدادات عامة (للجميع)"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    if not settings:
        return {
            "delivery_fees": {
                "same_city": 3000,
                "nearby": 5000,
                "medium": 8000,
                "far": 12000
            },
            "free_shipping_threshold": 150000
        }
    
    return {
        "delivery_fees": settings.get("delivery_fees", {}),
        "free_shipping_threshold": settings.get("free_shipping_threshold", 150000)
    }

# ============== Update Settings ==============

@router.put("/withdrawal-limits")
async def update_withdrawal_limits(
    min_seller: int,
    min_delivery: int,
    user: dict = Depends(get_current_user)
):
    """تحديث الحد الأدنى للسحب"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "min_seller_withdrawal": min_seller,
                "min_delivery_withdrawal": min_delivery,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث الحدود بنجاح",
        "min_seller_withdrawal": min_seller,
        "min_delivery_withdrawal": min_delivery
    }

@router.put("/delivery-fees")
async def update_delivery_fees(
    fees: DeliveryFees,
    user: dict = Depends(get_current_user)
):
    """تحديث أسعار التوصيل"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "delivery_fees": {
                    "same_city": fees.same_city,
                    "nearby": fees.nearby,
                    "medium": fees.medium,
                    "far": fees.far
                },
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث أسعار التوصيل بنجاح",
        "delivery_fees": {
            "same_city": fees.same_city,
            "nearby": fees.nearby,
            "medium": fees.medium,
            "far": fees.far
        }
    }

@router.put("/free-shipping")
async def update_free_shipping_threshold(
    threshold: int,
    user: dict = Depends(get_current_user)
):
    """تحديث حد الشحن المجاني"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "free_shipping_threshold": threshold,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث حد الشحن المجاني",
        "free_shipping_threshold": threshold
    }

# ============== إعدادات أجور التوصيل بالمسافة ==============

class DistanceDeliverySettings(BaseModel):
    base_fee: int = 500  # الرسوم الأساسية
    price_per_km: int = 200  # سعر الكيلومتر
    min_fee: int = 1000  # الحد الأدنى للأجرة
    enabled_for_food: bool = True  # تفعيل للطعام
    enabled_for_products: bool = True  # تفعيل للمنتجات

@router.get("/distance-delivery")
async def get_distance_delivery_settings():
    """جلب إعدادات أجور التوصيل بالمسافة"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    if not settings or "distance_delivery" not in settings:
        return {
            "base_fee": 500,
            "price_per_km": 200,
            "min_fee": 1000,
            "enabled_for_food": True,
            "enabled_for_products": True
        }
    
    return settings.get("distance_delivery")

@router.put("/distance-delivery")
async def update_distance_delivery_settings(
    settings: DistanceDeliverySettings,
    user: dict = Depends(get_current_user)
):
    """تحديث إعدادات أجور التوصيل بالمسافة"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "distance_delivery": {
                    "base_fee": settings.base_fee,
                    "price_per_km": settings.price_per_km,
                    "min_fee": settings.min_fee,
                    "enabled_for_food": settings.enabled_for_food,
                    "enabled_for_products": settings.enabled_for_products
                },
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث إعدادات أجور التوصيل بالمسافة",
        "distance_delivery": {
            "base_fee": settings.base_fee,
            "price_per_km": settings.price_per_km,
            "min_fee": settings.min_fee,
            "enabled_for_food": settings.enabled_for_food,
            "enabled_for_products": settings.enabled_for_products
        }
    }

# ============== إعدادات أرباح السائق ==============

class DriverEarningsSettings(BaseModel):
    base_fee: int = 1000  # الأجرة الأساسية للسائق
    price_per_km: int = 300  # سعر الكيلومتر للسائق
    min_fee: int = 1500  # الحد الأدنى لربح السائق

@router.get("/driver-earnings")
async def get_driver_earnings_settings():
    """جلب إعدادات أرباح السائق"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    if not settings or "driver_earnings" not in settings:
        return {
            "base_fee": 1000,
            "price_per_km": 300,
            "min_fee": 1500
        }
    
    return settings.get("driver_earnings")

@router.put("/driver-earnings")
async def update_driver_earnings_settings(
    settings: DriverEarningsSettings,
    user: dict = Depends(get_current_user)
):
    """تحديث إعدادات أرباح السائق"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "driver_earnings": {
                    "base_fee": settings.base_fee,
                    "price_per_km": settings.price_per_km,
                    "min_fee": settings.min_fee
                },
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث إعدادات أرباح السائق",
        "driver_earnings": {
            "base_fee": settings.base_fee,
            "price_per_km": settings.price_per_km,
            "min_fee": settings.min_fee
        }
    }

# ============== إعدادات وقت انتظار التوصيل ==============

@router.get("/delivery-wait-time")
async def get_delivery_wait_time():
    """جلب وقت انتظار التوصيل (بالدقائق)"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    return {
        "delivery_wait_time_minutes": settings.get("delivery_wait_time_minutes", 10) if settings else 10
    }

@router.put("/delivery-wait-time")
async def update_delivery_wait_time(
    wait_time_minutes: int,
    user: dict = Depends(get_current_user)
):
    """تحديث وقت انتظار التوصيل"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    if wait_time_minutes < 1 or wait_time_minutes > 60:
        raise HTTPException(status_code=400, detail="الوقت يجب أن يكون بين 1 و 60 دقيقة")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "delivery_wait_time_minutes": wait_time_minutes,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث وقت الانتظار",
        "delivery_wait_time_minutes": wait_time_minutes
    }

# ============== إعدادات حدود الطلبات الذكية ==============

class SmartOrderLimits(BaseModel):
    max_orders_different_stores: int = 5  # الحد الأقصى من مطاعم مختلفة
    max_orders_same_store: int = 7  # الحد الأقصى من نفس المطعم
    priority_timeout_seconds: int = 15  # مدة الأولوية بالثواني
    enable_smart_priority: bool = True  # تفعيل الأولوية الذكية

@router.get("/smart-order-limits")
async def get_smart_order_limits():
    """جلب إعدادات حدود الطلبات الذكية"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    if not settings or "smart_order_limits" not in settings:
        return {
            "max_orders_different_stores": 5,
            "max_orders_same_store": 7,
            "priority_timeout_seconds": 15,
            "enable_smart_priority": True
        }
    
    return settings.get("smart_order_limits")

@router.put("/smart-order-limits")
async def update_smart_order_limits(
    limits: SmartOrderLimits,
    user: dict = Depends(get_current_user)
):
    """تحديث إعدادات حدود الطلبات الذكية"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "smart_order_limits": {
                    "max_orders_different_stores": limits.max_orders_different_stores,
                    "max_orders_same_store": limits.max_orders_same_store,
                    "priority_timeout_seconds": limits.priority_timeout_seconds,
                    "enable_smart_priority": limits.enable_smart_priority
                },
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث إعدادات حدود الطلبات الذكية",
        "smart_order_limits": {
            "max_orders_different_stores": limits.max_orders_different_stores,
            "max_orders_same_store": limits.max_orders_same_store,
            "priority_timeout_seconds": limits.priority_timeout_seconds,
            "enable_smart_priority": limits.enable_smart_priority
        }
    }

@router.put("/low-stock-threshold")
async def update_low_stock_threshold(
    threshold: int,
    user: dict = Depends(get_current_user)
):
    """تحديث حد تنبيه المخزون المنخفض"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    if threshold < 1:
        raise HTTPException(status_code=400, detail="الحد الأدنى يجب أن يكون 1 على الأقل")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "low_stock_threshold": threshold,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث حد تنبيه المخزون المنخفض",
        "low_stock_threshold": threshold
    }

@router.get("/low-stock-threshold")
async def get_low_stock_threshold():
    """جلب حد تنبيه المخزون المنخفض"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    return {"low_stock_threshold": settings.get("low_stock_threshold", 5) if settings else 5}

@router.get("/wallet")
async def get_wallet_settings():
    """جلب إعدادات المحفظة (للبائعين وموظفي التوصيل)"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    if not settings:
        return {
            "seller_min_withdrawal": 50000,
            "delivery_min_withdrawal": 25000
        }
    
    return {
        "seller_min_withdrawal": settings.get("min_seller_withdrawal", 50000),
        "delivery_min_withdrawal": settings.get("min_delivery_withdrawal", 25000)
    }

# ============== Delivery Performance Levels ==============

class PerformanceLevels(BaseModel):
    beginner_max: int = 9      # مبتدئ: 0-9
    bronze_max: int = 29       # برونزي: 10-29
    silver_max: int = 59       # فضي: 30-59
    gold_max: int = 99         # ذهبي: 60-99
    # ماسي: 100+

class DeliveryWorkingHours(BaseModel):
    start_hour: int = 8        # ساعة البدء (0-23)
    end_hour: int = 18         # ساعة الانتهاء (0-23)
    is_enabled: bool = True    # هل التقييد مفعل؟

@router.get("/delivery-settings")
async def get_delivery_settings():
    """جلب إعدادات التوصيل (مستويات الأداء وساعات العمل وجوائز الصدارة)"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    default_levels = {
        "beginner_max": 9,
        "bronze_max": 29,
        "silver_max": 59,
        "gold_max": 99
    }
    
    default_hours = {
        "start_hour": 8,
        "end_hour": 18,
        "is_enabled": True
    }
    
    default_rewards = {
        "first": 50000,
        "second": 30000,
        "third": 15000
    }
    
    if not settings:
        return {
            "performance_levels": default_levels,
            "working_hours": default_hours,
            "leaderboard_rewards": default_rewards
        }
    
    return {
        "performance_levels": settings.get("performance_levels", default_levels),
        "working_hours": settings.get("working_hours", default_hours),
        "leaderboard_rewards": settings.get("leaderboard_rewards", default_rewards)
    }

@router.put("/performance-levels")
async def update_performance_levels(
    levels: PerformanceLevels,
    user: dict = Depends(get_current_user)
):
    """تحديث حدود مستويات الأداء"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    # التحقق من صحة القيم
    if not (levels.beginner_max < levels.bronze_max < levels.silver_max < levels.gold_max):
        raise HTTPException(status_code=400, detail="يجب أن تكون الحدود تصاعدية")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "performance_levels": {
                    "beginner_max": levels.beginner_max,
                    "bronze_max": levels.bronze_max,
                    "silver_max": levels.silver_max,
                    "gold_max": levels.gold_max
                },
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث مستويات الأداء بنجاح",
        "performance_levels": {
            "beginner_max": levels.beginner_max,
            "bronze_max": levels.bronze_max,
            "silver_max": levels.silver_max,
            "gold_max": levels.gold_max
        }
    }

@router.put("/working-hours")
async def update_working_hours(
    hours: DeliveryWorkingHours,
    user: dict = Depends(get_current_user)
):
    """تحديث ساعات عمل التوصيل"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    # التحقق من صحة الساعات
    if hours.start_hour < 0 or hours.start_hour > 23:
        raise HTTPException(status_code=400, detail="ساعة البدء غير صحيحة (0-23)")
    if hours.end_hour < 0 or hours.end_hour > 23:
        raise HTTPException(status_code=400, detail="ساعة الانتهاء غير صحيحة (0-23)")
    if hours.start_hour >= hours.end_hour:
        raise HTTPException(status_code=400, detail="ساعة البدء يجب أن تكون قبل ساعة الانتهاء")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "working_hours": {
                    "start_hour": hours.start_hour,
                    "end_hour": hours.end_hour,
                    "is_enabled": hours.is_enabled
                },
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث ساعات العمل بنجاح",
        "working_hours": {
            "start_hour": hours.start_hour,
            "end_hour": hours.end_hour,
            "is_enabled": hours.is_enabled
        }
    }


# ============== Leaderboard Rewards ==============

class LeaderboardRewards(BaseModel):
    first: float = 50000    # جائزة المركز الأول
    second: float = 30000   # جائزة المركز الثاني
    third: float = 15000    # جائزة المركز الثالث

@router.put("/leaderboard-rewards")
async def update_leaderboard_rewards(
    rewards: LeaderboardRewards,
    user: dict = Depends(get_current_user)
):
    """تحديث جوائز لوحة الصدارة"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    # التحقق من صحة القيم
    if rewards.first < 0 or rewards.second < 0 or rewards.third < 0:
        raise HTTPException(status_code=400, detail="الجوائز يجب أن تكون قيم موجبة")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "leaderboard_rewards": {
                    "first": rewards.first,
                    "second": rewards.second,
                    "third": rewards.third
                },
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث جوائز الصدارة بنجاح",
        "leaderboard_rewards": {
            "first": rewards.first,
            "second": rewards.second,
            "third": rewards.third
        }
    }



# إعدادات قبول الطلبات
class OrderLimits(BaseModel):
    max_food_orders_per_driver: int = 3
    food_orders_max_distance_km: float = 2.0

@router.put("/order-limits")
async def update_order_limits(
    limits: OrderLimits,
    user: dict = Depends(get_current_user)
):
    """تحديث إعدادات قبول طلبات الطعام"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    # التحقق من صحة القيم
    if limits.max_food_orders_per_driver < 1 or limits.max_food_orders_per_driver > 10:
        raise HTTPException(status_code=400, detail="الحد الأقصى للطلبات يجب أن يكون بين 1 و 10")
    
    if limits.food_orders_max_distance_km < 0.5 or limits.food_orders_max_distance_km > 20:
        raise HTTPException(status_code=400, detail="المسافة يجب أن تكون بين 0.5 و 20 كم")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "max_food_orders_per_driver": limits.max_food_orders_per_driver,
                "food_orders_max_distance_km": limits.food_orders_max_distance_km,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث إعدادات قبول الطلبات بنجاح",
        "max_food_orders_per_driver": limits.max_food_orders_per_driver,
        "food_orders_max_distance_km": limits.food_orders_max_distance_km
    }
