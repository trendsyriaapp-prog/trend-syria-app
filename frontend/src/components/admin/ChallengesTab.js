// /app/frontend/src/components/admin/ChallengesTab.js
// تبويب إدارة التحديات في لوحة المدير

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import { 
  Target, Plus, Edit, Trash2, Gift, Users, 
  Trophy, Calendar, CheckCircle, X, RefreshCw
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const ChallengesTab = () => {
  const { toast } = useToast();
  const [challenges, setChallenges] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, title: '' });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const res = await axios.get(`${API}/api/challenges/admin/all`);
      setChallenges(res.data.challenges);
      setStats(res.data.stats);
    } catch (error) {
      logger.error('Error fetching challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/api/challenges/admin/${deleteModal.id}`);
      toast({ title: "تم بنجاح", description: "تم حذف التحدي" });
      setDeleteModal({ isOpen: false, id: null, title: '' });
      fetchChallenges();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || 'حدث خطأ', variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (challenge) => {
    try {
      await axios.put(`${API}/api/challenges/admin/${challenge.id}`, {
        is_active: !challenge.is_active
      });
      toast({ title: "تم بنجاح", description: challenge.is_active ? "تم إيقاف التحدي" : "تم تفعيل التحدي" });
      fetchChallenges();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || 'حدث خطأ', variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard 
          icon={Target} 
          label="إجمالي التحديات" 
          value={stats.total_challenges || 0}
          color="purple"
        />
        <StatCard 
          icon={CheckCircle} 
          label="نشط" 
          value={stats.active_challenges || 0}
          color="green"
        />
        <StatCard 
          icon={Trophy} 
          label="تم إكمالها" 
          value={stats.total_completions || 0}
          color="amber"
        />
        <StatCard 
          icon={Gift} 
          label="المكافآت المدفوعة" 
          value={formatPrice(stats.total_rewards_paid || 0)}
          color="blue"
        />
      </div>

      {/* Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold">قائمة التحديات</h2>
        <button
          onClick={() => { setEditingChallenge(null); setShowForm(true); }}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          data-testid="add-challenge-btn"
        >
          <Plus size={18} />
          إضافة تحدي
        </button>
      </div>

      {/* Challenges List */}
      <div className="space-y-3">
        {challenges.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <Target size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد تحديات بعد</p>
          </div>
        ) : (
          challenges.map((challenge) => (
            <ChallengeRow 
              key={challenge.id}
              challenge={challenge}
              onEdit={() => { setEditingChallenge(challenge); setShowForm(true); }}
              onDelete={() => setDeleteModal({ isOpen: true, id: challenge.id, title: challenge.title })}
              onToggle={() => handleToggleActive(challenge)}
            />
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <ChallengeForm
          challenge={editingChallenge}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); fetchChallenges(); }}
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
                <h3 className="font-bold">حذف التحدي</h3>
                <p className="text-xs text-gray-500">{deleteModal.title}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              هل أنت متأكد من حذف هذا التحدي؟ لا يمكن التراجع عن هذا الإجراء.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteModal({ isOpen: false, id: null, title: '' })}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colors = {
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600'
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon size={20} />
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
};

const ChallengeRow = ({ challenge, onEdit, onDelete, onToggle }) => {
  const getTypeLabel = (type) => {
    switch (type) {
      case 'weekly': return { label: 'أسبوعي', color: 'bg-blue-100 text-blue-700' };
      case 'monthly': return { label: 'شهري', color: 'bg-purple-100 text-purple-700' };
      default: return { label: 'خاص', color: 'bg-amber-100 text-amber-700' };
    }
  };

  const typeInfo = getTypeLabel(challenge.challenge_type);

  return (
    <div className={`bg-white rounded-lg border p-4 ${challenge.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            {challenge.is_active ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">نشط</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">غير نشط</span>
            )}
          </div>
          <h3 className="font-bold text-gray-900">{challenge.title}</h3>
          <p className="text-sm text-gray-500">{challenge.description}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Target size={12} />
              {challenge.target_orders} طلب
            </span>
            <span className="flex items-center gap-1">
              <Gift size={12} />
              {formatPrice(challenge.reward_amount)}
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {challenge.participants_count || 0} مشارك
            </span>
            <span className="flex items-center gap-1">
              <Trophy size={12} />
              {challenge.completions_count || 0} أكمل
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`p-2 rounded-lg transition-colors ${
              challenge.is_active 
                ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title={challenge.is_active ? 'تعطيل' : 'تفعيل'}
          >
            <CheckCircle size={18} />
          </button>
          <button
            onClick={onEdit}
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ChallengeForm = ({ challenge, onClose, onSave }) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: challenge?.title || '',
    description: challenge?.description || '',
    challenge_type: challenge?.challenge_type || 'weekly',
    target_orders: challenge?.target_orders || 20,
    reward_amount: challenge?.reward_amount || 10000,
    is_active: challenge?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (challenge) {
        await axios.put(`${API}/api/challenges/admin/${challenge.id}`, form);
      } else {
        await axios.post(`${API}/api/challenges/admin/create`, form);
      }
      onSave();
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-sm">
            {challenge ? 'تعديل التحدي' : 'إضافة تحدي جديد'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="مثال: تحدي الأسبوع"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full p-2 border rounded-lg"
              placeholder="مثال: أكمل 20 طلب هذا الأسبوع"
              rows={2}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
              <select
                value={form.challenge_type}
                onChange={(e) => setForm({ ...form, challenge_type: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="weekly">أسبوعي</option>
                <option value="monthly">شهري</option>
                <option value="special">خاص</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">عدد الطلبات المطلوبة</label>
              <input
                type="number"
                value={form.target_orders}
                onChange={(e) => setForm({ ...form, target_orders: parseInt(e.target.value) })}
                className="w-full p-2 border rounded-lg"
                min={1}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المكافأة (ل.س)</label>
            <input
              type="number"
              value={form.reward_amount}
              onChange={(e) => setForm({ ...form, reward_amount: parseInt(e.target.value) })}
              className="w-full p-2 border rounded-lg"
              min={1000}
              step={1000}
              required
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">نشط</label>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChallengesTab;
