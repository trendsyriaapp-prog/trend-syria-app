# /app/backend/routes/websocket.py
# WebSocket endpoints للتحديثات الفورية

import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import jwt
import os

from services.websocket_manager import manager
from core.database import db

logger = logging.getLogger(__name__)
router = APIRouter()

SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-here")


async def authenticate_websocket(token: str) -> Optional[dict]:
    """التحقق من token وإرجاع بيانات المستخدم"""
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id") or payload.get("sub")
        
        if not user_id:
            return None
        
        # جلب بيانات المستخدم
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        return user
        
    except jwt.ExpiredSignatureError:
        logger.warning("WebSocket token expired")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"WebSocket invalid token: {e}")
        return None


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(None),
    user_id: str = Query(None)
) -> dict:
    """
    WebSocket endpoint الرئيسي
    
    الاتصال: 
    - ws://domain/api/ws?token=JWT_TOKEN (الطريقة الأصلية)
    - ws://domain/api/ws?user_id=USER_ID (مع Cookies)
    
    أنواع الرسائل المستقبلة:
    - {"type": "join_room", "room": "room_name"}
    - {"type": "leave_room", "room": "room_name"}
    - {"type": "ping"} -> يرد {"type": "pong"}
    
    أنواع الرسائل المرسلة:
    - {"type": "connected", ...}
    - {"type": "order_update", ...}
    - {"type": "driver_location", ...}
    - {"type": "new_order_available", ...}
    - {"type": "notification", ...}
    """
    
    user = None
    
    # محاولة المصادقة بالـ token أولاً
    if token:
        user = await authenticate_websocket(token)
    
    # إذا لم ينجح الـ token، نحاول بالـ user_id
    if not user and user_id:
        # جلب بيانات المستخدم مباشرة
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    
    if not user:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    ws_user_id = user["id"]
    user_type = user.get("user_type", "buyer")
    city = user.get("city", "")
    
    # تحديد الغرف الافتراضية بناءً على نوع المستخدم
    default_rooms = [f"user_{ws_user_id}"]
    
    if user_type == "delivery":
        # السائق ينضم لغرفة سائقي مدينته
        if city:
            default_rooms.append(f"drivers_{city}")
        default_rooms.append("drivers_all")
    
    elif user_type in ["admin", "sub_admin"]:
        default_rooms.append("admins")
    
    elif user_type == "seller":
        # البائع ينضم لغرفة متجره
        store = await db.food_stores.find_one({"owner_id": ws_user_id}, {"_id": 0, "id": 1})
        if store:
            default_rooms.append(f"store_{store['id']}")
    
    # الاتصال
    await manager.connect(websocket, ws_user_id, default_rooms)
    
    # Heartbeat task
    async def heartbeat() -> None:
        while True:
            try:
                await asyncio.sleep(30)
                await websocket.send_json({"type": "ping"})
            except Exception:
                break
    
    heartbeat_task = asyncio.create_task(heartbeat())
    
    try:
        while True:
            # استقبال الرسائل
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            
            elif msg_type == "pong":
                pass  # استجابة heartbeat
            
            elif msg_type == "join_room":
                room = data.get("room")
                if room:
                    # التحقق من الصلاحية
                    if room.startswith("order_tracking_"):
                        # أي شخص يمكنه الانضمام لتتبع طلب معين
                        await manager.join_room(websocket, room)
                        await websocket.send_json({
                            "type": "room_joined",
                            "room": room
                        })
                    elif room.startswith("drivers_") and user_type == "delivery":
                        await manager.join_room(websocket, room)
                        await websocket.send_json({
                            "type": "room_joined",
                            "room": room
                        })
                    elif room.startswith("store_") and user_type == "seller":
                        await manager.join_room(websocket, room)
                        await websocket.send_json({
                            "type": "room_joined",
                            "room": room
                        })
            
            elif msg_type == "leave_room":
                room = data.get("room")
                if room:
                    await manager.leave_room(websocket, room)
                    await websocket.send_json({
                        "type": "room_left",
                        "room": room
                    })
            
            elif msg_type == "subscribe_order":
                # الاشتراك في تحديثات طلب معين
                order_id = data.get("order_id")
                if order_id:
                    room = f"order_tracking_{order_id}"
                    await manager.join_room(websocket, room)
                    await websocket.send_json({
                        "type": "subscribed_to_order",
                        "order_id": order_id
                    })
            
            elif msg_type == "unsubscribe_order":
                order_id = data.get("order_id")
                if order_id:
                    room = f"order_tracking_{order_id}"
                    await manager.leave_room(websocket, room)
            
            elif msg_type == "get_stats" and user_type in ["admin", "sub_admin"]:
                # إحصائيات للمدير
                stats = manager.get_stats()
                await websocket.send_json({
                    "type": "stats",
                    "data": stats
                })
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user={user_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        heartbeat_task.cancel()
        manager.disconnect(websocket)


@router.get("/ws/stats")
async def get_websocket_stats() -> dict:
    """إحصائيات WebSocket (للمدير)"""
    return manager.get_stats()
