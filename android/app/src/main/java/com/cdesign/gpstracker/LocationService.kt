package com.cdesign.gpstracker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.BatteryManager
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.lifecycle.LifecycleService
import com.google.android.gms.location.*
import org.json.JSONObject
import java.io.OutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/**
 * Serviciu foreground care citește poziția prin FusedLocationProvider
 * și o trimite periodic către server (POST /api/ingest), inclusiv cu ecranul blocat.
 */
class LocationService : LifecycleService() {

    private lateinit var client: FusedLocationProviderClient
    private var callback: LocationCallback? = null
    private val net = Executors.newSingleThreadExecutor()
    private var poll: ScheduledExecutorService? = null

    companion object {
        const val CHANNEL = "gps_tracking"
        const val CHANNEL_COURSES = "gps_courses"
        const val CHANNEL_MESSAGES = "gps_messages"
        const val NOTIF_ID = 42
        const val ACTION_STOP = "com.cdesign.gpstracker.STOP"
        private const val TAG = "GpsService"
    }

    override fun onCreate() {
        super.onCreate()
        client = LocationServices.getFusedLocationProviderClient(this)
        createChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        // Oprire de la butonul din notificare (final de tură)
        if (intent?.action == ACTION_STOP) {
            Prefs.setRunning(this, false)
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        startForegroundSafely()
        startUpdates()
        startCoursePolling()
        Prefs.setRunning(this, true)
        return START_STICKY
    }

    private fun startCoursePolling() {
        if (poll != null) return
        poll = Executors.newSingleThreadScheduledExecutor()
        poll!!.scheduleWithFixedDelay({ checkCourses(); checkMessages() }, 8, 25, TimeUnit.SECONDS)
    }

    private fun checkMessages() {
        val url = Prefs.serverUrl(this)
        val key = Prefs.deviceKey(this)
        if (url.isEmpty() || key.isEmpty()) return
        try {
            val conn = URL("$url/api/my/messages").openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 15000
            conn.readTimeout = 15000
            conn.setRequestProperty("Authorization", "Bearer $key")
            if (conn.responseCode != 200) { conn.disconnect(); return }
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()

            val arr = JSONObject(body).optJSONArray("messages") ?: return
            val seen = Prefs.seenMessages(this)
            val seeded = Prefs.messagesSeeded(this)
            val current = HashSet<String>()
            val fresh = ArrayList<Pair<Int, String>>()
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val id = o.optInt("id")
                current.add(id.toString())
                // notifică doar mesajele de la dispecer, nu răspunsurile proprii
                if (seeded && !seen.contains(id.toString()) && o.optString("sender") != "driver")
                    fresh.add(Pair(id, o.optString("text")))
            }
            for (m in fresh) notifyMessage(m.first, m.second)
            Prefs.setSeenMessages(this, current)
            if (!seeded) Prefs.setMessagesSeeded(this, true)
        } catch (e: Exception) {
            Log.w(TAG, "checkMessages: ${e.message}")
        }
    }

    private fun notifyMessage(id: Int, text: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(
                CHANNEL_MESSAGES, "Mesaje dispecer", NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Mesaje primite de la dispecer" }
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(ch)
        }
        val pi = PendingIntent.getActivity(
            this, 0, Intent(this, CoursesActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val n = NotificationCompat.Builder(this, CHANNEL_MESSAGES)
            .setContentTitle("Mesaj de la dispecer")
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .build()
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(3000 + id, n)
    }

    private fun checkCourses() {
        val url = Prefs.serverUrl(this)
        val key = Prefs.deviceKey(this)
        if (url.isEmpty() || key.isEmpty()) return
        try {
            val conn = URL("$url/api/my/courses").openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 15000
            conn.readTimeout = 15000
            conn.setRequestProperty("Authorization", "Bearer $key")
            if (conn.responseCode != 200) { conn.disconnect(); return }
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            conn.disconnect()

            val arr = JSONObject(body).optJSONArray("courses") ?: return
            val seen = Prefs.seenCourses(this)
            val seeded = Prefs.coursesSeeded(this)
            val current = HashSet<String>()
            val newNumbers = ArrayList<String>()
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val id = o.optInt("id").toString()
                current.add(id)
                if (seeded && !seen.contains(id)) newNumbers.add(o.optInt("number").toString())
            }
            for (nr in newNumbers) notifyNewCourse(nr)
            Prefs.setSeenCourses(this, current)
            if (!seeded) Prefs.setCoursesSeeded(this, true)
        } catch (e: Exception) {
            Log.w(TAG, "checkCourses: ${e.message}")
        }
    }

    private fun notifyNewCourse(number: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(
                CHANNEL_COURSES, "Curse noi", NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Notificări când primești o cursă nouă" }
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(ch)
        }
        val pi = PendingIntent.getActivity(
            this, 0, Intent(this, CoursesActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val n = NotificationCompat.Builder(this, CHANNEL_COURSES)
            .setContentTitle("Cursă nouă #$number")
            .setContentText("Ai primit o cursă. Apasă pentru a o deschide.")
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pi)
            .build()
        val id = 2000 + (number.toIntOrNull() ?: number.hashCode())
        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(id, n)
    }

    private fun startForegroundSafely() {
        val notif = buildNotification("Locația se trimite. Apasă „Oprește tura” la final.")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIF_ID, notif)
        }
    }

    private fun startUpdates() {
        val intervalMs = Prefs.intervalSec(this).coerceAtLeast(5) * 1000L
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, intervalMs)
            .setMinUpdateIntervalMillis(intervalMs)
            .setMinUpdateDistanceMeters(0f)
            .build()

        callback?.let { client.removeLocationUpdates(it) }
        callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { send(it) }
            }
        }
        try {
            client.requestLocationUpdates(request, callback!!, mainLooper)
        } catch (se: SecurityException) {
            Log.e(TAG, "Lipsă permisiune locație", se)
            stopSelf()
        }
    }

    private fun send(loc: Location) {
        val url = Prefs.serverUrl(this)
        val key = Prefs.deviceKey(this)
        if (url.isEmpty() || key.isEmpty()) return

        val battery = batteryLevel()
        val payload = JSONObject().apply {
            put("lat", loc.latitude)
            put("lng", loc.longitude)
            put("accuracy", loc.accuracy.toDouble())
            put("speed", if (loc.hasSpeed()) loc.speed.toDouble() else JSONObject.NULL)
            put("battery", battery)
            put("ts", System.currentTimeMillis())
        }.toString()

        net.execute {
            try {
                val conn = URL("$url/api/ingest").openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.connectTimeout = 15000
                conn.readTimeout = 15000
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.setRequestProperty("Authorization", "Bearer $key")
                val out: OutputStream = conn.outputStream
                out.write(payload.toByteArray())
                out.flush()
                out.close()
                val code = conn.responseCode
                Log.d(TAG, "ingest -> $code")
                conn.disconnect()
            } catch (e: Exception) {
                Log.w(TAG, "Trimitere eșuată: ${e.message}")
            }
        }
    }

    private fun batteryLevel(): Int {
        return try {
            val bm = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
            bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        } catch (e: Exception) {
            -1
        }
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(
                CHANNEL, "Urmărire GPS", NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Serviciul de trimitere a locației" }
            (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
                .createNotificationChannel(ch)
        }
    }

    private fun buildNotification(text: String): Notification {
        val pi = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        // Buton „Oprește" direct în notificare (final de tură)
        val stopIntent = Intent(this, LocationService::class.java).apply { action = ACTION_STOP }
        val stopPi = PendingIntent.getService(
            this, 1, stopIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(this, CHANNEL)
            .setContentTitle("DropLy Courier — urmărire activă")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setContentIntent(pi)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Oprește tura", stopPi)
            .build()
    }

    override fun onDestroy() {
        callback?.let { client.removeLocationUpdates(it) }
        poll?.shutdownNow()
        Prefs.setRunning(this, false)
        net.shutdown()
        super.onDestroy()
    }

    override fun onBind(intent: Intent): IBinder? {
        super.onBind(intent)
        return null
    }
}
