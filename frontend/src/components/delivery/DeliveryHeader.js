import { Clock } from 'lucide-react';

const DeliveryHeader = ({ user, isWorkingHours, workingHoursText }) => {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">مرحباً، {user?.full_name || user?.name}</h1>
          <p className="text-[10px] text-gray-500">موظف توصيل</p>
        </div>
        <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${isWorkingHours ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {isWorkingHours ? 'أوقات العمل' : 'خارج أوقات العمل'}
        </div>
      </div>

      {/* أوقات العمل */}
      <div className="bg-blue-50 rounded-lg p-2 mb-3 flex items-center gap-2">
        <Clock size={14} className="text-blue-600" />
        <span className="text-[10px] text-blue-700">أوقات العمل: {workingHoursText || '8 صباحاً - 6 مساءً'}</span>
      </div>
    </>
  );
};

export default DeliveryHeader;
