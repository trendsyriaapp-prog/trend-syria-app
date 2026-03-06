# /app/backend/routes/delivery.py
# مسارات التوصيل

from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user, create_notification_for_user

router = APIRouter(prefix="/delivery", tags=["Delivery"])

@router.get("/orders")
async def get_delivery_orders(user: dict = Depends(get_current_user)):
    """الطلبات المتاحة للتوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    # Check if approved
    doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
        {"_id": 0}
    )
    if not doc or doc.get("status") != "approved":
        raise HTTPException(status_code=403, detail="يجب اعتماد حسابك أولاً")
    
    # Get orders ready for delivery in driver's city
    orders = await db.orders.find(
        {
            "delivery_status": {"$in": ["shipped", "out_for_delivery"]},
            "city": user.get("city")
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return orders

@router.get("/orders/all")
async def get_all_available_orders(user: dict = Depends(get_current_user)):
    """جميع الطلبات المتاحة للتوصيل"""
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": user["id"]}, {"delivery_id": user["id"]}]},
        {"_id": 0}
    )
    if not doc or doc.get("status") != "approved":
        raise HTTPException(status_code=403, detail="يجب اعتماد حسابك أولاً")
    
    orders = await db.orders.find(
        {"delivery_status": {"$in": ["shipped", "out_for_delivery"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return orders

# Alias for frontend compatibility
@router.get("/available-orders")
async def get_available_orders_alias(user: dict = Depends(get_current_user)):
    """الطلبات المتاحة للتوصيل - Alias"""
    return await get_all_available_orders(user)

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
    
    return {"message": "تم تأكيد التسليم"}

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
    
    # Get orders for earning calculation
    delivered_orders = await db.orders.find(
        {"delivery_driver_id": user["id"], "delivery_status": "delivered"},
        {"_id": 0, "total": 1}
    ).to_list(1000)
    
    total_earnings = len(delivered_orders) * 5000  # 5000 ل.س لكل طلب
    
    return {
        "total_delivered": total_delivered,
        "pending_delivery": pending_delivery,
        "total_earnings": total_earnings,
        "earnings_per_delivery": 5000
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

