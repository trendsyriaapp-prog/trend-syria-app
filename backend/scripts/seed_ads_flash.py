#!/usr/bin/env python3
"""
سكريبت إضافة بيانات تجريبية للإعلانات والعروض السريعة
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone
from bson import ObjectId

# إضافة المسار
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import db

async def seed_ads_and_flash():
    
    # === 1. إضافة الإعلانات ===
    print("\n📢 إضافة الإعلانات...")
    
    # حذف الإعلانات القديمة
    await db.homepage_banners.delete_many({"is_test_data": True})
    
    now = datetime.now(timezone.utc)
    
    ads = [
        {
            "id": str(ObjectId()),
            "title": "عروض رمضان",
            "description": "خصومات تصل لـ 50% على جميع المنتجات",
            "image": None,
            "background_color": "#8B5CF6",
            "link": "/products",
            "is_active": True,
            "order": 1,
            "start_date": now.isoformat(),
            "end_date": (now + timedelta(days=30)).isoformat(),
            "is_test_data": True,
            "created_at": now
        },
        {
            "id": str(ObjectId()),
            "title": "قسم الطعام",
            "description": "توصيل سريع من أفضل المطاعم",
            "image": None,
            "background_color": "#FF6B00",
            "link": "/food",
            "is_active": True,
            "order": 2,
            "start_date": now.isoformat(),
            "end_date": (now + timedelta(days=60)).isoformat(),
            "is_test_data": True,
            "created_at": now
        },
        {
            "id": str(ObjectId()),
            "title": "شحن مجاني",
            "description": "توصيل مجاني للطلبات فوق 100,000 ل.س",
            "image": None,
            "background_color": "#10B981",
            "link": "/products",
            "is_active": True,
            "order": 3,
            "start_date": now.isoformat(),
            "end_date": (now + timedelta(days=15)).isoformat(),
            "is_test_data": True,
            "created_at": now
        }
    ]
    
    for ad in ads:
        await db.homepage_banners.insert_one(ad)
        print(f"   ✅ إعلان: {ad['title']}")
    
    print(f"   📊 تم إضافة {len(ads)} إعلان")
    
    # === 2. إضافة عرض فلاش ===
    print("\n⚡ إضافة عرض فلاش...")
    
    # حذف عروض الفلاش القديمة
    await db.flash_sales.delete_many({"is_test_data": True})
    
    # جلب بعض المنتجات للعرض - نستخدم حقل id
    products = await db.products.find({}).limit(8).to_list(8)
    product_ids = [p.get("id") for p in products if p.get("id")]
    print(f"   📦 المنتجات المتاحة: {len(products)}")
    print(f"   📦 المنتجات بـ id: {len(product_ids)}")
    
    now = datetime.now(timezone.utc)
    
    flash_sale = {
        "id": str(ObjectId()),
        "name": "عروض نهاية الأسبوع",
        "description": "خصومات حصرية لفترة محدودة!",
        "discount_percentage": 25,
        "start_time": now.isoformat(),
        "end_time": (now + timedelta(hours=48)).isoformat(),
        "is_active": True,
        "sale_scope": "shop_only",
        "applicable_shop_products": product_ids if product_ids else [],
        "applicable_shop_categories": [],
        "applicable_food_categories": [],
        "banner_color": "#FF4500",
        "is_test_data": True,
        "created_at": now
    }
    
    await db.flash_sales.insert_one(flash_sale)
    print(f"   ✅ عرض فلاش: {flash_sale['name']}")
    print(f"   📦 عدد المنتجات في العرض: {len(product_ids)}")
    print(f"   💰 نسبة الخصم: {flash_sale['discount_percentage']}%")
    print("   ⏰ ينتهي خلال: 48 ساعة")
    
    print("\n✅ تم إضافة البيانات التجريبية بنجاح!")
    return True

if __name__ == "__main__":
    asyncio.run(seed_ads_and_flash())
