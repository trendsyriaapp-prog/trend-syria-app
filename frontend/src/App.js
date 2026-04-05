import "./App.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { FoodCartProvider } from "./context/FoodCartContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { ScrollProvider } from "./context/ScrollContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { WebSocketProvider } from "./context/WebSocketContext";
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
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// Pages
import HomeRouter from "./pages/HomeRouter";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CategoriesPage from "./pages/CategoriesPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import MessagesPage from "./pages/MessagesPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import { SellerDocumentsPage, SellerDashboardPage } from "./pages/SellerPages";
import { DeliveryDocuments, DeliveryDashboard } from "./pages/DeliveryPages";
import AdminDashboardPage from "./pages/AdminPage";
import StorePage from "./pages/StorePage";
import FollowingPage from "./pages/FollowingPage";
import FavoritesPage from "./pages/FavoritesPage";
import SettingsPage from "./pages/SettingsPage";
import WalletPage from "./pages/WalletPage";
import { PrivacyPolicyPage, TermsOfServicePage, ReturnPolicyPage } from "./pages/LegalPages";
import AboutPage from "./pages/AboutPage";
import PackagingGuidePage from "./pages/PackagingGuidePage";
import JoinAsSellerPage from "./pages/JoinAsSellerPage";
import JoinAsDeliveryPage from "./pages/JoinAsDeliveryPage";
import FoodPage from "./pages/FoodPage";
import FoodFreeDeliveryPage from "./pages/FoodFreeDeliveryPage";
import JoinAsFoodSellerPage from "./pages/JoinAsFoodSellerPage";
import FoodStoreDashboard from "./pages/FoodStoreDashboard";
import FoodStorePage from "./pages/FoodStorePage";
import FoodCartPage from "./pages/FoodCartPage";
import FoodMyCartPage from "./pages/FoodMyCartPage";
import FoodBatchCheckoutPage from "./pages/FoodBatchCheckoutPage";
import FoodBatchSuccessPage from "./pages/FoodBatchSuccessPage";
import FoodOrderTracking from "./pages/FoodOrderTracking";
import AllFoodStoresPage from "./pages/AllFoodStoresPage";
import ReferralsPage from "./pages/ReferralsPage";
import GiftsPage from "./pages/GiftsPage";
import DeliveryMapPage from "./pages/DeliveryMapPage";
import ChatPage from "./pages/ChatPage";
import ErrorBoundary from "./components/ErrorBoundary";

// Section Pages
import SponsoredProductsPage from "./pages/SponsoredProductsPage";
import FlashSaleProductsPage from "./pages/FlashSaleProductsPage";
import FreeShippingProductsPage from "./pages/FreeShippingProductsPage";
import BestSellersPage from "./pages/BestSellersPage";
import NewArrivalsPage from "./pages/NewArrivalsPage";
import AllProductsPage from "./pages/AllProductsPage";
import BuyerWalletPage from "./pages/BuyerWalletPage";

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
      const mainPages = ['/', '/home'];
      
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
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ErrorBoundary>
    <ThemeProvider>
      <LanguageProvider>
        <SettingsProvider>
          <AuthProvider>
            <CartProvider>
              <FoodCartProvider>
              <WebSocketProvider>
              {/* شاشة البداية */}
              {showSplash && (
                <SplashScreen onComplete={() => setShowSplash(false)} />
              )}
              <BrowserRouter>
                <ErrorBoundary>
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
                <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                
                {/* Delivery Routes */}
                <Route path="/delivery" element={<Navigate to="/delivery/dashboard" replace />} />
                <Route path="/delivery/documents" element={<DeliveryDocuments />} />
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
          </ErrorBoundary>
        </BrowserRouter>
        </WebSocketProvider>
        </FoodCartProvider>
      </CartProvider>
    </AuthProvider>
  </SettingsProvider>
  </LanguageProvider>
  </ThemeProvider>
  </ErrorBoundary>
  );
}

export default App;
