# /app/backend/routes/wallet.py
# نظام المحفظة والسحب للبائعين وموظفي التوصيل

from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime, timezone
from typing import Optional
import uuid

from core.database import db, get_current_user, create_notification_for_user

router = APIRouter(prefix="/wallet", tags=["Wallet"])

# ============== Wallet Balance ==============

@router.get("/balance")
async def get_wallet_balance(user: dict = Depends(get_current_user)):
    """الحصول على رصيد المحفظة"""
    if user["user_type"] not in ["seller", "delivery"]:
        raise HTTPException(status_code=403, detail="للبائعين وموظفي التوصيل فقط")
    
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
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet)
        wallet.pop("_id", None)
    
    # Get pending withdrawal requests
    pending_withdrawals = await db.withdrawal_requests.find({
        "user_id": user["id"],
        "status": "pending"
    }, {"_id": 0}).to_list(10)
    
    pending_amount = sum(w.get("amount", 0) for w in pending_withdrawals)
    
    return {
        **wallet,
        "pending_withdrawals": pending_amount,
        "available_balance": wallet["balance"] - pending_amount
    }

@router.get("/transactions")
async def get_wallet_transactions(
    user: dict = Depends(get_current_user),
    limit: int = Query(default=50, le=100)
):
    """سجل المعاملات"""
    if user["user_type"] not in ["seller", "delivery"]:
        raise HTTPException(status_code=403, detail="للبائعين وموظفي التوصيل فقط")
    
    transactions = await db.wallet_transactions.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return transactions

# ============== Withdrawal Requests ==============

@router.post("/withdraw")
async def request_withdrawal(
    amount: int = Query(..., gt=0),
    shamcash_phone: str = Query(...),
    user: dict = Depends(get_current_user)
):
    """طلب سحب رصيد"""
    if user["user_type"] not in ["seller", "delivery"]:
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
