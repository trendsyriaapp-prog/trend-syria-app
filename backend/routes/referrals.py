# /app/backend/routes/referrals.py
# نظام الإحالات - دعوة الأصدقاء والحصول على مكافآت

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import Optional
import uuid
import random
import string

from core.database import db, get_current_user

router = APIRouter(prefix="/referrals", tags=["Referrals"])


# ===============================
# توليد كود الإحالة
# ===============================

def generate_referral_code(length=8):
    """توليد كود إحالة فريد"""
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    return ''.join(random.choice(chars) for _ in range(length))


async def get_or_create_referral_code(user_id: str, user_name: str) -> str:
    """جلب أو إنشاء كود إحالة للمستخدم"""
    # البحث عن كود موجود
    existing = await db.referral_codes.find_one({"user_id": user_id})
    if existing:
        return existing["code"]
    
    # إنشاء كود جديد
    while True:
        code = generate_referral_code()
        # التأكد من أن الكود فريد
        if not await db.referral_codes.find_one({"code": code}):
            break
    
    now = datetime.now(timezone.utc).isoformat()
    
    referral_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user_name,
        "code": code,
        "total_referrals": 0,
        "successful_referrals": 0,
        "total_earnings": 0,
        "created_at": now
    }
    
    await db.referral_codes.insert_one(referral_doc)
    return code


# ===============================
# APIs للمستخدمين
# ===============================

@router.get("/my-code")
async def get_my_referral_code(user: dict = Depends(get_current_user)):
    """جلب كود الإحالة الخاص بي"""
    code = await get_or_create_referral_code(user["id"], user.get("name", ""))
    
    # جلب الإحصائيات
    referral_data = await db.referral_codes.find_one(
        {"user_id": user["id"]},
        {"_id": 0}
    )
    
    # جلب إعدادات المكافآت
    settings = await db.platform_settings.find_one({"id": "referral"}, {"_id": 0})
    if not settings:
        settings = {
            "referrer_reward": 10000,  # مكافأة المُحيل
            "referee_discount": 20,     # خصم المُحال (نسبة مئوية)
            "min_order_for_reward": 30000  # الحد الأدنى للطلب لاحتساب الإحالة
        }
    
    return {
        "code": code,
        "share_link": f"https://trendsyria.com/register?ref={code}",
        "stats": {
            "total_referrals": referral_data.get("total_referrals", 0),
            "successful_referrals": referral_data.get("successful_referrals", 0),
            "total_earnings": referral_data.get("total_earnings", 0)
        },
        "rewards": {
            "you_get": settings.get("referrer_reward", 10000),
            "friend_gets": f"{settings.get('referee_discount', 20)}% خصم على أول طلب"
        }
    }


@router.get("/my-referrals")
async def get_my_referrals(user: dict = Depends(get_current_user)):
    """جلب قائمة الأشخاص الذين أحلتهم"""
    referrals = await db.referrals.find(
        {"referrer_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return referrals


@router.post("/validate-code")
async def validate_referral_code(data: dict):
    """التحقق من صحة كود الإحالة (للتسجيل)"""
    code = data.get("code", "").strip().upper()
    
    if not code:
        raise HTTPException(status_code=400, detail="كود الإحالة مطلوب")
    
    referral = await db.referral_codes.find_one({"code": code})
    if not referral:
        raise HTTPException(status_code=404, detail="كود الإحالة غير صحيح")
    
    # جلب إعدادات المكافآت
    settings = await db.platform_settings.find_one({"id": "referral"}, {"_id": 0})
    referee_discount = settings.get("referee_discount", 20) if settings else 20
    
    return {
        "valid": True,
        "referrer_name": referral.get("user_name", "صديق"),
        "discount": f"{referee_discount}% خصم على أول طلب"
    }


@router.post("/apply")
async def apply_referral(data: dict, user: dict = Depends(get_current_user)):
    """تطبيق كود الإحالة على حساب جديد"""
    code = data.get("code", "").strip().upper()
    
    if not code:
        raise HTTPException(status_code=400, detail="كود الإحالة مطلوب")
    
    # التحقق من أن المستخدم جديد (لم يطلب من قبل)
    previous_orders = await db.food_orders.count_documents({
        "customer_id": user["id"],
        "status": "delivered"
    })
    shop_orders = await db.orders.count_documents({
        "user_id": user["id"],
        "status": "delivered"
    })
    
    if previous_orders > 0 or shop_orders > 0:
        raise HTTPException(status_code=400, detail="كود الإحالة متاح فقط للعملاء الجدد")
    
    # التحقق من عدم استخدام كود إحالة مسبقاً
    existing_referral = await db.referrals.find_one({"referee_id": user["id"]})
    if existing_referral:
        raise HTTPException(status_code=400, detail="لقد استخدمت كود إحالة مسبقاً")
    
    # التحقق من الكود
    referral_code = await db.referral_codes.find_one({"code": code})
    if not referral_code:
        raise HTTPException(status_code=404, detail="كود الإحالة غير صحيح")
    
    # لا يمكن استخدام كود نفسك
    if referral_code["user_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="لا يمكنك استخدام كود الإحالة الخاص بك")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # جلب إعدادات المكافآت
    settings = await db.platform_settings.find_one({"id": "referral"}, {"_id": 0})
    referee_discount = settings.get("referee_discount", 20) if settings else 20
    
    # إنشاء سجل الإحالة
    referral_doc = {
        "id": str(uuid.uuid4()),
        "referrer_id": referral_code["user_id"],
        "referrer_name": referral_code.get("user_name", ""),
        "referee_id": user["id"],
        "referee_name": user.get("name", ""),
        "referee_phone": user.get("phone", ""),
        "code_used": code,
        "status": "pending",  # pending, completed, expired
        "referee_discount": referee_discount,
        "referrer_reward": 0,  # سيتم تحديثها عند أول طلب
        "created_at": now
    }
    
    await db.referrals.insert_one(referral_doc)
    
    # تحديث إحصائيات المُحيل
    await db.referral_codes.update_one(
        {"code": code},
        {"$inc": {"total_referrals": 1}}
    )
    
    # إنشاء كوبون خصم للمستخدم الجديد
    coupon_code = f"REF{user['id'][:8].upper()}"
    coupon = {
        "id": str(uuid.uuid4()),
        "code": coupon_code,
        "name": f"كوبون إحالة من {referral_code.get('user_name', 'صديق')}",
        "description": "خصم على أول طلب بفضل صديقك",
        "coupon_type": "percentage",
        "coupon_type_label": "نسبة مئوية",
        "discount_percentage": referee_discount,
        "discount_amount": 0,
        "max_discount": 25000,  # حد أقصى للخصم
        "min_order_amount": 20000,
        "scope": "all",
        "scope_ids": [],
        "start_date": None,
        "end_date": None,
        "max_uses": 1,
        "max_uses_per_user": 1,
        "new_customers_only": True,
        "is_active": True,
        "usage_count": 0,
        "total_discount_given": 0,
        "referral_code": code,
        "created_by": "system",
        "created_at": now,
        "updated_at": now
    }
    
    await db.coupons.insert_one(coupon)
    
    # إشعار للمستخدم
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": "🎁 مرحباً بك!",
        "message": f"حصلت على كوبون {referee_discount}% خصم بفضل صديقك. استخدم الكود: {coupon_code}",
        "type": "referral_welcome",
        "is_read": False,
        "created_at": now
    })
    
    return {
        "message": f"تم تطبيق كود الإحالة! حصلت على {referee_discount}% خصم",
        "coupon_code": coupon_code,
        "discount": referee_discount
    }


# ===============================
# معالجة مكافأة المُحيل عند إتمام طلب
# ===============================

async def process_referral_reward(user_id: str, order_total: float):
    """معالجة مكافأة المُحيل عند إتمام أول طلب للمُحال"""
    # البحث عن إحالة معلقة
    referral = await db.referrals.find_one({
        "referee_id": user_id,
        "status": "pending"
    })
    
    if not referral:
        return None
    
    # جلب إعدادات المكافآت
    settings = await db.platform_settings.find_one({"id": "referral"}, {"_id": 0})
    referrer_reward = settings.get("referrer_reward", 10000) if settings else 10000
    min_order = settings.get("min_order_for_reward", 30000) if settings else 30000
    
    # التحقق من الحد الأدنى للطلب
    if order_total < min_order:
        return None
    
    now = datetime.now(timezone.utc).isoformat()
    
    # تحديث حالة الإحالة
    await db.referrals.update_one(
        {"id": referral["id"]},
        {
            "$set": {
                "status": "completed",
                "referrer_reward": referrer_reward,
                "completed_at": now
            }
        }
    )
    
    # تحديث إحصائيات المُحيل
    await db.referral_codes.update_one(
        {"user_id": referral["referrer_id"]},
        {
            "$inc": {
                "successful_referrals": 1,
                "total_earnings": referrer_reward
            }
        }
    )
    
    # إضافة المكافأة لمحفظة المُحيل
    wallet = await db.wallets.find_one({"user_id": referral["referrer_id"]})
    if wallet:
        await db.wallets.update_one(
            {"user_id": referral["referrer_id"]},
            {"$inc": {"balance": referrer_reward}}
        )
        
        # تسجيل المعاملة
        transaction = {
            "id": str(uuid.uuid4()),
            "wallet_id": wallet["id"],
            "user_id": referral["referrer_id"],
            "type": "referral_reward",
            "amount": referrer_reward,
            "description": f"مكافأة إحالة: {referral.get('referee_name', 'صديق')} أكمل أول طلب",
            "created_at": now
        }
        await db.wallet_transactions.insert_one(transaction)
    
    # إشعار للمُحيل
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": referral["referrer_id"],
        "title": "🎉 مكافأة إحالة!",
        "message": f"تهانينا! {referral.get('referee_name', 'صديقك')} أكمل أول طلب. حصلت على {referrer_reward:,} ل.س في محفظتك!",
        "type": "referral_reward",
        "is_read": False,
        "created_at": now
    })
    
    return referrer_reward


# ===============================
# APIs للمدير
# ===============================

@router.get("/admin/stats")
async def get_referral_stats(user: dict = Depends(get_current_user)):
    """إحصائيات نظام الإحالات للمدير"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    total_codes = await db.referral_codes.count_documents({})
    total_referrals = await db.referrals.count_documents({})
    completed_referrals = await db.referrals.count_documents({"status": "completed"})
    pending_referrals = await db.referrals.count_documents({"status": "pending"})
    
    # إجمالي المكافآت
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$referrer_reward"}}}
    ]
    result = await db.referrals.aggregate(pipeline).to_list(1)
    total_rewards = result[0]["total"] if result else 0
    
    # أفضل المُحيلين
    top_referrers = await db.referral_codes.find(
        {"successful_referrals": {"$gt": 0}},
        {"_id": 0}
    ).sort("successful_referrals", -1).limit(10).to_list(None)
    
    return {
        "stats": {
            "total_codes": total_codes,
            "total_referrals": total_referrals,
            "completed_referrals": completed_referrals,
            "pending_referrals": pending_referrals,
            "conversion_rate": round((completed_referrals / total_referrals * 100) if total_referrals > 0 else 0, 1),
            "total_rewards_given": total_rewards
        },
        "top_referrers": top_referrers
    }


@router.get("/admin/settings")
async def get_referral_settings(user: dict = Depends(get_current_user)):
    """جلب إعدادات نظام الإحالات"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    settings = await db.platform_settings.find_one({"id": "referral"}, {"_id": 0})
    
    if not settings:
        settings = {
            "id": "referral",
            "referrer_reward": 10000,
            "referee_discount": 20,
            "max_referee_discount": 25000,
            "min_order_for_reward": 30000,
            "is_active": True
        }
    
    return settings


@router.put("/admin/settings")
async def update_referral_settings(data: dict, user: dict = Depends(get_current_user)):
    """تحديث إعدادات نظام الإحالات"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    allowed_fields = [
        "referrer_reward", "referee_discount", "max_referee_discount",
        "min_order_for_reward", "is_active"
    ]
    
    update = {k: v for k, v in data.items() if k in allowed_fields}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_by"] = user["id"]
    
    await db.platform_settings.update_one(
        {"id": "referral"},
        {"$set": update},
        upsert=True
    )
    
    return {"message": "تم تحديث الإعدادات"}



@router.get("/status")
async def get_referral_status():
    """
    التحقق من حالة تفعيل نظام الإحالات (للواجهة)
    هذا الـ endpoint عام ولا يتطلب تسجيل دخول
    """
    settings = await db.platform_settings.find_one({"id": "referral"}, {"_id": 0})
    
    if not settings:
        # القيم الافتراضية
        return {
            "is_active": True,
            "referrer_reward": 10000,
            "referee_discount": 20
        }
    
    return {
        "is_active": settings.get("is_active", True),
        "referrer_reward": settings.get("referrer_reward", 10000),
        "referee_discount": settings.get("referee_discount", 20)
    }
