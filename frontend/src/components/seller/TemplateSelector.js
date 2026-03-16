// /app/frontend/src/components/seller/TemplateSelector.js
// اختيار قوالب 3D للمنتجات - مجاني + AI مدفوع

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  X, Loader2, Sparkles, Check, Crown, Wallet,
  AlertCircle, Lock, ChevronLeft, ChevronRight
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const TemplateSelector = ({ 
  imageDataUrl, 
  onProcessed, 
  onCancel,
  isOpen,
  token
}) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [aiPrice, setAiPrice] = useState(3000);
  const [useAI, setUseAI] = useState(false);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      checkBalance();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API}/api/templates/list`);
      setTemplates(res.data.templates);
      setAiPrice(res.data.ai_price);
      if (res.data.templates.length > 0) {
        setSelectedTemplate(res.data.templates[0].id);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const checkBalance = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/api/templates/check-balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalance(res.data.wallet_balance);
    } catch (error) {
      console.error('Error checking balance:', error);
    }
  };

  const applyTemplate = async () => {
    if (!selectedTemplate || !imageDataUrl) return;
    
    setProcessing(true);
    setError(null);
    setProcessedImage(null);
    
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');
      formData.append('template_id', selectedTemplate);
      
      const endpoint = useAI ? '/api/templates/apply-ai' : '/api/templates/apply-free';
      const headers = { 'Content-Type': 'multipart/form-data' };
      
      if (useAI && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await axios.post(`${API}${endpoint}`, formData, { headers });
      
      if (res.data.success) {
        setProcessedImage(res.data.image);
        if (useAI && res.data.new_balance !== undefined) {
          setWalletBalance(res.data.new_balance);
        }
      }
    } catch (error) {
      console.error('Error applying template:', error);
      if (error.response?.status === 402) {
        setError('رصيد غير كافٍ في المحفظة');
      } else {
        setError('فشل تطبيق القالب');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (processedImage) {
      onProcessed(processedImage);
    }
  };

  const categories = [
    { id: 'all', name: 'الكل', icon: '📋' },
    { id: 'seasonal', name: 'موسمية', icon: '🗓️' },
    { id: 'promotion', name: 'عروض', icon: '🏷️' },
    { id: 'luxury', name: 'فاخرة', icon: '💎' },
    { id: 'category', name: 'فئات', icon: '📦' },
  ];

  const filteredTemplates = activeCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === activeCategory);

  const canUseAI = walletBalance >= aiPrice;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Sparkles size={22} />
            <div>
              <h2 className="font-bold text-sm">قوالب 3D للمنتجات</h2>
              <p className="text-[10px] opacity-80">اختر قالب لمنتجك</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-white/20 rounded-full text-white">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* معاينة الصور */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-500 text-center">الأصلية</p>
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200">
                <img src={imageDataUrl} alt="Original" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-500 text-center">مع القالب</p>
              <div className="aspect-square bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl overflow-hidden border-2 border-purple-300">
                {processing ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-purple-600" size={32} />
                    <p className="text-xs text-purple-600">جاري التطبيق...</p>
                  </div>
                ) : processedImage ? (
                  <img src={processedImage} alt="Processed" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-purple-400">
                    <Sparkles size={32} />
                    <p className="text-xs">اختر قالب ثم اضغط "تطبيق"</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* اختيار نوع المعالجة */}
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-bold text-gray-700 mb-2">نوع المعالجة:</p>
            <div className="grid grid-cols-2 gap-2">
              {/* مجاني */}
              <button
                onClick={() => {
                  setUseAI(false);
                  setProcessedImage(null);
                }}
                className={`p-3 rounded-xl border-2 text-right transition-all ${
                  !useAI 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🆓</span>
                  <span className="font-bold text-sm text-gray-900">مجاني</span>
                  {!useAI && <Check size={16} className="text-green-600 mr-auto" />}
                </div>
                <p className="text-[10px] text-gray-500">دمج على قالب جاهز</p>
                <p className="text-[10px] text-green-600 font-bold">0 ل.س</p>
              </button>

              {/* AI مدفوع */}
              <button
                onClick={() => {
                  if (canUseAI) {
                    setUseAI(true);
                    setProcessedImage(null);
                  }
                }}
                disabled={!canUseAI}
                className={`p-3 rounded-xl border-2 text-right transition-all ${
                  useAI 
                    ? 'border-purple-500 bg-purple-50' 
                    : canUseAI 
                      ? 'border-gray-200 bg-white hover:border-gray-300'
                      : 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Crown size={18} className="text-purple-600" />
                  <span className="font-bold text-sm text-gray-900">AI احترافي</span>
                  {useAI && <Check size={16} className="text-purple-600 mr-auto" />}
                  {!canUseAI && <Lock size={14} className="text-gray-400 mr-auto" />}
                </div>
                <p className="text-[10px] text-gray-500">جودة استوديو</p>
                <p className="text-[10px] text-purple-600 font-bold">{aiPrice.toLocaleString()} ل.س</p>
              </button>
            </div>

            {/* رصيد المحفظة */}
            {token && (
              <div className={`mt-2 p-2 rounded-lg flex items-center justify-between ${
                canUseAI ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className="flex items-center gap-2">
                  <Wallet size={14} className={canUseAI ? 'text-green-600' : 'text-red-600'} />
                  <span className="text-xs text-gray-700">رصيد المحفظة:</span>
                </div>
                <span className={`text-xs font-bold ${canUseAI ? 'text-green-600' : 'text-red-600'}`}>
                  {walletBalance.toLocaleString()} ل.س
                </span>
              </div>
            )}

            {!canUseAI && useAI && (
              <div className="mt-2 p-2 bg-red-50 rounded-lg flex items-center gap-2">
                <AlertCircle size={14} className="text-red-500" />
                <span className="text-xs text-red-700">رصيد غير كافٍ - أضف رصيد للمحفظة</span>
              </div>
            )}
          </div>

          {/* فلتر الفئات */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>

          {/* قائمة القوالب */}
          <div className="grid grid-cols-4 gap-2">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => {
                  setSelectedTemplate(template.id);
                  setProcessedImage(null);
                }}
                className={`p-2 rounded-xl border-2 transition-all ${
                  selectedTemplate === template.id
                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-300'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div 
                  className="aspect-square rounded-lg mb-1 flex items-center justify-center text-2xl"
                  style={{ 
                    background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.secondary})` 
                  }}
                >
                  {template.icon}
                </div>
                <p className="text-[10px] font-bold text-gray-700 truncate">{template.name}</p>
              </button>
            ))}
          </div>

          {/* رسالة الخطأ */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* زر التطبيق */}
          <button
            onClick={applyTemplate}
            disabled={processing || !selectedTemplate}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              useAI
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
            } disabled:opacity-50`}
          >
            {processing ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                جاري التطبيق...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                {useAI ? `تطبيق AI (${aiPrice.toLocaleString()} ل.س)` : 'تطبيق مجاني'}
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={!processedImage}
            className="flex-1 bg-purple-600 text-white py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check size={16} />
            استخدام الصورة
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default TemplateSelector;
