// /app/frontend/src/components/delivery/orders-map/hooks/useRouting.js
// Hook لإدارة المسارات والملاحة

import { useState, useCallback } from 'react';
import axios from 'axios';
import logger from '../../../../lib/logger';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Hook لإدارة رسم المسارات وبياناتها
 */
const useRouting = () => {
  // حالة المسار
  const [selectedOrderForRoute, setSelectedOrderForRoute] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [multiRouteSegments, setMultiRouteSegments] = useState([]);
  const [showAllMyRoutes, setShowAllMyRoutes] = useState(false);
  const [optimizedStops, setOptimizedStops] = useState([]);

  // التنقل خطوة بخطوة
  const [stepByStepMode, setStepByStepMode] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [allStepsData, setAllStepsData] = useState([]);
  const [currentStepRoute, setCurrentStepRoute] = useState([]);

  // ملخص المحطات
  const [showStationsSummary, setShowStationsSummary] = useState(false);
  const [orderedStations, setOrderedStations] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);

  // تحسينات الملاحة
  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(false);
  const [driverSpeed, setDriverSpeed] = useState(0);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const [lastPosition, setLastPosition] = useState(null);
  const [distanceFromRoute, setDistanceFromRoute] = useState(0);
  const [navigationInstructions, setNavigationInstructions] = useState([]);
  const [currentInstruction, setCurrentInstruction] = useState(null);
  const [arrivalAnnouncedFor, setArrivalAnnouncedFor] = useState(null);

  // جلب المسار من الخادم
  const fetchRoute = useCallback(async (origin, waypoints, destination) => {
    setLoadingRoute(true);
    try {
      const response = await axios.post(`${API}/api/delivery/route`, {
        origin,
        waypoints,
        destination
      });
      
      if (response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        return {
          coordinates: route.geometry?.coordinates?.map(c => [c[1], c[0]]) || [],
          distance: route.distance ? (route.distance / 1000).toFixed(1) : '0',
          duration: route.duration ? Math.round(route.duration / 60) : 0
        };
      }
      return null;
    } catch (error) {
      logger.error('Error fetching route:', error);
      return null;
    } finally {
      setLoadingRoute(false);
    }
  }, []);

  // رسم المسار لطلب معين
  const showRouteForOrder = useCallback(async (order, driverLocation) => {
    if (!order || !driverLocation) return;

    setSelectedOrderForRoute(order);
    setLoadingRoute(true);
    
    try {
      const origin = {
        lat: driverLocation.latitude,
        lng: driverLocation.longitude
      };
      
      // إذا كان للطلب متجر، نمر عليه أولاً
      const waypoints = [];
      if (order.store_latitude && order.store_longitude) {
        waypoints.push({
          lat: order.store_latitude,
          lng: order.store_longitude
        });
      }
      
      const destination = {
        lat: order.latitude || order.delivery_latitude,
        lng: order.longitude || order.delivery_longitude
      };
      
      const routeData = await fetchRoute(origin, waypoints, destination);
      
      if (routeData) {
        setRouteCoordinates(routeData.coordinates);
        setRouteInfo({
          distance: routeData.distance,
          duration: routeData.duration
        });
      }
    } catch (error) {
      logger.error('Error showing route:', error);
    } finally {
      setLoadingRoute(false);
    }
  }, [fetchRoute]);

  // مسح المسار
  const clearRoute = useCallback(() => {
    setSelectedOrderForRoute(null);
    setRouteCoordinates([]);
    setRouteInfo(null);
    setStepByStepMode(false);
    setCurrentStepIndex(0);
    setAllStepsData([]);
    setCurrentStepRoute([]);
  }, []);

  // الانتقال للخطوة التالية
  const nextStep = useCallback(() => {
    if (currentStepIndex < allStepsData.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex, allStepsData.length]);

  // الانتقال للخطوة السابقة
  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  // تفعيل/إيقاف وضع خطوة بخطوة
  const toggleStepByStep = useCallback(() => {
    setStepByStepMode(prev => !prev);
  }, []);

  return {
    // حالة المسار
    selectedOrderForRoute,
    setSelectedOrderForRoute,
    routeCoordinates,
    setRouteCoordinates,
    routeInfo,
    setRouteInfo,
    loadingRoute,
    setLoadingRoute,
    multiRouteSegments,
    setMultiRouteSegments,
    showAllMyRoutes,
    setShowAllMyRoutes,
    optimizedStops,
    setOptimizedStops,

    // خطوة بخطوة
    stepByStepMode,
    setStepByStepMode,
    toggleStepByStep,
    currentStepIndex,
    setCurrentStepIndex,
    allStepsData,
    setAllStepsData,
    currentStepRoute,
    setCurrentStepRoute,
    nextStep,
    prevStep,

    // ملخص المحطات
    showStationsSummary,
    setShowStationsSummary,
    orderedStations,
    setOrderedStations,
    totalEarnings,
    setTotalEarnings,
    totalDistance,
    setTotalDistance,

    // الملاحة
    isNavigationMode,
    setIsNavigationMode,
    liveTrackingEnabled,
    setLiveTrackingEnabled,
    driverSpeed,
    setDriverSpeed,
    estimatedArrival,
    setEstimatedArrival,
    lastPosition,
    setLastPosition,
    distanceFromRoute,
    setDistanceFromRoute,
    navigationInstructions,
    setNavigationInstructions,
    currentInstruction,
    setCurrentInstruction,
    arrivalAnnouncedFor,
    setArrivalAnnouncedFor,

    // دوال
    fetchRoute,
    showRouteForOrder,
    clearRoute
  };
};

export default useRouting;
