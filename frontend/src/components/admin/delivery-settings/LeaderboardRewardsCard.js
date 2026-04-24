// /app/frontend/src/components/admin/delivery-settings/LeaderboardRewardsCard.js
// بطاقة جوائز الصدارة

import { Trophy, Gift, Save, RefreshCw } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const LeaderboardRewardsCard = ({ 
  settings, 
  setSettings, 
  saving, 
  onSave 
}) => {
  const { leaderboard_rewards } = settings;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-yellow-500 to-amber-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <Trophy size={18} />
          <div>
            <h2 className="font-bold text-sm">جوائز الصدارة الأسبوعية</h2>
            <p className="text-sm text-white/80">مكافآت لأفضل السائقين كل أسبوع</p>
          </div>
        </div>
      </div>
      
      <div className="p-2 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {/* المركز الأول */}
          <div className="bg-yellow-50 rounded-lg p-4 border-2 border-yellow-400 text-center">
            <div className="w-12 h-12 mx-auto bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-2 shadow-lg">
              <span className="text-2xl">🥇</span>
            </div>
            <h3 className="font-bold text-yellow-800 mb-2">الأول</h3>
            <input
              type="number"
              value={leaderboard_rewards?.first || ''}
              onChange={(e) => setSettings({
                ...settings,
                leaderboard_rewards: {
                  ...leaderboard_rewards,
                  first: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                }
              })}
              className="w-full p-2 border border-yellow-300 rounded-lg text-center font-bold text-yellow-700"
              min={0}
              step={5000}
            />
            <p className="text-xs text-yellow-600 mt-1">ل.س</p>
          </div>

          {/* المركز الثاني */}
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-300 text-center">
            <div className="w-12 h-12 mx-auto bg-gradient-to-b from-gray-300 to-gray-500 rounded-full flex items-center justify-center mb-2 shadow-lg">
              <span className="text-2xl">🥈</span>
            </div>
            <h3 className="font-bold text-gray-700 mb-2">الثاني</h3>
            <input
              type="number"
              value={leaderboard_rewards?.second || ''}
              onChange={(e) => setSettings({
                ...settings,
                leaderboard_rewards: {
                  ...leaderboard_rewards,
                  second: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                }
              })}
              className="w-full p-2 border border-gray-300 rounded-lg text-center font-bold text-gray-700"
              min={0}
              step={5000}
            />
            <p className="text-xs text-gray-600 mt-1">ل.س</p>
          </div>

          {/* المركز الثالث */}
          <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-300 text-center">
            <div className="w-12 h-12 mx-auto bg-gradient-to-b from-orange-400 to-orange-600 rounded-full flex items-center justify-center mb-2 shadow-lg">
              <span className="text-2xl">🥉</span>
            </div>
            <h3 className="font-bold text-orange-700 mb-2">الثالث</h3>
            <input
              type="number"
              value={leaderboard_rewards?.third || ''}
              onChange={(e) => setSettings({
                ...settings,
                leaderboard_rewards: {
                  ...leaderboard_rewards,
                  third: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                }
              })}
              className="w-full p-2 border border-orange-300 rounded-lg text-center font-bold text-orange-700"
              min={0}
              step={5000}
            />
            <p className="text-xs text-orange-600 mt-1">ل.س</p>
          </div>
        </div>

        {/* ملخص الجوائز */}
        <div className="p-3 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="text-yellow-600" size={18} />
              <span className="font-medium text-yellow-800">إجمالي الجوائز الأسبوعية</span>
            </div>
            <span className="font-bold text-yellow-700">
              {formatPrice((leaderboard_rewards?.first || 0) + (leaderboard_rewards?.second || 0) + (leaderboard_rewards?.third || 0))}
            </span>
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-gradient-to-l from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          حفظ جوائز الصدارة
        </button>
      </div>
    </div>
  );
};

export default LeaderboardRewardsCard;
