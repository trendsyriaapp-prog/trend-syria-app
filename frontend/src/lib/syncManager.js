// /app/frontend/src/lib/syncManager.js
// مدير المزامنة الخلفية - Background Sync Manager
// يدير قائمة انتظار الطلبات ويزامنها عند توفر الإنترنت

import { syncQueueDB, cartDB, cacheMetaDB } from './offlineDB';

const API = process.env.REACT_APP_BACKEND_URL;

// حالة المزامنة
let isSyncing = false;
let syncInterval = null;
let listeners = new Set();

// إعدادات المزامنة
const SYNC_CONFIG = {
  interval: 30000,        // مزامنة كل 30 ثانية
  retryDelay: 5000,       // انتظار 5 ثواني قبل إعادة المحاولة
  maxRetries: 3,          // أقصى عدد محاولات
  batchSize: 10           // عدد العمليات في الدفعة الواحدة
};

/**
 * تسجيل مستمع للتحديثات
 */
export const addSyncListener = (callback) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

/**
 * إخطار المستمعين
 */
const notifyListeners = (event, data) => {
  listeners.forEach(callback => {
    try {
      callback(event, data);
    } catch (e) {
      console.error('Sync listener error:', e);
    }
  });
};

/**
 * التحقق من الاتصال بالإنترنت
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * جلب التوكن
 */
const getAuthToken = () => {
  try {
    const authData = localStorage.getItem('auth');
    if (authData) {
      const { token } = JSON.parse(authData);
      return token;
    }
  } catch (e) {}
  return null;
};

/**
 * تنفيذ طلب API
 */
const executeRequest = async (operation) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API}${operation.endpoint}`, {
    method: operation.method,
    headers,
    body: operation.data ? JSON.stringify(operation.data) : undefined
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
};

/**
 * معالجة عملية واحدة
 */
const processOperation = async (operation) => {
  try {
    console.log(`🔄 Processing: ${operation.type}`, operation.data);
    
    const result = await executeRequest(operation);
    
    // تحديث الحالة إلى مكتمل
    await syncQueueDB.updateStatus(operation.id, 'completed');
    
    // إخطار المستمعين
    notifyListeners('operation_completed', { operation, result });
    
    console.log(`✅ Completed: ${operation.type}`);
    return { success: true, result };
    
  } catch (error) {
    console.error(`❌ Failed: ${operation.type}`, error.message);
    
    // تحديث الحالة
    if (operation.retries >= operation.maxRetries) {
      await syncQueueDB.updateStatus(operation.id, 'failed', error.message);
      notifyListeners('operation_failed', { operation, error: error.message });
    } else {
      await syncQueueDB.updateStatus(operation.id, 'pending', error.message);
    }
    
    return { success: false, error: error.message };
  }
};

/**
 * مزامنة العمليات المعلقة
 */
export const syncPendingOperations = async () => {
  if (isSyncing || !isOnline()) {
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  notifyListeners('sync_started', {});

  let synced = 0;
  let failed = 0;

  try {
    const pending = await syncQueueDB.getPending();
    
    if (pending.length === 0) {
      console.log('📭 No pending operations');
      return { synced: 0, failed: 0 };
    }

    console.log(`📤 Syncing ${pending.length} operations...`);

    // معالجة بالترتيب (FIFO)
    for (const operation of pending.slice(0, SYNC_CONFIG.batchSize)) {
      const result = await processOperation(operation);
      
      if (result.success) {
        synced++;
      } else {
        failed++;
      }
      
      // تأخير بسيط بين الطلبات
      await new Promise(r => setTimeout(r, 100));
    }

    // تنظيف المكتملة
    await syncQueueDB.clearCompleted();

    console.log(`📊 Sync complete: ${synced} synced, ${failed} failed`);
    notifyListeners('sync_completed', { synced, failed });

  } catch (error) {
    console.error('❌ Sync error:', error);
    notifyListeners('sync_error', { error: error.message });
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
};

/**
 * إضافة عملية سلة للمزامنة
 */
export const queueCartOperation = async (type, data) => {
  const endpoints = {
    'cart_add': { endpoint: '/api/cart/add', method: 'POST' },
    'cart_update': { endpoint: '/api/cart/update', method: 'PUT' },
    'cart_remove': { endpoint: `/api/cart/${data.product_id}`, method: 'DELETE' }
  };

  const config = endpoints[type];
  if (!config) {
    console.error('Unknown cart operation type:', type);
    return;
  }

  await syncQueueDB.add({
    type,
    data: type === 'cart_remove' ? null : data,
    endpoint: config.endpoint,
    method: config.method
  });

  // محاولة المزامنة فوراً إذا كان هناك إنترنت
  if (isOnline()) {
    setTimeout(() => syncPendingOperations(), 500);
  }
};

/**
 * مزامنة السلة من السيرفر
 */
export const syncCartFromServer = async () => {
  if (!isOnline()) return null;

  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API}/api/cart`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const serverCart = await response.json();
      
      // تحديث الكاش المحلي
      if (serverCart.items) {
        await cartDB.replaceAll(serverCart.items);
      }
      
      await cacheMetaDB.setLastSync('cart');
      
      return serverCart;
    }
  } catch (error) {
    console.error('Failed to sync cart from server:', error);
  }

  return null;
};

/**
 * بدء المزامنة الدورية
 */
export const startPeriodicSync = () => {
  if (syncInterval) return;

  console.log('🔄 Starting periodic sync...');

  // مزامنة فورية عند البدء
  syncPendingOperations();

  // مزامنة دورية
  syncInterval = setInterval(() => {
    if (isOnline()) {
      syncPendingOperations();
    }
  }, SYNC_CONFIG.interval);

  // مراقبة حالة الاتصال
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
};

/**
 * إيقاف المزامنة الدورية
 */
export const stopPeriodicSync = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  
  console.log('⏹️ Periodic sync stopped');
};

/**
 * معالج عودة الاتصال
 */
const handleOnline = () => {
  console.log('🌐 Back online - starting sync...');
  notifyListeners('online', {});
  
  // مزامنة بعد ثانيتين للتأكد من استقرار الاتصال
  setTimeout(() => {
    syncPendingOperations();
  }, 2000);
};

/**
 * معالج انقطاع الاتصال
 */
const handleOffline = () => {
  console.log('📴 Offline mode');
  notifyListeners('offline', {});
};

/**
 * جلب حالة المزامنة
 */
export const getSyncStatus = async () => {
  const pending = await syncQueueDB.getPending();
  
  return {
    isSyncing,
    isOnline: isOnline(),
    pendingCount: pending.length,
    lastSync: await cacheMetaDB.getLastSync('last_sync')
  };
};

/**
 * فرض المزامنة الآن
 */
export const forceSync = async () => {
  if (!isOnline()) {
    return { success: false, message: 'لا يوجد اتصال بالإنترنت' };
  }

  const result = await syncPendingOperations();
  return { success: true, ...result };
};

export default {
  syncPending: syncPendingOperations,
  queueCart: queueCartOperation,
  syncCart: syncCartFromServer,
  start: startPeriodicSync,
  stop: stopPeriodicSync,
  getStatus: getSyncStatus,
  force: forceSync,
  isOnline,
  addListener: addSyncListener
};
