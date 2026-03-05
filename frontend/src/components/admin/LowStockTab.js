// /app/frontend/src/components/admin/LowStockTab.js
// تقرير المخزون المنخفض - لوحة المدير

import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Package, Phone, User, RefreshCw, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const LowStockTab = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ threshold: 5, count: 0, products: [] });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLowStockProducts();
  }, []);

  const fetchLowStockProducts = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/products/low-stock`);
      setData(res.data);
    } catch (error) {
      console.error('Error fetching low stock products:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLowStockProducts();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  return (
    <section className="space-y-4" data-testid="low-stock-tab">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h2 className="font-bold text-lg">تقرير المخزون المنخفض</h2>
              <p className="text-sm opacity-90">
                المنتجات التي وصل مخزونها إلى {data.threshold} قطع أو أقل
              </p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-3xl font-bold">{data.count}</p>
            <p className="text-sm opacity-90">منتج</p>
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          data-testid="refresh-low-stock-btn"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Products List */}
      {data.products.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
          <Package size={48} className="text-green-500 mx-auto mb-3" />
          <h3 className="font-bold text-gray-900 mb-1">لا توجد منتجات بمخزون منخفض</h3>
          <p className="text-sm text-gray-500">
            جميع المنتجات لديها مخزون كافي (أكثر من {data.threshold} قطع)
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-right p-3 text-xs font-bold text-gray-600">المنتج</th>
                  <th className="text-right p-3 text-xs font-bold text-gray-600">المخزون</th>
                  <th className="text-right p-3 text-xs font-bold text-gray-600">السعر</th>
                  <th className="text-right p-3 text-xs font-bold text-gray-600">البائع</th>
                  <th className="text-right p-3 text-xs font-bold text-gray-600">رقم الهاتف</th>
                  <th className="text-center p-3 text-xs font-bold text-gray-600">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.images?.[0] || 'https://via.placeholder.com/40'}
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div>
                          <p className="font-medium text-sm text-gray-900 truncate max-w-[150px]">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                        product.stock === 0
                          ? 'bg-red-100 text-red-700'
                          : product.stock <= 3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {product.stock === 0 ? (
                          <>
                            <AlertTriangle size={12} />
                            نفذ
                          </>
                        ) : (
                          `${product.stock} قطع`
                        )}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-900 font-medium">
                      {formatPrice(product.price)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <User size={14} className="text-gray-400" />
                        {product.seller_info?.full_name || 'غير معروف'}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 text-sm text-gray-700">
                        <Phone size={14} className="text-gray-400" />
                        {product.seller_info?.phone || '-'}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => navigate(`/product/${product.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#FF6B00] text-white rounded-lg text-xs font-medium hover:bg-[#E65000]"
                        data-testid={`view-product-${product.id}`}
                      >
                        <ExternalLink size={12} />
                        عرض
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {data.products.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {data.products.filter(p => p.stock === 0).length}
            </p>
            <p className="text-xs text-red-700">نفذ المخزون</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {data.products.filter(p => p.stock > 0 && p.stock <= 3).length}
            </p>
            <p className="text-xs text-orange-700">1-3 قطع</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {data.products.filter(p => p.stock > 3).length}
            </p>
            <p className="text-xs text-yellow-700">4-{data.threshold} قطع</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default LowStockTab;
