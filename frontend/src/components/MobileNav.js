import { Link, useLocation } from 'react-router-dom';
import { Home, Grid3X3, ShoppingCart, User, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const MobileNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { cartCount } = useCart();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', icon: Home, label: 'الرئيسية' },
    { path: '/categories', icon: Grid3X3, label: 'الأصناف' },
    { path: '/cart', icon: ShoppingCart, label: 'السلة', badge: cartCount },
    { path: '/messages', icon: MessageCircle, label: 'الرسائل' },
    { path: user ? '/orders' : '/login', icon: User, label: user ? 'حسابي' : 'دخول' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom shadow-lg">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[60px] transition-colors ${
              isActive(item.path) ? 'text-[#FF6B00]' : 'text-gray-500 hover:text-gray-700'
            }`}
            data-testid={`nav-${item.label}`}
          >
            <div className="relative">
              <item.icon size={22} />
              {item.badge > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-[#FF6B00] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;
