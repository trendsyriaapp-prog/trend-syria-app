// /app/frontend/src/components/admin/delivery-settings/CustomerProtectionCard.js
// بطاقة حماية العميل من التأخير

import { Shield, Save, RefreshCw } from 'lucide-react';

const CustomerProtectionCard = ({ 
  customerProtection, 
  setCustomerProtection, 
  saving, 
  onSave 
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
      <div className="bg-gradient-to-l from-blue-500 to-cyan-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <Shield size={18} />
          <div>
            <h2 className="font-bold text-sm">حماية العميل من التأخير</h2>
            <p className="text-sm text-white/80">إشعارات وتعويضات تلقائية عند تأخر الطلبات</p>
          </div>
        </div>
      </div>
      
      <div className="p-3 space-y-3">
        {/* تفعيل/إيقاف */}
        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-700">تفعيل نظام حماية العميل</p>
            <p className="text-xs text-gray-500">إشعارات وتعويضات تلقائية عند التأخير</p>
          </div>
          <button
            onClick={() => setCustomerProtection(prev => ({
              ...prev,
              customer_protection_enabled: !prev.customer_protection_enabled
            }))}
            className={`w-12 h-6 rounded-full transition-colors ${
              customerProtection.customer_protection_enabled ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
              customerProtection.customer_protection_enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
        
        {customerProtection.customer_protection_enabled && (
          <>
            {/* إعدادات التوقيت */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  إشعار التأخير (دقائق)
                </label>
                <input
                  type="number"
                  value={customerProtection.delay_notification_minutes}
                  onChange={(e) => setCustomerProtection(prev => ({
                    ...prev,
                    delay_notification_minutes: parseInt(e.target.value) || 5
                  }))}
                  className="w-full p-1.5 border rounded text-sm"
                  min="1"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">بعد الوقت المتوقع</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  إلغاء مجاني (دقائق)
                </label>
                <input
                  type="number"
                  value={customerProtection.free_cancel_delay_minutes}
                  onChange={(e) => setCustomerProtection(prev => ({
                    ...prev,
                    free_cancel_delay_minutes: parseInt(e.target.value) || 15
                  }))}
                  className="w-full p-1.5 border rounded text-sm"
                  min="1"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">تأخير يتيح الإلغاء</p>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  كوبون تعويض (دقائق)
                </label>
                <input
                  type="number"
                  value={customerProtection.compensation_coupon_delay_minutes}
                  onChange={(e) => setCustomerProtection(prev => ({
                    ...prev,
                    compensation_coupon_delay_minutes: parseInt(e.target.value) || 20
                  }))}
                  className="w-full p-1.5 border rounded text-sm"
                  min="1"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">تأخير يمنح كوبون</p>
              </div>
            </div>
            
            {/* إعدادات التعويض */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  نسبة الكوبون %
                </label>
                <input
                  type="number"
                  value={customerProtection.compensation_coupon_percent}
                  onChange={(e) => setCustomerProtection(prev => ({
                    ...prev,
                    compensation_coupon_percent: parseInt(e.target.value) || 10
                  }))}
                  className="w-full p-1.5 border rounded text-sm"
                  min="1"
                  max="50"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  حد الكوبون (ل.س)
                </label>
                <input
                  type="number"
                  value={customerProtection.max_coupon_value}
                  onChange={(e) => setCustomerProtection(prev => ({
                    ...prev,
                    max_coupon_value: parseInt(e.target.value) || 15000
                  }))}
                  className="w-full p-1.5 border rounded text-sm"
                  min="1000"
                  step="1000"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  تعويض البائع %
                </label>
                <input
                  type="number"
                  value={customerProtection.seller_compensation_on_cancel_percent}
                  onChange={(e) => setCustomerProtection(prev => ({
                    ...prev,
                    seller_compensation_on_cancel_percent: parseInt(e.target.value) || 50
                  }))}
                  className="w-full p-1.5 border rounded text-sm"
                  min="0"
                  max="100"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">عند إلغاء بعد التحضير</p>
              </div>
            </div>
            
            {/* ملخص الإعدادات */}
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 text-xs">
              <p className="font-medium text-blue-800 mb-1">📋 ملخص:</p>
              <ul className="space-y-0.5 text-blue-700">
                <li>• إشعار العميل بعد <strong>{customerProtection.delay_notification_minutes}</strong> دقائق تأخير</li>
                <li>• إلغاء مجاني بعد <strong>{customerProtection.free_cancel_delay_minutes}</strong> دقائق تأخير</li>
                <li>• كوبون <strong>{customerProtection.compensation_coupon_percent}%</strong> (حد {customerProtection.max_coupon_value.toLocaleString()} ل.س) بعد <strong>{customerProtection.compensation_coupon_delay_minutes}</strong> دقائق</li>
                <li>• تعويض البائع <strong>{customerProtection.seller_compensation_on_cancel_percent}%</strong> إذا أُلغي الطلب بعد التحضير</li>
              </ul>
            </div>
          </>
        )}
        
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 text-sm"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          حفظ إعدادات حماية العميل
        </button>
      </div>
    </div>
  );
};

export default CustomerProtectionCard;
