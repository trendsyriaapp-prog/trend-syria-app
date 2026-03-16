# /app/backend/routes/settings.py
# إعدادات المنصة (للمدير)

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from typing import Optional
import uuid

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
            "free_shipping_threshold": 150000,
            "food_free_delivery_threshold": 100000
        }
    
    return {
        "delivery_fees": settings.get("delivery_fees", {}),
        "free_shipping_threshold": settings.get("free_shipping_threshold", 150000),
        "food_free_delivery_threshold": settings.get("food_free_delivery_threshold", 100000)
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


@router.put("/food-free-delivery")
async def update_food_free_delivery_threshold(
    threshold: int,
    user: dict = Depends(get_current_user)
):
    """تحديث حد التوصيل المجاني للطعام"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "food_free_delivery_threshold": threshold,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث حد التوصيل المجاني للطعام",
        "food_free_delivery_threshold": threshold
    }


# ============== عرض الشحن المجاني الشامل ==============

class GlobalFreeShippingPromo(BaseModel):
    is_active: bool = False
    applies_to: str = "all"  # "all", "food", "products"
    end_date: Optional[str] = None  # ISO date string
    message: Optional[str] = None

@router.get("/global-free-shipping")
async def get_global_free_shipping():
    """جلب إعدادات عرض الشحن المجاني الشامل (للجميع)"""
    settings = await db.settings.find_one({"key": "global_free_shipping"}, {"_id": 0})
    
    if not settings:
        return {
            "is_active": False,
            "applies_to": "all",
            "end_date": None,
            "message": None
        }
    
    # التحقق من انتهاء العرض
    if settings.get("end_date"):
        end_date = datetime.fromisoformat(settings["end_date"].replace("Z", "+00:00"))
        # تأكد من أن end_date له timezone
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > end_date:
            # العرض انتهى، نعطله تلقائياً
            await db.settings.update_one(
                {"key": "global_free_shipping"},
                {"$set": {"is_active": False}}
            )
            settings["is_active"] = False
    
    return {
        "is_active": settings.get("is_active", False),
        "applies_to": settings.get("applies_to", "all"),
        "end_date": settings.get("end_date"),
        "message": settings.get("message")
    }

@router.put("/global-free-shipping")
async def update_global_free_shipping(
    promo: GlobalFreeShippingPromo,
    user: dict = Depends(get_current_user)
):
    """تحديث عرض الشحن المجاني الشامل"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    update_data = {
        "key": "global_free_shipping",
        "is_active": promo.is_active,
        "applies_to": promo.applies_to,
        "end_date": promo.end_date,
        "message": promo.message,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["id"]
    }
    
    await db.settings.update_one(
        {"key": "global_free_shipping"},
        {"$set": update_data},
        upsert=True
    )
    
    status = "تم تفعيل" if promo.is_active else "تم إلغاء"
    
    return {
        "message": f"{status} عرض الشحن المجاني الشامل",
        **update_data
    }

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

class DriverKmSettings(BaseModel):
    enabled: bool = True  # تفعيل نظام الكيلومتر
    base_fee: int = 1000  # الأجرة الأساسية
    price_per_km: int = 300  # سعر الكيلومتر
    min_fee: int = 1500  # الحد الأدنى للأجرة

@router.get("/driver-km-settings")
async def get_driver_km_settings(user: dict = Depends(get_current_user)):
    """جلب إعدادات نظام الكيلومتر للسائقين"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    default_settings = {
        "enabled": True,
        "base_fee": 1000,
        "price_per_km": 300,
        "min_fee": 1500
    }
    
    if not settings or "driver_km_settings" not in settings:
        return default_settings
    
    return {**default_settings, **settings.get("driver_km_settings", {})}

@router.put("/driver-km-settings")
async def update_driver_km_settings(
    settings: DriverKmSettings,
    user: dict = Depends(get_current_user)
):
    """تحديث إعدادات نظام الكيلومتر للسائقين"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "driver_km_settings": {
                    "enabled": settings.enabled,
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
        "message": "تم تحديث إعدادات نظام الكيلومتر",
        "driver_km_settings": {
            "enabled": settings.enabled,
            "base_fee": settings.base_fee,
            "price_per_km": settings.price_per_km,
            "min_fee": settings.min_fee
        }
    }

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


# ============== إعدادات حدود التوصيل الجديدة (ساخن/طازج vs بارد/جاف) ==============

class FoodDeliveryLimits(BaseModel):
    hot_fresh_limit: int = 2  # حد الطلبات الساخنة/الطازجة (مطاعم، مقاهي، مخابز، مشروبات، حلويات)
    cold_dry_limit: int = 5   # حد الطلبات الباردة/الجافة (ماركت، خضار)
    max_distance_km: float = 5.0  # المسافة القصوى بين الطلبات

@router.get("/food-delivery-limits")
async def get_food_delivery_limits(user: dict = Depends(get_current_user)):
    """جلب إعدادات حدود توصيل الطعام"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    settings = await db.platform_settings.find_one({"id": "main"})
    limits = settings.get("food_delivery_limits", {}) if settings else {}
    
    return {
        "hot_fresh_limit": limits.get("hot_fresh_limit", 2),
        "cold_dry_limit": limits.get("cold_dry_limit", 5),
        "max_distance_km": settings.get("food_orders_max_distance_km", 5.0) if settings else 5.0,
        # معلومات التصنيفات
        "hot_fresh_types": ["restaurants", "cafes", "bakery", "drinks", "sweets"],
        "cold_dry_types": ["market", "vegetables"],
        "hot_fresh_names": {
            "restaurants": "وجبات سريعة 🍔",
            "cafes": "مقاهي ☕",
            "bakery": "مخابز 🥐",
            "drinks": "مشروبات 🥤",
            "sweets": "حلويات 🍰"
        },
        "cold_dry_names": {
            "market": "ماركت 🛒",
            "vegetables": "خضار وفواكه 🥬"
        }
    }

@router.put("/food-delivery-limits")
async def update_food_delivery_limits(
    limits: FoodDeliveryLimits,
    user: dict = Depends(get_current_user)
):
    """تحديث إعدادات حدود توصيل الطعام (ساخن/طازج vs بارد/جاف)"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    # التحقق من صحة القيم
    if limits.hot_fresh_limit < 1 or limits.hot_fresh_limit > 5:
        raise HTTPException(status_code=400, detail="حد الطلبات الساخنة يجب أن يكون بين 1 و 5")
    
    if limits.cold_dry_limit < 1 or limits.cold_dry_limit > 10:
        raise HTTPException(status_code=400, detail="حد الطلبات الباردة يجب أن يكون بين 1 و 10")
    
    if limits.max_distance_km < 1 or limits.max_distance_km > 20:
        raise HTTPException(status_code=400, detail="المسافة يجب أن تكون بين 1 و 20 كم")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "food_delivery_limits": {
                    "hot_fresh_limit": limits.hot_fresh_limit,
                    "cold_dry_limit": limits.cold_dry_limit
                },
                "food_orders_max_distance_km": limits.max_distance_km,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث إعدادات حدود التوصيل بنجاح",
        "hot_fresh_limit": limits.hot_fresh_limit,
        "cold_dry_limit": limits.cold_dry_limit,
        "max_distance_km": limits.max_distance_km
    }


# ============== رسوم توصيل الطعام الموحدة ==============

class FoodDeliveryFee(BaseModel):
    delivery_fee: float = 5000  # رسوم التوصيل الموحدة للطعام

@router.get("/food-delivery-fee")
async def get_food_delivery_fee(user: dict = Depends(get_current_user)):
    """جلب رسوم توصيل الطعام الموحدة"""
    settings = await db.platform_settings.find_one({"id": "main"})
    
    return {
        "delivery_fee": settings.get("food_delivery_fee", 5000) if settings else 5000
    }

@router.put("/food-delivery-fee")
async def update_food_delivery_fee(
    fee: FoodDeliveryFee,
    user: dict = Depends(get_current_user)
):
    """تحديث رسوم توصيل الطعام الموحدة"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    if fee.delivery_fee < 0 or fee.delivery_fee > 50000:
        raise HTTPException(status_code=400, detail="رسوم التوصيل يجب أن تكون بين 0 و 50,000 ل.س")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "food_delivery_fee": fee.delivery_fee,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث رسوم توصيل الطعام بنجاح",
        "delivery_fee": fee.delivery_fee
    }




# ============== إعداد المسافة القصوى بين المطعم والعميل ==============

class StoreCustomerDistance(BaseModel):
    max_distance_km: float = 5.0  # المسافة القصوى بين المطعم والعميل

@router.get("/store-customer-distance")
async def get_store_customer_distance(user: dict = Depends(get_current_user)):
    """جلب إعداد المسافة القصوى بين المطعم والعميل"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    settings = await db.platform_settings.find_one({"id": "main"})
    
    return {
        "max_distance_km": settings.get("max_store_customer_distance_km", 5.0) if settings else 5.0
    }

@router.put("/store-customer-distance")
async def update_store_customer_distance(
    distance: StoreCustomerDistance,
    user: dict = Depends(get_current_user)
):
    """تحديث المسافة القصوى بين المطعم والعميل"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    if distance.max_distance_km < 1 or distance.max_distance_km > 30:
        raise HTTPException(status_code=400, detail="المسافة يجب أن تكون بين 1 و 30 كم")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "max_store_customer_distance_km": distance.max_distance_km,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث المسافة القصوى بنجاح",
        "max_distance_km": distance.max_distance_km
    }



# ============== رسوم الطقس الصعب (Weather Surcharge) ==============

class WeatherSurcharge(BaseModel):
    is_active: bool = False
    amount: float = 5000  # المبلغ الإضافي
    reason: str = "طقس صعب"  # السبب (مطر، ثلج، حرارة...)

@router.get("/weather-surcharge")
async def get_weather_surcharge(user: dict = Depends(get_current_user)):
    """جلب إعدادات رسوم الطقس الصعب"""
    settings = await db.platform_settings.find_one({"id": "main"})
    weather = settings.get("weather_surcharge", {}) if settings else {}
    
    return {
        "is_active": weather.get("is_active", False),
        "amount": weather.get("amount", 5000),
        "reason": weather.get("reason", "طقس صعب"),
        "activated_at": weather.get("activated_at"),
        "activated_by": weather.get("activated_by")
    }

@router.put("/weather-surcharge")
async def update_weather_surcharge(
    surcharge: WeatherSurcharge,
    user: dict = Depends(get_current_user)
):
    """تفعيل/إيقاف رسوم الطقس الصعب مع إرسال إشعارات للسائقين"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    if surcharge.amount < 0 or surcharge.amount > 50000:
        raise HTTPException(status_code=400, detail="المبلغ يجب أن يكون بين 0 و 50,000 ل.س")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # تحديث الإعدادات
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "weather_surcharge": {
                    "is_active": surcharge.is_active,
                    "amount": surcharge.amount,
                    "reason": surcharge.reason,
                    "activated_at": now if surcharge.is_active else None,
                    "activated_by": user["id"] if surcharge.is_active else None,
                    "deactivated_at": now if not surcharge.is_active else None
                },
                "updated_at": now,
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    # إرسال إشعارات لجميع السائقين
    drivers = await db.users.find(
        {"user_type": "delivery", "is_active": {"$ne": False}},
        {"_id": 0, "id": 1}
    ).to_list(1000)
    
    if surcharge.is_active:
        # إشعار التفعيل
        notification_title = "🌧️ رسوم طقس صعب - فرصة ربح!"
        notification_message = f"تم تفعيل رسوم إضافية بسبب: {surcharge.reason}\n💰 +{surcharge.amount:,.0f} ل.س على كل طلب\n🚀 اعمل الآن واكسب أكثر!"
    else:
        # إشعار الإيقاف
        notification_title = "☀️ انتهاء رسوم الطقس الصعب"
        notification_message = "تم إيقاف رسوم الطقس الصعب. الرسوم عادت لوضعها الطبيعي."
    
    # إنشاء الإشعارات
    import uuid
    notifications = []
    for driver in drivers:
        notifications.append({
            "id": str(uuid.uuid4()),
            "user_id": driver["id"],
            "title": notification_title,
            "message": notification_message,
            "type": "weather_surcharge",
            "is_read": False,
            "play_sound": True,
            "created_at": now
        })
    
    if notifications:
        await db.notifications.insert_many(notifications)
    
    return {
        "message": f"تم {'تفعيل' if surcharge.is_active else 'إيقاف'} رسوم الطقس الصعب",
        "is_active": surcharge.is_active,
        "amount": surcharge.amount,
        "reason": surcharge.reason,
        "notifications_sent": len(notifications)
    }


# ============== Surge Pricing - التسعير الديناميكي ==============

class SurgePricingSettings(BaseModel):
    is_active: bool = False
    multiplier: float = 1.5  # مضاعف السعر (1.5 = زيادة 50%)
    fixed_amount: int = 0  # مبلغ ثابت إضافي (اختياري)
    reason: str = "زيادة الطلب"  # سبب التسعير الديناميكي
    applies_to: str = "all"  # all, food_only, products_only
    min_order_value: int = 0  # الحد الأدنى للطلب لتطبيق الزيادة
    max_surge_amount: int = 0  # الحد الأقصى للزيادة (0 = بدون حد)

@router.get("/surge-pricing")
async def get_surge_pricing():
    """
    جلب حالة التسعير الديناميكي (عام - للعملاء والمدير)
    """
    settings = await db.platform_settings.find_one({"id": "surge_pricing"}, {"_id": 0})
    
    if not settings:
        return {
            "is_active": False,
            "multiplier": 1.0,
            "fixed_amount": 0,
            "reason": "",
            "applies_to": "all",
            "min_order_value": 0,
            "max_surge_amount": 0
        }
    
    return {
        "is_active": settings.get("is_active", False),
        "multiplier": settings.get("multiplier", 1.0),
        "fixed_amount": settings.get("fixed_amount", 0),
        "reason": settings.get("reason", ""),
        "applies_to": settings.get("applies_to", "all"),
        "min_order_value": settings.get("min_order_value", 0),
        "max_surge_amount": settings.get("max_surge_amount", 0),
        "updated_at": settings.get("updated_at", None)
    }

@router.put("/surge-pricing")
async def update_surge_pricing(
    data: SurgePricingSettings,
    user: dict = Depends(get_current_user)
):
    """
    تحديث إعدادات التسعير الديناميكي (للمدير فقط)
    
    - is_active: تفعيل/إيقاف
    - multiplier: مضاعف السعر (1.5 = 50% زيادة، 2.0 = 100% زيادة)
    - fixed_amount: مبلغ ثابت إضافي بدلاً من المضاعف
    - reason: سبب الزيادة (يظهر للعملاء)
    - applies_to: all, food_only, products_only
    - min_order_value: الحد الأدنى للطلب لتطبيق الزيادة
    - max_surge_amount: الحد الأقصى للزيادة
    """
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    # التحقق من صحة القيم
    if data.multiplier < 1.0:
        raise HTTPException(status_code=400, detail="المضاعف يجب أن يكون 1.0 أو أكثر")
    
    if data.multiplier > 5.0:
        raise HTTPException(status_code=400, detail="المضاعف لا يمكن أن يتجاوز 5.0 (500%)")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.platform_settings.update_one(
        {"id": "surge_pricing"},
        {"$set": {
            "id": "surge_pricing",
            "is_active": data.is_active,
            "multiplier": data.multiplier,
            "fixed_amount": data.fixed_amount,
            "reason": data.reason,
            "applies_to": data.applies_to,
            "min_order_value": data.min_order_value,
            "max_surge_amount": data.max_surge_amount,
            "updated_at": now,
            "updated_by": user["id"]
        }},
        upsert=True
    )
    
    # إرسال إشعارات للعملاء والسائقين عند تغيير التسعير
    notifications = []
    
    if data.is_active:
        # جلب العملاء النشطين
        active_customers = await db.users.find(
            {"user_type": {"$in": ["buyer", "customer"]}},
            {"_id": 0, "id": 1}
        ).limit(1000).to_list(1000)
        
        for customer in active_customers:
            notifications.append({
                "id": str(uuid.uuid4()),
                "user_id": customer["id"],
                "type": "surge_pricing",
                "title": "⚡ تنبيه: زيادة مؤقتة في أسعار التوصيل",
                "message": f"{data.reason}. رسوم التوصيل زادت بنسبة {int((data.multiplier - 1) * 100)}%",
                "is_read": False,
                "created_at": now
            })
        
        # إشعار السائقين بالزيادة (أرباح أكثر!)
        active_drivers = await db.users.find(
            {"user_type": "delivery"},
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(500)
        
        for driver in active_drivers:
            notifications.append({
                "id": str(uuid.uuid4()),
                "user_id": driver["id"],
                "type": "surge_pricing_driver",
                "title": "💰 فرصة للكسب: التسعير الديناميكي مفعّل!",
                "message": f"أرباح التوصيل زادت بنسبة {int((data.multiplier - 1) * 100)}% بسبب {data.reason}. اغتنم الفرصة!",
                "is_read": False,
                "created_at": now
            })
    else:
        # إشعار السائقين بإيقاف التسعير الديناميكي
        active_drivers = await db.users.find(
            {"user_type": "delivery"},
            {"_id": 0, "id": 1}
        ).to_list(500)
        
        for driver in active_drivers:
            notifications.append({
                "id": str(uuid.uuid4()),
                "user_id": driver["id"],
                "type": "surge_pricing_driver",
                "title": "📢 تنبيه: عودة الأسعار للطبيعي",
                "message": "تم إيقاف التسعير الديناميكي. أسعار التوصيل عادت للوضع الطبيعي.",
                "is_read": False,
                "created_at": now
            })
    
    if notifications:
        await db.notifications.insert_many(notifications)
    
    # حساب مثال على الزيادة
    example_fee = 5000
    if data.fixed_amount > 0:
        surge_fee = example_fee + data.fixed_amount
    else:
        surge_fee = int(example_fee * data.multiplier)
    
    if data.max_surge_amount > 0:
        surge_fee = min(surge_fee, example_fee + data.max_surge_amount)
    
    return {
        "message": f"تم {'تفعيل' if data.is_active else 'إيقاف'} التسعير الديناميكي",
        "is_active": data.is_active,
        "multiplier": data.multiplier,
        "fixed_amount": data.fixed_amount,
        "reason": data.reason,
        "example": {
            "original_fee": example_fee,
            "surge_fee": surge_fee if data.is_active else example_fee,
            "increase": surge_fee - example_fee if data.is_active else 0
        }
    }

@router.post("/surge-pricing/calculate")
async def calculate_surge_fee(base_fee: int = 5000):
    """
    حساب رسوم التوصيل مع التسعير الديناميكي
    يُستخدم من قبل نظام إنشاء الطلبات
    """
    settings = await db.platform_settings.find_one({"id": "surge_pricing"}, {"_id": 0})
    
    if not settings or not settings.get("is_active", False):
        return {"original_fee": base_fee, "final_fee": base_fee, "surge_applied": False}
    
    # حساب الزيادة
    if settings.get("fixed_amount", 0) > 0:
        surge_fee = base_fee + settings["fixed_amount"]
    else:
        surge_fee = int(base_fee * settings.get("multiplier", 1.0))
    
    # تطبيق الحد الأقصى
    max_surge = settings.get("max_surge_amount", 0)
    if max_surge > 0:
        surge_fee = min(surge_fee, base_fee + max_surge)
    
    return {
        "original_fee": base_fee,
        "final_fee": surge_fee,
        "surge_applied": True,
        "surge_reason": settings.get("reason", "زيادة الطلب"),
        "increase_amount": surge_fee - base_fee,
        "increase_percentage": round((surge_fee - base_fee) / base_fee * 100, 1)
    }



# ============== إعدادات إلغاء الطلب للسائق ==============

class DriverCancelSettings(BaseModel):
    enabled: bool = True
    cancel_window_seconds: int = 120  # دقيقتين
    max_cancel_rate: int = 10  # 10%
    lookback_orders: int = 50  # آخر 50 طلب
    warning_threshold: int = 7  # تحذير عند 7%
    suspension_threshold: int = 15  # إيقاف عند 15%

@router.get("/driver-cancel")
async def get_driver_cancel_settings(user: dict = Depends(get_current_user)):
    """
    جلب إعدادات إلغاء الطلب للسائق (للمدير)
    """
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    default_settings = {
        "enabled": True,
        "cancel_window_seconds": 120,
        "max_cancel_rate": 10,
        "lookback_orders": 50,
        "warning_threshold": 7,
        "suspension_threshold": 15
    }
    
    if settings and "driver_cancel_settings" in settings:
        return {**default_settings, **settings["driver_cancel_settings"]}
    
    return default_settings

@router.put("/driver-cancel")
async def update_driver_cancel_settings(
    data: DriverCancelSettings,
    user: dict = Depends(get_current_user)
):
    """
    تحديث إعدادات إلغاء الطلب للسائق (للمدير فقط)
    """
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {
            "$set": {
                "driver_cancel_settings": {
                    "enabled": data.enabled,
                    "cancel_window_seconds": data.cancel_window_seconds,
                    "max_cancel_rate": data.max_cancel_rate,
                    "lookback_orders": data.lookback_orders,
                    "warning_threshold": data.warning_threshold,
                    "suspension_threshold": data.suspension_threshold,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                    "updated_by": user["id"]
                }
            }
        },
        upsert=True
    )
    
    return {
        "message": "تم تحديث إعدادات إلغاء السائق",
        "settings": data.model_dump()
    }

@router.get("/driver-cancel/stats")
async def get_driver_cancel_stats(user: dict = Depends(get_current_user)):
    """
    إحصائيات إلغاءات السائقين (للمدير)
    """
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # إجمالي الإلغاءات
    total_cancellations = await db.driver_cancellations.count_documents({})
    
    # إلغاءات اليوم
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_cancellations = await db.driver_cancellations.count_documents({
        "cancelled_at": {"$gte": today_start.isoformat()}
    })
    
    # إلغاءات هذا الأسبوع
    week_start = today_start - timedelta(days=today_start.weekday())
    week_cancellations = await db.driver_cancellations.count_documents({
        "cancelled_at": {"$gte": week_start.isoformat()}
    })
    
    # أكثر السائقين إلغاءً
    pipeline = [
        {"$group": {"_id": "$driver_id", "count": {"$sum": 1}, "driver_name": {"$first": "$driver_name"}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_cancellers = await db.driver_cancellations.aggregate(pipeline).to_list(length=10)
    
    # أكثر أسباب الإلغاء
    reasons_pipeline = [
        {"$group": {"_id": "$reason", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_reasons = await db.driver_cancellations.aggregate(reasons_pipeline).to_list(length=10)
    
    return {
        "total_cancellations": total_cancellations,
        "today_cancellations": today_cancellations,
        "week_cancellations": week_cancellations,
        "top_cancellers": [
            {"driver_id": c["_id"], "driver_name": c.get("driver_name", "غير معروف"), "count": c["count"]}
            for c in top_cancellers
        ],
        "top_reasons": [
            {"reason": r["_id"] or "بدون سبب", "count": r["count"]}
            for r in top_reasons
        ]
    }
