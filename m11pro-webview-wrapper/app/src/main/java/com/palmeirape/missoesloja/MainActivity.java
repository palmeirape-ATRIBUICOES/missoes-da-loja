package com.palmeirape.missoesloja;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private static final java.util.Set<WebView> activeWebViews = java.util.Collections.synchronizedSet(new java.util.HashSet<WebView>());

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Dynamic Immersive Fullscreen (Hides titlebars, statusbar, and navigations for POS look)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        View decorView = getWindow().getDecorView();
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(getWindow(), decorView);
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);

        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        WebSettings webSettings = webView.getSettings();
        
        // Enabling vital elements for a modern React Single Page Application
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setSupportZoom(false);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        
        // High performance WebView Caching and File/Content Access policies
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        
        // Force high-speed GPU Hardware rendering
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // Native Android Print Bridge registration
        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidPrinter");

        // Keep inside local frame instead of opening system default browser
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
            }
        });

        // Load the live remote production URL
        webView.loadUrl("https://palmeirape-atribuicoes.github.io/missoes-da-loja/");
    }

    /**
     * Interface JavaScript para a WebView se comunicar com os recursos nativos do tablet
     */
    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void printHtml(final String html) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    // Instancia uma WebView em segundo plano temporária para carregar o cupom
                    final WebView tempWebView = new WebView(mContext);
                    activeWebViews.add(tempWebView); // Mantém a referência viva contra Garbage Collector
                    
                    tempWebView.getSettings().setJavaScriptEnabled(true);
                    tempWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView view, String url) {
                            // Assim que carregar o cupom em HTML, dispara o Job de impressão do Android
                            createWebPrintJob(view);
                            
                            // Remove a referência após 15 segundos para liberar memória
                            new android.os.Handler().postDelayed(new Runnable() {
                                @Override
                                public void run() {
                                    activeWebViews.remove(tempWebView);
                                }
                            }, 15000);
                        }
                    });
                    
                    // Carrega o HTML cru da nota
                    tempWebView.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);
                }
            });
        }

        @JavascriptInterface
        public void fetchSefazData(final String key) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    final WebView scraperWebView = new WebView(mContext);
                    scraperWebView.getSettings().setJavaScriptEnabled(true);
                    scraperWebView.getSettings().setDomStorageEnabled(true);
                    scraperWebView.setWebViewClient(new WebViewClient() {
                        boolean keyFilled = false;

                        @Override
                        public void onPageFinished(WebView view, String url) {
                            super.onPageFinished(view, url);
                            if (!keyFilled) {
                                String js = "javascript:(function() {" +
                                        "var keyInput = document.querySelector('input[type=\"text\"]') || " +
                                        "               document.querySelector('input[id*=\"chave\"]') || " +
                                        "               document.querySelector('input[name*=\"chave\"]');" +
                                        "if (keyInput) {" +
                                        "    keyInput.value = '" + key + "';" +
                                        "    keyInput.dispatchEvent(new Event('input', { bubbles: true }));" +
                                        "    keyInput.dispatchEvent(new Event('change', { bubbles: true }));" +
                                        "    var btnSubmit = document.querySelector('input[type=\"submit\"]') || " +
                                        "                    document.querySelector('button[type=\"submit\"]') || " +
                                        "                    document.querySelector('input[value*=\"Consultar\"]') || " +
                                        "                    document.querySelector('button[id*=\"consultar\"]');" +
                                        "    if (btnSubmit) {" +
                                        "        btnSubmit.click();" +
                                        "    }" +
                                        "}" +
                                        "})()";
                                scraperWebView.loadUrl(js);
                                keyFilled = true;
                            } else {
                                String js = "javascript:(function() {" +
                                        "var bodyText = document.body.innerText || '';" +
                                        "AndroidPrinter.onSefazResult(bodyText);" +
                                        "})()";
                                scraperWebView.loadUrl(js);
                            }
                        }
                    });
                    scraperWebView.loadUrl("https://consultadfe.fazenda.rj.gov.br/consultaDFe/paginas/consultaChaveAcesso.faces");
                }
            });
        }

        @JavascriptInterface
        public void onSefazResult(final String rawText) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    String escapedText = rawText.replace("\\", "\\\\")
                                                .replace("'", "\\'")
                                                .replace("\"", "\\\"")
                                                .replace("\n", "\\n")
                                                .replace("\r", "\\r");
                    webView.loadUrl("javascript:if(window.onSefazResultReceived) { window.onSefazResultReceived(\"" + escapedText + "\"); }");
                }
            });
        }
    }

    /**
     * Dispara o fluxo de impressão oficial do Android
     */
    private void createWebPrintJob(WebView webViewToPrint) {
        PrintManager printManager = (PrintManager) this.getSystemService(Context.PRINT_SERVICE);
        PrintDocumentAdapter printAdapter = webViewToPrint.createPrintDocumentAdapter("Cupom Venda");
        String jobName = getString(R.string.app_name) + " - Cupom";
        
        PrintAttributes.Builder builder = new PrintAttributes.Builder();
        // Otimização de margem e layout para bobinas térmicas contínuas de 80mm/58mm
        builder.setMinMargins(PrintAttributes.Margins.NO_MARGINS);
        
        if (printManager != null) {
            printManager.print(jobName, printAdapter, builder.build());
        }
    }

    // Handles hardware back buttons on M11Pro device to navigate back inside WebView history
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
