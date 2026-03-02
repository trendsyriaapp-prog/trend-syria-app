// /app/frontend/src/components/admin/NotificationsTab.js
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Send, Trash2 } from 'lucide-react';

const NotificationsTab = ({ notifications, onSend, onDelete }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    target: 'all'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSend(newNotification);
    setShowAddForm(false);
    setNewNotification({ title: '', message: '', target: 'all' });
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-sm text-gray-900">إدارة الإشعارات</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 bg-[#FF6B00] text-white px-2 py-1 rounded-full text-xs font-bold"
        >
          <Bell size={12} />
          إشعار جديد
        </button>
      </div>

      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg p-3 border border-gray-200 mb-3"
        >
          <h3 className="font-bold text-xs text-gray-900 mb-2">إرسال إشعار جديد</h3>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              placeholder="عنوان الإشعار"
              value={newNotification.title}
              onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
              className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
              required
            />
            <textarea
              placeholder="نص الإشعار"
              value={newNotification.message}
              onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
              className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
              rows={2}
              required
            />
            <div>
              <label className="block text-[10px] text-gray-600 mb-0.5">إرسال إلى</label>
              <select
                value={newNotification.target}
                onChange={(e) => setNewNotification({...newNotification, target: e.target.value})}
                className="w-full p-1.5 border border-gray-300 rounded-lg text-xs bg-white"
              >
                <option value="all">الجميع</option>
                <option value="buyers">المشترين فقط</option>
                <option value="sellers">البائعين فقط</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-[#FF6B00] text-white py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
              >
                <Send size={12} />
                إرسال
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded-lg font-bold text-xs"
              >
                إلغاء
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {notifications.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Bell size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا توجد إشعارات مرسلة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <div key={notification.id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-xs text-gray-900">{notification.title}</h3>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                      notification.target === 'all' ? 'bg-blue-100 text-blue-600' :
                      notification.target === 'buyers' ? 'bg-green-100 text-green-600' :
                      'bg-purple-100 text-purple-600'
                    }`}>
                      {notification.target === 'all' ? 'الجميع' : 
                       notification.target === 'buyers' ? 'المشترين' : 'البائعين'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mb-1">{notification.message}</p>
                  <p className="text-[9px] text-gray-400">
                    {new Date(notification.created_at).toLocaleDateString('ar-SY', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(notification.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default NotificationsTab;
