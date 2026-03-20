// /app/frontend/src/components/admin/RecordedCallsTab.js
// تبويب المكالمات المسجلة - للمدير فقط

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Phone, Play, Pause, Download, Calendar, Clock, 
  User, Truck, Search, RefreshCw, Volume2, ChevronLeft, ChevronRight
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const RecordedCallsTab = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState(null);
  const audioRef = useRef(null);

  // جلب المكالمات المسجلة
  const fetchCalls = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/voip/admin/recorded-calls`, {
        params: { page, limit: 10 }
      });
      setCalls(response.data.calls || []);
      setTotalPages(response.data.pages || 1);
    } catch (err) {
      console.error('Error fetching recorded calls:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCalls();
  }, [page]);

  // تشغيل/إيقاف التسجيل
  const togglePlay = async (recordingId) => {
    if (playingId === recordingId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      try {
        const audioUrl = `${API}/api/voip/recording/${recordingId}/play`;
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          await audioRef.current.play();
          setPlayingId(recordingId);
        }
      } catch (err) {
        console.error('Error playing recording:', err);
      }
    }
  };

  // تحميل التسجيل
  const downloadRecording = (recordingId, filename) => {
    const link = document.createElement('a');
    link.href = `${API}/api/voip/recording/${recordingId}/play`;
    link.download = filename || `recording_${recordingId}.webm`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // تنسيق المدة
  const formatDuration = (seconds) => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // تنسيق التاريخ
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // تنسيق حجم الملف
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // فلترة المكالمات
  const filteredCalls = calls.filter(call => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      call.caller_name?.toLowerCase().includes(q) ||
      call.callee_name?.toLowerCase().includes(q) ||
      call.order_number?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Phone className="text-green-500" />
            المكالمات المسجلة
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            استمع إلى تسجيلات المكالمات لحل النزاعات
          </p>
        </div>
        <button
          onClick={fetchCalls}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="ابحث بالاسم أو رقم الطلب..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pr-10 pl-4 py-2 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
        />
      </div>

      {/* Calls List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" />
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Phone size={48} className="mx-auto mb-4 opacity-50" />
          <p>لا توجد مكالمات مسجلة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCalls.map((call) => (
            <motion.div
              key={call.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800 rounded-lg p-4 border border-gray-700"
            >
              {/* Call Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Phone size={20} className="text-green-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-white font-medium">
                      <span>{call.caller_name}</span>
                      <span className="text-gray-500">→</span>
                      <span>{call.callee_name}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      طلب #{call.order_number || '-'}
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-white font-mono">
                    {formatDuration(call.duration_seconds)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(call.started_at)}
                  </div>
                </div>
              </div>

              {/* Recordings */}
              {call.recordings && call.recordings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-400 mb-2">التسجيلات:</div>
                  {call.recordings.map((rec, idx) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between bg-gray-900 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => togglePlay(rec.id)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            playingId === rec.id
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {playingId === rec.id ? (
                            <Pause size={18} />
                          ) : (
                            <Play size={18} />
                          )}
                        </button>
                        <div>
                          <div className="text-sm text-white">
                            تسجيل {rec.uploader_type === 'caller' ? 'المتصل' : 'المستقبل'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatFileSize(rec.size_bytes)} • ينتهي {formatDate(rec.expires_at)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => downloadRecording(rec.id, rec.filename)}
                        className="p-2 text-gray-400 hover:text-white transition-all"
                        title="تحميل"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Participants Info */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700 text-sm">
                <div className="flex items-center gap-1 text-gray-400">
                  {call.caller_type === 'driver' ? (
                    <Truck size={14} />
                  ) : (
                    <User size={14} />
                  )}
                  <span>{call.caller_type === 'driver' ? 'سائق' : 'عميل'}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <span>نوع الطلب:</span>
                  <span className={call.order_type === 'food' ? 'text-orange-400' : 'text-blue-400'}>
                    {call.order_type === 'food' ? 'طعام' : 'منتجات'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
          >
            <ChevronRight size={16} />
            السابق
          </button>
          <span className="text-gray-400">
            صفحة {page} من {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
          >
            التالي
            <ChevronLeft size={16} />
          </button>
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={() => setPlayingId(null)}
        onError={() => setPlayingId(null)}
      />
    </div>
  );
};

export default RecordedCallsTab;
