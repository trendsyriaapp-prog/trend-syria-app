import { useNavigate } from 'react-router-dom';
import { Wallet, DollarSign, Star, Clock, ChevronRight } from 'lucide-react';

const DeliveryHeader = ({ user, walletBalance, myRatings, isWorkingHours, workingHoursText }) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Header with Back Button */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 bg-white rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          data-testid="back-btn"
        >
          <ChevronRight size={18} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">مرحباً، {user?.full_name || user?.name}</h1>
          <p className="text-xs text-gray-500">موظف توصيل</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${isWorkingHours ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
          {isWorkingHours ? 'أوقات العمل' : 'خارج أوقات العمل'}
        </div>
      </div>

      {/* أوقات العمل */}
      <div className="bg-blue-50 rounded-lg p-3 mb-4 flex items-center gap-2">
        <Clock size={16} className="text-blue-600" />
        <span className="text-xs text-blue-700">أوقات العمل: {workingHoursText || '8 صباحاً - 6 مساءً'}</span>
      </div>

      {/* Wallet Quick Access Card */}
      <div 
        onClick={() => navigate('/wallet')}
        className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-3 mb-4 cursor-pointer hover:shadow-lg transition-all"
        data-testid="wallet-quick-access"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet size={20} className="text-white" />
            </div>
            <div>
              <p className="text-white/80 text-[10px]">رصيد المحفظة</p>
              <p className="text-white font-bold text-lg">{new Intl.NumberFormat('ar-SY').format(walletBalance)} ل.س</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate('/wallet');
            }}
            className="bg-white text-green-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-green-50"
            data-testid="withdraw-quick-btn"
          >
            <DollarSign size={14} />
            طلب سحب
          </button>
        </div>
      </div>

      {/* Rating Card */}
      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Star size={20} className="text-white fill-white" />
            </div>
            <div>
              <p className="text-white/80 text-[10px]">تقييمي</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-lg">{myRatings.average_rating || 0}</p>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={12}
                      className={star <= Math.round(myRatings.average_rating || 0) ? 'text-white fill-white' : 'text-white/40'}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-lg">{myRatings.total_ratings || 0}</p>
            <p className="text-white/80 text-[10px]">تقييم</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeliveryHeader;
