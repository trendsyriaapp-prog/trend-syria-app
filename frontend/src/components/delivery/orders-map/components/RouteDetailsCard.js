// /app/frontend/src/components/delivery/orders-map/components/RouteDetailsCard.js
// بطاقة تفاصيل المسار

import React from 'react';
import { X, Phone, PhoneOff, Navigation } from 'lucide-react';

/**
 * بطاقة تفاصيل المسار
 * @param {Object} routeInfo - معلومات المسار
 * @param {Object} selectedOrderForRoute - الطلب المحدد
 * @param {Function} hideRoute - دالة إخفاء المسار
 * @param {Function} toggleNavigationMode - دالة تبديل وضع الملاحة
 * @param {Function} speakInstruction - دالة النطق
 * @param {string} API - عنوان API
 */
const RouteDetailsCard = ({
  routeInfo,
  selectedOrderForRoute,
  hideRoute,
  toggleNavigationMode,
  speakInstruction,
  onCallRequest
}) => {
  if (!routeInfo || !selectedOrderForRoute) return null;

  return (
    <div 
      className="absolute bottom-4 left-4 right-4 bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl p-4 z-[1000]"
      data-testid="route-details-card"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm text-white">🛣️ تفاصيل التوصيلة</h4>
        <button 
          onClick={hideRoute}
          data-testid="hide-route-btn"
          className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-[#333]"
        >
          <X size={18} />
        </button>
      </div>
      
      {/* المسافات المنفصلة */}
      <div className="bg-[#252525] rounded-xl p-3 mb-3 border border-[#333]">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 bg-white text-black rounded-full text-xs flex items-center justify-center">🏍️</span>
            <span className="text-gray-500">➜</span>
            <span className="w-6 h-6 bg-green-500 text-white rounded-full text-xs flex items-center justify-center">🏪</span>
            <span className="text-gray-400 mr-1">للمتجر</span>
          </span>
          <span className="font-bold text-green-400">{routeInfo.distanceToStore || '0'} كم</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 bg-green-500 text-white rounded-full text-xs flex items-center justify-center">🏪</span>
            <span className="text-gray-500">➜</span>
            <span className="w-6 h-6 bg-amber-500 text-white rounded-full text-xs flex items-center justify-center">🏠</span>
            <span className="text-gray-400 mr-1">للعميل</span>
          </span>
          <span className="font-bold text-amber-400">{routeInfo.distanceToCustomer || '0'} كم</span>
        </div>
      </div>
      
      {/* الإجمالي والوقت والربح */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">المجموع</p>
          <p className="font-bold text-blue-400">{routeInfo.distance} كم</p>
        </div>
        <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">الوقت</p>
          <p className="font-bold text-purple-400">{routeInfo.duration} د</p>
        </div>
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">💰 ربحك</p>
          <p className="font-bold text-green-400">{(routeInfo.driverEarnings || 0).toLocaleString()} ل.س</p>
        </div>
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex gap-2">
        {/* زر الاتصال VoIP */}
        <button
          onClick={() => {
            alert('استخدم زر "اتصل بالعميل" من صفحة تفاصيل الطلب');
          }}
          data-testid="call-voip-btn"
          className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          <Phone size={16} />
          اتصل (مشفر)
        </button>
        
        {/* زر لم يرد - طلب مساعدة الموظف */}
        <button
          onClick={() => onCallRequest && onCallRequest(selectedOrderForRoute)}
          data-testid="no-answer-btn"
          className="py-3 px-4 bg-orange-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
          title="طلب مساعدة الموظف"
        >
          <PhoneOff size={16} />
          لم يرد
        </button>
        
        {/* زر بدء الملاحة */}
        <button
          onClick={() => {
            toggleNavigationMode();
            if (speakInstruction) {
              speakInstruction('جاري بدء الملاحة، اتجه نحو المتجر');
            }
          }}
          data-testid="start-navigation-btn"
          className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          <Navigation size={16} />
          ابدأ الملاحة
        </button>
      </div>
    </div>
  );
};

export default RouteDetailsCard;
