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
            # إغلاق المنصة
            "platform_closed_for_customers": False,  # إغلاق المنصة للعملاء
            "platform_closed_for_sellers": False,    # إغلاق المنصة للبائعين
            "platform_closed_message": "المنصة مغلقة مؤقتاً، سنعود قريباً!",
            "platform_closed_message_sellers": "المنصة مغلقة للبائعين مؤقتاً للصيانة",
            # إعدادات الدعم
            "whatsapp_enabled": True,
            "whatsapp_number": "963945570365",
            "support_message": "مرحباً، أريد الاستفسار عن خدمات ترند سورية",
            # إعدادات الشحن المجاني
            "products_free_shipping_threshold": 150000,  # حد الشحن المجاني للمنتجات
            "food_free_delivery_threshold": 100000,      # حد التوصيل المجاني للطعام
            # إعدادات التوصيل
            "max_food_orders_per_driver": 3,             # الحد الأقصى لطلبات الطعام للسائق
            "food_orders_max_distance_km": 2,            # المسافة القصوى بين طلبات الطعام (كم)
            # إعدادات التغليف
            "gift_wrapping_enabled": True,               # تغليف الهدايا
            "gift_wrapping_price": 5000,                 # سعر تغليف الهدايا
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.platform_settings.insert_one(settings)
    
    return settings

@router.put("/settings")
async def update_platform_settings(data: dict, user: dict = Depends(get_current_user)):
    """تحديث إعدادات المنصة مع إشعارات قابلة للتخصيص"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    # جلب الإعدادات الحالية للمقارنة
    current_settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    
    # استخراج بيانات الإشعار المخصص (إن وجد)
    custom_notification = data.pop("notification", None)
    
    # الحقول المنطقية (boolean)
    boolean_fields = [
        "food_enabled", "shop_enabled", "delivery_enabled",
        "wallet_enabled", "referral_enabled", "daily_deals_enabled",
        "flash_sales_enabled", "whatsapp_enabled",
        "platform_closed_for_customers", "platform_closed_for_sellers",
        "gift_wrapping_enabled"
    ]
    
    # الحقول النصية (string)
    string_fields = ["whatsapp_number", "support_message", "platform_closed_message", "platform_closed_message_sellers"]
    
    # الحقول الرقمية (number)
    number_fields = ["products_free_shipping_threshold", "food_free_delivery_threshold", "gift_wrapping_price"]
    
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    activated_sections = []
    
    # معالجة الحقول المنطقية
    for field in boolean_fields:
        if field in data:
            new_value = bool(data[field])
            update[field] = new_value
            
            # تتبع الأقسام التي تم تفعيلها
            was_disabled = current_settings is None or not current_settings.get(field, True)
            if new_value and was_disabled:
                activated_sections.append(field)
    
    # معالجة الحقول النصية (لا نحولها لـ bool)
    for field in string_fields:
        if field in data:
            update[field] = str(data[field])
    
    # معالجة الحقول الرقمية
    for field in number_fields:
        if field in data:
            try:
                update[field] = int(data[field])
            except (ValueError, TypeError):
                pass
    
    await db.platform_settings.update_one(
        {"id": "main"},
        {"$set": update},
        upsert=True
    )
    
    # إرسال الإشعار للأقسام المفعلة
    notifications_sent = 0
    for section in activated_sections:
        if custom_notification:
            # استخدام الإشعار المخصص من المدير
            notifications_sent += await send_platform_activation_notification(
                section,
                custom_notification.get("title", ""),
                custom_notification.get("message", "")
            )
        # لا نرسل إشعار تلقائي إذا لم يحدد المدير إشعار
    
    return {
        "message": "تم تحديث الإعدادات", 
        "settings": update,
        "notifications_sent": notifications_sent
    }

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



# ============== حالة المنصة (للعملاء والبائعين) ==============

@router.get("/platform-status")
async def get_platform_status():
    """التحقق من حالة المنصة - متاح للجميع"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        return {
            "platform_closed_for_customers": False,
            "platform_closed_for_sellers": False,
            "platform_closed_message": "",
            "platform_closed_message_sellers": ""
        }
    
    return {
        "platform_closed_for_customers": settings.get("platform_closed_for_customers", False),
        "platform_closed_for_sellers": settings.get("platform_closed_for_sellers", False),
        "platform_closed_message": settings.get("platform_closed_message", "المنصة مغلقة مؤقتاً"),
        "platform_closed_message_sellers": settings.get("platform_closed_message_sellers", "المنصة مغلقة للبائعين مؤقتاً للصيانة")
    }



# ============== أعداد طلبات الاتصال والطوارئ ==============

@router.get("/call-requests/count")
async def get_call_requests_count(user: dict = Depends(get_current_user)):
    """جلب عدد طلبات الاتصال المعلقة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للإدارة فقط")
    
    count = await db.call_requests.count_documents({"status": "pending"})
    return {"count": count}

@router.get("/emergency-help/count")
async def get_emergency_help_count(user: dict = Depends(get_current_user)):
    """جلب عدد طلبات الطوارئ المعلقة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للإدارة فقط")
    
    count = await db.emergency_help.count_documents({"status": "pending"})
    return {"count": count}


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
        "flash_sales_enabled": True,
        "whatsapp_enabled": True,
        "whatsapp_number": "963945570365",
        "support_message": "مرحباً، أريد الاستفسار عن خدمات ترند سورية"
    }
    
    if not settings:
        return default_settings
    
    # دمج الإعدادات الافتراضية مع المحفوظة
    for key, value in default_settings.items():
        if key not in settings:
            settings[key] = value
    
    # إرجاع الحقول المطلوبة
    return {
        "food_enabled": settings.get("food_enabled", True),
        "shop_enabled": settings.get("shop_enabled", True),
        "delivery_enabled": settings.get("delivery_enabled", True),
        "wallet_enabled": settings.get("wallet_enabled", True),
        "referral_enabled": settings.get("referral_enabled", True),
        "daily_deals_enabled": settings.get("daily_deals_enabled", True),
        "flash_sales_enabled": settings.get("flash_sales_enabled", True),
        # إعدادات الدعم
        "whatsapp_enabled": settings.get("whatsapp_enabled", True),
        "whatsapp_number": settings.get("whatsapp_number", "963945570365"),
        "support_message": settings.get("support_message", "مرحباً، أريد الاستفسار عن خدمات ترند سورية"),
        # إعدادات الشحن المجاني
        "products_free_shipping_threshold": settings.get("products_free_shipping_threshold", 150000),
        "food_free_delivery_threshold": settings.get("food_free_delivery_threshold", 100000),
        # إعدادات إغلاق المنصة
        "platform_closed_for_customers": settings.get("platform_closed_for_customers", False),
        "platform_closed_for_sellers": settings.get("platform_closed_for_sellers", False),
        "platform_closed_message": settings.get("platform_closed_message", "المنصة مغلقة مؤقتاً، سنعود قريباً!"),
        "platform_closed_message_sellers": settings.get("platform_closed_message_sellers", "المنصة مغلقة للبائعين مؤقتاً للصيانة")
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


async def send_flash_sale_notification_to_sellers(title: str, message: str, flash_sale_id: str, sale_scope: str = "all"):
    """إرسال إشعار عرض فلاش للبائعين فقط لدعوتهم للمشاركة"""
    now = datetime.now(timezone.utc).isoformat()
    
    # تحديد نوع البائعين بناءً على نطاق العرض
    if sale_scope == "food_only":
        seller_types = ["food_seller"]
    elif sale_scope == "shop_only":
        seller_types = ["seller"]
    else:  # all
        seller_types = ["seller", "food_seller"]
    
    # جلب البائعين المعتمدين فقط
    sellers = await db.users.find(
        {
            "user_type": {"$in": seller_types},
            "is_verified": True
        },
        {"_id": 0, "id": 1}
    ).to_list(10000)
    
    if not sellers:
        return 0
    
    # إنشاء الإشعارات
    notifications = []
    for seller in sellers:
        notifications.append({
            "id": str(uuid.uuid4()),
            "user_id": seller["id"],
            "title": title,
            "message": message,
            "type": "flash_sale_invitation",
            "data": {"flash_sale_id": flash_sale_id},
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
    "fast_food": 0.20,    # وجبات سريعة
    "market": 0.15,       # ماركت
    "vegetables": 0.12,   # خضروات وفواكه
    "sweets": 0.18,       # حلويات
    "groceries": 0.15,    # مواد غذائية
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

# ============== Users/Drivers Delete & Ban ==============

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(get_current_user)):
    """حذف مستخدم أو سائق"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # لا يمكن حذف الأدمن الرئيسي
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    if target_user.get("user_type") == "admin":
        raise HTTPException(status_code=403, detail="لا يمكن حذف الأدمن الرئيسي")
    
    # حذف المستخدم
    await db.users.delete_one({"id": user_id})
    
    # حذف البيانات المرتبطة
    await db.wallets.delete_one({"user_id": user_id})
    await db.notifications.delete_many({"user_id": user_id})
    
    # إذا كان سائق، حذف بيانات التوصيل
    if target_user.get("user_type") == "delivery":
        await db.delivery_documents.delete_one({"driver_id": user_id})
        await db.driver_locations.delete_one({"driver_id": user_id})
        await db.driver_security_deposits.delete_one({"driver_id": user_id})
    
    # إذا كان بائع، حذف بيانات البائع
    if target_user.get("user_type") == "seller":
        await db.seller_documents.delete_one({"seller_id": user_id})
        await db.products.delete_many({"seller_id": user_id})
        # حذف طلبات الترويج والفلاش
        await db.product_promotions.delete_many({"seller_id": user_id})
    
    # إذا كان بائع طعام، حذف بيانات متجر الطعام
    if target_user.get("user_type") == "food_seller":
        # جلب المتجر أولاً للحصول على store_id
        store = await db.food_stores.find_one({"owner_id": user_id})
        if store:
            # حذف طلبات الفلاش المرتبطة بالمتجر
            await db.flash_sale_requests.delete_many({"store_id": store["id"]})
        await db.food_stores.delete_one({"owner_id": user_id})
        await db.food_items.delete_many({"seller_id": user_id})
    
    return {"message": "تم حذف المستخدم بنجاح"}

@router.post("/users/{user_id}/ban")
async def ban_user(user_id: str, user: dict = Depends(get_current_user)):
    """حظر مستخدم أو سائق"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    if target_user.get("user_type") == "admin":
        raise HTTPException(status_code=403, detail="لا يمكن حظر الأدمن الرئيسي")
    
    # تبديل حالة الحظر
    current_status = target_user.get("is_banned", False)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_banned": not current_status}}
    )
    
    action = "حظر" if not current_status else "إلغاء حظر"
    return {"message": f"تم {action} المستخدم بنجاح", "is_banned": not current_status}

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
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": seller_id}, {"$set": {"is_approved": True}})
    await db.seller_documents.update_one({"seller_id": seller_id}, {"$set": {"status": "approved", "approved_at": now}})
    
    # إرسال إشعار للبائع بالموافقة
    seller = await db.users.find_one({"id": seller_id})
    if seller:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": seller_id,
            "title": "✅ تم قبول طلبك!",
            "message": "مبروك! تم قبول طلبك كبائع. يمكنك الآن إضافة منتجاتك والبدء بالبيع.",
            "type": "seller_approved",
            "is_read": False,
            "created_at": now
        })
    
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


@router.post("/sellers/{seller_id}/suspend")
async def suspend_seller(seller_id: str, data: dict = None, user: dict = Depends(get_current_user)):
    """إيقاف حساب بائع"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    seller = await db.users.find_one({"id": seller_id, "user_type": "seller"})
    if not seller:
        raise HTTPException(status_code=404, detail="البائع غير موجود")
    
    reason = data.get("reason", "") if data else ""
    now = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": seller_id},
        {
            "$set": {
                "is_suspended": True,
                "suspended_at": now,
                "suspension_reason": reason or "إيقاف من قبل الإدارة",
                "suspended_by": user["id"]
            }
        }
    )
    
    # إشعار البائع
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": seller_id,
        "title": "⛔ تم إيقاف حسابك",
        "message": "تم إيقاف حسابك من قبل الإدارة" + (f". السبب: {reason}" if reason else ""),
        "type": "account_suspended",
        "is_read": False,
        "created_at": now
    })
    
    return {"message": "تم إيقاف حساب البائع بنجاح"}


@router.post("/sellers/{seller_id}/activate")
async def activate_seller(seller_id: str, user: dict = Depends(get_current_user)):
    """إعادة تفعيل حساب بائع"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    seller = await db.users.find_one({"id": seller_id, "user_type": "seller"})
    if not seller:
        raise HTTPException(status_code=404, detail="البائع غير موجود")
    
    await db.users.update_one(
        {"id": seller_id},
        {
            "$set": {"is_suspended": False},
            "$unset": {
                "suspended_at": "",
                "suspension_reason": "",
                "suspended_by": ""
            }
        }
    )
    
    # إشعار البائع
    now = datetime.now(timezone.utc).isoformat()
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": seller_id,
        "title": "✅ تم تفعيل حسابك",
        "message": "تم إعادة تفعيل حسابك. يمكنك الآن استقبال الطلبات",
        "type": "account_activated",
        "is_read": False,
        "created_at": now
    })
    
    return {"message": "تم تفعيل حساب البائع بنجاح"}


@router.delete("/sellers/{seller_id}")
async def delete_seller(seller_id: str, user: dict = Depends(get_current_user)):
    """حذف حساب بائع نهائياً (للأدمن)"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    seller = await db.users.find_one({"id": seller_id, "user_type": "seller"})
    if not seller:
        raise HTTPException(status_code=404, detail="البائع غير موجود")
    
    # التحقق من عدم وجود طلبات نشطة
    active_orders = await db.orders.count_documents({
        "seller_id": seller_id,
        "status": {"$nin": ["delivered", "cancelled"]}
    })
    
    if active_orders > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"لا يمكن حذف البائع - لديه {active_orders} طلب نشط"
        )
    
    now = datetime.now(timezone.utc).isoformat()
    
    # حفظ بيانات البائع في سجل الحذف
    await db.deleted_sellers.insert_one({
        "id": str(uuid.uuid4()),
        "original_seller_id": seller_id,
        "seller_data": seller,
        "deleted_by": user["id"],
        "deleted_at": now
    })
    
    # حذف بيانات البائع
    await db.users.delete_one({"id": seller_id})
    await db.wallets.delete_one({"user_id": seller_id})
    await db.seller_documents.delete_one({"seller_id": seller_id})
    # حذف طلبات الترويج المرتبطة بالبائع
    await db.product_promotions.delete_many({"seller_id": seller_id})
    # حذف المنتجات (اختياري - يمكن الاحتفاظ بها)
    # await db.products.delete_many({"seller_id": seller_id})
    
    return {"message": "تم حذف حساب البائع نهائياً"}


@router.get("/sellers/with-status")
async def get_all_sellers_with_status(user: dict = Depends(get_current_user)):
    """جلب جميع البائعين مع حالاتهم"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    sellers = await db.users.find(
        {"user_type": "seller"},
        {
            "_id": 0, 
            "id": 1, 
            "name": 1, 
            "store_name": 1,
            "phone": 1,
            "is_approved": 1,
            "is_suspended": 1,
            "suspended_at": 1,
            "suspension_reason": 1,
            "created_at": 1
        }
    ).to_list(500)
    
    # إضافة إحصائيات
    for seller in sellers:
        # عدد المنتجات
        products_count = await db.products.count_documents({"seller_id": seller["id"]})
        seller["products_count"] = products_count
        
        # عدد الطلبات المكتملة
        completed_orders = await db.orders.count_documents({
            "seller_id": seller["id"],
            "status": "delivered"
        })
        seller["completed_orders"] = completed_orders
    
    return sellers


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
    
    # جلب المنتج أولاً
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    await db.products.update_one(
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
    
    # إرسال إشعار للبائع
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": product.get("seller_id"),
        "title": "تم قبول منتجك ✅",
        "message": f"تمت الموافقة على منتج '{product.get('name')}' وهو الآن متاح للعملاء",
        "type": "product_approved",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "تم الموافقة على المنتج"}

@router.post("/products/{product_id}/reject")
async def reject_product(product_id: str, approval: ProductApproval, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # جلب المنتج أولاً
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    await db.products.update_one(
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
    
    # إرسال إشعار للبائع
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": product.get("seller_id"),
        "title": "تم رفض منتجك ❌",
        "message": f"تم رفض منتج '{product.get('name')}'. السبب: {approval.rejection_reason or 'غير محدد'}",
        "type": "product_rejected",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "تم رفض المنتج"}

# ============== موافقة منتجات الطعام ==============

@router.get("/food-products/pending")
async def get_pending_food_products(user: dict = Depends(get_current_user)):
    """جلب منتجات الطعام بانتظار الموافقة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    products = await db.food_products.find(
        {"approval_status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for product in products:
        store = await db.food_stores.find_one({"id": product.get("store_id")}, {"_id": 0})
        if store:
            product["store"] = store
    
    return products

@router.post("/food-products/{product_id}/approve")
async def approve_food_product(product_id: str, user: dict = Depends(get_current_user)):
    """الموافقة على منتج طعام"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # البحث عن المنتج
    product = await db.food_products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    await db.food_products.update_one(
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
    
    # إرسال إشعار للبائع
    store = await db.food_stores.find_one({"id": product.get("store_id")})
    if store:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": store.get("owner_id"),
            "title": "تم قبول منتجك ✅",
            "message": f"تمت الموافقة على منتج '{product.get('name')}' وهو الآن متاح للعملاء",
            "type": "product_approved",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "تم الموافقة على المنتج"}

@router.post("/food-products/{product_id}/reject")
async def reject_food_product(product_id: str, approval: ProductApproval, user: dict = Depends(get_current_user)):
    """رفض منتج طعام"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    product = await db.food_products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    await db.food_products.update_one(
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
    
    # إرسال إشعار للبائع
    store = await db.food_stores.find_one({"id": product.get("store_id")})
    if store:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": store.get("owner_id"),
            "title": "تم رفض منتجك ❌",
            "message": f"تم رفض منتج '{product.get('name')}'. السبب: {approval.rejection_reason or 'غير محدد'}",
            "type": "product_rejected",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
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
    
    now = datetime.now(timezone.utc).isoformat()
    
    # جلب وثائق السائق للحصول على الصورة الشخصية
    doc = await db.delivery_documents.find_one(
        {"$or": [{"driver_id": driver_id}, {"delivery_id": driver_id}]}
    )
    
    if not doc:
        raise HTTPException(status_code=404, detail="لم يتم العثور على الوثائق")
    
    await db.delivery_documents.update_one(
        {"$or": [{"driver_id": driver_id}, {"delivery_id": driver_id}]},
        {"$set": {"status": "approved", "approved_at": now}}
    )
    
    # تحديث بيانات المستخدم مع الصورة الشخصية
    user_update = {"is_approved": True}
    if doc.get("personal_photo"):
        user_update["photo"] = doc["personal_photo"]
    
    await db.users.update_one({"id": driver_id}, {"$set": user_update})
    
    # إرسال إشعار لموظف التوصيل بالموافقة
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": driver_id,
        "title": "✅ تم قبول طلبك!",
        "message": "مبروك! تم قبول طلبك كموظف توصيل. يمكنك الآن البدء باستلام الطلبات.",
        "type": "delivery_approved",
        "is_read": False,
        "created_at": now
    })
    
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

# ============== Platform Wallet (محفظة المنصة) ==============

PLATFORM_WALLET_ID = "platform_admin_wallet"

@router.get("/platform-wallet")
async def get_platform_wallet(user: dict = Depends(get_current_user)):
    """جلب محفظة المنصة - للمدير فقط"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    wallet = await db.platform_wallet.find_one({"id": PLATFORM_WALLET_ID}, {"_id": 0})
    if not wallet:
        wallet = {
            "id": PLATFORM_WALLET_ID,
            "balance": 0,
            "total_commission_products": 0,
            "total_commission_food": 0,
            "total_withdrawn": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.platform_wallet.insert_one(wallet)
    
    return wallet

@router.get("/platform-wallet/transactions")
async def get_platform_wallet_transactions(
    user: dict = Depends(get_current_user),
    limit: int = 50
):
    """جلب معاملات محفظة المنصة"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    transactions = await db.platform_wallet_transactions.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return transactions

@router.post("/platform-wallet/withdraw")
async def withdraw_from_platform_wallet(
    amount: int,
    note: str = "",
    user: dict = Depends(get_current_user)
):
    """سحب من محفظة المنصة"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    wallet = await db.platform_wallet.find_one({"id": PLATFORM_WALLET_ID})
    if not wallet or wallet.get("balance", 0) < amount:
        raise HTTPException(status_code=400, detail="رصيد غير كافٍ")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # تحديث الرصيد
    await db.platform_wallet.update_one(
        {"id": PLATFORM_WALLET_ID},
        {
            "$inc": {"balance": -amount, "total_withdrawn": amount},
            "$set": {"updated_at": now}
        }
    )
    
    # تسجيل المعاملة
    transaction = {
        "id": str(uuid.uuid4()),
        "type": "withdrawal",
        "amount": -amount,
        "created_at": now,
        "withdrawn_by": user["id"],
        "note": note,
        "description": "سحب من محفظة المنصة"
    }
    await db.platform_wallet_transactions.insert_one(transaction)
    
    return {"message": "تم السحب بنجاح", "amount": amount, "new_balance": wallet["balance"] - amount}

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
    
    # جلب النسب القديمة للمقارنة
    old_rates = await get_commission_rates_from_db()
    
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
    
    # إرسال إشعارات للبائعين عند تغيير العمولة
    changed_categories = []
    for category, new_rate in rates.items():
        old_rate = old_rates.get(category, 0)
        if old_rate != new_rate:
            changed_categories.append({
                "category": category,
                "old_rate": old_rate,
                "new_rate": new_rate
            })
    
    if changed_categories:
        # جلب جميع البائعين (عاديين + طعام)
        sellers = await db.users.find(
            {"user_type": {"$in": ["seller", "food_seller"]}}, 
            {"_id": 0, "id": 1, "name": 1}
        ).to_list(None)
        
        for change in changed_categories:
            category = change["category"]
            old_percentage = f"{change['old_rate'] * 100:.0f}%"
            new_percentage = f"{change['new_rate'] * 100:.0f}%"
            
            # إنشاء إشعار لكل بائع
            for seller in sellers:
                notification = {
                    "id": str(uuid.uuid4()),
                    "user_id": seller["id"],
                    "type": "commission_update",
                    "title": "📢 تحديث نسبة العمولة",
                    "message": f"تم تغيير نسبة العمولة لفئة '{category}' من {old_percentage} إلى {new_percentage}",
                    "data": {
                        "category": category,
                        "old_rate": change["old_rate"],
                        "new_rate": change["new_rate"]
                    },
                    "read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.notifications.insert_one(notification)
    
    return {"message": "تم تحديث نسب العمولات بنجاح", "rates": rates, "notifications_sent": len(changed_categories) > 0}

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
    
    # إرسال إشعار لجميع البائعين (عاديين + طعام)
    sellers = await db.users.find(
        {"user_type": {"$in": ["seller", "food_seller"]}}, 
        {"_id": 0, "id": 1}
    ).to_list(None)
    for seller in sellers:
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": seller["id"],
            "type": "commission_update",
            "title": "📢 فئة عمولة جديدة",
            "message": f"تم إضافة فئة '{category}' بنسبة عمولة {rate * 100:.0f}%",
            "data": {"category": category, "rate": rate},
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
    return {"message": f"تم إضافة فئة {category} بنسبة {rate * 100:.0f}%"}

@router.delete("/commissions/rates/category/{category}")
async def delete_commission_category(category: str, user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    if category == "default":
        raise HTTPException(status_code=400, detail="لا يمكن حذف الفئة الافتراضية")
    
    current_rates = await get_commission_rates_from_db()
    old_rate = current_rates.get(category, 0)
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
    
    # إرسال إشعار لجميع البائعين (عاديين + طعام)
    sellers = await db.users.find(
        {"user_type": {"$in": ["seller", "food_seller"]}}, 
        {"_id": 0, "id": 1}
    ).to_list(None)
    for seller in sellers:
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": seller["id"],
            "type": "commission_update",
            "title": "📢 حذف فئة عمولة",
            "message": f"تم حذف فئة '{category}' (كانت {old_rate * 100:.0f}%) - ستُطبق العمولة الافتراضية على منتجات هذه الفئة",
            "data": {"category": category, "old_rate": old_rate},
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)
    
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
    
    # جلب فقط الإشعارات التي أنشأها الأدمن (لها created_by أو target)
    # وليس إشعارات المستخدمين الشخصية
    notifications = await db.notifications.find(
        {
            "$or": [
                {"created_by": {"$exists": True}},  # إشعارات أنشأها أدمن
                {"target": {"$exists": True}}        # إشعارات موجهة لمجموعة
            ]
        },
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
        "suspended": len([r for r in reports if r["status"] == "suspended"]),
        "reviewed": len([r for r in reports if r["status"] == "reviewed"]),
        "dismissed": len([r for r in reports if r["status"] == "dismissed"]),
        "penalized": len([r for r in reports if r["status"] == "penalized"]),
        "terminated": len([r for r in reports if r["status"] == "terminated"]),
        "total": len(reports)
    }
    
    return {"reports": reports, "stats": stats}

@router.put("/driver-reports/{report_id}")
async def handle_driver_report(report_id: str, action: str, admin_notes: str = "", user: dict = Depends(get_current_user)):
    """اتخاذ إجراء بشأن البلاغ"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    if action not in ["dismiss", "suspend", "penalize", "terminate"]:
        raise HTTPException(status_code=400, detail="الإجراء يجب أن يكون dismiss أو suspend أو penalize أو terminate")
    
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
    
    if action == "suspend":
        # تعليق الحساب مؤقتاً
        await db.driver_reports.update_one(
            {"id": report_id},
            {
                "$set": {
                    "status": "suspended",
                    "reviewed_at": now,
                    "reviewed_by": user["id"],
                    "admin_notes": admin_notes
                }
            }
        )
        
        # تعليق الموظف
        await db.users.update_one(
            {"id": driver_id},
            {
                "$set": {
                    "is_suspended": True,
                    "suspended_at": now,
                    "suspension_reason": f"بلاغ أخلاقي: {report.get('category_label', 'غير محدد')}"
                }
            }
        )
        
        # تحديث وثائق التوصيل
        await db.delivery_documents.update_one(
            {"$or": [{"driver_id": driver_id}, {"delivery_id": driver_id}]},
            {
                "$set": {
                    "status": "suspended",
                    "suspended_at": now,
                    "suspension_reason": "بلاغ أخلاقي - تعليق بقرار إداري"
                }
            }
        )
        
        # إشعار الموظف
        await create_notification_for_user(
            user_id=driver_id,
            title="⚠️ تم تعليق حسابك مؤقتاً",
            message="تمت مراجعة البلاغ المقدم بحقك وتقرر تعليق حسابك مؤقتاً. يرجى التواصل مع الإدارة.",
            notification_type="account_suspended"
        )
        
        return {"message": "تم تعليق حساب الموظف مؤقتاً"}
    
    elif action == "dismiss":
        # رفض البلاغ - الموظف غير معلق أساساً، فقط نرفض البلاغ
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
        
        # إذا كان الموظف معلقاً (تم تعليقه يدوياً)، نعيد تفعيله
        driver = await db.users.find_one({"id": driver_id}, {"_id": 0, "is_suspended": 1})
        if driver and driver.get("is_suspended"):
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
                message="تمت مراجعة البلاغ وتقرر رفضه ورفع التعليق عن حسابك. يمكنك استئناف العمل.",
                notification_type="account_reactivated"
            )
            
            return {"message": "تم رفض البلاغ وإعادة تفعيل حساب الموظف"}
        else:
            # الموظف ليس معلقاً، فقط نُشعره برفض البلاغ
            await create_notification_for_user(
                user_id=driver_id,
                title="✅ تم رفض البلاغ المقدم بحقك",
                message="تمت مراجعة البلاغ من قبل الإدارة وتقرر رفضه. لا يوجد إجراء ضدك.",
                notification_type="report_dismissed"
            )
            
            return {"message": "تم رفض البلاغ"}
    
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


@router.post("/food/stores/{store_id}/suspend")
async def suspend_food_store(store_id: str, data: dict = None, user: dict = Depends(get_current_user)):
    """إيقاف متجر طعام"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    store = await db.food_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    reason = data.get("reason", "") if data else ""
    now = datetime.now(timezone.utc).isoformat()
    
    await db.food_stores.update_one(
        {"id": store_id},
        {
            "$set": {
                "is_suspended": True,
                "suspended_at": now,
                "suspension_reason": reason or "إيقاف من قبل الإدارة",
                "suspended_by": user["id"]
            }
        }
    )
    
    # إيقاف حساب المالك أيضاً
    await db.users.update_one(
        {"id": store["owner_id"]},
        {"$set": {"is_suspended": True, "suspended_at": now}}
    )
    
    # إشعار صاحب المتجر
    await create_notification_for_user(
        user_id=store["owner_id"],
        title="⛔ تم إيقاف متجرك",
        message=f"تم إيقاف متجر {store['name']} من قبل الإدارة" + (f". السبب: {reason}" if reason else ""),
        notification_type="store_suspended"
    )
    
    return {"message": "تم إيقاف المتجر بنجاح"}


@router.post("/food/stores/{store_id}/activate")
async def activate_food_store(store_id: str, user: dict = Depends(get_current_user)):
    """إعادة تفعيل متجر طعام"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    store = await db.food_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    await db.food_stores.update_one(
        {"id": store_id},
        {
            "$set": {"is_suspended": False},
            "$unset": {
                "suspended_at": "",
                "suspension_reason": "",
                "suspended_by": ""
            }
        }
    )
    
    # تفعيل حساب المالك
    await db.users.update_one(
        {"id": store["owner_id"]},
        {
            "$set": {"is_suspended": False},
            "$unset": {"suspended_at": ""}
        }
    )
    
    # إشعار صاحب المتجر
    await create_notification_for_user(
        user_id=store["owner_id"],
        title="✅ تم تفعيل متجرك",
        message=f"تم إعادة تفعيل متجر {store['name']}. يمكنك الآن استقبال الطلبات",
        notification_type="store_activated"
    )
    
    return {"message": "تم تفعيل المتجر بنجاح"}


@router.delete("/food/stores/{store_id}")
async def delete_food_store(store_id: str, user: dict = Depends(get_current_user)):
    """حذف متجر طعام نهائياً"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    store = await db.food_stores.find_one({"id": store_id})
    if not store:
        raise HTTPException(status_code=404, detail="المتجر غير موجود")
    
    # التحقق من عدم وجود طلبات نشطة
    active_orders = await db.food_orders.count_documents({
        "store_id": store_id,
        "status": {"$nin": ["delivered", "cancelled"]}
    })
    
    if active_orders > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"لا يمكن حذف المتجر - لديه {active_orders} طلب نشط"
        )
    
    now = datetime.now(timezone.utc).isoformat()
    
    # حفظ بيانات المتجر في سجل الحذف
    await db.deleted_food_stores.insert_one({
        "id": str(uuid.uuid4()),
        "original_store_id": store_id,
        "store_data": store,
        "deleted_by": user["id"],
        "deleted_at": now
    })
    
    # حذف المتجر وحساب المالك
    await db.food_stores.delete_one({"id": store_id})
    await db.users.delete_one({"id": store["owner_id"]})
    await db.wallets.delete_one({"user_id": store["owner_id"]})
    
    return {"message": "تم حذف المتجر نهائياً"}


@router.get("/food/stores/with-status")
async def get_food_stores_with_status(user: dict = Depends(get_current_user)):
    """جلب جميع متاجر الطعام مع حالاتها"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    stores = await db.food_stores.find(
        {},
        {
            "_id": 0, 
            "id": 1, 
            "name": 1, 
            "owner_id": 1,
            "phone": 1,
            "store_type": 1,
            "is_approved": 1,
            "is_active": 1,
            "is_suspended": 1,
            "suspended_at": 1,
            "suspension_reason": 1,
            "created_at": 1
        }
    ).to_list(500)
    
    # إضافة إحصائيات
    for store in stores:
        # عدد الأطباق
        dishes_count = await db.food_dishes.count_documents({"store_id": store["id"]})
        store["dishes_count"] = dishes_count
        
        # عدد الطلبات المكتملة
        completed_orders = await db.food_orders.count_documents({
            "store_id": store["id"],
            "status": "delivered"
        })
        store["completed_orders"] = completed_orders
        
        # اسم المالك
        owner = await db.users.find_one({"id": store.get("owner_id")}, {"_id": 0, "name": 1, "phone": 1})
        if owner:
            store["owner_name"] = owner.get("name", "")
            store["owner_phone"] = owner.get("phone", store.get("phone", ""))
    
    return stores


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
    
    await db.food_offers.update_one(
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

# ============== إنشاء عرض "اشتري X واحصل على Y" من الأدمن ==============

@router.post("/food-offers/create")
async def admin_create_food_offer(data: dict, user: dict = Depends(get_current_user)):
    """إنشاء عرض 'اشتري X واحصل على Y' من الأدمن مباشرة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # التحقق من البيانات المطلوبة
    if not data.get("name"):
        raise HTTPException(status_code=400, detail="اسم العرض مطلوب")
    if not data.get("offer_type"):
        raise HTTPException(status_code=400, detail="نوع العرض مطلوب")
    
    now = datetime.now(timezone.utc).isoformat()
    offer_id = str(uuid.uuid4())
    
    offer_doc = {
        "id": offer_id,
        "name": data["name"],
        "offer_type": data["offer_type"],  # buy_x_get_y, percentage, fixed_discount
        "buy_quantity": data.get("buy_quantity", 2),
        "get_quantity": data.get("get_quantity", 1),
        "discount_percentage": data.get("discount_percentage"),
        "discount_amount": data.get("discount_amount"),
        "min_order_amount": data.get("min_order_amount"),
        "applicable_products": data.get("applicable_products", []),
        "applicable_stores": data.get("applicable_stores", []),  # متاجر محددة
        "apply_to_all": data.get("apply_to_all", True),  # يطبق على جميع المتاجر
        "store_id": data.get("store_id"),  # إذا كان لمتجر محدد
        "is_active": data.get("is_active", True),
        "admin_approved": True,
        "created_by_admin": True,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    
    await db.food_offers.insert_one(offer_doc)
    offer_doc.pop("_id", None)
    
    return {"message": "تم إنشاء العرض بنجاح", "offer": offer_doc}


@router.get("/food-stores/list")
async def get_food_stores_list(user: dict = Depends(get_current_user)):
    """جلب قائمة متاجر الطعام للاختيار منها"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    stores = await db.food_stores.find(
        {"is_approved": True},
        {"_id": 0, "id": 1, "name": 1, "store_type": 1, "owner_name": 1}
    ).sort("name", 1).to_list(500)
    
    return stores


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
    
    # إرسال إشعار لجميع المستخدمين (العملاء) إذا طلب ذلك
    if sale_data.get("send_notification", False):
        discount = int(sale_doc["discount_percentage"])
        await send_offer_notification_to_all_users(
            title=f"⚡ {sale_doc['name']}",
            message=f"{sale_doc.get('description', 'عرض فلاش لفترة محدودة!')} - خصم {discount}%",
            offer_type="flash_sale",
            offer_data={"flash_sale_id": sale_id}
        )
    
    # إرسال إشعار للبائعين لدعوتهم للمشاركة في العرض
    if sale_data.get("notify_sellers", False):
        discount = int(sale_doc["discount_percentage"])
        await send_flash_sale_notification_to_sellers(
            title="🔥 فرصة للمشاركة في عرض فلاش!",
            message=f"عرض {sale_doc['name']} - خصم {discount}% | شارك منتجاتك الآن واستفد من الترويج المجاني!",
            flash_sale_id=sale_id,
            sale_scope=sale_doc.get("sale_scope", "all")
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
    
    # التحقق من وجود المتجر (قد يكون محذوفاً)
    store = await db.food_stores.find_one({"id": req["store_id"]})
    if not store:
        # المتجر محذوف - حذف الطلب اليتيم تلقائياً
        await db.flash_sale_requests.delete_one({"id": request_id})
        raise HTTPException(status_code=400, detail="المتجر محذوف - تم حذف الطلب تلقائياً")
    
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
    await create_notification_for_user(
        user_id=store["owner_id"],
        title="✅ تمت الموافقة على طلب الانضمام للفلاش",
        message="تمت الموافقة على منتجاتك للانضمام لعرض الفلاش",
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
    
    # التحقق من وجود المتجر (قد يكون محذوفاً)
    store = await db.food_stores.find_one({"id": req["store_id"]})
    if not store:
        # المتجر محذوف - حذف الطلب اليتيم تلقائياً
        await db.flash_sale_requests.delete_one({"id": request_id})
        raise HTTPException(status_code=400, detail="المتجر محذوف - تم حذف الطلب تلقائياً")
    
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
    if refund and req.get("fee_paid", 0) > 0:
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


@router.delete("/flash-sale-requests/{request_id}")
async def delete_flash_sale_request(request_id: str, user: dict = Depends(get_current_user)):
    """حذف طلب انضمام للفلاش (للطلبات اليتيمة أو القديمة)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    req = await db.flash_sale_requests.find_one({"id": request_id})
    if not req:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # حذف الطلب
    await db.flash_sale_requests.delete_one({"id": request_id})
    
    return {"message": "تم حذف الطلب بنجاح"}


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



# ============== أدوات حل المشاكل للمدير ==============

from pydantic import BaseModel
from typing import Optional

class CompensationRequest(BaseModel):
    user_id: str
    amount: float
    reason: str
    order_id: Optional[str] = None


class PartialRefundRequest(BaseModel):
    order_id: str
    amount: float
    reason: str


class ReassignDriverRequest(BaseModel):
    order_id: str
    new_driver_id: Optional[str] = None  # إذا فارغ، يتم البحث عن سائق متاح


# 1️⃣ إضافة رصيد تعويضي للمستخدم
@router.post("/compensate-user")
async def compensate_user(
    req: CompensationRequest,
    user: dict = Depends(get_current_user)
):
    """إضافة رصيد تعويضي لمستخدم (عميل/سائق/بائع)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمديرين فقط")
    
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="المبلغ يجب أن يكون أكبر من صفر")
    
    if req.amount > 500000:  # حد أقصى 500,000 ل.س
        raise HTTPException(status_code=400, detail="المبلغ يتجاوز الحد المسموح (500,000 ل.س)")
    
    # التحقق من وجود المستخدم
    target_user = await db.users.find_one({"id": req.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    
    now = datetime.now(timezone.utc)
    
    # إضافة الرصيد للمحفظة
    wallet = await db.wallets.find_one({"user_id": req.user_id})
    if wallet:
        await db.wallets.update_one(
            {"user_id": req.user_id},
            {"$inc": {"balance": req.amount}}
        )
    else:
        await db.wallets.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": req.user_id,
            "balance": req.amount,
            "created_at": now.isoformat()
        })
    
    # تسجيل العملية
    transaction = {
        "id": str(uuid.uuid4()),
        "user_id": req.user_id,
        "type": "compensation",
        "amount": req.amount,
        "description": f"تعويض من الإدارة: {req.reason}",
        "order_id": req.order_id,
        "admin_id": user["id"],
        "admin_name": user.get("full_name") or user.get("name"),
        "created_at": now.isoformat()
    }
    await db.wallet_transactions.insert_one(transaction)
    
    # تسجيل في سجل النشاط
    try:
        from routes.activity_log import log_admin_activity
        await log_admin_activity(
            admin_id=user["id"],
            admin_name=user.get("full_name") or user.get("name"),
            action=f"إضافة تعويض {req.amount} ل.س للمستخدم",
            action_type="payment",
            target_type="user",
            target_id=req.user_id,
            target_name=target_user.get("full_name") or target_user.get("name"),
            details={"amount": req.amount, "reason": req.reason, "order_id": req.order_id}
        )
    except Exception as e:
        print(f"Error logging activity: {e}")
    
    # إرسال إشعار للمستخدم
    try:
        from core.database import create_notification_for_user
        await create_notification_for_user(
            user_id=req.user_id,
            title="💰 تم إضافة تعويض لحسابك",
            message=f"تم إضافة {req.amount:,.0f} ل.س كتعويض. السبب: {req.reason}",
            notification_type="compensation"
        )
    except Exception as e:
        print(f"Error sending notification: {e}")
    
    return {
        "message": f"تم إضافة {req.amount:,.0f} ل.س للمستخدم بنجاح",
        "transaction_id": transaction["id"],
        "new_balance": (wallet.get("balance", 0) if wallet else 0) + req.amount
    }


# 2️⃣ حذف تقييم مسيء
@router.delete("/reviews/{review_id}")
async def admin_delete_review(
    review_id: str,
    reason: str = "مخالفة سياسة الاستخدام",
    user: dict = Depends(get_current_user)
):
    """حذف تقييم مسيء أو غير لائق"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمديرين فقط")
    
    # البحث في تقييمات المنتجات
    review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    collection = db.reviews
    
    # البحث في تقييمات المتاجر
    if not review:
        review = await db.food_store_reviews.find_one({"id": review_id}, {"_id": 0})
        collection = db.food_store_reviews
    
    # البحث في تقييمات السائقين
    if not review:
        review = await db.driver_ratings.find_one({"id": review_id}, {"_id": 0})
        collection = db.driver_ratings
    
    if not review:
        raise HTTPException(status_code=404, detail="التقييم غير موجود")
    
    now = datetime.now(timezone.utc)
    
    # حفظ نسخة من التقييم المحذوف
    deleted_review = {
        **review,
        "deleted_at": now.isoformat(),
        "deleted_by": user["id"],
        "deletion_reason": reason
    }
    await db.deleted_reviews.insert_one(deleted_review)
    
    # حذف التقييم
    await collection.delete_one({"id": review_id})
    
    # تسجيل في سجل النشاط
    try:
        from routes.activity_log import log_admin_activity
        await log_admin_activity(
            admin_id=user["id"],
            admin_name=user.get("full_name") or user.get("name"),
            action=f"حذف تقييم - السبب: {reason}",
            action_type="other",
            target_type="review",
            target_id=review_id,
            details={"review_text": review.get("review", review.get("comment", ""))[:100], "rating": review.get("rating")}
        )
    except Exception as e:
        print(f"Error logging activity: {e}")
    
    return {"message": "تم حذف التقييم بنجاح"}


# 3️⃣ استرداد جزئي للطلب
@router.post("/orders/{order_id}/partial-refund")
async def admin_partial_refund(
    order_id: str,
    req: PartialRefundRequest,
    user: dict = Depends(get_current_user)
):
    """استرداد جزئي لمبلغ الطلب"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمديرين فقط")
    
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="المبلغ يجب أن يكون أكبر من صفر")
    
    # البحث عن الطلب
    order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
    order_type = "food"
    
    if not order:
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        order_type = "product"
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من المبلغ
    order_total = order.get("total", 0)
    if req.amount > order_total:
        raise HTTPException(status_code=400, detail=f"المبلغ أكبر من قيمة الطلب ({order_total:,.0f} ل.س)")
    
    # التحقق من الاسترداد السابق
    previous_refunds = order.get("partial_refunds", [])
    total_refunded = sum(r.get("amount", 0) for r in previous_refunds)
    
    if total_refunded + req.amount > order_total:
        raise HTTPException(
            status_code=400, 
            detail=f"إجمالي الاسترداد سيتجاوز قيمة الطلب. المسترد سابقاً: {total_refunded:,.0f} ل.س"
        )
    
    now = datetime.now(timezone.utc)
    customer_id = order.get("customer_id") or order.get("user_id")
    
    # إضافة الرصيد للعميل
    await db.wallets.update_one(
        {"user_id": customer_id},
        {"$inc": {"balance": req.amount}},
        upsert=True
    )
    
    # تسجيل عملية الاسترداد
    refund_record = {
        "id": str(uuid.uuid4()),
        "amount": req.amount,
        "reason": req.reason,
        "admin_id": user["id"],
        "admin_name": user.get("full_name") or user.get("name"),
        "created_at": now.isoformat()
    }
    
    # تحديث الطلب
    collection = db.food_orders if order_type == "food" else db.orders
    await collection.update_one(
        {"id": order_id},
        {
            "$push": {"partial_refunds": refund_record},
            "$inc": {"total_refunded": req.amount}
        }
    )
    
    # تسجيل في المحفظة
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": customer_id,
        "type": "partial_refund",
        "amount": req.amount,
        "description": f"استرداد جزئي للطلب #{order.get('order_number', order_id[:8])} - {req.reason}",
        "order_id": order_id,
        "admin_id": user["id"],
        "created_at": now.isoformat()
    })
    
    # إرسال إشعار للعميل
    try:
        from core.database import create_notification_for_user
        await create_notification_for_user(
            user_id=customer_id,
            title="💸 تم استرداد جزء من المبلغ",
            message=f"تم إضافة {req.amount:,.0f} ل.س لمحفظتك (استرداد جزئي للطلب #{order.get('order_number', '')})",
            notification_type="refund"
        )
    except Exception as e:
        print(f"Error sending notification: {e}")
    
    # تسجيل في سجل النشاط
    try:
        from routes.activity_log import log_admin_activity
        await log_admin_activity(
            admin_id=user["id"],
            admin_name=user.get("full_name") or user.get("name"),
            action=f"استرداد جزئي {req.amount:,.0f} ل.س للطلب #{order.get('order_number', '')}",
            action_type="payment",
            target_type="order",
            target_id=order_id,
            details={"amount": req.amount, "reason": req.reason, "total_refunded": total_refunded + req.amount}
        )
    except Exception as e:
        print(f"Error logging activity: {e}")
    
    return {
        "message": f"تم استرداد {req.amount:,.0f} ل.س بنجاح",
        "refund_id": refund_record["id"],
        "total_refunded": total_refunded + req.amount
    }


# 4️⃣ تغيير/تعيين سائق بديل
@router.post("/orders/{order_id}/reassign-driver")
async def admin_reassign_driver(
    order_id: str,
    req: ReassignDriverRequest,
    user: dict = Depends(get_current_user)
):
    """تغيير السائق أو تعيين سائق بديل للطلب"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمديرين فقط")
    
    # البحث عن الطلب
    order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
    collection = db.food_orders
    
    if not order:
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        collection = db.orders
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من حالة الطلب
    allowed_statuses = ["pending", "accepted", "preparing", "ready", "ready_for_pickup", "out_for_delivery"]
    if order.get("status") not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"لا يمكن تغيير السائق. حالة الطلب: {order.get('status')}")
    
    now = datetime.now(timezone.utc)
    old_driver_id = order.get("driver_id")
    old_driver_name = None
    
    # جلب اسم السائق القديم
    if old_driver_id:
        old_driver = await db.users.find_one({"id": old_driver_id}, {"_id": 0, "full_name": 1, "name": 1})
        old_driver_name = old_driver.get("full_name") or old_driver.get("name") if old_driver else None
    
    new_driver_id = req.new_driver_id
    new_driver_name = None
    
    # إذا لم يتم تحديد سائق، البحث عن سائق متاح
    if not new_driver_id:
        # البحث عن سائقين متاحين
        available_drivers = await db.users.find({
            "user_type": "delivery",
            "is_active": True,
            "is_available": True,
            "is_suspended": {"$ne": True}
        }, {"_id": 0, "id": 1, "full_name": 1, "name": 1}).to_list(10)
        
        if not available_drivers:
            raise HTTPException(status_code=400, detail="لا يوجد سائقين متاحين حالياً")
        
        # اختيار سائق عشوائي (يمكن تحسينه لاحقاً)
        import random
        new_driver = random.choice(available_drivers)
        new_driver_id = new_driver["id"]
        new_driver_name = new_driver.get("full_name") or new_driver.get("name")
    else:
        # التحقق من السائق المحدد
        new_driver = await db.users.find_one(
            {"id": new_driver_id, "user_type": "delivery"},
            {"_id": 0, "id": 1, "full_name": 1, "name": 1, "is_active": 1}
        )
        if not new_driver:
            raise HTTPException(status_code=404, detail="السائق غير موجود")
        new_driver_name = new_driver.get("full_name") or new_driver.get("name")
    
    # تحديث الطلب
    await collection.update_one(
        {"id": order_id},
        {
            "$set": {
                "driver_id": new_driver_id,
                "driver_name": new_driver_name,
                "driver_reassigned_at": now.isoformat(),
                "driver_reassigned_by": user["id"]
            },
            "$push": {
                "driver_history": {
                    "old_driver_id": old_driver_id,
                    "old_driver_name": old_driver_name,
                    "new_driver_id": new_driver_id,
                    "new_driver_name": new_driver_name,
                    "changed_at": now.isoformat(),
                    "changed_by": user["id"],
                    "changed_by_name": user.get("full_name") or user.get("name")
                },
                "status_history": {
                    "status": order.get("status"),
                    "timestamp": now.isoformat(),
                    "note": f"تم تغيير السائق من {old_driver_name or 'غير معين'} إلى {new_driver_name}"
                }
            }
        }
    )
    
    # إرسال إشعار للسائق الجديد
    try:
        from core.database import create_notification_for_user
        await create_notification_for_user(
            user_id=new_driver_id,
            title="🚚 تم تعيينك لطلب جديد",
            message=f"تم تعيينك للطلب #{order.get('order_number', '')} من قبل الإدارة",
            notification_type="new_order"
        )
    except Exception as e:
        print(f"Error sending notification to new driver: {e}")
    
    # إرسال إشعار للسائق القديم
    if old_driver_id and old_driver_id != new_driver_id:
        try:
            from core.database import create_notification_for_user
            await create_notification_for_user(
                user_id=old_driver_id,
                title="📋 تم إعادة تعيين الطلب",
                message=f"تم إسناد الطلب #{order.get('order_number', '')} لسائق آخر",
                notification_type="order_update"
            )
        except Exception as e:
            print(f"Error sending notification to old driver: {e}")
    
    # تسجيل في سجل النشاط
    try:
        from routes.activity_log import log_admin_activity
        await log_admin_activity(
            admin_id=user["id"],
            admin_name=user.get("full_name") or user.get("name"),
            action=f"تغيير سائق الطلب #{order.get('order_number', '')}",
            action_type="driver",
            target_type="order",
            target_id=order_id,
            details={
                "old_driver": old_driver_name,
                "new_driver": new_driver_name
            }
        )
    except Exception as e:
        print(f"Error logging activity: {e}")
    
    return {
        "message": f"تم تعيين السائق {new_driver_name} بنجاح",
        "old_driver": old_driver_name,
        "new_driver": new_driver_name,
        "new_driver_id": new_driver_id
    }


# 5️⃣ جلب قائمة السائقين المتاحين
@router.get("/available-drivers")
async def get_available_drivers(user: dict = Depends(get_current_user)):
    """جلب قائمة السائقين المتاحين للتعيين"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمديرين فقط")
    
    drivers = await db.users.find(
        {
            "user_type": "delivery",
            "is_active": True,
            "is_suspended": {"$ne": True}
        },
        {"_id": 0, "id": 1, "full_name": 1, "name": 1, "phone": 1, "is_available": 1, "city": 1}
    ).to_list(100)
    
    return {
        "drivers": [
            {
                "id": d["id"],
                "name": d.get("full_name") or d.get("name"),
                "phone": d.get("phone"),
                "is_available": d.get("is_available", False),
                "city": d.get("city")
            }
            for d in drivers
        ]
    }



# ============== إدارة الطلبات للمدير ==============

@router.post("/orders/{order_id}/cancel")
async def admin_cancel_order(
    order_id: str,
    data: dict = None,
    user: dict = Depends(get_current_user)
):
    """إلغاء طلب بواسطة المدير"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمديرين فقط")
    
    reason = data.get("reason", "") if data else ""
    admin_note = data.get("admin_note", "") if data else ""
    
    # البحث في طلبات المنتجات
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    collection = db.orders
    
    if not order:
        # البحث في طلبات الطعام
        order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
        collection = db.food_orders
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من إمكانية الإلغاء
    if order.get("status") in ["delivered", "completed"]:
        raise HTTPException(status_code=400, detail="لا يمكن إلغاء طلب تم توصيله")
    
    if order.get("status") == "cancelled":
        raise HTTPException(status_code=400, detail="الطلب ملغي مسبقاً")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # تحديث الطلب
    update_data = {
        "status": "cancelled",
        "cancelled_at": now,
        "cancelled_by": user["id"],
        "cancelled_by_type": "admin",
        "cancellation_reason": reason,
        "admin_note": admin_note
    }
    
    await collection.update_one({"id": order_id}, {"$set": update_data})
    
    # إشعار العميل
    customer_id = order.get("customer_id") or order.get("user_id")
    if customer_id:
        message = "تم إلغاء طلبك من قبل الإدارة."
        if reason:
            reason_labels = {
                "customer_request": "بناءً على طلبك",
                "out_of_stock": "منتج غير متوفر",
                "payment_issue": "مشكلة في الدفع",
                "delivery_issue": "مشكلة في التوصيل",
                "other": "لأسباب إدارية"
            }
            message += f" السبب: {reason_labels.get(reason, reason)}"
        
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": customer_id,
            "title": "❌ تم إلغاء طلبك",
            "message": message,
            "type": "order_cancelled",
            "data": {"order_id": order_id},
            "is_read": False,
            "created_at": now
        })
    
    # إشعار البائع
    seller_id = order.get("seller_id") or order.get("store_owner_id")
    if seller_id:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": seller_id,
            "title": "❌ تم إلغاء طلب",
            "message": f"تم إلغاء الطلب #{order_id[:8]} من قبل الإدارة",
            "type": "order_cancelled_by_admin",
            "data": {"order_id": order_id},
            "is_read": False,
            "created_at": now
        })
    
    # إشعار السائق إذا كان معيناً
    driver_id = order.get("driver_id")
    if driver_id:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": driver_id,
            "title": "❌ تم إلغاء طلب",
            "message": f"تم إلغاء الطلب #{order_id[:8]} الذي كنت تقوم بتوصيله",
            "type": "order_cancelled_driver",
            "data": {"order_id": order_id},
            "is_read": False,
            "created_at": now
        })
    
    return {"message": "تم إلغاء الطلب بنجاح", "order_id": order_id}


@router.post("/orders/{order_id}/status")
async def admin_change_order_status(
    order_id: str,
    data: dict,
    user: dict = Depends(get_current_user)
):
    """تغيير حالة الطلب بواسطة المدير"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمديرين فقط")
    
    new_status = data.get("status")
    admin_note = data.get("admin_note", "")
    
    if not new_status:
        raise HTTPException(status_code=400, detail="يجب تحديد الحالة الجديدة")
    
    valid_statuses = ["pending", "confirmed", "processing", "ready", "on_the_way", "delivered", "cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"حالة غير صالحة. الحالات المتاحة: {', '.join(valid_statuses)}")
    
    # البحث في طلبات المنتجات
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    collection = db.orders
    
    if not order:
        # البحث في طلبات الطعام
        order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
        collection = db.food_orders
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    old_status = order.get("status")
    if old_status == new_status:
        raise HTTPException(status_code=400, detail="الطلب بالفعل في هذه الحالة")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # تحديث الطلب
    update_data = {
        "status": new_status,
        "status_updated_at": now,
        "status_updated_by": user["id"],
        "admin_note": admin_note
    }
    
    # إضافة تاريخ التوصيل إذا تم التسليم
    if new_status == "delivered":
        update_data["delivered_at"] = now
    
    await collection.update_one({"id": order_id}, {"$set": update_data})
    
    # أسماء الحالات بالعربية
    status_labels = {
        "pending": "قيد الانتظار",
        "confirmed": "مؤكد",
        "processing": "قيد التجهيز",
        "ready": "جاهز للتوصيل",
        "on_the_way": "في الطريق",
        "delivered": "تم التوصيل",
        "cancelled": "ملغي"
    }
    
    # إشعار العميل
    customer_id = order.get("customer_id") or order.get("user_id")
    if customer_id:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": customer_id,
            "title": "📦 تحديث حالة الطلب",
            "message": f"تم تحديث حالة طلبك إلى: {status_labels.get(new_status, new_status)}",
            "type": "order_status_updated",
            "data": {"order_id": order_id, "new_status": new_status},
            "is_read": False,
            "created_at": now
        })
    
    return {
        "message": f"تم تغيير حالة الطلب إلى: {status_labels.get(new_status, new_status)}",
        "order_id": order_id,
        "old_status": old_status,
        "new_status": new_status
    }


@router.post("/orders/{order_id}/refund")
async def admin_full_refund(
    order_id: str,
    data: dict = None,
    user: dict = Depends(get_current_user)
):
    """استرداد كامل المبلغ للعميل"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمديرين فقط")
    
    admin_note = data.get("admin_note", "") if data else ""
    
    # البحث عن الطلب
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    collection = db.orders
    
    if not order:
        order = await db.food_orders.find_one({"id": order_id}, {"_id": 0})
        collection = db.food_orders
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من أن الطلب لم يُسترد مسبقاً
    if order.get("status") == "refunded":
        raise HTTPException(status_code=400, detail="تم استرداد هذا الطلب مسبقاً")
    
    order_total = order.get("total", 0)
    customer_id = order.get("customer_id") or order.get("user_id")
    
    if not customer_id:
        raise HTTPException(status_code=400, detail="لم يتم العثور على العميل")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # إضافة المبلغ لمحفظة العميل
    await db.users.update_one(
        {"id": customer_id},
        {"$inc": {"wallet_balance": order_total}}
    )
    
    # تسجيل معاملة المحفظة
    await db.wallet_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": customer_id,
        "type": "refund",
        "amount": order_total,
        "description": f"استرداد كامل للطلب #{order_id[:8]}",
        "order_id": order_id,
        "admin_id": user["id"],
        "admin_note": admin_note,
        "created_at": now
    })
    
    # تحديث الطلب
    await collection.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": "refunded",
                "refunded_at": now,
                "refunded_by": user["id"],
                "refund_amount": order_total,
                "refund_type": "full",
                "admin_note": admin_note
            }
        }
    )
    
    # إشعار العميل
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": customer_id,
        "title": "💰 تم استرداد المبلغ",
        "message": f"تم إضافة {order_total:,.0f} ل.س إلى محفظتك كاسترداد للطلب #{order_id[:8]}",
        "type": "refund_completed",
        "data": {"order_id": order_id, "amount": order_total},
        "is_read": False,
        "created_at": now
    })
    
    return {
        "message": "تم استرداد المبلغ بنجاح",
        "order_id": order_id,
        "refund_amount": order_total
    }


# ============== إدارة المنتجات للمدير ==============

@router.post("/products/{product_id}/toggle-visibility")
async def admin_toggle_product_visibility(
    product_id: str,
    user: dict = Depends(get_current_user)
):
    """إخفاء/إظهار منتج"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمديرين فقط")
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    current_status = product.get("is_hidden", False)
    new_status = not current_status
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.products.update_one(
        {"id": product_id},
        {
            "$set": {
                "is_hidden": new_status,
                "visibility_updated_at": now,
                "visibility_updated_by": user["id"]
            }
        }
    )
    
    # إشعار البائع
    seller_id = product.get("seller_id")
    if seller_id:
        action = "إخفاء" if new_status else "إظهار"
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": seller_id,
            "title": f"{'👁️‍🗨️' if new_status else '👁️'} تم {action} منتجك",
            "message": f"تم {action} المنتج '{product.get('name', '')}' من قبل الإدارة",
            "type": "product_visibility_changed",
            "data": {"product_id": product_id, "is_hidden": new_status},
            "is_read": False,
            "created_at": now
        })
    
    return {
        "message": f"تم {'إخفاء' if new_status else 'إظهار'} المنتج بنجاح",
        "product_id": product_id,
        "is_hidden": new_status
    }


@router.delete("/products/{product_id}")
async def admin_delete_product(
    product_id: str,
    user: dict = Depends(get_current_user)
):
    """حذف منتج نهائياً"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمديرين فقط")
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    now = datetime.now(timezone.utc).isoformat()
    seller_id = product.get("seller_id")
    product_name = product.get("name", "")
    
    # حذف المنتج
    await db.products.delete_one({"id": product_id})
    
    # حذف من المفضلة
    await db.favorites.delete_many({"product_id": product_id})
    
    # حذف من السلات
    await db.carts.update_many(
        {},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    
    # إشعار البائع
    if seller_id:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": seller_id,
            "title": "🗑️ تم حذف منتج",
            "message": f"تم حذف المنتج '{product_name}' من قبل الإدارة",
            "type": "product_deleted_by_admin",
            "data": {"product_name": product_name},
            "is_read": False,
            "created_at": now
        })
    
    # تسجيل النشاط
    await db.admin_activity_log.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": user["id"],
        "action": "delete_product",
        "target_type": "product",
        "target_id": product_id,
        "details": {"product_name": product_name, "seller_id": seller_id},
        "created_at": now
    })
    
    return {"message": "تم حذف المنتج بنجاح", "product_id": product_id}



# ============== إدارة أطباق الطعام ==============

@router.get("/food-items/all")
async def get_all_food_items(user: dict = Depends(get_current_user)):
    """جلب جميع أصناف الطعام"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    items = await db.food_items.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    
    # إضافة معلومات المتجر
    for item in items:
        store = await db.food_stores.find_one(
            {"id": item.get("store_id")},
            {"_id": 0, "name": 1, "owner_name": 1, "store_type": 1}
        )
        if store:
            item["store_name"] = store.get("name", "")
            item["owner_name"] = store.get("owner_name", "")
            item["store_type"] = store.get("store_type", "")
    
    return items

@router.delete("/food-items/{item_id}")
async def delete_food_item(item_id: str, user: dict = Depends(get_current_user)):
    """حذف صنف طعام"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.food_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الصنف غير موجود")
    
    return {"message": "تم حذف الصنف بنجاح"}

# ============== إدارة أطباق الطعام المعلقة ==============

@router.get("/food-items/pending")
async def get_pending_food_items(user: dict = Depends(get_current_user)):
    """جلب الأطباق المعلقة التي تنتظر الموافقة"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    items = await db.food_items.find(
        {"is_approved": False},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # إضافة معلومات المتجر والبائع
    for item in items:
        store = await db.food_stores.find_one(
            {"id": item.get("store_id")},
            {"_id": 0, "name": 1, "owner_name": 1, "owner_id": 1, "store_type": 1}
        )
        if store:
            item["store_name"] = store.get("name", "")
            item["owner_name"] = store.get("owner_name", "")
            item["store_type"] = store.get("store_type", "")
    
    return items

@router.get("/food-items/stats")
async def get_food_items_stats(user: dict = Depends(get_current_user)):
    """إحصائيات الأطباق"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    pending_count = await db.food_items.count_documents({"is_approved": False})
    approved_count = await db.food_items.count_documents({"is_approved": True})
    total_count = await db.food_items.count_documents({})
    
    return {
        "pending": pending_count,
        "approved": approved_count,
        "total": total_count
    }

@router.post("/food-items/{item_id}/approve")
async def approve_food_item(item_id: str, user: dict = Depends(get_current_user)):
    """الموافقة على طبق جديد"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    item = await db.food_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="الطبق غير موجود")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.food_items.update_one(
        {"id": item_id},
        {
            "$set": {
                "is_approved": True,
                "approved_by": user["id"],
                "approved_at": now
            }
        }
    )
    
    # إشعار صاحب المتجر
    seller_id = item.get("seller_id")
    if seller_id:
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": seller_id,
            "title": "✅ تمت الموافقة على الطبق",
            "message": f"تمت الموافقة على طبق '{item.get('name', '')}' وأصبح ظاهراً للعملاء",
            "type": "food_item_approved",
            "data": {"item_id": item_id, "item_name": item.get("name", "")},
            "is_read": False,
            "created_at": now
        })
    
    return {"message": "تمت الموافقة على الطبق بنجاح"}

@router.post("/food-items/{item_id}/reject")
async def reject_food_item(
    item_id: str, 
    data: dict = None, 
    user: dict = Depends(get_current_user)
):
    """رفض طبق مع سبب الرفض (اختياري)"""
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    item = await db.food_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="الطبق غير موجود")
    
    reason = data.get("reason", "").strip() if data else ""
    now = datetime.now(timezone.utc).isoformat()
    
    # حذف الطبق أو تحديد حالة الرفض
    await db.food_items.delete_one({"id": item_id})
    
    # إشعار صاحب المتجر
    seller_id = item.get("seller_id")
    if seller_id:
        message = f"تم رفض طبق '{item.get('name', '')}'."
        if reason:
            message += f"\n📝 سبب الرفض: {reason}"
        
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": seller_id,
            "title": "❌ تم رفض الطبق",
            "message": message,
            "type": "food_item_rejected",
            "data": {"item_name": item.get("name", ""), "reason": reason},
            "is_read": False,
            "created_at": now
        })
    
    return {"message": "تم رفض الطبق", "reason": reason if reason else None}



# ============== إدارة الترويجات ==============

@router.get("/promotions/settings")
async def get_promotion_settings(user: dict = Depends(get_current_user)):
    """جلب إعدادات الترويج"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    settings = await db.platform_settings.find_one({"id": "promotions"}, {"_id": 0})
    
    if not settings:
        default_settings = {
            "id": "promotions",
            "cost_per_product": 1000,
            "duration_hours": 24,
            "max_products_per_day": 5,
            "enabled": True,
            "flash_start_hour": 13,  # 1:00 PM
            "flash_duration_hours": 24,  # 24 ساعة
            "flash_days": [0, 1, 2, 3, 4, 5, 6],  # كل أيام الأسبوع (0=الاثنين، 6=الأحد)
            "food_flash_enabled": True,     # تفعيل فلاش الطعام
            "products_flash_enabled": True, # تفعيل فلاش المنتجات
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.platform_settings.insert_one(default_settings.copy())
        settings = default_settings
    
    # إضافة القيم الافتراضية للحقول الجديدة
    if "flash_start_hour" not in settings:
        settings["flash_start_hour"] = 13
    if "flash_duration_hours" not in settings:
        settings["flash_duration_hours"] = 24
    if "flash_days" not in settings:
        settings["flash_days"] = [0, 1, 2, 3, 4, 5, 6]  # كل الأيام
    if "food_flash_enabled" not in settings:
        settings["food_flash_enabled"] = True
    if "products_flash_enabled" not in settings:
        settings["products_flash_enabled"] = True
    
    return settings

@router.put("/promotions/settings")
async def update_promotion_settings(data: dict, user: dict = Depends(get_current_user)):
    """تحديث إعدادات الترويج"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if "cost_per_product" in data:
        update["cost_per_product"] = int(data["cost_per_product"])
    if "duration_hours" in data:
        update["duration_hours"] = int(data["duration_hours"])
    if "max_products_per_day" in data:
        update["max_products_per_day"] = int(data["max_products_per_day"])
    if "enabled" in data:
        update["enabled"] = bool(data["enabled"])
    if "flash_start_hour" in data:
        hour = int(data["flash_start_hour"])
        if 0 <= hour <= 23:
            update["flash_start_hour"] = hour
    if "flash_duration_hours" in data:
        duration = int(data["flash_duration_hours"])
        if 1 <= duration <= 72:  # بين 1 و 72 ساعة
            update["flash_duration_hours"] = duration
    if "flash_days" in data:
        days = data["flash_days"]
        # التحقق من صحة الأيام (0-6)
        if isinstance(days, list) and all(isinstance(d, int) and 0 <= d <= 6 for d in days):
            update["flash_days"] = days
    if "food_flash_enabled" in data:
        update["food_flash_enabled"] = bool(data["food_flash_enabled"])
    if "products_flash_enabled" in data:
        update["products_flash_enabled"] = bool(data["products_flash_enabled"])
    
    await db.platform_settings.update_one(
        {"id": "promotions"},
        {"$set": update},
        upsert=True
    )
    
    return {"message": "تم تحديث إعدادات الترويج بنجاح", "settings": update}

@router.get("/promotions/all")
async def get_all_promotions(user: dict = Depends(get_current_user)):
    """جلب جميع الترويجات النشطة والمنتهية"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # الترويجات النشطة
    active = await db.product_promotions.find(
        {"expires_at": {"$gt": now}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # الترويجات المنتهية (آخر 50)
    expired = await db.product_promotions.find(
        {"expires_at": {"$lte": now}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # إحصائيات
    total_revenue = sum(p.get("cost_paid", 0) for p in active + expired)
    
    return {
        "active": active,
        "expired": expired,
        "stats": {
            "active_count": len(active),
            "expired_count": len(expired),
            "total_revenue": total_revenue
        }
    }

@router.delete("/promotions/{promotion_id}")
async def cancel_promotion(promotion_id: str, user: dict = Depends(get_current_user)):
    """إلغاء ترويج (بدون استرداد)"""
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير الرئيسي فقط")
    
    promotion = await db.product_promotions.find_one({"id": promotion_id})
    if not promotion:
        raise HTTPException(status_code=404, detail="الترويج غير موجود")
    
    # تحديث حالة الترويج ليصبح منتهي
    await db.product_promotions.update_one(
        {"id": promotion_id},
        {"$set": {"expires_at": datetime.now(timezone.utc).isoformat(), "cancelled": True}}
    )
    
    # إشعار البائع
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": promotion.get("seller_id"),
        "title": "⚠️ تم إلغاء الترويج",
        "message": f"تم إلغاء ترويج منتج '{promotion.get('product_name', '')}'",
        "type": "promotion_cancelled",
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "تم إلغاء الترويج"}



# ============== Database Reset (للأدمن الرئيسي فقط) ==============

@router.post("/reset-database")
async def reset_database(data: dict, user: dict = Depends(get_current_user)):
    """مسح قاعدة البيانات - للأدمن الرئيسي فقط"""
    
    # التحقق من أن المستخدم هو الأدمن الرئيسي فقط (ليس sub_admin)
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="هذه العملية متاحة للأدمن الرئيسي فقط")
    
    # التحقق من كلمة التأكيد
    confirmation = data.get("confirmation", "")
    if confirmation != "أؤكد مسح جميع البيانات":
        raise HTTPException(status_code=400, detail="كلمة التأكيد غير صحيحة")
    
    admin_id = user["id"]
    admin_phone = user.get("phone", "")
    
    try:
        # الجداول التي سيتم مسحها
        collections_to_clear = [
            "users",           # المستخدمين (ما عدا الأدمن)
            "products",        # المنتجات
            "orders",          # الطلبات
            "food_orders",     # طلبات الطعام
            "food_items",      # أصناف الطعام
            "food_stores",     # متاجر الطعام
            "wallets",         # المحافظ (ما عدا محفظة الأدمن)
            "wallet_transactions",  # معاملات المحافظ
            "withdrawal_requests",  # طلبات السحب
            "seller_documents",     # وثائق البائعين
            "delivery_documents",   # وثائق السائقين
            "driver_locations",     # مواقع السائقين
            "driver_security_deposits",  # ودائع السائقين
            "notifications",        # الإشعارات
            "carts",               # سلات التسوق
            "favorites",           # المفضلة
            "reviews",             # التقييمات
            "price_reports",       # بلاغات الأسعار
            "driver_reports",      # بلاغات السائقين
            "chat_messages",       # رسائل الدردشة
            "call_logs",           # سجلات المكالمات
            "referrals",           # الإحالات
            "achievements",        # الإنجازات
            "user_achievements",   # إنجازات المستخدمين
            "flash_deals",         # عروض الفلاش
            "promotions",          # الترويجات
            "sponsored_products",  # المنتجات المروجة
            "banners",             # البانرات
            "featured_stores",     # المتاجر المميزة
        ]
        
        deleted_counts = {}
        
        for collection_name in collections_to_clear:
            collection = db[collection_name]
            
            if collection_name == "users":
                # حذف جميع المستخدمين ما عدا الأدمن الرئيسي
                result = await collection.delete_many({"id": {"$ne": admin_id}})
            elif collection_name == "wallets":
                # حذف جميع المحافظ ما عدا محفظة الأدمن
                result = await collection.delete_many({"user_id": {"$ne": admin_id}})
            else:
                # حذف جميع السجلات
                result = await collection.delete_many({})
            
            deleted_counts[collection_name] = result.deleted_count
        
        # إعادة تعيين محفظة المنصة
        await db.platform_wallet.update_one(
            {"id": "main"},
            {"$set": {
                "balance": 0,
                "total_earnings": 0,
                "pending_withdrawals": 0,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        return {
            "success": True,
            "message": "تم مسح قاعدة البيانات بنجاح",
            "deleted_counts": deleted_counts
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"حدث خطأ أثناء المسح: {str(e)}")
