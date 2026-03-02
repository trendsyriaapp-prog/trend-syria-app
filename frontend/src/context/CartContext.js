import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
    if (!token) return;
    try {
      setLoading(true);
      const res = await axios.get(`${API}/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCart(res.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId, quantity = 1, selectedSize = null) => {
    if (!token) return false;
    try {
      await axios.post(`${API}/cart/add`, { 
        product_id: productId, 
        quantity,
        selected_size: selectedSize 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCart();
      return true;
    } catch (error) {
      throw error;
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (!token) return;
    if (quantity < 1) {
      await removeFromCart(productId);
      return;
    }
    try {
      const res = await axios.put(`${API}/cart/update`, { product_id: productId, quantity }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // تحديث السلة محلياً فوراً
      setCart(prevCart => ({
        ...prevCart,
        items: prevCart.items.map(item => 
          item.product_id === productId ? { ...item, quantity } : item
        )
      }));
      // ثم جلب البيانات الكاملة من السيرفر
      await fetchCart();
    } catch (error) {
      console.error('Error updating cart:', error);
      await fetchCart(); // إعادة جلب البيانات في حالة الخطأ
    }
  };

  const removeFromCart = async (productId) => {
    if (!token) return;
    try {
      await axios.delete(`${API}/cart/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // حذف المنتج محلياً فوراً
      setCart(prevCart => ({
        ...prevCart,
        items: prevCart.items.filter(item => item.product_id !== productId)
      }));
      // ثم جلب البيانات الكاملة من السيرفر
      await fetchCart();
    } catch (error) {
      console.error('Error removing from cart:', error);
      await fetchCart(); // إعادة جلب البيانات في حالة الخطأ
    }
  };

  const clearCart = () => {
    setCart({ items: [], total: 0 });
  };

  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

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
