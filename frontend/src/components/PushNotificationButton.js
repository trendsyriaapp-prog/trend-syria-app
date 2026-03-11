import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import usePushNotifications from '../hooks/usePushNotifications';
import { useToast } from '../hooks/use-toast';

/**
 * زر الاشتراك في إشعارات Push
 * يعرض حالة الاشتراك ويسمح بالتبديل
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

  const iconSize = size === 'small' ? 14 : size === 'large' ? 20 : 16;
  
  const buttonClasses = `
    flex items-center gap-1.5 rounded-full transition-all
    ${size === 'small' ? 'p-1.5 text-[10px]' : size === 'large' ? 'px-4 py-2 text-sm' : 'p-2 text-xs'}
    ${isSubscribed 
      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
    }
    ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;

  const getIcon = () => {
    if (isLoading) {
      return <Loader2 size={iconSize} className="animate-spin" />;
    }
    if (isSubscribed) {
      return <BellRing size={iconSize} />;
    }
    if (permission === 'denied') {
      return <BellOff size={iconSize} />;
    }
    return <Bell size={iconSize} />;
  };

  const getLabel = () => {
    if (isLoading) return 'جاري...';
    if (isSubscribed) return 'الإشعارات مفعلة';
    if (permission === 'denied') return 'الإشعارات محظورة';
    return 'تفعيل الإشعارات';
  };

  const getTitle = () => {
    if (isSubscribed) return 'إشعارات Push مفعلة - انقر لإلغاء الاشتراك';
    if (permission === 'denied') return 'الإشعارات محظورة - فعّلها من إعدادات المتصفح';
    return 'تفعيل إشعارات Push - ستتلقى إشعارات حتى عند إغلاق التطبيق';
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading || permission === 'denied'}
      className={buttonClasses}
      title={getTitle()}
      data-testid="push-notification-btn"
    >
      {getIcon()}
      {showLabel && <span className="font-bold">{getLabel()}</span>}
    </button>
  );
};

export default PushNotificationButton;
