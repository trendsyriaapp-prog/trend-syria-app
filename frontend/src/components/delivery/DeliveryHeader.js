import { Clock, Loader2 } from 'lucide-react';

const DeliveryHeader = ({ user, isAvailable, isLoadingAvailability, onToggleAvailability }) => {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h1 className="text-base font-bold text-gray-900">مرحباً، {user?.full_name || user?.name}</h1>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <span>موظف توصيل</span>
        </div>
      </div>
      <button
        onClick={onToggleAvailability}
        disabled={isLoadingAvailability}
        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
          isAvailable 
            ? 'bg-green-500 text-white shadow-md' 
            : 'bg-gray-300 text-gray-600'
        } ${isLoadingAvailability ? 'opacity-50' : 'cursor-pointer'}`}
      >
        {isLoadingAvailability ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          isAvailable ? '🟢 متاح' : '⚫ مغلق'
        )}
      </button>
    </div>
  );
};

export default DeliveryHeader;
