// /app/frontend/src/components/admin/ImageMigrationTab.js
// أداة ترحيل الصور من Base64 إلى CDN

import { useState } from 'react';
import axios from 'axios';
import { 
  Cloud, Image, RefreshCw, CheckCircle2, AlertTriangle, 
  Play, Loader2, BarChart2, Download
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const ImageMigrationTab = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [migrating, setMigrating] = useState(false);
  const [stats, setStats] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [batchSize, setBatchSize] = useState(10);
  const [totalMigrated, setTotalMigrated] = useState(0);

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
      
      toast({
        title: "تم الترحيل بنجاح",
        description: `تم ترحيل ${res.data.migrated_count} منتج. المتبقي: ${res.data.remaining_count}`,
        variant: res.data.remaining_count > 0 ? "default" : "success"
      });
      
      // إذا بقي المزيد، نسأل المستخدم
      if (res.data.remaining_count === 0) {
        toast({
          title: "اكتمل الترحيل!",
          description: "تم ترحيل جميع الصور إلى CDN",
          variant: "success"
        });
      }
      
    } catch (error) {
      console.error('Migration error:', error);
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
          <p className="text-sm text-gray-500">نقل الصور من قاعدة البيانات إلى التخزين السحابي لتحسين الأداء</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 mb-1">لماذا الترحيل؟</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>تقليل حجم الصفحة:</strong> من ~1.8MB إلى ~50KB</li>
              <li>• <strong>سرعة تحميل أفضل:</strong> خاصة على الإنترنت البطيء</li>
              <li>• <strong>توفير في قاعدة البيانات:</strong> تخزين URLs بدلاً من Base64</li>
              <li>• <strong>CDN عالمي:</strong> تحميل أسرع من أقرب خادم</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Migration Controls */}
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

      {/* Results */}
      {lastResult && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
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

          {/* Completion Message */}
          {lastResult.remaining_count === 0 && (
            <div className="mt-4 bg-green-100 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <div className="font-semibold text-green-800">اكتمل الترحيل!</div>
                <div className="text-sm text-green-700">جميع صور المنتجات الآن على CDN</div>
              </div>
            </div>
          )}
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
