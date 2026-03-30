// /app/frontend/src/components/seller/SellerFlashSalesTab.js
// تبويب عروض الفلاش للبائعين

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Flame, Zap, Clock, CheckCircle, XCircle, Loader2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const SellerFlashSalesTab = ({ products, token }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [availableSales, setAvailableSales] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [settings, setSettings] = useState({ join_fee: 5000 });
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showProducts, setShowProducts] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [salesRes, requestsRes, settingsRes] = await Promise.all([
        axios.get(`${API}/api/orders/seller/flash-sales/available`, { headers }),
        axios.get(`${API}/api/orders/seller/my-flash-requests`, { headers }),
        axios.get(`${API}/api/orders/seller/flash-sale-settings`, { headers })
      ]);
      
      setAvailableSales(salesRes.data || []);
      setMyRequests(requestsRes.data || []);
      setSettings(settingsRes.data || { join_fee: 5000 });
    } catch (error) {
      console.error('Error fetching flash data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!selectedSale || selectedProducts.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار عرض الفلاش ومنتج واحد على الأقل",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        `${API}/api/orders/seller/flash-sale-request`,
        {
          flash_sale_id: selectedSale.id,
          product_ids: selectedProducts
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: "تم بنجاح",
        description: "تم إرسال طلب الانضمام للفلاش"
      });
      
      setSelectedSale(null);
      setSelectedProducts([]);
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في إرسال الطلب",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs flex items-center gap-1"><Clock size={12} /> قيد المراجعة</span>;
      case 'approved':
        return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs flex items-center gap-1"><CheckCircle size={12} /> موافق عليه</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs flex items-center gap-1"><XCircle size={12} /> مرفوض</span>;
      default:
        return null;
    }
  };

  const approvedProducts = products?.filter(p => p.is_approved) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* بانر الانضمام */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={24} className="text-yellow-300" />
          <h2 className="font-bold text-lg">انضم لعروض الفلاش</h2>
        </div>
        <p className="text-sm opacity-90 mb-3">
          شارك منتجاتك في عروض الفلاش لزيادة المبيعات! رسوم الانضمام {settings.join_fee?.toLocaleString()} ل.س
        </p>
        <div className="bg-white/20 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
          <Flame size={14} />
          <span>يتم خصم الرسوم من محفظتك تلقائياً</span>
        </div>
      </div>

      {/* عروض الفلاش المتاحة */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Flame size={18} className="text-orange-500" />
          عروض الفلاش المتاحة
        </h3>
        
        {availableSales.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Flame size={40} className="mx-auto mb-2 opacity-30" />
            <p>لا توجد عروض فلاش متاحة حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {availableSales.map(sale => (
              <div 
                key={sale.id}
                onClick={() => setSelectedSale(selectedSale?.id === sale.id ? null : sale)}
                className={`border rounded-xl p-3 cursor-pointer transition-all ${
                  selectedSale?.id === sale.id 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900">{sale.name}</h4>
                    <p className="text-sm text-gray-500">خصم {sale.discount_percentage}%</p>
                  </div>
                  <div className="text-left">
                    <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-bold">
                      -{sale.discount_percentage}%
                    </span>
                  </div>
                </div>
                {sale.end_time && (
                  <p className="text-xs text-gray-400 mt-2">
                    ينتهي: {new Date(sale.end_time).toLocaleDateString('ar')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* اختيار المنتجات عند تحديد عرض */}
      {selectedSale && (
        <div className="bg-white rounded-xl border border-orange-200 p-4">
          <button
            onClick={() => setShowProducts(!showProducts)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Package size={18} className="text-orange-500" />
              اختر المنتجات للعرض ({selectedProducts.length} محدد)
            </h3>
            {showProducts ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          
          {showProducts && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {approvedProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-4">لا توجد منتجات موافق عليها</p>
              ) : (
                approvedProducts.map(product => (
                  <label
                    key={product.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedProducts.includes(product.id)
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProductSelection(product.id)}
                      className="w-5 h-5 text-orange-500 rounded"
                    />
                    <img
                      src={product.images?.[0] || '/placeholder.png'}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.price?.toLocaleString()} ل.س</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          )}
          
          <button
            onClick={handleJoinRequest}
            disabled={submitting || selectedProducts.length === 0}
            className="w-full mt-4 py-3 bg-orange-500 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                جاري الإرسال...
              </>
            ) : (
              <>
                <Zap size={18} />
                طلب الانضمام ({settings.join_fee?.toLocaleString()} ل.س)
              </>
            )}
          </button>
        </div>
      )}

      {/* طلباتي السابقة */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-4">طلباتي السابقة</h3>
        
        {myRequests.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>لم تقدم أي طلبات بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.map(req => (
              <div key={req.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {req.flash_sale?.name || 'عرض فلاش'}
                  </span>
                  {getStatusBadge(req.status)}
                </div>
                <div className="text-sm text-gray-500">
                  <p>{req.product_ids?.length || 0} منتجات</p>
                  <p>الرسوم: {req.fee_paid?.toLocaleString()} ل.س</p>
                </div>
                {req.rejection_reason && (
                  <p className="text-sm text-red-600 mt-2">
                    سبب الرفض: {req.rejection_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerFlashSalesTab;
