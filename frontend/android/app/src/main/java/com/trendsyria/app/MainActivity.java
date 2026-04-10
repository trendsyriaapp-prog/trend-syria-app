package com.trendsyria.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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
