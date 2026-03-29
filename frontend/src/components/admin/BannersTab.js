// /app/frontend/src/components/admin/BannersTab.js
// تبويب إدارة البانرات - الرئيسية والطعام

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Image, Plus, Edit, Trash2, Eye, EyeOff, Save, X,
  Home, UtensilsCrossed, Palette, Link as LinkIcon, MoveUp, MoveDown
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BannersTab = ({ token }) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('homepage'); // homepage, food
  const [homeBanners, setHomeBanners] = useState([]);
  const [foodBanners, setFoodBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, bannerId: null, type: null, title: '' });

  useEffect(() => {
    fetchBanners();
  }, [token]);

  const fetchBanners = async () => {
    try {
      const [homeRes, foodRes] = await Promise.all([
        axios.get(`${API}/api/admin/homepage-banners`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/api/admin/food-banners`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setHomeBanners(homeRes.data || []);
      setFoodBanners(foodRes.data || []);
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBanner = async (banner, type) => {
    try {
      const endpoint = type === 'homepage' 
        ? `/admin/homepage-banners/${banner.id}`
        : `/admin/food-banners/${banner.id}`;
      
      await axios.put(`${API}${endpoint}`, 
        { is_active: !banner.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: banner.is_active ? "تم تعطيل البانر" : "تم تفعيل البانر" });
      fetchBanners();
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handleDeleteBanner = async () => {
    if (!deleteModal.bannerId) return;
    
    try {
      const endpoint = deleteModal.type === 'homepage' 
        ? `/admin/homepage-banners/${deleteModal.bannerId}`
        : `/admin/food-banners/${deleteModal.bannerId}`;
      
      await axios.delete(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحذف" });
      setDeleteModal({ isOpen: false, bannerId: null, type: null, title: '' });
      fetchBanners();
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const banners = activeSection === 'homepage' ? homeBanners : foodBanners;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="banners-tab">
      {/* Section Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveSection('homepage')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
            activeSection === 'homepage'
              ? 'bg-white text-blue-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Home size={18} />
          الصفحة الرئيسية ({homeBanners.length})
        </button>
        <button
          onClick={() => setActiveSection('food')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
            activeSection === 'food'
              ? 'bg-white text-green-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UtensilsCrossed size={18} />
          قسم الطعام ({foodBanners.length})
        </button>
      </div>

      {/* Add Banner Button */}
      <button
        onClick={() => {
          setEditingBanner(null);
          setShowModal(true);
        }}
        className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 ${
          activeSection === 'homepage'
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
            : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
        }`}
      >
        <Plus size={20} />
        إضافة بانر جديد
      </button>

      {/* Banners List */}
      {banners.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-100">
          <Image size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-2">لا توجد بانرات</p>
          <p className="text-sm text-gray-400">أضف بانرات لجذب انتباه العملاء</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((banner, index) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-lg overflow-hidden border-2 ${
                banner.is_active ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              {/* Banner Preview */}
              <div 
                className="h-24 flex items-center justify-center p-4"
                style={{ backgroundColor: banner.background_color || '#FF6B00' }}
              >
                {banner.image ? (
                  <img 
                    src={banner.image} 
                    alt={banner.title}
                    className="max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-white">
                    <h4 className="font-bold text-sm">{banner.title}</h4>
                    {banner.description && (
                      <p className="text-sm opacity-80">{banner.description}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Banner Info */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{banner.title || 'بدون عنوان'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      banner.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {banner.is_active ? 'نشط' : 'معطل'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">الترتيب: {banner.order || index + 1}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <LinkIcon size={12} />
                    {banner.link || '/'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Palette size={12} />
                    {banner.background_color}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingBanner({ ...banner, type: activeSection });
                      setShowModal(true);
                    }}
                    className="flex-1 py-2 rounded-lg bg-blue-100 text-blue-600 font-medium text-sm hover:bg-blue-200 flex items-center justify-center gap-1"
                  >
                    <Edit size={16} />
                    تعديل
                  </button>
                  <button
                    onClick={() => handleToggleBanner(banner, activeSection)}
                    className={`p-2 rounded-lg ${
                      banner.is_active
                        ? 'bg-gray-100 text-gray-600'
                        : 'bg-green-100 text-green-600'
                    }`}
                    title={banner.is_active ? 'تعطيل' : 'تفعيل'}
                  >
                    {banner.is_active ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button
                    onClick={() => setDeleteModal({ isOpen: true, bannerId: banner.id, type: activeSection, title: banner.title })}
                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                    title="حذف"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Banner Modal */}
      {showModal && (
        <BannerModal
          banner={editingBanner}
          type={editingBanner?.type || activeSection}
          token={token}
          onClose={() => {
            setShowModal(false);
            setEditingBanner(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingBanner(null);
            fetchBanners();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold">حذف البانر</h3>
                <p className="text-xs text-gray-500">{deleteModal.title}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              هل تريد حذف هذا البانر؟ لا يمكن التراجع عن هذا الإجراء.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteModal({ isOpen: false, bannerId: null, type: null, title: '' })}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteBanner}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Banner Modal
const BannerModal = ({ banner, type, token, onClose, onSave }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: banner?.title || '',
    description: banner?.description || '',
    image: banner?.image || '',
    link: banner?.link || (type === 'homepage' ? '/' : '/food'),
    background_color: banner?.background_color || (type === 'homepage' ? '#FF6B00' : '#22C55E'),
    order: banner?.order || 0,
    is_active: banner?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  const presetColors = [
    { name: 'برتقالي', value: '#FF6B00' },
    { name: 'أخضر', value: '#22C55E' },
    { name: 'أزرق', value: '#3B82F6' },
    { name: 'بنفسجي', value: '#8B5CF6' },
    { name: 'وردي', value: '#EC4899' },
    { name: 'أحمر', value: '#EF4444' },
    { name: 'أصفر', value: '#F59E0B' },
    { name: 'رمادي', value: '#6B7280' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setSaving(true);
    try {
      const endpoint = type === 'homepage' 
        ? '/admin/homepage-banners'
        : '/admin/food-banners';

      if (banner?.id) {
        await axios.put(`${API}${endpoint}/${banner.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "تم التحديث", description: "تم تحديث البانر" });
      } else {
        await axios.post(`${API}${endpoint}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "تم الإنشاء", description: "تم إنشاء البانر" });
      }
      onSave();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشلت العملية", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className={`sticky top-0 px-6 py-4 flex items-center justify-between rounded-t-2xl ${
          type === 'homepage' 
            ? 'bg-gradient-to-r from-blue-500 to-indigo-500' 
            : 'bg-gradient-to-r from-green-500 to-emerald-500'
        } text-white`}>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Image size={20} />
            {banner?.id ? 'تعديل البانر' : 'بانر جديد'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          {/* Preview */}
          <div 
            className="h-24 rounded-lg flex items-center justify-center p-4 mb-4"
            style={{ backgroundColor: formData.background_color }}
          >
            {formData.image ? (
              <img 
                src={formData.image} 
                alt="Preview"
                className="max-h-full object-contain"
              />
            ) : (
              <div className="text-center text-white">
                <h4 className="font-bold">{formData.title || 'عنوان البانر'}</h4>
                {formData.description && (
                  <p className="text-sm opacity-80">{formData.description}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="عنوان البانر"
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="وصف قصير (اختياري)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رابط الصورة (اختياري)</label>
            <input
              type="url"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">اترك فارغاً لاستخدام العنوان والوصف</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الرابط عند الضغط</label>
            <input
              type="text"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="/products"
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">لون الخلفية</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, background_color: color.value })}
                  className={`w-10 h-10 rounded-lg border-2 ${
                    formData.background_color === color.value 
                      ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-400' 
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
            <input
              type="color"
              value={formData.background_color}
              onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
              className="w-full h-10 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الترتيب</label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
              min="0"
              className="w-full border border-gray-200 rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              تفعيل البانر فوراً
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full py-3 rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2 ${
              type === 'homepage' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            }`}
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} />
                {banner?.id ? 'تحديث البانر' : 'إنشاء البانر'}
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default BannersTab;
