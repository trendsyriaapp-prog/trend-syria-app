import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { Toaster } from "./components/ui/toaster";
import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import FreeShippingBanner from "./components/FreeShippingBanner";

// Pages
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import CategoriesPage from "./pages/CategoriesPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import MessagesPage from "./pages/MessagesPage";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { SellerDocumentsPage, SellerDashboardPage } from "./pages/SellerPages";
import { DeliveryDocuments, DeliveryDashboard } from "./pages/DeliveryPages";
import AdminDashboardPage from "./pages/AdminPage";
import StorePage from "./pages/StorePage";
import FollowingPage from "./pages/FollowingPage";
import FavoritesPage from "./pages/FavoritesPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <div className="App min-h-screen bg-[#050505]">
            <FreeShippingBanner />
            <Header />
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
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/messages/:userId" element={<MessagesPage />} />
                <Route path="/following" element={<FollowingPage />} />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                
                {/* Seller Routes */}
                <Route path="/seller/documents" element={<SellerDocumentsPage />} />
                <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
                
                {/* Delivery Routes */}
                <Route path="/delivery/documents" element={<DeliveryDocuments />} />
                <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminDashboardPage />} />
              </Routes>
            </main>
            <MobileNav />
            <Toaster />
          </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
