// /app/frontend/src/components/ErrorBoundary.js
// مكون Error Boundary لمنع انهيار التطبيق بالكامل عند حدوث خطأ

import React from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowRight } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // تحديث الحالة لعرض واجهة الخطأ
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // يمكن تسجيل الخطأ في خدمة خارجية
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ 
      errorInfo,
      errorCount: this.state.errorCount + 1
    });
  }

  handleRefresh = () => {
    // إعادة تحميل الصفحة الحالية
    window.location.reload();
  };

  handleGoHome = () => {
    // الذهاب للصفحة الرئيسية
    window.location.href = '/';
  };

  handleTryAgain = () => {
    // محاولة إعادة العرض
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // واجهة الخطأ البديلة
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            {/* أيقونة الخطأ */}
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            
            {/* عنوان الخطأ */}
            <h1 className="text-2xl font-bold text-gray-800 mb-3">
              حدث خطأ غير متوقع
            </h1>
            
            {/* رسالة الخطأ */}
            <p className="text-gray-600 mb-6">
              نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
            </p>
            
            {/* تفاصيل الخطأ (للمطورين) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-right">
                <p className="text-red-700 text-sm font-medium mb-2">تفاصيل الخطأ:</p>
                <pre className="text-red-600 text-xs overflow-auto max-h-32 text-left" dir="ltr">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    <div className="mt-2 text-gray-500">
                      {this.state.errorInfo.componentStack}
                    </div>
                  )}
                </pre>
              </div>
            )}
            
            {/* أزرار الإجراءات */}
            <div className="space-y-3">
              {/* زر إعادة المحاولة */}
              <button
                onClick={this.handleTryAgain}
                className="w-full bg-[#FF6B00] hover:bg-[#E65000] text-white py-3 px-6 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} />
                إعادة المحاولة
              </button>
              
              {/* زر الصفحة الرئيسية */}
              <button
                onClick={this.handleGoHome}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Home size={20} />
                العودة للرئيسية
              </button>
              
              {/* زر إعادة تحميل الصفحة */}
              <button
                onClick={this.handleRefresh}
                className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm transition-colors"
              >
                إعادة تحميل الصفحة
              </button>
            </div>
            
            {/* شعار */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-400">ترند سوريا</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
