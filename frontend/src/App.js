import "./App.css";
import logger from './lib/logger';
import { useState, useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { FoodCartProvider } from "./context/FoodCartContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { ScrollProvider } from "./context/ScrollContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { WebSocketProvider } from "./context/WebSocketContext";
import { DataProvider } from "./context/DataContext";
import { Toaster } from "./components/ui/toaster";
import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import Chatbot from "./components/Chatbot";
import NotificationManager from "./components/NotificationManager";
import PushNotificationPrompt from "./components/PushNotificationPrompt";
import FoodDeliveryBanner from "./components/FoodDeliveryBanner";
import FreeShippingFloatingBanner from "./components/FreeShippingFloatingBanner";
import SplashScreen from "./components/SplashScreen";
import ChangePasswordModal from "./components/ChangePasswordModal";
import IncomingCallHandler from "./components/voip/IncomingCallHandler";
import FeedbackButton from "./components/FeedbackButton";
import ErrorBoundary from "./components/ErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";
import { initDB } from "./lib/offlineDB";
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Loader2 } from 'lucide-react';

// تهيئة قاعدة البيانات المحلية عند بدء التطبيق
initDB().then(() => logger.log('✅ Offline DB ready')).catch(logger.error);

// مكون تحميل للـ Lazy Loading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
  </div>
);

// تحميل مسبق للصفحات المهمة (Prefetch)
const prefetchPage = (importFn) => {
  // تأخير قليل لعدم التأثير على الصفحة الحالية
  setTimeout(() => {
    importFn().catch(() => {});
  }, 1000);
};

// Prefetch الصفحات الشائعة بعد تحميل التطبيق
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // تحميل صفحات التسجيل والبائع مسبقاً
    setTimeout(() => {
      import("./pages/SellerPages").catch(() => {});
      import("./pages/DeliveryPages").catch(() => {});
    }, 2000);
  });
}

// ==========================================
// الصفحات الأساسية (تُحمّل مباشرة - الأكثر استخداماً)
// ==========================================
import HomeRouter from "./pages/HomeRouter";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CategoriesPage from "./pages/CategoriesPage";
import CartPage from "./pages/CartPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";

// ==========================================
// صفحات ثانوية (Lazy Loading)
// ==========================================
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const OrderTrackingPage = lazy(() => import("./pages/OrderTrackingPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const StorePage = lazy(() => import("./pages/StorePage"));
const FollowingPage = lazy(() => import("./pages/FollowingPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));

// صفحات قانونية
const LegalPages = lazy(() => import("./pages/LegalPages"));
const PrivacyPolicyPage = lazy(() => import("./pages/LegalPages").then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import("./pages/LegalPages").then(m => ({ default: m.TermsOfServicePage })));
const ReturnPolicyPage = lazy(() => import("./pages/LegalPages").then(m => ({ default: m.ReturnPolicyPage })));

// ==========================================
// الصفحات الثقيلة (Lazy Loading)
// ==========================================

// صفحات البائعين
const SellerPagesModule = lazy(() => import("./pages/SellerPages"));
const SellerDocumentsPage = lazy(() => import("./pages/SellerPages").then(m => ({ default: m.SellerDocumentsPage })));
const SellerDashboardPage = lazy(() => import("./pages/SellerPages").then(m => ({ default: m.SellerDashboardPage })));
const SellerPendingApproval = lazy(() => import("./pages/SellerPages").then(m => ({ default: m.SellerPendingApproval })));

// صفحات التوصيل
const DeliveryDocuments = lazy(() => import("./pages/DeliveryPages").then(m => ({ default: m.DeliveryDocuments })));
const DeliveryDashboard = lazy(() => import("./pages/DeliveryPages").then(m => ({ default: m.DeliveryDashboard })));
const DeliveryPendingApproval = lazy(() => import("./pages/DeliveryPages").then(m => ({ default: m.DeliveryPendingApproval })));

// صفحة الإدارة (الأكبر)
const AdminDashboardPage = lazy(() => import("./pages/AdminPage"));

// صفحات الطعام
const FoodPage = lazy(() => import("./pages/FoodPage"));
const FoodStoreDashboard = lazy(() => import("./pages/FoodStoreDashboard"));
const FoodStorePage = lazy(() => import("./pages/FoodStorePage"));
const FoodCartPage = lazy(() => import("./pages/FoodCartPage"));
const FoodMyCartPage = lazy(() => import("./pages/FoodMyCartPage"));
const FoodBatchCheckoutPage = lazy(() => import("./pages/FoodBatchCheckoutPage"));
const FoodBatchSuccessPage = lazy(() => import("./pages/FoodBatchSuccessPage"));
const FoodOrderTracking = lazy(() => import("./pages/FoodOrderTracking"));
const AllFoodStoresPage = lazy(() => import("./pages/AllFoodStoresPage"));
const FoodFreeDeliveryPage = lazy(() => import("./pages/FoodFreeDeliveryPage"));
const JoinAsFoodSellerPage = lazy(() => import("./pages/JoinAsFoodSellerPage"));

// صفحات أخرى
const PackagingGuidePage = lazy(() => import("./pages/PackagingGuidePage"));
const JoinAsSellerPage = lazy(() => import("./pages/JoinAsSellerPage"));
const JoinAsDeliveryPage = lazy(() => import("./pages/JoinAsDeliveryPage"));
const ReferralsPage = lazy(() => import("./pages/ReferralsPage"));
const GiftsPage = lazy(() => import("./pages/GiftsPage"));
const DeliveryMapPage = lazy(() => import("./pages/DeliveryMapPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));

// Section Pages
const SponsoredProductsPage = lazy(() => import("./pages/SponsoredProductsPage"));
const FlashSaleProductsPage = lazy(() => import("./pages/FlashSaleProductsPage"));
const FreeShippingProductsPage = lazy(() => import("./pages/FreeShippingProductsPage"));
const BestSellersPage = lazy(() => import("./pages/BestSellersPage"));
const NewArrivalsPage = lazy(() => import("./pages/NewArrivalsPage"));
const AllProductsPage = lazy(() => import("./pages/AllProductsPage"));
const BuyerWalletPage = lazy(() => import("./pages/BuyerWalletPage"));
const DeleteAccountPage = lazy(() => import("./pages/DeleteAccountPage"));

// مكون حماية صفحات الطعام
const FoodRoute = ({ children }) => {
  const { isFeatureEnabled, loading } = useSettings();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }
  
  if (!isFeatureEnabled('food_enabled')) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// مكون التحقق من إغلاق المنصة
const PlatformClosedCheck = ({ children }) => {
  const { user } = useAuth();
  const { platformSettings, loading } = useSettings();
  
  if (loading) return children;
  
  // التحقق من إغلاق المنصة للعملاء
  if (user?.user_type === 'buyer' && platformSettings?.platform_closed_for_customers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">المنصة مغلقة مؤقتاً</h1>
          <p className="text-gray-600 mb-6">{platformSettings?.platform_closed_message || 'سنعود قريباً!'}</p>
          <div className="text-sm text-gray-400">ترند سوريا</div>
        </div>
      </div>
    );
  }
  
  // التحقق من إغلاق المنصة للبائعين
  if ((user?.user_type === 'seller' || user?.user_type === 'food_seller') && platformSettings?.platform_closed_for_sellers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔧</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">صيانة المنصة</h1>
          <p className="text-gray-600 mb-6">{platformSettings?.platform_closed_message_sellers || 'المنصة مغلقة للبائعين مؤقتاً للصيانة'}</p>
          <div className="text-sm text-gray-400">ترند سوريا</div>
        </div>
      </div>
    );
  }
  
  return children;
};

// مكون لعرض نافذة تغيير كلمة المرور الإجبارية
const ForcePasswordChangeWrapper = ({ children }) => {
  const { user, forcePasswordChange, setForcePasswordChange } = useAuth();
  
  // عرض النافذة فقط إذا كان المستخدم مسجل وكلمة المرور تحتاج تغيير
  if (user && forcePasswordChange) {
    return (
      <>
        {children}
        <ChangePasswordModal 
          isOpen={true} 
          onClose={() => setForcePasswordChange(false)}
          isForced={true}
        />
      </>
    );
  }
  
  return children;
};

// مكون عرض إشعارات Push للعملاء
const BuyerNotificationPrompt = () => {
  const { user } = useAuth();
  
  // عرض فقط للعملاء (buyer)
  if (!user || user.user_type !== 'buyer') return null;
  
  return <PushNotificationPrompt userType="buyer" userName={user.name || user.full_name} />;
};

// مكون معالج زر الرجوع في الأندرويد
const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // فقط في بيئة الأندرويد/iOS
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = ({ canGoBack }) => {
      // الصفحات الرئيسية التي يجب الخروج منها عند الضغط على الرجوع
      // كل نوع مستخدم له صفحة رئيسية خاصة به
      const mainPages = [
        '/', '/home',                    // العميل
        '/admin',                        // المدير
        '/seller/dashboard',             // البائع
        '/food/dashboard',               // بائع الطعام
        '/delivery/dashboard'            // موظف التوصيل
      ];
      
      // الصفحات الفرعية الرئيسية (المستوى الأول)
      const firstLevelPages = ['/products', '/food', '/categories', '/cart', '/orders', '/settings', '/favorites', '/following', '/messages', '/wallet', '/my-wallet', '/gifts', '/referrals'];
      
      const currentPath = location.pathname;
      
      if (mainPages.includes(currentPath)) {
        // في الصفحة الرئيسية - الخروج من التطبيق
        CapacitorApp.exitApp();
      } else if (firstLevelPages.includes(currentPath)) {
        // في صفحة فرعية من المستوى الأول - الرجوع للصفحة الرئيسية
        navigate('/', { replace: true });
      } else {
        // في صفحة أعمق (منتج، متجر، تفاصيل طلب، الخ)
        // نتحقق إذا كان هناك تاريخ للرجوع
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          // إذا لم يكن هناك تاريخ، نرجع للصفحة الرئيسية
          navigate('/', { replace: true });
        }
      }
    };

    // الاستماع لحدث زر الرجوع
    CapacitorApp.addListener('backButton', handleBackButton);

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, [navigate, location.pathname]);
  
  return null;
};

function App() {
  // التحقق إذا تم عرض الـ Splash سابقاً
  const hasSeenSplash = sessionStorage.getItem('hasSeenSplash') === 'true';
  const [showSplash, setShowSplash] = useState(!hasSeenSplash);

  // إضافة class للـ body حسب المنصة (Android/iOS/Web)
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      document.body.classList.add('capacitor-android');
    } else if (platform === 'ios') {
      document.body.classList.add('capacitor-ios');
    } else {
      document.body.classList.add('capacitor-web');
    }
  }, []);

  // معالجة حالة التطبيق (الخروج والعودة)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleAppStateChange = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // التطبيق عاد للواجهة - لا نعرض الـ Splash مرة أخرى
        logger.log('App resumed - skipping splash');
        sessionStorage.setItem('hasSeenSplash', 'true');
      }
    });

    return () => {
      handleAppStateChange.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <LanguageProvider>
        <SettingsProvider>
          <AuthProvider>
            <DataProvider>
            <CartProvider>
              <FoodCartProvider>
              <WebSocketProvider>
              {/* شاشة البداية */}
              {showSplash && (
                <SplashScreen onComplete={() => setShowSplash(false)} />
              )}
              {/* مؤشر حالة الاتصال */}
              <NetworkStatus />
              <BrowserRouter>
                <ScrollProvider>
                <BackButtonHandler />
                <ForcePasswordChangeWrapper>
                <PlatformClosedCheck>
                <div className="App min-h-screen bg-[#050505] dark:bg-gray-900 transition-colors">
                  <Header />
                  <FoodDeliveryBanner />
                  {/* معالج المكالمات الواردة */}
                  <IncomingCallHandler />
              <main className="pb-16 md:pb-0">
              <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomeRouter />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/sponsored" element={<SponsoredProductsPage />} />
                <Route path="/products/flash-sale" element={<FlashSaleProductsPage />} />
                <Route path="/products/free-shipping" element={<FreeShippingProductsPage />} />
                <Route path="/products/best-sellers" element={<BestSellersPage />} />
                <Route path="/products/new-arrivals" element={<NewArrivalsPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/category/all" element={<AllProductsPage />} />
                <Route path="/store/:sellerId" element={<StorePage />} />
                
                {/* Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                
                {/* Buyer Routes */}
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:orderId/tracking" element={<OrderTrackingPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/messages/:userId" element={<MessagesPage />} />
                <Route path="/following" element={<FollowingPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/gifts" element={<GiftsPage />} />
                <Route path="/my-wallet" element={<BuyerWalletPage />} />
                
                {/* Seller Routes */}
                <Route path="/seller/documents" element={<SellerDocumentsPage />} />
                <Route path="/seller/pending" element={<SellerPendingApproval />} />
                <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                
                {/* Delivery Routes */}
                <Route path="/delivery" element={<Navigate to="/delivery/dashboard" replace />} />
                <Route path="/delivery/documents" element={<DeliveryDocuments />} />
                <Route path="/delivery/pending" element={<DeliveryPendingApproval />} />
                <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
                <Route path="/delivery/map" element={<DeliveryMapPage />} />
                
                {/* Chat Route */}
                <Route path="/chat/:orderId" element={<ChatPage />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboardPage />} />
                
                {/* Legal Pages */}
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/returns" element={<ReturnPolicyPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/packaging-guide" element={<PackagingGuidePage />} />
                <Route path="/delete-account" element={<DeleteAccountPage />} />
                
                {/* Landing Pages */}
                <Route path="/join/seller" element={<JoinAsSellerPage />} />
                <Route path="/join/delivery" element={<JoinAsDeliveryPage />} />
                
                {/* Food Delivery Routes - محمية */}
                <Route path="/food" element={<FoodRoute><FoodPage /></FoodRoute>} />
                <Route path="/food/stores" element={<FoodRoute><AllFoodStoresPage /></FoodRoute>} />
                <Route path="/food/free-delivery" element={<FoodRoute><FoodFreeDeliveryPage /></FoodRoute>} />
                <Route path="/join/food-seller" element={<FoodRoute><JoinAsFoodSellerPage /></FoodRoute>} />
                <Route path="/food/dashboard" element={<FoodRoute><FoodStoreDashboard /></FoodRoute>} />
                <Route path="/food/store/:storeId" element={<FoodRoute><FoodStorePage /></FoodRoute>} />
                <Route path="/food/cart/:storeId" element={<FoodRoute><FoodCartPage /></FoodRoute>} />
                <Route path="/food/my-cart" element={<FoodRoute><FoodMyCartPage /></FoodRoute>} />
                <Route path="/food/batch-checkout" element={<FoodRoute><FoodBatchCheckoutPage /></FoodRoute>} />
                <Route path="/food/batch-success" element={<FoodRoute><FoodBatchSuccessPage /></FoodRoute>} />
                <Route path="/food/order/:orderId" element={<FoodRoute><FoodOrderTracking /></FoodRoute>} />
                
                {/* Referrals */}
                <Route path="/referrals" element={<ReferralsPage />} />
              </Routes>
              </Suspense>
            </main>
            <MobileNav />
            <Toaster />
            <Chatbot />
            <NotificationManager />
            <BuyerNotificationPrompt />
            <FreeShippingFloatingBanner />
            <FeedbackButton />
          </div>
          </PlatformClosedCheck>
          </ForcePasswordChangeWrapper>
          </ScrollProvider>
        </BrowserRouter>
        </WebSocketProvider>
        </FoodCartProvider>
      </CartProvider>
      </DataProvider>
    </AuthProvider>
  </SettingsProvider>
  </LanguageProvider>
  </ThemeProvider>
  </ErrorBoundary>
  );
}

export default App;
