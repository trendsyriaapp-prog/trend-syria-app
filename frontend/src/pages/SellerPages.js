import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Upload, FileText, Check, Clock, X, Plus, 
  Package, DollarSign, ShoppingBag, Edit, Trash2, Loader2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const CATEGORIES = [
  { id: 'electronics', name: 'إلكترونيات' },
  { id: 'fashion', name: 'أزياء' },
  { id: 'home', name: 'المنزل' },
  { id: 'beauty', name: 'تجميل' },
  { id: 'sports', name: 'رياضة' },
  { id: 'books', name: 'كتب' },
  { id: 'toys', name: 'ألعاب' },
  { id: 'food', name: 'طعام' },
  { id: 'health', name: 'صحة' },
  { id: 'cars', name: 'سيارات' },
];

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
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: 'electronics',
    stock: '',
    images: [],
    length_cm: '',
    width_cm: '',
    height_cm: ''
  });
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user?.user_type === 'seller') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        axios.get(`${API}/seller/products`),
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

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prev => ({
          ...prev,
          images: [...prev.images, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (newProduct.images.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إضافة صورة واحدة على الأقل",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/products`, {
        ...newProduct,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock)
      });

      toast({
        title: "تم الإضافة",
        description: "تمت إضافة المنتج بنجاح"
      });

      setShowAddProduct(false);
      setNewProduct({
        name: '',
        description: '',
        price: '',
        category: 'electronics',
        stock: '',
        images: []
      });
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

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status?status=${status}`);
      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة الطلب"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث الحالة",
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

  // Calculate stats
  const totalSales = orders.reduce((sum, o) => sum + (o.status === 'paid' ? o.total : 0), 0);
  const paidOrders = orders.filter(o => o.status === 'paid').length;

  return (
    <div className="min-h-screen pb-20 md:pb-10">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">لوحة تحكم البائع</h1>
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-2 bg-[#FF6B00] text-black font-bold px-4 py-2 rounded-full hover:bg-[#E65000] transition-colors"
            data-testid="add-product-btn"
          >
            <Plus size={18} />
            إضافة منتج
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Package, label: 'المنتجات', value: products.length, color: 'bg-blue-500/20 text-blue-500' },
            { icon: ShoppingBag, label: 'الطلبات المدفوعة', value: paidOrders, color: 'bg-green-500/20 text-green-500' },
            { icon: DollarSign, label: 'إجمالي المبيعات', value: formatPrice(totalSales), color: 'bg-[#FF6B00]/20 text-[#FF6B00]' },
            { icon: Clock, label: 'طلبات معلقة', value: orders.filter(o => o.delivery_status === 'pending').length, color: 'bg-yellow-500/20 text-yellow-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-[#121212] rounded-xl p-4 border border-white/5">
              <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center mb-2`}>
                <stat.icon size={20} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-white/50">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Products */}
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">منتجاتي</h2>
          {products.length === 0 ? (
            <div className="bg-[#121212] rounded-xl p-8 text-center border border-white/5">
              <Package size={48} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/50">لم تضف أي منتجات بعد</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {products.map((product) => (
                <div key={product.id} className="bg-[#121212] rounded-xl border border-white/5 overflow-hidden">
                  <img
                    src={product.images?.[0] || 'https://via.placeholder.com/200'}
                    alt={product.name}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-3">
                    <h3 className="font-bold text-sm truncate">{product.name}</h3>
                    <p className="text-[#FF6B00] font-bold text-sm">{formatPrice(product.price)}</p>
                    <p className="text-xs text-white/50">المخزون: {product.stock}</p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="flex-1 p-1.5 text-red-500 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                        data-testid={`delete-product-${product.id}`}
                      >
                        <Trash2 size={16} className="mx-auto" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Orders */}
        <section>
          <h2 className="text-xl font-bold mb-4">الطلبات الأخيرة</h2>
          {orders.length === 0 ? (
            <div className="bg-[#121212] rounded-xl p-8 text-center border border-white/5">
              <ShoppingBag size={48} className="text-white/20 mx-auto mb-4" />
              <p className="text-white/50">لا توجد طلبات</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 10).map((order) => (
                <div key={order.id} className="bg-[#121212] rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">#{order.id.slice(0, 8).toUpperCase()}</span>
                    <span className="text-[#FF6B00] font-bold">{formatPrice(order.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/50">{order.user_name} - {order.city}</span>
                    <select
                      value={order.delivery_status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="bg-[#0A0A0A] border border-white/10 rounded-lg px-2 py-1 text-sm"
                      data-testid={`order-status-${order.id}`}
                    >
                      <option value="pending">في الانتظار</option>
                      <option value="processing">قيد التجهيز</option>
                      <option value="shipped">تم الشحن</option>
                      <option value="delivered">تم التوصيل</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#121212] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold mb-4">إضافة منتج جديد</h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم المنتج</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white focus:border-[#FF6B00] focus:outline-none"
                  required
                  data-testid="product-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الوصف</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white focus:border-[#FF6B00] focus:outline-none"
                  rows={3}
                  required
                  data-testid="product-desc-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">السعر (ل.س)</label>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white focus:border-[#FF6B00] focus:outline-none"
                    required
                    data-testid="product-price-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">الكمية</label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white focus:border-[#FF6B00] focus:outline-none"
                    required
                    data-testid="product-stock-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الصنف</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white focus:border-[#FF6B00] focus:outline-none"
                  data-testid="product-category-select"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">الصور</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {newProduct.images.map((img, i) => (
                    <div key={i} className="relative w-20 h-20">
                      <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => setNewProduct({
                          ...newProduct,
                          images: newProduct.images.filter((_, idx) => idx !== i)
                        })}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => document.getElementById('product-images').click()}
                    className="w-20 h-20 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center hover:border-[#FF6B00]/50"
                  >
                    <Plus size={24} className="text-white/40" />
                  </button>
                </div>
                <input
                  id="product-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddProduct(false)}
                  className="flex-1 py-3 border border-white/10 rounded-full hover:bg-white/5 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#FF6B00] text-black font-bold py-3 rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  data-testid="save-product-btn"
                >
                  {saving ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      جاري الحفظ...
                    </>
                  ) : (
                    'حفظ المنتج'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export { SellerDocumentsPage, SellerDashboardPage };
