import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, Check, CheckCheck, Package, Truck, ShoppingCart, Gift, Star, Tag, Utensils } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const NotificationIcon = ({ type }) => {
  switch (type) {
    case 'new_order':
      return <ShoppingCart size={16} className="text-green-500" />;
    case 'order_status':
      return <Package size={16} className="text-blue-500" />;
    case 'delivery':
    case 'delivery_ready':
      return <Truck size={16} className="text-orange-500" />;
    case 'gift_received':
    case 'gift_accepted':
    case 'gift_completed':
      return <Gift size={16} className="text-pink-500" />;
    case 'review':
      return <Star size={16} className="text-yellow-500" />;
    case 'promotion':
    case 'flash_sale':
      return <Tag size={16} className="text-red-500" />;
    case 'food_order':
      return <Utensils size={16} className="text-orange-500" />;
    default:
      return <Bell size={16} className="text-gray-500" />;
  }
};

// تحديد الرابط المناسب للإشعار
const getNotificationLink = (notification) => {
  const { type, order_id, product_id, data } = notification;
  
  switch (type) {
    case 'order_status':
    case 'delivery':
    case 'delivery_ready':
    case 'new_order':
      if (order_id) return `/orders/${order_id}/tracking`;
      break;
    case 'gift_received':
    case 'gift_accepted':
    case 'gift_completed':
    case 'gift_order_created':
      return '/gifts';
    case 'review':
    case 'product':
      if (product_id) return `/products/${product_id}`;
      break;
    case 'food_order':
      if (order_id) return `/food/order/${order_id}`;
      if (data?.order_id) return `/food/order/${data.order_id}`;
      break;
    case 'promotion':
    case 'flash_sale':
    case 'daily_deal':
      return '/';
    case 'low_stock':
      if (product_id) return `/seller/products`;
      break;
    default:
      if (order_id) return `/orders/${order_id}/tracking`;
      if (product_id) return `/products/${product_id}`;
      if (data?.order_id) return `/orders/${data.order_id}/tracking`;
      if (data?.gift_id) return '/gifts';
  }
  return null;
};

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'الآن';
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 7) return `منذ ${diffDays} يوم`;
  return date.toLocaleDateString('ar-SY');
};

const NotificationsDropdown = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const intervalRef = useRef(null);

  // جلب الإشعارات
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const res = await axios.get(`${API}/api/notifications`);
      setNotifications(res.data || []);
      setUnreadCount(res.data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // تحديث الإشعارات كل 30 ثانية
  useEffect(() => {
    if (user) {
      fetchNotifications();
      intervalRef.current = setInterval(fetchNotifications, 30000);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // تحديد إشعار كمقروء
  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${API}/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // تحديد الكل كمقروء
  const markAllAsRead = async () => {
    try {
      await axios.post(`${API}/api/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  // الضغط على إشعار
  const handleNotificationClick = async (notification) => {
    // تحديد كمقروء
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // الحصول على الرابط
    const link = getNotificationLink(notification);
    
    // إغلاق القائمة
    setIsOpen(false);
    
    // الانتقال للصفحة المطلوبة
    if (link) {
      navigate(link);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* زر الجرس */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-[#FF6B00] transition-colors rounded-full hover:bg-gray-100"
        data-testid="notifications-btn"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* قائمة الإشعارات */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999]" onClick={() => setIsOpen(false)}>
          <div 
            className="absolute top-14 left-2 right-2 sm:left-auto sm:right-4 sm:w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* الهيدر */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white">
              <h3 className="font-bold text-sm">الإشعارات</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs flex items-center gap-1 hover:underline"
                >
                  <CheckCheck size={14} />
                  تحديد الكل كمقروء
                </button>
              )}
            </div>

            {/* قائمة الإشعارات */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <Bell size={40} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">لا توجد إشعارات</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-orange-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      <NotificationIcon type={notification.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.is_read ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-[#FF6B00] rounded-full"></div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
