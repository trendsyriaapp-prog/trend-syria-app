// /app/frontend/src/components/delivery/AchievementsTab.js
// واجهة الإنجازات والمكافآت للسائق

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Trophy, Star, Target, Gift, Lock, CheckCircle, 
  Flame, Clock, TrendingUp, Award, Zap, Crown,
  RefreshCw, ChevronRight
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const RARITY_COLORS = {
  common: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600', label: 'عادي' },
  uncommon: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-600', label: 'غير شائع' },
  rare: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-600', label: 'نادر' },
  epic: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-600', label: 'ملحمي' },
  legendary: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-600', label: 'أسطوري' }
};

const CATEGORY_ICONS = {
  orders: Target,
  rating: Star,
  speed: Zap,
  streak: Flame,
  special: Gift
};

const AchievementsTab = () => {
  const { toast } = useToast();
  const [achievements, setAchievements] = useState([]);
  const [quests, setQuests] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('achievements');
  const [claimingId, setClaimingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [achievementsRes, questsRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/achievements/my`, { headers }),
        axios.get(`${API}/api/achievements/quests/active`, { headers }),
        axios.get(`${API}/api/achievements/stats`, { headers })
      ]);

      setAchievements(achievementsRes.data.achievements || []);
      setQuests(questsRes.data.quests || []);
      setStats(statsRes.data || {});
    } catch (err) {
      console.error('Error fetching achievements:', err);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (achievementId) => {
    setClaimingId(achievementId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/achievements/${achievementId}/claim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: '🎉 تهانينا!', description: 'تم استلام المكافأة بنجاح' });
      fetchData();
    } catch (err) {
      toast({ 
        title: 'خطأ', 
        description: err.response?.data?.detail || 'فشل استلام المكافأة',
        variant: 'destructive'
      });
    } finally {
      setClaimingId(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SY').format(amount) + ' ل.س';
  };

  const getProgress = (achievement) => {
    if (!achievement.requirement) return 0;
    const current = achievement.current_progress || 0;
    const target = achievement.requirement.value || 1;
    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={32} className="text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl p-3 text-white">
          <Trophy size={24} className="mb-1" />
          <p className="text-2xl font-bold">{stats.unlocked_count || 0}</p>
          <p className="text-xs opacity-90">إنجاز مفتوح</p>
        </div>
        <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl p-3 text-white">
          <Gift size={24} className="mb-1" />
          <p className="text-2xl font-bold">{formatCurrency(stats.total_rewards || 0)}</p>
          <p className="text-xs opacity-90">مكافآت مستلمة</p>
        </div>
        <div className="bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl p-3 text-white">
          <Flame size={24} className="mb-1" />
          <p className="text-2xl font-bold">{stats.current_streak || 0}</p>
          <p className="text-xs opacity-90">أيام متتالية</p>
        </div>
      </div>

      {/* تبويبات */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'achievements' 
              ? 'bg-white text-orange-600 shadow-sm' 
              : 'text-gray-600'
          }`}
        >
          <Trophy size={18} />
          الإنجازات
        </button>
        <button
          onClick={() => setActiveTab('quests')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'quests' 
              ? 'bg-white text-orange-600 shadow-sm' 
              : 'text-gray-600'
          }`}
        >
          <Target size={18} />
          المهام اليومية
        </button>
      </div>

      {/* الإنجازات */}
      {activeTab === 'achievements' && (
        <div className="space-y-3">
          {achievements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Trophy size={48} className="mx-auto mb-3 text-gray-300" />
              <p>لا توجد إنجازات بعد</p>
              <p className="text-sm">ابدأ بتوصيل الطلبات لفتح الإنجازات!</p>
            </div>
          ) : (
            achievements.map(achievement => {
              const rarity = RARITY_COLORS[achievement.rarity] || RARITY_COLORS.common;
              const CategoryIcon = CATEGORY_ICONS[achievement.category] || Trophy;
              const progress = getProgress(achievement);
              const isUnlocked = achievement.unlocked;
              const canClaim = isUnlocked && !achievement.reward_claimed;

              return (
                <div
                  key={achievement.id}
                  className={`bg-white rounded-xl border-2 overflow-hidden transition-all ${
                    isUnlocked ? rarity.border : 'border-gray-200 opacity-75'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* الأيقونة */}
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                        isUnlocked ? rarity.bg : 'bg-gray-100'
                      }`}>
                        {isUnlocked ? achievement.icon : <Lock size={24} className="text-gray-400" />}
                      </div>

                      {/* المعلومات */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-bold ${isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                            {achievement.title}
                          </h3>
                          {isUnlocked && (
                            <CheckCircle size={16} className="text-green-500" />
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${rarity.bg} ${rarity.text}`}>
                            {rarity.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{achievement.description}</p>

                        {/* شريط التقدم */}
                        {!isUnlocked && (
                          <div className="mb-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>التقدم</span>
                              <span>{achievement.current_progress || 0} / {achievement.requirement?.value || 0}</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* المكافأة */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-green-600">
                            <Gift size={14} />
                            <span className="text-sm font-medium">{formatCurrency(achievement.reward)}</span>
                          </div>

                          {canClaim && (
                            <button
                              onClick={() => claimReward(achievement.id)}
                              disabled={claimingId === achievement.id}
                              className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 flex items-center gap-1"
                            >
                              {claimingId === achievement.id ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <Gift size={14} />
                              )}
                              استلام
                            </button>
                          )}

                          {achievement.reward_claimed && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <CheckCircle size={12} />
                              تم الاستلام
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* المهام اليومية */}
      {activeTab === 'quests' && (
        <div className="space-y-3">
          {quests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target size={48} className="mx-auto mb-3 text-gray-300" />
              <p>لا توجد مهام نشطة حالياً</p>
              <p className="text-sm">تحقق لاحقاً للمهام الجديدة!</p>
            </div>
          ) : (
            quests.map(quest => {
              const progress = quest.current_progress || 0;
              const target = quest.target || 1;
              const progressPercent = Math.min((progress / target) * 100, 100);
              const isCompleted = progress >= target;

              return (
                <div
                  key={quest.id}
                  className={`bg-white rounded-xl border-2 p-4 ${
                    isCompleted ? 'border-green-400 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isCompleted ? 'bg-green-500 text-white' : 'bg-orange-100'
                    }`}>
                      {isCompleted ? <CheckCircle size={24} /> : <Target size={24} className="text-orange-600" />}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{quest.title}</h3>
                      <p className="text-sm text-gray-600">{quest.description}</p>

                      {/* شريط التقدم */}
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{progress} / {target}</span>
                          <span className="text-green-600 font-medium">+{formatCurrency(quest.reward)}</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-orange-400 to-orange-600'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* الوقت المتبقي */}
                      {quest.expires_at && !isCompleted && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <Clock size={12} />
                          <span>ينتهي: {new Date(quest.expires_at).toLocaleTimeString('ar-SY')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* نصيحة */}
          <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap size={20} className="text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">نصيحة</h4>
                <p className="text-sm text-gray-600">
                  أكمل المهام اليومية للحصول على مكافآت إضافية! المهام تتجدد كل يوم.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementsTab;
