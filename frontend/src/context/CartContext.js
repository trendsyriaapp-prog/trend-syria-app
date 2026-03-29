import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      fetchCart();
    } else {
      setCart({ items: [], total: 0 });
    }
  }, [user, token]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/cart`);
      setCart({
        items: res.data?.items || [],
        total: res.data?.total || 0
      });
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCart({ items: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1, selectedSize = null, selectedWeight = null) => {
    try {
      await axios.post(`${API}/api/cart/add`, { 
        product_id: productId, 
        quantity,
        selected_size: selectedSize,
        selected_weight: selectedWeight
      });
      // جلب السلة وإرجاع البيانات الجديدة
      const res = await axios.get(`${API}/api/cart`);
      const newCart = {...res.data};
      setCart(newCart);
      
      // إطلاق event لإعلام المكونات الأخرى
      window.dispatchEvent(new CustomEvent('cart-updated', {
        detail: { total: newCart.total, itemsCount: newCart.items?.length || 0 }
      }));
      
      return newCart; // إرجاع السلة الجديدة
    } catch (error) {
      throw error;
    }
  };

  const updateQuantity = async (productId, quantity, selectedSize = null, selectedWeight = null) => {
    try {
      await axios.put(`${API}/api/cart/update`, { 
        product_id: productId, 
        quantity,
        selected_size: selectedSize,
        selected_weight: selectedWeight
      });
      // جلب السلة مباشرة وتحديث الـ state
      const res = await axios.get(`${API}/api/cart`);
      setCart({...res.data});
      return { success: true };
    } catch (error) {
      console.error('Error updating cart:', error);
      // إرجاع رسالة الخطأ
      const errorMessage = error.response?.data?.detail || 'حدث خطأ أثناء تحديث السلة';
      return { success: false, error: errorMessage };
    }
  };

  const removeFromCart = async (productId, selectedSize = null, selectedWeight = null) => {
    try {
      let url = `${API}/api/cart/${productId}`;
      const params = [];
      if (selectedSize) params.push(`selected_size=${encodeURIComponent(selectedSize)}`);
      if (selectedWeight) params.push(`selected_weight=${encodeURIComponent(selectedWeight)}`);
      if (params.length > 0) url += `?${params.join('&')}`;
      
      await axios.delete(url);
      // جلب السلة مباشرة وتحديث الـ state
      const res = await axios.get(`${API}/api/cart`);
      setCart({...res.data});
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const clearCart = () => {
    setCart({ items: [], total: 0 });
  };

  const cartCount = (cart?.items || []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cart, 
      loading, 
      addToCart, 
      updateQuantity, 
      removeFromCart, 
      clearCart, 
      fetchCart,
      cartCount 
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
