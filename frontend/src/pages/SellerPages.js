import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Upload, FileText, Check, Clock, X, Plus, 
  Package, DollarSign, ShoppingBag, Loader2,
  Megaphone, Wallet, TrendingUp, Gift, BookOpen, Star, MessageSquare, Send, Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { formatPrice } from '../utils/imageHelpers';

// Imported Components
import SellerAdsTab from '../components/seller/SellerAdsTab';
import SellerAdAnalytics from '../components/seller/SellerAdAnalytics';
import SellerDiscountsTab from '../components/seller/SellerDiscountsTab';
import SellerReviewsTab from '../components/seller/SellerReviewsTab';
import ImageBackgroundSelector from '../components/seller/ImageBackgroundSelector';
import OrderLabelPrint from '../components/seller/OrderLabelPrint';
import AddProductModal from '../components/seller/AddProductModal';
import EditProductModal from '../components/seller/EditProductModal';
import SellerStatsCard from '../components/seller/SellerStatsCard';
import SellerProductsGrid from '../components/seller/SellerProductsGrid';
import SellerOrdersSection from '../components/seller/SellerOrdersSection';
import StatDetailsModal from '../components/seller/StatDetailsModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Seller Documents Upload Page
const SellerDocumentsPage = () => {
  const navigate = useNavigate();
  const { user, fetchUser } = useAuth();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState('');
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user]);

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API}/seller/documents/status`);
      setStatus(res.data.status);
      if (res.data.business_name) {
        setBusinessName(res.data.business_name);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLicense(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!license) {
      toast({
        title: "خطأ",
        description: "يرجى رفع شهادة البائع",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/seller/documents`, {
        seller_id: user.id,
        business_name: businessName,
        business_license: license
      });

      toast({
        title: "تم الإرسال",
        description: "تم رفع المستندات بنجاح، سيتم مراجعتها"
      });
      setStatus('pending');
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.user_type !== 'seller') {
    navigate('/');
    return null;
  }

  if (user.is_approved) {
    navigate('/seller/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#FF6B00]/20 flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-[#FF6B00]" />
          </div>
          <h1 className="text-2xl font-bold">تأكيد حساب البائع</h1>
          <p className="text-white/50 mt-2">ارفع شهادة البائع للموافقة على حسابك</p>
        </div>

        {status === 'pending' ? (
          <div className="bg-[#121212] rounded-2xl p-6 border border-white/5 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-yellow-500" />
            </div>
            <h3 className="font-bold mb-2">في انتظار الموافقة</h3>
            <p className="text-white/50 text-sm">
              تم رفع مستنداتك بنجاح. سيتم مراجعتها والرد عليك قريباً.
            </p>
          </div>
        ) : status === 'rejected' ? (
          <div className="bg-[#121212] rounded-2xl p-6 border border-white/5 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <X size={32} className="text-red-500" />
            </div>
            <h3 className="font-bold mb-2">تم الرفض</h3>
            <p className="text-white/50 text-sm mb-4">
              عذراً، تم رفض طلبك. يمكنك إعادة المحاولة بمستندات صحيحة.
            </p>
            <button
              onClick={() => setStatus(null)}
              className="bg-[#FF6B00] text-black font-bold px-6 py-2 rounded-full"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#121212] rounded-2xl p-6 border border-white/5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم النشاط التجاري</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none"
                  placeholder="اسم نشاطك التجاري"
                  required
                  data-testid="business-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">شهادة البائع (سجل تجاري)</label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-[#FF6B00]/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('license-input').click()}
                >
                  {license ? (
                    <div className="flex items-center justify-center gap-2 text-green-500">
                      <Check size={24} />
                      <span>تم رفع الملف</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="mx-auto mb-2 text-white/40" />
                      <p className="text-white/50">اضغط لرفع صورة الشهادة</p>
                      <p className="text-xs text-white/30 mt-1">PNG, JPG حتى 5MB</p>
                    </>
                  )}
                </div>
                <input
                  id="license-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="license-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6B00] text-black font-bold py-3 rounded-full mt-6 hover:bg-[#E65000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              data-testid="submit-docs-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  جاري الإرسال...
                </>
              ) : (
                'إرسال للمراجعة'
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

// Seller Dashboard
const SellerDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('products');
  const [walletBalance, setWalletBalance] = useState(0);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeStatView, setActiveStatView] = useState(null);
  const [printLabelOrder, setPrintLabelOrder] = useState(null);

  useEffect(() => {
    if (user?.user_type === 'seller') {
      fetchData();
      fetchWallet();
    }
  }, [user]);

  const fetchWallet = async () => {
    try {
      const res = await axios.get(`${API}/wallet/balance`);
      setWalletBalance(res.data.balance || 0);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        axios.get(`${API}/seller/my-products`),
        axios.get(`${API}/orders`)
      ]);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (productData) => {
    setSaving(true);
    try {
      await axios.post(`${API}/products`, productData);
      toast({
        title: "تم الإضافة",
        description: "تمت إضافة المنتج بنجاح"
      });
      setShowAddProduct(false);
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('هل تريد حذف هذا المنتج؟')) return;

    try {
      await axios.delete(`${API}/products/${productId}`);
      toast({
        title: "تم الحذف",
        description: "تم حذف المنتج بنجاح"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل حذف المنتج",
        variant: "destructive"
      });
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setEditPrice(product.price.toString());
    setEditStock(product.stock.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    
    setSavingEdit(true);
    try {
      await axios.put(`${API}/products/${editingProduct.id}`, {
        price: parseFloat(editPrice),
        stock: parseInt(editStock)
      });
      
      toast({
        title: "تم التحديث",
        description: "تم تحديث المنتج بنجاح"
      });
      
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل تحديث المنتج",
        variant: "destructive"
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSellerAction = async (orderId, action) => {
    try {
      const endpoints = {
        'confirm': `/orders/${orderId}/seller/confirm`,
        'preparing': `/orders/${orderId}/seller/preparing`,
        'shipped': `/orders/${orderId}/seller/shipped`
      };
      
      await axios.post(`${API}${endpoints[action]}`);
      
      const messages = {
        'confirm': 'تم تأكيد الطلب',
        'preparing': 'تم بدء التحضير',
        'shipped': 'تم شحن الطلب'
      };
      
      toast({
        title: "تم بنجاح",
        description: messages[action]
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في تنفيذ الإجراء",
        variant: "destructive"
      });
    }
  };

  if (!user || user.user_type !== 'seller') {
    navigate('/');
    return null;
  }

  if (!user.is_approved) {
    navigate('/seller/documents');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  const totalSales = orders.reduce((sum, o) => sum + (o.status === 'paid' ? o.total : 0), 0);
  const paidOrders = orders.filter(o => o.status === 'paid').length;

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
      <div className="max-w-4xl mx-auto px-3 py-4">
        {/* Header with store name */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-base font-bold text-gray-900">{user?.store_name || user?.full_name || 'لوحة تحكم البائع'}</h1>
          <div className="flex items-center gap-2">
            {/* تصفح كعميل */}
            <Link
              to="/?view=customer"
              className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-xs hover:bg-gray-200 transition-colors"
            >
              <Home size={14} />
              <span>تصفح كعميل</span>
            </Link>
            {/* إرشادات التغليف */}
            <button
              onClick={() => navigate('/packaging-guide')}
              className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-xs hover:bg-gray-200 transition-colors"
            >
              <BookOpen size={14} />
              <span>إرشادات التغليف</span>
            </button>
            {/* إضافة منتج */}
            {activeTab === 'products' && (
              <button
                onClick={() => setShowAddProduct(true)}
                className="flex items-center gap-1 bg-[#FF6B00] text-white font-bold px-3 py-1.5 rounded-full text-xs"
                data-testid="add-product-btn"
              >
                <Plus size={14} />
                إضافة منتج
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 border border-gray-200 overflow-x-auto">
          {[
            { id: 'products', icon: Package, label: 'منتجاتي' },
            { id: 'reviews', icon: Star, label: 'التقييمات' },
            { id: 'ads', icon: Megaphone, label: 'الإعلانات' },
            { id: 'discounts', icon: Gift, label: 'الخصومات' },
            { id: 'analytics', icon: TrendingUp, label: 'التقارير' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap px-2 ${
                activeTab === tab.id 
                  ? 'bg-[#FF6B00] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'ads' && (
          <SellerAdsTab user={user} products={products} walletBalance={walletBalance} />
        )}

        {activeTab === 'discounts' && (
          <SellerDiscountsTab products={products} />
        )}

        {activeTab === 'analytics' && (
          <SellerAdAnalytics />
        )}

        {activeTab === 'reviews' && (
          <SellerReviewsTab />
        )}

        {activeTab === 'products' && (
          <>
            {/* Wallet Quick Access Card */}
            <div 
              onClick={() => navigate('/wallet')}
              className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-3 mb-4 cursor-pointer hover:shadow-lg transition-all"
              data-testid="wallet-quick-access"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Wallet size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white/80 text-[10px]">رصيد المحفظة</p>
                    <p className="text-white font-bold text-lg">{formatPrice(walletBalance)}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/wallet');
                  }}
                  className="bg-white text-green-600 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-green-50"
                  data-testid="withdraw-quick-btn"
                >
                  <DollarSign size={14} />
                  طلب سحب
                </button>
              </div>
            </div>

            {/* Stats */}
            <SellerStatsCard 
              products={products} 
              orders={orders} 
              onStatClick={setActiveStatView} 
            />

            {/* Products */}
            <section className="mb-4">
              <h2 className="text-xs font-bold mb-2 text-gray-900">منتجاتي</h2>
              <SellerProductsGrid 
                products={products} 
                onEdit={handleEditProduct} 
                onDelete={handleDeleteProduct} 
              />
            </section>

            {/* Recent Orders */}
            <section>
              <h2 className="text-xs font-bold mb-2 text-gray-900">الطلبات الأخيرة</h2>
              <SellerOrdersSection 
                orders={orders} 
                onSellerAction={handleSellerAction} 
                onPrintLabel={setPrintLabelOrder} 
              />
            </section>
          </>
        )}
      </div>

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onSave={handleAddProduct}
        saving={saving}
        toast={toast}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        product={editingProduct}
        editPrice={editPrice}
        setEditPrice={setEditPrice}
        editStock={editStock}
        setEditStock={setEditStock}
        onSave={handleSaveEdit}
        onClose={() => setEditingProduct(null)}
        saving={savingEdit}
      />

      {/* Stat Details Modal */}
      <StatDetailsModal
        activeStatView={activeStatView}
        onClose={() => setActiveStatView(null)}
        products={products}
        orders={orders}
        totalSales={totalSales}
        paidOrders={paidOrders}
      />

      {/* Print Label Modal */}
      {printLabelOrder && (
        <OrderLabelPrint
          order={printLabelOrder}
          onClose={() => setPrintLabelOrder(null)}
        />
      )}
    </div>
  );
};

export { SellerDocumentsPage, SellerDashboardPage };
