# /app/backend/routes/storage.py
# مسارات تخزين الصور على CDN
# يخدم الصور للـ Frontend ويوفر endpoint للرفع

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Response, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
from pydantic import BaseModel
import logging
import io

from core.database import db, get_current_user
from core.storage import (
    get_object, 
    upload_image_from_base64, 
    upload_image_from_bytes,
    is_base64_image,
    is_storage_path,
    init_storage
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/storage", tags=["Storage"])


# ============== Models ==============

class Base64ImageUpload(BaseModel):
    """Model for uploading base64 images"""
    images: List[str]  # List of base64 encoded images
    folder: str = "products"  # products, stores, ads, etc.


class ImageUploadResponse(BaseModel):
    """Response after uploading images"""
    paths: List[str]  # Storage paths
    urls: List[str]  # URLs to access the images


# ============== Image Serving ==============

@router.get("/images/{path:path}")
async def serve_image(path: str):
    """
    Serve an image from storage.
    Used by frontend <img src="..."> tags.
    
    Path format: trend-syria/products/uuid.jpg
    """
    try:
        # Ensure path starts with app prefix for security
        if not path.startswith("trend-syria/"):
            path = f"trend-syria/{path}"
        
        # Get image from storage
        content, content_type = get_object(path)
        
        # Return with proper cache headers for CDN
        return Response(
            content=content,
            media_type=content_type,
            headers={
                "Cache-Control": "public, max-age=31536000, immutable",  # 1 year cache
                "Content-Type": content_type
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to serve image {path}: {e}")
        raise HTTPException(status_code=404, detail="الصورة غير موجودة")


# ============== Image Upload ==============

@router.post("/upload")
async def upload_images(
    data: Base64ImageUpload,
    user: dict = Depends(get_current_user)
):
    """
    Upload multiple base64 images to storage.
    Returns storage paths that can be stored in the database.
    
    Used by sellers when adding products.
    """
    if not data.images:
        raise HTTPException(status_code=400, detail="لم يتم إرسال صور")
    
    paths = []
    for img in data.images:
        if is_base64_image(img):
            path = upload_image_from_base64(img, folder=data.folder)
            if path:
                paths.append(path)
            else:
                logger.warning("Failed to upload one image")
        elif is_storage_path(img):
            # Already a storage path, keep it
            paths.append(img)
        else:
            logger.warning("Invalid image format, skipping")
    
    if not paths:
        raise HTTPException(status_code=500, detail="فشل رفع الصور")
    
    return {
        "paths": paths,
        "message": f"تم رفع {len(paths)} صور بنجاح"
    }


@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Query(default="products"),
    user: dict = Depends(get_current_user)
):
    """
    Upload a single file to storage.
    Accepts multipart/form-data.
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="نوع الملف غير مدعوم. الأنواع المدعومة: JPEG, PNG, WebP, GIF"
        )
    
    # Validate file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="حجم الملف كبير جداً (الحد الأقصى 10 ميجا)")
    
    # Upload to storage
    path = upload_image_from_bytes(content, file.content_type, folder=folder)
    
    if not path:
        raise HTTPException(status_code=500, detail="فشل رفع الملف")
    
    return {
        "path": path,
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": len(content)
    }


# ============== Migration Helper ==============

@router.post("/migrate-product-images/{product_id}")
async def migrate_product_images(
    product_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Migrate a single product's images from Base64 to CDN storage.
    Admin only.
    """
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    images = product.get("images", [])
    if not images:
        return {"message": "لا يوجد صور للترحيل", "migrated": 0}
    
    migrated_paths = []
    for img in images:
        if is_base64_image(img):
            # Upload to CDN
            path = upload_image_from_base64(img, folder="products")
            if path:
                migrated_paths.append(path)
        elif is_storage_path(img):
            # Already migrated
            migrated_paths.append(img)
    
    if migrated_paths:
        # Update product with new paths
        await db.products.update_one(
            {"id": product_id},
            {"$set": {"images": migrated_paths}}
        )
    
    return {
        "message": f"تم ترحيل {len(migrated_paths)} صور",
        "migrated": len(migrated_paths),
        "paths": migrated_paths
    }


@router.post("/migrate-batch")
async def migrate_batch_images(
    limit: int = Query(default=10, le=50),
    user: dict = Depends(get_current_user)
):
    """
    Batch migrate products with Base64 images to CDN storage.
    Admin only. Processes 'limit' products at a time.
    """
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # جلب المنتجات التي لديها صور
    all_products = await db.products.find(
        {"images.0": {"$exists": True}},
        {"_id": 0, "id": 1, "images": 1, "name": 1}
    ).limit(limit * 2).to_list(limit * 2)
    
    # فلترة المنتجات التي لديها صور Base64 (ليست CDN paths)
    products_to_migrate = []
    for p in all_products:
        images = p.get("images", [])
        if images:
            first_img = images[0]
            # إذا الصورة الأولى ليست CDN path، فهي تحتاج ترحيل
            if not is_storage_path(first_img) and (
                is_base64_image(first_img) or 
                first_img.startswith("data:") or 
                len(first_img) > 500
            ):
                products_to_migrate.append(p)
        if len(products_to_migrate) >= limit:
            break
    
    logger.info(f"Found {len(products_to_migrate)} products to migrate")
    
    total_migrated = 0
    migrated_products = []
    failed_products = []
    
    for product in products_to_migrate:
        product_id = product["id"]
        images = product.get("images", [])
        
        migrated_paths = []
        all_success = True
        
        for img in images:
            if is_storage_path(img):
                # Already a CDN path
                migrated_paths.append(img)
            elif is_base64_image(img) or img.startswith("data:") or len(img) > 500:
                # Try to upload to CDN
                try:
                    path = upload_image_from_base64(img, folder="products")
                    if path:
                        migrated_paths.append(path)
                        logger.info(f"✅ Migrated image for product {product_id}")
                    else:
                        all_success = False
                        logger.error(f"❌ Failed to migrate image for product {product_id}")
                except Exception as e:
                    all_success = False
                    logger.error(f"❌ Error migrating image for product {product_id}: {e}")
            else:
                # URL or unknown format - keep as is
                migrated_paths.append(img)
        
        if migrated_paths and all_success:
            # Update product with new paths
            await db.products.update_one(
                {"id": product_id},
                {"$set": {"images": migrated_paths}}
            )
            total_migrated += 1
            migrated_products.append({
                "id": product_id,
                "name": product.get("name", ""),
                "images_count": len(migrated_paths)
            })
        elif migrated_paths:
            failed_products.append({
                "id": product_id,
                "name": product.get("name", ""),
                "reason": "بعض الصور فشلت"
            })
    
    # Count remaining products that need migration
    all_remaining = await db.products.find(
        {"images.0": {"$exists": True}},
        {"_id": 0, "images": 1}
    ).to_list(1000)
    
    remaining = 0
    for p in all_remaining:
        images = p.get("images", [])
        if images and not is_storage_path(images[0]):
            remaining += 1
    
    return {
        "message": f"تم ترحيل {total_migrated} منتج",
        "migrated_count": total_migrated,
        "remaining_count": remaining,
        "products": migrated_products,
        "failed": failed_products if failed_products else None
    }


@router.get("/diagnose-images")
async def diagnose_images(
    user: dict = Depends(get_current_user)
):
    """
    تشخيص أنواع الصور المخزنة في المنتجات.
    Admin only.
    """
    if user.get("user_type") not in ["admin", "sub_admin"]:
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    # جلب عينة من المنتجات
    products = await db.products.find(
        {"images.0": {"$exists": True}},
        {"_id": 0, "id": 1, "name": 1, "images": 1}
    ).limit(20).to_list(20)
    
    stats = {
        "total_products": len(products),
        "cdn_paths": 0,
        "base64_images": 0,
        "urls": 0,
        "unknown": 0,
        "samples": []
    }
    
    for p in products:
        images = p.get("images", [])
        if not images:
            continue
        
        first_img = images[0]
        img_type = "unknown"
        preview = first_img[:100] if len(first_img) > 100 else first_img
        
        if is_storage_path(first_img):
            img_type = "cdn_path"
            stats["cdn_paths"] += 1
        elif first_img.startswith("data:image/"):
            img_type = "base64_data_uri"
            stats["base64_images"] += 1
            preview = first_img[:50] + "..."
        elif first_img.startswith("http://") or first_img.startswith("https://"):
            img_type = "url"
            stats["urls"] += 1
        elif len(first_img) > 1000:
            img_type = "possible_base64"
            stats["base64_images"] += 1
            preview = first_img[:50] + f"... (length: {len(first_img)})"
        else:
            stats["unknown"] += 1
        
        stats["samples"].append({
            "id": p["id"],
            "name": p.get("name", "")[:30],
            "type": img_type,
            "preview": preview,
            "length": len(first_img)
        })
    
    return stats

