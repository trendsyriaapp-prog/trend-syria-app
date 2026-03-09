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
    month_start = today_start - timedelta(days=30)
    
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
    except:
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
