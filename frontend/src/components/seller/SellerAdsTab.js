// /app/frontend/src/components/seller/SellerAdsTab.js
// تبويب إدارة إعلانات البائع

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Megaphone, Plus, Eye, MousePointer, Clock, CheckCircle, 
  XCircle, TrendingUp, Loader2, Wallet, Star, Search, Image as ImageIcon
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' });
};

const AD_TYPES = {
  featured_product: { label: 'منتج مميز', icon: Star, color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  banner: { label: 'بانر الرئيسية', icon: ImageIcon, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  search_top: { label: 'أول البحث', icon: Search, color: 'text-blue-500', bgColor: 'bg-blue-50' }
};

const DURATIONS = {
  day: { label: 'يوم واحد', days: 1 },
  week: { label: 'أسبوع', days: 7 },
  month: { label: 'شهر', days: 30 }
};

const STATUS_STYLES = {
  active: { label: 'نشط', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  pending: { label: 'معلق', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  expired: { label: 'منتهي', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700', icon: XCircle }
};

const SellerAdsTab = ({ user, products, walletBalance = 0 }) => {
  const { toast } = useToast();
  const [ads, setAds] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Create ad form
  const [selectedProduct, setSelectedProduct] = useState('');
  const [adType, setAdType] = useState('featured_product');
  const [duration, setDuration] = useState('day');
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [adsRes, pricesRes] = await Promise.all([
        axios.get(`${API}/api/ads/my-ads`),
        axios.get(`${API}/api/ads/prices`)
      ]);
      setAds(adsRes.data);
      setPrices(pricesRes.data);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getAdCost = () => {
    const key = `${adType}_${duration}`;
    return prices[key] || 0;
  };
  
  const handleCreateAd = async () => {
    if (!selectedProduct) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار منتج",
        variant: "destructive"
      });
      return;
    }
    
    const cost = getAdCost();
    if (walletBalance < cost) {
      toast({
        title: "رصيد غير كافٍ",
        description: `تحتاج ${formatPrice(cost)} في محفظتك`,
        variant: "destructive"
      });
      return;
    }
    
    setCreating(true);
    try {
      await axios.post(`${API}/api/ads/create`, {
        product_id: selectedProduct,
        ad_type: adType,
        duration: duration
      });
      
      toast({
        title: "تم إنشاء الإعلان",
        description: "سيظهر إعلانك للعملاء الآن"
      });
      
      setShowCreateModal(false);
      setSelectedProduct('');
      setAdType('featured_product');
      setDuration('day');
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };
  
  // Stats
  const activeAds = ads.filter(a => a.status === 'active').length;
  const totalViews = ads.reduce((sum, a) => sum + (a.views || 0), 0);
  const totalClicks = ads.reduce((sum, a) => sum + (a.clicks || 0), 0);
  const totalSpent = ads.reduce((sum, a) => sum + (a.cost || 0), 0);
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }
  
  return (
    <section className="space-y-4" data-testid="seller-ads-tab">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone size={20} className="text-[#FF6B00]" />
          <h2 className="font-bold text-gray-900">إعلاناتي</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 bg-[#FF6B00] text-white px-3 py-1.5 rounded-full text-xs font-bold"
          data-testid="create-ad-btn"
        >
          <Plus size={14} />
          إعلان جديد
        </button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Megaphone, label: 'إعلانات نشطة', value: activeAds, color: 'bg-green-50 text-green-600' },
          { icon: Eye, label: 'المشاهدات', value: totalViews.toLocaleString(), color: 'bg-blue-50 text-blue-600' },
          { icon: MousePointer, label: 'النقرات', value: totalClicks.toLocaleString(), color: 'bg-purple-50 text-purple-600' },
          { icon: Wallet, label: 'المصروف', value: formatPrice(totalSpent), color: 'bg-orange-50 text-orange-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-3 border border-gray-200">
            <div className={`w-7 h-7 rounded-lg ${stat.color} flex items-center justify-center mb-1.5`}>
              <stat.icon size={14} />
            </div>
            <p className="text-sm font-bold text-gray-900">{stat.value}</p>
            <p className="text-[10px] text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>
      
      {/* Wallet Balance */}
      <div className="bg-gradient-to-l from-[#FF6B00] to-orange-500 rounded-xl p-3 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet size={18} />
          <span className="text-sm">رصيد المحفظة:</span>
        </div>
        <span className="font-bold">{formatPrice(walletBalance)}</span>
      </div>
      
      {/* Ads List */}
      {ads.length === 0 ? (
        <div className="bg-orange-50 rounded-xl p-8 text-center border border-orange-200">
          <Megaphone size={40} className="text-orange-300 mx-auto mb-3" />
          <h3 className="font-bold text-orange-700 mb-1">لا توجد إعلانات</h3>
          <p className="text-orange-500 text-sm mb-4">أنشئ إعلانك الأول لتظهر منتجاتك للمزيد من العملاء</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#FF6B00] text-white px-4 py-2 rounded-full text-sm font-bold"
          >
            إنشاء إعلان
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {ads.map((ad) => {
            const typeInfo = AD_TYPES[ad.ad_type] || AD_TYPES.featured_product;
            const statusInfo = STATUS_STYLES[ad.status] || STATUS_STYLES.pending;
            const StatusIcon = statusInfo.icon;
            
            return (
              <motion.div
                key={ad.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Product Image */}
                  <img
                    src={ad.product_image || 'https://via.placeholder.com/60'}
                    alt={ad.product_name}
                    className="w-14 h-14 rounded-lg object-cover"
                  />
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm text-gray-900 truncate">{ad.product_name}</h3>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${statusInfo.color} flex items-center gap-0.5`}>
                        <StatusIcon size={10} />
                        {statusInfo.label}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[10px] text-gray-500">
                      <span className={`flex items-center gap-1 ${typeInfo.color}`}>
                        <typeInfo.icon size={10} />
                        {typeInfo.label}
                      </span>
                      <span>•</span>
                      <span>{DURATIONS[ad.duration]?.label || ad.duration}</span>
                      <span>•</span>
                      <span className="text-[#FF6B00] font-bold">{formatPrice(ad.cost)}</span>
                    </div>
                    
                    {/* Stats & Dates */}
                    <div className="flex items-center gap-4 mt-1.5 text-[10px]">
                      <span className="flex items-center gap-1 text-gray-500">
                        <Eye size={10} />
                        {ad.views || 0} مشاهدة
                      </span>
                      <span className="flex items-center gap-1 text-gray-500">
                        <MousePointer size={10} />
                        {ad.clicks || 0} نقرة
                      </span>
                      {ad.end_date && (
                        <span className="text-gray-400">
                          ينتهي: {formatDate(ad.end_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      
      {/* Create Ad Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-gray-900">إنشاء إعلان جديد</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Select Product */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اختر المنتج</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:border-[#FF6B00] focus:outline-none"
                  data-testid="select-product-for-ad"
                >
                  <option value="">-- اختر منتج --</option>
                  {products?.filter(p => p.approval_status === 'approved').map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatPrice(product.price)}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Ad Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">نوع الإعلان</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(AD_TYPES).map(([key, info]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAdType(key)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        adType === key
                          ? 'border-[#FF6B00] bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <info.icon size={20} className={`mx-auto mb-1 ${info.color}`} />
                      <p className="text-[10px] font-medium text-gray-700">{info.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">المدة</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(DURATIONS).map(([key, info]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setDuration(key)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        duration === key
                          ? 'border-[#FF6B00] bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Clock size={16} className={`mx-auto mb-1 ${duration === key ? 'text-[#FF6B00]' : 'text-gray-400'}`} />
                      <p className="text-xs font-medium text-gray-700">{info.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Cost Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">تكلفة الإعلان:</span>
                  <span className="text-lg font-bold text-[#FF6B00]">{formatPrice(getAdCost())}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>رصيدك الحالي:</span>
                  <span className={walletBalance >= getAdCost() ? 'text-green-600' : 'text-red-500'}>
                    {formatPrice(walletBalance)}
                  </span>
                </div>
                {walletBalance < getAdCost() && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <XCircle size={12} />
                    رصيد غير كافٍ، تحتاج {formatPrice(getAdCost() - walletBalance)} إضافية
                  </p>
                )}
              </div>
              
              {/* Submit Button */}
              <button
                onClick={handleCreateAd}
                disabled={creating || !selectedProduct || walletBalance < getAdCost()}
                className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="submit-create-ad"
              >
                {creating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Megaphone size={18} />
                    إنشاء الإعلان
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
};

export default SellerAdsTab;
