// /app/frontend/src/components/MobileNav.js
// شريط التنقل السفلي - تم تقسيمه وتحسينه

import { useState, useCallback, useEffect, memo } from 'react';
import logger from '../lib/logger';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useModalBackHandler } from '../hooks/useBackButton';
import axios from 'axios';
import { useToast } from '../hooks/use-toast';

// المكونات المستخرجة
import AccountMenuModal from './navigation/AccountMenuModal';
import { useNavConfig } from './navigation/useNavConfig';

const API = process.env.REACT_APP_BACKEND_URL;

const MobileNav = memo(() => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const { toast } = useToast();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [roleStatus, setRoleStatus] = useState({});

  // استخدام hook التنقل
  const { navItems, shouldHideNav, getIconColor, isActive } = useNavConfig();

  // دالة إغلاق القائمة
  const closeAccountMenu = useCallback(() => {
    setShowAccountMenu(false);
  }, []);

  // تسجيل القائمة مع زر الرجوع في Android
  useModalBackHandler(showAccountMenu, closeAccountMenu);

  // جلب أدوار المستخدم عند فتح القائمة
  useEffect(() => {
    if (showAccountMenu && user && token) {
      fetchUserRoles();
    }
  }, [showAccountMenu, user, token]);

  const fetchUserRoles = async () => {
    try {
      const res = await axios.get(`${API}/api/auth/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserRoles(res.data.roles || [user?.user_type || 'buyer']);
      setRoleStatus(res.data.role_status || {});
    } catch (error) {
      logger.error('Error fetching roles:', error);
      setUserRoles(user?.roles || [user?.user_type || 'buyer']);
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

  // إخفاء الشريط في صفحات معينة
  if (shouldHideNav) return null;

  return (
    <>
      {/* شريط التنقل السفلي */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg rounded-t-2xl pb-safe">
        <div className="flex items-center justify-around h-16 pb-2 px-2">
          {navItems.map((item) => {
            const isItemActive = isActive(item.path) || (item.isAccount && showAccountMenu);
            const iconColor = getIconColor(item, isItemActive);
            
            return (
              <Link
                key={`nav-${item.label}-${item.path}`}
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

      {/* قائمة الحساب */}
      <AccountMenuModal
        user={user}
        showAccountMenu={showAccountMenu}
        setShowAccountMenu={setShowAccountMenu}
        userRoles={userRoles}
        roleStatus={roleStatus}
        switchRole={switchRole}
        addNewRole={addNewRole}
        canAddRole={canAddRole}
        getRoleName={getRoleName}
        handleLogout={handleLogout}
      />
    </>
  );
});

MobileNav.displayName = 'MobileNav';

export default MobileNav;
