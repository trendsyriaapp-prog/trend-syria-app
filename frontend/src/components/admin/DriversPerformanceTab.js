// /app/frontend/src/components/admin/DriversPerformanceTab.js
// إحصائيات أداء السائقين

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users, Truck, Clock, Star, TrendingUp, TrendingDown,
  RefreshCw, Filter, Award, AlertTriangle, CheckCircle,
  XCircle, DollarSign, MapPin, Phone, ChevronDown, ChevronUp,
  BarChart2, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const API = process.env.REACT_APP_BACKEND_URL;

const DriversPerformanceTab = () => {
  const [drivers, setDrivers] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [driverDetails, setDriverDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // فلاتر
  const [period, setPeriod] = useState('week');
  const [sortBy, setSortBy] = useState('orders_count');
  const [city, setCity] = useState('');
  const [cities, setCities] = useState([]);

  useEffect(() => {
    fetchCities();
    fetchDriversPerformance();
  }, [period, sortBy, city]);

  const fetchCities = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/shipping/cities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCities(res.data || []);
    } catch (err) {
      console.error('Error fetching cities:', err);
    }
  };

  const fetchDriversPerformance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ period, sort_by: sortBy });
      if (city) params.append('city', city);
      
      const res = await axios.get(
        `${API}/api/analytics/drivers-performance?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setDrivers(res.data.drivers || []);
      setSummary(res.data.summary || {});
    } catch (err) {
      console.error('Error fetching drivers performance:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverDetails = async (driverId) => {
    setLoadingDetails(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(
        `${API}/api/analytics/driver-performance/${driverId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDriverDetails(res.data);
    } catch (err) {
      console.error('Error fetching driver details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDriverClick = (driver) => {
    if (selectedDriver?.id === driver.id) {
      setSelectedDriver(null);
      setDriverDetails(null);
    } else {
      setSelectedDriver(driver);
      fetchDriverDetails(driver.id);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SY').format(amount) + ' ل.س';
  };

  const getPerformanceColor = (value, type) => {
    if (type === 'rating') {
      if (value >= 4.5) return 'text-green-600';
      if (value >= 3.5) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (type === 'time') {
      if (value <= 20) return 'text-green-600';
      if (value <= 35) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (type === 'acceptance') {
      if (value >= 80) return 'text-green-600';
      if (value >= 60) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (type === 'cancellation') {
      if (value <= 5) return 'text-green-600';
      if (value <= 15) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  const periodLabels = {
    day: 'اليوم',
    week: 'الأسبوع',
    month: 'الشهر',
    all: 'الكل'
  };

  const sortLabels = {
    orders_count: 'عدد الطلبات',
    avg_time: 'وقت التوصيل',
    rating: 'التقييم',
    acceptance_rate: 'معدل القبول',
    earnings: 'الأرباح'
  };

  return (
    <div className="space-y-4">
      {/* شريط الملخص */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">إجمالي السائقين</p>
              <p className="text-lg font-bold text-gray-900">{summary.total_drivers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">طلبات مكتملة</p>
              <p className="text-lg font-bold text-green-600">{summary.total_completed_orders || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">متوسط وقت التوصيل</p>
              <p className="text-lg font-bold text-purple-600">{summary.avg_delivery_time || 0} د</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star size={18} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">متوسط التقييم</p>
              <p className="text-lg font-bold text-yellow-600">{summary.avg_rating || 0} ⭐</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">إجمالي الأرباح</p>
              <p className="text-lg font-bold text-orange-600">{formatCurrency(summary.total_earnings || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* شريط التحكم */}
      <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* فلتر الفترة */}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              {Object.entries(periodLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* فلتر المدينة */}
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-gray-400" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="">جميع المدن</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* الترتيب */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              {Object.entries(sortLabels).map(([key, label]) => (
                <option key={key} value={key}>ترتيب: {label}</option>
              ))}
            </select>
          </div>

          <div className="flex-1" />

          {/* زر التحديث */}
          <button
            onClick={fetchDriversPerformance}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>
      </div>

      {/* جدول السائقين */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={32} className="text-blue-600 animate-spin" />
          </div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users size={48} className="mx-auto mb-3 text-gray-300" />
            <p>لا يوجد سائقين</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-right font-medium text-gray-600">#</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-600">السائق</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-600">الطلبات</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-600">وقت التوصيل</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-600">التقييم</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-600">معدل القبول</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-600">الإلغاءات</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-600">الأرباح</th>
                  <th className="py-3 px-4 text-right font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drivers.map((driver, index) => (
                  <>
                    <tr 
                      key={driver.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedDriver?.id === driver.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleDriverClick(driver)}
                    >
                      <td className="py-3 px-4">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-200 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${driver.is_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                          <div>
                            <p className="font-medium text-gray-900">{driver.name}</p>
                            <p className="text-xs text-gray-500">{driver.city}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-center">
                          <p className="font-bold text-gray-900">{driver.stats.completed_orders}</p>
                          <p className="text-xs text-gray-500">{driver.stats.completion_rate}% إتمام</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${getPerformanceColor(driver.stats.avg_delivery_time, 'time')}`}>
                          {driver.stats.avg_delivery_time > 0 ? `${driver.stats.avg_delivery_time} د` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          <span className={`font-medium ${getPerformanceColor(driver.stats.avg_rating, 'rating')}`}>
                            {driver.stats.avg_rating > 0 ? driver.stats.avg_rating : '-'}
                          </span>
                          {driver.stats.rating_count > 0 && (
                            <span className="text-xs text-gray-400">({driver.stats.rating_count})</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${getPerformanceColor(driver.stats.acceptance_rate, 'acceptance')}`}>
                          {driver.stats.acceptance_rate}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-medium ${getPerformanceColor(driver.stats.cancellation_rate, 'cancellation')}`}>
                          {driver.stats.cancellations} ({driver.stats.cancellation_rate}%)
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-green-600">
                          {formatCurrency(driver.stats.total_earnings)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {selectedDriver?.id === driver.id ? (
                          <ChevronUp size={16} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-400" />
                        )}
                      </td>
                    </tr>
                    
                    {/* تفاصيل السائق المختار */}
                    {selectedDriver?.id === driver.id && (
                      <tr>
                        <td colSpan={9} className="bg-gray-50 p-4">
                          {loadingDetails ? (
                            <div className="flex items-center justify-center py-8">
                              <RefreshCw size={24} className="text-blue-600 animate-spin" />
                            </div>
                          ) : driverDetails ? (
                            <div className="space-y-4">
                              {/* معلومات الاتصال */}
                              <div className="flex items-center gap-4 pb-3 border-b border-gray-200">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Phone size={14} />
                                  <span dir="ltr">{driver.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <MapPin size={14} />
                                  <span>{driver.city}</span>
                                </div>
                                <div className={`flex items-center gap-2 ${driver.is_available ? 'text-green-600' : 'text-gray-500'}`}>
                                  {driver.is_available ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                  <span>{driver.is_available ? 'متاح' : 'غير متاح'}</span>
                                </div>
                              </div>

                              {/* إحصائيات الفترات */}
                              <div className="grid grid-cols-4 gap-3">
                                {driverDetails.periods?.map(p => (
                                  <div key={p.period} className="bg-white rounded-lg p-3 border border-gray-200">
                                    <p className="text-xs text-gray-500 mb-1">{p.period}</p>
                                    <p className="font-bold text-gray-900">{p.completed_orders} طلب</p>
                                    <p className="text-xs text-green-600">{formatCurrency(p.earnings)}</p>
                                  </div>
                                ))}
                              </div>

                              {/* رسم بياني */}
                              {driverDetails.chart && driverDetails.chart.length > 0 && (
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <BarChart2 size={16} />
                                    الطلبات - آخر 7 أيام
                                  </h4>
                                  <ResponsiveContainer width="100%" height={150}>
                                    <BarChart data={driverDetails.chart}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                                      <YAxis tick={{ fontSize: 10 }} />
                                      <Tooltip 
                                        formatter={(value) => [value, 'طلبات']}
                                        labelFormatter={(label) => `يوم ${label}`}
                                      />
                                      <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                                        {driverDetails.chart.map((entry, idx) => (
                                          <Cell key={idx} fill={entry.orders > 0 ? '#3B82F6' : '#E5E7EB'} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              )}

                              {/* أسباب الإلغاء */}
                              {driverDetails.cancellation_reasons && driverDetails.cancellation_reasons.length > 0 && (
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-orange-500" />
                                    أسباب الإلغاء
                                  </h4>
                                  <div className="space-y-2">
                                    {driverDetails.cancellation_reasons.map((r, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">{r.reason}</span>
                                        <span className="font-medium text-orange-600">{r.count} مرة</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-center text-gray-500">فشل تحميل التفاصيل</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* دليل الألوان */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
        <p className="text-xs font-medium text-gray-600 mb-2">دليل الألوان:</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">أداء ممتاز</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-gray-600">أداء متوسط</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">يحتاج تحسين</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriversPerformanceTab;
