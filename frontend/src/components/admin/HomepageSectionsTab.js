// /app/frontend/src/components/admin/HomepageSectionsTab.js
// إعدادات أقسام الصفحة الرئيسية

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import { 
  Star, Zap, Truck, TrendingUp, Sparkles, 
  ToggleLeft, ToggleRight, Save, Loader2, RefreshCw
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const HomepageSectionsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState({
    sponsored_enabled: true,
    flash_sale_enabled: true,
    free_shipping_enabled: true,
    best_sellers_enabled: true,
    new_arrivals_enabled: true
  });

  const sectionsList = [
    { 
      key: 'sponsored_enabled', 
      name: 'إعلانات مميزة', 
      description: 'منتجات مروّجة ومميزة',
      icon: Star,
      color: 'from-purple-500 to-pink-500'
    },
    { 
      key: 'flash_sale_enabled', 
      name: 'عروض فلاش', 
      description: 'خصومات لفترة محدودة',
      icon: Zap,
      color: 'from-orange-500 to-red-500'
    },
    { 
      key: 'free_shipping_enabled', 
      name: 'شحن مجاني', 
      description: 'منتجات تستحق شحن مجاني',
      icon: Truck,
      color: 'from-green-500 to-emerald-500'
    },
    { 
      key: 'best_sellers_enabled', 
      name: 'الأكثر مبيعاً', 
      description: 'المنتجات الأكثر طلباً',
      icon: TrendingUp,
      color: 'from-red-500 to-pink-500'
    },
    { 
      key: 'new_arrivals_enabled', 
      name: 'منتجات جديدة', 
      description: 'أحدث المنتجات المضافة',
      icon: Sparkles,
      color: 'from-blue-500 to-cyan-500'
    }
  ];

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/settings/homepage-sections`);
      setSections(res.data);
    } catch (error) {
      logger.error('Error fetching sections:', error);
      toast({ 
        title: "خطأ", 
        description: "فشل جلب إعدادات الأقسام", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key) => {
    setSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveSections = async () => {
    try {
      setSaving(true);
      await axios.put(`${API}/api/settings/homepage-sections`, sections);
      toast({ 
        title: "تم الحفظ", 
        description: "تم حفظ إعدادات الأقسام بنجاح" 
      });
    } catch (error) {
      logger.error('Error saving sections:', error);
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل حفظ الإعدادات", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900">أقسام الصفحة الرئيسية</h2>
          <p className="text-xs text-gray-500">تحكم في ظهور الأقسام في الصفحة الرئيسية</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSections}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="تحديث"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={saveSections}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>حفظ</span>
          </button>
        </div>
      </div>

      {/* Sections List */}
      <div className="space-y-3">
        {sectionsList.map((section, index) => {
          const Icon = section.icon;
          const isEnabled = sections[section.key];
          
          return (
            <div 
              key={section.key}
              className={`bg-white rounded-lg border-2 p-4 transition-all ${
                isEnabled ? 'border-green-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-bold text-sm">{index + 1}</span>
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${section.color}`}>
                      <Icon size={20} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{section.name}</h3>
                    <p className="text-xs text-gray-500">{section.description}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => toggleSection(section.key)}
                  className={`transition-all ${isEnabled ? 'text-green-500' : 'text-gray-300'}`}
                >
                  {isEnabled ? (
                    <ToggleRight size={40} />
                  ) : (
                    <ToggleLeft size={40} />
                  )}
                </button>
              </div>
              
              {/* Status Badge */}
              <div className="mt-2 flex justify-end">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isEnabled 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {isEnabled ? 'مفعّل' : 'معطّل'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          <strong>ملاحظة:</strong> عند تعطيل قسم، سيختفي من الصفحة الرئيسية والقسم التالي سيصعد مكانه تلقائياً (لا يوجد فراغ).
        </p>
      </div>
    </div>
  );
};

export default HomepageSectionsTab;
