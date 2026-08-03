package com.cdesign.gpstracker

import android.content.Context

/** Stocare simplă a configurației (URL server, cheie dispozitiv, interval). */
object Prefs {
    private const val FILE = "gps_prefs"
    const val KEY_URL = "server_url"
    const val KEY_DEVICE = "device_key"
    const val KEY_INTERVAL = "interval_sec"
    const val KEY_RUNNING = "running"
    const val KEY_SEEN = "seen_courses"
    const val KEY_SEEDED = "courses_seeded"
    const val KEY_SEEN_MSG = "seen_msgs"
    const val KEY_SEEDED_MSG = "msgs_seeded"
    const val KEY_NAME = "device_name"
    const val KEY_ID = "device_id"

    private fun sp(ctx: Context) =
        ctx.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun serverUrl(ctx: Context): String =
        sp(ctx).getString(KEY_URL, "")?.trimEnd('/') ?: ""

    fun deviceKey(ctx: Context): String =
        sp(ctx).getString(KEY_DEVICE, "") ?: ""

    fun intervalSec(ctx: Context): Int =
        sp(ctx).getInt(KEY_INTERVAL, 2)

    fun isRunning(ctx: Context): Boolean =
        sp(ctx).getBoolean(KEY_RUNNING, false)

    fun save(ctx: Context, url: String, key: String, interval: Int) {
        sp(ctx).edit()
            .putString(KEY_URL, url.trim().trimEnd('/'))
            .putString(KEY_DEVICE, key.trim())
            .putInt(KEY_INTERVAL, interval)
            .apply()
    }

    fun setRunning(ctx: Context, running: Boolean) {
        sp(ctx).edit().putBoolean(KEY_RUNNING, running).apply()
    }

    /** Deconectare: șterge cheia, numele și evidența notificărilor; oprește urmărirea. */
    fun clearSession(ctx: Context) {
        sp(ctx).edit()
            .remove(KEY_DEVICE)
            .remove(KEY_NAME)
            .remove(KEY_ID)
            .remove(KEY_SEEN)
            .remove(KEY_SEEDED)
            .remove(KEY_SEEN_MSG)
            .remove(KEY_SEEDED_MSG)
            .putBoolean(KEY_RUNNING, false)
            .apply()
    }

    fun seenCourses(ctx: Context): Set<String> =
        sp(ctx).getStringSet(KEY_SEEN, HashSet()) ?: HashSet()

    fun setSeenCourses(ctx: Context, ids: Set<String>) {
        sp(ctx).edit().putStringSet(KEY_SEEN, HashSet(ids)).apply()
    }

    fun deviceName(ctx: Context): String =
        sp(ctx).getString(KEY_NAME, "") ?: ""

    fun setDeviceName(ctx: Context, name: String) {
        sp(ctx).edit().putString(KEY_NAME, name).apply()
    }

    fun deviceId(ctx: Context): Int =
        sp(ctx).getInt(KEY_ID, 0)

    fun setDeviceId(ctx: Context, id: Int) {
        sp(ctx).edit().putInt(KEY_ID, id).apply()
    }

    fun coursesSeeded(ctx: Context): Boolean =
        sp(ctx).getBoolean(KEY_SEEDED, false)

    fun setCoursesSeeded(ctx: Context, v: Boolean) {
        sp(ctx).edit().putBoolean(KEY_SEEDED, v).apply()
    }

    fun seenMessages(ctx: Context): Set<String> =
        sp(ctx).getStringSet(KEY_SEEN_MSG, HashSet()) ?: HashSet()

    fun setSeenMessages(ctx: Context, ids: Set<String>) {
        sp(ctx).edit().putStringSet(KEY_SEEN_MSG, HashSet(ids)).apply()
    }

    fun messagesSeeded(ctx: Context): Boolean =
        sp(ctx).getBoolean(KEY_SEEDED_MSG, false)

    fun setMessagesSeeded(ctx: Context, v: Boolean) {
        sp(ctx).edit().putBoolean(KEY_SEEDED_MSG, v).apply()
    }
}
