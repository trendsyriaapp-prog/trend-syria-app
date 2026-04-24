// /app/frontend/src/components/delivery/orders-map/hooks/useRouteCalculation.js
// Hook لحساب المسارات باستخدام OSRM

import { useState, useCallback } from 'react';
import axios from 'axios';
import logger from '../../../../lib/logger';
import { calculateDistanceKm } from '../MapHelpers';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Hook لحساب وجلب المسارات
 */
const useRouteCalculation = () => {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [multiRouteSegments, setMultiRouteSegments] = useState([]);

  // ألوان المسارات
  const routeColors = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#eab308'];

  /**
   * جلب المسار من OSRM مع المسافات المنفصلة والربح
   * @param {Array} start - [lat, lon] موقع السائق
   * @param {Array} waypoint - [lat, lon] موقع المتجر
   * @param {Array} end - [lat, lon] موقع العميل
   */
  const fetchRoute = useCallback(async (start, waypoint, end) => {
    setLoadingRoute(true);
    try {
      const coords = `${start[1]},${start[0]};${waypoint[1]},${waypoint[0]};${end[1]},${end[0]}`;
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const routeCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoordinates(routeCoords);
          
          const legs = route.legs || [];
          const distanceToStore = legs[0] ? (legs[0].distance / 1000).toFixed(1) : 0;
          const distanceToCustomer = legs[1] ? (legs[1].distance / 1000).toFixed(1) : 0;
          const durationToStore = legs[0] ? Math.round(legs[0].duration / 60) : 0;
          const durationToCustomer = legs[1] ? Math.round(legs[1].duration / 60) : 0;
          
          const totalDistance = (route.distance / 1000).toFixed(1);
          const totalDuration = Math.round(route.duration / 60);
          
          // جلب ربح السائق من الـ API
          let driverEarnings = 0;
          try {
            const earningsResponse = await axios.get(`${API}/api/shipping/calculate-driver-earnings`, {
              params: {
                store_lat: waypoint[0],
                store_lon: waypoint[1],
                customer_lat: end[0],
                customer_lon: end[1],
                driver_lat: start[0],
                driver_lon: start[1]
              }
            });
            driverEarnings = earningsResponse.data.earnings || 0;
          } catch (err) {
            logger.error('Error fetching driver earnings:', err);
          }
          
          setRouteInfo({
            distance: totalDistance,
            duration: totalDuration,
            distanceToStore,
            distanceToCustomer,
            durationToStore,
            durationToCustomer,
            driverEarnings
          });
          
          return routeCoords;
        }
      }
      
      // في حالة فشل API، نرسم خط مستقيم
      setRouteCoordinates([start, waypoint, end]);
      setRouteInfo(null);
      return [start, waypoint, end];
    } catch (error) {
      logger.error('Error fetching route:', error);
      setRouteCoordinates([start, waypoint, end]);
      setRouteInfo(null);
      return [start, waypoint, end];
    } finally {
      setLoadingRoute(false);
    }
  }, []);

  /**
   * جلب مسار واحد وإرجاع الإحداثيات
   * @param {Array} points - مصفوفة من [lat, lon]
   */
  const fetchSingleRoute = useCallback(async (points) => {
    try {
      const coordsStr = points.map(p => `${p[1]},${p[0]}`).join(';');
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          return {
            coordinates: data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]),
            distance: data.routes[0].distance,
            duration: data.routes[0].duration
          };
        }
      }
    } catch (error) {
      logger.error('Error fetching route segment:', error);
    }
    return { coordinates: points, distance: 0, duration: 0 };
  }, []);

  /**
   * جلب المسار المُحسَّن باستخدام OSRM Trip API
   * @param {Array} points - مصفوفة من {position: [lat, lon], ...}
   */
  const fetchOptimizedRoute = useCallback(async (points) => {
    try {
      const coordsStr = points.map(p => `${p.position[1]},${p.position[0]}`).join(';');
      const response = await fetch(
        `https://router.project-osrm.org/trip/v1/driving/${coordsStr}?overview=full&geometries=geojson&source=first&roundtrip=false`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.trips && data.trips[0]) {
          const trip = data.trips[0];
          return {
            coordinates: trip.geometry.coordinates.map(c => [c[1], c[0]]),
            distance: trip.distance,
            duration: trip.duration,
            waypoints: data.waypoints
          };
        }
      }
    } catch (error) {
      logger.error('Error fetching optimized route:', error);
    }
    return null;
  }, []);

  /**
   * حساب المحطات المُرتبة للسائق
   * @param {Array} activeMyFoodOrders - طلبات الطعام النشطة
   * @param {Array} activeMyOrders - طلبات المنتجات النشطة
   */
  const calculateOrderedStations = useCallback((activeMyFoodOrders, activeMyOrders) => {
    const stations = [];
    let totalDist = 0;
    let totalEarn = 0;
    let stationNumber = 1;

    const allMyOrders = [...(activeMyFoodOrders || []), ...(activeMyOrders || [])];

    if (allMyOrders.length === 0) {
      return { stations: [], totalDistance: 0, totalEarnings: 0 };
    }

    allMyOrders.forEach((order) => {
      const isFood = order.restaurant_id || order.order_type === 'food' || order.store_id;
      const storeName = isFood 
        ? (order.store_name || order.restaurant_name || 'المطعم') 
        : (order.seller_name || order.store_name || 'المتجر');
      
      const storeLat = order.store_location?.latitude || order.store_latitude;
      const storeLon = order.store_location?.longitude || order.store_longitude;
      
      const customerLat = order.delivery_address?.latitude || order.delivery_address?.lat || order.latitude;
      const customerLon = order.delivery_address?.longitude || order.delivery_address?.lng || order.longitude;

      // إضافة محطة المتجر
      if (storeLat && storeLon) {
        stations.push({
          number: stationNumber++,
          type: 'store',
          isFood,
          name: storeName,
          address: order.store_address || '',
          phone: order.store_phone || order.restaurant_phone || order.seller_phone || '',
          position: [storeLat, storeLon],
          action: 'استلام',
          orderId: order.id,
          order
        });
      }

      // إضافة محطة العميل
      if (customerLat && customerLon) {
        stations.push({
          number: stationNumber++,
          type: 'customer',
          isFood,
          name: order.customer_name || order.buyer_name || 'العميل',
          address: typeof order.delivery_address === 'string' 
            ? order.delivery_address 
            : (order.delivery_address?.area || order.delivery_address?.city || order.address || ''),
          phone: order.customer_phone || order.delivery_phone || '',
          position: [customerLat, customerLon],
          action: 'تسليم',
          orderId: order.id,
          order,
          total: order.total
        });

        totalEarn += order.driver_delivery_fee || order.driver_earnings || 0;
      }

      // حساب المسافة
      if (storeLat && storeLon && customerLat && customerLon) {
        const dist = calculateDistanceKm(storeLat, storeLon, customerLat, customerLon);
        totalDist += dist;
      }
    });

    return { stations, totalDistance: totalDist, totalEarnings: totalEarn };
  }, []);

  /**
   * إخفاء المسار
   */
  const hideRoute = useCallback(() => {
    setRouteCoordinates([]);
    setRouteInfo(null);
  }, []);

  /**
   * إخفاء جميع المسارات
   */
  const hideAllRoutes = useCallback(() => {
    setRouteCoordinates([]);
    setMultiRouteSegments([]);
    setRouteInfo(null);
  }, []);

  return {
    // State
    routeCoordinates,
    setRouteCoordinates,
    routeInfo,
    setRouteInfo,
    loadingRoute,
    multiRouteSegments,
    setMultiRouteSegments,
    routeColors,
    
    // Functions
    fetchRoute,
    fetchSingleRoute,
    fetchOptimizedRoute,
    calculateOrderedStations,
    hideRoute,
    hideAllRoutes
  };
};

export default useRouteCalculation;
