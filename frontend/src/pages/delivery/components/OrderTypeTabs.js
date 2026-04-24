// /app/frontend/src/pages/delivery/components/OrderTypeTabs.js
// أزرار تبويبات الطلبات (متاحة / طلباتي)

const OrderTypeTabs = ({
  activeTab,
  setActiveTab,
  availableOrdersCount,
  myOrdersCount,
  currentTheme
}) => {
  return (
    <div className="flex gap-2 mb-3">
      <button
        data-testid="available-orders-tab"
        onClick={() => setActiveTab('available')}
        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
          activeTab === 'available' 
            ? 'bg-green-500 text-black' 
            : currentTheme === 'dark'
              ? 'bg-[#1a1a1a] text-gray-400 border border-[#333]'
              : 'bg-white text-gray-600 border border-gray-200'
        }`}
      >
        طلبات متاحة ({availableOrdersCount})
      </button>
      <button
        data-testid="my-orders-tab"
        onClick={() => setActiveTab('my')}
        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
          activeTab === 'my' 
            ? 'bg-green-500 text-black' 
            : currentTheme === 'dark'
              ? 'bg-[#1a1a1a] text-gray-400 border border-[#333]'
              : 'bg-white text-gray-600 border border-gray-200'
        }`}
      >
        طلباتي ({myOrdersCount})
      </button>
    </div>
  );
};

export default OrderTypeTabs;
