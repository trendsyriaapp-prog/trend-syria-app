// /app/frontend/src/components/delivery/orders-map/components/StationsSummary.js
// مكون ملخص المحطات

import { motion, AnimatePresence } from 'framer-motion';

const StationsSummary = ({
  show,
  stations,
  totalDistance,
  totalEarnings,
  onToggle,
  isDark
}) => {
  if (!stations || stations.length === 0) return null;

  return (
    <>
      {/* زر عرض ملخص المحطات */}
      <div className={`px-3 py-2 border-b ${
        isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'
      }`}>
        <button
          onClick={onToggle}
          className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            show 
              ? 'bg-blue-500 text-white' 
              : isDark
                ? 'bg-[#252525] text-blue-400 border border-blue-500/50 hover:bg-blue-500/20'
                : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
          }`}
        >
          📋 جدول المحطات ({stations.length})
          {show ? ' ▲' : ' ▼'}
        </button>
      </div>

      {/* بطاقة ملخص المحطات */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className={`border-t overflow-hidden ${
              isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="p-3 max-h-[200px] overflow-y-auto">
              <div className="space-y-2">
                {stations.map((station, idx) => (
                  <div 
                    key={`station-${idx}`}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      station.type === 'store' 
                        ? 'bg-green-500/10 border border-green-500/30' 
                        : 'bg-amber-500/10 border border-amber-500/30'
                    }`}
                  >
                    {/* رقم المحطة */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                      station.type === 'store' 
                        ? (station.isFood ? 'bg-green-500' : 'bg-blue-500')
                        : 'bg-amber-500'
                    }`}>
                      {station.number}
                    </div>
                    
                    {/* معلومات المحطة */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{station.type === 'store' ? (station.isFood ? '🍔' : '📦') : '🏠'}</span>
                        <span className={`font-bold text-sm truncate ${
                          isDark ? 'text-white' : 'text-gray-900'
                        }`}>{station.name}</span>
                      </div>
                      <p className={`text-xs truncate ${
                        isDark ? 'text-gray-400' : 'text-gray-600'
                      }`}>{typeof station.address === 'object' 
                        ? [station.address?.area, station.address?.street, station.address?.building].filter(Boolean).join(', ')
                        : station.address}</p>
                    </div>
                    
                    {/* الإجراء + الربح */}
                    <div className="flex flex-col items-end gap-1">
                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        station.action === 'استلام' 
                          ? 'bg-green-500 text-black' 
                          : 'bg-amber-500 text-black'
                      }`}>
                        {station.action}
                      </div>
                      {station.type === 'customer' && station.order && (
                        <span className="text-green-500 text-xs font-bold">
                          💵 {(station.order.driver_earnings || station.order.driver_delivery_fee || 0).toLocaleString()} ل.س
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* ملخص الإجمالي */}
              <div className={`mt-3 p-3 rounded-xl border ${
                isDark 
                  ? 'bg-[#252525] border-[#333]' 
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>المحطات</p>
                    <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{stations.length}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>المسافة</p>
                    <p className="font-bold text-blue-500 text-lg">{totalDistance.toFixed(1)} كم</p>
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>💰 الربح</p>
                    <p className="font-bold text-green-500 text-lg">{totalEarnings.toLocaleString()} ل.س</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StationsSummary;
