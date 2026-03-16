# /app/backend/services/websocket_manager.py
# مدير اتصالات WebSocket للتحديثات الفورية

import asyncio
import json
import logging
from typing import Dict, Set, Optional, Any
from datetime import datetime, timezone
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    مدير اتصالات WebSocket
    يدعم:
    - اتصالات متعددة لكل مستخدم
    - غرف/قنوات للبث المستهدف
    - heartbeat للحفاظ على الاتصال
    """
    
    def __init__(self):
        # اتصالات المستخدمين: {user_id: set of WebSocket connections}
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        # اتصالات الغرف: {room_name: set of WebSocket connections}
        self.room_connections: Dict[str, Set[WebSocket]] = {}
        # معلومات الاتصال: {WebSocket: {user_id, rooms, connected_at}}
        self.connection_info: Dict[WebSocket, Dict[str, Any]] = {}
        
    async def connect(
        self, 
        websocket: WebSocket, 
        user_id: str,
        rooms: list = None
    ):
        """قبول اتصال WebSocket جديد"""
        await websocket.accept()
        
        # حفظ الاتصال للمستخدم
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)
        
        # حفظ معلومات الاتصال
        self.connection_info[websocket] = {
            "user_id": user_id,
            "rooms": set(rooms or []),
            "connected_at": datetime.now(timezone.utc).isoformat()
        }
        
        # إضافة للغرف
        for room in (rooms or []):
            await self.join_room(websocket, room)
        
        logger.info(f"WebSocket connected: user={user_id}, rooms={rooms}")
        
        # إرسال رسالة ترحيب
        await self.send_personal(websocket, {
            "type": "connected",
            "user_id": user_id,
            "rooms": rooms or []
        })
        
    def disconnect(self, websocket: WebSocket):
        """قطع اتصال WebSocket"""
        info = self.connection_info.get(websocket, {})
        user_id = info.get("user_id")
        
        # إزالة من اتصالات المستخدم
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # إزالة من الغرف
        for room in info.get("rooms", []):
            if room in self.room_connections:
                self.room_connections[room].discard(websocket)
                if not self.room_connections[room]:
                    del self.room_connections[room]
        
        # إزالة معلومات الاتصال
        if websocket in self.connection_info:
            del self.connection_info[websocket]
        
        logger.info(f"WebSocket disconnected: user={user_id}")
    
    async def join_room(self, websocket: WebSocket, room: str):
        """انضمام لغرفة"""
        if room not in self.room_connections:
            self.room_connections[room] = set()
        self.room_connections[room].add(websocket)
        
        if websocket in self.connection_info:
            self.connection_info[websocket]["rooms"].add(room)
    
    async def leave_room(self, websocket: WebSocket, room: str):
        """مغادرة غرفة"""
        if room in self.room_connections:
            self.room_connections[room].discard(websocket)
            if not self.room_connections[room]:
                del self.room_connections[room]
        
        if websocket in self.connection_info:
            self.connection_info[websocket]["rooms"].discard(room)
    
    async def send_personal(self, websocket: WebSocket, data: dict):
        """إرسال رسالة لاتصال محدد"""
        try:
            await websocket.send_json(data)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
    
    async def send_to_user(self, user_id: str, data: dict):
        """إرسال رسالة لجميع اتصالات مستخدم"""
        connections = self.user_connections.get(user_id, set())
        for websocket in connections.copy():
            try:
                await websocket.send_json(data)
            except Exception as e:
                logger.error(f"Error sending to user {user_id}: {e}")
                self.disconnect(websocket)
    
    async def send_to_room(self, room: str, data: dict, exclude: WebSocket = None):
        """إرسال رسالة لجميع أعضاء غرفة"""
        connections = self.room_connections.get(room, set())
        for websocket in connections.copy():
            if websocket != exclude:
                try:
                    await websocket.send_json(data)
                except Exception as e:
                    logger.error(f"Error sending to room {room}: {e}")
                    self.disconnect(websocket)
    
    async def broadcast(self, data: dict, exclude: WebSocket = None):
        """إرسال رسالة لجميع الاتصالات"""
        for websocket in list(self.connection_info.keys()):
            if websocket != exclude:
                try:
                    await websocket.send_json(data)
                except Exception as e:
                    logger.error(f"Error broadcasting: {e}")
                    self.disconnect(websocket)
    
    def get_stats(self) -> dict:
        """إحصائيات الاتصالات"""
        return {
            "total_connections": len(self.connection_info),
            "total_users": len(self.user_connections),
            "total_rooms": len(self.room_connections),
            "users_online": list(self.user_connections.keys()),
            "rooms": {
                room: len(connections) 
                for room, connections in self.room_connections.items()
            }
        }
    
    def is_user_online(self, user_id: str) -> bool:
        """التحقق من وجود المستخدم متصل"""
        return user_id in self.user_connections and len(self.user_connections[user_id]) > 0


# Instance واحد للتطبيق بأكمله
manager = ConnectionManager()


# دوال مساعدة للاستخدام من أي مكان في التطبيق
async def notify_user(user_id: str, event_type: str, data: dict):
    """إشعار مستخدم بحدث"""
    await manager.send_to_user(user_id, {
        "type": event_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


async def notify_room(room: str, event_type: str, data: dict):
    """إشعار غرفة بحدث"""
    await manager.send_to_room(room, {
        "type": event_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


async def notify_drivers_in_city(city: str, event_type: str, data: dict):
    """إشعار سائقي مدينة معينة"""
    room = f"drivers_{city}"
    await notify_room(room, event_type, data)


async def notify_order_update(order_id: str, customer_id: str, seller_id: str, driver_id: str, data: dict):
    """إشعار جميع الأطراف بتحديث طلب"""
    message = {
        "type": "order_update",
        "order_id": order_id,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # إشعار العميل
    if customer_id:
        await manager.send_to_user(customer_id, message)
    
    # إشعار البائع
    if seller_id:
        await manager.send_to_user(seller_id, message)
    
    # إشعار السائق
    if driver_id:
        await manager.send_to_user(driver_id, message)


async def notify_driver_location(driver_id: str, order_id: str, location: dict):
    """إشعار بتحديث موقع السائق"""
    # إشعار غرفة تتبع الطلب
    room = f"order_tracking_{order_id}"
    await notify_room(room, "driver_location", {
        "driver_id": driver_id,
        "order_id": order_id,
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
        "heading": location.get("heading"),
        "speed": location.get("speed")
    })


async def notify_new_order_for_drivers(city: str, order_data: dict):
    """إشعار السائقين بطلب جديد"""
    await notify_drivers_in_city(city, "new_order_available", order_data)
