package com.trendsyria.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // تهيئة WebView بإعدادات التطبيق الأصلي
        configureWebView();
    }
    
    /**
     * تهيئة WebView لتعمل كتطبيق أصلي وليس كموقع
     */
    private void configureWebView() {
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            
            // تعطيل التكبير
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            
            // تحسين الأداء
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            
            // منع تحديد النص الطويل
            webView.setLongClickable(false);
            webView.setHapticFeedbackEnabled(false);
            
            // تعطيل قائمة السياق (context menu)
            webView.setOnLongClickListener(v -> true);
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
