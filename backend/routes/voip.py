# /app/backend/routes/voip.py
# نظام مكالمات VoIP - للاتصال بين السائق والعميل

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import os
import asyncio

from core.database import db, get_current_user

# مجلد حفظ التسجيلات
RECORDINGS_DIR = "/app/backend/uploads/recordings"
os.makedirs(RECORDINGS_DIR, exist_ok=True)

# مدة الاحتفاظ بالتسجيلات (7 أيام)
RECORDING_RETENTION_DAYS = 7

router = APIRouter(prefix="/voip", tags=["VoIP"])

class CallRequest(BaseModel):
    order_id: str
    order_type: str = "food"  # food أو shopping
    caller_type: str = "driver"  # driver أو customer

class CallSignal(BaseModel):
    call_id: str
    signal_type: str  # offer, answer, ice-candidate
    signal_data: dict

class CallAction(BaseModel):
    call_id: str
    action: str  # accept, reject, end

# إنشاء مكالمة جديدة
@router.post("/call/initiate")
async def initiate_call(data: CallRequest, user: dict = Depends(get_current_user)):
    """بدء مكالمة VoIP - للسائق أو العميل"""
    
    # جلب معلومات الطلب
    if data.order_type == "food":
        order = await db.food_orders.find_one({"id": data.order_id}, {"_id": 0})
    else:
        order = await db.orders.find_one({"id": data.order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # التحقق من صلاحيات المتصل
    driver_id = order.get("driver_id")
    customer_id = order.get("customer_id") or order.get("user_id")
    
    if data.caller_type == "driver":
        if user["id"] != driver_id:
            raise HTTPException(status_code=403, detail="غير مصرح - لست السائق المعين")
        callee_id = customer_id
        caller_name = user.get("full_name") or user.get("name", "السائق")
    else:
        if user["id"] != customer_id:
            raise HTTPException(status_code=403, detail="غير مصرح - لست صاحب الطلب")
        callee_id = driver_id
        caller_name = user.get("full_name") or user.get("name", "العميل")
    
    if not callee_id:
        raise HTTPException(status_code=400, detail="لا يمكن إجراء المكالمة - الطرف الآخر غير متاح")
    
    # التحقق من عدم وجود مكالمة نشطة
    existing_call = await db.voip_calls.find_one({
        "order_id": data.order_id,
        "status": {"$in": ["ringing", "connected"]}
    })
    if existing_call:
        raise HTTPException(status_code=400, detail="يوجد مكالمة نشطة بالفعل")
    
    # جلب معلومات المستقبل
    callee = await db.users.find_one({"id": callee_id}, {"_id": 0, "id": 1, "name": 1, "full_name": 1})
    callee_name = callee.get("full_name") or callee.get("name", "المستخدم") if callee else "المستخدم"
    
    # إنشاء المكالمة
    call = {
        "id": str(uuid.uuid4()),
        "order_id": data.order_id,
        "order_type": data.order_type,
        "order_number": order.get("order_number", ""),
        "caller_id": user["id"],
        "caller_name": caller_name,
        "caller_type": data.caller_type,
        "callee_id": callee_id,
        "callee_name": callee_name,
        "callee_type": "customer" if data.caller_type == "driver" else "driver",
        "status": "ringing",  # ringing, connected, ended, missed, rejected
        "started_at": datetime.now(timezone.utc).isoformat(),
        "connected_at": None,
        "ended_at": None,
        "duration_seconds": 0,
        "end_reason": None  # caller_ended, callee_ended, callee_rejected, timeout, error
    }
    
    await db.voip_calls.insert_one(call)
    
    # إرسال إشعار للمستقبل
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": callee_id,
        "title": "📞 مكالمة واردة!",
        "message": f"{caller_name} يتصل بك بخصوص الطلب #{order.get('order_number', '')}",
        "type": "incoming_call",
        "data": {
            "call_id": call["id"],
            "order_id": data.order_id,
            "caller_name": caller_name,
            "caller_type": data.caller_type
        },
        "is_read": False,
        "play_sound": True,
        "priority": "high",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    return {
        "call_id": call["id"],
        "callee_id": callee_id,
        "callee_name": callee_name,
        "status": "ringing"
    }

# معالجة إشارات WebRTC
@router.post("/call/signal")
async def handle_signal(data: CallSignal, user: dict = Depends(get_current_user)):
    """معالجة إشارات WebRTC (offer, answer, ice-candidate)"""
    
    call = await db.voip_calls.find_one({"id": data.call_id})
    if not call:
        raise HTTPException(status_code=404, detail="المكالمة غير موجودة")
    
    # التحقق من أن المستخدم طرف في المكالمة
    if user["id"] not in [call["caller_id"], call["callee_id"]]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # تحديد المستقبل
    recipient_id = call["callee_id"] if user["id"] == call["caller_id"] else call["caller_id"]
    
    # حفظ الإشارة في قائمة انتظار
    signal_doc = {
        "id": str(uuid.uuid4()),
        "call_id": data.call_id,
        "sender_id": user["id"],
        "recipient_id": recipient_id,
        "signal_type": data.signal_type,
        "signal_data": data.signal_data,
        "processed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.voip_signals.insert_one(signal_doc)
    
    return {"status": "signal_queued", "signal_id": signal_doc["id"]}

# جلب الإشارات المعلقة
@router.get("/call/{call_id}/signals")
async def get_pending_signals(call_id: str, user: dict = Depends(get_current_user)):
    """جلب الإشارات المعلقة للمستخدم"""
    
    call = await db.voip_calls.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="المكالمة غير موجودة")
    
    if user["id"] not in [call["caller_id"], call["callee_id"]]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # جلب الإشارات غير المعالجة للمستخدم
    signals = await db.voip_signals.find({
        "call_id": call_id,
        "recipient_id": user["id"],
        "processed": False
    }, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    # تحديث الإشارات كمعالجة
    if signals:
        signal_ids = [s["id"] for s in signals]
        await db.voip_signals.update_many(
            {"id": {"$in": signal_ids}},
            {"$set": {"processed": True}}
        )
    
    return {"signals": signals, "call_status": call["status"]}

# قبول/رفض/إنهاء المكالمة
@router.post("/call/action")
async def call_action(data: CallAction, user: dict = Depends(get_current_user)):
    """قبول أو رفض أو إنهاء المكالمة"""
    
    call = await db.voip_calls.find_one({"id": data.call_id})
    if not call:
        raise HTTPException(status_code=404, detail="المكالمة غير موجودة")
    
    if user["id"] not in [call["caller_id"], call["callee_id"]]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    now = datetime.now(timezone.utc).isoformat()
    update_data = {"updated_at": now}
    
    if data.action == "accept":
        if user["id"] != call["callee_id"]:
            raise HTTPException(status_code=400, detail="فقط المستقبل يمكنه قبول المكالمة")
        if call["status"] != "ringing":
            raise HTTPException(status_code=400, detail="المكالمة ليست في حالة انتظار")
        update_data["status"] = "connected"
        update_data["connected_at"] = now
        
    elif data.action == "reject":
        if user["id"] != call["callee_id"]:
            raise HTTPException(status_code=400, detail="فقط المستقبل يمكنه رفض المكالمة")
        if call["status"] != "ringing":
            raise HTTPException(status_code=400, detail="المكالمة ليست في حالة انتظار")
        update_data["status"] = "rejected"
        update_data["ended_at"] = now
        update_data["end_reason"] = "callee_rejected"
        
    elif data.action == "end":
        if call["status"] not in ["ringing", "connected"]:
            raise HTTPException(status_code=400, detail="المكالمة منتهية بالفعل")
        update_data["status"] = "ended"
        update_data["ended_at"] = now
        update_data["end_reason"] = "caller_ended" if user["id"] == call["caller_id"] else "callee_ended"
        
        # حساب مدة المكالمة
        if call.get("connected_at"):
            from datetime import datetime as dt
            connected = dt.fromisoformat(call["connected_at"].replace("Z", "+00:00"))
            ended = dt.fromisoformat(now.replace("Z", "+00:00"))
            update_data["duration_seconds"] = int((ended - connected).total_seconds())
    
    await db.voip_calls.update_one({"id": data.call_id}, {"$set": update_data})
    
    # إشعار الطرف الآخر
    other_id = call["callee_id"] if user["id"] == call["caller_id"] else call["caller_id"]
    notification_title = {
        "accept": "✅ تم قبول المكالمة",
        "reject": "❌ تم رفض المكالمة",
        "end": "📞 انتهت المكالمة"
    }
    
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": other_id,
        "title": notification_title.get(data.action, "📞 تحديث المكالمة"),
        "message": f"الطلب #{call['order_number']}",
        "type": f"call_{data.action}",
        "data": {"call_id": data.call_id, "action": data.action},
        "is_read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification)
    
    return {"status": update_data.get("status", call["status"]), "action": data.action}

# جلب حالة المكالمة
@router.get("/call/{call_id}")
async def get_call_status(call_id: str, user: dict = Depends(get_current_user)):
    """جلب حالة المكالمة الحالية"""
    
    call = await db.voip_calls.find_one({"id": call_id}, {"_id": 0})
    if not call:
        raise HTTPException(status_code=404, detail="المكالمة غير موجودة")
    
    if user["id"] not in [call["caller_id"], call["callee_id"]]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    return call

# جلب المكالمات النشطة للمستخدم
@router.get("/active-calls")
async def get_active_calls(user: dict = Depends(get_current_user)):
    """جلب المكالمات النشطة للمستخدم"""
    
    calls = await db.voip_calls.find({
        "$or": [
            {"caller_id": user["id"]},
            {"callee_id": user["id"]}
        ],
        "status": {"$in": ["ringing", "connected"]}
    }, {"_id": 0}).sort("started_at", -1).to_list(10)
    
    return {"calls": calls}

# جلب سجل المكالمات
@router.get("/call-history")
async def get_call_history(
    order_id: Optional[str] = None,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """جلب سجل المكالمات"""
    
    query = {
        "$or": [
            {"caller_id": user["id"]},
            {"callee_id": user["id"]}
        ]
    }
    
    if order_id:
        query["order_id"] = order_id
    
    calls = await db.voip_calls.find(
        query,
        {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(None)
    
    return {"calls": calls}

# التحقق من وجود مكالمة واردة
@router.get("/incoming-call")
async def check_incoming_call(user: dict = Depends(get_current_user)):
    """التحقق من وجود مكالمة واردة للمستخدم"""
    
    call = await db.voip_calls.find_one({
        "callee_id": user["id"],
        "status": "ringing"
    }, {"_id": 0})
    
    if call:
        return {"has_incoming_call": True, "call": call}
    return {"has_incoming_call": False, "call": None}



# ==================== تسجيل المكالمات ====================

# رفع تسجيل المكالمة
@router.post("/call/{call_id}/upload-recording")
async def upload_recording(
    call_id: str,
    recording: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """رفع تسجيل المكالمة بعد انتهائها"""
    
    call = await db.voip_calls.find_one({"id": call_id})
    if not call:
        raise HTTPException(status_code=404, detail="المكالمة غير موجودة")
    
    # التحقق من أن المستخدم طرف في المكالمة
    if user["id"] not in [call["caller_id"], call["callee_id"]]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # التحقق من نوع الملف
    if not recording.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="يجب أن يكون الملف صوتياً")
    
    # إنشاء اسم فريد للملف
    file_ext = recording.filename.split(".")[-1] if "." in recording.filename else "webm"
    filename = f"{call_id}_{user['id']}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.{file_ext}"
    filepath = os.path.join(RECORDINGS_DIR, filename)
    
    # حفظ الملف
    content = await recording.read()
    with open(filepath, "wb") as f:
        f.write(content)
    
    # تحديث المكالمة بمعلومات التسجيل
    recording_info = {
        "id": str(uuid.uuid4()),
        "filename": filename,
        "filepath": filepath,
        "uploader_id": user["id"],
        "uploader_type": "caller" if user["id"] == call["caller_id"] else "callee",
        "size_bytes": len(content),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=RECORDING_RETENTION_DAYS)).isoformat()
    }
    
    await db.voip_calls.update_one(
        {"id": call_id},
        {
            "$set": {"has_recording": True},
            "$push": {"recordings": recording_info}
        }
    )
    
    return {
        "status": "success",
        "message": "تم رفع التسجيل بنجاح",
        "recording_id": recording_info["id"],
        "expires_at": recording_info["expires_at"]
    }

# جلب تسجيلات المكالمة (للمدير فقط)
@router.get("/call/{call_id}/recordings")
async def get_call_recordings(call_id: str, user: dict = Depends(get_current_user)):
    """جلب تسجيلات المكالمة - للمدير فقط"""
    
    # التحقق من صلاحيات المدير
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="هذه الميزة متاحة للمدير فقط")
    
    call = await db.voip_calls.find_one({"id": call_id}, {"_id": 0})
    if not call:
        raise HTTPException(status_code=404, detail="المكالمة غير موجودة")
    
    recordings = call.get("recordings", [])
    
    return {
        "call_id": call_id,
        "caller_name": call.get("caller_name"),
        "callee_name": call.get("callee_name"),
        "duration_seconds": call.get("duration_seconds", 0),
        "recordings": recordings
    }

# تشغيل/تحميل تسجيل (للمدير فقط)
@router.get("/recording/{recording_id}/play")
async def play_recording(recording_id: str, user: dict = Depends(get_current_user)):
    """تشغيل أو تحميل تسجيل المكالمة - للمدير فقط"""
    
    # التحقق من صلاحيات المدير
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="هذه الميزة متاحة للمدير فقط")
    
    # البحث عن التسجيل
    call = await db.voip_calls.find_one(
        {"recordings.id": recording_id},
        {"_id": 0, "recordings": 1}
    )
    
    if not call:
        raise HTTPException(status_code=404, detail="التسجيل غير موجود")
    
    recording = None
    for rec in call.get("recordings", []):
        if rec["id"] == recording_id:
            recording = rec
            break
    
    if not recording:
        raise HTTPException(status_code=404, detail="التسجيل غير موجود")
    
    filepath = recording.get("filepath")
    if not filepath or not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="ملف التسجيل غير موجود")
    
    return FileResponse(
        filepath,
        media_type="audio/webm",
        filename=recording.get("filename", "recording.webm")
    )

# جلب جميع المكالمات المسجلة (للمدير)
@router.get("/admin/recorded-calls")
async def get_recorded_calls(
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_current_user)
):
    """جلب جميع المكالمات التي تحتوي على تسجيلات - للمدير فقط"""
    
    if user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="هذه الميزة متاحة للمدير فقط")
    
    skip = (page - 1) * limit
    
    # جلب المكالمات المسجلة
    calls = await db.voip_calls.find(
        {"has_recording": True},
        {"_id": 0}
    ).sort("started_at", -1).skip(skip).limit(limit).to_list(None)
    
    total = await db.voip_calls.count_documents({"has_recording": True})
    
    return {
        "calls": calls,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

# حذف التسجيلات المنتهية (مهمة خلفية)
async def cleanup_expired_recordings():
    """حذف التسجيلات التي انتهت صلاحيتها"""
    now = datetime.now(timezone.utc).isoformat()
    
    # البحث عن المكالمات مع تسجيلات منتهية
    calls = await db.voip_calls.find(
        {"recordings.expires_at": {"$lt": now}},
        {"_id": 0, "id": 1, "recordings": 1}
    ).to_list(None)
    
    for call in calls:
        valid_recordings = []
        for rec in call.get("recordings", []):
            if rec.get("expires_at", "") < now:
                # حذف الملف
                filepath = rec.get("filepath")
                if filepath and os.path.exists(filepath):
                    try:
                        os.remove(filepath)
                    except Exception:
                        pass
            else:
                valid_recordings.append(rec)
        
        # تحديث المكالمة
        await db.voip_calls.update_one(
            {"id": call["id"]},
            {
                "$set": {
                    "recordings": valid_recordings,
                    "has_recording": len(valid_recordings) > 0
                }
            }
        )

# تشغيل التنظيف كل 24 ساعة
async def start_cleanup_task():
    while True:
        await asyncio.sleep(86400)  # 24 ساعة
        await cleanup_expired_recordings()
