// /app/frontend/src/components/admin/DriversMapTab.js
// خريطة مراقبة جميع السائقين للمدير

import { useState, useEffect, useRef } from 'react';
import logger from '../../lib/logger';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { 
  RefreshCw, MapPin, Users, Truck, Phone, 
  Package, Coffee, CheckCircle, XCircle, 
  Clock, Filter, Wifi, WifiOff
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const API = process.env.REACT_APP_BACKEND_URL;

// أيقونات السائقين على الخريطة
const createDriverIcon = (isOnline, isAvailable, hasOrders) => {
  let color = '#9CA3AF'; // رمادي - غير متصل
  let bgColor = '#F3F4F6';
  
  if (isOnline) {
    if (hasOrders) {
      color = '#F59E0B'; // برتقالي - يوصل طلبات
      bgColor = '#FEF3C7';
    } else if (isAvailable) {
      color = '#10B981'; // أخضر - متاح
      bgColor = '#D1FAE5';
    } else {
      color = '#6B7280'; // رمادي غامق - متصل لكن غير متاح
      bgColor = '#E5E7EB';
    }
  }
  
  return L.divIcon({
    className: 'custom-driver-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: ${bgColor};
        border: 3px solid ${color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        position: relative;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5">
          <circle cx="12" cy="8" r="4"/>
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
        </svg>
        ${isOnline ? `<div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 10px;
          height: 10px;
          background: ${hasOrders ? '#F59E0B' : '#10B981'};
          border: 2px solid white;
          border-radius: 50%;
        "></div>` : ''}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });
};

// مكون لتحديث مركز الخريطة
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
};

const DriversMapTab = () => {
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [cities, setCities] = useState([]);
  const intervalRef = useRef(null);
  
  // مركز سوريا الافتراضي
  const defaultCenter = [33.5138, 36.2765]; // دمشق
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  // جلب قائمة المدن
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API}/api/shipping/cities`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCities(res.data || []);
      } catch (err) {
        logger.error('Error fetching cities:', err);
      }
    };
    fetchCities();
  }, []);

  // جلب مواقع السائقين
  const fetchDrivers = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedCity) params.append('city', selectedCity);
      if (availableOnly) params.append('available_only', 'true');
      
      const res = await axios.get(
        `${API}/api/delivery/admin/all-drivers-locations?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      let filteredDrivers = res.data.drivers || [];
      
      // فلترة المتصلين فقط
      if (onlineOnly) {
        filteredDrivers = filteredDrivers.filter(d => d.is_online);
      }
      
      setDrivers(filteredDrivers);
      setStats(res.data.stats || {});
      setLastUpdate(new Date());
      
      // تحديث مركز الخريطة بناءً على السائقين
      const driversWithLocation = filteredDrivers.filter(d => d.latitude && d.longitude);
      if (driversWithLocation.length > 0) {
        const avgLat = driversWithLocation.reduce((sum, d) => sum + d.latitude, 0) / driversWithLocation.length;
        const avgLng = driversWithLocation.reduce((sum, d) => sum + d.longitude, 0) / driversWithLocation.length;
        setMapCenter([avgLat, avgLng]);
      }
    } catch (err) {
      logger.error('Error fetching drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  // جلب البيانات عند التحميل وعند تغيير الفلاتر
  useEffect(() => {
    fetchDrivers();
  }, [selectedCity, availableOnly, onlineOnly]);

  // التحديث التلقائي
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchDrivers, 15000); // كل 15 ثانية
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, selectedCity, availableOnly, onlineOnly]);

  // فلترة السائقين للعرض
  const displayedDrivers = onlineOnly 
    ? drivers.filter(d => d.is_online)
    : drivers;

  const driversWithLocation = displayedDrivers.filter(d => d.latitude && d.longitude);

  return (
    <div className="space-y-3">
      {/* شريط الإحصائيات - مصغر */}
      <div className="grid grid-cols-5 gap-1.5">
        <div className="bg-white rounded-lg p-2 border border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-blue-100 rounded">
              <Users size={12} className="text-blue-600" />
            </div>
            <div>
              <p className="text-[9px] text-gray-500">الكل</p>
              <p className="text-xs font-bold text-gray-900">{stats.total || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-2 border border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-green-100 rounded">
              <Wifi size={12} className="text-green-600" />
            </div>
            <div>
              <p className="text-[9px] text-gray-500">متصلين</p>
              <p className="text-xs font-bold text-green-600">{stats.online || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-2 border border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-emerald-100 rounded">
              <CheckCircle size={12} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[9px] text-gray-500">متاحين</p>
              <p className="text-xs font-bold text-emerald-600">{stats.available || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-2 border border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-orange-100 rounded">
              <Truck size={12} className="text-orange-600" />
            </div>
            <div>
              <p className="text-[9px] text-gray-500">يوصلون</p>
              <p className="text-xs font-bold text-orange-600">{stats.with_orders || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-2 border border-gray-100">
          <div className="flex items-center gap-1.5">
            <div className="p-1 bg-purple-100 rounded">
              <MapPin size={12} className="text-purple-600" />
            </div>
            <div>
              <p className="text-[9px] text-gray-500">بموقع</p>
              <p className="text-xs font-bold text-purple-600">{stats.with_location || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* شريط التحكم - مصغر */}
      <div className="bg-white rounded-lg p-2 border border-gray-100">
        <div className="flex flex-wrap items-center gap-2">
          {/* فلتر المدينة */}
          <div className="flex items-center gap-1">
            <Filter size={12} className="text-gray-400" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
              data-testid="city-filter"
            >
              <option value="">كل المدن</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* فلتر المتاحين */}
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="w-3 h-3 text-green-600 rounded"
            />
            <span className="text-[10px] text-gray-600">متاحين</span>
          </label>

          {/* فلتر المتصلين */}
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={onlineOnly}
              onChange={(e) => setOnlineOnly(e.target.checked)}
              className="w-3 h-3 text-blue-600 rounded"
            />
            <span className="text-[10px] text-gray-600">متصلين</span>
          </label>

          <div className="flex-1" />

          {/* التحديث التلقائي */}
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3 h-3 text-blue-600 rounded"
            />
            <span className="text-[10px] text-gray-600">تلقائي</span>
          </label>

          {/* زر التحديث */}
          <button
            onClick={fetchDrivers}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded text-[10px] hover:bg-blue-600 disabled:opacity-50"
            data-testid="refresh-map-btn"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>
      </div>

      {/* الخريطة */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-[500px] relative">
          {loading && drivers.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw size={32} className="text-blue-600 animate-spin" />
                <p className="text-gray-500">جاري تحميل مواقع السائقين...</p>
              </div>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap'
              />
              <MapUpdater center={mapCenter} zoom={12} />
              
              {driversWithLocation.map(driver => (
                <Marker
                  key={driver.id}
                  position={[driver.latitude, driver.longitude]}
                  icon={createDriverIcon(driver.is_online, driver.is_available, driver.active_orders_count > 0)}
                  eventHandlers={{
                    click: () => setSelectedDriver(driver)
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px] text-right" dir="rtl">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                        <div className={`w-3 h-3 rounded-full ${driver.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <h3 className="font-bold text-gray-900">{driver.name}</h3>
                      </div>
                      
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone size={14} />
                          <span dir="ltr">{driver.phone}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin size={14} />
                          <span>{driver.city || 'غير محدد'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {driver.is_available ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle size={14} />
                              متاح
                            </span>
                          ) : (
                            <span className="text-gray-500 flex items-center gap-1">
                              <XCircle size={14} />
                              غير متاح
                            </span>
                          )}
                        </div>
                        
                        {driver.active_orders_count > 0 && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="font-medium text-orange-600 flex items-center gap-1">
                              <Package size={14} />
                              {driver.active_orders_count} طلب نشط
                            </p>
                            <div className="mt-1 space-y-1">
                              {driver.active_orders.slice(0, 3).map((order, idx) => (
                                <div key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                                  {order.type === 'food' ? <Coffee size={12} /> : <Package size={12} />}
                                  <span>#{order.code}</span>
                                  {order.store && <span className="text-gray-400">- {order.store}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {driver.is_stale && driver.location_updated_at && (
                          <p className="text-xs text-yellow-600 mt-2">
                            آخر تحديث: منذ أكثر من 5 دقائق
                          </p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
          
          {/* رسالة إذا لم يوجد سائقين بموقع */}
          {!loading && driversWithLocation.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 pointer-events-none">
              <div className="text-center">
                <WifiOff size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا يوجد سائقين متصلين بمواقع حالياً</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* قائمة السائقين - مصغرة */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="p-2 border-b border-gray-100">
          <h3 className="font-bold text-xs text-gray-900">قائمة السائقين ({displayedDrivers.length})</h3>
        </div>
        
        <div className="max-h-[200px] overflow-y-auto">
          {displayedDrivers.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-xs">
              لا يوجد سائقين
            </div>
          ) : (
            <table className="w-full text-[10px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="py-1.5 px-2 text-right font-medium text-gray-600">السائق</th>
                  <th className="py-1.5 px-2 text-right font-medium text-gray-600">المدينة</th>
                  <th className="py-1.5 px-2 text-right font-medium text-gray-600">الحالة</th>
                  <th className="py-1.5 px-2 text-right font-medium text-gray-600">طلبات</th>
                  <th className="py-1.5 px-2 text-right font-medium text-gray-600">موقع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedDrivers.map(driver => (
                  <tr 
                    key={driver.id} 
                    className={`hover:bg-gray-50 cursor-pointer ${selectedDriver?.id === driver.id ? 'bg-blue-50' : ''}`}
                    onClick={() => {
                      setSelectedDriver(driver);
                      if (driver.latitude && driver.longitude) {
                        setMapCenter([driver.latitude, driver.longitude]);
                      }
                    }}
                  >
                    <td className="py-1 px-2">
                      <div className="flex items-center gap-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${driver.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className="font-medium text-gray-900 truncate max-w-[80px]">{driver.name}</span>
                      </div>
                    </td>
                    <td className="py-1 px-2 text-gray-600">{driver.city || '-'}</td>
                    <td className="py-1 px-2">
                      {driver.is_available ? (
                        <span className="text-green-600 text-[9px]">متاح</span>
                      ) : (
                        <span className="text-gray-400 text-[9px]">-</span>
                      )}
                    </td>
                    <td className="py-1 px-2">
                      {driver.active_orders_count > 0 ? (
                        <span className="text-orange-600 font-bold">{driver.active_orders_count}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-1 px-2">
                      {driver.latitude ? (
                        <span className={`text-[9px] ${driver.is_stale ? 'text-yellow-600' : 'text-purple-600'}`}>
                          {driver.is_stale ? 'قديم' : '✓'}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* دليل الألوان - مصغر */}
      <div className="bg-gray-50 rounded-lg p-2 border border-gray-100">
        <div className="flex flex-wrap gap-3 text-[9px]">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-gray-600">متاح</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-gray-600">يوصل</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            <span className="text-gray-600">غير متاح</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span className="text-gray-600">غير متصل</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriversMapTab;
