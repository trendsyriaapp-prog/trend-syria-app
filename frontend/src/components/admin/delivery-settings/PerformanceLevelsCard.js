// /app/frontend/src/components/admin/delivery-settings/PerformanceLevelsCard.js
// بطاقة مستويات أداء السائقين

import { Award, Save, RefreshCw, Star, Trophy } from 'lucide-react';

const PerformanceLevelsCard = ({ 
  settings, 
  setSettings, 
  saving, 
  onSave 
}) => {
  const { performance_levels } = settings;

  const levels = [
    { key: 'beginner_max', label: 'مبتدئ', emoji: '⭐', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-600' },
    { key: 'bronze_max', label: 'برونزي', emoji: '🥉', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-600' },
    { key: 'silver_max', label: 'فضي', emoji: '🥈', bgColor: 'bg-gray-50', borderColor: 'border-gray-300', textColor: 'text-gray-600' },
    { key: 'gold_max', label: 'ذهبي', emoji: '🥇', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-300', textColor: 'text-yellow-600' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-amber-500 to-orange-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <Award size={18} />
          <div>
            <h2 className="font-bold text-xs">⭐ مستويات الأداء</h2>
            <p className="text-[10px] text-white/80">الحد الأقصى للطلبات لكل مستوى</p>
          </div>
        </div>
      </div>
      
      <div className="p-2">
        <div className="grid grid-cols-2 gap-2 mb-2">
          {levels.map((level) => (
            <div key={level.key} className={`${level.bgColor} rounded-lg p-2 border ${level.borderColor}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-lg">{level.emoji}</span>
                <h3 className="font-bold text-xs text-gray-800">{level.label}</h3>
              </div>
              <input
                type="number"
                value={performance_levels?.[level.key] || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  performance_levels: {
                    ...performance_levels,
                    [level.key]: parseInt(e.target.value) || 0
                  }
                })}
                className={`w-full bg-white border ${level.borderColor} rounded-lg py-2 px-3 text-center font-bold ${level.textColor} text-sm`}
              />
              <p className="text-[9px] text-gray-500 text-center mt-1">طلب كحد أقصى</p>
            </div>
          ))}
        </div>
        
        {/* مستوى الماسي */}
        <div className="bg-purple-50 rounded-lg p-2 border border-purple-200 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy className="text-purple-600" size={16} />
            <span className="font-bold text-xs text-purple-800">💎 ماسي</span>
          </div>
          <p className="text-[10px] text-purple-600">
            أكثر من {performance_levels?.gold_max || 99} طلب
          </p>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="mt-2 w-full bg-gradient-to-l from-amber-500 to-orange-500 text-white py-2 rounded-lg font-bold text-sm hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          حفظ مستويات الأداء
        </button>
      </div>
    </div>
  );
};

export default PerformanceLevelsCard;
