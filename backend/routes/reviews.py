# /app/backend/routes/reviews.py
# مسارات التقييمات

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

from core.database import db, get_current_user
from models.schemas import ReviewCreate

router = APIRouter(prefix="/reviews", tags=["Reviews"])

class SellerReplyCreate(BaseModel):
    reply: str

@router.post("")
async def create_review(review: ReviewCreate, user: dict = Depends(get_current_user)):
    # Check if user purchased this product
    order = await db.orders.find_one({
        "user_id": user["id"],
        "items.product_id": review.product_id,
        "status": {"$in": ["paid", "completed", "delivered"]}
    })
    if not order:
        raise HTTPException(status_code=400, detail="يجب شراء المنتج أولاً للتقييم")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({
        "user_id": user["id"],
        "product_id": review.product_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="تم تقييم هذا المنتج مسبقاً")
    
    review_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("full_name", user.get("name", "")),
        "product_id": review.product_id,
        "rating": review.rating,
        "comment": review.comment,
        "images": review.images or [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)
    
    # Update product rating
    reviews = await db.reviews.find({"product_id": review.product_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.products.update_one(
        {"id": review.product_id},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(reviews)}}
    )
    
    return {"message": "تم إضافة التقييم"}

@router.get("/{product_id}")
async def get_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).to_list(100)
    return reviews

@router.post("/{review_id}/reply")
async def add_seller_reply(review_id: str, data: SellerReplyCreate, user: dict = Depends(get_current_user)):
    """البائع يرد على تقييم منتجه"""
    # Get the review
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="التقييم غير موجود")
    
    # Get the product to verify ownership
    product = await db.products.find_one({"id": review["product_id"]})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    # Check if user is the seller of this product
    if product.get("seller_id") != user["id"]:
        raise HTTPException(status_code=403, detail="يمكن فقط لصاحب المنتج الرد على التقييمات")
    
    # Check if already replied
    if review.get("seller_reply"):
        raise HTTPException(status_code=400, detail="تم الرد على هذا التقييم مسبقاً")
    
    # Add the reply
    await db.reviews.update_one(
        {"id": review_id},
        {"$set": {
            "seller_reply": data.reply,
            "seller_reply_at": datetime.now(timezone.utc).isoformat(),
            "seller_name": user.get("store_name", user.get("full_name", "البائع"))
        }}
    )
    
    return {"message": "تم إضافة الرد بنجاح"}

@router.delete("/{review_id}/reply")
async def delete_seller_reply(review_id: str, user: dict = Depends(get_current_user)):
    """البائع يحذف رده على التقييم"""
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="التقييم غير موجود")
    
    product = await db.products.find_one({"id": review["product_id"]})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    if product.get("seller_id") != user["id"]:
        raise HTTPException(status_code=403, detail="يمكن فقط لصاحب المنتج حذف الرد")
    
    if not review.get("seller_reply"):
        raise HTTPException(status_code=400, detail="لا يوجد رد لحذفه")
    
    await db.reviews.update_one(
        {"id": review_id},
        {"$unset": {"seller_reply": "", "seller_reply_at": "", "seller_name": ""}}
    )
    
    return {"message": "تم حذف الرد"}

@router.get("/seller/pending")
async def get_seller_pending_reviews(user: dict = Depends(get_current_user)):
    """جلب التقييمات التي لم يرد عليها البائع بعد"""
    # Get all seller's products
    products = await db.products.find({"seller_id": user["id"]}, {"id": 1, "name": 1, "images": 1}).to_list(1000)
    product_ids = [p["id"] for p in products]
    product_map = {p["id"]: p for p in products}
    
    if not product_ids:
        return []
    
    # Get reviews without seller reply
    reviews = await db.reviews.find({
        "product_id": {"$in": product_ids},
        "seller_reply": {"$exists": False}
    }, {"_id": 0}).to_list(100)
    
    # Add product info to each review
    for review in reviews:
        product = product_map.get(review["product_id"], {})
        review["product_name"] = product.get("name", "")
        review["product_image"] = product.get("images", [""])[0] if product.get("images") else ""
    
    return reviews
