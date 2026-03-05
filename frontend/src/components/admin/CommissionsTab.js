// /app/frontend/src/components/admin/CommissionsTab.js
// مكون إدارة العمولات

import { useState } from 'react';
import { Percent, Edit2, Trash2, Plus } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const CommissionsTab = ({ 
  commissionsReport, 
  commissionRates, 
  user,
  onSaveRates,
  toast
}) => {
  const [editingRates, setEditingRates] = useState(false);
  const [editedRates, setEditedRates] = useState({});
  const [newCategory, setNewCategory] = useState({ name: '', rate: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [tempRate, setTempRate] = useState('');

  const handleStartEditRates = () => {
    if (commissionRates) {
      const rates = {};
      commissionRates.rates.forEach(r => {
        const numericRate = parseFloat(r.percentage.replace('%', '')) / 100;
        rates[r.category] = numericRate;
      });
      rates['default'] = parseFloat(commissionRates.default_percentage.replace('%', '')) / 100;
      setEditedRates(rates);
      setEditingRates(true);
    }
  };

  // تعديل مباشر لنسبة معينة
  const handleDirectEdit = (category, currentRate) => {
    if (user.user_type !== 'admin') return;
    setEditingCategory(category);
    const rate = parseFloat(currentRate.replace('%', ''));
    setTempRate(rate.toString());
  };

  const handleSaveDirectEdit = async () => {
    if (!editingCategory || !tempRate) return;
    
    try {
      // تحضير البيانات
      const rates = {};
      if (commissionRates) {
        commissionRates.rates.forEach(r => {
          const numericRate = parseFloat(r.percentage.replace('%', '')) / 100;
          rates[r.category] = numericRate;
        });
        rates['default'] = parseFloat(commissionRates.default_percentage.replace('%', '')) / 100;
      }
      
      // تحديث النسبة المعدلة
      rates[editingCategory] = parseFloat(tempRate) / 100;
      
      await onSaveRates(rates);
      setEditingCategory(null);
      setTempRate('');
      toast({
        title: "تم الحفظ",
        description: `تم تحديث نسبة ${editingCategory} إلى ${tempRate}%`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل حفظ النسبة",
        variant: "destructive"
      });
    }
  };

  const handleCancelDirectEdit = () => {
    setEditingCategory(null);
    setTempRate('');
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (newCategory.name && newCategory.rate) {
      setEditedRates({
        ...editedRates,
        [newCategory.name]: parseFloat(newCategory.rate) / 100
      });
      setNewCategory({ name: '', rate: '' });
    }
  };

  const handleDeleteCategory = (category) => {
    const newRates = { ...editedRates };
    delete newRates[category];
    setEditedRates(newRates);
  };

  const handleSaveRates = async () => {
    try {
      await onSaveRates(editedRates);
      setEditingRates(false);
      toast({
        title: "تم الحفظ",
        description: "تم حفظ نسب العمولات بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل حفظ نسب العمولات",
        variant: "destructive"
      });
    }
  };

  return (
    <section>
      {/* ملخص العمولات */}
      {commissionsReport && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <p className="text-[10px] text-gray-500">إجمالي المبيعات</p>
            <p className="text-lg font-bold text-gray-900">{formatPrice(commissionsReport.summary.total_sales)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <p className="text-[10px] text-gray-500">إجمالي العمولات</p>
            <p className="text-lg font-bold text-green-600">{formatPrice(commissionsReport.summary.total_commission)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <p className="text-[10px] text-gray-500">حصة البائعين</p>
            <p className="text-lg font-bold text-blue-600">{formatPrice(commissionsReport.summary.total_seller_amount)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-200">
            <p className="text-[10px] text-gray-500">عدد الطلبات</p>
            <p className="text-lg font-bold text-gray-900">{commissionsReport.summary.orders_count}</p>
          </div>
        </div>
      )}
      
      {/* نسب العمولات حسب الفئة */}
      {commissionRates && (
        <div className="bg-white rounded-xl p-3 border border-gray-200 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-xs text-gray-900 flex items-center gap-1">
              <Percent size={14} className="text-[#FF6B00]" />
              نسب العمولات حسب الفئة
            </h3>
            {user.user_type === 'admin' && !editingRates && (
              <button
                onClick={handleStartEditRates}
                className="flex items-center gap-1 text-[10px] text-[#FF6B00] hover:text-[#E65000]"
              >
                <Edit2 size={12} />
                تعديل
              </button>
            )}
          </div>
          
          {!editingRates ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {commissionRates.rates.map((rate) => (
                  <div 
                    key={rate.category} 
                    className={`flex justify-between items-center p-2 rounded-lg transition-all ${
                      editingCategory === rate.category 
                        ? 'bg-orange-50 border border-orange-300' 
                        : 'bg-gray-50 hover:bg-orange-50 cursor-pointer'
                    }`}
                    onClick={() => !editingCategory && handleDirectEdit(rate.category, rate.percentage)}
                  >
                    <span className="text-xs text-gray-700">{rate.category}</span>
                    {editingCategory === rate.category ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={tempRate}
                          onChange={(e) => setTempRate(e.target.value)}
                          className="w-14 text-xs p-1 border border-orange-300 rounded text-center font-bold"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-[10px] text-gray-500">%</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSaveDirectEdit(); }}
                          className="p-1 bg-green-500 text-white rounded text-[10px]"
                        >
                          ✓
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCancelDirectEdit(); }}
                          className="p-1 bg-gray-400 text-white rounded text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-[#FF6B00] flex items-center gap-1">
                        {rate.percentage}
                        {user.user_type === 'admin' && <Edit2 size={10} className="text-gray-400" />}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div 
                className={`mt-2 pt-2 border-t border-gray-200 flex justify-between items-center p-2 rounded-lg transition-all ${
                  editingCategory === 'default' 
                    ? 'bg-orange-50 border border-orange-300' 
                    : 'hover:bg-orange-50 cursor-pointer'
                }`}
                onClick={() => !editingCategory && handleDirectEdit('default', commissionRates.default_percentage)}
              >
                <span className="text-xs text-gray-500">النسبة الافتراضية</span>
                {editingCategory === 'default' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tempRate}
                      onChange={(e) => setTempRate(e.target.value)}
                      className="w-14 text-xs p-1 border border-orange-300 rounded text-center font-bold"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-[10px] text-gray-500">%</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSaveDirectEdit(); }}
                      className="p-1 bg-green-500 text-white rounded text-[10px]"
                    >
                      ✓
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCancelDirectEdit(); }}
                      className="p-1 bg-gray-400 text-white rounded text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                    {commissionRates.default_percentage}
                    {user.user_type === 'admin' && <Edit2 size={10} className="text-gray-400" />}
                  </span>
                )}
              </div>
              
              {user.user_type === 'admin' && (
                <p className="text-[9px] text-gray-400 mt-2 text-center">انقر على أي نسبة لتعديلها مباشرة</p>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {Object.entries(editedRates).filter(([cat]) => cat !== 'default').map(([category, rate]) => (
                  <div key={category} className="flex items-center gap-1 p-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-700 flex-1">{category}</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(rate * 100)}
                      onChange={(e) => setEditedRates({...editedRates, [category]: parseFloat(e.target.value) / 100})}
                      className="w-12 text-xs p-1 border border-gray-300 rounded text-center"
                    />
                    <span className="text-[10px] text-gray-500">%</span>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* النسبة الافتراضية */}
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg mb-3">
                <span className="text-xs text-gray-700 flex-1">النسبة الافتراضية</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round((editedRates['default'] || 0.15) * 100)}
                  onChange={(e) => setEditedRates({...editedRates, default: parseFloat(e.target.value) / 100})}
                  className="w-12 text-xs p-1 border border-gray-300 rounded text-center"
                />
                <span className="text-[10px] text-gray-500">%</span>
              </div>
              
              {/* إضافة فئة جديدة */}
              <form onSubmit={handleAddCategory} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg mb-3">
                <input
                  type="text"
                  placeholder="اسم الفئة"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                  className="flex-1 text-xs p-1 border border-gray-300 rounded"
                />
                <input
                  type="number"
                  placeholder="%"
                  min="0"
                  max="100"
                  value={newCategory.rate}
                  onChange={(e) => setNewCategory({...newCategory, rate: e.target.value})}
                  className="w-12 text-xs p-1 border border-gray-300 rounded text-center"
                />
                <button
                  type="submit"
                  className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  <Plus size={14} />
                </button>
              </form>
              
              {/* أزرار الحفظ والإلغاء */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveRates}
                  className="flex-1 bg-[#FF6B00] text-white text-xs py-1.5 rounded-lg font-bold hover:bg-[#E65000]"
                >
                  حفظ التعديلات
                </button>
                <button
                  onClick={() => setEditingRates(false)}
                  className="px-3 bg-gray-200 text-gray-700 text-xs py-1.5 rounded-lg font-bold hover:bg-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* العمولات حسب الفئة */}
      {commissionsReport?.by_category && Object.keys(commissionsReport.by_category).length > 0 && (
        <div className="bg-white rounded-xl p-3 border border-gray-200 mb-4">
          <h3 className="font-bold text-xs text-gray-900 mb-2">العمولات حسب الفئة</h3>
          <div className="space-y-2">
            {Object.entries(commissionsReport.by_category).map(([category, data]) => (
              <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs font-bold text-gray-900">{category}</p>
                  <p className="text-[10px] text-gray-500">{data.orders_count} طلب</p>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-green-600">{formatPrice(data.commission)}</p>
                  <p className="text-[10px] text-gray-500">من {formatPrice(data.sales)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* آخر الطلبات مع العمولات */}
      {commissionsReport?.recent_orders && commissionsReport.recent_orders.length > 0 && (
        <div className="bg-white rounded-xl p-3 border border-gray-200">
          <h3 className="font-bold text-xs text-gray-900 mb-2">آخر الطلبات مع العمولات</h3>
          <div className="space-y-2">
            {commissionsReport.recent_orders.map((order) => (
              <div key={order.id} className="p-2 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="text-xs font-bold text-gray-900">طلب #{order.id.slice(-6)}</p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(order.created_at).toLocaleDateString('ar-SY')}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-gray-900">{formatPrice(order.total)}</p>
                    <p className="text-[10px] text-green-600">عمولة: {formatPrice(order.total_commission)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default CommissionsTab;
