import { createContext, useContext, useState, useEffect } from 'react';

const FoodCartContext = createContext();

export const useFoodCart = () => {
  const context = useContext(FoodCartContext);
  if (!context) {
    // بدلاً من رمي خطأ، نعيد قيم افتراضية للتوافق
    console.warn('useFoodCart called outside FoodCartProvider, using defaults');
    return {
      totalItems: 0,
      totalAmount: 0,
      stores: [],
      clearStoreCart: () => {},
      clearAllFoodCarts: () => {},
      refresh: () => {}
    };
  }
  return context;
};

export const FoodCartProvider = ({ children }) => {
  const [totalItems, setTotalItems] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [stores, setStores] = useState([]); // قائمة المتاجر التي فيها منتجات

  // حساب إجمالي السلة من جميع المتاجر
  const calculateTotals = () => {
    let items = 0;
    let amount = 0;
    const storesList = [];

    // البحث في localStorage عن جميع سلات الطعام
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('food_cart_')) {
        try {
          const cart = JSON.parse(localStorage.getItem(key));
          if (cart && cart.length > 0) {
            const storeId = key.replace('food_cart_', '');
            const storeItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            const storeAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            
            items += storeItems;
            amount += storeAmount;
            
            storesList.push({
              storeId,
              items: cart,
              itemCount: storeItems,
              totalAmount: storeAmount
            });
          }
        } catch (e) {
          console.error('Error parsing food cart:', e);
        }
      }
    }

    setTotalItems(items);
    setTotalAmount(amount);
    setStores(storesList);
  };

  // تحديث السلة عند أي تغيير
  useEffect(() => {
    calculateTotals();

    // الاستماع لتحديثات السلة
    const handleCartUpdate = () => calculateTotals();
    window.addEventListener('foodCartUpdated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);

    // تحديث دوري
    const interval = setInterval(calculateTotals, 2000);

    return () => {
      window.removeEventListener('foodCartUpdated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
      clearInterval(interval);
    };
  }, []);

  // مسح سلة متجر معين
  const clearStoreCart = (storeId) => {
    localStorage.removeItem(`food_cart_${storeId}`);
    window.dispatchEvent(new CustomEvent('foodCartUpdated'));
    calculateTotals();
  };

  // مسح جميع سلات الطعام
  const clearAllFoodCarts = () => {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('food_cart_')) {
        localStorage.removeItem(key);
      }
    }
    window.dispatchEvent(new CustomEvent('foodCartUpdated'));
    calculateTotals();
  };

  return (
    <FoodCartContext.Provider value={{
      totalItems,
      totalAmount,
      stores,
      clearStoreCart,
      clearAllFoodCarts,
      refresh: calculateTotals
    }}>
      {children}
    </FoodCartContext.Provider>
  );
};

export default FoodCartContext;
