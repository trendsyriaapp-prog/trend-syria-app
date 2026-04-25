# /app/backend/routes/daily_deals.py
# صفقات اليوم - عروض يومية محدودة الوقت

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import uuid
from core.database import db, get_current_user
from helpers.datetime_helpers import get_now

router = APIRouter(prefix="/daily-deals", tags=["Daily Deals"])


@router.get("/active")
async def get_active_daily_deal() -> dict:
    """جلب صفقة اليوم النشطة"""
    now = get_now()
    
    deal = await db.daily_deals.find_one(
        {
            "is_active": True,
            "start_time": {"$lte": now},
            "end_time": {"$gt": now}
        },
        {"_id": 0}
    )
    
    if not deal:
        return {"deal": None}
    
    # جلب المنتجات المشاركة
    products = []
    if deal.get("product_ids"):
        products = await db.products.find(
            {"id": {"$in": deal["product_ids"]}, "is_approved": True},
            {"_id": 0, "id": 1, "name": 1, "price": 1, "images": 1, "discount_price": 1}
        ).to_list(20)
        
        # تطبيق خصم صفقة اليوم
        for p in products:
            original_price = p.get("discount_price") or p["price"]
            p["deal_price"] = int(original_price * (1 - deal["discount_percentage"] / 100))
            p["original_price"] = original_price
    
    # جلب عناصر الطعام المشاركة
    food_items = []
    if deal.get("food_item_ids"):
        food_items = await db.food_items.find(
            {"id": {"$in": deal["food_item_ids"]}, "is_available": True},
            {"_id": 0, "id": 1, "name": 1, "price": 1, "image": 1}
        ).to_list(20)
        
        for item in food_items:
            item["deal_price"] = int(item["price"] * (1 - deal["discount_percentage"] / 100))
            item["original_price"] = item["price"]
    
    deal["products"] = products
    deal["food_items"] = food_items
    
    return {"deal": deal}


@router.get("/upcoming")
async def get_upcoming_deals() -> dict:
    """جلب الصفقات القادمة"""
    now = get_now()
    
    deals = await db.daily_deals.find(
        {
            "is_active": True,
            "start_time": {"$gt": now}
        },
        {"_id": 0}
    ).sort("start_time", 1).to_list(5)
    
    return {"deals": deals}


# ============ Admin Endpoints ============

@router.get("/admin/all")
async def get_all_daily_deals(user: dict = Depends(get_current_user)) -> dict:
    """جلب جميع صفقات اليوم (للمدير)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    deals = await db.daily_deals.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"deals": deals}


@router.post("/admin/create")
async def create_daily_deal(data: dict, user: dict = Depends(get_current_user)) -> dict:
    """إنشاء صفقة يوم جديدة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    required = ["title", "discount_percentage", "start_time", "end_time"]
    for field in required:
        if not data.get(field):
            raise HTTPException(status_code=400, detail=f"الحقل {field} مطلوب")
    
    # التحقق من نسبة الخصم
    discount = data["discount_percentage"]
    if discount < 5 or discount > 90:
        raise HTTPException(status_code=400, detail="نسبة الخصم يجب أن تكون بين 5% و 90%")
    
    now = get_now()
    
    deal = {
        "id": str(uuid.uuid4()),
        "title": data["title"],
        "description": data.get("description", ""),
        "discount_percentage": discount,
        "start_time": data["start_time"],
        "end_time": data["end_time"],
        "product_ids": data.get("product_ids", []),
        "food_item_ids": data.get("food_item_ids", []),
        "banner_image": data.get("banner_image", ""),
        "background_color": data.get("background_color", "#FF6B00"),
        "is_active": True,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.daily_deals.insert_one(deal)
    deal.pop("_id", None)
    
    # إرسال إشعار لجميع المستخدمين إذا طلب ذلك
    if data.get("send_notification", False):
        await send_deal_notification(deal)
    
    return {"message": "تم إنشاء صفقة اليوم", "deal": deal}


async def send_deal_notification(deal: dict) -> dict:
    """إرسال إشعار صفقة اليوم لجميع المستخدمين"""
    now = get_now()
    
    # جلب جميع المستخدمين النشطين
    users = await db.users.find(
        {"is_verified": True},
        {"_id": 0, "id": 1}
    ).to_list(10000)
    
    if not users:
        return
    
    # إنشاء الإشعارات
    notifications = []
    for u in users:
        notifications.append({
            "id": str(uuid.uuid4()),
            "user_id": u["id"],
            "title": f"🔥 {deal['title']}",
            "message": f"{deal.get('description', 'عرض خاص لمدة محدودة!')} - خصم {deal['discount_percentage']}%",
            "type": "daily_deal",
            "data": {"deal_id": deal["id"]},
            "is_read": False,
            "created_at": now
        })
    
    # إدراج الإشعارات دفعة واحدة
    if notifications:
        await db.notifications.insert_many(notifications)


@router.put("/admin/{deal_id}")
async def update_daily_deal(deal_id: str, data: dict, user: dict = Depends(get_current_user)) -> dict:
    """تحديث صفقة اليوم"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    existing = await db.daily_deals.find_one({"id": deal_id})
    if not existing:
        raise HTTPException(status_code=404, detail="الصفقة غير موجودة")
    
    update = {
        "updated_at": get_now()
    }
    
    allowed_fields = ["title", "description", "discount_percentage", "start_time", 
                      "end_time", "product_ids", "food_item_ids", "banner_image", 
                      "background_color", "is_active"]
    
    for field in allowed_fields:
        if field in data:
            update[field] = data[field]
    
    await db.daily_deals.update_one({"id": deal_id}, {"$set": update})
    
    return {"message": "تم تحديث الصفقة"}


@router.delete("/admin/{deal_id}")
async def delete_daily_deal(deal_id: str, user: dict = Depends(get_current_user)) -> dict:
    """حذف صفقة اليوم"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.daily_deals.delete_one({"id": deal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الصفقة غير موجودة")
    
    return {"message": "تم حذف الصفقة"}


@router.post("/admin/quick-create")
async def quick_create_daily_deal(data: dict, user: dict = Depends(get_current_user)) -> dict:
    """إنشاء سريع لصفقة اليوم (24 ساعة من الآن)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    if not data.get("title"):
        raise HTTPException(status_code=400, detail="العنوان مطلوب")
    if not data.get("discount_percentage"):
        raise HTTPException(status_code=400, detail="نسبة الخصم مطلوبة")
    
    now = datetime.now(timezone.utc)
    end = now + timedelta(hours=24)
    
    deal = {
        "id": str(uuid.uuid4()),
        "title": data["title"],
        "description": data.get("description", "عرض خاص لمدة 24 ساعة فقط!"),
        "discount_percentage": data["discount_percentage"],
        "start_time": now.isoformat(),
        "end_time": end.isoformat(),
        "product_ids": data.get("product_ids", []),
        "food_item_ids": data.get("food_item_ids", []),
        "banner_image": data.get("banner_image", ""),
        "background_color": data.get("background_color", "#FF6B00"),
        "is_active": True,
        "created_by": user["id"],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.daily_deals.insert_one(deal)
    deal.pop("_id", None)
    
    # إرسال إشعار لجميع المستخدمين إذا طلب ذلك
    if data.get("send_notification", False):
        await send_deal_notification(deal)
    
    return {"message": "تم إنشاء صفقة اليوم (24 ساعة)", "deal": deal}


# ============ طلبات البائعين ============

@router.get("/requests")
async def get_deal_requests(user: dict = Depends(get_current_user)) -> dict:
    """جلب طلبات البائعين للمشاركة في صفقات اليوم (للمدير)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    requests = await db.deal_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"requests": requests}


@router.post("/requests/create")
async def create_deal_request(data: dict, user: dict = Depends(get_current_user)) -> dict:
    """إنشاء طلب للمشاركة في صفقات اليوم (للبائعين)"""
    if user["user_type"] not in ["seller", "food_seller"]:
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    # التحقق من البيانات المطلوبة
    if not data.get("product_id"):
        raise HTTPException(status_code=400, detail="معرف المنتج مطلوب")
    if not data.get("discount_percentage"):
        raise HTTPException(status_code=400, detail="نسبة الخصم مطلوبة")
    
    discount = data["discount_percentage"]
    if discount < 5 or discount > 90:
        raise HTTPException(status_code=400, detail="نسبة الخصم يجب أن تكون بين 5% و 90%")
    
    # جلب معلومات المنتج
    product = await db.products.find_one({"id": data["product_id"], "seller_id": user["id"]})
    if not product:
        # محاولة البحث في منتجات الطعام بعدة طرق
        # أولاً: البحث باستخدام store_id من المستخدم
        store_id = user.get("store_id")
        
        # إذا لم يكن store_id في المستخدم، نبحث عن المتجر الخاص به
        if not store_id:
            store = await db.food_stores.find_one({"owner_id": user["id"]})
            if store:
                store_id = store["id"]
        
        if store_id:
            # البحث في food_products أولاً (الجدول الأساسي لمنتجات الطعام)
            product = await db.food_products.find_one({"id": data["product_id"], "store_id": store_id})
            if not product:
                # البحث في food_items كبديل
                product = await db.food_items.find_one({"id": data["product_id"], "store_id": store_id})
    
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود أو لا تملك صلاحية له")
    
    # التحقق من عدم وجود طلب معلق سابق لنفس المنتج
    existing = await db.deal_requests.find_one({
        "product_id": data["product_id"],
        "status": "pending"
    })
    if existing:
        raise HTTPException(status_code=400, detail="يوجد طلب معلق بالفعل لهذا المنتج")
    
    now = get_now()
    original_price = product.get("discount_price") or product.get("price", 0)
    discounted_price = int(original_price * (1 - discount / 100))
    
    request_doc = {
        "id": str(uuid.uuid4()),
        "seller_id": user["id"],
        "seller_name": user.get("name", "بائع"),
        "product_id": data["product_id"],
        "product_name": product.get("name", "منتج"),
        "product_image": product.get("images", [None])[0] if isinstance(product.get("images"), list) else product.get("image"),
        "original_price": original_price,
        "discount_percentage": discount,
        "discounted_price": discounted_price,
        "message": data.get("message", ""),
        "status": "pending",  # pending, approved, rejected
        "created_at": now,
        "updated_at": now
    }
    
    await db.deal_requests.insert_one(request_doc)
    
    # إنشاء إشعار للمدير
    admin_notification = {
        "id": str(uuid.uuid4()),
        "user_id": "admin",
        "title": "طلب جديد لصفقات اليوم",
        "message": f"{user.get('name', 'بائع')} يطلب إضافة {product.get('name', 'منتج')} بخصم {discount}%",
        "type": "deal_request",
        "data": {"request_id": request_doc["id"]},
        "is_read": False,
        "created_at": now
    }
    await db.notifications.insert_one(admin_notification)
    
    return {"message": "تم إرسال طلبك بنجاح", "request_id": request_doc["id"]}


@router.post("/requests/{request_id}/approve")
async def approve_deal_request(request_id: str, user: dict = Depends(get_current_user)) -> dict:
    """قبول طلب بائع (للمدير)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    request = await db.deal_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="هذا الطلب تم معالجته مسبقاً")
    
    now = datetime.now(timezone.utc)
    
    # تحديث حالة الطلب
    await db.deal_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "approved", "updated_at": now.isoformat(), "approved_by": user["id"]}}
    )
    
    # إنشاء صفقة يوم جديدة لهذا المنتج (24 ساعة)
    deal = {
        "id": str(uuid.uuid4()),
        "title": f"عرض خاص: {request['product_name']}",
        "description": f"خصم {request['discount_percentage']}% من {request['seller_name']}",
        "discount_percentage": request["discount_percentage"],
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(hours=24)).isoformat(),
        "product_ids": [request["product_id"]],
        "food_item_ids": [],
        "banner_image": request.get("product_image", ""),
        "background_color": "#FF6B00",
        "is_active": True,
        "created_by": user["id"],
        "from_request": request_id,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    await db.daily_deals.insert_one(deal)
    
    # إشعار البائع
    seller_notification = {
        "id": str(uuid.uuid4()),
        "user_id": request["seller_id"],
        "title": "تم قبول طلبك! 🎉",
        "message": f"تمت إضافة {request['product_name']} لصفقات اليوم لمدة 24 ساعة",
        "type": "deal_request_approved",
        "data": {"deal_id": deal["id"]},
        "is_read": False,
        "created_at": now.isoformat()
    }
    await db.notifications.insert_one(seller_notification)
    
    return {"message": "تم قبول الطلب وإنشاء الصفقة"}


@router.post("/requests/{request_id}/reject")
async def reject_deal_request(request_id: str, data: dict, user: dict = Depends(get_current_user)) -> dict:
    """رفض طلب بائع (للمدير)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    request = await db.deal_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail="هذا الطلب تم معالجته مسبقاً")
    
    now = get_now()
    reason = data.get("reason", "")
    
    # تحديث حالة الطلب
    await db.deal_requests.update_one(
        {"id": request_id},
        {"$set": {
            "status": "rejected", 
            "updated_at": now, 
            "rejected_by": user["id"],
            "rejection_reason": reason
        }}
    )
    
    # إشعار البائع
    seller_notification = {
        "id": str(uuid.uuid4()),
        "user_id": request["seller_id"],
        "title": "تم رفض طلبك",
        "message": f"عذراً، تم رفض طلب إضافة {request['product_name']} لصفقات اليوم" + (f". السبب: {reason}" if reason else ""),
        "type": "deal_request_rejected",
        "data": {"request_id": request_id},
        "is_read": False,
        "created_at": now
    }
    await db.notifications.insert_one(seller_notification)
    
    return {"message": "تم رفض الطلب"}


@router.delete("/requests/{request_id}")
async def delete_deal_request(request_id: str, user: dict = Depends(get_current_user)) -> dict:
    """حذف طلب صفقة (للمدير)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.deal_requests.delete_one({"id": request_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    return {"message": "تم حذف الطلب بنجاح"}


@router.get("/seller/my-requests")
async def get_my_deal_requests(user: dict = Depends(get_current_user)) -> dict:
    """جلب طلباتي للمشاركة في صفقات اليوم (للبائع)"""
    if user["user_type"] not in ["seller", "food_seller"]:
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    requests = await db.deal_requests.find(
        {"seller_id": user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"requests": requests}

