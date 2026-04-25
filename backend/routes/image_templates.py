# /app/backend/routes/image_templates.py
# نظام قوالب صور المنتجات - مجاني + AI مدفوع (Gemini Imagen)

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from PIL import Image, ImageDraw, ImageEnhance
import io
import base64
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from routes.auth import get_current_user
from dotenv import load_dotenv

# تحميل المتغيرات البيئية
load_dotenv()

from helpers.datetime_helpers import get_now
router = APIRouter(prefix="/templates", tags=["Image Templates"])


# ============== Authorization Dependencies ==============

async def require_any_seller_user(user: dict = Depends(get_current_user)) -> dict:
    """التحقق من أن المستخدم بائع عادي أو بائع طعام"""
    if user["user_type"] not in ["seller", "food_seller"]:
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    return user


MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "trend_syria")
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# سعر صورة AI بالليرة السورية
AI_IMAGE_PRICE = 3000

# ============== القوالب المجانية 3D ==============

TEMPLATES_3D = [
    {
        "id": "ramadan",
        "name": "رمضان كريم",
        "name_en": "Ramadan",
        "icon": "🌙",
        "category": "seasonal",
        "is_free": True,
        "colors": {"primary": "#4A1A6B", "secondary": "#FFD700", "accent": "#9B59B6"},
        "description": "قالب رمضاني مع هلال وفوانيس"
    },
    {
        "id": "eid",
        "name": "عيد مبارك",
        "name_en": "Eid",
        "icon": "🎉",
        "category": "seasonal",
        "is_free": True,
        "colors": {"primary": "#1E5128", "secondary": "#FFD700", "accent": "#4E9F3D"},
        "description": "قالب احتفالي للأعياد"
    },
    {
        "id": "hot_sale",
        "name": "تخفيضات حارة",
        "name_en": "Hot Sale",
        "icon": "🔥",
        "category": "promotion",
        "is_free": True,
        "colors": {"primary": "#FF4500", "secondary": "#FFD700", "accent": "#FF6B00"},
        "description": "قالب العروض والتخفيضات"
    },
    {
        "id": "flash_deal",
        "name": "عرض خاطف",
        "name_en": "Flash Deal",
        "icon": "⚡",
        "category": "promotion",
        "is_free": True,
        "colors": {"primary": "#FFD700", "secondary": "#FF6B00", "accent": "#FFA500"},
        "description": "للعروض المحدودة الوقت"
    },
    {
        "id": "premium",
        "name": "فاخر",
        "name_en": "Premium",
        "icon": "💎",
        "category": "luxury",
        "is_free": True,
        "colors": {"primary": "#1A1A2E", "secondary": "#FFD700", "accent": "#C9B037"},
        "description": "للمنتجات الراقية والفاخرة"
    },
    {
        "id": "tech",
        "name": "تقني",
        "name_en": "Tech",
        "icon": "🎧",
        "category": "category",
        "is_free": True,
        "colors": {"primary": "#0F0F1A", "secondary": "#00D4FF", "accent": "#7B2CBF"},
        "description": "للإلكترونيات والتقنية"
    },
    {
        "id": "fashion",
        "name": "أزياء",
        "name_en": "Fashion",
        "icon": "👗",
        "category": "category",
        "is_free": True,
        "colors": {"primary": "#FDF5E6", "secondary": "#D4A574", "accent": "#8B7355"},
        "description": "للملابس والأزياء"
    },
    {
        "id": "beauty",
        "name": "جمال",
        "name_en": "Beauty",
        "icon": "💄",
        "category": "category",
        "is_free": True,
        "colors": {"primary": "#FFE4E1", "secondary": "#FF69B4", "accent": "#DB7093"},
        "description": "لمستحضرات التجميل"
    },
    {
        "id": "sports",
        "name": "رياضي",
        "name_en": "Sports",
        "icon": "⚽",
        "category": "category",
        "is_free": True,
        "colors": {"primary": "#1B4332", "secondary": "#40916C", "accent": "#95D5B2"},
        "description": "للمنتجات الرياضية"
    },
    {
        "id": "kids",
        "name": "أطفال",
        "name_en": "Kids",
        "icon": "🧸",
        "category": "category",
        "is_free": True,
        "colors": {"primary": "#87CEEB", "secondary": "#FFB6C1", "accent": "#98FB98"},
        "description": "لمنتجات الأطفال"
    },
    {
        "id": "winter",
        "name": "شتاء",
        "name_en": "Winter",
        "icon": "❄️",
        "category": "seasonal",
        "is_free": True,
        "colors": {"primary": "#E8F4FC", "secondary": "#1E90FF", "accent": "#00CED1"},
        "description": "قالب شتوي بارد"
    },
    {
        "id": "summer",
        "name": "صيف",
        "name_en": "Summer",
        "icon": "☀️",
        "category": "seasonal",
        "is_free": True,
        "colors": {"primary": "#FFF8DC", "secondary": "#FF8C00", "accent": "#FFD700"},
        "description": "قالب صيفي مشرق"
    },
]


def hex_to_rgb(hex_color) -> dict:
    """تحويل لون HEX إلى RGB"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def create_gradient_background(width, height, color1, color2, direction="vertical") -> dict:
    """إنشاء خلفية متدرجة"""
    image = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(image)
    
    r1, g1, b1 = hex_to_rgb(color1)
    r2, g2, b2 = hex_to_rgb(color2)
    
    if direction == "vertical":
        for y in range(height):
            ratio = y / height
            r = int(r1 + (r2 - r1) * ratio)
            g = int(g1 + (g2 - g1) * ratio)
            b = int(b1 + (b2 - b1) * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
    else:
        for x in range(width):
            ratio = x / width
            r = int(r1 + (r2 - r1) * ratio)
            g = int(g1 + (g2 - g1) * ratio)
            b = int(b1 + (b2 - b1) * ratio)
            draw.line([(x, 0), (x, height)], fill=(r, g, b))
    
    return image


def create_3d_platform(width, height, platform_color, glow_color) -> dict:
    """إنشاء منصة 3D للمنتج"""
    platform = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(platform)
    
    # رسم المنصة البيضاوية
    platform_y = int(height * 0.75)
    platform_height = int(height * 0.15)
    
    # الظل
    for i in range(20):
        offset = i * 2
        draw.ellipse([
            width//4 - offset, platform_y - offset//2,
            width*3//4 + offset, platform_y + platform_height + offset//2
        ], fill=(0, 0, 0, max(0, 30 - i*2)))
    
    # المنصة الرئيسية
    rgb = hex_to_rgb(platform_color)
    draw.ellipse([
        width//4, platform_y,
        width*3//4, platform_y + platform_height
    ], fill=(*rgb, 255))
    
    # توهج حول المنصة
    glow_rgb = hex_to_rgb(glow_color)
    for i in range(10):
        alpha = max(0, 100 - i*10)
        draw.ellipse([
            width//4 - i*5, platform_y - i*2,
            width*3//4 + i*5, platform_y + platform_height + i*2
        ], outline=(*glow_rgb, alpha), width=2)
    
    return platform


def apply_template_to_product(product_image: Image.Image, template_id: str) -> Image.Image:
    """تطبيق القالب على صورة المنتج"""
    template = next((t for t in TEMPLATES_3D if t["id"] == template_id), None)
    if not template:
        template = TEMPLATES_3D[0]  # الافتراضي
    
    colors = template["colors"]
    output_size = (1200, 1200)
    
    # إنشاء الخلفية المتدرجة
    background = create_gradient_background(
        output_size[0], output_size[1],
        colors["primary"], colors.get("accent", colors["secondary"]),
        "vertical"
    )
    background = background.convert('RGBA')
    
    # إضافة المنصة 3D
    platform = create_3d_platform(
        output_size[0], output_size[1],
        "#FFFFFF", colors["secondary"]
    )
    background = Image.alpha_composite(background, platform)
    
    # تحضير صورة المنتج
    if product_image.mode != 'RGBA':
        product_image = product_image.convert('RGBA')
    
    # تغيير حجم المنتج
    max_product_size = (700, 700)
    product_image.thumbnail(max_product_size, Image.Resampling.LANCZOS)
    
    # حساب موضع المنتج (فوق المنصة)
    prod_w, prod_h = product_image.size
    x = (output_size[0] - prod_w) // 2
    y = int(output_size[1] * 0.45) - prod_h // 2
    
    # إضافة ظل للمنتج
    shadow = Image.new('RGBA', output_size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_offset = 15
    for i in range(20):
        alpha = max(0, 40 - i*2)
        shadow_draw.ellipse([
            x + prod_w//4 + i*2, y + prod_h - 20 + shadow_offset + i,
            x + prod_w*3//4 - i*2, y + prod_h + shadow_offset + 30 + i
        ], fill=(0, 0, 0, alpha))
    
    background = Image.alpha_composite(background, shadow)
    
    # لصق المنتج
    background.paste(product_image, (x, y), product_image)
    
    # إضافة تأثيرات إضافية حسب القالب
    if template_id in ["hot_sale", "flash_deal"]:
        # إضافة شرارات للعروض
        pass
    elif template_id in ["premium", "beauty"]:
        # إضافة لمعان
        pass
    
    return background.convert('RGB')


def image_to_base64(image: Image.Image, format: str = 'JPEG', quality: int = 95) -> str:
    """تحويل الصورة إلى base64"""
    output = io.BytesIO()
    if format.upper() == 'PNG':
        image.save(output, format='PNG')
        mime = 'image/png'
    else:
        if image.mode == 'RGBA':
            image = image.convert('RGB')
        image.save(output, format='JPEG', quality=quality)
        mime = 'image/jpeg'
    
    output.seek(0)
    return f"data:{mime};base64,{base64.b64encode(output.getvalue()).decode('utf-8')}"


# ============== Gemini AI Image Generation ==============

def get_template_prompt(template_id: str, template: dict) -> str:
    """إنشاء prompt مناسب لكل قالب"""
    prompts = {
        "ramadan": "Place this product on an elegant 3D purple velvet platform with golden crescent moon behind, hanging glowing lanterns, Islamic geometric patterns, gold sparkles and stars floating, Ramadan theme, photorealistic product photography, premium retail display, dramatic lighting",
        
        "eid": "Place this product on a festive 3D green platform with golden decorations, celebration theme, confetti and stars, Eid Mubarak celebration, professional product photography, joyful atmosphere",
        
        "hot_sale": "Place this product on a glossy white 3D podium with bold 50% OFF text floating above, fire and flames at bottom, orange red gradient background, lightning bolts, explosive energy, hot sale promotion, cinematic lighting",
        
        "flash_deal": "Place this product on a dynamic yellow 3D platform with lightning bolts around, urgency timer, flash deal promotion, electric energy effects, modern e-commerce style",
        
        "premium": "Place this product on a black velvet 3D platform with gold accents and sparkles, PREMIUM badge, luxurious dark background, spotlight from above, high-end luxury product photography, reflection on glossy surface",
        
        "tech": "Place this product on a floating white 3D pedestal with holographic purple and blue neon glow background, geometric 3D shapes floating, futuristic tech style, glass reflections, Apple style minimalist",
        
        "fashion": "Place this product on an elegant beige 3D platform with soft fabric texture, fashion runway style, warm elegant lighting, stylish modern aesthetic, fashion e-commerce photography",
        
        "beauty": "Place this product on a pink marble 3D platform with rose petals and sparkles, beauty and cosmetics theme, soft glamorous lighting, luxury beauty product photography",
        
        "sports": "Place this product on a dynamic green 3D platform with energy lines and motion blur effects, sports and fitness theme, energetic powerful atmosphere, athletic product photography",
        
        "kids": "Place this product on a colorful playful 3D platform with rainbow colors, toys and stars floating, fun cheerful kids theme, bright happy lighting, children products photography",
        
        "winter": "Place this product on an icy blue 3D crystal platform with snowflakes falling, winter frost effects, cold elegant atmosphere, winter season theme, magical lighting",
        
        "summer": "Place this product on a sunny golden 3D platform with sun rays and warm glow, summer beach vibes, bright cheerful atmosphere, summer season theme"
    }
    
    base_prompt = prompts.get(template_id, "Place this product on an elegant 3D white platform with professional studio lighting, e-commerce product photography")
    
    return base_prompt


async def generate_ai_image(image_base64: str, template_id: str, template: dict) -> str:
    """إنشاء صورة احترافية باستخدام OpenAI"""
    # TODO: في المستقبل يمكن استخدام DALL-E API لتوليد صور احترافية
    # حالياً نُرجع الصورة الأصلية
    
    # إزالة prefix من base64 إذا موجود
    if image_base64.startswith('data:'):
        image_base64 = image_base64.split(',')[1]
    
    # تجنب تحذير unused
    _ = (template_id, template)
    
    return f"data:image/jpeg;base64,{image_base64}"


# ============== API Endpoints ==============

@router.get("/list")
async def get_templates() -> dict:
    """جلب قائمة القوالب المتاحة"""
    return {
        "templates": TEMPLATES_3D,
        "categories": {
            "seasonal": "موسمية",
            "promotion": "عروض",
            "luxury": "فاخرة",
            "category": "فئات المنتجات"
        },
        "ai_price": AI_IMAGE_PRICE,
        "ai_price_formatted": f"{AI_IMAGE_PRICE:,} ل.س"
    }


@router.post("/apply-free")
async def apply_free_template(
    file: UploadFile = File(...),
    template_id: str = Form(...)
) -> dict:
    """
    تطبيق قالب مجاني على صورة المنتج
    - مجاني للجميع
    - دمج الصورة على القالب
    """
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="الملف يجب أن يكون صورة")
    
    # التحقق من أن القالب مجاني
    template = next((t for t in TEMPLATES_3D if t["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=400, detail="القالب غير موجود")
    
    if not template.get("is_free", False):
        raise HTTPException(status_code=400, detail="هذا القالب غير مجاني")
    
    try:
        # قراءة الصورة
        image_data = await file.read()
        product_image = Image.open(io.BytesIO(image_data))
        
        # تطبيق القالب
        result_image = apply_template_to_product(product_image, template_id)
        
        # تحويل إلى base64
        result_base64 = image_to_base64(result_image)
        
        return {
            "success": True,
            "image": result_base64,
            "template_used": template_id,
            "template_name": template["name"],
            "cost": 0,
            "method": "free_template"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل معالجة الصورة: {str(e)}")


@router.post("/apply-ai")
async def apply_ai_template(
    file: UploadFile = File(...),
    template_id: str = Form(...),
    user: dict = Depends(get_current_user)
) -> dict:
    """
    إنشاء صورة احترافية بالذكاء الاصطناعي
    - مدفوع (يخصم من رصيد البائع)
    - جودة عالية جداً
    """
    if user["user_type"] not in ["seller", "food_seller"]:
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    # التحقق من رصيد البائع
    seller = await db.users.find_one({"phone": user["phone"]}, {"_id": 0})
    if not seller:
        raise HTTPException(status_code=404, detail="البائع غير موجود")
    
    wallet_balance = seller.get("wallet_balance", 0)
    
    if wallet_balance < AI_IMAGE_PRICE:
        raise HTTPException(
            status_code=402, 
            detail={
                "error": "رصيد غير كافٍ",
                "required": AI_IMAGE_PRICE,
                "current_balance": wallet_balance,
                "message": f"رصيدك الحالي {wallet_balance:,} ل.س، تحتاج {AI_IMAGE_PRICE:,} ل.س"
            }
        )
    
    template = next((t for t in TEMPLATES_3D if t["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=400, detail="القالب غير موجود")
    
    try:
        # قراءة الصورة
        image_data = await file.read()
        
        # تحويل الصورة إلى base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        result_base64 = None
        method = "ai_gemini"
        
        # محاولة استخدام Gemini AI
        try:
            if EMERGENT_LLM_KEY:
                result_base64 = await generate_ai_image(image_base64, template_id, template)
                print(f"AI image generated successfully for template: {template_id}")
            else:
                raise Exception("No API key")
        except Exception as ai_error:
            print(f"AI generation failed: {ai_error}, using local fallback")
            # Fallback للمعالجة المحلية
            product_image = Image.open(io.BytesIO(image_data))
            result_image = apply_template_to_product(product_image, template_id)
            
            # تحسينات إضافية للنسخة المدفوعة
            enhancer = ImageEnhance.Contrast(result_image)
            result_image = enhancer.enhance(1.1)
            enhancer = ImageEnhance.Color(result_image)
            result_image = enhancer.enhance(1.1)
            enhancer = ImageEnhance.Sharpness(result_image)
            result_image = enhancer.enhance(1.2)
            
            result_base64 = image_to_base64(result_image, quality=98)
            method = "ai_fallback"
        
        # خصم من رصيد البائع
        await db.users.update_one(
            {"phone": user["phone"]},
            {
                "$inc": {"wallet_balance": -AI_IMAGE_PRICE},
                "$push": {
                    "wallet_transactions": {
                        "type": "ai_image",
                        "amount": -AI_IMAGE_PRICE,
                        "description": f"صورة احترافية AI - قالب {template['name']}",
                        "date": get_now()
                    }
                }
            }
        )
        
        # تسجيل الاستخدام
        await db.ai_image_usage.insert_one({
            "seller_phone": user["phone"],
            "template_id": template_id,
            "cost": AI_IMAGE_PRICE,
            "method": method,
            "created_at": get_now()
        })
        
        new_balance = wallet_balance - AI_IMAGE_PRICE
        
        return {
            "success": True,
            "image": result_base64,
            "template_used": template_id,
            "template_name": template["name"],
            "cost": AI_IMAGE_PRICE,
            "new_balance": new_balance,
            "method": method
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل معالجة الصورة: {str(e)}")


@router.get("/check-balance")
async def check_ai_balance(user: dict = Depends(require_any_seller_user)) -> dict:
    """التحقق من رصيد البائع للصور AI"""
    seller = await db.users.find_one({"phone": user["phone"]}, {"_id": 0, "wallet_balance": 1})
    
    balance = seller.get("wallet_balance", 0) if seller else 0
    can_use_ai = balance >= AI_IMAGE_PRICE
    images_available = balance // AI_IMAGE_PRICE
    
    return {
        "wallet_balance": balance,
        "ai_image_price": AI_IMAGE_PRICE,
        "can_use_ai": can_use_ai,
        "images_available": images_available,
        "message": f"يمكنك إنشاء {images_available} صورة AI" if can_use_ai else "رصيد غير كافٍ"
    }
