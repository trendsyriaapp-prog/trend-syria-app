import { Loader2 } from 'lucide-react';
import logger from '../lib/logger';
import usePushNotifications from '../hooks/usePushNotifications';
import { useToast } from '../hooks/use-toast';

/**
 * زر الاشتراك في إشعارات Push
 * يعرض حالة الاشتراك ويسمح بالتبديل - شكل ON/OFF
 */
const PushNotificationButton = ({ userType, showLabel = false, size = 'default' }) => {
  const { toast } = useToast();
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    error,
    toggleSubscription
  } = usePushNotifications(userType);

  const handleToggle = async () => {
    logger.log('Push button clicked, current state:', { isSubscribed, permission, isLoading });
    
    try {
      const result = await toggleSubscription();
      logger.log('Toggle result:', result);
      
      if (result) {
        toast({
          title: isSubscribed ? "تم إلغاء الاشتراك" : "تم تفعيل الإشعارات ✅",
          description: isSubscribed 
            ? "لن تتلقى إشعارات Push بعد الآن"
            : "ستتلقى إشعارات حتى عندما يكون التطبيق مغلقاً"
        });
      } else {
        // إذا فشل بدون رسالة خطأ محددة
        if (permission === 'denied') {
          toast({
            title: "الإشعارات محظورة ❌",
            description: "يرجى تفعيل الإشعارات من إعدادات المتصفح",
            variant: "destructive"
          });
        } else {
          toast({
            title: "لم يتم التفعيل",
            description: error || "يرجى المحاولة مرة أخرى أو التحقق من إعدادات المتصفح",
            variant: "destructive"
          });
        }
      }
    } catch (err) {
      logger.error('Toggle error:', err);
      toast({
        title: "حدث خطأ",
        description: "فشل في تغيير حالة الإشعارات",
        variant: "destructive"
      });
    }
  };

  // إذا كان المتصفح لا يدعم Push - نعرض رسالة
  if (!isSupported) {
    return (
      <button
        onClick={() => toast({
          title: "غير مدعوم",
          description: "متصفحك لا يدعم إشعارات Push. جرب Chrome أو Firefox",
          variant: "destructive"
        })}
        className="relative flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-200 text-gray-400 cursor-not-allowed"
        title="متصفحك لا يدعم إشعارات Push"
      >
        <span>--</span>
      </button>
    );
  }

  const getTitle = () => {
    if (isSubscribed) return 'إشعارات Push مفعلة - انقر لإلغاء الاشتراك';
    if (permission === 'denied') return 'الإشعارات محظورة - فعّلها من إعدادات المتصفح';
    return 'تفعيل إشعارات Push - ستتلقى إشعارات حتى عند إغلاق التطبيق';
  };

  // تصميم ON/OFF صغير
  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        relative flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold transition-all min-w-[36px] justify-center
        ${isSubscribed 
          ? 'bg-green-500 text-white shadow-sm' 
          : permission === 'denied'
            ? 'bg-red-100 text-red-400'
            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }
        ${isLoading ? 'opacity-50' : 'cursor-pointer active:scale-95'}
      `}
      title={getTitle()}
      data-testid="push-notification-btn"
    >
      {isLoading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <span>{isSubscribed ? 'ON' : 'OFF'}</span>
      )}
    </button>
  );
};

export default PushNotificationButton;
