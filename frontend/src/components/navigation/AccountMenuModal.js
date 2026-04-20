// /app/frontend/src/components/navigation/AccountMenuModal.js
// قائمة الحساب المنبثقة - مستخرجة من MobileNav.js

import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, MessageCircle, Settings, LogOut, Store, X, 
  UtensilsCrossed, Gift, Wallet, Users, UserX, Truck, 
  ShoppingCart, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AccountMenuModal = ({
  user,
  showAccountMenu,
  setShowAccountMenu,
  userRoles,
  roleStatus,
  switchRole,
  addNewRole,
  canAddRole,
  getRoleName,
  handleLogout
}) => {
  const navigate = useNavigate();

  const closeAndNavigate = (path) => {
    setShowAccountMenu(false);
    if (path) navigate(path);
  };

  if (!showAccountMenu || !user) return null;

  return (
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

              {/* قسم الأدوار المتعددة */}
              <RoleSwitcher 
                userRoles={userRoles}
                user={user}
                roleStatus={roleStatus}
                switchRole={switchRole}
                getRoleName={getRoleName}
              />

              {/* أزرار إضافة دور جديد */}
              <AddRoleButtons 
                user={user}
                canAddRole={canAddRole}
                addNewRole={addNewRole}
              />

              {/* روابط لوحات التحكم */}
              <DashboardLinks 
                user={user}
                setShowAccountMenu={setShowAccountMenu}
              />

              {/* تسجيل الخروج وحذف الحساب */}
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
  );
};

// مكون التبديل بين الأدوار
const RoleSwitcher = ({ userRoles, user, roleStatus, switchRole, getRoleName }) => {
  if (userRoles.length <= 1) return null;

  const icons = { 
    buyer: ShoppingCart, 
    seller: Store, 
    food_seller: UtensilsCrossed, 
    delivery: Truck 
  };
  
  const colors = { 
    buyer: 'bg-blue-50 text-blue-500', 
    seller: 'bg-orange-50 text-orange-500', 
    food_seller: 'bg-green-50 text-green-500', 
    delivery: 'bg-purple-50 text-purple-500' 
  };

  return (
    <div className="pt-3 mt-3 border-t border-gray-100">
      <p className="text-xs text-gray-500 px-3 mb-2">التبديل بين الأدوار</p>
      {userRoles.map((role) => {
        const isActive = role === user?.user_type;
        const status = roleStatus[role]?.status;
        const canSwitch = role === 'buyer' || status === 'approved' || status === 'active';
        const Icon = icons[role] || ShoppingCart;
        
        return (
          <button
            key={`role-switch-${role}`}
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
  );
};

// مكون أزرار إضافة دور جديد
const AddRoleButtons = ({ user, canAddRole, addNewRole }) => {
  if (user?.user_type !== 'buyer') return null;

  return (
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
  );
};

// مكون روابط لوحات التحكم
const DashboardLinks = ({ user, setShowAccountMenu }) => {
  return (
    <>
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
    </>
  );
};

export default AccountMenuModal;
