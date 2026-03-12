// /app/frontend/src/components/delivery/DriverAchievements.js
// مكون الإنجازات والشارات للسائقين

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Medal, Star, Zap, Heart, Target,
  ChevronDown, ChevronUp, Lock, CheckCircle, Gift
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const RARITY_COLORS = {
  common: { bg: 'from-gray-400 to-gray-500', text: 'text-gray-600', label: 'عادي' },
  uncommon: { bg: 'from-orange-400 to-orange-500', text: 'text-orange-600', label: 'غير شائع' },
  rare: { bg: 'from-blue-400 to-blue-500', text: 'text-green-600', label: 'نادر' },
  legendary: { bg: 'from-purple-400 to-yellow-400', text: 'text-purple-600', label: 'أسطوري' }
};

const CATEGORY_ICONS = {
  orders: <Trophy size={16} />,
  rating: <Star size={16} />,
  speed: <Zap size={16} />,
  loyalty: <Heart size={16} />,
  special: <Target size={16} />
};

const DriverAchievements = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newUnlocked, setNewUnlocked] = useState([]);

  useEffect(() => {
    fetchAchievements();
    checkNewAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const res = await axios.get(`${API}/api/achievements/my-achievements`);
      setData(res.data);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNewAchievements = async () => {
    try {
      const res = await axios.post(`${API}/api/achievements/check-and-unlock`);
      if (res.data.new_unlocked && res.data.new_unlocked.length > 0) {
        setNewUnlocked(res.data.new_unlocked);
        fetchAchievements(); // Refresh data
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
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

  const { achievements, stats, categories } = data;
  
  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  const unlockedCount = achievements.filter(a => a.is_unlocked).length;

  return (
    <>
      {/* New Achievement Modal */}
      <AnimatePresence>
        {newUnlocked.length > 0 && (
          <NewAchievementModal 
            achievements={newUnlocked} 
            onClose={() => setNewUnlocked([])} 
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-l from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 overflow-hidden mb-2"
      >
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-2.5 flex items-center justify-between"
          data-testid="achievements-toggle"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow">
              <Medal size={16} className="text-white" />
            </div>
            <div className="text-right">
              <h3 className="font-bold text-gray-900 text-xs">الإنجازات</h3>
              <p className="text-[10px] text-gray-500">
                {unlockedCount}/{stats.total_achievements} • {stats.completion_percent}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {formatPrice(stats.total_rewards_earned)}
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
              {/* Progress Bar */}
              <div className="bg-white rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">تقدمك الإجمالي</span>
                  <span className="text-sm font-bold text-indigo-600">{stats.completion_percent}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.completion_percent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-l from-indigo-500 to-purple-500 rounded-full"
                  />
                </div>
              </div>

              {/* Category Filters */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  الكل
                </button>
                {Object.entries(categories).map(([key, cat]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                      selectedCategory === key
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Achievements Grid */}
              <div className="grid grid-cols-2 gap-3">
                {filteredAchievements.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

const AchievementCard = ({ achievement }) => {
  const { is_unlocked, progress, rarity } = achievement;
  const rarityStyle = RARITY_COLORS[rarity] || RARITY_COLORS.common;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative rounded-xl overflow-hidden ${
        is_unlocked 
          ? 'bg-white border-2 border-indigo-300' 
          : 'bg-gray-50 border border-gray-200 opacity-75'
      }`}
    >
      {/* Rarity Badge */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${rarityStyle.bg}`} />
      
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className={`text-3xl ${!is_unlocked && 'grayscale opacity-50'}`}>
            {achievement.icon}
          </div>
          {is_unlocked ? (
            <CheckCircle size={16} className="text-orange-500" />
          ) : (
            <Lock size={16} className="text-gray-400" />
          )}
        </div>
        
        <h4 className={`font-bold text-sm ${is_unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
          {achievement.title}
        </h4>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
          {achievement.description}
        </p>
        
        {/* Progress Bar */}
        {!is_unlocked && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">{progress.current}/{progress.target}</span>
              <span className="text-indigo-600 font-bold">{progress.percent}%</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Reward */}
        <div className={`mt-2 flex items-center gap-1 text-xs ${is_unlocked ? 'text-orange-600' : 'text-gray-400'}`}>
          <Gift size={12} />
          <span>{formatPrice(achievement.reward)}</span>
        </div>
        
        {/* Rarity Label */}
        <div className={`mt-1 text-xs ${rarityStyle.text}`}>
          {rarityStyle.label}
        </div>
      </div>
    </motion.div>
  );
};

const NewAchievementModal = ({ achievements, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const current = achievements[currentIndex];

  const handleNext = () => {
    if (currentIndex < achievements.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={handleNext}
    >
      <motion.div
        initial={{ scale: 0.5, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0.5, opacity: 0 }}
        className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 max-w-sm w-full text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -20, opacity: 1 }}
              animate={{ 
                y: 400, 
                opacity: 0,
                x: Math.random() * 200 - 100
              }}
              transition={{ 
                duration: 2,
                delay: Math.random() * 0.5,
                repeat: Infinity
              }}
              className="absolute text-2xl"
              style={{ left: `${Math.random() * 100}%` }}
            >
              {['🎉', '✨', '🌟', '⭐'][Math.floor(Math.random() * 4)]}
            </motion.div>
          ))}
        </div>

        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5, repeat: 3 }}
          className="text-7xl mb-4"
        >
          {current.icon}
        </motion.div>
        
        <h2 className="text-white text-2xl font-bold mb-2">إنجاز جديد!</h2>
        <h3 className="text-yellow-300 text-xl font-bold mb-2">{current.title}</h3>
        <p className="text-white/80 text-sm mb-4">{current.description}</p>
        
        <div className="bg-white/20 rounded-xl p-3 mb-4">
          <p className="text-white/70 text-xs">مكافأتك</p>
          <p className="text-yellow-300 text-2xl font-bold">{formatPrice(current.reward)}</p>
        </div>
        
        <button
          onClick={handleNext}
          className="bg-white text-indigo-600 px-6 py-2 rounded-xl font-bold hover:bg-gray-100 transition-colors"
        >
          {currentIndex < achievements.length - 1 ? 'التالي' : 'رائع!'}
        </button>
        
        {achievements.length > 1 && (
          <p className="text-white/50 text-xs mt-3">
            {currentIndex + 1} / {achievements.length}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default DriverAchievements;
