import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, ShoppingCart, User, Menu, X, Home, Grid3X3, 
  MessageCircle, Package, LogOut, Settings, Store
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[#FF6B00] flex items-center justify-center">
              <span className="text-black font-bold text-lg">ت</span>
            </div>
            <span className="text-xl font-bold hidden sm:block">تريند سوريا</span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن منتجات..."
                className="w-full bg-[#121212] border border-white/10 rounded-full py-2.5 px-5 pr-12 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none transition-colors"
                data-testid="search-input"
              />
              <button 
                type="submit"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-[#FF6B00] transition-colors"
                data-testid="search-btn"
              >
                <Search size={20} />
              </button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <Link 
              to="/cart" 
              className="relative p-2 hover:bg-white/5 rounded-full transition-colors"
              data-testid="cart-btn"
            >
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6B00] text-black text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {user ? (
              <div className="relative group">
                <button 
                  className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-full transition-colors"
                  data-testid="user-menu-btn"
                >
                  <div className="w-8 h-8 rounded-full bg-[#FF6B00] flex items-center justify-center">
                    <span className="text-black font-bold text-sm">{user.name[0]}</span>
                  </div>
                </button>
                <div className="absolute left-0 top-full mt-2 w-48 bg-[#121212] border border-white/10 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <div className="p-3 border-b border-white/10">
                    <p className="font-bold text-sm">{user.name}</p>
                    <p className="text-xs text-white/50">{user.email}</p>
                  </div>
                  <div className="p-2">
                    <Link to="/orders" className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors" data-testid="my-orders-link">
                      <Package size={18} />
                      <span className="text-sm">طلباتي</span>
                    </Link>
                    <Link to="/messages" className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors" data-testid="messages-link">
                      <MessageCircle size={18} />
                      <span className="text-sm">الرسائل</span>
                    </Link>
                    {user.user_type === 'seller' && (
                      <Link to="/seller/dashboard" className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors" data-testid="seller-dashboard-link">
                        <Store size={18} />
                        <span className="text-sm">لوحة البائع</span>
                      </Link>
                    )}
                    {user.user_type === 'admin' && (
                      <Link to="/admin" className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors" data-testid="admin-link">
                        <Settings size={18} />
                        <span className="text-sm">لوحة التحكم</span>
                      </Link>
                    )}
                    <button 
                      onClick={logout}
                      className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-red-500"
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
                className="bg-[#FF6B00] text-black font-bold px-4 py-2 rounded-full hover:bg-[#E65000] transition-colors"
                data-testid="login-btn"
              >
                دخول
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 md:hidden hover:bg-white/5 rounded-full transition-colors"
              data-testid="mobile-menu-btn"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden mt-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منتجات..."
              className="w-full bg-[#121212] border border-white/10 rounded-full py-2.5 px-5 pr-12 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none transition-colors"
              data-testid="mobile-search-input"
            />
            <button 
              type="submit"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-[#FF6B00] transition-colors"
            >
              <Search size={20} />
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-[#121212] border-t border-white/10 p-4"
        >
          <nav className="flex flex-col gap-2">
            <Link to="/" className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg" onClick={() => setIsMenuOpen(false)}>
              <Home size={20} />
              <span>الرئيسية</span>
            </Link>
            <Link to="/categories" className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg" onClick={() => setIsMenuOpen(false)}>
              <Grid3X3 size={20} />
              <span>الأصناف</span>
            </Link>
            {!user && (
              <>
                <Link to="/login" className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg" onClick={() => setIsMenuOpen(false)}>
                  <User size={20} />
                  <span>تسجيل الدخول</span>
                </Link>
                <Link to="/register" className="flex items-center gap-3 p-3 bg-[#FF6B00] text-black rounded-lg font-bold" onClick={() => setIsMenuOpen(false)}>
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
