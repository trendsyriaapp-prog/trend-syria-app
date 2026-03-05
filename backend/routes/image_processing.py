# /app/backend/routes/image_processing.py
# معالجة صور المنتجات - إزالة الخلفية وتحسين الصور

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from PIL import Image, ImageFilter, ImageDraw
import io
import base64
from rembg import remove
import httpx

router = APIRouter(prefix="/image", tags=["Image Processing"])

# خلفيات متدرجة جاهزة (مثل Trendyol)
GRADIENT_PRESETS = {
    "white": {"type": "solid", "color": (255, 255, 255)},
    "light_gray": {"type": "gradient", "colors": [(245, 245, 245), (255, 255, 255)], "direction": "vertical"},
    "soft_blue": {"type": "gradient", "colors": [(230, 240, 255), (255, 255, 255)], "direction": "vertical"},
    "soft_pink": {"type": "gradient", "colors": [(255, 240, 245), (255, 255, 255)], "direction": "vertical"},
    "soft_gold": {"type": "gradient", "colors": [(255, 248, 230), (255, 255, 255)], "direction": "vertical"},
    "elegant_gray": {"type": "gradient", "colors": [(200, 200, 200), (240, 240, 240)], "direction": "radial"},
    "premium_dark": {"type": "gradient", "colors": [(40, 40, 40), (80, 80, 80)], "direction": "radial"},
    "fashion_beige": {"type": "gradient", "colors": [(245, 240, 230), (255, 252, 248)], "direction": "vertical"},
    "tech_silver": {"type": "gradient", "colors": [(220, 225, 230), (245, 248, 250)], "direction": "vertical"},
    "nature_green": {"type": "gradient", "colors": [(235, 245, 235), (255, 255, 255)], "direction": "vertical"},
}

def create_gradient_background(width: int, height: int, preset_name: str) -> Image.Image:
    """إنشاء خلفية متدرجة"""
    preset = GRADIENT_PRESETS.get(preset_name, GRADIENT_PRESETS["white"])
    
    if preset["type"] == "solid":
        return Image.new("RGB", (width, height), preset["color"])
    
    background = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(background)
    
    color1, color2 = preset["colors"]
    
    if preset["direction"] == "vertical":
        for y in range(height):
            ratio = y / height
            r = int(color1[0] + (color2[0] - color1[0]) * ratio)
            g = int(color1[1] + (color2[1] - color1[1]) * ratio)
            b = int(color1[2] + (color2[2] - color1[2]) * ratio)
            draw.line([(0, y), (width, y)], fill=(r, g, b))
    
    elif preset["direction"] == "horizontal":
        for x in range(width):
            ratio = x / width
            r = int(color1[0] + (color2[0] - color1[0]) * ratio)
            g = int(color1[1] + (color2[1] - color1[1]) * ratio)
            b = int(color1[2] + (color2[2] - color1[2]) * ratio)
            draw.line([(x, 0), (x, height)], fill=(r, g, b))
    
    elif preset["direction"] == "radial":
        center_x, center_y = width // 2, height // 2
        max_dist = ((width/2)**2 + (height/2)**2) ** 0.5
        
        for y in range(height):
            for x in range(width):
                dist = ((x - center_x)**2 + (y - center_y)**2) ** 0.5
                ratio = min(dist / max_dist, 1.0)
                r = int(color1[0] + (color2[0] - color1[0]) * ratio)
                g = int(color1[1] + (color2[1] - color1[1]) * ratio)
                b = int(color1[2] + (color2[2] - color1[2]) * ratio)
                draw.point((x, y), fill=(r, g, b))
    
    return background

def add_shadow(image: Image.Image, offset: tuple = (5, 5), blur: int = 10, opacity: float = 0.3) -> Image.Image:
    """إضافة ظل خفيف للمنتج"""
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # إنشاء طبقة الظل
    shadow = Image.new('RGBA', image.size, (0, 0, 0, 0))
    
    # استخدام قناة الشفافية كقناع للظل
    alpha = image.split()[3]
    shadow_layer = Image.new('RGBA', image.size, (0, 0, 0, int(255 * opacity)))
    shadow.paste(shadow_layer, mask=alpha)
    
    # تطبيق التمويه
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    
    # إزاحة الظل
    shadow_shifted = Image.new('RGBA', image.size, (0, 0, 0, 0))
    shadow_shifted.paste(shadow, offset)
    
    return shadow_shifted

def process_product_image(
    image_data: bytes,
    background_type: str = "white",
    add_product_shadow: bool = True,
    output_size: tuple = (1200, 1200)
) -> bytes:
    """معالجة صورة المنتج - إزالة الخلفية وإضافة خلفية جديدة"""
    
    # فتح الصورة
    input_image = Image.open(io.BytesIO(image_data))
    
    # إزالة الخلفية
    output_image = remove(input_image)
    
    # تحويل إلى RGBA
    if output_image.mode != 'RGBA':
        output_image = output_image.convert('RGBA')
    
    # تغيير الحجم مع الحفاظ على النسبة
    output_image.thumbnail(output_size, Image.Resampling.LANCZOS)
    
    # إنشاء الخلفية الجديدة
    bg_width, bg_height = output_size
    background = create_gradient_background(bg_width, bg_height, background_type)
    background = background.convert('RGBA')
    
    # حساب موضع المنتج في المنتصف
    img_width, img_height = output_image.size
    x = (bg_width - img_width) // 2
    y = (bg_height - img_height) // 2
    
    # إضافة الظل إذا مطلوب
    if add_product_shadow and background_type != "premium_dark":
        shadow = add_shadow(output_image, offset=(8, 8), blur=15, opacity=0.2)
        background.paste(shadow, (x, y), shadow)
    
    # لصق المنتج فوق الخلفية
    background.paste(output_image, (x, y), output_image)
    
    # تحويل إلى RGB للحفظ كـ JPEG
    final_image = background.convert('RGB')
    
    # حفظ الصورة
    output_buffer = io.BytesIO()
    final_image.save(output_buffer, format='JPEG', quality=90)
    output_buffer.seek(0)
    
    return output_buffer.getvalue()


@router.post("/process")
async def process_image(
    file: UploadFile = File(...),
    background: str = Form(default="white"),
    add_shadow: bool = Form(default=True)
):
    """
    معالجة صورة المنتج
    
    - **file**: ملف الصورة
    - **background**: نوع الخلفية (white, light_gray, soft_blue, soft_pink, soft_gold, elegant_gray, premium_dark, fashion_beige, tech_silver, nature_green)
    - **add_shadow**: إضافة ظل خفيف (true/false)
    """
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="الملف يجب أن يكون صورة")
    
    # قراءة الصورة
    image_data = await file.read()
    
    if len(image_data) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(status_code=400, detail="حجم الصورة يجب أن يكون أقل من 10 ميجابايت")
    
    try:
        # معالجة الصورة
        processed_image = process_product_image(
            image_data=image_data,
            background_type=background,
            add_product_shadow=add_shadow
        )
        
        # تحويل إلى base64
        image_base64 = base64.b64encode(processed_image).decode('utf-8')
        
        return {
            "success": True,
            "image": f"data:image/jpeg;base64,{image_base64}",
            "background_used": background,
            "message": "تمت معالجة الصورة بنجاح"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل معالجة الصورة: {str(e)}")


@router.post("/process-url")
async def process_image_from_url(
    image_url: str,
    background: str = "white",
    add_shadow: bool = True
):
    """
    معالجة صورة من رابط URL
    """
    
    try:
        # تحميل الصورة من URL
        async with httpx.AsyncClient() as client:
            response = await client.get(image_url, timeout=30)
            response.raise_for_status()
            image_data = response.content
        
        # معالجة الصورة
        processed_image = process_product_image(
            image_data=image_data,
            background_type=background,
            add_product_shadow=add_shadow
        )
        
        # تحويل إلى base64
        image_base64 = base64.b64encode(processed_image).decode('utf-8')
        
        return {
            "success": True,
            "image": f"data:image/jpeg;base64,{image_base64}",
            "background_used": background,
            "message": "تمت معالجة الصورة بنجاح"
        }
        
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"فشل تحميل الصورة: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل معالجة الصورة: {str(e)}")


@router.get("/backgrounds")
async def get_available_backgrounds():
    """
    الحصول على قائمة الخلفيات المتاحة
    """
    backgrounds = [
        {"id": "white", "name": "أبيض نقي", "name_en": "Pure White", "category": "basic"},
        {"id": "light_gray", "name": "رمادي فاتح", "name_en": "Light Gray", "category": "basic"},
        {"id": "soft_blue", "name": "أزرق ناعم", "name_en": "Soft Blue", "category": "soft"},
        {"id": "soft_pink", "name": "وردي ناعم", "name_en": "Soft Pink", "category": "soft"},
        {"id": "soft_gold", "name": "ذهبي ناعم", "name_en": "Soft Gold", "category": "soft"},
        {"id": "elegant_gray", "name": "رمادي أنيق", "name_en": "Elegant Gray", "category": "premium"},
        {"id": "premium_dark", "name": "داكن فاخر", "name_en": "Premium Dark", "category": "premium"},
        {"id": "fashion_beige", "name": "بيج عصري", "name_en": "Fashion Beige", "category": "fashion"},
        {"id": "tech_silver", "name": "فضي تقني", "name_en": "Tech Silver", "category": "tech"},
        {"id": "nature_green", "name": "أخضر طبيعي", "name_en": "Nature Green", "category": "nature"},
    ]
    
    return {
        "backgrounds": backgrounds,
        "categories": {
            "basic": "أساسي",
            "soft": "ناعم",
            "premium": "فاخر",
            "fashion": "أزياء",
            "tech": "تقنية",
            "nature": "طبيعة"
        }
    }
