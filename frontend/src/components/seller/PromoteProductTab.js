// /app/frontend/src/components/seller/PromoteProductTab.js
// تبويب "روّج منتجك" - النظام الجديد البسيط

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Clock, CheckCircle, Loader2, Package, Percent, Wallet, Sparkles, Timer, XCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

// مكون المؤقت التنازلي
const CountdownTimer = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('انتهى');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}س ${minutes}د`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}د ${seconds}ث`);
      } else {
        setTimeLeft(`${seconds}ث`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
      <Timer size={12} />
      {timeLeft}
    </span>
  );
};

const PromoteProductTab = ({ products, token, walletBalance = 0, onPromotionSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ cost_per_product: 1000, duration_hours: 24 });
  const [myPromotions, setMyPromotions] = useState({ active: [], expired: [] });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [settingsRes, promotionsRes, flashStatusRes] = await Promise.all([
        axios.get(`${API}/api/seller/promotion-settings`, { headers }),
        axios.get(`${API}/api/seller/my-promotions`, { headers }),
        axios.get(`${API}/api/flash/status`)
      ]);
      
      setSettings({
        ...settingsRes.data,
        flashStatus: flashStatusRes.data
      } || { cost_per_product: 1000, duration_hours: 24 });
      setMyPromotions(promotionsRes.data || { active: [], expired: [] });
    } catch (error) {
      console.error('Error fetching promotion data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!selectedProduct) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار منتج للترويج",
        variant: "destructive"
      });
      return;
    }

    if (walletBalance < settings.cost_per_product) {
      toast({
        title: "رصيد غير كافٍ",
        description: `تحتاج ${settings.cost_per_product.toLocaleString()} ل.س للترويج`,
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(
        `${API}/api/seller/promote-product`,
        {
          product_id: selectedProduct.id,
          discount_percentage: discount
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: "تم بنجاح! 🚀",
        description: "تم حجز منتجك في Flash القادم الساعة 1:00 ظهراً"
      });
      
      setSelectedProduct(null);
      setDiscount(0);
      fetchData();
      
      // تحديث رصيد المحفظة في الـ parent
      if (onPromotionSuccess && res.data.new_balance !== undefined) {
        console.log('Updating wallet balance to:', res.data.new_balance);
        onPromotionSuccess(res.data.new_balance);
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في ترويج المنتج",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // المنتجات الموافق عليها فقط
  const approvedProducts = products?.filter(p => p.is_approved !== false) || [];
  
  // استثناء المنتجات المروّجة حالياً
  const activeProductIds = myPromotions.active?.map(p => p.product_id) || [];
  const availableProducts = approvedProducts.filter(p => !activeProductIds.includes(p.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* تنبيه إذا كان الفلاش معطل لهذا النوع من البائعين */}
      {settings.flash_enabled_for_me === false && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700">
            <XCircle size={20} />
            <span className="font-bold">الفلاش معطل حالياً</span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            تم تعطيل الفلاش لهذا النوع من البائعين من قبل الإدارة. يرجى المحاولة لاحقاً.
          </p>
        </div>
      )}

      {/* شريط حالة Flash للبائع */}
      {settings.flashStatus && settings.flash_enabled_for_me !== false && (
        <div className={`rounded-xl p-3 flex items-center justify-between ${
          settings.flashStatus.status === 'live' 
            ? 'bg-green-100 border border-green-300' 
            : 'bg-yellow-100 border border-yellow-300'
        }`}>
          <div className="flex items-center gap-2">
            {settings.flashStatus.status === 'live' ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-bold text-green-800 text-sm">⚡ Flash نشط الآن!</span>
              </>
            ) : (
              <>
                <span className="text-xl">🔔</span>
                <span className="font-bold text-yellow-800 text-sm">
                  Flash يبدأ {settings.flashStatus.next_day_name ? `يوم ${settings.flashStatus.next_day_name}` : 'قريباً'}
                </span>
              </>
            )}
          </div>
          <div className="text-xs font-medium">
            {settings.flashStatus.status === 'live' 
              ? `ينتهي خلال: ${settings.flashStatus.remaining_formatted}` 
              : `يبدأ بعد: ${settings.flashStatus.until_start_formatted}`
            }
          </div>
        </div>
      )}

      {/* بانر فلاش */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={24} />
          <h2 className="font-bold text-lg">فلاش - روّج منتجك ⚡</h2>
        </div>
        <p className="text-sm opacity-90 mb-3">
          {settings.flashStatus?.status === 'live' 
            ? '⏳ Flash نشط الآن! انتظر انتهاءه لإضافة منتجك للـ Flash القادم' 
            : `أضف منتجك الآن وسيظهر في Flash ${settings.flashStatus?.next_day_name ? `يوم ${settings.flashStatus.next_day_name}` : 'القادم'}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="bg-white/20 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1">
            <Clock size={12} />
            <span>يبدأ: الساعة 1:00 ظهراً {settings.flashStatus?.allowed_days?.length === 7 ? 'يومياً' : ''}</span>
          </div>
          <div className="bg-white/20 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1">
            <Wallet size={12} />
            <span>التكلفة: {settings.cost_per_product?.toLocaleString()} ل.س</span>
          </div>
        </div>
      </div>

      {/* الترويجات النشطة */}
      {myPromotions.active?.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
            <Sparkles size={18} />
            ترويجاتك النشطة ({myPromotions.active.length})
          </h3>
          <div className="space-y-2">
            {myPromotions.active.map(promo => (
              <div key={promo.id} className="bg-white rounded-lg p-3 flex items-center gap-3">
                {promo.product_image && (
                  <img 
                    src={promo.product_image} 
                    alt={promo.product_name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{promo.product_name}</p>
                  {/* السعر الأصلي والسعر بعد الخصم */}
                  {promo.discount_percentage > 0 && promo.original_price && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      <span className="line-through">{promo.original_price?.toLocaleString()}</span>
                      <span className="mx-1">←</span>
                      <span className="text-red-600 font-medium">{(promo.discounted_price || Math.round(promo.original_price * (1 - promo.discount_percentage/100))).toLocaleString()} ل.س</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <CountdownTimer expiresAt={promo.expires_at} />
                    {promo.discount_percentage > 0 && (
                      <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-bold">
                        -{promo.discount_percentage}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* اختيار منتج للترويج */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package size={18} className="text-orange-500" />
          اختر منتج للترويج
        </h3>
        
        {/* رسالة تنبيه عند Flash النشط */}
        {settings.flashStatus?.status === 'live' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium flex items-center gap-2">
              <Clock size={16} />
              Flash نشط الآن! لا يمكن إضافة منتجات حتى انتهائه
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              ينتهي خلال: {settings.flashStatus.remaining_formatted}
            </p>
          </div>
        )}
        
        {settings.flashStatus?.status === 'live' ? (
          <div className="text-center py-8 text-gray-400">
            <Zap size={40} className="mx-auto mb-2 opacity-30" />
            <p>انتظر انتهاء Flash الحالي</p>
          </div>
        ) : availableProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package size={40} className="mx-auto mb-2 opacity-30" />
            <p>لا توجد منتجات متاحة للترويج</p>
            <p className="text-xs mt-1">
              {activeProductIds.length > 0 
                ? "جميع منتجاتك مروّجة حالياً" 
                : "أضف منتجات أولاً"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableProducts.map(product => (
              <div 
                key={product.id}
                onClick={() => setSelectedProduct(selectedProduct?.id === product.id ? null : product)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  selectedProduct?.id === product.id 
                    ? 'bg-orange-50 border-2 border-orange-500' 
                    : 'bg-gray-50 border-2 border-transparent hover:border-orange-200'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedProduct?.id === product.id 
                    ? 'border-orange-500 bg-orange-500' 
                    : 'border-gray-300'
                }`}>
                  {selectedProduct?.id === product.id && (
                    <CheckCircle size={14} className="text-white" />
                  )}
                </div>
                
                {(product.images?.[0] || product.image) && (
                  <img 
                    src={product.images?.[0] || product.image} 
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.price?.toLocaleString()} ل.س</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* إضافة خصم (اختياري) */}
      {selectedProduct && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Percent size={18} className="text-red-500" />
            إضافة خصم (اختياري)
          </h3>
          <p className="text-sm text-gray-500 mb-3">
            أضف خصم لجذب المزيد من العملاء
          </p>
          
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={discount}
              onChange={(e) => setDiscount(parseInt(e.target.value))}
              className="flex-1 accent-red-500"
            />
            <div className="w-16 text-center">
              <span className={`text-lg font-bold ${discount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {discount}%
              </span>
            </div>
          </div>
          
          {discount > 0 && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                السعر بعد الخصم: <span className="font-bold">{Math.round(selectedProduct.price * (1 - discount/100)).toLocaleString()} ل.س</span>
                <span className="line-through text-gray-400 mr-2">{selectedProduct.price?.toLocaleString()}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* زر الترويج */}
      {selectedProduct && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">المنتج المختار</p>
              <p className="font-bold text-gray-900">{selectedProduct.name}</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">التكلفة</p>
              <p className="font-bold text-orange-600">{settings.cost_per_product?.toLocaleString()} ل.س</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">رصيد محفظتك</span>
            <span className={`font-bold ${walletBalance >= settings.cost_per_product ? 'text-green-600' : 'text-red-600'}`}>
              {walletBalance?.toLocaleString()} ل.س
            </span>
          </div>
          
          <button
            onClick={handlePromote}
            disabled={submitting || walletBalance < settings.cost_per_product}
            className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
              walletBalance >= settings.cost_per_product
                ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                جاري الترويج...
              </>
            ) : walletBalance < settings.cost_per_product ? (
              <>
                <Wallet size={20} />
                رصيد غير كافٍ
              </>
            ) : (
              <>
                <Zap size={20} />
                روّج الآن ⚡ {settings.cost_per_product?.toLocaleString()} ل.س
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default PromoteProductTab;
