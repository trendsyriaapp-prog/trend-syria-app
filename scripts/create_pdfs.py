"""
إنشاء ملفات PDF للعقود والرسائل - تريند سورية
"""

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import arabic_reshaper
from bidi.algorithm import get_display
import os

# تحميل خط عربي
try:
    pdfmetrics.registerFont(TTFont('Arabic', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
    FONT = 'Arabic'
except:
    FONT = 'Helvetica'

def reshape_arabic(text):
    """تحويل النص العربي للعرض الصحيح"""
    try:
        reshaped = arabic_reshaper.reshape(text)
        return get_display(reshaped)
    except:
        return text

def create_seller_contract():
    """إنشاء عقد البائع"""
    filename = '/app/frontend/public/docs/seller_contract.pdf'
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4
    
    # العنوان
    c.setFont(FONT, 24)
    c.drawCentredString(width/2, height - 2*cm, reshape_arabic("عقد شراكة تجارية"))
    c.setFont(FONT, 18)
    c.drawCentredString(width/2, height - 3*cm, reshape_arabic("تريند سورية"))
    
    # خط فاصل
    c.line(2*cm, height - 3.5*cm, width - 2*cm, height - 3.5*cm)
    
    # المحتوى
    y = height - 5*cm
    c.setFont(FONT, 12)
    
    lines = [
        "التاريخ: ___/___/______",
        "",
        "الطرف الأول: تريند سورية (المنصة)",
        "الطرف الثاني: _______________ (البائع/المتجر)",
        "العنوان: _______________",
        "رقم الهاتف: _______________",
        "",
        "═" * 50,
        "",
        "البند الأول: موضوع العقد",
        "يوافق الطرف الثاني على عرض منتجاته/خدماته على منصة تريند سورية",
        "",
        "البند الثاني: التزامات المنصة",
        "• توفير واجهة إلكترونية لعرض المنتجات",
        "• استقبال الطلبات وإرسالها للبائع",
        "• توفير خدمة التوصيل للعملاء",
        "• تحصيل المبالغ وتحويلها للبائع",
        "",
        "البند الثالث: التزامات البائع",
        "• تقديم منتجات بجودة عالية",
        "• الالتزام بالأسعار المعلنة",
        "• تحضير الطلبات خلال الوقت المحدد",
        "",
        "البند الرابع: العمولة",
        "فترة تجريبية: ______ شهور (بدون عمولة)",
        "بعد الفترة التجريبية: _____% من قيمة الطلب",
        "",
        "البند الخامس: مدة العقد",
        "سنة واحدة قابلة للتجديد تلقائياً",
        "",
        "البند السادس: إنهاء العقد",
        "يحق لأي طرف إنهاء العقد بإشعار خطي قبل 15 يوم",
        "",
        "═" * 50,
        "",
        "توقيع الطرف الأول: _______________",
        "",
        "توقيع الطرف الثاني: _______________",
        "",
        "التاريخ: ___/___/______",
    ]
    
    for line in lines:
        if y < 2*cm:
            c.showPage()
            y = height - 2*cm
            c.setFont(FONT, 12)
        c.drawRightString(width - 2*cm, y, reshape_arabic(line))
        y -= 0.6*cm
    
    c.save()
    print(f"✅ تم إنشاء: {filename}")

def create_driver_contract():
    """إنشاء عقد موظف التوصيل"""
    filename = '/app/frontend/public/docs/driver_contract.pdf'
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4
    
    c.setFont(FONT, 24)
    c.drawCentredString(width/2, height - 2*cm, reshape_arabic("عقد عمل حر"))
    c.setFont(FONT, 18)
    c.drawCentredString(width/2, height - 3*cm, reshape_arabic("موظف توصيل - تريند سورية"))
    
    c.line(2*cm, height - 3.5*cm, width - 2*cm, height - 3.5*cm)
    
    y = height - 5*cm
    c.setFont(FONT, 12)
    
    lines = [
        "التاريخ: ___/___/______",
        "",
        "الطرف الأول: تريند سورية (المنصة)",
        "الطرف الثاني: _______________ (موظف التوصيل)",
        "رقم الهوية: _______________",
        "رقم الهاتف: _______________",
        "",
        "═" * 50,
        "",
        "البند الأول: طبيعة العمل",
        "عمل حر - توصيل الطلبات للعملاء",
        "",
        "البند الثاني: التزامات المنصة",
        "• توفير تطبيق لاستقبال الطلبات",
        "• دفع العمولة المتفق عليها",
        "• دعم فني على مدار الساعة",
        "",
        "البند الثالث: التزامات موظف التوصيل",
        "• امتلاك وسيلة نقل مناسبة",
        "• امتلاك هاتف ذكي مع إنترنت",
        "• التوصيل خلال الوقت المحدد",
        "• التعامل باحترام مع العملاء",
        "",
        "البند الرابع: العمولات",
        "0-3 كم: _______ ل.س",
        "3-5 كم: _______ ل.س", 
        "5-10 كم: _______ ل.س",
        "",
        "البند الخامس: البقشيش",
        "البقشيش من العميل يعود 100% لموظف التوصيل",
        "",
        "═" * 50,
        "",
        "توقيع الطرف الأول: _______________",
        "",
        "توقيع الطرف الثاني: _______________",
    ]
    
    for line in lines:
        if y < 2*cm:
            c.showPage()
            y = height - 2*cm
            c.setFont(FONT, 12)
        c.drawRightString(width - 2*cm, y, reshape_arabic(line))
        y -= 0.6*cm
    
    c.save()
    print(f"✅ تم إنشاء: {filename}")

def create_whatsapp_messages():
    """إنشاء رسائل واتساب"""
    filename = '/app/frontend/public/docs/whatsapp_messages.pdf'
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4
    
    c.setFont(FONT, 24)
    c.drawCentredString(width/2, height - 2*cm, reshape_arabic("رسائل واتساب جاهزة"))
    c.setFont(FONT, 18)
    c.drawCentredString(width/2, height - 3*cm, reshape_arabic("تريند سورية"))
    
    c.line(2*cm, height - 3.5*cm, width - 2*cm, height - 3.5*cm)
    
    y = height - 5*cm
    c.setFont(FONT, 11)
    
    lines = [
        "══════════════════════════════════════",
        "رسائل للبائعين",
        "══════════════════════════════════════",
        "",
        "الرسالة الأولى - التعريف:",
        "السلام عليكم",
        "أنا [اسمك] من تريند سورية",
        "أول تطبيق سوري للتسوق والتوصيل",
        "شفنا متجركم وعجبنا كتير!",
        "وحابين تكونوا شركاء معنا",
        "أول 3 شهور بدون أي عمولة!",
        "ممكن نحكي 5 دقائق؟",
        "",
        "══════════════════════════════════════",
        "رسائل للعملاء",
        "══════════════════════════════════════",
        "",
        "رسالة ترحيب:",
        "أهلاً فيك بتريند سورية!",
        "أول طلب؟ هديتنا إلك:",
        "توصيل مجاني + خصم 20%",
        "كود: WELCOME20",
        "",
        "رسالة عرض:",
        "عرض اليوم من تريند سورية!",
        "خصم 50% لمدة 24 ساعة فقط!",
        "",
        "══════════════════════════════════════",
        "رسائل لموظفي التوصيل",
        "══════════════════════════════════════",
        "",
        "إعلان التوظيف:",
        "فرصة عمل - تريند سورية",
        "عندك دراجة؟ اشتغل معنا!",
        "عمولة على كل طلب",
        "البقشيش 100% إلك",
        "اشتغل وقت ما بدك",
        "",
        "══════════════════════════════════════",
    ]
    
    for line in lines:
        if y < 2*cm:
            c.showPage()
            y = height - 2*cm
            c.setFont(FONT, 11)
        c.drawRightString(width - 2*cm, y, reshape_arabic(line))
        y -= 0.55*cm
    
    c.save()
    print(f"✅ تم إنشاء: {filename}")

# إنشاء جميع الملفات
if __name__ == "__main__":
    print("جاري إنشاء ملفات PDF...")
    create_seller_contract()
    create_driver_contract()
    create_whatsapp_messages()
    print("\n✅ تم إنشاء جميع الملفات بنجاح!")
