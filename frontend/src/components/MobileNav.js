import { useState, useCallback, useEffect, memo } from 'react';
import logger from '../lib/logger';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, Grid3X3, ShoppingCart, User, Heart, Package, MessageCircle, Settings, LogOut, Store, X, UtensilsCrossed, Gift, ShoppingBag, Wallet, ClipboardList, BarChart3, Users, Trophy, DollarSign, UserX, Truck, Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFoodCart } from '../context/FoodCartContext';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useModalBackHandler } from '../hooks/useBackButton';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const MobileNav = memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, token, updateUser } = useAuth();
  const { cartCount } = useCart();
  const { totalItems: foodCartCount, stores: foodStores } = useFoodCart();
  const { isFeatureEnabled } = useSettings();
  const { toast } = useToast();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [roleStatus, setRoleStatus] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(false);

  // دالة إغلاق القائمة مع useCallback لتجنب إعادة الإنشاء
  const closeAccountMenu = useCallback(() => {
    setShowAccountMenu(false);
  }, []);

  // ✅ تسجيل القائمة مع زر الرجوع في Android
  useModalBackHandler(showAccountMenu, closeAccountMenu);

  // جلب أدوار المستخدم عند فتح القائمة
  useEffect(() => {
    if (showAccountMenu && user && token) {
      fetchUserRoles();
    }
  }, [showAccountMenu, user, token]);

  const fetchUserRoles = async () => {
    try {
      setLoadingRoles(true);
      const res = await axios.get(`${API}/api/auth/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserRoles(res.data.roles || [user?.user_type || 'buyer']);
      setRoleStatus(res.data.role_status || {});
    } catch (error) {
      logger.error('Error fetching roles:', error);
      setUserRoles(user?.roles || [user?.user_type || 'buyer']);
    } finally {
      setLoadingRoles(false);
    }
  };

  // إضافة دور جديد
  const addNewRole = async (role) => {
    try {
      const res = await axios.post(`${API}/api/auth/roles/add`, 
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: "تم بنجاح",
        description: res.data.message,
      });
      
      setShowAccountMenu(false);
      navigate(res.data.redirect_to);
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في إضافة الدور",
        variant: "destructive"
      });
    }
  };

  // تبديل الدور النشط
  const switchRole = async (role) => {
    if (role === user?.user_type) return;
    
    const status = roleStatus[role]?.status;
    if (status !== 'approved' && status !== 'active' && role !== 'buyer') {
      if (status === 'pending') {
        toast({ title: "في الانتظار", description: "طلبك قيد المراجعة", variant: "warning" });
      } else if (status === 'rejected') {
        toast({ title: "مرفوض", description: "يرجى إعادة رفع الوثائق", variant: "destructive" });
      } else {
        setShowAccountMenu(false);
        navigate(role === 'delivery' ? '/delivery/documents' : '/seller/documents');
      }
      return;
    }
    
    try {
      const res = await axios.post(`${API}/api/auth/roles/switch`, 
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.access_token) {
        localStorage.setItem('token', res.data.access_token);
      }
      
      toast({ title: "تم التبديل", description: `تم التبديل إلى ${getRoleName(role)}` });
      window.location.href = res.data.redirect_to || '/';
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في التبديل",
        variant: "destructive"
      });
    }
  };

  const getRoleName = (role) => {
    const names = { buyer: 'مشتري', seller: 'بائع', food_seller: 'بائع طعام', delivery: 'موظف توصيل' };
    return names[role] || role;
  };

  const canAddRole = (role) => {
    if (userRoles.includes(role)) return false;
    if (role === 'seller' && userRoles.includes('food_seller')) return false;
    if (role === 'food_seller' && userRoles.includes('seller')) return false;
    return true;
  };

  const isActive = (path) => location.pathname === path;
  
  // إخفاء الشريط في صفحة تفاصيل المنتج
  const isProductPage = location.pathname.startsWith('/products/');
  if (isProductPage) return null;
  
  // إخفاء الشريط في صفحة المحادثة
  const isChatPage = location.pathname.startsWith('/chat/');
  if (isChatPage) return null;

  // التحقق من تفعيل منصة الطعام
  const foodEnabled = isFeatureEnabled('food_enabled');
  
  // هل نحن في صفحات الطعام؟
  // يجب أن يكون المستخدم في مسار /food وقد فعّل الموقع (دخل فعلياً لصفحة الطعام)
  const isOnFoodPath = location.pathname.startsWith('/food');
  const hasActivatedFoodLocation = typeof window !== 'undefined' && localStorage.getItem('food_gps_granted') === 'true';
  
  // قسم الطعام يكون نشطاً فقط إذا:
  // 1. المستخدم في مسار /food
  // 2. وقد فعّل الموقع (دخل فعلياً لصفحة الطعام)
  // أو إذا كان في صفحات السلة/الطلب الخاصة بالطعام
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
  
  // إخفاء شريط التنقل السفلي للمدير في لوحة التحكم
  if (isAdminPage) return null;
  
  // إخفاء الشريط السفلي لبائع الطعام في لوحة تحكم المطعم (لديه شريط خاص به)
  const isFoodStoreDashboard = location.pathname === '/food/dashboard';
  if (isFoodStoreDashboard && user?.user_type === 'food_seller') return null;
  
  // إخفاء الشريط السفلي لبائع المنتجات في لوحة تحكمه (لديه شريط خاص به)
  const isSellerDashboard = location.pathname === '/seller/dashboard';
  if (isSellerDashboard && user?.user_type === 'seller') return null;

  // تحديد رابط سلة الطعام بذكاء
  const getFoodCartPath = () => {
    if (foodStores.length === 0) {
      return '/food/my-cart'; // سلة فارغة
    } else if (foodStores.length === 1) {
      // متجر واحد فقط → مباشرة لصفحة إكمال الطلب
      return `/food/cart/${foodStores[0].storeId}`;
    } else {
      // متاجر متعددة → الصفحة المجمعة
      return '/food/my-cart';
    }
  };

  const handleAccountClick = (e) => {
    if (user) {
      e.preventDefault();
      setShowAccountMenu(true);
    }
  };

  const handleLogout = () => {
    logout();
    setShowAccountMenu(false);
    navigate('/');
  };

  // بناء قائمة التنقل حسب القسم الحالي
  let navItems = [];
  
  // شريط خاص بالبائع في جميع صفحاته
  // تحديد مسار لوحة التحكم حسب نوع البائع
  const sellerDashboardPath = user?.user_type === 'food_seller' ? '/food/dashboard' : '/seller/dashboard';
  const productsLabel = user?.user_type === 'food_seller' ? 'القائمة' : 'المنتجات';
  
  if (isSellerPage) {
    navItems = [
      { path: `${sellerDashboardPath}?tab=overview`, icon: Home, label: 'نظرة عامة' },
      { path: `${sellerDashboardPath}?tab=products`, icon: Package, label: productsLabel },
      { path: `${sellerDashboardPath}?tab=wallet`, icon: Wallet, label: 'المحفظة' },
      { path: `${sellerDashboardPath}?tab=settings`, icon: Settings, label: 'الإعدادات' }
    ];
  } else if (isDeliveryPage) {
    // شريط خاص بموظف التوصيل في جميع صفحاته
    navItems = [
      { path: '/delivery/dashboard', icon: Home, label: 'الرئيسية' },
      { path: '/delivery/dashboard?tab=earnings', icon: DollarSign, label: 'الأرباح' },
      { path: '/delivery/dashboard?tab=achievements', icon: Trophy, label: 'إنجازاتي' },
      { path: '/settings', icon: Settings, label: 'الإعدادات' }
    ];
  } else if (isInFoodSection && foodEnabled) {
    // في قسم الطعام: نعرض جميع الأيقونات مع سلة الطعام
    navItems = [
      { path: '/', icon: Home, label: 'الرئيسية' },
      { path: '/categories', icon: Grid3X3, label: 'الأصناف' },
      { path: '/food', icon: UtensilsCrossed, label: 'طعام', isFood: true },
      { path: getFoodCartPath(), icon: ShoppingBag, label: 'السلة', badge: foodCartCount, isFoodCart: true },
      { path: user ? '#' : '/login', icon: User, label: user ? 'حسابي' : 'دخول', isAccount: true }
    ];
  } else {
    // في باقي الصفحات: نعرض السلة العادية
    navItems = [
      { path: '/', icon: Home, label: 'الرئيسية' },
      { path: '/categories', icon: Grid3X3, label: 'الأصناف' },
    ];
    
    // إضافة رابط الطعام فقط إذا كان مفعلاً
    if (foodEnabled) {
      navItems.push({ path: '/food', icon: UtensilsCrossed, label: 'طعام', isFood: true });
    }
    
    navItems.push(
      { path: '/cart', icon: ShoppingCart, label: 'السلة', badge: cartCount },
      { path: user ? '#' : '/login', icon: User, label: user ? 'حسابي' : 'دخول', isAccount: true }
    );
  }

  // ألوان مميزة لكل أيقونة
  const getIconColor = (item, isItemActive) => {
    if (isItemActive) {
      // الأيقونة النشطة: لون كامل
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
      // الأيقونات غير النشطة: لون باهت
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

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg rounded-t-2xl pb-safe">
        <div className="flex items-center justify-around h-16 pb-2 px-2">
          {navItems.map((item, index) => {
            const isItemActive = isActive(item.path) || (item.isAccount && showAccountMenu);
            const iconColor = getIconColor(item, isItemActive);
            
            return (
              <Link
                key={`${item.path}-${index}`}
                to={item.path}
                onClick={item.isAccount ? handleAccountClick : undefined}
                className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[60px] flex-1 transition-all duration-200 ${
                  isItemActive ? 'scale-110' : 'scale-100'
                }`}
                data-testid={`nav-${item.label}`}
              >
                <div className={`relative ${iconColor}`}>
                  {item.isFood ? (
                    <UtensilsCrossed size={22} strokeWidth={isItemActive ? 2.5 : 2} />
                  ) : item.isFoodCart ? (
                    <ShoppingBag size={22} strokeWidth={isItemActive ? 2.5 : 2} />
                  ) : (
                    <item.icon size={22} strokeWidth={isItemActive ? 2.5 : 2} />
                  )}
                  {item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-medium whitespace-nowrap ${isItemActive ? iconColor : 'text-gray-500'}`}>
                  {item.label}
                </span>
                {isItemActive && (
                  <div className={`absolute bottom-1 w-1 h-1 rounded-full ${iconColor.replace('text-', 'bg-')}`} />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Account Menu Modal */}
      <AnimatePresence>
        {showAccountMenu && user && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAccountMenu(false)}
              className="fixed inset-0 bg-black/50 z-[60]"
            />
            
            {/* Menu */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] max-h-[80vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900">{user.name}</h3>
                  <p className="text-xs text-gray-500">{user.phone}</p>
                </div>
                <button
                  onClick={() => setShowAccountMenu(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Menu Items */}
              <div className="p-4 space-y-2">
                {/* طلباتي - مخفية لموظفي التوصيل */}
                {user?.user_type !== 'delivery' && (
                  <Link
                    to="/orders"
                    onClick={() => setShowAccountMenu(false)}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-full flex items-center justify-center">
                      <Package size={20} className="text-[#FF6B00]" />
                    </div>
                    <span className="font-medium text-gray-900">طلباتي</span>
                  </Link>
                )}

                <Link
                  to="/messages"
                  onClick={() => setShowAccountMenu(false)}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                    <MessageCircle size={20} className="text-blue-500" />
                  </div>
                  <span className="font-medium text-gray-900">الرسائل</span>
                </Link>

                <Link
                  to="/gifts"
                  onClick={() => setShowAccountMenu(false)}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                  data-testid="gifts-menu-link"
                >
                  <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center">
                    <Gift size={20} className="text-pink-500" />
                  </div>
                  <span className="font-medium text-gray-900">هداياي</span>
                </Link>

                {/* المحفظة - متاحة لجميع المستخدمين */}
                <Link
                  to="/my-wallet"
                  onClick={() => setShowAccountMenu(false)}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                  data-testid="buyer-wallet-menu-link"
                >
                  <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center">
                    <Wallet size={20} className="text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">محفظتي</span>
                    <p className="text-xs text-orange-600">اشحن واستخدم للدفع</p>
                  </div>
                </Link>

                <Link
                  to="/referrals"
                  onClick={() => setShowAccountMenu(false)}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                  data-testid="referrals-menu-link"
                >
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                    <Users size={20} className="text-green-500" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">ادعُ صديقاً</span>
                    <p className="text-xs text-green-600">اكسب 10,000 ل.س</p>
                  </div>
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setShowAccountMenu(false)}
                  className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Settings size={20} className="text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">الإعدادات</span>
                </Link>

                {/* 🆕 قسم الأدوار المتعددة */}
                {userRoles.length > 1 && (
                  <div className="pt-3 mt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 px-3 mb-2">التبديل بين الأدوار</p>
                    {userRoles.map((role) => {
                      const isActive = role === user?.user_type;
                      const status = roleStatus[role]?.status;
                      const canSwitch = role === 'buyer' || status === 'approved' || status === 'active';
                      const icons = { buyer: ShoppingCart, seller: Store, food_seller: UtensilsCrossed, delivery: Truck };
                      const colors = { buyer: 'bg-blue-50 text-blue-500', seller: 'bg-orange-50 text-orange-500', food_seller: 'bg-green-50 text-green-500', delivery: 'bg-purple-50 text-purple-500' };
                      const Icon = icons[role] || ShoppingCart;
                      
                      return (
                        <button
                          key={role}
                          onClick={() => switchRole(role)}
                          disabled={isActive}
                          className={`w-full flex items-center gap-4 p-3 rounded-xl transition-colors ${
                            isActive ? 'bg-[#FF6B00]/10' : canSwitch ? 'hover:bg-gray-50' : 'opacity-50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors[role]}`}>
                            <Icon size={20} />
                          </div>
                          <div className="flex-1 text-right">
                            <span className={`font-medium ${isActive ? 'text-[#FF6B00]' : 'text-gray-900'}`}>
                              {getRoleName(role)}
                            </span>
                            {!canSwitch && status && (
                              <p className="text-[10px] text-gray-400">
                                {status === 'pending' ? 'في الانتظار' : status === 'rejected' ? 'مرفوض' : 'غير مكتمل'}
                              </p>
                            )}
                          </div>
                          {isActive && <div className="w-2 h-2 bg-[#FF6B00] rounded-full" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 🆕 أزرار إضافة دور جديد */}
                {user?.user_type === 'buyer' && (
                  <div className="pt-3 mt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 px-3 mb-2">انضم كـ</p>
                    
                    {canAddRole('seller') && (
                      <button
                        onClick={() => addNewRole('seller')}
                        className="w-full flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition-colors"
                      >
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Store size={20} className="text-orange-500" />
                        </div>
                        <div className="flex-1 text-right">
                          <span className="font-medium text-gray-900">أصبح بائعاً</span>
                          <p className="text-[10px] text-gray-500">ابدأ ببيع منتجاتك</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                      </button>
                    )}
                    
                    {canAddRole('delivery') && (
                      <button
                        onClick={() => addNewRole('delivery')}
                        className="w-full flex items-center gap-4 p-3 hover:bg-purple-50 rounded-xl transition-colors"
                      >
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Truck size={20} className="text-purple-500" />
                        </div>
                        <div className="flex-1 text-right">
                          <span className="font-medium text-gray-900">أصبح موظف توصيل</span>
                          <p className="text-[10px] text-gray-500">اكسب من التوصيل</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                      </button>
                    )}
                  </div>
                )}

                {user.user_type === 'seller' && (
                  <Link
                    to="/seller/dashboard"
                    onClick={() => setShowAccountMenu(false)}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
                      <Store size={20} className="text-purple-500" />
                    </div>
                    <span className="font-medium text-gray-900">لوحة البائع</span>
                  </Link>
                )}

                {user.user_type === 'food_seller' && (
                  <Link
                    to="/food/dashboard"
                    onClick={() => setShowAccountMenu(false)}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                    data-testid="food-seller-dashboard-link"
                  >
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                      <Store size={20} className="text-green-500" />
                    </div>
                    <span className="font-medium text-gray-900">لوحة المتجر</span>
                  </Link>
                )}

                {(user.user_type === 'admin' || user.user_type === 'sub_admin') && (
                  <Link
                    to="/admin"
                    onClick={() => setShowAccountMenu(false)}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                      <Settings size={20} className="text-green-500" />
                    </div>
                    <span className="font-medium text-gray-900">لوحة التحكم</span>
                  </Link>
                )}

                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <Link
                    to="/delete-account"
                    onClick={() => setShowAccountMenu(false)}
                    className="w-full flex items-center gap-4 p-3 hover:bg-red-50 rounded-xl transition-colors"
                    data-testid="delete-account-link"
                  >
                    <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                      <UserX size={20} className="text-red-400" />
                    </div>
                    <span className="font-medium text-red-400">حذف الحساب</span>
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 p-3 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                      <LogOut size={20} className="text-red-500" />
                    </div>
                    <span className="font-medium text-red-500">تسجيل الخروج</span>
                  </button>
                </div>
              </div>

              {/* Safe area padding */}
              <div className="h-6" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
});

MobileNav.displayName = 'MobileNav';

export default MobileNav;
