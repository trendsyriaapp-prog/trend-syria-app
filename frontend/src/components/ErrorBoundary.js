// /app/frontend/src/components/ErrorBoundary.js
// نظام عرض الأخطاء - يعرض الخطأ على الشاشة مباشرة

import React from 'react';
import logger from '../lib/logger';
import { logComponentError } from '../lib/errorLogger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      timestamp: null,
      isChunkError: false
    };
  }

  static getDerivedStateFromError(error) {
    // التحقق من ChunkLoadError
    const isChunkError = error?.name === 'ChunkLoadError' || 
                         error?.message?.includes('Loading chunk') ||
                         error?.message?.includes('Loading CSS chunk') ||
                         error?.message?.includes('Failed to fetch dynamically imported module');
    
    return { hasError: true, isChunkError };
  }

  componentDidCatch(error, errorInfo) {
    const isChunkError = error?.name === 'ChunkLoadError' || 
                         error?.message?.includes('Loading chunk') ||
                         error?.message?.includes('Loading CSS chunk') ||
                         error?.message?.includes('Failed to fetch dynamically imported module');
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      timestamp: new Date().toLocaleString('ar-SY'),
      isChunkError
    });
    
    // طباعة في Console
    logger.error('🔴 ErrorBoundary caught error:', error);
    logger.error('📍 Component Stack:', errorInfo.componentStack);
    
    // 📊 تسجيل الخطأ في النظام المركزي
    logComponentError(error, errorInfo, this.props.componentName || window.location.pathname);
    
    // إذا كان ChunkLoadError، إعادة تحميل الصفحة تلقائياً بعد 2 ثانية
    if (isChunkError) {
      logger.log('🔄 ChunkLoadError detected, auto-reloading in 2 seconds...');
      setTimeout(() => {
        // مسح الكاش وإعادة التحميل
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
          });
        }
        window.location.reload(true);
      }, 2000);
    }
  }

  handleReload = () => {
    // مسح الكاش قبل إعادة التحميل
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    // مسح localStorage للـ chunks القديمة
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('chunk_') || key.startsWith('webpack_')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload(true);
  };

  render() {
    if (this.state.hasError) {
      // رسالة مخصصة لـ ChunkLoadError
      if (this.state.isChunkError) {
        return (
          <div dir="rtl" style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #FF6B00 0%, #FF8533 100%)',
            padding: '20px',
            fontFamily: 'Tajawal, Arial, sans-serif',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              maxWidth: '400px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>🔄</div>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
                جاري التحديث...
              </h1>
              <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '24px', lineHeight: '1.6' }}>
                يتم تحميل إصدار جديد من التطبيق.
                <br />
                سيتم إعادة التحميل تلقائياً خلال ثوانٍ.
              </p>
              
              {/* Loading indicator */}
              <div style={{
                width: '50px',
                height: '50px',
                border: '4px solid rgba(255,255,255,0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                margin: '0 auto 24px',
                animation: 'spin 1s linear infinite'
              }} />
              
              <button
                onClick={this.handleReload}
                style={{
                  width: '100%',
                  padding: '16px 32px',
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
                إعادة التحميل الآن
              </button>
              
              <p style={{ 
                fontSize: '12px', 
                opacity: 0.7, 
                marginTop: '20px' 
              }}>
                إذا استمرت المشكلة، جرب مسح بيانات التطبيق
              </p>
            </div>
            
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        );
      }
      
      // الشاشة العادية للأخطاء الأخرى
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
