// /app/frontend/src/pages/delivery/components/DriverHeader.js
// هيدر السائق مع الصورة والمعلومات

import { Volume2, VolumeX, Check } from 'lucide-react';
import PushNotificationButton from '../../../components/PushNotificationButton';

const DriverHeader = ({
  user,
  driverProfile,
  themeMode,
  setThemeMode,
  currentTheme,
  soundEnabled,
  setSoundEnabled,
  isAvailable,
  isLoadingAvailability,
  toggleAvailability
}) => {
  return (
    <div className={`flex items-center justify-between mb-4 p-4 rounded-2xl ${
      currentTheme === 'dark' ? 'driver-card' : 'bg-white shadow-sm border'
    }`}>
      <div className="flex items-center gap-3">
        {/* 📸 صورة السائق الشخصية */}
        {driverProfile?.personal_photo ? (
          <div className="relative">
            <img 
              src={driverProfile.personal_photo} 
              alt="صورتك الشخصية"
              className="w-14 h-14 rounded-full object-cover border-2 border-green-500 shadow-lg"
            />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <Check size={10} className="text-white" />
            </div>
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-black font-bold text-xl shadow-lg">
            {(user?.full_name || user?.name || 'س').charAt(0)}
          </div>
        )}
        <div>
          <h1 className={`text-lg font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            مرحباً، {driverProfile?.name || user?.full_name || user?.name}
          </h1>
          <div className="flex items-center gap-2">
            <p className={`text-xs ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>موظف توصيل</p>
            {driverProfile?.average_rating > 0 && (
              <span className={`text-xs flex items-center gap-0.5 ${currentTheme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                ⭐ {driverProfile.average_rating}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* ⭐ زر تبديل الثيم */}
        <button
          onClick={() => {
            const modes = ['auto', 'light', 'dark'];
            const currentIndex = modes.indexOf(themeMode);
            const nextMode = modes[(currentIndex + 1) % modes.length];
            setThemeMode(nextMode);
          }}
          className={`p-2 rounded-xl font-bold text-sm transition-all ${
            currentTheme === 'dark'
              ? 'bg-[#252525] text-white hover:bg-[#333] border border-[#444]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          }`}
          title={`الوضع: ${themeMode === 'auto' ? 'تلقائي' : (themeMode === 'light' ? 'فاتح' : 'داكن')}`}
        >
          {themeMode === 'auto' && '🔄'}
          {themeMode === 'light' && '☀️'}
          {themeMode === 'dark' && '🌙'}
        </button>
        {/* زر إشعارات Push */}
        <PushNotificationButton userType="delivery" size="small" />
        {/* زر تفعيل/إيقاف صوت التنبيه */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-2 rounded-xl transition-all ${
            currentTheme === 'dark'
              ? `bg-[#252525] border ${soundEnabled ? 'border-green-500 text-green-500' : 'border-[#444] text-gray-400'}`
              : `bg-gray-100 border ${soundEnabled ? 'border-green-500 text-green-600' : 'border-gray-300 text-gray-400'}`
          }`}
          title={soundEnabled ? 'الصوت مفعل' : 'الصوت متوقف'}
          data-testid="delivery-sound-toggle-btn"
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        {/* زر متاح/مغلق */}
        <button
          onClick={toggleAvailability}
          disabled={isLoadingAvailability}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            isAvailable 
              ? 'bg-green-500 text-black shadow-lg shadow-green-500/30' 
              : currentTheme === 'dark'
                ? 'bg-[#252525] text-gray-400 border border-[#444]'
                : 'bg-gray-200 text-gray-600'
          } ${isLoadingAvailability ? 'opacity-50' : ''}`}
        >
          {isLoadingAvailability ? '...' : (isAvailable ? '● متاح' : '○ مغلق')}
        </button>
      </div>
    </div>
  );
};

export default DriverHeader;
