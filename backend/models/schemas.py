# /app/backend/models/schemas.py
# نماذج البيانات (Pydantic Models)

from pydantic import BaseModel, Field
from typing import List, Optional

# ============== User Models ==============

class UserRegister(BaseModel):
    full_name: str
    phone: str
    password: str
    city: str
    user_type: str = "buyer"
    emergency_phone: Optional[str] = None  # رقم الطوارئ (اختياري)


class ForgotPasswordRequest(BaseModel):
    phone: str


class VerifyIdentityRequest(BaseModel):
    phone: str
    verification_type: str  # "emergency" or "name"
    emergency_last_4: Optional[str] = None  # آخر 4 أرقام من رقم الطوارئ
    full_name: Optional[str] = None  # الاسم الثلاثي


class ResetPasswordRequest(BaseModel):
    phone: str
    reset_token: str
    new_password: str

class UserLogin(BaseModel):
    phone: str
    password: str

class DeliveryDocuments(BaseModel):
    national_id: str
    personal_photo: str
    id_photo: str
    motorcycle_license: str
    
class SellerDocuments(BaseModel):
    seller_id: str
    business_name: str
    business_license: str

# ============== Product Models ==============

class WeightVariant(BaseModel):
    weight: str  # مثل "250g", "500g", "1kg"
    price: float
    stock: Optional[int] = None

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    stock: int
    images: List[str]
    video: Optional[str] = None
    video_url: Optional[str] = None
    city: str
    length_cm: Optional[float] = None
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    size_type: Optional[str] = None
    available_sizes: Optional[List[str]] = None
    max_per_customer: Optional[int] = None
    weight_variants: Optional[List[WeightVariant]] = None  # خيارات الوزن مع الأسعار

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    images: Optional[List[str]] = None
    video: Optional[str] = None
    video_url: Optional[str] = None
    city: Optional[str] = None
    length_cm: Optional[float] = None
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    size_type: Optional[str] = None
    available_sizes: Optional[List[str]] = None
    max_per_customer: Optional[int] = None
    weight_variants: Optional[List[WeightVariant]] = None  # خيارات الوزن مع الأسعار

class ProductApproval(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None

class ProductQuestion(BaseModel):
    question: str

class ProductAnswer(BaseModel):
    answer: str

# ============== Cart & Order Models ==============

class CartItem(BaseModel):
    product_id: str
    quantity: int
    selected_size: Optional[str] = None
    selected_weight: Optional[str] = None  # الوزن المحدد مثل "250g", "500g"

class OrderCreate(BaseModel):
    items: List[CartItem]
    address: str
    city: str
    phone: str
    payment_method: str = "shamcash"
    payment_phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # رسوم التوصيل بالمسافة
    delivery_fee: Optional[float] = None
    delivery_distance_km: Optional[float] = None

# ============== Review Models ==============

class ReviewCreate(BaseModel):
    product_id: str
    rating: int
    comment: str
    images: Optional[List[str]] = []

# ============== Message Models ==============

class MessageCreate(BaseModel):
    receiver_id: str
    content: str
    product_id: Optional[str] = None

# ============== Payment Models ==============

class ShamCashPayment(BaseModel):
    order_id: str
    phone: str
    otp: str

# ============== Admin Models ==============

class SubAdminCreate(BaseModel):
    full_name: str
    phone: str
    password: str
    city: str

class NotificationCreate(BaseModel):
    title: str
    message: str
    target: str = "all"

# ============== Address & Payment Method Models ==============

class AddressCreate(BaseModel):
    title: str
    city: str
    area: str
    street_number: Optional[str] = None
    building_number: Optional[str] = None
    apartment_number: Optional[str] = None
    phone: str
    is_default: bool = False

class PaymentMethodCreate(BaseModel):
    type: str
    phone: str
    holder_name: str
    is_default: bool = False

# ============== Wallet & Withdrawal Models ==============

class WithdrawalRequest(BaseModel):
    amount: int
    shamcash_phone: str

class DeliveryFeesUpdate(BaseModel):
    same_city: int = 3000
    nearby: int = 5000
    medium: int = 8000
    far: int = 12000

