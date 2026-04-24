// /app/frontend/src/pages/delivery/DeliveryDashboard.js
// لوحة تحكم موظف التوصيل - الملف المُستخرج

import { useState, useEffect, useRef, useCallback } from 'react';
import logger from '../../lib/logger';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { useModalBackHandler } from '../../hooks/useBackButton';
import { 
  Truck, Clock, Navigation, Volume2, VolumeX, LogOut, Wallet, Star, Settings,
  Check, MapPin, X, Trash2
} from 'lucide-react';
import { PickupChecklist, DeliveryChecklist, ReturnChecklist } from '../../components/delivery/DeliveryChecklists';
import AvailableOrdersList from '../../components/delivery/AvailableOrdersList';
import MyOrdersList from '../../components/delivery/MyOrdersList';
import RouteMapModal from '../../components/delivery/RouteMapModal';
import MyBoxCard from '../../components/delivery/MyBoxCard';
import DriverPerformance from '../../components/delivery/DriverPerformance';
import DriverChallenges from '../../components/delivery/DriverChallenges';
import DriverLeaderboard from '../../components/delivery/DriverLeaderboard';
import DriverAchievements from '../../components/delivery/DriverAchievements';
import DriverPenaltyPoints from '../../components/delivery/DriverPenaltyPoints';
import DeliverySettingsTab from '../../components/delivery/DeliverySettingsTab';
import NotificationsDropdown from '../../components/NotificationsDropdown';
import useNotificationSound from '../../hooks/useNotificationSound';
import useDriverLocationTracker from '../../hooks/useDriverLocationTracker';
import PushNotificationButton from '../../components/PushNotificationButton';
import PushNotificationPrompt from '../../components/PushNotificationPrompt';
import EarningsStats from '../../components/delivery/EarningsStats';
import RouteProgressBar from '../../components/delivery/RouteProgressBar';
import SecurityDepositCard from '../../components/delivery/SecurityDepositCard';
import ResignationSection from '../../components/delivery/ResignationSection';
import '../../styles/driver-dark-theme.css';

const API = process.env.REACT_APP_BACKEND_URL;

// لوحة تحكم موظف التوصيل
const DeliveryDashboard = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'available');
  const [docStatus, setDocStatus] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTransactions, setDeletingTransactions] = useState(false);
  const [processingOrderId, setProcessingOrderId] = useState(null); // لمنع الضغط المتكرر
  
  // 📸 الصورة الشخصية للسائق
  const [driverProfile, setDriverProfile] = useState(null);
  
  // ⭐ حفظ موضع التمرير واستعادته عند العودة
  const scrollPositionRef = useRef(0);
  
  // حفظ موضع التمرير قبل التنقل
  useEffect(() => {
    const saveScrollPosition = () => {
      scrollPositionRef.current = window.scrollY;
    };
    window.addEventListener('beforeunload', saveScrollPosition);
    return () => window.removeEventListener('beforeunload', saveScrollPosition);
  }, []);
  
  // استعادة موضع التمرير عند العودة للصفحة (مرة واحدة فقط)
  const hasRestoredScrollRef = useRef(false);
  useEffect(() => {
    if (!loading && scrollPositionRef.current > 0 && !hasRestoredScrollRef.current) {
      window.scrollTo(0, scrollPositionRef.current);
      hasRestoredScrollRef.current = true;
    }
  }, [loading]);
  
  // حالة قفل طلبات المنتجات (عندما يكون هناك طلبات طعام نشطة)
  const [isProductsLocked, setIsProductsLocked] = useState(false);
  const [productsLockMessage, setProductsLockMessage] = useState('');

  // حالة توفر السائق
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  
  // حالة التأمين
  const [securityDepositComplete, setSecurityDepositComplete] = useState(true);

  // ⭐ نظام الثيم (فاتح/داكن) مع تبديل تلقائي
  const [themeMode, setThemeMode] = useState(() => {
    // استرجاع الإعداد المحفوظ
    return localStorage.getItem('driverThemeMode') || 'auto';
  });
  
  // حساب الثيم الحالي مباشرة
  const calculateCurrentTheme = (mode) => {
    if (mode === 'auto') {
      const hour = new Date().getHours();
      // من 6 صباحاً إلى 6 مساءً = فاتح
      const isDay = hour >= 6 && hour < 18;
      return isDay ? 'light' : 'dark';
    }
    return mode;
  };
  
  const [currentTheme, setCurrentTheme] = useState(() => calculateCurrentTheme(
    localStorage.getItem('driverThemeMode') || 'auto'
  ));

  // حساب الثيم التلقائي حسب الوقت
  useEffect(() => {
    const updateAutoTheme = () => {
      setCurrentTheme(calculateCurrentTheme(themeMode));
    };
    
    updateAutoTheme();
    // حفظ الإعداد
    localStorage.setItem('driverThemeMode', themeMode);
    // تحديث كل دقيقة
    const interval = setInterval(updateAutoTheme, 60000);
    return () => clearInterval(interval);
  }, [themeMode]);

  // صوت التنبيه للطلبات الجديدة - مع أصوات مختلفة لكل نوع
  const { playSound, playFood, playProduct, playPriority } = useNotificationSound();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousAvailableCountRef = useRef(0);
  const previousFoodCountRef = useRef(0);
  const previousProductCountRef = useRef(0);

  // تحديث URL عند تغيير التبويب
  useEffect(() => {
    if (activeTab === 'available') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', activeTab);
    }
    setSearchParams(searchParams, { replace: true });
    
    // ⭐ التمرير للأعلى عند تغيير التبويب
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // قراءة التبويب من URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      // إذا كان هناك تبويب في URL، استخدمه
      if (tabFromUrl !== activeTab) {
        setActiveTab(tabFromUrl);
      }
    } else {
      // إذا لم يكن هناك تبويب في URL (الصفحة الرئيسية)، اعرض التبويب الافتراضي
      if (activeTab !== 'available') {
        setActiveTab('available');
      }
    }
  }, [searchParams]);
  
  // Checklist states
  const [showPickupChecklist, setShowPickupChecklist] = useState(null);
  const [showDeliveryChecklist, setShowDeliveryChecklist] = useState(null);
  const [showReturnChecklist, setShowReturnChecklist] = useState(null);
  
  // Delivery Code Modal - لطلبات المنتجات
  const [showDeliveryCodeModal, setShowDeliveryCodeModal] = useState(null);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState('');
  const [deliveryCodeError, setDeliveryCodeError] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  
  // ETA Modal - الوقت المتوقع للوصول
  const [showETAModal, setShowETAModal] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(30);
  
  // State لعرض الخريطة مع مسار طلب معين
  const [showRouteMapForOrder, setShowRouteMapForOrder] = useState(null);
  
  // ⭐ دعم زر الرجوع للـ modals
  const closeETAModal = useCallback(() => setShowETAModal(null), []);
  const closeDeliveryCodeModal = useCallback(() => {
    setShowDeliveryCodeModal(null);
    setDeliveryCodeInput('');
    setDeliveryCodeError('');
  }, []);
  const closePickupChecklist = useCallback(() => setShowPickupChecklist(null), []);
  const closeDeliveryChecklist = useCallback(() => setShowDeliveryChecklist(null), []);
  const closeReturnChecklist = useCallback(() => setShowReturnChecklist(null), []);
  const closeRouteMapModal = useCallback(() => setShowRouteMapForOrder(null), []);
  
  // تسجيل الـ modals مع زر الرجوع
  useModalBackHandler(!!showETAModal, closeETAModal);
  useModalBackHandler(!!showDeliveryCodeModal, closeDeliveryCodeModal);
  useModalBackHandler(!!showPickupChecklist, closePickupChecklist);
  useModalBackHandler(!!showDeliveryChecklist, closeDeliveryChecklist);
  useModalBackHandler(!!showReturnChecklist, closeReturnChecklist);
  useModalBackHandler(!!showRouteMapForOrder, closeRouteMapModal);
  
  // Ratings
  const [myRatings, setMyRatings] = useState({ ratings: [], average_rating: 0, total_ratings: 0 });
  
  // Food orders states
  const [availableFoodOrders, setAvailableFoodOrders] = useState([]);
  const [myFoodOrders, setMyFoodOrders] = useState([]);
  const [driverRequestedOrders, setDriverRequestedOrders] = useState([]); // طلبات من نظام التنسيق الجديد
  const [orderTypeFilter, setOrderTypeFilter] = useState('all'); // 'all', 'products', 'food' - الافتراضي الكل

  // تتبع موقع السائق تلقائياً عندما يكون لديه طلبات قيد التوصيل
  const currentOrderId = (Array.isArray(myFoodOrders) ? myFoodOrders : []).find(o => o.status === 'out_for_delivery')?.id || 
                         (Array.isArray(myOrders) ? myOrders : []).find(o => o.delivery_status === 'out_for_delivery')?.id;
  const hasActiveDelivery = !!currentOrderId;
  
  const { isTracking } = useDriverLocationTracker(hasActiveDelivery, currentOrderId);

  // جلب حالة التوفر
  const fetchAvailability = async () => {
    try {
      const res = await axios.get(`${API}/api/delivery/availability`);
      setIsAvailable(res.data.is_available);
    } catch (error) {
      logger.error('Error fetching availability:', error);
    }
  };

  // تبديل حالة التوفر
  const toggleAvailability = async () => {
    setIsLoadingAvailability(true);
    try {
      const res = await axios.put(`${API}/api/delivery/availability`, {
        is_available: !isAvailable
      });
      setIsAvailable(res.data.is_available);
      toast({
        title: res.data.is_available ? "🟢 أنت متاح الآن" : "⚫ أنت غير متاح",
        description: res.data.is_available 
          ? "ستتلقى إشعارات بالطلبات الجديدة" 
          : "لن تتلقى إشعارات حتى تصبح متاحاً"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة التوفر",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  // التحقق من الطلبات الجديدة وتشغيل الصوت المناسب - فقط إذا كان متاحاً
  useEffect(() => {
    if (soundEnabled && isAvailable) {
      const currentFoodCount = availableFoodOrders.length;
      const currentProductCount = availableOrders.length;
      const totalAvailable = currentFoodCount + currentProductCount;
      
      // التحقق من طلبات طعام جديدة
      if (currentFoodCount > previousFoodCountRef.current && previousFoodCountRef.current !== 0) {
        playFood(); // 🍔 صوت مميز للطعام
        toast({
          title: "🍔 طلب طعام جديد!",
          description: `هناك ${currentFoodCount} طلب طعام متاح`,
        });
      }
      // التحقق من طلبات منتجات جديدة
      else if (currentProductCount > previousProductCountRef.current && previousProductCountRef.current !== 0) {
        playProduct(); // 📦 صوت مميز للمنتجات
        toast({
          title: "📦 طلب منتجات جديد!",
          description: `هناك ${currentProductCount} طلب منتجات متاح`,
        });
      }
      // طلب جديد عام (أول مرة)
      else if (totalAvailable > previousAvailableCountRef.current && previousAvailableCountRef.current === 0 && totalAvailable > 0) {
        playSound('default');
        toast({
          title: "🔔 طلبات متاحة!",
          description: `هناك ${totalAvailable} طلب متاح للتوصيل`,
        });
      }
      
      previousAvailableCountRef.current = totalAvailable;
      previousFoodCountRef.current = currentFoodCount;
      previousProductCountRef.current = currentProductCount;
    }
  }, [availableOrders, availableFoodOrders, soundEnabled, isAvailable, playSound, playFood, playProduct, toast]);

  // تحديث الطلبات كل 15 ثانية للكشف السريع عن التغييرات
  useEffect(() => {
    if (docStatus === 'approved') {
      const interval = setInterval(() => {
        fetchOrders();
      }, 15000); // كل 15 ثانية
      return () => clearInterval(interval);
    }
  }, [docStatus]);

  useEffect(() => {
    // انتظار تحميل بيانات المستخدم قبل فحص الحالة
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    checkStatusAndFetch();
    fetchWallet();
    fetchMyRatings();
    fetchAvailability();
  }, [authLoading, user]);

  const fetchMyRatings = async () => {
    try {
      const res = await axios.get(`${API}/api/delivery/my-ratings`);
      setMyRatings(res.data);
    } catch (error) {
      logger.error('Error fetching ratings:', error);
    }
  };

  const fetchWallet = async () => {
    try {
      const [balanceRes, transRes] = await Promise.all([
        axios.get(`${API}/api/wallet/balance`),
        axios.get(`${API}/api/wallet/transactions?limit=20`)
      ]);
      setWalletBalance(balanceRes.data.balance || 0);
      setWalletTransactions(transRes.data || []);
    } catch (error) {
      logger.error('Error fetching wallet:', error);
    }
  };
  
  // حذف سجلات المحفظة
  const handleClearTransactions = async () => {
    setDeletingTransactions(true);
    try {
      await axios.delete(`${API}/api/wallet/transactions/clear`);
      toast({ title: "تم الحذف", description: "تم حذف سجلات المحفظة بنجاح" });
      setWalletTransactions([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل حذف السجلات",
        variant: "destructive"
      });
    } finally {
      setDeletingTransactions(false);
    }
  };

  const checkStatusAndFetch = async () => {
    try {
      const statusRes = await axios.get(`${API}/api/delivery/documents/status`);
      const status = statusRes.data.status;
      setDocStatus(status);
      
      // إعادة التوجيه حسب حالة الوثائق
      if (!status || status === 'not_submitted') {
        navigate('/delivery/documents', { replace: true });
        return;
      } else if (status === 'pending') {
        navigate('/delivery/pending', { replace: true });
        return;
      } else if (status === 'rejected') {
        navigate('/delivery/documents', { replace: true });
        return;
      }
      
      // approved - يمكنه الوصول للوحة التحكم
      if (status === 'approved') {
        fetchOrders();
        
        // 📸 جلب الملف الشخصي مع الصورة
        try {
          const profileRes = await axios.get(`${API}/api/delivery/profile`);
          setDriverProfile(profileRes.data);
        } catch (profileErr) {
          logger.warn('Failed to fetch driver profile:', profileErr);
        }
        
        // فحص حالة التأمين
        try {
          const securityRes = await axios.get(`${API}/api/driver/security/status`);
          setSecurityDepositComplete(securityRes.data.is_complete || false);
        } catch (e) {
          // إذا فشل، نفترض أن التأمين مكتمل (للسائقين القدامى)
          setSecurityDepositComplete(true);
        }
      }
    } catch (error) {
      // إذا فشل التحقق (404)، نوجهه لصفحة الوثائق
      if (error.response?.status === 404) {
        navigate('/delivery/documents', { replace: true });
        return;
      }
      logger.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      // حفظ الطلبات السابقة للمقارنة
      const prevMyFoodOrderIds = (myFoodOrders || []).map(o => o.id);
      const prevMyOrderIds = (myOrders || []).map(o => o.id);
      
      const [availableRes, myProductRes, myFoodRes] = await Promise.all([
        axios.get(`${API}/api/delivery/available-orders`),
        axios.get(`${API}/api/delivery/my-product-orders`).catch(() => ({ data: { orders: [], is_locked: false } })),
        axios.get(`${API}/api/delivery/my-food-orders`).catch(() => ({ data: [] }))
      ]);
      
      // /api/delivery/available-orders يُرجع كل الطلبات المتاحة (منتجات + طعام)
      const allAvailable = availableRes.data || [];
      
      // فصل طلبات المنتجات عن طلبات الطعام
      const availableProductOrders = allAvailable.filter(o => o.order_source !== 'food' && !o.store_id && !o.restaurant_name);
      const availableFoodOrdersFromAPI = allAvailable.filter(o => o.order_source === 'food' || o.store_id || o.restaurant_name);
      
      // تعيين طلبات المنتجات المتاحة فقط (بدون طعام لتجنب التكرار)
      setAvailableOrders(availableProductOrders);
      
      // تعيين طلبات الطعام المتاحة
      setAvailableFoodOrders(availableFoodOrdersFromAPI);
      
      // استخدام my-product-orders الذي يحتوي على معلومات القفل
      const productOrdersData = myProductRes.data;
      setMyOrders(productOrdersData.orders || []);
      
      // حفظ حالة القفل لطلبات المنتجات
      setIsProductsLocked(productOrdersData.is_locked || false);
      setProductsLockMessage(productOrdersData.lock_message || '');
      
      // لا نحتاج استدعاء API منفصل لطلبات الطعام المتاحة - تم دمجها أعلاه
      setDriverRequestedOrders([]);
      
      const newMyFoodOrders = myFoodRes.data || [];
      setMyFoodOrders(newMyFoodOrders);
      
      // ======= التحقق من الطلبات الملغاة أو المحذوفة =======
      const newMyFoodOrderIds = newMyFoodOrders.map(o => o.id);
      const newMyOrderIds = (productOrdersData.orders || []).map(o => o.id);
      
      // طلبات الطعام التي اختفت
      const cancelledFoodOrders = prevMyFoodOrderIds.filter(id => !newMyFoodOrderIds.includes(id));
      if (cancelledFoodOrders.length > 0 && prevMyFoodOrderIds.length > 0) {
        toast({
          title: "⚠️ تم تغيير طلباتك",
          description: `تم إلغاء أو نقل ${cancelledFoodOrders.length} طلب من قائمتك`,
          variant: "destructive",
          duration: 5000
        });
      }
      
      // طلبات المنتجات التي اختفت
      const cancelledOrders = prevMyOrderIds.filter(id => !newMyOrderIds.includes(id));
      if (cancelledOrders.length > 0 && prevMyOrderIds.length > 0) {
        toast({
          title: "⚠️ تم تغيير طلباتك",
          description: `تم إلغاء أو نقل ${cancelledOrders.length} طلب منتجات من قائمتك`,
          variant: "destructive",
          duration: 5000
        });
      }
    } catch (error) {
      logger.error(error);
    }
  };

  // قبول طلب منتجات (الخطوة الأولى - السائق يقبل الطلب)
  const handleAcceptProductOrder = async (order) => {
    // منع الضغط المتكرر
    if (processingOrderId === order.id) return;
    
    // فحص التأمين
    if (!securityDepositComplete) {
      toast({
        title: "التأمين غير مكتمل",
        description: "يجب إكمال دفع التأمين قبل قبول الطلبات",
        variant: "destructive"
      });
      return;
    }
    
    setProcessingOrderId(order.id);
    try {
      await axios.post(`${API}/api/orders/${order.id}/delivery/accept`);
      toast({
        title: "تم قبول الطلب ✅",
        description: "توجه للمتجر لاستلام الطلب"
      });
      // إزالة الطلب من القائمة المتاحة
      setAvailableOrders(prev => prev.filter(o => o.id !== order.id));
      fetchOrders();
    } catch (error) {
      toast({
        title: "خطأ في قبول الطلب",
        description: error.response?.data?.detail || "فشل قبول الطلب، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  // استلام طلب منتجات من المتجر (الخطوة الثانية - بعد الوصول للمتجر)
  const handleTakeOrder = async (orderId) => {
    // منع الضغط المتكرر
    if (processingOrderId === orderId) return;
    
    setProcessingOrderId(orderId);
    try {
      await axios.post(`${API}/api/orders/${orderId}/delivery/pickup`);
      toast({
        title: "تم بنجاح",
        description: "تم استلام الطلب من البائع"
      });
      setShowPickupChecklist(null);
      fetchOrders();
    } catch (error) {
      toast({
        title: "خطأ في استلام الطلب",
        description: error.response?.data?.detail || "فشل استلام الطلب من البائع، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleTakeFoodOrder = async (order) => {
    // منع الضغط المتكرر
    if (processingOrderId === order.id) return;
    
    // فحص التأمين
    if (!securityDepositComplete) {
      toast({
        title: "التأمين غير مكتمل",
        description: "يجب إكمال دفع التأمين قبل قبول الطلبات",
        variant: "destructive"
      });
      return;
    }
    
    setProcessingOrderId(order.id);
    try {
      // التحقق من نوع الطلب (عادي أم تجميعي)
      if (order.is_batch && order.batch_info?.batch_id) {
        // قبول جميع طلبات الدفعة
        await axios.post(`${API}/api/food/orders/delivery/batch/${order.batch_info.batch_id}/accept`);
        toast({
          title: "تم بنجاح",
          description: `تم قبول الطلب التجميعي (${order.batch_info.stores?.length || 0} متاجر)`
        });
        // إزالة جميع طلبات الدفعة من القائمة
        setAvailableFoodOrders(prev => prev.filter(o => o.batch_info?.batch_id !== order.batch_info.batch_id));
      } else {
        // طلب عادي
        await axios.post(`${API}/api/food/orders/delivery/${order.id}/accept`);
        toast({
          title: "تم بنجاح",
          description: "تم قبول طلب التوصيل"
        });
        // إزالة الطلب من القائمة المحلية فوراً بعد النجاح
        setAvailableFoodOrders(prev => prev.filter(o => o.id !== order.id));
      }
      fetchOrders();
    } catch (error) {
      // عند الفشل، لا نغير شيء - الطلب يبقى كما هو
      toast({
        title: "خطأ في قبول طلب الطعام",
        description: error.response?.data?.detail || "فشل قبول الطلب، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  // قبول طلب من نظام التنسيق (البائع طلب سائق)
  const handleAcceptDriverRequest = async (order) => {
    // منع الضغط المتكرر
    if (processingOrderId === order.id) return;
    
    // فحص التأمين
    if (!securityDepositComplete) {
      toast({
        title: "التأمين غير مكتمل",
        description: "يجب إكمال دفع التأمين قبل قبول الطلبات",
        variant: "destructive"
      });
      return;
    }
    
    setProcessingOrderId(order.id);
    try {
      const res = await axios.post(`${API}/api/food/orders/driver/orders/${order.id}/accept`);
      toast({
        title: "تم القبول! ✅",
        description: `تم إبلاغ المطعم. انتظر حتى يحدد وقت التحضير`
      });
      // إزالة من القائمة
      setDriverRequestedOrders(prev => prev.filter(o => o.id !== order.id));
      fetchOrders();
    } catch (error) {
      toast({
        title: "خطأ في قبول الطلب",
        description: error.response?.data?.detail || "فشل قبول الطلب من المطعم، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  // رفض طلب من نظام التنسيق
  const handleRejectDriverRequest = async (orderId) => {
    try {
      await axios.post(`${API}/api/food/orders/driver/orders/${orderId}/reject`);
      toast({
        title: "تم رفض الطلب",
        description: "سيتم إرساله لسائق آخر"
      });
      setDriverRequestedOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error) {
      toast({
        title: "خطأ في رفض الطلب",
        description: error.response?.data?.detail || "فشل رفض الطلب، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    }
  };

  // بدء التوصيل - محسّنة مع useCallback
  const handleOnTheWay = useCallback(async (orderId, eta = null) => {
    try {
      // التحقق إذا كان طلب طعام أم منتجات
      const allOrders = [...myOrders, ...myFoodOrders];
      const order = allOrders.find(o => o.id === orderId);
      const isFood = order?.store_id || order?.restaurant_name;
      
      const endpoint = isFood 
        ? `${API}/api/food/orders/delivery/${orderId}/on-the-way`
        : `${API}/api/orders/${orderId}/delivery/on-the-way`;
        
      await axios.post(endpoint, {
        estimated_minutes: eta || estimatedTime
      });
      toast({
        title: "تم التحديث",
        description: `تم إعلام العميل أنك في الطريق - الوصول خلال ${eta || estimatedTime} دقيقة`
      });
      setShowETAModal(null);
      setEstimatedTime(30);
      fetchOrders();
    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: error.response?.data?.detail || "فشل إعلام العميل، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    }
  }, [myOrders, myFoodOrders, estimatedTime, toast, fetchOrders]);

  // فتح نافذة إدخال الوقت المتوقع - محسّنة مع useCallback
  const openETAModal = useCallback((orderId) => {
    setShowETAModal(orderId);
    setEstimatedTime(30);
  }, []);

  const handleCompleteOrder = async (orderId, note) => {
    // إذا كان الطلب يحتوي على delivery_code، نفتح نافذة إدخال الكود
    const order = showDeliveryChecklist;
    if (order?.delivery_code && !order?.delivery_code_verified) {
      setShowDeliveryChecklist(null);
      setShowDeliveryCodeModal(order);
      setDeliveryCodeInput('');
      setDeliveryCodeError('');
      return;
    }
    
    // إذا تم التحقق من الكود مسبقاً أو لا يوجد كود، نُكمل التسليم مباشرة
    try {
      await axios.post(`${API}/api/orders/${orderId}/delivery/delivered`);
      toast({
        title: "تم بنجاح",
        description: "تم تسليم الطلب وإضافة أجرتك للمحفظة"
      });
      setShowDeliveryChecklist(null);
      fetchOrders();
      fetchWallet();
    } catch (error) {
      // إذا كان الخطأ بسبب عدم التحقق من الكود
      if (error.response?.data?.detail?.includes('كود التسليم')) {
        const order = (Array.isArray(myOrders) ? myOrders : []).find(o => o.id === orderId);
        if (order) {
          setShowDeliveryChecklist(null);
          setShowDeliveryCodeModal(order);
          setDeliveryCodeInput('');
          setDeliveryCodeError('');
        }
      } else {
        toast({
          title: "خطأ في تسليم الطلب",
          description: error.response?.data?.detail || "فشل تسليم الطلب، يرجى التحقق من كود التسليم",
          variant: "destructive"
        });
      }
    }
  };

  // التحقق من كود التسليم للمنتجات
  const handleVerifyDeliveryCode = async () => {
    if (!deliveryCodeInput || deliveryCodeInput.length !== 4) {
      setDeliveryCodeError('الكود يجب أن يكون 4 أرقام');
      return;
    }
    
    setVerifyingCode(true);
    setDeliveryCodeError('');
    
    try {
      await axios.post(`${API}/api/orders/${showDeliveryCodeModal.id}/delivery/verify-code`, {
        delivery_code: deliveryCodeInput
      });
      toast({
        title: "تم بنجاح ✅",
        description: "تم التحقق من الكود وتسليم الطلب بنجاح"
      });
      setShowDeliveryCodeModal(null);
      setDeliveryCodeInput('');
      fetchOrders();
      fetchWallet();
    } catch (error) {
      setDeliveryCodeError(error.response?.data?.detail || 'كود خاطئ');
    } finally {
      setVerifyingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  if (docStatus === 'not_submitted') {
    navigate('/delivery/documents');
    return null;
  }

  if (docStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-sm">
          <Clock size={48} className="text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">في انتظار الموافقة</h2>
          <p className="text-sm text-gray-500">وثائقك قيد المراجعة من قبل الإدارة</p>
        </div>
      </div>
    );
  }

  if (docStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-sm">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">تم رفض طلبك</h2>
          <p className="text-sm text-gray-500">يرجى التواصل مع الإدارة</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 ${currentTheme === 'dark' ? 'driver-dark' : 'driver-light'}`}>
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header - الاسم والصورة والأيقونات */}
        <div className={`flex items-center justify-between mb-4 p-4 rounded-2xl ${
          currentTheme === 'dark' ? 'driver-card' : 'bg-white shadow-sm border'
        }`}>
          <div className="flex items-center gap-3">
            {/* 📸 صورة السائق الشخصية */}
            {driverProfile?.personal_photo ? (
              <div className="relative">
                <img 
                  src={driverProfile.personal_photo} 
                  alt="صورتك الشخصية"
                  className="w-14 h-14 rounded-full object-cover border-2 border-green-500 shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
              </div>
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-black font-bold text-xl shadow-lg">
                {(user?.full_name || user?.name || 'س').charAt(0)}
              </div>
            )}
            <div>
              <h1 className={`text-lg font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                مرحباً، {driverProfile?.name || user?.full_name || user?.name}
              </h1>
              <div className="flex items-center gap-2">
                <p className={`text-xs ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>موظف توصيل</p>
                {driverProfile?.average_rating > 0 && (
                  <span className={`text-xs flex items-center gap-0.5 ${currentTheme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    ⭐ {driverProfile.average_rating}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* ⭐ زر تبديل الثيم */}
            <button
              onClick={() => {
                const modes = ['auto', 'light', 'dark'];
                const currentIndex = modes.indexOf(themeMode);
                const nextMode = modes[(currentIndex + 1) % modes.length];
                setThemeMode(nextMode);
              }}
              className={`p-2 rounded-xl font-bold text-sm transition-all ${
                currentTheme === 'dark'
                  ? 'bg-[#252525] text-white hover:bg-[#333] border border-[#444]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
              title={`الوضع: ${themeMode === 'auto' ? 'تلقائي' : (themeMode === 'light' ? 'فاتح' : 'داكن')}`}
            >
              {themeMode === 'auto' && '🔄'}
              {themeMode === 'light' && '☀️'}
              {themeMode === 'dark' && '🌙'}
            </button>
            {/* زر إشعارات Push */}
            <PushNotificationButton userType="delivery" size="small" />
            {/* زر تفعيل/إيقاف صوت التنبيه */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl transition-all ${
                currentTheme === 'dark'
                  ? `bg-[#252525] border ${soundEnabled ? 'border-green-500 text-green-500' : 'border-[#444] text-gray-400'}`
                  : `bg-gray-100 border ${soundEnabled ? 'border-green-500 text-green-600' : 'border-gray-300 text-gray-400'}`
              }`}
              title={soundEnabled ? 'الصوت مفعل' : 'الصوت متوقف'}
              data-testid="delivery-sound-toggle-btn"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            {/* زر متاح/مغلق */}
            <button
              onClick={toggleAvailability}
              disabled={isLoadingAvailability}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                isAvailable 
                  ? 'bg-green-500 text-black shadow-lg shadow-green-500/30' 
                  : currentTheme === 'dark'
                    ? 'bg-[#252525] text-gray-400 border border-[#444]'
                    : 'bg-gray-200 text-gray-600'
              } ${isLoadingAvailability ? 'opacity-50' : ''}`}
            >
              {isLoadingAvailability ? '...' : (isAvailable ? '● متاح' : '○ مغلق')}
            </button>
          </div>
        </div>

        {/* التحديات والمكافآت */}
        <DriverChallenges />

        {/* شريط تتبع المسار الذكي */}
        <RouteProgressBar
          myOrders={myOrders}
          myFoodOrders={myFoodOrders}
          isProductsLocked={isProductsLocked}
          productsLockMessage={productsLockMessage}
          theme={currentTheme}
          onRefresh={() => {
            fetchOrders();
            fetchWallet();
          }}
        />

        {/* Tabs - طلبات متاحة و طلباتي فقط */}
        <div className="flex gap-2 mb-3">
          <button
            data-testid="available-orders-tab"
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'available' 
                ? 'bg-green-500 text-black' 
                : currentTheme === 'dark'
                  ? 'bg-[#1a1a1a] text-gray-400 border border-[#333]'
                  : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            طلبات متاحة ({availableOrders.length + availableFoodOrders.length})
          </button>
          <button
            data-testid="my-orders-tab"
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'my' 
                ? 'bg-green-500 text-black' 
                : currentTheme === 'dark'
                  ? 'bg-[#1a1a1a] text-gray-400 border border-[#333]'
                  : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            طلباتي ({myOrders.length + myFoodOrders.length})
          </button>
        </div>

        {/* فلتر نوع الطلبات */}
        {(activeTab === 'available' || activeTab === 'my') && (
          <div className={`flex gap-1 mb-3 p-1 rounded-xl ${
            currentTheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
          }`}>
            <button
              onClick={() => setOrderTypeFilter('all')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                orderTypeFilter === 'all' 
                  ? currentTheme === 'dark'
                    ? 'bg-[#252525] text-white shadow-lg'
                    : 'bg-white text-gray-900 shadow'
                  : currentTheme === 'dark'
                    ? 'text-gray-500'
                    : 'text-gray-500'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setOrderTypeFilter('products')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                orderTypeFilter === 'products' 
                  ? currentTheme === 'dark'
                    ? 'bg-[#252525] text-white shadow-lg'
                    : 'bg-white text-gray-900 shadow'
                  : currentTheme === 'dark'
                    ? 'text-gray-500'
                    : 'text-gray-500'
              }`}
            >
              📦 منتجات
            </button>
            <button
              onClick={() => setOrderTypeFilter('food')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                orderTypeFilter === 'food' 
                  ? currentTheme === 'dark'
                    ? 'bg-[#252525] text-white shadow-lg'
                    : 'bg-white text-gray-900 shadow'
                  : currentTheme === 'dark'
                    ? 'text-gray-500'
                    : 'text-gray-500'
              }`}
            >
              🍔 طعام
            </button>
          </div>
        )}

        {/* Available Orders */}
        {activeTab === 'available' && (
          <>
            {/* بطاقة التأمين - تظهر فقط إذا كان غير مكتمل */}
            {!securityDepositComplete && (
              <SecurityDepositCard 
                onDepositComplete={() => setSecurityDepositComplete(true)}
              />
            )}
            
            {/* رسالة عندما يكون السائق غير متاح */}
            {!isAvailable && (
              <div className={`rounded-2xl p-6 text-center border mb-4 ${
                currentTheme === 'dark' 
                  ? 'bg-red-900/20 border-red-800' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="text-4xl mb-3">🔴</div>
                <h3 className={`font-bold text-lg mb-2 ${
                  currentTheme === 'dark' ? 'text-red-400' : 'text-red-700'
                }`}>
                  أنت غير متاح حالياً
                </h3>
                <p className={`text-sm mb-4 ${
                  currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  لن تظهر لك الطلبات الجديدة ولن تستطيع قبول أي طلب
                </p>
                <button
                  onClick={toggleAvailability}
                  disabled={isLoadingAvailability}
                  className="bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-sm"
                >
                  {isLoadingAvailability ? '...' : '🟢 اضغط لتصبح متاحاً'}
                </button>
              </div>
            )}
            
            {/* الطلبات المتاحة - تظهر فقط عندما يكون السائق متاح */}
            {isAvailable && (
              <>
                {/* طلبات التنسيق الجديدة - البائعين يطلبون سائق */}
                {driverRequestedOrders.length > 0 && (
                  <div className={`mb-6 rounded-2xl overflow-hidden border-2 ${
                    currentTheme === 'dark' ? 'bg-[#1a1a1a] border-orange-500/50' : 'bg-orange-50 border-orange-300'
                  }`}>
                    <div className={`px-4 py-3 ${
                      currentTheme === 'dark' ? 'bg-orange-500/20' : 'bg-orange-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                        <span className={`font-bold ${currentTheme === 'dark' ? 'text-orange-400' : 'text-orange-700'}`}>
                          🔔 طلبات جديدة تنتظر قبولك ({driverRequestedOrders.length})
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${currentTheme === 'dark' ? 'text-orange-300/70' : 'text-orange-600'}`}>
                        مطاعم تطلب سائق لتوصيل طلباتها
                      </p>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      {driverRequestedOrders.map((order) => (
                        <div 
                          key={order.id}
                          className={`rounded-xl p-4 border ${
                            currentTheme === 'dark' ? 'bg-[#252525] border-[#333]' : 'bg-white border-orange-200'
                          }`}
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                #{order.order_number || order.id?.slice(0, 8)}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                currentTheme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700'
                              }`}>
                                طلب سائق
                              </span>
                            </div>
                            <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
                              currentTheme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                            }`}>
                              {order.total?.toLocaleString()} ل.س
                            </span>
                          </div>
                          
                          {/* معلومات المتجر */}
                          <div className={`rounded-lg p-3 mb-3 ${
                            currentTheme === 'dark' ? 'bg-[#1a2e1a] border border-green-900' : 'bg-green-50 border border-green-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                                <Navigation size={12} className="text-white" />
                              </div>
                              <span className={`font-medium text-sm ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {order.store_name}
                              </span>
                            </div>
                            {order.proximity_label && (
                              <div className={`text-xs mt-2 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                                📍 {order.proximity_label} - {order.driver_distance_km} كم ({order.driver_eta_minutes} دقيقة)
                              </div>
                            )}
                          </div>
                          
                          {/* معلومات العميل */}
                          <div className={`rounded-lg p-3 mb-3 ${
                            currentTheme === 'dark' ? 'bg-[#1a1a2e] border border-blue-900' : 'bg-blue-50 border border-blue-200'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                                <MapPin size={12} className="text-white" />
                              </div>
                              <span className={`font-medium text-sm ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {typeof order.delivery_address === 'object' 
                                  ? [order.delivery_address?.area, order.delivery_address?.street, order.delivery_address?.building].filter(Boolean).join(', ') || order.delivery_city
                                  : order.delivery_address}
                              </span>
                            </div>
                            <p className={`text-xs ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                              {order.customer_name} - {order.delivery_city}
                            </p>
                          </div>
                          
                          {/* أزرار القبول والرفض */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptDriverRequest(order)}
                              disabled={processingOrderId === order.id}
                              data-testid={`accept-driver-request-${order.id}`}
                              className={`flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${processingOrderId === order.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                              {processingOrderId === order.id ? '⏳ جاري القبول...' : '✅ قبول التوصيل'}
                            </button>
                            <button
                              onClick={() => handleRejectDriverRequest(order.id)}
                              disabled={processingOrderId === order.id}
                              data-testid={`reject-driver-request-${order.id}`}
                              className={`px-4 py-3 rounded-xl font-bold text-sm ${
                                currentTheme === 'dark' 
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                  : 'bg-red-50 text-red-600 border border-red-200'
                              } ${processingOrderId === order.id ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                              ❌
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <AvailableOrdersList
                  orders={orderTypeFilter === 'food' ? [] : availableOrders}
                  foodOrders={orderTypeFilter === 'products' ? [] : availableFoodOrders}
                  isWorkingHours={() => true}
                  onAcceptProductOrder={handleAcceptProductOrder}
                  onTakeFoodOrder={handleTakeFoodOrder}
                  onAcceptDriverRequest={handleAcceptDriverRequest}
                  orderTypeFilter={orderTypeFilter}
                  theme={currentTheme}
                  onShowRouteForOrder={(order, type) => setShowRouteMapForOrder({ order, type })}
                />
              </>
            )}
          </>
        )}

        {/* My Orders */}
        {activeTab === 'my' && (
          <MyOrdersList
            orders={orderTypeFilter === 'food' ? [] : myOrders}
            foodOrders={orderTypeFilter === 'products' ? [] : myFoodOrders}
            availableOrders={orderTypeFilter === 'food' ? [] : availableOrders}
            availableFoodOrders={orderTypeFilter === 'products' ? [] : availableFoodOrders}
            onStartDelivery={handleOnTheWay}
            onShowDeliveryChecklist={(order) => setShowDeliveryChecklist(order)}
            onOpenETAModal={openETAModal}
            orderTypeFilter={orderTypeFilter}
            theme={currentTheme}
            isProductsLocked={isProductsLocked}
            productsLockMessage={productsLockMessage}
            onRefresh={() => {
              fetchOrders();
              fetchWallet();
            }}
          />
        )}

        {/* Earnings Statistics */}
        {activeTab === 'earnings' && (
          <>
            <EarningsStats theme={currentTheme} />
            
            {/* سجل معاملات المحفظة */}
            <div className={`rounded-2xl p-4 border mt-4 ${
              currentTheme === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-bold flex items-center gap-2 ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <Wallet size={18} className="text-green-500" />
                  سجل المحفظة
                </h3>
                {walletTransactions.length > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 bg-red-500/10 px-2 py-1 rounded-lg"
                  >
                    <Trash2 size={12} />
                    حذف
                  </button>
                )}
              </div>
              
              {walletTransactions.length === 0 ? (
                <div className={`text-center py-6 rounded-xl ${currentTheme === 'dark' ? 'bg-[#252525]' : 'bg-gray-50'}`}>
                  <p className={currentTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}>لا توجد معاملات</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {walletTransactions.slice(0, 10).map((tx) => (
                    <div key={tx.id} className={`rounded-lg p-3 flex items-center justify-between ${
                      currentTheme === 'dark' ? 'bg-[#252525]' : 'bg-gray-50'
                    }`}>
                      <div>
                        <p className={`text-xs ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{tx.description}</p>
                        <p className={`text-[10px] ${currentTheme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(tx.created_at).toLocaleDateString('ar-SY')}
                        </p>
                      </div>
                      <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount?.toLocaleString()} ل.س
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className={`text-[10px] mt-2 text-center ${currentTheme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`}>
                السجلات الأقدم من 3 أشهر تُحذف تلقائياً
              </p>
            </div>
            
            {/* قسم الاستقالة */}
            <ResignationSection theme={currentTheme} />
            
            {/* زر تسجيل الخروج */}
            <div className="mt-4">
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                  toast({ title: 'تم تسجيل الخروج', description: 'نراك قريباً!' });
                }}
                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  currentTheme === 'dark'
                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
                data-testid="delivery-logout-btn"
              >
                <LogOut size={18} />
                تسجيل الخروج
              </button>
            </div>
          </>
        )}

        {/* Achievements */}
        {activeTab === 'achievements' && (
          <DriverAchievements />
        )}
      </div>

      {/* ETA Modal - نافذة الوقت المتوقع */}
      {showETAModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Clock size={24} />
                الوقت المتوقع للوصول
              </h3>
              <p className="text-sm text-white/80">حدد المدة المتوقعة للوصول للعميل</p>
            </div>
            
            <div className="p-4">
              {/* خيارات سريعة */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[15, 20, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setEstimatedTime(mins)}
                    className={`py-3 rounded-xl font-bold text-sm transition-all ${
                      estimatedTime === mins
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {mins} د
                  </button>
                ))}
              </div>

              {/* إدخال مخصص */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  أو أدخل وقت مخصص (بالدقائق)
                </label>
                <input
                  type="number"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 30)}
                  min="5"
                  max="120"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-center text-xl font-bold"
                />
              </div>

              {/* أزرار */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowETAModal(null)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-700"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleOnTheWay(showETAModal, estimatedTime)}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Navigation size={18} />
                  انطلق
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Pickup Checklist Modal */}
      {showPickupChecklist && (
        <PickupChecklist
          order={showPickupChecklist}
          onComplete={() => handleTakeOrder(showPickupChecklist.id)}
          onClose={() => setShowPickupChecklist(null)}
        />
      )}

      {/* Delivery Checklist Modal */}
      {showDeliveryChecklist && (
        <DeliveryChecklist
          order={showDeliveryChecklist}
          onComplete={(note) => handleCompleteOrder(showDeliveryChecklist.id, note)}
          onClose={() => setShowDeliveryChecklist(null)}
        />
      )}

      {/* Delivery Code Modal - نافذة إدخال كود التسليم للمنتجات */}
      {showDeliveryCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-sm rounded-2xl overflow-hidden ${
              currentTheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white text-center">
              <span className="text-3xl mb-2 block">🔐</span>
              <h3 className="text-lg font-bold">كود التسليم</h3>
              <p className="text-sm text-white/80 mt-1">اطلب الكود من العميل</p>
            </div>
            
            {/* Content */}
            <div className="p-4">
              <p className={`text-sm text-center mb-4 ${
                currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                طلب #{showDeliveryCodeModal.id?.slice(0, 8).toUpperCase()}
              </p>
              
              {/* Code Input */}
              <div className="flex justify-center gap-2 mb-4">
                {[0, 1, 2, 3].map((position) => (
                  <input
                    key={`code-input-${position}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={deliveryCodeInput[position] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const newCode = deliveryCodeInput.split('');
                      newCode[position] = val;
                      setDeliveryCodeInput(newCode.join('').slice(0, 4));
                      setDeliveryCodeError('');
                      // الانتقال للحقل التالي
                      if (val && index < 3) {
                        document.getElementById(`shop-code-${index + 1}`)?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !deliveryCodeInput[index] && index > 0) {
                        document.getElementById(`shop-code-${index - 1}`)?.focus();
                      }
                    }}
                    id={`shop-code-${index}`}
                    className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 focus:outline-none focus:ring-2 ${
                      currentTheme === 'dark' 
                        ? 'bg-[#252525] border-gray-600 text-white focus:border-purple-500 focus:ring-purple-500/30' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500 focus:ring-purple-500/30'
                    }`}
                  />
                ))}
              </div>
              
              {/* Error */}
              {deliveryCodeError && (
                <p className="text-red-500 text-sm text-center mb-3">{deliveryCodeError}</p>
              )}
              
              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDeliveryCodeModal(null);
                    setDeliveryCodeInput('');
                    setDeliveryCodeError('');
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 text-gray-300' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleVerifyDeliveryCode}
                  disabled={verifyingCode || deliveryCodeInput.length !== 4}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {verifyingCode ? 'جاري التحقق...' : 'تأكيد التسليم'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Return Checklist Modal */}
      {showReturnChecklist && (
        <ReturnChecklist
          order={showReturnChecklist}
          onComplete={(reason) => {
            logger.log('Return reason:', reason);
            setShowReturnChecklist(null);
            toast({
              title: "تم تسجيل الإرجاع",
              description: "سيتم مراجعة طلب الإرجاع"
            });
          }}
          onClose={() => setShowReturnChecklist(null)}
        />
      )}

      {/* Popup طلب تفعيل الإشعارات */}
      <PushNotificationPrompt 
        userType="delivery" 
        userName={user?.full_name || 'سائق التوصيل'} 
      />

      {/* Route Map Modal - عرض مسار طلب معين */}
      {showRouteMapForOrder && (
        <RouteMapModal
          order={showRouteMapForOrder.order}
          orderType={showRouteMapForOrder.type}
          onClose={() => setShowRouteMapForOrder(null)}
          theme={currentTheme}
        />
      )}

      {/* Modal تأكيد حذف السجلات */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div 
            className={`rounded-2xl p-6 w-full max-w-sm ${currentTheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-3">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h2 className={`text-lg font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>حذف سجلات المحفظة</h2>
              <p className={`text-sm mt-2 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                هل أنت متأكد من حذف جميع سجلات المعاملات؟
              </p>
              <p className="text-xs text-green-500 mt-2 bg-green-500/10 rounded-lg p-2">
                ✓ الرصيد الحالي لن يتغير
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className={`flex-1 py-3 rounded-xl font-bold ${currentTheme === 'dark' ? 'bg-[#252525] text-gray-300' : 'bg-gray-100 text-gray-700'}`}
              >
                إلغاء
              </button>
              <button
                onClick={handleClearTransactions}
                disabled={deletingTransactions}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingTransactions ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DeliveryDashboard;
