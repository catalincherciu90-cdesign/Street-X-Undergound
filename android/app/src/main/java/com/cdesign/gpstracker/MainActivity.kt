package com.cdesign.gpstracker

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.cdesign.gpstracker.databinding.ActivityMainBinding
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    private lateinit var b: ActivityMainBinding

    companion object {
        // Adresa platformei (se poate schimba din câmpul „Server")
        const val DEFAULT_SERVER = "https://gps-tracker.catalincherciu90.workers.dev"
    }

    private val requestFine = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { result ->
        val granted = result[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                result[Manifest.permission.ACCESS_COARSE_LOCATION] == true
        if (granted) requestBackgroundIfNeeded()
        else toast("Fără permisiune de locație aplicația nu poate funcționa.")
    }

    private val requestBackground = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { maybeStartAfterPermissions() }

    private val requestNotif = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.etInterval.setText(Prefs.intervalSec(this).toString())

        b.btnLogin.setOnClickListener { doLogin() }

        b.btnToggle.setOnClickListener {
            if (Prefs.isRunning(this)) {
                stopService(Intent(this, LocationService::class.java))
                Prefs.setRunning(this, false)
                updateStatus()
                toast("Ești OFFLINE.")
            } else {
                askPermissionsThenStart()
            }
        }

        b.ivProfile.setOnClickListener { showProfileDialog() }

        b.btnCourses.setOnClickListener {
            if (Prefs.serverUrl(this).isEmpty() || Prefs.deviceKey(this).isEmpty()) {
                toast("Conectează-te întâi cu utilizator și parolă.")
            } else {
                startActivity(Intent(this, CoursesActivity::class.java))
            }
        }

        updateStatus()
        loadProfile()
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
    }

    private fun loadProfile() {
        if (Prefs.deviceKey(this).isEmpty()) return
        val name = Prefs.deviceName(this)
        b.ivProfile.setImageBitmap(initialsBitmap(name))
        val id = Prefs.deviceId(this)
        if (id <= 0) return
        val url = Prefs.serverUrl(this)
        Thread {
            try {
                val conn = URL("$url/avatar/$id").openConnection() as HttpURLConnection
                conn.connectTimeout = 10000
                conn.readTimeout = 10000
                if (conn.responseCode == 200) {
                    val bmp = BitmapFactory.decodeStream(conn.inputStream)
                    conn.disconnect()
                    if (bmp != null) runOnUiThread { b.ivProfile.setImageBitmap(bmp) }
                } else conn.disconnect()
            } catch (e: Exception) { /* rămâne inițialele */ }
        }.start()
    }

    private fun initialsBitmap(name: String): Bitmap {
        val size = 120
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        p.color = Color.parseColor("#173a2a")
        c.drawCircle(size / 2f, size / 2f, size / 2f, p)
        p.color = Color.parseColor("#2fe08a")
        p.textSize = 52f
        p.textAlign = Paint.Align.CENTER
        p.typeface = Typeface.DEFAULT_BOLD
        val parts = name.trim().split(Regex("\\s+"))
        val ini = ((parts.getOrNull(0)?.firstOrNull() ?: ' ').toString() +
                (parts.getOrNull(1)?.firstOrNull() ?: ' ').toString()).trim().uppercase()
            .ifEmpty { "?" }
        val fm = p.fontMetrics
        c.drawText(ini, size / 2f, size / 2f - (fm.ascent + fm.descent) / 2, p)
        return bmp
    }

    private fun showProfileDialog() {
        val name = Prefs.deviceName(this).ifEmpty { "Curier" }
        AlertDialog.Builder(this)
            .setTitle(name)
            .setMessage("Conectat ca $name")
            .setPositiveButton("Deconectează") { _, _ -> doLogout() }
            .setNegativeButton("Închide", null)
            .show()
    }

    private fun doLogout() {
        stopService(Intent(this, LocationService::class.java))
        Prefs.clearSession(this)
        b.etPass.setText("")
        updateStatus()
        toast("Deconectat.")
    }

    private fun doLogin() {
        val url = Prefs.serverUrl(this).ifEmpty { DEFAULT_SERVER }.trimEnd('/')
        val user = b.etUser.text.toString().trim()
        val pass = b.etPass.text.toString()
        if (user.isEmpty() || pass.isEmpty()) {
            toast("Completează utilizator și parolă."); return
        }

        b.btnLogin.isEnabled = false
        b.btnLogin.text = "Se conectează…"
        Thread {
            try {
                val conn = URL("$url/api/device/login").openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.doOutput = true
                conn.connectTimeout = 15000
                conn.readTimeout = 15000
                conn.setRequestProperty("Content-Type", "application/json")
                val payload = JSONObject().put("username", user).put("password", pass).toString()
                conn.outputStream.use { it.write(payload.toByteArray()) }
                val code = conn.responseCode
                val stream = if (code == 200) conn.inputStream else conn.errorStream
                val text = stream?.bufferedReader()?.use { it.readText() } ?: ""
                conn.disconnect()
                runOnUiThread {
                    b.btnLogin.isEnabled = true
                    b.btnLogin.text = "Conectează"
                    if (code == 200) {
                        val o = JSONObject(text)
                        val key = o.optString("key")
                        val name = o.optString("name")
                        if (key.isNotEmpty()) {
                            val interval = b.etInterval.text.toString().toIntOrNull() ?: 30
                            Prefs.save(this, url, key, interval.coerceIn(5, 3600))
                            Prefs.setDeviceName(this, name)
                            Prefs.setDeviceId(this, o.optInt("id"))
                            b.etPass.setText("")
                            toast("Conectat: $name")
                            updateStatus()
                            loadProfile()
                        } else toast("Răspuns invalid de la server.")
                    } else {
                        val err = try { JSONObject(text).optString("error") } catch (e: Exception) { "" }
                        toast(if (err.isNotEmpty()) err else "Autentificare eșuată ($code)")
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    b.btnLogin.isEnabled = true
                    b.btnLogin.text = "Conectează"
                    toast("Eroare de rețea: ${e.message}")
                }
            }
        }.start()
    }

    private fun askPermissionsThenStart() {
        val fine = ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this, Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) requestNotif.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        if (!fine) {
            requestFine.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        } else requestBackgroundIfNeeded()
    }

    private fun requestBackgroundIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val bg = ContextCompat.checkSelfPermission(
                this, Manifest.permission.ACCESS_BACKGROUND_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
            if (!bg) {
                toast("Alege „Permite tot timpul” pentru urmărire în fundal.")
                requestBackground.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                return
            }
        }
        maybeStartAfterPermissions()
    }

    private fun maybeStartAfterPermissions() {
        val fine = ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        if (!fine && !coarse) { toast("Lipsă permisiune de locație."); return }
        ContextCompat.startForegroundService(this, Intent(this, LocationService::class.java))
        Prefs.setRunning(this, true)
        updateStatus()
        toast("Ești ONLINE.")
    }

    private fun updateStatus() {
        val connected = Prefs.deviceKey(this).isNotEmpty()
        val running = Prefs.isRunning(this)
        val who = Prefs.deviceName(this)

        b.loginBox.visibility = if (connected) View.GONE else View.VISIBLE
        b.onlineBox.visibility = if (connected) View.VISIBLE else View.GONE
        b.ivProfile.visibility = if (connected) View.VISIBLE else View.GONE
        if (!connected) return

        b.tvStatus.text = (if (running) "● ONLINE" else "○ OFFLINE") +
                (if (who.isNotEmpty()) " — $who" else "")
        b.tvStatus.setTextColor(
            if (running) Color.parseColor("#3fb950") else Color.parseColor("#8aa0b6")
        )
        b.btnToggle.text = if (running) "GO OFFLINE" else "GO ONLINE"
        b.btnToggle.backgroundTintList = ColorStateList.valueOf(
            if (running) Color.parseColor("#e5534b") else Color.parseColor("#3fb950")
        )
        b.btnToggle.setTextColor(
            if (running) Color.WHITE else Color.parseColor("#08210f")
        )
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
}
