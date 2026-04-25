# /app/backend/routes/messages.py
# مسارات الرسائل والمحادثات

from fastapi import APIRouter, Depends
from datetime import datetime, timezone
import uuid

from core.database import db, get_current_user
from helpers.datetime_helpers import get_now
from models.schemas import MessageCreate

router = APIRouter(prefix="/messages", tags=["Messages"])

@router.post("")
async def send_message(message: MessageCreate, user: dict = Depends(get_current_user)) -> dict:
    msg_doc = {
        "id": str(uuid.uuid4()),
        "sender_id": user["id"],
        "sender_name": user.get("full_name", user.get("name", "")),
        "receiver_id": message.receiver_id,
        "content": message.content,
        "product_id": message.product_id,
        "is_read": False,
        "created_at": get_now()
    }
    await db.messages.insert_one(msg_doc)
    return {"message": "تم إرسال الرسالة"}

@router.get("")
async def get_conversations(user: dict = Depends(get_current_user)) -> dict:
    pipeline = [
        {"$match": {"$or": [{"sender_id": user["id"]}, {"receiver_id": user["id"]}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": {
                "$cond": [
                    {"$eq": ["$sender_id", user["id"]]},
                    "$receiver_id",
                    "$sender_id"
                ]
            },
            "last_message": {"$first": "$$ROOT"},
            "unread_count": {
                "$sum": {
                    "$cond": [
                        {"$and": [
                            {"$eq": ["$receiver_id", user["id"]]},
                            {"$eq": ["$is_read", False]}
                        ]},
                        1,
                        0
                    ]
                }
            }
        }}
    ]
    conversations = await db.messages.aggregate(pipeline).to_list(100)
    
    # جلب جميع المستخدمين دفعة واحدة
    other_user_ids = [conv["_id"] for conv in conversations if conv["_id"]]
    users_list = await db.users.find(
        {"id": {"$in": other_user_ids}},
        {"_id": 0, "password": 0}
    ).to_list(None)
    users_map = {u["id"]: u for u in users_list}
    
    result = []
    for conv in conversations:
        other_user = users_map.get(conv["_id"])
        if other_user:
            result.append({
                "user": other_user,
                "last_message": {
                    "content": conv["last_message"]["content"],
                    "created_at": conv["last_message"]["created_at"],
                    "is_mine": conv["last_message"]["sender_id"] == user["id"]
                },
                "unread_count": conv["unread_count"]
            })
    
    return result

@router.get("/{other_user_id}")
async def get_chat_messages(other_user_id: str, user: dict = Depends(get_current_user)) -> dict:
    messages = await db.messages.find({
        "$or": [
            {"sender_id": user["id"], "receiver_id": other_user_id},
            {"sender_id": other_user_id, "receiver_id": user["id"]}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    # Mark as read
    await db.messages.update_many(
        {"sender_id": other_user_id, "receiver_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return messages
