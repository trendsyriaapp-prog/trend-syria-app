# /app/backend/routes/cart.py
# مسارات السلة

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone

from core.database import db, get_current_user
from models.schemas import CartItem

router = APIRouter(prefix="/cart", tags=["Cart"])

@router.get("")
async def get_cart(user: dict = Depends(get_current_user)) -> dict:
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart or not cart.get("items"):
        return {"items": [], "total": 0}
    
    # جلب جميع المنتجات دفعة واحدة بدلاً من query لكل منتج
    product_ids = list(set(item["product_id"] for item in cart.get("items", [])))
    products_list = await db.products.find(
        {"id": {"$in": product_ids}},
        {"_id": 0}
    ).to_list(None)
    products_map = {p["id"]: p for p in products_list}
    
    items_with_products = []
    total = 0
    
    for item in cart.get("items", []):
        product = products_map.get(item["product_id"])
        if product:
            # حساب السعر بناءً على الوزن المحدد (إن وجد)
            item_price = product["price"]
            selected_weight = item.get("selected_weight")
            
            if selected_weight and product.get("weight_variants"):
                # البحث عن سعر الوزن المحدد
                weight_variant = next(
                    (v for v in product["weight_variants"] if v.get("weight") == selected_weight), 
                    None
                )
                if weight_variant:
                    item_price = weight_variant.get("price", product["price"])
            
            item_total = item_price * item["quantity"]
            total += item_total
            items_with_products.append({
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "selected_size": item.get("selected_size"),
                "selected_weight": selected_weight,
                "item_price": item_price,
                "product": product
            })
    
    return {"items": items_with_products, "total": total}

@router.post("/add")
async def add_to_cart(item: CartItem, user: dict = Depends(get_current_user)) -> dict:
    product = await db.products.find_one({"id": item.product_id, "is_active": True, "is_approved": True})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    if product["stock"] < item.quantity:
        raise HTTPException(status_code=400, detail=f"عذراً، الكمية المتوفرة من هذا المنتج هي {product['stock']} قطعة فقط")
    
    # التحقق من صحة الوزن المحدد (إن وجد)
    if item.selected_weight and product.get("weight_variants"):
        valid_weight = any(v.get("weight") == item.selected_weight for v in product["weight_variants"])
        if not valid_weight:
            raise HTTPException(status_code=400, detail="خيار الوزن غير صالح")
    
    # التحقق من الحد الأقصى لكل عميل
    max_per_customer = product.get("max_per_customer")
    if max_per_customer and max_per_customer > 0 and item.quantity > max_per_customer:
        raise HTTPException(status_code=400, detail=f"الحد الأقصى المسموح من هذا المنتج هو {max_per_customer} قطعة لكل عميل")
    
    cart = await db.carts.find_one({"user_id": user["id"]})
    
    # إنشاء مفتاح فريد للعنصر (منتج + مقاس + وزن)
    def items_match(cart_item) -> dict:
        return (cart_item["product_id"] == item.product_id and 
                cart_item.get("selected_size") == item.selected_size and
                cart_item.get("selected_weight") == item.selected_weight)
    
    if cart:
        # البحث عن نفس المنتج بنفس المقاس والوزن
        existing_item = next((i for i in cart["items"] if items_match(i)), None)
        
        if existing_item:
            new_quantity = existing_item["quantity"] + item.quantity
            if new_quantity > product["stock"]:
                raise HTTPException(status_code=400, detail=f"عذراً، الكمية المتوفرة من هذا المنتج هي {product['stock']} قطعة فقط")
            
            # التحقق من الحد الأقصى عند الإضافة لمنتج موجود
            if max_per_customer and max_per_customer > 0:
                total_product_qty = sum(i["quantity"] for i in cart["items"] if i["product_id"] == item.product_id) + item.quantity
                if total_product_qty > max_per_customer:
                    raise HTTPException(status_code=400, detail=f"الحد الأقصى المسموح من هذا المنتج هو {max_per_customer} قطعة لكل عميل")
            
            # تحديث الكمية لنفس المنتج ونفس المقاس/الوزن
            await db.carts.update_one(
                {"user_id": user["id"]},
                {"$set": {"items.$[elem].quantity": new_quantity}},
                array_filters=[{
                    "elem.product_id": item.product_id, 
                    "elem.selected_size": item.selected_size,
                    "elem.selected_weight": item.selected_weight
                }]
            )
        else:
            # التحقق من الحد الأقصى للمنتج الجديد
            if max_per_customer and max_per_customer > 0:
                total_product_qty = sum(i["quantity"] for i in cart["items"] if i["product_id"] == item.product_id) + item.quantity
                if total_product_qty > max_per_customer:
                    raise HTTPException(status_code=400, detail=f"الحد الأقصى المسموح من هذا المنتج هو {max_per_customer} قطعة لكل عميل")
            
            # إضافة كعنصر جديد
            await db.carts.update_one(
                {"user_id": user["id"]},
                {"$push": {"items": {
                    "product_id": item.product_id, 
                    "quantity": item.quantity, 
                    "selected_size": item.selected_size,
                    "selected_weight": item.selected_weight
                }}}
            )
    else:
        await db.carts.insert_one({
            "user_id": user["id"],
            "items": [{
                "product_id": item.product_id, 
                "quantity": item.quantity, 
                "selected_size": item.selected_size,
                "selected_weight": item.selected_weight
            }],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "تمت الإضافة للسلة"}

@router.put("/update")
async def update_cart_item(item: CartItem, user: dict = Depends(get_current_user)) -> dict:
    if item.quantity <= 0:
        # حذف العنصر بنفس المنتج والمقاس والوزن
        await db.carts.update_one(
            {"user_id": user["id"]},
            {"$pull": {"items": {
                "product_id": item.product_id, 
                "selected_size": item.selected_size,
                "selected_weight": item.selected_weight
            }}}
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
        if max_per_customer and max_per_customer > 0:
            cart = await db.carts.find_one({"user_id": user["id"]})
            if cart:
                # حساب إجمالي الكمية من نفس المنتج (باستثناء العنصر الحالي)
                total_other = sum(
                    i["quantity"] for i in cart.get("items", []) 
                    if i["product_id"] == item.product_id and 
                    not (i.get("selected_size") == item.selected_size and i.get("selected_weight") == item.selected_weight)
                )
                if total_other + item.quantity > max_per_customer:
                    raise HTTPException(status_code=400, detail=f"الحد الأقصى المسموح من هذا المنتج هو {max_per_customer} قطعة لكل عميل")
        
        # تحديث الكمية لنفس المنتج والمقاس والوزن
        await db.carts.update_one(
            {"user_id": user["id"]},
            {"$set": {"items.$[elem].quantity": item.quantity}},
            array_filters=[{
                "elem.product_id": item.product_id, 
                "elem.selected_size": item.selected_size,
                "elem.selected_weight": item.selected_weight
            }]
        )
    return {"message": "تم التحديث"}

@router.delete("/{product_id}")
async def remove_from_cart(
    product_id: str, 
    selected_size: str = None, 
    selected_weight: str = None,
    user: dict = Depends(get_current_user)
) -> dict:
    # بناء فلتر الحذف
    filter_query = {"product_id": product_id}
    if selected_size is not None:
        filter_query["selected_size"] = selected_size
    if selected_weight is not None:
        filter_query["selected_weight"] = selected_weight
    
    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$pull": {"items": filter_query}}
    )
    return {"message": "تمت الإزالة"}

@router.delete("")
async def clear_cart(user: dict = Depends(get_current_user)) -> dict:
    await db.carts.delete_one({"user_id": user["id"]})
    return {"message": "تم إفراغ السلة"}
