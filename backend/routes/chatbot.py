# /app/backend/routes/chatbot.py
# Chatbot للدعم الفني - ردود تلقائية على الأسئلة الشائعة

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re

from core.database import db, get_current_user, create_notification_for_user

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# ============== الردود المحددة مسبقاً ==============

FAQ_RESPONSES = {
    # أسئلة الطلبات
    "اين طلبي|أين طلبي|تتبع طلبي|متى يصل طلبي|حالة طلبي|طلبي وين": {
        "response": "يمكنك تتبع طلبك من صفحة 'طلباتي' في حسابك. ستجد هناك حالة الطلب الحالية والموقع المتوقع للسائق. إذا كان الطلب 'في الطريق'، يمكنك رؤية معلومات السائق والاتصال به مباشرة.",
        "quick_replies": ["كيف أتصل بالسائق؟", "طلبي متأخر", "إلغاء الطلب"],
        "category": "orders"
    },
    "الغاء الطلب|إلغاء الطلب|الغي الطلب|كنسل الطلب": {
        "response": "يمكنك إلغاء الطلب إذا كان في حالة 'قيد الانتظار' أو 'جاري التجهيز'. اذهب إلى 'طلباتي' واضغط على 'إلغاء الطلب'. ⚠️ ملاحظة: لا يمكن إلغاء الطلب بعد خروجه للتوصيل.",
        "quick_replies": ["طلبي خرج للتوصيل", "استرجاع المبلغ"],
        "category": "orders"
    },
    "طلبي متأخر|تأخر الطلب|الطلب متاخر": {
        "response": "نعتذر عن التأخير! 🙏 قد يحدث تأخير بسبب:\n• ازدحام الطلبات\n• ظروف الطقس\n• بُعد المسافة\n\nيمكنك التواصل مع السائق مباشرة من صفحة تتبع الطلب، أو انتظر قليلاً وسيصل طلبك قريباً.",
        "quick_replies": ["التواصل مع السائق", "إلغاء الطلب"],
        "category": "orders"
    },
    
    # أسئلة الإرجاع
    "ارجاع|إرجاع|استرجاع|رجع المنتج|اريد ارجاع|أريد إرجاع|كيف ارجع|كيف أرجع|ارجع منتج|أرجع منتج": {
        "response": "سياسة الإرجاع:\n✅ يمكنك إرجاع المنتج خلال 7 أيام من الاستلام\n✅ يجب أن يكون المنتج بحالته الأصلية\n✅ احتفظ بالفاتورة والتغليف الأصلي\n\nلطلب الإرجاع: اذهب إلى 'طلباتي' > اختر الطلب > 'طلب إرجاع'",
        "quick_replies": ["تكلفة شحن الإرجاع", "المنتج تالف", "منتج خاطئ"],
        "category": "returns"
    },
    "تكلفة الارجاع|شحن الارجاع|من يدفع الارجاع": {
        "response": "تكلفة شحن الإرجاع:\n• إذا كان المنتج تالف أو خاطئ: البائع يتحمل التكلفة ✅\n• إذا غيرت رأيك: أنت تتحمل تكلفة الشحن\n• إذا كان بسبب تغليف سيء: البائع يتحمل التكلفة",
        "quick_replies": ["المنتج تالف", "غيرت رأيي"],
        "category": "returns"
    },
    "منتج تالف|المنتج مكسور|وصل تالف|منتج معيوب": {
        "response": "نأسف لذلك! 😔 لحل المشكلة:\n1. صوّر المنتج التالف\n2. اذهب إلى 'طلباتي' > 'طلب إرجاع'\n3. اختر 'منتج تالف' وأرفق الصور\n4. سيتواصل معك البائع خلال 24 ساعة\n\n💡 البائع يتحمل تكلفة شحن الإرجاع في هذه الحالة.",
        "quick_replies": ["لم يرد البائع", "استرجاع المبلغ"],
        "category": "returns"
    },
    
    # أسئلة الدفع
    "طرق الدفع|كيف ادفع|الدفع|وسائل الدفع": {
        "response": "طرق الدفع المتاحة:\n💵 الدفع عند الاستلام (نقداً)\n💳 المحفظة الإلكترونية\n🏦 شام كاش\n\n💡 نصيحة: استخدم المحفظة لتحصل على نقاط ولاء!",
        "quick_replies": ["كيف أشحن المحفظة؟", "مشكلة في الدفع"],
        "category": "payment"
    },
    "شحن المحفظة|اشحن المحفظة|رصيد المحفظة": {
        "response": "لشحن محفظتك:\n1. اذهب إلى 'المحفظة' من القائمة\n2. اضغط 'إضافة رصيد'\n3. أدخل المبلغ\n4. اختر طريقة الشحن (شام كاش)\n5. أتمم العملية\n\n✅ الرصيد يُضاف فوراً!",
        "quick_replies": ["مشكلة في الشحن", "نقاط الولاء"],
        "category": "payment"
    },
    "مشكلة في الدفع|فشل الدفع|الدفع لم يتم": {
        "response": "إذا فشلت عملية الدفع:\n1. تأكد من رصيد حسابك\n2. تأكد من صحة البيانات المدخلة\n3. حاول مرة أخرى بعد دقيقة\n\nإذا استمرت المشكلة وتم خصم المبلغ، تواصل معنا وسنساعدك في استرجاعه.",
        "quick_replies": ["تم خصم المبلغ", "التواصل مع الدعم"],
        "category": "payment"
    },
    
    # أسئلة الشحن
    "تكلفة الشحن|سعر الشحن|كم الشحن|الشحن كم": {
        "response": "تكلفة الشحن تعتمد على موقعك:\n🏙️ نفس المدينة: 3,000 - 5,000 ل.س\n🚗 مدينة قريبة: 5,000 - 8,000 ل.س\n✈️ مدينة بعيدة: 8,000 - 15,000 ل.س\n\n🎁 شحن مجاني للطلبات فوق 100,000 ل.س!",
        "quick_replies": ["متى يصل الطلب؟", "مناطق التوصيل"],
        "category": "shipping"
    },
    "متى يصل|وقت التوصيل|مدة التوصيل|كم يوم": {
        "response": "وقت التوصيل المتوقع:\n⚡ نفس المدينة: 1-2 يوم\n🚗 مدينة قريبة: 2-3 أيام\n✈️ مدينة بعيدة: 3-5 أيام\n\n⏰ أوقات التوصيل: 8 صباحاً - 6 مساءً",
        "quick_replies": ["تتبع طلبي", "تغيير العنوان"],
        "category": "shipping"
    },
    
    # أسئلة البائعين
    "كيف اصبح بائع|أريد أبيع|فتح متجر|التسجيل كبائع": {
        "response": "للانضمام كبائع:\n1. اضغط على 'انضم كبائع' أو زر /join/seller\n2. أدخل بياناتك ومعلومات متجرك\n3. ارفع المستندات المطلوبة (هوية + سجل تجاري)\n4. انتظر الموافقة (1-3 أيام)\n\n💰 ابدأ البيع واستلم أرباحك أسبوعياً!",
        "quick_replies": ["ما هي العمولة؟", "المستندات المطلوبة"],
        "category": "seller"
    },
    "عمولة البائع|كم العمولة|نسبة المنصة": {
        "response": "عمولة المنصة:\n📱 إلكترونيات: 8%\n👗 ملابس: 10%\n🏠 منزل ومطبخ: 7%\n💄 تجميل: 12%\n📚 أخرى: 10%\n\n✅ لا رسوم اشتراك شهرية!\n✅ تدفع العمولة فقط عند البيع",
        "quick_replies": ["كيف أسحب أرباحي؟", "زيادة المبيعات"],
        "category": "seller"
    },
    
    # أسئلة التوصيل
    "كيف اصبح سائق|كيف اصبح موظف توصيل|كيف أصبح موظف توصيل|العمل كموصل|وظيفة توصيل|التسجيل كسائق|التسجيل كموظف توصيل": {
        "response": "للانضمام كموظف توصيل:\n1. اضغط على 'انضم للتوصيل' أو زر /join/delivery\n2. أدخل بياناتك الشخصية\n3. ارفع المستندات (هوية + رخصة قيادة)\n4. انتظر الموافقة\n\n💰 اربح 5,000 ل.س لكل طلب توصيل!",
        "quick_replies": ["كم الراتب؟", "ساعات العمل"],
        "category": "delivery"
    },
    
    # أسئلة الحساب
    "نسيت كلمة المرور|كلمة السر|تغيير كلمة المرور": {
        "response": "لاستعادة كلمة المرور:\n1. اضغط 'نسيت كلمة المرور' في صفحة الدخول\n2. أدخل رقم هاتفك\n3. ستصلك رسالة برمز التحقق\n4. أدخل الرمز وعيّن كلمة مرور جديدة",
        "quick_replies": ["لم تصل الرسالة", "تغيير رقم الهاتف"],
        "category": "account"
    },
    "تعديل الملف الشخصي|تغيير الاسم|تغيير العنوان": {
        "response": "لتعديل بياناتك:\n1. اذهب إلى 'حسابي'\n2. اضغط 'تعديل الملف الشخصي'\n3. غيّر البيانات المطلوبة\n4. اضغط 'حفظ'\n\n💡 يمكنك إضافة عناوين متعددة للتوصيل!",
        "quick_replies": ["إضافة عنوان جديد", "حذف حسابي"],
        "category": "account"
    },
    
    # تحيات وعام
    "مرحبا|هلا|السلام عليكم|هاي|مساء الخير|صباح الخير": {
        "response": "أهلاً وسهلاً بك في تريند سورية! 👋\nكيف يمكنني مساعدتك اليوم؟",
        "quick_replies": ["أين طلبي؟", "كيف أشتري؟", "مشكلة في الدفع", "التواصل مع الدعم"],
        "category": "greeting"
    },
    "شكرا|شكراً|مشكور|ممتاز": {
        "response": "عفواً! 😊 سعيد بمساعدتك.\nهل هناك شيء آخر يمكنني مساعدتك به؟",
        "quick_replies": ["لا، شكراً", "سؤال آخر"],
        "category": "thanks"
    }
}

# الرد الافتراضي عند عدم الفهم
DEFAULT_RESPONSE = {
    "response": "عذراً، لم أفهم سؤالك بشكل كامل. 🤔\n\nيمكنك:\n• إعادة صياغة السؤال\n• اختيار من الأسئلة الشائعة أدناه\n• التواصل مع فريق الدعم مباشرة",
    "quick_replies": ["أين طلبي؟", "كيف أرجع منتج؟", "مشكلة في الدفع", "التواصل مع الدعم"],
    "category": "unknown"
}

# ============== Models ==============

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class SupportRequest(BaseModel):
    message: str
    session_id: str

# ============== Helper Functions ==============

def find_best_response(message: str) -> dict:
    """البحث عن أفضل رد للرسالة"""
    message_lower = message.lower().strip()
    
    # إزالة علامات الاستفهام والتعجب
    message_clean = re.sub(r'[؟?!.]', '', message_lower)
    
    for patterns, response_data in FAQ_RESPONSES.items():
        pattern_list = patterns.split('|')
        for pattern in pattern_list:
            if pattern in message_clean or message_clean in pattern:
                return response_data
    
    return DEFAULT_RESPONSE

# ============== API Endpoints ==============

@router.post("/send")
async def send_message(data: ChatMessage, user: dict = Depends(get_current_user)):
    """إرسال رسالة للشات بوت"""
    
    session_id = data.session_id or str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # حفظ رسالة المستخدم
    await db.chat_messages.insert_one({
        "session_id": session_id,
        "user_id": user["id"],
        "sender": "user",
        "message": data.message,
        "created_at": now
    })
    
    # البحث عن الرد المناسب
    response_data = find_best_response(data.message)
    
    # حفظ رد البوت
    await db.chat_messages.insert_one({
        "session_id": session_id,
        "user_id": user["id"],
        "sender": "bot",
        "message": response_data["response"],
        "category": response_data["category"],
        "created_at": now
    })
    
    return {
        "session_id": session_id,
        "response": response_data["response"],
        "quick_replies": response_data.get("quick_replies", []),
        "category": response_data["category"],
        "needs_human": response_data["category"] == "unknown"
    }

@router.post("/request-support")
async def request_human_support(data: SupportRequest, user: dict = Depends(get_current_user)):
    """طلب التحويل لموظف دعم بشري"""
    
    now = datetime.now(timezone.utc).isoformat()
    
    # إنشاء طلب دعم
    support_request = {
        "id": str(uuid.uuid4()),
        "session_id": data.session_id,
        "user_id": user["id"],
        "user_name": user.get("full_name") or user.get("name"),
        "user_phone": user.get("phone"),
        "initial_message": data.message,
        "status": "pending",  # pending, assigned, resolved
        "created_at": now
    }
    
    await db.support_requests.insert_one(support_request)
    
    # حفظ رسالة في المحادثة
    await db.chat_messages.insert_one({
        "session_id": data.session_id,
        "user_id": user["id"],
        "sender": "system",
        "message": "تم تحويل محادثتك لفريق الدعم. سيتواصل معك أحد موظفينا قريباً على رقم هاتفك. 📞",
        "created_at": now
    })
    
    return {
        "message": "تم إرسال طلبك لفريق الدعم. سنتواصل معك قريباً!",
        "request_id": support_request["id"]
    }

@router.get("/history")
async def get_chat_history(session_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """جلب سجل المحادثة"""
    
    query = {"user_id": user["id"]}
    if session_id:
        query["session_id"] = session_id
    
    messages = await db.chat_messages.find(
        query,
        {"_id": 0}
    ).sort("created_at", 1).limit(100).to_list(100)
    
    return {"messages": messages}

@router.get("/check-replies/{session_id}")
async def check_new_replies(session_id: str, last_count: int = 0, user: dict = Depends(get_current_user)):
    """التحقق من وجود ردود جديدة من الدعم"""
    
    # جلب جميع الرسائل في هذه الجلسة
    messages = await db.chat_messages.find(
        {"session_id": session_id, "user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    current_count = len(messages)
    has_new = current_count > last_count
    
    # جلب الرسائل الجديدة فقط
    new_messages = messages[last_count:] if has_new else []
    
    return {
        "has_new": has_new,
        "new_messages": new_messages,
        "total_count": current_count
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
            {"text": "مشكلة في الدفع", "icon": "⚠️"},
            {"text": "التواصل مع الدعم", "icon": "👨‍💼"}
        ]
    }

# ============== Admin Endpoints ==============

@router.get("/admin/support-requests")
async def get_support_requests(user: dict = Depends(get_current_user)):
    """جلب طلبات الدعم للمدير"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    requests = await db.support_requests.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    stats = {
        "pending": len([r for r in requests if r["status"] == "pending"]),
        "assigned": len([r for r in requests if r["status"] == "assigned"]),
        "resolved": len([r for r in requests if r["status"] == "resolved"])
    }
    
    return {"requests": requests, "stats": stats}

@router.put("/admin/support-requests/{request_id}")
async def update_support_request(request_id: str, status: str, user: dict = Depends(get_current_user)):
    """تحديث حالة طلب الدعم"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    if status not in ["pending", "assigned", "resolved"]:
        raise HTTPException(status_code=400, detail="حالة غير صحيحة")
    
    result = await db.support_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": status,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    return {"message": "تم تحديث الحالة"}


class AdminReply(BaseModel):
    ticket_id: str
    user_id: str
    message: str

@router.post("/admin/reply")
async def send_admin_reply(data: AdminReply, user: dict = Depends(get_current_user)):
    """إرسال رد من المدير للعميل كإشعار ورسالة في الدردشة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # جلب بيانات التذكرة للحصول على session_id
    ticket = await db.support_requests.find_one({"id": data.ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")
    
    session_id = ticket.get("session_id")
    
    # حفظ رد الدعم كرسالة في المحادثة حتى تظهر للمستخدم
    if session_id:
        await db.chat_messages.insert_one({
            "session_id": session_id,
            "user_id": data.user_id,
            "sender": "support",  # نوع جديد للدعم الفني
            "message": data.message,
            "admin_id": user["id"],
            "admin_name": user.get("full_name") or user.get("name"),
            "created_at": now
        })
    
    # إرسال إشعار للعميل أيضاً
    await create_notification_for_user(
        user_id=data.user_id,
        title="رد من فريق الدعم 💬",
        message=data.message,
        notification_type="support_reply"
    )
    
    # تحديث التذكرة مع الرد
    await db.support_requests.update_one(
        {"id": data.ticket_id},
        {
            "$push": {
                "admin_replies": {
                    "message": data.message,
                    "admin_id": user["id"],
                    "admin_name": user.get("full_name") or user.get("name"),
                    "created_at": now
                }
            },
            "$set": {
                "last_reply_at": now,
                "status": "assigned"  # تحديث الحالة تلقائياً
            }
        }
    )
    
    return {"message": "تم إرسال الرد للعميل بنجاح"}
