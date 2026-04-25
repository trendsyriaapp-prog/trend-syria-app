# /app/backend/routes/challenges.py
# نظام التحديات والمكافآت للسائقين

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid

from core.database import db, get_current_user, get_current_admin, create_notification_for_user
from helpers.datetime_helpers import get_now

router = APIRouter(prefix="/challenges", tags=["Challenges"])

# ============== Models ==============

class ChallengeCreate(BaseModel):
    title: str
    description: str
    challenge_type: str  # weekly, monthly, special
    target_orders: int
    reward_amount: float
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: bool = True

class ChallengeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_orders: Optional[int] = None
    reward_amount: Optional[float] = None
    is_active: Optional[bool] = None

# ============== Admin Endpoints ==============

@router.post("/admin/create")
async def create_challenge(challenge: ChallengeCreate, admin: dict = Depends(get_current_admin)) -> dict:
    """إنشاء تحدي جديد"""
    
    now = datetime.now(timezone.utc)
    
    # حساب تواريخ البداية والنهاية تلقائياً إذا لم تُحدد
    if challenge.challenge_type == "weekly":
        # بداية الأسبوع القادم
        days_until_saturday = (5 - now.weekday()) % 7
        if days_until_saturday == 0:
            days_until_saturday = 7
        start = now + timedelta(days=days_until_saturday)
        start = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)
        end = start + timedelta(days=7)
    elif challenge.challenge_type == "monthly":
        # بداية الشهر القادم
        if now.month == 12:
            start = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
            end = datetime(now.year + 1, 2, 1, tzinfo=timezone.utc)
        else:
            start = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
            if now.month + 1 == 12:
                end = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                end = datetime(now.year, now.month + 2, 1, tzinfo=timezone.utc)
    else:
        # تحدي خاص - استخدم التواريخ المُدخلة
        start = datetime.fromisoformat(challenge.start_date) if challenge.start_date else now
        end = datetime.fromisoformat(challenge.end_date) if challenge.end_date else now + timedelta(days=7)
    
    challenge_doc = {
        "id": str(uuid.uuid4()),
        "title": challenge.title,
        "description": challenge.description,
        "challenge_type": challenge.challenge_type,
        "target_orders": challenge.target_orders,
        "reward_amount": challenge.reward_amount,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "is_active": challenge.is_active,
        "created_by": admin["id"],
        "created_at": now.isoformat(),
        "participants": [],  # قائمة المشاركين
        "completions": []    # قائمة من أكمل التحدي
    }
    
    await db.challenges.insert_one(challenge_doc)
    
    # إرسال إشعار لجميع موظفي التوصيل
    delivery_users = await db.users.find({"user_type": "delivery"}).to_list(1000)
    for user in delivery_users:
        await create_notification_for_user(
            user_id=user["id"],
            title="تحدي جديد! 🎯",
            message=f"{challenge.title} - اربح {challenge.reward_amount:,.0f} ل.س",
            notification_type="challenge"
        )
    
    return {"message": "تم إنشاء التحدي بنجاح", "challenge_id": challenge_doc["id"]}

@router.get("/admin/all")
async def get_all_challenges(admin: dict = Depends(get_current_admin)) -> dict:
    """جلب جميع التحديات للمدير"""
    challenges = await db.challenges.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # إضافة إحصائيات لكل تحدي
    for challenge in challenges:
        challenge["participants_count"] = len(challenge.get("participants", []))
        challenge["completions_count"] = len(challenge.get("completions", []))
        challenge["total_rewards_paid"] = challenge["completions_count"] * challenge["reward_amount"]
    
    # الإحصائيات العامة
    stats = {
        "total_challenges": len(challenges),
        "active_challenges": len([c for c in challenges if c.get("is_active")]),
        "total_completions": sum(len(c.get("completions", [])) for c in challenges),
        "total_rewards_paid": sum(len(c.get("completions", [])) * c.get("reward_amount", 0) for c in challenges)
    }
    
    return {"challenges": challenges, "stats": stats}

@router.put("/admin/{challenge_id}")
async def update_challenge(challenge_id: str, data: ChallengeUpdate, admin: dict = Depends(get_current_admin)) -> dict:
    """تحديث تحدي"""
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
    
    result = await db.challenges.update_one(
        {"id": challenge_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="التحدي غير موجود")
    
    return {"message": "تم تحديث التحدي"}

@router.delete("/admin/{challenge_id}")
async def delete_challenge(challenge_id: str, admin: dict = Depends(get_current_admin)) -> dict:
    """حذف تحدي"""
    result = await db.challenges.delete_one({"id": challenge_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="التحدي غير موجود")
    
    return {"message": "تم حذف التحدي"}

# ============== Driver Endpoints ==============

@router.get("/active")
async def get_active_challenges(user: dict = Depends(get_current_user)) -> dict:
    """جلب التحديات النشطة للسائق"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    now = get_now()
    
    # التحديات النشطة التي لم تنتهِ بعد
    challenges = await db.challenges.find(
        {
            "is_active": True,
            "end_date": {"$gt": now}
        },
        {"_id": 0}
    ).sort("end_date", 1).to_list(20)
    
    # إضافة تقدم السائق في كل تحدي
    for challenge in challenges:
        start_date = challenge["start_date"]
        end_date = challenge["end_date"]
        
        # حساب عدد الطلبات المسلمة خلال فترة التحدي
        driver_orders = await db.orders.count_documents({
            "delivery_driver_id": user["id"],
            "delivery_status": "delivered",
            "delivered_at": {
                "$gte": start_date,
                "$lt": end_date
            }
        })
        
        challenge["my_progress"] = {
            "completed_orders": driver_orders,
            "target_orders": challenge["target_orders"],
            "progress_percent": min(100, round((driver_orders / challenge["target_orders"]) * 100, 1)),
            "remaining_orders": max(0, challenge["target_orders"] - driver_orders),
            "is_completed": driver_orders >= challenge["target_orders"],
            "is_claimed": user["id"] in challenge.get("completions", [])
        }
        
        # حساب الوقت المتبقي
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        now_dt = datetime.now(timezone.utc)
        remaining = end_dt - now_dt
        challenge["time_remaining"] = {
            "days": max(0, remaining.days),
            "hours": max(0, remaining.seconds // 3600),
            "is_ending_soon": remaining.days < 2
        }
    
    return challenges

@router.post("/claim/{challenge_id}")
async def claim_challenge_reward(challenge_id: str, user: dict = Depends(get_current_user)) -> dict:
    """المطالبة بمكافأة التحدي"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    challenge = await db.challenges.find_one({"id": challenge_id}, {"_id": 0})
    if not challenge:
        raise HTTPException(status_code=404, detail="التحدي غير موجود")
    
    # التحقق من عدم المطالبة سابقاً
    if user["id"] in challenge.get("completions", []):
        raise HTTPException(status_code=400, detail="لقد حصلت على هذه المكافأة مسبقاً")
    
    # التحقق من إكمال التحدي
    driver_orders = await db.orders.count_documents({
        "delivery_driver_id": user["id"],
        "delivery_status": "delivered",
        "delivered_at": {
            "$gte": challenge["start_date"],
            "$lt": challenge["end_date"]
        }
    })
    
    if driver_orders < challenge["target_orders"]:
        raise HTTPException(
            status_code=400, 
            detail=f"لم تكمل التحدي بعد. أكملت {driver_orders} من {challenge['target_orders']} طلب"
        )
    
    now = get_now()
    
    # إضافة المكافأة للمحفظة
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_type": "delivery",
        "type": "challenge_reward",
        "amount": challenge["reward_amount"],
        "description": f"مكافأة تحدي: {challenge['title']}",
        "challenge_id": challenge_id,
        "created_at": now
    })
    
    # تحديث رصيد المحفظة
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"wallet_balance": challenge["reward_amount"]}}
    )
    
    # تسجيل الإكمال
    await db.challenges.update_one(
        {"id": challenge_id},
        {
            "$addToSet": {
                "completions": user["id"],
                "participants": user["id"]
            }
        }
    )
    
    # إرسال إشعار
    await create_notification_for_user(
        user_id=user["id"],
        title="تهانينا! 🎉",
        message=f"حصلت على {challenge['reward_amount']:,.0f} ل.س لإكمال تحدي {challenge['title']}",
        notification_type="reward"
    )
    
    return {
        "message": "تهانينا! تم إضافة المكافأة لمحفظتك",
        "reward_amount": challenge["reward_amount"]
    }

@router.get("/my-history")
async def get_my_challenge_history(user: dict = Depends(get_current_user)) -> dict:
    """سجل تحدياتي"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # التحديات التي شارك فيها أو أكملها
    challenges = await db.challenges.find(
        {"$or": [
            {"participants": user["id"]},
            {"completions": user["id"]}
        ]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    completed = []
    participated = []
    
    for challenge in challenges:
        if user["id"] in challenge.get("completions", []):
            completed.append(challenge)
        else:
            participated.append(challenge)
    
    total_rewards = len(completed) * sum(c.get("reward_amount", 0) for c in completed) if completed else 0
    
    return {
        "completed": completed,
        "participated": participated,
        "stats": {
            "total_completed": len(completed),
            "total_participated": len(participated),
            "total_rewards_earned": total_rewards
        }
    }
