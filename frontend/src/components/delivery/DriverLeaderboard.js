// /app/frontend/src/components/delivery/DriverLeaderboard.js
// لوحة صدارة السائقين - أفضل 10 سائقين هذا الشهر

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Medal, Crown, ChevronDown, ChevronUp, 
  Star, TrendingUp, Calendar, Users, Gift
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const DriverLeaderboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`${API}/api/delivery/leaderboard`);
      setData(res.data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse mb-4">
        <div className="h-16 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { leaderboard, my_position, rewards, month_info, total_participants } = data;
  const isInTop3 = my_position.rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-l from-amber-50 to-yellow-50 rounded-xl border border-amber-200 overflow-hidden mb-2"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2.5 flex items-center justify-between"
        data-testid="leaderboard-toggle"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center shadow">
            <Trophy size={16} className="text-white" />
          </div>
          <div className="text-right">
            <h3 className="font-bold text-gray-900 text-xs">لوحة الصدارة</h3>
            <p className="text-[10px] text-gray-500">
              {month_info.name} • {total_participants} مشارك
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            isInTop3 ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700'
          }`}>
            #{my_position.rank}
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4 pb-4"
          >
            {/* Rewards Info */}
            <div className="bg-white rounded-xl p-3 mb-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Gift size={16} className="text-amber-500" />
                <span className="text-sm font-bold text-gray-700">جوائز نهاية الشهر</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gradient-to-b from-amber-100 to-amber-50 rounded-lg p-2">
                  <span className="text-2xl">🥇</span>
                  <p className="text-xs font-bold text-amber-700">{formatPrice(rewards.first)}</p>
                </div>
                <div className="bg-gradient-to-b from-gray-100 to-gray-50 rounded-lg p-2">
                  <span className="text-2xl">🥈</span>
                  <p className="text-xs font-bold text-gray-600">{formatPrice(rewards.second)}</p>
                </div>
                <div className="bg-gradient-to-b from-orange-100 to-orange-50 rounded-lg p-2">
                  <span className="text-2xl">🥉</span>
                  <p className="text-xs font-bold text-orange-700">{formatPrice(rewards.third)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                متبقي {month_info.days_remaining} يوم على نهاية الشهر
              </p>
            </div>

            {/* My Position Card (if not in top 10) */}
            {!my_position.is_in_top_10 && (
              <div className="bg-blue-50 rounded-xl p-3 mb-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      #{my_position.rank}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">مركزك الحالي</p>
                      <p className="text-xs text-gray-500">
                        {my_position.data.orders_count} طلب • {formatPrice(my_position.data.earnings)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-bold">{my_position.data.avg_rating}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top 10 List */}
            <div className="space-y-2">
              {leaderboard.map((driver, index) => (
                <LeaderboardRow 
                  key={driver.driver_id}
                  driver={driver}
                  isMe={driver.driver_id === my_position.data.driver_id}
                  index={index}
                />
              ))}
            </div>

            {/* Motivation Message */}
            {my_position.rank > 3 && (
              <div className="mt-4 p-3 bg-gradient-to-l from-purple-50 to-indigo-50 rounded-xl border border-purple-200 text-center">
                <p className="text-sm text-purple-700">
                  {my_position.rank <= 10 
                    ? `أنت قريب من القمة! ${3 - my_position.rank < 0 ? Math.abs(3 - my_position.rank) : 0} مراكز تفصلك عن الجائزة 🎯`
                    : 'استمر في التوصيل لتصعد في الترتيب! 💪'
                  }
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const LeaderboardRow = ({ driver, isMe, index }) => {
  const getRankStyle = (rank) => {
    if (rank === 1) return 'bg-gradient-to-l from-amber-400 to-yellow-500 text-white';
    if (rank === 2) return 'bg-gradient-to-l from-gray-400 to-gray-500 text-white';
    if (rank === 3) return 'bg-gradient-to-l from-orange-400 to-orange-500 text-white';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-white rounded-xl p-3 border ${
        isMe 
          ? 'border-blue-400 ring-2 ring-blue-200' 
          : 'border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Rank Badge */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getRankStyle(driver.rank)}`}>
          {driver.badge || `#${driver.rank}`}
        </div>

        {/* Driver Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className={`font-bold ${isMe ? 'text-blue-600' : 'text-gray-900'}`}>
              {driver.name}
              {isMe && <span className="text-xs text-blue-500 mr-1">(أنت)</span>}
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{driver.orders_count} طلب</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Star size={10} className="text-amber-400 fill-amber-400" />
              {driver.avg_rating}
            </span>
          </div>
        </div>

        {/* Earnings & Reward */}
        <div className="text-left">
          <p className="text-sm font-bold text-gray-900">{formatPrice(driver.earnings)}</p>
          {driver.reward > 0 && (
            <p className="text-xs text-green-600 font-bold">
              +{formatPrice(driver.reward)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DriverLeaderboard;
