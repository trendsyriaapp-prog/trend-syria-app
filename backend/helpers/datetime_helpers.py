# /app/backend/helpers/datetime_helpers.py
# دوال مساعدة للتاريخ والوقت - مركزية لجميع الملفات

from datetime import datetime, timezone


def get_now() -> str:
    """إرجاع الوقت الحالي بصيغة ISO"""
    return datetime.now(timezone.utc).isoformat()


def get_today() -> str:
    """إرجاع تاريخ اليوم بصيغة ISO"""
    return datetime.now(timezone.utc).date().isoformat()
