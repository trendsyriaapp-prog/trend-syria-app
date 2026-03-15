# /app/backend/services/earnings_hold.py
# نظام تعليق الأرباح لحين انتهاء فترة الإرجاع

from datetime import datetime, timezone, timedelta
from core.database import db, create_notification_for_user
import uuid

# الإعدادات الافتراضية
DEFAULT_HOLD_HOURS_FOOD = 1  # ساعة واحدة لطلبات الطعام
DEFAULT_HOLD_HOURS_PRODUCTS = 24  # 24 ساعة لطلبات المنتجات


async def get_hold_settings():
    """جلب إعدادات فترة التعليق"""
    settings = await db.settings.find_one({"type": "earnings_hold"}, {"_id": 0})
    
    if not settings:
        settings = {
            "type": "earnings_hold",
            "food_hold_hours": DEFAULT_HOLD_HOURS_FOOD,
            "products_hold_hours": DEFAULT_HOLD_HOURS_PRODUCTS,
            "enabled": True
        }
        await db.settings.insert_one(settings)
    
    return settings


async def add_held_earnings(
    user_id: str,
    user_type: str,
    amount: float,
    order_id: str,
    order_type: str,  # 'food' or 'product'
    description: str
):
    """
    إضافة أرباح معلقة حتى انتهاء فترة الإرجاع
    """
    settings = await get_hold_settings()
    
    if not settings.get("enabled", True):
        # إذا كان التعليق معطلاً، نضيف مباشرة للرصيد
        return await add_to_wallet_immediately(user_id, user_type, amount, order_id, description)
    
    # تحديد فترة التعليق
    if order_type == "food":
        hold_hours = settings.get("food_hold_hours", DEFAULT_HOLD_HOURS_FOOD)
    else:
        hold_hours = settings.get("products_hold_hours", DEFAULT_HOLD_HOURS_PRODUCTS)
    
    now = datetime.now(timezone.utc)
    release_at = now + timedelta(hours=hold_hours)
    
    # إنشاء سجل الأرباح المعلقة
    held_earning = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_type": user_type,
        "amount": amount,
        "order_id": order_id,
        "order_type": order_type,
        "description": description,
        "status": "held",  # held, released, cancelled
        "created_at": now.isoformat(),
        "release_at": release_at.isoformat(),
        "hold_hours": hold_hours
    }
    
    await db.held_earnings.insert_one(held_earning)
    
    # تحديث الرصيد المعلق في المحفظة
    wallet = await db.wallets.find_one({"user_id": user_id})
    if not wallet:
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_type": user_type,
            "balance": 0,
            "pending_balance": 0,
            "held_balance": 0,
            "total_earned": 0,
            "total_withdrawn": 0,
            "created_at": now.isoformat()
        }
        await db.wallets.insert_one(wallet)
    
    await db.wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"held_balance": amount}}
    )
    
    # إشعار المستخدم
    await create_notification_for_user(
        user_id=user_id,
        title="💰 أرباح معلقة",
        message=f"تم إضافة {amount:,.0f} ل.س (معلق لمدة {hold_hours} ساعة)",
        notification_type="wallet",
        order_id=order_id
    )
    
    return {
        "success": True,
        "held_earning_id": held_earning["id"],
        "amount": amount,
        "release_at": release_at.isoformat(),
        "hold_hours": hold_hours
    }


async def add_to_wallet_immediately(user_id: str, user_type: str, amount: float, order_id: str, description: str):
    """إضافة مباشرة للمحفظة (بدون تعليق)"""
    now = datetime.now(timezone.utc)
    
    wallet = await db.wallets.find_one({"user_id": user_id})
    if not wallet:
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_type": user_type,
            "balance": 0,
            "pending_balance": 0,
            "held_balance": 0,
            "total_earned": 0,
            "total_withdrawn": 0,
            "created_at": now.isoformat()
        }
        await db.wallets.insert_one(wallet)
    
    await db.wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"balance": amount, "total_earned": amount}}
    )
    
    # تسجيل المعاملة
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": "earning",
        "amount": amount,
        "description": description,
        "order_id": order_id,
        "created_at": now.isoformat()
    })
    
    await create_notification_for_user(
        user_id=user_id,
        title="💰 تم إضافة رصيد",
        message=f"تم إضافة {amount:,.0f} ل.س إلى محفظتك",
        notification_type="wallet",
        order_id=order_id
    )
    
    return {"success": True, "amount": amount, "immediate": True}


async def release_held_earnings():
    """
    إطلاق الأرباح المعلقة التي انتهت فترة تعليقها
    يُستدعى من background task كل 5 دقائق
    """
    now = datetime.now(timezone.utc)
    
    # البحث عن الأرباح المعلقة التي حان وقت إطلاقها
    held_earnings = await db.held_earnings.find({
        "status": "held",
        "release_at": {"$lte": now.isoformat()}
    }).to_list(100)
    
    released_count = 0
    total_released = 0
    
    for earning in held_earnings:
        try:
            user_id = earning["user_id"]
            amount = earning["amount"]
            
            # نقل من held_balance إلى balance
            await db.wallets.update_one(
                {"user_id": user_id},
                {
                    "$inc": {
                        "held_balance": -amount,
                        "balance": amount,
                        "total_earned": amount
                    }
                }
            )
            
            # تحديث حالة الأرباح المعلقة
            await db.held_earnings.update_one(
                {"id": earning["id"]},
                {
                    "$set": {
                        "status": "released",
                        "released_at": now.isoformat()
                    }
                }
            )
            
            # تسجيل المعاملة
            await db.wallet_transactions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": "earning_released",
                "amount": amount,
                "description": f"إطلاق أرباح معلقة - {earning['description']}",
                "order_id": earning.get("order_id"),
                "held_earning_id": earning["id"],
                "created_at": now.isoformat()
            })
            
            # إشعار المستخدم
            await create_notification_for_user(
                user_id=user_id,
                title="✅ تم إضافة أرباحك",
                message=f"تم إضافة {amount:,.0f} ل.س لرصيدك المتاح",
                notification_type="wallet",
                order_id=earning.get("order_id")
            )
            
            released_count += 1
            total_released += amount
            
        except Exception as e:
            print(f"Error releasing held earning {earning['id']}: {e}")
    
    return {
        "released_count": released_count,
        "total_released": total_released
    }


async def cancel_held_earnings(order_id: str, reason: str = "إلغاء الطلب"):
    """
    إلغاء الأرباح المعلقة (عند إرجاع الطلب أو إلغائه)
    """
    now = datetime.now(timezone.utc)
    
    held_earnings = await db.held_earnings.find({
        "order_id": order_id,
        "status": "held"
    }).to_list(10)
    
    cancelled_count = 0
    total_cancelled = 0
    
    for earning in held_earnings:
        try:
            user_id = earning["user_id"]
            amount = earning["amount"]
            
            # إزالة من held_balance
            await db.wallets.update_one(
                {"user_id": user_id},
                {"$inc": {"held_balance": -amount}}
            )
            
            # تحديث حالة الأرباح المعلقة
            await db.held_earnings.update_one(
                {"id": earning["id"]},
                {
                    "$set": {
                        "status": "cancelled",
                        "cancelled_at": now.isoformat(),
                        "cancel_reason": reason
                    }
                }
            )
            
            # تسجيل المعاملة
            await db.wallet_transactions.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": "earning_cancelled",
                "amount": -amount,
                "description": f"إلغاء أرباح معلقة: {reason}",
                "order_id": order_id,
                "held_earning_id": earning["id"],
                "created_at": now.isoformat()
            })
            
            # إشعار المستخدم
            await create_notification_for_user(
                user_id=user_id,
                title="⚠️ تم إلغاء أرباح",
                message=f"تم إلغاء {amount:,.0f} ل.س بسبب: {reason}",
                notification_type="wallet",
                order_id=order_id
            )
            
            cancelled_count += 1
            total_cancelled += amount
            
        except Exception as e:
            print(f"Error cancelling held earning {earning['id']}: {e}")
    
    return {
        "cancelled_count": cancelled_count,
        "total_cancelled": total_cancelled
    }


async def get_user_held_earnings(user_id: str):
    """جلب الأرباح المعلقة للمستخدم"""
    held = await db.held_earnings.find(
        {"user_id": user_id, "status": "held"},
        {"_id": 0}
    ).sort("release_at", 1).to_list(50)
    
    total_held = sum(e["amount"] for e in held)
    
    return {
        "held_earnings": held,
        "total_held": total_held,
        "count": len(held)
    }
