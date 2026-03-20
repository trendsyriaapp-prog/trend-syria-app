# /app/backend/routes/food.py
# مسارات توصيل الطعام - مطاعم ومواد غذائية وخضروات

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

from core.database import db, get_current_user, get_optional_user

router = APIRouter(prefix="/food", tags=["Food Delivery"])

# ============== الأقسام الرئيسية ==============
MAIN_CATEGORIES = {
    "food": "طعام",
    "market": "ماركت"
}

# ============== أنواع المتاجر الفرعية ==============
FOOD_STORE_TYPES = {
    # قسم الطعام
    "restaurants": {"name": "وجبات سريعة", "main_category": "food", "icon": "🍔"},
    "sweets": {"name": "حلويات", "main_category": "food", "icon": "🍰"},
    "drinks": {"name": "مشروبات", "main_category": "food", "icon": "☕"},
    # قسم الماركت
    "supermarket": {"name": "سوبرماركت", "main_category": "market", "icon": "🛒"},
    "vegetables": {"name": "خضار وفواكه", "main_category": "market", "icon": "🥬"},
}

# دالة للحصول على اسم النوع
def get_store_type_name(store_type: str) -> str:
    type_info = FOOD_STORE_TYPES.get(store_type, {})
    return type_info.get("name", store_type) if isinstance(type_info, dict) else type_info

# دالة للحصول على القسم الرئيسي
def get_main_category(store_type: str) -> str:
    type_info = FOOD_STORE_TYPES.get(store_type, {})
    return type_info.get("main_category", "food") if isinstance(type_info, dict) else "food"

# أوقات التحضير الافتراضية لكل نوع
DEFAULT_PREPARATION_TIMES = {
    "restaurants": 20,  # دقيقة
    "sweets": 15,
    "drinks": 10,
    "supermarket": 10,
    "vegetables": 8,
}

# Models
class FoodStoreCreate(BaseModel):
    name: str
    store_type: str  # restaurants, sweets, drinks, supermarket, vegetables
    main_category: Optional[str] = None  # food or market (يُحسب تلقائياً)
    description: Optional[str] = None
    phone: str
    address: str
    city: str
    logo: Optional[str] = None
    cover_image: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    delivery_time: Optional[int] = 30  # بالدقائق
    minimum_order: Optional[float] = 0
    free_delivery_minimum: Optional[float] = 0  # الحد الأدنى للتوصيل المجاني
    delivery_fee: Optional[float] = 5000  # رسوم التوصيل الافتراضية
    working_hours: Optional[dict] = None

class FoodProductCreate(BaseModel):
    store_id: str
    name: str
    description: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    category: str  # فئة داخل المتجر
    images: List[str] = []
    is_available: bool = True
    preparation_time: Optional[int] = None  # للمطاعم فقط

class FoodOfferCreate(BaseModel):
    """نظام عروض اشترِ X واحصل على Y"""
    name: str
    offer_type: str  # buy_x_get_y, percentage, fixed_discount
    buy_quantity: int = 2  # اشترِ X
    get_quantity: int = 1  # احصل على Y مجاناً
    discount_percentage: Optional[float] = None  # للعروض النسبية
    discount_amount: Optional[float] = None  # للخصم الثابت
    applicable_products: List[str] = []  # قائمة IDs المنتجات المشمولة (فارغ = جميع المنتجات)
    applicable_categories: List[str] = []  # قائمة الفئات المشمولة
    min_order_amount: Optional[float] = None  # الحد الأدنى للطلب
    is_active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None

# ===============================
# المتاجر
# ===============================

@router.get("/flash-sales/active")
async def get_active_flash_sales():
    """جلب عروض الفلاش النشطة حالياً - للعملاء"""
    now = datetime.now(timezone.utc).isoformat()
    
    sales = await db.flash_sales.find({
        "is_active": True,
        "start_time": {"$lte": now},
        "end_time": {"$gte": now}
    }, {"_id": 0}).to_list(10)
    
    return sales

@router.get("/banners")
async def get_food_banners():
    """جلب البانرات الخاصة بقسم الطعام"""
    now = datetime.now(timezone.utc).isoformat()
    
    banners = await db.food_banners.find({
        "is_active": True,
        "$or": [
            {"end_date": None},
            {"end_date": {"$gte": now}}
        ]
    }, {"_id": 0}).sort("order", 1).to_list(10)
    
    return banners

@router.get("/categories")
async def get_food_categories():
    """جلب الأقسام الرئيسية والفرعية"""
    categories = []
    
    for main_key, main_name in MAIN_CATEGORIES.items():
        sub_types = []
        for type_key, type_info in FOOD_STORE_TYPES.items():
            if type_info.get("main_category") == main_key:
                # حساب عدد المتاجر في كل نوع
                count = await db.food_stores.count_documents({
                    "store_type": type_key,
                    "is_active": True,
                    "is_approved": True
                })
                sub_types.append({
                    "id": type_key,
                    "name": type_info.get("name"),
                    "icon": type_info.get("icon"),
                    "stores_count": count
                })
        
        # حساب إجمالي المتاجر في القسم الرئيسي
        total_stores = sum(t["stores_count"] for t in sub_types)
        
        categories.append({
            "id": main_key,
            "name": main_name,
            "icon": "🍔" if main_key == "food" else "🛒",
            "sub_types": sub_types,
            "total_stores": total_stores
        })
    
    return categories

@router.get("/store-types")
async def get_store_types():
    """جلب أنواع المتاجر للاختيار عند التسجيل"""
    return {
        "main_categories": MAIN_CATEGORIES,
        "store_types": FOOD_STORE_TYPES
    }

@router.get("/stores")
async def get_food_stores(
    category: Optional[str] = None,
    main_category: Optional[str] = None,  # فلتر القسم الرئيسي (food/market)
    city: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    """جلب متاجر الطعام مع حالة الفتح/الإغلاق"""
    query = {"is_active": True, "is_approved": True}
    
    # فلتر بالقسم الرئيسي (food أو market)
    if main_category and main_category != 'all':
        # جلب أنواع المتاجر التي تنتمي لهذا القسم
        matching_types = [
            type_key for type_key, type_info in FOOD_STORE_TYPES.items()
            if type_info.get("main_category") == main_category
        ]
        if matching_types:
            query["store_type"] = {"$in": matching_types}
    
    # فلتر بالنوع الفرعي
    if category and category != 'all':
        query["store_type"] = category
    
    if city:
        query["city"] = city
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    stores = await db.food_stores.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(None)
    
    # الوقت الحالي
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    # تحويل للتوقيت المحلي (سوريا +3)
    local_hour = (now.hour + 3) % 24
    local_minute = now.minute
    current_day = (now.weekday() + 1) % 7  # 0=الأحد، 1=الإثنين، ...
    day_names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    current_day_name = day_names[current_day]
    
    # إضافة اسم الفئة وحالة الفتح
    for store in stores:
        store["category_name"] = get_store_type_name(store.get("store_type", ""))
        store["main_category"] = get_main_category(store.get("store_type", ""))
        
        # التحقق من الإغلاق اليدوي أولاً
        if store.get("manual_close", False):
            store["is_open"] = False
            store["open_status"] = "مغلق مؤقتاً"
            store["manual_close_reason"] = store.get("manual_close_reason", "")
            continue
        
        # التحقق من أوقات العمل
        working_hours = store.get("working_hours", {})
        
        if not working_hours:
            # إذا لم يحدد أوقات عمل، يعتبر مفتوح دائماً
            store["is_open"] = True
            store["open_status"] = "مفتوح"
            store["next_open_time"] = None
        else:
            # التحقق من أوقات اليوم الحالي
            today_hours = working_hours.get(current_day_name, {})
            
            if not today_hours or not today_hours.get("is_open", True):
                # المتجر مغلق اليوم
                store["is_open"] = False
                store["open_status"] = "مغلق اليوم"
                store["next_open_time"] = _get_next_open_time(working_hours, current_day)
            else:
                # التحقق من الساعات
                open_hour = today_hours.get("open_hour", 8)
                open_minute = today_hours.get("open_minute", 0)
                close_hour = today_hours.get("close_hour", 22)
                close_minute = today_hours.get("close_minute", 0)
                
                current_time = local_hour * 60 + local_minute
                open_time = open_hour * 60 + open_minute
                close_time = close_hour * 60 + close_minute
                
                if open_time <= current_time < close_time:
                    store["is_open"] = True
                    store["open_status"] = "مفتوح"
                    store["closes_at"] = f"{close_hour:02d}:{close_minute:02d}"
                elif current_time < open_time:
                    store["is_open"] = False
                    store["open_status"] = f"يفتح الساعة {open_hour:02d}:{open_minute:02d}"
                    store["next_open_time"] = f"{open_hour:02d}:{open_minute:02d}"
                else:
                    store["is_open"] = False
                    store["open_status"] = "مغلق الآن"
                    store["next_open_time"] = _get_next_open_time(working_hours, current_day)
    
    # ترتيب: المتاجر المفتوحة أولاً
    stores.sort(key=lambda x: (0 if x.get("is_open", True) else 1))
    
    return stores

def _get_next_open_time(working_hours: dict, current_day: int) -> str:
    """حساب وقت الفتح التالي"""
    day_names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    
    for i in range(1, 8):
        next_day = (current_day + i) % 7
        next_day_name = day_names[next_day]
        day_hours = working_hours.get(next_day_name, {})
        
        if day_hours and day_hours.get("is_open", True):
            open_hour = day_hours.get("open_hour", 8)
            open_minute = day_hours.get("open_minute", 0)
            day_arabic = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
            if i == 1:
                return f"غداً {open_hour:02d}:{open_minute:02d}"
            else:
                return f"{day_arabic[next_day]} {open_hour:02d}:{open_minute:02d}"
    
    return None

@router.get("/stores/{store_id}")
async def get_food_store(store_id: str):
    """جلب تفاصيل متجر معين"""
    store = await db.food_stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    store["category_name"] = get_store_type_name(store.get("store_type", ""))
    store["main_category"] = get_main_category(store.get("store_type", ""))
    
    # التحقق من الإغلاق اليدوي أولاً
    if store.get("manual_close", False):
        store["is_open"] = False
        store["open_status"] = "مغلق مؤقتاً"
        store["manual_close_reason"] = store.get("manual_close_reason", "")
        store["next_open_time"] = None
    else:
        # حساب حالة الفتح/الإغلاق بناءً على ساعات العمل
        now = datetime.now(timezone.utc)
        local_hour = (now.hour + 3) % 24  # توقيت سوريا +3
        local_minute = now.minute
        current_day = (now.weekday() + 1) % 7
        day_names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
        current_day_name = day_names[current_day]
        
        working_hours = store.get("working_hours", {})
        
        if not working_hours:
            store["is_open"] = True
            store["open_status"] = "مفتوح"
            store["next_open_time"] = None
        else:
            today_hours = working_hours.get(current_day_name, {})
            
            if not today_hours or not today_hours.get("is_open", True):
                store["is_open"] = False
                store["open_status"] = "مغلق اليوم"
                store["next_open_time"] = _get_next_open_time(working_hours, current_day)
            else:
                open_hour = today_hours.get("open_hour", 8)
                open_minute = today_hours.get("open_minute", 0)
                close_hour = today_hours.get("close_hour", 22)
                close_minute = today_hours.get("close_minute", 0)
                
                current_time = local_hour * 60 + local_minute
                open_time = open_hour * 60 + open_minute
                close_time = close_hour * 60 + close_minute
                
                if open_time <= current_time < close_time:
                    store["is_open"] = True
                    store["open_status"] = "مفتوح"
                    store["closes_at"] = f"{close_hour:02d}:{close_minute:02d}"
                elif current_time < open_time:
                    store["is_open"] = False
                    store["open_status"] = f"يفتح الساعة {open_hour:02d}:{open_minute:02d}"
                    store["next_open_time"] = f"{open_hour:02d}:{open_minute:02d}"
                else:
                    store["is_open"] = False
                    store["open_status"] = "مغلق الآن"
                    store["next_open_time"] = _get_next_open_time(working_hours, current_day)
    
    # جلب منتجات المتجر
    products = await db.food_products.find(
        {"store_id": store_id, "is_available": True}, 
        {"_id": 0}
    ).to_list(None)
    store["products"] = products
    
    return store

@router.post("/stores")
async def create_food_store(store: FoodStoreCreate, user: dict = Depends(get_current_user)):
    """إنشاء متجر طعام جديد (للبائعين)"""
    if user["user_type"] not in ["seller", "food_seller", "admin"]:
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    if store.store_type not in FOOD_STORE_TYPES:
        raise HTTPException(status_code=400, detail="نوع المتجر غير صالح")
    
    # حساب القسم الرئيسي تلقائياً
    main_category = get_main_category(store.store_type)
    
    # التحقق من عدم وجود متجر سابق
    existing = await db.food_stores.find_one({
        "$or": [{"owner_id": user["id"]}, {"seller_id": user["id"]}]
    })
    if existing:
        raise HTTPException(status_code=400, detail="لديك متجر طعام بالفعل")
    
    store_id = str(uuid.uuid4())
    store_doc = {
        "id": store_id,
        "owner_id": user["id"],
        "seller_id": user["id"],
        "owner_name": user["name"],
        "owner_phone": user.get("phone", ""),
        "name": store.name,
        "store_type": store.store_type,
        "main_category": main_category,
        "description": store.description,
        "phone": store.phone,
        "address": store.address,
        "city": store.city,
        "logo": store.logo,
        "cover_image": store.cover_image,
        "delivery_time": store.delivery_time,
        "minimum_order": store.minimum_order,
        "free_delivery_minimum": store.free_delivery_minimum,
        "delivery_fee": store.delivery_fee,
        "working_hours": store.working_hours,
        "rating": 0,
        "reviews_count": 0,
        "orders_count": 0,
        "is_active": True,
        "is_approved": False,  # يحتاج موافقة الإدارة
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.food_stores.insert_one(store_doc)
    return {"id": store_id, "message": "تم إنشاء المتجر بنجاح، في انتظار موافقة الإدارة"}

# ===============================
# فتح/إغلاق المتجر يدوياً
# ===============================

class StoreToggleRequest(BaseModel):
    is_closed: bool
    close_reason: Optional[str] = None

@router.post("/stores/{store_id}/toggle-status")
async def toggle_store_status(
    store_id: str, 
    request: StoreToggleRequest,
    user: dict = Depends(get_current_user)
):
    """فتح أو إغلاق المتجر يدوياً"""
    # التحقق من ملكية المتجر
    store = await db.food_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    if store["owner_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك بتعديل هذا المتجر")
    
    # تحديث حالة الإغلاق اليدوي
    update_data = {
        "manual_close": request.is_closed,
        "manual_close_reason": request.close_reason if request.is_closed else None,
        "manual_close_at": datetime.now(timezone.utc).isoformat() if request.is_closed else None
    }
    
    await db.food_stores.update_one(
        {"id": store_id},
        {"$set": update_data}
    )
    
    status_msg = "تم إغلاق المتجر مؤقتاً" if request.is_closed else "تم فتح المتجر"
    return {
        "success": True,
        "message": status_msg,
        "is_closed": request.is_closed
    }

@router.get("/stores/{store_id}/status")
async def get_store_status(store_id: str):
    """جلب حالة المتجر (مفتوح/مغلق)"""
    store = await db.food_stores.find_one({"id": store_id}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    # التحقق من الإغلاق اليدوي أولاً
    if store.get("manual_close", False):
        return {
            "is_open": False,
            "status": "مغلق مؤقتاً",
            "reason": store.get("manual_close_reason", ""),
            "manual_close": True
        }
    
    # ثم التحقق من ساعات العمل
    now = datetime.now(timezone.utc)
    local_hour = (now.hour + 3) % 24
    local_minute = now.minute
    current_day = (now.weekday() + 1) % 7
    day_names = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    current_day_name = day_names[current_day]
    
    working_hours = store.get("working_hours", {})
    
    if not working_hours:
        return {"is_open": True, "status": "مفتوح", "manual_close": False}
    
    today_hours = working_hours.get(current_day_name, {})
    
    if not today_hours or not today_hours.get("is_open", True):
        return {"is_open": False, "status": "مغلق اليوم", "manual_close": False}
    
    open_hour = today_hours.get("open_hour", 8)
    open_minute = today_hours.get("open_minute", 0)
    close_hour = today_hours.get("close_hour", 22)
    close_minute = today_hours.get("close_minute", 0)
    
    current_time = local_hour * 60 + local_minute
    open_time = open_hour * 60 + open_minute
    close_time = close_hour * 60 + close_minute
    
    if open_time <= current_time < close_time:
        return {"is_open": True, "status": "مفتوح", "manual_close": False}
    else:
        return {"is_open": False, "status": "مغلق حالياً", "manual_close": False}

# ===============================
# المنتجات
# ===============================

@router.get("/products")
async def get_food_products(
    category: Optional[str] = None,
    main_category: Optional[str] = None,  # فلتر القسم الرئيسي (food/market)
    store_id: Optional[str] = None,
    city: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 20
):
    """جلب منتجات الطعام"""
    # أولاً نجلب المتاجر المعتمدة من الفئة المطلوبة والمدينة
    store_query = {"is_active": True, "is_approved": True}
    
    # فلتر بالقسم الرئيسي (food أو market)
    if main_category and main_category != 'all':
        # جلب أنواع المتاجر التي تنتمي لهذا القسم
        matching_types = [
            type_key for type_key, type_info in FOOD_STORE_TYPES.items()
            if type_info.get("main_category") == main_category
        ]
        if matching_types:
            store_query["store_type"] = {"$in": matching_types}
    
    # فلتر بالنوع الفرعي
    if category and category != 'all':
        store_query["store_type"] = category
    
    if city:
        store_query["city"] = city
    
    approved_stores = await db.food_stores.find(store_query, {"id": 1}).to_list(None)
    approved_store_ids = [s["id"] for s in approved_stores]
    
    if not approved_store_ids:
        return []
    
    # ثم نجلب المنتجات من هذه المتاجر
    query = {"store_id": {"$in": approved_store_ids}, "is_available": True}
    
    if store_id:
        query["store_id"] = store_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.food_products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(None)
    
    # إضافة معلومات المتجر (بما في ذلك حالة الفتح/الإغلاق)
    for product in products:
        store = await db.food_stores.find_one({"id": product["store_id"]}, {"_id": 0, "name": 1, "store_type": 1, "working_hours": 1})
        if store:
            product["store_name"] = store.get("name", "")
            product["store_type"] = store.get("store_type", "")
            
            # حساب حالة الفتح/الإغلاق
            working_hours = store.get("working_hours", {})
            product["store_is_open"] = True  # افتراضياً مفتوح
            
            if working_hours:
                days_map = {0: "monday", 1: "tuesday", 2: "wednesday", 3: "thursday", 4: "friday", 5: "saturday", 6: "sunday"}
                today = days_map[datetime.now().weekday()]
                today_hours = working_hours.get(today, {})
                
                if not today_hours or not today_hours.get("is_open", True):
                    product["store_is_open"] = False
                else:
                    try:
                        from datetime import datetime as dt
                        now = dt.now()
                        current_time = now.hour * 60 + now.minute
                        
                        open_time = today_hours.get("open", "08:00")
                        close_time = today_hours.get("close", "22:00")
                        
                        open_parts = open_time.split(":")
                        close_parts = close_time.split(":")
                        
                        open_minutes = int(open_parts[0]) * 60 + int(open_parts[1])
                        close_minutes = int(close_parts[0]) * 60 + int(close_parts[1])
                        
                        if current_time < open_minutes or current_time > close_minutes:
                            product["store_is_open"] = False
                    except Exception:
                        pass
    
    return products

@router.post("/products")
async def create_food_product(product: FoodProductCreate, user: dict = Depends(get_current_user)):
    """إضافة منتج طعام جديد"""
    # التحقق من ملكية المتجر
    store = await db.food_stores.find_one({"id": product.store_id})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    if store["owner_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    product_id = str(uuid.uuid4())
    product_doc = {
        "id": product_id,
        "store_id": product.store_id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "original_price": product.original_price,
        "category": product.category,
        "images": product.images,
        "is_available": product.is_available,
        "preparation_time": product.preparation_time,
        "rating": 0,
        "reviews_count": 0,
        "sales_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.food_products.insert_one(product_doc)
    return {"id": product_id, "message": "تم إضافة المنتج بنجاح"}

# ===============================
# الإحصائيات
# ===============================

@router.get("/stats")
async def get_food_stats():
    """إحصائيات قسم الطعام"""
    stores_count = await db.food_stores.count_documents({"is_active": True, "is_approved": True})
    products_count = await db.food_products.count_documents({"is_available": True})
    
    # إحصائيات حسب النوع
    stats_by_type = {}
    for store_type, name in FOOD_STORE_TYPES.items():
        count = await db.food_stores.count_documents({
            "store_type": store_type, 
            "is_active": True, 
            "is_approved": True
        })
        stats_by_type[store_type] = {"name": name, "count": count}
    
    return {
        "total_stores": stores_count,
        "total_products": products_count,
        "by_type": stats_by_type
    }


# ===============================
# لوحة تحكم المتجر
# ===============================

@router.get("/my-items")
async def get_my_food_items(user: dict = Depends(get_current_user)):
    """جلب أطباق المطعم للبائع"""
    if user.get("user_type") != "food_seller":
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول")
    
    # البحث عن متجر البائع
    store = await db.food_stores.find_one({"owner_id": user["id"]}, {"_id": 0})
    if not store:
        return []
    
    # جلب أطباق المتجر
    items = await db.food_items.find({"store_id": store["id"]}, {"_id": 0}).to_list(None)
    return items or []

@router.post("/items")
async def create_food_item(item_data: dict, user: dict = Depends(get_current_user)):
    """إضافة طبق جديد"""
    if user.get("user_type") != "food_seller":
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول")
    
    # البحث عن متجر البائع
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        raise HTTPException(status_code=404, detail="لا يوجد متجر مرتبط بحسابك")
    
    item_id = str(uuid.uuid4())
    new_item = {
        "id": item_id,
        "store_id": store["id"],
        "seller_id": user["id"],
        "name": item_data.get("name"),
        "description": item_data.get("description", ""),
        "price": item_data.get("price", 0),
        "category": item_data.get("category", "main"),
        "preparation_time": item_data.get("preparation_time", 15),
        "image": item_data.get("images", [None])[0] if item_data.get("images") else None,
        "is_available": True,
        "is_approved": False,  # يحتاج موافقة المدير
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.food_items.insert_one(new_item)
    return {"message": "تم إضافة الطبق بنجاح وينتظر موافقة الإدارة", "id": item_id}

@router.put("/items/{item_id}/availability")
async def toggle_food_item_availability(item_id: str, data: dict, user: dict = Depends(get_current_user)):
    """تغيير حالة توفر الطبق"""
    if user.get("user_type") != "food_seller":
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول")
    
    item = await db.food_items.find_one({"id": item_id, "seller_id": user["id"]})
    if not item:
        raise HTTPException(status_code=404, detail="الطبق غير موجود")
    
    await db.food_items.update_one(
        {"id": item_id},
        {"$set": {"is_available": data.get("is_available", True)}}
    )
    
    return {"message": "تم تحديث حالة الطبق"}

@router.delete("/items/{item_id}")
async def delete_food_item(item_id: str, user: dict = Depends(get_current_user)):
    """حذف طبق"""
    if user.get("user_type") != "food_seller":
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول")
    
    result = await db.food_items.delete_one({"id": item_id, "seller_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الطبق غير موجود")
    
    return {"message": "تم حذف الطبق بنجاح"}

@router.get("/my-store")
async def get_my_store(user: dict = Depends(get_current_user)):
    """جلب متجر المستخدم الحالي"""
    # البحث بـ seller_id أو owner_id للتوافق
    store = await db.food_stores.find_one(
        {"$or": [{"seller_id": user["id"]}, {"owner_id": user["id"]}]}, 
        {"_id": 0}
    )
    if not store:
        raise HTTPException(status_code=404, detail="لا يوجد متجر مرتبط بحسابك")
    
    # جلب منتجات المتجر
    products = await db.food_products.find({"store_id": store["id"]}, {"_id": 0}).to_list(None)
    
    return {"store": store, "products": products}


@router.get("/my-store/commission")
async def get_my_store_commission(user: dict = Depends(get_current_user)):
    """جلب نسبة العمولة لمتجر البائع"""
    store = await db.food_stores.find_one(
        {"$or": [{"seller_id": user["id"]}, {"owner_id": user["id"]}]}, 
        {"_id": 0}
    )
    if not store:
        raise HTTPException(status_code=404, detail="لا يوجد متجر مرتبط بحسابك")
    
    store_type = store.get("store_type", "restaurants")
    
    # جلب نسبة العمولة من قاعدة البيانات
    from routes.admin import get_food_commission_rates_from_db
    commission_rates = await get_food_commission_rates_from_db()
    commission_rate = commission_rates.get(store_type, commission_rates.get("default", 0.20))
    
    # حساب إجمالي العمولات المدفوعة
    orders = await db.food_orders.find(
        {"store_id": store["id"], "status": "delivered"},
        {"platform_commission": 1, "seller_earning": 1, "subtotal": 1}
    ).to_list(None)
    
    total_sales = sum(o.get("subtotal", 0) for o in orders)
    total_commission = sum(o.get("platform_commission", 0) for o in orders)
    total_earnings = sum(o.get("seller_earning", 0) for o in orders)
    
    return {
        "store_type": store_type,
        "store_type_name": get_store_type_name(store_type),
        "commission_rate": commission_rate,
        "commission_percentage": f"{int(commission_rate * 100)}%",
        "total_sales": total_sales,
        "total_commission_paid": total_commission,
        "total_earnings": total_earnings,
        "orders_count": len(orders),
        "message": f"نسبة عمولة المنصة هي {int(commission_rate * 100)}% من قيمة كل طلب"
    }

@router.put("/my-store")
async def update_my_store(update_data: dict, user: dict = Depends(get_current_user)):
    """تحديث معلومات متجر المستخدم"""
    store = await db.food_stores.find_one(
        {"$or": [{"seller_id": user["id"]}, {"owner_id": user["id"]}]}
    )
    if not store:
        raise HTTPException(status_code=404, detail="لا يوجد متجر مرتبط بحسابك")
    
    # الحقول المسموح بتعديلها
    allowed_fields = ["name", "description", "phone", "delivery_time", "minimum_order", "free_delivery_minimum", "delivery_fee", "logo", "cover_image", "working_hours"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.food_stores.update_one(
        {"id": store["id"]},
        {"$set": update_dict}
    )
    
    return {"message": "تم تحديث المتجر بنجاح"}

@router.put("/products/{product_id}")
async def update_food_product(product_id: str, update_data: dict, user: dict = Depends(get_current_user)):
    """تحديث منتج طعام"""
    product = await db.food_products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    # التحقق من ملكية المتجر
    store = await db.food_stores.find_one({"id": product["store_id"]})
    if store.get("seller_id") != user["id"] and store.get("owner_id") != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    # الحقول المسموح بتعديلها
    allowed_fields = ["name", "description", "price", "original_price", "category", "images", "is_available", "preparation_time"]
    update_dict = {k: v for k, v in update_data.items() if k in allowed_fields}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.food_products.update_one(
        {"id": product_id},
        {"$set": update_dict}
    )
    
    return {"message": "تم تحديث المنتج بنجاح"}

@router.patch("/products/{product_id}")
async def patch_food_product(product_id: str, update_data: dict, user: dict = Depends(get_current_user)):
    """تحديث جزئي لمنتج طعام (مثل تغيير حالة التوفر)"""
    product = await db.food_products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    store = await db.food_stores.find_one({"id": product["store_id"]})
    if store["owner_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    await db.food_products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    
    return {"message": "تم التحديث"}

@router.delete("/products/{product_id}")
async def delete_food_product(product_id: str, user: dict = Depends(get_current_user)):
    """حذف منتج طعام"""
    product = await db.food_products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    store = await db.food_stores.find_one({"id": product["store_id"]})
    if store["owner_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    await db.food_products.delete_one({"id": product_id})
    
    return {"message": "تم حذف المنتج"}


# ===============================
# نظام حالة توفر المنتجات (3 حالات)
# ===============================

class AvailabilityStatus:
    AVAILABLE = "available"      # 🟢 متاح
    SOLD_OUT_TODAY = "sold_out_today"  # 🟡 نفد مؤقتاً (يعود غداً)
    UNAVAILABLE = "unavailable"  # 🔴 متوقف

@router.put("/products/{product_id}/availability")
async def update_product_availability(
    product_id: str,
    status: str,  # available, sold_out_today, unavailable
    user: dict = Depends(get_current_user)
):
    """
    تغيير حالة توفر منتج طعام
    
    الحالات:
    - available: 🟢 متاح للطلب
    - sold_out_today: 🟡 نفد مؤقتاً (يعود متاحاً غداً تلقائياً)
    - unavailable: 🔴 متوقف (يحتاج تفعيل يدوي)
    """
    # التحقق من صحة الحالة
    valid_statuses = ["available", "sold_out_today", "unavailable"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"حالة غير صالحة. الحالات المتاحة: {', '.join(valid_statuses)}"
        )
    
    product = await db.food_products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    store = await db.food_stores.find_one({"id": product["store_id"]})
    if store["owner_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    now = datetime.now(timezone.utc)
    
    update_data = {
        "availability_status": status,
        "is_available": status == "available",
        "availability_updated_at": now.isoformat()
    }
    
    # إذا نفد مؤقتاً، نحفظ تاريخ اليوم للإعادة التلقائية
    if status == "sold_out_today":
        update_data["sold_out_date"] = now.date().isoformat()
    
    await db.food_products.update_one(
        {"id": product_id},
        {"$set": update_data}
    )
    
    status_labels = {
        "available": "🟢 متاح",
        "sold_out_today": "🟡 نفد مؤقتاً",
        "unavailable": "🔴 متوقف"
    }
    
    return {
        "message": f"تم تحديث حالة المنتج إلى: {status_labels[status]}",
        "product_id": product_id,
        "status": status,
        "is_available": status == "available"
    }

@router.post("/products/reset-sold-out")
async def reset_sold_out_products():
    """
    إعادة المنتجات التي نفدت مؤقتاً إلى حالة "متاح"
    يُستدعى تلقائياً كل يوم في منتصف الليل
    أو يمكن استدعاؤه يدوياً من المدير
    """
    today = datetime.now(timezone.utc).date().isoformat()
    
    # جلب المنتجات التي نفدت قبل اليوم
    result = await db.food_products.update_many(
        {
            "availability_status": "sold_out_today",
            "sold_out_date": {"$lt": today}
        },
        {
            "$set": {
                "availability_status": "available",
                "is_available": True,
                "availability_updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$unset": {"sold_out_date": ""}
        }
    )
    
    return {
        "message": f"تم إعادة {result.modified_count} منتج إلى حالة 'متاح'",
        "products_reset": result.modified_count
    }

@router.get("/products/{product_id}/availability")
async def get_product_availability(product_id: str):
    """جلب حالة توفر منتج"""
    product = await db.food_products.find_one(
        {"id": product_id},
        {"_id": 0, "id": 1, "name": 1, "availability_status": 1, "is_available": 1, "sold_out_date": 1}
    )
    
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    status = product.get("availability_status", "available" if product.get("is_available", True) else "unavailable")
    
    status_info = {
        "available": {"label": "متاح", "color": "green", "icon": "🟢"},
        "sold_out_today": {"label": "نفد مؤقتاً", "color": "yellow", "icon": "🟡"},
        "unavailable": {"label": "متوقف", "color": "red", "icon": "🔴"}
    }
    
    return {
        "product_id": product_id,
        "name": product.get("name"),
        "status": status,
        "is_available": status == "available",
        "status_info": status_info.get(status, status_info["unavailable"]),
        "sold_out_date": product.get("sold_out_date") if status == "sold_out_today" else None
    }

@router.post("/offers")
async def create_food_offer(offer: FoodOfferCreate, user: dict = Depends(get_current_user)):
    """إنشاء عرض جديد لمتجر الطعام"""
    # التحقق من أن المستخدم لديه متجر
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        raise HTTPException(status_code=403, detail="يجب أن تمتلك متجراً لإنشاء العروض")
    
    offer_id = str(uuid.uuid4())
    offer_doc = {
        "id": offer_id,
        "store_id": store["id"],
        "store_name": store["name"],
        "name": offer.name,
        "offer_type": offer.offer_type,
        "buy_quantity": offer.buy_quantity,
        "get_quantity": offer.get_quantity,
        "discount_percentage": offer.discount_percentage,
        "discount_amount": offer.discount_amount,
        "applicable_products": offer.applicable_products,
        "applicable_categories": offer.applicable_categories,
        "min_order_amount": offer.min_order_amount,
        "is_active": offer.is_active,
        "start_date": offer.start_date,
        "end_date": offer.end_date,
        "usage_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.food_offers.insert_one(offer_doc)
    del offer_doc["_id"]
    
    return offer_doc

@router.get("/my-offers")
async def get_my_offers(user: dict = Depends(get_current_user)):
    """جلب عروض متجري"""
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        raise HTTPException(status_code=404, detail="لا تمتلك متجراً")
    
    offers = await db.food_offers.find(
        {"store_id": store["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return offers

@router.get("/stores/{store_id}/offers")
async def get_store_offers(store_id: str):
    """جلب العروض النشطة لمتجر معين"""
    now = datetime.now(timezone.utc).isoformat()
    
    offers = await db.food_offers.find({
        "store_id": store_id,
        "is_active": True,
        "$or": [
            {"end_date": None},
            {"end_date": {"$gte": now}}
        ]
    }, {"_id": 0}).to_list(50)
    
    return offers

@router.put("/offers/{offer_id}")
async def update_food_offer(offer_id: str, update_data: dict, user: dict = Depends(get_current_user)):
    """تحديث عرض"""
    offer = await db.food_offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    
    store = await db.food_stores.find_one({"id": offer["store_id"]})
    if store["owner_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    allowed_fields = ["name", "is_active", "buy_quantity", "get_quantity", 
                     "discount_percentage", "discount_amount", "min_order_amount",
                     "applicable_products", "applicable_categories", "end_date"]
    
    update = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if update:
        await db.food_offers.update_one({"id": offer_id}, {"$set": update})
    
    return {"message": "تم تحديث العرض"}

@router.delete("/offers/{offer_id}")
async def delete_food_offer(offer_id: str, user: dict = Depends(get_current_user)):
    """حذف عرض"""
    offer = await db.food_offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    
    store = await db.food_stores.find_one({"id": offer["store_id"]})
    if store["owner_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    await db.food_offers.delete_one({"id": offer_id})
    
    return {"message": "تم حذف العرض"}

# Helper function لحساب الخصم
async def calculate_offer_discount(store_id: str, items: list, subtotal: float) -> dict:
    """
    حساب الخصم بناءً على العروض النشطة
    Returns: {"discount": float, "offer_applied": dict or None, "free_items": list}
    """
    now = datetime.now(timezone.utc).isoformat()
    
    # جلب العروض النشطة للمتجر
    offers = await db.food_offers.find({
        "store_id": store_id,
        "is_active": True,
        "$or": [
            {"end_date": None},
            {"end_date": {"$gte": now}}
        ]
    }, {"_id": 0}).to_list(50)
    
    if not offers:
        return {"discount": 0, "offer_applied": None, "free_items": []}
    
    best_discount = 0
    best_offer = None
    free_items = []
    
    for offer in offers:
        # التحقق من الحد الأدنى للطلب
        if offer.get("min_order_amount") and subtotal < offer["min_order_amount"]:
            continue
        
        discount = 0
        current_free_items = []
        
        if offer["offer_type"] == "buy_x_get_y":
            # عرض اشترِ X واحصل على Y مجاناً
            buy_qty = offer["buy_quantity"]
            get_qty = offer["get_quantity"]
            
            # حساب عدد المنتجات المؤهلة
            eligible_items = []
            for item in items:
                # التحقق من أن المنتج مشمول بالعرض
                if offer.get("applicable_products") and item["product_id"] not in offer["applicable_products"]:
                    continue
                if offer.get("applicable_categories") and item.get("category") not in offer["applicable_categories"]:
                    continue
                eligible_items.append(item)
            
            # ترتيب حسب السعر (الأرخص يكون مجاني)
            eligible_items.sort(key=lambda x: x["price"])
            
            total_qty = sum(i["quantity"] for i in eligible_items)
            sets = total_qty // (buy_qty + get_qty)
            
            if sets > 0:
                # حساب الخصم (المنتجات المجانية)
                free_count = sets * get_qty
                for item in eligible_items:
                    if free_count <= 0:
                        break
                    free_from_item = min(item["quantity"], free_count)
                    discount += item["price"] * free_from_item
                    free_count -= free_from_item
                    if free_from_item > 0:
                        current_free_items.append({
                            "product_id": item["product_id"],
                            "name": item.get("name", ""),
                            "quantity": free_from_item,
                            "saved": item["price"] * free_from_item
                        })
        
        elif offer["offer_type"] == "percentage":
            # خصم نسبة مئوية
            if offer.get("discount_percentage"):
                discount = subtotal * (offer["discount_percentage"] / 100)
        
        elif offer["offer_type"] == "fixed_discount":
            # خصم مبلغ ثابت
            if offer.get("discount_amount"):
                discount = min(offer["discount_amount"], subtotal)
        
        # اختيار أفضل عرض
        if discount > best_discount:
            best_discount = discount
            best_offer = offer
            free_items = current_free_items
    
    return {
        "discount": best_discount,
        "offer_applied": best_offer,
        "free_items": free_items
    }


# ===============================
# طلب الانضمام لعروض الفلاش
# ===============================

@router.get("/flash-sales/available")
async def get_available_flash_sales(user: dict = Depends(get_current_user)):
    """جلب عروض الفلاش المتاحة للانضمام"""
    now = datetime.now(timezone.utc).isoformat()
    
    # جلب عروض الفلاش النشطة التي لم تنتهي
    sales = await db.flash_sales.find({
        "is_active": True,
        "end_time": {"$gte": now}
    }, {"_id": 0}).to_list(20)
    
    return sales

@router.get("/flash-sale-settings")
async def get_flash_settings_for_seller(user: dict = Depends(get_current_user)):
    """جلب إعدادات رسوم الانضمام للفلاش"""
    settings = await db.platform_settings.find_one({"id": "flash_sale"}, {"_id": 0})
    
    if not settings:
        settings = {
            "join_fee": 5000,
            "min_products": 1,
            "max_products": 10
        }
    
    return settings

@router.get("/my-flash-requests")
async def get_my_flash_requests(user: dict = Depends(get_current_user)):
    """جلب طلبات الانضمام للفلاش الخاصة بي"""
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        raise HTTPException(status_code=404, detail="لا تمتلك متجراً")
    
    requests = await db.flash_sale_requests.find(
        {"store_id": store["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # إضافة معلومات عرض الفلاش
    for req in requests:
        flash_sale = await db.flash_sales.find_one(
            {"id": req.get("flash_sale_id")},
            {"_id": 0, "name": 1, "discount_percentage": 1, "start_time": 1, "end_time": 1}
        )
        if flash_sale:
            req["flash_sale"] = flash_sale
        
        # معلومات المنتجات
        if req.get("product_ids"):
            products = await db.food_products.find(
                {"id": {"$in": req["product_ids"]}},
                {"_id": 0, "id": 1, "name": 1, "price": 1, "images": 1}
            ).to_list(None)
            req["products"] = products
    
    return requests

@router.post("/flash-sale-request")
async def request_flash_sale_join(request_data: dict, user: dict = Depends(get_current_user)):
    """طلب الانضمام لعرض فلاش"""
    store = await db.food_stores.find_one({"owner_id": user["id"]})
    if not store:
        raise HTTPException(status_code=403, detail="يجب أن تمتلك متجراً")
    
    if not store.get("is_approved"):
        raise HTTPException(status_code=403, detail="متجرك غير معتمد بعد")
    
    # التحقق من البيانات المطلوبة
    flash_sale_id = request_data.get("flash_sale_id")
    product_ids = request_data.get("product_ids", [])
    
    if not flash_sale_id:
        raise HTTPException(status_code=400, detail="يجب تحديد عرض الفلاش")
    
    if not product_ids:
        raise HTTPException(status_code=400, detail="يجب تحديد منتج واحد على الأقل")
    
    # التحقق من عرض الفلاش
    flash_sale = await db.flash_sales.find_one({"id": flash_sale_id})
    if not flash_sale:
        raise HTTPException(status_code=404, detail="عرض الفلاش غير موجود")
    
    now = datetime.now(timezone.utc).isoformat()
    if flash_sale["end_time"] < now:
        raise HTTPException(status_code=400, detail="عرض الفلاش منتهي")
    
    # التحقق من المنتجات
    products = await db.food_products.find({
        "id": {"$in": product_ids},
        "store_id": store["id"]
    }).to_list(None)
    
    if len(products) != len(product_ids):
        raise HTTPException(status_code=400, detail="بعض المنتجات غير موجودة أو لا تنتمي لمتجرك")
    
    # جلب الإعدادات
    settings = await db.platform_settings.find_one({"id": "flash_sale"}, {"_id": 0})
    join_fee = settings.get("join_fee", 5000) if settings else 5000
    max_products = settings.get("max_products", 10) if settings else 10
    
    if len(product_ids) > max_products:
        raise HTTPException(status_code=400, detail=f"الحد الأقصى للمنتجات هو {max_products}")
    
    total_fee = join_fee * len(product_ids)
    
    # التحقق من عدم وجود طلب سابق قيد الانتظار لنفس عرض الفلاش
    existing = await db.flash_sale_requests.find_one({
        "store_id": store["id"],
        "flash_sale_id": flash_sale_id,
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="لديك طلب قيد الانتظار لهذا العرض")
    
    # التحقق من رصيد المحفظة
    wallet = await db.wallets.find_one({"user_id": user["id"]})
    wallet_balance = wallet.get("balance", 0) if wallet else 0
    if not wallet or wallet_balance < total_fee:
        raise HTTPException(
            status_code=400, 
            detail=f"رصيد المحفظة غير كافٍ. المطلوب: {total_fee:,} ل.س"
        )
    
    # خصم الرسوم من المحفظة
    await db.wallets.update_one(
        {"user_id": user["id"]},
        {"$inc": {"balance": -total_fee}}
    )
    
    # تسجيل المعاملة
    transaction = {
        "id": str(uuid.uuid4()),
        "wallet_id": wallet["id"],
        "user_id": user["id"],
        "type": "flash_sale_fee",
        "amount": -total_fee,
        "description": f"رسوم طلب الانضمام لعرض الفلاش: {flash_sale['name']} ({len(product_ids)} منتج)",
        "created_at": now
    }
    await db.wallet_transactions.insert_one(transaction)
    
    # إنشاء الطلب
    request_id = str(uuid.uuid4())
    request_doc = {
        "id": request_id,
        "store_id": store["id"],
        "store_name": store["name"],
        "owner_id": user["id"],
        "flash_sale_id": flash_sale_id,
        "product_ids": product_ids,
        "products_count": len(product_ids),
        "fee_per_product": join_fee,
        "fee_paid": total_fee,
        "status": "pending",
        "created_at": now
    }
    
    await db.flash_sale_requests.insert_one(request_doc)
    del request_doc["_id"]
    
    return {
        "message": "تم إرسال طلب الانضمام بنجاح",
        "request": request_doc,
        "fee_deducted": total_fee
    }

@router.delete("/flash-sale-request/{request_id}")
async def cancel_flash_sale_request(request_id: str, user: dict = Depends(get_current_user)):
    """إلغاء طلب انضمام للفلاش (فقط إذا كان قيد الانتظار)"""
    req = await db.flash_sale_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    store = await db.food_stores.find_one({"id": req["store_id"]})
    if not store or store["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="غير مصرح لك")
    
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء طلب تمت معالجته")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # استرداد الرسوم
    fee_paid = req.get("fee_paid", 0)
    if fee_paid > 0:
        wallet = await db.wallets.find_one({"user_id": user["id"]})
        if wallet:
            await db.wallets.update_one(
                {"user_id": user["id"]},
                {"$inc": {"balance": fee_paid}}
            )
            
            # تسجيل المعاملة
            transaction = {
                "id": str(uuid.uuid4()),
                "wallet_id": wallet["id"],
                "user_id": user["id"],
                "type": "refund",
                "amount": fee_paid,
                "description": "استرداد رسوم طلب الانضمام للفلاش (إلغاء من المستخدم)",
                "created_at": now
            }
            await db.wallet_transactions.insert_one(transaction)
    
    # حذف الطلب
    await db.flash_sale_requests.delete_one({"id": request_id})
    
    return {
        "message": "تم إلغاء الطلب واسترداد الرسوم",
        "refunded": fee_paid
    }
