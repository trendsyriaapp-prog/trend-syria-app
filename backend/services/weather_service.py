# /app/backend/services/weather_service.py
# خدمة الطقس التلقائية

import httpx
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from core.database import db

logger = logging.getLogger(__name__)

# إحداثيات المدن السورية الرئيسية
SYRIAN_CITIES_COORDS = {
    "دمشق": {"lat": 33.5138, "lon": 36.2765},
    "حلب": {"lat": 36.2021, "lon": 37.1343},
    "حمص": {"lat": 34.7324, "lon": 36.7137},
    "حماة": {"lat": 35.1318, "lon": 36.7508},
    "اللاذقية": {"lat": 35.5317, "lon": 35.7914},
    "طرطوس": {"lat": 34.8959, "lon": 35.8866},
    "دير الزور": {"lat": 35.3358, "lon": 40.1408},
    "الرقة": {"lat": 35.9528, "lon": 39.0079},
    "إدلب": {"lat": 35.9306, "lon": 36.6339},
    "درعا": {"lat": 32.6189, "lon": 36.1021},
    "السويداء": {"lat": 32.7076, "lon": 36.5676},
    "القنيطرة": {"lat": 33.1260, "lon": 35.8244}
}

# رموز الطقس السيء التي تستدعي رسوم إضافية
BAD_WEATHER_CONDITIONS = {
    # مطر
    "Rain": {"ar": "مطر", "surcharge_multiplier": 1.0},
    "Drizzle": {"ar": "رذاذ", "surcharge_multiplier": 0.5},
    "Thunderstorm": {"ar": "عاصفة رعدية", "surcharge_multiplier": 1.5},
    # ثلج
    "Snow": {"ar": "ثلج", "surcharge_multiplier": 2.0},
    # ضباب
    "Mist": {"ar": "ضباب خفيف", "surcharge_multiplier": 0.3},
    "Fog": {"ar": "ضباب كثيف", "surcharge_multiplier": 0.5},
    # عواصف
    "Dust": {"ar": "غبار", "surcharge_multiplier": 0.5},
    "Sand": {"ar": "عاصفة رملية", "surcharge_multiplier": 1.0},
    "Squall": {"ar": "عاصفة", "surcharge_multiplier": 1.5},
    "Tornado": {"ar": "إعصار", "surcharge_multiplier": 3.0}
}

# حدود درجات الحرارة القصوى
EXTREME_TEMP_THRESHOLDS = {
    "hot": {"min": 40, "ar": "حرارة شديدة", "surcharge_multiplier": 0.5},
    "cold": {"max": 5, "ar": "برد شديد", "surcharge_multiplier": 0.5}
}


async def get_weather_api_key() -> Optional[str]:
    """جلب مفتاح API الطقس من الإعدادات"""
    settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
    if settings:
        weather_config = settings.get("weather_api", {})
        return weather_config.get("api_key")
    return None


async def fetch_current_weather(city: str) -> Optional[Dict[str, Any]]:
    """جلب الطقس الحالي لمدينة معينة"""
    api_key = await get_weather_api_key()
    if not api_key:
        logger.warning("No weather API key configured")
        return None
    
    coords = SYRIAN_CITIES_COORDS.get(city)
    if not coords:
        logger.warning(f"Unknown city: {city}")
        return None
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": coords["lat"],
                    "lon": coords["lon"],
                    "appid": api_key,
                    "units": "metric",
                    "lang": "ar"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    "city": city,
                    "temperature": data["main"]["temp"],
                    "feels_like": data["main"]["feels_like"],
                    "humidity": data["main"]["humidity"],
                    "condition": data["weather"][0]["main"],
                    "condition_ar": data["weather"][0]["description"],
                    "icon": data["weather"][0]["icon"],
                    "wind_speed": data.get("wind", {}).get("speed", 0),
                    "fetched_at": datetime.now(timezone.utc).isoformat()
                }
            else:
                logger.error(f"Weather API error: {response.status_code} - {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"Error fetching weather for {city}: {e}")
        return None


async def check_bad_weather(city: str) -> Dict[str, Any]:
    """
    فحص حالة الطقس وتحديد ما إذا كان سيئاً
    يُرجع معلومات الطقس مع تحديد نوع السوء (إن وجد) ومضاعف الرسوم
    """
    weather = await fetch_current_weather(city)
    
    if not weather:
        return {
            "is_bad": False,
            "reason": None,
            "surcharge_multiplier": 0,
            "weather": None
        }
    
    condition = weather["condition"]
    temp = weather["temperature"]
    
    result = {
        "is_bad": False,
        "reasons": [],
        "surcharge_multiplier": 0,
        "weather": weather
    }
    
    # فحص حالة الطقس
    if condition in BAD_WEATHER_CONDITIONS:
        bad_info = BAD_WEATHER_CONDITIONS[condition]
        result["is_bad"] = True
        result["reasons"].append(bad_info["ar"])
        result["surcharge_multiplier"] += bad_info["surcharge_multiplier"]
    
    # فحص درجة الحرارة
    if temp >= EXTREME_TEMP_THRESHOLDS["hot"]["min"]:
        result["is_bad"] = True
        result["reasons"].append(EXTREME_TEMP_THRESHOLDS["hot"]["ar"])
        result["surcharge_multiplier"] += EXTREME_TEMP_THRESHOLDS["hot"]["surcharge_multiplier"]
    elif temp <= EXTREME_TEMP_THRESHOLDS["cold"]["max"]:
        result["is_bad"] = True
        result["reasons"].append(EXTREME_TEMP_THRESHOLDS["cold"]["ar"])
        result["surcharge_multiplier"] += EXTREME_TEMP_THRESHOLDS["cold"]["surcharge_multiplier"]
    
    # تجميع السبب
    if result["reasons"]:
        result["reason"] = " + ".join(result["reasons"])
    
    return result


async def update_weather_surcharge_automatically():
    """
    تحديث رسوم الطقس تلقائياً بناءً على حالة الطقس الحالية
    يتم استدعاؤها من background task
    """
    try:
        # جلب إعدادات الطقس التلقائي
        settings = await db.platform_settings.find_one({"id": "main"}, {"_id": 0})
        if not settings:
            return {"updated": False, "reason": "No settings found"}
        
        auto_weather = settings.get("auto_weather_surcharge", {})
        
        if not auto_weather.get("enabled", False):
            return {"updated": False, "reason": "Auto weather surcharge disabled"}
        
        base_amount = auto_weather.get("base_amount", 5000)
        monitored_cities = auto_weather.get("monitored_cities", ["دمشق"])
        
        # فحص الطقس في جميع المدن المراقبة
        worst_weather = None
        worst_multiplier = 0
        worst_city = None
        
        for city in monitored_cities:
            check = await check_bad_weather(city)
            if check["is_bad"] and check["surcharge_multiplier"] > worst_multiplier:
                worst_weather = check
                worst_multiplier = check["surcharge_multiplier"]
                worst_city = city
        
        current_surcharge = settings.get("weather_surcharge", {})
        is_currently_active = current_surcharge.get("is_active", False)
        
        # حساب المبلغ بناءً على المضاعف
        calculated_amount = int(base_amount * worst_multiplier) if worst_multiplier > 0 else 0
        
        now = datetime.now(timezone.utc).isoformat()
        
        # تحديث الحالة
        if worst_weather and worst_weather["is_bad"]:
            # تفعيل أو تحديث الرسوم
            if not is_currently_active or current_surcharge.get("amount") != calculated_amount:
                await db.platform_settings.update_one(
                    {"id": "main"},
                    {"$set": {
                        "weather_surcharge": {
                            "is_active": True,
                            "amount": calculated_amount,
                            "reason": f"{worst_weather['reason']} ({worst_city})",
                            "activated_at": now,
                            "activated_by": "auto_system",
                            "weather_data": worst_weather["weather"],
                            "auto_activated": True
                        }
                    }}
                )
                
                logger.info(f"Auto weather surcharge activated: {calculated_amount} SYP - {worst_weather['reason']}")
                
                return {
                    "updated": True,
                    "action": "activated",
                    "amount": calculated_amount,
                    "reason": worst_weather["reason"],
                    "city": worst_city
                }
        else:
            # إيقاف الرسوم إذا كانت مفعلة تلقائياً
            if is_currently_active and current_surcharge.get("auto_activated", False):
                await db.platform_settings.update_one(
                    {"id": "main"},
                    {"$set": {
                        "weather_surcharge": {
                            "is_active": False,
                            "amount": 0,
                            "reason": None,
                            "deactivated_at": now,
                            "auto_activated": False
                        }
                    }}
                )
                
                logger.info("Auto weather surcharge deactivated - weather improved")
                
                return {
                    "updated": True,
                    "action": "deactivated"
                }
        
        return {"updated": False, "reason": "No change needed"}
        
    except Exception as e:
        logger.error(f"Error updating weather surcharge: {e}")
        return {"updated": False, "error": str(e)}


async def get_weather_for_all_cities() -> Dict[str, Any]:
    """جلب الطقس لجميع المدن السورية"""
    results = {}
    
    for city in SYRIAN_CITIES_COORDS.keys():
        weather = await fetch_current_weather(city)
        if weather:
            results[city] = weather
    
    return results
