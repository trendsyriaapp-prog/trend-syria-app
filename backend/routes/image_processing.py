# /app/backend/routes/image_processing.py
# معالجة صور المنتجات - نظام احترافي مثل Trendyol
# يدعم PhotoRoom API + Remove.bg API + معالجة تلقائية متقدمة

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from PIL import Image, ImageFilter, ImageDraw, ImageEnhance, ImageOps
import io
import base64
import os
import httpx
import numpy as np
from rembg import remove
from typing import Optional, Tuple, List
from pydantic import BaseModel

# استيراد خدمة PhotoRoom
from services.photoroom import (
    remove_background_photoroom, 
    process_with_photoroom,
    get_available_shadow_types,
    SHADOW_TYPES
)

router = APIRouter(prefix="/image", tags=["Image Processing"])

# PhotoRoom API Configuration
PHOTOROOM_API_KEY = os.environ.get("PHOTOROOM_API_KEY")

# Remove.bg API Configuration (fallback)
REMOVE_BG_API_KEY = os.environ.get("REMOVE_BG_API_KEY")
REMOVE_BG_API_URL = "https://api.remove.bg/v1.0/removebg"

# ============== إعدادات المعالجة الاحترافية ==============

# أحجام الصور المتعددة
IMAGE_SIZES = {
    "thumbnail": (200, 200),      # للقوائم
    "medium": (600, 600),         # للعرض المتوسط
    "full": (1200, 1200),         # للعرض الكامل
    "social_square": (1080, 1080), # انستغرام
    "social_story": (1080, 1920),  # ستوري
}

# معايير جودة الصورة
QUALITY_STANDARDS = {
    "min_resolution": 500,        # الحد الأدنى للدقة
    "recommended_resolution": 1000,
    "max_file_size_mb": 10,
    "min_brightness": 40,         # 0-255
    "max_brightness": 240,
    "min_contrast": 30,
    "blur_threshold": 100,        # Laplacian variance
}

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


async def remove_background_removebg(image_data: bytes) -> bytes:
    """إزالة الخلفية باستخدام Remove.bg API - جودة احترافية"""
    if not REMOVE_BG_API_KEY:
        raise Exception("Remove.bg API key not configured")
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            REMOVE_BG_API_URL,
            files={"image_file": ("image.png", image_data, "image/png")},
            data={"size": "auto", "format": "png"},
            headers={"X-Api-Key": REMOVE_BG_API_KEY}
        )
        
        if response.status_code == 200:
            return response.content
        elif response.status_code == 402:
            raise Exception("Remove.bg credits exhausted - الرصيد المجاني انتهى")
        else:
            error_msg = response.json().get("errors", [{}])[0].get("title", "Unknown error")
            raise Exception(f"Remove.bg API error: {error_msg}")


def remove_background_local(image_data: bytes) -> bytes:
    """إزالة الخلفية محلياً باستخدام rembg - fallback"""
    input_image = Image.open(io.BytesIO(image_data))
    output_image = remove(input_image)
    
    # تحسين الحواف
    if output_image.mode == 'RGBA':
        # تنعيم الحواف
        alpha = output_image.split()[3]
        alpha = alpha.filter(ImageFilter.GaussianBlur(0.5))
        output_image.putalpha(alpha)
    
    output_buffer = io.BytesIO()
    output_image.save(output_buffer, format='PNG')
    output_buffer.seek(0)
    return output_buffer.getvalue()


def enhance_image(image: Image.Image) -> Image.Image:
    """تحسين جودة الصورة"""
    # زيادة الحدة قليلاً
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(1.1)
    
    # تحسين التباين قليلاً
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.05)
    
    return image


# ============== دوال المعالجة المتقدمة (المستوى 1 + 2) ==============

def analyze_image_quality(image: Image.Image) -> dict:
    """تحليل جودة الصورة وإرجاع تقرير"""
    width, height = image.size
    
    # تحويل لـ RGB إذا لزم
    if image.mode == 'RGBA':
        rgb_image = Image.new('RGB', image.size, (255, 255, 255))
        rgb_image.paste(image, mask=image.split()[3])
    else:
        rgb_image = image.convert('RGB')
    
    # حساب السطوع
    grayscale = rgb_image.convert('L')
    pixels = list(grayscale.getdata())
    avg_brightness = sum(pixels) / len(pixels) if pixels else 128
    
    # حساب التباين
    if pixels:
        mean = avg_brightness
        variance = sum((p - mean) ** 2 for p in pixels) / len(pixels)
        contrast = variance ** 0.5
    else:
        contrast = 50
    
    # كشف الضبابية (Laplacian variance approximation)
    blur_score = contrast * 2  # تقدير بسيط
    
    issues = []
    suggestions = []
    
    # التحقق من الدقة
    min_dim = min(width, height)
    if min_dim < QUALITY_STANDARDS["min_resolution"]:
        issues.append(f"دقة منخفضة ({min_dim}px)")
        suggestions.append("ارفع صورة بدقة أعلى (1000px على الأقل)")
    
    # التحقق من السطوع
    if avg_brightness < QUALITY_STANDARDS["min_brightness"]:
        issues.append("الصورة مظلمة جداً")
        suggestions.append("سيتم تفتيح الصورة تلقائياً")
    elif avg_brightness > QUALITY_STANDARDS["max_brightness"]:
        issues.append("الصورة فاتحة جداً")
        suggestions.append("سيتم تعديل الإضاءة تلقائياً")
    
    # التحقق من التباين
    if contrast < QUALITY_STANDARDS["min_contrast"]:
        issues.append("تباين منخفض")
        suggestions.append("سيتم تحسين التباين تلقائياً")
    
    quality_score = 100
    if min_dim < 500:
        quality_score -= 30
    elif min_dim < 800:
        quality_score -= 15
    if avg_brightness < 40 or avg_brightness > 240:
        quality_score -= 20
    if contrast < 30:
        quality_score -= 15
    
    return {
        "width": width,
        "height": height,
        "brightness": round(avg_brightness, 1),
        "contrast": round(contrast, 1),
        "blur_score": round(blur_score, 1),
        "quality_score": max(0, min(100, quality_score)),
        "issues": issues,
        "suggestions": suggestions,
        "passes_standards": len(issues) == 0
    }


def auto_color_correction(image: Image.Image) -> Image.Image:
    """تصحيح الألوان التلقائي - توازن الأبيض والتشبع والتباين"""
    if image.mode == 'RGBA':
        # حفظ قناة الشفافية
        alpha = image.split()[3]
        rgb_image = Image.new('RGB', image.size, (255, 255, 255))
        rgb_image.paste(image, mask=alpha)
    else:
        rgb_image = image.convert('RGB')
        alpha = None
    
    # 1. توازن الأبيض التلقائي (Auto White Balance)
    # حساب متوسط كل قناة
    r, g, b = rgb_image.split()
    r_avg = sum(r.getdata()) / (image.width * image.height)
    g_avg = sum(g.getdata()) / (image.width * image.height)
    b_avg = sum(b.getdata()) / (image.width * image.height)
    
    # حساب المتوسط العام
    avg = (r_avg + g_avg + b_avg) / 3
    
    # تصحيح كل قناة
    if r_avg > 0:
        r = r.point(lambda x: min(255, int(x * avg / r_avg)))
    if g_avg > 0:
        g = g.point(lambda x: min(255, int(x * avg / g_avg)))
    if b_avg > 0:
        b = b.point(lambda x: min(255, int(x * avg / b_avg)))
    
    rgb_image = Image.merge('RGB', (r, g, b))
    
    # 2. تحسين التباين التلقائي (Auto Contrast)
    rgb_image = ImageOps.autocontrast(rgb_image, cutoff=1)
    
    # 3. تحسين التشبع قليلاً
    enhancer = ImageEnhance.Color(rgb_image)
    rgb_image = enhancer.enhance(1.1)
    
    # 4. تحسين السطوع إذا لزم
    grayscale = rgb_image.convert('L')
    avg_brightness = sum(grayscale.getdata()) / (image.width * image.height)
    
    if avg_brightness < 100:
        enhancer = ImageEnhance.Brightness(rgb_image)
        rgb_image = enhancer.enhance(1.15)
    elif avg_brightness > 200:
        enhancer = ImageEnhance.Brightness(rgb_image)
        rgb_image = enhancer.enhance(0.9)
    
    # إعادة قناة الشفافية
    if alpha:
        rgb_image = rgb_image.convert('RGBA')
        rgb_image.putalpha(alpha)
    
    return rgb_image


def sharpen_image(image: Image.Image, strength: float = 1.5) -> Image.Image:
    """تحسين الحدة باستخدام Unsharp Mask"""
    if image.mode == 'RGBA':
        alpha = image.split()[3]
        rgb_image = image.convert('RGB')
    else:
        rgb_image = image.convert('RGB')
        alpha = None
    
    # تطبيق Unsharp Mask
    sharpened = ImageEnhance.Sharpness(rgb_image).enhance(strength)
    
    # تطبيق فلتر حدة إضافي خفيف
    sharpened = sharpened.filter(ImageFilter.UnsharpMask(radius=1, percent=50, threshold=3))
    
    if alpha:
        sharpened = sharpened.convert('RGBA')
        sharpened.putalpha(alpha)
    
    return sharpened


def smart_center_crop(image: Image.Image, target_size: Tuple[int, int] = (1200, 1200), padding_percent: float = 0.1) -> Image.Image:
    """توسيط ذكي للمنتج مع مساحة متساوية حوله"""
    if image.mode != 'RGBA':
        return image
    
    # الحصول على قناة الشفافية
    alpha = image.split()[3]
    
    # إيجاد حدود المنتج (bounding box)
    bbox = alpha.getbbox()
    if not bbox:
        return image
    
    left, top, right, bottom = bbox
    product_width = right - left
    product_height = bottom - top
    
    # قص المنتج
    product = image.crop(bbox)
    
    # حساب الحجم الجديد مع padding
    padding = int(max(product_width, product_height) * padding_percent)
    new_width = product_width + (padding * 2)
    new_height = product_height + (padding * 2)
    
    # التأكد من نسبة 1:1
    max_dim = max(new_width, new_height)
    
    # إنشاء صورة جديدة شفافة
    centered = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
    
    # حساب موضع اللصق للتوسيط
    paste_x = (max_dim - product_width) // 2
    paste_y = (max_dim - product_height) // 2
    
    # لصق المنتج في المنتصف
    centered.paste(product, (paste_x, paste_y), product)
    
    # تغيير الحجم للهدف
    centered = centered.resize(target_size, Image.Resampling.LANCZOS)
    
    return centered


def add_reflection(image: Image.Image, reflection_height: float = 0.3, opacity: float = 0.3) -> Image.Image:
    """إضافة انعكاس احترافي للمنتج"""
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    width, height = image.size
    reflection_h = int(height * reflection_height)
    
    # قص الجزء السفلي للانعكاس
    bottom_part = image.crop((0, height - reflection_h, width, height))
    
    # قلب الصورة
    reflection = ImageOps.flip(bottom_part)
    
    # إنشاء تدرج الشفافية
    gradient = Image.new('L', (width, reflection_h))
    for y in range(reflection_h):
        alpha_value = int(255 * opacity * (1 - y / reflection_h))
        for x in range(width):
            gradient.putpixel((x, y), alpha_value)
    
    # تطبيق التدرج على الانعكاس
    reflection_alpha = reflection.split()[3]
    new_alpha = Image.new('L', (width, reflection_h))
    
    for y in range(reflection_h):
        for x in range(width):
            orig_alpha = reflection_alpha.getpixel((x, y))
            grad_alpha = gradient.getpixel((x, y))
            new_alpha.putpixel((x, y), min(orig_alpha, grad_alpha))
    
    reflection.putalpha(new_alpha)
    
    # دمج الصورة مع الانعكاس
    new_height = height + reflection_h
    result = Image.new('RGBA', (width, new_height), (0, 0, 0, 0))
    result.paste(image, (0, 0), image)
    result.paste(reflection, (0, height), reflection)
    
    return result


def generate_multiple_sizes(image: Image.Image) -> dict:
    """إنشاء أحجام متعددة للصورة"""
    sizes = {}
    
    for size_name, dimensions in IMAGE_SIZES.items():
        resized = image.copy()
        
        if size_name == "social_story":
            # للستوري: نضع المنتج في المنتصف مع خلفية
            story_bg = Image.new('RGBA', dimensions, (255, 255, 255, 255))
            # تغيير حجم المنتج ليناسب
            product_size = (dimensions[0] - 100, dimensions[0] - 100)
            resized.thumbnail(product_size, Image.Resampling.LANCZOS)
            # توسيط
            x = (dimensions[0] - resized.width) // 2
            y = (dimensions[1] - resized.height) // 2
            story_bg.paste(resized, (x, y), resized if resized.mode == 'RGBA' else None)
            sizes[size_name] = story_bg
        else:
            resized.thumbnail(dimensions, Image.Resampling.LANCZOS)
            # إنشاء صورة مربعة
            square = Image.new('RGBA', dimensions, (255, 255, 255, 255))
            x = (dimensions[0] - resized.width) // 2
            y = (dimensions[1] - resized.height) // 2
            square.paste(resized, (x, y), resized if resized.mode == 'RGBA' else None)
            sizes[size_name] = square
    
    return sizes


def compress_to_webp(image: Image.Image, quality: int = 85) -> bytes:
    """ضغط ذكي بصيغة WebP"""
    if image.mode == 'RGBA':
        # WebP يدعم الشفافية
        output = io.BytesIO()
        image.save(output, format='WEBP', quality=quality, method=6)
    else:
        output = io.BytesIO()
        image.convert('RGB').save(output, format='WEBP', quality=quality, method=6)
    
    output.seek(0)
    return output.getvalue()


def image_to_base64(image: Image.Image, format: str = 'PNG', quality: int = 95) -> str:
    """تحويل الصورة إلى base64"""
    output = io.BytesIO()
    
    if format.upper() == 'WEBP':
        if image.mode == 'RGBA':
            image.save(output, format='WEBP', quality=quality)
        else:
            image.convert('RGB').save(output, format='WEBP', quality=quality)
        mime = 'image/webp'
    elif format.upper() == 'JPEG':
        image.convert('RGB').save(output, format='JPEG', quality=quality)
        mime = 'image/jpeg'
    else:
        image.save(output, format='PNG')
        mime = 'image/png'
    
    output.seek(0)
    return f"data:{mime};base64,{base64.b64encode(output.getvalue()).decode('utf-8')}"

def add_shadow_to_image(image: Image.Image, offset: tuple = (5, 5), blur: int = 10, opacity: float = 0.3) -> Image.Image:
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
        shadow = add_shadow_to_image(output_image, offset=(8, 8), blur=15, opacity=0.2)
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
    add_shadow: bool = Form(default=True),
    use_premium: bool = Form(default=True)
):
    """
    معالجة صورة المنتج - Remove.bg للجودة الاحترافية
    
    - **file**: ملف الصورة
    - **background**: نوع الخلفية
    - **add_shadow**: إضافة ظل خفيف (true/false)
    - **use_premium**: استخدام Remove.bg API (true) أو المعالجة المحلية (false)
    """
    
    # التحقق من نوع الملف
    content_type = file.content_type or ""
    if not content_type.startswith('image/'):
        filename = file.filename or ""
        if not filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')):
            raise HTTPException(status_code=400, detail="الملف يجب أن يكون صورة")
    
    # قراءة الصورة
    image_data = await file.read()
    
    if len(image_data) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(status_code=400, detail="حجم الصورة يجب أن يكون أقل من 10 ميجابايت")
    
    processing_method = "local"
    
    try:
        # محاولة استخدام Remove.bg أولاً
        if use_premium and REMOVE_BG_API_KEY:
            try:
                no_bg_image_data = await remove_background_removebg(image_data)
                processing_method = "removebg"
            except Exception as api_error:
                print(f"Remove.bg API failed, falling back to local: {api_error}")
                no_bg_image_data = remove_background_local(image_data)
                processing_method = "local_fallback"
        else:
            no_bg_image_data = remove_background_local(image_data)
        
        # فتح الصورة بدون خلفية
        no_bg_image = Image.open(io.BytesIO(no_bg_image_data))
        
        # تحويل إلى RGBA
        if no_bg_image.mode != 'RGBA':
            no_bg_image = no_bg_image.convert('RGBA')
        
        # تحسين الصورة
        no_bg_image = enhance_image(no_bg_image)
        
        # تغيير الحجم مع الحفاظ على النسبة
        output_size = (1200, 1200)
        no_bg_image.thumbnail(output_size, Image.Resampling.LANCZOS)
        
        # إنشاء الخلفية الجديدة
        bg_width, bg_height = output_size
        final_background = create_gradient_background(bg_width, bg_height, background)
        final_background = final_background.convert('RGBA')
        
        # حساب موضع المنتج في المنتصف
        img_width, img_height = no_bg_image.size
        x = (bg_width - img_width) // 2
        y = (bg_height - img_height) // 2
        
        # إضافة الظل إذا مطلوب
        if add_shadow and background != "premium_dark":
            shadow_layer = add_shadow_to_image(no_bg_image, offset=(8, 8), blur=15, opacity=0.2)
            final_background.paste(shadow_layer, (x, y), shadow_layer)
        
        # لصق المنتج فوق الخلفية
        final_background.paste(no_bg_image, (x, y), no_bg_image)
        
        # تحويل إلى RGB للحفظ كـ JPEG
        final_image = final_background.convert('RGB')
        
        # حفظ الصورة بجودة عالية
        output_buffer = io.BytesIO()
        final_image.save(output_buffer, format='JPEG', quality=95)
        output_buffer.seek(0)
        
        # تحويل إلى base64
        image_base64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
        
        return {
            "success": True,
            "image": f"data:image/jpeg;base64,{image_base64}",
            "background_used": background,
            "processing_method": processing_method,
            "message": "تمت معالجة الصورة بنجاح" + (" (جودة احترافية)" if processing_method == "removebg" else "")
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


# ============== PhotoRoom API Endpoints ==============

@router.get("/shadows")
async def get_available_shadows():
    """
    الحصول على أنواع الظلال المتاحة
    """
    return {
        "shadows": get_available_shadow_types(),
        "default": "soft"
    }


@router.post("/process-photoroom")
async def process_image_with_photoroom(
    file: UploadFile = File(...),
    shadow_type: str = Form(default="soft"),
    background: str = Form(default="white"),
    use_sandbox: bool = Form(default=False)
):
    """
    معالجة صورة المنتج باستخدام PhotoRoom API - جودة احترافية عالية
    
    - **file**: ملف الصورة
    - **shadow_type**: نوع الظل (none, soft, hard, floating)
    - **background**: لون الخلفية
    - **use_sandbox**: استخدام بيئة الاختبار
    """
    
    # التحقق من نوع الملف
    content_type = file.content_type or ""
    if not content_type.startswith('image/'):
        filename = file.filename or ""
        if not filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')):
            raise HTTPException(status_code=400, detail="الملف يجب أن يكون صورة")
    
    image_data = await file.read()
    
    if len(image_data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="حجم الصورة يجب أن يكون أقل من 10 ميجابايت")
    
    try:
        # 1. إزالة الخلفية باستخدام PhotoRoom مع الظل
        photoroom_result = await remove_background_photoroom(
            image_data=image_data,
            shadow_type=shadow_type,
            output_size="full",
            use_sandbox=use_sandbox
        )
        
        if not photoroom_result.get("success"):
            raise Exception("فشل في معالجة الصورة")
        
        # 2. إذا كان هناك لون خلفية محدد (غير شفاف)، نضيف الخلفية
        if background != "transparent":
            # فتح الصورة المعالجة
            processed_bytes = photoroom_result.get("image_bytes")
            if processed_bytes:
                processed_image = Image.open(io.BytesIO(processed_bytes))
                if processed_image.mode != 'RGBA':
                    processed_image = processed_image.convert('RGBA')
                
                # إنشاء الخلفية
                bg_width, bg_height = processed_image.size
                bg_image = create_gradient_background(bg_width, bg_height, background)
                bg_image = bg_image.convert('RGBA')
                
                # دمج الصورة مع الخلفية
                bg_image.paste(processed_image, (0, 0), processed_image)
                
                # تحويل للـ base64
                output_buffer = io.BytesIO()
                bg_image.convert('RGB').save(output_buffer, format='PNG', quality=95)
                output_buffer.seek(0)
                image_base64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
                
                return {
                    "success": True,
                    "image": f"data:image/png;base64,{image_base64}",
                    "shadow_type": shadow_type,
                    "background_used": background,
                    "processing_method": "photoroom",
                    "message": "تمت معالجة الصورة بنجاح - جودة PhotoRoom الاحترافية"
                }
        
        # إرجاع الصورة بدون خلفية (شفافة)
        return {
            "success": True,
            "image": photoroom_result.get("image"),
            "shadow_type": shadow_type,
            "background_used": "transparent",
            "processing_method": "photoroom",
            "message": "تمت معالجة الصورة بنجاح - جودة PhotoRoom الاحترافية"
        }
        
    except Exception as e:
        # محاولة استخدام Remove.bg كـ fallback
        try:
            if REMOVE_BG_API_KEY:
                no_bg_data = await remove_background_removebg(image_data)
                processing_method = "removebg_fallback"
            else:
                no_bg_data = remove_background_local(image_data)
                processing_method = "local_fallback"
            
            # معالجة الصورة بالطريقة القديمة
            product_image = Image.open(io.BytesIO(no_bg_data))
            if product_image.mode != 'RGBA':
                product_image = product_image.convert('RGBA')
            
            # إضافة الخلفية
            bg_width, bg_height = product_image.size
            bg_image = create_gradient_background(bg_width, bg_height, background)
            bg_image = bg_image.convert('RGBA')
            
            # إضافة ظل بسيط
            if shadow_type != "none" and background != "premium_dark":
                shadow = add_shadow_to_image(product_image, offset=(8, 8), blur=15, opacity=0.2)
                bg_image.paste(shadow, (0, 0), shadow)
            
            bg_image.paste(product_image, (0, 0), product_image)
            
            # تحويل للـ base64
            output_buffer = io.BytesIO()
            bg_image.convert('RGB').save(output_buffer, format='PNG', quality=95)
            output_buffer.seek(0)
            image_base64 = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
            
            return {
                "success": True,
                "image": f"data:image/png;base64,{image_base64}",
                "shadow_type": shadow_type,
                "background_used": background,
                "processing_method": processing_method,
                "message": f"تمت معالجة الصورة (PhotoRoom غير متاح: {str(e)})"
            }
            
        except Exception as fallback_error:
            raise HTTPException(
                status_code=500, 
                detail=f"فشل معالجة الصورة: {str(e)}. Fallback error: {str(fallback_error)}"
            )


@router.get("/status")
async def get_image_processing_status():
    """
    الحصول على حالة خدمة معالجة الصور
    """
    has_photoroom = bool(PHOTOROOM_API_KEY)
    has_removebg = bool(REMOVE_BG_API_KEY)
    
    # الخدمة الرئيسية هي PhotoRoom
    primary_service = None
    if has_photoroom:
        primary_service = "PhotoRoom"
    elif has_removebg:
        primary_service = "Remove.bg"
    
    return {
        "photoroom_available": has_photoroom,
        "removebg_available": has_removebg,
        "primary_service": primary_service,
        "fallback_available": True,
        "fallback_service": "rembg (local)",
        "shadow_types": get_available_shadow_types()
    }



# ============== نظام المعالجة الاحترافية (مثل Trendyol) ==============

class ProcessingOptions(BaseModel):
    """خيارات المعالجة الاحترافية"""
    auto_color_correct: bool = True
    sharpen: bool = True
    smart_center: bool = True
    add_shadow: bool = True
    add_reflection: bool = False
    background: str = "white"
    generate_sizes: bool = False
    output_format: str = "jpeg"  # jpeg, png, webp


@router.post("/process-pro")
async def process_image_professional(
    file: UploadFile = File(...),
    auto_color_correct: bool = Form(default=True),
    sharpen: bool = Form(default=True),
    smart_center: bool = Form(default=True),
    add_shadow: bool = Form(default=True),
    add_reflection: bool = Form(default=False),
    background: str = Form(default="white"),
    generate_sizes: bool = Form(default=False),
    output_format: str = Form(default="jpeg")
):
    """
    معالجة صورة المنتج بشكل احترافي - مثل Trendyol
    
    خط المعالجة الكامل:
    1. تحليل جودة الصورة
    2. إزالة الخلفية (Remove.bg / Local)
    3. تصحيح الألوان التلقائي
    4. تحسين الحدة
    5. توسيط ذكي
    6. إضافة خلفية احترافية
    7. إضافة ظل
    8. إضافة انعكاس (اختياري)
    9. إنشاء أحجام متعددة (اختياري)
    """
    
    # التحقق من نوع الملف
    content_type = file.content_type or ""
    if not content_type.startswith('image/'):
        # محاولة التعرف على نوع الملف من الاسم
        filename = file.filename or ""
        if not filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')):
            raise HTTPException(status_code=400, detail="الملف يجب أن يكون صورة")
    
    image_data = await file.read()
    
    if len(image_data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="حجم الصورة يجب أن يكون أقل من 10 ميجابايت")
    
    try:
        # فتح الصورة الأصلية
        original_image = Image.open(io.BytesIO(image_data))
        
        # 1. تحليل جودة الصورة
        quality_report = analyze_image_quality(original_image)
        
        # 2. إزالة الخلفية
        processing_method = "local"
        try:
            if REMOVE_BG_API_KEY:
                no_bg_data = await remove_background_removebg(image_data)
                processing_method = "removebg"
            else:
                no_bg_data = remove_background_local(image_data)
        except Exception as e:
            print(f"Remove.bg failed, using local: {e}")
            no_bg_data = remove_background_local(image_data)
            processing_method = "local_fallback"
        
        # فتح الصورة بدون خلفية
        product_image = Image.open(io.BytesIO(no_bg_data))
        if product_image.mode != 'RGBA':
            product_image = product_image.convert('RGBA')
        
        # 3. تصحيح الألوان التلقائي
        if auto_color_correct:
            product_image = auto_color_correction(product_image)
        
        # 4. تحسين الحدة
        if sharpen:
            product_image = sharpen_image(product_image, strength=1.3)
        
        # 5. توسيط ذكي
        if smart_center:
            product_image = smart_center_crop(product_image, target_size=(1200, 1200), padding_percent=0.08)
        
        # 6. إضافة الخلفية
        bg_image = create_gradient_background(1200, 1200, background)
        bg_image = bg_image.convert('RGBA')
        
        # حساب موضع المنتج
        img_w, img_h = product_image.size
        x = (1200 - img_w) // 2
        y = (1200 - img_h) // 2
        
        # 7. إضافة الظل
        if add_shadow and background != "premium_dark":
            shadow = add_shadow_to_image(product_image, offset=(10, 10), blur=20, opacity=0.25)
            bg_image.paste(shadow, (x, y), shadow)
        
        # لصق المنتج
        bg_image.paste(product_image, (x, y), product_image)
        
        # 8. إضافة الانعكاس (اختياري)
        final_image = bg_image
        if add_reflection:
            # نحتاج لصورة أطول للانعكاس
            reflection_img = add_reflection(product_image, reflection_height=0.25, opacity=0.2)
            # إنشاء خلفية أكبر
            extended_bg = create_gradient_background(1200, 1500, background)
            extended_bg = extended_bg.convert('RGBA')
            # لصق المنتج مع الانعكاس
            ref_w, ref_h = reflection_img.size
            ref_x = (1200 - ref_w) // 2
            ref_y = 100  # مساحة علوية
            if add_shadow and background != "premium_dark":
                shadow = add_shadow_to_image(product_image, offset=(10, 10), blur=20, opacity=0.25)
                extended_bg.paste(shadow, (ref_x, ref_y), shadow)
            extended_bg.paste(reflection_img, (ref_x, ref_y), reflection_img)
            final_image = extended_bg
        
        # تحويل للـ RGB
        if final_image.mode == 'RGBA':
            rgb_final = Image.new('RGB', final_image.size, (255, 255, 255))
            rgb_final.paste(final_image, mask=final_image.split()[3])
            final_image = rgb_final
        
        # 9. إنشاء أحجام متعددة (اختياري)
        sizes_data = {}
        if generate_sizes:
            # نستخدم الصورة بدون خلفية للأحجام
            sizes = generate_multiple_sizes(product_image)
            for size_name, size_img in sizes.items():
                # تحويل لـ RGB
                if size_img.mode == 'RGBA':
                    rgb_size = Image.new('RGB', size_img.size, (255, 255, 255))
                    rgb_size.paste(size_img, mask=size_img.split()[3])
                    size_img = rgb_size
                sizes_data[size_name] = image_to_base64(size_img, format='JPEG', quality=85)
        
        # تحديد صيغة الإخراج
        if output_format.lower() == 'webp':
            main_image = image_to_base64(final_image, format='WEBP', quality=90)
        elif output_format.lower() == 'png':
            main_image = image_to_base64(final_image, format='PNG')
        else:
            main_image = image_to_base64(final_image, format='JPEG', quality=95)
        
        return {
            "success": True,
            "image": main_image,
            "quality_report": quality_report,
            "processing": {
                "background_removal": processing_method,
                "auto_color_correct": auto_color_correct,
                "sharpened": sharpen,
                "smart_centered": smart_center,
                "shadow_added": add_shadow,
                "reflection_added": add_reflection,
                "background_type": background,
                "output_format": output_format
            },
            "sizes": sizes_data if generate_sizes else None,
            "message": "تمت المعالجة الاحترافية بنجاح ✨"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل معالجة الصورة: {str(e)}")


@router.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """
    تحليل جودة الصورة قبل المعالجة
    """
    content_type = file.content_type or ""
    if not content_type.startswith('image/'):
        filename = file.filename or ""
        if not filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')):
            raise HTTPException(status_code=400, detail="الملف يجب أن يكون صورة")
    
    image_data = await file.read()
    
    try:
        image = Image.open(io.BytesIO(image_data))
        report = analyze_image_quality(image)
        
        return {
            "success": True,
            "analysis": report,
            "recommendations": {
                "should_process": report["quality_score"] >= 50,
                "auto_fixes_available": len(report["suggestions"]) > 0,
                "estimated_improvement": f"+{min(30, 100 - report['quality_score'])}% جودة"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل تحليل الصورة: {str(e)}")


@router.get("/processing-features")
async def get_processing_features():
    """
    الحصول على قائمة ميزات المعالجة المتاحة
    """
    return {
        "features": [
            {
                "id": "auto_color_correct",
                "name": "تصحيح الألوان التلقائي",
                "name_en": "Auto Color Correction",
                "description": "توازن الأبيض والتشبع والتباين",
                "default": True,
                "icon": "🎨"
            },
            {
                "id": "sharpen",
                "name": "تحسين الحدة",
                "name_en": "Sharpening",
                "description": "زيادة وضوح التفاصيل",
                "default": True,
                "icon": "🔍"
            },
            {
                "id": "smart_center",
                "name": "توسيط ذكي",
                "name_en": "Smart Center",
                "description": "المنتج في المنتصف مع مساحة متساوية",
                "default": True,
                "icon": "📐"
            },
            {
                "id": "add_shadow",
                "name": "ظل واقعي",
                "name_en": "Realistic Shadow",
                "description": "إضافة ظل خفيف للمنتج",
                "default": True,
                "icon": "🌑"
            },
            {
                "id": "add_reflection",
                "name": "انعكاس احترافي",
                "name_en": "Professional Reflection",
                "description": "انعكاس المنتج على السطح",
                "default": False,
                "icon": "🪞"
            },
            {
                "id": "generate_sizes",
                "name": "أحجام متعددة",
                "name_en": "Multiple Sizes",
                "description": "إنشاء نسخ بأحجام مختلفة",
                "default": False,
                "icon": "📱"
            }
        ],
        "output_formats": [
            {"id": "jpeg", "name": "JPEG", "description": "الأفضل للويب", "default": True},
            {"id": "webp", "name": "WebP", "description": "أصغر حجماً 30%", "default": False},
            {"id": "png", "name": "PNG", "description": "أعلى جودة", "default": False}
        ],
        "available_sizes": IMAGE_SIZES,
        "quality_standards": QUALITY_STANDARDS
    }



# ============== معالجة صور الطعام (بدون إزالة الخلفية) ==============

def enhance_food_image(image: Image.Image) -> Image.Image:
    """تحسين صور الطعام - تجعلها شهية وجذابة"""
    if image.mode == 'RGBA':
        # تحويل لـ RGB
        rgb_image = Image.new('RGB', image.size, (255, 255, 255))
        rgb_image.paste(image, mask=image.split()[3])
        image = rgb_image
    elif image.mode != 'RGB':
        image = image.convert('RGB')
    
    # 1. زيادة التشبع - يجعل الألوان أكثر حيوية (الطعام يبدو طازج)
    enhancer = ImageEnhance.Color(image)
    image = enhancer.enhance(1.25)  # زيادة 25%
    
    # 2. تحسين التباين - يبرز التفاصيل
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.1)  # زيادة 10%
    
    # 3. زيادة السطوع قليلاً - إضاءة أفضل
    enhancer = ImageEnhance.Brightness(image)
    image = enhancer.enhance(1.05)  # زيادة 5%
    
    # 4. تحسين الحدة - تفاصيل واضحة
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(1.2)  # زيادة 20%
    
    # 5. إضافة دفء للصورة (يجعل الطعام يبدو شهي)
    # نزيد قليلاً من الأحمر والأصفر
    r, g, b = image.split()
    r = r.point(lambda x: min(255, int(x * 1.02)))  # زيادة طفيفة في الأحمر
    image = Image.merge('RGB', (r, g, b))
    
    return image


@router.post("/process-food")
async def process_food_image(
    file: UploadFile = File(...),
    enhance_colors: bool = Form(default=True),
    auto_crop: bool = Form(default=False),
    output_format: str = Form(default="jpeg")
):
    """
    معالجة صور الطعام - تحسين بدون إزالة الخلفية
    
    الطعام يبدو أفضل مع خلفيته الطبيعية (طاولة، صحن، إلخ)
    هذه المعالجة:
    - تزيد تشبع الألوان (الطعام يبدو طازج)
    - تحسن الإضاءة والتباين
    - تضيف دفء للصورة (شهية أكثر)
    - مجانية 100% (لا تستخدم Remove.bg)
    """
    
    content_type = file.content_type or ""
    if not content_type.startswith('image/'):
        filename = file.filename or ""
        if not filename.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')):
            raise HTTPException(status_code=400, detail="الملف يجب أن يكون صورة")
    
    image_data = await file.read()
    
    if len(image_data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="حجم الصورة يجب أن يكون أقل من 10 ميجابايت")
    
    try:
        # فتح الصورة
        image = Image.open(io.BytesIO(image_data))
        
        # تحليل الجودة
        quality_report = analyze_image_quality(image)
        
        # تطبيق تحسينات الطعام
        if enhance_colors:
            image = enhance_food_image(image)
        
        # قص تلقائي (اختياري)
        if auto_crop:
            # تغيير الحجم مع الحفاظ على النسبة
            image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        
        # تحويل للصيغة المطلوبة
        if output_format.lower() == 'webp':
            output_image = image_to_base64(image, format='WEBP', quality=90)
        elif output_format.lower() == 'png':
            output_image = image_to_base64(image, format='PNG')
        else:
            output_image = image_to_base64(image, format='JPEG', quality=95)
        
        # تتبع الاستخدام
        try:
            from routes.settings import track_image_usage
            await track_image_usage("food")
        except Exception:
            pass
        
        return {
            "success": True,
            "image": output_image,
            "quality_report": quality_report,
            "processing": {
                "type": "food_enhancement",
                "enhanced_colors": enhance_colors,
                "auto_cropped": auto_crop,
                "background_removed": False,  # لا إزالة للخلفية
                "output_format": output_format,
                "cost": 0  # مجاني
            },
            "message": "تم تحسين صورة الطعام بنجاح 🍽️"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل معالجة الصورة: {str(e)}")


@router.get("/settings")
async def get_image_processing_settings():
    """
    جلب إعدادات معالجة الصور للبائعين
    """
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        
        MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        DB_NAME = os.environ.get("DB_NAME", "trend_syria")
        client = AsyncIOMotorClient(MONGO_URL)
        database = client[DB_NAME]
        
        settings = await database.image_settings.find_one({"id": "main"}, {"_id": 0})
        
        if not settings:
            return {
                "max_images_per_product": 3,
                "enable_pro_processing": True,
                "enable_food_enhancement": True
            }
        
        return {
            "max_images_per_product": settings.get("max_images_per_product", 3),
            "enable_pro_processing": settings.get("enable_pro_processing", True),
            "enable_food_enhancement": settings.get("enable_food_enhancement", True)
        }
    except Exception:
        return {
            "max_images_per_product": 3,
            "enable_pro_processing": True,
            "enable_food_enhancement": True
        }
