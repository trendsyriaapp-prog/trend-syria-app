# /app/backend/routes/feedback.py
# مسارات اقتراحات وملاحظات المستخدمين

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional
import uuid

from core.database import db, get_current_user, get_optional_user, create_notification_for_role

router = APIRouter(prefix="/feedback", tags=["Feedback"])

class FeedbackCreate(BaseModel):
    type: str  # suggestion, complaint, question
    message: str
    user_type: Optional[str] = "guest"

class FeedbackResponse(BaseModel):
    response: str

# ============== إرسال ملاحظة/اقتراح ==============

@router.post("")
async def create_feedback(data: FeedbackCreate, user: dict = Depends(get_optional_user)) -> dict:
    """إنشاء ملاحظة أو اقتراح جديد - متاح للجميع"""
    
    if not data.message or len(data.message.strip()) < 5:
        raise HTTPException(status_code=400, detail="الرسالة قصيرة جداً")
    
    feedback_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # تحديد نوع الرسالة بالعربي
    type_labels = {
        "suggestion": "اقتراح تحسين",
        "complaint": "شكوى", 
        "question": "استفسار"
    }
    
    feedback_doc = {
        "id": feedback_id,
        "type": data.type,
        "type_label": type_labels.get(data.type, "أخرى"),
        "message": data.message.strip(),
        "user_id": user["id"] if user else None,
        "user_name": user.get("name") if user else "زائر",
        "user_phone": user.get("phone") if user else None,
        "user_type": user.get("user_type") if user else data.user_type,
        "status": "pending",  # pending, reviewed, resolved
        "admin_response": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.feedback.insert_one(feedback_doc)
    
    # إشعار للمدير
    user_type_labels = {
        "buyer": "عميل",
        "seller": "بائع منتجات",
        "food_seller": "بائع طعام",
        "delivery": "موظف توصيل",
        "guest": "زائر"
    }
    user_type_label = user_type_labels.get(feedback_doc["user_type"], "مستخدم")
    
    await create_notification_for_role(
        role="admin",
        title=f"📩 {type_labels.get(data.type, 'رسالة')} جديدة",
        message=f"من {user_type_label}: {feedback_doc['user_name']}\n{data.message[:100]}...",
        notification_type="new_feedback"
    )
    
    return {
        "success": True,
        "message": "تم إرسال رسالتك بنجاح",
        "feedback_id": feedback_id
    }

# ============== جلب جميع الملاحظات (للمدير) ==============

@router.get("/all")
async def get_all_feedback(
    status: Optional[str] = None,
    type: Optional[str] = None,
    user: dict = Depends(get_current_user)
) -> dict:
    """جلب جميع الملاحظات والاقتراحات - للمدير فقط"""
    
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    query = {}
    if status:
        query["status"] = status
    if type:
        query["type"] = type
    
    feedback_list = await db.feedback.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # إحصائيات
    total = len(feedback_list)
    pending = sum(1 for f in feedback_list if f["status"] == "pending")
    
    return {
        "feedback": feedback_list,
        "stats": {
            "total": total,
            "pending": pending,
            "reviewed": total - pending
        }
    }

# ============== الرد على ملاحظة (للمدير) ==============

@router.post("/{feedback_id}/respond")
async def respond_to_feedback(
    feedback_id: str,
    data: FeedbackResponse,
    user: dict = Depends(get_current_user)
) -> dict:
    """الرد على ملاحظة - للمدير فقط"""
    
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    feedback = await db.feedback.find_one({"id": feedback_id})
    if not feedback:
        raise HTTPException(status_code=404, detail="الملاحظة غير موجودة")
    
    now = datetime.now(timezone.utc).isoformat()
    
    await db.feedback.update_one(
        {"id": feedback_id},
        {
            "$set": {
                "status": "reviewed",
                "admin_response": data.response,
                "responded_by": user["id"],
                "responded_at": now,
                "updated_at": now
            }
        }
    )
    
    # إشعار للمستخدم إذا كان مسجل
    if feedback.get("user_id"):
        from core.database import create_notification_for_user
        from core.firebase_admin import send_push_to_user
        
        # حفظ الإشعار في قاعدة البيانات
        await create_notification_for_user(
            user_id=feedback["user_id"],
            title="✅ تم الرد على رسالتك",
            message=f"رد الإدارة: {data.response[:100]}...",
            notification_type="feedback_response"
        )
        
        # إرسال push notification فوري
        await send_push_to_user(
            user_id=feedback["user_id"],
            title="✅ تم الرد على رسالتك",
            body=f"رد الإدارة: {data.response[:80]}...",
            data={"type": "feedback_response", "feedback_id": feedback_id}
        )
    
    return {"success": True, "message": "تم إرسال الرد بنجاح"}

# ============== حذف ملاحظة (للمدير) ==============

@router.delete("/{feedback_id}")
async def delete_feedback(feedback_id: str, user: dict = Depends(get_current_user)) -> dict:
    """حذف ملاحظة - للمدير فقط"""
    
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدير فقط")
    
    result = await db.feedback.delete_one({"id": feedback_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="الملاحظة غير موجودة")
    
    return {"success": True, "message": "تم الحذف بنجاح"}
