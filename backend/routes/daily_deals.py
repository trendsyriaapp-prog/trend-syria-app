# /app/backend/routes/daily_deals.py
# صفقات اليوم - عروض يومية محدودة الوقت

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid
from core.database import db, get_current_user

router = APIRouter(prefix="/daily-deals", tags=["Daily Deals"])


@router.get("/active")
async def get_active_daily_deal():
    """جلب صفقة اليوم النشطة"""
    now = datetime.now(timezone.utc).isoformat()
    
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
async def get_upcoming_deals():
    """جلب الصفقات القادمة"""
    now = datetime.now(timezone.utc).isoformat()
    
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
async def get_all_daily_deals(user: dict = Depends(get_current_user)):
    """جلب جميع صفقات اليوم (للمدير)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    deals = await db.daily_deals.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return {"deals": deals}


@router.post("/admin/create")
async def create_daily_deal(data: dict, user: dict = Depends(get_current_user)):
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
    
    now = datetime.now(timezone.utc).isoformat()
    
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


async def send_deal_notification(deal: dict):
    """إرسال إشعار صفقة اليوم لجميع المستخدمين"""
    now = datetime.now(timezone.utc).isoformat()
    
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
async def update_daily_deal(deal_id: str, data: dict, user: dict = Depends(get_current_user)):
    """تحديث صفقة اليوم"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    existing = await db.daily_deals.find_one({"id": deal_id})
    if not existing:
        raise HTTPException(status_code=404, detail="الصفقة غير موجودة")
    
    update = {
        "updated_at": datetime.now(timezone.utc).isoformat()
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
async def delete_daily_deal(deal_id: str, user: dict = Depends(get_current_user)):
    """حذف صفقة اليوم"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.daily_deals.delete_one({"id": deal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الصفقة غير موجودة")
    
    return {"message": "تم حذف الصفقة"}


@router.post("/admin/quick-create")
async def quick_create_daily_deal(data: dict, user: dict = Depends(get_current_user)):
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
