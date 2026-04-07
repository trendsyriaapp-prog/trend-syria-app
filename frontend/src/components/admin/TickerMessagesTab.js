import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
  Plus, Trash2, Star, Eye, EyeOff, GripVertical, 
  Save, ToggleLeft, ToggleRight, Sparkles, AlertCircle
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const TickerMessagesTab = () => {
  const [messages, setMessages] = useState([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMessage, setNewMessage] = useState({ text: '', highlight: false });
  const { toast } = useToast();

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/ticker-messages/admin`);
      setMessages(res.data.messages || []);
      setIsEnabled(res.data.is_enabled !== false);
    } catch (error) {
      console.error('Error fetching ticker messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/ticker-messages`, {
        messages,
        is_enabled: isEnabled
      });
      toast({
        title: "تم الحفظ",
        description: "تم حفظ رسائل الشريط بنجاح"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ التغييرات",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddMessage = async () => {
    if (!newMessage.text.trim()) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال نص الرسالة",
        variant: "destructive"
      });
      return;
    }

    try {
      const res = await axios.post(`${API}/api/settings/ticker-messages/add`, newMessage);
      setMessages([...messages, res.data.message]);
      setNewMessage({ text: '', highlight: false });
      toast({
        title: "تمت الإضافة",
        description: "تمت إضافة الرسالة بنجاح"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إضافة الرسالة",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(`${API}/api/settings/ticker-messages/${messageId}`);
      setMessages(messages.filter(m => m.id !== messageId));
      toast({
        title: "تم الحذف",
        description: "تم حذف الرسالة بنجاح"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حذف الرسالة",
        variant: "destructive"
      });
    }
  };

  const toggleMessageActive = (messageId) => {
    setMessages(messages.map(m => 
      m.id === messageId ? { ...m, is_active: !m.is_active } : m
    ));
  };

  const toggleMessageHighlight = (messageId) => {
    setMessages(messages.map(m => 
      m.id === messageId ? { ...m, highlight: !m.highlight } : m
    ));
  };

  const updateMessageText = (messageId, text) => {
    setMessages(messages.map(m => 
      m.id === messageId ? { ...m, text } : m
    ));
  };

  const handleToggleTicker = async () => {
    try {
      const newState = !isEnabled;
      await axios.put(`${API}/api/settings/ticker-messages/toggle`, { is_enabled: newState });
      setIsEnabled(newState);
      toast({
        title: newState ? "تم التفعيل" : "تم التعطيل",
        description: newState ? "تم تفعيل شريط العروض" : "تم تعطيل شريط العروض"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تغيير الحالة",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="ticker-messages-tab">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="text-[#FF6B00]" size={24} />
            إدارة شريط العروض
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            أضف وعدّل الرسائل التي تظهر في الشريط المتحرك
          </p>
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={handleToggleTicker}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-sm w-full sm:w-auto ${
            isEnabled 
              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          data-testid="toggle-ticker-btn"
        >
          {isEnabled ? (
            <>
              <ToggleRight size={18} />
              مفعل
            </>
          ) : (
            <>
              <ToggleLeft size={18} />
              معطل
            </>
          )}
        </button>
      </div>

      {/* Preview */}
      <div className="bg-gradient-to-r from-[#FF6B00] via-[#FF8533] to-[#FF6B00] text-white py-2 rounded-lg overflow-hidden">
        <div className="ticker-wrapper">
          <div className="ticker-content animate-ticker flex items-center gap-8 whitespace-nowrap px-4">
            {messages.filter(m => m.is_active !== false).map((msg, i) => (
              <span key={i} className="flex items-center gap-2 text-sm font-medium">
                {msg.highlight && <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">حصري</span>}
                {msg.text}
                <span className="text-white/50">|</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Add New Message */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm">
          <Plus size={18} className="text-[#FF6B00]" />
          إضافة رسالة جديدة
        </h3>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            type="text"
            value={newMessage.text}
            onChange={(e) => setNewMessage({ ...newMessage, text: e.target.value })}
            placeholder="🔥 خصم 50% على جميع المنتجات"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] outline-none text-sm"
            data-testid="new-message-input"
          />
          <div className="flex gap-2">
            <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 flex-1 sm:flex-none">
              <input
                type="checkbox"
                checked={newMessage.highlight}
                onChange={(e) => setNewMessage({ ...newMessage, highlight: e.target.checked })}
                className="rounded text-[#FF6B00] focus:ring-[#FF6B00]"
              />
              <Star size={16} className="text-yellow-500" />
              <span className="text-sm text-gray-700">حصري</span>
            </label>
            <button
              onClick={handleAddMessage}
              className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg font-medium hover:bg-[#E65000] transition-colors flex items-center gap-2 flex-1 sm:flex-none justify-center"
              data-testid="add-message-btn"
            >
              <Plus size={18} />
              إضافة
            </button>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-bold text-gray-900">الرسائل الحالية ({messages.length})</h3>
        </div>
        
        {messages.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">لا توجد رسائل حالياً</p>
          </div>
        ) : (
          <Reorder.Group 
            axis="y" 
            values={messages} 
            onReorder={setMessages}
            className="divide-y divide-gray-100"
          >
            {messages.map((message) => (
              <Reorder.Item
                key={message.id}
                value={message}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white hover:bg-gray-50 cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-2 flex-1">
                  <GripVertical size={20} className="text-gray-400 flex-shrink-0 hidden sm:block" />
                  
                  <input
                    type="text"
                    value={message.text}
                    onChange={(e) => updateMessageText(message.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] outline-none text-sm"
                  />
                </div>
                
                <div className="flex items-center gap-2 justify-end">
                  {/* Highlight Toggle */}
                  <button
                    onClick={() => toggleMessageHighlight(message.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      message.highlight 
                        ? 'bg-yellow-100 text-yellow-600' 
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    title={message.highlight ? 'إزالة شارة حصري' : 'إضافة شارة حصري'}
                  >
                    <Star size={18} />
                  </button>
                  
                  {/* Active Toggle */}
                  <button
                    onClick={() => toggleMessageActive(message.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      message.is_active !== false 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    title={message.is_active !== false ? 'إخفاء الرسالة' : 'إظهار الرسالة'}
                  >
                    {message.is_active !== false ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteMessage(message.id)}
                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="حذف الرسالة"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg font-bold hover:bg-[#E65000] transition-colors flex items-center gap-2 disabled:opacity-50"
          data-testid="save-ticker-btn"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          ) : (
            <Save size={20} />
          )}
          حفظ التغييرات
        </button>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
        <h4 className="font-bold text-blue-800 mb-2 text-sm">💡 نصائح:</h4>
        <ul className="text-xs sm:text-sm text-blue-700 space-y-1">
          <li>• استخدم الإيموجي لجعل الرسائل جاذبية 🔥⚡🎁</li>
          <li>• اجعل الرسائل قصيرة ومباشرة</li>
          <li>• ضع شارة "حصري" للعروض المميزة فقط</li>
        </ul>
      </div>
    </div>
  );
};

export default TickerMessagesTab;
