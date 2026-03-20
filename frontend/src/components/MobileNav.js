import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, Grid3X3, ShoppingCart, User, Heart, Package, MessageCircle, Settings, LogOut, Store, X, UtensilsCrossed, Gift, ShoppingBag, Wallet, ClipboardList, BarChart3, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useFoodCart } from '../context/FoodCartContext';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';

const MobileNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { totalItems: foodCartCount, stores: foodStores } = useFoodCart();
  const { isFeatureEnabled } = useSettings();
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const isActive = (path) => location.pathname === path;
  
  // إخفاء الشريط في صفحة تفاصيل المنتج
  const isProductPage = location.pathname.startsWith('/products/');
  if (isProductPage) return null;

  // التحقق من تفعيل منصة الطعام
  const foodEnabled = isFeatureEnabled('food_enabled');
  
  // هل نحن في صفحات الطعام؟
  const isInFoodSection = location.pathname.startsWith('/food');
  
  // هل يتصفح كعميل؟
  const isViewingAsCustomer = searchParams.get('view') === 'customer';
  
  // هل البائع في أي صفحة من صفحاته؟
  const isSellerPage = (user?.user_type === 'seller' || user?.user_type === 'food_seller') && user?.is_approved && !isViewingAsCustomer;
  
  // هل موظف التوصيل في أي صفحة من صفحاته؟
  const isDeliveryPage = user?.user_type === 'delivery' && user?.is_approved && !isViewingAsCustomer;

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
      { path: '/delivery/orders', icon: ClipboardList, label: 'الطلبات' },
      { path: '/wallet', icon: Wallet, label: 'المحفظة' },
      { path: '/settings', icon: Settings, label: 'الإعدادات' }
    ];
  } else if (isInFoodSection && foodEnabled) {
    // في قسم الطعام: نعرض سلة الطعام فقط
    navItems = [
      { path: '/', icon: Home, label: 'الرئيسية' },
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

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom shadow-lg">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={item.isAccount ? handleAccountClick : undefined}
              className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[50px] transition-colors ${
                isActive(item.path) || (item.isAccount && showAccountMenu) 
                  ? 'text-[#FF6B00]' 
                  : (item.isFood || item.isFoodCart)
                    ? 'text-[#FF6B00] hover:text-[#E65000]'
                    : (item.isAccount && !user)
                      ? 'text-[#FF6B00] font-bold'
                      : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid={`nav-${item.label}`}
            >
              <div className="relative">
                {item.isFood ? (
                  <UtensilsCrossed size={20} />
                ) : item.isFoodCart ? (
                  <ShoppingBag size={20} />
                ) : (
                  <item.icon size={20} />
                )}
                {item.badge > 0 && (
                  <span className={`absolute -top-2 -right-2 w-4 h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center ${
                    item.isFoodCart ? 'bg-[#FF6B00]' : 'bg-[#FF6B00]'
                  }`}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px]">{item.label}</span>
            </Link>
          ))}
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

                {user.user_type === 'buyer' && (
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
                )}

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

                <div className="pt-2 border-t border-gray-100">
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
};

export default MobileNav;
