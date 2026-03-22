# /app/backend/services/photoroom.py
# خدمة PhotoRoom API لإزالة الخلفية بجودة احترافية

import httpx
import os
import base64
from typing import Optional

PHOTOROOM_API_KEY = os.environ.get("PHOTOROOM_API_KEY")
PHOTOROOM_SANDBOX_KEY = os.environ.get("PHOTOROOM_SANDBOX_KEY")
PHOTOROOM_API_URL = "https://sdk.photoroom.com/v1/segment"

# أنواع الظلال المتاحة
SHADOW_TYPES = {
    "none": None,
    "soft": "ai.soft",      # ظل ناعم - منتشر وطبيعي
    "hard": "ai.hard",      # ظل حاد - واضح الحواف
    "floating": "ai.floating",  # ظل عائم - يعطي إحساس بالارتفاع
    "drop": "drop",         # ظل ساقط تقليدي
}

async def remove_background_photoroom(
    image_data: bytes,
    shadow_type: str = "soft",
    output_size: str = "full",
    use_sandbox: bool = False
) -> dict:
    """
    إزالة الخلفية باستخدام PhotoRoom API
    
    Args:
        image_data: بيانات الصورة
        shadow_type: نوع الظل (none, soft, hard, floating, drop)
        output_size: حجم الصورة (preview, medium, hd, full)
        use_sandbox: استخدام بيئة الاختبار
    
    Returns:
        dict مع الصورة المعالجة ومعلومات إضافية
    """
    api_key = PHOTOROOM_SANDBOX_KEY if use_sandbox else PHOTOROOM_API_KEY
    
    if not api_key:
        raise Exception("PhotoRoom API key not configured")
    
    # إعداد الطلب
    headers = {
        "x-api-key": api_key,
    }
    
    # إعداد البيانات
    files = {
        "image_file": ("image.png", image_data, "image/png"),
    }
    
    data = {
        "format": "png",
        "size": output_size,
        "crop": "false",  # لا نقص الصورة
    }
    
    # إضافة الظل إذا كان مطلوباً
    shadow_value = SHADOW_TYPES.get(shadow_type)
    if shadow_value:
        data["shadow.mode"] = shadow_value
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                PHOTOROOM_API_URL,
                headers=headers,
                files=files,
                data=data
            )
            
            if response.status_code == 200:
                # الصورة تُرجع مباشرة كـ bytes
                processed_image = response.content
                
                # تحويل لـ base64
                image_base64 = base64.b64encode(processed_image).decode('utf-8')
                
                return {
                    "success": True,
                    "image": f"data:image/png;base64,{image_base64}",
                    "image_bytes": processed_image,
                    "shadow_type": shadow_type,
                    "credits_used": 1
                }
            
            elif response.status_code == 402:
                raise Exception("PhotoRoom credits exhausted - الرصيد انتهى، يرجى شحن الحساب")
            
            elif response.status_code == 401:
                raise Exception("PhotoRoom API key invalid - مفتاح API غير صحيح")
            
            else:
                error_detail = ""
                try:
                    error_json = response.json()
                    error_detail = error_json.get("message", str(response.text))
                except Exception:
                    error_detail = response.text
                raise Exception(f"PhotoRoom API error ({response.status_code}): {error_detail}")
                
    except httpx.TimeoutException:
        raise Exception("PhotoRoom API timeout - انتهت مهلة الاتصال، جرب مرة أخرى")
    except Exception as e:
        raise e


async def process_with_photoroom(
    image_data: bytes,
    shadow_type: str = "soft",
    background_color: Optional[str] = None,
    use_sandbox: bool = False
) -> dict:
    """
    معالجة متكاملة مع PhotoRoom
    
    Args:
        image_data: بيانات الصورة
        shadow_type: نوع الظل
        background_color: لون الخلفية (اختياري)
        use_sandbox: استخدام بيئة الاختبار
    """
    # إزالة الخلفية مع الظل
    result = await remove_background_photoroom(
        image_data=image_data,
        shadow_type=shadow_type,
        output_size="full",
        use_sandbox=use_sandbox
    )
    
    return result


def get_available_shadow_types() -> list:
    """إرجاع أنواع الظلال المتاحة"""
    return [
        {"id": "none", "name": "بدون ظل", "name_en": "No Shadow"},
        {"id": "soft", "name": "ناعم", "name_en": "Soft"},
        {"id": "hard", "name": "حاد", "name_en": "Hard"},
        {"id": "floating", "name": "عائم", "name_en": "Floating"},
    ]
