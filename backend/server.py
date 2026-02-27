from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends, Query, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import hashlib
import jwt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'trend-syria-secret-key-2024')
ALGORITHM = "HS256"

app = FastAPI(title="تريند سورية API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ============== Models ==============

class UserRegister(BaseModel):
    full_name: str  # الاسم الثلاثي
    phone: str  # رقم الهاتف - سيستخدم لتسجيل الدخول
    password: str
    city: str
    user_type: str = "buyer"  # buyer or seller

class UserLogin(BaseModel):
    phone: str  # تسجيل الدخول برقم الهاتف
    password: str

class SellerDocuments(BaseModel):
    seller_id: str
    business_name: str
    business_license: str  # Base64 encoded image

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    stock: int
    images: List[str]  # Base64 encoded images
    city: str  # مدينة البائع
    length_cm: Optional[float] = None  # الطول بالسنتيمتر
    width_cm: Optional[float] = None   # العرض بالسنتيمتر
    height_cm: Optional[float] = None  # الارتفاع بالسنتيمتر

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    images: Optional[List[str]] = None
    city: Optional[str] = None
    length_cm: Optional[float] = None
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None

class CartItem(BaseModel):
    product_id: str
    quantity: int

class OrderCreate(BaseModel):
    items: List[CartItem]
    address: str
    city: str
    phone: str
    payment_method: str = "shamcash"  # shamcash, syriatel_cash, mtn_cash
    payment_phone: Optional[str] = None

class ReviewCreate(BaseModel):
    product_id: str
    rating: int  # 1-5 نجوم
    comment: str
    images: Optional[List[str]] = []  # صور المنتج بعد الاستلام

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    product_id: Optional[str] = None

class ShamCashPayment(BaseModel):
    order_id: str
    phone: str
    otp: str

# ============== Helper Functions ==============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, user_type: str) -> str:
    payload = {
        "user_id": user_id,
        "user_type": user_type,
        "exp": datetime.now(timezone.utc).timestamp() + 86400 * 7  # 7 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="غير مصرح")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="مستخدم غير موجود")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        return user
    except:
        return None

# ============== Auth Routes ==============

@api_router.post("/auth/register")
async def register(user: UserRegister):
    existing = await db.users.find_one({"phone": user.phone})
    if existing:
        raise HTTPException(status_code=400, detail="رقم الهاتف مسجل مسبقاً")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user.full_name,
        "full_name": user.full_name,
        "phone": user.phone,
        "password": hash_password(user.password),
        "city": user.city,
        "user_type": user.user_type,
        "is_verified": user.user_type == "buyer",
        "is_approved": user.user_type == "buyer",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id, user.user_type)
    return {
        "token": token,
        "user": {
            "id": user_id,
            "name": user.full_name,
            "full_name": user.full_name,
            "phone": user.phone,
            "user_type": user.user_type,
            "is_approved": user_doc["is_approved"]
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"phone": credentials.phone}, {"_id": 0})
    if not user or user["password"] != hash_password(credentials.password):
        raise HTTPException(status_code=401, detail="رقم الهاتف أو كلمة المرور غير صحيحة")
    
    token = create_token(user["id"], user["user_type"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user.get("full_name", user.get("name", "")),
            "full_name": user.get("full_name", user.get("name", "")),
            "phone": user["phone"],
            "user_type": user["user_type"],
            "is_approved": user.get("is_approved", False)
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "id": user["id"],
        "name": user.get("full_name", user.get("name", "")),
        "full_name": user.get("full_name", user.get("name", "")),
        "phone": user.get("phone", ""),
        "city": user.get("city", ""),
        "user_type": user["user_type"],
        "is_approved": user.get("is_approved", False)
    }

# ============== Seller Documents ==============

@api_router.post("/seller/documents")
async def upload_seller_documents(docs: SellerDocuments, user: dict = Depends(get_current_user)):
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    
    doc = {
        "id": str(uuid.uuid4()),
        "seller_id": user["id"],
        "business_name": docs.business_name,
        "business_license": docs.business_license,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.seller_documents.insert_one(doc)
    return {"message": "تم رفع المستندات بنجاح، في انتظار الموافقة"}

@api_router.get("/seller/documents/status")
async def get_documents_status(user: dict = Depends(get_current_user)):
    doc = await db.seller_documents.find_one({"seller_id": user["id"]}, {"_id": 0})
    if not doc:
        return {"status": "not_submitted"}
    return {"status": doc["status"], "business_name": doc.get("business_name")}

# ============== Categories ==============

CATEGORIES = [
    {"id": "electronics", "name": "إلكترونيات", "icon": "Smartphone"},
    {"id": "fashion", "name": "أزياء", "icon": "Shirt"},
    {"id": "home", "name": "المنزل", "icon": "Home"},
    {"id": "beauty", "name": "تجميل", "icon": "Sparkles"},
    {"id": "sports", "name": "رياضة", "icon": "Dumbbell"},
    {"id": "books", "name": "كتب", "icon": "BookOpen"},
    {"id": "toys", "name": "ألعاب", "icon": "Gamepad2"},
    {"id": "food", "name": "طعام", "icon": "UtensilsCrossed"},
    {"id": "health", "name": "صحة", "icon": "Heart"},
    {"id": "cleaning", "name": "أدوات تنظيف", "icon": "SprayCan"},
]

@api_router.get("/categories")
async def get_categories():
    return CATEGORIES

# ============== Products ==============

@api_router.post("/products")
async def create_product(product: ProductCreate, user: dict = Depends(get_current_user)):
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    if not user.get("is_approved"):
        raise HTTPException(status_code=403, detail="حسابك غير مفعل بعد")
    
    # الحصول على اسم النشاط التجاري من وثائق البائع
    seller_docs = await db.seller_documents.find_one({"seller_id": user["id"]})
    business_name = seller_docs.get("business_name", user["name"]) if seller_docs else user["name"]
    
    product_id = str(uuid.uuid4())
    product_doc = {
        "id": product_id,
        "seller_id": user["id"],
        "seller_name": user["name"],
        "seller_phone": user.get("phone", ""),
        "business_name": business_name,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "category": product.category,
        "stock": product.stock,
        "images": product.images,
        "city": product.city,
        "length_cm": product.length_cm,
        "width_cm": product.width_cm,
        "height_cm": product.height_cm,
        "rating": 0,
        "reviews_count": 0,
        "sales_count": 0,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    return {"id": product_id, "message": "تم إضافة المنتج بنجاح"}

@api_router.get("/products")
async def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    page: int = 1,
    limit: int = 20
):
    query = {"is_active": True}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    
    skip = (page - 1) * limit
    products = await db.products.find(query, {"_id": 0, "seller_name": 0, "seller_phone": 0, "seller_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.products.count_documents(query)
    
    return {"products": products, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.get("/products/featured")
async def get_featured_products():
    products = await db.products.find({"is_active": True}, {"_id": 0, "seller_name": 0, "seller_phone": 0, "seller_id": 0}).sort("sales_count", -1).limit(8).to_list(8)
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str, authorization: Optional[str] = Header(None)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    
    # Get reviews
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).to_list(50)
    product["reviews"] = reviews
    
    # التحقق من نوع المستخدم
    is_admin = False
    if authorization and authorization.startswith("Bearer "):
        try:
            token = authorization.replace("Bearer ", "")
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user = await db.users.find_one({"id": payload.get("user_id")})
            if user and user.get("user_type") == "admin":
                is_admin = True
        except:
            pass
    
    # إخفاء معلومات البائع من العملاء (فقط المدير يراها)
    if not is_admin:
        product.pop("seller_name", None)
        product.pop("seller_phone", None)
        product.pop("seller_id", None)
    
    return product

@api_router.get("/seller/products")
async def get_seller_products(user: dict = Depends(get_current_user)):
    if user["user_type"] != "seller":
        raise HTTPException(status_code=403, detail="للبائعين فقط")
    products = await db.products.find({"seller_id": user["id"]}, {"_id": 0}).to_list(100)
    return products

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, update: ProductUpdate, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    if product["seller_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if update_data:
        await db.products.update_one({"id": product_id}, {"$set": update_data})
    return {"message": "تم تحديث المنتج"}

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    if product["seller_id"] != user["id"] and user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.products.update_one({"id": product_id}, {"$set": {"is_active": False}})
    return {"message": "تم حذف المنتج"}

# ============== Cart ==============

@api_router.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]}, {"_id": 0})
    if not cart:
        return {"items": [], "total": 0}
    
    # Get product details for each item
    items_with_details = []
    total = 0
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            item_total = product["price"] * item["quantity"]
            items_with_details.append({
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "product": product,
                "item_total": item_total
            })
            total += item_total
    
    return {"items": items_with_details, "total": total}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": item.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    if product["stock"] < item.quantity:
        raise HTTPException(status_code=400, detail="الكمية غير متوفرة")
    
    cart = await db.carts.find_one({"user_id": user["id"]})
    if cart:
        # Check if product already in cart
        existing_item = next((i for i in cart["items"] if i["product_id"] == item.product_id), None)
        if existing_item:
            new_quantity = existing_item["quantity"] + item.quantity
            await db.carts.update_one(
                {"user_id": user["id"], "items.product_id": item.product_id},
                {"$set": {"items.$.quantity": new_quantity}}
            )
        else:
            await db.carts.update_one(
                {"user_id": user["id"]},
                {"$push": {"items": {"product_id": item.product_id, "quantity": item.quantity}}}
            )
    else:
        await db.carts.insert_one({
            "user_id": user["id"],
            "items": [{"product_id": item.product_id, "quantity": item.quantity}]
        })
    
    return {"message": "تمت الإضافة إلى السلة"}

@api_router.put("/cart/update")
async def update_cart_item(item: CartItem, user: dict = Depends(get_current_user)):
    if item.quantity <= 0:
        await db.carts.update_one(
            {"user_id": user["id"]},
            {"$pull": {"items": {"product_id": item.product_id}}}
        )
    else:
        await db.carts.update_one(
            {"user_id": user["id"], "items.product_id": item.product_id},
            {"$set": {"items.$.quantity": item.quantity}}
        )
    return {"message": "تم تحديث السلة"}

@api_router.delete("/cart/{product_id}")
async def remove_from_cart(product_id: str, user: dict = Depends(get_current_user)):
    await db.carts.update_one(
        {"user_id": user["id"]},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "تم الحذف من السلة"}

# ============== Orders ==============

@api_router.post("/orders")
async def create_order(order: OrderCreate, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="السلة فارغة")
    
    # Calculate total and validate stock
    items_details = []
    total = 0
    for item in cart["items"]:
        product = await db.products.find_one({"id": item["product_id"]})
        if not product:
            raise HTTPException(status_code=400, detail=f"منتج غير موجود")
        if product["stock"] < item["quantity"]:
            raise HTTPException(status_code=400, detail=f"الكمية غير متوفرة: {product['name']}")
        
        item_total = product["price"] * item["quantity"]
        items_details.append({
            "product_id": item["product_id"],
            "product_name": product["name"],
            "seller_id": product["seller_id"],
            "price": product["price"],
            "quantity": item["quantity"],
            "item_total": item_total,
            "image": product["images"][0] if product["images"] else None
        })
        total += item_total
    
    order_id = str(uuid.uuid4())
    order_doc = {
        "id": order_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "items": items_details,
        "total": total,
        "address": order.address,
        "city": order.city,
        "phone": order.phone,
        "payment_method": order.payment_method,
        "payment_phone": order.payment_phone,
        "status": "pending_payment",
        "delivery_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order_doc)
    
    # Clear cart
    await db.carts.delete_one({"user_id": user["id"]})
    
    # Update product stock
    for item in cart["items"]:
        await db.products.update_one(
            {"id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"], "sales_count": item["quantity"]}}
        )
    
    return {"order_id": order_id, "total": total, "message": "تم إنشاء الطلب"}

@api_router.get("/orders")
async def get_orders(user: dict = Depends(get_current_user)):
    if user["user_type"] == "seller":
        # Get orders containing seller's products
        orders = await db.orders.find(
            {"items.seller_id": user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    else:
        orders = await db.orders.find(
            {"user_id": user["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if order["user_id"] != user["id"] and user["user_type"] not in ["seller", "admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    return order

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str = Query(...), user: dict = Depends(get_current_user)):
    if user["user_type"] not in ["seller", "admin"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"delivery_status": status}}
    )
    return {"message": "تم تحديث حالة الطلب"}

# ============== ShamCash Payment ==============

@api_router.post("/payment/shamcash/init")
async def init_shamcash_payment(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    if order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="غير مصرح")
    
    # Simulated OTP - في الواقع سيتم إرسال OTP عبر شام كاش
    return {
        "message": "تم إرسال رمز التحقق إلى رقم شام كاش",
        "order_id": order_id,
        "amount": order["total"]
    }

@api_router.post("/payment/shamcash/verify")
async def verify_shamcash_payment(payment: ShamCashPayment, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": payment.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    
    # Simulated verification - في الواقع سيتم التحقق عبر API شام كاش
    # For demo, accept any 6-digit OTP
    if len(payment.otp) == 6 and payment.otp.isdigit():
        await db.orders.update_one(
            {"id": payment.order_id},
            {"$set": {"status": "paid", "payment_verified_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"success": True, "message": "تم الدفع بنجاح"}
    else:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح")

# ============== Reviews ==============

@api_router.post("/reviews")
async def create_review(review: ReviewCreate, user: dict = Depends(get_current_user)):
    # Check if user purchased this product
    order = await db.orders.find_one({
        "user_id": user["id"],
        "items.product_id": review.product_id,
        "status": "paid"
    })
    if not order:
        raise HTTPException(status_code=400, detail="يجب شراء المنتج أولاً للتقييم")
    
    # Check if already reviewed
    existing = await db.reviews.find_one({
        "user_id": user["id"],
        "product_id": review.product_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="تم تقييم هذا المنتج مسبقاً")
    
    review_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user["name"],
        "product_id": review.product_id,
        "rating": review.rating,
        "comment": review.comment,
        "images": review.images or [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)
    
    # Update product rating
    reviews = await db.reviews.find({"product_id": review.product_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
    await db.products.update_one(
        {"id": review.product_id},
        {"$set": {"rating": round(avg_rating, 1), "reviews_count": len(reviews)}}
    )
    
    return {"message": "تم إضافة التقييم"}

@api_router.get("/reviews/{product_id}")
async def get_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).to_list(100)
    return reviews

# ============== Messages/Chat ==============

@api_router.post("/messages")
async def send_message(message: MessageCreate, user: dict = Depends(get_current_user)):
    msg_doc = {
        "id": str(uuid.uuid4()),
        "sender_id": user["id"],
        "sender_name": user["name"],
        "receiver_id": message.receiver_id,
        "content": message.content,
        "product_id": message.product_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(msg_doc)
    return {"message": "تم إرسال الرسالة"}

@api_router.get("/messages")
async def get_conversations(user: dict = Depends(get_current_user)):
    # Get all unique conversations
    pipeline = [
        {"$match": {"$or": [{"sender_id": user["id"]}, {"receiver_id": user["id"]}]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": {
                "$cond": [
                    {"$eq": ["$sender_id", user["id"]]},
                    "$receiver_id",
                    "$sender_id"
                ]
            },
            "last_message": {"$first": "$$ROOT"},
            "unread_count": {
                "$sum": {
                    "$cond": [
                        {"$and": [
                            {"$eq": ["$receiver_id", user["id"]]},
                            {"$eq": ["$is_read", False]}
                        ]},
                        1,
                        0
                    ]
                }
            }
        }}
    ]
    conversations = await db.messages.aggregate(pipeline).to_list(100)
    
    # Get user details for each conversation
    result = []
    for conv in conversations:
        other_user = await db.users.find_one({"id": conv["_id"]}, {"_id": 0, "password": 0})
        if other_user:
            result.append({
                "user": other_user,
                "last_message": {
                    "content": conv["last_message"]["content"],
                    "created_at": conv["last_message"]["created_at"],
                    "is_mine": conv["last_message"]["sender_id"] == user["id"]
                },
                "unread_count": conv["unread_count"]
            })
    
    return result

@api_router.get("/messages/{other_user_id}")
async def get_chat_messages(other_user_id: str, user: dict = Depends(get_current_user)):
    messages = await db.messages.find({
        "$or": [
            {"sender_id": user["id"], "receiver_id": other_user_id},
            {"sender_id": other_user_id, "receiver_id": user["id"]}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(100)
    
    # Mark as read
    await db.messages.update_many(
        {"sender_id": other_user_id, "receiver_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return messages

# ============== Admin Routes ==============

@api_router.get("/admin/sellers/pending")
async def get_pending_sellers(user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    docs = await db.seller_documents.find({"status": "pending"}, {"_id": 0}).to_list(100)
    result = []
    for doc in docs:
        seller = await db.users.find_one({"id": doc["seller_id"]}, {"_id": 0, "password": 0})
        if seller:
            result.append({**doc, "seller": seller})
    return result

@api_router.post("/admin/sellers/{seller_id}/approve")
async def approve_seller(seller_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    await db.users.update_one({"id": seller_id}, {"$set": {"is_approved": True}})
    await db.seller_documents.update_one({"seller_id": seller_id}, {"$set": {"status": "approved"}})
    return {"message": "تم تفعيل البائع"}

@api_router.post("/admin/sellers/{seller_id}/reject")
async def reject_seller(seller_id: str, user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    await db.seller_documents.update_one({"seller_id": seller_id}, {"$set": {"status": "rejected"}})
    return {"message": "تم رفض البائع"}

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    if user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="للمدراء فقط")
    
    total_users = await db.users.count_documents({})
    total_sellers = await db.users.count_documents({"user_type": "seller"})
    total_products = await db.products.count_documents({"is_active": True})
    total_orders = await db.orders.count_documents({})
    pending_sellers = await db.seller_documents.count_documents({"status": "pending"})
    
    return {
        "total_users": total_users,
        "total_sellers": total_sellers,
        "total_products": total_products,
        "total_orders": total_orders,
        "pending_sellers": pending_sellers
    }

# ============== Seed Demo Data ==============

@api_router.post("/seed")
async def seed_demo_data():
    # Check if already seeded
    existing = await db.products.count_documents({})
    if existing > 0:
        return {"message": "البيانات موجودة مسبقاً"}
    
    # Create admin user
    admin_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": admin_id,
        "name": "أحمد محمد علي",
        "full_name": "أحمد محمد علي",
        "password": hash_password("admin123"),
        "phone": "0911111111",
        "city": "دمشق",
        "user_type": "admin",
        "is_verified": True,
        "is_approved": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Create demo seller
    seller_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": seller_id,
        "name": "خالد سعيد حسن",
        "full_name": "خالد سعيد حسن",
        "password": hash_password("seller123"),
        "phone": "0922222222",
        "city": "حلب",
        "user_type": "seller",
        "is_verified": True,
        "is_approved": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Demo products
    demo_products = [
        {
            "name": "هاتف سامسونج Galaxy S24",
            "description": "هاتف ذكي بشاشة AMOLED وكاميرا 108 ميجابكسل",
            "price": 2500000,
            "category": "electronics",
            "stock": 15,
            "images": ["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400"]
        },
        {
            "name": "حقيبة يد نسائية فاخرة",
            "description": "حقيبة جلد طبيعي بتصميم عصري",
            "price": 450000,
            "category": "fashion",
            "stock": 20,
            "images": ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400"]
        },
        {
            "name": "سماعات لاسلكية Sony",
            "description": "سماعات بتقنية إلغاء الضوضاء",
            "price": 850000,
            "category": "electronics",
            "stock": 30,
            "images": ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"]
        },
        {
            "name": "ساعة يد رجالية",
            "description": "ساعة كلاسيكية بحزام جلد",
            "price": 320000,
            "category": "fashion",
            "stock": 25,
            "images": ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"]
        },
        {
            "name": "لابتوب Lenovo ThinkPad",
            "description": "لابتوب للأعمال بمعالج i7",
            "price": 3200000,
            "category": "electronics",
            "stock": 10,
            "images": ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400"]
        },
        {
            "name": "طقم أثاث غرفة جلوس",
            "description": "طقم كنب مودرن 3+2+1",
            "price": 5500000,
            "category": "home",
            "stock": 5,
            "images": ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400"]
        },
        {
            "name": "عطر رجالي Dior Sauvage",
            "description": "عطر فرنسي أصلي 100مل",
            "price": 280000,
            "category": "beauty",
            "stock": 40,
            "images": ["https://images.unsplash.com/photo-1541643600914-78b084683601?w=400"]
        },
        {
            "name": "دراجة رياضية",
            "description": "دراجة هوائية للتمارين المنزلية",
            "price": 750000,
            "category": "sports",
            "stock": 12,
            "images": ["https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400"]
        }
    ]
    
    for product in demo_products:
        await db.products.insert_one({
            "id": str(uuid.uuid4()),
            "seller_id": seller_id,
            "seller_name": "متجر الأناقة",
            **product,
            "rating": round(3.5 + (hash(product["name"]) % 15) / 10, 1),
            "reviews_count": hash(product["name"]) % 50,
            "sales_count": hash(product["name"]) % 100,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "تم إنشاء البيانات التجريبية بنجاح"}

@api_router.get("/")
async def root():
    return {"message": "مرحباً بك في تريند سورية API"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
