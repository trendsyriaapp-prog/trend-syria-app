import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, X, Check, Plus, Search, ChevronDown } from 'lucide-react';

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

// مناطق كل محافظة
const CITY_AREAS = {
  'دمشق': [
    'المزة', 'كفرسوسة', 'المالكي', 'أبو رمانة', 'الشعلان', 'ساروجة', 
    'باب توما', 'القصاع', 'الصالحية', 'المهاجرين', 'ركن الدين', 'برزة',
    'القابون', 'جوبر', 'الميدان', 'نهر عيشة', 'القدم', 'التضامن',
    'اليرموك', 'الحجر الأسود', 'دمر', 'الهامة', 'قدسيا', 'الربوة',
    'مشروع دمر', 'المعضمية', 'داريا', 'صحنايا', 'جديدة الفضل'
  ],
  'ريف دمشق': [
    'جرمانا', 'سحنايا', 'عربين', 'دوما', 'حرستا', 'زملكا', 'عين ترما',
    'المليحة', 'جديدة عرطوز', 'قطنا', 'الزبداني', 'مضايا', 'بلودان',
    'يبرود', 'النبك', 'دير عطية', 'قارة', 'رنكوس', 'معلولا',
    'صيدنايا', 'التل', 'منين', 'الكسوة', 'خان الشيح', 'الهامة'
  ],
  'حلب': [
    'العزيزية', 'الحمدانية', 'السليمانية', 'الشهباء', 'حلب الجديدة',
    'الفرقان', 'المشارقة', 'السبيل', 'باب الفرج', 'الجميلية', 'المحافظة',
    'الصاخور', 'طريق الباب', 'الميسر', 'هنانو', 'الأنصاري', 'صلاح الدين',
    'سيف الدولة', 'الحيدرية', 'الشيخ مقصود', 'عفرين', 'إعزاز', 'منبج',
    'الباب', 'جرابلس', 'مارع', 'الراعي', 'صوران', 'تل رفعت'
  ],
  'حمص': [
    'الوعر', 'كرم الزيتون', 'الإنشاءات', 'عكرمة', 'الزهراء', 'الغوطة',
    'باب السباع', 'بابا عمرو', 'الخالدية', 'القصور', 'جورة الشياح',
    'الحميدية', 'باب الدريب', 'باب تدمر', 'المحطة', 'الفاخورة',
    'تلبيسة', 'الرستن', 'تدمر', 'القريتين', 'الفرقلس', 'صدد'
  ],
  'حماة': [
    'العليليات', 'باب قبلي', 'الحاضر', 'الضاحية', 'كفر بهم', 'السلمية',
    'مصياف', 'محردة', 'السقيلبية', 'طيبة الإمام', 'صوران', 'قلعة المضيق',
    'خان شيخون', 'كفرنبودة', 'اللطامنة', 'كفرزيتا', 'التمانعة'
  ],
  'اللاذقية': [
    'الرمل الشمالي', 'الرمل الجنوبي', 'الصليبة', 'الشاطئ الأزرق',
    'المشروع العاشر', 'الزراعة', 'المنشية', 'السنوبر', 'جبلة',
    'القرداحة', 'الحفة', 'صلنفة', 'كسب', 'عين البيضاء', 'الباسوطة'
  ],
  'طرطوس': [
    'الثورة', 'الكورنيش', 'المشتل', 'الغمقة', 'أرواد', 'صافيتا',
    'بانياس', 'دريكيش', 'الشيخ بدر', 'القدموس', 'مشتى الحلو',
    'حصين البحر', 'الحميدية', 'سفوح الشيخ بدر'
  ],
  'إدلب': [
    'إدلب المدينة', 'أريحا', 'جسر الشغور', 'معرة النعمان', 'سراقب',
    'كفرنبل', 'خان شيخون', 'حارم', 'سلقين', 'الدانا', 'عزمارين',
    'بنش', 'تفتناز', 'معرة مصرين', 'كفر تخاريم'
  ],
  'دير الزور': [
    'دير الزور المدينة', 'الميادين', 'البوكمال', 'الأشارة', 'الصالحية',
    'الموحسن', 'التبني', 'الجلاء', 'القصور', 'هجين', 'البصيرة'
  ],
  'الرقة': [
    'الرقة المدينة', 'الطبقة', 'تل أبيض', 'عين عيسى', 'المنصورة',
    'السبخة', 'الكرامة', 'سلوك', 'الجرنية', 'معدان'
  ],
  'الحسكة': [
    'الحسكة المدينة', 'القامشلي', 'رأس العين', 'المالكية', 'عامودا',
    'الدرباسية', 'تل تمر', 'الشدادي', 'الهول', 'القحطانية'
  ],
  'درعا': [
    'درعا البلد', 'درعا المحطة', 'طفس', 'نوى', 'الصنمين', 'إزرع',
    'جاسم', 'الشيخ مسكين', 'داعل', 'بصرى الشام', 'المزيريب'
  ],
  'السويداء': [
    'السويداء المدينة', 'شهبا', 'صلخد', 'القريا', 'الكفر', 'عرى',
    'ملح', 'المجيمر', 'رساس', 'أم الزيتون', 'طربا'
  ],
  'القنيطرة': [
    'القنيطرة المدينة', 'خان أرنبة', 'فيق', 'الرفيد', 'جباتا الخشب',
    'بيت جن', 'حضر', 'مسعدة', 'جويزة'
  ]
};

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

  // حالات اختيار المنطقة
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [areaSearchQuery, setAreaSearchQuery] = useState('');
  const [showCustomAreaInput, setShowCustomAreaInput] = useState(false);
  const [customArea, setCustomArea] = useState('');

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

  // إعادة تعيين حالة المنطقة عند تغيير المدينة
  useEffect(() => {
    if (address.city) {
      setAreaSearchQuery('');
      setShowCustomAreaInput(false);
      setCustomArea('');
    }
  }, [address.city]);

  // معالج زر الرجوع في الهاتف (Back button)
  useEffect(() => {
    if (!isOpen) return;

    const handleBackButton = (e) => {
      e.preventDefault();
      // سنتحقق من showAreaPicker عند الاستدعاء وليس عند التسجيل
      onClose();
    };

    window.history.pushState({ addressPicker: true }, '');
    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
      if (window.history.state?.addressPicker) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]); // إزالة showAreaPicker من الـ dependencies

  const handleChange = (field, value) => {
    setAddress(prev => ({ ...prev, [field]: value }));
  };

  // فتح قائمة المناطق
  const openAreaPicker = () => {
    if (!address.city) {
      return;
    }
    setShowAreaPicker(true);
  };

  // اختيار منطقة من القائمة
  const selectArea = (area) => {
    handleChange('area', area);
    setShowAreaPicker(false);
    setShowCustomAreaInput(false);
  };

  // حفظ المنطقة المخصصة
  const saveCustomArea = () => {
    if (customArea.trim()) {
      handleChange('area', customArea.trim());
      setShowAreaPicker(false);
      setShowCustomAreaInput(false);
      setCustomArea('');
    }
  };

  // الحصول على المناطق المفلترة
  const getFilteredAreas = () => {
    const areas = CITY_AREAS[address.city] || [];
    if (!areaSearchQuery) return areas;
    return areas.filter(area => 
      area.toLowerCase().includes(areaSearchQuery.toLowerCase())
    );
  };

  const handleSave = () => {
    // التحقق من جميع الحقول المطلوبة
    if (!address.city || !address.area || !address.street || !address.street_number || !address.building_number) {
      return;
    }
    
    // إنشاء العنوان الكامل كنص
    const fullAddress = [
      address.city,
      address.area,
      address.street,
      `شارع ${address.street_number}`,
      `بناء/محل ${address.building_number}`
    ].filter(Boolean).join('، ');
    
    onSave({
      ...address,
      full_address: fullAddress
    });
    onClose();
  };

  const isValid = address.city && address.area && address.street && address.street_number && address.building_number;

  if (!isOpen) return null;

  return (
    <>
      {/* Main Address Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
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
                onChange={(e) => {
                  handleChange('city', e.target.value);
                  handleChange('area', ''); // مسح المنطقة عند تغيير المدينة
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00] bg-white"
                data-testid="city-select"
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
              <button
                type="button"
                onClick={openAreaPicker}
                disabled={!address.city}
                className={`w-full border rounded-xl px-4 py-3 text-right flex items-center justify-between ${
                  !address.city 
                    ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed' 
                    : 'border-gray-200 bg-white hover:border-[#FF6B00]'
                }`}
                data-testid="area-picker-btn"
              >
                <span className={address.area ? 'text-gray-900' : 'text-gray-400'}>
                  {address.area || (address.city ? 'اختر المنطقة' : 'اختر المدينة أولاً')}
                </span>
                <ChevronDown size={20} className="text-gray-400" />
              </button>
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
                data-testid="street-input"
              />
            </div>

            {/* اسم الشارع ورقم المحل في صف واحد */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم الشارع *
                </label>
                <input
                  type="text"
                  value={address.street_number}
                  onChange={(e) => handleChange('street_number', e.target.value)}
                  placeholder="مثال: النصر، بغداد"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                  data-testid="street-number-input"
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
                  data-testid="building-input"
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
                    `شارع ${address.street_number}`,
                    `بناء/محل ${address.building_number}`
                  ].join('، ')}
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
              data-testid="save-address-btn"
            >
              <Check size={20} />
              حفظ العنوان
            </button>
          </div>
        </motion.div>
      </div>
      
      {/* Area Picker Modal - مستقل تماماً */}
      {showAreaPicker && (
        <div 
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50"
          onClick={() => setShowAreaPicker(false)}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] overflow-hidden"
          >
            {/* Area Picker Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">
                  اختر المنطقة في {address.city}
                </h3>
                <button
                  onClick={() => setShowAreaPicker(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <X size={18} />
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={areaSearchQuery}
                  onChange={(e) => setAreaSearchQuery(e.target.value)}
                  placeholder="ابحث عن المنطقة..."
                  className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                  data-testid="area-search-input"
                />
              </div>
            </div>

            {/* Areas List */}
            <div className="overflow-y-auto max-h-[50vh] p-2">
              {/* Add Custom Area Button */}
              {!showCustomAreaInput && (
                <button
                  onClick={() => setShowCustomAreaInput(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-[#FF6B00] font-medium mb-2 transition-colors"
                  data-testid="add-custom-area-btn"
                >
                  <Plus size={20} />
                  إضافة منطقة غير موجودة
                </button>
              )}

              {/* Custom Area Input */}
              {showCustomAreaInput && (
                <div className="bg-orange-50 rounded-xl p-3 mb-2">
                  <input
                    type="text"
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    placeholder="اكتب اسم المنطقة"
                    className="w-full border border-orange-200 rounded-lg px-3 py-2 mb-2 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                    autoFocus
                    data-testid="custom-area-input"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveCustomArea}
                      disabled={!customArea.trim()}
                      className="flex-1 bg-[#FF6B00] text-white py-2 rounded-lg font-medium disabled:opacity-50"
                    >
                      إضافة
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomAreaInput(false);
                        setCustomArea('');
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {/* Areas */}
              {getFilteredAreas().length > 0 ? (
                <div className="space-y-1">
                  {getFilteredAreas().map((area) => (
                    <button
                      key={area}
                      onClick={() => selectArea(area)}
                      className={`w-full text-right px-4 py-3 rounded-xl transition-colors ${
                        address.area === area
                          ? 'bg-[#FF6B00] text-white'
                          : 'hover:bg-gray-100 text-gray-700'
                      }`}
                      data-testid={`area-option-${area}`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>لا توجد نتائج للبحث</p>
                  <p className="text-sm mt-1">جرب إضافة المنطقة يدوياً</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default AddressPickerModal;
