// /app/frontend/src/components/RoleSwitcher.js
// مكون تبديل الأدوار للمستخدمين متعددي الأدوار

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCart, Store, UtensilsCrossed, Truck, 
  ChevronDown, Check, Loader2, Shield
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL;

// أيقونات الأدوار
const ROLE_ICONS = {
  buyer: ShoppingCart,
  seller: Store,
  food_seller: UtensilsCrossed,
  delivery: Truck,
  admin: Shield,
  sub_admin: Shield
};

// أسماء الأدوار
const ROLE_NAMES = {
  buyer: 'مشتري',
  seller: 'بائع',
  food_seller: 'بائع طعام',
  delivery: 'موظف توصيل',
  admin: 'مدير',
  sub_admin: 'مشرف'
};

// ألوان الأدوار
const ROLE_COLORS = {
  buyer: 'bg-blue-500',
  seller: 'bg-orange-500',
  food_seller: 'bg-green-500',
  delivery: 'bg-purple-500',
  admin: 'bg-red-500',
  sub_admin: 'bg-red-400'
};

const RoleSwitcher = ({ compact = false }) => {
  const { user, token, updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [roleStatus, setRoleStatus] = useState({});
  const dropdownRef = useRef(null);
  
  // جلب الأدوار عند التحميل
  useEffect(() => {
    if (user && token) {
      fetchRoles();
    }
  }, [user, token]);
  
  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API}/api/auth/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoles(res.data.roles || [user?.user_type || 'buyer']);
      setRoleStatus(res.data.role_status || {});
    } catch (error) {
      console.error('Error fetching roles:', error);
      // استخدام البيانات من المستخدم الحالي
      setRoles(user?.roles || [user?.user_type || 'buyer']);
      setRoleStatus(user?.role_status || {});
    }
  };
  
  const switchRole = async (newRole) => {
    if (newRole === user?.user_type || newRole === user?.active_role) {
      setIsOpen(false);
      return;
    }
    
    // التحقق من حالة الدور
    const status = roleStatus[newRole]?.status;
    if (status === 'pending') {
      toast({
        title: "في انتظار الموافقة",
        description: "هذا الدور في انتظار موافقة الإدارة",
        variant: "warning"
      });
      setIsOpen(false);
      return;
    }
    
    if (status === 'rejected') {
      toast({
        title: "تم رفض الطلب",
        description: "يرجى إعادة رفع الوثائق المطلوبة",
        variant: "destructive"
      });
      setIsOpen(false);
      return;
    }
    
    if (status === 'not_submitted' && newRole !== 'buyer') {
      toast({
        title: "الوثائق مطلوبة",
        description: "يرجى رفع الوثائق أولاً",
        variant: "warning"
      });
      // توجيه لصفحة الوثائق
      if (newRole === 'delivery') {
        navigate('/delivery/documents');
      } else {
        navigate('/seller/documents');
      }
      setIsOpen(false);
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/roles/switch`, 
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // تحديث التوكن والمستخدم
      if (res.data.access_token) {
        localStorage.setItem('token', res.data.access_token);
        if (res.data.refresh_token) {
          localStorage.setItem('refresh_token', res.data.refresh_token);
        }
      }
      
      // تحديث بيانات المستخدم في Context
      if (updateUser) {
        updateUser({
          ...user,
          user_type: newRole,
          active_role: newRole
        });
      }
      
      toast({
        title: "تم التبديل",
        description: `تم التبديل إلى ${ROLE_NAMES[newRole]}`,
      });
      
      // إعادة تحميل الصفحة للتوجيه الصحيح
      window.location.href = res.data.redirect_to || '/';
      
    } catch (error) {
      console.error('Error switching role:', error);
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في تبديل الدور",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };
  
  // إذا كان المستخدم لديه دور واحد فقط، لا نعرض المبدّل
  if (!user || roles.length <= 1) {
    return null;
  }
  
  const activeRole = user?.active_role || user?.user_type || 'buyer';
  const ActiveIcon = ROLE_ICONS[activeRole] || ShoppingCart;
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* الزر الرئيسي */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
          compact 
            ? 'bg-white/10 hover:bg-white/20 text-white' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
        }`}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <div className={`w-6 h-6 rounded-full ${ROLE_COLORS[activeRole]} flex items-center justify-center`}>
            <ActiveIcon size={14} className="text-white" />
          </div>
        )}
        <span className="text-sm font-medium">{ROLE_NAMES[activeRole]}</span>
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* قائمة الأدوار */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50 min-w-[180px]"
          >
            <div className="p-2">
              <p className="text-xs text-gray-500 px-2 mb-2">التبديل بين الأدوار</p>
              
              {roles.map((role) => {
                const Icon = ROLE_ICONS[role] || ShoppingCart;
                const isActive = role === activeRole;
                const status = roleStatus[role]?.status;
                const canSwitch = role === 'buyer' || status === 'approved' || status === 'active';
                
                return (
                  <button
                    key={role}
                    onClick={() => switchRole(role)}
                    disabled={isActive || loading}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-[#FF6B00]/10 text-[#FF6B00]' 
                        : canSwitch
                          ? 'hover:bg-gray-100 text-gray-700'
                          : 'opacity-50 cursor-not-allowed text-gray-400'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${ROLE_COLORS[role]} flex items-center justify-center`}>
                      <Icon size={16} className="text-white" />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-sm font-medium">{ROLE_NAMES[role]}</p>
                      {!canSwitch && role !== 'buyer' && (
                        <p className="text-[10px] text-gray-400">
                          {status === 'pending' ? 'في الانتظار' : 
                           status === 'rejected' ? 'مرفوض' : 'غير مكتمل'}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <Check size={16} className="text-[#FF6B00]" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoleSwitcher;
