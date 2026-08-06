package com.cdesign.gpstracker

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * Deschide o pagină web a aplicației (chat /driver sau trasee /routes) într-un WebView.
 * Suportă atașarea de documente (upload din galerie/fișiere/cameră).
 */
class CoursesActivity : AppCompatActivity() {

    private lateinit var web: WebView
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val fileChooser = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val cb = filePathCallback
        filePathCallback = null
        if (cb == null) return@registerForActivityResult
        val uris = if (result.resultCode == RESULT_OK)
            WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        else null
        cb.onReceiveValue(uris ?: arrayOf())
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val url = Prefs.serverUrl(this)
        val key = Prefs.deviceKey(this)
        if (url.isEmpty() || key.isEmpty()) { finish(); return }
        // Pagina de deschis în WebView (ex. "/driver" chat, "/routes" trasee)
        val path = intent.getStringExtra("path") ?: "/driver"

        web = WebView(this)
        setContentView(web)
        // Ține ecranul aprins cât timp pagina (trasee/navigație/chat) e deschisă.
        web.keepScreenOn = true
        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        web.settings.javaScriptEnabled = true
        // Permite sunetul (goarna la Roll Race) fără gest suplimentar.
        web.settings.mediaPlaybackRequiresUserGesture = false
        web.settings.domStorageEnabled = true
        web.settings.allowFileAccess = true
        web.settings.setGeolocationEnabled(true)
        // Punte JS↔nativ: înregistrarea traseului merge și cu aplicația minimizată
        // (pornește serviciul de locație în fundal, cu notificare).
        web.addJavascriptInterface(RecBridge(), "SXURec")
        // Nu cachea pagina — ia mereu versiunea proaspătă de pe server.
        web.settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val uri = request?.url ?: return false
                val scheme = uri.scheme ?: ""
                // linkurile de pe platforma noastră rămân în WebView
                if (scheme == "http" || scheme == "https") {
                    val baseHost = Uri.parse(Prefs.serverUrl(this@CoursesActivity)).host ?: ""
                    if (uri.host.equals(baseHost, true)) return false
                }
                // tel:, waze, google maps etc. -> aplicațiile telefonului
                return openExternal(uri)
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            // Permite paginii /driver să folosească locația (pt. distanța până la cursă).
            // Aplicația are deja permisiunea de locație acordată.
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }

            override fun onShowFileChooser(
                webView: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                filePathCallback?.onReceiveValue(null)
                filePathCallback = callback
                val intent = params?.createIntent()
                    ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        addCategory(Intent.CATEGORY_OPENABLE)
                        type = "*/*"
                    }
                return try {
                    fileChooser.launch(intent)
                    true
                } catch (e: Exception) {
                    filePathCallback = null
                    false
                }
            }
        }
        web.loadUrl("$url$path?key=$key&t=" + System.currentTimeMillis())
    }

    private fun openExternal(uri: Uri): Boolean {
        return try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
            true
        } catch (e: Exception) {
            false
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::web.isInitialized && web.canGoBack()) web.goBack()
        else super.onBackPressed()
    }

    /** Expus paginii web ca `window.SXURec` — pornește/oprește tracking-ul nativ pentru înregistrare în fundal. */
    inner class RecBridge {
        private var startedByRec = false
        @JavascriptInterface fun available(): Boolean = true
        @JavascriptInterface fun startRec() {
            if (!Prefs.isRunning(this@CoursesActivity)) {
                startedByRec = true
                ContextCompat.startForegroundService(
                    this@CoursesActivity, Intent(this@CoursesActivity, LocationService::class.java)
                )
            } else {
                startedByRec = false
            }
        }
        @JavascriptInterface fun stopRec() {
            if (startedByRec) {
                stopService(Intent(this@CoursesActivity, LocationService::class.java))
                startedByRec = false
            }
        }
        /** Deschide Waze cu navigație către un punct. Dacă ești în split-screen, apare în panoul alăturat. */
        @JavascriptInterface fun openWaze(lat: Double, lng: Double) {
            val uri = Uri.parse("https://waze.com/ul?ll=$lat,$lng&navigate=yes")
            try {
                startActivity(Intent(Intent.ACTION_VIEW, uri).apply {
                    setPackage("com.waze")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_LAUNCH_ADJACENT)
                })
            } catch (e: Exception) {
                // Waze neinstalat → deschide linkul (browser / Google Play)
                try { startActivity(Intent(Intent.ACTION_VIEW, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } catch (e2: Exception) {}
            }
        }
    }
}
