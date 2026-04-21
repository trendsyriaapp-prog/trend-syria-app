// /app/frontend/src/lib/offlineDB.js
// نظام IndexedDB للتخزين المحلي - Offline First Architecture
// يعمل كمصدر رئيسي للبيانات مع مزامنة خلفية

import logger from './logger';

const DB_NAME = 'TrendSyriaDB';
const DB_VERSION = 1;

// Store Names
const STORES = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  CART: 'cart',
  ORDERS: 'orders',
  FAVORITES: 'favorites',
  SETTINGS: 'settings',
  SYNC_QUEUE: 'syncQueue',
  CACHE_META: 'cacheMeta'
};

let dbInstance = null;

/**
 * فتح أو إنشاء قاعدة البيانات
 */
const openDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      logger.error('❌ Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      logger.log('✅ IndexedDB opened successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      logger.log('🔧 Upgrading IndexedDB...');

      // Products Store - للمنتجات مع فهارس للبحث
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        const productsStore = db.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
        productsStore.createIndex('category', 'category', { unique: false });
        productsStore.createIndex('seller_id', 'seller_id', { unique: false });
        productsStore.createIndex('is_approved', 'is_approved', { unique: false });
        productsStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // Categories Store
      if (!db.objectStoreNames.contains(STORES.CATEGORIES)) {
        db.createObjectStore(STORES.CATEGORIES, { keyPath: 'id' });
      }

      // Cart Store - السلة المحلية
      if (!db.objectStoreNames.contains(STORES.CART)) {
        const cartStore = db.createObjectStore(STORES.CART, { keyPath: 'product_id' });
        cartStore.createIndex('synced', 'synced', { unique: false });
      }

      // Orders Store - الطلبات
      if (!db.objectStoreNames.contains(STORES.ORDERS)) {
        const ordersStore = db.createObjectStore(STORES.ORDERS, { keyPath: 'id' });
        ordersStore.createIndex('status', 'status', { unique: false });
        ordersStore.createIndex('synced', 'synced', { unique: false });
      }

      // Favorites Store - المفضلة
      if (!db.objectStoreNames.contains(STORES.FAVORITES)) {
        db.createObjectStore(STORES.FAVORITES, { keyPath: 'product_id' });
      }

      // Settings Store - الإعدادات
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }

      // Sync Queue - قائمة انتظار المزامنة
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('type', 'type', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Cache Metadata - معلومات الكاش
      if (!db.objectStoreNames.contains(STORES.CACHE_META)) {
        db.createObjectStore(STORES.CACHE_META, { keyPath: 'key' });
      }
    };
  });
};

/**
 * تنفيذ عملية على Store
 */
const withStore = async (storeName, mode, callback) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    
    try {
      const result = callback(store);
      
      if (result instanceof IDBRequest) {
        result.onsuccess = () => resolve(result.result);
        result.onerror = () => reject(result.error);
      } else {
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
      }
    } catch (error) {
      reject(error);
    }
  });
};

// ============== Products Operations ==============

export const productsDB = {
  /**
   * حفظ منتجات متعددة
   */
  async saveMany(products) {
    if (!products || products.length === 0) return;
    
    const db = await openDB();
    const transaction = db.transaction(STORES.PRODUCTS, 'readwrite');
    const store = transaction.objectStore(STORES.PRODUCTS);
    
    products.forEach(product => {
      store.put({
        ...product,
        _cachedAt: Date.now()
      });
    });
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        logger.log(`✅ Saved ${products.length} products to IndexedDB`);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  },

  /**
   * جلب منتج واحد
   */
  async getById(id) {
    return withStore(STORES.PRODUCTS, 'readonly', (store) => store.get(id));
  },

  /**
   * جلب منتجات حسب الفئة
   */
  async getByCategory(category, limit = 20) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PRODUCTS, 'readonly');
      const store = transaction.objectStore(STORES.PRODUCTS);
      
      // التحقق من وجود الـ index
      if (!store.indexNames.contains('category')) {
        // Fallback: جلب الكل وفلترة يدوية
        const allRequest = store.getAll();
        allRequest.onsuccess = () => {
          const filtered = (allRequest.result || [])
            .filter(p => p.category === category)
            .slice(0, limit);
          resolve(filtered);
        };
        allRequest.onerror = () => resolve([]);
        return;
      }
      
      const index = store.index('category');
      const results = [];
      
      try {
        const request = index.openCursor(IDBKeyRange.only(category));
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor && results.length < limit) {
            results.push(cursor.value);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        
        request.onerror = () => {
          // Fallback
          const allRequest = store.getAll();
          allRequest.onsuccess = () => {
            const filtered = (allRequest.result || [])
              .filter(p => p.category === category)
              .slice(0, limit);
            resolve(filtered);
          };
          allRequest.onerror = () => resolve([]);
        };
      } catch (err) {
        resolve([]);
      }
    });
  },

  /**
   * جلب أحدث المنتجات
   */
  async getLatest(limit = 10) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PRODUCTS, 'readonly');
      const store = transaction.objectStore(STORES.PRODUCTS);
      const index = store.index('created_at');
      const results = [];
      
      const request = index.openCursor(null, 'prev'); // ترتيب تنازلي
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          if (cursor.value.is_approved !== false) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * البحث في المنتجات
   */
  async search(query, limit = 20) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.PRODUCTS, 'readonly');
      const store = transaction.objectStore(STORES.PRODUCTS);
      const results = [];
      const lowerQuery = query.toLowerCase();
      
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          const product = cursor.value;
          if (
            product.name?.toLowerCase().includes(lowerQuery) ||
            product.description?.toLowerCase().includes(lowerQuery)
          ) {
            results.push(product);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * جلب الكل
   */
  async getAll() {
    return withStore(STORES.PRODUCTS, 'readonly', (store) => store.getAll());
  },

  /**
   * عدد المنتجات
   */
  async count() {
    return withStore(STORES.PRODUCTS, 'readonly', (store) => store.count());
  },

  /**
   * حذف الكل
   */
  async clear() {
    return withStore(STORES.PRODUCTS, 'readwrite', (store) => store.clear());
  }
};

// ============== Categories Operations ==============

export const categoriesDB = {
  async saveAll(categories) {
    if (!categories || categories.length === 0) return;
    
    const db = await openDB();
    const transaction = db.transaction(STORES.CATEGORIES, 'readwrite');
    const store = transaction.objectStore(STORES.CATEGORIES);
    
    // حذف القديم
    store.clear();
    
    // حفظ الجديد
    categories.forEach(cat => store.put(cat));
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  async getAll() {
    return withStore(STORES.CATEGORIES, 'readonly', (store) => store.getAll());
  }
};

// ============== Cart Operations (Offline-First) ==============

export const cartDB = {
  /**
   * إضافة للسلة (محلياً أولاً)
   */
  async addItem(item) {
    const cartItem = {
      product_id: item.product_id,
      quantity: item.quantity || 1,
      selected_size: item.selected_size || null,
      selected_weight: item.selected_weight || null,
      product: item.product || null, // بيانات المنتج للعرض Offline
      synced: false,
      timestamp: Date.now()
    };
    
    return withStore(STORES.CART, 'readwrite', (store) => store.put(cartItem));
  },

  /**
   * تحديث الكمية
   */
  async updateQuantity(productId, quantity, selectedSize = null, selectedWeight = null) {
    const db = await openDB();
    return new Promise(async (resolve, reject) => {
      try {
        const item = await this.getItem(productId, selectedSize, selectedWeight);
        if (item) {
          item.quantity = quantity;
          item.synced = false;
          item.timestamp = Date.now();
          await withStore(STORES.CART, 'readwrite', (store) => store.put(item));
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * حذف من السلة
   */
  async removeItem(productId, selectedSize = null, selectedWeight = null) {
    return withStore(STORES.CART, 'readwrite', (store) => store.delete(productId));
  },

  /**
   * جلب عنصر
   */
  async getItem(productId, selectedSize = null, selectedWeight = null) {
    return withStore(STORES.CART, 'readonly', (store) => store.get(productId));
  },

  /**
   * جلب كل السلة
   */
  async getAll() {
    return withStore(STORES.CART, 'readonly', (store) => store.getAll());
  },

  /**
   * جلب العناصر غير المتزامنة
   */
  async getUnsynced() {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.CART, 'readonly');
        const store = transaction.objectStore(STORES.CART);
        
        // التحقق من وجود الـ index
        if (!store.indexNames.contains('synced')) {
          // إذا لم يوجد index، نجلب كل العناصر ونفلتر يدوياً
          const request = store.getAll();
          request.onsuccess = () => {
            const unsynced = (request.result || []).filter(item => item.synced === false);
            resolve(unsynced);
          };
          request.onerror = () => reject(request.error);
          return;
        }
        
        const index = store.index('synced');
        // استخدام 0 بدلاً من false لتجنب مشاكل IDBKeyRange
        const request = index.getAll(IDBKeyRange.only(0));
        
        request.onsuccess = () => {
          // إذا لم نجد شيء، نجرب بـ false
          if (!request.result || request.result.length === 0) {
            const allRequest = store.getAll();
            allRequest.onsuccess = () => {
              const unsynced = (allRequest.result || []).filter(item => item.synced === false || item.synced === 0);
              resolve(unsynced);
            };
            allRequest.onerror = () => resolve([]);
          } else {
            resolve(request.result);
          }
        };
        request.onerror = () => {
          // Fallback: جلب الكل وفلترة يدوية
          const allRequest = store.getAll();
          allRequest.onsuccess = () => {
            const unsynced = (allRequest.result || []).filter(item => item.synced === false || item.synced === 0);
            resolve(unsynced);
          };
          allRequest.onerror = () => resolve([]);
        };
      });
    } catch (err) {
      console.error('Error getting unsynced cart items:', err);
      return [];
    }
  },

  /**
   * تحديث حالة المزامنة
   */
  async markSynced(productId) {
    const item = await this.getItem(productId);
    if (item) {
      item.synced = true;
      await withStore(STORES.CART, 'readwrite', (store) => store.put(item));
    }
  },

  /**
   * استبدال السلة بالكامل (من السيرفر)
   */
  async replaceAll(items) {
    const db = await openDB();
    const transaction = db.transaction(STORES.CART, 'readwrite');
    const store = transaction.objectStore(STORES.CART);
    
    store.clear();
    
    items.forEach(item => {
      store.put({
        ...item,
        product_id: item.product_id || item.id,
        synced: true,
        timestamp: Date.now()
      });
    });
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  /**
   * مسح السلة
   */
  async clear() {
    return withStore(STORES.CART, 'readwrite', (store) => store.clear());
  },

  /**
   * حساب المجموع
   */
  async getTotal() {
    const items = await this.getAll();
    return items.reduce((sum, item) => {
      const price = item.product?.price || 0;
      return sum + (price * item.quantity);
    }, 0);
  }
};

// ============== Sync Queue Operations ==============

export const syncQueueDB = {
  /**
   * إضافة عملية للقائمة
   */
  async add(operation) {
    const entry = {
      type: operation.type, // 'cart_add', 'cart_update', 'cart_remove', 'order_create', etc.
      data: operation.data,
      endpoint: operation.endpoint,
      method: operation.method || 'POST',
      status: 'pending',
      retries: 0,
      maxRetries: 3,
      timestamp: Date.now()
    };
    
    return withStore(STORES.SYNC_QUEUE, 'readwrite', (store) => store.add(entry));
  },

  /**
   * جلب العمليات المعلقة
   */
  async getPending() {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.SYNC_QUEUE, 'readonly');
        const store = transaction.objectStore(STORES.SYNC_QUEUE);
        
        // التحقق من وجود الـ index
        if (!store.indexNames.contains('status')) {
          const request = store.getAll();
          request.onsuccess = () => {
            const pending = (request.result || []).filter(item => item.status === 'pending');
            resolve(pending);
          };
          request.onerror = () => resolve([]);
          return;
        }
        
        const index = store.index('status');
        const request = index.getAll(IDBKeyRange.only('pending'));
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => {
          // Fallback
          const allRequest = store.getAll();
          allRequest.onsuccess = () => {
            const pending = (allRequest.result || []).filter(item => item.status === 'pending');
            resolve(pending);
          };
          allRequest.onerror = () => resolve([]);
        };
      });
    } catch (err) {
      console.error('Error getting pending sync queue:', err);
      return [];
    }
  },

  /**
   * تحديث حالة عملية
   */
  async updateStatus(id, status, error = null) {
    const db = await openDB();
    return new Promise(async (resolve, reject) => {
      const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORES.SYNC_QUEUE);
      const request = store.get(id);
      
      request.onsuccess = () => {
        const entry = request.result;
        if (entry) {
          entry.status = status;
          entry.lastError = error;
          entry.lastAttempt = Date.now();
          if (status === 'failed') entry.retries++;
          store.put(entry);
        }
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * حذف عملية مكتملة
   */
  async remove(id) {
    return withStore(STORES.SYNC_QUEUE, 'readwrite', (store) => store.delete(id));
  },

  /**
   * مسح المكتملة
   */
  async clearCompleted() {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = transaction.objectStore(STORES.SYNC_QUEUE);
        
        // التحقق من وجود الـ index
        if (!store.indexNames.contains('status')) {
          // مسح يدوي
          const getAllRequest = store.getAll();
          getAllRequest.onsuccess = () => {
            const completed = (getAllRequest.result || []).filter(item => item.status === 'completed');
            completed.forEach(item => {
              if (item.id) store.delete(item.id);
            });
            resolve();
          };
          getAllRequest.onerror = () => resolve();
          return;
        }
        
        const index = store.index('status');
        const request = index.openCursor(IDBKeyRange.only('completed'));
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        
        request.onerror = () => resolve(); // تجاهل الخطأ
      });
    } catch (err) {
      console.error('Error clearing completed sync queue:', err);
    }
  }
};

// ============== Cache Metadata Operations ==============

export const cacheMetaDB = {
  /**
   * تحديث وقت التخزين
   */
  async setLastSync(key, timestamp = Date.now()) {
    return withStore(STORES.CACHE_META, 'readwrite', (store) => 
      store.put({ key, timestamp })
    );
  },

  /**
   * جلب وقت آخر تخزين
   */
  async getLastSync(key) {
    const result = await withStore(STORES.CACHE_META, 'readonly', (store) => store.get(key));
    return result?.timestamp || null;
  },

  /**
   * التحقق إذا الكاش منتهي الصلاحية
   */
  async isStale(key, maxAge) {
    const lastSync = await this.getLastSync(key);
    if (!lastSync) return true;
    return (Date.now() - lastSync) > maxAge;
  }
};

// ============== Settings Operations ==============

export const settingsDB = {
  async set(key, value) {
    return withStore(STORES.SETTINGS, 'readwrite', (store) => 
      store.put({ key, value, timestamp: Date.now() })
    );
  },

  async get(key) {
    const result = await withStore(STORES.SETTINGS, 'readonly', (store) => store.get(key));
    return result?.value;
  },

  async getAll() {
    const results = await withStore(STORES.SETTINGS, 'readonly', (store) => store.getAll());
    return results.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
  }
};

// ============== Favorites Operations ==============

export const favoritesDB = {
  async add(productId, product = null) {
    return withStore(STORES.FAVORITES, 'readwrite', (store) => 
      store.put({ product_id: productId, product, timestamp: Date.now() })
    );
  },

  async remove(productId) {
    return withStore(STORES.FAVORITES, 'readwrite', (store) => store.delete(productId));
  },

  async has(productId) {
    const result = await withStore(STORES.FAVORITES, 'readonly', (store) => store.get(productId));
    return !!result;
  },

  async getAll() {
    return withStore(STORES.FAVORITES, 'readonly', (store) => store.getAll());
  },

  async toggle(productId, product = null) {
    const exists = await this.has(productId);
    if (exists) {
      await this.remove(productId);
      return false;
    } else {
      await this.add(productId, product);
      return true;
    }
  }
};

// ============== Utility Functions ==============

/**
 * تهيئة قاعدة البيانات
 */
export const initDB = async () => {
  try {
    await openDB();
    logger.log('✅ Offline database initialized');
    return true;
  } catch (error) {
    logger.error('❌ Failed to initialize offline database:', error);
    return false;
  }
};

/**
 * حذف كل البيانات
 */
export const clearAllData = async () => {
  const db = await openDB();
  const storeNames = Object.values(STORES);
  
  const transaction = db.transaction(storeNames, 'readwrite');
  storeNames.forEach(name => {
    transaction.objectStore(name).clear();
  });
  
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      logger.log('🗑️ All offline data cleared');
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
};

/**
 * حجم قاعدة البيانات
 */
export const getDBSize = async () => {
  const db = await openDB();
  let totalSize = 0;
  
  for (const storeName of Object.values(STORES)) {
    const count = await withStore(storeName, 'readonly', (store) => store.count());
    totalSize += count;
  }
  
  return totalSize;
};

export default {
  products: productsDB,
  categories: categoriesDB,
  cart: cartDB,
  syncQueue: syncQueueDB,
  cacheMeta: cacheMetaDB,
  settings: settingsDB,
  favorites: favoritesDB,
  init: initDB,
  clearAll: clearAllData,
  getSize: getDBSize
};
