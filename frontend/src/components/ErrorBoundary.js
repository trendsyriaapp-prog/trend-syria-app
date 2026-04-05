import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">حدث خطأ غير متوقع</h1>
            <p className="text-gray-600 mb-6">نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.</p>
            <div className="space-y-3">
              <button onClick={this.handleTryAgain} className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2">
                <RefreshCw size={20} />
                إعادة المحاولة
              </button>
              <button onClick={this.handleGoHome} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2">
                <Home size={20} />
                العودة للرئيسية
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
