# /app/backend/scripts/seed_products_data.py
# سكريبت لإضافة منتجات تجريبية للفئات الفارغة

import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "trend_syria")

# بيانات المنتجات للفئات الفارغة
PRODUCTS_DATA = {
    # ===== سيارات =====
    "cars": [
        {
            "name": "إطارات ميشلان 16 إنش",
            "description": "إطارات ميشلان عالية الجودة، مقاس 205/55 R16، مناسبة لجميع الفصول",
            "price": 450000,
            "stock": 20,
            "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"]
        },
        {
            "name": "بطارية سيارة فارتا 70 أمبير",
            "description": "بطارية فارتا ألمانية أصلية، ضمان سنتين، مناسبة للسيارات الأوروبية والآسيوية",
            "price": 280000,
            "stock": 15,
            "images": ["https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600"]
        },
        {
            "name": "زيت موتور موبيل 1 - 5W30",
            "description": "زيت محرك صناعي بالكامل، 4 لتر، حماية فائقة للمحرك",
            "price": 125000,
            "stock": 50,
            "images": ["https://images.unsplash.com/photo-1635784063388-1ff609583a5f?w=600"]
        },
        {
            "name": "فلتر هواء تويوتا",
            "description": "فلتر هواء أصلي لسيارات تويوتا كامري وكورولا 2018-2024",
            "price": 35000,
            "stock": 30,
            "images": ["https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600"]
        },
        {
            "name": "شاحن سيارة سريع USB-C",
            "description": "شاحن سيارة 65 واط، منفذين USB-C و USB-A، شحن سريع للهواتف واللابتوب",
            "price": 45000,
            "stock": 40,
            "images": ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600"]
        },
        {
            "name": "كاميرا داش كام 4K",
            "description": "كاميرا أمامية للسيارة بدقة 4K، رؤية ليلية، تسجيل تلقائي عند الاصطدام",
            "price": 185000,
            "stock": 12,
            "images": ["https://images.unsplash.com/photo-1617469767053-d3b523a0b982?w=600"]
        },
        {
            "name": "حامل هاتف مغناطيسي للسيارة",
            "description": "حامل هاتف قوي بتثبيت مغناطيسي، يدور 360 درجة",
            "price": 25000,
            "stock": 60,
            "images": ["https://images.unsplash.com/photo-1598986646512-9330bcc4c0dc?w=600"]
        },
        {
            "name": "طقم تنظيف سيارة احترافي",
            "description": "طقم كامل: شامبو، واكس، منظف داخلي، فوط مايكروفايبر",
            "price": 95000,
            "stock": 25,
            "images": ["https://images.unsplash.com/photo-1607860108855-64acf2078ed9?w=600"]
        },
    ],
    
    # ===== ملابس =====
    "clothes": [
        {
            "name": "قميص رجالي قطن أزرق",
            "description": "قميص رسمي من القطن المصري الفاخر، مقاسات M-XXL",
            "price": 85000,
            "stock": 30,
            "images": ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600"]
        },
        {
            "name": "بنطال جينز رجالي",
            "description": "جينز عالي الجودة، قصة مستقيمة، لون أزرق داكن",
            "price": 120000,
            "stock": 25,
            "images": ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=600"]
        },
        {
            "name": "فستان نسائي صيفي",
            "description": "فستان أنيق بألوان زاهية، قماش خفيف ومريح",
            "price": 145000,
            "stock": 20,
            "images": ["https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600"]
        },
        {
            "name": "جاكيت جلد رجالي",
            "description": "جاكيت جلد طبيعي أسود، تصميم كلاسيكي أنيق",
            "price": 350000,
            "stock": 10,
            "images": ["https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600"]
        },
        {
            "name": "بلوزة نسائية حرير",
            "description": "بلوزة أنيقة من الحرير الناعم، متعددة الألوان",
            "price": 95000,
            "stock": 35,
            "images": ["https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=600"]
        },
        {
            "name": "طقم رياضي رجالي",
            "description": "طقم رياضي كامل (جاكيت + بنطال)، قماش مريح للتمارين",
            "price": 175000,
            "stock": 20,
            "images": ["https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600"]
        },
        {
            "name": "عباية نسائية مطرزة",
            "description": "عباية سوداء فاخرة مع تطريز ذهبي يدوي",
            "price": 280000,
            "stock": 15,
            "images": ["https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=600"]
        },
        {
            "name": "كنزة صوف شتوية",
            "description": "كنزة صوف دافئة، ألوان متعددة، مقاسات S-XL",
            "price": 135000,
            "stock": 40,
            "images": ["https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600"]
        },
    ],
    
    # ===== أطفال =====
    "kids": [
        {
            "name": "دمية باربي الأصلية",
            "description": "دمية باربي مع ملابس وإكسسوارات متعددة",
            "price": 75000,
            "stock": 25,
            "images": ["https://images.unsplash.com/photo-1613682988402-a12aec1f1d26?w=600"]
        },
        {
            "name": "سيارة تحكم عن بعد",
            "description": "سيارة سباق بريموت كنترول، سرعة عالية، بطارية قابلة للشحن",
            "price": 125000,
            "stock": 20,
            "images": ["https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600"]
        },
        {
            "name": "مكعبات ليغو 500 قطعة",
            "description": "طقم ليغو تعليمي، 500 قطعة ملونة، لعمر 6+ سنوات",
            "price": 165000,
            "stock": 15,
            "images": ["https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600"]
        },
        {
            "name": "دراجة أطفال 16 إنش",
            "description": "دراجة هوائية للأطفال مع عجلات تدريب، ألوان متعددة",
            "price": 285000,
            "stock": 10,
            "images": ["https://images.unsplash.com/photo-1532330393533-443990a51d10?w=600"]
        },
        {
            "name": "طقم ألوان وتلوين",
            "description": "طقم فني شامل: ألوان مائية، خشبية، فلوماستر، ودفتر رسم",
            "price": 55000,
            "stock": 40,
            "images": ["https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=600"]
        },
        {
            "name": "خيمة لعب للأطفال",
            "description": "خيمة قلعة الأميرات، سهلة التركيب، للداخل والخارج",
            "price": 95000,
            "stock": 18,
            "images": ["https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=600"]
        },
        {
            "name": "روبوت تعليمي ذكي",
            "description": "روبوت قابل للبرمجة، يعلم الأطفال أساسيات البرمجة",
            "price": 220000,
            "stock": 12,
            "images": ["https://images.unsplash.com/photo-1535378620166-273708d44e4c?w=600"]
        },
        {
            "name": "بازل 1000 قطعة - خريطة العالم",
            "description": "بازل تعليمي لخريطة العالم، مناسب للعائلة",
            "price": 65000,
            "stock": 30,
            "images": ["https://images.unsplash.com/photo-1606503153255-59d8b8b82176?w=600"]
        },
    ],
    
    # ===== كتب =====
    "books": [
        {
            "name": "رواية مئة عام من العزلة",
            "description": "رواية غابرييل غارسيا ماركيز الشهيرة، طبعة فاخرة",
            "price": 35000,
            "stock": 25,
            "images": ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600"]
        },
        {
            "name": "كتاب تعلم البرمجة بايثون",
            "description": "دليل شامل لتعلم لغة بايثون من الصفر للاحتراف",
            "price": 45000,
            "stock": 30,
            "images": ["https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600"]
        },
        {
            "name": "موسوعة الطبخ العربي",
            "description": "أكثر من 500 وصفة من المطبخ العربي التقليدي",
            "price": 75000,
            "stock": 20,
            "images": ["https://images.unsplash.com/photo-1589998059171-988d887df646?w=600"]
        },
        {
            "name": "قصص الأطفال - مجموعة 10 كتب",
            "description": "مجموعة قصص تربوية ملونة للأطفال 4-8 سنوات",
            "price": 85000,
            "stock": 35,
            "images": ["https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600"]
        },
        {
            "name": "كتاب فن التفاوض",
            "description": "استراتيجيات التفاوض الناجح في العمل والحياة",
            "price": 40000,
            "stock": 25,
            "images": ["https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600"]
        },
        {
            "name": "قاموس أكسفورد إنجليزي-عربي",
            "description": "قاموس شامل مع أكثر من 100,000 كلمة وتعبير",
            "price": 55000,
            "stock": 20,
            "images": ["https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600"]
        },
        {
            "name": "كتاب اليوغا والتأمل",
            "description": "دليل مصور لتمارين اليوغا والتأمل للمبتدئين",
            "price": 50000,
            "stock": 30,
            "images": ["https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=600"]
        },
        {
            "name": "سلسلة هاري بوتر كاملة",
            "description": "السلسلة الكاملة 7 أجزاء، طبعة خاصة بغلاف فاخر",
            "price": 195000,
            "stock": 15,
            "images": ["https://images.unsplash.com/photo-1618666012174-83b441c0bc76?w=600"]
        },
    ],
    
    # ===== أدوية ومستلزمات طبية =====
    "medicines": [
        {
            "name": "جهاز قياس ضغط الدم الرقمي",
            "description": "جهاز قياس ضغط دم أوتوماتيكي، دقيق وسهل الاستخدام",
            "price": 145000,
            "stock": 20,
            "images": ["https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600"]
        },
        {
            "name": "جهاز قياس السكر",
            "description": "جهاز قياس سكر الدم مع 50 شريط اختبار",
            "price": 125000,
            "stock": 25,
            "images": ["https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600"]
        },
        {
            "name": "ميزان حرارة رقمي",
            "description": "ميزان حرارة إلكتروني سريع القراءة، للأطفال والكبار",
            "price": 25000,
            "stock": 50,
            "images": ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600"]
        },
        {
            "name": "حقيبة إسعافات أولية",
            "description": "حقيبة شاملة تحتوي على جميع مستلزمات الإسعاف الأولي",
            "price": 85000,
            "stock": 30,
            "images": ["https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=600"]
        },
        {
            "name": "فيتامين D3 - 120 كبسولة",
            "description": "مكمل غذائي لتقوية العظام والمناعة، 1000 وحدة دولية",
            "price": 35000,
            "stock": 60,
            "images": ["https://images.unsplash.com/photo-1550572017-edd951b55104?w=600"]
        },
        {
            "name": "أوميغا 3 زيت السمك",
            "description": "كبسولات أوميغا 3 عالية التركيز، 90 كبسولة",
            "price": 55000,
            "stock": 40,
            "images": ["https://images.unsplash.com/photo-1577401239170-897942555fb3?w=600"]
        },
        {
            "name": "كمامات طبية N95 - 50 قطعة",
            "description": "كمامات طبية عالية الحماية، معتمدة طبياً",
            "price": 75000,
            "stock": 100,
            "images": ["https://images.unsplash.com/photo-1584634731339-252c581abfc5?w=600"]
        },
        {
            "name": "جل معقم اليدين 500مل",
            "description": "معقم يدين طبي بنسبة كحول 70%، برائحة منعشة",
            "price": 18000,
            "stock": 80,
            "images": ["https://images.unsplash.com/photo-1584744982491-665216d95f8b?w=600"]
        },
    ],
}

async def seed_products():
    """إضافة منتجات تجريبية للفئات الفارغة"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # الحصول على بائع للمنتجات
    seller = await db.users.find_one({"user_type": "seller", "is_approved": True})
    
    if not seller:
        print("❌ لا يوجد بائع معتمد في النظام")
        print("جاري إنشاء بائع تجريبي...")
        
        seller_id = str(uuid.uuid4())
        seller = {
            "id": seller_id,
            "name": "متجر تريند سوريا",
            "phone": "0933333333",
            "password_hash": "test_hash",
            "user_type": "seller",
            "is_approved": True,
            "city": "دمشق",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(seller)
        
        # إضافة معلومات البائع
        await db.seller_documents.insert_one({
            "seller_id": seller_id,
            "business_name": "متجر تريند سوريا الرسمي",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        print(f"✅ تم إنشاء البائع: {seller['name']}")
    
    seller_id = seller["id"]
    seller_name = seller["name"]
    
    # الحصول على اسم المتجر
    seller_docs = await db.seller_documents.find_one({"seller_id": seller_id})
    business_name = seller_docs.get("business_name", seller_name) if seller_docs else seller_name
    
    total_added = 0
    
    for category, products in PRODUCTS_DATA.items():
        print(f"\n📦 إضافة منتجات فئة: {category}")
        
        # التحقق من عدم وجود منتجات مكررة
        existing = await db.products.count_documents({"category": category})
        if existing > 0:
            print(f"  ⚠️ يوجد {existing} منتج بالفعل في هذه الفئة، تخطي...")
            continue
        
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
                "views": 0,
                "sales_count": 0
            }
            
            await db.products.insert_one(product_doc)
            print(f"  ✅ {product['name']}")
            total_added += 1
    
    print(f"\n{'='*50}")
    print(f"✅ تم إضافة {total_added} منتج بنجاح!")
    print(f"{'='*50}")
    
    # عرض إحصائيات الفئات
    print("\n📊 إحصائيات الفئات:")
    for category in PRODUCTS_DATA.keys():
        count = await db.products.count_documents({"category": category})
        print(f"  - {category}: {count} منتج")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_products())
