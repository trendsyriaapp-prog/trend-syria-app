// /app/frontend/src/components/admin/SellerManagementTab.js
// تبويب إدارة حسابات البائعين

import React, { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import { 
  Store, Check, X, Clock, AlertTriangle, RefreshCw, 
  UserX, UserCheck, Trash2, Phone, Package, ShoppingBag,
  Search, Ban
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SellerManagementTab() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [suspendModal, setSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/sellers/with-status`);
      if (res.ok) {
        setSellers(await res.json());
      }
    } catch (err) {
      logger.error('Error fetching sellers:', err);
    }
    setLoading(false);
  };

  const handleSuspendSeller = async () => {
    if (!suspendModal) return;
    setActionLoading(suspendModal.id);
    try {
      const res = await fetch(`${API}/api/admin/sellers/${suspendModal.id}/suspend`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ reason: suspendReason })
      });
      if (res.ok) {
        alert('تم إيقاف البائع بنجاح');
        fetchSellers();
      } else {
        const data = await res.json();
        alert(data.detail || 'حدث خطأ');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال');
    }
    setActionLoading(null);
    setSuspendModal(null);
    setSuspendReason('');
  };

  const handleActivateSeller = async (sellerId) => {
    if (!confirm('هل أنت متأكد من إعادة تفعيل هذا البائع؟')) return;
    
    setActionLoading(sellerId);
    try {
      const res = await fetch(`${API}/api/admin/sellers/${sellerId}/activate`, {
        method: 'POST'
      });
      if (res.ok) {
        alert('تم تفعيل البائع بنجاح');
        fetchSellers();
      }
    } catch (err) {
      alert('حدث خطأ');
    }
    setActionLoading(null);
  };

  const handleDeleteSeller = async () => {
    if (!deleteModal) return;
    
    setActionLoading(deleteModal.id);
    try {
      const res = await fetch(`${API}/api/admin/sellers/${deleteModal.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        alert('تم حذف البائع نهائياً');
        fetchSellers();
      } else {
        const data = await res.json();
        alert(data.detail || 'حدث خطأ');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال');
    }
    setActionLoading(null);
    setDeleteModal(null);
  };

  const getSellerStatus = (seller) => {
    if (seller.is_suspended) {
      return { label: 'موقوف', color: 'bg-red-100 text-red-700', icon: Ban };
    }
    if (!seller.is_approved) {
      return { label: 'غير معتمد', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
    }
    return { label: 'نشط', color: 'bg-green-100 text-green-700', icon: UserCheck };
  };

  const filteredSellers = sellers.filter(s => {
    // Filter by search
    if (searchQuery) {
      const name = (s.store_name || s.name || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      if (!name.includes(searchQuery.toLowerCase()) && !phone.includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    
    // Filter by status
    if (filterStatus === 'active' && (s.is_suspended || !s.is_approved)) return false;
    if (filterStatus === 'suspended' && !s.is_suspended) return false;
    if (filterStatus === 'pending' && s.is_approved) return false;
    
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">إدارة البائعين</h2>
            <p className="text-sm text-gray-500">إدارة حسابات البائعين وإيقافها</p>
          </div>
        </div>
        <button 
          onClick={fetchSellers}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="بحث بالاسم أو رقم الهاتف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 pr-10 border rounded-lg"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        
        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-3 border rounded-lg bg-white min-w-[150px]"
        >
          <option value="all">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="suspended">موقوف</option>
          <option value="pending">غير معتمد</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {sellers.filter(s => !s.is_suspended && s.is_approved).length}
          </p>
          <p className="text-sm text-green-700">نشط</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {sellers.filter(s => s.is_suspended).length}
          </p>
          <p className="text-sm text-red-700">موقوف</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {sellers.filter(s => !s.is_approved).length}
          </p>
          <p className="text-sm text-yellow-700">غير معتمد</p>
        </div>
      </div>

      {/* Sellers List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-gray-400" />
          <p className="mt-2 text-gray-500">جاري التحميل...</p>
        </div>
      ) : filteredSellers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Store className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا يوجد بائعين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSellers.map((seller) => {
            const status = getSellerStatus(seller);
            const StatusIcon = status.icon;
            
            return (
              <div key={seller.id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  {/* Seller Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-900 truncate">
                        {seller.store_name || seller.name || 'بدون اسم'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {seller.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        {seller.products_count || 0} منتج
                      </span>
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4" />
                        {seller.completed_orders || 0} طلب
                      </span>
                    </div>
                    
                    {seller.is_suspended && seller.suspension_reason && (
                      <p className="mt-2 text-sm text-red-600">
                        سبب الإيقاف: {seller.suspension_reason}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {seller.is_suspended ? (
                      <button
                        onClick={() => handleActivateSeller(seller.id)}
                        disabled={actionLoading === seller.id}
                        className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm flex items-center gap-1 disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4" />
                        تفعيل
                      </button>
                    ) : (
                      <button
                        onClick={() => setSuspendModal(seller)}
                        disabled={actionLoading === seller.id}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm flex items-center gap-1 disabled:opacity-50"
                      >
                        <UserX className="w-4 h-4" />
                        إيقاف
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteModal(seller)}
                      disabled={actionLoading === seller.id}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-1 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserX className="w-6 h-6 text-red-600" />
              إيقاف البائع
            </h3>
            <p className="text-gray-600 mb-4">
              هل أنت متأكد من إيقاف <strong>{suspendModal.store_name || suspendModal.name}</strong>؟
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                سبب الإيقاف (اختياري)
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full p-3 border rounded-lg"
                rows={3}
                placeholder="أدخل سبب الإيقاف..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSuspendSeller}
                disabled={actionLoading === suspendModal.id}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === suspendModal.id ? 'جاري الإيقاف...' : 'تأكيد الإيقاف'}
              </button>
              <button
                onClick={() => { setSuspendModal(null); setSuspendReason(''); }}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
              <Trash2 className="w-6 h-6" />
              حذف البائع نهائياً
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">
                ⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!
              </p>
              <p className="text-red-600 text-sm mt-1">
                سيتم حذف جميع بيانات البائع <strong>{deleteModal.store_name || deleteModal.name}</strong> نهائياً.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteSeller}
                disabled={actionLoading === deleteModal.id}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === deleteModal.id ? 'جاري الحذف...' : 'حذف نهائياً'}
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
