import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { SettingsProvider, useSettings } from "./context/SettingsContext";
import { ScrollProvider } from "./context/ScrollContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { Toaster } from "./components/ui/toaster";
import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import FreeShippingBanner from "./components/FreeShippingBanner";
import Chatbot from "./components/Chatbot";
import NotificationManager from "./components/NotificationManager";

// Pages
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
import { SellerDocumentsPage, SellerDashboardPage } from "./pages/SellerPages";
import { DeliveryDocuments, DeliveryDashboard } from "./pages/DeliveryPages";
import AdminDashboardPage from "./pages/AdminPage";
import StorePage from "./pages/StorePage";
import FollowingPage from "./pages/FollowingPage";
import FavoritesPage from "./pages/FavoritesPage";
import SettingsPage from "./pages/SettingsPage";
import WalletPage from "./pages/WalletPage";
import { PrivacyPolicyPage, TermsOfServicePage, ReturnPolicyPage } from "./pages/LegalPages";
import PackagingGuidePage from "./pages/PackagingGuidePage";
import JoinAsSellerPage from "./pages/JoinAsSellerPage";
import JoinAsDeliveryPage from "./pages/JoinAsDeliveryPage";
import FoodPage from "./pages/FoodPage";
import JoinAsFoodSellerPage from "./pages/JoinAsFoodSellerPage";
import FoodStoreDashboard from "./pages/FoodStoreDashboard";
import FoodStorePage from "./pages/FoodStorePage";
import FoodCartPage from "./pages/FoodCartPage";
import FoodOrderTracking from "./pages/FoodOrderTracking";
import ReferralsPage from "./pages/ReferralsPage";
import GiftsPage from "./pages/GiftsPage";

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

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <SettingsProvider>
          <AuthProvider>
            <CartProvider>
              <BrowserRouter>
                <ScrollProvider>
                <div className="App min-h-screen bg-[#050505] dark:bg-gray-900 transition-colors">
                  <Header />
                <FreeShippingBanner />
              <main className="pb-16 md:pb-0">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/store/:sellerId" element={<StorePage />} />
                
                {/* Auth Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
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
                
                {/* Seller Routes */}
                <Route path="/seller/documents" element={<SellerDocumentsPage />} />
                <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
                <Route path="/wallet" element={<WalletPage />} />
                
                {/* Delivery Routes */}
                <Route path="/delivery/documents" element={<DeliveryDocuments />} />
                <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboardPage />} />
                
                {/* Legal Pages */}
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/returns" element={<ReturnPolicyPage />} />
                <Route path="/packaging-guide" element={<PackagingGuidePage />} />
                
                {/* Landing Pages */}
                <Route path="/join/seller" element={<JoinAsSellerPage />} />
                <Route path="/join/delivery" element={<JoinAsDeliveryPage />} />
                
                {/* Food Delivery Routes - محمية */}
                <Route path="/food" element={<FoodRoute><FoodPage /></FoodRoute>} />
                <Route path="/join/food-seller" element={<FoodRoute><JoinAsFoodSellerPage /></FoodRoute>} />
                <Route path="/food/dashboard" element={<FoodRoute><FoodStoreDashboard /></FoodRoute>} />
                <Route path="/food/store/:storeId" element={<FoodRoute><FoodStorePage /></FoodRoute>} />
                <Route path="/food/cart/:storeId" element={<FoodRoute><FoodCartPage /></FoodRoute>} />
                <Route path="/food/order/:orderId" element={<FoodRoute><FoodOrderTracking /></FoodRoute>} />
                
                {/* Referrals */}
                <Route path="/referrals" element={<ReferralsPage />} />
              </Routes>
            </main>
            <MobileNav />
            <Toaster />
            <Chatbot />
            <NotificationManager />
          </div>
          </ScrollProvider>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  </SettingsProvider>
  </LanguageProvider>
  </ThemeProvider>
  );
}

export default App;
