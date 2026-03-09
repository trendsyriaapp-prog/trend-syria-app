// /app/frontend/src/context/LanguageContext.js
// سياق اللغة - دعم العربية والإنجليزية

import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

// الترجمات
const translations = {
  ar: {
    // عام
    app_name: 'تريند سورية',
    home: 'الرئيسية',
    categories: 'الأصناف',
    cart: 'السلة',
    profile: 'حسابي',
    login: 'دخول',
    logout: 'تسجيل خروج',
    settings: 'الإعدادات',
    search: 'ابحث عن منتجات...',
    
    // المنتجات
    products: 'المنتجات',
    price: 'السعر',
    add_to_cart: 'أضف للسلة',
    buy_now: 'اشترِ الآن',
    send_as_gift: 'إرسال كهدية',
    
    // الطلبات
    orders: 'الطلبات',
    order_status: 'حالة الطلب',
    pending: 'قيد الانتظار',
    processing: 'قيد المعالجة',
    shipped: 'تم الشحن',
    delivered: 'تم التسليم',
    
    // المصادقة
    phone: 'رقم الهاتف',
    password: 'كلمة المرور',
    register: 'تسجيل جديد',
    forgot_password: 'نسيت كلمة المرور؟',
    
    // الإعدادات
    dark_mode: 'الوضع الليلي',
    dark_mode_enabled: 'مفعّل - راحة للعين',
    dark_mode_disabled: 'معطّل',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    
    // رسائل
    success: 'نجاح',
    error: 'خطأ',
    loading: 'جارٍ التحميل...',
    no_results: 'لا توجد نتائج',
    
    // WhatsApp
    whatsapp_greeting: 'مرحباً! كيف يمكننا مساعدتك؟',
    whatsapp_product_inquiry: 'أريد الاستفسار عن منتج',
    whatsapp_order_issue: 'لدي مشكلة في طلبي',
    whatsapp_support: 'أريد التحدث مع الدعم',
    whatsapp_delivery: 'استفسار عن التوصيل',
  },
  
  en: {
    // General
    app_name: 'Trend Syria',
    home: 'Home',
    categories: 'Categories',
    cart: 'Cart',
    profile: 'Profile',
    login: 'Login',
    logout: 'Logout',
    settings: 'Settings',
    search: 'Search products...',
    
    // Products
    products: 'Products',
    price: 'Price',
    add_to_cart: 'Add to Cart',
    buy_now: 'Buy Now',
    send_as_gift: 'Send as Gift',
    
    // Orders
    orders: 'Orders',
    order_status: 'Order Status',
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    
    // Auth
    phone: 'Phone Number',
    password: 'Password',
    register: 'Register',
    forgot_password: 'Forgot Password?',
    
    // Settings
    dark_mode: 'Dark Mode',
    dark_mode_enabled: 'Enabled - Easy on eyes',
    dark_mode_disabled: 'Disabled',
    language: 'Language',
    arabic: 'العربية',
    english: 'English',
    
    // Messages
    success: 'Success',
    error: 'Error',
    loading: 'Loading...',
    no_results: 'No results found',
    
    // WhatsApp
    whatsapp_greeting: 'Hello! How can we help you?',
    whatsapp_product_inquiry: 'I want to inquire about a product',
    whatsapp_order_issue: 'I have an issue with my order',
    whatsapp_support: 'I want to talk to support',
    whatsapp_delivery: 'Delivery inquiry',
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
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations['ar'][key] || key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
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
