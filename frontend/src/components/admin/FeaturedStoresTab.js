// /app/frontend/src/components/admin/FeaturedStoresTab.js
// إدارة المتاجر المميزة في قسم الطعام

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Store, Check, X, Search, Star, GripVertical } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const FeaturedStoresTab = () => {
  const [enabled, setEnabled] = useState(false);
  const [selectedStores, setSelectedStores] = useState([]);
  const [allStores, setAllStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, storesRes] = await Promise.all([
        axios.get(`${API}/settings/featured-stores`),
        axios.get(`${API}/food/stores`)
      ]);
      
      setEnabled(settingsRes.data.enabled || false);
      setSelectedStores(settingsRes.data.store_ids || []);
      setAllStores(storesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/featured-stores`, {
        enabled,
        store_ids: selectedStores
      });
      alert('تم حفظ الإعدادات بنجاح');
    } catch (error) {
      alert('فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const toggleStore = (storeId) => {
    if (selectedStores.includes(storeId)) {
      setSelectedStores(selectedStores.filter(id => id !== storeId));
    } else if (selectedStores.length < 4) {
      setSelectedStores([...selectedStores, storeId]);
    } else {
      alert('يمكنك اختيار 4 متاجر كحد أقصى');
    }
  };

  const moveStore = (index, direction) => {
    const newStores = [...selectedStores];
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < newStores.length) {
      [newStores[index], newStores[newIndex]] = [newStores[newIndex], newStores[index]];
      setSelectedStores(newStores);
    }
  };

  const filteredStores = allStores.filter(store => 
    store.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStoreById = (id) => allStores.find(s => s.id === id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B00]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* العنوان */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] rounded-lg">
            <Store className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">المتاجر المميزة</h2>
            <p className="text-sm text-gray-500">اختر 4 متاجر لعرضها في أعلى صفحة الطعام</p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      {/* تفعيل/إيقاف الميزة */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">تفعيل المتاجر المميزة</h3>
            <p className="text-sm text-gray-500">
              {enabled 
                ? 'المتاجر المختارة ستظهر في أعلى صفحة الطعام' 
                : 'سيتم عرض أفضل 4 متاجر حسب التقييم تلقائياً'
              }
            </p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              enabled ? 'bg-[#FF6B00]' : 'bg-gray-300'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              enabled ? 'right-1' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {/* المتاجر المختارة */}
      {enabled && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-3">المتاجر المختارة ({selectedStores.length}/4)</h3>
          
          {selectedStores.length === 0 ? (
            <p className="text-gray-500 text-center py-4">لم يتم اختيار أي متجر بعد</p>
          ) : (
            <div className="space-y-2">
              {selectedStores.map((storeId, index) => {
                const store = getStoreById(storeId);
                if (!store) return null;
                return (
                  <div 
                    key={storeId}
                    className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg"
                  >
                    <div className="flex flex-col gap-1">
                      <button 
                        onClick={() => moveStore(index, -1)}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        ▲
                      </button>
                      <button 
                        onClick={() => moveStore(index, 1)}
                        disabled={index === selectedStores.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        ▼
                      </button>
                    </div>
                    <span className="w-6 h-6 flex items-center justify-center bg-[#FF6B00] text-white rounded-full text-sm font-bold">
                      {index + 1}
                    </span>
                    <img 
                      src={store.image || '/placeholder-store.png'} 
                      alt={store.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{store.name}</p>
                      <p className="text-xs text-gray-500">{store.city}</p>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={14} fill="currentColor" />
                      <span className="text-sm">{store.rating || 0}</span>
                    </div>
                    <button
                      onClick={() => toggleStore(storeId)}
                      className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* قائمة جميع المتاجر */}
      {enabled && (
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-bold text-gray-900">جميع المتاجر</h3>
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="بحث عن متجر..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {filteredStores.map((store) => {
              const isSelected = selectedStores.includes(store.id);
              return (
                <button
                  key={store.id}
                  onClick={() => toggleStore(store.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-right ${
                    isSelected 
                      ? 'bg-orange-50 border-orange-300' 
                      : 'bg-gray-50 border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <img 
                    src={store.image || '/placeholder-store.png'} 
                    alt={store.name}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{store.name}</p>
                    <p className="text-xs text-gray-500">{store.city}</p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star size={12} fill="currentColor" />
                    <span className="text-xs">{store.rating || 0}</span>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 bg-[#FF6B00] rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* معاينة */}
      {enabled && selectedStores.length > 0 && (
        <div className="bg-gray-100 rounded-lg p-4">
          <h3 className="font-bold text-gray-900 mb-3">معاينة (كما ستظهر للعميل)</h3>
          <div className="bg-white rounded-lg p-4">
            <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              المتاجر
              <span className="text-[10px] bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-2 py-0.5 rounded-full">
                مميزة
              </span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {selectedStores.slice(0, 4).map((storeId) => {
                const store = getStoreById(storeId);
                if (!store) return null;
                return (
                  <div key={storeId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <img 
                      src={store.image || '/placeholder-store.png'} 
                      alt={store.name}
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-2">
                      <p className="font-medium text-sm text-gray-900 truncate">{store.name}</p>
                      <p className="text-xs text-gray-500">{store.city}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeaturedStoresTab;
