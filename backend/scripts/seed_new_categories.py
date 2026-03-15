# /app/backend/scripts/seed_new_categories.py
# سكريبت لإضافة منتجات تجريبية للفئات الجديدة

import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "trend_syria")

# ========== منتجات قسم المنتجات الجديدة ==========

NEW_PRODUCTS = {
    # موبايلات
    "mobiles": [
        {"name": "آيفون 15 برو ماكس", "description": "أحدث هاتف من أبل، شاشة 6.7 إنش، كاميرا 48 ميجابكسل", "price": 5500000, "stock": 10, "images": ["https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600"]},
        {"name": "سامسونج جالاكسي S24 الترا", "description": "هاتف سامسونج الرائد، شاشة 6.8 إنش، قلم S Pen", "price": 4800000, "stock": 12, "images": ["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600"]},
        {"name": "شاومي 14 برو", "description": "هاتف شاومي بمواصفات عالية وسعر منافس", "price": 2200000, "stock": 20, "images": ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600"]},
        {"name": "هواوي P60 برو", "description": "كاميرا Leica احترافية، تصميم أنيق", "price": 3200000, "stock": 15, "images": ["https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600"]},
        {"name": "ون بلس 12", "description": "أداء خارق مع معالج Snapdragon 8 Gen 3", "price": 2800000, "stock": 18, "images": ["https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600"]},
        {"name": "أوبو فايند X7 الترا", "description": "شاشة AMOLED رائعة وشحن سريع 100W", "price": 2500000, "stock": 14, "images": ["https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=600"]},
    ],
    
    # كمبيوتر ولابتوب
    "computers": [
        {"name": "ماك بوك برو 16 إنش M3", "description": "لابتوب أبل الاحترافي، معالج M3 Pro، 18GB RAM", "price": 12000000, "stock": 5, "images": ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600"]},
        {"name": "ديل XPS 15", "description": "لابتوب أنيق بشاشة 4K OLED، معالج Intel i7", "price": 6500000, "stock": 8, "images": ["https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600"]},
        {"name": "لينوفو ثينك باد X1 كاربون", "description": "لابتوب أعمال خفيف الوزن ومتين", "price": 5800000, "stock": 10, "images": ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600"]},
        {"name": "HP Spectre x360", "description": "لابتوب قابل للتحويل 2 في 1، شاشة لمس", "price": 4500000, "stock": 7, "images": ["https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600"]},
        {"name": "كمبيوتر مكتبي للألعاب RTX 4080", "description": "PC gaming قوي، RTX 4080، 32GB RAM، 2TB SSD", "price": 8500000, "stock": 4, "images": ["https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600"]},
        {"name": "آيماك 24 إنش M3", "description": "كمبيوتر أبل المكتبي، شاشة Retina 4.5K", "price": 7500000, "stock": 6, "images": ["https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600"]},
    ],
    
    # أحذية
    "shoes": [
        {"name": "حذاء نايكي اير ماكس", "description": "حذاء رياضي مريح للجري والتمارين اليومية", "price": 320000, "stock": 25, "images": ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"]},
        {"name": "حذاء أديداس سامبا", "description": "حذاء كلاسيكي أنيق للاستخدام اليومي", "price": 280000, "stock": 30, "images": ["https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=600"]},
        {"name": "حذاء رسمي جلد إيطالي", "description": "حذاء رجالي فاخر للمناسبات الرسمية", "price": 450000, "stock": 15, "images": ["https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=600"]},
        {"name": "صندل نسائي صيفي", "description": "صندل مريح وأنيق لفصل الصيف", "price": 120000, "stock": 35, "images": ["https://images.unsplash.com/photo-1603487742131-4160ec999306?w=600"]},
        {"name": "حذاء كونفرس أول ستار", "description": "حذاء كاجوال كلاسيكي للشباب", "price": 180000, "stock": 40, "images": ["https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=600"]},
        {"name": "بوت شتوي جلد", "description": "بوت دافئ ومقاوم للماء لفصل الشتاء", "price": 380000, "stock": 20, "images": ["https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600"]},
    ],
    
    # عطور
    "perfumes": [
        {"name": "عطر شانيل بلو", "description": "عطر رجالي فاخر برائحة خشبية منعشة", "price": 650000, "stock": 15, "images": ["https://images.unsplash.com/photo-1541643600914-78b084683601?w=600"]},
        {"name": "عطر ديور سوفاج", "description": "عطر رجالي قوي وجذاب", "price": 580000, "stock": 18, "images": ["https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600"]},
        {"name": "عطر جوتشي بلوم", "description": "عطر نسائي بنوتات زهرية ناعمة", "price": 520000, "stock": 20, "images": ["https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=600"]},
        {"name": "عطر توم فورد عود", "description": "عطر فاخر بخشب العود الشرقي", "price": 850000, "stock": 10, "images": ["https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600"]},
        {"name": "عطر فرساتشي إيروس", "description": "عطر رجالي منعش ورياضي", "price": 420000, "stock": 22, "images": ["https://images.unsplash.com/photo-1587017539504-67cfbddac569?w=600"]},
        {"name": "عطر لانكوم لا في إي بيل", "description": "عطر نسائي حلو وأنيق", "price": 480000, "stock": 25, "images": ["https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?w=600"]},
    ],
    
    # أثاث
    "furniture": [
        {"name": "أريكة جلد 3 مقاعد", "description": "أريكة فاخرة من الجلد الطبيعي، لون بني", "price": 2800000, "stock": 5, "images": ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600"]},
        {"name": "طاولة طعام خشب زان", "description": "طاولة طعام لـ 6 أشخاص مع كراسي", "price": 1800000, "stock": 8, "images": ["https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600"]},
        {"name": "سرير مزدوج مع خزانة", "description": "سرير king size مع مرتبة طبية وخزانة", "price": 3200000, "stock": 4, "images": ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600"]},
        {"name": "مكتب عمل خشبي", "description": "مكتب أنيق للعمل من المنزل مع أدراج", "price": 850000, "stock": 12, "images": ["https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=600"]},
        {"name": "خزانة ملابس 4 أبواب", "description": "خزانة واسعة مع مرآة داخلية", "price": 1500000, "stock": 6, "images": ["https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=600"]},
        {"name": "كرسي مكتب مريح", "description": "كرسي ergonomic للعمل الطويل", "price": 450000, "stock": 20, "images": ["https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=600"]},
    ],
    
    # أجهزة منزلية
    "appliances": [
        {"name": "ثلاجة سامسونج 600 لتر", "description": "ثلاجة ذكية مع شاشة لمس ومبرد مياه", "price": 4500000, "stock": 4, "images": ["https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600"]},
        {"name": "غسالة LG 10 كيلو", "description": "غسالة أوتوماتيكية مع مجفف، تقنية AI", "price": 2200000, "stock": 6, "images": ["https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600"]},
        {"name": "مكيف سبليت 18000 BTU", "description": "مكيف موفر للطاقة مع فلتر هواء", "price": 1800000, "stock": 10, "images": ["https://images.unsplash.com/photo-1631567093457-890a7dc32c06?w=600"]},
        {"name": "فرن كهربائي 60 لتر", "description": "فرن متعدد الوظائف مع شواية", "price": 650000, "stock": 15, "images": ["https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=600"]},
        {"name": "مكنسة كهربائية دايسون", "description": "مكنسة لاسلكية قوية الشفط", "price": 1200000, "stock": 12, "images": ["https://images.unsplash.com/photo-1558317374-067fb5f30001?w=600"]},
        {"name": "غسالة صحون بوش", "description": "غسالة صحون أوتوماتيكية 14 طقم", "price": 1600000, "stock": 8, "images": ["https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=600"]},
    ],
    
    # هدايا
    "gifts": [
        {"name": "صندوق شوكولا فاخر", "description": "صندوق شوكولا سويسرية فاخرة 500 غرام", "price": 185000, "stock": 30, "images": ["https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600"]},
        {"name": "طقم عطور مصغر", "description": "مجموعة 5 عطور مصغرة للتجربة", "price": 250000, "stock": 25, "images": ["https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600"]},
        {"name": "سلة هدايا فواكه مجففة", "description": "سلة أنيقة تحتوي فواكه مجففة ومكسرات", "price": 145000, "stock": 35, "images": ["https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600"]},
        {"name": "صندوق ورد طبيعي", "description": "صندوق ورد جوري طازج مع بطاقة إهداء", "price": 120000, "stock": 20, "images": ["https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?w=600"]},
        {"name": "طقم أكواب قهوة فاخر", "description": "طقم 6 أكواب قهوة تركية مع صينية", "price": 95000, "stock": 40, "images": ["https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600"]},
        {"name": "دفتر جلد مع قلم", "description": "دفتر ملاحظات جلد فاخر مع قلم حبر", "price": 75000, "stock": 50, "images": ["https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600"]},
    ],
}

# ========== متاجر ومنتجات قسم الطعام الجديدة ==========

NEW_FOOD_STORES = [
    # مقاهي
    {
        "name": "كافيه لاتيه",
        "description": "أجود أنواع القهوة المختصة",
        "store_type": "cafes",
        "category": "cafes",
        "city": "دمشق",
        "address": "شارع الحمرا، دمشق",
        "phone": "0112345100",
        "image": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600",
        "logo": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200",
        "cover_image": "https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=1200",
        "delivery_fee": 5000,
        "minimum_order": 15000,
        "preparation_time": 15,
        "products": [
            {"name": "قهوة لاتيه", "price": 18000, "description": "إسبريسو مع حليب مخفوق", "image": "https://images.unsplash.com/photo-1534778101976-62847782c213?w=600"},
            {"name": "كابتشينو", "price": 16000, "description": "إسبريسو مع رغوة حليب كثيفة", "image": "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600"},
            {"name": "موكا", "price": 20000, "description": "قهوة مع شوكولا وحليب", "image": "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600"},
            {"name": "قهوة تركية", "price": 12000, "description": "قهوة تركية أصلية مع هيل", "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600"},
            {"name": "شاي أخضر", "price": 10000, "description": "شاي أخضر صيني فاخر", "image": "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=600"},
            {"name": "كيك الشوكولا", "price": 25000, "description": "قطعة كيك شوكولا طازجة", "image": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600"},
        ]
    },
    
    # حلويات
    {
        "name": "حلويات الشام",
        "description": "أشهى الحلويات الشرقية والغربية",
        "store_type": "sweets",
        "category": "sweets",
        "city": "دمشق",
        "address": "باب توما، دمشق",
        "phone": "0112345101",
        "image": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600",
        "logo": "https://images.unsplash.com/photo-1558301211-0d8c8ddee6ec?w=200",
        "cover_image": "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=1200",
        "delivery_fee": 5000,
        "minimum_order": 20000,
        "preparation_time": 10,
        "products": [
            {"name": "بقلاوة بالفستق", "price": 85000, "description": "كيلو بقلاوة شامية بالفستق الحلبي", "image": "https://images.unsplash.com/photo-1519676867240-f03562e64548?w=600"},
            {"name": "كنافة نابلسية", "price": 65000, "description": "كنافة بالجبنة مع قطر", "image": "https://images.unsplash.com/photo-1579888944880-d98341245702?w=600"},
            {"name": "معمول بالتمر", "price": 55000, "description": "كيلو معمول محشي بالتمر", "image": "https://images.unsplash.com/photo-1590080874088-eec64895b423?w=600"},
            {"name": "تشيز كيك", "price": 45000, "description": "قطعة تشيز كيك بالفراولة", "image": "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600"},
            {"name": "تيراميسو", "price": 40000, "description": "حلوى تيراميسو إيطالية", "image": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600"},
            {"name": "هريسة بالقشطة", "price": 50000, "description": "هريسة شامية مع قشطة طازجة", "image": "https://images.unsplash.com/photo-1567171466295-4afa63d45416?w=600"},
        ]
    },
    
    # مخابز
    {
        "name": "مخبز الفرن الذهبي",
        "description": "خبز طازج ومعجنات يومياً",
        "store_type": "bakery",
        "category": "bakery",
        "city": "دمشق",
        "address": "المزة، دمشق",
        "phone": "0112345102",
        "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600",
        "logo": "https://images.unsplash.com/photo-1517433670267-30f41c0a1f8d?w=200",
        "cover_image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1200",
        "delivery_fee": 3000,
        "minimum_order": 10000,
        "preparation_time": 20,
        "products": [
            {"name": "خبز صاج طازج", "price": 5000, "description": "خبز صاج ساخن من الفرن", "image": "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=600"},
            {"name": "كرواسون زبدة", "price": 12000, "description": "كرواسون فرنسي بالزبدة", "image": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600"},
            {"name": "فطيرة جبنة", "price": 15000, "description": "فطيرة مخبوزة بالجبنة البيضاء", "image": "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600"},
            {"name": "مناقيش زعتر", "price": 8000, "description": "مناقيش زعتر بزيت زيتون", "image": "https://images.unsplash.com/photo-1593246049226-ded77bf90326?w=600"},
            {"name": "صمون سوري", "price": 3000, "description": "صمون طازج يومياً", "image": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600"},
            {"name": "كعك بالسمسم", "price": 10000, "description": "كعك القدس مع سمسم", "image": "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600"},
        ]
    },
    
    # مشروبات
    {
        "name": "عصائر الطازج",
        "description": "عصائر طبيعية طازجة 100%",
        "store_type": "drinks",
        "category": "drinks",
        "city": "دمشق",
        "address": "ساحة الأمويين، دمشق",
        "phone": "0112345103",
        "image": "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=600",
        "logo": "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=200",
        "cover_image": "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200",
        "delivery_fee": 5000,
        "minimum_order": 15000,
        "preparation_time": 10,
        "products": [
            {"name": "عصير برتقال طازج", "price": 15000, "description": "عصير برتقال طبيعي 100%", "image": "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600"},
            {"name": "سموذي فراولة", "price": 20000, "description": "سموذي فراولة مع حليب", "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600"},
            {"name": "ليموناضة بالنعناع", "price": 12000, "description": "ليموناضة منعشة مع نعناع", "image": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600"},
            {"name": "عصير مانجو", "price": 18000, "description": "عصير مانجو طازج", "image": "https://images.unsplash.com/photo-1546173159-315724a31696?w=600"},
            {"name": "كوكتيل فواكه", "price": 22000, "description": "مزيج فواكه موسمية", "image": "https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600"},
            {"name": "ميلك شيك شوكولا", "price": 25000, "description": "ميلك شيك شوكولا غني", "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600"},
        ]
    },
]

async def seed_new_products():
    """إضافة منتجات للفئات الجديدة في قسم المنتجات"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # الحصول على بائع
    seller = await db.users.find_one({"user_type": "seller", "is_approved": True})
    if not seller:
        print("❌ لا يوجد بائع!")
        return
    
    seller_id = seller["id"]
    seller_name = seller["name"]
    seller_docs = await db.seller_documents.find_one({"seller_id": seller_id})
    business_name = seller_docs.get("business_name", seller_name) if seller_docs else seller_name
    
    total_added = 0
    
    for category, products in NEW_PRODUCTS.items():
        existing = await db.products.count_documents({"category": category})
        if existing >= 5:
            print(f"⚠️ {category}: يوجد {existing} منتج، تخطي...")
            continue
        
        print(f"\n📦 إضافة منتجات فئة: {category}")
        for product in products:
            product_id = str(uuid.uuid4())
            product_doc = {
                "id": product_id,
                "seller_id": seller_id,
                "seller_name": seller_name,
                "seller_phone": seller.get("phone", ""),
                "business_name": business_name,
                "name": product["name"],
                "description": product["description"],
                "price": product["price"],
                "category": category,
                "stock": product["stock"],
                "images": product["images"],
                "video": None,
                "video_url": None,
                "city": "دمشق",
                "sizes": [],
                "colors": [],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True,
                "is_approved": True,
                "views": 0,
                "sales_count": 0
            }
            await db.products.insert_one(product_doc)
            print(f"  ✅ {product['name']}")
            total_added += 1
    
    print(f"\n✅ تم إضافة {total_added} منتج لقسم المنتجات")
    client.close()

async def seed_new_food_stores():
    """إضافة متاجر ومنتجات للفئات الجديدة في قسم الطعام"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    total_stores = 0
    total_products = 0
    
    for store_data in NEW_FOOD_STORES:
        # التحقق من عدم وجود متاجر في هذه الفئة
        existing = await db.food_stores.count_documents({"category": store_data["category"]})
        if existing >= 1:
            print(f"⚠️ {store_data['category']}: يوجد {existing} متجر، تخطي...")
            continue
        
        print(f"\n🏪 إضافة متجر: {store_data['name']}")
        
        store_id = str(uuid.uuid4())
        owner_id = str(uuid.uuid4())
        
        # إنشاء المتجر
        store_doc = {
            "id": store_id,
            "owner_id": owner_id,
            "name": store_data["name"],
            "description": store_data["description"],
            "store_type": store_data["store_type"],
            "category": store_data["category"],
            "city": store_data["city"],
            "address": store_data["address"],
            "phone": store_data["phone"],
            "image": store_data["image"],
            "logo": store_data["logo"],
            "cover_image": store_data["cover_image"],
            "delivery_fee": store_data["delivery_fee"],
            "minimum_order": store_data["minimum_order"],
            "free_delivery_minimum": store_data.get("free_delivery_minimum", 100000),
            "preparation_time": store_data["preparation_time"],
            "is_active": True,
            "is_approved": True,
            "rating": 4.5,
            "total_reviews": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.food_stores.insert_one(store_doc)
        total_stores += 1
        
        # إضافة المنتجات
        for product in store_data["products"]:
            product_id = str(uuid.uuid4())
            product_doc = {
                "id": product_id,
                "store_id": store_id,
                "name": product["name"],
                "description": product["description"],
                "price": product["price"],
                "image": product["image"],
                "category": product.get("category", "main"),
                "is_available": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.food_products.insert_one(product_doc)
            print(f"  ✅ {product['name']}")
            total_products += 1
    
    print(f"\n✅ تم إضافة {total_stores} متجر و {total_products} منتج لقسم الطعام")
    client.close()

async def main():
    print("=" * 50)
    print("🚀 بدء إضافة الفئات الجديدة")
    print("=" * 50)
    
    await seed_new_products()
    await seed_new_food_stores()
    
    print("\n" + "=" * 50)
    print("✅ تم الانتهاء بنجاح!")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(main())
