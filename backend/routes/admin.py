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

async def get_commission_rates_from_db():
    rates = await db.commission_rates.find_one({"id": "main"}, {"_id": 0})
    if rates and rates.get("categories"):
        return rates["categories"]
    return DEFAULT_CATEGORY_COMMISSIONS

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
async def reject_seller(seller_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    await db.seller_documents.update_one({"seller_id": seller_id}, {"$set": {"status": "rejected"}})
    return {"message": "تم رفض البائع"}

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
async def reject_delivery_driver(driver_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    result = await db.delivery_documents.update_one(
        {"$or": [{"driver_id": driver_id}, {"delivery_id": driver_id}]},
        {"$set": {"status": "rejected", "rejected_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="لم يتم العثور على الوثائق")
    
    return {"message": "تم رفض موظف التوصيل"}

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
