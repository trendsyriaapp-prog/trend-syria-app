# /app/backend/routes/reviews.py
# مسارات التقييمات

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user
from models.schemas import ReviewCreate

router = APIRouter(prefix="/reviews", tags=["Reviews"])

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
