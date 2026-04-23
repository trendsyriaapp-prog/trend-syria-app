// /app/frontend/src/components/FoodMapView.js
// خريطة المطاعم والمتاجر بملء الشاشة
// يعرض جميع متاجر الطعام على الخريطة مع فلاتر حسب الصنف

import { useState, useEffect, useRef } from 'react';
import logger from '../lib/logger';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  X, Navigation, Loader2, Star, Clock, MapPin, 
  ChevronLeft, Filter, Store as StoreIcon,
  UtensilsCrossed, Coffee, Cake, Croissant, GlassWater,
  ShoppingBasket, Apple, Package, Milk, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// إصلاح أيقونة Leaflet الافتراضية
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// إعدادات الأصناف مع الألوان والأيقونات
const CATEGORY_CONFIG = {
  all: {
    id: 'all',
    name: 'الكل',
    color: '#6B7280',
    emoji: '🏪',
    Icon: StoreIcon
  },
  restaurants: {
    id: 'restaurants',
    name: 'مطاعم',
    color: '#F97316',
    emoji: '🍔',
    Icon: UtensilsCrossed
  },
  cafes: {
    id: 'cafes',
    name: 'مقاهي',
    color: '#92400E',
    emoji: '☕',
    Icon: Coffee
  },
  sweets: {
    id: 'sweets',
    name: 'حلويات',
    color: '#EC4899',
    emoji: '🍰',
    Icon: Cake
  },
  bakery: {
    id: 'bakery',
    name: 'مخابز',
    color: '#CA8A04',
    emoji: '🥖',
    Icon: Croissant
  },
  drinks: {
    id: 'drinks',
    name: 'مشروبات',
    color: '#06B6D4',
    emoji: '🥤',
    Icon: GlassWater
  },
  food_groceries: {
    id: 'food_groceries',
    name: 'مواد غذائية',
    color: '#16A34A',
    emoji: '🛒',
    Icon: ShoppingBasket
  },
  vegetables: {
    id: 'vegetables',
    name: 'خضروات',
    color: '#10B981',
    emoji: '🥬',
    Icon: Apple
  },
  dairy: {
    id: 'dairy',
    name: 'ألبان',
    color: '#EAB308',
    emoji: '🧀',
    Icon: Package
  }
};

// إنشاء أيقونة مخصصة للمتجر
const createStoreIcon = (category, isSelected = false, isOpen = true) => {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.restaurants;
  const size = isSelected ? 48 : 36;
  const color = isOpen ? config.color : '#9CA3AF'; // رمادي إذا مغلق
  const opacity = isOpen ? '1' : '0.7';
  
  return L.divIcon({
    className: 'custom-store-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 3px solid ${isOpen ? 'white' : '#EF4444'};
        opacity: ${opacity};
        ${isSelected ? 'animation: pulse 1s infinite;' : ''}
      ">
        <span style="
          transform: rotate(45deg);
          font-size: ${size * 0.45}px;
        ">${isOpen ? config.emoji : '🚫'}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size]
  });
};

// أيقونة موقع المستخدم
const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `
    <div style="
      width: 20px;
      height: 20px;
      background: #3B82F6;
      border-radius: 50%;
      border: 4px solid white;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3), 0 4px 8px rgba(0,0,0,0.2);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

// مكون لتحديث موقع الخريطة
const MapController = ({ center, userLocation }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  
  return null;
};

// مكون لإصلاح حجم الخريطة (يحل مشكلة الـ tiles المختفية)
const MapResizer = () => {
  const map = useMap();
  
  useEffect(() => {
    // إصلاح حجم الخريطة بعد التحميل
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    
    const timer3 = setTimeout(() => {
      map.invalidateSize();
    }, 500);
    
    // إصلاح عند تغيير حجم النافذة
    const handleResize = () => {
      map.invalidateSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // إصلاح عند التكبير/التصغير
    map.on('zoomend', () => {
      setTimeout(() => map.invalidateSize(), 100);
    });
    
    map.on('moveend', () => {
      setTimeout(() => map.invalidateSize(), 100);
    });
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  
  return null;
};

// مكون بطاقة المتجر
const StoreCard = ({ store, onClose, onViewStore }) => {
  const config = CATEGORY_CONFIG[store.category] || CATEGORY_CONFIG.restaurants;
  
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="absolute bottom-20 left-4 right-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[1002]"
    >
      <div className="p-4">
        <div className="flex gap-3">
          {/* صورة المتجر */}
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-3xl"
                style={{ background: `${config.color}20` }}
              >
                {config.emoji}
              </div>
            )}
          </div>
          
          {/* معلومات المتجر */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-gray-900 text-base truncate">{store.name}</h3>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            
            <div className="flex items-center gap-3 mt-1 text-sm">
              {store.rating && (
                <span className="flex items-center gap-1 text-amber-500">
                  <Star size={14} fill="currentColor" />
                  {store.rating.toFixed(1)}
                </span>
              )}
              {store.distance && (
                <span className="flex items-center gap-1 text-gray-500">
                  <MapPin size={14} />
                  {store.distance < 1 ? `${Math.round(store.distance * 1000)}م` : `${store.distance.toFixed(1)}كم`}
                </span>
              )}
              {store.delivery_time && (
                <span className="flex items-center gap-1 text-gray-500">
                  <Clock size={14} />
                  {store.delivery_time}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <span 
                className="text-xs px-2 py-0.5 rounded-full text-white"
                style={{ background: config.color }}
              >
                {config.name}
              </span>
              {store.is_open !== false ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  مفتوح
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  مغلق
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* زر عرض القائمة */}
        <button
          onClick={() => onViewStore(store)}
          className="w-full mt-4 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          عرض القائمة
          <ChevronLeft size={18} />
        </button>
      </div>
    </motion.div>
  );
};

// مكون شريط الفلاتر
const CategoryFilter = ({ selectedCategory, onSelectCategory, showOpenOnly, onToggleOpenOnly, sortByDistance, onToggleSortByDistance }) => {
  const categories = Object.values(CATEGORY_CONFIG);
  const scrollRef = useRef(null);
  
  return (
    <div className="absolute top-16 left-0 right-0 z-[1003] px-2 pointer-events-auto">
      {/* شريط الأصناف */}
      <div 
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto py-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all flex-shrink-0 ${
                isSelected 
                  ? 'text-white shadow-lg' 
                  : 'bg-white text-gray-700 shadow-md hover:shadow-lg'
              }`}
              style={isSelected ? { background: cat.color } : {}}
            >
              <span className="text-base">{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
      
      {/* شريط الفلاتر السريعة */}
      <div className="flex gap-2 mt-1">
        {/* فلتر مفتوح الآن */}
        <button
          onClick={onToggleOpenOnly}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            showOpenOnly 
              ? 'bg-green-500 text-white shadow-md' 
              : 'bg-white/90 text-gray-600 shadow-sm hover:shadow-md'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${showOpenOnly ? 'bg-white' : 'bg-green-500'}`}></span>
          مفتوح الآن
        </button>
        
        {/* فلتر الأقرب أولاً */}
        <button
          onClick={onToggleSortByDistance}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            sortByDistance 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-white/90 text-gray-600 shadow-sm hover:shadow-md'
          }`}
        >
          <MapPin size={12} />
          الأقرب أولاً
        </button>
      </div>
    </div>
  );
};

// المكون الرئيسي
const FoodMapView = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [filteredStores, setFilteredStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStore, setSelectedStore] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([33.5138, 36.2765]); // دمشق
  const [gettingLocation, setGettingLocation] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false); // فلتر مفتوح الآن
  const [sortByDistance, setSortByDistance] = useState(true); // ترتيب حسب المسافة
  const [searchQuery, setSearchQuery] = useState(''); // البحث عن متجر
  const [searchResults, setSearchResults] = useState([]); // نتائج البحث
  const [showSearchResults, setShowSearchResults] = useState(false); // عرض نتائج البحث

  // جلب المتاجر
  useEffect(() => {
    if (isOpen) {
      fetchStores();
      getUserLocation();
    }
  }, [isOpen]);

  // فلترة وترتيب المتاجر
  useEffect(() => {
    let result = [...stores];
    
    // فلتر حسب الصنف
    if (selectedCategory !== 'all') {
      result = result.filter(s => s.category === selectedCategory);
    }
    
    // فلتر مفتوح الآن
    if (showOpenOnly) {
      result = result.filter(s => s.is_open !== false);
    }
    
    // ترتيب حسب المسافة (إذا كان الموقع متاح)
    if (sortByDistance && userLocation) {
      result.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }
    
    setFilteredStores(result);
    setSelectedStore(null);
  }, [selectedCategory, stores, showOpenOnly, sortByDistance, userLocation]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/food/stores`);
      // فلترة المتاجر التي لديها إحداثيات
      const storesWithLocation = (res.data || []).filter(
        s => s.latitude && s.longitude && s.is_approved !== false
      );
      setStores(storesWithLocation);
      setFilteredStores(storesWithLocation);
      
      // إذا كان هناك متاجر، نركز على أول متجر
      if (storesWithLocation.length > 0 && !userLocation) {
        setMapCenter([storesWithLocation[0].latitude, storesWithLocation[0].longitude]);
      }
    } catch (error) {
      logger.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) return;
    
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        
        // حساب المسافة لكل متجر
        setStores(prevStores => 
          prevStores.map(store => ({
            ...store,
            distance: calculateDistance(latitude, longitude, store.latitude, store.longitude)
          }))
        );
        setGettingLocation(false);
      },
      (error) => {
        logger.log('Location error:', error);
        setGettingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  // حساب المسافة بين نقطتين (بالكيلومتر)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const handleStoreClick = (store) => {
    setSelectedStore(store);
    setMapCenter([store.latitude, store.longitude]);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const handleViewStore = (store) => {
    onClose();
    navigate(`/food/store/${store.id}`);
  };

  const handleCenterOnUser = () => {
    if (userLocation) {
      setMapCenter(userLocation);
    } else {
      getUserLocation();
    }
  };

  // البحث عن متجر
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      const results = stores.filter(store => 
        store.name?.toLowerCase().includes(query.toLowerCase()) ||
        store.description?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  // اختيار متجر من نتائج البحث
  const handleSelectSearchResult = (store) => {
    setSelectedStore(store);
    setMapCenter([store.latitude, store.longitude]);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-white"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-[1002] bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-2 safe-area-top">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-800 flex-shrink-0"
            >
              <X size={22} />
            </button>
            
            {/* حقل البحث */}
            <div className="flex-1 relative">
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث عن متجر..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={() => searchQuery && setShowSearchResults(true)}
                  className="w-full pr-9 pl-3 py-2 text-sm bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/50 placeholder-gray-400"
                  data-testid="search-store-input"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              
              {/* نتائج البحث */}
              <AnimatePresence>
                {showSearchResults && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-64 overflow-y-auto z-[2000]"
                  >
                    {searchResults.map((store) => {
                      const config = CATEGORY_CONFIG[store.category] || CATEGORY_CONFIG.restaurants;
                      return (
                        <button
                          key={store.id}
                          onClick={() => handleSelectSearchResult(store)}
                          className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-right"
                        >
                          <span 
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                            style={{ background: `${config.color}20` }}
                          >
                            {config.emoji}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{store.name}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                              <span>{config.name}</span>
                              {store.rating && (
                                <span className="flex items-center gap-0.5">
                                  <Star size={10} className="text-amber-500" fill="currentColor" />
                                  {store.rating}
                                </span>
                              )}
                              {store.is_open === false && (
                                <span className="text-red-500">مغلق</span>
                              )}
                            </p>
                          </div>
                          <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                        </button>
                      );
                    })}
                  </motion.div>
                )}
                
                {/* رسالة عدم وجود نتائج */}
                {showSearchResults && searchQuery && searchResults.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 p-4 text-center z-[2000]"
                  >
                    <p className="text-gray-500 text-sm">لا توجد نتائج لـ "{searchQuery}"</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <button
              onClick={handleCenterOnUser}
              disabled={gettingLocation}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 flex-shrink-0"
            >
              {gettingLocation ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Navigation size={18} />
              )}
            </button>
          </div>
        </div>

        {/* فلتر الأصناف */}
        <CategoryFilter 
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          showOpenOnly={showOpenOnly}
          onToggleOpenOnly={() => setShowOpenOnly(!showOpenOnly)}
          sortByDistance={sortByDistance}
          onToggleSortByDistance={() => setSortByDistance(!sortByDistance)}
        />

        {/* الخريطة - يجب أن تكون أولاً (أسفل كل شيء) */}
        <div className="absolute inset-0 pt-36 pb-0 z-[1]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-[#FF6B00] animate-spin mx-auto mb-3" />
                <p className="text-gray-600">جاري تحميل المتاجر...</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapResizer />
              <MapController center={mapCenter} userLocation={userLocation} />
              
              {/* موقع المستخدم */}
              {userLocation && (
                <Marker position={userLocation} icon={userLocationIcon}>
                  <Popup>موقعك الحالي</Popup>
                </Marker>
              )}
              
              {/* دبابيس المتاجر */}
              {filteredStores.map((store) => (
                <Marker
                  key={store.id}
                  position={[store.latitude, store.longitude]}
                  icon={createStoreIcon(store.category, selectedStore?.id === store.id, store.is_open !== false)}
                  eventHandlers={{
                    click: () => handleStoreClick(store)
                  }}
                />
              ))}
            </MapContainer>
          )}
        </div>

        {/* عداد المتاجر */}
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-[1004]">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200">
            <span className="text-sm font-medium text-gray-700">
              {filteredStores.length} متجر {selectedCategory !== 'all' && `في ${CATEGORY_CONFIG[selectedCategory]?.name}`}
            </span>
          </div>
        </div>

        {/* بطاقة المتجر المحدد */}
        <AnimatePresence>
          {selectedStore && (
            <StoreCard
              store={selectedStore}
              onClose={() => setSelectedStore(null)}
              onViewStore={handleViewStore}
            />
          )}
        </AnimatePresence>

        {/* CSS للأنيميشن */}
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: rotate(-45deg) scale(1); }
            50% { transform: rotate(-45deg) scale(1.1); }
          }
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </motion.div>
    </AnimatePresence>
  );
};

export default FoodMapView;
