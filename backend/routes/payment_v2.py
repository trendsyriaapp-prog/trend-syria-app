# /app/backend/routes/payment_v2.py
# نظام الدفع الفعلي - شام كاش + سيرياتيل + بطاقات بنكية

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from datetime import datetime, timezone
from typing import Optional

from core.database import db, get_current_user, create_notification_for_user
from helpers.datetime_helpers import get_now
from services.payment_providers import (
    payment_manager,
    PaymentProviderError
)
from routes.wallet import add_pending_to_wallet

router = APIRouter(prefix="/payment/v2", tags=["Payment V2"])
# ============== Authorization Dependencies ==============

async def require_admin_user(user: dict = Depends(get_current_user)) -> dict:
    """التحقق من أن المستخدم admin أو sub_admin"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    return user




# ============== حالة نظام الدفع ==============

@router.get("/status")
async def get_payment_system_status() -> dict:
    """
    الحصول على حالة نظام الدفع ومزوديه
    
    يُظهر:
    - الوضع الحالي (sandbox/production)
    - حالة كل مزود دفع
    - إذا كان مُفعّل ومُعد بشكل صحيح
    """
    status = payment_manager.get_payment_status()
    
    # إضافة معلومات إضافية للتاجر
    status["instructions"] = {
        "shamcash": {
            "description": "شام كاش - محفظة إلكترونية سورية",
            "how_to_activate": [
                "1. سجل في apisyria.com",
                "2. اربط حساب شام كاش الخاص بالمتجر",
                "3. احصل على API Key",
                "4. أضف APISYRIA_API_KEY و SHAMCASH_ACCOUNT_ADDRESS في .env"
            ]
        },
        "bank_account": {
            "description": "حساب بنكي - تحويل بنكي مباشر",
            "how_to_activate": [
                "1. افتح حساب بنكي تجاري",
                "2. أضف بيانات الحساب في إعدادات الدفع",
                "3. العملاء يحولون مباشرة وترفع صورة الإيصال"
            ]
        },
        "bank_card": {
            "description": "بطاقات بنكية (Visa/Mastercard)",
            "status": "قيد التطوير - Visa بدأت شراكة مع سوريا ديسمبر 2025",
            "how_to_activate": [
                "1. انتظر إطلاق بوابات الدفع البنكية في سوريا",
                "2. تواصل مع بنك QNB أو بنك آخر مرخص",
                "3. احصل على حساب تاجر",
                "4. أضف بيانات البوابة في .env"
            ]
        }
    }
    
    return status


@router.get("/provider/{provider}/balance")
async def get_provider_balance(
    provider: str,
    user: dict = Depends(require_admin_user)
) -> dict:
    """جلب رصيد حساب التاجر لمزود معين (للمدير فقط)"""
    try:
        if provider == "shamcash":
            result = await payment_manager.shamcash.get_balance()
        else:
            raise HTTPException(status_code=400, detail="مزود غير مدعوم")
        
        return result
    except PaymentProviderError as e:
        raise HTTPException(status_code=400, detail=e.message)


# ============== التحقق من الدفع ==============

@router.post("/verify")
async def verify_payment(
    order_id: str = Query(..., description="رقم الطلب"),
    transaction_id: str = Query(..., description="رقم العملية من تطبيق الدفع"),
    user: dict = Depends(get_current_user)
) -> dict:
    """
    التحقق من دفع الطلب
    
    بعد أن يُحول العميل المبلغ عبر شام كاش أو سيرياتيل، يُدخل رقم العملية هنا للتحقق.
    
    - يتم البحث عن العملية في سجلات المزود
    - يتم مطابقة المبلغ
    - عند النجاح، يتم تأكيد الطلب
    """
    # جلب الطلب
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]})
    if not order:
        # تجربة طلبات الطعام
        order = await db.food_orders.find_one({"id": order_id, "customer_id": user["id"]})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("status") not in ["pending_payment", "pending"]:
        raise HTTPException(status_code=400, detail="تم دفع هذا الطلب مسبقاً أو حالته لا تسمح بالدفع")
    
    payment_method = order.get("payment_method", "shamcash")
    total_amount = order.get("total", 0)
    
    # التحقق من الدفع
    try:
        result = await payment_manager.verify_payment(
            payment_method=payment_method,
            transaction_id=transaction_id,
            expected_amount=total_amount,
            order_id=order_id
        )
        
        if not result.get("verified"):
            return {
                "success": False,
                "error": result.get("error", "فشل التحقق"),
                "code": result.get("code")
            }
        
        # تحديث حالة الطلب
        collection = db.orders if "items" in order else db.food_orders
        
        await collection.update_one(
            {"id": order_id},
            {
                "$set": {
                    "status": "paid",
                    "payment_status": "paid",
                    "paid_at": get_now(),
                    "payment_transaction_id": transaction_id,
                    "payment_verified_at": get_now(),
                    "payment_sandbox": result.get("sandbox", False)
                }
            }
        )
        
        # إجراءات ما بعد الدفع
        await _process_successful_payment(order, collection.name)
        
        return {
            "success": True,
            "message": "تم التحقق من الدفع بنجاح!",
            "order_id": order_id,
            "transaction_id": transaction_id,
            "sandbox": result.get("sandbox", False)
        }
        
    except PaymentProviderError as e:
        raise HTTPException(status_code=400, detail=e.message)


async def _process_successful_payment(order: dict, collection_name: str) -> None:
    """معالجة الطلب بعد نجاح الدفع"""
    order_id = order["id"]
    
    if collection_name == "orders":
        # طلب منتجات
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
            
            # إشعار البائع
            await create_notification_for_user(
                user_id=seller_id,
                title="طلب جديد مدفوع! 💰",
                message=f"لديك طلب جديد بقيمة {order['total']:,.0f} ل.س",
                notification_type="new_order",
                order_id=order_id
            )
        
        # حذف السلة
        await db.carts.delete_one({"user_id": order["user_id"]})
    
    else:
        # طلب طعام
        store_id = order.get("store_id")
        if store_id:
            store = await db.food_stores.find_one({"id": store_id})
            if store:
                # إشعار المتجر
                await create_notification_for_user(
                    user_id=store.get("owner_id"),
                    title="طلب جديد مدفوع! 🍔",
                    message=f"طلب جديد #{order_id[:8]} - {order.get('total', 0):,.0f} ل.س",
                    notification_type="new_food_order",
                    order_id=order_id
                )


# ============== بدء جلسة دفع بطاقة بنكية ==============

@router.post("/card/session")
async def create_card_payment_session(
    order_id: str = Query(...),
    user: dict = Depends(get_current_user)
) -> dict:
    """
    إنشاء جلسة دفع بالبطاقة البنكية
    
    ملاحظة: هذه الخدمة قيد التطوير وستكون متاحة بعد إطلاق بوابات Visa/Mastercard في سوريا
    """
    # جلب الطلب
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]})
    if not order:
        order = await db.food_orders.find_one({"id": order_id, "customer_id": user["id"]})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if order.get("status") not in ["pending_payment", "pending"]:
        raise HTTPException(status_code=400, detail="تم دفع هذا الطلب مسبقاً")
    
    try:
        result = await payment_manager.bank_card.create_payment_session(
            order_id=order_id,
            amount=order.get("total", 0),
            currency="SYP"
        )
        
        return result
        
    except PaymentProviderError as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.post("/card/verify")
async def verify_card_payment(
    order_id: str = Query(...),
    session_id: str = Query(...),
    user: dict = Depends(get_current_user)
) -> dict:
    """التحقق من إتمام الدفع بالبطاقة البنكية"""
    order = await db.orders.find_one({"id": order_id, "user_id": user["id"]})
    if not order:
        order = await db.food_orders.find_one({"id": order_id, "customer_id": user["id"]})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    try:
        result = await payment_manager.bank_card.verify_payment(
            session_id=session_id,
            order_id=order_id
        )
        
        if result.get("verified"):
            collection = db.orders if "items" in order else db.food_orders
            
            await collection.update_one(
                {"id": order_id},
                {
                    "$set": {
                        "status": "paid",
                        "payment_status": "paid",
                        "paid_at": get_now(),
                        "payment_session_id": session_id,
                        "payment_method": "bank_card"
                    }
                }
            )
            
            await _process_successful_payment(order, collection.name)
        
        return result
        
    except PaymentProviderError as e:
        raise HTTPException(status_code=400, detail=e.message)


# ============== تعليمات الدفع للعميل ==============

@router.get("/instructions/{payment_method}")
async def get_payment_instructions(
    payment_method: str,
    order_id: Optional[str] = None
) -> dict:
    """
    الحصول على تعليمات الدفع للعميل
    
    تُعرض للعميل بعد إنشاء الطلب لإرشاده لكيفية إتمام الدفع
    """
    # جلب بيانات حساب التاجر
    merchant_settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    payment_settings = merchant_settings.get("payment_settings", {}) if merchant_settings else {}
    
    order_total = None
    if order_id:
        order = await db.orders.find_one({"id": order_id}, {"_id": 0, "total": 1})
        if not order:
            order = await db.food_orders.find_one({"id": order_id}, {"_id": 0, "total": 1})
        if order:
            order_total = order.get("total")
    
    instructions = {
        "shamcash": {
            "method_name": "شام كاش",
            "icon": "🏦",
            "steps": [
                "1. افتح تطبيق شام كاش",
                "2. اختر 'تحويل'",
                f"3. أدخل عنوان المستلم: {payment_settings.get('shamcash_address', '[سيتم تحديده]')}",
                f"4. أدخل المبلغ: {order_total:,.0f} ل.س" if order_total else "4. أدخل مبلغ الطلب",
                f"5. في الملاحظة، اكتب رقم طلبك: {order_id[:8] if order_id else '[رقم الطلب]'}",
                "6. أكمل التحويل واحفظ رقم العملية",
                "7. أدخل رقم العملية في التطبيق لتأكيد الدفع"
            ],
            "merchant_address": payment_settings.get("shamcash_address"),
            "note": "رقم العملية يظهر في تطبيق شام كاش بعد إتمام التحويل"
        },
        "bank_account": {
            "method_name": "حساب بنكي",
            "icon": "🏛️",
            "steps": [
                "1. ادخل لتطبيق البنك الخاص بك",
                "2. اختر 'تحويل'",
                f"3. أدخل رقم الحساب: {payment_settings.get('bank_account_number', '[سيتم تحديده]')}",
                f"4. البنك: {payment_settings.get('bank_name', '[سيتم تحديده]')}",
                f"5. أدخل المبلغ: {order_total:,.0f} ل.س" if order_total else "5. أدخل مبلغ الطلب",
                f"6. في الملاحظة، اكتب رقم طلبك: {order_id[:8] if order_id else '[رقم الطلب]'}",
                "7. أكمل التحويل وارفع صورة الإيصال"
            ],
            "bank_name": payment_settings.get("bank_name"),
            "account_number": payment_settings.get("bank_account_number"),
            "account_holder": payment_settings.get("bank_account_holder"),
            "note": "احتفظ بإيصال التحويل البنكي لتأكيد الدفع"
        },
        "card": {
            "method_name": "بطاقة بنكية",
            "icon": "💳",
            "status": "قيد التطوير",
            "steps": [
                "الدفع بالبطاقة البنكية سيكون متاحاً قريباً",
                "يرجى استخدام شام كاش أو حساب بنكي حالياً"
            ],
            "note": "Visa و Mastercard بدأتا الشراكة مع سوريا في ديسمبر 2025"
        }
    }
    
    if payment_method not in instructions:
        raise HTTPException(status_code=400, detail="طريقة دفع غير مدعومة")
    
    return {
        "payment_method": payment_method,
        "order_id": order_id,
        "order_total": order_total,
        **instructions[payment_method]
    }


# ============== إعدادات الدفع للمدير ==============

@router.get("/admin/settings")
async def get_payment_settings(user: dict = Depends(require_admin_user)) -> dict:
    """جلب إعدادات الدفع (للمدير)"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    payment_settings = settings.get("payment_settings", {}) if settings else {}
    
    return {
        "payment_settings": payment_settings,
        "provider_status": payment_manager.get_payment_status()
    }


@router.put("/admin/settings")
async def update_payment_settings(
    settings: dict = Body(...),
    user: dict = Depends(get_current_user)
) -> dict:
    """تحديث إعدادات الدفع (للمدير)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # الحقول المسموح تحديثها
    allowed_fields = [
        "shamcash_address",
        "shamcash_name",
        "bank_account_number",
        "bank_name",
        "bank_account_holder"
    ]
    
    filtered_settings = {k: v for k, v in settings.items() if k in allowed_fields}
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {"$set": {"payment_settings": filtered_settings}},
        upsert=True
    )
    
    return {"success": True, "message": "تم تحديث إعدادات الدفع"}
