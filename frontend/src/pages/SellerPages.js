import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Upload, FileText, Check, Clock, X, Plus, 
  Package, DollarSign, ShoppingBag, Loader2,
  Megaphone, Wallet, TrendingUp, Gift, BookOpen, Star, MessageSquare, Send, Home,
  Store, CreditCard, Edit2, Trash2, Save, Bell, Volume2, VolumeX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { formatPrice } from '../utils/imageHelpers';
import NotificationsDropdown from '../components/NotificationsDropdown';
import useNotificationSound from '../hooks/useNotificationSound';

// Imported Components
import SellerAdsTab from '../components/seller/SellerAdsTab';
import SellerAdAnalytics from '../components/seller/SellerAdAnalytics';
import SellerDiscountsTab from '../components/seller/SellerDiscountsTab';
import SellerReviewsTab from '../components/seller/SellerReviewsTab';
import ImageBackgroundSelector from '../components/seller/ImageBackgroundSelector';
import OrderLabelPrint from '../components/seller/OrderLabelPrint';
import StoreSettingsTab from '../components/seller/StoreSettingsTab';
import AddProductModal from '../components/seller/AddProductModal';
import EditProductModal from '../components/seller/EditProductModal';
import SellerStatsCard from '../components/seller/SellerStatsCard';
import SellerProductsGrid from '../components/seller/SellerProductsGrid';
import SellerOrdersSection from '../components/seller/SellerOrdersSection';
import StatDetailsModal from '../components/seller/StatDetailsModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// مكون عرض أطباق الطعام
const FoodItemsGrid = ({ items, onEdit, onDelete, onToggleAvailability }) => {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
        <Package className="mx-auto mb-2 text-gray-300" size={40} />
        <p className="text-gray-500 text-sm">لا توجد أطباق بعد</p>
        <p className="text-gray-400 text-xs">أضف أول طبق لقائمة الطعام</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map(item => (
        <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="relative">
            <img 
              src={item.image || 'https://via.placeholder.com/150?text=طبق'} 
              alt={item.name} 
              className={`w-full h-24 object-cover ${!item.is_available ? 'opacity-50 grayscale' : ''}`}
            />
            {!item.is_available && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white text-xs font-bold bg-red-500 px-2 py-1 rounded">غير متاح</span>
              </div>
            )}
          </div>
          <div className="p-2">
            <h3 className="font-bold text-xs text-gray-900 truncate">{item.name}</h3>
            <p className="text-[10px] text-gray-500 truncate">{item.description}</p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[#FF6B00] font-bold text-xs">{item.price?.toLocaleString()} ل.س</span>
              <span className="text-gray-400 text-[9px]">{item.preparation_time} دقيقة</span>
            </div>
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => onToggleAvailability(item.id, item.is_available)}
                className={`flex-1 py-1 rounded text-[9px] font-bold ${
                  item.is_available 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                {item.is_available ? 'إيقاف' : 'تفعيل'}
              </button>
              <button
                onClick={() => onEdit(item)}
                className="flex-1 bg-gray-100 text-gray-600 py-1 rounded text-[9px] font-bold hover:bg-gray-200"
              >
                تعديل
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="px-2 bg-red-50 text-red-500 py-1 rounded text-[9px] hover:bg-red-100"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// مكون عرض طلبات الطعام
const FoodOrdersSection = ({ orders, onStatusChange }) => {
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-xl border border-gray-200">
        <ShoppingBag className="mx-auto mb-2 text-gray-300" size={40} />
        <p className="text-gray-500 text-sm">لا توجد طلبات</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'accepted': 'bg-blue-100 text-blue-700',
      'preparing': 'bg-orange-100 text-orange-700',
      'ready': 'bg-green-100 text-green-700',
      'out_for_delivery': 'bg-purple-100 text-purple-700',
      'delivered': 'bg-emerald-100 text-emerald-700',
      'cancelled': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': 'جديد',
      'accepted': 'مقبول',
      'preparing': 'قيد التحضير',
      'ready': 'جاهز',
      'out_for_delivery': 'في الطريق',
      'delivered': 'تم التسليم',
      'cancelled': 'ملغي'
    };
    return texts[status] || status;
  };

  return (
    <div className="space-y-2">
      {orders.slice(0, 10).map(order => (
        <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-gray-900">#{order.id?.slice(-6)}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            <span className="text-[#FF6B00] font-bold text-xs">{order.total?.toLocaleString()} ل.س</span>
          </div>
          
          {/* تفاصيل الطلب */}
          <div className="text-[10px] text-gray-600 mb-2">
            <p>العميل: {order.customer_name || 'غير معروف'}</p>
            <p>العنوان: {order.delivery_address || 'غير محدد'}</p>
          </div>

          {/* أزرار الإجراءات حسب الحالة */}
          {order.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => onStatusChange(order.id, 'accepted')}
                className="flex-1 bg-green-500 text-white py-1.5 rounded text-[10px] font-bold hover:bg-green-600"
              >
                قبول الطلب
              </button>
              <button
                onClick={() => onStatusChange(order.id, 'rejected')}
                className="flex-1 bg-red-100 text-red-600 py-1.5 rounded text-[10px] font-bold hover:bg-red-200"
              >
                رفض
              </button>
            </div>
          )}
          
          {order.status === 'accepted' && (
            <button
              onClick={() => onStatusChange(order.id, 'preparing')}
              className="w-full bg-orange-500 text-white py-1.5 rounded text-[10px] font-bold hover:bg-orange-600"
            >
              بدء التحضير
            </button>
          )}
          
          {order.status === 'preparing' && (
            <button
              onClick={() => onStatusChange(order.id, 'ready')}
              className="w-full bg-green-500 text-white py-1.5 rounded text-[10px] font-bold hover:bg-green-600"
            >
              الطلب جاهز
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();

  // تحديد نوع البائع (منتجات أو طعام)
  const isFoodSeller = user?.user_type === 'food_seller';
  
  const [products, setProducts] = useState([]);
  const [foodItems, setFoodItems] = useState([]); // للأطباق
  const [orders, setOrders] = useState([]);
  const [foodOrders, setFoodOrders] = useState([]); // طلبات الطعام
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  // قراءة التبويب من URL أو استخدام 'products' كافتراضي
  const defaultTab = isFoodSeller ? 'menu' : 'products';
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || defaultTab);
  const [walletBalance, setWalletBalance] = useState(0);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeStatView, setActiveStatView] = useState(null);
  const [printLabelOrder, setPrintLabelOrder] = useState(null);

  // صوت التنبيه للطلبات الجديدة
  const { playSound } = useNotificationSound();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousPendingCountRef = useRef(0);

  // تحديث URL عند تغيير التبويب
  useEffect(() => {
    const defaultTabForUser = isFoodSeller ? 'menu' : 'products';
    if (activeTab === defaultTabForUser) {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', activeTab);
    }
    setSearchParams(searchParams, { replace: true });
  }, [activeTab, isFoodSeller]);

  // قراءة التبويب من URL عند التحميل
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // التحقق من الطلبات الجديدة وتشغيل الصوت
  useEffect(() => {
    if (isFoodSeller && soundEnabled) {
      const pendingCount = foodOrders.filter(o => o.status === 'pending').length;
      if (pendingCount > previousPendingCountRef.current && previousPendingCountRef.current !== 0) {
        // هناك طلب جديد!
        playSound();
        toast({
          title: "🔔 طلب جديد!",
          description: `لديك ${pendingCount} طلب في الانتظار`,
        });
      }
      previousPendingCountRef.current = pendingCount;
    }
  }, [foodOrders, isFoodSeller, soundEnabled, playSound, toast]);

  // تحديث الطلبات كل 30 ثانية لبائع الطعام
  useEffect(() => {
    if (isFoodSeller && user?.is_approved) {
      const interval = setInterval(() => {
        fetchData();
      }, 30000); // كل 30 ثانية
      return () => clearInterval(interval);
    }
  }, [isFoodSeller, user?.is_approved]);

  useEffect(() => {
    if (user?.user_type === 'seller' || user?.user_type === 'food_seller') {
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
      if (isFoodSeller) {
        // بائع طعام - جلب الأطباق وطلبات الطعام
        const [menuRes, foodOrdersRes] = await Promise.all([
          axios.get(`${API}/food/my-items`),
          axios.get(`${API}/food/orders/seller`)
        ]);
        setFoodItems(menuRes.data || []);
        setFoodOrders(foodOrdersRes.data || []);
      } else {
        // بائع منتجات - جلب المنتجات والطلبات
        const [productsRes, ordersRes] = await Promise.all([
          axios.get(`${API}/seller/my-products`),
          axios.get(`${API}/orders`)
        ]);
        setProducts(productsRes.data);
        setOrders(ordersRes.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (productData) => {
    setSaving(true);
    try {
      if (isFoodSeller) {
        // إضافة طبق جديد
        await axios.post(`${API}/food/items`, productData);
        toast({
          title: "تم الإضافة",
          description: "تمت إضافة الطبق بنجاح"
        });
      } else {
        // إضافة منتج جديد
        await axios.post(`${API}/products`, productData);
        toast({
          title: "تم الإضافة",
          description: "تمت إضافة المنتج بنجاح"
        });
      }
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
    const itemName = isFoodSeller ? 'الطبق' : 'المنتج';
    if (!window.confirm(`هل تريد حذف هذا ${itemName}؟`)) return;

    try {
      if (isFoodSeller) {
        await axios.delete(`${API}/food/items/${productId}`);
      } else {
        await axios.delete(`${API}/products/${productId}`);
      }
      toast({
        title: "تم الحذف",
        description: `تم حذف ${itemName} بنجاح`
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: `فشل حذف ${itemName}`,
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

  // دوال خاصة ببائع الطعام
  const handleToggleFoodAvailability = async (itemId, currentStatus) => {
    try {
      await axios.put(`${API}/food/items/${itemId}/availability`, {
        is_available: !currentStatus
      });
      toast({
        title: currentStatus ? "تم إيقاف الطبق" : "تم تفعيل الطبق",
        description: currentStatus ? "الطبق غير متاح الآن" : "الطبق متاح الآن للطلب"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تغيير حالة الطبق",
        variant: "destructive"
      });
    }
  };

  const handleFoodOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/food-orders/${orderId}/status`, { status: newStatus });
      
      const statusMessages = {
        'accepted': 'تم قبول الطلب',
        'preparing': 'جاري تحضير الطلب',
        'ready': 'الطلب جاهز للاستلام',
        'rejected': 'تم رفض الطلب'
      };
      
      toast({
        title: "تم بنجاح",
        description: statusMessages[newStatus] || 'تم تحديث حالة الطلب'
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في تحديث الطلب",
        variant: "destructive"
      });
    }
  };

  if (!user || (user.user_type !== 'seller' && user.user_type !== 'food_seller')) {
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

  // حساب الإحصائيات حسب نوع البائع
  const displayOrders = isFoodSeller ? foodOrders : orders;
  const displayItems = isFoodSeller ? foodItems : products;
  const totalSales = displayOrders.reduce((sum, o) => sum + (o.status === 'paid' || o.status === 'delivered' ? (o.total || 0) : 0), 0);
  const paidOrders = displayOrders.filter(o => o.status === 'paid' || o.status === 'delivered').length;

  // التسميات حسب نوع البائع
  const labels = isFoodSeller ? {
    dashboardTitle: user?.store_name || 'لوحة تحكم المطعم',
    addButton: 'إضافة طبق',
    itemsTab: 'قائمة الطعام',
    itemsTabId: 'menu',
    guideButton: 'إعدادات المطعم',
    guideIcon: Store
  } : {
    dashboardTitle: user?.store_name || user?.full_name || 'لوحة تحكم البائع',
    addButton: 'إضافة منتج',
    itemsTab: 'منتجاتي',
    itemsTabId: 'products',
    guideButton: 'إرشادات التغليف',
    guideIcon: BookOpen
  };

  return (
    <div className="min-h-screen pb-24 md:pb-10 bg-gray-50">
      <div className="max-w-4xl mx-auto px-3 py-3 relative z-0">
        {/* Header with store name and notifications */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-gray-900">{labels.dashboardTitle}</h1>
              {isFoodSeller && (
                <span className="text-[8px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">
                  مطعم
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* زر تفعيل/إيقاف صوت التنبيه */}
              {isFoodSeller && (
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-full transition-colors ${
                    soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                  }`}
                  title={soundEnabled ? 'الصوت مفعل' : 'الصوت متوقف'}
                  data-testid="sound-toggle-btn"
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              )}
              <NotificationsDropdown />
            </div>
          </div>
          {/* أزرار الإجراءات - شريط ممتلئ */}
          <div className="flex gap-1.5">
            <Link
              to="/?view=customer"
              className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-[10px] hover:bg-gray-200 transition-colors"
            >
              <Home size={12} />
              <span>تصفح كعميل</span>
            </Link>
            {!isFoodSeller && (
              <button
                onClick={() => navigate('/packaging-guide')}
                className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-[10px] hover:bg-gray-200 transition-colors"
              >
                <BookOpen size={12} />
                <span>إرشادات التغليف</span>
              </button>
            )}
            <button
              onClick={() => setShowAddProduct(true)}
              className="flex-1 flex items-center justify-center gap-1 bg-[#FF6B00] text-white font-bold py-2 rounded-lg text-[10px]"
              data-testid="add-product-btn"
            >
              <Plus size={12} />
              <span>{labels.addButton}</span>
            </button>
          </div>
        </div>

        {/* Tabs - تصغير للجوال */}
        <div className="flex gap-0.5 mb-3 bg-white rounded-lg p-0.5 border border-gray-200 overflow-x-auto no-scrollbar">
          {(isFoodSeller ? [
            { id: 'menu', icon: Package, label: 'قائمة الطعام' },
            { id: 'reviews', icon: Star, label: 'التقييمات' },
            { id: 'analytics', icon: TrendingUp, label: 'التقارير' },
            { id: 'store', icon: Store, label: 'إعدادات المطعم' },
          ] : [
            { id: 'products', icon: Package, label: 'منتجاتي' },
            { id: 'reviews', icon: Star, label: 'التقييمات' },
            { id: 'ads', icon: Megaphone, label: 'الإعلانات' },
            { id: 'discounts', icon: Gift, label: 'الخصومات' },
            { id: 'analytics', icon: TrendingUp, label: 'التقارير' },
            { id: 'store', icon: Store, label: 'المتجر' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-0.5 py-1.5 rounded-md text-[9px] font-bold transition-all whitespace-nowrap px-1.5 min-w-fit ${
                activeTab === tab.id 
                  ? 'bg-[#FF6B00] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon size={10} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'ads' && !isFoodSeller && (
          <SellerAdsTab user={user} products={products} walletBalance={walletBalance} />
        )}

        {activeTab === 'discounts' && !isFoodSeller && (
          <SellerDiscountsTab products={products} />
        )}

        {activeTab === 'analytics' && (
          <SellerAdAnalytics />
        )}

        {activeTab === 'store' && (
          <StoreSettingsTab isFoodSeller={isFoodSeller} />
        )}

        {activeTab === 'reviews' && (
          <SellerReviewsTab />
        )}

        {/* محتوى تبويب المنتجات/قائمة الطعام */}
        {(activeTab === 'products' || activeTab === 'menu') && (
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
              products={displayItems} 
              orders={displayOrders} 
              onStatClick={setActiveStatView}
              isFoodSeller={isFoodSeller}
            />

            {/* Products/Menu Items */}
            <section className="mb-4">
              <h2 className="text-xs font-bold mb-2 text-gray-900">
                {isFoodSeller ? 'قائمة الطعام' : 'منتجاتي'}
              </h2>
              {isFoodSeller ? (
                <FoodItemsGrid 
                  items={foodItems} 
                  onEdit={handleEditProduct} 
                  onDelete={handleDeleteProduct}
                  onToggleAvailability={handleToggleFoodAvailability}
                />
              ) : (
                <SellerProductsGrid 
                  products={products} 
                  onEdit={handleEditProduct} 
                  onDelete={handleDeleteProduct} 
                />
              )}
            </section>

            {/* Recent Orders */}
            <section>
              <h2 className="text-xs font-bold mb-2 text-gray-900">
                {isFoodSeller ? 'طلبات الطعام' : 'الطلبات الأخيرة'}
              </h2>
              {isFoodSeller ? (
                <FoodOrdersSection 
                  orders={foodOrders}
                  onStatusChange={handleFoodOrderStatus}
                />
              ) : (
                <SellerOrdersSection 
                  orders={orders} 
                  onSellerAction={handleSellerAction} 
                  onPrintLabel={setPrintLabelOrder} 
                />
              )}
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
        isFoodSeller={isFoodSeller}
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
