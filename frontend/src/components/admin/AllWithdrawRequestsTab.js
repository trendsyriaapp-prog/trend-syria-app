// /app/frontend/src/components/admin/AllWithdrawRequestsTab.js
// صفحة موحدة لجميع طلبات السحب (بائعين منتجات + بائعين طعام + موظفين توصيل)
// ✅ النظام الجديد: الطلبات تُقبل تلقائياً - الأدمن يؤكد التحويل فقط

import React, { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';
import { 
  Wallet, Store, Truck, UtensilsCrossed, Check, X, Eye, 
  Loader2, ChevronDown, ChevronUp, Calendar, DollarSign, Phone, Banknote, Building
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const AllWithdrawRequestsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [activeSection, setActiveSection] = useState('ready'); // ready, all, sellers, food_sellers, delivery
  const [expandedItem, setExpandedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchWithdrawRequests();
  }, []);

  const fetchWithdrawRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/payment/admin/withdrawals`);
      setWithdrawRequests(response.data || []);
    } catch (error) {
      logger.error('Error fetching withdrawals:', error);
      toast({ title: "خطأ", description: "فشل في جلب طلبات السحب", variant: "destructive" });
      setWithdrawRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // تأكيد أن التحويل تم (النظام الجديد)
  const handleMarkTransferred = async (requestId) => {
    setActionLoading(requestId);
    try {
      await axios.post(`${API}/api/payment/admin/withdrawals/${requestId}/mark-transferred`);
      toast({ title: "✅ تم", description: "تم تأكيد التحويل بنجاح" });
      fetchWithdrawRequests();
    } catch (error) {
      // للتوافق الخلفي - جرب الـ API القديم
      try {
        await axios.post(`${API}/api/payment/admin/withdrawals/${requestId}/approve`);
        toast({ title: "✅ تم", description: "تم تأكيد التحويل بنجاح" });
        fetchWithdrawRequests();
      } catch (err) {
        toast({ title: "خطأ", description: error.response?.data?.detail || "فشل تأكيد التحويل", variant: "destructive" });
      }
    } finally {
      setActionLoading(null);
    }
  };

  // رفض/إلغاء الطلب (يُرجع المبلغ للمحفظة)
  const handleReject = async (requestId) => {
    const reason = prompt("سبب الرفض (اختياري):");
    if (reason === null) return; // تم إلغاء النافذة
    
    setActionLoading(requestId);
    try {
      await axios.post(`${API}/api/payment/admin/withdrawals/${requestId}/reject?reason=${encodeURIComponent(reason || 'بيانات غير صحيحة')}`);
      toast({ title: "تم", description: "تم رفض الطلب وإرجاع المبلغ للمحفظة" });
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

  // الطلبات الجاهزة للتحويل (النظام الجديد)
  const readyRequests = withdrawRequests.filter(r => r.status === 'ready_for_transfer' || r.status === 'pending');
  const transferredRequests = withdrawRequests.filter(r => r.status === 'transferred' || r.status === 'approved');
  
  const sellers = readyRequests.filter(r => r.user_type === 'seller' || r.request_type === 'seller');
  const foodSellers = readyRequests.filter(r => r.user_type === 'food_seller' || r.request_type === 'food_seller');
  const delivery = readyRequests.filter(r => r.user_type === 'delivery' || r.request_type === 'delivery');

  const filteredData = () => {
    switch (activeSection) {
      case 'ready': return readyRequests;
      case 'transferred': return transferredRequests;
      case 'sellers': return sellers;
      case 'food_sellers': return foodSellers;
      case 'delivery': return delivery;
      default: return withdrawRequests;
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
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
        <p className="font-bold text-blue-800 mb-1">✅ النظام الجديد للسحب</p>
        <p className="text-blue-600">
          الطلبات تُقبل تلقائياً والمبلغ يُخصم من محفظة المستخدم فوراً.
          <br />
          مهمتك: افتح تطبيق البنك/شام كاش → حوّل المبلغ → اضغط "تم التحويل"
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveSection('ready')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'ready' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
          }`}
        >
          <Banknote size={16} />
          جاهز للتحويل ({readyRequests.length})
        </button>
        <button
          onClick={() => setActiveSection('transferred')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'transferred' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'
          }`}
        >
          <Check size={16} />
          تم التحويل ({transferredRequests.length})
        </button>
        <button
          onClick={() => setActiveSection('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'all' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Wallet size={16} />
          الكل ({withdrawRequests.length})
        </button>
      </div>

      {/* Empty State */}
      {data.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Wallet size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">
            {activeSection === 'ready' ? 'لا توجد طلبات سحب جاهزة للتحويل' : 'لا توجد طلبات سحب'}
          </p>
        </div>
      )}

      {/* Requests List */}
      {data.length > 0 && (
        <div className="space-y-3">
          {data.map((request) => {
            const userType = request.user_type || request.request_type;
            const isReady = request.status === 'ready_for_transfer' || request.status === 'pending';
            const isTransferred = request.status === 'transferred' || request.status === 'approved';
            const isBankAccount = request.withdrawal_method === 'bank_account';
            
            return (
              <div key={request.id} className={`bg-white rounded-xl border overflow-hidden ${
                isReady ? 'border-orange-300 shadow-sm' : 
                isTransferred ? 'border-green-200' : 'border-gray-200'
              }`}>
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
                        {/* طريقة السحب */}
                        <span className={`text-xs px-1.5 py-0.5 rounded ${isBankAccount ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                          {isBankAccount ? '🏦 بنكي' : '💳 شام كاش'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg text-green-600">{formatPrice(request.amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      isReady ? 'bg-orange-100 text-orange-600' :
                      isTransferred ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {isReady ? '⏳ جاهز للتحويل' : isTransferred ? '✅ تم التحويل' : request.status}
                    </span>
                    {expandedItem === request.id ? <ChevronUp size={20} className="mx-auto text-gray-400 mt-1" /> : <ChevronDown size={20} className="mx-auto text-gray-400 mt-1" />}
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
                      
                      {/* تفاصيل طريقة الدفع */}
                      {isBankAccount ? (
                        <div className="col-span-2 bg-purple-50 p-3 rounded-lg">
                          <p className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                            <Building size={16} />
                            بيانات الحساب البنكي
                          </p>
                          <div className="space-y-1 text-sm">
                            <p><span className="text-gray-500">البنك:</span> {request.bank_name || 'غير محدد'}</p>
                            <p><span className="text-gray-500">رقم الحساب:</span> <code className="bg-white px-2 py-0.5 rounded">{request.account_number || 'غير محدد'}</code></p>
                            <p><span className="text-gray-500">اسم صاحب الحساب:</span> {request.account_holder || 'غير محدد'}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="col-span-2 bg-blue-50 p-3 rounded-lg">
                          <p className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <Banknote size={16} />
                            بيانات شام كاش
                          </p>
                          <p className="text-sm">
                            <span className="text-gray-500">رقم الهاتف:</span> 
                            <code className="bg-white px-2 py-0.5 rounded mr-2">{request.shamcash_phone || 'غير محدد'}</code>
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* أزرار الإجراءات - فقط للطلبات الجاهزة */}
                    {isReady && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleMarkTransferred(request.id)}
                          disabled={actionLoading === request.id}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 font-bold"
                        >
                          {actionLoading === request.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          ✅ تم التحويل
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={actionLoading === request.id}
                          className="flex items-center justify-center gap-2 py-3 px-4 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 disabled:opacity-50"
                        >
                          <X size={16} />
                          رفض
                        </button>
                      </div>
                    )}
                    
                    {/* معلومات التحويل */}
                    {isTransferred && request.transferred_at && (
                      <div className="mt-3 bg-green-50 p-3 rounded-lg text-sm text-green-700">
                        <p>✅ تم التحويل بتاريخ: {formatDate(request.transferred_at)}</p>
                      </div>
                    )}
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
