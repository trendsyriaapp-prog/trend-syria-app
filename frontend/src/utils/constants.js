// App constants

export const CATEGORIES = [
  { id: 'electronics', name: 'إلكترونيات' },
  { id: 'clothes', name: 'ملابس' },
  { id: 'accessories', name: 'إكسسوارات' },
  { id: 'home', name: 'المنزل' },
  { id: 'beauty', name: 'تجميل' },
  { id: 'sports', name: 'رياضة' },
  { id: 'kids', name: 'أطفال' },
  { id: 'books', name: 'كتب' },
  { id: 'medicines', name: 'أدوية' },
  { id: 'cars', name: 'سيارات' },
];

export const SYRIAN_CITIES = [
  'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس',
  'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء',
  'القنيطرة', 'إدلب', 'ريف دمشق'
];

export const SIZE_OPTIONS = {
  clothes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  shoes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
  pants: ['28', '30', '32', '34', '36', '38', '40', '42'],
  kids: ['2-3', '4-5', '6-7', '8-9', '10-11', '12-13', '14-15']
};

export const ORDER_STATUSES = {
  pending_payment: 'في انتظار الدفع',
  paid: 'تم الدفع',
  pending: 'في الانتظار',
  confirmed: 'تم التأكيد',
  preparing: 'جاري التحضير',
  shipped: 'تم الشحن',
  picked_up: 'استلم الموظف',
  on_the_way: 'في الطريق',
  delivered: 'تم التسليم'
};

export const DELIVERY_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  picked_up: 'bg-cyan-100 text-cyan-700',
  on_the_way: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700'
};
