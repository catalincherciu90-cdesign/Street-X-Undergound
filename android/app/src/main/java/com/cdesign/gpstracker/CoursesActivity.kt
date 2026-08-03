package com.cdesign.gpstracker

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

/**
 * Afișează cursele curierului (pagina /driver) într-un WebView.
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

        web = WebView(this)
        setContentView(web)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.allowFileAccess = true
        web.settings.setGeolocationEnabled(true)
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
        web.loadUrl("$url/driver?key=$key")
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
}
