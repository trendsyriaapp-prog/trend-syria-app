# /app/backend/models/schemas.py
# نماذج البيانات (Pydantic Models)

from pydantic import BaseModel
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
    device_id: Optional[str] = None  # معرف الجهاز للتحقق من الأجهزة الجديدة


class DeviceOTPVerify(BaseModel):
    phone: str
    otp: str
    device_id: str
    device_name: Optional[str] = None  # اسم الجهاز (اختياري)

class PaymentAccount(BaseModel):
    type: str  # shamcash, bank_account
    account_number: str
    holder_name: str
    bank_name: Optional[str] = None

class DeliveryDocuments(BaseModel):
    national_id: str
    personal_photo: str
    id_photo: str
    vehicle_type: str  # car, motorcycle, electric_scooter, bicycle
    motorcycle_license: Optional[str] = None  # إجباري فقط لـ car و motorcycle
    vehicle_photo: Optional[str] = None  # صورة المركبة
    # حقول العنوان الإلزامية
    home_address: str  # العنوان النصي
    home_latitude: float  # خط العرض
    home_longitude: float  # خط الطول
    home_city: Optional[str] = None  # المدينة
    # حساب استلام الأرباح
    payment_account: Optional[PaymentAccount] = None
    
class SellerDocuments(BaseModel):
    business_name: str
    business_category: Optional[str] = None  # صنف النشاط التجاري
    seller_type: str  # traditional_shop, restaurant
    national_id: str  # صورة الهوية
    commercial_registration: Optional[str] = None  # السجل التجاري (اختياري حسب الصنف)
    shop_photo: Optional[str] = None  # صورة المحل (للمتاجر التقليدية)
    health_certificate: Optional[str] = None  # الشهادة الصحية (للمطاعم)
    # حقول العنوان الإلزامية
    store_address: str  # العنوان النصي
    store_latitude: float  # خط العرض
    store_longitude: float  # خط الطول
    store_city: Optional[str] = None  # المدينة
    # حساب استلام الأرباح
    payment_account: Optional[PaymentAccount] = None

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
    admin_video: Optional[str] = None  # فيديو التحقق للأدمن (إجباري من الفرونت)
    city: Optional[str] = None
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
    admin_video: Optional[str] = None  # فيديو التحقق للأدمن
    city: Optional[str] = None
    length_cm: Optional[float] = None
    width_cm: Optional[float] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    size_type: Optional[str] = None
    available_sizes: Optional[List[str]] = None
    max_per_customer: Optional[int] = None
    weight_variants: Optional[List[WeightVariant]] = None  # خيارات الوزن مع الأسعار
    is_available: Optional[bool] = None  # حالة توفر المنتج

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
    items: Optional[List[CartItem]] = None  # يتم تجاهله - يُقرأ من السلة
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
    # ملاحظة لموظف التوصيل (إجبارية من الواجهة)
    delivery_note: str = ""

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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address_details: Optional[str] = None  # العنوان التفصيلي
    landmark: Optional[str] = None  # علامة مميزة قريبة

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

