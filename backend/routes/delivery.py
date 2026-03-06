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

