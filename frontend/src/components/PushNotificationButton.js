import { Loader2 } from 'lucide-react';
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
    toggleSubscription
  } = usePushNotifications(userType);

  const handleToggle = async () => {
    const result = await toggleSubscription();
    
    if (result) {
      toast({
        title: isSubscribed ? "تم إلغاء الاشتراك" : "تم تفعيل الإشعارات",
        description: isSubscribed 
          ? "لن تتلقى إشعارات Push بعد الآن"
          : "ستتلقى إشعارات حتى عندما يكون التطبيق مغلقاً"
      });
    } else if (permission === 'denied') {
      toast({
        title: "الإشعارات محظورة",
        description: "يرجى تفعيل الإشعارات من إعدادات المتصفح",
        variant: "destructive"
      });
    }
  };

  // إذا كان المتصفح لا يدعم Push
  if (!isSupported) {
    return null;
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
      disabled={isLoading || permission === 'denied'}
      className={`
        relative flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all
        ${isSubscribed 
          ? 'bg-green-500 text-white' 
          : permission === 'denied'
            ? 'bg-red-100 text-red-400 cursor-not-allowed'
            : 'bg-gray-300 text-gray-600'
        }
        ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}
      `}
      title={getTitle()}
      data-testid="push-notification-btn"
    >
      {isLoading ? (
        <Loader2 size={10} className="animate-spin" />
      ) : (
        <span>{isSubscribed ? 'ON' : 'OFF'}</span>
      )}
    </button>
  );
};

export default PushNotificationButton;
