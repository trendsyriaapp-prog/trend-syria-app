// /app/frontend/src/components/seller/FoodItemsGrid.js
// مكون عرض أطباق الطعام للبائع

import { useState } from 'react';
import { Package, Trash2 } from 'lucide-react';

const FoodItemsGrid = ({ items, onEdit, onDelete, onChangeAvailability }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(null);
  
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 bg-orange-50 rounded-xl border border-orange-200">
        <Package className="mx-auto mb-2 text-orange-300" size={40} />
        <p className="text-orange-600 text-sm font-medium">لا توجد أطباق بعد</p>
        <p className="text-orange-400 text-xs">أضف أول طبق لقائمة الطعام</p>
      </div>
    );
  }

  const getStatusInfo = (item) => {
    const status = item.availability_status || (item.is_available ? 'available' : 'unavailable');
    const statusMap = {
      'available': { label: 'متاح', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-100', icon: '🟢' },
      'sold_out_today': { label: 'نفد اليوم', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-100', icon: '🟡' },
      'unavailable': { label: 'متوقف', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-100', icon: '🔴' }
    };
    return statusMap[status] || statusMap['available'];
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map(item => {
        const statusInfo = getStatusInfo(item);
        const currentStatus = item.availability_status || (item.is_available ? 'available' : 'unavailable');
        
        return (
          <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden relative">
            <div className="relative">
              <img 
                src={item.image || '/placeholder.svg'} 
                alt={item.name} 
                className={`w-full h-24 object-cover ${currentStatus !== 'available' ? 'opacity-60 grayscale' : ''}`}
              />
              {/* شارة الحالة */}
              <div className={`absolute top-1 right-1 ${statusInfo.color} text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full`}>
                {statusInfo.icon} {statusInfo.label}
              </div>
            </div>
            <div className="p-2">
              <h3 className="font-bold text-xs text-gray-900 truncate">{item.name}</h3>
              <p className="text-[10px] text-gray-500 truncate">{item.description}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[#FF6B00] font-bold text-xs">{item.price?.toLocaleString()} ل.س</span>
                <span className="text-gray-400 text-[9px]">{item.preparation_time} دقيقة</span>
              </div>
              
              {/* أزرار تغيير الحالة */}
              <div className="flex gap-0.5 mt-2 relative">
                <button
                  onClick={() => onChangeAvailability(item.id, 'available')}
                  disabled={currentStatus === 'available'}
                  className={`flex-1 py-1.5 rounded-l text-[9px] font-bold transition-all ${
                    currentStatus === 'available' 
                      ? 'bg-[#FF6B00] text-white' 
                      : 'bg-orange-100 text-[#FF6B00] hover:bg-orange-200'
                  }`}
                  title="متاح"
                >
                  🟢
                </button>
                <button
                  onClick={() => onChangeAvailability(item.id, 'sold_out_today')}
                  disabled={currentStatus === 'sold_out_today'}
                  className={`flex-1 py-1.5 text-[9px] font-bold transition-all ${
                    currentStatus === 'sold_out_today' 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                  }`}
                  title="نفد اليوم"
                >
                  🟡
                </button>
                <button
                  onClick={() => onChangeAvailability(item.id, 'unavailable')}
                  disabled={currentStatus === 'unavailable'}
                  className={`flex-1 py-1.5 rounded-r text-[9px] font-bold transition-all ${
                    currentStatus === 'unavailable' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                  title="متوقف"
                >
                  🔴
                </button>
              </div>
              
              {/* أزرار التعديل والحذف */}
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => onEdit(item)}
                  className="flex-1 bg-gray-100 text-gray-600 py-1 rounded text-[9px] font-bold hover:bg-gray-200"
                >
                  تعديل
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="px-2 bg-red-50 text-red-500 py-1 rounded text-[9px] hover:bg-red-100"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FoodItemsGrid;
