import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, User, Menu, X, Home, Grid3X3, 
  MessageCircle, Package, LogOut, Settings, Store, Mail, Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // التحقق إذا كنا في صفحة المنتج
  const isProductPage = location.pathname.startsWith('/products/');

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
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#FF6B00] flex items-center justify-center">
              <Home size={18} className="text-white" />
            </div>
          </Link>

          {/* Search Bar - مدمج في الشريط */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتجات..."
                className="w-full bg-gray-100 border border-gray-200 rounded-full py-2 px-4 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                data-testid="search-input"
              />
              <button 
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF6B00] transition-colors"
                data-testid="search-btn"
              >
                <Search size={18} />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Messages Icon أو Share Icon حسب الصفحة */}
            {isProductPage ? (
              <button 
                onClick={handleShare}
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
                data-testid="share-icon"
              >
                <Share2 size={22} />
              </button>
            ) : (
              <Link 
                to={user ? "/messages" : "/login"}
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
                data-testid="messages-icon"
              >
                <Mail size={22} />
              </Link>
            )}

            {/* User Menu */}
            {user ? (
              <div className="relative group">
                <button 
                  className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  data-testid="user-menu-btn"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FF6B00] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{user.name[0]}</span>
                  </div>
                </button>
                <div className="absolute left-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="p-3 border-b border-gray-100">
                    <p className="font-bold text-sm text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.phone}</p>
                  </div>
                  <div className="p-2">
                    <Link to="/orders" className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-700" data-testid="my-orders-link">
                      <Package size={18} />
                      <span className="text-sm">طلباتي</span>
                    </Link>
                    <Link to="/messages" className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-700" data-testid="messages-link">
                      <MessageCircle size={18} />
                      <span className="text-sm">الرسائل</span>
                    </Link>
                    <Link to="/settings" className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-700" data-testid="settings-link">
                      <Settings size={18} />
                      <span className="text-sm">الإعدادات</span>
                    </Link>
                    {user.user_type === 'seller' && (
                      <Link to="/seller/dashboard" className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-700" data-testid="seller-dashboard-link">
                        <Store size={18} />
                        <span className="text-sm">لوحة البائع</span>
                      </Link>
                    )}
                    {user.user_type === 'admin' && (
                      <Link to="/admin" className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-700" data-testid="admin-link">
                        <Settings size={18} />
                        <span className="text-sm">لوحة التحكم</span>
                      </Link>
                    )}
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors text-red-500"
                      data-testid="logout-btn"
                    >
                      <LogOut size={18} />
                      <span className="text-sm">تسجيل الخروج</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link 
                to="/login"
                className="bg-[#FF6B00] text-white font-bold px-3 py-1.5 rounded-full hover:bg-[#E65000] transition-colors text-sm"
                data-testid="login-btn"
              >
                دخول
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 md:hidden hover:bg-gray-100 rounded-full transition-colors text-gray-700"
              data-testid="mobile-menu-btn"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-t border-gray-100 p-4"
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
