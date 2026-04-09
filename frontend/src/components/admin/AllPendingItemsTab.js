// /app/frontend/src/components/admin/AllPendingItemsTab.js
// صفحة موحدة لجميع العناصر المعلقة (منتجات + أطباق طعام)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';
import { 
  Package, UtensilsCrossed, Check, X, Eye, 
  Loader2, ChevronDown, ChevronUp, Image as ImageIcon, Video, Play
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const AllPendingItemsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [pendingFoodItems, setPendingFoodItems] = useState([]);
  const [activeSection, setActiveSection] = useState('all'); // all, products, food_items
  const [expandedItem, setExpandedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [videoModal, setVideoModal] = useState({ isOpen: false, videoUrl: null, productName: '' });

  useEffect(() => {
    fetchAllPending();
  }, []);

  const fetchAllPending = async () => {
    setLoading(true);
    try {
      const [productsRes, foodItemsRes] = await Promise.all([
        axios.get(`${API}/api/admin/products/pending`),
        axios.get(`${API}/api/admin/food-items/pending`)
      ]);
      setPendingProducts(productsRes.data || []);
      setPendingFoodItems(foodItemsRes.data || []);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في جلب البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveProduct = async (productId) => {
    setActionLoading(productId);
    try {
      await axios.post(`${API}/api/admin/products/${productId}/approve`);
      toast({ title: "تم", description: "تم الموافقة على المنتج" });
      fetchAllPending();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الموافقة", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectProduct = async (productId) => {
    setActionLoading(productId);
    try {
      await axios.post(`${API}/api/admin/products/${productId}/reject`, { 
        approved: false,
        rejection_reason: rejectReason 
      });
      toast({ title: "تم", description: "تم رفض المنتج" });
      setShowRejectModal(null);
      setRejectReason('');
      fetchAllPending();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الرفض", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveFoodItem = async (itemId) => {
    setActionLoading(itemId);
    try {
      await axios.post(`${API}/api/admin/food-items/${itemId}/approve`);
      toast({ title: "تم", description: "تم الموافقة على الطبق" });
      fetchAllPending();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الموافقة", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectFoodItem = async (itemId) => {
    setActionLoading(itemId);
    try {
      await axios.post(`${API}/api/admin/food-items/${itemId}/reject`, { 
        rejection_reason: rejectReason 
      });
      toast({ title: "تم", description: "تم رفض الطبق" });
      setShowRejectModal(null);
      setRejectReason('');
      fetchAllPending();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الرفض", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (price) => {
    return price?.toLocaleString() + ' ل.س';
  };

  const totalPending = pendingProducts.length + pendingFoodItems.length;

  const filteredData = () => {
    switch (activeSection) {
      case 'products': return { products: pendingProducts, foodItems: [] };
      case 'food_items': return { products: [], foodItems: pendingFoodItems };
      default: return { products: pendingProducts, foodItems: pendingFoodItems };
    }
  };

  const data = filteredData();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-blue-500" size={32} />
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
            activeSection === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Package size={16} />
          الكل ({totalPending})
        </button>
        <button
          onClick={() => setActiveSection('products')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'products' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
          }`}
        >
          <Package size={16} />
          منتجات ({pendingProducts.length})
        </button>
        <button
          onClick={() => setActiveSection('food_items')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'food_items' ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
          }`}
        >
          <UtensilsCrossed size={16} />
          أطباق ({pendingFoodItems.length})
        </button>
      </div>

      {/* Empty State */}
      {totalPending === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Package size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد عناصر معلقة</p>
        </div>
      )}

      {/* Products Section */}
      {data.products.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-blue-700 flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
            <Package size={18} />
            المنتجات المعلقة ({data.products.length})
          </h3>
          {data.products.map((product) => (
            <div key={product.id} className="bg-white rounded-xl border border-blue-200 overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-blue-50/50"
                onClick={() => setExpandedItem(expandedItem === product.id ? null : product.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon size={24} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{product.name}</h4>
                    <p className="text-sm text-blue-600 font-medium">{formatPrice(product.price)}</p>
                    <p className="text-xs text-gray-500">{product.seller_name || 'بائع'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedItem === product.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
              
              {expandedItem === product.id && (
                <div className="px-4 pb-4 border-t bg-gray-50">
                  {/* زر فيديو التحقق */}
                  {product.admin_video && (
                    <button
                      onClick={() => setVideoModal({ isOpen: true, videoUrl: product.admin_video, productName: product.name })}
                      className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <Play size={18} />
                      📹 مشاهدة فيديو التحقق
                    </button>
                  )}
                  {!product.admin_video && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                      <span className="text-yellow-700 text-sm">⚠️ لا يوجد فيديو تحقق</span>
                    </div>
                  )}
                  <div className="py-3 text-sm space-y-2">
                    <p><span className="text-gray-500">الوصف:</span> {product.description || 'لا يوجد'}</p>
                    <p><span className="text-gray-500">الفئة:</span> {product.category}</p>
                    <p><span className="text-gray-500">المخزون:</span> {product.stock}</p>
                  </div>
                  {product.images?.length > 1 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto">
                      {product.images.map((img, i) => (
                        <img key={i} src={img} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveProduct(product.id)}
                      disabled={actionLoading === product.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      {actionLoading === product.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      قبول
                    </button>
                    <button
                      onClick={() => setShowRejectModal({ type: 'product', id: product.id })}
                      disabled={actionLoading === product.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                      <X size={16} />
                      رفض
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Food Items Section */}
      {data.foodItems.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-orange-700 flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg">
            <UtensilsCrossed size={18} />
            الأطباق المعلقة ({data.foodItems.length})
          </h3>
          {data.foodItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-orange-200 overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-orange-50/50"
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UtensilsCrossed size={24} className="text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{item.name}</h4>
                    <p className="text-sm text-orange-600 font-medium">{formatPrice(item.price)}</p>
                    <p className="text-xs text-gray-500">{item.store_name || 'متجر'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedItem === item.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
              
              {expandedItem === item.id && (
                <div className="px-4 pb-4 border-t bg-gray-50">
                  {/* زر فيديو التحقق */}
                  {item.admin_video && (
                    <button
                      onClick={() => setVideoModal({ isOpen: true, videoUrl: item.admin_video, productName: item.name })}
                      className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <Play size={18} />
                      📹 مشاهدة فيديو التحقق
                    </button>
                  )}
                  {!item.admin_video && (
                    <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                      <span className="text-yellow-700 text-sm">⚠️ لا يوجد فيديو تحقق</span>
                    </div>
                  )}
                  <div className="py-3 text-sm space-y-2">
                    <p><span className="text-gray-500">الوصف:</span> {item.description || 'لا يوجد'}</p>
                    <p><span className="text-gray-500">الفئة:</span> {item.category}</p>
                    {item.preparation_time && <p><span className="text-gray-500">وقت التحضير:</span> {item.preparation_time} دقيقة</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveFoodItem(item.id)}
                      disabled={actionLoading === item.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      {actionLoading === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      قبول
                    </button>
                    <button
                      onClick={() => setShowRejectModal({ type: 'food', id: item.id })}
                      disabled={actionLoading === item.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                      <X size={16} />
                      رفض
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-4">
            <h3 className="font-bold text-lg mb-4">سبب الرفض</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="اكتب سبب الرفض (اختياري)..."
              className="w-full border rounded-lg p-3 text-sm h-24 resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowRejectModal(null); setRejectReason(''); }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (showRejectModal.type === 'product') {
                    handleRejectProduct(showRejectModal.id);
                  } else {
                    handleRejectFoodItem(showRejectModal.id);
                  }
                }}
                disabled={actionLoading}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                رفض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal - عرض فيديو التحقق */}
      {videoModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800">📹 فيديو التحقق: {videoModal.productName}</h3>
              <button
                onClick={() => setVideoModal({ isOpen: false, videoUrl: null, productName: '' })}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <video 
                src={videoModal.videoUrl} 
                controls 
                autoPlay
                className="w-full rounded-lg max-h-[60vh]"
              />
              <p className="text-xs text-gray-500 text-center mt-3">
                هذا الفيديو مرفوع من البائع للتحقق من وجود المنتج
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllPendingItemsTab;
