# /app/backend/scripts/seed_food_data.py
# سكريبت لإضافة بيانات تجريبية لأقسام الطعام

import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "trend_syria")

# بيانات المتاجر الجديدة
STORES_DATA = [
    # ===== وجبات سريعة =====
    {
        "name": "برغر كينغ دمشق",
        "description": "أشهى البرغر الأمريكي الأصلي",
        "store_type": "fast_food",
        "category": "fast_food",
        "city": "دمشق",
        "address": "شارع الثورة، دمشق",
        "phone": "0112345001",
        "image": "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600",
        "logo": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200",
        "cover_image": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200",
        "delivery_fee": 5000,
        "minimum_order": 25000,
        "free_delivery_minimum": 75000,
        "preparation_time": 20,
        "products": [
            {"name": "برغر كلاسيك", "price": 35000, "description": "برغر لحم بقري مع جبنة شيدر وخضار طازجة", "image": "https://images.unsplash.com/photo-1568901346375-23c9450f58cd?w=600", "category": "burgers"},
            {"name": "برغر دبل", "price": 55000, "description": "برغر دبل لحم مع جبنة مزدوجة", "image": "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600", "category": "burgers"},
            {"name": "برغر دجاج كريسبي", "price": 40000, "description": "صدر دجاج مقرمش مع صلصة خاصة", "image": "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600", "category": "burgers"},
            {"name": "بطاطا مقلية كبير", "price": 15000, "description": "بطاطا مقلية ذهبية ومقرمشة", "image": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600", "category": "sides"},
            {"name": "كولا كبير", "price": 8000, "description": "مشروب غازي بارد", "image": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600", "category": "drinks"},
            {"name": "ناغتس دجاج 10 قطع", "price": 30000, "description": "قطع دجاج مقرمشة مع صلصة", "image": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600", "category": "sides"},
        ]
    },
    {
        "name": "بيتزا هت سورية",
        "description": "أفضل بيتزا إيطالية في سورية",
        "store_type": "fast_food",
        "category": "fast_food",
        "city": "دمشق",
        "address": "المزة، دمشق",
        "phone": "0112345002",
        "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600",
        "logo": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200",
        "cover_image": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200",
        "delivery_fee": 7000,
        "minimum_order": 30000,
        "free_delivery_minimum": 80000,
        "preparation_time": 25,
        "products": [
            {"name": "بيتزا مارغريتا", "price": 45000, "description": "جبنة موزاريلا مع صلصة طماطم وريحان", "image": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600", "category": "pizza"},
            {"name": "بيتزا بيبروني", "price": 55000, "description": "شرائح بيبروني مع جبنة موزاريلا", "image": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600", "category": "pizza"},
            {"name": "بيتزا خضار", "price": 50000, "description": "خضار مشكلة مع جبنة وصلصة", "image": "https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=600", "category": "pizza"},
            {"name": "بيتزا لحم", "price": 65000, "description": "لحم مفروم مع فلفل وبصل وجبنة", "image": "https://images.unsplash.com/photo-1595708684082-a173bb3a06c5?w=600", "category": "pizza"},
            {"name": "باستا ألفريدو", "price": 40000, "description": "باستا بصلصة كريمية غنية", "image": "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600", "category": "pasta"},
            {"name": "سلطة سيزر", "price": 25000, "description": "خس روماني مع صلصة سيزر وجبنة بارميزان", "image": "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600", "category": "salads"},
        ]
    },
    
    # ===== ماركت =====
    {
        "name": "سوبر ماركت الأمانة",
        "description": "كل ما تحتاجه من مواد غذائية ومنزلية",
        "store_type": "market",
        "category": "market",
        "city": "دمشق",
        "address": "ركن الدين، دمشق",
        "phone": "0112345003",
        "image": "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600",
        "logo": "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=200",
        "cover_image": "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?w=1200",
        "delivery_fee": 3000,
        "minimum_order": 20000,
        "free_delivery_minimum": 50000,
        "preparation_time": 10,
        "products": [
            {"name": "حليب طازج 1 لتر", "price": 8000, "description": "حليب طازج كامل الدسم", "image": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=600", "category": "dairy"},
            {"name": "بيض بلدي 30 حبة", "price": 25000, "description": "بيض بلدي طازج", "image": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=600", "category": "dairy"},
            {"name": "خبز عربي ربطة", "price": 3000, "description": "خبز عربي طازج", "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600", "category": "bakery"},
            {"name": "زيت زيتون 1 لتر", "price": 45000, "description": "زيت زيتون سوري أصلي", "image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600", "category": "oils"},
            {"name": "أرز بسمتي 2 كيلو", "price": 35000, "description": "أرز بسمتي هندي فاخر", "image": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600", "category": "grains"},
            {"name": "سكر 2 كيلو", "price": 15000, "description": "سكر أبيض ناعم", "image": "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=600", "category": "basics"},
            {"name": "شاي أخضر 100 كيس", "price": 20000, "description": "شاي أخضر ممتاز", "image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600", "category": "beverages"},
            {"name": "قهوة عربية 500غ", "price": 35000, "description": "قهوة عربية محمصة طازجة", "image": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600", "category": "beverages"},
        ]
    },
    {
        "name": "بقالة السعادة",
        "description": "بقالة الحي - كل شي قريب منك",
        "store_type": "market",
        "category": "market",
        "city": "دمشق",
        "address": "المهاجرين، دمشق",
        "phone": "0112345004",
        "image": "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=600",
        "logo": "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200",
        "cover_image": "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1200",
        "delivery_fee": 2000,
        "minimum_order": 15000,
        "free_delivery_minimum": 40000,
        "preparation_time": 8,
        "products": [
            {"name": "مياه معدنية 6 قناني", "price": 10000, "description": "مياه معدنية نقية", "image": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600", "category": "beverages"},
            {"name": "عصير برتقال 1 لتر", "price": 12000, "description": "عصير برتقال طبيعي 100%", "image": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600", "category": "beverages"},
            {"name": "لبنة 500غ", "price": 15000, "description": "لبنة بلدية طازجة", "image": "https://images.unsplash.com/photo-1559598467-f8b76c8155d0?w=600", "category": "dairy"},
            {"name": "جبنة بيضاء 500غ", "price": 25000, "description": "جبنة بيضاء سورية", "image": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600", "category": "dairy"},
            {"name": "زعتر 250غ", "price": 18000, "description": "زعتر سوري بزيت الزيتون", "image": "https://images.unsplash.com/photo-1599909533681-74c0d726763f?w=600", "category": "spices"},
            {"name": "معكرونة 500غ", "price": 8000, "description": "معكرونة إيطالية", "image": "https://images.unsplash.com/photo-1551462147-37885acc36f1?w=600", "category": "pasta"},
        ]
    },
    
    # ===== خضار وفواكه =====
    {
        "name": "خضار أبو محمد",
        "description": "أطيب خضار وفواكه طازجة يومياً",
        "store_type": "vegetables",
        "category": "vegetables",
        "city": "دمشق",
        "address": "سوق الهال، دمشق",
        "phone": "0112345005",
        "image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600",
        "logo": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200",
        "cover_image": "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200",
        "delivery_fee": 3000,
        "minimum_order": 15000,
        "free_delivery_minimum": 40000,
        "preparation_time": 8,
        "products": [
            {"name": "طماطم طازجة", "price": 8000, "description": "طماطم حمراء طازجة - للكيلو", "image": "https://images.unsplash.com/photo-1546470427-227c7369a9b0?w=600", "category": "vegetables", "unit": "كيلو"},
            {"name": "خيار بلدي", "price": 6000, "description": "خيار بلدي مقرمش - للكيلو", "image": "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=600", "category": "vegetables", "unit": "كيلو"},
            {"name": "بطاطا", "price": 5000, "description": "بطاطا طازجة - للكيلو", "image": "https://images.unsplash.com/photo-1518977676601-b53f82ber5f?w=600", "category": "vegetables", "unit": "كيلو"},
            {"name": "بصل أحمر", "price": 4000, "description": "بصل أحمر - للكيلو", "image": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600", "category": "vegetables", "unit": "كيلو"},
            {"name": "فلفل أخضر", "price": 10000, "description": "فلفل أخضر حلو - للكيلو", "image": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600", "category": "vegetables", "unit": "كيلو"},
            {"name": "باذنجان", "price": 7000, "description": "باذنجان أسود - للكيلو", "image": "https://images.unsplash.com/photo-1528826007177-f38517ce9a8a?w=600", "category": "vegetables", "unit": "كيلو"},
            {"name": "تفاح أحمر", "price": 15000, "description": "تفاح أحمر حلو - للكيلو", "image": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600", "category": "fruits", "unit": "كيلو"},
            {"name": "موز", "price": 12000, "description": "موز طازج - للكيلو", "image": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600", "category": "fruits", "unit": "كيلو"},
            {"name": "برتقال", "price": 10000, "description": "برتقال سوري حلو - للكيلو", "image": "https://images.unsplash.com/photo-1547514701-42782101795e?w=600", "category": "fruits", "unit": "كيلو"},
            {"name": "عنب أخضر", "price": 20000, "description": "عنب أخضر بدون بذر - للكيلو", "image": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=600", "category": "fruits", "unit": "كيلو"},
        ]
    },
    {
        "name": "فواكه الشام",
        "description": "أجود أنواع الفواكه الموسمية",
        "store_type": "vegetables",
        "category": "vegetables",
        "city": "دمشق",
        "address": "باب توما، دمشق",
        "phone": "0112345006",
        "image": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600",
        "logo": "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=200",
        "cover_image": "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=1200",
        "delivery_fee": 4000,
        "minimum_order": 20000,
        "free_delivery_minimum": 50000,
        "preparation_time": 10,
        "products": [
            {"name": "فراولة طازجة", "price": 25000, "description": "فراولة طازجة حمراء - للكيلو", "image": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600", "category": "fruits", "unit": "كيلو"},
            {"name": "مانجو", "price": 35000, "description": "مانجو ناضجة - للكيلو", "image": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600", "category": "fruits", "unit": "كيلو"},
            {"name": "كيوي", "price": 30000, "description": "كيوي طازج - للكيلو", "image": "https://images.unsplash.com/photo-1585059895524-72359e06133a?w=600", "category": "fruits", "unit": "كيلو"},
            {"name": "أناناس", "price": 40000, "description": "أناناس طازج - للحبة", "image": "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=600", "category": "fruits", "unit": "حبة"},
            {"name": "بطيخ أحمر", "price": 8000, "description": "بطيخ أحمر حلو - للكيلو", "image": "https://images.unsplash.com/photo-1563114773-84221bd62daa?w=600", "category": "fruits", "unit": "كيلو"},
            {"name": "شمام", "price": 10000, "description": "شمام حلو - للكيلو", "image": "https://images.unsplash.com/photo-1571575173700-afb9492e6a50?w=600", "category": "fruits", "unit": "كيلو"},
        ]
    },
    
    # ===== حلويات =====
    {
        "name": "حلويات الشرق",
        "description": "أشهى الحلويات العربية والغربية",
        "store_type": "sweets",
        "category": "sweets",
        "city": "دمشق",
        "address": "الشعلان، دمشق",
        "phone": "0112345007",
        "image": "https://images.unsplash.com/photo-1558326567-98ae2405596b?w=600",
        "logo": "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=200",
        "cover_image": "https://images.unsplash.com/photo-1548848221-0c2e497ed557?w=1200",
        "delivery_fee": 5000,
        "minimum_order": 25000,
        "free_delivery_minimum": 60000,
        "preparation_time": 15,
        "products": [
            {"name": "بقلاوة فستق", "price": 80000, "description": "بقلاوة بالفستق الحلبي - للكيلو", "image": "https://images.unsplash.com/photo-1598110750624-207050c4f28c?w=600", "category": "arabic_sweets", "unit": "كيلو"},
            {"name": "كنافة نابلسية", "price": 60000, "description": "كنافة بالجبنة الطازجة - للكيلو", "image": "https://images.unsplash.com/photo-1579888944880-d98341245702?w=600", "category": "arabic_sweets", "unit": "كيلو"},
            {"name": "معمول تمر", "price": 45000, "description": "معمول بالتمر - للكيلو", "image": "https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600", "category": "arabic_sweets", "unit": "كيلو"},
            {"name": "عوامة", "price": 35000, "description": "عوامة مقرمشة بالقطر - للكيلو", "image": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600", "category": "arabic_sweets", "unit": "كيلو"},
            {"name": "تشيز كيك", "price": 50000, "description": "تشيز كيك بالفراولة - للقطعة", "image": "https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=600", "category": "western_sweets", "unit": "قطعة"},
            {"name": "تيراميسو", "price": 45000, "description": "تيراميسو إيطالي أصلي - للقطعة", "image": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600", "category": "western_sweets", "unit": "قطعة"},
        ]
    },
    {
        "name": "آيس كريم كولد ستون",
        "description": "أفضل آيس كريم طازج",
        "store_type": "sweets",
        "category": "sweets",
        "city": "دمشق",
        "address": "أبو رمانة، دمشق",
        "phone": "0112345008",
        "image": "https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=600",
        "logo": "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=200",
        "cover_image": "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=1200",
        "delivery_fee": 4000,
        "minimum_order": 20000,
        "free_delivery_minimum": 50000,
        "preparation_time": 10,
        "products": [
            {"name": "آيس كريم فانيلا", "price": 15000, "description": "آيس كريم فانيلا طبيعي - سكوب", "image": "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600", "category": "ice_cream", "unit": "سكوب"},
            {"name": "آيس كريم شوكولاتة", "price": 15000, "description": "آيس كريم شوكولاتة بلجيكية - سكوب", "image": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600", "category": "ice_cream", "unit": "سكوب"},
            {"name": "آيس كريم فراولة", "price": 15000, "description": "آيس كريم فراولة طبيعية - سكوب", "image": "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600", "category": "ice_cream", "unit": "سكوب"},
            {"name": "سندويش آيس كريم", "price": 20000, "description": "سندويش آيس كريم مع كوكيز", "image": "https://images.unsplash.com/photo-1629385701021-fcd568a743e8?w=600", "category": "ice_cream", "unit": "قطعة"},
            {"name": "ميلك شيك فانيلا", "price": 25000, "description": "ميلك شيك فانيلا كريمي", "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600", "category": "drinks", "unit": "كوب"},
            {"name": "ميلك شيك شوكولاتة", "price": 25000, "description": "ميلك شيك شوكولاتة غني", "image": "https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=600", "category": "drinks", "unit": "كوب"},
        ]
    },
]


async def seed_data():
    """إضافة البيانات التجريبية"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # إنشاء مستخدم بائع وهمي للمتاجر الجديدة
    seller_id = str(uuid.uuid4())
    seller = {
        "id": seller_id,
        "name": "بائع تجريبي",
        "full_name": "بائع تجريبي للمتاجر",
        "phone": "0999999999",
        "user_type": "food_seller",
        "is_approved": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing_seller = await db.users.find_one({"phone": "0999999999"})
    if not existing_seller:
        await db.users.insert_one(seller)
        print(f"✅ تم إنشاء بائع تجريبي: {seller_id}")
    else:
        seller_id = existing_seller["id"]
        print(f"📝 البائع موجود بالفعل: {seller_id}")
    
    stores_added = 0
    products_added = 0
    
    for store_data in STORES_DATA:
        # التحقق من وجود المتجر
        existing = await db.food_stores.find_one({"name": store_data["name"]})
        if existing:
            print(f"⏭️  المتجر موجود: {store_data['name']}")
            continue
        
        products = store_data.pop("products", [])
        
        store_id = str(uuid.uuid4())
        store = {
            "id": store_id,
            "owner_id": seller_id,
            **store_data,
            "is_active": True,
            "is_approved": True,
            "is_open": True,
            "rating": 4.5,
            "reviews_count": 0,
            "orders_count": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.food_stores.insert_one(store)
        stores_added += 1
        print(f"✅ تم إضافة متجر: {store_data['name']} ({store_data['store_type']})")
        
        # إضافة المنتجات
        for product_data in products:
            product = {
                "id": str(uuid.uuid4()),
                "store_id": store_id,
                "seller_id": seller_id,
                "name": product_data["name"],
                "description": product_data["description"],
                "price": product_data["price"],
                "category": product_data.get("category", "general"),
                "image": product_data["image"],
                "unit": product_data.get("unit", "قطعة"),
                "preparation_time": store_data.get("preparation_time", 15),
                "is_available": True,
                "city": store_data["city"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.food_products.insert_one(product)
            products_added += 1
        
        print(f"   └── تم إضافة {len(products)} منتج")
    
    print("\n🎉 تم الانتهاء!")
    print(f"   • متاجر جديدة: {stores_added}")
    print(f"   • منتجات جديدة: {products_added}")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_data())
