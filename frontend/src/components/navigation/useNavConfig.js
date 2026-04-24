// /app/frontend/src/components/navigation/useNavConfig.js
// Hook لإعداد التنقل - مستخرج من MobileNav.js

import { useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { 
  Home, Grid3X3, ShoppingCart, User, Settings, 
  UtensilsCrossed, ShoppingBag, Package, DollarSign, 
  Trophy, Wallet 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useFoodCart } from '../../context/FoodCartContext';
import { useSettings } from '../../context/SettingsContext';

export const useNavConfig = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { cartCount } = useCart();
  const { totalItems: foodCartCount, stores: foodStores } = useFoodCart();
  const { isFeatureEnabled } = useSettings();

  // التحقق من تفعيل منصة الطعام
  const foodEnabled = isFeatureEnabled('food_enabled');
  
  // هل نحن في صفحات الطعام؟
  const isOnFoodPath = location.pathname.startsWith('/food');
  const hasActivatedFoodLocation = typeof window !== 'undefined' && localStorage.getItem('food_gps_granted') === 'true';
  
  const isFoodCartOrCheckout = location.pathname.startsWith('/food/cart') || 
                                location.pathname.startsWith('/food/my-cart') || 
                                location.pathname.startsWith('/food/checkout') ||
                                location.pathname.startsWith('/food/batch-checkout');
  const isInFoodSection = isOnFoodPath && (hasActivatedFoodLocation || isFoodCartOrCheckout);
  
  // هل يتصفح كعميل؟
  const isViewingAsCustomer = searchParams.get('view') === 'customer';
  
  // هل البائع في أي صفحة من صفحاته؟
  const isSellerPage = (user?.user_type === 'seller' || user?.user_type === 'food_seller') && user?.is_approved && !isViewingAsCustomer;
  
  // هل موظف التوصيل في أي صفحة من صفحاته؟
  const isDeliveryPage = user?.user_type === 'delivery' && user?.is_approved && !isViewingAsCustomer;
  
  // هل المدير في صفحات الإدارة؟
  const isAdminPage = (user?.user_type === 'admin' || user?.user_type === 'sub_admin') && location.pathname.startsWith('/admin');

  // تحديد مسار لوحة التحكم حسب نوع البائع
  const sellerDashboardPath = user?.user_type === 'food_seller' ? '/food/dashboard' : '/seller/dashboard';
  const productsLabel = user?.user_type === 'food_seller' ? 'القائمة' : 'المنتجات';

  // تحديد رابط سلة الطعام بذكاء
  const getFoodCartPath = () => {
    if (foodStores.length === 0) {
      return '/food/my-cart';
    } else if (foodStores.length === 1) {
      return `/food/cart/${foodStores[0].storeId}`;
    } else {
      return '/food/my-cart';
    }
  };

  // بناء قائمة التنقل حسب القسم الحالي
  const navItems = useMemo(() => {
    // شريط خاص بالبائع
    if (isSellerPage) {
      return [
        { path: `${sellerDashboardPath}?tab=overview`, icon: Home, label: 'نظرة عامة' },
        { path: `${sellerDashboardPath}?tab=products`, icon: Package, label: productsLabel },
        { path: `${sellerDashboardPath}?tab=wallet`, icon: Wallet, label: 'المحفظة' },
        { path: `${sellerDashboardPath}?tab=settings`, icon: Settings, label: 'الإعدادات' }
      ];
    }
    
    // شريط خاص بموظف التوصيل
    if (isDeliveryPage) {
      return [
        { path: '/delivery/dashboard', icon: Home, label: 'الرئيسية' },
        { path: '/delivery/dashboard?tab=earnings', icon: DollarSign, label: 'الأرباح' },
        { path: '/delivery/dashboard?tab=achievements', icon: Trophy, label: 'إنجازاتي' },
        { path: '/settings', icon: Settings, label: 'الإعدادات' }
      ];
    }
    
    // في قسم الطعام
    if (isInFoodSection && foodEnabled) {
      return [
        { path: '/', icon: Home, label: 'الرئيسية' },
        { path: '/categories', icon: Grid3X3, label: 'الأصناف' },
        { path: '/food', icon: UtensilsCrossed, label: 'طعام', isFood: true },
        { path: getFoodCartPath(), icon: ShoppingBag, label: 'السلة', badge: foodCartCount, isFoodCart: true },
        { path: user ? '#' : '/login', icon: User, label: user ? 'حسابي' : 'دخول', isAccount: true }
      ];
    }
    
    // في باقي الصفحات
    const items = [
      { path: '/', icon: Home, label: 'الرئيسية' },
      { path: '/categories', icon: Grid3X3, label: 'الأصناف' },
    ];
    
    if (foodEnabled) {
      items.push({ path: '/food', icon: UtensilsCrossed, label: 'طعام', isFood: true });
    }
    
    items.push(
      { path: '/cart', icon: ShoppingCart, label: 'السلة', badge: cartCount },
      { path: user ? '#' : '/login', icon: User, label: user ? 'حسابي' : 'دخول', isAccount: true }
    );
    
    return items;
  }, [isSellerPage, isDeliveryPage, isInFoodSection, foodEnabled, user, cartCount, foodCartCount, sellerDashboardPath, productsLabel, foodStores.length]);

  // صفحات يجب إخفاء الشريط فيها
  const shouldHideNav = useMemo(() => {
    const isProductPage = location.pathname.startsWith('/products/');
    const isChatPage = location.pathname.startsWith('/chat/');
    const isFoodStoreDashboard = location.pathname === '/food/dashboard' && user?.user_type === 'food_seller';
    const isSellerDashboard = location.pathname === '/seller/dashboard' && user?.user_type === 'seller';
    
    // إخفاء الشريط في صفحات التسجيل والانضمام
    const isJoinPage = location.pathname.startsWith('/join/');
    const isSellerDocumentsPage = location.pathname.startsWith('/seller/documents') || 
                                   location.pathname.startsWith('/seller/pending');
    const isDeliveryDocumentsPage = location.pathname.startsWith('/delivery/documents') || 
                                     location.pathname.startsWith('/delivery/pending');
    const isRegisterPage = location.pathname === '/register';

    return isProductPage || isChatPage || isAdminPage || isFoodStoreDashboard || isSellerDashboard || 
           isJoinPage || isSellerDocumentsPage || isDeliveryDocumentsPage || isRegisterPage;
  }, [location.pathname, isAdminPage, user?.user_type]);

  // ألوان مميزة لكل أيقونة
  const getIconColor = (item, isItemActive) => {
    if (isItemActive) {
      if (item.label === 'الرئيسية' || item.label === 'نظرة عامة') return 'text-blue-500';
      if (item.label === 'الأصناف') return 'text-purple-500';
      if (item.label === 'طعام') return 'text-green-500';
      if (item.label === 'السلة') return 'text-[#FF6B00]';
      if (item.label === 'حسابي' || item.label === 'دخول') return 'text-pink-500';
      if (item.label === 'المنتجات' || item.label === 'القائمة') return 'text-indigo-500';
      if (item.label === 'المحفظة') return 'text-emerald-500';
      if (item.label === 'الإعدادات') return 'text-gray-600';
      if (item.label === 'الأرباح') return 'text-yellow-500';
      if (item.label === 'إنجازاتي') return 'text-amber-500';
      return 'text-[#FF6B00]';
    } else {
      if (item.label === 'الرئيسية' || item.label === 'نظرة عامة') return 'text-blue-300';
      if (item.label === 'الأصناف') return 'text-purple-300';
      if (item.label === 'طعام') return 'text-green-300';
      if (item.label === 'السلة') return 'text-orange-300';
      if (item.label === 'حسابي' || item.label === 'دخول') return 'text-pink-300';
      if (item.label === 'المنتجات' || item.label === 'القائمة') return 'text-indigo-300';
      if (item.label === 'المحفظة') return 'text-emerald-300';
      if (item.label === 'الإعدادات') return 'text-gray-400';
      if (item.label === 'الأرباح') return 'text-yellow-300';
      if (item.label === 'إنجازاتي') return 'text-amber-300';
      return 'text-gray-400';
    }
  };

  const isActive = (path) => location.pathname === path;

  return {
    navItems,
    shouldHideNav,
    getIconColor,
    isActive,
    user
  };
};

export default useNavConfig;
