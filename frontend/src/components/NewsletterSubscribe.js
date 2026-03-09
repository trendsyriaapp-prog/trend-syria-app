// /app/frontend/src/components/NewsletterSubscribe.js
// مكون الاشتراك في النشرة البريدية

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Mail, Send, Check, X, Loader2, Gift, Bell, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

// مكون البانر للاشتراك
export const NewsletterBanner = ({ onClose }) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await axios.post(`${API}/api/newsletter/subscribe`, { email });
      setSuccess(true);
      toast({
        title: language === 'ar' ? 'تم الاشتراك بنجاح!' : 'Subscribed Successfully!',
        description: language === 'ar' ? 'سنرسل لك أحدث العروض' : 'We\'ll send you the latest offers'
      });
      setTimeout(() => onClose?.(), 3000);
    } catch (err) {
      const message = err.response?.data?.detail || (language === 'ar' ? 'خطأ في الاشتراك' : 'Subscription error');
      if (err.response?.data?.already_subscribed) {
        setSuccess(true);
      } else {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: message,
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 shadow-2xl z-40"
    >
      {/* زر الإغلاق */}
      <button
        onClick={onClose}
        className="absolute top-3 left-3 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
      >
        <X size={14} className="text-white" />
      </button>

      {success ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={32} className="text-white" />
          </div>
          <h3 className="text-white font-bold text-lg mb-1">
            {language === 'ar' ? 'شكراً لك!' : 'Thank You!'}
          </h3>
          <p className="text-white/80 text-sm">
            {language === 'ar' ? 'تم تسجيلك في النشرة البريدية' : 'You\'re now subscribed'}
          </p>
        </div>
      ) : (
        <>
          {/* الأيقونة والعنوان */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Mail size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">
                {language === 'ar' ? 'اشترك في نشرتنا' : 'Subscribe to Newsletter'}
              </h3>
              <p className="text-white/70 text-xs">
                {language === 'ar' ? 'احصل على أحدث العروض والخصومات' : 'Get the latest offers & discounts'}
              </p>
            </div>
          </div>

          {/* المزايا */}
          <div className="flex items-center gap-4 mb-4 text-white/80 text-xs">
            <div className="flex items-center gap-1">
              <Gift size={14} />
              <span>{language === 'ar' ? 'عروض حصرية' : 'Exclusive offers'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Bell size={14} />
              <span>{language === 'ar' ? 'منتجات جديدة' : 'New arrivals'}</span>
            </div>
          </div>

          {/* نموذج الاشتراك */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === 'ar' ? 'بريدك الإلكتروني' : 'Your email'}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:border-white/50"
              required
              data-testid="newsletter-email-input"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2.5 bg-white text-purple-600 rounded-xl font-bold hover:bg-white/90 transition-colors disabled:opacity-50 flex items-center gap-1"
              data-testid="newsletter-subscribe-btn"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Send size={16} />
                  <span className="hidden sm:inline">{language === 'ar' ? 'اشترك' : 'Subscribe'}</span>
                </>
              )}
            </button>
          </form>
        </>
      )}
    </motion.div>
  );
};

// مكون الاشتراك في الفوتر
export const NewsletterFooter = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await axios.post(`${API}/api/newsletter/subscribe`, { email });
      setSuccess(true);
      setEmail('');
      toast({
        title: language === 'ar' ? 'تم الاشتراك!' : 'Subscribed!',
        description: language === 'ar' ? 'شكراً لانضمامك' : 'Thanks for joining'
      });
    } catch (err) {
      if (err.response?.data?.already_subscribed) {
        setSuccess(true);
      } else {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: err.response?.data?.detail || 'Error',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* النص */}
          <div className="text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Sparkles size={20} className="text-yellow-400" />
              <h3 className="text-white font-bold text-lg">
                {language === 'ar' ? 'انضم لنشرتنا البريدية' : 'Join Our Newsletter'}
              </h3>
            </div>
            <p className="text-gray-400 text-sm">
              {language === 'ar' 
                ? 'احصل على عروض حصرية وكوبونات خصم مباشرة على بريدك'
                : 'Get exclusive offers and discount coupons directly to your inbox'}
            </p>
          </div>

          {/* النموذج */}
          {success ? (
            <div className="flex items-center gap-2 text-green-400" data-testid="newsletter-footer-success">
              <Check size={20} />
              <span>{language === 'ar' ? 'تم الاشتراك بنجاح!' : 'Successfully subscribed!'}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2 w-full md:w-auto" data-testid="newsletter-footer-form">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={language === 'ar' ? 'بريدك الإلكتروني' : 'Your email'}
                className="flex-1 md:w-64 px-4 py-3 rounded-xl bg-gray-700 text-white placeholder-gray-400 border border-gray-600 focus:outline-none focus:border-[#FF6B00]"
                required
                data-testid="newsletter-footer-email-input"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#FF6B00] text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                data-testid="newsletter-footer-subscribe-btn"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <Mail size={18} />
                    <span>{language === 'ar' ? 'اشترك' : 'Subscribe'}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// مكون الاشتراك المنبثق
export const NewsletterPopup = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await axios.post(`${API}/api/newsletter/subscribe`, { email, name });
      setSuccess(true);
      toast({
        title: language === 'ar' ? 'مرحباً بك!' : 'Welcome!',
        description: language === 'ar' ? 'تم تسجيلك في النشرة البريدية' : 'You\'re now subscribed'
      });
    } catch (err) {
      if (err.response?.data?.already_subscribed) {
        setSuccess(true);
      } else {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: err.response?.data?.detail || 'Error',
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md overflow-hidden"
        >
          {/* الهيدر */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-center relative">
            <button
              onClick={onClose}
              className="absolute top-4 left-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
            
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-white" />
            </div>
            
            <h2 className="text-white font-bold text-xl mb-1">
              {language === 'ar' ? 'احصل على خصم 10%!' : 'Get 10% OFF!'}
            </h2>
            <p className="text-white/80 text-sm">
              {language === 'ar' 
                ? 'اشترك في نشرتنا واحصل على كوبون خصم'
                : 'Subscribe to our newsletter and get a discount coupon'}
            </p>
          </div>

          {/* المحتوى */}
          <div className="p-6">
            {success ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-500" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">
                  {language === 'ar' ? 'شكراً لك!' : 'Thank You!'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  {language === 'ar' 
                    ? 'تم إرسال كوبون الخصم إلى بريدك'
                    : 'Your discount coupon has been sent to your email'}
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-[#FF6B00] text-white rounded-xl font-bold hover:bg-orange-600 transition-colors"
                >
                  {language === 'ar' ? 'تصفح المنتجات' : 'Browse Products'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={language === 'ar' ? 'اسمك (اختياري)' : 'Your name (optional)'}
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={language === 'ar' ? 'بريدك الإلكتروني' : 'Your email'}
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 focus:outline-none focus:border-[#FF6B00]"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <Gift size={18} />
                      {language === 'ar' ? 'احصل على الخصم' : 'Get My Discount'}
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  {language === 'ar' 
                    ? 'لن نشارك بريدك مع أي جهة أخرى'
                    : 'We will never share your email with anyone'}
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NewsletterBanner;
