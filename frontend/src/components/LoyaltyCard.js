// /app/frontend/src/components/LoyaltyCard.js
// بطاقة نقاط الولاء للعميل

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Award, Gift, Star, ChevronLeft, Loader2, History, 
  TrendingUp, Sparkles, Crown, Diamond, Medal
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SY', { month: 'short', day: 'numeric' });
};

const TIER_ICONS = {
  bronze: Medal,
  silver: Medal,
  gold: Crown,
  platinum: Star,
  diamond: Diamond
};

const LoyaltyCard = () => {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [redeemAmount, setRedeemAmount] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [pointsRes, historyRes] = await Promise.all([
        axios.get(`${API}/api/loyalty/points`),
        axios.get(`${API}/api/loyalty/history?limit=10`)
      ]);
      setData(pointsRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRedeem = async () => {
    const points = parseInt(redeemAmount);
    if (!points || points < (data?.min_redeem || 100)) {
      toast({
        title: "خطأ",
        description: `الحد الأدنى للاستبدال ${data?.min_redeem || 100} نقطة`,
        variant: "destructive"
      });
      return;
    }
    
    if (points > data.available_points) {
      toast({
        title: "خطأ",
        description: "رصيدك غير كافٍ",
        variant: "destructive"
      });
      return;
    }
    
    setRedeeming(true);
    try {
      const res = await axios.post(`${API}/api/loyalty/redeem`, { points });
      toast({
        title: "تم الاستبدال! 🎉",
        description: `كود الخصم: ${res.data.coupon_code} بقيمة ${formatPrice(res.data.discount_value)}`
      });
      setRedeemAmount('');
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل الاستبدال",
        variant: "destructive"
      });
    } finally {
      setRedeeming(false);
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
        </div>
      </div>
    );
  }
  
  if (!data) {
    return null;
  }
  
  const TierIcon = TIER_ICONS[data.current_tier?.name_en] || Award;
  const progressPercent = data.next_tier 
    ? ((data.lifetime_points - data.current_tier.min_points) / (data.next_tier.min_points - data.current_tier.min_points)) * 100
    : 100;
  
  const redeemValue = redeemAmount ? parseInt(redeemAmount) * (data.points_value || 100) : 0;
  
  return (
    <div className="space-y-2" data-testid="loyalty-card">
      {/* Main Card - مصغر */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${data.current_tier?.color || '#FF6B00'}22, ${data.current_tier?.color || '#FF6B00'}44)`,
          border: `1px solid ${data.current_tier?.color || '#FF6B00'}55`
        }}
      >
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: data.current_tier?.color || '#FF6B00' }}
              >
                <TierIcon size={16} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-600">مستوى الولاء</p>
                <p className="font-bold text-sm text-gray-900">{data.current_tier?.name || 'برونزي'}</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-white/50 transition-colors"
            >
              <History size={14} />
            </button>
          </div>
          
          {/* Points */}
          <div className="text-center mb-2">
            <p className="text-2xl font-black text-gray-900">
              {data.available_points?.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">نقطة متاحة</p>
          </div>
          
          {/* Progress to Next Tier */}
          {data.next_tier && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-[9px] text-gray-600 mb-0.5">
                <span>{data.current_tier?.name}</span>
                <span>{data.next_tier?.name}</span>
              </div>
              <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full rounded-full"
                  style={{ backgroundColor: data.next_tier?.color || '#FFD700' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-[9px] text-gray-500 text-center mt-0.5">
                {data.points_to_next_tier?.toLocaleString()} نقطة للمستوى التالي
              </p>
            </div>
          )}
          
          {/* Redeem Section - مصغر */}
          <div className="bg-white/70 rounded-lg p-2">
            <p className="text-[10px] font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <Gift size={12} className="text-[#FF6B00]" />
              استبدال النقاط
            </p>
            <div className="flex gap-1.5">
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  placeholder={`الحد الأدنى ${data.min_redeem}`}
                  className="w-full p-1.5 border border-gray-300 rounded-lg text-xs focus:border-[#FF6B00] focus:outline-none text-left"
                  min={data.min_redeem}
                  max={data.available_points}
                />
              </div>
              <button
                onClick={handleRedeem}
                disabled={redeeming || !redeemAmount || parseInt(redeemAmount) < data.min_redeem}
                className="bg-[#FF6B00] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold disabled:opacity-50 flex items-center gap-1"
              >
                {redeeming ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <>
                    <Sparkles size={12} />
                    استبدال
                  </>
                )}
              </button>
            </div>
            <p className="text-[9px] text-gray-500 mt-1">
              كل نقطة = {data.points_value} ل.س
            </p>
          </div>
        </div>
        
        {/* Bonus Badge */}
        {data.current_tier?.bonus_percent > 0 && (
          <div 
            className="py-1.5 px-3 text-center text-white text-[10px] font-bold"
            style={{ backgroundColor: data.current_tier?.color || '#FF6B00' }}
          >
            <TrendingUp size={10} className="inline ml-1" />
            بونص {data.current_tier?.bonus_percent}% نقاط إضافية على كل طلب!
          </div>
        )}
      </motion.div>
      
      {/* Stats - مصغر */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg p-2 border border-gray-200 text-center">
          <p className="text-sm font-bold text-gray-900">{data.lifetime_points?.toLocaleString()}</p>
          <p className="text-[9px] text-gray-500">إجمالي النقاط المكتسبة</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-gray-200 text-center">
          <p className="text-sm font-bold text-[#FF6B00]">{data.redeemed_points?.toLocaleString()}</p>
          <p className="text-[9px] text-gray-500">النقاط المستبدلة</p>
        </div>
      </div>
      
      {/* History */}
      {showHistory && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          <div className="p-2 border-b border-gray-100 flex items-center gap-2">
            <History size={12} className="text-gray-500" />
            <h3 className="text-xs font-bold text-gray-900">سجل النقاط</h3>
          </div>
          
          {history.length === 0 ? (
            <p className="p-3 text-center text-gray-400 text-xs">لا توجد معاملات بعد</p>
          ) : (
            <div className="max-h-36 overflow-y-auto">
              {history.map((item, i) => (
                <div key={item.id || i} className="flex items-center justify-between p-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      item.type === 'earn' ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      {item.type === 'earn' ? (
                        <TrendingUp size={10} className="text-green-600" />
                      ) : (
                        <Gift size={10} className="text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-700">{item.description}</p>
                      <p className="text-[8px] text-gray-400">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold ${
                    item.points > 0 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {item.points > 0 ? '+' : ''}{item.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default LoyaltyCard;
