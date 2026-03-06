// /app/frontend/src/components/delivery/DriverChallenges.js
// مكون التحديات والمكافآت للسائقين

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Gift, Clock, Trophy, CheckCircle, 
  ChevronDown, ChevronUp, Zap, Star, AlertCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const DriverChallenges = () => {
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const res = await axios.get(`${API}/api/challenges/active`);
      setChallenges(res.data);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (challengeId) => {
    setClaiming(challengeId);
    try {
      const res = await axios.post(`${API}/api/challenges/claim/${challengeId}`);
      alert(`🎉 ${res.data.message}\nتم إضافة ${formatPrice(res.data.reward_amount)} لمحفظتك!`);
      fetchChallenges();
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-16 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (challenges.length === 0) {
    return null; // لا تحديات نشطة
  }

  const activeChallenges = challenges.filter(c => !c.my_progress?.is_claimed);
  const completedCount = challenges.filter(c => c.my_progress?.is_completed && !c.my_progress?.is_claimed).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-l from-purple-50 to-indigo-50 rounded-xl border border-purple-200 overflow-hidden mb-4"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between"
        data-testid="challenges-toggle"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
            <Target size={20} className="text-white" />
          </div>
          <div className="text-right">
            <h3 className="font-bold text-gray-900">التحديات والمكافآت</h3>
            <p className="text-xs text-gray-500">
              {activeChallenges.length} تحدي نشط
              {completedCount > 0 && (
                <span className="text-green-600 font-bold mr-2">
                  • {completedCount} جاهز للمطالبة!
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {completedCount > 0 && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
              {completedCount}
            </span>
          )}
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Challenges List */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4 pb-4 space-y-3"
          >
            {challenges.map((challenge) => (
              <ChallengeCard 
                key={challenge.id} 
                challenge={challenge} 
                onClaim={handleClaim}
                claiming={claiming === challenge.id}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ChallengeCard = ({ challenge, onClaim, claiming }) => {
  const { my_progress, time_remaining } = challenge;
  const isCompleted = my_progress?.is_completed;
  const isClaimed = my_progress?.is_claimed;
  const progressPercent = my_progress?.progress_percent || 0;

  const getChallengeTypeLabel = (type) => {
    switch (type) {
      case 'weekly': return 'أسبوعي';
      case 'monthly': return 'شهري';
      default: return 'خاص';
    }
  };

  const getChallengeTypeColor = (type) => {
    switch (type) {
      case 'weekly': return 'bg-blue-100 text-blue-700';
      case 'monthly': return 'bg-purple-100 text-purple-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  return (
    <motion.div
      layout
      className={`bg-white rounded-xl border overflow-hidden ${
        isCompleted && !isClaimed 
          ? 'border-green-300 ring-2 ring-green-200' 
          : isClaimed 
            ? 'border-gray-200 opacity-60' 
            : 'border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${getChallengeTypeColor(challenge.challenge_type)}`}>
              {getChallengeTypeLabel(challenge.challenge_type)}
            </span>
            {time_remaining?.is_ending_soon && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                <AlertCircle size={10} />
                ينتهي قريباً
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-amber-500">
            <Gift size={14} />
            <span className="text-sm font-bold">{formatPrice(challenge.reward_amount)}</span>
          </div>
        </div>
        
        <h4 className="font-bold text-gray-900">{challenge.title}</h4>
        <p className="text-xs text-gray-500 mt-1">{challenge.description}</p>
      </div>

      {/* Progress */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">
            {my_progress?.completed_orders || 0} / {challenge.target_orders} طلب
          </span>
          <span className="text-xs font-bold text-purple-600">{progressPercent}%</span>
        </div>
        
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${
              isCompleted ? 'bg-green-500' : 'bg-purple-500'
            }`}
          />
        </div>

        {/* Time Remaining */}
        {!isClaimed && (
          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
            <Clock size={12} />
            <span>
              متبقي: {time_remaining?.days || 0} يوم و {time_remaining?.hours || 0} ساعة
            </span>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-3">
          {isClaimed ? (
            <div className="flex items-center justify-center gap-2 text-green-600 py-2">
              <CheckCircle size={16} />
              <span className="text-sm font-bold">تم الحصول على المكافأة</span>
            </div>
          ) : isCompleted ? (
            <button
              onClick={() => onClaim(challenge.id)}
              disabled={claiming}
              className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              data-testid={`claim-btn-${challenge.id}`}
            >
              {claiming ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <>
                  <Trophy size={16} />
                  احصل على المكافأة!
                </>
              )}
            </button>
          ) : (
            <div className="text-center py-2">
              <span className="text-xs text-gray-500">
                متبقي {my_progress?.remaining_orders || challenge.target_orders} طلب للإكمال
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DriverChallenges;
