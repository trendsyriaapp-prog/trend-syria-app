# /app/backend/models/schemas.py
# نماذج البيانات (Pydantic Models)

from pydantic import BaseModel, validator
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
    
    @validator('account_number')
    def validate_account_number(cls, v, values):
        payment_type = values.get('type', '')
        account = v.strip()
        
        if payment_type == 'shamcash':
            # شام كاش: رقم سوري يبدأ بـ 09 ويتكون من 10 أرقام
            if not account.startswith('09'):
                raise ValueError('رقم شام كاش يجب أن يبدأ بـ 09')
            if len(account) != 10:
                raise ValueError('رقم شام كاش يجب أن يتكون من 10 أرقام')
            if not account.isdigit():
                raise ValueError('رقم شام كاش يجب أن يحتوي على أرقام فقط')
        
        elif payment_type == 'bank_account':
            # حساب بنكي: رقم IBAN أو رقم حساب (10-34 حرف)
            if len(account) < 10:
                raise ValueError('رقم الحساب البنكي يجب أن يتكون من 10 أحرف على الأقل')
            if len(account) > 34:
                raise ValueError('رقم الحساب البنكي طويل جداً')
        
        return account
    
    @validator('holder_name')
    def validate_holder_name(cls, v):
        name = v.strip()
        if len(name) < 3:
            raise ValueError('اسم صاحب الحساب يجب أن يتكون من 3 أحرف على الأقل')
        if len(name) > 100:
            raise ValueError('اسم صاحب الحساب طويل جداً')
        return name

class DeliveryDocuments(BaseModel):
    national_id: str  # رقم الهوية الوطنية
    personal_photo: str  # صورة شخصية (سيلفي) - إلزامية
    id_photo: str  # صورة الهوية - إلزامية
    bike_photo: str  # صورة الدراجة - إلزامية
    fuel_type: str  # نوع الوقود: petrol أو electric
    # حقول العنوان والموقع الإلزامية
    home_address: str  # العنوان النصي (المدينة + العنوان)
    home_latitude: float  # خط العرض - إلزامي
    home_longitude: float  # خط الطول - إلزامي
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
    
    @validator('phone')
    def validate_phone(cls, v, values):
        payment_type = values.get('type', '')
        phone = v.strip()
        
        if payment_type == 'shamcash':
            # شام كاش: رقم سوري يبدأ بـ 09 ويتكون من 10 أرقام
            if not phone.startswith('09'):
                raise ValueError('رقم شام كاش يجب أن يبدأ بـ 09')
            if len(phone) != 10:
                raise ValueError('رقم شام كاش يجب أن يتكون من 10 أرقام')
            if not phone.isdigit():
                raise ValueError('رقم شام كاش يجب أن يحتوي على أرقام فقط')
        
        elif payment_type == 'bank_account':
            # حساب بنكي: رقم IBAN أو رقم حساب (10-34 حرف)
            if len(phone) < 10:
                raise ValueError('رقم الحساب البنكي يجب أن يتكون من 10 أحرف على الأقل')
            if len(phone) > 34:
                raise ValueError('رقم الحساب البنكي طويل جداً')
        
        return phone
    
    @validator('holder_name')
    def validate_holder_name(cls, v):
        name = v.strip()
        if len(name) < 3:
            raise ValueError('اسم صاحب الحساب يجب أن يتكون من 3 أحرف على الأقل')
        if len(name) > 100:
            raise ValueError('اسم صاحب الحساب طويل جداً')
        return name

# ============== Wallet & Withdrawal Models ==============

class WithdrawalRequest(BaseModel):
    amount: int
    withdrawal_method: str = "shamcash"  # shamcash, bank_account
    # حقول شام كاش
    shamcash_phone: Optional[str] = None
    # حقول الحساب البنكي
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_holder: Optional[str] = None
    
    @validator('shamcash_phone')
    def validate_shamcash_phone(cls, v, values):
        if v is None:
            return v
        phone = v.strip()
        if values.get('withdrawal_method') == 'shamcash':
            if not phone.startswith('09'):
                raise ValueError('رقم شام كاش يجب أن يبدأ بـ 09')
            if len(phone) != 10:
                raise ValueError('رقم شام كاش يجب أن يتكون من 10 أرقام')
            if not phone.isdigit():
                raise ValueError('رقم شام كاش يجب أن يحتوي على أرقام فقط')
        return phone
    
    @validator('account_number')
    def validate_account_number(cls, v, values):
        if v is None:
            return v
        account = v.strip()
        if values.get('withdrawal_method') == 'bank_account':
            if len(account) < 10:
                raise ValueError('رقم الحساب البنكي يجب أن يتكون من 10 أحرف على الأقل')
            if len(account) > 34:
                raise ValueError('رقم الحساب البنكي طويل جداً')
        return account


class TopUpRequestModel(BaseModel):
    amount: int
    payment_method: str = "shamcash"  # shamcash, bank_account
    # حقول شام كاش
    shamcash_phone: Optional[str] = None
    # حقول الحساب البنكي (للتحويل البنكي)
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    sender_name: Optional[str] = None
    
    @validator('shamcash_phone')
    def validate_shamcash_phone(cls, v, values):
        if v is None:
            return v
        phone = v.strip()
        if values.get('payment_method') == 'shamcash':
            if not phone.startswith('09'):
                raise ValueError('رقم شام كاش يجب أن يبدأ بـ 09')
            if len(phone) != 10:
                raise ValueError('رقم شام كاش يجب أن يتكون من 10 أرقام')
            if not phone.isdigit():
                raise ValueError('رقم شام كاش يجب أن يحتوي على أرقام فقط')
        return phone

class DeliveryFeesUpdate(BaseModel):
    same_city: int = 3000
    nearby: int = 5000
    medium: int = 8000
    far: int = 12000

