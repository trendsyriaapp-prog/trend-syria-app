// /app/frontend/src/components/admin/UsersTab.js
import { Users, MapPin, Phone, Calendar } from 'lucide-react';

const UsersTab = ({ allUsers }) => {
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
            <div key={u.id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900 truncate">{u.full_name || u.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1" dir="ltr">
                    <Phone size={10} />
                    {u.phone}
                  </p>
                </div>
                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Calendar size={10} />
                  {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-SY') : '-'}
                </div>
              </div>
              
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
    </section>
  );
};

export default UsersTab;
