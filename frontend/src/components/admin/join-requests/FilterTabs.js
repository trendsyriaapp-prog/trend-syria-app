// /app/frontend/src/components/admin/join-requests/FilterTabs.js
// تبويبات الفلترة

import { Users, Store, Truck, UtensilsCrossed, Archive } from 'lucide-react';

const FilterTabs = ({ 
  activeSection, 
  setActiveSection, 
  pendingSellers, 
  pendingDrivers, 
  pendingFoodStores, 
  rejectedRequests 
}) => {
  const totalPending = pendingSellers.length + pendingDrivers.length + pendingFoodStores.length;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button
        onClick={() => setActiveSection('all')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
          activeSection === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <Users size={16} />
        الكل ({totalPending})
      </button>
      <button
        onClick={() => setActiveSection('sellers')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
          activeSection === 'sellers' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
        }`}
      >
        <Store size={16} />
        بائعين ({pendingSellers.length})
      </button>
      <button
        onClick={() => setActiveSection('drivers')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
          activeSection === 'drivers' ? 'bg-cyan-500 text-white' : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
        }`}
      >
        <Truck size={16} />
        سائقين ({pendingDrivers.length})
      </button>
      <button
        onClick={() => setActiveSection('food_stores')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
          activeSection === 'food_stores' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'
        }`}
      >
        <UtensilsCrossed size={16} />
        متاجر طعام ({pendingFoodStores.length})
      </button>
      <button
        onClick={() => setActiveSection('rejected')}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
          activeSection === 'rejected' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'
        }`}
      >
        <Archive size={16} />
        المرفوضة ({rejectedRequests.length})
      </button>
    </div>
  );
};

export default FilterTabs;
