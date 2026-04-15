# /app/backend/core/storage.py
# خدمة تخزين الصور على Emergent Object Storage (S3-compatible CDN)
# يحل مشكلة الـ Base64 الضخمة في MongoDB

import os
import uuid
import base64
import logging
import requests
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# ============== Configuration ==============
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "trend-syria"  # Prefix all paths to avoid bucket collisions

# Module-level storage key - set once and reused globally
_storage_key: Optional[str] = None

# MIME types for images
MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg", 
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "svg": "image/svg+xml"
}

def init_storage() -> str:
    """
    Initialize storage connection - call ONCE at startup.
    Returns a session-scoped, reusable storage_key.
    """
    global _storage_key
    
    if _storage_key:
        return _storage_key
    
    if not EMERGENT_KEY:
        raise ValueError("EMERGENT_LLM_KEY not configured in environment")
    
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_KEY},
            timeout=30
        )
        resp.raise_for_status()
        _storage_key = resp.json()["storage_key"]
        logger.info("✅ Storage initialized successfully")
        return _storage_key
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Failed to initialize storage: {e}")
        raise


def get_storage_key() -> str:
    """Get or initialize storage key"""
    global _storage_key
    if not _storage_key:
        return init_storage()
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """
    Upload file to storage.
    Returns {"path": "...", "size": 123, "etag": "..."}
    """
    key = get_storage_key()
    
    try:
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={
                "X-Storage-Key": key,
                "Content-Type": content_type
            },
            data=data,
            timeout=120
        )
        resp.raise_for_status()
        result = resp.json()
        logger.info(f"✅ Uploaded {path} ({result.get('size', 0)} bytes)")
        return result
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Failed to upload {path}: {e}")
        raise


def get_object(path: str) -> Tuple[bytes, str]:
    """
    Download file from storage.
    Returns (content_bytes, content_type).
    """
    key = get_storage_key()
    
    try:
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60
        )
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Failed to download {path}: {e}")
        raise


def upload_image_from_base64(base64_data: str, folder: str = "products") -> Optional[str]:
    """
    Upload a Base64 image to storage and return the storage path.
    
    Args:
        base64_data: Base64 encoded image (with or without data URI prefix)
        folder: Folder name (e.g., "products", "stores", "ads")
    
    Returns:
        Storage path (e.g., "trend-syria/products/uuid.jpg") or None on failure
    """
    try:
        # Parse base64 data
        if "," in base64_data:
            # Has data URI prefix like "data:image/jpeg;base64,..."
            header, encoded = base64_data.split(",", 1)
            # Extract mime type
            if "image/png" in header:
                ext = "png"
                content_type = "image/png"
            elif "image/webp" in header:
                ext = "webp"
                content_type = "image/webp"
            elif "image/gif" in header:
                ext = "gif"
                content_type = "image/gif"
            else:
                ext = "jpg"
                content_type = "image/jpeg"
        else:
            # Raw base64 - assume JPEG
            encoded = base64_data
            ext = "jpg"
            content_type = "image/jpeg"
        
        # Decode base64
        image_data = base64.b64decode(encoded)
        
        # Generate unique path
        unique_id = str(uuid.uuid4())
        path = f"{APP_NAME}/{folder}/{unique_id}.{ext}"
        
        # Upload to storage
        result = put_object(path, image_data, content_type)
        
        # Return the path (this is what we store in DB)
        return result.get("path", path)
        
    except Exception as e:
        logger.error(f"❌ Failed to upload base64 image: {e}")
        return None


def upload_image_from_bytes(image_data: bytes, content_type: str, folder: str = "products") -> Optional[str]:
    """
    Upload raw image bytes to storage and return the storage path.
    
    Args:
        image_data: Raw image bytes
        content_type: MIME type (e.g., "image/jpeg")
        folder: Folder name
    
    Returns:
        Storage path or None on failure
    """
    try:
        # Determine extension from content type
        ext_map = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/gif": "gif"
        }
        ext = ext_map.get(content_type, "jpg")
        
        # Generate unique path
        unique_id = str(uuid.uuid4())
        path = f"{APP_NAME}/{folder}/{unique_id}.{ext}"
        
        # Upload to storage
        result = put_object(path, image_data, content_type)
        
        return result.get("path", path)
        
    except Exception as e:
        logger.error(f"❌ Failed to upload image bytes: {e}")
        return None


def is_base64_image(value: str) -> bool:
    """Check if a string is a Base64 encoded image"""
    if not value or not isinstance(value, str):
        return False
    
    # Check for data URI prefix
    if value.startswith("data:image/"):
        return True
    
    # Check for raw base64 (minimum length and valid characters)
    if len(value) > 1000:  # Base64 images are usually >1KB
        try:
            # Try to decode first 100 chars to verify it's valid base64
            base64.b64decode(value[:100] + "==")
            return True
        except Exception:
            pass
    
    return False


def is_storage_path(value: str) -> bool:
    """Check if a string is a CDN storage path"""
    if not value or not isinstance(value, str):
        return False
    return value.startswith(f"{APP_NAME}/") or value.startswith("trend-syria/")


def get_image_url(storage_path: str, base_url: str) -> str:
    """
    Convert storage path to a frontend-accessible URL.
    
    Args:
        storage_path: The path stored in DB (e.g., "trend-syria/products/uuid.jpg")
        base_url: The backend API base URL
    
    Returns:
        Full URL to access the image
    """
    # Remove any leading slash
    clean_path = storage_path.lstrip("/")
    return f"{base_url}/api/storage/images/{clean_path}"
