// /app/frontend/src/components/admin/UsersTab.js
import { useState } from 'react';
import { Users, MapPin, Phone, Calendar, MoreVertical, Trash2, Ban, Eye, X } from 'lucide-react';

const UsersTab = ({ allUsers, onDeleteUser, onBanUser }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showMenu, setShowMenu] = useState(null);
  const [actionModal, setActionModal] = useState({ isOpen: false, type: null, user: null });

  const handleAction = (action, user) => {
    setShowMenu(null);
    if (action === 'view') {
      setSelectedUser(user);
    } else if (action === 'delete') {
      setActionModal({ isOpen: true, type: 'delete', user });
    } else if (action === 'ban') {
      setActionModal({ isOpen: true, type: 'ban', user });
    }
  };

  const confirmAction = () => {
    if (actionModal.type === 'delete') {
      onDeleteUser?.(actionModal.user.id);
    } else if (actionModal.type === 'ban') {
      onBanUser?.(actionModal.user.id);
    }
    setActionModal({ isOpen: false, type: null, user: null });
  };

  return (
    <section>
      {allUsers.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Users size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد مستخدمين</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allUsers.map((u) => (
            <div 
              key={u.id} 
              className="bg-white rounded-lg border border-gray-200 p-3 relative"
            >
              <div className="flex items-start justify-between">
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedUser(u)}
                >
                  <h3 className="font-bold text-sm text-gray-900 truncate">{u.full_name || u.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1" dir="ltr">
                    <Phone size={10} />
                    {u.phone}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Calendar size={10} />
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-SY') : '-'}
                  </div>
                  <button
                    onClick={() => setShowMenu(showMenu === u.id ? null : u.id)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
              
              {/* قائمة الخيارات */}
              {showMenu === u.id && (
                <div className="absolute left-2 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                  <button
                    onClick={() => handleAction('view', u)}
                    className="w-full px-3 py-2 text-right text-xs hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Eye size={14} className="text-blue-500" />
                    عرض التفاصيل
                  </button>
                  <button
                    onClick={() => handleAction('ban', u)}
                    className="w-full px-3 py-2 text-right text-xs hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                  >
                    <Ban size={14} />
                    حظر
                  </button>
                  <button
                    onClick={() => handleAction('delete', u)}
                    className="w-full px-3 py-2 text-right text-xs hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 size={14} />
                    حذف
                  </button>
                </div>
              )}
              
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-start gap-1 text-xs text-gray-600">
                  <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium">{u.city || 'غير محدد'}</span>
                    {u.addresses && u.addresses.length > 0 && (
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                        {u.addresses[0].street}
                        {u.addresses[0].building_number && ` - بناء ${u.addresses[0].building_number}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة عرض التفاصيل */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-lg max-w-sm w-full p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">تفاصيل المستخدم</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">الاسم</p>
                <p className="font-medium">{selectedUser.full_name || selectedUser.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">رقم الهاتف</p>
                <p className="font-medium" dir="ltr">{selectedUser.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">المدينة</p>
                <p className="font-medium">{selectedUser.city || 'غير محدد'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">تاريخ التسجيل</p>
                <p className="font-medium">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('ar-SY') : '-'}</p>
              </div>
              {selectedUser.addresses && selectedUser.addresses.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500">العنوان</p>
                  <p className="font-medium text-sm">
                    {selectedUser.addresses[0].street}
                    {selectedUser.addresses[0].building_number && ` - بناء ${selectedUser.addresses[0].building_number}`}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t flex gap-2">
              <button
                onClick={() => { handleAction('ban', selectedUser); setSelectedUser(null); }}
                className="flex-1 py-2 bg-orange-100 text-orange-600 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
              >
                <Ban size={14} />
                حظر
              </button>
              <button
                onClick={() => { handleAction('delete', selectedUser); setSelectedUser(null); }}
                className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
              >
                <Trash2 size={14} />
                حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                actionModal.type === 'delete' ? 'bg-red-100' : 'bg-orange-100'
              }`}>
                {actionModal.type === 'delete' ? (
                  <Trash2 size={20} className="text-red-600" />
                ) : (
                  <Ban size={20} className="text-orange-600" />
                )}
              </div>
              <div>
                <h3 className="font-bold">
                  {actionModal.type === 'delete' ? 'حذف المستخدم' : 'حظر المستخدم'}
                </h3>
                <p className="text-xs text-gray-500">
                  {actionModal.user?.full_name || actionModal.user?.name}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {actionModal.type === 'delete' 
                ? 'هل تريد حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'هل تريد حظر هذا المستخدم؟ لن يتمكن من استخدام التطبيق.'
              }
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setActionModal({ isOpen: false, type: null, user: null })}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={confirmAction}
                className={`flex-1 py-2 text-white rounded-lg text-sm flex items-center justify-center gap-2 ${
                  actionModal.type === 'delete' ? 'bg-red-500' : 'bg-orange-500'
                }`}
              >
                {actionModal.type === 'delete' ? <Trash2 size={16} /> : <Ban size={16} />}
                {actionModal.type === 'delete' ? 'حذف' : 'حظر'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default UsersTab;
