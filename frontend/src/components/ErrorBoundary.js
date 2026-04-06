// /app/frontend/src/components/ErrorBoundary.js
// نظام عرض الأخطاء للمطور - يعرض كل التفاصيل

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      timestamp: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
      timestamp: new Date().toLocaleString('ar-SY')
    });
    
    // طباعة في Console أيضاً
    console.error('🔴 ErrorBoundary caught error:', error);
    console.error('📍 Component Stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          padding: '20px',
          fontFamily: 'Tajawal, sans-serif'
        }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            background: '#fff',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              padding: '24px',
              color: 'white'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>❌</div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                حدث خطأ في التطبيق
              </h1>
              <p style={{ opacity: 0.9, margin: 0, fontSize: '14px' }}>
                التقط صورة لهذه الشاشة وأرسلها للمطور
              </p>
            </div>

            {/* Error Details */}
            <div style={{ padding: '24px' }}>
              {/* Error Name & Message */}
              <div style={{
                background: '#fef2f2',
                border: '2px solid #fecaca',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#991b1b', 
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  🔴 نوع الخطأ
                </div>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  color: '#dc2626',
                  fontFamily: 'monospace'
                }}>
                  {this.state.error?.name || 'Error'}
                </div>
              </div>

              {/* Error Message */}
              <div style={{
                background: '#fff7ed',
                border: '2px solid #fed7aa',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#c2410c', 
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  📝 رسالة الخطأ
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  color: '#ea580c',
                  fontFamily: 'monospace',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error?.message || 'Unknown error'}
                </div>
              </div>

              {/* Timestamp & Page */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <div style={{
                  background: '#f0fdf4',
                  border: '2px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '12px', color: '#166534', fontWeight: 'bold' }}>
                    🕐 الوقت
                  </div>
                  <div style={{ fontSize: '13px', color: '#15803d', marginTop: '4px' }}>
                    {this.state.timestamp}
                  </div>
                </div>
                <div style={{
                  background: '#eff6ff',
                  border: '2px solid #bfdbfe',
                  borderRadius: '12px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 'bold' }}>
                    📍 الصفحة
                  </div>
                  <div style={{ fontSize: '13px', color: '#1d4ed8', marginTop: '4px', fontFamily: 'monospace' }}>
                    {window.location.pathname}
                  </div>
                </div>
              </div>

              {/* Component Stack */}
              <div style={{
                background: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#475569', 
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}>
                  📚 مكان الخطأ (Component Stack)
                </div>
                <pre style={{ 
                  fontSize: '11px', 
                  color: '#64748b',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                  maxHeight: '200px',
                  overflow: 'auto',
                  background: '#f1f5f9',
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  {this.state.errorInfo?.componentStack || 'No stack available'}
                </pre>
              </div>

              {/* Full Stack Trace */}
              {this.state.error?.stack && (
                <div style={{
                  background: '#1e1e1e',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#10b981', 
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>
                    🔍 Stack Trace الكامل
                  </div>
                  <pre style={{ 
                    fontSize: '10px', 
                    color: '#e2e8f0',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                    maxHeight: '250px',
                    overflow: 'auto'
                  }}>
                    {this.state.error.stack}
                  </pre>
                </div>
              )}

              {/* Reload Button */}
              <button
                onClick={() => window.location.reload()}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif'
                }}
              >
                🔄 إعادة تحميل الصفحة
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
