// /app/frontend/src/components/ApiErrorDisplay.js
// مكون لعرض أخطاء API بشكل واضح للمطور

import React from 'react';
import { AlertTriangle, RefreshCw, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';

const ApiErrorDisplay = ({ 
  error, 
  endpoint = 'غير محدد', 
  method = 'GET',
  onRetry = null,
  context = ''
}) => {
  const [copied, setCopied] = useState(false);
  
  // استخراج معلومات الخطأ
  const errorInfo = {
    status: error?.response?.status || error?.status || 'N/A',
    statusText: error?.response?.statusText || error?.statusText || 'Unknown',
    message: error?.response?.data?.detail || error?.response?.data?.message || error?.message || 'خطأ غير معروف',
    data: error?.response?.data || null,
    timestamp: new Date().toLocaleString('ar-SY'),
    page: window.location.pathname,
    endpoint: endpoint,
    method: method
  };

  // نسخ معلومات الخطأ
  const copyError = () => {
    const errorText = `
❌ خطأ API
━━━━━━━━━━━━━━━━━━━━
📍 الصفحة: ${errorInfo.page}
🔗 Endpoint: ${errorInfo.method} ${errorInfo.endpoint}
📊 Status: ${errorInfo.status} ${errorInfo.statusText}
📝 الرسالة: ${errorInfo.message}
🕐 الوقت: ${errorInfo.timestamp}
${context ? `📌 السياق: ${context}` : ''}
${errorInfo.data ? `\n📦 Response Data:\n${JSON.stringify(errorInfo.data, null, 2)}` : ''}
━━━━━━━━━━━━━━━━━━━━
    `.trim();
    
    navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      dir="rtl"
      className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6 my-4 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-red-700 mb-1">
            خطأ في الاتصال بالسيرفر
          </h3>
          <p className="text-red-600 text-sm">
            التقط صورة لهذه الرسالة وأرسلها للمطور
          </p>
        </div>
      </div>

      {/* Error Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Status Code */}
        <div className="bg-white rounded-xl p-3 border border-red-100">
          <div className="text-xs text-gray-500 mb-1">📊 كود الحالة</div>
          <div className="font-mono font-bold text-red-600 text-lg">
            {errorInfo.status}
          </div>
        </div>
        
        {/* Method & Endpoint */}
        <div className="bg-white rounded-xl p-3 border border-red-100">
          <div className="text-xs text-gray-500 mb-1">🔗 Endpoint</div>
          <div className="font-mono text-xs text-gray-700 truncate">
            <span className="bg-blue-100 text-blue-700 px-1 rounded mr-1">{errorInfo.method}</span>
            {errorInfo.endpoint}
          </div>
        </div>
        
        {/* Page */}
        <div className="bg-white rounded-xl p-3 border border-red-100">
          <div className="text-xs text-gray-500 mb-1">📍 الصفحة</div>
          <div className="font-mono text-sm text-gray-700">
            {errorInfo.page}
          </div>
        </div>
        
        {/* Timestamp */}
        <div className="bg-white rounded-xl p-3 border border-red-100">
          <div className="text-xs text-gray-500 mb-1">🕐 الوقت</div>
          <div className="text-sm text-gray-700">
            {errorInfo.timestamp}
          </div>
        </div>
      </div>

      {/* Error Message */}
      <div className="bg-white rounded-xl p-4 border border-red-100 mb-4">
        <div className="text-xs text-gray-500 mb-2">📝 رسالة الخطأ</div>
        <div className="font-mono text-sm text-red-600 bg-red-50 p-3 rounded-lg break-words">
          {errorInfo.message}
        </div>
      </div>

      {/* Response Data (if available) */}
      {errorInfo.data && typeof errorInfo.data === 'object' && (
        <div className="bg-gray-900 rounded-xl p-4 mb-4">
          <div className="text-xs text-green-400 mb-2">📦 Response Data</div>
          <pre className="font-mono text-xs text-gray-300 overflow-auto max-h-32">
            {JSON.stringify(errorInfo.data, null, 2)}
          </pre>
        </div>
      )}

      {/* Context (if provided) */}
      {context && (
        <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200 mb-4">
          <div className="text-xs text-yellow-700 mb-1">📌 السياق</div>
          <div className="text-sm text-yellow-800">{context}</div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={copyError}
          className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            copied 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {copied ? (
            <>
              <CheckCircle size={18} />
              تم النسخ!
            </>
          ) : (
            <>
              <Copy size={18} />
              نسخ الخطأ
            </>
          )}
        </button>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all"
          >
            <RefreshCw size={18} />
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  );
};

export default ApiErrorDisplay;
