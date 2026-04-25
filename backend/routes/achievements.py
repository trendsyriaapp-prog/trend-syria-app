# /app/backend/routes/achievements.py
# نظام الإنجازات والشارات للسائقين

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta

from core.database import db, get_current_user, create_notification_for_user
from helpers.datetime_helpers import get_now

router = APIRouter(prefix="/achievements", tags=["Achievements"])

# ============== تعريف الإنجازات ==============

ACHIEVEMENTS = {
    # إنجازات عدد الطلبات
    "first_delivery": {
        "id": "first_delivery",
        "title": "أول توصيل",
        "description": "أكمل أول طلب توصيل",
        "icon": "🚀",
        "category": "orders",
        "requirement": {"type": "total_orders", "value": 1},
        "reward": 1000,
        "rarity": "common"
    },
    "orders_10": {
        "id": "orders_10",
        "title": "سائق نشيط",
        "description": "أكمل 10 طلبات توصيل",
        "icon": "⭐",
        "category": "orders",
        "requirement": {"type": "total_orders", "value": 10},
        "reward": 5000,
        "rarity": "common"
    },
    "orders_50": {
        "id": "orders_50",
        "title": "سائق محترف",
        "description": "أكمل 50 طلب توصيل",
        "icon": "🌟",
        "category": "orders",
        "requirement": {"type": "total_orders", "value": 50},
        "reward": 15000,
        "rarity": "uncommon"
    },
    "orders_100": {
        "id": "orders_100",
        "title": "سائق خبير",
        "description": "أكمل 100 طلب توصيل",
        "icon": "💫",
        "category": "orders",
        "requirement": {"type": "total_orders", "value": 100},
        "reward": 30000,
        "rarity": "rare"
    },
    "orders_500": {
        "id": "orders_500",
        "title": "سائق أسطوري",
        "description": "أكمل 500 طلب توصيل",
        "icon": "👑",
        "category": "orders",
        "requirement": {"type": "total_orders", "value": 500},
        "reward": 100000,
        "rarity": "legendary"
    },
    
    # إنجازات التقييم
    "perfect_rating_5": {
        "id": "perfect_rating_5",
        "title": "خدمة ممتازة",
        "description": "احصل على تقييم 5 نجوم في 5 طلبات متتالية",
        "icon": "⭐",
        "category": "rating",
        "requirement": {"type": "consecutive_5_star", "value": 5},
        "reward": 10000,
        "rarity": "uncommon"
    },
    "perfect_rating_10": {
        "id": "perfect_rating_10",
        "title": "نجم الخدمة",
        "description": "احصل على تقييم 5 نجوم في 10 طلبات متتالية",
        "icon": "🌟",
        "category": "rating",
        "requirement": {"type": "consecutive_5_star", "value": 10},
        "reward": 25000,
        "rarity": "rare"
    },
    "perfect_rating_25": {
        "id": "perfect_rating_25",
        "title": "أسطورة الخدمة",
        "description": "احصل على تقييم 5 نجوم في 25 طلب متتالي",
        "icon": "💎",
        "category": "rating",
        "requirement": {"type": "consecutive_5_star", "value": 25},
        "reward": 50000,
        "rarity": "legendary"
    },
    "high_average": {
        "id": "high_average",
        "title": "سمعة ذهبية",
        "description": "حافظ على معدل تقييم 4.8+ مع 50 تقييم على الأقل",
        "icon": "🏆",
        "category": "rating",
        "requirement": {"type": "avg_rating", "value": 4.8, "min_ratings": 50},
        "reward": 40000,
        "rarity": "rare"
    },
    
    # إنجازات السرعة
    "speed_demon": {
        "id": "speed_demon",
        "title": "البرق",
        "description": "أكمل 10 طلبات في يوم واحد",
        "icon": "⚡",
        "category": "speed",
        "requirement": {"type": "daily_orders", "value": 10},
        "reward": 15000,
        "rarity": "uncommon"
    },
    "weekly_champion": {
        "id": "weekly_champion",
        "title": "بطل الأسبوع",
        "description": "أكمل 50 طلب في أسبوع واحد",
        "icon": "🏅",
        "category": "speed",
        "requirement": {"type": "weekly_orders", "value": 50},
        "reward": 30000,
        "rarity": "rare"
    },
    "monthly_king": {
        "id": "monthly_king",
        "title": "ملك الشهر",
        "description": "أكمل 150 طلب في شهر واحد",
        "icon": "👑",
        "category": "speed",
        "requirement": {"type": "monthly_orders", "value": 150},
        "reward": 75000,
        "rarity": "legendary"
    },
    
    # إنجازات الولاء
    "first_week": {
        "id": "first_week",
        "title": "أسبوع الانطلاق",
        "description": "أكمل أسبوعك الأول كسائق",
        "icon": "📅",
        "category": "loyalty",
        "requirement": {"type": "days_active", "value": 7},
        "reward": 5000,
        "rarity": "common"
    },
    "first_month": {
        "id": "first_month",
        "title": "شهر النجاح",
        "description": "أكمل شهرك الأول كسائق",
        "icon": "🗓️",
        "category": "loyalty",
        "requirement": {"type": "days_active", "value": 30},
        "reward": 20000,
        "rarity": "uncommon"
    },
    "veteran": {
        "id": "veteran",
        "title": "سائق مخضرم",
        "description": "أكمل 6 أشهر كسائق",
        "icon": "🎖️",
        "category": "loyalty",
        "requirement": {"type": "days_active", "value": 180},
        "reward": 50000,
        "rarity": "rare"
    },
    
    # إنجازات خاصة
    "early_bird": {
        "id": "early_bird",
        "title": "الطائر المبكر",
        "description": "أكمل 10 طلبات قبل الساعة 10 صباحاً",
        "icon": "🌅",
        "category": "special",
        "requirement": {"type": "early_deliveries", "value": 10},
        "reward": 10000,
        "rarity": "uncommon"
    },
    "night_owl": {
        "id": "night_owl",
        "title": "بومة الليل",
        "description": "أكمل 10 طلبات بعد الساعة 6 مساءً",
        "icon": "🦉",
        "category": "special",
        "requirement": {"type": "late_deliveries", "value": 10},
        "reward": 10000,
        "rarity": "uncommon"
    },
    "all_cities": {
        "id": "all_cities",
        "title": "مستكشف سوريا",
        "description": "قم بالتوصيل في 5 مدن مختلفة",
        "icon": "🗺️",
        "category": "special",
        "requirement": {"type": "unique_cities", "value": 5},
        "reward": 25000,
        "rarity": "rare"
    }
}

# ============== API Endpoints ==============

@router.get("/my-achievements")
async def get_my_achievements(user: dict = Depends(get_current_user)) -> dict:
    """جلب إنجازات السائق"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # جلب الإنجازات المحفوظة
    saved_achievements = await db.driver_achievements.find(
        {"driver_id": user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    unlocked_ids = {a["achievement_id"] for a in saved_achievements}
    
    # حساب التقدم لكل إنجاز
    progress_data = await calculate_progress(user["id"])
    
    achievements_list = []
    for ach_id, ach_data in ACHIEVEMENTS.items():
        is_unlocked = ach_id in unlocked_ids
        unlocked_at = None
        if is_unlocked:
            saved = next((a for a in saved_achievements if a["achievement_id"] == ach_id), None)
            unlocked_at = saved.get("unlocked_at") if saved else None
        
        progress = progress_data.get(ach_id, {"current": 0, "target": ach_data["requirement"]["value"], "percent": 0})
        
        achievements_list.append({
            **ach_data,
            "is_unlocked": is_unlocked,
            "unlocked_at": unlocked_at,
            "progress": progress
        })
    
    # ترتيب: المفتوحة أولاً، ثم بالتقدم
    achievements_list.sort(key=lambda x: (not x["is_unlocked"], -x["progress"]["percent"]))
    
    # إحصائيات
    total_unlocked = len(unlocked_ids)
    total_achievements = len(ACHIEVEMENTS)
    total_rewards = sum(ACHIEVEMENTS[aid]["reward"] for aid in unlocked_ids)
    
    return {
        "achievements": achievements_list,
        "stats": {
            "total_unlocked": total_unlocked,
            "total_achievements": total_achievements,
            "completion_percent": round((total_unlocked / total_achievements) * 100, 1),
            "total_rewards_earned": total_rewards
        },
        "categories": {
            "orders": {"name": "الطلبات", "icon": "📦"},
            "rating": {"name": "التقييمات", "icon": "⭐"},
            "speed": {"name": "السرعة", "icon": "⚡"},
            "loyalty": {"name": "الولاء", "icon": "❤️"},
            "special": {"name": "خاصة", "icon": "🎯"}
        }
    }

@router.post("/check-and-unlock")
async def check_and_unlock_achievements(user: dict = Depends(get_current_user)) -> dict:
    """فحص وفتح الإنجازات الجديدة"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # جلب الإنجازات المحفوظة
    saved_achievements = await db.driver_achievements.find(
        {"driver_id": user["id"]},
        {"_id": 0, "achievement_id": 1}
    ).to_list(100)
    
    unlocked_ids = {a["achievement_id"] for a in saved_achievements}
    
    # حساب التقدم
    progress_data = await calculate_progress(user["id"])
    
    # فحص الإنجازات الجديدة
    new_unlocked = []
    now = get_now()
    
    for ach_id, ach_data in ACHIEVEMENTS.items():
        if ach_id in unlocked_ids:
            continue
        
        progress = progress_data.get(ach_id, {"current": 0, "target": 1, "percent": 0})
        
        if progress["percent"] >= 100:
            # فتح الإنجاز
            await db.driver_achievements.insert_one({
                "driver_id": user["id"],
                "achievement_id": ach_id,
                "unlocked_at": now
            })
            
            # إضافة المكافأة للمحفظة
            if ach_data["reward"] > 0:
                await db.wallet_transactions.insert_one({
                    "id": f"ach_{ach_id}_{user['id']}",
                    "user_id": user["id"],
                    "user_type": "delivery",
                    "type": "achievement_reward",
                    "amount": ach_data["reward"],
                    "description": f"مكافأة إنجاز: {ach_data['title']}",
                    "achievement_id": ach_id,
                    "created_at": now
                })
                
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$inc": {"wallet_balance": ach_data["reward"]}}
                )
            
            # إرسال إشعار
            await create_notification_for_user(
                user_id=user["id"],
                title=f"إنجاز جديد! {ach_data['icon']}",
                message=f"حصلت على إنجاز '{ach_data['title']}' ومكافأة {ach_data['reward']:,} ل.س",
                notification_type="achievement"
            )
            
            new_unlocked.append({
                **ach_data,
                "unlocked_at": now
            })
    
    return {
        "new_unlocked": new_unlocked,
        "count": len(new_unlocked)
    }

async def _fetch_driver_stats(driver_id: str, now: datetime) -> dict:
    """جلب إحصائيات السائق الأساسية"""
    # إجمالي الطلبات المُسلّمة
    total_orders = await db.orders.count_documents({
        "delivery_driver_id": driver_id,
        "delivery_status": "delivered"
    })
    
    # التقييمات
    ratings = await db.driver_ratings.find(
        {"driver_id": driver_id},
        {"_id": 0, "rating": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(1000)
    
    avg_rating = round(sum(r["rating"] for r in ratings) / len(ratings), 2) if ratings else 0
    total_ratings = len(ratings)
    
    # حساب التقييمات المتتالية 5 نجوم
    consecutive_5_star = 0
    for r in ratings:
        if r["rating"] == 5:
            consecutive_5_star += 1
        else:
            break
    
    return {
        "total_orders": total_orders,
        "avg_rating": avg_rating,
        "total_ratings": total_ratings,
        "consecutive_5_star": consecutive_5_star
    }


async def _fetch_time_based_orders(driver_id: str, now: datetime) -> dict:
    """جلب عدد الطلبات حسب الفترة الزمنية"""
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    
    daily_orders = await db.orders.count_documents({
        "delivery_driver_id": driver_id,
        "delivery_status": "delivered",
        "delivered_at": {"$gte": today_start.isoformat()}
    })
    
    week_start = today_start - timedelta(days=now.weekday())
    weekly_orders = await db.orders.count_documents({
        "delivery_driver_id": driver_id,
        "delivery_status": "delivered",
        "delivered_at": {"$gte": week_start.isoformat()}
    })
    
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    monthly_orders = await db.orders.count_documents({
        "delivery_driver_id": driver_id,
        "delivery_status": "delivered",
        "delivered_at": {"$gte": month_start.isoformat()}
    })
    
    return {
        "daily_orders": daily_orders,
        "weekly_orders": weekly_orders,
        "monthly_orders": monthly_orders
    }


async def _fetch_driver_activity(driver_id: str, now: datetime) -> dict:
    """جلب بيانات نشاط السائق"""
    driver = await db.users.find_one({"id": driver_id}, {"_id": 0, "created_at": 1})
    days_active = 0
    if driver and driver.get("created_at"):
        try:
            created = datetime.fromisoformat(driver["created_at"].replace('Z', '+00:00'))
            days_active = (now - created).days
        except Exception:
            pass
    
    unique_cities_list = await db.orders.distinct("city", {
        "delivery_driver_id": driver_id,
        "delivery_status": "delivered"
    })
    unique_cities = len(unique_cities_list) if unique_cities_list else 0
    
    return {
        "days_active": days_active,
        "unique_cities": unique_cities
    }


def _get_current_value(req_type: str, req: dict, stats: dict) -> int:
    """حساب القيمة الحالية لنوع المتطلب"""
    value_map = {
        "total_orders": stats.get("total_orders", 0),
        "consecutive_5_star": stats.get("consecutive_5_star", 0),
        "daily_orders": stats.get("daily_orders", 0),
        "weekly_orders": stats.get("weekly_orders", 0),
        "monthly_orders": stats.get("monthly_orders", 0),
        "days_active": stats.get("days_active", 0),
        "unique_cities": stats.get("unique_cities", 0),
        "early_deliveries": 0,  # TODO: Implement
        "late_deliveries": 0,   # TODO: Implement
    }
    
    if req_type == "avg_rating":
        min_ratings = req.get("min_ratings", 0)
        if stats.get("total_ratings", 0) >= min_ratings:
            return stats.get("avg_rating", 0)
        return 0
    
    return value_map.get(req_type, 0)


async def calculate_progress(driver_id: str) -> dict:
    """حساب التقدم لجميع الإنجازات"""
    now = datetime.now(timezone.utc)
    
    # جلب جميع الإحصائيات
    basic_stats = await _fetch_driver_stats(driver_id, now)
    time_stats = await _fetch_time_based_orders(driver_id, now)
    activity_stats = await _fetch_driver_activity(driver_id, now)
    
    # دمج الإحصائيات
    all_stats = {**basic_stats, **time_stats, **activity_stats}
    
    # حساب التقدم لكل إنجاز
    progress = {}
    for ach_id, ach_data in ACHIEVEMENTS.items():
        req = ach_data["requirement"]
        target = req["value"]
        current = _get_current_value(req["type"], req, all_stats)
        percent = min(100, round((current / target) * 100, 1)) if target > 0 else 0
        
        progress[ach_id] = {
            "current": current,
            "target": target,
            "percent": percent
        }
    
    return progress

@router.get("/recent")
async def get_recent_achievements(user: dict = Depends(get_current_user)) -> dict:
    """آخر الإنجازات المفتوحة (لجميع السائقين)"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    recent = await db.driver_achievements.find(
        {},
        {"_id": 0}
    ).sort("unlocked_at", -1).limit(10).to_list(10)
    
    if not recent:
        return []
    
    # جلب معرفات السائقين
    driver_ids = list(set([a.get("driver_id") for a in recent if a.get("driver_id")]))
    
    # جلب جميع السائقين دفعة واحدة
    drivers_list = await db.users.find(
        {"id": {"$in": driver_ids}},
        {"_id": 0, "id": 1, "name": 1, "full_name": 1}
    ).to_list(None)
    drivers_map = {d["id"]: d for d in drivers_list}
    
    result = []
    for ach in recent:
        driver = drivers_map.get(ach.get("driver_id"))
        ach_data = ACHIEVEMENTS.get(ach["achievement_id"], {})
        
        result.append({
            "driver_name": driver.get("full_name") or driver.get("name") if driver else "سائق",
            "achievement": ach_data.get("title", ""),
            "icon": ach_data.get("icon", "🏆"),
            "unlocked_at": ach["unlocked_at"]
        })
    
    return result
