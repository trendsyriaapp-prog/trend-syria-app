# /app/backend/routes/analytics.py
# لوحة التحليلات والإحصائيات للمدير

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional
from core.database import db, get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard")
async def get_dashboard_analytics(user: dict = Depends(get_current_user)):
    """إحصائيات لوحة التحكم الرئيسية"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)
    today_start - timedelta(days=30)
    
    # إحصائيات المستخدمين
    total_users = await db.users.count_documents({})
    new_users_today = await db.users.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    new_users_week = await db.users.count_documents({
        "created_at": {"$gte": week_start.isoformat()}
    })
    
    # إحصائيات حسب نوع المستخدم
    customers = await db.users.count_documents({"user_type": {"$in": ["customer", "buyer"]}})
    sellers = await db.users.count_documents({"user_type": "seller"})
    delivery = await db.users.count_documents({"user_type": "delivery"})
    
    # إحصائيات الطلبات
    total_orders = await db.orders.count_documents({})
    orders_today = await db.orders.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    orders_week = await db.orders.count_documents({
        "created_at": {"$gte": week_start.isoformat()}
    })
    pending_orders = await db.orders.count_documents({"status": "pending"})
    delivered_orders = await db.orders.count_documents({"status": "delivered"})
    
    # إحصائيات طلبات الطعام
    total_food_orders = await db.food_orders.count_documents({})
    food_orders_today = await db.food_orders.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    # إحصائيات المنتجات
    total_products = await db.products.count_documents({"is_approved": True})
    pending_products = await db.products.count_documents({"approval_status": "pending"})
    
    # إحصائيات المتاجر
    total_stores = await db.food_stores.count_documents({"status": "approved"})
    pending_stores = await db.food_stores.count_documents({"status": "pending"})
    
    # حساب الإيرادات
    revenue_pipeline = [
        {"$match": {"status": "delivered"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    # إيرادات اليوم
    today_revenue_pipeline = [
        {"$match": {
            "status": "delivered",
            "created_at": {"$gte": today_start.isoformat()}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    today_revenue_result = await db.orders.aggregate(today_revenue_pipeline).to_list(1)
    today_revenue = today_revenue_result[0]["total"] if today_revenue_result else 0
    
    # إيرادات الأسبوع
    week_revenue_pipeline = [
        {"$match": {
            "status": "delivered",
            "created_at": {"$gte": week_start.isoformat()}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    week_revenue_result = await db.orders.aggregate(week_revenue_pipeline).to_list(1)
    week_revenue = week_revenue_result[0]["total"] if week_revenue_result else 0
    
    return {
        "users": {
            "total": total_users,
            "new_today": new_users_today,
            "new_week": new_users_week,
            "customers": customers,
            "sellers": sellers,
            "delivery": delivery
        },
        "orders": {
            "total": total_orders,
            "today": orders_today,
            "week": orders_week,
            "pending": pending_orders,
            "delivered": delivered_orders
        },
        "food_orders": {
            "total": total_food_orders,
            "today": food_orders_today
        },
        "products": {
            "total": total_products,
            "pending": pending_products
        },
        "stores": {
            "total": total_stores,
            "pending": pending_stores
        },
        "revenue": {
            "total": total_revenue,
            "today": today_revenue,
            "week": week_revenue
        }
    }

@router.get("/sales-chart")
async def get_sales_chart(days: int = 7, user: dict = Depends(get_current_user)):
    """بيانات مخطط المبيعات"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    now = datetime.now(timezone.utc)
    chart_data = []
    
    for i in range(days - 1, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        # عدد الطلبات
        orders_count = await db.orders.count_documents({
            "created_at": {
                "$gte": day_start.isoformat(),
                "$lt": day_end.isoformat()
            }
        })
        
        # إيرادات اليوم
        revenue_pipeline = [
            {"$match": {
                "status": "delivered",
                "created_at": {
                    "$gte": day_start.isoformat(),
                    "$lt": day_end.isoformat()
                }
            }},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
        revenue = revenue_result[0]["total"] if revenue_result else 0
        
        chart_data.append({
            "date": day_start.strftime("%Y-%m-%d"),
            "day_name": ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][day_start.weekday()],
            "orders": orders_count,
            "revenue": revenue
        })
    
    return chart_data

@router.get("/top-products")
async def get_top_products(limit: int = 10, user: dict = Depends(get_current_user)):
    """أكثر المنتجات مبيعاً"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    pipeline = [
        {"$match": {"is_approved": True}},
        {"$sort": {"sales_count": -1}},
        {"$limit": limit},
        {"$project": {
            "_id": 0,
            "id": 1,
            "name": 1,
            "price": 1,
            "sales_count": 1,
            "images": {"$slice": ["$images", 1]},
            "category": 1
        }}
    ]
    
    products = await db.products.aggregate(pipeline).to_list(limit)
    return products

@router.get("/top-sellers")
async def get_top_sellers(limit: int = 10, user: dict = Depends(get_current_user)):
    """أفضل البائعين"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    pipeline = [
        {"$match": {"status": "delivered"}},
        {"$group": {
            "_id": "$seller_id",
            "total_sales": {"$sum": "$total_amount"},
            "orders_count": {"$sum": 1}
        }},
        {"$sort": {"total_sales": -1}},
        {"$limit": limit}
    ]
    
    sellers_stats = await db.orders.aggregate(pipeline).to_list(limit)
    
    # جلب بيانات البائعين
    result = []
    for stat in sellers_stats:
        seller = await db.users.find_one(
            {"id": stat["_id"]},
            {"_id": 0, "id": 1, "full_name": 1, "business_name": 1, "phone": 1}
        )
        if seller:
            result.append({
                **seller,
                "total_sales": stat["total_sales"],
                "orders_count": stat["orders_count"]
            })
    
    return result

@router.get("/categories-stats")
async def get_categories_stats(user: dict = Depends(get_current_user)):
    """إحصائيات حسب الفئات"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    pipeline = [
        {"$match": {"is_approved": True}},
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1},
            "total_sales": {"$sum": "$sales_count"}
        }},
        {"$sort": {"total_sales": -1}}
    ]
    
    stats = await db.products.aggregate(pipeline).to_list(20)
    
    # ترجمة أسماء الفئات
    category_names = {
        "electronics": "إلكترونيات",
        "fashion": "أزياء",
        "home": "المنزل",
        "beauty": "تجميل",
        "sports": "رياضة",
        "books": "كتب",
        "toys": "ألعاب",
        "food": "طعام",
        "health": "صحة",
        "cleaning": "أدوات تنظيف"
    }
    
    return [{
        "category": stat["_id"],
        "category_name": category_names.get(stat["_id"], stat["_id"]),
        "products_count": stat["count"],
        "total_sales": stat["total_sales"]
    } for stat in stats]

@router.get("/recent-orders")
async def get_recent_orders(limit: int = 10, user: dict = Depends(get_current_user)):
    """آخر الطلبات"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    orders = await db.orders.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return orders

@router.get("/peak-hours")
async def get_peak_hours(user: dict = Depends(get_current_user)):
    """أوقات الذروة للطلبات"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    # تحليل الطلبات حسب الساعة
    pipeline = [
        {"$project": {
            "hour": {"$hour": {"$dateFromString": {"dateString": "$created_at"}}}
        }},
        {"$group": {
            "_id": "$hour",
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    try:
        hours_stats = await db.orders.aggregate(pipeline).to_list(24)
        
        # تحويل إلى تنسيق مفهوم
        result = []
        for i in range(24):
            hour_data = next((h for h in hours_stats if h["_id"] == i), None)
            count = hour_data["count"] if hour_data else 0
            result.append({
                "hour": i,
                "hour_label": f"{i:02d}:00",
                "orders": count
            })
        
        return result
    except Exception:
        return []

@router.get("/wallet-stats")
async def get_wallet_stats(user: dict = Depends(get_current_user)):
    """إحصائيات المحفظة"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    # إجمالي الأرصدة
    balance_pipeline = [
        {"$group": {"_id": None, "total": {"$sum": "$balance"}}}
    ]
    balance_result = await db.wallets.aggregate(balance_pipeline).to_list(1)
    total_balance = balance_result[0]["total"] if balance_result else 0
    
    # طلبات السحب المعلقة
    pending_withdrawals = await db.withdrawal_requests.count_documents({"status": "pending"})
    
    # إجمالي السحوبات المكتملة
    completed_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    completed_result = await db.withdrawal_requests.aggregate(completed_pipeline).to_list(1)
    total_withdrawn = completed_result[0]["total"] if completed_result else 0
    
    return {
        "total_balance": total_balance,
        "pending_withdrawals": pending_withdrawals,
        "total_withdrawn": total_withdrawn
    }


# ============== إحصائيات أداء السائقين ==============

@router.get("/drivers-performance")
async def get_drivers_performance(
    city: Optional[str] = None,
    period: str = "week",  # day, week, month, all
    sort_by: str = "orders_count",  # orders_count, avg_time, rating, acceptance_rate
    user: dict = Depends(get_current_user)
):
    """إحصائيات أداء جميع السائقين"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    now = datetime.now(timezone.utc)
    
    # تحديد فترة البحث
    if period == "day":
        start_date = now - timedelta(days=1)
    elif period == "week":
        start_date = now - timedelta(days=7)
    elif period == "month":
        start_date = now - timedelta(days=30)
    else:
        start_date = None
    
    # جلب السائقين المعتمدين
    driver_query = {"status": "approved"}
    if city:
        driver_query["city"] = city
    
    approved_docs = await db.delivery_documents.find(
        driver_query,
        {"_id": 0, "driver_id": 1, "delivery_id": 1, "city": 1, "is_available": 1, "created_at": 1}
    ).to_list(500)
    
    driver_ids = []
    driver_info = {}
    
    for doc in approved_docs:
        did = doc.get("driver_id") or doc.get("delivery_id")
        if did:
            driver_ids.append(did)
            driver_info[did] = {
                "city": doc.get("city", ""),
                "is_available": doc.get("is_available", False),
                "joined_at": doc.get("created_at", "")
            }
    
    if not driver_ids:
        return {"drivers": [], "summary": {}}
    
    # جلب معلومات السائقين
    users = await db.users.find(
        {"id": {"$in": driver_ids}},
        {"_id": 0, "id": 1, "full_name": 1, "name": 1, "phone": 1}
    ).to_list(500)
    
    users_dict = {u["id"]: u for u in users}
    
    # بناء إحصائيات كل سائق
    results = []
    
    for driver_id in driver_ids:
        user_data = users_dict.get(driver_id, {})
        info = driver_info.get(driver_id, {})
        
        # فلتر الفترة الزمنية
        date_filter = {}
        if start_date:
            date_filter["created_at"] = {"$gte": start_date.isoformat()}
        
        # === طلبات الطعام ===
        food_query = {"driver_id": driver_id, **date_filter}
        
        # إجمالي الطلبات المسندة
        total_food_assigned = await db.food_orders.count_documents(food_query)
        
        # الطلبات المكتملة
        completed_food = await db.food_orders.count_documents({
            **food_query,
            "status": "delivered"
        })
        
        # === طلبات المنتجات ===
        product_query = {"delivery_driver_id": driver_id}
        if start_date:
            product_query["created_at"] = {"$gte": start_date.isoformat()}
        
        total_product_assigned = await db.orders.count_documents(product_query)
        completed_product = await db.orders.count_documents({
            **product_query,
            "delivery_status": "delivered"
        })
        
        # إجمالي الطلبات
        total_orders = total_food_assigned + total_product_assigned
        completed_orders = completed_food + completed_product
        
        # === حساب متوسط وقت التوصيل ===
        avg_delivery_time = 0
        time_pipeline = [
            {"$match": {
                "driver_id": driver_id,
                "status": "delivered",
                "picked_up_at": {"$exists": True},
                "delivered_at": {"$exists": True},
                **({"created_at": {"$gte": start_date.isoformat()}} if start_date else {})
            }},
            {"$project": {
                "delivery_time": {
                    "$divide": [
                        {"$subtract": [
                            {"$dateFromString": {"dateString": "$delivered_at"}},
                            {"$dateFromString": {"dateString": "$picked_up_at"}}
                        ]},
                        60000  # تحويل إلى دقائق
                    ]
                }
            }},
            {"$group": {
                "_id": None,
                "avg_time": {"$avg": "$delivery_time"}
            }}
        ]
        
        try:
            time_result = await db.food_orders.aggregate(time_pipeline).to_list(1)
            if time_result:
                avg_delivery_time = round(time_result[0].get("avg_time", 0), 1)
        except Exception:
            pass
        
        # === معدل القبول ===
        # الطلبات التي عُرضت على السائق
        offered_orders = await db.food_orders.count_documents({
            "offered_drivers": driver_id,
            **({"created_at": {"$gte": start_date.isoformat()}} if start_date else {})
        })
        
        # الطلبات المرفوضة
        rejected_orders = await db.food_orders.count_documents({
            "rejected_drivers": driver_id,
            **({"created_at": {"$gte": start_date.isoformat()}} if start_date else {})
        })
        
        acceptance_rate = 0
        if offered_orders > 0:
            accepted = offered_orders - rejected_orders
            acceptance_rate = round((accepted / offered_orders) * 100, 1)
        
        # === معدل الإلغاء ===
        cancellations = await db.driver_cancellations.count_documents({
            "driver_id": driver_id,
            **({"cancelled_at": {"$gte": start_date.isoformat()}} if start_date else {})
        })
        
        cancellation_rate = 0
        if total_orders > 0:
            cancellation_rate = round((cancellations / total_orders) * 100, 1)
        
        # === التقييم ===
        rating_pipeline = [
            {"$match": {
                "driver_id": driver_id,
                "driver_rating": {"$exists": True, "$ne": None}
            }},
            {"$group": {
                "_id": None,
                "avg_rating": {"$avg": "$driver_rating"},
                "rating_count": {"$sum": 1}
            }}
        ]
        
        rating_result = await db.food_orders.aggregate(rating_pipeline).to_list(1)
        avg_rating = 0
        rating_count = 0
        if rating_result:
            avg_rating = round(rating_result[0].get("avg_rating", 0), 1)
            rating_count = rating_result[0].get("rating_count", 0)
        
        # === حساب الأرباح ===
        earnings_pipeline = [
            {"$match": {
                "user_id": driver_id,
                "type": {"$in": ["delivery_earning", "food_delivery_earning"]},
                **({"created_at": {"$gte": start_date.isoformat()}} if start_date else {})
            }},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$amount"}
            }}
        ]
        
        earnings_result = await db.transactions.aggregate(earnings_pipeline).to_list(1)
        total_earnings = earnings_result[0]["total"] if earnings_result else 0
        
        # === آخر نشاط ===
        last_location = await db.driver_locations.find_one(
            {"driver_id": driver_id},
            {"_id": 0, "updated_at": 1}
        )
        last_active = last_location.get("updated_at") if last_location else None
        
        # حساب حالة الاتصال
        is_online = False
        if last_active:
            try:
                last_time = datetime.fromisoformat(last_active.replace("Z", "+00:00"))
                is_online = (now - last_time) < timedelta(minutes=5)
            except Exception:
                pass
        
        results.append({
            "id": driver_id,
            "name": user_data.get("full_name") or user_data.get("name", "سائق"),
            "phone": user_data.get("phone", ""),
            "city": info.get("city", ""),
            "is_available": info.get("is_available", False),
            "is_online": is_online,
            "joined_at": info.get("joined_at", ""),
            "stats": {
                "total_orders": total_orders,
                "completed_orders": completed_orders,
                "completion_rate": round((completed_orders / total_orders * 100), 1) if total_orders > 0 else 0,
                "avg_delivery_time": avg_delivery_time,
                "acceptance_rate": acceptance_rate,
                "cancellation_rate": cancellation_rate,
                "cancellations": cancellations,
                "avg_rating": avg_rating,
                "rating_count": rating_count,
                "total_earnings": total_earnings
            },
            "last_active": last_active
        })
    
    # ترتيب النتائج
    sort_key_map = {
        "orders_count": lambda x: -x["stats"]["completed_orders"],
        "avg_time": lambda x: x["stats"]["avg_delivery_time"] if x["stats"]["avg_delivery_time"] > 0 else 999,
        "rating": lambda x: -x["stats"]["avg_rating"],
        "acceptance_rate": lambda x: -x["stats"]["acceptance_rate"],
        "earnings": lambda x: -x["stats"]["total_earnings"]
    }
    
    results.sort(key=sort_key_map.get(sort_by, sort_key_map["orders_count"]))
    
    # حساب الملخص
    summary = {
        "total_drivers": len(results),
        "online_drivers": sum(1 for r in results if r["is_online"]),
        "available_drivers": sum(1 for r in results if r["is_available"]),
        "total_completed_orders": sum(r["stats"]["completed_orders"] for r in results),
        "avg_completion_rate": round(sum(r["stats"]["completion_rate"] for r in results) / len(results), 1) if results else 0,
        "avg_delivery_time": round(sum(r["stats"]["avg_delivery_time"] for r in results if r["stats"]["avg_delivery_time"] > 0) / max(1, sum(1 for r in results if r["stats"]["avg_delivery_time"] > 0)), 1),
        "avg_acceptance_rate": round(sum(r["stats"]["acceptance_rate"] for r in results) / len(results), 1) if results else 0,
        "avg_rating": round(sum(r["stats"]["avg_rating"] for r in results if r["stats"]["avg_rating"] > 0) / max(1, sum(1 for r in results if r["stats"]["avg_rating"] > 0)), 1),
        "total_earnings": sum(r["stats"]["total_earnings"] for r in results)
    }
    
    return {
        "drivers": results,
        "summary": summary,
        "period": period,
        "city": city
    }


@router.get("/driver-performance/{driver_id}")
async def get_single_driver_performance(
    driver_id: str,
    user: dict = Depends(get_current_user)
):
    """إحصائيات أداء سائق محدد"""
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    # جلب بيانات السائق
    driver = await db.users.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="السائق غير موجود")
    
    doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": driver_id}, {"delivery_id": driver_id}]},
        {"_id": 0}
    )
    
    if not doc or doc.get("status") != "approved":
        raise HTTPException(status_code=404, detail="السائق غير معتمد")
    
    now = datetime.now(timezone.utc)
    
    # إحصائيات حسب الفترة
    periods_data = []
    for period_name, days in [("اليوم", 1), ("الأسبوع", 7), ("الشهر", 30), ("الكل", None)]:
        start_date = now - timedelta(days=days) if days else None
        date_filter = {"created_at": {"$gte": start_date.isoformat()}} if start_date else {}
        
        # طلبات الطعام
        food_completed = await db.food_orders.count_documents({
            "driver_id": driver_id,
            "status": "delivered",
            **date_filter
        })
        
        # طلبات المنتجات
        product_completed = await db.orders.count_documents({
            "delivery_driver_id": driver_id,
            "delivery_status": "delivered",
            **({"created_at": {"$gte": start_date.isoformat()}} if start_date else {})
        })
        
        # الأرباح
        earnings_pipeline = [
            {"$match": {
                "user_id": driver_id,
                "type": {"$in": ["delivery_earning", "food_delivery_earning"]},
                **date_filter
            }},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        earnings_result = await db.transactions.aggregate(earnings_pipeline).to_list(1)
        earnings = earnings_result[0]["total"] if earnings_result else 0
        
        periods_data.append({
            "period": period_name,
            "completed_orders": food_completed + product_completed,
            "earnings": earnings
        })
    
    # الرسم البياني - آخر 7 أيام
    chart_data = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        orders = await db.food_orders.count_documents({
            "driver_id": driver_id,
            "status": "delivered",
            "created_at": {
                "$gte": day_start.isoformat(),
                "$lt": day_end.isoformat()
            }
        })
        
        chart_data.append({
            "date": day_start.strftime("%m/%d"),
            "day": ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][day_start.weekday()],
            "orders": orders
        })
    
    # أسباب الإلغاء
    cancellation_reasons = await db.driver_cancellations.aggregate([
        {"$match": {"driver_id": driver_id}},
        {"$group": {"_id": "$reason", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]).to_list(5)
    
    return {
        "driver": {
            "id": driver_id,
            "name": driver.get("full_name") or driver.get("name"),
            "phone": driver.get("phone"),
            "city": doc.get("city"),
            "is_available": doc.get("is_available", False),
            "joined_at": doc.get("created_at")
        },
        "periods": periods_data,
        "chart": chart_data,
        "cancellation_reasons": [
            {"reason": r["_id"], "count": r["count"]}
            for r in cancellation_reasons
        ]
    }



# ============== تحليلات البائع ==============

@router.get("/seller-dashboard")
async def get_seller_analytics(
    period: str = "week",  # today, week, month, all
    user: dict = Depends(get_current_user)
):
    """تحليلات مفصلة للبائع"""
    if user.get("user_type") not in ["seller", "food_seller"]:
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # تحديد الفترة الزمنية
    if period == "today":
        period_start = today_start
    elif period == "week":
        period_start = today_start - timedelta(days=7)
    elif period == "month":
        period_start = today_start - timedelta(days=30)
    else:
        period_start = None
    
    # تحديد نوع البائع والحصول على المتجر
    is_food_seller = user.get("user_type") == "food_seller"
    seller_id = user["id"]
    
    if is_food_seller:
        # بائع طعام - جلب بيانات المتجر
        store = await db.food_stores.find_one({"owner_id": seller_id}, {"_id": 0})
        if not store:
            raise HTTPException(status_code=404, detail="لم يتم العثور على المتجر")
        
        store_id = store.get("id")
        orders_collection = db.food_orders
        order_match = {"store_id": store_id}
        products_collection = db.food_items
        products_match = {"store_id": store_id}
    else:
        # بائع منتجات
        store = await db.stores.find_one({"owner_id": seller_id}, {"_id": 0})
        orders_collection = db.orders
        order_match = {"seller_id": seller_id}
        products_collection = db.products
        products_match = {"seller_id": seller_id}
    
    # إضافة فلتر الفترة
    if period_start:
        order_match["created_at"] = {"$gte": period_start.isoformat()}
    
    # إحصائيات الطلبات
    total_orders = await orders_collection.count_documents(order_match)
    
    # حالات الطلبات
    status_match = {**order_match}
    if period_start:
        del status_match["created_at"]
        status_match["created_at"] = {"$gte": period_start.isoformat()}
    
    completed_match = {**order_match, "status": {"$in": ["delivered", "completed"]}}
    cancelled_match = {**order_match, "status": "cancelled"}
    pending_match = {**order_match, "status": {"$in": ["pending", "preparing", "ready"]}}
    
    completed_orders = await orders_collection.count_documents(completed_match)
    cancelled_orders = await orders_collection.count_documents(cancelled_match)
    pending_orders = await orders_collection.count_documents(pending_match)
    
    # حساب الإيرادات
    revenue_field = "subtotal" if is_food_seller else "total_amount"
    commission_field = "platform_commission" if is_food_seller else "commission_amount"
    
    revenue_pipeline = [
        {"$match": {**order_match, "status": {"$in": ["delivered", "completed"]}}},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": f"${revenue_field}"},
            "total_commission": {"$sum": {"$ifNull": [f"${commission_field}", 0]}},
            "avg_order_value": {"$avg": f"${revenue_field}"}
        }}
    ]
    revenue_result = await orders_collection.aggregate(revenue_pipeline).to_list(1)
    
    total_revenue = revenue_result[0]["total_revenue"] if revenue_result else 0
    total_commission = revenue_result[0]["total_commission"] if revenue_result else 0
    avg_order_value = revenue_result[0]["avg_order_value"] if revenue_result else 0
    net_earnings = total_revenue - total_commission
    
    # إحصائيات المنتجات
    total_products = await products_collection.count_documents(products_match)
    
    if is_food_seller:
        active_products = await products_collection.count_documents({
            **products_match,
            "availability_status": {"$ne": "unavailable"}
        })
    else:
        active_products = await products_collection.count_documents({
            **products_match,
            "is_active": True,
            "is_approved": True
        })
    
    # المنتجات الأكثر مبيعاً
    top_products_pipeline = [
        {"$match": {**order_match, "status": {"$in": ["delivered", "completed"]}}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.product_id" if is_food_seller else "$items.id",
            "name": {"$first": "$items.name"},
            "total_sold": {"$sum": "$items.quantity"},
            "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
        }},
        {"$sort": {"total_sold": -1}},
        {"$limit": 5}
    ]
    top_products = await orders_collection.aggregate(top_products_pipeline).to_list(5)
    
    # التقييمات
    if is_food_seller:
        reviews = await db.food_store_reviews.find(
            {"store_id": store_id},
            {"_id": 0, "rating": 1}
        ).to_list(1000)
    else:
        reviews = await db.reviews.find(
            {"seller_id": seller_id},
            {"_id": 0, "rating": 1}
        ).to_list(1000)
    
    avg_rating = round(sum(r["rating"] for r in reviews) / len(reviews), 1) if reviews else 0
    total_reviews = len(reviews)
    
    # توزيع التقييمات
    rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in reviews:
        rating = int(r["rating"])
        if rating in rating_distribution:
            rating_distribution[rating] += 1
    
    # بيانات الرسم البياني (آخر 7 أيام)
    chart_data = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        next_day = day + timedelta(days=1)
        
        day_match = {
            **order_match,
            "created_at": {
                "$gte": day.isoformat(),
                "$lt": next_day.isoformat()
            },
            "status": {"$in": ["delivered", "completed"]}
        }
        if period_start:
            del day_match["created_at"]
            day_match["created_at"] = {
                "$gte": day.isoformat(),
                "$lt": next_day.isoformat()
            }
        
        day_revenue_pipeline = [
            {"$match": day_match},
            {"$group": {
                "_id": None,
                "revenue": {"$sum": f"${revenue_field}"},
                "orders": {"$sum": 1}
            }}
        ]
        day_result = await orders_collection.aggregate(day_revenue_pipeline).to_list(1)
        
        chart_data.append({
            "date": day.strftime("%Y-%m-%d"),
            "day_name": ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"][day.weekday()],
            "revenue": day_result[0]["revenue"] if day_result else 0,
            "orders": day_result[0]["orders"] if day_result else 0
        })
    
    # ساعات الذروة
    peak_hours_pipeline = [
        {"$match": {**order_match, "status": {"$in": ["delivered", "completed"]}}},
        {"$project": {
            "hour": {"$hour": {"$dateFromString": {"dateString": "$created_at"}}}
        }},
        {"$group": {
            "_id": "$hour",
            "count": {"$sum": 1}
        }},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    peak_hours = await orders_collection.aggregate(peak_hours_pipeline).to_list(5)
    
    return {
        "store": {
            "name": store.get("name") if store else user.get("store_name", user.get("full_name")),
            "type": store.get("category_type") if store else "products",
            "status": store.get("status") if store else "approved"
        },
        "period": period,
        "orders": {
            "total": total_orders,
            "completed": completed_orders,
            "cancelled": cancelled_orders,
            "pending": pending_orders,
            "completion_rate": round((completed_orders / total_orders * 100), 1) if total_orders > 0 else 0
        },
        "revenue": {
            "total": total_revenue,
            "commission": total_commission,
            "net_earnings": net_earnings,
            "avg_order_value": round(avg_order_value, 0)
        },
        "products": {
            "total": total_products,
            "active": active_products,
            "top_selling": [
                {
                    "id": p["_id"],
                    "name": p["name"],
                    "sold": p["total_sold"],
                    "revenue": p["total_revenue"]
                }
                for p in top_products
            ]
        },
        "ratings": {
            "average": avg_rating,
            "total": total_reviews,
            "distribution": rating_distribution
        },
        "chart": chart_data,
        "peak_hours": [
            {"hour": f"{h['_id']}:00", "orders": h["count"]}
            for h in peak_hours
        ]
    }
