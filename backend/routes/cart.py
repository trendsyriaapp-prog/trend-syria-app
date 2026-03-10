# /app/backend/routes/cart.py
# مسارات السلة

from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user
from models.schemas import CartItem

router = APIRouter(prefix="/cart", tags=["Cart"])

@router.get("")
async def get_cart(user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart:
        return {"items": [], "total": 0}
    
    items_with_products = []
    total = 0
    
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            item_total = product["price"] * item["quantity"]
            total += item_total
            items_with_products.append({
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "selected_size": item.get("selected_size"),
                "product": product
            })
    
    return {"items": items_with_products, "total": total}

@router.post("/add")
async def add_to_cart(item: CartItem, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": item.product_id, "is_active": True, "is_approved": True})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    if product["stock"] < item.quantity:
        raise HTTPException(status_code=400, detail=f"عذراً، الكمية المتوفرة من هذا المنتج هي {product['stock']} قطعة فقط")
    
    # التحقق من الحد الأقصى لكل عميل
    max_per_customer = product.get("max_per_customer")
    if max_per_customer and max_per_customer > 0 and item.quantity > max_per_customer:
        raise HTTPException(status_code=400, detail=f"الحد الأقصى المسموح من هذا المنتج هو {max_per_customer} قطعة لكل عميل")
    
    cart = await db.carts.find_one({"user_id": user["id"]})
    
    if cart:
        existing_item = next((i for i in cart["items"] if i["product_id"] == item.product_id), None)
        if existing_item:
            new_quantity = existing_item["quantity"] + item.quantity
            if new_quantity > product["stock"]:
                raise HTTPException(status_code=400, detail=f"عذراً، الكمية المتوفرة من هذا المنتج هي {product['stock']} قطعة فقط")
            
            # التحقق من الحد الأقصى عند الإضافة لمنتج موجود
            if max_per_customer and max_per_customer > 0 and new_quantity > max_per_customer:
                raise HTTPException(status_code=400, detail=f"الحد الأقصى المسموح من هذا المنتج هو {max_per_customer} قطعة لكل عميل")
            
            await db.carts.update_one(
                {"user_id": user["id"], "items.product_id": item.product_id},
                {"$set": {"items.$.quantity": new_quantity, "items.$.selected_size": item.selected_size}}
            )
        else:
            await db.carts.update_one(
                {"user_id": user["id"]},
                {"$push": {"items": {"product_id": item.product_id, "quantity": item.quantity, "selected_size": item.selected_size}}}
            )
    else:
        await db.carts.insert_one({
            "user_id": user["id"],
            "items": [{"product_id": item.product_id, "quantity": item.quantity, "selected_size": item.selected_size}],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "تمت الإضافة للسلة"}

@router.put("/update")
async def update_cart_item(item: CartItem, user: dict = Depends(get_current_user)):
    if item.quantity <= 0:
        await db.carts.update_one(
            {"user_id": user["id"]},
            {"$pull": {"items": {"product_id": item.product_id}}}
        )
    else:
        product = await db.products.find_one({"id": item.product_id})
        if not product:
            raise HTTPException(status_code=404, detail="المنتج غير موجود")
        
        # التحقق من الكمية المتوفرة
        if item.quantity > product["stock"]:
            raise HTTPException(status_code=400, detail=f"عذراً، الكمية المتوفرة من هذا المنتج هي {product['stock']} قطعة فقط")
        
        # التحقق من الحد الأقصى لكل عميل
        max_per_customer = product.get("max_per_customer")
        if max_per_customer and max_per_customer > 0 and item.quantity > max_per_customer:
            raise HTTPException(status_code=400, detail=f"الحد الأقصى المسموح من هذا المنتج هو {max_per_customer} قطعة لكل عميل")
        
        await db.carts.update_one(
            {"user_id": user["id"], "items.product_id": item.product_id},
            {"$set": {"items.$.quantity": item.quantity}}
        )
    return {"message": "تم التحديث"}

@router.delete("/{product_id}")
async def remove_from_cart(product_id: str, user: dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "تمت الإزالة"}

@router.delete("")
async def clear_cart(user: dict = Depends(get_current_user)):
    await db.carts.delete_one({"user_id": user["id"]})
    return {"message": "تم إفراغ السلة"}
