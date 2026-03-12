import { useNavigate } from 'react-router-dom';
import { Wallet, DollarSign, Star, Clock, ChevronRight } from 'lucide-react';

const DeliveryHeader = ({ user, walletBalance, myRatings, isWorkingHours, workingHoursText }) => {
  const navigate = useNavigate();

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

      {/* Wallet Quick Access Card */}
      <div 
        onClick={() => navigate('/wallet')}
        className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-2.5 mb-3 cursor-pointer hover:shadow-lg transition-all"
        data-testid="wallet-quick-access"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white/80 text-[9px]">رصيد المحفظة</p>
              <p className="text-white font-bold text-sm">{new Intl.NumberFormat('ar-SY').format(walletBalance)} ل.س</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate('/wallet');
            }}
            className="bg-white text-green-600 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1 hover:bg-green-50"
            data-testid="withdraw-quick-btn"
          >
            <DollarSign size={12} />
            طلب سحب
          </button>
        </div>
      </div>

      {/* Rating Card */}
      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl p-2.5 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Star size={16} className="text-white fill-white" />
            </div>
            <div>
              <p className="text-white/80 text-[9px]">تقييمي</p>
              <div className="flex items-center gap-1">
                <p className="text-white font-bold text-sm">{myRatings.average_rating || 0}</p>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={10}
                      className={star <= Math.round(myRatings.average_rating || 0) ? 'text-white fill-white' : 'text-white/40'}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-sm">{myRatings.total_ratings || 0}</p>
            <p className="text-white/80 text-[9px]">تقييم</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeliveryHeader;
