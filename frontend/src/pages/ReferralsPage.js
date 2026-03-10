// /app/frontend/src/pages/ReferralsPage.js
// صفحة الإحالات - دعوة الأصدقاء والحصول على مكافآت

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Gift, Users, Copy, Check, Share2, ArrowRight, 
  Wallet, Clock, ChevronRight, Star, Trophy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const ReferralsPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (token) {
      fetchReferralData();
    }
  }, [token]);

  const fetchReferralData = async () => {
    try {
      const [codeRes, referralsRes] = await Promise.all([
        axios.get(`${API}/api/referrals/my-code`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/api/referrals/my-referrals`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setReferralData(codeRes.data);
      setReferrals(referralsRes.data || []);
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (referralData?.code) {
      navigator.clipboard.writeText(referralData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "تم النسخ!", description: "تم نسخ كود الإحالة" });
    }
  };

  const shareLink = async () => {
    if (referralData?.share_link) {
      const shareData = {
        title: 'ترند سورية',
        text: `سجّل في ترند سورية واحصل على خصم ${referralData.rewards.friend_gets} باستخدام كودي: ${referralData.code}`,
        url: referralData.share_link
      };
      
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          copyCode();
        }
      } else {
        copyCode();
      }
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('ar-SY', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center">
          <Gift size={64} className="mx-auto text-purple-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">سجّل دخولك أولاً</h2>
          <p className="text-gray-500 mb-4">لمشاهدة كود الإحالة الخاص بك</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-3 bg-purple-500 text-white rounded-xl font-bold"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 text-white px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/20 rounded-full">
            <ArrowRight size={20} />
          </button>
          <h1 className="text-xl font-bold">دعوة الأصدقاء</h1>
        </div>
        
        {/* Hero */}
        <div className="text-center py-4">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">ادعُ أصدقاءك واربح!</h2>
          <p className="text-white/80">
            احصل على <span className="font-bold text-yellow-300">{referralData?.rewards?.you_get?.toLocaleString()} ل.س</span> لكل صديق يطلب
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6 space-y-4">
        {/* Referral Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-2">كود الإحالة الخاص بك</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl px-4 py-3 text-center">
                <span className="text-2xl font-bold text-purple-700 font-mono tracking-wider">
                  {referralData?.code}
                </span>
              </div>
              <button
                onClick={copyCode}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>
          
          {/* Share Button */}
          <button
            onClick={shareLink}
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-4 font-bold flex items-center justify-center gap-2"
          >
            <Share2 size={20} />
            مشاركة الكود مع الأصدقاء
          </button>
        </motion.div>

        {/* How it Works */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star size={18} className="text-yellow-500" />
            كيف يعمل؟
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">شارك كودك</p>
                <p className="text-sm text-gray-500">أرسل الكود لأصدقائك عبر واتساب أو أي تطبيق</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-bold">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">صديقك يسجّل ويطلب</p>
                <p className="text-sm text-gray-500">يحصل على {referralData?.rewards?.friend_gets}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">تحصل على مكافأتك!</p>
                <p className="text-sm text-gray-500">{referralData?.rewards?.you_get?.toLocaleString()} ل.س تضاف لمحفظتك</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Users size={24} className="mx-auto text-purple-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {referralData?.stats?.total_referrals || 0}
            </div>
            <p className="text-xs text-gray-500">دعوات</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Trophy size={24} className="mx-auto text-green-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900">
              {referralData?.stats?.successful_referrals || 0}
            </div>
            <p className="text-xs text-gray-500">ناجحة</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 text-center shadow-sm">
            <Wallet size={24} className="mx-auto text-yellow-500 mb-2" />
            <div className="text-lg font-bold text-gray-900">
              {(referralData?.stats?.total_earnings || 0).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">أرباحك</p>
          </div>
        </div>

        {/* My Referrals List */}
        {referrals.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-4">أصدقاؤك المُحالون</h3>
            <div className="space-y-3">
              {referrals.map((ref) => (
                <div 
                  key={ref.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      ref.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                    }`}>
                      {ref.status === 'completed' ? (
                        <Check size={18} className="text-green-600" />
                      ) : (
                        <Clock size={18} className="text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{ref.referee_name || 'صديق'}</p>
                      <p className="text-xs text-gray-500">{formatDate(ref.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    {ref.status === 'completed' ? (
                      <span className="text-green-600 font-bold">
                        +{ref.referrer_reward?.toLocaleString()} ل.س
                      </span>
                    ) : (
                      <span className="text-yellow-600 text-sm">بانتظار أول طلب</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {referrals.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <Users size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-2">لم تقم بدعوة أي صديق بعد</p>
            <p className="text-sm text-gray-400">شارك كودك الآن وابدأ بكسب المكافآت!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReferralsPage;
