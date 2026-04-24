// /app/frontend/src/pages/delivery/components/OrderTypeFilter.js
// فلتر نوع الطلبات (الكل / منتجات / طعام)

const OrderTypeFilter = ({
  orderTypeFilter,
  setOrderTypeFilter,
  currentTheme
}) => {
  return (
    <div className={`flex gap-1 mb-3 p-1 rounded-xl ${
      currentTheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
    }`}>
      <button
        onClick={() => setOrderTypeFilter('all')}
        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
          orderTypeFilter === 'all' 
            ? currentTheme === 'dark'
              ? 'bg-[#252525] text-white shadow-lg'
              : 'bg-white text-gray-900 shadow'
            : currentTheme === 'dark'
              ? 'text-gray-500'
              : 'text-gray-500'
        }`}
      >
        الكل
      </button>
      <button
        onClick={() => setOrderTypeFilter('products')}
        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
          orderTypeFilter === 'products' 
            ? currentTheme === 'dark'
              ? 'bg-[#252525] text-white shadow-lg'
              : 'bg-white text-gray-900 shadow'
            : currentTheme === 'dark'
              ? 'text-gray-500'
              : 'text-gray-500'
        }`}
      >
        📦 منتجات
      </button>
      <button
        onClick={() => setOrderTypeFilter('food')}
        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
          orderTypeFilter === 'food' 
            ? currentTheme === 'dark'
              ? 'bg-[#252525] text-white shadow-lg'
              : 'bg-white text-gray-900 shadow'
            : currentTheme === 'dark'
              ? 'text-gray-500'
              : 'text-gray-500'
        }`}
      >
        🍔 طعام
      </button>
    </div>
  );
};

export default OrderTypeFilter;
