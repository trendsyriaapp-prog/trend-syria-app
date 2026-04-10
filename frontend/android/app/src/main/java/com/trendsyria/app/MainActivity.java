package com.trendsyria.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // تأخير تهيئة WebView حتى يكون Bridge جاهزاً
        // نستخدم post() لضمان أن Bridge مُهيأ
        getWindow().getDecorView().post(new Runnable() {
            @Override
            public void run() {
                configureWebViewForNativeApp();
            }
        });
    }
    
    /**
     * تهيئة WebView ليتصرف كتطبيق أصلي وليس كموقع
     * - تعطيل الضغط المطول (لمنع قائمة النسخ)
     * - تعطيل التكبير
     */
    private void configureWebViewForNativeApp() {
        try {
            // التحقق من وجود Bridge و WebView
            if (getBridge() == null) return;
            
            WebView webView = getBridge().getWebView();
            if (webView == null) return;
            
            // تعطيل الضغط المطول (context menu)
            webView.setLongClickable(false);
            webView.setOnLongClickListener(new View.OnLongClickListener() {
                @Override
                public boolean onLongClick(View v) {
                    return true; // استهلاك الحدث ومنع القائمة
                }
            });
            
            // إعدادات WebView
            WebSettings settings = webView.getSettings();
            if (settings != null) {
                // تعطيل التكبير
                settings.setSupportZoom(false);
                settings.setBuiltInZoomControls(false);
                settings.setDisplayZoomControls(false);
            }
            
        } catch (Exception e) {
            // تجاهل الأخطاء - الأهم أن التطبيق لا يتوقف
            e.printStackTrace();
        }
    }

    @Override
    public void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        // حفظ حالة WebView
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().saveState(outState);
        }
    }

    @Override
    protected void onRestoreInstanceState(Bundle savedInstanceState) {
        super.onRestoreInstanceState(savedInstanceState);
        // استعادة حالة WebView
        if (getBridge() != null && getBridge().getWebView() != null && savedInstanceState != null) {
            getBridge().getWebView().restoreState(savedInstanceState);
        }
    }
}
