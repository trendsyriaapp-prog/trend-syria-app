# /app/backend/routes/wallet.py
# نظام المحفظة للجميع (عملاء، بائعين، موظفي توصيل)

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import uuid

from core.database import db, get_current_user, create_notification_for_user

# استيراد مزودي الدفع
try:
    from services.payment_providers import payment_manager, PaymentProviderError
    PAYMENT_PROVIDERS_AVAILABLE = True
except ImportError:
    PAYMENT_PROVIDERS_AVAILABLE = False

router = APIRouter(prefix="/wallet", tags=["Wallet"])

# ============== Wallet Balance ==============

@router.get("/balance")
async def get_wallet_balance(user: dict = Depends(get_current_user)):
    """الحصول على رصيد المحفظة - متاح لجميع المستخدمين"""
    
    wallet = await db.wallets.find_one({"user_id": user["id"]}, {"_id": 0})
    
    if not wallet:
        # إنشاء محفظة جديدة
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "user_type": user["user_type"],
            "balance": 0,
            "pending_balance": 0,  # رصيد معلق (طلبات لم تُسلّم بعد)
            "total_earned": 0,
            "total_withdrawn": 0,
            "total_topped_up": 0,  # إجمالي الشحن (للعملاء)
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
        wallet.pop("_id", None)
    
    # Get pending withdrawal requests (for sellers/delivery)
    pending_amount = 0
    if user["user_type"] in ["seller", "delivery", "food_seller"]:
        pending_withdrawals = await db.withdrawal_requests.find({
            "user_id": user["id"],
            "status": "pending"
        }, {"_id": 0}).to_list(10)
        pending_amount = sum(w.get("amount", 0) for w in pending_withdrawals)
    
    # Get pending topup requests (for buyers)
    pending_topup = 0
    if user["user_type"] == "buyer":
        pending_topups = await db.topup_requests.find({
            "user_id": user["id"],
            "status": "pending"
        }, {"_id": 0}).to_list(10)
        pending_topup = sum(t.get("amount", 0) for t in pending_topups)
    
    return {
        **wallet,
        "pending_withdrawals": pending_amount,
        "pending_topup": pending_topup,
        "available_balance": wallet["balance"] - pending_amount
    }

@router.get("/transactions")
async def get_wallet_transactions(
    user: dict = Depends(get_current_user),
    limit: int = Query(default=50, le=100)
):
    """سجل المعاملات - متاح لجميع المستخدمين"""
    
    # حذف السجلات الأقدم من 3 أشهر تلقائياً
    from datetime import timedelta
    three_months_ago = datetime.now(timezone.utc) - timedelta(days=90)
    await db.wallet_transactions.delete_many({
        "user_id": user["id"],
        "created_at": {"$lt": three_months_ago.isoformat()}
    })
    
    transactions = await db.wallet_transactions.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return transactions


@router.delete("/transactions/clear")
async def clear_wallet_transactions(user: dict = Depends(get_current_user)):
    """حذف جميع سجلات المحفظة للمستخدم الحالي - الرصيد لن يتغير"""
    
    result = await db.wallet_transactions.delete_many({"user_id": user["id"]})
    
    return {
        "success": True,
        "message": "تم حذف سجلات المحفظة بنجاح",
        "deleted_count": result.deleted_count
    }


# ============== شحن المحفظة للعملاء (Top Up) ==============

class TopUpRequest(BaseModel):
    amount: int
    shamcash_phone: Optional[str] = None  # اختياري الآن
    payment_method: Optional[str] = "shamcash"  # شام كاش، سيرياتيل، MTN

@router.post("/topup/request")
async def request_topup(
    data: TopUpRequest,
    user: dict = Depends(get_current_user)
):
    """طلب شحن رصيد المحفظة - للعملاء فقط"""
    if user["user_type"] != "buyer":
        raise HTTPException(status_code=403, detail="شحن المحفظة متاح للعملاء فقط")
    
    # التحقق من الحد الأدنى فقط
    MIN_TOPUP = 100       # 100 ل.س جديدة (الحد الأدنى)
    
    if data.amount < MIN_TOPUP:
        raise HTTPException(status_code=400, detail=f"الحد الأدنى للشحن {MIN_TOPUP:,} ل.س")
    
    # إنشاء طلب الشحن
    topup_id = str(uuid.uuid4())
    topup_code = f"TOP{datetime.now().strftime('%y%m%d')}{str(uuid.uuid4())[:4].upper()}"
    
    topup_request = {
        "id": topup_id,
        "code": topup_code,
        "user_id": user["id"],
        "user_name": user.get("full_name", user.get("name", "")),
        "user_phone": user.get("phone", ""),
        "amount": data.amount,
        "payment_method": data.payment_method or "shamcash",
        "shamcash_phone": data.shamcash_phone,
        "status": "pending",  # pending, approved, rejected, cancelled
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.topup_requests.insert_one(topup_request)
    
    # إشعار الإدارة
    await create_notification_for_user(
        user_id="admin",  # سيُرسل لجميع المدراء
        title="💳 طلب شحن محفظة جديد",
        message=f"طلب شحن بقيمة {data.amount:,} ل.س من {user.get('name', '')}",
        notification_type="topup_request"
    )
    
    return {
        "success": True,
        "message": "تم إرسال طلب الشحن. سيتم مراجعته وإضافة الرصيد خلال دقائق.",
        "topup_id": topup_id,
        "topup_code": topup_code,
        "amount": data.amount,
        "status": "pending"
    }

@router.get("/topup/history")
async def get_topup_history(user: dict = Depends(get_current_user)):
    """سجل طلبات الشحن - للعملاء"""
    if user["user_type"] != "buyer":
        raise HTTPException(status_code=403, detail="للعملاء فقط")
    
    topups = await db.topup_requests.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return topups

@router.delete("/topup/{topup_id}")
async def cancel_topup(topup_id: str, user: dict = Depends(get_current_user)):
    """إلغاء طلب شحن معلق"""
    topup = await db.topup_requests.find_one({
        "id": topup_id,
        "user_id": user["id"]
    })
    
    if not topup:
        raise HTTPException(status_code=404, detail="طلب الشحن غير موجود")
    
    if topup["status"] != "pending":
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء هذا الطلب")
    
    await db.topup_requests.update_one(
        {"id": topup_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "تم إلغاء طلب الشحن"}


# ============== التحقق التلقائي من شحن المحفظة ==============

class TopupVerifyRequest(BaseModel):
    topup_id: str
    transaction_id: str
    payment_method: str = "shamcash"

@router.post("/topup/verify")
async def verify_topup_payment(
    data: TopupVerifyRequest,
    user: dict = Depends(get_current_user)
):
    """
    التحقق من تحويل شحن المحفظة برقم العملية
    
    يقوم بالتحقق من التحويل عبر API Syria وإضافة الرصيد تلقائياً
    """
    if user["user_type"] != "buyer":
        raise HTTPException(status_code=403, detail="للعملاء فقط")
    
    # جلب طلب الشحن
    topup = await db.topup_requests.find_one({
        "id": data.topup_id,
        "user_id": user["id"]
    })
    
    if not topup:
        raise HTTPException(status_code=404, detail="طلب الشحن غير موجود")
    
    if topup["status"] != "pending":
        raise HTTPException(status_code=400, detail="تم معالجة هذا الطلب مسبقاً")
    
    # التحقق من أن رقم العملية لم يُستخدم من قبل
    existing_tx = await db.topup_requests.find_one({
        "transaction_id": data.transaction_id,
        "status": "approved"
    })
    if existing_tx:
        raise HTTPException(status_code=400, detail="رقم العملية مستخدم مسبقاً")
    
    # التحقق عبر مزود الدفع
    if PAYMENT_PROVIDERS_AVAILABLE:
        try:
            result = await payment_manager.verify_payment(
                payment_method=data.payment_method,
                transaction_id=data.transaction_id,
                expected_amount=topup["amount"],
                order_id=data.topup_id
            )
            
            if not result.get("verified"):
                return {
                    "success": False,
                    "message": result.get("error", "فشل التحقق من العملية"),
                    "code": result.get("code")
                }
            
            is_sandbox = result.get("sandbox", False)
            
        except PaymentProviderError as e:
            return {
                "success": False,
                "message": e.message,
                "code": e.code
            }
    else:
        # إذا لم تكن مزودات الدفع متاحة، نعتبره تجريبي
        is_sandbox = True
    
    # نجح التحقق - إضافة الرصيد للمحفظة
    wallet = await db.wallets.find_one({"user_id": user["id"]})
    if not wallet:
        # إنشاء محفظة جديدة
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "user_type": user["user_type"],
            "balance": 0,
            "pending_balance": 0,
            "total_earned": 0,
            "total_withdrawn": 0,
            "total_topped_up": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
    
    # تحديث رصيد المحفظة
    new_balance = wallet.get("balance", 0) + topup["amount"]
    new_total_topped_up = wallet.get("total_topped_up", 0) + topup["amount"]
    
    await db.wallets.update_one(
        {"user_id": user["id"]},
        {
            "$set": {
                "balance": new_balance,
                "total_topped_up": new_total_topped_up
            }
        }
    )
    
    # تحديث حالة طلب الشحن
    await db.topup_requests.update_one(
        {"id": data.topup_id},
        {
            "$set": {
                "status": "approved",
                "approved_at": datetime.now(timezone.utc).isoformat(),
                "transaction_id": data.transaction_id,
                "payment_method": data.payment_method,
                "verified_automatically": True,
                "is_sandbox": is_sandbox
            }
        }
    )
    
    # إضافة سجل معاملة
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "topup",
        "amount": topup["amount"],
        "balance_after": new_balance,
        "description": f"شحن محفظة - {data.payment_method}",
        "reference_id": data.topup_id,
        "transaction_id": data.transaction_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wallet_transactions.insert_one(transaction)
    
    # إرسال إشعار للمستخدم
    await create_notification_for_user(
        user_id=user["id"],
        title="✅ تم شحن محفظتك!",
        message=f"تم إضافة {topup['amount']:,} ل.س لرصيدك. رصيدك الحالي: {new_balance:,} ل.س",
        notification_type="wallet_topup"
    )
    
    return {
        "success": True,
        "message": "تم شحن المحفظة بنجاح!",
        "amount": topup["amount"],
        "new_balance": new_balance,
        "is_sandbox": is_sandbox
    }


# ============== إدارة طلبات الشحن (للأدمن) ==============

@router.get("/admin/topup-requests")
async def get_all_topup_requests(
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """جلب جميع طلبات الشحن - للإدارة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للإدارة فقط")
    
    query = {}
    if status:
        query["status"] = status
    
    topups = await db.topup_requests.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return topups

@router.post("/admin/topup/{topup_id}/approve")
async def approve_topup(topup_id: str, user: dict = Depends(get_current_user)):
    """الموافقة على طلب شحن - للإدارة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للإدارة فقط")
    
    topup = await db.topup_requests.find_one({"id": topup_id})
    if not topup:
        raise HTTPException(status_code=404, detail="طلب الشحن غير موجود")
    
    if topup["status"] != "pending":
        raise HTTPException(status_code=400, detail="هذا الطلب ليس معلقاً")
    
    now = datetime.now(timezone.utc)
    
    # تحديث طلب الشحن
    await db.topup_requests.update_one(
        {"id": topup_id},
        {
            "$set": {
                "status": "approved",
                "approved_at": now.isoformat(),
                "approved_by": user["id"]
            }
        }
    )
    
    # إضافة الرصيد للمحفظة
    await db.wallets.update_one(
        {"user_id": topup["user_id"]},
        {
            "$inc": {
                "balance": topup["amount"],
                "total_topped_up": topup["amount"]
            }
        },
        upsert=True
    )
    
    # تسجيل المعاملة
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": topup["user_id"],
        "type": "topup",
        "amount": topup["amount"],
        "description": f"شحن رصيد - {topup['code']}",
        "topup_id": topup_id,
        "created_at": now.isoformat()
    })
    
    # إشعار العميل
    await create_notification_for_user(
        user_id=topup["user_id"],
        title="✅ تم شحن محفظتك!",
        message=f"تم إضافة {topup['amount']:,} ل.س إلى محفظتك بنجاح",
        notification_type="topup_approved"
    )
    
    return {"message": "تم الموافقة وإضافة الرصيد", "amount": topup["amount"]}

@router.post("/admin/topup/{topup_id}/reject")
async def reject_topup(
    topup_id: str,
    reason: str = Query(default="لم يتم استلام التحويل"),
    user: dict = Depends(get_current_user)
):
    """رفض طلب شحن - للإدارة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للإدارة فقط")
    
    topup = await db.topup_requests.find_one({"id": topup_id})
    if not topup:
        raise HTTPException(status_code=404, detail="طلب الشحن غير موجود")
    
    if topup["status"] != "pending":
        raise HTTPException(status_code=400, detail="هذا الطلب ليس معلقاً")
    
    await db.topup_requests.update_one(
        {"id": topup_id},
        {
            "$set": {
                "status": "rejected",
                "rejected_at": datetime.now(timezone.utc).isoformat(),
                "rejected_by": user["id"],
                "reject_reason": reason
            }
        }
    )
    
    # إشعار العميل
    await create_notification_for_user(
        user_id=topup["user_id"],
        title="❌ تم رفض طلب الشحن",
        message=f"السبب: {reason}",
        notification_type="topup_rejected"
    )
    
    return {"message": "تم رفض الطلب"}

# ============== Withdrawal Requests ==============

class WithdrawRequest(BaseModel):
    amount: int
    shamcash_phone: str

@router.post("/withdraw")
async def request_withdrawal(
    data: WithdrawRequest,
    user: dict = Depends(get_current_user)
):
    """طلب سحب رصيد"""
    amount = data.amount
    shamcash_phone = data.shamcash_phone
    
    if user["user_type"] not in ["seller", "delivery"]:
        raise HTTPException(status_code=403, detail="للبائعين وموظفي التوصيل فقط")
        raise HTTPException(status_code=403, detail="للبائعين وموظفي التوصيل فقط")
    
    # Get wallet
    wallet = await db.wallets.find_one({"user_id": user["id"]})
    if not wallet:
        raise HTTPException(status_code=400, detail="لا يوجد رصيد في المحفظة")
    
    # Get settings
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    min_withdrawal = 50000  # Default
    
    if settings:
        if user["user_type"] == "seller":
            min_withdrawal = settings.get("min_seller_withdrawal", 50000)
        else:
            min_withdrawal = settings.get("min_delivery_withdrawal", 25000)
    
    # Check minimum
    if amount < min_withdrawal:
        raise HTTPException(
            status_code=400, 
            detail=f"الحد الأدنى للسحب هو {min_withdrawal:,} ل.س"
        )
    
    # Check pending withdrawals
    pending = await db.withdrawal_requests.find({
        "user_id": user["id"],
        "status": "pending"
    }).to_list(10)
    pending_amount = sum(w.get("amount", 0) for w in pending)
    
    available = wallet["balance"] - pending_amount
    
    if amount > available:
        raise HTTPException(
            status_code=400, 
            detail=f"الرصيد المتاح للسحب هو {available:,} ل.س"
        )
    
    # Create withdrawal request
    withdrawal_id = str(uuid.uuid4())
    withdrawal = {
        "id": withdrawal_id,
        "user_id": user["id"],
        "user_name": user.get("full_name", user.get("name", "")),
        "user_type": user["user_type"],
        "user_phone": user.get("phone", ""),
        "amount": amount,
        "shamcash_phone": shamcash_phone,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.withdrawal_requests.insert_one(withdrawal)
    
    return {
        "message": "تم إرسال طلب السحب بنجاح",
        "withdrawal_id": withdrawal_id,
        "amount": amount,
        "status": "pending"
    }

@router.get("/withdrawals")
async def get_withdrawal_history(user: dict = Depends(get_current_user)):
    """سجل طلبات السحب"""
    if user["user_type"] not in ["seller", "delivery"]:
        raise HTTPException(status_code=403, detail="للبائعين وموظفي التوصيل فقط")
    
    withdrawals = await db.withdrawal_requests.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return withdrawals

@router.delete("/withdrawals/{withdrawal_id}")
async def cancel_withdrawal(withdrawal_id: str, user: dict = Depends(get_current_user)):
    """إلغاء طلب سحب معلق"""
    withdrawal = await db.withdrawal_requests.find_one({
        "id": withdrawal_id,
        "user_id": user["id"]
    })
    
    if not withdrawal:
        raise HTTPException(status_code=404, detail="طلب السحب غير موجود")
    
    if withdrawal["status"] != "pending":
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء هذا الطلب")
    
    await db.withdrawal_requests.update_one(
        {"id": withdrawal_id},
        {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "تم إلغاء طلب السحب"}

# ============== Helper Functions (للاستخدام الداخلي) ==============

async def add_to_wallet(user_id: str, user_type: str, amount: float, 
                        transaction_type: str, description: str, order_id: str = None):
    """إضافة رصيد للمحفظة"""
    # Get or create wallet
    wallet = await db.wallets.find_one({"user_id": user_id})
    
    if not wallet:
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_type": user_type,
            "balance": 0,
            "pending_balance": 0,
            "total_earned": 0,
            "total_withdrawn": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
    
    # Update balance
    await db.wallets.update_one(
        {"user_id": user_id},
        {
            "$inc": {
                "balance": amount,
                "total_earned": amount if amount > 0 else 0
            }
        }
    )
    
    # Create transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": transaction_type,
        "amount": amount,
        "description": description,
        "order_id": order_id,
        "balance_after": wallet["balance"] + amount,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.wallet_transactions.insert_one(transaction)
    
    return transaction

async def add_pending_to_wallet(user_id: str, user_type: str, amount: float, order_id: str):
    """إضافة رصيد معلق (حتى تأكيد التسليم)"""
    wallet = await db.wallets.find_one({"user_id": user_id})
    
    if not wallet:
        wallet = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_type": user_type,
            "balance": 0,
            "pending_balance": 0,
            "total_earned": 0,
            "total_withdrawn": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
    
    await db.wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"pending_balance": amount}}
    )
    
    # Record pending transaction
    await db.pending_earnings.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_type": user_type,
        "amount": amount,
        "order_id": order_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })

async def confirm_pending_earnings(order_id: str):
    """تأكيد الأرباح المعلقة بعد التسليم"""
    pending_records = await db.pending_earnings.find({
        "order_id": order_id,
        "status": "pending"
    }).to_list(10)
    
    for record in pending_records:
        # Move from pending to actual balance
        await db.wallets.update_one(
            {"user_id": record["user_id"]},
            {
                "$inc": {
                    "pending_balance": -record["amount"],
                    "balance": record["amount"],
                    "total_earned": record["amount"]
                }
            }
        )
        
        # Create transaction record
        await db.wallet_transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": record["user_id"],
            "type": "earning_confirmed",
            "amount": record["amount"],
            "description": f"أرباح من الطلب #{order_id[:8]}",
            "order_id": order_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update pending record
        await db.pending_earnings.update_one(
            {"id": record["id"]},
            {"$set": {"status": "confirmed", "confirmed_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Notify user
        await create_notification_for_user(
            user_id=record["user_id"],
            title="تم إضافة رصيد!",
            message=f"تم إضافة {record['amount']:,.0f} ل.س إلى محفظتك",
            notification_type="wallet",
            order_id=order_id
        )


# ============== Held Earnings APIs ==============

@router.get("/held-earnings")
async def get_held_earnings(user: dict = Depends(get_current_user)):
    """جلب الأرباح المعلقة للمستخدم"""
    if user["user_type"] not in ["seller", "food_seller", "delivery"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    from services.earnings_hold import get_user_held_earnings
    return await get_user_held_earnings(user["id"])


@router.get("/hold-settings")
async def get_hold_settings():
    """جلب إعدادات فترة التعليق"""
    from services.earnings_hold import get_hold_settings
    return await get_hold_settings()
