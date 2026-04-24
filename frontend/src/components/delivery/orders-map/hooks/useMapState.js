// /app/frontend/src/components/delivery/orders-map/hooks/useMapState.js
// Hook لإدارة state الخريطة الأساسية

import { useState, useMemo, useCallback } from 'react';
import { useModalBackHandler } from '../../../../hooks/useBackButton';
import { DEFAULT_CENTER } from '../MapIcons';

/**
 * Hook لإدارة حالة الخريطة الأساسية
 * @param {Object} props - الخصائص المُمررة للمكون الرئيسي
 */
const useMapState = (props) => {
  const {
    orders: ordersProp,
    foodOrders: foodOrdersProp,
    myOrders: myOrdersProp,
    myFoodOrders: myFoodOrdersProp,
    theme = 'dark'
  } = props;

  // استخدام useMemo لتجنب إنشاء مصفوفات جديدة في كل render
  const orders = useMemo(() => ordersProp || [], [ordersProp]);
  const foodOrders = useMemo(() => foodOrdersProp || [], [foodOrdersProp]);
  const myOrders = useMemo(() => myOrdersProp || [], [myOrdersProp]);
  const myFoodOrders = useMemo(() => myFoodOrdersProp || [], [myFoodOrdersProp]);

  // فلترة الطلبات النشطة فقط (غير المسلمة وغير الملغاة)
  const activeMyOrders = useMemo(() =>
    myOrders.filter(o => o.status !== 'delivered' && o.delivery_status !== 'delivered' && o.status !== 'cancelled'),
    [myOrders]
  );
  const activeMyFoodOrders = useMemo(() =>
    myFoodOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled'),
    [myFoodOrders]
  );

  // عدد الطلبات النشطة
  const activeOrdersCount = activeMyOrders.length + activeMyFoodOrders.length;

  // حالة الخريطة
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showLayer, setShowLayer] = useState('all'); // all, food, products, customers
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapError, setMapError] = useState(null);

  // فلتر الطلبات: متاحة / طلباتي / الكل
  const [orderFilter, setOrderFilter] = useState('myOrders');
  const [selectedAvailableOrder, setSelectedAvailableOrder] = useState(null);

  // دعم زر الرجوع للخريطة
  const closeMap = useCallback(() => setIsOpen(false), []);
  useModalBackHandler(isOpen, closeMap);

  // دوال التحكم
  const openMap = useCallback(() => setIsOpen(true), []);
  const toggleMap = useCallback(() => setIsOpen(prev => !prev), []);
  const clearMapError = useCallback(() => setMapError(null), []);

  return {
    // البيانات
    orders,
    foodOrders,
    myOrders,
    myFoodOrders,
    activeMyOrders,
    activeMyFoodOrders,
    activeOrdersCount,

    // حالة الخريطة
    isOpen,
    setIsOpen,
    openMap,
    closeMap,
    toggleMap,
    selectedMarker,
    setSelectedMarker,
    showLayer,
    setShowLayer,
    mapCenter,
    setMapCenter,
    mapError,
    setMapError,
    clearMapError,

    // فلتر الطلبات
    orderFilter,
    setOrderFilter,
    selectedAvailableOrder,
    setSelectedAvailableOrder
  };
};

export default useMapState;
