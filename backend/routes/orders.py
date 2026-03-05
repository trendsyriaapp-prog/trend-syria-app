# /app/backend/routes/orders.py
# مسارات الطلبات والدفع

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user, create_notification_for_user, create_notification_for_role
from models.schemas import OrderCreate, CartItem, ShamCashPayment
from routes.loyalty import add_loyalty_points

router = APIRouter(tags=["Orders"])

# ============== Commission Helpers ==============

DEFAULT_CATEGORY_COMMISSIONS = {
    "إلكترونيات": 0.18,
    "أزياء": 0.17,
    "ملابس": 0.17,
    "أحذية": 0.21,
    "تجميل": 0.18,
    "مجوهرات": 0.16,
    "إكسسوارات": 0.16,
    "المنزل": 0.20,
    "رياضة": 0.16,
    "أطفال": 0.15,
    "كتب": 0.12,
    "ألعاب": 0.14,
    "default": 0.15,
}

async def get_commission_rates_from_db():
    rates = await db.commission_rates.find_one({"id": "main"}, {"_id": 0})
    if rates and rates.get("categories"):
        return rates["categories"]
    return DEFAULT_CATEGORY_COMMISSIONS

async def get_commission_rate(category: str) -> float:
    rates = await get_commission_rates_from_db()
    return rates.get(category, rates.get("default", 0.15))

async def calculate_commission(price: float, category: str) -> dict:
    rate = await get_commission_rate(category)
    commission = price * rate
    seller_amount = price - commission
    return {
        "price": price,
        "commission_rate": rate,
        "commission_percentage": f"{rate * 100:.0f}%",
        "commission_amount": commission,
        "seller_amount": seller_amount
    }

# ============== Orders ==============

@router.post("/orders")
async def create_order(order: OrderCreate, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="السلة فارغة")
    
    items_details = []
    total = 0
    total_commission = 0
    
    for item in cart["items"]:
        product = await db.products.find_one({"id": item["product_id"]})
        if not product:
            raise HTTPException(status_code=400, detail="منتج غير موجود")
        if product["stock"] < item["quantity"]:
            raise HTTPException(status_code=400, detail=f"الكمية غير متوفرة: {product['name']}")
        
        item_total = product["price"] * item["quantity"]
        
        category = product.get("category", "default")
        commission_info = await calculate_commission(item_total, category)
        item_commission = commission_info["commission_amount"]
        seller_amount = commission_info["seller_amount"]
        
        items_details.append({
            "product_id": item["product_id"],
            "product_name": product["name"],
            "seller_id": product["seller_id"],
            "price": product["price"],
            "quantity": item["quantity"],
            "selected_size": item.get("selected_size"),
            "item_total": item_total,
            "category": category,
            "commission_rate": commission_info["commission_rate"],
            "commission_amount": item_commission,
            "seller_amount": seller_amount,
            "image": product["images"][0] if product["images"] else None
        })
        total += item_total
        total_commission += item_commission
    
    total_seller_amount = total - total_commission
    
    order_id = str(uuid.uuid4())
    order_doc = {
        "id": order_id,
        "user_id": user["id"],
        "user_name": user.get("full_name", user.get("name", "")),
        "items": items_details,
        "total": total,
        "total_commission": total_commission,
        "total_seller_amount": total_seller_amount,
        "address": order.address,
        "city": order.city,
        "phone": order.phone,
        "payment_method": order.payment_method,
        "payment_phone": order.payment_phone,
        "status": "pending_payment",
        "delivery_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_doc)
    
    # Clear cart
    await db.carts.delete_one({"user_id": user["id"]})
    
    # Get low stock threshold from settings
    settings = await db.platform_settings.find_one({"id": "main"})
    LOW_STOCK_THRESHOLD = settings.get("low_stock_threshold", 5) if settings else 5
    
    for item in cart["items"]:
        await db.products.update_one(
            {"id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"], "sales_count": item["quantity"]}}
        )
        
        # Check if stock is low after this order
        updated_product = await db.products.find_one({"id": item["product_id"]})
        if updated_product and updated_product.get("stock", 0) <= LOW_STOCK_THRESHOLD:
            # Send low stock alert to seller
            await create_notification_for_user(
                user_id=updated_product["seller_id"],
                title="⚠️ تنبيه: مخزون منخفض!",
                message=f"المنتج '{updated_product['name']}' وصل إلى {updated_product['stock']} قطع فقط. قم بتحديث المخزون.",
                notification_type="low_stock",
                product_id=item["product_id"]
            )
    
    # Send notifications to sellers
    seller_ids = set(item["seller_id"] for item in items_details)
    for seller_id in seller_ids:
        await create_notification_for_user(
            user_id=seller_id,
            title="طلب جديد!",
            message=f"لديك طلب جديد بقيمة {total:,.0f} ل.س",
            notification_type="new_order",
            order_id=order_id
        )
    
    return {"order_id": order_id, "total": total, "commission": total_commission, "message": "تم إنشاء الطلب"}

@router.get("/orders")
async def get_orders(user: dict = Depends(get_current_user)):
    if user["user_type"] == "seller":
        orders = await db.orders.find(
            {"items.seller_id": user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    else:
        orders = await db.orders.find(
            {"user_id": user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    return orders

@router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if order["user_id"] != user["id"] and user["user_type"] not in ["seller", "admin", "sub_admin", "delivery"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    return order

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str = Query(...), user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["seller", "admin", "sub_admin", "delivery"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    old_status = order.get("delivery_status", "pending")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"delivery_status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Send notifications based on status
    customer_id = order["user_id"]
    status_messages = {
        "confirmed": ("تم تأكيد طلبك", "طلبك قيد التجهيز الآن"),
        "processing": ("جاري تجهيز طلبك", "البائع يجهز طلبك للشحن"),
        "shipped": ("تم شحن طلبك", "طلبك في الطريق إليك"),
        "out_for_delivery": ("طلبك في الطريق!", "موظف التوصيل في طريقه إليك"),
        "delivered": ("تم التسليم!", "تم تسليم طلبك بنجاح. شكراً لك!"),
        "cancelled": ("تم إلغاء الطلب", "تم إلغاء طلبك")
    }
    
    if status in status_messages:
        title, message = status_messages[status]
        await create_notification_for_user(
            user_id=customer_id,
            title=title,
            message=message,
            notification_type="order_status",
            order_id=order_id
        )
    
    # Notify delivery when order is ready
    if status == "shipped":
        await create_notification_for_role(
            role="delivery",
            title="طلب جاهز للتوصيل",
            message=f"طلب جديد جاهز للتوصيل إلى {order.get('city', '')}",
            notification_type="delivery_ready",
            order_id=order_id
        )
    
    return {"message": "تم تحديث حالة الطلب", "old_status": old_status, "new_status": status}

# ============== Payment ==============

@router.post("/payment/shamcash/init")
async def init_shamcash_payment(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    return {
        "message": "تم إرسال رمز التحقق إلى رقم شام كاش",
        "order_id": order_id,
        "amount": order["total"]
    }

@router.post("/payment/shamcash/verify")
async def verify_shamcash_payment(payment: ShamCashPayment, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": payment.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # Simulated verification - accept any 6-digit OTP
    if len(payment.otp) == 6 and payment.otp.isdigit():
        await db.orders.update_one(
            {"id": payment.order_id},
            {"$set": {"status": "paid", "payment_verified_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # إضافة نقاط الولاء للعميل
        points_earned = await add_loyalty_points(
            user_id=order["user_id"],
            order_total=order["total"],
            order_id=payment.order_id
        )
        
        return {
            "success": True, 
            "message": "تم الدفع بنجاح",
            "loyalty_points_earned": points_earned
        }
    else:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")

# ============== Commission Calculation API ==============

@router.get("/commission/calculate")
async def calculate_product_commission(price: float, category: str):
    result = await calculate_commission(price, category)
    return result
