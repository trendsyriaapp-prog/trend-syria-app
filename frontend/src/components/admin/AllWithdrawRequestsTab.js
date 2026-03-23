// /app/frontend/src/components/admin/AllWithdrawRequestsTab.js
// صفحة موحدة لجميع طلبات السحب (بائعين منتجات + بائعين طعام + موظفين توصيل)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';
import { 
  Wallet, Store, Truck, UtensilsCrossed, Check, X, Eye, 
  Loader2, ChevronDown, ChevronUp, Calendar, DollarSign, Phone
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const AllWithdrawRequestsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [activeSection, setActiveSection] = useState('all'); // all, sellers, food_sellers, delivery
  const [expandedItem, setExpandedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchWithdrawRequests();
  }, []);

  const fetchWithdrawRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/admin/withdraw-requests/all`);
      setWithdrawRequests(response.data || []);
    } catch (error) {
      // fallback: fetch from different endpoints
      try {
        const [sellersRes, foodRes, deliveryRes] = await Promise.all([
          axios.get(`${API}/api/admin/withdraw-requests?user_type=seller`).catch(() => ({ data: [] })),
          axios.get(`${API}/api/admin/withdraw-requests?user_type=food_seller`).catch(() => ({ data: [] })),
          axios.get(`${API}/api/admin/withdraw-requests?user_type=delivery`).catch(() => ({ data: [] }))
        ]);
        
        const all = [
          ...(sellersRes.data || []).map(r => ({ ...r, request_type: 'seller' })),
          ...(foodRes.data || []).map(r => ({ ...r, request_type: 'food_seller' })),
          ...(deliveryRes.data || []).map(r => ({ ...r, request_type: 'delivery' }))
        ];
        setWithdrawRequests(all);
      } catch (err) {
        toast({ title: "خطأ", description: "فشل في جلب طلبات السحب", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    setActionLoading(requestId);
    try {
      await axios.post(`${API}/api/admin/withdraw-requests/${requestId}/approve`);
      toast({ title: "تم", description: "تم الموافقة على طلب السحب" });
      fetchWithdrawRequests();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل الموافقة", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoading(requestId);
    try {
      await axios.post(`${API}/api/admin/withdraw-requests/${requestId}/reject`);
      toast({ title: "تم", description: "تم رفض طلب السحب" });
      fetchWithdrawRequests();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل الرفض", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (price) => {
    return (price || 0).toLocaleString() + ' ل.س';
  };

  const formatDate = (date) => {
    if (!date) return 'غير محدد';
    return new Date(date).toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserTypeIcon = (type) => {
    switch (type) {
      case 'seller': return <Store size={16} className="text-amber-600" />;
      case 'food_seller': return <UtensilsCrossed size={16} className="text-green-600" />;
      case 'delivery': return <Truck size={16} className="text-cyan-600" />;
      default: return <Wallet size={16} className="text-gray-600" />;
    }
  };

  const getUserTypeLabel = (type) => {
    switch (type) {
      case 'seller': return 'بائع منتجات';
      case 'food_seller': return 'بائع طعام';
      case 'delivery': return 'موظف توصيل';
      default: return 'مستخدم';
    }
  };

  const getUserTypeColor = (type) => {
    switch (type) {
      case 'seller': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'food_seller': return 'bg-green-100 text-green-700 border-green-200';
      case 'delivery': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const pendingRequests = withdrawRequests.filter(r => r.status === 'pending');
  
  const sellers = pendingRequests.filter(r => r.user_type === 'seller' || r.request_type === 'seller');
  const foodSellers = pendingRequests.filter(r => r.user_type === 'food_seller' || r.request_type === 'food_seller');
  const delivery = pendingRequests.filter(r => r.user_type === 'delivery' || r.request_type === 'delivery');

  const filteredData = () => {
    switch (activeSection) {
      case 'sellers': return sellers;
      case 'food_sellers': return foodSellers;
      case 'delivery': return delivery;
      default: return pendingRequests;
    }
  };

  const data = filteredData();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveSection('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'all' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Wallet size={16} />
          الكل ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveSection('sellers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'sellers' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
          }`}
        >
          <Store size={16} />
          بائعين ({sellers.length})
        </button>
        <button
          onClick={() => setActiveSection('food_sellers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'food_sellers' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'
          }`}
        >
          <UtensilsCrossed size={16} />
          بائعي طعام ({foodSellers.length})
        </button>
        <button
          onClick={() => setActiveSection('delivery')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'delivery' ? 'bg-cyan-500 text-white' : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
          }`}
        >
          <Truck size={16} />
          سائقين ({delivery.length})
        </button>
      </div>

      {/* Empty State */}
      {pendingRequests.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Wallet size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد طلبات سحب معلقة</p>
        </div>
      )}

      {/* Requests List */}
      {data.length > 0 && (
        <div className="space-y-3">
          {data.map((request) => {
            const userType = request.user_type || request.request_type;
            return (
              <div key={request.id} className={`bg-white rounded-xl border overflow-hidden ${getUserTypeColor(userType)}`}>
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50"
                  onClick={() => setExpandedItem(expandedItem === request.id ? null : request.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      userType === 'seller' ? 'bg-amber-100' :
                      userType === 'food_seller' ? 'bg-green-100' :
                      userType === 'delivery' ? 'bg-cyan-100' : 'bg-gray-100'
                    }`}>
                      {userType === 'seller' && <Store size={24} className="text-amber-600" />}
                      {userType === 'food_seller' && <UtensilsCrossed size={24} className="text-green-600" />}
                      {userType === 'delivery' && <Truck size={24} className="text-cyan-600" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{request.user_name || request.name || 'مستخدم'}</h4>
                      <div className="flex items-center gap-2">
                        {getUserTypeIcon(userType)}
                        <span className="text-xs text-gray-500">{getUserTypeLabel(userType)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg text-green-600">{formatPrice(request.amount)}</p>
                    {expandedItem === request.id ? <ChevronUp size={20} className="mx-auto text-gray-400" /> : <ChevronDown size={20} className="mx-auto text-gray-400" />}
                  </div>
                </div>
                
                {expandedItem === request.id && (
                  <div className="px-4 pb-4 border-t bg-gray-50">
                    <div className="grid grid-cols-2 gap-3 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        <span>{request.phone || request.user_phone || 'غير محدد'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{formatDate(request.created_at)}</span>
                      </div>
                      {request.payment_method && (
                        <div className="col-span-2">
                          <span className="text-gray-500">طريقة الدفع:</span> {request.payment_method}
                        </div>
                      )}
                      {request.payment_details && (
                        <div className="col-span-2">
                          <span className="text-gray-500">تفاصيل الحساب:</span> {request.payment_details}
                        </div>
                      )}
                      {request.notes && (
                        <div className="col-span-2">
                          <span className="text-gray-500">ملاحظات:</span> {request.notes}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleApprove(request.id)}
                        disabled={actionLoading === request.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                      >
                        {actionLoading === request.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        موافقة
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        disabled={actionLoading === request.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        <X size={16} />
                        رفض
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AllWithdrawRequestsTab;
