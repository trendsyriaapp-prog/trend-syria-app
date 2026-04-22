import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Check, Building, Home } from 'lucide-react';

// المحافظات السورية
const SYRIAN_CITIES = [
  'دمشق',
  'ريف دمشق',
  'حلب',
  'حمص',
  'حماة',
  'اللاذقية',
  'طرطوس',
  'إدلب',
  'دير الزور',
  'الرقة',
  'الحسكة',
  'درعا',
  'السويداء',
  'القنيطرة'
];

const AddressPickerModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialAddress = null,
  title = "إضافة العنوان"
}) => {
  const [address, setAddress] = useState({
    city: '',
    area: '',
    street: '',
    street_number: '',
    building_number: ''
  });

  useEffect(() => {
    if (initialAddress) {
      setAddress({
        city: initialAddress.city || '',
        area: initialAddress.area || '',
        street: initialAddress.street || '',
        street_number: initialAddress.street_number || '',
        building_number: initialAddress.building_number || ''
      });
    }
  }, [initialAddress, isOpen]);

  const handleChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // التحقق من الحقول المطلوبة
    if (!address.city || !address.area || !address.street) {
      return;
    }
    
    // إنشاء العنوان الكامل كنص
    const fullAddress = [
      address.city,
      address.area,
      address.street,
      address.street_number ? `رقم ${address.street_number}` : '',
      address.building_number ? `بناء/محل ${address.building_number}` : ''
    ].filter(Boolean).join('، ');
    
    onSave({
      ...address,
      full_address: fullAddress
    });
    onClose();
  };

  const isValid = address.city && address.area && address.street;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={20} className="text-[#FF6B00]" />
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* المدينة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المدينة / المحافظة *
              </label>
              <select
                value={address.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] bg-white"
              >
                <option value="">اختر المدينة</option>
                {SYRIAN_CITIES.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* المنطقة */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المنطقة / الحي *
              </label>
              <input
                type="text"
                value={address.area}
                onChange={(e) => handleChange('area', e.target.value)}
                placeholder="مثال: المزة، الشعلان، العزيزية"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
              />
            </div>

            {/* اسم الشارع */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اسم الشارع *
              </label>
              <input
                type="text"
                value={address.street}
                onChange={(e) => handleChange('street', e.target.value)}
                placeholder="مثال: شارع بغداد، شارع الثورة"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
              />
            </div>

            {/* اسم الشارع ورقم المحل في صف واحد */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم الشارع
                  <span className="text-gray-400 text-xs mr-1">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={address.street_number}
                  onChange={(e) => handleChange('street_number', e.target.value)}
                  placeholder="مثال: النصر، بغداد"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رقم المحل/البناء *
                </label>
                <input
                  type="text"
                  value={address.building_number}
                  onChange={(e) => handleChange('building_number', e.target.value)}
                  placeholder="مثال: 3"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                />
              </div>
            </div>

            {/* معاينة العنوان */}
            {isValid && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-1">معاينة العنوان:</p>
                <p className="text-gray-800 font-medium">
                  {[
                    address.city,
                    address.area,
                    address.street,
                    address.street_number ? `رقم ${address.street_number}` : '',
                    address.building_number ? `بناء/محل ${address.building_number}` : ''
                  ].filter(Boolean).join('، ')}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 rounded-b-2xl">
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#E65000] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check size={20} />
              حفظ العنوان
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AddressPickerModal;
