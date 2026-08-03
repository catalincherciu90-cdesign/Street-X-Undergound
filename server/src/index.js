/**
 * GPS Tracker — Platformă (Cloudflare Worker + D1)
 *
 * Rute:
 *   GET    /                       -> dashboard-ul web (hartă live + istoric)
 *   POST   /api/login              -> autentificare admin, întoarce un token
 *   GET    /api/devices            -> lista dispozitivelor + ultima poziție   (auth admin)
 *   POST   /api/devices            -> creează dispozitiv nou (întoarce api_key) (auth admin)
 *   DELETE /api/devices/:id        -> șterge dispozitiv + istoricul lui        (auth admin)
 *   GET    /api/devices/:id/history?from=&to=  -> traseul dispozitivului       (auth admin)
 *   POST   /api/ingest             -> telefonul trimite poziția (auth cu device key)
 *
 * Secrete (wrangler secret put):
 *   ADMIN_USER    — user-ul de dashboard        (default: "admin")
 *   ADMIN_PASS    — parola de dashboard          (OBLIGATORIU)
 *   AUTH_SECRET   — cheie pt. semnarea token-elor (OBLIGATORIU, string random lung)
 *
 * Binding D1: env.DB (vezi wrangler.toml)
 */

import { DASHBOARD_HTML } from "./dashboard.js";
import { PAIR_HTML } from "./pairpage.js";
import { DRIVER_HTML } from "./driverpage.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });

// ---------- token helpers (HMAC-SHA256) ----------

const enc = new TextEncoder();

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function b64url(bytes) {
  let s = btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signToken(secret, payload) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return `${body}.${b64url(sig)}`;
}

async function verifyToken(secret, token) {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const key = await hmacKey(secret);
  const expected = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  if (b64url(expected) !== sig) return null;
  try {
    const payload = JSON.parse(
      atob(body.replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function bearer(req) {
  const h = req.headers.get("Authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

async function requireAdmin(req, env) {
  const p = await verifyToken(env.AUTH_SECRET, bearer(req));
  return p && p.role === "admin" ? p : null;
}

// Autentifică un dispozitiv (curier) după device key din Authorization
async function requireDevice(req, env) {
  const key = bearer(req);
  if (!key) return null;
  return await env.DB.prepare("SELECT id, name FROM devices WHERE api_key = ?")
    .bind(key)
    .first();
}

function randomKey(len = 24) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// Hash parolă cu PBKDF2-SHA256 (salt aleator). Format: "<salt>$<hash>" (base64url)
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, km, 256
  );
  return b64url(salt) + "$" + b64url(bits);
}
async function verifyPassword(password, stored) {
  if (!stored || !stored.includes("$")) return false;
  const [saltB64, hashB64] = stored.split("$");
  const salt = b64urlDecode(saltB64);
  const km = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, km, 256
  );
  return b64url(bits) === hashB64;
}

// Distanță în km între două puncte (haversine)
function havKm(la1, lo1, la2, lo2) {
  const R = 6371;
  const dLa = ((la2 - la1) * Math.PI) / 180;
  const dLo = ((lo2 - lo1) * Math.PI) / 180;
  const a =
    Math.sin(dLa / 2) ** 2 +
    Math.cos((la1 * Math.PI) / 180) * Math.cos((la2 * Math.PI) / 180) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ---------- schema auto (creează tabelele la prima cerere) ----------

let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady || !env.DB) return;
  await env.DB.batch([
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS devices (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, " +
        "group_name TEXT NOT NULL DEFAULT 'General', api_key TEXT NOT NULL UNIQUE, " +
        "created_at INTEGER NOT NULL, last_seen INTEGER, last_lat REAL, last_lng REAL, " +
        "last_accuracy REAL, last_speed REAL, last_battery INTEGER)"
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS locations (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL, " +
        "lat REAL NOT NULL, lng REAL NOT NULL, accuracy REAL, speed REAL, battery INTEGER, " +
        "recorded_at INTEGER NOT NULL)"
    ),
    env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_loc_device_time ON locations (device_id, recorded_at)"
    ),
    env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_dev_apikey ON devices (api_key)"
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS messages (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, device_id INTEGER NOT NULL, " +
        "text TEXT NOT NULL, created_at INTEGER NOT NULL)"
    ),
    env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_msg_device ON messages (device_id, created_at)"
    ),
  ]);
  // Migrare: adaugă user/parolă la tabelul devices dacă lipsesc (ignoră dacă există deja)
  try { await env.DB.prepare("ALTER TABLE devices ADD COLUMN username TEXT").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE devices ADD COLUMN password_hash TEXT").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE devices ADD COLUMN has_avatar INTEGER DEFAULT 0").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE messages ADD COLUMN sender TEXT DEFAULT 'admin'").run(); } catch (e) {}
  try { await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_dev_username ON devices (username)").run(); } catch (e) {}
  schemaReady = true;
}

// ---------- router ----------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    try {
      // Dashboard
      if (path === "/" || path === "/index.html") {
        return new Response(DASHBOARD_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Pagina de conectare (link primit de curier)
      if (path === "/pair") {
        return new Response(PAIR_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Pagina curierului (cursele lui) — deschisă în aplicație
      if (path === "/driver") {
        return new Response(DRIVER_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Logo-ul brandului (public). Dacă nu e încărcat, cade pe /logo.svg (implicit).
      if (path === "/brand/logo") {
        if (env.DOCS) {
          const obj = await env.DOCS.getWithMetadata("brand:logo", { type: "arrayBuffer" });
          if (obj && obj.value) {
            const ct = (obj.metadata && obj.metadata.ct) || "image/png";
            return new Response(obj.value, {
              headers: { "Content-Type": ct, "Cache-Control": "public, max-age=10", ...CORS },
            });
          }
        }
        return Response.redirect(url.origin + "/logo.svg", 302);
      }

      // Poza curierului (public — nu e sensibilă)
      const avm = path.match(/^\/avatar\/(\d+)$/);
      if (avm && request.method === "GET") {
        if (!env.DOCS) return new Response("", { status: 404 });
        const obj = await env.DOCS.getWithMetadata("avatar:" + avm[1], { type: "arrayBuffer" });
        if (!obj || !obj.value) return new Response("", { status: 404 });
        const ct = (obj.metadata && obj.metadata.ct) || "image/jpeg";
        return new Response(obj.value, {
          headers: { "Content-Type": ct, "Cache-Control": "public, max-age=60", ...CORS },
        });
      }

      if (path === "/api/health") {
        return json({ ok: true, time: Date.now() });
      }

      // Asigură existența tabelelor înainte de rutele care folosesc baza de date
      if (path.startsWith("/api/")) {
        await ensureSchema(env);
      }

      // --- Login admin ---
      if (path === "/api/login" && request.method === "POST") {
        const { user, pass } = await request.json().catch(() => ({}));
        const okUser = user === (env.ADMIN_USER || "admin");
        const okPass = pass && env.ADMIN_PASS && pass === env.ADMIN_PASS;
        if (!okUser || !okPass) {
          return json({ error: "Credențiale greșite" }, 401);
        }
        const token = await signToken(env.AUTH_SECRET, {
          role: "admin",
          u: user,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 zile
        });
        return json({ token });
      }

      // --- Login aplicație curier (user + parolă) -> întoarce device key ---
      if (path === "/api/device/login" && request.method === "POST") {
        const b = await request.json().catch(() => ({}));
        const username = (b.username || "").trim();
        const password = b.password || "";
        if (!username || !password) return json({ error: "Completează utilizator și parolă" }, 400);
        const dev = await env.DB.prepare(
          "SELECT id, name, api_key, password_hash, has_avatar FROM devices WHERE username = ?"
        )
          .bind(username)
          .first();
        if (!dev || !dev.password_hash || !(await verifyPassword(password, dev.password_hash))) {
          return json({ error: "Utilizator sau parolă greșită" }, 401);
        }
        return json({ key: dev.api_key, name: dev.name, id: dev.id, has_avatar: dev.has_avatar });
      }

      // --- Ingest poziție de la telefon ---
      if (path === "/api/ingest" && request.method === "POST") {
        const key = bearer(request);
        if (!key) return json({ error: "lipsă device key" }, 401);
        const device = await env.DB.prepare(
          "SELECT id FROM devices WHERE api_key = ?"
        )
          .bind(key)
          .first();
        if (!device) return json({ error: "device key invalid" }, 401);

        const b = await request.json().catch(() => ({}));
        const lat = Number(b.lat);
        const lng = Number(b.lng);
        if (!isFinite(lat) || !isFinite(lng)) {
          return json({ error: "lat/lng invalide" }, 400);
        }
        const ts = Number(b.ts) || Date.now();
        const acc = b.accuracy != null ? Number(b.accuracy) : null;
        const spd = b.speed != null ? Number(b.speed) : null;
        const bat = b.battery != null ? Math.round(Number(b.battery)) : null;

        await env.DB.batch([
          env.DB.prepare(
            "INSERT INTO locations (device_id, lat, lng, accuracy, speed, battery, recorded_at) VALUES (?,?,?,?,?,?,?)"
          ).bind(device.id, lat, lng, acc, spd, bat, ts),
          env.DB.prepare(
            "UPDATE devices SET last_seen=?, last_lat=?, last_lng=?, last_accuracy=?, last_speed=?, last_battery=? WHERE id=?"
          ).bind(ts, lat, lng, acc, spd, bat, device.id),
        ]);
        return json({ ok: true });
      }

      // --- Mesaje pentru curier (auth cu device key) ---
      if (path.startsWith("/api/my/")) {
        const dev = await requireDevice(request, env);
        if (!dev) return json({ error: "device key invalid" }, 401);

        // /api/my/messages — vezi (GET) sau răspunde (POST)
        if (path === "/api/my/messages") {
          if (request.method === "GET") {
            const rows = await env.DB.prepare(
              "SELECT id, text, created_at, sender FROM messages WHERE device_id=? ORDER BY created_at DESC LIMIT 100"
            )
              .bind(dev.id)
              .all();
            return json({ messages: rows.results || [], device: dev.name });
          }
          if (request.method === "POST") {
            const b = await request.json().catch(() => ({}));
            const text = (b.text || "").trim();
            if (!text) return json({ error: "mesaj gol" }, 400);
            await env.DB.prepare(
              "INSERT INTO messages (device_id, text, created_at, sender) VALUES (?,?,?,?)"
            )
              .bind(dev.id, text.slice(0, 1000), Date.now(), "driver")
              .run();
            return json({ ok: true });
          }
        }

        return json({ error: "rută necunoscută" }, 404);
      }

      // --- Rute care necesită admin ---
      if (path.startsWith("/api/devices")) {
        const admin = await requireAdmin(request, env);
        if (!admin) return json({ error: "neautorizat" }, 401);

        // GET /api/devices
        if (path === "/api/devices" && request.method === "GET") {
          const rows = await env.DB.prepare(
            "SELECT id, name, group_name, api_key, username, has_avatar, created_at, last_seen, last_lat, last_lng, last_accuracy, last_speed, last_battery, " +
            "(SELECT sender FROM messages WHERE messages.device_id=devices.id ORDER BY created_at DESC LIMIT 1) AS last_msg_from " +
            "FROM devices ORDER BY group_name, name"
          ).all();
          return json({ devices: rows.results || [] });
        }

        // POST /api/devices
        if (path === "/api/devices" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const name = (b.name || "").trim();
          const group = (b.group || "General").trim() || "General";
          const username = (b.username || "").trim();
          const password = b.password || "";
          if (!name) return json({ error: "nume obligatoriu" }, 400);
          if (!username || !password)
            return json({ error: "utilizator și parolă obligatorii" }, 400);
          const exists = await env.DB.prepare("SELECT id FROM devices WHERE username=?")
            .bind(username)
            .first();
          if (exists) return json({ error: "Utilizatorul există deja" }, 409);
          const apiKey = randomKey();
          const ph = await hashPassword(password);
          const res = await env.DB.prepare(
            "INSERT INTO devices (name, group_name, api_key, created_at, username, password_hash) VALUES (?,?,?,?,?,?)"
          )
            .bind(name, group, apiKey, Date.now(), username, ph)
            .run();
          return json({
            id: res.meta.last_row_id,
            name,
            group_name: group,
            username,
            api_key: apiKey,
          });
        }

        // POST /api/devices/:id/credentials — setează/resetează user+parolă
        const cred = path.match(/^\/api\/devices\/(\d+)\/credentials$/);
        if (cred && request.method === "POST") {
          const id = Number(cred[1]);
          const b = await request.json().catch(() => ({}));
          const username = (b.username || "").trim();
          const password = b.password || "";
          if (!username || !password)
            return json({ error: "utilizator și parolă obligatorii" }, 400);
          const exists = await env.DB.prepare(
            "SELECT id FROM devices WHERE username=? AND id<>?"
          )
            .bind(username, id)
            .first();
          if (exists) return json({ error: "Utilizatorul există deja" }, 409);
          const ph = await hashPassword(password);
          await env.DB.prepare("UPDATE devices SET username=?, password_hash=? WHERE id=?")
            .bind(username, ph, id)
            .run();
          return json({ ok: true, username });
        }

        // GET /api/devices/:id/stats?from=&to= — km parcurși în interval
        const stm = path.match(/^\/api\/devices\/(\d+)\/stats$/);
        if (stm && request.method === "GET") {
          const id = Number(stm[1]);
          const now = Date.now();
          const from = Number(url.searchParams.get("from")) || now - 86400000;
          const to = Number(url.searchParams.get("to")) || now;
          const pts = await env.DB.prepare(
            "SELECT lat, lng FROM locations WHERE device_id=? AND recorded_at BETWEEN ? AND ? ORDER BY recorded_at ASC LIMIT 20000"
          )
            .bind(id, from, to)
            .all();
          const arr = pts.results || [];
          let km = 0;
          for (let i = 1; i < arr.length; i++) {
            const seg = havKm(arr[i - 1].lat, arr[i - 1].lng, arr[i].lat, arr[i].lng);
            if (seg < 5) km += seg;
          }
          return json({ km: Math.round(km * 10) / 10 });
        }

        // POST /api/devices/:id/avatar — încarcă poza curierului
        const avUp = path.match(/^\/api\/devices\/(\d+)\/avatar$/);
        if (avUp && request.method === "POST") {
          if (!env.DOCS) return json({ error: "stocare indisponibilă" }, 500);
          const id = Number(avUp[1]);
          const ct = request.headers.get("Content-Type") || "image/jpeg";
          const buf = await request.arrayBuffer();
          if (buf.byteLength === 0) return json({ error: "fișier gol" }, 400);
          if (buf.byteLength > 5 * 1024 * 1024) return json({ error: "imagine prea mare (max 5MB)" }, 413);
          await env.DOCS.put("avatar:" + id, buf, { metadata: { ct } });
          await env.DB.prepare("UPDATE devices SET has_avatar=1 WHERE id=?").bind(id).run();
          return json({ ok: true });
        }

        // /api/devices/:id/messages — trimite (POST) sau vezi istoric (GET)
        const msgm = path.match(/^\/api\/devices\/(\d+)\/messages$/);
        if (msgm) {
          const id = Number(msgm[1]);
          if (request.method === "POST") {
            const b = await request.json().catch(() => ({}));
            const text = (b.text || "").trim();
            if (!text) return json({ error: "mesaj gol" }, 400);
            const res = await env.DB.prepare(
              "INSERT INTO messages (device_id, text, created_at, sender) VALUES (?,?,?,?)"
            )
              .bind(id, text.slice(0, 1000), Date.now(), "admin")
              .run();
            return json({ ok: true, id: res.meta.last_row_id });
          }
          if (request.method === "GET") {
            const rows = await env.DB.prepare(
              "SELECT id, text, created_at, sender FROM messages WHERE device_id=? ORDER BY created_at DESC LIMIT 100"
            )
              .bind(id)
              .all();
            return json({ messages: rows.results || [] });
          }
        }

        // /api/devices/:id  și  /api/devices/:id/history
        const m = path.match(/^\/api\/devices\/(\d+)(\/history)?$/);
        if (m) {
          const id = Number(m[1]);
          const isHistory = !!m[2];

          if (isHistory && request.method === "GET") {
            const now = Date.now();
            const from = Number(url.searchParams.get("from")) || now - 24 * 3600 * 1000;
            const to = Number(url.searchParams.get("to")) || now;
            const limit = Math.min(
              Number(url.searchParams.get("limit")) || 5000,
              20000
            );
            const rows = await env.DB.prepare(
              "SELECT lat, lng, accuracy, speed, battery, recorded_at FROM locations WHERE device_id=? AND recorded_at BETWEEN ? AND ? ORDER BY recorded_at ASC LIMIT ?"
            )
              .bind(id, from, to, limit)
              .all();
            return json({ points: rows.results || [] });
          }

          if (!isHistory && request.method === "DELETE") {
            await env.DB.batch([
              env.DB.prepare("DELETE FROM locations WHERE device_id=?").bind(id),
              env.DB.prepare("DELETE FROM devices WHERE id=?").bind(id),
            ]);
            return json({ ok: true });
          }
        }

        return json({ error: "rută necunoscută" }, 404);
      }

      // --- Logo brand (admin): încarcă (POST) / resetează (DELETE) ---
      if (path === "/api/settings/logo") {
        const admin = await requireAdmin(request, env);
        if (!admin) return json({ error: "neautorizat" }, 401);
        if (request.method === "POST") {
          if (!env.DOCS) return json({ error: "stocare indisponibilă" }, 500);
          const ct = request.headers.get("Content-Type") || "image/png";
          const buf = await request.arrayBuffer();
          if (buf.byteLength === 0) return json({ error: "fișier gol" }, 400);
          if (buf.byteLength > 3 * 1024 * 1024) return json({ error: "imagine prea mare (max 3MB)" }, 413);
          await env.DOCS.put("brand:logo", buf, { metadata: { ct } });
          return json({ ok: true });
        }
        if (request.method === "DELETE") {
          if (env.DOCS) await env.DOCS.delete("brand:logo");
          return json({ ok: true });
        }
      }

      return json({ error: "not found" }, 404);
    } catch (err) {
      return json({ error: String(err && err.message ? err.message : err) }, 500);
    }
  },
};
