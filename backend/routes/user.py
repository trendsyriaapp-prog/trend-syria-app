# /app/backend/routes/user.py
# مسارات العناوين وطرق الدفع للمستخدم

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user
from models.schemas import AddressCreate, PaymentMethodCreate

router = APIRouter(prefix="/user", tags=["User"])

# ============== Addresses ==============

@router.get("/addresses")
async def get_user_addresses(user: dict = Depends(get_current_user)) -> dict:
    addresses = await db.addresses.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("is_default", -1).to_list(20)
    return addresses

@router.post("/addresses")
async def create_address(address: AddressCreate, user: dict = Depends(get_current_user)) -> dict:
    address_id = str(uuid.uuid4())
    
    if address.is_default:
        await db.addresses.update_many(
            {"user_id": user["id"]},
            {"$set": {"is_default": False}}
        )
    
    existing_count = await db.addresses.count_documents({"user_id": user["id"]})
    is_default = address.is_default or existing_count == 0
    
    address_doc = {
        "id": address_id,
        "user_id": user["id"],
        "title": address.title,
        "city": address.city,
        "area": address.area,
        "street_number": address.street_number,
        "building_number": address.building_number,
        "apartment_number": address.apartment_number,
        "phone": address.phone,
        "is_default": is_default,
        "latitude": address.latitude,
        "longitude": address.longitude,
        "address_details": address.address_details,
        "landmark": address.landmark,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.addresses.insert_one(address_doc)
    return {"id": address_id, "message": "تم إضافة العنوان بنجاح"}

@router.put("/addresses/{address_id}")
async def update_address(address_id: str, address: AddressCreate, user: dict = Depends(get_current_user)) -> dict:
    existing = await db.addresses.find_one({"id": address_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="العنوان غير موجود")
    
    if address.is_default:
        await db.addresses.update_many(
            {"user_id": user["id"]},
            {"$set": {"is_default": False}}
        )
    
    await db.addresses.update_one(
        {"id": address_id},
        {"$set": {
            "title": address.title,
            "city": address.city,
            "area": address.area,
            "street_number": address.street_number,
            "building_number": address.building_number,
            "apartment_number": address.apartment_number,
            "phone": address.phone,
            "is_default": address.is_default,
            "latitude": address.latitude,
            "longitude": address.longitude,
            "address_details": address.address_details,
            "landmark": address.landmark
        }}
    )
    return {"message": "تم تحديث العنوان"}

@router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, user: dict = Depends(get_current_user)) -> dict:
    result = await db.addresses.delete_one({"id": address_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العنوان غير موجود")
    return {"message": "تم حذف العنوان"}

@router.post("/addresses/{address_id}/default")
async def set_default_address(address_id: str, user: dict = Depends(get_current_user)) -> dict:
    existing = await db.addresses.find_one({"id": address_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="العنوان غير موجود")
    
    await db.addresses.update_many(
        {"user_id": user["id"]},
        {"$set": {"is_default": False}}
    )
    await db.addresses.update_one(
        {"id": address_id},
        {"$set": {"is_default": True}}
    )
    return {"message": "تم تعيين العنوان الافتراضي"}

# ============== Payment Methods ==============

@router.get("/payment-methods")
async def get_payment_methods(user: dict = Depends(get_current_user)) -> dict:
    methods = await db.payment_methods.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("is_default", -1).to_list(20)
    return methods

@router.post("/payment-methods")
async def create_payment_method(payment: PaymentMethodCreate, user: dict = Depends(get_current_user)) -> dict:
    payment_id = str(uuid.uuid4())
    
    if payment.is_default:
        await db.payment_methods.update_many(
            {"user_id": user["id"]},
            {"$set": {"is_default": False}}
        )
    
    existing_count = await db.payment_methods.count_documents({"user_id": user["id"]})
    is_default = payment.is_default or existing_count == 0
    
    payment_doc = {
        "id": payment_id,
        "user_id": user["id"],
        "type": payment.type,
        "phone": payment.phone,
        "holder_name": payment.holder_name,
        "is_default": is_default,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_methods.insert_one(payment_doc)
    return {"id": payment_id, "message": "تم إضافة طريقة الدفع بنجاح"}

@router.put("/payment-methods/{payment_id}")
async def update_payment_method(payment_id: str, payment: PaymentMethodCreate, user: dict = Depends(get_current_user)) -> dict:
    existing = await db.payment_methods.find_one({"id": payment_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="طريقة الدفع غير موجودة")
    
    if payment.is_default:
        await db.payment_methods.update_many(
            {"user_id": user["id"]},
            {"$set": {"is_default": False}}
        )
    
    await db.payment_methods.update_one(
        {"id": payment_id},
        {"$set": {
            "type": payment.type,
            "phone": payment.phone,
            "holder_name": payment.holder_name,
            "is_default": payment.is_default
        }}
    )
    return {"message": "تم تحديث طريقة الدفع"}

@router.delete("/payment-methods/{payment_id}")
async def delete_payment_method(payment_id: str, user: dict = Depends(get_current_user)) -> dict:
    result = await db.payment_methods.delete_one({"id": payment_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="طريقة الدفع غير موجودة")
    return {"message": "تم حذف طريقة الدفع"}

@router.post("/payment-methods/{payment_id}/default")
async def set_default_payment(payment_id: str, user: dict = Depends(get_current_user)) -> dict:
    existing = await db.payment_methods.find_one({"id": payment_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="طريقة الدفع غير موجودة")
    
    await db.payment_methods.update_many(
        {"user_id": user["id"]},
        {"$set": {"is_default": False}}
    )
    await db.payment_methods.update_one(
        {"id": payment_id},
        {"$set": {"is_default": True}}
    )
    return {"message": "تم تعيين طريقة الدفع الافتراضية"}



# ============== Account Deletion ==============

@router.delete("/account")
async def delete_my_account(user: dict = Depends(get_current_user)) -> dict:
    """حذف حساب المستخدم (البائع يستطيع حذف حسابه مباشرة)"""
    
    user_type = user.get("user_type")
    user_id = user["id"]
    now = datetime.now(timezone.utc).isoformat()
    
    # التحقق من نوع المستخدم
    if user_type == "seller":
        # التحقق من عدم وجود طلبات نشطة للبائع
        active_orders = await db.orders.count_documents({
            "seller_id": user_id,
            "status": {"$nin": ["delivered", "cancelled"]}
        })
        
        if active_orders > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"لا يمكن حذف الحساب - لديك {active_orders} طلب نشط. أكمل الطلبات أولاً."
            )
        
        # حفظ بيانات البائع في سجل الحذف
        seller_data = await db.users.find_one({"id": user_id}, {"_id": 0})
        await db.deleted_sellers.insert_one({
            "id": str(uuid.uuid4()),
            "original_seller_id": user_id,
            "seller_data": seller_data,
            "deleted_by": user_id,  # حذف ذاتي
            "deleted_at": now,
            "deletion_type": "self_deletion"
        })
        
        # حذف بيانات البائع
        await db.users.delete_one({"id": user_id})
        await db.wallets.delete_one({"user_id": user_id})
        await db.seller_documents.delete_one({"seller_id": user_id})
        await db.addresses.delete_many({"user_id": user_id})
        
        return {"message": "تم حذف حسابك بنجاح. نأسف لرؤيتك تغادر!"}
    
    elif user_type == "food_seller":
        # التحقق من عدم وجود طلبات نشطة لبائع الطعام
        active_orders = await db.food_orders.count_documents({
            "store_id": user.get("store_id", user_id),
            "status": {"$nin": ["delivered", "cancelled"]}
        })
        
        if active_orders > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"لا يمكن حذف الحساب - لديك {active_orders} طلب نشط. أكمل الطلبات أولاً."
            )
        
        # حفظ البيانات
        seller_data = await db.users.find_one({"id": user_id}, {"_id": 0})
        await db.deleted_food_sellers.insert_one({
            "id": str(uuid.uuid4()),
            "original_seller_id": user_id,
            "seller_data": seller_data,
            "deleted_by": user_id,
            "deleted_at": now,
            "deletion_type": "self_deletion"
        })
        
        # حذف البيانات
        await db.users.delete_one({"id": user_id})
        await db.wallets.delete_one({"user_id": user_id})
        await db.food_stores.delete_one({"owner_id": user_id})
        
        return {"message": "تم حذف حسابك بنجاح. نأسف لرؤيتك تغادر!"}
    
    elif user_type == "customer":
        # العميل يستطيع حذف حسابه
        active_orders = await db.orders.count_documents({
            "user_id": user_id,
            "status": {"$nin": ["delivered", "cancelled"]}
        })
        active_food_orders = await db.food_orders.count_documents({
            "user_id": user_id,
            "status": {"$nin": ["delivered", "cancelled"]}
        })
        
        if active_orders + active_food_orders > 0:
            raise HTTPException(
                status_code=400, 
                detail="لا يمكن حذف الحساب - لديك طلبات نشطة. انتظر حتى تكتمل."
            )
        
        # حفظ البيانات
        customer_data = await db.users.find_one({"id": user_id}, {"_id": 0})
        await db.deleted_customers.insert_one({
            "id": str(uuid.uuid4()),
            "original_customer_id": user_id,
            "customer_data": customer_data,
            "deleted_at": now
        })
        
        # حذف البيانات
        await db.users.delete_one({"id": user_id})
        await db.addresses.delete_many({"user_id": user_id})
        await db.cart_items.delete_many({"user_id": user_id})
        
        return {"message": "تم حذف حسابك بنجاح. نأسف لرؤيتك تغادر!"}
    
    else:
        raise HTTPException(
            status_code=400, 
            detail="لا يمكن حذف هذا النوع من الحسابات من هنا"
        )
