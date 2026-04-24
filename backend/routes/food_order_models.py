# /app/backend/routes/food_order_models.py
# نماذج Pydantic لطلبات الطعام
# تم استخراجها من food_orders.py

from pydantic import BaseModel
from typing import Optional, List


# ============== نماذج فحص المسافة ==============

class DistanceCheckRequest(BaseModel):
    """طلب فحص المسافة بين المتجر والعميل"""
    store_id: str
    customer_lat: float
    customer_lng: float


# ============== نماذج عناصر الطلب ==============

class FoodOrderItem(BaseModel):
    """عنصر واحد في طلب الطعام"""
    product_id: str
    name: str
    price: float
    quantity: int
    notes: Optional[str] = None


class FoodOrderCreate(BaseModel):
    """إنشاء طلب طعام جديد"""
    store_id: str
    items: List[FoodOrderItem]
    delivery_address: str
    delivery_city: str
    delivery_phone: str
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None
    detailed_address: str = ""  # العنوان التفصيلي (إجباري)
    notes: Optional[str] = None
    delivery_note: str = ""  # ملاحظة لموظف التوصيل
    payment_method: str = "wallet"  # wallet, cash
    batch_id: Optional[str] = None  # معرف الدفعة للطلبات المجمعة
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    # رسوم التوصيل
    delivery_fee: Optional[float] = None
    delivery_distance_km: Optional[float] = None
    # الجدولة
    scheduled_for: Optional[str] = None  # ISO datetime string للطلبات المجدولة
    is_scheduled: bool = False


# ============== نماذج الطلبات المجمعة ==============

class BatchOrderItem(BaseModel):
    """عنصر في طلب مجمع"""
    store_id: str
    items: List[FoodOrderItem]
    notes: Optional[str] = None


class BatchOrderCreate(BaseModel):
    """إنشاء طلب مجمع (من عدة متاجر)"""
    orders: List[BatchOrderItem]
    delivery_address: str
    delivery_city: str
    delivery_phone: str
    detailed_address: str = ""  # العنوان التفصيلي (إجباري)
    delivery_note: str = ""  # ملاحظة لموظف التوصيل
    payment_method: str = "wallet"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    delivery_latitude: Optional[float] = None
    delivery_longitude: Optional[float] = None


# ============== نماذج المتجر ==============

class PreparationStartRequest(BaseModel):
    """بدء تحضير الطلب"""
    preparation_time_minutes: int = 15  # وقت التحضير بالدقائق


class SetPreparationTimeData(BaseModel):
    """تحديد وقت التحضير"""
    preparation_time_minutes: int


class RequestDriverData(BaseModel):
    """بيانات طلب سائق"""
    pass


# ============== نماذج السائق ==============

class DriverCancelRequest(BaseModel):
    """إلغاء طلب من السائق"""
    reason: str  # سبب الإلغاء (إجباري)


class SmartRouteEvaluateRequest(BaseModel):
    """تقييم الطلب للتوجيه الذكي"""
    order_id: str
    driver_lat: float
    driver_lon: float


class VerifyPickupCode(BaseModel):
    """التحقق من كود الاستلام"""
    code: str


class StartDeliveryData(BaseModel):
    """بدء التوصيل للعميل"""
    estimated_minutes: Optional[int] = 30


class DeliveryCodeVerification(BaseModel):
    """التحقق من كود التسليم"""
    delivery_code: str


class FoodDeliveryFailedRequest(BaseModel):
    """فشل التسليم"""
    reason: str  # customer_not_responding, wrong_address, customer_refused, other
    action: str  # return_to_store, cancel_order
    notes: Optional[str] = None


class AcceptOrderData(BaseModel):
    """قبول الطلب من السائق"""
    pass


# ============== نماذج الأدمن ==============

class AdminCancelRequest(BaseModel):
    """إلغاء طلب من الأدمن"""
    reason: str
    notify_customer: bool = True
    offer_replacement: bool = True
