# /app/backend/routes/image_search.py
# البحث عن المنتجات بالصورة باستخدام AI

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from typing import List
from datetime import datetime, timezone
import base64
import os
import uuid
import logging

from dotenv import load_dotenv
load_dotenv()

from core.database import db, get_current_user

router = APIRouter(prefix="/image-search", tags=["Image Search"])
logger = logging.getLogger(__name__)

# ============== نموذج البيانات ==============

class ImageSearchRequest(BaseModel):
    image_base64: str  # الصورة بتنسيق base64
    limit: int = 10

class ImageSearchResult(BaseModel):
    product_id: str
    name: str
    price: float
    image: str
    category: str
    similarity_reason: str

# ============== تحليل الصورة بالذكاء الاصطناعي ==============

async def analyze_image_with_ai(image_base64: str) -> dict:
    """تحليل الصورة واستخراج الخصائص"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
        
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="مفتاح API غير متوفر")
        
        # إنشاء جلسة محادثة جديدة
        chat = LlmChat(
            api_key=api_key,
            session_id=f"image-search-{uuid.uuid4()}",
            system_message="""أنت خبير في تحليل صور المنتجات. مهمتك هي تحليل الصورة واستخراج المعلومات التالية بتنسيق JSON فقط:
{
    "category": "الفئة (ملابس، إلكترونيات، أحذية، إكسسوارات، طعام، أثاث، أخرى)",
    "subcategory": "الفئة الفرعية (مثل: قميص، فستان، هاتف، حقيبة...)",
    "colors": ["اللون الرئيسي", "الألوان الثانوية"],
    "style": "النمط (رسمي، كاجوال، رياضي، كلاسيكي...)",
    "material": "المادة إن أمكن تحديدها",
    "gender": "الجنس المستهدف (رجال، نساء، أطفال، للجميع)",
    "keywords": ["كلمات مفتاحية للبحث"],
    "description": "وصف مختصر بالعربية"
}
أجب بـ JSON فقط بدون أي نص إضافي."""
        ).with_model("openai", "gpt-5.2")
        
        # إنشاء محتوى الصورة
        image_content = ImageContent(image_base64=image_base64)
        
        # إرسال الرسالة مع الصورة
        user_message = UserMessage(
            text="حلل هذه الصورة واستخرج معلومات المنتج",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # تحويل الرد إلى JSON
        import json
        # تنظيف الرد من علامات markdown
        clean_response = response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        
        return json.loads(clean_response.strip())
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {e}, response: {response}")
        # إرجاع قيم افتراضية
        return {
            "category": "أخرى",
            "subcategory": "",
            "colors": [],
            "style": "",
            "material": "",
            "gender": "للجميع",
            "keywords": [],
            "description": "لم يتم التعرف على المنتج"
        }
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في تحليل الصورة: {str(e)}")

# ============== البحث عن منتجات مشابهة ==============

async def find_similar_products(analysis: dict, limit: int = 10) -> List[dict]:
    """البحث عن منتجات مشابهة بناءً على التحليل"""
    
    # بناء استعلام البحث
    search_conditions = []
    
    # البحث في الفئة
    category = analysis.get("category", "").strip()
    if category and category != "أخرى":
        search_conditions.append({
            "$or": [
                {"category": {"$regex": category, "$options": "i"}},
                {"category_name": {"$regex": category, "$options": "i"}}
            ]
        })
    
    # البحث في الكلمات المفتاحية
    keywords = analysis.get("keywords", [])
    if keywords:
        keyword_conditions = []
        for keyword in keywords[:5]:  # أول 5 كلمات
            keyword_conditions.append({"name": {"$regex": keyword, "$options": "i"}})
            keyword_conditions.append({"description": {"$regex": keyword, "$options": "i"}})
        if keyword_conditions:
            search_conditions.append({"$or": keyword_conditions})
    
    # البحث في الألوان
    colors = analysis.get("colors", [])
    if colors:
        color_conditions = []
        for color in colors:
            color_conditions.append({"colors": {"$regex": color, "$options": "i"}})
            color_conditions.append({"name": {"$regex": color, "$options": "i"}})
        if color_conditions:
            search_conditions.append({"$or": color_conditions})
    
    # البحث في الجنس
    gender = analysis.get("gender", "للجميع")
    if gender and gender != "للجميع":
        gender_map = {
            "رجال": ["رجالي", "رجال", "men", "male"],
            "نساء": ["نسائي", "نساء", "women", "female"],
            "أطفال": ["أطفال", "kids", "children"]
        }
        if gender in gender_map:
            gender_conditions = [{"gender": {"$regex": g, "$options": "i"}} for g in gender_map[gender]]
            search_conditions.append({"$or": gender_conditions})
    
    # بناء الاستعلام النهائي
    query = {"status": "active"}
    if search_conditions:
        query["$and"] = search_conditions
    
    # البحث في قاعدة البيانات
    products = await db.products.find(
        query,
        {"_id": 0, "id": 1, "name": 1, "price": 1, "images": 1, "category_name": 1, "colors": 1, "description": 1}
    ).limit(limit * 2).to_list(limit * 2)
    
    # إذا لم نجد نتائج كافية، نبحث بشكل أوسع
    if len(products) < limit:
        # بحث في الكلمات المفتاحية فقط
        fallback_query = {"status": "active"}
        if keywords:
            fallback_query["$or"] = [
                {"name": {"$regex": "|".join(keywords[:3]), "$options": "i"}},
                {"description": {"$regex": "|".join(keywords[:3]), "$options": "i"}}
            ]
            
            additional = await db.products.find(
                fallback_query,
                {"_id": 0, "id": 1, "name": 1, "price": 1, "images": 1, "category_name": 1, "colors": 1, "description": 1}
            ).limit(limit).to_list(limit)
            
            # إضافة المنتجات الجديدة بدون تكرار
            existing_ids = {p["id"] for p in products}
            for p in additional:
                if p["id"] not in existing_ids:
                    products.append(p)
    
    # تنسيق النتائج
    results = []
    
    for product in products[:limit]:
        # تحديد سبب التشابه
        similarity_reasons = []
        if any(c.lower() in (product.get("name", "") + product.get("description", "")).lower() for c in colors):
            similarity_reasons.append("لون مشابه")
        if category.lower() in (product.get("category_name", "") or "").lower():
            similarity_reasons.append("نفس الفئة")
        if any(k.lower() in (product.get("name", "")).lower() for k in keywords):
            similarity_reasons.append("منتج مشابه")
        
        results.append({
            "product_id": product["id"],
            "name": product["name"],
            "price": product.get("price", 0),
            "image": product.get("images", [""])[0] if product.get("images") else "",
            "category": product.get("category_name", ""),
            "similarity_reason": " • ".join(similarity_reasons) if similarity_reasons else "مشابه للبحث"
        })
    
    return results

# ============== نقاط النهاية ==============

@router.post("/search")
async def search_by_image(data: ImageSearchRequest):
    """البحث عن منتجات باستخدام صورة"""
    
    try:
        # التحقق من صحة الصورة
        if not data.image_base64:
            raise HTTPException(status_code=400, detail="الصورة مطلوبة")
        
        # إزالة prefix إذا وجد (data:image/jpeg;base64,)
        image_data = data.image_base64
        if "," in image_data:
            image_data = image_data.split(",")[1]
        
        # التحقق من أن الصورة صالحة
        try:
            decoded = base64.b64decode(image_data)
            if len(decoded) < 100:
                raise HTTPException(status_code=400, detail="الصورة غير صالحة")
        except Exception:
            raise HTTPException(status_code=400, detail="تنسيق الصورة غير صحيح")
        
        # تحليل الصورة بالذكاء الاصطناعي
        analysis = await analyze_image_with_ai(image_data)
        
        # البحث عن منتجات مشابهة
        products = await find_similar_products(analysis, data.limit)
        
        return {
            "analysis": analysis,
            "products": products,
            "total": len(products)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image search error: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في البحث: {str(e)}")

@router.post("/upload")
async def search_by_uploaded_image(
    file: UploadFile = File(...),
    limit: int = 10
):
    """البحث باستخدام ملف صورة مرفوع"""
    
    # التحقق من نوع الملف
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="نوع الملف غير مدعوم. الأنواع المدعومة: JPEG, PNG, WEBP"
        )
    
    # قراءة الملف وتحويله إلى base64
    try:
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:  # 10 MB max
            raise HTTPException(status_code=400, detail="حجم الملف كبير جداً (الحد الأقصى 10 MB)")
        
        image_base64 = base64.b64encode(contents).decode("utf-8")
        
        # تحليل الصورة
        analysis = await analyze_image_with_ai(image_base64)
        
        # البحث عن منتجات مشابهة
        products = await find_similar_products(analysis, limit)
        
        return {
            "analysis": analysis,
            "products": products,
            "total": len(products)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload search error: {e}")
        raise HTTPException(status_code=500, detail=f"خطأ في معالجة الصورة: {str(e)}")

@router.get("/recent")
async def get_recent_searches(user: dict = Depends(get_current_user), limit: int = 5):
    """جلب آخر عمليات البحث بالصورة للمستخدم"""
    
    searches = await db.image_searches.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return searches

@router.post("/save")
async def save_image_search(
    data: ImageSearchRequest,
    user: dict = Depends(get_current_user)
):
    """حفظ بحث بالصورة في سجل المستخدم"""
    
    search_record = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "image_preview": data.image_base64[:100] + "...",  # حفظ جزء من الصورة فقط
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.image_searches.insert_one(search_record)
    
    return {"message": "تم حفظ البحث", "search_id": search_record["id"]}
