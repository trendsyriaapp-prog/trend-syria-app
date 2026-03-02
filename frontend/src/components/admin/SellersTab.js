// /app/frontend/src/components/admin/SellersTab.js
import { Users } from 'lucide-react';

const SellersTab = ({ allSellers }) => {
  return (
    <section>
      <h2 className="font-bold text-sm text-gray-900 mb-3">جميع البائعين ({allSellers.length})</h2>
      {allSellers.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Users size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد بائعين</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-2 text-right font-bold text-gray-700">الاسم</th>
                  <th className="py-2 px-2 text-right font-bold text-gray-700">المتجر</th>
                  <th className="py-2 px-2 text-right font-bold text-gray-700">الهاتف</th>
                  <th className="py-2 px-2 text-right font-bold text-gray-700">المدينة</th>
                  <th className="py-2 px-2 text-right font-bold text-gray-700">العنوان الكامل</th>
                  <th className="py-2 px-2 text-right font-bold text-gray-700">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {allSellers.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-2 font-medium text-gray-900">{s.full_name || s.name}</td>
                    <td className="py-2 px-2 text-gray-600">{s.documents?.business_name || '-'}</td>
                    <td className="py-2 px-2 text-gray-600">{s.phone}</td>
                    <td className="py-2 px-2 text-gray-600">{s.city}</td>
                    <td className="py-2 px-2 text-gray-600 text-[10px]">
                      {s.addresses && s.addresses.length > 0 ? (
                        <div>
                          <p>{s.addresses[0].street}</p>
                          {s.addresses[0].street_number && <span>شارع {s.addresses[0].street_number}</span>}
                          {s.addresses[0].building_number && <span> - بناء {s.addresses[0].building_number}</span>}
                          {s.addresses[0].house_number && <span> - منزل {s.addresses[0].house_number}</span>}
                          <p className="text-gray-400">{s.addresses[0].city} - {s.addresses[0].country}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">لا يوجد عنوان</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        s.documents?.status === 'approved' 
                          ? 'bg-green-100 text-green-600' 
                          : s.documents?.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {s.documents?.status === 'approved' ? 'معتمد' : s.documents?.status === 'pending' ? 'معلق' : 'غير مكتمل'}
                      </span>
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

export default SellersTab;
