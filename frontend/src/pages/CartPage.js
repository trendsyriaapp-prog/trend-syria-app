import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const CartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, updateQuantity, removeFromCart, loading } = useCart();
  const { toast } = useToast();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShoppingBag size={64} className="text-white/20 mb-4" />
        <h2 className="text-xl font-bold mb-2">سجل دخولك أولاً</h2>
        <p className="text-white/50 mb-6">لعرض سلة التسوق الخاصة بك</p>
        <Link
          to="/login"
          className="bg-[#FF6B00] text-black font-bold px-6 py-3 rounded-full hover:bg-[#E65000] transition-colors"
          data-testid="login-to-cart-btn"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShoppingBag size={64} className="text-white/20 mb-4" />
        <h2 className="text-xl font-bold mb-2">سلتك فارغة</h2>
        <p className="text-white/50 mb-6">ابدأ بإضافة منتجات لسلتك</p>
        <Link
          to="/products"
          className="bg-[#FF6B00] text-black font-bold px-6 py-3 rounded-full hover:bg-[#E65000] transition-colors"
          data-testid="browse-products-btn"
        >
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-10">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">سلة التسوق</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="md:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <motion.div
                key={item.product_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#121212] rounded-xl p-4 border border-white/5"
                data-testid={`cart-item-${item.product_id}`}
              >
                <div className="flex gap-4">
                  <Link to={`/product/${item.product_id}`} className="flex-shrink-0">
                    <img
                      src={item.product?.images?.[0] || 'https://via.placeholder.com/100'}
                      alt={item.product?.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/product/${item.product_id}`}
                      className="font-bold hover:text-[#FF6B00] transition-colors line-clamp-2"
                    >
                      {item.product?.name}
                    </Link>
                    <p className="text-[#FF6B00] font-bold mt-1">
                      {formatPrice(item.product?.price)}
                    </p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2 bg-[#0A0A0A] rounded-full p-1">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                          data-testid={`decrease-${item.product_id}`}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                          data-testid={`increase-${item.product_id}`}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                        data-testid={`remove-${item.product_id}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-left text-sm text-white/50 mt-2 pt-2 border-t border-white/5">
                  المجموع: <span className="text-white font-bold">{formatPrice(item.item_total)}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Summary */}
          <div className="md:col-span-1">
            <div className="bg-[#121212] rounded-xl p-6 border border-white/5 sticky top-24">
              <h3 className="font-bold mb-4">ملخص الطلب</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-white/70">
                  <span>المجموع الفرعي</span>
                  <span>{formatPrice(cart.total)}</span>
                </div>
                <div className="flex justify-between text-white/70">
                  <span>التوصيل</span>
                  <span className="text-green-500">مجاني</span>
                </div>
              </div>
              
              <div className="flex justify-between font-bold text-lg pt-4 border-t border-white/10">
                <span>الإجمالي</span>
                <span className="text-[#FF6B00]">{formatPrice(cart.total)}</span>
              </div>

              <Link
                to="/checkout"
                className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] text-black font-bold py-3 rounded-full mt-6 hover:bg-[#E65000] transition-colors"
                data-testid="checkout-btn"
              >
                إتمام الشراء
                <ArrowLeft size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
