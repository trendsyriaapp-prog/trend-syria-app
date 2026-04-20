// /app/frontend/src/context/DataContext.js
// سياق البيانات - Offline-First Data Provider
// يدير تحميل وتخزين البيانات محلياً مع مزامنة خلفية

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { productsDB, categoriesDB, cacheMetaDB, settingsDB } from '../lib/offlineDB';
import logger from '../lib/logger';

const API = process.env.REACT_APP_BACKEND_URL;

// إعدادات الكاش
const CACHE_DURATIONS = {
  categories: 60 * 60 * 1000,      // ساعة
  homepage: 5 * 60 * 1000,         // 5 دقائق
  products: 10 * 60 * 1000,        // 10 دقائق
  settings: 30 * 60 * 1000         // 30 دقيقة
};

const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  // بيانات الصفحة الرئيسية
  const [homepageData, setHomepageData] = useState({
    categories: [],
    ads: [],
    sponsoredProducts: [],
    flashSale: null,
    flashProducts: [],
    freeShippingProducts: [],
    bestSellers: [],
    newArrivals: [],
    extraProducts: [],
    settings: {}
  });

  // حالة التحميل
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // مرجع لتتبع التحميل
  const loadingRef = useRef(false);

  // مراقبة حالة الاتصال
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // تحديث البيانات عند عودة الاتصال
      refreshData(true);
    };
    
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // تحميل البيانات عند البدء
  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * تحميل البيانات الأولية - Offline First
   */
  const loadInitialData = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setIsLoading(true);

      // ========== 1. تحميل من IndexedDB فوراً ==========
      const [localCategories, localSettings] = await Promise.all([
        categoriesDB.getAll(),
        settingsDB.getAll()
      ]);

      // عرض الكاش المحلي فوراً
      if (localCategories.length > 0) {
        setHomepageData(prev => ({
          ...prev,
          categories: localCategories,
          settings: localSettings
        }));
        logger.log('📦 Loaded from IndexedDB:', localCategories.length, 'categories');
      }

      // ========== 2. تحميل من localStorage كـ fallback ==========
      const cachedHomepage = localStorage.getItem('homepage_persistent_cache');
      if (cachedHomepage) {
        try {
          const data = JSON.parse(cachedHomepage);
          if (data && (data.categories?.length > 0 || data.best_sellers?.length > 0)) {
            applyHomepageData(data);
            logger.log('📦 Loaded from localStorage cache');
          }
        } catch (e) {}
      }

      // ========== 3. جلب من السيرفر إذا كان هناك اتصال ==========
      if (navigator.onLine) {
        await fetchFromServer();
      } else {
        logger.log('📴 Offline - using cached data');
      }

    } catch (error) {
      logger.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };

  /**
   * جلب البيانات من السيرفر
   */
  const fetchFromServer = async () => {
    try {
      setIsRefreshing(true);

      // جلب البيانات
      const response = await axios.get(`${API}/api/products/homepage-data`, {
        timeout: 15000
      });

      const data = response.data;

      if (data) {
        // تطبيق البيانات
        applyHomepageData(data);

        // حفظ في IndexedDB
        if (data.categories?.length > 0) {
          await categoriesDB.saveAll(data.categories);
        }

        // حفظ المنتجات
        const allProducts = [
          ...(data.sponsored_products || []),
          ...(data.flash_products || []),
          ...(data.free_shipping_products || []),
          ...(data.best_sellers || []),
          ...(data.new_arrivals || []),
          ...(data.extra_products || [])
        ];

        if (allProducts.length > 0) {
          await productsDB.saveMany(allProducts);
        }

        // حفظ الإعدادات
        if (data.settings) {
          await settingsDB.set('homepage_settings', data.settings);
        }

        // حفظ في localStorage كـ backup
        localStorage.setItem('homepage_persistent_cache', JSON.stringify(data));

        // تحديث الـ metadata
        await cacheMetaDB.setLastSync('homepage');
        setLastRefresh(Date.now());

        logger.log('✅ Fetched and cached homepage data');
      }

    } catch (error) {
      logger.error('Error fetching from server:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * تطبيق بيانات الصفحة الرئيسية على الـ state
   */
  const applyHomepageData = (data) => {
    setHomepageData({
      categories: data.categories || [],
      ads: data.ads || [],
      sponsoredProducts: data.sponsored_products || [],
      flashSale: data.flash_sale || null,
      flashProducts: data.flash_products || [],
      freeShippingProducts: data.free_shipping_products || [],
      bestSellers: data.best_sellers || [],
      newArrivals: data.new_arrivals || [],
      extraProducts: data.extra_products || [],
      settings: data.settings || {}
    });
  };

  /**
   * تحديث البيانات
   */
  const refreshData = useCallback(async (force = false) => {
    if (isRefreshing && !force) return;

    // التحقق من الكاش
    if (!force) {
      const isStale = await cacheMetaDB.isStale('homepage', CACHE_DURATIONS.homepage);
      if (!isStale) {
        logger.log('📦 Cache is fresh, skipping refresh');
        return;
      }
    }

    if (navigator.onLine) {
      await fetchFromServer();
    }
  }, [isRefreshing]);

  /**
   * جلب منتج واحد
   */
  const getProduct = useCallback(async (productId) => {
    // 1. محاولة من الكاش
    let product = await productsDB.getById(productId);
    
    if (product) {
      return product;
    }

    // 2. جلب من السيرفر
    if (navigator.onLine) {
      try {
        const res = await axios.get(`${API}/api/products/${productId}`);
        product = res.data;
        
        // حفظ في الكاش
        await productsDB.saveMany([product]);
        
        return product;
      } catch (error) {
        logger.error('Error fetching product:', error);
      }
    }

    return null;
  }, []);

  /**
   * البحث في المنتجات
   */
  const searchProducts = useCallback(async (query, options = {}) => {
    const { category, limit = 20 } = options;

    // 1. بحث محلي أولاً
    let localResults = await productsDB.search(query, limit);
    
    if (category) {
      localResults = localResults.filter(p => p.category === category);
    }

    // 2. إذا النتائج قليلة وهناك اتصال، ابحث في السيرفر
    if (localResults.length < limit && navigator.onLine) {
      try {
        const params = new URLSearchParams({ search: query, limit: limit.toString() });
        if (category) params.append('category', category);
        
        const res = await axios.get(`${API}/api/products?${params}`);
        const serverResults = res.data.products || [];
        
        // حفظ في الكاش
        if (serverResults.length > 0) {
          await productsDB.saveMany(serverResults);
        }
        
        return serverResults;
      } catch (error) {
        logger.error('Search error:', error);
      }
    }

    return localResults;
  }, []);

  /**
   * جلب منتجات حسب الفئة
   */
  const getProductsByCategory = useCallback(async (category, page = 1, limit = 12) => {
    // 1. محاولة من الكاش
    const localProducts = await productsDB.getByCategory(category, limit);
    
    // 2. إذا الكاش فارغ وهناك اتصال
    if (localProducts.length < limit && navigator.onLine) {
      try {
        const res = await axios.get(`${API}/api/products`, {
          params: { category, page, limit }
        });
        
        const products = res.data.products || [];
        
        if (products.length > 0) {
          await productsDB.saveMany(products);
        }
        
        return {
          products,
          total: res.data.total || products.length,
          hasMore: res.data.has_more || false
        };
      } catch (error) {
        logger.error('Error fetching category products:', error);
      }
    }

    return {
      products: localProducts,
      total: localProducts.length,
      hasMore: false
    };
  }, []);

  /**
   * مسح الكاش
   */
  const clearCache = useCallback(async () => {
    await Promise.all([
      productsDB.clear(),
      categoriesDB.saveAll([]),
      cacheMetaDB.setLastSync('homepage', 0)
    ]);
    
    localStorage.removeItem('homepage_persistent_cache');
    localStorage.removeItem('homepage_cache');
    sessionStorage.removeItem('homepage_cache');
    
    logger.log('🗑️ Cache cleared');
    
    // إعادة التحميل
    await loadInitialData();
  }, []);

  return (
    <DataContext.Provider value={{
      // بيانات الصفحة الرئيسية
      ...homepageData,
      
      // حالة
      isLoading,
      isRefreshing,
      isOffline,
      lastRefresh,
      
      // دوال
      refreshData,
      getProduct,
      searchProducts,
      getProductsByCategory,
      clearCache
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export default DataContext;
