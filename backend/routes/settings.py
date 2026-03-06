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
