# /app/backend/routes/notifications.py
# مسارات الإشعارات

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user
from models.schemas import NotificationCreate

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
async def get_notifications(user: dict = Depends(get_current_user)):
    user_type = user.get("user_type", "buyer")
    target_role = user_type + "s" if not user_type.endswith("s") else user_type
    
    notifications = await db.notifications.find(
        {"$or": [
            {"target": "all"},
            {"target": target_role},
            {"target": user_type},
            {"user_id": user["id"]}
        ]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    # Get user's read notifications
    user_reads = await db.notification_reads.find(
        {"user_id": user["id"]},
        {"_id": 0, "notification_id": 1}
    ).to_list(100)
    read_ids = {r["notification_id"] for r in user_reads}
    
    # Add is_read flag
    for n in notifications:
        n["is_read"] = n["id"] in read_ids
    
    return notifications

@router.post("/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    await db.notification_reads.update_one(
        {"user_id": user["id"], "notification_id": notification_id},
        {"$set": {
            "user_id": user["id"],
            "notification_id": notification_id,
            "read_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "تم تحديد الإشعار كمقروء"}

@router.post("/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    user_type = user.get("user_type", "buyer")
    target_role = user_type + "s" if not user_type.endswith("s") else user_type
    
    notifications = await db.notifications.find(
        {"$or": [
            {"target": "all"},
            {"target": target_role},
            {"target": user_type},
            {"user_id": user["id"]}
        ]},
        {"_id": 0, "id": 1}
    ).to_list(100)
    
    for n in notifications:
        await db.notification_reads.update_one(
            {"user_id": user["id"], "notification_id": n["id"]},
            {"$set": {
                "user_id": user["id"],
                "notification_id": n["id"],
                "read_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    
    return {"message": "تم تحديد جميع الإشعارات كمقروءة"}
