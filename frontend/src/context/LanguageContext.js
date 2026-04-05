// /app/frontend/src/context/LanguageContext.js
// سياق اللغة - دعم العربية والإنجليزية الكامل

import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

// الترجمات الشاملة
const translations = {
  ar: {
    // =============== عام ===============
    app_name: 'ترند سورية',
    home: 'الرئيسية',
    categories: 'الأصناف',
    cart: 'السلة',
    profile: 'حسابي',
    login: 'دخول',
    logout: 'تسجيل خروج',
    settings: 'الإعدادات',
    search: 'ابحث عن منتجات...',
    loading: 'جارٍ التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    delete: 'حذف',
    edit: 'تعديل',
    add: 'إضافة',
    view_all: 'عرض الكل',
    back: 'رجوع',
    next: 'التالي',
    previous: 'السابق',
    close: 'إغلاق',
    currency: 'ل.س',
    
    // =============== الصفحة الرئيسية ===============
    welcome: 'مرحباً بك في ترند سورية',
    featured_products: 'منتجات مميزة',
    trending_now: 'الرائج الآن',
    daily_deals: 'عروض اليوم',
    recommendations: 'توصيات لك',
    new_arrivals: 'وصل حديثاً',
    best_sellers: 'الأكثر مبيعاً',
    shop_by_category: 'تسوق حسب الفئة',
    view_more_products: 'عرض المزيد من المنتجات',
    
    // =============== المنتجات ===============
    products: 'المنتجات',
    product: 'المنتج',
    price: 'السعر',
    add_to_cart: 'أضف للسلة',
    buy_now: 'اشترِ الآن',
    send_as_gift: 'إرسال كهدية',
    out_of_stock: 'غير متوفر',
    in_stock: 'متوفر',
    quantity: 'الكمية',
    size: 'المقاس',
    color: 'اللون',
    description: 'الوصف',
    specifications: 'المواصفات',
    reviews: 'التقييمات',
    no_reviews: 'لا توجد تقييمات بعد',
    write_review: 'اكتب تقييم',
    similar_products: 'منتجات مشابهة',
    share_product: 'مشاركة المنتج',
    add_to_wishlist: 'أضف للمفضلة',
    remove_from_wishlist: 'إزالة من المفضلة',
    discount: 'خصم',
    original_price: 'السعر الأصلي',
    sale_price: 'سعر البيع',
    
    // =============== السلة ===============
    shopping_cart: 'سلة التسوق',
    cart_empty: 'السلة فارغة',
    continue_shopping: 'متابعة التسوق',
    subtotal: 'المجموع الفرعي',
    shipping: 'الشحن',
    total: 'الإجمالي',
    checkout: 'إتمام الطلب',
    remove_item: 'حذف المنتج',
    update_quantity: 'تحديث الكمية',
    free_shipping: 'شحن مجاني',
    
    // =============== الطلبات ===============
    orders: 'الطلبات',
    my_orders: 'طلباتي',
    order_details: 'تفاصيل الطلب',
    order_number: 'رقم الطلب',
    order_date: 'تاريخ الطلب',
    order_status: 'حالة الطلب',
    order_total: 'إجمالي الطلب',
    track_order: 'تتبع الطلب',
    cancel_order: 'إلغاء الطلب',
    reorder: 'إعادة الطلب',
    pending: 'قيد الانتظار',
    processing: 'قيد المعالجة',
    confirmed: 'تم التأكيد',
    preparing: 'جاري التحضير',
    shipped: 'تم الشحن',
    out_for_delivery: 'في الطريق',
    delivered: 'تم التسليم',
    cancelled: 'ملغى',
    
    // =============== تتبع الطلب ===============
    live_tracking: 'التتبع الحي',
    driver_location: 'موقع السائق',
    estimated_arrival: 'الوصول المتوقع',
    delivery_address: 'عنوان التوصيل',
    driver_info: 'معلومات السائق',
    contact_driver: 'اتصل بالسائق',
    rate_driver: 'قيّم السائق',
    
    // =============== المصادقة ===============
    phone: 'رقم الهاتف',
    password: 'كلمة المرور',
    confirm_password: 'تأكيد كلمة المرور',
    name: 'الاسم',
    full_name: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    register: 'تسجيل جديد',
    create_account: 'إنشاء حساب',
    already_have_account: 'لديك حساب بالفعل؟',
    dont_have_account: 'ليس لديك حساب؟',
    forgot_password: 'نسيت كلمة المرور؟',
    reset_password: 'إعادة تعيين كلمة المرور',
    login_success: 'تم تسجيل الدخول بنجاح',
    logout_success: 'تم تسجيل الخروج',
    
    // =============== الإعدادات ===============
    dark_mode: 'الوضع الليلي',
    dark_mode_enabled: 'مفعّل - راحة للعين',
    dark_mode_disabled: 'معطّل',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    notifications: 'الإشعارات',
    enable_notifications: 'تفعيل الإشعارات',
    account_settings: 'إعدادات الحساب',
    privacy_settings: 'إعدادات الخصوصية',
    help_support: 'المساعدة والدعم',
    about_us: 'من نحن',
    terms_conditions: 'الشروط والأحكام',
    privacy_policy: 'سياسة الخصوصية',
    contact_us: 'تواصل معنا',
    
    // =============== العنوان ===============
    address: 'العنوان',
    city: 'المدينة',
    region: 'المنطقة',
    street: 'الشارع',
    building: 'البناء',
    floor: 'الطابق',
    add_address: 'إضافة عنوان',
    edit_address: 'تعديل العنوان',
    default_address: 'العنوان الافتراضي',
    
    // =============== الدفع ===============
    payment: 'الدفع',
    payment_method: 'طريقة الدفع',
    cash_on_delivery: 'الدفع عند الاستلام',
    card_payment: 'بطاقة ائتمان',
    wallet: 'المحفظة',
    wallet_balance: 'رصيد المحفظة',
    add_funds: 'إضافة رصيد',
    
    // =============== الكوبونات ===============
    coupon: 'كوبون',
    apply_coupon: 'تطبيق الكوبون',
    coupon_code: 'رمز الكوبون',
    coupon_applied: 'تم تطبيق الكوبون',
    invalid_coupon: 'كوبون غير صالح',
    
    // =============== الإشعارات ===============
    new_notification: 'إشعار جديد',
    mark_as_read: 'تحديد كمقروء',
    mark_all_read: 'تحديد الكل كمقروء',
    no_notifications: 'لا توجد إشعارات',
    
    // =============== البحث بالصورة ===============
    search_by_image: 'البحث بالصورة',
    upload_image: 'رفع صورة',
    take_photo: 'التقط صورة',
    searching: 'جاري البحث...',
    analyzing_image: 'جاري تحليل الصورة',
    similar_products_found: 'منتجات مشابهة',
    no_similar_found: 'لم نجد منتجات مشابهة',
    try_another_image: 'جرب صورة أخرى',
    
    // =============== البحث الصوتي ===============
    voice_search: 'البحث الصوتي',
    listening: 'جاري الاستماع...',
    speak_now: 'تحدث الآن',
    
    // =============== الهدايا ===============
    gift: 'هدية',
    send_gift: 'إرسال كهدية',
    recipient_name: 'اسم المستلم',
    recipient_phone: 'هاتف المستلم',
    gift_message: 'رسالة الهدية',
    anonymous_gift: 'هدية مجهولة',
    
    // =============== التقييمات ===============
    rating: 'التقييم',
    ratings: 'التقييمات',
    rate_product: 'قيّم المنتج',
    rate_service: 'قيّم الخدمة',
    your_rating: 'تقييمك',
    submit_rating: 'إرسال التقييم',
    
    // =============== رسائل ===============
    success: 'نجاح',
    error: 'خطأ',
    warning: 'تحذير',
    info: 'معلومة',
    no_results: 'لا توجد نتائج',
    something_went_wrong: 'حدث خطأ ما',
    please_try_again: 'يرجى المحاولة مرة أخرى',
    
    // =============== التأكيدات ===============
    are_you_sure: 'هل أنت متأكد؟',
    confirm_delete: 'تأكيد الحذف',
    confirm_cancel: 'تأكيد الإلغاء',
    action_cannot_undone: 'لا يمكن التراجع عن هذا الإجراء',
    
    // =============== WhatsApp ===============
    whatsapp_support: 'دعم واتساب',
    whatsapp_greeting: 'مرحباً! كيف يمكننا مساعدتك؟',
    whatsapp_product_inquiry: 'أريد الاستفسار عن منتج',
    whatsapp_order_issue: 'لدي مشكلة في طلبي',
    whatsapp_delivery: 'استفسار عن التوصيل',
    
    // =============== منصة الطعام ===============
    food: 'طعام',
    restaurants: 'مطاعم',
    food_delivery: 'توصيل طعام',
    order_food: 'اطلب طعام',
    menu: 'القائمة',
    add_to_order: 'أضف للطلب',
  },
  
  en: {
    // =============== General ===============
    app_name: 'Trend Syria',
    home: 'Home',
    categories: 'Categories',
    cart: 'Cart',
    profile: 'Profile',
    login: 'Login',
    logout: 'Logout',
    settings: 'Settings',
    search: 'Search products...',
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    view_all: 'View All',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    close: 'Close',
    currency: 'SYP',
    
    // =============== Homepage ===============
    welcome: 'Welcome to Trend Syria',
    featured_products: 'Featured Products',
    trending_now: 'Trending Now',
    daily_deals: 'Daily Deals',
    recommendations: 'Recommendations',
    new_arrivals: 'New Arrivals',
    best_sellers: 'Best Sellers',
    shop_by_category: 'Shop by Category',
    view_more_products: 'View More Products',
    
    // =============== Products ===============
    products: 'Products',
    product: 'Product',
    price: 'Price',
    add_to_cart: 'Add to Cart',
    buy_now: 'Buy Now',
    send_as_gift: 'Send as Gift',
    out_of_stock: 'Out of Stock',
    in_stock: 'In Stock',
    quantity: 'Quantity',
    size: 'Size',
    color: 'Color',
    description: 'Description',
    specifications: 'Specifications',
    reviews: 'Reviews',
    no_reviews: 'No reviews yet',
    write_review: 'Write a Review',
    similar_products: 'Similar Products',
    share_product: 'Share Product',
    add_to_wishlist: 'Add to Wishlist',
    remove_from_wishlist: 'Remove from Wishlist',
    discount: 'Discount',
    original_price: 'Original Price',
    sale_price: 'Sale Price',
    
    // =============== Cart ===============
    shopping_cart: 'Shopping Cart',
    cart_empty: 'Your cart is empty',
    continue_shopping: 'Continue Shopping',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    total: 'Total',
    checkout: 'Checkout',
    remove_item: 'Remove Item',
    update_quantity: 'Update Quantity',
    free_shipping: 'Free Shipping',
    
    // =============== Orders ===============
    orders: 'Orders',
    my_orders: 'My Orders',
    order_details: 'Order Details',
    order_number: 'Order Number',
    order_date: 'Order Date',
    order_status: 'Order Status',
    order_total: 'Order Total',
    track_order: 'Track Order',
    cancel_order: 'Cancel Order',
    reorder: 'Reorder',
    pending: 'Pending',
    processing: 'Processing',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    shipped: 'Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    
    // =============== Order Tracking ===============
    live_tracking: 'Live Tracking',
    driver_location: 'Driver Location',
    estimated_arrival: 'Estimated Arrival',
    delivery_address: 'Delivery Address',
    driver_info: 'Driver Info',
    contact_driver: 'Contact Driver',
    rate_driver: 'Rate Driver',
    
    // =============== Authentication ===============
    phone: 'Phone Number',
    password: 'Password',
    confirm_password: 'Confirm Password',
    name: 'Name',
    full_name: 'Full Name',
    email: 'Email',
    register: 'Register',
    create_account: 'Create Account',
    already_have_account: 'Already have an account?',
    dont_have_account: "Don't have an account?",
    forgot_password: 'Forgot Password?',
    reset_password: 'Reset Password',
    login_success: 'Login successful',
    logout_success: 'Logged out successfully',
    
    // =============== Settings ===============
    dark_mode: 'Dark Mode',
    dark_mode_enabled: 'Enabled - Easy on eyes',
    dark_mode_disabled: 'Disabled',
    language: 'Language',
    arabic: 'العربية',
    english: 'English',
    notifications: 'Notifications',
    enable_notifications: 'Enable Notifications',
    account_settings: 'Account Settings',
    privacy_settings: 'Privacy Settings',
    help_support: 'Help & Support',
    about_us: 'About Us',
    terms_conditions: 'Terms & Conditions',
    privacy_policy: 'Privacy Policy',
    contact_us: 'Contact Us',
    
    // =============== Address ===============
    address: 'Address',
    city: 'City',
    region: 'Region',
    street: 'Street',
    building: 'Building',
    floor: 'Floor',
    add_address: 'Add Address',
    edit_address: 'Edit Address',
    default_address: 'Default Address',
    
    // =============== Payment ===============
    payment: 'Payment',
    payment_method: 'Payment Method',
    cash_on_delivery: 'Cash on Delivery',
    card_payment: 'Card Payment',
    wallet: 'Wallet',
    wallet_balance: 'Wallet Balance',
    add_funds: 'Add Funds',
    
    // =============== Coupons ===============
    coupon: 'Coupon',
    apply_coupon: 'Apply Coupon',
    coupon_code: 'Coupon Code',
    coupon_applied: 'Coupon Applied',
    invalid_coupon: 'Invalid Coupon',
    
    // =============== Notifications ===============
    new_notification: 'New Notification',
    mark_as_read: 'Mark as Read',
    mark_all_read: 'Mark All as Read',
    no_notifications: 'No notifications',
    
    // =============== Image Search ===============
    search_by_image: 'Search by Image',
    upload_image: 'Upload Image',
    take_photo: 'Take Photo',
    searching: 'Searching...',
    analyzing_image: 'Analyzing image',
    similar_products_found: 'Similar Products',
    no_similar_found: 'No similar products found',
    try_another_image: 'Try another image',
    
    // =============== Voice Search ===============
    voice_search: 'Voice Search',
    listening: 'Listening...',
    speak_now: 'Speak now',
    
    // =============== Gifts ===============
    gift: 'Gift',
    send_gift: 'Send as Gift',
    recipient_name: 'Recipient Name',
    recipient_phone: 'Recipient Phone',
    gift_message: 'Gift Message',
    anonymous_gift: 'Anonymous Gift',
    
    // =============== Ratings ===============
    rating: 'Rating',
    ratings: 'Ratings',
    rate_product: 'Rate Product',
    rate_service: 'Rate Service',
    your_rating: 'Your Rating',
    submit_rating: 'Submit Rating',
    
    // =============== Messages ===============
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    no_results: 'No results found',
    something_went_wrong: 'Something went wrong',
    please_try_again: 'Please try again',
    
    // =============== Confirmations ===============
    are_you_sure: 'Are you sure?',
    confirm_delete: 'Confirm Delete',
    confirm_cancel: 'Confirm Cancel',
    action_cannot_undone: 'This action cannot be undone',
    
    // =============== WhatsApp ===============
    whatsapp_support: 'WhatsApp Support',
    whatsapp_greeting: 'Hello! How can we help you?',
    whatsapp_product_inquiry: 'I want to inquire about a product',
    whatsapp_order_issue: 'I have an issue with my order',
    whatsapp_delivery: 'Delivery inquiry',
    
    // =============== Food Platform ===============
    food: 'Food',
    restaurants: 'Restaurants',
    food_delivery: 'Food Delivery',
    order_food: 'Order Food',
    menu: 'Menu',
    add_to_order: 'Add to Order',
  }
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    return saved || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    
    // تغيير اتجاه الصفحة
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // تحديث font-family للإنجليزية
    if (language === 'en') {
      document.body.style.fontFamily = "'Inter', 'Segoe UI', sans-serif";
    } else {
      document.body.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
    }
  }, [language]);

  // دالة الترجمة
  const t = (key) => {
    return translations[language]?.[key] || translations['ar'][key] || key;
  };

  // تبديل اللغة
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  // هل اللغة RTL
  const isRTL = language === 'ar';

  // تنسيق الأرقام حسب اللغة
  const formatNumber = (num) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SY' : 'en-US').format(num);
  };

  // تنسيق السعر
  const formatPrice = (price) => {
    const formatted = formatNumber(price);
    return language === 'ar' ? `${formatted} ل.س` : `${formatted} SYP`;
  };

  // تنسيق التاريخ
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(language === 'ar' ? 'ar-SY' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <LanguageContext.Provider value={{ 
      language, 
      setLanguage, 
      toggleLanguage, 
      t, 
      isRTL,
      formatNumber,
      formatPrice,
      formatDate
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
