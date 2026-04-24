// /app/frontend/src/components/admin/delivery-settings/PerformanceLevelsCard.js
// بطاقة إعدادات مستويات الأداء

import { useState } from 'react';
import { Award, Save, RefreshCw, Star, Zap, Crown, Diamond, Trophy } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const PerformanceLevelsCard = ({ settings, setSettings }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/admin/settings/delivery/levels`, settings.performance_levels, {
        withCredentials: true
      });
      toast({ title: "تم الحفظ", description: "تم حفظ مستويات الأداء بنجاح" });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    }
    setSaving(false);
  };

  const levels = [
    { key: 'beginner_max', label: 'مبتدئ', icon: Star, color: 'blue', emoji: '⭐' },
    { key: 'bronze_max', label: 'برونزي', icon: Zap, color: 'orange', emoji: '🥉' },
    { key: 'silver_max', label: 'فضي', icon: Crown, color: 'gray', emoji: '🥈' },
    { key: 'gold_max', label: 'ذهبي', icon: Diamond, color: 'yellow', emoji: '🥇' },
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
            <div key={level.key} className={`bg-${level.color}-50 rounded-lg p-2 border border-${level.color}-200`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-lg">{level.emoji}</span>
                <h3 className="font-bold text-xs text-gray-800">{level.label}</h3>
              </div>
              <input
                type="number"
                value={settings.performance_levels?.[level.key] || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  performance_levels: {
                    ...settings.performance_levels,
                    [level.key]: parseInt(e.target.value) || 0
                  }
                })}
                className={`w-full bg-white border border-${level.color}-300 rounded-lg py-2 px-3 text-center font-bold text-${level.color}-600 text-sm`}
              />
              <p className="text-[9px] text-gray-500 text-center mt-1">طلب كحد أقصى</p>
            </div>
          ))}
        </div>
        
        {/* مستوى الماسي (ما فوق الذهبي) */}
        <div className="bg-purple-50 rounded-lg p-2 border border-purple-200 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Trophy className="text-purple-600" size={16} />
            <span className="font-bold text-xs text-purple-800">💎 ماسي</span>
          </div>
          <p className="text-[10px] text-purple-600">
            أكثر من {settings.performance_levels?.gold_max || 99} طلب
          </p>
        </div>

        <button
          onClick={handleSave}
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
