// /app/frontend/src/components/admin/DeliveryTab.js
import { Truck, Check, X } from 'lucide-react';

const DeliveryTab = ({ 
  allDelivery, 
  pendingDelivery, 
  isPending = false,
  onApprove, 
  onReject 
}) => {
  // Pending delivery drivers view
  if (isPending) {
    return (
      <section>
        {pendingDelivery.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
            <Check size={36} className="text-green-500 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">لا يوجد موظفي توصيل في انتظار الموافقة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDelivery.map((doc) => (
              <div key={doc.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-3">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{doc.driver_name || doc.driver?.full_name || doc.driver?.name}</h3>
                      <p className="text-xs text-gray-500">{doc.driver_phone || doc.driver?.phone}</p>
                      <p className="text-xs text-gray-400">{doc.driver_city || doc.driver?.city}</p>
                      <p className="text-xs text-gray-600 mt-1">رقم الهوية: {doc.national_id}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onApprove(doc.driver_id || doc.delivery_id)}
                        className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => onReject(doc.driver_id || doc.delivery_id)}
                        className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* الوثائق */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">صورة شخصية</p>
                      {doc.personal_photo && (
                        <img src={doc.personal_photo} alt="صورة شخصية" className="w-full h-20 object-cover rounded-lg" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">صورة الهوية</p>
                      {doc.id_photo && (
                        <img src={doc.id_photo} alt="صورة الهوية" className="w-full h-20 object-cover rounded-lg" />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">رخصة الدراجة</p>
                      {doc.motorcycle_license && (
                        <img src={doc.motorcycle_license} alt="رخصة الدراجة" className="w-full h-20 object-cover rounded-lg" />
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
  }

  // All delivery drivers view
  return (
    <section>
      {allDelivery.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Truck size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد موظفي توصيل</p>
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
                  <th className="py-2 px-2 text-right font-bold text-gray-700">رقم الهوية</th>
                  <th className="py-2 px-2 text-right font-bold text-gray-700">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {allDelivery.map((driver, i) => (
                  <tr key={driver.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-2 font-medium text-gray-900">{driver.full_name || driver.name}</td>
                    <td className="py-2 px-2 text-gray-600">{driver.phone}</td>
                    <td className="py-2 px-2 text-gray-600">{driver.city}</td>
                    <td className="py-2 px-2 text-gray-600">{driver.documents?.national_id || '-'}</td>
                    <td className="py-2 px-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        driver.documents?.status === 'approved' 
                          ? 'bg-green-100 text-green-600' 
                          : driver.documents?.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {driver.documents?.status === 'approved' ? 'معتمد' : driver.documents?.status === 'pending' ? 'معلق' : 'غير مكتمل'}
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

export default DeliveryTab;
