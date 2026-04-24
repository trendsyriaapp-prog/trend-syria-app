// /app/frontend/src/components/delivery/orders-map/components/OrderFilterTabs.js
// تبويبات فلتر الطلبات (طلباتي / متاحة / الكل)

const OrderFilterTabs = ({
  orderFilter,
  setOrderFilter,
  myOrdersCount,
  availableOrdersCount,
  isDark
}) => {
  const tabs = [
    { id: 'myOrders', label: 'طلباتي', count: myOrdersCount, color: 'green' },
    { id: 'available', label: 'متاحة', count: availableOrdersCount, color: 'blue' },
    { id: 'all', label: 'الكل', count: myOrdersCount + availableOrdersCount, color: 'gray' }
  ];

  return (
    <div className={`absolute bottom-24 left-4 right-4 z-[1001] flex gap-1 p-1 rounded-xl ${
      isDark ? 'bg-[#1a1a1a]/90 backdrop-blur' : 'bg-white/90 backdrop-blur shadow'
    }`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setOrderFilter(tab.id)}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${
            orderFilter === tab.id
              ? tab.color === 'green'
                ? 'bg-green-500 text-white'
                : tab.color === 'blue'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-500 text-white'
              : isDark
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {tab.label}
          {tab.count > 0 && (
            <span className={`mr-1 px-1.5 py-0.5 rounded-full text-xs ${
              orderFilter === tab.id
                ? 'bg-white/20'
                : isDark
                  ? 'bg-[#333]'
                  : 'bg-gray-200'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default OrderFilterTabs;
