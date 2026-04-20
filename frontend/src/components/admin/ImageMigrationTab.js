// /app/frontend/src/components/admin/ImageMigrationTab.js
// أداة ترحيل الصور من Base64 إلى CDN

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import { 
  Cloud, RefreshCw, CheckCircle2, AlertTriangle, 
  Play, Loader2, BarChart2, Search, Info
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const ImageMigrationTab = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [migrating, setMigrating] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [batchSize, setBatchSize] = useState(10);
  const [totalMigrated, setTotalMigrated] = useState(0);

  // تشخيص أنواع الصور عند التحميل
  const diagnoseImages = async () => {
    setDiagnosing(true);
    try {
      const res = await axios.get(
        `${API}/api/storage/diagnose-images`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDiagnosis(res.data);
    } catch (error) {
      logger.error('Diagnosis error:', error);
    } finally {
      setDiagnosing(false);
    }
  };

  useEffect(() => {
    if (token) {
      diagnoseImages();
    }
  }, [token]);

  // ترحيل دفعة من المنتجات
  const migrateBatch = async () => {
    setMigrating(true);
    try {
      const res = await axios.post(
        `${API}/api/storage/migrate-batch?limit=${batchSize}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLastResult(res.data);
      setTotalMigrated(prev => prev + res.data.migrated_count);
      
      // تحديث التشخيص
      diagnoseImages();
      
      if (res.data.migrated_count > 0) {
        toast({
          title: "تم الترحيل بنجاح",
          description: `تم ترحيل ${res.data.migrated_count} منتج. المتبقي: ${res.data.remaining_count}`,
          variant: "success"
        });
      } else if (res.data.remaining_count === 0) {
        toast({
          title: "لا يوجد منتجات للترحيل",
          description: "جميع الصور مرحّلة بالفعل أو مخزنة كروابط URLs",
          variant: "default"
        });
      } else {
        toast({
          title: "لم يتم ترحيل أي منتج",
          description: "قد تكون الصور مخزنة بصيغة غير مدعومة. راجع التشخيص أدناه.",
          variant: "warning"
        });
      }
      
    } catch (error) {
      logger.error('Migration error:', error);
      toast({
        title: "خطأ في الترحيل",
        description: error.response?.data?.detail || "حدث خطأ أثناء الترحيل",
        variant: "destructive"
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl text-white">
          <Cloud className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">ترحيل الصور إلى CDN</h2>
          <p className="text-sm text-gray-500">نقل الصور من قاعدة البيانات إلى التخزين السحابي</p>
        </div>
      </div>

      {/* Diagnosis Section */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-purple-800 flex items-center gap-2">
            <Search className="w-5 h-5" />
            تشخيص أنواع الصور
          </h3>
          <button
            onClick={diagnoseImages}
            disabled={diagnosing}
            className="text-purple-600 text-sm flex items-center gap-1 hover:text-purple-800"
          >
            <RefreshCw className={`w-4 h-4 ${diagnosing ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
        
        {diagnosis ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-600">{diagnosis.total_products}</div>
                <div className="text-xs text-gray-600">إجمالي المنتجات</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-green-600">{diagnosis.cdn_paths}</div>
                <div className="text-xs text-gray-600">على CDN ✓</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-amber-600">{diagnosis.base64_images}</div>
                <div className="text-xs text-gray-600">Base64 (تحتاج ترحيل)</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{diagnosis.urls}</div>
                <div className="text-xs text-gray-600">روابط URLs</div>
              </div>
            </div>
            
            {/* Sample Details */}
            {diagnosis.samples && diagnosis.samples.length > 0 && (
              <details className="mt-3">
                <summary className="text-sm text-purple-700 cursor-pointer hover:text-purple-900">
                  عرض تفاصيل العينات ({diagnosis.samples.length})
                </summary>
                <div className="mt-2 bg-white rounded-lg p-2 max-h-40 overflow-y-auto text-xs">
                  {diagnosis.samples.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-700 truncate max-w-[150px]">{s.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        s.type === 'cdn_path' ? 'bg-green-100 text-green-700' :
                        s.type.includes('base64') ? 'bg-amber-100 text-amber-700' :
                        s.type === 'url' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {s.type}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : (
          <div className="text-center py-4 text-purple-600">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            جاري التشخيص...
          </div>
        )}
      </div>

      {/* Info Card */}
      {diagnosis && diagnosis.base64_images === 0 && diagnosis.cdn_paths > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-800 mb-1">الصور مرحّلة بالفعل!</h3>
              <p className="text-sm text-green-700">
                جميع صور المنتجات مخزنة على CDN. لا حاجة للترحيل.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Migration Controls - Show only if there are images to migrate */}
      {diagnosis && (diagnosis.base64_images > 0 || diagnosis.unknown > 0) && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-gray-600" />
            التحكم في الترحيل
          </h3>
          
          <div className="space-y-4">
            {/* Batch Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                عدد المنتجات في كل دفعة
              </label>
              <div className="flex gap-2">
                {[5, 10, 20, 50].map(size => (
                  <button
                    key={size}
                    onClick={() => setBatchSize(size)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      batchSize === size
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Migrate Button */}
            <button
              onClick={migrateBatch}
              disabled={migrating}
              className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {migrating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الترحيل...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  ترحيل الدفعة التالية
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {lastResult && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-gray-600" />
            نتائج آخر ترحيل
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{lastResult.migrated_count}</div>
              <div className="text-sm text-green-700">تم ترحيلهم الآن</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{totalMigrated}</div>
              <div className="text-sm text-blue-700">إجمالي المرحّل</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{lastResult.remaining_count}</div>
              <div className="text-sm text-amber-700">المتبقي</div>
            </div>
          </div>

          {/* Migrated Products List */}
          {lastResult.products && lastResult.products.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-600 mb-2">المنتجات المرحّلة:</h4>
              <div className="bg-gray-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                {lastResult.products.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-gray-700">{p.name}</span>
                    <span className="text-gray-500">{p.images_count} صور</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Products */}
          {lastResult.failed && lastResult.failed.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-600 mb-2">منتجات فشل ترحيلها:</h4>
              <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                {lastResult.failed.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-red-700">{p.name}</span>
                    <span className="text-red-500 text-xs">{p.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info about URLs */}
      {diagnosis && diagnosis.urls > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>ملاحظة:</strong> يوجد {diagnosis.urls} منتج بصور مخزنة كروابط URLs خارجية. 
              هذه الصور لا تحتاج ترحيل لأنها بالفعل مستضافة على خوادم أخرى.
            </div>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>ملاحظة:</strong> عملية الترحيل آمنة ولا تحذف الصور القديمة. 
            المنتجات الجديدة سترفع صورها تلقائياً إلى CDN.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageMigrationTab;
