// /app/frontend/src/components/admin/SellersTab.js
import { Store, Phone, MapPin } from 'lucide-react';

const SellersTab = ({ allSellers }) => {
  return (
    <section>
      {allSellers.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Store size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد بائعين</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allSellers.map((s) => (
            <div key={s.id} className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-gray-900 truncate">{s.full_name || s.name}</h3>
                  {s.documents?.business_name && (
                    <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                      <Store size={10} />
                      {s.documents.business_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1" dir="ltr">
                    <Phone size={10} />
                    {s.phone}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${
                  s.documents?.status === 'approved' 
                    ? 'bg-green-100 text-green-600' 
                    : s.documents?.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {s.documents?.status === 'approved' ? 'معتمد' : s.documents?.status === 'pending' ? 'معلق' : 'غير مكتمل'}
                </span>
              </div>
              
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-start gap-1 text-xs text-gray-600">
                  <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium">{s.city || 'غير محدد'}</span>
                    {s.addresses && s.addresses.length > 0 && (
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                        {s.addresses[0].street}
                        {s.addresses[0].building_number && ` - بناء ${s.addresses[0].building_number}`}
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

export default SellersTab;
