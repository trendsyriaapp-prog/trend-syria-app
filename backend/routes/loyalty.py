# /app/backend/routes/loyalty.py
# نظام نقاط الولاء

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
import uuid

from core.database import db, get_current_user

router = APIRouter(prefix="/loyalty", tags=["Loyalty"])

# إعدادات نظام الولاء
POINTS_PER_1000_SYP = 1  # نقطة واحدة لكل 1000 ل.س
POINTS_VALUE_SYP = 100   # قيمة النقطة عند الاستبدال: 100 ل.س
MIN_REDEEM_POINTS = 100  # الحد الأدنى للاستبدال: 100 نقطة

# مستويات الولاء
LOYALTY_TIERS = [
    {"name": "برونزي", "name_en": "bronze", "min_points": 0, "max_points": 499, "bonus_percent": 0, "color": "#CD7F32"},
    {"name": "فضي", "name_en": "silver", "min_points": 500, "max_points": 1999, "bonus_percent": 5, "color": "#C0C0C0"},
    {"name": "ذهبي", "name_en": "gold", "min_points": 2000, "max_points": 4999, "bonus_percent": 10, "color": "#FFD700"},
    {"name": "بلاتيني", "name_en": "platinum", "min_points": 5000, "max_points": 9999, "bonus_percent": 15, "color": "#E5E4E2"},
    {"name": "ماسي", "name_en": "diamond", "min_points": 10000, "max_points": float('inf'), "bonus_percent": 20, "color": "#B9F2FF"},
]

def get_tier(total_points: int) -> dict:
    """تحديد مستوى الولاء بناءً على النقاط"""
    for tier in LOYALTY_TIERS:
        if tier["min_points"] <= total_points <= tier["max_points"]:
            return tier
    return LOYALTY_TIERS[0]

def calculate_points(amount: float, tier: dict) -> int:
    """حساب النقاط المكتسبة من مبلغ معين"""
    base_points = int(amount / 1000) * POINTS_PER_1000_SYP
    bonus = int(base_points * (tier["bonus_percent"] / 100))
    return base_points + bonus

class RedeemPointsRequest(BaseModel):
    points: int

# الحصول على نقاط العميل
@router.get("/points")
async def get_loyalty_points(
    current_user: dict = Depends(get_current_user)
):
    """الحصول على نقاط الولاء الحالية"""
    
    user_id = current_user.get("id")
    
    # جلب أو إنشاء سجل الولاء
    loyalty = await db.loyalty.find_one({"user_id": user_id}, {"_id": 0})
    
    if not loyalty:
        loyalty = {
            "user_id": user_id,
            "total_points": 0,
            "available_points": 0,
            "lifetime_points": 0,
            "redeemed_points": 0,
            "created_at": datetime.utcnow()
        }
        await db.loyalty.insert_one(loyalty)
        loyalty.pop("_id", None)
    
    # تحديد المستوى الحالي والتالي
    current_tier = get_tier(loyalty.get("lifetime_points", 0))
    next_tier = None
    for tier in LOYALTY_TIERS:
        if tier["min_points"] > loyalty.get("lifetime_points", 0):
            next_tier = tier
            break
    
    points_to_next = 0
    if next_tier:
        points_to_next = next_tier["min_points"] - loyalty.get("lifetime_points", 0)
    
    return {
        "available_points": loyalty.get("available_points", 0),
        "lifetime_points": loyalty.get("lifetime_points", 0),
        "redeemed_points": loyalty.get("redeemed_points", 0),
        "current_tier": current_tier,
        "next_tier": next_tier,
        "points_to_next_tier": points_to_next,
        "points_value": POINTS_VALUE_SYP,
        "min_redeem": MIN_REDEEM_POINTS
    }

# سجل النقاط
@router.get("/history")
async def get_points_history(
    current_user: dict = Depends(get_current_user),
    limit: int = 20
):
    """سجل معاملات النقاط"""
    
    user_id = current_user.get("id")
    
    history = await db.loyalty_history.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    return history

# استبدال النقاط
@router.post("/redeem")
async def redeem_points(
    data: RedeemPointsRequest,
    current_user: dict = Depends(get_current_user)
):
    """استبدال النقاط بخصم"""
    
    user_id = current_user.get("id")
    points_to_redeem = data.points
    
    if points_to_redeem < MIN_REDEEM_POINTS:
        raise HTTPException(
            status_code=400, 
            detail=f"الحد الأدنى للاستبدال {MIN_REDEEM_POINTS} نقطة"
        )
    
    # جلب سجل الولاء
    loyalty = await db.loyalty.find_one({"user_id": user_id})
    if not loyalty:
        raise HTTPException(status_code=404, detail="لم يتم العثور على سجل الولاء")
    
    available = loyalty.get("available_points", 0)
    if points_to_redeem > available:
        raise HTTPException(
            status_code=400, 
            detail=f"رصيدك الحالي {available} نقطة فقط"
        )
    
    # حساب قيمة الخصم
    discount_value = points_to_redeem * POINTS_VALUE_SYP
    
    # إنشاء كوبون خصم
    coupon_code = f"LOYALTY{uuid.uuid4().hex[:8].upper()}"
    
    discount = {
        "id": str(uuid.uuid4()),
        "seller_id": "platform",  # خصم من المنصة
        "seller_name": "ترند سورية",
        "name": f"استبدال {points_to_redeem} نقطة",
        "discount_type": "fixed",
        "discount_value": discount_value,
        "code": coupon_code,
        "applies_to": "all",
        "product_ids": [],
        "category": None,
        "min_order_amount": 0,
        "max_uses": 1,
        "used_count": 0,
        "start_date": datetime.utcnow(),
        "end_date": datetime(2099, 12, 31),  # صالح لفترة طويلة
        "is_active": True,
        "is_loyalty_reward": True,
        "created_at": datetime.utcnow()
    }
    
    await db.discounts.insert_one(discount)
    
    # تحديث نقاط المستخدم
    await db.loyalty.update_one(
        {"user_id": user_id},
        {
            "$inc": {
                "available_points": -points_to_redeem,
                "redeemed_points": points_to_redeem
            }
        }
    )
    
    # تسجيل في السجل
    history_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "redeem",
        "points": -points_to_redeem,
        "description": f"استبدال {points_to_redeem} نقطة بخصم {discount_value:,} ل.س",
        "reference_id": discount["id"],
        "created_at": datetime.utcnow()
    }
    await db.loyalty_history.insert_one(history_entry)
    
    return {
        "message": "تم استبدال النقاط بنجاح",
        "points_redeemed": points_to_redeem,
        "discount_value": discount_value,
        "coupon_code": coupon_code,
        "remaining_points": available - points_to_redeem
    }

# مستويات الولاء
@router.get("/tiers")
async def get_loyalty_tiers():
    """الحصول على مستويات الولاء"""
    return LOYALTY_TIERS

# إعدادات نظام الولاء
@router.get("/settings")
async def get_loyalty_settings():
    """إعدادات نظام الولاء"""
    return {
        "points_per_1000_syp": POINTS_PER_1000_SYP,
        "points_value_syp": POINTS_VALUE_SYP,
        "min_redeem_points": MIN_REDEEM_POINTS,
        "tiers": LOYALTY_TIERS
    }

# === دالة مساعدة لإضافة النقاط (تُستدعى من orders.py) ===
async def add_loyalty_points(user_id: str, order_total: float, order_id: str):
    """إضافة نقاط ولاء بعد إتمام الطلب"""
    
    # جلب أو إنشاء سجل الولاء
    loyalty = await db.loyalty.find_one({"user_id": user_id})
    
    if not loyalty:
        loyalty = {
            "user_id": user_id,
            "total_points": 0,
            "available_points": 0,
            "lifetime_points": 0,
            "redeemed_points": 0,
            "created_at": datetime.utcnow()
        }
        await db.loyalty.insert_one(loyalty)
    
    # حساب المستوى الحالي
    current_tier = get_tier(loyalty.get("lifetime_points", 0))
    
    # حساب النقاط المكتسبة
    points_earned = calculate_points(order_total, current_tier)
    
    if points_earned <= 0:
        return 0
    
    # تحديث النقاط
    await db.loyalty.update_one(
        {"user_id": user_id},
        {
            "$inc": {
                "total_points": points_earned,
                "available_points": points_earned,
                "lifetime_points": points_earned
            }
        }
    )
    
    # تسجيل في السجل
    bonus_text = f" (+{current_tier['bonus_percent']}% بونص {current_tier['name']})" if current_tier['bonus_percent'] > 0 else ""
    history_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "earn",
        "points": points_earned,
        "description": f"طلب #{order_id[:8]}: +{points_earned} نقطة{bonus_text}",
        "reference_id": order_id,
        "created_at": datetime.utcnow()
    }
    await db.loyalty_history.insert_one(history_entry)
    
    return points_earned
