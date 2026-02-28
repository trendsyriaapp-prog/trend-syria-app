import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Search, User, Menu, X, Home, Grid3X3, 
  MessageCircle, Package, LogOut, Settings, Store, Bell, Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // التحقق إذا كنا في صفحة المنتج
  const isProductPage = location.pathname.startsWith('/products/');

  // جلب الإشعارات
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API}/notifications`);
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(`${API}/notifications/read-all`);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setShowNotifications(false);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  // دالة المشاركة
  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'تريند سورية',
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "تم النسخ",
        description: "تم نسخ الرابط"
      });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-2">
        {/* الصف الأول: الشعار + البحث + الأيقونات */}
        <div className="flex items-center gap-3">
          {/* Share/Notifications - على اليسار */}
          {isProductPage ? (
            <button 
              onClick={handleShare}
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700 flex-shrink-0"
              data-testid="share-icon"
            >
              <Share2 size={22} />
            </button>
          ) : (
            <button 
              onClick={() => user ? setShowNotifications(!showNotifications) : navigate('/login')}
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700 flex-shrink-0"
              data-testid="notifications-icon"
            >
              <Bell size={22} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* Search Bar - مدمج في الشريط */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتجات..."
                className="w-full bg-gray-100 border border-gray-200 rounded-full py-2.5 px-4 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                data-testid="search-input"
              />
              <button 
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF6B00] transition-colors"
                data-testid="search-btn"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          {/* Home Button - على اليمين */}
          <Link to="/" className="flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#FF6B00] flex items-center justify-center">
              <Home size={18} className="text-white" />
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications Modal */}
            {!isProductPage && (
              <AnimatePresence>
                  {showNotifications && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/20 z-[100]" 
                        onClick={() => setShowNotifications(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-14 right-4 left-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-[101]"
                        style={{ maxHeight: 'calc(100vh - 80px)' }}
                      >
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                          <h3 className="font-bold text-sm text-gray-900">الإشعارات</h3>
                          {unreadCount > 0 && (
                            <button 
                              onClick={markAllAsRead}
                              className="text-[10px] text-[#FF6B00] font-bold hover:underline"
                            >
                              قراءة الكل
                            </button>
                          )}
                        </div>
                        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 150px)' }}>
                          {notifications.length === 0 ? (
                            <div className="p-6 text-center">
                              <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                              <p className="text-gray-500 text-xs">لا توجد إشعارات</p>
                            </div>
                          ) : (
                            notifications.map((notification) => (
                              <div
                                key={notification.id}
                                onClick={() => !notification.is_read && markAsRead(notification.id)}
                                className={`p-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                                  !notification.is_read ? 'bg-[#FF6B00]/5' : ''
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                    !notification.is_read ? 'bg-[#FF6B00]' : 'bg-transparent'
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-xs text-gray-900">{notification.title}</h4>
                                    <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
                                    <p className="text-[9px] text-gray-400 mt-1">
                                      {new Date(notification.created_at).toLocaleDateString('ar-SY', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
            )}

            {/* User Name only (menu moved to bottom nav) */}
            {user && (
              <span className="text-sm font-bold text-gray-900 truncate max-w-[80px]">{user.name}</span>
            )}
            
            {!user && (
              <Link 
                to="/login"
                className="bg-[#FF6B00] text-white font-bold px-3 py-1.5 rounded-full hover:bg-[#E65000] transition-colors text-sm"
                data-testid="login-btn"
              >
                دخول
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu - Hidden on mobile, menu is in bottom nav */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:block bg-white border-t border-gray-100 p-4"
        >
          <nav className="flex flex-col gap-2">
            <Link to="/" className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-gray-700" onClick={() => setIsMenuOpen(false)}>
              <Home size={20} />
              <span>الرئيسية</span>
            </Link>
            <Link to="/categories" className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-gray-700" onClick={() => setIsMenuOpen(false)}>
              <Grid3X3 size={20} />
              <span>الأصناف</span>
            </Link>
            {!user && (
              <>
                <Link to="/login" className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-gray-700" onClick={() => setIsMenuOpen(false)}>
                  <User size={20} />
                  <span>تسجيل الدخول</span>
                </Link>
                <Link to="/register" className="flex items-center gap-3 p-3 bg-[#FF6B00] text-white rounded-lg font-bold" onClick={() => setIsMenuOpen(false)}>
                  إنشاء حساب جديد
                </Link>
              </>
            )}
          </nav>
        </motion.div>
      )}
    </header>
  );
};

export default Header;
