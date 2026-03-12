import { Clock } from 'lucide-react';

const DeliveryHeader = ({ user, isWorkingHours, workingHoursText }) => {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h1 className="text-base font-bold text-gray-900">مرحباً، {user?.full_name || user?.name}</h1>
        <div className="flex items-center gap-1 text-[10px] text-gray-500">
          <span>موظف توصيل</span>
          <span>•</span>
          <Clock size={10} className="text-blue-500" />
          <span className="text-blue-600">{workingHoursText || '8ص - 6م'}</span>
        </div>
      </div>
      <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${isWorkingHours ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        {isWorkingHours ? 'متاح' : 'مغلق'}
      </div>
    </div>
  );
};

export default DeliveryHeader;
