// /app/frontend/src/components/admin/UsersTab.js
import { Users } from 'lucide-react';

const UsersTab = ({ allUsers }) => {
  return (
    <section>
      {allUsers.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Users size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد مستخدمين</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-2 text-right font-bold text-gray-700">الاسم</th>
                  <th className="py-2 px-2 text-right font-bold text-gray-700">الهاتف</th>
                  <th className="py-2 px-2 text-right font-bold text-gray-700">المدينة</th>
                  <th className="py-2 px-2 text-right font-bold text-gray-700">العنوان الكامل</th>
                  <th className="py-2 px-2 text-right font-bold text-gray-700">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u, i) => (
                  <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-2 font-medium text-gray-900">{u.full_name || u.name}</td>
                    <td className="py-2 px-2 text-gray-600">{u.phone}</td>
                    <td className="py-2 px-2 text-gray-600">{u.city}</td>
                    <td className="py-2 px-2 text-gray-600 text-[10px]">
                      {u.addresses && u.addresses.length > 0 ? (
                        <div>
                          <p>{u.addresses[0].street}</p>
                          {u.addresses[0].street_number && <span>شارع {u.addresses[0].street_number}</span>}
                          {u.addresses[0].building_number && <span> - بناء {u.addresses[0].building_number}</span>}
                          {u.addresses[0].house_number && <span> - منزل {u.addresses[0].house_number}</span>}
                          <p className="text-gray-400">{u.addresses[0].city} - {u.addresses[0].country}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">لا يوجد عنوان</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-gray-400 text-[10px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-SY') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default UsersTab;
