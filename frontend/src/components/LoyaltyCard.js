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
    <div className="space-y-3" data-testid="loyalty-card">
      {/* Main Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-hidden"
        style={{ 
          background: `linear-gradient(135deg, ${data.current_tier?.color || '#FF6B00'}22, ${data.current_tier?.color || '#FF6B00'}44)`,
          border: `2px solid ${data.current_tier?.color || '#FF6B00'}55`
        }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: data.current_tier?.color || '#FF6B00' }}
              >
                <TierIcon size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-600">مستوى الولاء</p>
                <p className="font-bold text-gray-900">{data.current_tier?.name || 'برونزي'}</p>
              </div>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-white/50 transition-colors"
            >
              <History size={18} />
            </button>
          </div>
          
          {/* Points */}
          <div className="text-center mb-4">
            <p className="text-4xl font-black text-gray-900">
              {data.available_points?.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">نقطة متاحة</p>
          </div>
          
          {/* Progress to Next Tier */}
          {data.next_tier && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-[10px] text-gray-600 mb-1">
                <span>{data.current_tier?.name}</span>
                <span>{data.next_tier?.name}</span>
              </div>
              <div className="h-2 bg-white/50 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full rounded-full"
                  style={{ backgroundColor: data.next_tier?.color || '#FFD700' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] text-gray-500 text-center mt-1">
                {data.points_to_next_tier?.toLocaleString()} نقطة للمستوى التالي
              </p>
            </div>
          )}
          
          {/* Redeem Section */}
          <div className="bg-white/70 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
              <Gift size={14} className="text-[#FF6B00]" />
              استبدال النقاط
            </p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  placeholder={`الحد الأدنى ${data.min_redeem}`}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:border-[#FF6B00] focus:outline-none text-left"
                  min={data.min_redeem}
                  max={data.available_points}
                />
                {redeemValue > 0 && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-green-600 font-bold">
                    = {formatPrice(redeemValue)}
                  </span>
                )}
              </div>
              <button
                onClick={handleRedeem}
                disabled={redeeming || !redeemAmount || parseInt(redeemAmount) < data.min_redeem}
                className="bg-[#FF6B00] text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-1"
              >
                {redeeming ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <>
                    <Sparkles size={14} />
                    استبدال
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              كل نقطة = {data.points_value} ل.س
            </p>
          </div>
        </div>
        
        {/* Bonus Badge */}
        {data.current_tier?.bonus_percent > 0 && (
          <div 
            className="py-2 px-4 text-center text-white text-xs font-bold"
            style={{ backgroundColor: data.current_tier?.color || '#FF6B00' }}
          >
            <TrendingUp size={12} className="inline ml-1" />
            بونص {data.current_tier?.bonus_percent}% نقاط إضافية على كل طلب!
          </div>
        )}
      </motion.div>
      
      {/* History */}
      {showHistory && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <div className="p-3 border-b border-gray-100 flex items-center gap-2">
            <History size={14} className="text-gray-500" />
            <h3 className="text-sm font-bold text-gray-900">سجل النقاط</h3>
          </div>
          
          {history.length === 0 ? (
            <p className="p-4 text-center text-gray-400 text-sm">لا توجد معاملات بعد</p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {history.map((item, i) => (
                <div key={item.id || i} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      item.type === 'earn' ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      {item.type === 'earn' ? (
                        <TrendingUp size={14} className="text-green-600" />
                      ) : (
                        <Gift size={14} className="text-orange-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-700">{item.description}</p>
                      <p className="text-[10px] text-gray-400">{formatDate(item.created_at)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${
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
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
          <p className="text-lg font-bold text-gray-900">{data.lifetime_points?.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">إجمالي النقاط المكتسبة</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-gray-200 text-center">
          <p className="text-lg font-bold text-[#FF6B00]">{data.redeemed_points?.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500">النقاط المستبدلة</p>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyCard;
