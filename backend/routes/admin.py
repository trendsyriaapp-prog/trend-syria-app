# /app/backend/routes/admin.py
# مسارات لوحة الإدارة

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
import hashlib

from core.database import db, get_current_user
from models.schemas import SubAdminCreate, NotificationCreate, ProductApproval

router = APIRouter(prefix="/admin", tags=["Admin"])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# ============== إعدادات المنصة ==============

@router.get("/settings")
async def get_platform_settings(user: dict = Depends(get_current_user)):
    """جلب إعدادات المنصة"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        # إعدادات افتراضية
        settings = {
            "id": "main",
            "food_enabled": True,
            "shop_enabled": True,
            "delivery_enabled": True,
            "wallet_enabled": True,
            "referral_enabled": True,
            "daily_deals_enabled": True,
            "flash_sales_enabled": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.platform_settings.insert_one(settings)
    
    return settings

@router.put("/settings")
async def update_platform_settings(data: dict, user: dict = Depends(get_current_user)):
    """تحديث إعدادات المنصة"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    # جلب الإعدادات الحالية للمقارنة
    current_settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    allowed_fields = [
        "food_enabled", "shop_enabled", "delivery_enabled",
        "wallet_enabled", "referral_enabled", "daily_deals_enabled",
        "flash_sales_enabled"
    ]
    
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    for field in allowed_fields:
        if field in data:
            update[field] = bool(data[field])
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {"$set": update},
        upsert=True
    )
    
    # إرسال إشعار عند تفعيل منصة الطعام
    if data.get("food_enabled") == True:
        was_disabled = current_settings is None or current_settings.get("food_enabled", True) == False
        if was_disabled:
            await send_platform_activation_notification(
                "food",
                "🍕 جديد! منصة الطعام متاحة الآن",
                "اطلب الآن من مطاعمك المفضلة - توصيل سريع لباب بيتك!"
            )
    
    # إرسال إشعار عند تفعيل صفقات اليوم
    if data.get("daily_deals_enabled") == True:
        was_disabled = current_settings is None or current_settings.get("daily_deals_enabled", True) == False
        if was_disabled:
            await send_platform_activation_notification(
                "daily_deals",
                "🔥 صفقات اليوم عادت!",
                "تصفح العروض الحصرية واحصل على خصومات مميزة!"
            )
    
    # إرسال إشعار عند تفعيل عروض الفلاش
    if data.get("flash_sales_enabled") == True:
        was_disabled = current_settings is None or current_settings.get("flash_sales_enabled", True) == False
        if was_disabled:
            await send_platform_activation_notification(
                "flash_sales",
                "⚡ عروض الفلاش متاحة الآن!",
                "خصومات محدودة الوقت - اغتنم الفرصة قبل انتهاء العرض!"
            )
    
    return {"message": "تم تحديث الإعدادات", "settings": update}

async def send_platform_activation_notification(platform: str, title: str, message: str):
    """إرسال إشعار تفعيل قسم لجميع المستخدمين"""
    now = datetime.now(timezone.utc).isoformat()
    
    users = await db.users.find(
        {"user_type": {"$in": ["customer", "seller"]}},
        {"_id": 0, "id": 1}
    ).to_list(10000)
    
    if not users:
        return 0
    
    notifications = []
    for u in users:
        notifications.append({
            "id": str(uuid.uuid4()),
            "user_id": u["id"],
            "title": title,
            "message": message,
            "type": f"platform_{platform}_activated",
            "read": False,
            "created_at": now
        })
    
    if notifications:
        await db.notifications.insert_many(notifications)
    
    return len(notifications)

@router.get("/settings/public")
async def get_public_settings():
    """جلب الإعدادات العامة (بدون تسجيل دخول)"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    # الإعدادات الافتراضية
    default_settings = {
        "food_enabled": True,
        "shop_enabled": True,
        "delivery_enabled": True,
        "wallet_enabled": True,
        "referral_enabled": True,
        "daily_deals_enabled": True,
        "flash_sales_enabled": True
    }
    
    if not settings:
        return default_settings
    
    # دمج الإعدادات الافتراضية مع المحفوظة
    for key, value in default_settings.items():
        if key not in settings:
            settings[key] = value
    
    # إرجاع فقط الحقول المتعلقة بتفعيل الأقسام
    return {
        "food_enabled": settings.get("food_enabled", True),
        "shop_enabled": settings.get("shop_enabled", True),
        "delivery_enabled": settings.get("delivery_enabled", True),
        "wallet_enabled": settings.get("wallet_enabled", True),
        "referral_enabled": settings.get("referral_enabled", True),
        "daily_deals_enabled": settings.get("daily_deals_enabled", True),
        "flash_sales_enabled": settings.get("flash_sales_enabled", True)
    }

# ============== دالة إرسال إشعارات العروض لجميع المستخدمين ==============

async def send_offer_notification_to_all_users(title: str, message: str, offer_type: str, offer_data: dict = None):
    """إرسال إشعار عرض لجميع المستخدمين"""
    now = datetime.now(timezone.utc).isoformat()
    
    # جلب جميع المستخدمين (عملاء)
    users = await db.users.find(
        {"user_type": {"$in": ["customer", "seller"]}},
        {"_id": 0, "id": 1}
    ).to_list(10000)
    
    if not users:
        return 0
    
    # إنشاء الإشعارات
    notifications = []
    for u in users:
        notifications.append({
            "id": str(uuid.uuid4()),
            "user_id": u["id"],
            "title": title,
            "message": message,
            "type": offer_type,
            "data": offer_data or {},
            "is_read": False,
            "created_at": now
        })
    
    # إدراج الإشعارات دفعة واحدة
    if notifications:
        await db.notifications.insert_many(notifications)
    
    return len(notifications)

# ============== Commission Constants ==============

DEFAULT_CATEGORY_COMMISSIONS = {
    "إلكترونيات": 0.18,
    "أزياء": 0.17,
    "ملابس": 0.17,
    "أحذية": 0.21,
    "تجميل": 0.18,
    "مجوهرات": 0.16,
    "إكسسوارات": 0.16,
    "المنزل": 0.20,
    "رياضة": 0.16,
    "أطفال": 0.15,
    "كتب": 0.12,
    "ألعاب": 0.14,
    "default": 0.15,
}

# عمولات متاجر الطعام
DEFAULT_FOOD_COMMISSIONS = {
    "restaurants": 0.20,  # مطاعم
    "groceries": 0.20,    # مواد غذائية
    "vegetables": 0.20,   # خضروات وفواكه
    "default": 0.20,
}

async def get_commission_rates_from_db():
    rates = await db.commission_rates.find_one({"id": "main"}, {"_id": 0})
    if rates and rates.get("categories"):
        return rates["categories"]
    return DEFAULT_CATEGORY_COMMISSIONS

async def get_food_commission_rates_from_db():
    rates = await db.commission_rates.find_one({"id": "food"}, {"_id": 0})
    if rates and rates.get("categories"):
        return rates["categories"]
    return DEFAULT_FOOD_COMMISSIONS

# ============== Stats ==============

@router.get("/stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    total_users = await db.users.count_documents({"user_type": "buyer"})
    total_sellers = await db.users.count_documents({"user_type": "seller"})
    total_delivery = await db.users.count_documents({"user_type": "delivery"})
    total_products = await db.products.count_documents({"approval_status": "approved"})
    total_orders = await db.orders.count_documents({})
    pending_sellers = await db.seller_documents.count_documents({"status": "pending"})
    pending_products = await db.products.count_documents({"approval_status": "pending"})
    pending_delivery = await db.delivery_documents.count_documents({"status": "pending"})
    total_sub_admins = await db.users.count_documents({"user_type": "sub_admin"})
    
    return {
        "total_users": total_users,
        "total_sellers": total_sellers,
        "total_delivery": total_delivery,
        "total_products": total_products,
        "total_orders": total_orders,
        "pending_sellers": pending_sellers,
        "pending_products": pending_products,
        "pending_delivery": pending_delivery,
        "total_sub_admins": total_sub_admins
    }

# ============== Users Management ==============

@router.get("/users")
async def get_all_users(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    users = await db.users.find(
        {"user_type": "buyer"},
        {"_id": 0, "password": 0}
    ).sort("created_at", -1).to_list(200)
    
    return users

# ============== Sellers Management ==============

@router.get("/sellers/pending")
async def get_pending_sellers(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    docs = await db.seller_documents.find({"status": "pending"}, {"_id": 0}).to_list(100)
    result = []
    for doc in docs:
        seller = await db.users.find_one({"id": doc["seller_id"]}, {"_id": 0, "password": 0})
        if seller:
            result.append({**doc, "seller": seller})
    return result

@router.get("/sellers/all")
async def get_all_sellers(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    sellers = await db.users.find(
        {"user_type": "seller"},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    for seller in sellers:
        docs = await db.seller_documents.find_one({"seller_id": seller["id"]}, {"_id": 0})
        seller["documents"] = docs
        products_count = await db.products.count_documents({"seller_id": seller["id"]})
        seller["products_count"] = products_count
    
    return sellers

@router.post("/sellers/{seller_id}/approve")
async def approve_seller(seller_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    await db.users.update_one({"id": seller_id}, {"$set": {"is_approved": True}})
    await db.seller_documents.update_one({"seller_id": seller_id}, {"$set": {"status": "approved"}})
    return {"message": "تم تفعيل البائع"}

@router.post("/sellers/{seller_id}/reject")
async def reject_seller(seller_id: str, data: dict = None, user: dict = Depends(get_current_user)):
    """رفض بائع مع سبب الرفض (اختياري)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # سبب الرفض اختياري
    reason = data.get("reason", "").strip() if data else ""
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "status": "rejected",
        "rejected_by": user["id"],
        "rejected_at": now
    }
    if reason:
        update_data["rejection_reason"] = reason
    
    await db.seller_documents.update_one(
        {"seller_id": seller_id}, 
        {"$set": update_data}
    )
    
    # إرسال إشعار للبائع
    seller = await db.users.find_one({"id": seller_id})
    if seller:
        message = "تم رفض طلبك للتسجيل كبائع."
        if reason:
            message += f"\n📝 السبب: {reason}"
        
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": seller_id,
            "title": "❌ تم رفض طلب البائع",
            "message": message,
            "type": "seller_rejected",
            "is_read": False,
            "created_at": now
        })
    
    return {"message": "تم رفض البائع", "reason": reason if reason else None}

# ============== Products Management ==============

@router.get("/products/pending")
async def get_pending_products(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    products = await db.products.find(
        {"approval_status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for product in products:
        seller = await db.users.find_one({"id": product["seller_id"]}, {"_id": 0, "password": 0})
        if seller:
            product["seller"] = seller
    
    return products

@router.get("/products/all")
async def get_all_products(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    products = await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return products

@router.post("/products/{product_id}/approve")
async def approve_product(product_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.products.update_one(
        {"id": product_id},
        {
            "$set": {
                "is_approved": True,
                "approval_status": "approved",
                "approved_by": user["id"],
                "approved_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    return {"message": "تم الموافقة على المنتج"}

@router.post("/products/{product_id}/reject")
async def reject_product(product_id: str, approval: ProductApproval, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.products.update_one(
        {"id": product_id},
        {
            "$set": {
                "is_approved": False,
                "approval_status": "rejected",
                "rejection_reason": approval.rejection_reason,
                "rejected_by": user["id"],
                "rejected_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    return {"message": "تم رفض المنتج"}

# ============== Delivery Management ==============

@router.get("/delivery/pending")
async def get_pending_delivery(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    docs = await db.delivery_documents.find({"status": "pending"}, {"_id": 0}).to_list(100)
    result = []
    for doc in docs:
        driver = await db.users.find_one({"id": doc.get("driver_id") or doc.get("delivery_id")}, {"_id": 0, "password": 0})
        if driver:
            result.append({**doc, "driver": driver})
    return result

@router.get("/delivery/all")
async def get_all_delivery(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    drivers = await db.users.find(
        {"user_type": "delivery"},
        {"_id": 0, "password": 0}
    ).sort("created_at", -1).to_list(100)
    
    for driver in drivers:
        doc = await db.delivery_documents.find_one(
            {"$or": [{"driver_id": driver["id"]}, {"delivery_id": driver["id"]}]}, 
            {"_id": 0}
        )
        driver["documents"] = doc
    
    return drivers

@router.post("/delivery/{driver_id}/approve")
async def approve_delivery_driver(driver_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.delivery_documents.update_one(
        {"$or": [{"driver_id": driver_id}, {"delivery_id": driver_id}]},
        {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="لم يتم العثور على الوثائق")
    
    await db.users.update_one({"id": driver_id}, {"$set": {"is_approved": True}})
    
    return {"message": "تم اعتماد موظف التوصيل"}

@router.post("/delivery/{driver_id}/reject")
async def reject_delivery_driver(driver_id: str, data: dict = None, user: dict = Depends(get_current_user)):
    """رفض موظف توصيل مع سبب الرفض (اختياري)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # سبب الرفض اختياري
    reason = data.get("reason", "").strip() if data else ""
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "status": "rejected",
        "rejected_by": user["id"],
        "rejected_at": now
    }
    if reason:
        update_data["rejection_reason"] = reason
    
    result = await db.delivery_documents.update_one(
        {"$or": [{"driver_id": driver_id}, {"delivery_id": driver_id}]},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="لم يتم العثور على الوثائق")
    
    # إرسال إشعار لموظف التوصيل
    message = "تم رفض طلبك للتسجيل كموظف توصيل."
    if reason:
        message += f"\n📝 السبب: {reason}"
    
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": driver_id,
        "title": "❌ تم رفض طلب التوصيل",
        "message": message,
        "type": "delivery_rejected",
        "is_read": False,
        "created_at": now
    })
    
    return {"message": "تم رفض موظف التوصيل", "reason": reason if reason else None}

# ============== Sub-Admin Management ==============

@router.post("/sub-admins")
async def create_sub_admin(data: SubAdminCreate, user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    existing = await db.users.find_one({"phone": data.phone})
    if existing:
        raise HTTPException(status_code=400, detail="رقم الهاتف مسجل مسبقاً")
    
    sub_admin_id = str(uuid.uuid4())
    sub_admin_doc = {
        "id": sub_admin_id,
        "name": data.full_name,
        "full_name": data.full_name,
        "phone": data.phone,
        "password": hash_password(data.password),
        "city": data.city,
        "user_type": "sub_admin",
        "is_verified": True,
        "is_approved": True,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(sub_admin_doc)
    
    return {"id": sub_admin_id, "message": "تم إنشاء مساعد المدير بنجاح"}

@router.get("/sub-admins")
async def get_sub_admins(user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    sub_admins = await db.users.find(
        {"user_type": "sub_admin"},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    return sub_admins

@router.delete("/sub-admins/{sub_admin_id}")
async def delete_sub_admin(sub_admin_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    result = await db.users.delete_one({"id": sub_admin_id, "user_type": "sub_admin"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="مساعد المدير غير موجود")
    
    return {"message": "تم حذف مساعد المدير"}

# ============== Orders Management ==============

@router.get("/orders")
async def get_all_orders(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return orders

# ============== Commission Management ==============

@router.get("/commissions")
async def get_commissions_report(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    orders = await db.orders.find(
        {"status": {"$in": ["paid", "completed", "delivered"]}},
        {"_id": 0}
    ).to_list(1000)
    
    total_sales = 0
    total_commission = 0
    commission_by_category = {}
    commission_by_seller = {}
    
    for order in orders:
        total_sales += order.get("total", 0)
        total_commission += order.get("total_commission", 0)
        
        for item in order.get("items", []):
            category = item.get("category", "غير محدد")
            seller_id = item.get("seller_id", "غير معروف")
            commission = item.get("commission_amount", 0)
            
            if category not in commission_by_category:
                commission_by_category[category] = {"sales": 0, "commission": 0, "orders_count": 0}
            commission_by_category[category]["sales"] += item.get("item_total", 0)
            commission_by_category[category]["commission"] += commission
            commission_by_category[category]["orders_count"] += 1
            
            if seller_id not in commission_by_seller:
                commission_by_seller[seller_id] = {"sales": 0, "commission": 0, "seller_amount": 0}
            commission_by_seller[seller_id]["sales"] += item.get("item_total", 0)
            commission_by_seller[seller_id]["commission"] += commission
            commission_by_seller[seller_id]["seller_amount"] += item.get("seller_amount", 0)
    
    sellers_report = []
    for seller_id, data in commission_by_seller.items():
        seller = await db.users.find_one({"id": seller_id}, {"_id": 0, "name": 1, "phone": 1})
        sellers_report.append({
            "seller_id": seller_id,
            "seller_name": seller.get("name", "غير معروف") if seller else "غير معروف",
            "seller_phone": seller.get("phone", "") if seller else "",
            **data
        })
    
    sellers_report.sort(key=lambda x: x["commission"], reverse=True)
    
    return {
        "summary": {
            "total_sales": total_sales,
            "total_commission": total_commission,
            "total_seller_amount": total_sales - total_commission,
            "orders_count": len(orders)
        },
        "by_category": commission_by_category,
        "by_seller": sellers_report[:20]
    }

@router.get("/commissions/rates")
async def get_commission_rates(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    db_rates = await get_commission_rates_from_db()
    
    rates = []
    for category, rate in db_rates.items():
        if category != "default":
            rates.append({
                "category": category,
                "rate": rate,
                "percentage": f"{rate * 100:.0f}%"
            })
    
    rates.sort(key=lambda x: x["rate"], reverse=True)
    return {
        "rates": rates,
        "default_rate": db_rates.get("default", 0.15),
        "default_percentage": f"{db_rates.get('default', 0.15) * 100:.0f}%"
    }

@router.put("/commissions/rates")
async def update_commission_rates(rates: dict, user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    for category, rate in rates.items():
        if not isinstance(rate, (int, float)) or rate < 0 or rate > 1:
            raise HTTPException(status_code=400, detail=f"نسبة غير صحيحة للفئة {category}")
    
    await db.commission_rates.update_one(
        {"id": "main"},
        {
            "$set": {
                "categories": rates,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {"message": "تم تحديث نسب العمولات بنجاح", "rates": rates}

@router.post("/commissions/rates/category")
async def add_commission_category(category: str, rate: float, user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    if rate < 0 or rate > 1:
        raise HTTPException(status_code=400, detail="النسبة يجب أن تكون بين 0 و 1")
    
    current_rates = await get_commission_rates_from_db()
    current_rates[category] = rate
    
    await db.commission_rates.update_one(
        {"id": "main"},
        {
            "$set": {
                "categories": current_rates,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {"message": f"تم إضافة فئة {category} بنسبة {rate * 100:.0f}%"}

@router.delete("/commissions/rates/category/{category}")
async def delete_commission_category(category: str, user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    if category == "default":
        raise HTTPException(status_code=400, detail="لا يمكن حذف الفئة الافتراضية")
    
    current_rates = await get_commission_rates_from_db()
    if category in current_rates:
        del current_rates[category]
    
    await db.commission_rates.update_one(
        {"id": "main"},
        {
            "$set": {
                "categories": current_rates,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": user["id"]
            }
        },
        upsert=True
    )
    
    return {"message": f"تم حذف فئة {category}"}

# ============== Notifications Management ==============

@router.post("/notifications")
async def create_notification(data: NotificationCreate, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    notification = {
        "id": str(uuid.uuid4()),
        "title": data.title,
        "message": data.message,
        "target": data.target,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.notifications.insert_one(notification)
    notification.pop("_id", None)
    
    return {"message": "تم إرسال الإشعار بنجاح", "notification": notification}

@router.get("/notifications")
async def get_admin_notifications(user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    notifications = await db.notifications.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(100).to_list(100)
    
    return notifications

@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    result = await db.notifications.delete_one({"id": notification_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الإشعار غير موجود")
    
    await db.notification_reads.delete_many({"notification_id": notification_id})
    
    return {"message": "تم حذف الإشعار"}


# ============== Low Stock Report ==============

@router.get("/products/low-stock")
async def get_low_stock_products(user: dict = Depends(get_current_user)):
    """جلب المنتجات ذات المخزون المنخفض"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # Get threshold from settings
    settings = await db.platform_settings.find_one({"id": "main"})
    threshold = settings.get("low_stock_threshold", 5) if settings else 5
    
    # Find products with low stock
    products = await db.products.find(
        {
            "stock": {"$lte": threshold},
            "is_active": True
        },
        {"_id": 0}
    ).sort("stock", 1).to_list(100)
    
    # Enrich with seller info
    for product in products:
        seller = await db.users.find_one(
            {"id": product.get("seller_id")},
            {"_id": 0, "full_name": 1, "phone": 1}
        )
        product["seller_info"] = seller or {}
    
    return {
        "threshold": threshold,
        "count": len(products),
        "products": products
    }


# ============== إدارة البلاغات الأخلاقية ==============

from core.database import create_notification_for_user

@router.get("/driver-reports")
async def get_driver_reports(user: dict = Depends(get_current_user)):
    """جلب البلاغات الأخلاقية ضد موظفي التوصيل"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    reports = await db.driver_reports.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # إحصائيات
    stats = {
        "pending": len([r for r in reports if r["status"] == "pending"]),
        "reviewed": len([r for r in reports if r["status"] == "reviewed"]),
        "dismissed": len([r for r in reports if r["status"] == "dismissed"]),
        "terminated": len([r for r in reports if r["status"] == "terminated"]),
        "total": len(reports)
    }
    
    return {"reports": reports, "stats": stats}

@router.put("/driver-reports/{report_id}")
async def handle_driver_report(report_id: str, action: str, admin_notes: str = "", user: dict = Depends(get_current_user)):
    """اتخاذ إجراء بشأن البلاغ"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    if action not in ["dismiss", "penalize", "terminate"]:
        raise HTTPException(status_code=400, detail="الإجراء يجب أن يكون dismiss أو penalize أو terminate")
    
    report = await db.driver_reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="البلاغ غير موجود")
    
    now = datetime.now(timezone.utc).isoformat()
    driver_id = report["driver_id"]
    
    # نقاط الخصم حسب نوع البلاغ
    PENALTY_POINTS = {
        "سلوك_غير_لائق": 15,
        "تحرش": 50,
        "سرقة_احتيال": 100,
        "أخرى": 10
    }
    MAX_POINTS = 100
    
    if action == "dismiss":
        # رفض البلاغ - إعادة تفعيل الموظف
        await db.driver_reports.update_one(
            {"id": report_id},
            {
                "$set": {
                    "status": "dismissed",
                    "reviewed_at": now,
                    "reviewed_by": user["id"],
                    "admin_notes": admin_notes
                }
            }
        )
        
        # إعادة تفعيل الموظف
        await db.users.update_one(
            {"id": driver_id},
            {
                "$set": {
                    "is_suspended": False
                },
                "$unset": {
                    "suspended_at": "",
                    "suspension_reason": ""
                }
            }
        )
        
        # إعادة تفعيل وثائق التوصيل
        await db.delivery_documents.update_one(
            {"$or": [{"driver_id": driver_id}, {"delivery_id": driver_id}]},
            {
                "$set": {
                    "status": "approved"
                },
                "$unset": {
                    "suspended_at": "",
                    "suspension_reason": ""
                }
            }
        )
        
        # إشعار الموظف
        await create_notification_for_user(
            user_id=driver_id,
            title="✅ تم رفع التعليق عن حسابك",
            message="تمت مراجعة البلاغ وتقرر رفع التعليق عن حسابك. يمكنك استئناف العمل.",
            notification_type="account_reactivated"
        )
        
        return {"message": "تم رفض البلاغ وإعادة تفعيل حساب الموظف"}
    
    elif action == "penalize":
        # خصم نقاط بدون فصل (إذا كانت النقاط كافية)
        penalty = PENALTY_POINTS.get(report.get("category"), 10)
        
        # جلب النقاط الحالية
        driver = await db.users.find_one({"id": driver_id}, {"_id": 0, "penalty_points": 1})
        current_points = driver.get("penalty_points", MAX_POINTS)
        new_points = max(0, current_points - penalty)
        
        # تحديث البلاغ
        await db.driver_reports.update_one(
            {"id": report_id},
            {
                "$set": {
                    "status": "penalized",
                    "reviewed_at": now,
                    "reviewed_by": user["id"],
                    "admin_notes": admin_notes,
                    "penalty_applied": penalty
                }
            }
        )
        
        # تحديث نقاط الموظف
        penalty_record = {
            "date": now,
            "report_id": report_id,
            "category": report.get("category_label"),
            "points_deducted": penalty,
            "points_before": current_points,
            "points_after": new_points
        }
        
        await db.users.update_one(
            {"id": driver_id},
            {
                "$set": {
                    "penalty_points": new_points,
                    "is_suspended": False  # رفع التعليق بعد الخصم
                },
                "$push": {
                    "penalty_history": penalty_record
                },
                "$unset": {
                    "suspended_at": "",
                    "suspension_reason": ""
                }
            }
        )
        
        # إعادة تفعيل وثائق التوصيل
        await db.delivery_documents.update_one(
            {"$or": [{"driver_id": driver_id}, {"delivery_id": driver_id}]},
            {
                "$set": {"status": "approved"},
                "$unset": {"suspended_at": "", "suspension_reason": ""}
            }
        )
        
        # التحقق من الفصل التلقائي
        if new_points == 0:
            # فصل تلقائي
            await db.users.update_one(
                {"id": driver_id},
                {
                    "$set": {
                        "is_terminated": True,
                        "terminated_at": now,
                        "termination_reason": "فصل تلقائي - استنفاد نقاط السلوك"
                    }
                }
            )
            
            await db.delivery_documents.update_one(
                {"$or": [{"driver_id": driver_id}, {"delivery_id": driver_id}]},
                {
                    "$set": {
                        "status": "terminated",
                        "terminated_at": now,
                        "termination_reason": "فصل تلقائي - استنفاد نقاط السلوك"
                    }
                }
            )
            
            await create_notification_for_user(
                user_id=driver_id,
                title="❌ تم إنهاء خدماتك تلقائياً",
                message="لقد استنفدت جميع نقاط السلوك الخاصة بك. تم إنهاء خدماتك.",
                notification_type="account_terminated"
            )
            
            return {
                "message": f"تم خصم {penalty} نقطة. الموظف مفصول تلقائياً (0 نقطة متبقية)",
                "auto_terminated": True,
                "penalty": penalty,
                "new_points": 0
            }
        
        # إشعار الموظف بالخصم
        await create_notification_for_user(
            user_id=driver_id,
            title=f"⚠️ تم خصم {penalty} نقطة من رصيدك",
            message=f"بسبب بلاغ مثبت: {report.get('category_label')}. رصيدك الحالي: {new_points} نقطة",
            notification_type="penalty_applied"
        )
        
        return {
            "message": f"تم خصم {penalty} نقطة وإعادة تفعيل الموظف",
            "penalty": penalty,
            "new_points": new_points,
            "auto_terminated": False
        }
    
    else:  # terminate
        # فصل الموظف نهائياً
        await db.driver_reports.update_one(
            {"id": report_id},
            {
                "$set": {
                    "status": "terminated",
                    "reviewed_at": now,
                    "reviewed_by": user["id"],
                    "admin_notes": admin_notes
                }
            }
        )
        
        # تحديث حالة الموظف
        await db.users.update_one(
            {"id": driver_id},
            {
                "$set": {
                    "is_terminated": True,
                    "terminated_at": now,
                    "termination_reason": f"فصل نهائي بسبب بلاغ أخلاقي: {report.get('category_label')}"
                }
            }
        )
        
        # تحديث وثائق التوصيل
        await db.delivery_documents.update_one(
            {"$or": [{"driver_id": driver_id}, {"delivery_id": driver_id}]},
            {
                "$set": {
                    "status": "terminated",
                    "terminated_at": now,
                    "termination_reason": "فصل نهائي بسبب بلاغ أخلاقي"
                }
            }
        )
        
        # إشعار الموظف
        await create_notification_for_user(
            user_id=driver_id,
            title="❌ تم إنهاء خدماتك",
            message=f"تمت مراجعة البلاغ وتقرر إنهاء خدماتك. السبب: {report.get('category_label')}",
            notification_type="account_terminated"
        )
        
        return {"message": "تم فصل الموظف نهائياً"}



# ============== إدارة متاجر الطعام ==============

@router.get("/food/stats")
async def get_food_admin_stats(user: dict = Depends(get_current_user)):
    """إحصائيات متاجر الطعام"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    total_stores = await db.food_stores.count_documents({})
    active_stores = await db.food_stores.count_documents({"is_active": True, "is_approved": True})
    pending_stores = await db.food_stores.count_documents({"is_approved": False})
    total_products = await db.food_products.count_documents({})
    
    # حسب النوع
    restaurants_count = await db.food_stores.count_documents({"store_type": "restaurants"})
    groceries_count = await db.food_stores.count_documents({"store_type": "groceries"})
    vegetables_count = await db.food_stores.count_documents({"store_type": "vegetables"})
    
    return {
        "total_stores": total_stores,
        "active_stores": active_stores,
        "pending_stores": pending_stores,
        "total_products": total_products,
        "by_type": {
            "restaurants": restaurants_count,
            "groceries": groceries_count,
            "vegetables": vegetables_count
        }
    }

@router.get("/food/stores")
async def get_food_stores_admin(
    status: str = None,
    store_type: str = None,
    user: dict = Depends(get_current_user)
):
    """جلب متاجر الطعام للمدير"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    query = {}
    if status == "pending":
        query["is_approved"] = False
    elif status == "approved":
        query["is_approved"] = True
    if store_type:
        query["store_type"] = store_type
    
    stores = await db.food_stores.find(query, {"_id": 0}).sort("created_at", -1).to_list(None)
    return stores

@router.post("/food/stores/{store_id}/approve")
async def approve_food_store(store_id: str, user: dict = Depends(get_current_user)):
    """الموافقة على متجر طعام"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    store = await db.food_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    await db.food_stores.update_one(
        {"id": store_id},
        {"$set": {"is_approved": True, "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # إشعار صاحب المتجر
    await create_notification_for_user(
        user_id=store["owner_id"],
        title="✅ تمت الموافقة على متجرك",
        message=f"تم قبول متجر {store['name']} وأصبح ظاهراً للعملاء",
        notification_type="store_approved"
    )
    
    return {"message": "تمت الموافقة على المتجر"}

@router.post("/food/stores/{store_id}/reject")
async def reject_food_store(
    store_id: str, 
    data: dict = None,
    user: dict = Depends(get_current_user)
):
    """رفض متجر طعام مع سبب الرفض (اختياري)"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    # سبب الرفض اختياري
    reason = data.get("reason", "").strip() if data else ""
    
    store = await db.food_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "is_approved": False,
        "rejected_by": user["id"],
        "rejected_at": now
    }
    if reason:
        update_data["rejection_reason"] = reason
    
    await db.food_stores.update_one(
        {"id": store_id},
        {"$set": update_data}
    )
    
    # إشعار صاحب المتجر
    message = f"تم رفض متجر {store['name']}."
    if reason:
        message += f"\n📝 سبب الرفض: {reason}"
    
    await create_notification_for_user(
        user_id=store["owner_id"],
        title="❌ تم رفض متجرك",
        message=message,
        notification_type="store_rejected"
    )
    
    return {"message": "تم رفض المتجر", "reason": reason if reason else None}

@router.get("/food/commissions")
async def get_food_commissions(user: dict = Depends(get_current_user)):
    """جلب عمولات متاجر الطعام"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    rates = await get_food_commission_rates_from_db()
    return {
        "commissions": rates,
        "types": {
            "restaurants": "مطاعم",
            "groceries": "مواد غذائية",
            "vegetables": "خضروات وفواكه"
        }
    }

@router.put("/food/commissions")
async def update_food_commissions(
    commissions: dict,
    user: dict = Depends(get_current_user)
):
    """تحديث عمولات متاجر الطعام"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    # التحقق من صحة القيم
    for key, value in commissions.items():
        if not isinstance(value, (int, float)) or value < 0 or value > 1:
            raise HTTPException(status_code=400, detail=f"قيمة العمولة غير صالحة: {key}")
    
    await db.commission_rates.update_one(
        {"id": "food"},
        {"$set": {"categories": commissions, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": "تم تحديث العمولات بنجاح", "commissions": commissions}


# ============== إدارة عروض الطعام ==============

@router.get("/food-offers")
async def get_all_food_offers(
    status: str = None,  # all, active, inactive, pending
    user: dict = Depends(get_current_user)
):
    """جلب جميع عروض الطعام للمدير"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    query = {}
    if status == "active":
        query["is_active"] = True
    elif status == "inactive":
        query["is_active"] = False
    elif status == "pending":
        query["admin_approved"] = False
    
    offers = await db.food_offers.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # إضافة معلومات المتجر
    for offer in offers:
        store = await db.food_stores.find_one({"id": offer.get("store_id")}, {"_id": 0, "name": 1, "owner_name": 1})
        if store:
            offer["store_name"] = store.get("name", "")
            offer["owner_name"] = store.get("owner_name", "")
    
    return offers

@router.put("/food-offers/{offer_id}/approve")
async def approve_food_offer(offer_id: str, user: dict = Depends(get_current_user)):
    """موافقة المدير على عرض"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.food_offers.update_one(
        {"id": offer_id},
        {"$set": {"admin_approved": True, "approved_by": user["id"], "approved_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    
    return {"message": "تمت الموافقة على العرض"}

@router.put("/food-offers/{offer_id}/reject")
async def reject_food_offer(offer_id: str, data: dict = None, user: dict = Depends(get_current_user)):
    """رفض المدير لعرض مع سبب الرفض (اختياري)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # سبب الرفض اختياري
    reason = data.get("reason", "").strip() if data else ""
    
    offer = await db.food_offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "is_active": False, 
        "admin_rejected": True, 
        "rejected_by": user["id"], 
        "rejected_at": now
    }
    if reason:
        update_data["rejection_reason"] = reason
    
    result = await db.food_offers.update_one(
        {"id": offer_id},
        {"$set": update_data}
    )
    
    # إشعار صاحب المتجر
    store = await db.food_stores.find_one({"id": offer.get("store_id")})
    if store:
        message = f"تم رفض العرض: {offer.get('name', '')}."
        if reason:
            message += f"\n📝 سبب الرفض: {reason}"
        
        await create_notification_for_user(
            user_id=store["owner_id"],
            title="❌ تم رفض العرض",
            message=message,
            notification_type="offer_rejected"
        )
    
    return {"message": "تم رفض العرض", "reason": reason if reason else None}

@router.put("/food-offers/{offer_id}")
async def admin_update_food_offer(offer_id: str, update_data: dict, user: dict = Depends(get_current_user)):
    """تعديل المدير لعرض (تغيير الكميات، التفعيل/التعطيل)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    offer = await db.food_offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    
    allowed_fields = ["name", "is_active", "buy_quantity", "get_quantity", 
                     "discount_percentage", "discount_amount", "min_order_amount",
                     "start_date", "end_date"]
    
    update = {k: v for k, v in update_data.items() if k in allowed_fields}
    update["updated_by_admin"] = user["id"]
    update["admin_updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if update:
        await db.food_offers.update_one({"id": offer_id}, {"$set": update})
    
    return {"message": "تم تحديث العرض"}

@router.delete("/food-offers/{offer_id}")
async def admin_delete_food_offer(offer_id: str, user: dict = Depends(get_current_user)):
    """حذف المدير لعرض"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.food_offers.delete_one({"id": offer_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    
    return {"message": "تم حذف العرض"}

# ============== عروض الفلاش (Flash Sales) ==============

@router.post("/flash-sales")
async def create_flash_sale(sale_data: dict, user: dict = Depends(get_current_user)):
    """إنشاء عرض فلاش محدود الوقت - للمدير فقط"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    required = ["name", "discount_percentage", "start_time", "end_time"]
    for field in required:
        if field not in sale_data:
            raise HTTPException(status_code=400, detail=f"الحقل {field} مطلوب")
    
    sale_id = str(uuid.uuid4())
    sale_doc = {
        "id": sale_id,
        "name": sale_data["name"],
        "description": sale_data.get("description", ""),
        "discount_percentage": float(sale_data["discount_percentage"]),
        "start_time": sale_data["start_time"],
        "end_time": sale_data["end_time"],
        "sale_scope": sale_data.get("sale_scope", "all"),  # all, food_only, shop_only
        "applicable_categories": sale_data.get("applicable_categories", []),  # فئات الطعام
        "applicable_shop_categories": sale_data.get("applicable_shop_categories", []),  # فئات المتجر
        "applicable_stores": sale_data.get("applicable_stores", []),  # فارغ = جميع المتاجر
        "applicable_products": sale_data.get("applicable_products", []),  # منتجات طعام
        "applicable_shop_products": sale_data.get("applicable_shop_products", []),  # منتجات متجر
        "flash_type": sale_data.get("flash_type", "all"),  # all, categories, products
        "is_active": sale_data.get("is_active", True),
        "banner_image": sale_data.get("banner_image", ""),
        "banner_color": sale_data.get("banner_color", "#FF4500"),
        "usage_count": 0,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.flash_sales.insert_one(sale_doc)
    del sale_doc["_id"]
    
    # إرسال إشعار لجميع المستخدمين إذا طلب ذلك
    if sale_data.get("send_notification", False):
        discount = int(sale_doc["discount_percentage"])
        await send_offer_notification_to_all_users(
            title=f"⚡ {sale_doc['name']}",
            message=f"{sale_doc.get('description', 'عرض فلاش لفترة محدودة!')} - خصم {discount}%",
            offer_type="flash_sale",
            offer_data={"flash_sale_id": sale_id}
        )
    
    return sale_doc

@router.get("/flash-sales")
async def get_all_flash_sales(user: dict = Depends(get_current_user)):
    """جلب جميع عروض الفلاش - للمدير"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    sales = await db.flash_sales.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return sales

@router.put("/flash-sales/{sale_id}")
async def update_flash_sale(sale_id: str, update_data: dict, user: dict = Depends(get_current_user)):
    """تحديث عرض فلاش"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    allowed_fields = ["name", "description", "discount_percentage", "start_time", "end_time",
                     "applicable_categories", "applicable_stores", "applicable_products", 
                     "flash_type", "is_active", "banner_image", "banner_color"]
    
    update = {k: v for k, v in update_data.items() if k in allowed_fields}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.flash_sales.update_one({"id": sale_id}, {"$set": update})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    
    return {"message": "تم تحديث عرض الفلاش"}

@router.delete("/flash-sales/{sale_id}")
async def delete_flash_sale(sale_id: str, user: dict = Depends(get_current_user)):
    """حذف عرض فلاش"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    result = await db.flash_sales.delete_one({"id": sale_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العرض غير موجود")
    
    return {"message": "تم حذف عرض الفلاش"}


# ============== بانرات الصفحة الرئيسية ==============

@router.get("/homepage-banners")
async def get_homepage_banners(user: dict = Depends(get_current_user)):
    """جلب بانرات الصفحة الرئيسية للمدير"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    banners = await db.homepage_banners.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return banners

@router.post("/homepage-banners")
async def create_homepage_banner(banner_data: dict, user: dict = Depends(get_current_user)):
    """إنشاء بانر جديد للصفحة الرئيسية"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    required = ["title"]
    for field in required:
        if field not in banner_data:
            raise HTTPException(status_code=400, detail=f"الحقل {field} مطلوب")
    
    banner_id = str(uuid.uuid4())
    banner_doc = {
        "id": banner_id,
        "title": banner_data["title"],
        "description": banner_data.get("description", ""),
        "image": banner_data.get("image", ""),
        "link": banner_data.get("link", "#"),
        "background_color": banner_data.get("background_color", "#FF6B00"),
        "text_color": banner_data.get("text_color", "#FFFFFF"),
        "order": banner_data.get("order", 0),
        "is_active": banner_data.get("is_active", True),
        "start_date": banner_data.get("start_date"),
        "end_date": banner_data.get("end_date"),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.homepage_banners.insert_one(banner_doc)
    del banner_doc["_id"]
    
    return banner_doc

@router.put("/homepage-banners/{banner_id}")
async def update_homepage_banner(banner_id: str, update_data: dict, user: dict = Depends(get_current_user)):
    """تحديث بانر"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    allowed_fields = ["title", "description", "image", "link", "background_color", 
                     "text_color", "order", "is_active", "start_date", "end_date"]
    
    update = {k: v for k, v in update_data.items() if k in allowed_fields}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.homepage_banners.update_one({"id": banner_id}, {"$set": update})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="البانر غير موجود")
    
    return {"message": "تم تحديث البانر"}

@router.delete("/homepage-banners/{banner_id}")
async def delete_homepage_banner(banner_id: str, user: dict = Depends(get_current_user)):
    """حذف بانر"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    result = await db.homepage_banners.delete_one({"id": banner_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="البانر غير موجود")
    
    return {"message": "تم حذف البانر"}


# ============== بانرات قسم الطعام ==============

@router.get("/food-banners")
async def get_all_food_banners(user: dict = Depends(get_current_user)):
    """جلب جميع بانرات الطعام للمدير"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    banners = await db.food_banners.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    return banners

@router.post("/food-banners")
async def create_food_banner(banner_data: dict, user: dict = Depends(get_current_user)):
    """إنشاء بانر جديد لقسم الطعام"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    banner_id = str(uuid.uuid4())
    banner_doc = {
        "id": banner_id,
        "title": banner_data.get("title", ""),
        "description": banner_data.get("description", ""),
        "image": banner_data.get("image", ""),
        "link": banner_data.get("link", "/food"),
        "background_color": banner_data.get("background_color", "#22C55E"),
        "text_color": banner_data.get("text_color", "#FFFFFF"),
        "category": banner_data.get("category"),  # restaurants, groceries, vegetables
        "order": banner_data.get("order", 0),
        "is_active": banner_data.get("is_active", True),
        "start_date": banner_data.get("start_date"),
        "end_date": banner_data.get("end_date"),
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.food_banners.insert_one(banner_doc)
    del banner_doc["_id"]
    
    return banner_doc

@router.put("/food-banners/{banner_id}")
async def update_food_banner(banner_id: str, update_data: dict, user: dict = Depends(get_current_user)):
    """تحديث بانر طعام"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    allowed_fields = ["title", "description", "image", "link", "background_color", 
                     "text_color", "category", "order", "is_active", "start_date", "end_date"]
    
    update = {k: v for k, v in update_data.items() if k in allowed_fields}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.food_banners.update_one({"id": banner_id}, {"$set": update})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="البانر غير موجود")
    
    return {"message": "تم تحديث البانر"}

@router.delete("/food-banners/{banner_id}")
async def delete_food_banner(banner_id: str, user: dict = Depends(get_current_user)):
    """حذف بانر طعام"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    result = await db.food_banners.delete_one({"id": banner_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="البانر غير موجود")
    
    return {"message": "تم حذف البانر"}


# ============== طلبات البائعين للانضمام لعروض الفلاش ==============

@router.get("/flash-sale-requests")
async def get_flash_sale_requests(
    status: str = None,  # pending, approved, rejected, all
    user: dict = Depends(get_current_user)
):
    """جلب طلبات البائعين للانضمام لعروض الفلاش"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    query = {}
    if status and status != "all":
        query["status"] = status
    
    requests = await db.flash_sale_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # إضافة معلومات المتجر والمنتج
    for req in requests:
        store = await db.food_stores.find_one({"id": req.get("store_id")}, {"_id": 0, "name": 1, "owner_name": 1})
        if store:
            req["store_name"] = store.get("name", "")
            req["owner_name"] = store.get("owner_name", "")
        
        # معلومات المنتجات المختارة
        if req.get("product_ids"):
            products = await db.food_products.find(
                {"id": {"$in": req["product_ids"]}},
                {"_id": 0, "id": 1, "name": 1, "price": 1}
            ).to_list(None)
            req["products"] = products
        
        # معلومات عرض الفلاش
        flash_sale = await db.flash_sales.find_one({"id": req.get("flash_sale_id")}, {"_id": 0, "name": 1, "discount_percentage": 1})
        if flash_sale:
            req["flash_sale_name"] = flash_sale.get("name", "")
            req["discount_percentage"] = flash_sale.get("discount_percentage", 0)
    
    # إحصائيات
    stats = {
        "pending": await db.flash_sale_requests.count_documents({"status": "pending"}),
        "approved": await db.flash_sale_requests.count_documents({"status": "approved"}),
        "rejected": await db.flash_sale_requests.count_documents({"status": "rejected"}),
        "total": len(requests)
    }
    
    return {"requests": requests, "stats": stats}

@router.put("/flash-sale-requests/{request_id}/approve")
async def approve_flash_sale_request(request_id: str, user: dict = Depends(get_current_user)):
    """موافقة المدير على طلب انضمام لعرض فلاش"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    req = await db.flash_sale_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="الطلب ليس في حالة انتظار")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # تحديث الطلب
    await db.flash_sale_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "approved",
                "approved_by": user["id"],
                "approved_at": now
            }
        }
    )
    
    # إضافة المنتجات لعرض الفلاش
    flash_sale = await db.flash_sales.find_one({"id": req["flash_sale_id"]})
    if flash_sale:
        current_products = flash_sale.get("applicable_products", [])
        new_products = list(set(current_products + req.get("product_ids", [])))
        
        await db.flash_sales.update_one(
            {"id": req["flash_sale_id"]},
            {
                "$set": {
                    "applicable_products": new_products,
                    "flash_type": "products" if new_products else flash_sale.get("flash_type", "all")
                }
            }
        )
    
    # إشعار صاحب المتجر
    store = await db.food_stores.find_one({"id": req["store_id"]})
    if store:
        await create_notification_for_user(
            user_id=store["owner_id"],
            title="✅ تمت الموافقة على طلب الانضمام للفلاش",
            message=f"تمت الموافقة على منتجاتك للانضمام لعرض الفلاش",
            notification_type="flash_request_approved"
        )
    
    return {"message": "تمت الموافقة على الطلب وإضافة المنتجات لعرض الفلاش"}

@router.put("/flash-sale-requests/{request_id}/reject")
async def reject_flash_sale_request(
    request_id: str, 
    reason: str = "لم يستوفِ الشروط",
    refund: bool = True,
    user: dict = Depends(get_current_user)
):
    """رفض طلب انضمام لعرض فلاش مع إمكانية استرداد الرسوم"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    req = await db.flash_sale_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="الطلب ليس في حالة انتظار")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # تحديث الطلب
    await db.flash_sale_requests.update_one(
        {"id": request_id},
        {
            "$set": {
                "status": "rejected",
                "rejection_reason": reason,
                "rejected_by": user["id"],
                "rejected_at": now,
                "refunded": refund
            }
        }
    )
    
    # استرداد الرسوم إذا تم الدفع
    store = await db.food_stores.find_one({"id": req["store_id"]})
    if store and refund and req.get("fee_paid", 0) > 0:
        # استرداد للمحفظة
        wallet = await db.wallets.find_one({"user_id": store["owner_id"]})
        if wallet:
            await db.wallets.update_one(
                {"user_id": store["owner_id"]},
                {"$inc": {"balance": req["fee_paid"]}}
            )
            
            # تسجيل المعاملة
            transaction = {
                "id": str(uuid.uuid4()),
                "wallet_id": wallet["id"],
                "user_id": store["owner_id"],
                "type": "refund",
                "amount": req["fee_paid"],
                "description": f"استرداد رسوم طلب الانضمام لعرض الفلاش - {reason}",
                "created_at": now
            }
            await db.wallet_transactions.insert_one(transaction)
    
    # إشعار صاحب المتجر
    if store:
        message = f"تم رفض طلب الانضمام لعرض الفلاش. السبب: {reason}"
        if refund and req.get("fee_paid", 0) > 0:
            message += f"\n✅ تم استرداد الرسوم ({req['fee_paid']:,} ل.س) إلى محفظتك"
        
        await create_notification_for_user(
            user_id=store["owner_id"],
            title="❌ تم رفض طلب الانضمام للفلاش",
            message=message,
            notification_type="flash_request_rejected"
        )
    
    return {"message": "تم رفض الطلب", "refunded": refund}


# ============== إعدادات رسوم الفلاش ==============

@router.get("/flash-sale-settings")
async def get_flash_sale_settings(user: dict = Depends(get_current_user)):
    """جلب إعدادات رسوم الانضمام للفلاش"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    settings = await db.platform_settings.find_one({"id": "flash_sale"}, {"_id": 0})
    
    if not settings:
        # إعدادات افتراضية
        settings = {
            "id": "flash_sale",
            "join_fee": 5000,  # رسوم الانضمام لكل منتج
            "min_products": 1,
            "max_products": 10,
            "require_approval": True,
            "allow_all_stores": True
        }
    
    return settings

@router.put("/flash-sale-settings")
async def update_flash_sale_settings(settings_data: dict, user: dict = Depends(get_current_user)):
    """تحديث إعدادات رسوم الفلاش"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    allowed_fields = ["join_fee", "min_products", "max_products", "require_approval", "allow_all_stores"]
    update = {k: v for k, v in settings_data.items() if k in allowed_fields}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_by"] = user["id"]
    
    await db.platform_settings.update_one(
        {"id": "flash_sale"},
        {"$set": update},
        upsert=True
    )
    
    return {"message": "تم تحديث الإعدادات"}
