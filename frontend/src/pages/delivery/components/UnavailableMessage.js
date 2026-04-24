// /app/frontend/src/pages/delivery/components/UnavailableMessage.js
// رسالة عندما يكون السائق غير متاح

const UnavailableMessage = ({
  currentTheme,
  isLoadingAvailability,
  toggleAvailability
}) => {
  return (
    <div className={`rounded-2xl p-6 text-center border mb-4 ${
      currentTheme === 'dark' 
        ? 'bg-red-900/20 border-red-800' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="text-4xl mb-3">🔴</div>
      <h3 className={`font-bold text-lg mb-2 ${
        currentTheme === 'dark' ? 'text-red-400' : 'text-red-700'
      }`}>
        أنت غير متاح حالياً
      </h3>
      <p className={`text-sm mb-4 ${
        currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
      }`}>
        لن تظهر لك الطلبات الجديدة ولن تستطيع قبول أي طلب
      </p>
      <button
        onClick={toggleAvailability}
        disabled={isLoadingAvailability}
        className="bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-sm"
      >
        {isLoadingAvailability ? '...' : '🟢 اضغط لتصبح متاحاً'}
      </button>
    </div>
  );
};

export default UnavailableMessage;
