// /app/frontend/src/components/delivery/orders-map/components/StepByStepCard.js
// بطاقة وضع خطوة بخطوة

import React from 'react';

/**
 * بطاقة وضع خطوة بخطوة
 * @param {boolean} stepByStepMode - هل الوضع مفعّل
 * @param {Array} allStepsData - بيانات جميع الخطوات
 * @param {number} currentStepIndex - فهرس الخطوة الحالية
 * @param {Object} routeInfo - معلومات المسار {distance, duration}
 * @param {Function} stopStepByStep - دالة إيقاف الوضع
 * @param {Function} goToNextStep - دالة الانتقال للخطوة التالية
 */
const StepByStepCard = ({
  stepByStepMode,
  allStepsData,
  currentStepIndex,
  routeInfo,
  stopStepByStep,
  goToNextStep
}) => {
  if (!stepByStepMode || !allStepsData || allStepsData.length === 0) return null;

  const currentStep = allStepsData[currentStepIndex];

  return (
    <div 
      className="absolute bottom-4 left-4 right-4 bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl p-4 z-[1000]"
      data-testid="step-by-step-card"
    >
      {/* شريط التقدم */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-[#333] rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${((currentStepIndex + 1) / allStepsData.length) * 100}%` }}
          ></div>
        </div>
        <span className="text-xs font-bold text-gray-400">
          {currentStepIndex + 1}/{allStepsData.length}
        </span>
      </div>

      {/* معلومات المحطة الحالية */}
      {currentStep && (
        <div className="text-center mb-3">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold mb-2 ${
            currentStep.to.type === 'store'
              ? (currentStep.to.isFood ? 'bg-green-500' : 'bg-blue-500')
              : 'bg-amber-500'
          }`}>
            {currentStep.to.type === 'store' ? (
              <>
                {currentStep.to.isFood ? '🍔' : '📦'}
                اذهب إلى: {currentStep.to.label}
              </>
            ) : (
              <>
                🏠 سلّم الطلب إلى: {currentStep.to.label}
              </>
            )}
          </div>
          
          {/* المسافة والوقت */}
          <div className="flex justify-center gap-4 text-sm">
            <span className="text-green-400 font-bold">
              📍 {routeInfo?.distance || '0'} كم
            </span>
            <span className="text-blue-400 font-bold">
              ⏱️ {routeInfo?.duration || '0'} دقيقة
            </span>
          </div>

          {/* رقم الهاتف - مخفي */}
          {currentStep.to.order && (
            <p className="text-gray-400 text-xs mt-2">
              🔒 رقم العميل مخفي - استخدم زر الاتصال من صفحة الطلب
            </p>
          )}
        </div>
      )}

      {/* الأزرار */}
      <div className="flex gap-2">
        <button
          onClick={stopStepByStep}
          data-testid="stop-step-by-step-btn"
          className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold"
        >
          ✕ إلغاء
        </button>
        <button
          onClick={goToNextStep}
          data-testid="next-step-btn"
          className={`flex-2 py-2.5 px-6 rounded-lg text-sm font-bold text-white ${
            currentStep?.to?.type === 'store'
              ? 'bg-gradient-to-r from-green-500 to-green-600'
              : 'bg-gradient-to-r from-blue-500 to-blue-600'
          }`}
        >
          {currentStep?.to?.type === 'store' 
            ? '✓ استلمت الطلب' 
            : (currentStepIndex === allStepsData.length - 1 ? '🎉 أنهيت التوصيل' : '✓ سلّمت الطلب')}
        </button>
      </div>
    </div>
  );
};

export default StepByStepCard;
