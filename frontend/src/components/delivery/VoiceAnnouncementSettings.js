// /app/frontend/src/components/delivery/VoiceAnnouncementSettings.js
// إعدادات الصوت الناطق (TTS) للسائق

import { useState, useEffect } from 'react';
import { Mic, Volume2, Play, Settings, RefreshCw } from 'lucide-react';

const VoiceAnnouncementSettings = ({ isDarkMode = true }) => {
  // إعدادات الصوت
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem('voiceAnnouncementEnabled') !== 'false';
  });
  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem('selectedVoiceName') || '';
  });
  const [volume, setVolume] = useState(() => {
    return parseFloat(localStorage.getItem('voiceVolume') || '1');
  });
  const [rate, setRate] = useState(() => {
    return parseFloat(localStorage.getItem('voiceRate') || '0.9');
  });
  const [pitch, setPitch] = useState(() => {
    return parseFloat(localStorage.getItem('voicePitch') || '1.1');
  });
  
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // تحميل الأصوات المتاحة
  useEffect(() => {
    const loadVoices = () => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        // فلترة الأصوات العربية أولاً
        const arabicVoices = voices.filter(v => v.lang.startsWith('ar'));
        const otherVoices = voices.filter(v => !v.lang.startsWith('ar'));
        
        // ترتيب: العربية أولاً، ثم الباقي
        setAvailableVoices([...arabicVoices, ...otherVoices]);
        
        // اختيار صوت عربي افتراضي إذا لم يكن محدداً
        if (!selectedVoice && arabicVoices.length > 0) {
          // البحث عن صوت Google أو Microsoft العربي
          const preferredVoice = arabicVoices.find(v => 
            v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Apple')
          ) || arabicVoices[0];
          setSelectedVoice(preferredVoice.name);
          localStorage.setItem('selectedVoiceName', preferredVoice.name);
        }
      }
    };

    loadVoices();
    // Chrome يتطلب انتظار حدث voiceschanged
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // حفظ الإعدادات
  const saveSettings = (key, value) => {
    localStorage.setItem(key, value.toString());
  };

  // تغيير حالة التفعيل
  const handleToggleVoice = () => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    saveSettings('voiceAnnouncementEnabled', newValue);
  };

  // تغيير الصوت
  const handleVoiceChange = (voiceName) => {
    setSelectedVoice(voiceName);
    saveSettings('selectedVoiceName', voiceName);
  };

  // تغيير مستوى الصوت
  const handleVolumeChange = (value) => {
    setVolume(value);
    saveSettings('voiceVolume', value);
  };

  // تغيير سرعة الكلام
  const handleRateChange = (value) => {
    setRate(value);
    saveSettings('voiceRate', value);
  };

  // تغيير حدة الصوت
  const handlePitchChange = (value) => {
    setPitch(value);
    saveSettings('voicePitch', value);
  };

  // اختبار الصوت
  const testVoice = () => {
    if (!('speechSynthesis' in window)) {
      alert('متصفحك لا يدعم الصوت الناطق');
      return;
    }

    // إلغاء أي كلام سابق
    window.speechSynthesis.cancel();
    
    setIsPlaying(true);
    
    const utterance = new SpeechSynthesisUtterance('تنبيه! طلب جديد من مطعم البيت السوري. المبلغ خمسة وعشرون ألف ليرة.');
    
    // تطبيق الإعدادات
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.lang = 'ar-SA';
    utterance.volume = volume;
    utterance.rate = rate;
    utterance.pitch = pitch;
    
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    
    window.speechSynthesis.speak(utterance);
  };

  // إعادة تعيين الإعدادات الافتراضية
  const resetToDefaults = () => {
    setVolume(1);
    setRate(0.9);
    setPitch(1.1);
    saveSettings('voiceVolume', 1);
    saveSettings('voiceRate', 0.9);
    saveSettings('voicePitch', 1.1);
    
    // اختيار أول صوت عربي
    const arabicVoice = availableVoices.find(v => v.lang.startsWith('ar'));
    if (arabicVoice) {
      setSelectedVoice(arabicVoice.name);
      saveSettings('selectedVoiceName', arabicVoice.name);
    }
  };

  // الحصول على معلومات الصوت المحدد
  const getVoiceInfo = (voiceName) => {
    const voice = availableVoices.find(v => v.name === voiceName);
    if (!voice) return null;
    
    const isArabic = voice.lang.startsWith('ar');
    const isHighQuality = voice.name.includes('Google') || voice.name.includes('Microsoft') || voice.name.includes('Apple');
    
    return { voice, isArabic, isHighQuality };
  };

  const selectedVoiceInfo = getVoiceInfo(selectedVoice);

  return (
    <div className={`rounded-xl p-4 border ${
      isDarkMode 
        ? 'bg-[#1a1a1a] border-[#333]' 
        : 'bg-white border-gray-200'
    }`}>
      {/* العنوان مع زر التفعيل */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isDarkMode ? 'bg-blue-500/20' : 'bg-blue-100'
          }`}>
            <Mic size={20} className="text-blue-500" />
          </div>
          <div>
            <h2 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              الصوت الناطق
            </h2>
            <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              إعلانات صوتية عند وصول الطلبات
            </p>
          </div>
        </div>
        
        {/* زر التفعيل */}
        <button
          onClick={handleToggleVoice}
          className={`relative w-14 h-7 rounded-full transition-colors ${
            voiceEnabled ? 'bg-green-500' : isDarkMode ? 'bg-gray-700' : 'bg-gray-300'
          }`}
          data-testid="voice-toggle"
        >
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
            voiceEnabled ? 'right-0.5' : 'left-0.5'
          }`} />
        </button>
      </div>

      {/* الإعدادات - تظهر فقط عند التفعيل */}
      {voiceEnabled && (
        <div className="space-y-4">
          {/* اختيار الصوت */}
          <div>
            <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              🎤 الصوت المستخدم
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              className={`w-full p-3 rounded-xl text-sm ${
                isDarkMode 
                  ? 'bg-[#252525] border-[#444] text-white' 
                  : 'bg-gray-50 border-gray-200 text-gray-900'
              } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
              data-testid="voice-select"
            >
              <optgroup label="الأصوات العربية">
                {availableVoices.filter(v => v.lang.startsWith('ar')).map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} {voice.lang}
                    {voice.name.includes('Google') && ' (Google)'}
                    {voice.name.includes('Microsoft') && ' (Microsoft)'}
                  </option>
                ))}
              </optgroup>
              <optgroup label="أصوات أخرى">
                {availableVoices.filter(v => !v.lang.startsWith('ar')).slice(0, 10).map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} {voice.lang}
                  </option>
                ))}
              </optgroup>
            </select>
            
            {/* معلومات الصوت المحدد */}
            {selectedVoiceInfo && (
              <div className={`mt-2 flex items-center gap-2 text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {selectedVoiceInfo.isArabic && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-500 rounded-full">عربي</span>
                )}
                {selectedVoiceInfo.isHighQuality && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-500 rounded-full">جودة عالية</span>
                )}
              </div>
            )}
          </div>

          {/* مستوى الصوت */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                🔊 مستوى الصوت
              </label>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {Math.round(volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
              data-testid="volume-slider"
            />
          </div>

          {/* سرعة الكلام */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                ⚡ سرعة الكلام
              </label>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {rate.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={rate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
              data-testid="rate-slider"
            />
            <div className={`flex justify-between text-[9px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <span>بطيء</span>
              <span>عادي</span>
              <span>سريع</span>
            </div>
          </div>

          {/* حدة الصوت */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                🎵 حدة الصوت
              </label>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {pitch.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={pitch}
              onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-500"
              data-testid="pitch-slider"
            />
            <div className={`flex justify-between text-[9px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <span>منخفض</span>
              <span>طبيعي</span>
              <span>مرتفع</span>
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={testVoice}
              disabled={isPlaying}
              className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                isPlaying
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              data-testid="test-voice-btn"
            >
              <Play size={16} className={isPlaying ? 'animate-pulse' : ''} />
              {isPlaying ? 'جاري التشغيل...' : 'اختبار الصوت'}
            </button>
            
            <button
              onClick={resetToDefaults}
              className={`px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                isDarkMode
                  ? 'bg-[#252525] text-gray-300 hover:bg-[#333]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="إعادة تعيين الإعدادات"
              data-testid="reset-voice-btn"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* ملاحظة */}
          <div className={`p-3 rounded-lg ${
            isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'
          }`}>
            <p className={`text-[10px] ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
              💡 الصوت الناطق سيعلن عن الطلبات الجديدة والتنبيهات الهامة أثناء القيادة
            </p>
          </div>
        </div>
      )}

      {/* رسالة عند الإيقاف */}
      {!voiceEnabled && (
        <div className={`p-4 rounded-xl text-center ${
          isDarkMode ? 'bg-[#252525]' : 'bg-gray-50'
        }`}>
          <Volume2 size={32} className={`mx-auto mb-2 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
          <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            الصوت الناطق معطل حالياً
          </p>
          <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            فعّله لسماع إعلانات صوتية عند وصول الطلبات
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceAnnouncementSettings;
