// /app/frontend/src/components/admin/AdsTab.js
// تبويب إدارة الإعلانات للمدير

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Megaphone, Eye, MousePointer, DollarSign, TrendingUp, 
  Star, Image as ImageIcon, Search, Save, Loader2
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' });
};

const AD_TYPES = {
  featured_product: { label: 'منتج مميز', icon: Star, color: 'text-yellow-500' },
  banner: { label: 'بانر الرئيسية', icon: ImageIcon, color: 'text-purple-500' },
  search_top: { label: 'أول البحث', icon: Search, color: 'text-blue-500' }
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-gray-100 text-gray-700',
  rejected: 'bg-red-100 text-red-700'
};

const STATUS_LABELS = {
  active: 'نشط',
  pending: 'معلق',
  expired: 'منتهي',
  rejected: 'مرفوض'
};

const AdsTab = ({ user }) => {
  const { toast } = useToast();
  const [ads, setAds] = useState([]);
  const [stats, setStats] = useState(null);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  
  useEffect(() => {
    fetchData();
  }, [statusFilter]);
  
  const fetchData = async () => {
    try {
      const [adsRes, statsRes, pricesRes] = await Promise.all([
        axios.get(`${API}/api/ads/admin/all${statusFilter ? `?status=${statusFilter}` : ''}`),
        axios.get(`${API}/api/ads/admin/stats`),
        axios.get(`${API}/api/ads/prices`)
      ]);
      setAds(adsRes.data);
      setStats(statsRes.data);
      setPrices(pricesRes.data);
    } catch (error) {
      logger.error('Error fetching ads data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updatePrices = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/ads/admin/prices`, prices);
      toast({
        title: "تم الحفظ",
        description: "تم تحديث أسعار الإعلانات"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل الحفظ",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (user.user_type !== 'admin') {
    return (
      <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
        <Megaphone size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">هذه الصفحة للمدير الرئيسي فقط</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }
  
  return (
    <section className="space-y-3" data-testid="admin-ads-tab">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { icon: Megaphone, label: 'إجمالي الإعلانات', value: stats.total_ads, color: 'bg-orange-50 text-orange-600' },
            { icon: TrendingUp, label: 'إعلانات نشطة', value: stats.active_ads, color: 'bg-green-50 text-green-600' },
            { icon: DollarSign, label: 'إجمالي الإيرادات', value: formatPrice(stats.total_revenue), color: 'bg-emerald-50 text-emerald-600' },
            { icon: Eye, label: 'المشاهدات', value: stats.total_views.toLocaleString(), color: 'bg-blue-50 text-blue-600' },
            { icon: MousePointer, label: 'النقرات', value: stats.total_clicks.toLocaleString(), color: 'bg-purple-50 text-purple-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg p-3 border border-gray-200">
              <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mb-2`}>
                <stat.icon size={16} />
              </div>
              <p className="text-sm font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Ad Prices Settings */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center gap-2">
          <DollarSign size={18} className="text-[#FF6B00]" />
          <h3 className="font-bold text-gray-900 text-sm">أسعار الإعلانات</h3>
        </div>
        <div className="p-3">
          <div className="space-y-4">
            {/* Featured Product */}
            <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
              <h4 className="text-sm font-bold text-yellow-800 flex items-center gap-2 mb-3">
                <Star size={16} className="text-yellow-500" />
                منتج مميز
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {['day', 'week', 'month'].map(d => (
                  <div key={d} className="text-center">
                    <label className="block text-[10px] text-gray-500 mb-1">
                      {d === 'day' ? 'يوم' : d === 'week' ? 'أسبوع' : 'شهر'}
                    </label>
                    <input
                      type="number"
                      value={prices[`featured_product_${d}`] ?? 0}
                      onChange={(e) => setPrices({
                        ...prices,
                        [`featured_product_${d}`]: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                      })}
                      className="w-full p-2 border border-yellow-300 rounded-lg text-sm text-center font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Banner */}
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
              <h4 className="text-sm font-bold text-purple-800 flex items-center gap-2 mb-3">
                <ImageIcon size={16} className="text-purple-500" />
                بانر الرئيسية
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {['day', 'week'].map(d => (
                  <div key={d} className="text-center">
                    <label className="block text-[10px] text-gray-500 mb-1">
                      {d === 'day' ? 'يوم' : 'أسبوع'}
                    </label>
                    <input
                      type="number"
                      value={prices[`banner_${d}`] ?? 0}
                      onChange={(e) => setPrices({
                        ...prices,
                        [`banner_${d}`]: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                      })}
                      className="w-full p-2 border border-purple-300 rounded-lg text-sm text-center font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Search Top */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-3">
                <Search size={16} className="text-blue-500" />
                أول البحث
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {['day', 'week'].map(d => (
                  <div key={d} className="text-center">
                    <label className="block text-[10px] text-gray-500 mb-1">
                      {d === 'day' ? 'يوم' : 'أسبوع'}
                    </label>
                    <input
                      type="number"
                      value={prices[`search_top_${d}`] ?? 0}
                      onChange={(e) => setPrices({
                        ...prices,
                        [`search_top_${d}`]: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                      })}
                      className="w-full p-2 border border-blue-300 rounded-lg text-sm text-center font-bold"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <button
            onClick={updatePrices}
            disabled={saving}
            className="mt-4 bg-[#FF6B00] text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ الأسعار
          </button>
        </div>
      </div>
      
      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">تصفية:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">الكل</option>
          <option value="active">نشط</option>
          <option value="pending">معلق</option>
          <option value="expired">منتهي</option>
        </select>
      </div>
      
      {/* Ads List */}
      {ads.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <Megaphone size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد إعلانات</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right p-3 text-xs font-bold text-gray-600">المنتج</th>
                <th className="text-right p-3 text-xs font-bold text-gray-600">البائع</th>
                <th className="text-right p-3 text-xs font-bold text-gray-600">النوع</th>
                <th className="text-right p-3 text-xs font-bold text-gray-600">التكلفة</th>
                <th className="text-right p-3 text-xs font-bold text-gray-600">المشاهدات</th>
                <th className="text-right p-3 text-xs font-bold text-gray-600">النقرات</th>
                <th className="text-right p-3 text-xs font-bold text-gray-600">الحالة</th>
                <th className="text-right p-3 text-xs font-bold text-gray-600">ينتهي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ads.map((ad) => {
                const typeInfo = AD_TYPES[ad.ad_type] || AD_TYPES.featured_product;
                return (
                  <tr key={ad.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={ad.product_image || '/placeholder.svg'}
                          alt={ad.product_name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                          {ad.product_name}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-600">{ad.seller_name}</td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 text-xs ${typeInfo.color}`}>
                        <typeInfo.icon size={12} />
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="p-3 text-sm font-bold text-[#FF6B00]">{formatPrice(ad.cost)}</td>
                    <td className="p-3 text-sm text-gray-600">{ad.views || 0}</td>
                    <td className="p-3 text-sm text-gray-600">{ad.clicks || 0}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[ad.status]}`}>
                        {STATUS_LABELS[ad.status]}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-500">{formatDate(ad.end_date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default AdsTab;
