"""
UltraMsg WhatsApp Service
إرسال رسائل واتساب عبر UltraMsg API

🧪 وضع الاختبار: يستخدم رمز OTP ثابت (123456) للمختبرين
"""

import os
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

INSTANCE_ID = os.environ.get("ULTRAMSG_INSTANCE_ID")
TOKEN = os.environ.get("ULTRAMSG_TOKEN")
BASE_URL = f"https://api.ultramsg.com/{INSTANCE_ID}"

# 🧪 وضع الاختبار - رمز OTP ثابت للمختبرين
# يمكن تعطيله في الإنتاج بتغيير القيمة إلى "false"
TEST_MODE = os.environ.get("OTP_TEST_MODE", "true").lower() == "true"
TEST_OTP_CODE = "123456"  # رمز OTP الثابت للاختبار


async def send_whatsapp_message(phone: str, message: str) -> dict:
    """
    إرسال رسالة نصية عبر واتساب
    
    Args:
        phone: رقم الهاتف (مثال: 0912345678 أو 963912345678)
        message: نص الرسالة
    
    Returns:
        dict: نتيجة الإرسال
    """
    # تنسيق رقم الهاتف للصيغة الدولية
    formatted_phone = format_syrian_phone(phone)
    
    url = f"{BASE_URL}/messages/chat"
    payload = {
        "token": TOKEN,
        "to": formatted_phone,
        "body": message
    }
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, data=payload)
            result = response.json()
            
            if result.get("sent") == "true" or result.get("sent"):
                return {"success": True, "message": "تم إرسال الرسالة بنجاح", "data": result}
            else:
                return {"success": False, "message": "فشل إرسال الرسالة", "data": result}
    except Exception as e:
        return {"success": False, "message": f"خطأ في الاتصال: {str(e)}"}


async def send_otp(phone: str, otp_code: str) -> dict:
    """
    إرسال رمز التحقق OTP عبر واتساب
    
    🧪 في وضع الاختبار: يعيد الرمز الثابت 123456 بدلاً من إرسال رسالة حقيقية
    
    Args:
        phone: رقم الهاتف
        otp_code: رمز التحقق
    
    Returns:
        dict: نتيجة الإرسال
    """
    # 🧪 وضع الاختبار - لا نرسل رسالة حقيقية
    if TEST_MODE:
        logger.info(f"🧪 [TEST MODE] OTP للرقم {phone}: {TEST_OTP_CODE}")
        print(f"\n{'='*50}")
        print(f"🧪 TEST MODE - OTP Code for {phone}: {TEST_OTP_CODE}")
        print(f"{'='*50}\n")
        return {
            "success": True, 
            "test_mode": True, 
            "message": "وضع الاختبار - استخدم الرمز 123456",
            "otp_code": TEST_OTP_CODE
        }
    
    message = f"""🔐 *Trend Syria*

رمز التحقق الخاص بك هو:
*{otp_code}*

⚠️ لا تشارك هذا الرمز مع أحد.
صالح لمدة 5 دقائق."""

    return await send_whatsapp_message(phone, message)


async def send_password_reset_otp(phone: str, otp_code: str) -> dict:
    """
    إرسال رمز إعادة تعيين كلمة المرور
    
    🧪 في وضع الاختبار: يعيد الرمز الثابت 123456 بدلاً من إرسال رسالة حقيقية
    
    Args:
        phone: رقم الهاتف
        otp_code: رمز التحقق
    
    Returns:
        dict: نتيجة الإرسال
    """
    # 🧪 وضع الاختبار - لا نرسل رسالة حقيقية
    if TEST_MODE:
        logger.info(f"🧪 [TEST MODE] Password Reset OTP للرقم {phone}: {TEST_OTP_CODE}")
        print(f"\n{'='*50}")
        print(f"🧪 TEST MODE - Password Reset OTP for {phone}: {TEST_OTP_CODE}")
        print(f"{'='*50}\n")
        return {
            "success": True, 
            "test_mode": True, 
            "message": "وضع الاختبار - استخدم الرمز 123456",
            "otp_code": TEST_OTP_CODE
        }
    
    message = f"""🔑 *Trend Syria - إعادة تعيين كلمة المرور*

رمز إعادة تعيين كلمة المرور:
*{otp_code}*

إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذه الرسالة.

⚠️ صالح لمدة 10 دقائق."""

    return await send_whatsapp_message(phone, message)


async def send_order_notification(phone: str, order_id: str, status: str, details: Optional[str] = None) -> dict:
    """
    إرسال إشعار حالة الطلب
    
    Args:
        phone: رقم الهاتف
        order_id: رقم الطلب
        status: حالة الطلب
        details: تفاصيل إضافية
    
    Returns:
        dict: نتيجة الإرسال
    """
    status_messages = {
        "confirmed": "✅ تم تأكيد طلبك",
        "preparing": "👨‍🍳 جاري تحضير طلبك",
        "ready": "📦 طلبك جاهز للتوصيل",
        "out_for_delivery": "🚗 طلبك في الطريق إليك",
        "delivered": "🎉 تم توصيل طلبك بنجاح",
        "cancelled": "❌ تم إلغاء الطلب"
    }
    
    status_text = status_messages.get(status, status)
    
    message = f"""📋 *Trend Syria - تحديث الطلب*

رقم الطلب: *#{order_id[-6:]}*
الحالة: {status_text}"""

    if details:
        message += f"\n\n{details}"
    
    message += "\n\nشكراً لتسوقك معنا! 🧡"
    
    return await send_whatsapp_message(phone, message)


def format_syrian_phone(phone: str) -> str:
    """
    تحويل رقم الهاتف السوري للصيغة الدولية
    
    مثال:
        0912345678 -> 963912345678
        +963912345678 -> 963912345678
        963912345678 -> 963912345678
    """
    # إزالة المسافات والرموز
    phone = phone.replace(" ", "").replace("-", "").replace("+", "")
    
    # إذا يبدأ بـ 0، استبدله بـ 963
    if phone.startswith("0"):
        phone = "963" + phone[1:]
    
    # إذا لا يبدأ بـ 963، أضفها
    if not phone.startswith("963"):
        phone = "963" + phone
    
    return phone


async def check_connection() -> dict:
    """
    التحقق من حالة الاتصال بـ UltraMsg
    
    Returns:
        dict: حالة الاتصال
    """
    url = f"{BASE_URL}/instance/status"
    params = {"token": TOKEN}
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, params=params)
            result = response.json()
            
            status = result.get("status", {})
            if status.get("accountStatus", {}).get("status") == "authenticated":
                return {"connected": True, "message": "متصل بنجاح", "data": result}
            else:
                return {"connected": False, "message": "غير متصل", "data": result}
    except Exception as e:
        return {"connected": False, "message": f"خطأ: {str(e)}"}
