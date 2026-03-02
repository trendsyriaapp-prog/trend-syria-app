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
