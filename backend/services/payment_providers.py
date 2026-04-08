# /app/backend/services/payment_providers.py
# نظام مزودي الدفع الفعلي - شام كاش + بطاقات بنكية

import os
import httpx
from datetime import datetime, timezone
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

# ============== إعدادات المزودين ==============

# API Syria - لشام كاش وسيرياتيل كاش
APISYRIA_BASE_URL = "https://apisyria.com/api/v1"
APISYRIA_API_KEY = os.environ.get("APISYRIA_API_KEY", "")
SHAMCASH_ACCOUNT_ADDRESS = os.environ.get("SHAMCASH_ACCOUNT_ADDRESS", "")

# إعدادات البطاقات البنكية (للمستقبل)
BANK_GATEWAY_URL = os.environ.get("BANK_GATEWAY_URL", "")
BANK_MERCHANT_ID = os.environ.get("BANK_MERCHANT_ID", "")
BANK_SECRET_KEY = os.environ.get("BANK_SECRET_KEY", "")

# الوضع التجريبي أو الفعلي
PAYMENT_MODE = os.environ.get("PAYMENT_MODE", "sandbox")  # sandbox أو production


class PaymentProviderError(Exception):
    """خطأ في مزود الدفع"""
    def __init__(self, message: str, code: str = "PAYMENT_ERROR", details: Dict = None):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)


# ============== شام كاش (ShamCash) ==============

class ShamCashProvider:
    """مزود دفع شام كاش عبر API Syria"""
    
    def __init__(self):
        self.base_url = APISYRIA_BASE_URL
        self.api_key = APISYRIA_API_KEY
        self.account_address = SHAMCASH_ACCOUNT_ADDRESS
        self.is_sandbox = PAYMENT_MODE == "sandbox"
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "X-Api-Key": self.api_key,
            "Accept": "application/json"
        }
    
    async def check_api_status(self) -> Dict[str, Any]:
        """التحقق من حالة API"""
        if self.is_sandbox:
            return {"success": True, "message": "Sandbox mode - API not called", "sandbox": True}
        
        if not self.api_key:
            raise PaymentProviderError("مفتاح API غير مُعرّف", "NO_API_KEY")
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.base_url}?resource=status",
                headers=self._get_headers()
            )
            
            if response.status_code != 200:
                raise PaymentProviderError(
                    f"فشل الاتصال بـ API Syria: {response.status_code}",
                    "API_CONNECTION_ERROR"
                )
            
            return response.json()
    
    async def get_balance(self) -> Dict[str, Any]:
        """جلب رصيد حساب شام كاش"""
        if self.is_sandbox:
            return {
                "success": True,
                "sandbox": True,
                "balances": [
                    {"currency": "SYP", "balance": 1000000},
                    {"currency": "USD", "balance": 0}
                ]
            }
        
        if not self.api_key or not self.account_address:
            raise PaymentProviderError("إعدادات شام كاش غير مكتملة", "INCOMPLETE_CONFIG")
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.base_url}?resource=shamcash&action=balance&account_address={self.account_address}",
                headers=self._get_headers()
            )
            
            data = response.json()
            if not data.get("success"):
                raise PaymentProviderError(
                    data.get("error", "فشل جلب الرصيد"),
                    "BALANCE_ERROR"
                )
            
            return data
    
    async def get_transaction_logs(self) -> Dict[str, Any]:
        """جلب سجل التحويلات"""
        if self.is_sandbox:
            return {
                "success": True,
                "sandbox": True,
                "items": []
            }
        
        if not self.api_key or not self.account_address:
            raise PaymentProviderError("إعدادات شام كاش غير مكتملة", "INCOMPLETE_CONFIG")
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.base_url}?resource=shamcash&action=logs&account_address={self.account_address}",
                headers=self._get_headers()
            )
            
            data = response.json()
            if not data.get("success"):
                raise PaymentProviderError(
                    data.get("error", "فشل جلب السجلات"),
                    "LOGS_ERROR"
                )
            
            return data
    
    async def find_transaction(self, transaction_id: str) -> Dict[str, Any]:
        """البحث عن تحويل برقم العملية"""
        if self.is_sandbox:
            # في الوضع التجريبي، نعتبر أي رقم صحيح
            return {
                "success": True,
                "sandbox": True,
                "found": True,
                "transaction": {
                    "tran_id": transaction_id,
                    "from_name": "عميل تجريبي",
                    "to_name": "ترند سورية",
                    "currency": "SYP",
                    "amount": 100000,
                    "datetime": datetime.now(timezone.utc).isoformat(),
                    "note": "طلب تجريبي"
                }
            }
        
        if not self.api_key or not self.account_address:
            raise PaymentProviderError("إعدادات شام كاش غير مكتملة", "INCOMPLETE_CONFIG")
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.base_url}?resource=shamcash&action=find_tx&tx={transaction_id}&account_address={self.account_address}",
                headers=self._get_headers()
            )
            
            data = response.json()
            if not data.get("success"):
                raise PaymentProviderError(
                    data.get("error", "فشل البحث عن العملية"),
                    "FIND_TX_ERROR"
                )
            
            return data
    
    async def verify_payment(
        self,
        transaction_id: str,
        expected_amount: float,
        order_id: str,
        tolerance_percent: float = 1.0
    ) -> Dict[str, Any]:
        """
        التحقق من دفع العميل
        
        Args:
            transaction_id: رقم العملية من شام كاش
            expected_amount: المبلغ المتوقع
            order_id: رقم الطلب للتحقق من الملاحظة
            tolerance_percent: نسبة التسامح في المبلغ (افتراضي 1%)
        
        Returns:
            نتيجة التحقق
        """
        try:
            result = await self.find_transaction(transaction_id)
            
            if not result.get("found") and not result.get("sandbox"):
                return {
                    "verified": False,
                    "error": "رقم العملية غير موجود",
                    "code": "TX_NOT_FOUND"
                }
            
            transaction = result.get("transaction", {})
            
            # في الوضع الفعلي، تحقق من المبلغ
            if not self.is_sandbox:
                actual_amount = float(transaction.get("amount", 0))
                min_amount = expected_amount * (1 - tolerance_percent / 100)
                max_amount = expected_amount * (1 + tolerance_percent / 100)
                
                if actual_amount < min_amount or actual_amount > max_amount:
                    return {
                        "verified": False,
                        "error": f"المبلغ غير مطابق. المتوقع: {expected_amount:,.0f}، الفعلي: {actual_amount:,.0f}",
                        "code": "AMOUNT_MISMATCH",
                        "expected": expected_amount,
                        "actual": actual_amount
                    }
            
            return {
                "verified": True,
                "transaction_id": transaction_id,
                "amount": transaction.get("amount"),
                "sender_name": transaction.get("from_name"),
                "datetime": transaction.get("datetime"),
                "sandbox": self.is_sandbox
            }
            
        except PaymentProviderError as e:
            return {
                "verified": False,
                "error": e.message,
                "code": e.code
            }
        except Exception as e:
            logger.error(f"ShamCash verification error: {str(e)}")
            return {
                "verified": False,
                "error": "حدث خطأ أثناء التحقق",
                "code": "VERIFICATION_ERROR"
            }


# ============== سيرياتيل كاش (Syriatel Cash) ==============

class SyriatelCashProvider:
    """مزود دفع سيرياتيل كاش عبر API Syria"""
    
    def __init__(self):
        self.base_url = APISYRIA_BASE_URL
        self.api_key = APISYRIA_API_KEY
        self.merchant_gsm = os.environ.get("SYRIATEL_MERCHANT_GSM", "")
        self.is_sandbox = PAYMENT_MODE == "sandbox"
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "X-Api-Key": self.api_key,
            "Accept": "application/json"
        }
    
    async def get_balance(self) -> Dict[str, Any]:
        """جلب رصيد حساب سيرياتيل كاش"""
        if self.is_sandbox:
            return {
                "success": True,
                "sandbox": True,
                "gsm": self.merchant_gsm or "0933000000",
                "balance": "500000"
            }
        
        if not self.api_key or not self.merchant_gsm:
            raise PaymentProviderError("إعدادات سيرياتيل كاش غير مكتملة", "INCOMPLETE_CONFIG")
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.base_url}?resource=syriatel&action=balance&gsm={self.merchant_gsm}",
                headers=self._get_headers()
            )
            
            data = response.json()
            if not data.get("success"):
                raise PaymentProviderError(
                    data.get("error", "فشل جلب الرصيد"),
                    "BALANCE_ERROR"
                )
            
            return data
    
    async def find_transaction(self, transaction_id: str) -> Dict[str, Any]:
        """البحث عن تحويل برقم العملية"""
        if self.is_sandbox:
            return {
                "success": True,
                "sandbox": True,
                "found": True,
                "transaction": {
                    "transaction_no": transaction_id,
                    "date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                    "from": "0933000001",
                    "to": self.merchant_gsm or "0933000000",
                    "amount": "100000"
                }
            }
        
        if not self.api_key or not self.merchant_gsm:
            raise PaymentProviderError("إعدادات سيرياتيل كاش غير مكتملة", "INCOMPLETE_CONFIG")
        
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(
                f"{self.base_url}?resource=syriatel&action=find_tx&tx={transaction_id}&gsm={self.merchant_gsm}",
                headers=self._get_headers()
            )
            
            data = response.json()
            if not data.get("success"):
                raise PaymentProviderError(
                    data.get("error", "فشل البحث عن العملية"),
                    "FIND_TX_ERROR"
                )
            
            return data
    
    async def verify_payment(
        self,
        transaction_id: str,
        expected_amount: float,
        order_id: str,
        tolerance_percent: float = 1.0
    ) -> Dict[str, Any]:
        """التحقق من دفع العميل"""
        try:
            result = await self.find_transaction(transaction_id)
            
            if not result.get("data", {}).get("found") and not result.get("sandbox"):
                return {
                    "verified": False,
                    "error": "رقم العملية غير موجود",
                    "code": "TX_NOT_FOUND"
                }
            
            transaction = result.get("transaction") or result.get("data", {}).get("transaction", {})
            
            if not self.is_sandbox:
                actual_amount = float(transaction.get("amount", 0))
                min_amount = expected_amount * (1 - tolerance_percent / 100)
                max_amount = expected_amount * (1 + tolerance_percent / 100)
                
                if actual_amount < min_amount or actual_amount > max_amount:
                    return {
                        "verified": False,
                        "error": f"المبلغ غير مطابق. المتوقع: {expected_amount:,.0f}، الفعلي: {actual_amount:,.0f}",
                        "code": "AMOUNT_MISMATCH",
                        "expected": expected_amount,
                        "actual": actual_amount
                    }
            
            return {
                "verified": True,
                "transaction_id": transaction_id,
                "amount": transaction.get("amount"),
                "sender_phone": transaction.get("from"),
                "datetime": transaction.get("date"),
                "sandbox": self.is_sandbox
            }
            
        except PaymentProviderError as e:
            return {
                "verified": False,
                "error": e.message,
                "code": e.code
            }
        except Exception as e:
            logger.error(f"SyriatelCash verification error: {str(e)}")
            return {
                "verified": False,
                "error": "حدث خطأ أثناء التحقق",
                "code": "VERIFICATION_ERROR"
            }


# ============== بطاقات بنكية (Bank Cards) ==============

class BankCardProvider:
    """
    مزود دفع البطاقات البنكية
    
    ملاحظة: حالياً لا يوجد API جاهز في سوريا.
    تم تجهيز البنية للتكامل المستقبلي مع:
    - Visa Acceptance Platform
    - Mastercard Gateway (عبر QNB أو بنوك أخرى)
    """
    
    def __init__(self):
        self.gateway_url = BANK_GATEWAY_URL
        self.merchant_id = BANK_MERCHANT_ID
        self.secret_key = BANK_SECRET_KEY
        self.is_sandbox = PAYMENT_MODE == "sandbox"
    
    async def create_payment_session(
        self,
        order_id: str,
        amount: float,
        currency: str = "SYP",
        return_url: str = None,
        cancel_url: str = None
    ) -> Dict[str, Any]:
        """
        إنشاء جلسة دفع وتوجيه العميل لصفحة الدفع
        
        سيتم تفعيل هذه الوظيفة عندما يصبح API البنك متاحاً
        """
        if self.is_sandbox:
            # في الوضع التجريبي، نُرجع رابط وهمي
            return {
                "success": True,
                "sandbox": True,
                "session_id": f"sandbox_session_{order_id}",
                "payment_url": f"/payment/sandbox/card?order_id={order_id}",
                "expires_at": datetime.now(timezone.utc).isoformat(),
                "message": "الوضع التجريبي - لم يتم إنشاء جلسة فعلية"
            }
        
        if not self.gateway_url or not self.merchant_id:
            raise PaymentProviderError(
                "بوابة الدفع البنكي غير متاحة حالياً. يرجى استخدام شام كاش.",
                "BANK_GATEWAY_NOT_AVAILABLE"
            )
        
        # TODO: تنفيذ الاتصال بـ API البنك عندما يصبح متاحاً
        # هذا الكود سيتم استبداله بالتكامل الفعلي
        
        raise PaymentProviderError(
            "بوابة الدفع البنكي قيد التطوير",
            "BANK_GATEWAY_IN_DEVELOPMENT"
        )
    
    async def verify_payment(self, session_id: str, order_id: str) -> Dict[str, Any]:
        """التحقق من إتمام الدفع بالبطاقة"""
        if self.is_sandbox:
            return {
                "verified": True,
                "sandbox": True,
                "session_id": session_id,
                "order_id": order_id,
                "message": "الوضع التجريبي - تم اعتبار الدفع ناجحاً"
            }
        
        # TODO: التحقق من حالة الدفع عبر API البنك
        raise PaymentProviderError(
            "بوابة الدفع البنكي قيد التطوير",
            "BANK_GATEWAY_IN_DEVELOPMENT"
        )


# ============== مدير مزودي الدفع ==============

class PaymentManager:
    """مدير موحد لجميع مزودي الدفع"""
    
    def __init__(self):
        self.shamcash = ShamCashProvider()
        self.syriatel = SyriatelCashProvider()
        self.bank_card = BankCardProvider()
    
    def get_provider(self, payment_method: str):
        """الحصول على مزود الدفع المناسب"""
        providers = {
            "shamcash": self.shamcash,
            "sham_cash": self.shamcash,
            "syriatel_cash": self.syriatel,
            "syriatel": self.syriatel,
            "mtn_cash": self.shamcash,  # يستخدم نفس shamcash في الاختبار
            "mtn": self.shamcash,       # يستخدم نفس shamcash في الاختبار
            "card": self.bank_card,
            "bank_card": self.bank_card
        }
        
        provider = providers.get(payment_method)
        if not provider:
            raise PaymentProviderError(
                f"طريقة الدفع غير مدعومة: {payment_method}",
                "UNSUPPORTED_PAYMENT_METHOD"
            )
        
        return provider
    
    async def verify_payment(
        self,
        payment_method: str,
        transaction_id: str,
        expected_amount: float,
        order_id: str
    ) -> Dict[str, Any]:
        """التحقق من الدفع حسب الطريقة المختارة"""
        provider = self.get_provider(payment_method)
        return await provider.verify_payment(
            transaction_id=transaction_id,
            expected_amount=expected_amount,
            order_id=order_id
        )
    
    def get_payment_status(self) -> Dict[str, Any]:
        """الحصول على حالة جميع مزودي الدفع"""
        return {
            "mode": PAYMENT_MODE,
            "is_sandbox": PAYMENT_MODE == "sandbox",
            "providers": {
                "shamcash": {
                    "enabled": bool(APISYRIA_API_KEY) or PAYMENT_MODE == "sandbox",
                    "configured": bool(APISYRIA_API_KEY and SHAMCASH_ACCOUNT_ADDRESS)
                },
                "syriatel_cash": {
                    "enabled": bool(APISYRIA_API_KEY) or PAYMENT_MODE == "sandbox",
                    "configured": bool(APISYRIA_API_KEY and os.environ.get("SYRIATEL_MERCHANT_GSM"))
                },
                "bank_card": {
                    "enabled": False,  # قيد التطوير
                    "configured": bool(BANK_GATEWAY_URL and BANK_MERCHANT_ID),
                    "note": "بوابة الدفع البنكي قيد التطوير - Visa/Mastercard شراكة جديدة ديسمبر 2025"
                }
            }
        }


# إنشاء instance واحد للاستخدام
payment_manager = PaymentManager()
