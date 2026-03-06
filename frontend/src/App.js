import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ScrollProvider } from "./context/ScrollContext";
import { Toaster } from "./components/ui/toaster";
import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import FreeShippingBanner from "./components/FreeShippingBanner";
import Chatbot from "./components/Chatbot";

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

function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <ScrollProvider>
            <div className="App min-h-screen bg-[#050505]">
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
                
                {/* Food Delivery Routes */}
                <Route path="/food" element={<FoodPage />} />
                <Route path="/join/food-seller" element={<JoinAsFoodSellerPage />} />
                <Route path="/food/dashboard" element={<FoodStoreDashboard />} />
                <Route path="/food/store/:storeId" element={<FoodStorePage />} />
                <Route path="/food/cart/:storeId" element={<FoodCartPage />} />
                <Route path="/food/order/:orderId" element={<FoodOrderTracking />} />
              </Routes>
            </main>
            <MobileNav />
            <Toaster />
            <Chatbot />
          </div>
          </ScrollProvider>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  </SettingsProvider>
  );
}

export default App;
