// /app/frontend/src/context/CartContext.js
// سياق السلة - Offline-First مع Optimistic Updates
// يعمل محلياً أولاً ثم يزامن مع السيرفر

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { cartDB, productsDB, syncQueueDB } from '../lib/offlineDB';
import syncManager from '../lib/syncManager';
import logger from '../lib/logger';

const API = process.env.REACT_APP_BACKEND_URL;

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user, token } = useAuth();
  const lastSyncRef = useRef(null);
  const isOnlineRef = useRef(navigator.onLine);

  // مراقبة حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      isOnlineRef.current = true;
      // مزامنة عند عودة الاتصال
      if (user && token) {
        syncWithServer();
      }
    };
    
    const handleOffline = () => {
      isOnlineRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, token]);

  // تحميل السلة عند تسجيل الدخول
  useEffect(() => {
    if (user && token) {
      loadCart();
    } else {
      // مسح السلة عند تسجيل الخروج
      setCart({ items: [], total: 0 });
      cartDB.clear();
    }
  }, [user, token]);

  /**
   * تحميل السلة - Offline First
   */
  const loadCart = async () => {
    try {
      setLoading(true);

      // 1. تحميل من الكاش المحلي فوراً
      const localItems = await cartDB.getAll();
      if (localItems.length > 0) {
        const localCart = buildCartFromItems(localItems);
        setCart(localCart);
      }

      // 2. مزامنة مع السيرفر إذا كان هناك اتصال
      if (navigator.onLine) {
        await syncWithServer();
      }

    } catch (error) {
      logger.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * بناء كائن السلة من العناصر
   */
  const buildCartFromItems = (items) => {
    const total = items.reduce((sum, item) => {
      const price = item.product?.price || item.price || 0;
      return sum + (price * item.quantity);
    }, 0);

    return { items, total };
  };

  /**
   * مزامنة مع السيرفر
   */
  const syncWithServer = async () => {
    if (!token || isSyncing) return;

    try {
      setIsSyncing(true);

      // 1. جلب السلة من السيرفر
      const res = await axios.get(`${API}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const serverCart = res.data;

      // 2. دمج مع العناصر المحلية غير المتزامنة
      const unsyncedLocal = await cartDB.getUnsynced();
      
      if (unsyncedLocal.length > 0) {
        // هناك عناصر محلية لم تتزامن
        // نرسلها للسيرفر
        for (const item of unsyncedLocal) {
          try {
            await axios.post(`${API}/api/cart/add`, {
              product_id: item.product_id,
              quantity: item.quantity,
              selected_size: item.selected_size,
              selected_weight: item.selected_weight
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            await cartDB.markSynced(item.product_id);
          } catch (e) {
            logger.error('Failed to sync cart item:', e);
          }
        }

        // جلب السلة المحدثة
        const updatedRes = await axios.get(`${API}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const updatedCart = updatedRes.data;
        await cartDB.replaceAll(updatedCart.items || []);
        setCart({
          items: updatedCart.items || [],
          total: updatedCart.total || 0
        });
      } else {
        // لا توجد عناصر محلية، استخدم سلة السيرفر
        await cartDB.replaceAll(serverCart.items || []);
        setCart({
          items: serverCart.items || [],
          total: serverCart.total || 0
        });
      }

      lastSyncRef.current = Date.now();

    } catch (error) {
      logger.error('Error syncing cart:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * إضافة للسلة - Optimistic Update
   */
  const addToCart = useCallback(async (productId, quantity = 1, selectedSize = null, selectedWeight = null) => {
    try {
      // 1. جلب بيانات المنتج للعرض المحلي
      let product = await productsDB.getById(productId);
      
      if (!product && navigator.onLine) {
        try {
          const res = await axios.get(`${API}/api/products/${productId}`);
          product = res.data;
          await productsDB.saveMany([product]);
        } catch (e) {
          logger.error('Failed to fetch product:', e);
        }
      }

      // 2. Optimistic Update - تحديث UI فوراً
      const newItem = {
        product_id: productId,
        quantity,
        selected_size: selectedSize,
        selected_weight: selectedWeight,
        product,
        synced: false
      };

      // تحديث الـ state فوراً
      setCart(prev => {
        const existingIndex = prev.items.findIndex(
          item => item.product_id === productId &&
                  item.selected_size === selectedSize &&
                  item.selected_weight === selectedWeight
        );

        let newItems;
        if (existingIndex >= 0) {
          // تحديث الكمية
          newItems = [...prev.items];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: newItems[existingIndex].quantity + quantity
          };
        } else {
          // إضافة جديد
          newItems = [...prev.items, newItem];
        }

        const newTotal = newItems.reduce((sum, item) => {
          const price = item.product?.price || 0;
          return sum + (price * item.quantity);
        }, 0);

        return { items: newItems, total: newTotal };
      });

      // 3. حفظ محلياً
      await cartDB.addItem(newItem);

      // 4. إرسال للسيرفر (أو إضافة للقائمة)
      if (navigator.onLine && token) {
        try {
          await axios.post(`${API}/api/cart/add`, {
            product_id: productId,
            quantity,
            selected_size: selectedSize,
            selected_weight: selectedWeight
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          await cartDB.markSynced(productId);
          
        } catch (error) {
          logger.error('Failed to sync add to cart:', error);
          // إضافة للقائمة للمزامنة لاحقاً
          await syncQueueDB.add({
            type: 'cart_add',
            data: { product_id: productId, quantity, selected_size: selectedSize, selected_weight: selectedWeight },
            endpoint: '/api/cart/add',
            method: 'POST'
          });
        }
      } else {
        // Offline - إضافة للقائمة
        await syncQueueDB.add({
          type: 'cart_add',
          data: { product_id: productId, quantity, selected_size: selectedSize, selected_weight: selectedWeight },
          endpoint: '/api/cart/add',
          method: 'POST'
        });
      }

      // 5. إطلاق event
      window.dispatchEvent(new CustomEvent('cart-updated', {
        detail: { action: 'add', productId }
      }));

      return cart;

    } catch (error) {
      logger.error('Error adding to cart:', error);
      throw error;
    }
  }, [token, cart]);

  /**
   * تحديث الكمية - Optimistic Update
   */
  const updateQuantity = useCallback(async (productId, quantity, selectedSize = null, selectedWeight = null) => {
    try {
      // 1. Optimistic Update
      setCart(prev => {
        const newItems = prev.items.map(item => {
          if (item.product_id === productId &&
              item.selected_size === selectedSize &&
              item.selected_weight === selectedWeight) {
            return { ...item, quantity };
          }
          return item;
        });

        const newTotal = newItems.reduce((sum, item) => {
          const price = item.product?.price || 0;
          return sum + (price * item.quantity);
        }, 0);

        return { items: newItems, total: newTotal };
      });

      // 2. حفظ محلياً
      await cartDB.updateQuantity(productId, quantity, selectedSize, selectedWeight);

      // 3. إرسال للسيرفر
      if (navigator.onLine && token) {
        try {
          await axios.put(`${API}/api/cart/update`, {
            product_id: productId,
            quantity,
            selected_size: selectedSize,
            selected_weight: selectedWeight
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          logger.error('Failed to sync update:', error);
          await syncQueueDB.add({
            type: 'cart_update',
            data: { product_id: productId, quantity, selected_size: selectedSize, selected_weight: selectedWeight },
            endpoint: '/api/cart/update',
            method: 'PUT'
          });
        }
      } else {
        await syncQueueDB.add({
          type: 'cart_update',
          data: { product_id: productId, quantity, selected_size: selectedSize, selected_weight: selectedWeight },
          endpoint: '/api/cart/update',
          method: 'PUT'
        });
      }

      return { success: true };

    } catch (error) {
      logger.error('Error updating cart:', error);
      return { success: false, error: error.message };
    }
  }, [token]);

  /**
   * حذف من السلة - Optimistic Update
   */
  const removeFromCart = useCallback(async (productId, selectedSize = null, selectedWeight = null) => {
    try {
      // 1. Optimistic Update
      setCart(prev => {
        const newItems = prev.items.filter(item => 
          !(item.product_id === productId &&
            item.selected_size === selectedSize &&
            item.selected_weight === selectedWeight)
        );

        const newTotal = newItems.reduce((sum, item) => {
          const price = item.product?.price || 0;
          return sum + (price * item.quantity);
        }, 0);

        return { items: newItems, total: newTotal };
      });

      // 2. حذف محلياً
      await cartDB.removeItem(productId, selectedSize, selectedWeight);

      // 3. إرسال للسيرفر
      if (navigator.onLine && token) {
        try {
          let url = `${API}/api/cart/${productId}`;
          const params = [];
          if (selectedSize) params.push(`selected_size=${encodeURIComponent(selectedSize)}`);
          if (selectedWeight) params.push(`selected_weight=${encodeURIComponent(selectedWeight)}`);
          if (params.length > 0) url += `?${params.join('&')}`;

          await axios.delete(url, {
            headers: { Authorization: `Bearer ${token}` }
          });
        } catch (error) {
          logger.error('Failed to sync remove:', error);
          await syncQueueDB.add({
            type: 'cart_remove',
            data: { product_id: productId, selected_size: selectedSize, selected_weight: selectedWeight },
            endpoint: `/api/cart/${productId}`,
            method: 'DELETE'
          });
        }
      } else {
        await syncQueueDB.add({
          type: 'cart_remove',
          data: { product_id: productId, selected_size: selectedSize, selected_weight: selectedWeight },
          endpoint: `/api/cart/${productId}`,
          method: 'DELETE'
        });
      }

      // 4. إطلاق event
      window.dispatchEvent(new CustomEvent('cart-updated', {
        detail: { action: 'remove', productId }
      }));

    } catch (error) {
      logger.error('Error removing from cart:', error);
    }
  }, [token]);

  /**
   * مسح السلة
   */
  const clearCart = useCallback(async () => {
    setCart({ items: [], total: 0 });
    await cartDB.clear();
  }, []);

  /**
   * إعادة جلب السلة من السيرفر
   */
  const fetchCart = useCallback(async () => {
    if (!token) return;
    
    if (navigator.onLine) {
      await syncWithServer();
    } else {
      await loadCart();
    }
  }, [token]);

  // حساب عدد العناصر
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      isSyncing,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      fetchCart,
      cartCount,
      isOnline: isOnlineRef.current
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
