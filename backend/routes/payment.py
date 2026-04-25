# /app/backend/routes/payment.py
# نظام الدفع - شام كاش (تجريبي)

from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
import uuid
import secrets

from core.database import db, get_current_user, create_notification_for_user
from helpers.datetime_helpers import get_now
from routes.wallet import add_pending_to_wallet, confirm_pending_earnings

router = APIRouter(prefix="/payment", tags=["Payment"])
# ============== Authorization Dependencies ==============

async def require_admin_user(user: dict = Depends(get_current_user)) -> dict:
    """التحقق من أن المستخدم admin أو sub_admin"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    return user



# ============== Delivery Fee Calculation ==============

# أسعار التوصيل حسب المحافظة (افتراضية - قابلة للتعديل من لوحة المدير)
DEFAULT_DELIVERY_FEES = {
    "same_city": 3000,      # نفس المدينة
    "nearby": 5000,         # محافظات قريبة
    "medium": 8000,         # محافظات متوسطة البعد
    "far": 12000,           # محافظات بعيدة
}

# المحافظات القريبة من بعضها
NEARBY_PROVINCES = {
    "دمشق": ["ريف دمشق", "درعا", "السويداء", "القنيطرة"],
    "ريف دمشق": ["دمشق", "درعا", "السويداء", "القنيطرة"],
    "حلب": ["إدلب"],
    "حمص": ["حماة", "طرطوس"],
    "حماة": ["حمص", "إدلب", "طرطوس"],
    "اللاذقية": ["طرطوس", "إدلب"],
    "طرطوس": ["اللاذقية", "حمص", "حماة"],
    "درعا": ["دمشق", "ريف دمشق", "السويداء"],
    "السويداء": ["دمشق", "ريف دمشق", "درعا"],
    "إدلب": ["حلب", "حماة", "اللاذقية"],
    "الرقة": ["حلب", "دير الزور", "الحسكة"],
    "دير الزور": ["الرقة", "الحسكة"],
    "الحسكة": ["الرقة", "دير الزور"],
    "القنيطرة": ["دمشق", "ريف دمشق", "درعا"],
}

# المحافظات متوسطة البعد
MEDIUM_PROVINCES = {
    "دمشق": ["حمص", "حماة"],
    "ريف دمشق": ["حمص", "حماة"],
    "حلب": ["حماة", "الرقة", "الحسكة"],
    "حمص": ["دمشق", "ريف دمشق", "اللاذقية", "درعا"],
    "حماة": ["دمشق", "حلب", "اللاذقية"],
    "اللاذقية": ["حمص", "حماة"],
    "طرطوس": ["دمشق", "ريف دمشق"],
    "درعا": ["حمص"],
    "السويداء": ["حمص"],
}

async def get_delivery_fees() -> dict:
    """جلب أسعار التوصيل من قاعدة البيانات"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    if settings and settings.get("delivery_fees"):
        return settings["delivery_fees"]
    return DEFAULT_DELIVERY_FEES

async def calculate_delivery_fee(seller_city: str, customer_city: str) -> dict:
    """حساب أجرة التوصيل بناءً على المحافظات"""
    fees = await get_delivery_fees()
    
    # نفس المدينة
    if seller_city == customer_city:
        return {
            "fee": fees.get("same_city", 3000),
            "distance_type": "same_city",
            "description": "نفس المحافظة"
        }
    
    # محافظات قريبة
    nearby = NEARBY_PROVINCES.get(seller_city, [])
    if customer_city in nearby:
        return {
            "fee": fees.get("nearby", 5000),
            "distance_type": "nearby",
            "description": "محافظة قريبة"
        }
    
    # محافظات متوسطة
    medium = MEDIUM_PROVINCES.get(seller_city, [])
    if customer_city in medium:
        return {
            "fee": fees.get("medium", 8000),
            "distance_type": "medium",
            "description": "محافظة متوسطة البعد"
        }
    
    # محافظات بعيدة
    return {
        "fee": fees.get("far", 12000),
        "distance_type": "far",
        "description": "محافظة بعيدة"
    }

@router.get("/delivery-fee")
async def get_delivery_fee_for_order(
    seller_city: str = Query(...),
    customer_city: str = Query(...)
) -> dict:
    """حساب أجرة التوصيل لطلب معين"""
    result = await calculate_delivery_fee(seller_city, customer_city)
    return {
        **result,
        "seller_city": seller_city,
        "customer_city": customer_city
    }

# ============== Payment Flow ==============

@router.post("/checkout")
async def checkout_order(
    address_id: str = Query(...),
    payment_method: str = Query(default="shamcash"),
    shamcash_phone: str = Query(default=None),
    user: dict = Depends(get_current_user)
) -> dict:
    """إتمام عملية الشراء"""
    
    # Get cart
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="السلة فارغة")
    
    # Get address
    address = await db.addresses.find_one({"id": address_id, "user_id": user["id"]})
    if not address:
        raise HTTPException(status_code=404, detail="العنوان غير موجود")
    
    customer_city = address.get("city", "")
    
    # جلب جميع المنتجات دفعة واحدة
    product_ids = [item["product_id"] for item in cart["items"]]
    products_list = await db.products.find(
        {"id": {"$in": product_ids}},
        {"_id": 0}
    ).to_list(None)
    products_map = {p["id"]: p for p in products_list}
    
    # التحقق من وجود جميع المنتجات
    for item in cart["items"]:
        if item["product_id"] not in products_map:
            raise HTTPException(status_code=400, detail="المنتج غير موجود")
        product = products_map[item["product_id"]]
        if product["stock"] < item["quantity"]:
            raise HTTPException(status_code=400, detail=f"الكمية غير متوفرة: {product['name']}")
    
    # Calculate totals
    items_details = []
    subtotal = 0
    total_commission = 0
    sellers_earnings = {}  # {seller_id: amount}
    
    # Get commission rates
    commission_rates = await db.commission_rates.find_one({"id": "main"}, {"_id": 0})
    if not commission_rates:
        commission_rates = {"categories": {"default": 0.15}}
    
    for item in cart["items"]:
        product = products_map[item["product_id"]]
        
        item_total = product["price"] * item["quantity"]
        subtotal += item_total
        
        # Calculate commission
        category = product.get("category", "default")
        rate = commission_rates["categories"].get(category, commission_rates["categories"].get("default", 0.15))
        item_commission = item_total * rate
        seller_amount = item_total - item_commission
        
        total_commission += item_commission
        
        # Track seller earnings
        seller_id = product["seller_id"]
        if seller_id not in sellers_earnings:
            sellers_earnings[seller_id] = {
                "amount": 0,
                "city": product.get("city", ""),
                "name": product.get("seller_name", "")
            }
        sellers_earnings[seller_id]["amount"] += seller_amount
        
        items_details.append({
            "product_id": item["product_id"],
            "product_name": product["name"],
            "seller_id": seller_id,
            "seller_name": product.get("seller_name", ""),
            "seller_city": product.get("city", ""),
            "price": product["price"],
            "quantity": item["quantity"],
            "selected_size": item.get("selected_size"),
            "item_total": item_total,
            "category": category,
            "commission_rate": rate,
            "commission_amount": item_commission,
            "seller_amount": seller_amount,
            "image": product["images"][0] if product.get("images") else None
        })
    
    # Calculate delivery fee (from main seller's city)
    main_seller_city = items_details[0]["seller_city"] if items_details else ""
    delivery_info = await calculate_delivery_fee(main_seller_city, customer_city)
    delivery_fee = delivery_info["fee"]
    
    # Total = subtotal + delivery (customer pays)
    # But delivery fee comes from platform commission
    total = subtotal + delivery_fee
    
    # Platform earnings = commission - delivery fee
    platform_earnings = total_commission - delivery_fee
    
    # Create order
    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "user_id": user["id"],
        "user_name": user.get("full_name", user.get("name", "")),
        "user_phone": user.get("phone", ""),
        "items": items_details,
        "subtotal": subtotal,
        "delivery_fee": delivery_fee,
        "delivery_info": delivery_info,
        "total": total,
        "total_commission": total_commission,
        "platform_earnings": platform_earnings,
        "sellers_earnings": sellers_earnings,
        "address": {
            "city": address.get("city"),
            "area": address.get("area"),
            "street_number": address.get("street_number"),
            "building_number": address.get("building_number"),
            "apartment_number": address.get("apartment_number"),
            "phone": address.get("phone")
        },
        "payment_method": payment_method,
        "shamcash_phone": shamcash_phone,
        "status": "pending_payment",
        "delivery_status": "pending",
        "created_at": get_now()
    }
    
    await db.orders.insert_one(order)
    
    # If ShamCash payment, initiate OTP
    if payment_method == "shamcash" and shamcash_phone:
        otp = ''.join(secrets.choice('0123456789') for _ in range(6))
        await db.payment_otps.insert_one({
            "order_id": order_id,
            "phone": shamcash_phone,
            "otp": otp,
            "expires_at": get_now(),
            "used": False
        })
        
        return {
            "order_id": order_id,
            "total": total,
            "subtotal": subtotal,
            "delivery_fee": delivery_fee,
            "message": "تم إنشاء الطلب - يرجى إدخال رمز التحقق",
            "requires_otp": True,
            "otp_hint": f"(تجريبي) رمز التحقق: {otp}"  # في الإنتاج، يُرسل SMS
        }
    
    return {
        "order_id": order_id,
        "total": total,
        "message": "تم إنشاء الطلب"
    }

@router.post("/verify-otp")
async def verify_payment_otp(
    order_id: str = Query(...),
    otp: str = Query(...),
    user: dict = Depends(get_current_user)
) -> dict:
    """التحقق من رمز الدفع"""
    
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order["status"] != "pending_payment":
        raise HTTPException(status_code=400, detail="تم الدفع مسبقاً")
    
    # Verify OTP (في التجريبي، نقبل أي 6 أرقام)
    otp_record = await db.payment_otps.find_one({
        "order_id": order_id,
        "used": False
    })
    
    if not otp_record:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")
    
    # Accept if OTP matches OR any 6 digits (for testing)
    if otp != otp_record["otp"] and (len(otp) != 6 or not otp.isdigit()):
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")
    
    # Mark OTP as used
    await db.payment_otps.update_one(
        {"order_id": order_id},
        {"$set": {"used": True}}
    )
    
    # Update order status
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "paid",
                "paid_at": get_now()
            }
        }
    )
    
    # Clear cart
    await db.carts.delete_one({"user_id": user["id"]})
    
    # Update product stock using bulk_write
    from pymongo import UpdateOne
    stock_updates = [
        UpdateOne(
            {"id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"], "sales_count": item["quantity"]}}
        )
        for item in order["items"]
    ]
    if stock_updates:
        await db.products.bulk_write(stock_updates)
    
    # Add pending earnings to sellers' wallets
    for seller_id, earnings in order.get("sellers_earnings", {}).items():
        await add_pending_to_wallet(
            user_id=seller_id,
            user_type="seller",
            amount=earnings["amount"],
            order_id=order_id
        )
    
    # Notify sellers
    for seller_id in order.get("sellers_earnings", {}).keys():
        await create_notification_for_user(
            user_id=seller_id,
            title="طلب جديد مدفوع!",
            message=f"لديك طلب جديد بقيمة {order['total']:,.0f} ل.س",
            notification_type="new_order",
            order_id=order_id
        )
    
    return {
        "success": True,
        "message": "تم الدفع بنجاح!",
        "order_id": order_id
    }


# ============== Wallet Payment ==============

@router.post("/wallet/pay")
async def pay_with_wallet(
    order_id: str = Query(...),
    user: dict = Depends(get_current_user)
) -> dict:
    """الدفع من المحفظة - متاح لجميع المستخدمين"""
    
    # Get order
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("status") != "pending_payment":
        raise HTTPException(status_code=400, detail="تم دفع هذا الطلب مسبقاً أو حالته لا تسمح بالدفع")
    
    # Get wallet
    wallet = await db.wallets.find_one({"user_id": user["id"]})
    if not wallet:
        raise HTTPException(status_code=400, detail="ليس لديك محفظة")
    
    total_amount = order.get("total", 0) + order.get("delivery_fee", 0)
    
    if wallet.get("balance", 0) < total_amount:
        raise HTTPException(
            status_code=400, 
            detail=f"رصيد غير كافٍ. رصيدك: {wallet.get('balance', 0):,.0f} ل.س، المطلوب: {total_amount:,.0f} ل.س"
        )
    
    now = datetime.now(timezone.utc)
    
    # خصم من محفظة العميل
    await db.wallets.update_one(
        {"user_id": user["id"]},
        {"$inc": {"balance": -total_amount}}
    )
    
    # تسجيل المعاملة
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "payment",
        "amount": -total_amount,
        "description": f"دفع الطلب #{order_id[:8]}",
        "order_id": order_id,
        "created_at": now.isoformat()
    })
    
    # تحديث حالة الطلب
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "paid",
                "payment_method": "wallet",
                "paid_at": now.isoformat()
            }
        }
    )
    
    # تحديث المخزون باستخدام bulk_write
    from pymongo import UpdateOne
    stock_updates = [
        UpdateOne(
            {"id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"], "sales_count": item["quantity"]}}
        )
        for item in order.get("items", [])
    ]
    if stock_updates:
        await db.products.bulk_write(stock_updates)
    
    # إضافة أرباح معلقة للبائعين
    for seller_id, earnings in order.get("sellers_earnings", {}).items():
        await add_pending_to_wallet(
            user_id=seller_id,
            user_type="seller",
            amount=earnings["amount"],
            order_id=order_id
        )
    
    # إشعار البائعين
    for seller_id in order.get("sellers_earnings", {}).keys():
        await create_notification_for_user(
            user_id=seller_id,
            title="طلب جديد مدفوع!",
            message=f"طلب جديد مدفوع بالمحفظة بقيمة {order['total']:,.0f} ل.س",
            notification_type="new_order",
            order_id=order_id
        )
    
    return {
        "success": True,
        "message": "تم الدفع بنجاح من محفظتك!",
        "order_id": order_id,
        "amount_paid": total_amount,
        "new_balance": wallet.get("balance", 0) - total_amount
    }

@router.post("/confirm-delivery/{order_id}")
async def confirm_order_delivery(order_id: str, user: dict = Depends(get_current_user)) -> dict:
    """تأكيد تسليم الطلب - ينقل الأرباح من معلق إلى متاح"""
    
    if user["user_type"] != "delivery":
        raise HTTPException(status_code=403, detail="لموظفي التوصيل فقط")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("delivery_driver_id") != user["id"]:
        raise HTTPException(status_code=403, detail="هذا الطلب ليس مسنداً إليك")
    
    if order.get("delivery_status") == "delivered":
        raise HTTPException(status_code=400, detail="تم تسليم الطلب مسبقاً")
    
    # Update order status
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "delivery_status": "delivered",
                "status": "completed",
                "delivered_at": get_now()
            }
        }
    )
    
    # Confirm pending earnings for sellers
    await confirm_pending_earnings(order_id)
    
    # Add delivery fee to driver's wallet
    delivery_fee = order.get("delivery_fee", 0)
    if delivery_fee > 0:
        from routes.wallet import add_to_wallet
        await add_to_wallet(
            user_id=user["id"],
            user_type="delivery",
            amount=delivery_fee,
            transaction_type="delivery_earning",
            description=f"أجرة توصيل الطلب #{order_id[:8]}",
            order_id=order_id
        )
    
    # Notify customer
    await create_notification_for_user(
        user_id=order["user_id"],
        title="تم التسليم!",
        message="تم تسليم طلبك بنجاح. شكراً لتسوقك معنا!",
        notification_type="delivery",
        order_id=order_id
    )
    
    return {
        "success": True,
        "message": "تم تأكيد التسليم بنجاح",
        "delivery_earning": delivery_fee
    }

# ============== Admin: Withdrawal Management ==============

@router.get("/admin/withdrawals")
async def get_all_withdrawals(
    status: str = Query(default=None),
    user: dict = Depends(get_current_user)
) -> dict:
    """
    جميع طلبات السحب (للمدير)
    
    ✅ النظام الجديد:
    - الطلبات تأتي بحالة "ready_for_transfer" (جاهز للتحويل)
    - الأدمن يقوم بالتحويل الفعلي ثم يضغط "تم التحويل"
    - لا توجد موافقة مسبقة - الطلب يُقبل تلقائياً
    """
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    query = {}
    if status:
        query["status"] = status
    
    withdrawals = await db.withdrawal_requests.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return withdrawals

@router.post("/admin/withdrawals/{withdrawal_id}/mark-transferred")
async def mark_withdrawal_transferred(withdrawal_id: str, user: dict = Depends(require_admin_user)) -> dict:
    """
    تأكيد أن التحويل تم فعلياً (للأدمن)
    
    ✅ النظام الجديد:
    - الأدمن يفتح تطبيق البنك/شام كاش ويحول المبلغ
    - ثم يضغط هذا الزر لتأكيد أن التحويل تم
    - المبلغ مخصوم مسبقاً من محفظة المستخدم
    """
    withdrawal = await db.withdrawal_requests.find_one({"id": withdrawal_id})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="طلب السحب غير موجود")
    
    if withdrawal["status"] != "ready_for_transfer":
        raise HTTPException(status_code=400, detail="هذا الطلب ليس جاهزاً للتحويل")
    
    now = datetime.now(timezone.utc)
    
    # تحديث حالة الطلب إلى "مكتمل"
    await db.withdrawal_requests.update_one(
        {"id": withdrawal_id},
        {
            "$set": {
                "status": "transferred",
                "transferred_by": user["id"],
                "transferred_at": now.isoformat()
            }
        }
    )
    
    # إشعار المستخدم
    method = withdrawal.get("withdrawal_method", "shamcash")
    method_name = "حساب بنكي" if method == "bank_account" else "شام كاش"
    
    await create_notification_for_user(
        user_id=withdrawal["user_id"],
        title="✅ تم تحويل مبلغك!",
        message=f"تم تحويل {withdrawal['amount']:,.0f} ل.س إلى {method_name}",
        notification_type="withdrawal_transferred"
    )
    
    return {"message": "تم تأكيد التحويل بنجاح"}


@router.post("/admin/withdrawals/{withdrawal_id}/approve")
async def approve_withdrawal(withdrawal_id: str, user: dict = Depends(require_admin_user)) -> dict:
    """
    [للتوافق الخلفي] الموافقة على طلب سحب قديم (pending)
    
    ⚠️ هذا الـ API للطلبات القديمة فقط. الطلبات الجديدة تأتي بحالة ready_for_transfer
    """
    withdrawal = await db.withdrawal_requests.find_one({"id": withdrawal_id})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="طلب السحب غير موجود")
    
    # دعم الطلبات القديمة (pending) والجديدة (ready_for_transfer)
    if withdrawal["status"] not in ["pending", "ready_for_transfer"]:
        raise HTTPException(status_code=400, detail="لا يمكن معالجة هذا الطلب")
    
    now = datetime.now(timezone.utc)
    
    # إذا كان الطلب قديماً (pending) - نخصم من المحفظة
    if withdrawal["status"] == "pending":
        await db.wallets.update_one(
            {"user_id": withdrawal["user_id"]},
            {
                "$inc": {
                    "balance": -withdrawal["amount"],
                    "total_withdrawn": withdrawal["amount"]
                }
            }
        )
        
        # تسجيل المعاملة
        method = withdrawal.get("withdrawal_method", "shamcash")
        method_details = withdrawal.get("shamcash_phone", "") if method == "shamcash" else withdrawal.get("bank_name", "")
        
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": withdrawal["user_id"],
            "type": "withdrawal",
            "amount": -withdrawal["amount"],
            "description": f"سحب إلى {method_details}",
            "withdrawal_id": withdrawal_id,
            "created_at": now.isoformat()
        })
    
    # تحديث حالة الطلب
    await db.withdrawal_requests.update_one(
        {"id": withdrawal_id},
        {
            "$set": {
                "status": "transferred",
                "approved_by": user["id"],
                "approved_at": now.isoformat(),
                "transferred_by": user["id"],
                "transferred_at": now.isoformat()
            }
        }
    )
    
    # إشعار المستخدم
    method = withdrawal.get("withdrawal_method", "shamcash")
    method_name = "حساب بنكي" if method == "bank_account" else "شام كاش"
    
    await create_notification_for_user(
        user_id=withdrawal["user_id"],
        title="✅ تم تحويل مبلغك!",
        message=f"تم تحويل {withdrawal['amount']:,.0f} ل.س إلى {method_name}",
        notification_type="wallet"
    )
    
    return {"message": "تم الموافقة على طلب السحب وتحويل المبلغ"}
