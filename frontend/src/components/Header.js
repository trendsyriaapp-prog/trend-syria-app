import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Search, User, Menu, X, Home, Grid3X3, 
  Bot, Package, LogOut, Settings, Store, Bell, Share2, ArrowRight,
  Clock, Trash2, Mic, MicOff, Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';
import NotificationsDropdown from './NotificationsDropdown';
import ImageSearchModal from './ImageSearchModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const recognitionRef = useRef(null);
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // التحقق إذا كنا في صفحة المنتج
  const isProductPage = location.pathname.startsWith('/products/');
  
  // التحقق إذا كنا في الصفحة الرئيسية
  const isHomePage = location.pathname === '/';
  
  // التحقق إذا كنا في صفحات الطعام - لإخفاء شريط البحث
  const isFoodPage = location.pathname.startsWith('/food');
  
  // هل يتصفح كعميل؟
  const isViewingAsCustomer = searchParams.get('view') === 'customer';
  
  // إخفاء الهيدر الكامل للبائع في جميع صفحاته (إلا إذا كان يتصفح كعميل)
  const isSellerPage = (user?.user_type === 'seller' || user?.user_type === 'food_seller') && !isViewingAsCustomer;
  
  // إخفاء الهيدر الكامل لموظف التوصيل في جميع صفحاته (إلا إذا كان يتصفح كعميل)
  const isDeliveryPage = user?.user_type === 'delivery' && !isViewingAsCustomer;
  
  // إخفاء شريط البحث في صفحات الطعام
  const hideSearchBar = isFoodPage;

  // جلب سجل البحث
  useEffect(() => {
    if (user) {
      fetchSearchHistory();
    }
  }, [user]);

  const fetchSearchHistory = async () => {
    try {
      const res = await axios.get(`${API}/products/search-history`);
      setSearchHistory(res.data.searches || []);
    } catch (error) {
      console.error('Error fetching search history:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setShowHistory(false);
      // تحديث السجل بعد البحث
      setTimeout(() => fetchSearchHistory(), 500);
    }
  };

  const handleHistoryClick = (query) => {
    navigate(`/products?search=${encodeURIComponent(query)}`);
    setSearchQuery('');
    setShowHistory(false);
  };

  const handleDeleteHistory = async (searchId, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/products/search-history/${searchId}`);
      setSearchHistory(prev => prev.filter(s => s.id !== searchId));
    } catch (error) {
      console.error('Error deleting search:', error);
    }
  };

  const handleClearAllHistory = async () => {
    try {
      await axios.delete(`${API}/products/search-history`);
      setSearchHistory([]);
      toast({
        title: "تم المسح",
        description: "تم مسح سجل البحث"
      });
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  // 🎤 البحث الصوتي
  const startVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "غير مدعوم",
        description: "المتصفح لا يدعم البحث الصوتي",
        variant: "destructive"
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'ar-SA';
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      toast({
        title: "🎤 جارٍ الاستماع...",
        description: "تحدث الآن للبحث"
      });
    };

    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsListening(false);
      // البحث تلقائياً
      navigate(`/products?search=${encodeURIComponent(transcript)}`);
      toast({
        title: "تم البحث",
        description: `البحث عن: ${transcript}`
      });
    };

    recognitionRef.current.onerror = (event) => {
      setIsListening(false);
      if (event.error === 'no-speech') {
        toast({
          title: "لم يتم سماع شيء",
          description: "حاول مرة أخرى",
          variant: "destructive"
        });
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // دالة المشاركة
  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ترند سورية',
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

  // إخفاء الهيدر الكامل للبائع وموظف التوصيل (إلا إذا كان يتصفح كعميل)
  if (isSellerPage || isDeliveryPage) return null;

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 py-2">
        {/* الصف الأول: البحث + الأيقونات */}
        <div className="flex items-center gap-2">
          {/* Logo - الشعار */}
          <Link to="/" className="flex-shrink-0 flex items-center">
            <span className="text-base sm:text-lg font-bold text-gray-900">
              ترند<span className="text-[#FF6B00]">⚡</span><span className="text-[#FF6B00] border-b-[3px] border-[#FF6B00] pb-[1px]">سورية</span>
            </span>
          </Link>

          {/* Search Bar - شريط البحث الطويل - يختفي في صفحات الطعام ولوحة تحكم البائع */}
          {!hideSearchBar && (
          <form onSubmit={handleSearch} className="flex-1 relative">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => user && searchHistory.length > 0 && setShowHistory(true)}
                onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                placeholder="ابحث عن منتجات..."
                className="w-full bg-gray-100 border border-gray-200 rounded-full py-2 px-4 pr-9 pl-16 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]/20 transition-all"
                data-testid="search-input"
              />
              <button 
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FF6B00] transition-colors"
                data-testid="search-btn"
              >
                <Search size={16} />
              </button>
              {/* 🎤 زر البحث الصوتي */}
              <button
                type="button"
                onClick={isListening ? stopVoiceSearch : startVoiceSearch}
                className={`absolute left-9 top-1/2 -translate-y-1/2 transition-colors ${
                  isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-[#FF6B00]'
                }`}
                data-testid="voice-search-btn"
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              {/* 📷 زر البحث بالصورة */}
              <button
                type="button"
                onClick={() => setShowImageSearch(true)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-500 transition-colors"
                data-testid="image-search-btn"
              >
                <Camera size={14} />
              </button>
            </div>

            {/* قائمة سجل البحث */}
            <AnimatePresence>
              {showHistory && searchHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                    <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                      <Clock size={12} />
                      عمليات البحث السابقة
                    </span>
                    <button
                      onClick={handleClearAllHistory}
                      className="text-[10px] text-red-500 hover:text-red-600"
                    >
                      مسح الكل
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {searchHistory.slice(0, 10).map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleHistoryClick(item.query)}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2">
                          <Search size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-700">{item.query}</span>
                        </div>
                        <button
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded transition-opacity"
                        >
                          <X size={14} className="text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
          )}
          
          {/* شريط البحث عن الطعام - يظهر فقط في صفحات الطعام */}
          {isFoodPage && (
            <form 
              className="flex-1 relative"
              onSubmit={(e) => {
                e.preventDefault();
                const input = e.target.querySelector('input');
                const searchValue = input.value.trim();
                if (searchValue) {
                  navigate(`/food?search=${encodeURIComponent(searchValue)}`);
                } else {
                  navigate('/food');
                }
              }}
            >
              <input
                type="text"
                placeholder="ابحث عن مطعم أو منتج..."
                className="w-full bg-gray-100 border border-gray-200 rounded-full py-2 px-4 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]/20 transition-all"
                data-testid="food-search-input"
                defaultValue={new URLSearchParams(window.location.search).get('search') || ''}
              />
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </form>
          )}

          {/* الأيقونات - على اليسار */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* سهم الرجوع */}
            {!isHomePage && (
              <button 
                onClick={() => navigate(-1)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-700"
                data-testid="back-btn"
              >
                <ArrowRight size={18} />
              </button>
            )}
            
            {/* المجيب الآلي */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('openChatbot'))}
              className="p-1.5 hover:bg-orange-50 rounded-full transition-colors text-[#FF6B00]"
              title="المجيب الآلي"
              data-testid="chatbot-icon"
            >
              <Bot size={18} />
            </button>
            
            {/* الإشعارات */}
            <NotificationsDropdown />
            
            {/* تسجيل الدخول */}
            {!user && (
              <Link 
                to="/login"
                className="bg-[#FF6B00] text-white font-bold px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-full hover:bg-[#E65000] transition-colors text-xs sm:text-sm flex items-center gap-1"
                data-testid="login-btn"
              >
                <User size={14} className="sm:w-4 sm:h-4" />
                <span>دخول</span>
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

      {/* Image Search Modal */}
      <ImageSearchModal 
        isOpen={showImageSearch} 
        onClose={() => setShowImageSearch(false)} 
      />
    </header>
  );
};

export default Header;
