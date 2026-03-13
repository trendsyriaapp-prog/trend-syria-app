// /app/frontend/src/components/delivery/NotificationToneSettings.js
// إعدادات نغمات الإشعارات للسائق

import { useState, useEffect } from 'react';
import { Volume2, Play, Check } from 'lucide-react';
import { AVAILABLE_TONES, saveTonePreference } from '../../hooks/useNotificationSound';
import useNotificationSound from '../../hooks/useNotificationSound';

// أنواع الإشعارات
const NOTIFICATION_TYPES = [
  { id: 'food', name: 'طلبات الطعام', emoji: '🍔', description: 'عند وصول طلب طعام جديد' },
  { id: 'product', name: 'طلبات المنتجات', emoji: '📦', description: 'عند وصول طلب منتجات جديد' },
  { id: 'priority', name: 'طلبات الأولوية', emoji: '⚡', description: 'عند توفر طلب من نفس المطعم' },
];

const NotificationToneSettings = ({ theme = 'dark' }) => {
  const { previewTone } = useNotificationSound();
  const [selectedTones, setSelectedTones] = useState({});
  const [playingTone, setPlayingTone] = useState(null);

  // تحميل النغمات المحفوظة
  useEffect(() => {
    const loadSavedTones = () => {
      const saved = {};
      NOTIFICATION_TYPES.forEach(type => {
        const savedTone = localStorage.getItem(`notificationTone_${type.id}`);
        saved[type.id] = savedTone || getDefaultTone(type.id);
      });
      setSelectedTones(saved);
    };
    loadSavedTones();
  }, []);

  // النغمات الافتراضية
  const getDefaultTone = (typeId) => {
    switch (typeId) {
      case 'food': return 'cheerful';
      case 'product': return 'classic';
      case 'priority': return 'urgent';
      default: return 'bell';
    }
  };

  // معاينة النغمة
  const handlePreview = (toneId) => {
    setPlayingTone(toneId);
    previewTone(toneId);
    setTimeout(() => setPlayingTone(null), 500);
  };

  // اختيار نغمة لنوع معين
  const handleSelectTone = (typeId, toneId) => {
    setSelectedTones(prev => ({ ...prev, [typeId]: toneId }));
    saveTonePreference(typeId, toneId);
    // تشغيل النغمة كتأكيد
    previewTone(toneId);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`rounded-xl p-4 border ${
      isDark 
        ? 'bg-[#1a1a1a] border-[#333]' 
        : 'bg-white border-gray-200'
    }`}>
      {/* العنوان */}
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isDark ? 'bg-purple-500/20' : 'bg-purple-100'
        }`}>
          <Volume2 size={20} className="text-purple-500" />
        </div>
        <div>
          <h2 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
            نغمات الإشعارات
          </h2>
          <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            اختر نغمة مميزة لكل نوع من الطلبات
          </p>
        </div>
      </div>

      {/* أنواع الإشعارات */}
      <div className="space-y-4">
        {NOTIFICATION_TYPES.map(type => (
          <div key={type.id} className={`p-3 rounded-xl ${
            isDark ? 'bg-[#252525]' : 'bg-gray-50'
          }`}>
            {/* رأس النوع */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{type.emoji}</span>
              <div>
                <h3 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {type.name}
                </h3>
                <p className={`text-[9px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  {type.description}
                </p>
              </div>
            </div>

            {/* قائمة النغمات */}
            <div className="grid grid-cols-3 gap-2">
              {AVAILABLE_TONES.map(tone => {
                const isSelected = selectedTones[type.id] === tone.id;
                const isPlaying = playingTone === tone.id;
                
                return (
                  <button
                    key={tone.id}
                    onClick={() => handleSelectTone(type.id, tone.id)}
                    className={`relative p-2 rounded-lg text-center transition-all ${
                      isSelected
                        ? isDark
                          ? 'bg-green-500/20 border-2 border-green-500'
                          : 'bg-green-50 border-2 border-green-500'
                        : isDark
                          ? 'bg-[#1a1a1a] border border-[#444] hover:border-[#666]'
                          : 'bg-white border border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* أيقونة الاختيار */}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                    
                    {/* الإيموجي */}
                    <div className={`text-lg mb-1 ${isPlaying ? 'animate-bounce' : ''}`}>
                      {tone.emoji}
                    </div>
                    
                    {/* الاسم */}
                    <div className={`text-[10px] font-bold ${
                      isSelected
                        ? 'text-green-500'
                        : isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {tone.name}
                    </div>
                    
                    {/* زر المعاينة */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(tone.id);
                      }}
                      className={`mt-1 p-1 rounded-full transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-[#333] hover:bg-[#444] text-gray-400'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                      }`}
                    >
                      <Play size={10} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ملاحظة */}
      <div className={`mt-4 p-3 rounded-lg text-center ${
        isDark ? 'bg-[#252525]' : 'bg-gray-50'
      }`}>
        <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          💡 انقر على أي نغمة لاختيارها، أو اضغط ▶ للمعاينة فقط
        </p>
      </div>
    </div>
  );
};

export default NotificationToneSettings;
