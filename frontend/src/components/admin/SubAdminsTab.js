// /app/frontend/src/components/admin/SubAdminsTab.js
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, UserPlus, Trash2 } from 'lucide-react';

const SubAdminsTab = ({ subAdmins, onAdd, onDelete }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubAdmin, setNewSubAdmin] = useState({
    full_name: '',
    phone: '',
    password: '',
    city: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onAdd(newSubAdmin);
    setShowAddForm(false);
    setNewSubAdmin({ full_name: '', phone: '', password: '', city: '' });
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-sm text-gray-900">المدراء التنفيذيين</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 bg-[#FF6B00] text-white px-2 py-1 rounded-lg text-xs font-bold hover:bg-[#E65000] transition-colors"
          data-testid="add-sub-admin-btn"
        >
          <UserPlus size={12} />
          إضافة مدير
        </button>
      </div>

      {/* Add Sub-Admin Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-3 mb-3"
        >
          <h3 className="font-bold text-xs text-gray-900 mb-2">إضافة مدير تنفيذي جديد</h3>
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="text"
              placeholder="الاسم الكامل"
              value={newSubAdmin.full_name}
              onChange={(e) => setNewSubAdmin({...newSubAdmin, full_name: e.target.value})}
              className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
              required
            />
            <input
              type="tel"
              placeholder="رقم الهاتف"
              value={newSubAdmin.phone}
              onChange={(e) => setNewSubAdmin({...newSubAdmin, phone: e.target.value})}
              className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
              required
            />
            <input
              type="password"
              placeholder="كلمة المرور"
              value={newSubAdmin.password}
              onChange={(e) => setNewSubAdmin({...newSubAdmin, password: e.target.value})}
              className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
              required
            />
            <input
              type="text"
              placeholder="المدينة"
              value={newSubAdmin.city}
              onChange={(e) => setNewSubAdmin({...newSubAdmin, city: e.target.value})}
              className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-[#FF6B00] text-white py-1.5 rounded-lg font-bold text-xs"
              >
                إضافة
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

      {subAdmins.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <ShieldCheck size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد مدراء تنفيذيين</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subAdmins.map((admin) => (
            <div key={admin.id} className="bg-white rounded-lg border border-gray-200 p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <ShieldCheck size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-gray-900">{admin.full_name || admin.name}</h3>
                    <p className="text-[10px] text-gray-500">{admin.phone} - {admin.city}</p>
                  </div>
                </div>
                <button
                  onClick={() => onDelete(admin.id)}
                  className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                  data-testid={`delete-sub-admin-${admin.id}`}
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

export default SubAdminsTab;
