// /app/frontend/src/components/ErrorBoundary.js
// نظام عرض الأخطاء - يعرض الخطأ على الشاشة مباشرة

import React from 'react';
import logger from '../lib/logger';

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
    
    // طباعة في Console
    logger.error('🔴 ErrorBoundary caught error:', error);
    logger.error('📍 Component Stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div dir="rtl" style={{
          minHeight: '100vh',
          background: '#FF6B00',
          padding: '20px',
          fontFamily: 'Tajawal, Arial, sans-serif',
          color: 'white'
        }}>
          <div style={{
            maxWidth: '100%',
            margin: '0 auto'
          }}>
            {/* Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '60px', marginBottom: '10px' }}>⚠️</div>
              <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                حدث خطأ في التطبيق
              </h1>
              <p style={{ opacity: 0.9, margin: 0, fontSize: '14px' }}>
                التقط صورة لهذه الشاشة وأرسلها للدعم الفني
              </p>
            </div>

            {/* Error Box */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              {/* Error Name */}
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>
                  نوع الخطأ:
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error?.name || 'Error'}
                </div>
              </div>

              {/* Error Message */}
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '4px' }}>
                  رسالة الخطأ:
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  fontFamily: 'monospace',
                  wordBreak: 'break-word',
                  lineHeight: '1.5'
                }}>
                  {this.state.error?.message || 'Unknown error'}
                </div>
              </div>

              {/* Timestamp & Page */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '12px'
              }}>
                <div style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '10px'
                }}>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>الوقت:</div>
                  <div style={{ fontSize: '12px', marginTop: '2px' }}>
                    {this.state.timestamp}
                  </div>
                </div>
                <div style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '10px'
                }}>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>الصفحة:</div>
                  <div style={{ fontSize: '12px', marginTop: '2px', fontFamily: 'monospace' }}>
                    {window.location.pathname}
                  </div>
                </div>
              </div>

              {/* Component Stack */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '12px'
              }}>
                <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '6px' }}>
                  مكان الخطأ:
                </div>
                <pre style={{ 
                  fontSize: '10px', 
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                  maxHeight: '150px',
                  overflow: 'auto',
                  lineHeight: '1.4'
                }}>
                  {this.state.errorInfo?.componentStack?.slice(0, 500) || 'No stack available'}
                </pre>
              </div>

              {/* Full Stack Trace */}
              {this.state.error?.stack && (
                <div style={{
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '12px',
                  padding: '12px'
                }}>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginBottom: '6px' }}>
                    Stack Trace:
                  </div>
                  <pre style={{ 
                    fontSize: '9px', 
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                    maxHeight: '200px',
                    overflow: 'auto',
                    lineHeight: '1.4'
                  }}>
                    {this.state.error.stack.slice(0, 1000)}
                  </pre>
                </div>
              )}
            </div>

            {/* Reload Button */}
            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                padding: '16px',
                background: 'white',
                color: '#FF6B00',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'Tajawal, Arial, sans-serif'
              }}
            >
              🔄 إعادة تحميل التطبيق
            </button>

            {/* App Version */}
            <div style={{
              textAlign: 'center',
              marginTop: '16px',
              fontSize: '11px',
              opacity: 0.7
            }}>
              إصدار التطبيق: {window.APP_BUILD_VERSION || 'غير محدد'}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
