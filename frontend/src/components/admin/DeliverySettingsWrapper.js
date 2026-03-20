// /app/frontend/src/components/admin/DeliverySettingsWrapper.js
// غلاف إعدادات التوصيل مع تبويبات فرعية

import { useState } from 'react';
import { 
  DollarSign, Clock, Truck, AlertTriangle, Trophy,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import DeliverySettingsTab from './DeliverySettingsTab';

const TABS = [
  { id: 'prices', name: 'الأسعار', icon: DollarSign, color: 'bg-green-500' },
  { id: 'times', name: 'الأوقات', icon: Clock, color: 'bg-blue-500' },
  { id: 'orders', name: 'الطلبات', icon: Truck, color: 'bg-orange-500' },
  { id: 'penalties', name: 'العقوبات', icon: AlertTriangle, color: 'bg-red-500' },
  { id: 'rewards', name: 'المكافآت', icon: Trophy, color: 'bg-purple-500' },
];

const DeliverySettingsWrapper = () => {
  const [activeTab, setActiveTab] = useState('prices');

  return (
    <div className="space-y-4">
      {/* التبويبات الفرعية */}
      <div className="bg-white rounded-xl border border-gray-200 p-2">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive 
                    ? `${tab.color} text-white shadow-md` 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                {tab.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* محتوى التبويب */}
      <DeliverySettingsTab activeSection={activeTab} />
    </div>
  );
};

export default DeliverySettingsWrapper;
