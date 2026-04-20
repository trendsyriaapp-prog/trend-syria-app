# /app/backend/models/__init__.py
# Explicit imports to avoid wildcard import issues
from .schemas import (
    # User Models
    UserRegister,
    ForgotPasswordRequest,
    VerifyIdentityRequest,
    ResetPasswordRequest,
    UserLogin,
    DeviceOTPVerify,
    PaymentAccount,
    DeliveryDocuments,
    SellerDocuments,
    # Product Models
    WeightVariant,
    ProductCreate,
    ProductUpdate,
    ProductApproval,
    ProductQuestion,
    ProductAnswer,
    # Cart & Order Models
    CartItem,
    OrderCreate,
    # Review Models
    ReviewCreate,
    # Message Models
    MessageCreate,
    # Payment Models
    ShamCashPayment,
    # Admin Models
    SubAdminCreate,
    NotificationCreate,
    # Address & Payment Method Models
    AddressCreate,
    PaymentMethodCreate,
    # Wallet & Withdrawal Models
    WithdrawalRequest,
    DeliveryFeesUpdate,
)

__all__ = [
    "UserRegister",
    "ForgotPasswordRequest",
    "VerifyIdentityRequest",
    "ResetPasswordRequest",
    "UserLogin",
    "DeviceOTPVerify",
    "PaymentAccount",
    "DeliveryDocuments",
    "SellerDocuments",
    "WeightVariant",
    "ProductCreate",
    "ProductUpdate",
    "ProductApproval",
    "ProductQuestion",
    "ProductAnswer",
    "CartItem",
    "OrderCreate",
    "ReviewCreate",
    "MessageCreate",
    "ShamCashPayment",
    "SubAdminCreate",
    "NotificationCreate",
    "AddressCreate",
    "PaymentMethodCreate",
    "WithdrawalRequest",
    "DeliveryFeesUpdate",
]
