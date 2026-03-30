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
async def get_user_addresses(user: dict = Depends(get_current_user)):
    addresses = await db.addresses.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("is_default", -1).to_list(20)
    return addresses

@router.post("/addresses")
async def create_address(address: AddressCreate, user: dict = Depends(get_current_user)):
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
async def update_address(address_id: str, address: AddressCreate, user: dict = Depends(get_current_user)):
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
async def delete_address(address_id: str, user: dict = Depends(get_current_user)):
    result = await db.addresses.delete_one({"id": address_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="العنوان غير موجود")
    return {"message": "تم حذف العنوان"}

@router.post("/addresses/{address_id}/default")
async def set_default_address(address_id: str, user: dict = Depends(get_current_user)):
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
async def get_payment_methods(user: dict = Depends(get_current_user)):
    methods = await db.payment_methods.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("is_default", -1).to_list(20)
    return methods

@router.post("/payment-methods")
async def create_payment_method(payment: PaymentMethodCreate, user: dict = Depends(get_current_user)):
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
async def update_payment_method(payment_id: str, payment: PaymentMethodCreate, user: dict = Depends(get_current_user)):
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
async def delete_payment_method(payment_id: str, user: dict = Depends(get_current_user)):
    result = await db.payment_methods.delete_one({"id": payment_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="طريقة الدفع غير موجودة")
    return {"message": "تم حذف طريقة الدفع"}

@router.post("/payment-methods/{payment_id}/default")
async def set_default_payment(payment_id: str, user: dict = Depends(get_current_user)):
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
