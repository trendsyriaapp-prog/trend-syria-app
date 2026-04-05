# /app/backend/routes/ai_chatbot.py
# شات بوت ذكي بالذكاء الاصطناعي للدعم الفني

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import os
from dotenv import load_dotenv
import openai

from core.database import db, get_current_user, get_optional_user

load_dotenv()

router = APIRouter(prefix="/ai-chatbot", tags=["AI Chatbot"])

# إعداد مفتاح API
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY") or os.environ.get("EMERGENT_LLM_KEY")

# رسالة النظام للشات بوت
SYSTEM_MESSAGE = """أنت مساعد ذكي لخدمة العملاء في تطبيق "ترند سورية" - منصة توصيل طعام ومنتجات في سوريا.

🎯 مهمتك:
- مساعدة المستخدمين بإجابات واضحة وبسيطة باللغة العربية
- استخدم كلمات سهلة يفهمها الجميع
- تجنب المصطلحات التقنية المعقدة

📋 معلومات مهمة عن المنصة:

━━━━━━━━━━━━━━━━━━━━
👤 للعملاء (المشترين)
━━━━━━━━━━━━━━━━━━━━

【الطلبات】
- تتبع طلبك من صفحة "طلباتي"
- يمكن إلغاء الطلب قبل خروجه للتوصيل فقط
- للتواصل مع السائق: اضغط على زر "اتصل" في صفحة تتبع الطلب

【الإرجاع】
- الإرجاع متاح فقط وقت التسليم أمام السائق
- بعد التوقيع لا يمكن الإرجاع
- أسباب الإرجاع: منتج تالف، مختلف عن الصورة، نقص بالكمية

【الدفع】
- المحفظة الإلكترونية (تحصل على نقاط)
- شام كاش

【التوصيل】
- نفس المدينة: يوم أو يومين
- مدينة قريبة: 2-3 أيام
- مدينة بعيدة: 3-5 أيام
- توصيل مجاني للطلبات فوق 100,000 ل.س

━━━━━━━━━━━━━━━━━━━━
🚗 لموظفي التوصيل (السائقين)
━━━━━━━━━━━━━━━━━━━━

【قبول الطلبات】
- يمكنك حمل حتى 7 طلبات في نفس الوقت
- إذا لديك طلب طعام ساخن، وصّله أولاً قبل قبول طلبات جديدة
- الطلبات من نفس المنطقة يمكن دمجها معاً

【الأرباح】
- أرباحك تُحسب على المسافة وليس عدد الطلبات
- كلما قطعت مسافة أكبر، ربحت أكثر
- يمكنك سحب أرباحك من صفحة "المحفظة"

【نصائح مهمة】
- تحقق من العنوان قبل التحرك
- اتصل بالعميل إذا لم تجد العنوان
- سلّم الطلب للعميل شخصياً واحصل على رمز التسليم
- إذا رفض العميل الاستلام، اضغط "العميل رفض" وانتظر التعليمات

【مشاكل شائعة】
- "لا أجد العنوان" → اتصل بالعميل من زر الاتصال
- "العميل لا يرد" → انتظر 5 دقائق ثم اضغط "العميل لم يرد"
- "المنتج تالف" → صوّر المنتج واضغط "إبلاغ عن مشكلة"

━━━━━━━━━━━━━━━━━━━━
🏪 للبائعين
━━━━━━━━━━━━━━━━━━━━

【التسجيل】
- تحتاج: هوية شخصية + سجل تجاري
- المدير يراجع طلبك ويوافق عليه أو يرفضه
- العمولة: 7-12% حسب نوع المنتج
- لا رسوم شهرية

【إدارة المنتجات】
- أضف صور واضحة للمنتج
- اكتب وصف مفصل وصادق
- حدد الكمية المتوفرة

━━━━━━━━━━━━━━━━━━━━

📞 للتواصل المباشر مع الدعم: 0900000000

قواعد مهمة للرد:
1. استخدم كلمات بسيطة وواضحة
2. اجعل الإجابة قصيرة ومفيدة
3. استخدم إيموجي لتوضيح النقاط المهمة
4. إذا لم تعرف الإجابة، قل "تواصل مع الدعم الفني"
5. لا تخترع معلومات غير صحيحة"""

# تخزين جلسات المحادثة في الذاكرة (للـ session)
chat_sessions = {}

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class SupportRequest(BaseModel):
    message: str
    session_id: str

def get_or_create_chat(session_id: str, user_id: str) -> dict:
    """الحصول على جلسة محادثة موجودة أو إنشاء جديدة"""
    cache_key = f"{user_id}_{session_id}"
    
    if cache_key not in chat_sessions:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        chat_sessions[cache_key] = {
            "client": client,
            "messages": [{"role": "system", "content": SYSTEM_MESSAGE}]
        }
    
    return chat_sessions[cache_key]

@router.post("/send")
async def send_ai_message(data: ChatMessage, user: dict = Depends(get_optional_user)):
    """إرسال رسالة للشات بوت الذكي - متاح للجميع (مسجلين وزوار)"""
    
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="مفتاح API غير متوفر")
    
    session_id = data.session_id or str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_id = user["id"] if user else "guest_" + session_id[:8]
    
    # حفظ رسالة المستخدم في قاعدة البيانات
    await db.ai_chat_messages.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "sender": "user",
        "message": data.message,
        "created_at": now
    })
    
    try:
        # جلب سياق إضافي عن العميل (طلباته الأخيرة) - فقط للمسجلين
        user_context = await _get_user_context(user_id) if user else None
        
        # إنشاء الرسالة مع السياق
        full_message = data.message
        if user_context:
            full_message = f"[معلومات العميل: {user_context}]\n\nسؤال العميل: {data.message}"
        
        # الحصول على جلسة المحادثة
        chat_data = get_or_create_chat(session_id, user_id)
        
        # إضافة رسالة المستخدم
        chat_data["messages"].append({"role": "user", "content": full_message})
        
        # إرسال الرسالة للـ AI
        response = chat_data["client"].chat.completions.create(
            model="gpt-4o",
            messages=chat_data["messages"]
        )
        ai_response = response.choices[0].message.content
        
        # حفظ رد الـ AI في المحادثة
        chat_data["messages"].append({"role": "assistant", "content": ai_response})
        
        # حفظ رد البوت
        await db.ai_chat_messages.insert_one({
            "session_id": session_id,
            "user_id": user_id,
            "sender": "ai",
            "message": ai_response,
            "created_at": now
        })
        
        # تحديد إذا كان الرد يحتاج تدخل بشري
        needs_human = _check_needs_human(data.message, ai_response)
        
        return {
            "session_id": session_id,
            "response": ai_response,
            "quick_replies": _generate_quick_replies(data.message),
            "category": "ai_response",
            "needs_human": needs_human
        }
        
    except Exception as e:
        print(f"AI Chatbot Error: {str(e)}")
        # رد احتياطي في حالة الخطأ
        fallback_response = "عذراً، حدث خطأ تقني. يرجى المحاولة مرة أخرى أو التواصل مع فريق الدعم على 0900000000 📞"
        
        await db.ai_chat_messages.insert_one({
            "session_id": session_id,
            "user_id": user_id,
            "sender": "system",
            "message": fallback_response,
            "error": str(e),
            "created_at": now
        })
        
        return {
            "session_id": session_id,
            "response": fallback_response,
            "quick_replies": ["التواصل مع الدعم", "المحاولة مرة أخرى"],
            "category": "error",
            "needs_human": True
        }

async def _get_user_context(user_id: str) -> str:
    """جلب سياق عن العميل لتحسين الردود"""
    context_parts = []
    
    # جلب آخر 3 طلبات للعميل
    recent_orders = await db.food_orders.find(
        {"customer_id": user_id},
        {"_id": 0, "id": 1, "status": 1, "total": 1, "created_at": 1, "store_name": 1}
    ).sort("created_at", -1).limit(3).to_list(3)
    
    if recent_orders:
        orders_info = []
        status_map = {
            "pending": "قيد الانتظار",
            "preparing": "جاري التجهيز", 
            "ready": "جاهز للتوصيل",
            "delivering": "في الطريق",
            "delivered": "تم التوصيل",
            "cancelled": "ملغي"
        }
        for order in recent_orders:
            status = status_map.get(order.get("status"), order.get("status"))
            orders_info.append(f"طلب من {order.get('store_name', 'متجر')} - الحالة: {status}")
        context_parts.append(f"آخر الطلبات: {', '.join(orders_info)}")
    
    # جلب رصيد المحفظة
    wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0, "balance": 1})
    if wallet:
        context_parts.append(f"رصيد المحفظة: {wallet.get('balance', 0):,} ل.س")
    
    return " | ".join(context_parts) if context_parts else ""

def _check_needs_human(user_message: str, ai_response: str) -> bool:
    """التحقق إذا كانت المحادثة تحتاج تدخل بشري"""
    # كلمات تدل على الحاجة للدعم البشري
    human_keywords = [
        "مشكلة كبيرة", "شكوى", "استرجاع", "تعويض", "ما حل",
        "تواصل مع الدعم", "موظف", "مدير", "لم يحل", "ما زال"
    ]
    
    message_lower = user_message.lower()
    for keyword in human_keywords:
        if keyword in message_lower:
            return True
    
    return False

def _generate_quick_replies(message: str) -> List[str]:
    """توليد ردود سريعة مقترحة بناءً على الرسالة"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ["طلب", "تتبع", "أين"]):
        return ["تتبع طلبي", "إلغاء الطلب", "التواصل مع الدعم"]
    elif any(word in message_lower for word in ["إرجاع", "ارجاع", "رجع"]):
        return ["سياسة الإرجاع", "استرجاع المبلغ", "التواصل مع الدعم"]
    elif any(word in message_lower for word in ["دفع", "محفظة", "شحن رصيد"]):
        return ["شحن المحفظة", "طرق الدفع", "نقاط الولاء"]
    elif any(word in message_lower for word in ["بائع", "متجر", "أبيع"]):
        return ["كيف أصبح بائع؟", "ما هي العمولة؟", "المستندات المطلوبة"]
    elif any(word in message_lower for word in ["توصيل", "سائق", "موصل"]):
        return ["كيف أصبح موظف توصيل؟", "كم الراتب؟", "ساعات العمل"]
    else:
        return ["أين طلبي؟", "كيف أرجع منتج؟", "التواصل مع الدعم"]

@router.get("/history")
async def get_ai_chat_history(session_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """جلب سجل المحادثة مع الشات بوت الذكي"""
    
    query = {"user_id": user["id"]}
    if session_id:
        query["session_id"] = session_id
    
    messages = await db.ai_chat_messages.find(
        query,
        {"_id": 0}
    ).sort("created_at", 1).limit(100).to_list(100)
    
    return {"messages": messages}

@router.post("/request-support")
async def request_human_support_from_ai(data: SupportRequest, user: dict = Depends(get_current_user)):
    """طلب التحويل لموظف دعم بشري من الشات بوت الذكي"""
    
    now = datetime.now(timezone.utc).isoformat()
    
    # جلب آخر رسائل المحادثة للسياق
    recent_messages = await db.ai_chat_messages.find(
        {"session_id": data.session_id, "user_id": user["id"]},
        {"_id": 0, "message": 1, "sender": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    conversation_summary = "\n".join([
        f"{'العميل' if m['sender'] == 'user' else 'البوت'}: {m['message'][:100]}"
        for m in reversed(recent_messages)
    ])
    
    # إنشاء طلب دعم
    support_request = {
        "id": str(uuid.uuid4()),
        "session_id": data.session_id,
        "user_id": user["id"],
        "user_name": user.get("full_name") or user.get("name"),
        "user_phone": user.get("phone"),
        "initial_message": data.message,
        "conversation_summary": conversation_summary,
        "source": "ai_chatbot",
        "status": "pending",
        "created_at": now
    }
    
    await db.support_requests.insert_one(support_request)
    
    # حفظ رسالة في المحادثة
    await db.ai_chat_messages.insert_one({
        "session_id": data.session_id,
        "user_id": user["id"],
        "sender": "system",
        "message": "تم تحويل محادثتك لفريق الدعم البشري 👨‍💼\nسيتواصل معك أحد موظفينا قريباً على رقم هاتفك. شكراً لصبرك! 🙏",
        "created_at": now
    })
    
    return {
        "message": "تم إرسال طلبك لفريق الدعم. سنتواصل معك قريباً!",
        "request_id": support_request["id"]
    }

@router.get("/quick-questions")
async def get_quick_questions():
    """جلب الأسئلة السريعة الشائعة"""
    
    return {
        "questions": [
            {"text": "أين طلبي؟", "icon": "📦"},
            {"text": "كيف أرجع منتج؟", "icon": "↩️"},
            {"text": "طرق الدفع", "icon": "💳"},
            {"text": "تكلفة الشحن", "icon": "🚚"},
            {"text": "كيف أصبح بائع؟", "icon": "🏪"},
            {"text": "نقاط الولاء", "icon": "⭐"},
            {"text": "التواصل مع الدعم", "icon": "👨‍💼"}
        ]
    }

@router.delete("/clear-session/{session_id}")
async def clear_chat_session(session_id: str, user: dict = Depends(get_current_user)):
    """مسح جلسة محادثة"""
    
    cache_key = f"{user['id']}_{session_id}"
    if cache_key in chat_sessions:
        del chat_sessions[cache_key]
    
    # حذف الرسائل من قاعدة البيانات (اختياري)
    await db.ai_chat_messages.delete_many({
        "session_id": session_id,
        "user_id": user["id"]
    })
    
    return {"message": "تم مسح المحادثة بنجاح"}
