# /app/backend/routes/chatbot.py
# Chatbot للدعم الفني - ردود تلقائية على الأسئلة الشائعة

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import re

from core.database import db, get_current_user, create_notification_for_user
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# دالة للحصول على المستخدم (اختياري - للزوار)
security = HTTPBearer(auto_error=False)

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """الحصول على المستخدم اختيارياً - يرجع None للزوار"""
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = jwt.decode(token, os.environ.get("JWT_SECRET", "your-secret-key"), algorithms=["HS256"])
        user_id = payload.get("user_id")
        if not user_id:
            return None
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        return user
    except Exception:
        return None

# ============== الردود المحددة مسبقاً ==============

FAQ_RESPONSES = {
    # أسئلة الطلبات
    "اين طلبي|أين طلبي|تتبع طلبي|متى يصل طلبي|حالة طلبي|طلبي وين": {
        "response": "يمكنك تتبع طلبك من صفحة 'طلباتي' في حسابك. ستجد هناك حالة الطلب الحالية ومعلومات موظف التوصيل. إذا كان الطلب 'في الطريق'، يمكنك رؤية معلومات موظف التوصيل والتواصل معه مباشرة.",
        "quick_replies": ["كيف أتواصل مع موظف التوصيل؟", "طلبي متأخر", "إلغاء الطلب"],
        "category": "orders"
    },
    "كيف اتواصل مع موظف التوصيل|كيف أتواصل مع موظف التوصيل|التواصل مع موظف التوصيل|اتصل بموظف التوصيل|كيف أتصل بالسائق|كيف اتصل بالسائق|التواصل مع السائق": {
        "response": "للتواصل مع موظف التوصيل:\n\n📍 من صفحة 'طلباتي' > اختر الطلب > اضغط على 'اتصال'\n\n💡 يمكنك أيضاً وضع ملاحظة لموظف التوصيل عند إتمام الطلب (مثل: الطابق الثالث، باب أسود، إلخ)",
        "quick_replies": ["أين طلبي؟", "طلبي متأخر"],
        "category": "orders"
    },
    "الغاء الطلب|إلغاء الطلب|الغي الطلب|كنسل الطلب": {
        "response": "يمكنك إلغاء الطلب إذا كان في حالة 'قيد الانتظار' أو 'جاري التجهيز'. اذهب إلى 'طلباتي' واضغط على 'إلغاء الطلب'. ⚠️ ملاحظة: لا يمكن إلغاء الطلب بعد خروجه للتوصيل.",
        "quick_replies": ["طلبي خرج للتوصيل", "استرجاع المبلغ"],
        "category": "orders"
    },
    "طلبي متأخر|تأخر الطلب|الطلب متاخر": {
        "response": "نعتذر عن التأخير! 🙏 قد يحدث تأخير بسبب:\n• ازدحام الطلبات\n• ظروف الطقس\n• بُعد المسافة\n\nيمكنك التواصل مع موظف التوصيل مباشرة من صفحة تتبع الطلب، أو انتظر قليلاً وسيصل طلبك قريباً.",
        "quick_replies": ["كيف أتواصل مع موظف التوصيل؟", "إلغاء الطلب"],
        "category": "orders"
    },
    
    # أسئلة الإرجاع
    "سياسة الارجاع|سياسة الإرجاع|ما هي سياسة الارجاع|ما هي سياسة الإرجاع": {
        "response": "⚠️ سياسة الإرجاع الهامة:\n\n✅ الإرجاع متاح **فقط عند لحظة التسليم** أمام موظف التوصيل\n✅ افحص المنتج جيداً قبل التوقيع على الاستلام\n❌ **بعد التوقيع على الاستلام، لا يمكن الإرجاع**\n\n💡 إذا وجدت عيب مصنعي بعد الاستلام، تواصل معنا خلال 24 ساعة مع صور توضيحية",
        "quick_replies": ["حالات الإرجاع المقبولة", "المنتج تالف", "منتج خاطئ"],
        "category": "returns"
    },
    "كيف ارجع|كيف أرجع|ارجع منتج|أرجع منتج|اريد ارجاع|أريد إرجاع|رجع المنتج": {
        "response": "⚠️ سياسة الإرجاع الهامة:\n\n✅ الإرجاع متاح **فقط عند لحظة التسليم** أمام موظف التوصيل\n✅ افحص المنتج جيداً قبل التوقيع على الاستلام\n❌ **بعد التوقيع على الاستلام، لا يمكن الإرجاع**\n\n💡 إذا وجدت عيب مصنعي بعد الاستلام، تواصل معنا خلال 24 ساعة مع صور توضيحية",
        "quick_replies": ["حالات الإرجاع المقبولة", "المنتج تالف", "منتج خاطئ"],
        "category": "returns"
    },
    "حالات الارجاع|حالات الإرجاع|حالات الارجاع المقبولة|حالات الإرجاع المقبولة|متى يمكن الارجاع|متى يمكن الإرجاع": {
        "response": "✅ حالات يمكن فيها الإرجاع (عند التسليم فقط):\n\n• المنتج تالف أو مكسور\n• المنتج مختلف عن الصور أو الوصف\n• المقاس أو اللون خاطئ\n• نقص في الكمية\n• المنتج منتهي الصلاحية\n\n❌ لا يمكن الإرجاع بعد التوقيع على الاستلام",
        "quick_replies": ["سياسة الإرجاع", "المنتج تالف"],
        "category": "returns"
    },
    "تكلفة الارجاع|تكلفة الإرجاع|شحن الارجاع|شحن الإرجاع|من يدفع الارجاع|من يدفع الإرجاع|تكلفة شحن الإرجاع": {
        "response": "تكلفة الإرجاع (عند التسليم):\n\n• إذا كان المنتج تالف أو خاطئ: **البائع يتحمل التكلفة** ✅\n• إذا كان بسبب تغليف سيء: **البائع يتحمل التكلفة** ✅\n\n⚠️ تذكر: الإرجاع متاح فقط عند لحظة التسليم قبل التوقيع",
        "quick_replies": ["سياسة الإرجاع", "المنتج تالف"],
        "category": "returns"
    },
    "استرجاع المبلغ|ارجاع المبلغ|إرجاع المبلغ|رد المال|رد الفلوس|استرداد المبلغ": {
        "response": "استرجاع المبلغ (عند رفض استلام منتج معيب):\n\n• إذا كان الدفع بالمحفظة: يُرد خلال 24-48 ساعة ✅\n• إذا كان بشام كاش: يُرد خلال 3-5 أيام\n\n⚠️ يمكنك رفض الاستلام فقط إذا كان المنتج:\n• تالف أو مكسور\n• مختلف عن الوصف\n• خاطئ (لون/مقاس/نوع)",
        "quick_replies": ["سياسة الإرجاع", "التواصل مع الدعم"],
        "category": "returns"
    },
    "منتج تالف|المنتج مكسور|وصل تالف|منتج معيوب": {
        "response": "إذا وصل المنتج تالفاً:\n\n**عند التسليم (قبل التوقيع):**\n1. أخبر موظف التوصيل فوراً\n2. ارفض استلام المنتج\n3. سيتم إرجاع المبلغ لمحفظتك\n\n**بعد الاستلام (خلال 24 ساعة):**\n1. صوّر المنتج التالف\n2. تواصل مع الدعم مع إرفاق الصور\n3. سننظر في حالتك",
        "quick_replies": ["التواصل مع الدعم", "استرجاع المبلغ"],
        "category": "returns"
    },
    "منتج خاطئ|منتج غلط|استلمت منتج خاطئ|المنتج غير صحيح": {
        "response": "إذا وصلك منتج خاطئ:\n\n**عند التسليم (قبل التوقيع):**\n1. افحص المنتج أمام موظف التوصيل\n2. إذا كان خاطئاً، ارفض الاستلام\n3. سيتم إرجاع المبلغ تلقائياً\n\n⚠️ **بعد التوقيع لا يمكن الإرجاع**\n\nإذا اكتشفت الخطأ بعد الاستلام، تواصل معنا خلال 24 ساعة",
        "quick_replies": ["التواصل مع الدعم", "سياسة الإرجاع"],
        "category": "returns"
    },
    
    # أسئلة الدفع
    "طرق الدفع|كيف ادفع|الدفع|وسائل الدفع": {
        "response": "طرق الدفع المتاحة:\n💳 المحفظة الإلكترونية\n🏦 شام كاش\n\n💡 نصيحة: استخدم المحفظة لتحصل على نقاط ولاء!",
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
    "تكلفة الشحن|سعر الشحن|كم الشحن|الشحن كم|كم يكلف الشحن": {
        "response": "تكلفة الشحن تعتمد على موقعك:\n🏙️ نفس المدينة: 3,000 - 5,000 ل.س\n🚗 مدينة قريبة: 5,000 - 8,000 ل.س\n✈️ مدينة بعيدة: 8,000 - 15,000 ل.س\n\n🎁 شحن مجاني للطلبات فوق 100,000 ل.س!",
        "quick_replies": ["متى يصل الطلب؟", "مناطق التوصيل"],
        "category": "shipping"
    },
    "متى يصل|وقت التوصيل|مدة التوصيل|كم يوم": {
        "response": "وقت التوصيل المتوقع:\n⚡ نفس المدينة: 1-2 يوم\n🚗 مدينة قريبة: 2-3 أيام\n✈️ مدينة بعيدة: 3-5 أيام\n\n⏰ أوقات التوصيل: 8 صباحاً - 6 مساءً",
        "quick_replies": ["تتبع طلبي", "تغيير العنوان"],
        "category": "shipping"
    },
    "مناطق التوصيل|أين توصلون|المدن المتاحة|هل توصلون إلى": {
        "response": "نوصل إلى جميع المحافظات السورية! 🇸🇾\n\n🏙️ المدن الرئيسية: دمشق، حلب، حمص، اللاذقية، طرطوس\n🏘️ المناطق: نغطي معظم المناطق والضواحي\n\n💡 أدخل عنوانك عند الطلب وسنخبرك بتكلفة ووقت التوصيل.",
        "quick_replies": ["تكلفة الشحن", "متى يصل الطلب؟"],
        "category": "shipping"
    },
    
    # أسئلة البائعين
    "كيف اصبح بائع|كيف أصبح بائع|أريد أبيع|اريد ابيع|فتح متجر|التسجيل كبائع|بائع جديد|انضم كبائع|اريد اصبح بائع|أريد أصبح بائع": {
        "response": "للانضمام كبائع:\n1. اضغط على 'انضم كبائع' أو زر /join/seller\n2. أدخل بياناتك ومعلومات متجرك\n3. ارفع المستندات المطلوبة (هوية + سجل تجاري)\n4. يتم إرسال طلبك للمدير للمراجعة\n5. انتظر الموافقة أو الرفض\n\n💰 ابدأ البيع واستلم أرباحك أسبوعياً!",
        "quick_replies": ["ما هي العمولة؟", "المستندات المطلوبة"],
        "category": "seller"
    },
    "عمولة البائع|كم العمولة|نسبة المنصة|ما هي العمولة|العمولة كم": {
        "response": "عمولة المنصة:\n📱 إلكترونيات: 8%\n👗 ملابس: 10%\n🏠 منزل ومطبخ: 7%\n💄 تجميل: 12%\n📚 أخرى: 10%\n\n✅ لا رسوم اشتراك شهرية!\n✅ تدفع العمولة فقط عند البيع",
        "quick_replies": ["كيف أسحب أرباحي؟", "زيادة المبيعات"],
        "category": "seller"
    },
    "المستندات المطلوبة|الاوراق المطلوبة|وثائق البائع|ماذا احتاج للتسجيل": {
        "response": "المستندات المطلوبة للتسجيل كبائع:\n📋 صورة الهوية الشخصية\n📋 صورة السجل التجاري\n📋 صورة عن المتجر أو المنتجات\n\n⚠️ يتم إرسال الطلب للمدير للمراجعة والموافقة أو الرفض",
        "quick_replies": ["كيف أصبح بائع؟", "ما هي العمولة؟"],
        "category": "seller"
    },
    
    # أسئلة التوصيل
    "كيف اصبح سائق|كيف اصبح موظف توصيل|كيف أصبح موظف توصيل|العمل كموصل|وظيفة توصيل|التسجيل كسائق|التسجيل كموظف توصيل": {
        "response": "للانضمام كموظف توصيل:\n1. اضغط على 'انضم للتوصيل' أو زر /join/delivery\n2. أدخل بياناتك الشخصية\n3. ارفع المستندات (هوية + رخصة قيادة)\n4. يتم إرسال طلبك للمدير للمراجعة\n5. انتظر الموافقة\n\n💰 الأرباح تُحسب على أساس المسافة المقطوعة!",
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
        "response": "أهلاً وسهلاً بك في ترند سورية! 👋\nكيف يمكنني مساعدتك اليوم؟",
        "quick_replies": ["أين طلبي؟", "كيف أشتري؟", "مشكلة في الدفع", "التواصل مع الدعم"],
        "category": "greeting"
    },
    "شكرا|شكراً|مشكور|ممتاز": {
        "response": "عفواً! 😊 سعيد بمساعدتك.\nهل هناك شيء آخر يمكنني مساعدتك به؟",
        "quick_replies": ["لا، شكراً", "سؤال آخر"],
        "category": "thanks"
    },
    
    # طلب الدعم البشري
    "التواصل مع الدعم|تواصل مع الدعم|اريد التواصل|أريد التواصل|دعم فني|خدمة العملاء|اتصل بالدعم|كلم الدعم|موظف دعم|طلب موظف دعم": {
        "response": "سأوصلك بفريق الدعم الفني! 👨‍💼\n\nيمكنك:\n1. كتابة مشكلتك هنا وسيرد عليك موظف الدعم\n2. الاتصال على: 0900000000\n3. أو اضغط الزر أدناه لطلب مساعدة بشرية",
        "quick_replies": ["طلب مساعدة بشرية", "رقم الهاتف"],
        "category": "support"
    },
    "طلب مساعدة بشرية|مساعدة بشرية|اريد مساعدة|أريد مساعدة|تحويل للدعم": {
        "response": "سيتم تحويلك لفريق الدعم الفني! 👨‍💼\n\nاضغط على زر 'التحدث مع موظف دعم' أسفل المحادثة وسيتواصل معك أحد موظفينا قريباً على رقم هاتفك.",
        "quick_replies": ["رقم الهاتف", "أين طلبي؟"],
        "category": "support"
    },
    "اتصال هاتفي|رقم الهاتف|رقم الدعم|كيف اتصل بكم": {
        "response": "يمكنك التواصل معنا عبر:\n📞 الهاتف: 0900000000\n⏰ أوقات العمل: 8 صباحاً - 10 مساءً\n💬 أو يمكنك كتابة مشكلتك هنا وسيرد عليك موظف الدعم",
        "quick_replies": ["طلب موظف دعم", "أين طلبي؟"],
        "category": "support"
    },
    
    # ردود البائع الإضافية
    "كيف اسحب ارباحي|كيف أسحب أرباحي|سحب الارباح|سحب الأرباح|استلام ارباحي|استلام أرباحي": {
        "response": "لسحب أرباحك:\n1. اذهب إلى 'المحفظة' من لوحة البائع\n2. اضغط 'سحب الرصيد'\n3. أدخل المبلغ المراد سحبه\n4. اختر طريقة السحب (شام كاش)\n\n✅ يتم التحويل خلال 1-3 أيام عمل\n💡 الحد الأدنى للسحب: 50,000 ل.س",
        "quick_replies": ["ما هي العمولة؟", "كيف أصبح بائع؟"],
        "category": "seller"
    },
    "زيادة المبيعات|كيف ازيد مبيعاتي|كيف أزيد مبيعاتي|تسويق منتجاتي": {
        "response": "نصائح لزيادة مبيعاتك:\n📸 استخدم صور احترافية للمنتجات\n💰 قدم أسعار تنافسية\n⭐ احصل على تقييمات إيجابية\n🚀 استخدم خدمة الإعلانات المدفوعة\n📦 وفر شحن مجاني للطلبات الكبيرة",
        "quick_replies": ["ما هي العمولة؟", "كيف أصبح بائع؟"],
        "category": "seller"
    },
    
    # ردود الإرجاع الإضافية
    "لم يرد البائع|البائع لم يرد|لا يرد البائع|البائع مش راد": {
        "response": "نأسف لذلك! 😔 إذا لم يرد البائع خلال 48 ساعة:\n1. تواصل مع فريق الدعم\n2. سنتدخل لحل المشكلة\n3. قد يتم استرجاع المبلغ تلقائياً\n\n💡 اضغط 'التواصل مع الدعم' للمساعدة الفورية",
        "quick_replies": ["التواصل مع الدعم", "استرجاع المبلغ"],
        "category": "returns"
    },
    "غيرت رأيي|غيرت رايي|لا اريده|لا أريده": {
        "response": "⚠️ تنبيه هام:\n\n❌ **لا يمكن الإرجاع بعد استلام المنتج والتوقيع**\n❌ **لا يمكن رفض الاستلام إذا كان المنتج سليماً**\n\nإذا غيرت رأيك:\n• قبل التوصيل: يمكنك إلغاء الطلب من 'طلباتي'\n• بعد التوصيل: البيع نهائي ولا يمكن الإرجاع",
        "quick_replies": ["إلغاء الطلب", "سياسة الإرجاع"],
        "category": "returns"
    },
    
    # ردود الشحن الإضافية
    "مشكلة في الشحن|مشكلة بالشحن|الشحن متاخر|تاخر الشحن": {
        "response": "نأسف لمشكلة الشحن! 🙏\n\nيرجى التحقق من:\n• هل العنوان صحيح ومكتمل؟\n• هل رقم الهاتف صحيح؟\n\nإذا استمرت المشكلة، تواصل مع فريق الدعم وسنساعدك فوراً.",
        "quick_replies": ["تغيير العنوان", "التواصل مع الدعم"],
        "category": "shipping"
    },
    "تغيير العنوان|تعديل العنوان|عنوان جديد": {
        "response": "لتغيير العنوان:\n• قبل خروج الطلب: اذهب إلى 'طلباتي' > 'تعديل' > غيّر العنوان\n• بعد خروج الطلب: تواصل مع موظف التوصيل مباشرة\n\n💡 يمكنك إضافة ملاحظة لموظف التوصيل أيضاً",
        "quick_replies": ["أين طلبي؟", "كيف أتواصل مع موظف التوصيل؟"],
        "category": "shipping"
    },
    
    # ردود الحساب الإضافية
    "لم تصل الرسالة|الرسالة لم تصل|ما وصلني رمز": {
        "response": "إذا لم تصل رسالة التحقق:\n1. تأكد من صحة رقم الهاتف\n2. انتظر دقيقة وحاول مرة أخرى\n3. تحقق من رسائل السبام\n\nإذا استمرت المشكلة، تواصل معنا على 0900000000",
        "quick_replies": ["رقم الهاتف", "التواصل مع الدعم"],
        "category": "account"
    },
    "تغيير رقم الهاتف|تبديل رقم الهاتف": {
        "response": "لتغيير رقم هاتفك:\n1. اذهب إلى 'حسابي' > 'الإعدادات'\n2. اضغط 'تغيير رقم الهاتف'\n3. أدخل الرقم الجديد\n4. ستصلك رسالة تحقق على الرقم الجديد\n\n⚠️ تأكد من أن الرقم الجديد فعّال",
        "quick_replies": ["تعديل الملف الشخصي", "نسيت كلمة المرور"],
        "category": "account"
    },
    "حذف حسابي|اريد حذف حسابي|أريد حذف حسابي|الغاء الحساب|إلغاء الحساب": {
        "response": "نأسف لرغبتك بالمغادرة! 😢\n\nلحذف حسابك:\n1. اذهب إلى 'حسابي' > 'الإعدادات'\n2. اضغط 'حذف الحساب'\n3. أدخل كلمة المرور للتأكيد\n\n⚠️ سيتم حذف جميع بياناتك نهائياً",
        "quick_replies": ["التواصل مع الدعم"],
        "category": "account"
    },
    "اضافة عنوان|إضافة عنوان|عنوان جديد|اضافة عنوان جديد|إضافة عنوان جديد": {
        "response": "لإضافة عنوان جديد:\n1. اذهب إلى 'حسابي' > 'العناوين'\n2. اضغط 'إضافة عنوان'\n3. أدخل تفاصيل العنوان\n4. اضغط 'حفظ'\n\n💡 يمكنك إضافة عناوين متعددة واختيار الافتراضي",
        "quick_replies": ["تعديل الملف الشخصي"],
        "category": "account"
    },
    
    # ردود الدفع الإضافية
    "تم خصم المبلغ|خصم المبلغ|المبلغ انخصم": {
        "response": "إذا تم خصم المبلغ ولم يتم الطلب:\n1. انتظر 5 دقائق وتحقق من 'طلباتي'\n2. إذا لم يظهر الطلب، تواصل مع الدعم\n3. سنتحقق من العملية ونسترجع المبلغ\n\n⏰ عادةً يُسترجع خلال 24-48 ساعة",
        "quick_replies": ["التواصل مع الدعم", "أين طلبي؟"],
        "category": "payment"
    },
    "نقاط الولاء|نقاط|كم نقطة عندي": {
        "response": "نظام نقاط الولاء:\n⭐ 1 نقطة لكل 1000 ل.س مشتريات\n💰 كل 100 نقطة = 5000 ل.س خصم\n\nلرؤية نقاطك: اذهب إلى 'حسابي' > 'نقاط الولاء'\n\n💡 استخدم المحفظة للدفع واحصل على نقاط إضافية!",
        "quick_replies": ["كيف أشحن المحفظة؟", "طرق الدفع"],
        "category": "payment"
    },
    
    # ردود التوصيل الإضافية
    "كم الراتب|راتب التوصيل|ارباح التوصيل|أرباح التوصيل": {
        "response": "أرباح موظف التوصيل:\n📍 تُحسب على أساس المسافة المقطوعة (وليس عدد الطلبات)\n🚗 كلما زادت المسافة، زاد الربح\n📈 لا حد أقصى للأرباح!\n⏰ ساعات عمل مرنة\n\n💡 تواصل مع الإدارة لمعرفة تفاصيل الأسعار!",
        "quick_replies": ["كيف اصبح موظف توصيل", "ساعات العمل"],
        "category": "delivery"
    },
    "ساعات العمل|اوقات العمل|أوقات العمل|متى اشتغل": {
        "response": "ساعات العمل مرنة! 🕐\n\n⏰ يمكنك العمل من 8 صباحاً حتى 10 مساءً\n📅 اختر الأيام والأوقات التي تناسبك\n💡 لا يوجد حد أدنى لساعات العمل\n\n✅ أنت تتحكم بجدولك!",
        "quick_replies": ["كم الراتب؟", "كيف اصبح موظف توصيل"],
        "category": "delivery"
    },
    
    # ردود الطلبات الإضافية
    "طلبي خرج للتوصيل|الطلب خرج|في الطريق": {
        "response": "طلبك في الطريق إليك! 🚗\n\nيمكنك:\n• تتبع موقع موظف التوصيل من صفحة الطلب\n• التواصل معه مباشرة بالضغط على 'اتصال'\n\n💡 تأكد من تواجدك في العنوان المحدد",
        "quick_replies": ["كيف أتواصل مع موظف التوصيل؟", "تغيير العنوان"],
        "category": "orders"
    },
    
    # أسئلة إضافية
    "كيف اشتري|كيف أشتري|طريقة الشراء|كيف اطلب": {
        "response": "طريقة الشراء سهلة جداً! 🛒\n\n1. ابحث عن المنتج أو تصفح الأصناف\n2. اضغط 'أضف للسلة'\n3. اذهب للسلة واضغط 'إتمام الشراء'\n4. أدخل عنوان التوصيل\n5. اختر طريقة الدفع\n6. أكد الطلب وانتظر التوصيل! ✅",
        "quick_replies": ["طرق الدفع", "تكلفة الشحن"],
        "category": "orders"
    },
    "سؤال آخر|سؤال اخر|عندي سؤال": {
        "response": "بالتأكيد! 😊 اكتب سؤالك وسأحاول مساعدتك.\n\nأو اختر من المواضيع الشائعة أدناه:",
        "quick_replies": ["أين طلبي؟", "كيف أرجع منتج؟", "طرق الدفع", "التواصل مع الدعم"],
        "category": "general"
    },
    "لا شكرا|لا، شكراً|لا شكراً|لا اريد شيء": {
        "response": "حسناً! 😊 إذا احتجت أي مساعدة في المستقبل، أنا هنا!\n\nنتمنى لك تسوقاً ممتعاً في ترند سورية! 🛍️",
        "quick_replies": [],
        "category": "goodbye"
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
async def send_message(data: ChatMessage, user: dict = Depends(get_optional_user)):
    """إرسال رسالة للشات بوت - متاح للجميع"""
    
    session_id = data.session_id or str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    user_id = user["id"] if user else "guest_" + session_id[:8]
    
    # حفظ رسالة المستخدم
    await db.chat_messages.insert_one({
        "session_id": session_id,
        "user_id": user_id,
        "sender": "user",
        "message": data.message,
        "created_at": now
    })
    
    # البحث عن الرد المناسب
    response_data = find_best_response(data.message)
    
    # حفظ رد البوت
    await db.chat_messages.insert_one({
        "session_id": session_id,
        "user_id": user_id,
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


# ============== نظام تقييم الدعم ==============

class SupportRating(BaseModel):
    ticket_id: str
    rating: int  # 1-5
    comment: Optional[str] = None

@router.post("/rate-support")
async def rate_support_experience(data: SupportRating, user: dict = Depends(get_current_user)):
    """تقييم تجربة الدعم من قبل العميل"""
    
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="التقييم يجب أن يكون بين 1 و 5")
    
    # التحقق من وجود التذكرة وأنها تخص هذا المستخدم
    ticket = await db.support_requests.find_one({
        "id": data.ticket_id,
        "user_id": user["id"]
    })
    
    if not ticket:
        raise HTTPException(status_code=404, detail="التذكرة غير موجودة")
    
    if ticket.get("rating"):
        raise HTTPException(status_code=400, detail="تم تقييم هذه التذكرة مسبقاً")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # حفظ التقييم في التذكرة
    await db.support_requests.update_one(
        {"id": data.ticket_id},
        {
            "$set": {
                "rating": data.rating,
                "rating_comment": data.comment,
                "rated_at": now
            }
        }
    )
    
    return {"message": "شكراً لتقييمك! نسعى دائماً لتحسين خدماتنا 🙏"}

@router.get("/my-pending-rating")
async def get_pending_rating(user: dict = Depends(get_current_user)):
    """جلب تذاكر الدعم المحلولة التي لم يتم تقييمها بعد"""
    
    ticket = await db.support_requests.find_one(
        {
            "user_id": user["id"],
            "status": "resolved",
            "rating": {"$exists": False}
        },
        {"_id": 0}
    )
    
    return {"ticket": ticket}

@router.get("/admin/rating-stats")
async def get_rating_stats(user: dict = Depends(get_current_user)):
    """إحصائيات تقييمات الدعم للمدير"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # جلب جميع التذاكر المقيمة
    rated_tickets = await db.support_requests.find(
        {"rating": {"$exists": True}},
        {"_id": 0, "rating": 1, "rating_comment": 1, "rated_at": 1, "user_name": 1}
    ).sort("rated_at", -1).limit(50).to_list(50)
    
    if not rated_tickets:
        return {
            "average_rating": 0,
            "total_ratings": 0,
            "rating_distribution": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            "recent_ratings": []
        }
    
    # حساب المتوسط
    ratings = [t["rating"] for t in rated_tickets]
    average = sum(ratings) / len(ratings)
    
    # توزيع التقييمات
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in ratings:
        distribution[r] = distribution.get(r, 0) + 1
    
    # آخر التقييمات مع تعليقات
    recent_with_comments = [t for t in rated_tickets if t.get("rating_comment")][:10]
    
    return {
        "average_rating": round(average, 1),
        "total_ratings": len(ratings),
        "rating_distribution": distribution,
        "recent_ratings": recent_with_comments
    }

@router.post("/check-rating-reminder")
async def check_and_send_rating_reminder(user: dict = Depends(get_current_user)):
    """التحقق وإرسال تذكير بالتقييم للتذاكر القديمة (أكثر من 24 ساعة)"""
    
    from datetime import timedelta
    
    now = datetime.now(timezone.utc)
    reminder_threshold = now - timedelta(hours=24)
    
    # البحث عن تذاكر محلولة منذ أكثر من 24 ساعة بدون تقييم وبدون تذكير سابق
    old_tickets = await db.support_requests.find(
        {
            "user_id": user["id"],
            "status": "resolved",
            "rating": {"$exists": False},
            "reminder_sent": {"$ne": True}
        },
        {"_id": 0, "id": 1, "updated_at": 1, "created_at": 1}
    ).to_list(10)
    
    reminders_sent = 0
    
    for ticket in old_tickets:
        # التحقق من أن التذكرة قديمة بما يكفي
        ticket_time = ticket.get("updated_at") or ticket.get("created_at")
        if ticket_time:
            try:
                ticket_datetime = datetime.fromisoformat(ticket_time.replace('Z', '+00:00'))
                if ticket_datetime < reminder_threshold:
                    # إرسال إشعار تذكيري
                    await create_notification_for_user(
                        user_id=user["id"],
                        title="لم تقيّم تجربة الدعم بعد ⭐",
                        message="نود سماع رأيك! قيّم تجربتك مع فريق الدعم لمساعدتنا على التحسين.",
                        notification_type="rating_reminder"
                    )
                    
                    # تسجيل أنه تم إرسال التذكير
                    await db.support_requests.update_one(
                        {"id": ticket["id"]},
                        {"$set": {"reminder_sent": True, "reminder_sent_at": now.isoformat()}}
                    )
                    reminders_sent += 1
            except Exception:
                pass
    
    return {"reminders_sent": reminders_sent}


@router.get("/admin/analytics")
async def get_support_analytics(user: dict = Depends(get_current_user)):
    """تحليلات متقدمة للدعم الفني"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    from collections import defaultdict
    
    # جلب جميع التذاكر
    all_tickets = await db.support_requests.find({}, {"_id": 0}).to_list(500)
    
    if not all_tickets:
        return {
            "peak_hours": [],
            "avg_response_time_minutes": 0,
            "staff_performance": [],
            "daily_tickets": [],
            "status_breakdown": {"pending": 0, "assigned": 0, "resolved": 0},
            "total_tickets": 0,
            "resolved_rate": 0
        }
    
    # 1. أوقات الذروة (حسب الساعة)
    hour_counts = defaultdict(int)
    for ticket in all_tickets:
        created_at = ticket.get("created_at")
        if created_at:
            try:
                dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                hour_counts[dt.hour] += 1
            except Exception:
                pass
    
    peak_hours = [{"hour": h, "count": c} for h, c in sorted(hour_counts.items())]
    
    # 2. متوسط وقت الرد (من إنشاء التذكرة إلى أول رد)
    response_times = []
    for ticket in all_tickets:
        created_at = ticket.get("created_at")
        first_reply = ticket.get("admin_replies", [{}])[0].get("created_at") if ticket.get("admin_replies") else None
        
        if created_at and first_reply:
            try:
                created_dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                reply_dt = datetime.fromisoformat(first_reply.replace('Z', '+00:00'))
                diff_minutes = (reply_dt - created_dt).total_seconds() / 60
                if diff_minutes > 0:
                    response_times.append(diff_minutes)
            except Exception:
                pass
    
    avg_response_time = round(sum(response_times) / len(response_times), 1) if response_times else 0
    
    # 3. أداء الموظفين
    staff_stats = defaultdict(lambda: {"tickets": 0, "ratings": [], "name": ""})
    
    for ticket in all_tickets:
        updated_by = ticket.get("updated_by")
        if updated_by and ticket.get("status") in ["assigned", "resolved"]:
            # جلب اسم الموظف من أول رد
            admin_name = "غير معروف"
            if ticket.get("admin_replies"):
                admin_name = ticket["admin_replies"][0].get("admin_name", "غير معروف")
            
            staff_stats[updated_by]["tickets"] += 1
            staff_stats[updated_by]["name"] = admin_name
            
            if ticket.get("rating"):
                staff_stats[updated_by]["ratings"].append(ticket["rating"])
    
    staff_performance = []
    for staff_id, data in staff_stats.items():
        avg_rating = round(sum(data["ratings"]) / len(data["ratings"]), 1) if data["ratings"] else 0
        staff_performance.append({
            "id": staff_id,
            "name": data["name"],
            "tickets_handled": data["tickets"],
            "avg_rating": avg_rating,
            "total_ratings": len(data["ratings"])
        })
    
    # ترتيب حسب عدد التذاكر
    staff_performance.sort(key=lambda x: x["tickets_handled"], reverse=True)
    
    # 4. التذاكر اليومية (آخر 7 أيام)
    daily_counts = defaultdict(int)
    now = datetime.now(timezone.utc)
    
    for ticket in all_tickets:
        created_at = ticket.get("created_at")
        if created_at:
            try:
                dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                days_ago = (now - dt).days
                if days_ago < 7:
                    date_str = dt.strftime("%Y-%m-%d")
                    daily_counts[date_str] += 1
            except Exception:
                pass
    
    daily_tickets = [{"date": d, "count": c} for d, c in sorted(daily_counts.items())]
    
    # 5. توزيع الحالات
    status_breakdown = {"pending": 0, "assigned": 0, "resolved": 0}
    for ticket in all_tickets:
        status = ticket.get("status", "pending")
        if status in status_breakdown:
            status_breakdown[status] += 1
    
    # 6. معدل الحل
    resolved_rate = round((status_breakdown["resolved"] / len(all_tickets)) * 100, 1) if all_tickets else 0
    
    return {
        "peak_hours": peak_hours,
        "avg_response_time_minutes": avg_response_time,
        "staff_performance": staff_performance[:10],  # أفضل 10
        "daily_tickets": daily_tickets,
        "status_breakdown": status_breakdown,
        "total_tickets": len(all_tickets),
        "resolved_rate": resolved_rate
    }
