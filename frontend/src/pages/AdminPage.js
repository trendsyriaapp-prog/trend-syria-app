import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Users, Package, ShoppingBag, DollarSign, Check, X, 
  Eye, FileText, Clock, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState(null);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    if (user?.user_type === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [statsRes, sellersRes] = await Promise.all([
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/sellers/pending`)
      ]);
      setStats(statsRes.data);
      setPendingSellers(sellersRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSeller = async (sellerId) => {
    try {
      await axios.post(`${API}/admin/sellers/${sellerId}/approve`);
      toast({
        title: "تم التفعيل",
        description: "تم تفعيل حساب البائع بنجاح"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تفعيل البائع",
        variant: "destructive"
      });
    }
  };

  const handleRejectSeller = async (sellerId) => {
    if (!window.confirm('هل تريد رفض هذا البائع؟')) return;

    try {
      await axios.post(`${API}/admin/sellers/${sellerId}/reject`);
      toast({
        title: "تم الرفض",
        description: "تم رفض طلب البائع"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل رفض البائع",
        variant: "destructive"
      });
    }
  };

  if (!user || user.user_type !== 'admin') {
    navigate('/');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-10">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">لوحة تحكم المدير</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { icon: Users, label: 'المستخدمين', value: stats?.total_users || 0, color: 'bg-blue-500/20 text-blue-500' },
            { icon: Users, label: 'البائعين', value: stats?.total_sellers || 0, color: 'bg-purple-500/20 text-purple-500' },
            { icon: Package, label: 'المنتجات', value: stats?.total_products || 0, color: 'bg-green-500/20 text-green-500' },
            { icon: ShoppingBag, label: 'الطلبات', value: stats?.total_orders || 0, color: 'bg-[#FF6B00]/20 text-[#FF6B00]' },
            { icon: Clock, label: 'بائعين معلقين', value: stats?.pending_sellers || 0, color: 'bg-yellow-500/20 text-yellow-500' },
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

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
          {[
            { id: 'overview', label: 'نظرة عامة' },
            { id: 'pending', label: `البائعين المعلقين (${pendingSellers.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'bg-[#FF6B00] text-black font-bold' 
                  : 'bg-[#121212] hover:bg-white/5'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pending Sellers */}
        {activeTab === 'pending' && (
          <section>
            {pendingSellers.length === 0 ? (
              <div className="bg-[#121212] rounded-xl p-8 text-center border border-white/5">
                <Check size={48} className="text-green-500 mx-auto mb-4" />
                <p className="text-white/50">لا يوجد بائعين في انتظار الموافقة</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingSellers.map((doc) => (
                  <div key={doc.id} className="bg-[#121212] rounded-xl border border-white/5 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold">{doc.business_name}</h3>
                          <p className="text-sm text-white/50">{doc.seller?.name} - {doc.seller?.email}</p>
                          <p className="text-sm text-white/50">{doc.seller?.phone} - {doc.seller?.city}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                            className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                            data-testid={`view-doc-${doc.id}`}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleApproveSeller(doc.seller_id)}
                            className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition-colors"
                            data-testid={`approve-${doc.seller_id}`}
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleRejectSeller(doc.seller_id)}
                            className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition-colors"
                            data-testid={`reject-${doc.seller_id}`}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Document Preview */}
                    {selectedDoc?.id === doc.id && (
                      <div className="border-t border-white/5 p-4 bg-[#0A0A0A]">
                        <p className="text-sm text-white/50 mb-2">شهادة البائع:</p>
                        {doc.business_license ? (
                          <img
                            src={doc.business_license}
                            alt="شهادة البائع"
                            className="max-w-full max-h-96 rounded-lg"
                          />
                        ) : (
                          <p className="text-white/30">لا توجد صورة</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Overview */}
        {activeTab === 'overview' && (
          <section>
            <div className="bg-[#121212] rounded-xl p-6 border border-white/5">
              <h2 className="font-bold mb-4">ملخص النظام</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0A0A0A] rounded-lg">
                  <h3 className="text-sm text-white/50 mb-2">إجمالي المستخدمين</h3>
                  <p className="text-3xl font-bold">{stats?.total_users || 0}</p>
                  <p className="text-sm text-white/50 mt-1">
                    منهم {stats?.total_sellers || 0} بائع
                  </p>
                </div>
                <div className="p-4 bg-[#0A0A0A] rounded-lg">
                  <h3 className="text-sm text-white/50 mb-2">المنتجات النشطة</h3>
                  <p className="text-3xl font-bold">{stats?.total_products || 0}</p>
                </div>
                <div className="p-4 bg-[#0A0A0A] rounded-lg">
                  <h3 className="text-sm text-white/50 mb-2">إجمالي الطلبات</h3>
                  <p className="text-3xl font-bold">{stats?.total_orders || 0}</p>
                </div>
                <div className="p-4 bg-[#0A0A0A] rounded-lg">
                  <h3 className="text-sm text-white/50 mb-2">بائعين بانتظار الموافقة</h3>
                  <p className="text-3xl font-bold text-yellow-500">{stats?.pending_sellers || 0}</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
