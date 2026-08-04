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
import { ROUTES_HTML } from "./routespage.js";

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

// Autentifică un dispozitiv (șofer) după device key din Authorization
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

// Validează geometria unui traseu: array de [lat,lng]. Întoarce {coords, distance_m} sau null.
function parseRouteGeometry(raw) {
  let arr = raw;
  if (typeof raw === "string") {
    try { arr = JSON.parse(raw); } catch { return null; }
  }
  if (!Array.isArray(arr) || arr.length < 2) return null;
  if (arr.length > 20000) arr = arr.slice(0, 20000);
  const coords = [];
  for (const p of arr) {
    const lat = Array.isArray(p) ? Number(p[0]) : Number(p.lat);
    const lng = Array.isArray(p) ? Number(p[1]) : Number(p.lng);
    if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    coords.push([lat, lng]);
  }
  if (coords.length < 2) return null;
  let dist = 0;
  for (let i = 1; i < coords.length; i++) {
    const seg = havKm(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]);
    if (seg < 20) dist += seg; // ignoră salturi GPS mari
  }
  return { coords, distance_m: Math.round(dist * 1000) };
}

// Cod scurt pentru party (fără caractere ambigue)
function partyCode(len = 5) {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const b = crypto.getRandomValues(new Uint8Array(len));
  let s = "";
  for (let i = 0; i < len; i++) s += A[b[i] % A.length];
  return s;
}
const PARTY_COLORS = ["#22e08a", "#4d9fff", "#ff2d95", "#eab54a", "#9b6bff", "#39c5cf", "#ff8a5b", "#7bd640"];

// Întoarce codul de prieten al unui dispozitiv, generându-l dacă lipsește.
async function ensureFriendCode(env, devId) {
  const row = await env.DB.prepare("SELECT friend_code FROM devices WHERE id=?").bind(devId).first();
  if (row && row.friend_code) return row.friend_code;
  let code = partyCode(6);
  for (let i = 0; i < 6; i++) {
    const ex = await env.DB.prepare("SELECT id FROM devices WHERE friend_code=?").bind(code).first();
    if (!ex) break;
    code = partyCode(6);
  }
  await env.DB.prepare("UPDATE devices SET friend_code=? WHERE id=?").bind(code, devId).run();
  return code;
}

// Id-urile dispozitivelor prietene ale unui dispozitiv.
async function friendIdsOf(env, devId) {
  const rows = await env.DB.prepare(
    "SELECT CASE WHEN a=? THEN b ELSE a END AS fid FROM friendships WHERE a=? OR b=?"
  ).bind(devId, devId, devId).all();
  return (rows.results || []).map((r) => r.fid);
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
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS routes (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, owner_type TEXT NOT NULL, owner_id INTEGER, " +
        "owner_name TEXT, name TEXT NOT NULL, description TEXT, distance_m REAL, duration_s INTEGER, " +
        "geometry TEXT NOT NULL, is_public INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)"
    ),
    env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_routes_owner ON routes (owner_type, owner_id)"
    ),
    env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_routes_public ON routes (is_public, created_at)"
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS parties (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, name TEXT, " +
        "route_id INTEGER, created_at INTEGER NOT NULL)"
    ),
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS party_members (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, party_id INTEGER NOT NULL, device_id INTEGER NOT NULL, " +
        "name TEXT, color TEXT, last_lat REAL, last_lng REAL, last_at INTEGER)"
    ),
    env.DB.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_pm_uniq ON party_members (party_id, device_id)"
    ),
    env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_pm_party ON party_members (party_id)"
    ),
    // Prietenii: o legătură se salvează o singură dată (a<b).
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS friendships (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, a INTEGER NOT NULL, b INTEGER NOT NULL, created_at INTEGER NOT NULL)"
    ),
    env.DB.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_friend_pair ON friendships (a, b)"
    ),
    // Mesaje directe între prieteni.
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS friend_messages (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT, from_id INTEGER NOT NULL, to_id INTEGER NOT NULL, " +
        "text TEXT NOT NULL, created_at INTEGER NOT NULL, read_at INTEGER)"
    ),
    env.DB.prepare(
      "CREATE INDEX IF NOT EXISTS idx_fmsg_pair ON friend_messages (from_id, to_id, created_at)"
    ),
  ]);
  // Migrare: adaugă user/parolă la tabelul devices dacă lipsesc (ignoră dacă există deja)
  try { await env.DB.prepare("ALTER TABLE devices ADD COLUMN username TEXT").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE devices ADD COLUMN password_hash TEXT").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE devices ADD COLUMN has_avatar INTEGER DEFAULT 0").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE messages ADD COLUMN sender TEXT DEFAULT 'admin'").run(); } catch (e) {}
  try { await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_dev_username ON devices (username)").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE devices ADD COLUMN friend_code TEXT").run(); } catch (e) {}
  try { await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_dev_friendcode ON devices (friend_code)").run(); } catch (e) {}
  // Roll Race (cursă în party, sincronizare la viteză + cronometrare 1 km)
  try { await env.DB.prepare("ALTER TABLE parties ADD COLUMN race_status TEXT").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE parties ADD COLUMN race_speed INTEGER").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE parties ADD COLUMN race_started_at INTEGER").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE party_members ADD COLUMN cur_speed REAL").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE party_members ADD COLUMN race_dist REAL").run(); } catch (e) {}
  try { await env.DB.prepare("ALTER TABLE party_members ADD COLUMN race_finish INTEGER").run(); } catch (e) {}
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
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      }

      // Pagina de conectare (link primit de șofer)
      if (path === "/pair") {
        return new Response(PAIR_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      }

      // Pagina șoferului (chat) — deschisă în aplicație
      if (path === "/driver") {
        return new Response(DRIVER_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      }

      // Pagina „Trasee" a utilizatorului — deschisă în aplicație
      if (path === "/routes") {
        return new Response(ROUTES_HTML, {
          headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
        });
      }

      // Proxy pentru dalele hărții — WebView-ul nu mai depinde de servere externe
      // (unele rețele/telefoane blochează CDN-urile de hartă). Totul via origin-ul nostru.
      const tm = path.match(/^\/tiles\/(?:([a-z]+)\/)?(\d+)\/(\d+)\/(\d+)\.png$/);
      if (tm && request.method === "GET") {
        const style = tm[1] || "dark";
        const z = tm[2], x = tm[3], y = tm[4];
        let upstream;
        if (style === "sat")
          upstream = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/" + z + "/" + y + "/" + x;
        else if (style === "streets")
          upstream = "https://a.basemaps.cartocdn.com/rastertiles/voyager/" + z + "/" + x + "/" + y + ".png";
        else
          upstream = "https://a.basemaps.cartocdn.com/dark_all/" + z + "/" + x + "/" + y + ".png";
        try {
          const resp = await fetch(upstream, {
            headers: { "User-Agent": "StreetXUnderground/1.0 (+https://street-x-undergound.workers.dev)" },
            cf: { cacheEverything: true, cacheTtl: 604800 },
          });
          if (!resp.ok) return new Response("", { status: 502, headers: CORS });
          return new Response(resp.body, {
            headers: {
              "Content-Type": "image/png",
              "Cache-Control": "public, max-age=604800",
              ...CORS,
            },
          });
        } catch (e) {
          return new Response("", { status: 502, headers: CORS });
        }
      }

      // Proxy dale de trafic (TomTom Traffic Flow). Necesită secretul TOMTOM_KEY.
      // Fără cheie, întoarce 204 (stratul nu afișează nimic).
      const trm = path.match(/^\/traffic\/(\d+)\/(\d+)\/(\d+)\.png$/);
      if (trm && request.method === "GET") {
        if (!env.TOMTOM_KEY) return new Response("", { status: 204, headers: CORS });
        const z = trm[1], x = trm[2], y = trm[3];
        const upstream = "https://api.tomtom.com/traffic/map/4/tile/flow/relative/" + z + "/" + x + "/" + y + ".png?key=" + env.TOMTOM_KEY;
        try {
          const resp = await fetch(upstream, { cf: { cacheEverything: true, cacheTtl: 120 } });
          if (!resp.ok) return new Response("", { status: 204, headers: CORS });
          return new Response(resp.body, {
            headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=120", ...CORS },
          });
        } catch (e) {
          return new Response("", { status: 204, headers: CORS });
        }
      }

      // Incidente de trafic (TomTom) în zona vizibilă (bbox). Necesită TOMTOM_KEY.
      if (path === "/incidents" && request.method === "GET") {
        if (!env.TOMTOM_KEY) return json({ incidents: [] });
        const bbox = url.searchParams.get("bbox");
        if (!bbox) return json({ incidents: [] });
        const fields = "{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,delay,length,roadNumbers,events{description,code,iconCategory}}}}";
        const u = "https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=" + encodeURIComponent(bbox) +
          "&fields=" + encodeURIComponent(fields) + "&language=ro-RO&timeValidityFilter=present&key=" + env.TOMTOM_KEY;
        try {
          const r = await fetch(u, { cf: { cacheTtl: 60, cacheEverything: true } });
          if (!r.ok) return json({ incidents: [] });
          const d = await r.json();
          return json({ incidents: (d && d.incidents) || [] });
        } catch (e) {
          return json({ incidents: [] });
        }
      }

      // Rutare cu trafic (TomTom) — ETA realist + traseu care ocolește ambuteiajele.
      if (path === "/route" && request.method === "GET") {
        if (!env.TOMTOM_KEY) return json({ error: "no_key" });
        const from = url.searchParams.get("from"), to = url.searchParams.get("to");
        if (!from || !to) return json({ error: "bad_params" }, 400);
        const full = url.searchParams.get("full") === "1";
        let u = "https://api.tomtom.com/routing/1/calculateRoute/" + encodeURIComponent(from) + ":" + encodeURIComponent(to) +
          "/json?traffic=true&travelMode=car&routeType=fastest&key=" + env.TOMTOM_KEY;
        if (full) u += "&instructionsType=text&language=ro-RO";
        try {
          const r = await fetch(u, { cf: { cacheTtl: 30, cacheEverything: true } });
          if (!r.ok) return json({ error: "upstream" });
          const d = await r.json();
          const rt = d && d.routes && d.routes[0];
          const s = rt && rt.summary;
          if (!s) return json({ error: "none" });
          const out = { distance_m: s.lengthInMeters, time_s: s.travelTimeInSeconds, traffic_delay_s: s.trafficDelayInSeconds || 0 };
          if (full) {
            const points = [];
            (rt.legs || []).forEach((leg) => (leg.points || []).forEach((p) => points.push([p.latitude, p.longitude])));
            const steps = ((rt.guidance && rt.guidance.instructions) || []).map((ins) => ({
              loc: ins.point ? [ins.point.latitude, ins.point.longitude] : null,
              text: ins.message || (ins.street ? ("Continuă pe " + ins.street) : "Continuă"),
            })).filter((x) => x.loc);
            out.points = points;
            out.steps = steps;
          }
          return json(out);
        } catch (e) { return json({ error: "net" }); }
      }

      // POI în apropiere (TomTom Search) — benzinării/parcări/încărcare.
      if (path === "/poi" && request.method === "GET") {
        if (!env.TOMTOM_KEY) return json({ results: [], no_key: true });
        const lat = url.searchParams.get("lat"), lon = url.searchParams.get("lon");
        const cat = url.searchParams.get("cat") || "7311";
        const radius = Math.min(50000, Number(url.searchParams.get("radius")) || 6000);
        if (!lat || !lon) return json({ results: [] });
        const u = "https://api.tomtom.com/search/2/nearbySearch/.json?lat=" + lat + "&lon=" + lon +
          "&radius=" + radius + "&categorySet=" + encodeURIComponent(cat) + "&limit=50&key=" + env.TOMTOM_KEY;
        try {
          const r = await fetch(u, { cf: { cacheTtl: 300, cacheEverything: true } });
          if (!r.ok) return json({ results: [] });
          const d = await r.json();
          const results = ((d && d.results) || []).map((x) => ({
            name: (x.poi && x.poi.name) || "POI",
            lat: x.position && x.position.lat, lon: x.position && x.position.lon,
            addr: (x.address && x.address.freeformAddress) || "",
          })).filter((x) => x.lat != null);
          return json({ results });
        } catch (e) { return json({ results: [] }); }
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

      // Poza șoferului (public — nu e sensibilă)
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

      // --- Login aplicație șofer (user + parolă) -> întoarce device key ---
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

      // --- Mesaje pentru șofer (auth cu device key) ---
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

        // --- Trasee ale utilizatorului + biblioteca publică ---
        if (path === "/api/my/routes") {
          // GET — traseele mele + cele publice (ale altora)
          if (request.method === "GET") {
            const mine = await env.DB.prepare(
              "SELECT id, name, description, distance_m, duration_s, is_public, owner_name, created_at " +
              "FROM routes WHERE owner_type='device' AND owner_id=? ORDER BY created_at DESC"
            ).bind(dev.id).all();
            const lib = await env.DB.prepare(
              "SELECT id, name, description, distance_m, duration_s, is_public, owner_name, created_at " +
              "FROM routes WHERE is_public=1 AND NOT (owner_type='device' AND owner_id=?) ORDER BY created_at DESC LIMIT 300"
            ).bind(dev.id).all();
            return json({ mine: mine.results || [], library: lib.results || [] });
          }
          // POST — creează traseu (înregistrat de utilizator)
          if (request.method === "POST") {
            const b = await request.json().catch(() => ({}));
            const name = (b.name || "").trim();
            if (!name) return json({ error: "nume obligatoriu" }, 400);
            const geo = parseRouteGeometry(b.geometry);
            if (!geo) return json({ error: "traseu invalid (prea puține puncte)" }, 400);
            const dur = Number(b.duration_s);
            const res = await env.DB.prepare(
              "INSERT INTO routes (owner_type, owner_id, owner_name, name, description, distance_m, duration_s, geometry, is_public, created_at) " +
              "VALUES ('device',?,?,?,?,?,?,?,?,?)"
            ).bind(
              dev.id, dev.name, name.slice(0, 120),
              (b.description || "").trim().slice(0, 500) || null,
              geo.distance_m, Number.isFinite(dur) ? Math.round(dur) : null,
              JSON.stringify(geo.coords), b.public ? 1 : 0, Date.now()
            ).run();
            return json({ id: res.meta.last_row_id, distance_m: geo.distance_m });
          }
        }

        const rm = path.match(/^\/api\/my\/routes\/(\d+)$/);
        if (rm) {
          const rid = Number(rm[1]);
          const route = await env.DB.prepare("SELECT * FROM routes WHERE id=?").bind(rid).first();
          if (!route) return json({ error: "traseu inexistent" }, 404);
          const isOwner = route.owner_type === "device" && route.owner_id === dev.id;
          // GET — vezi traseul (dacă e al meu sau public)
          if (request.method === "GET") {
            if (!isOwner && !route.is_public) return json({ error: "neautorizat" }, 403);
            let coords = [];
            try { coords = JSON.parse(route.geometry); } catch {}
            return json({
              id: route.id, name: route.name, description: route.description,
              distance_m: route.distance_m, duration_s: route.duration_s,
              is_public: route.is_public, owner_name: route.owner_name,
              created_at: route.created_at, mine: isOwner, geometry: coords,
            });
          }
          // POST — editează (nume/descriere/public) — doar proprietarul
          if (request.method === "POST") {
            if (!isOwner) return json({ error: "neautorizat" }, 403);
            const b = await request.json().catch(() => ({}));
            const name = (b.name != null ? String(b.name).trim() : route.name) || route.name;
            const desc = b.description != null ? String(b.description).trim().slice(0, 500) : route.description;
            const pub = b.public != null ? (b.public ? 1 : 0) : route.is_public;
            await env.DB.prepare("UPDATE routes SET name=?, description=?, is_public=? WHERE id=?")
              .bind(name.slice(0, 120), desc || null, pub, rid).run();
            return json({ ok: true });
          }
          // DELETE — șterge — doar proprietarul
          if (request.method === "DELETE") {
            if (!isOwner) return json({ error: "neautorizat" }, 403);
            await env.DB.prepare("DELETE FROM routes WHERE id=?").bind(rid).run();
            return json({ ok: true });
          }
        }

        // --- Party (condus împreună, poziții live) ---
        if (path === "/api/my/party/create" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          let routeId = Number(b.route_id);
          if (!Number.isFinite(routeId) || routeId <= 0) routeId = null;
          const name = (b.name || "").trim().slice(0, 60) || null;
          let code = partyCode();
          for (let i = 0; i < 5; i++) {
            const ex = await env.DB.prepare("SELECT id FROM parties WHERE code=?").bind(code).first();
            if (!ex) break;
            code = partyCode();
          }
          const now = Date.now();
          const res = await env.DB.prepare(
            "INSERT INTO parties (code, name, route_id, created_at) VALUES (?,?,?,?)"
          ).bind(code, name, routeId, now).run();
          const pid = res.meta.last_row_id;
          await env.DB.prepare("DELETE FROM party_members WHERE device_id=?").bind(dev.id).run();
          await env.DB.prepare(
            "INSERT INTO party_members (party_id, device_id, name, color, last_at) VALUES (?,?,?,?,?)"
          ).bind(pid, dev.id, dev.name, PARTY_COLORS[0], now).run();
          return json({ code, party_id: pid, route_id: routeId });
        }

        if (path === "/api/my/party/join" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const code = (b.code || "").trim().toUpperCase();
          if (!code) return json({ error: "cod lipsă" }, 400);
          const party = await env.DB.prepare("SELECT * FROM parties WHERE code=?").bind(code).first();
          if (!party) return json({ error: "party inexistent" }, 404);
          await env.DB.prepare("DELETE FROM party_members WHERE device_id=?").bind(dev.id).run();
          const cnt = await env.DB.prepare("SELECT COUNT(*) AS n FROM party_members WHERE party_id=?").bind(party.id).first();
          const color = PARTY_COLORS[(cnt.n || 0) % PARTY_COLORS.length];
          await env.DB.prepare(
            "INSERT INTO party_members (party_id, device_id, name, color, last_at) VALUES (?,?,?,?,?)"
          ).bind(party.id, dev.id, dev.name, color, Date.now()).run();
          return json({ ok: true, party_id: party.id, code: party.code, name: party.name, route_id: party.route_id });
        }

        if (path === "/api/my/party/leave" && request.method === "POST") {
          await env.DB.prepare("DELETE FROM party_members WHERE device_id=?").bind(dev.id).run();
          return json({ ok: true });
        }

        if (path === "/api/my/party/pos" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const lat = Number(b.lat), lng = Number(b.lng);
          if (!isFinite(lat) || !isFinite(lng)) return json({ error: "lat/lng invalide" }, 400);
          await env.DB.prepare(
            "UPDATE party_members SET last_lat=?, last_lng=?, last_at=? WHERE device_id=?"
          ).bind(lat, lng, Date.now(), dev.id).run();
          return json({ ok: true });
        }

        if (path === "/api/my/party/route" && request.method === "GET") {
          const mem = await env.DB.prepare("SELECT party_id FROM party_members WHERE device_id=?").bind(dev.id).first();
          if (!mem) return json({ geometry: [] });
          const party = await env.DB.prepare("SELECT route_id FROM parties WHERE id=?").bind(mem.party_id).first();
          if (!party || !party.route_id) return json({ geometry: [] });
          const route = await env.DB.prepare("SELECT geometry, name FROM routes WHERE id=?").bind(party.route_id).first();
          if (!route) return json({ geometry: [] });
          let coords = [];
          try { coords = JSON.parse(route.geometry); } catch {}
          return json({ geometry: coords, name: route.name });
        }

        if (path === "/api/my/party" && request.method === "GET") {
          const mem = await env.DB.prepare("SELECT party_id FROM party_members WHERE device_id=?").bind(dev.id).first();
          if (!mem) return json({ in_party: false });
          const party = await env.DB.prepare("SELECT * FROM parties WHERE id=?").bind(mem.party_id).first();
          if (!party) { await env.DB.prepare("DELETE FROM party_members WHERE device_id=?").bind(dev.id).run(); return json({ in_party: false }); }
          // Expiră party-urile inactive (curse vechi lăsate deschise) — 4h fără activitate
          const act = await env.DB.prepare("SELECT MAX(last_at) AS m FROM party_members WHERE party_id=?").bind(party.id).first();
          const lastAct = (act && act.m) ? act.m : party.created_at;
          if (Date.now() - lastAct > 4 * 3600 * 1000) {
            await env.DB.prepare("DELETE FROM party_members WHERE party_id=?").bind(party.id).run();
            await env.DB.prepare("DELETE FROM parties WHERE id=?").bind(party.id).run();
            return json({ in_party: false });
          }
          const rows = await env.DB.prepare(
            "SELECT device_id, name, color, last_lat, last_lng, last_at FROM party_members WHERE party_id=? ORDER BY id"
          ).bind(party.id).all();
          const members = (rows.results || []).map((m) => ({
            name: m.name, color: m.color, lat: m.last_lat, lng: m.last_lng,
            at: m.last_at, me: m.device_id === dev.id,
          }));
          return json({
            in_party: true, code: party.code, name: party.name,
            route_id: party.route_id, members,
          });
        }

        // --- Roll Race (sincronizare la viteză + cursă de 1 km în party) ---
        const RACE_TOL = 4;          // toleranță ±km/h pentru sincronizare
        const RACE_DIST = 1000;      // distanța cursei (m)
        async function myParty() {
          return await env.DB.prepare("SELECT * FROM parties WHERE id=(SELECT party_id FROM party_members WHERE device_id=?)").bind(dev.id).first();
        }
        // Pornește o cursă (lobby): setează viteza de sincronizare, resetează membrii
        if (path === "/api/my/party/race/start" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          let sp = Math.round(Number(b.sync_speed));
          if (!Number.isFinite(sp)) sp = 100;
          sp = Math.max(3, Math.min(250, sp));
          const party = await myParty();
          if (!party) return json({ error: "nu ești într-un party" }, 400);
          await env.DB.prepare("UPDATE parties SET race_status='lobby', race_speed=?, race_started_at=NULL WHERE id=?").bind(sp, party.id).run();
          await env.DB.prepare("UPDATE party_members SET cur_speed=NULL, race_dist=0, race_finish=NULL WHERE party_id=?").bind(party.id).run();
          return json({ ok: true, sync_speed: sp });
        }
        // Oprește/anulează cursa
        if (path === "/api/my/party/race/stop" && request.method === "POST") {
          const party = await myParty();
          if (party) await env.DB.prepare("UPDATE parties SET race_status=NULL, race_started_at=NULL WHERE id=?").bind(party.id).run();
          return json({ ok: true });
        }
        // Raportează viteza (+distanța dacă e cursă) și avansează starea
        if (path === "/api/my/party/race/tick" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const party = await myParty();
          if (!party || !party.race_status) return json({ in_race: false });
          const now = Date.now();
          const spd = Number(b.speed);
          await env.DB.prepare("UPDATE party_members SET cur_speed=?, last_at=? WHERE device_id=?")
            .bind(Number.isFinite(spd) ? spd : null, now, dev.id).run();
          if (party.race_status === "racing") {
            const dist = Number(b.dist);
            if (Number.isFinite(dist)) {
              const meRow = await env.DB.prepare("SELECT race_finish FROM party_members WHERE device_id=?").bind(dev.id).first();
              let fin = meRow && meRow.race_finish ? meRow.race_finish : null;
              if (!fin && dist >= RACE_DIST && party.race_started_at) fin = now - party.race_started_at;
              await env.DB.prepare("UPDATE party_members SET race_dist=?, race_finish=? WHERE device_id=?").bind(dist, fin, dev.id).run();
            }
            const rows = await env.DB.prepare("SELECT last_at, race_finish FROM party_members WHERE party_id=?").bind(party.id).all();
            const act = (rows.results || []).filter((m) => m.last_at && (now - m.last_at) < 15000);
            const allDone = act.length >= 1 && act.every((m) => m.race_finish != null);
            const timeout = party.race_started_at && (now - party.race_started_at) > 300000;
            if (allDone || timeout) await env.DB.prepare("UPDATE parties SET race_status='done' WHERE id=?").bind(party.id).run();
          } else if (party.race_status === "countdown") {
            // race_started_at = momentul GO (viitor); la GO trece în cursă
            if (party.race_started_at && now >= party.race_started_at) {
              await env.DB.prepare("UPDATE parties SET race_status='racing' WHERE id=? AND race_status='countdown'").bind(party.id).run();
              await env.DB.prepare("UPDATE party_members SET race_dist=0, race_finish=NULL WHERE party_id=?").bind(party.id).run();
            }
          } else if (party.race_status === "lobby") {
            const rows = await env.DB.prepare("SELECT cur_speed, last_at FROM party_members WHERE party_id=?").bind(party.id).all();
            const act = (rows.results || []).filter((m) => m.last_at && (now - m.last_at) < 8000);
            const synced = act.length >= 2 && act.every((m) => m.cur_speed != null && Math.abs(m.cur_speed - party.race_speed) <= RACE_TOL);
            if (synced) {
              // sincronizat → countdown de 3s, apoi GO (race_started_at = acum + 3000)
              await env.DB.prepare("UPDATE parties SET race_status='countdown', race_started_at=? WHERE id=? AND race_status='lobby'").bind(now + 3000, party.id).run();
              await env.DB.prepare("UPDATE party_members SET race_dist=0, race_finish=NULL WHERE party_id=?").bind(party.id).run();
            }
          }
          return json({ ok: true });
        }
        // Starea cursei pentru afișare
        if (path === "/api/my/party/race" && request.method === "GET") {
          const party = await myParty();
          if (!party || !party.race_status) return json({ in_race: false });
          const now = Date.now();
          const rows = await env.DB.prepare(
            "SELECT device_id, name, color, cur_speed, race_dist, race_finish, last_at FROM party_members WHERE party_id=? ORDER BY id"
          ).bind(party.id).all();
          const members = (rows.results || []).map((m) => ({
            name: m.name, color: m.color, me: m.device_id === dev.id,
            speed: m.cur_speed, dist: m.race_dist || 0, finish: m.race_finish,
            online: !!(m.last_at && (now - m.last_at) < 8000),
            synced: !!(m.cur_speed != null && Math.abs(m.cur_speed - party.race_speed) <= RACE_TOL && m.last_at && (now - m.last_at) < 8000),
          }));
          return json({
            in_race: true, status: party.race_status, sync_speed: party.race_speed,
            started_at: party.race_started_at, dist_target: RACE_DIST, tol: RACE_TOL, members,
          });
        }

        // --- Prieteni ---
        // Profilul meu (nume + cod de prieten, generat la nevoie)
        if (path === "/api/my/me" && request.method === "GET") {
          const code = await ensureFriendCode(env, dev.id);
          return json({ id: dev.id, name: dev.name, friend_code: code });
        }

        // Lista de prieteni cu status live, party curent și mesaje necitite
        if (path === "/api/my/friends" && request.method === "GET") {
          const now = Date.now();
          const rows = await env.DB.prepare(
            "SELECT d.id, d.name, d.last_lat, d.last_lng, d.last_seen, " +
            "(SELECT p.code FROM party_members pm JOIN parties p ON p.id=pm.party_id WHERE pm.device_id=d.id LIMIT 1) AS party_code, " +
            "(SELECT COUNT(*) FROM friend_messages fm WHERE fm.from_id=d.id AND fm.to_id=? AND fm.read_at IS NULL) AS unread " +
            "FROM friendships f JOIN devices d ON d.id = (CASE WHEN f.a=? THEN f.b ELSE f.a END) " +
            "WHERE f.a=? OR f.b=? ORDER BY d.name"
          ).bind(dev.id, dev.id, dev.id, dev.id).all();
          const friends = (rows.results || []).map((r) => {
            const fresh = r.last_seen && (now - r.last_seen) < 180000;
            return {
              id: r.id, name: r.name, party_code: r.party_code || null,
              unread: r.unread || 0,
              online: !!(r.last_seen && (now - r.last_seen) < 120000),
              lat: fresh ? r.last_lat : null, lng: fresh ? r.last_lng : null,
              last_seen: r.last_seen || null,
            };
          });
          return json({ friends });
        }

        // Adaugă un prieten după codul lui
        if (path === "/api/my/friends/add" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const code = (b.code || "").trim().toUpperCase();
          if (!code) return json({ error: "cod lipsă" }, 400);
          await ensureFriendCode(env, dev.id);
          const other = await env.DB.prepare("SELECT id, name FROM devices WHERE friend_code=?").bind(code).first();
          if (!other) return json({ error: "cod invalid" }, 404);
          if (other.id === dev.id) return json({ error: "nu te poți adăuga pe tine" }, 400);
          const a = Math.min(dev.id, other.id), c = Math.max(dev.id, other.id);
          const ex = await env.DB.prepare("SELECT id FROM friendships WHERE a=? AND b=?").bind(a, c).first();
          if (ex) return json({ ok: true, name: other.name, already: true });
          await env.DB.prepare("INSERT INTO friendships (a, b, created_at) VALUES (?,?,?)").bind(a, c, Date.now()).run();
          return json({ ok: true, name: other.name });
        }

        // Șterge un prieten
        if (path === "/api/my/friends/remove" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const fid = Number(b.id);
          if (!Number.isFinite(fid)) return json({ error: "id invalid" }, 400);
          const a = Math.min(dev.id, fid), c = Math.max(dev.id, fid);
          await env.DB.prepare("DELETE FROM friendships WHERE a=? AND b=?").bind(a, c).run();
          return json({ ok: true });
        }

        // Traseele publice ale prietenilor
        if (path === "/api/my/friends/routes" && request.method === "GET") {
          const ids = await friendIdsOf(env, dev.id);
          if (!ids.length) return json({ routes: [] });
          const ph = ids.map(() => "?").join(",");
          const rows = await env.DB.prepare(
            "SELECT id, name, description, distance_m, duration_s, owner_name, owner_id, created_at " +
            "FROM routes WHERE owner_type='device' AND is_public=1 AND owner_id IN (" + ph + ") " +
            "ORDER BY created_at DESC LIMIT 300"
          ).bind(...ids).all();
          return json({ routes: rows.results || [] });
        }

        // Conversație directă cu un prieten: GET (istoric + marchează citit) / POST (trimite)
        const fmm = path.match(/^\/api\/my\/friends\/messages\/(\d+)$/);
        if (fmm) {
          const fid = Number(fmm[1]);
          const a = Math.min(dev.id, fid), c = Math.max(dev.id, fid);
          const fr = await env.DB.prepare("SELECT id FROM friendships WHERE a=? AND b=?").bind(a, c).first();
          if (!fr) return json({ error: "nu ești prieten cu acest utilizator" }, 403);
          if (request.method === "GET") {
            const rows = await env.DB.prepare(
              "SELECT id, from_id, text, created_at FROM friend_messages " +
              "WHERE (from_id=? AND to_id=?) OR (from_id=? AND to_id=?) ORDER BY created_at ASC LIMIT 300"
            ).bind(dev.id, fid, fid, dev.id).all();
            await env.DB.prepare(
              "UPDATE friend_messages SET read_at=? WHERE from_id=? AND to_id=? AND read_at IS NULL"
            ).bind(Date.now(), fid, dev.id).run();
            const messages = (rows.results || []).map((m) => ({
              id: m.id, text: m.text, at: m.created_at, mine: m.from_id === dev.id,
            }));
            return json({ messages });
          }
          if (request.method === "POST") {
            const b = await request.json().catch(() => ({}));
            const text = (b.text || "").trim();
            if (!text) return json({ error: "mesaj gol" }, 400);
            await env.DB.prepare(
              "INSERT INTO friend_messages (from_id, to_id, text, created_at) VALUES (?,?,?,?)"
            ).bind(dev.id, fid, text.slice(0, 1000), Date.now()).run();
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

        // POST /api/devices/:id/avatar — încarcă poza șoferului
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

      // --- Trasee (admin: vede/gestionează toate) ---
      if (path.startsWith("/api/routes")) {
        const admin = await requireAdmin(request, env);
        if (!admin) return json({ error: "neautorizat" }, 401);

        // GET /api/routes — toate traseele
        if (path === "/api/routes" && request.method === "GET") {
          const rows = await env.DB.prepare(
            "SELECT id, owner_type, owner_id, owner_name, name, description, distance_m, duration_s, is_public, created_at " +
            "FROM routes ORDER BY created_at DESC LIMIT 1000"
          ).all();
          return json({ routes: rows.results || [] });
        }

        // POST /api/routes — admin creează traseu (desenat pe hartă)
        if (path === "/api/routes" && request.method === "POST") {
          const b = await request.json().catch(() => ({}));
          const name = (b.name || "").trim();
          if (!name) return json({ error: "nume obligatoriu" }, 400);
          const geo = parseRouteGeometry(b.geometry);
          if (!geo) return json({ error: "traseu invalid (prea puține puncte)" }, 400);
          const res = await env.DB.prepare(
            "INSERT INTO routes (owner_type, owner_id, owner_name, name, description, distance_m, duration_s, geometry, is_public, created_at) " +
            "VALUES ('admin',NULL,?,?,?,?,?,?,?,?)"
          ).bind(
            env.ADMIN_USER || "Admin", name.slice(0, 120),
            (b.description || "").trim().slice(0, 500) || null,
            geo.distance_m, null, JSON.stringify(geo.coords), b.public ? 1 : 0, Date.now()
          ).run();
          return json({ id: res.meta.last_row_id, distance_m: geo.distance_m });
        }

        // /api/routes/:id
        const arm = path.match(/^\/api\/routes\/(\d+)$/);
        if (arm) {
          const rid = Number(arm[1]);
          if (request.method === "GET") {
            const route = await env.DB.prepare("SELECT * FROM routes WHERE id=?").bind(rid).first();
            if (!route) return json({ error: "traseu inexistent" }, 404);
            let coords = [];
            try { coords = JSON.parse(route.geometry); } catch {}
            return json({
              id: route.id, name: route.name, description: route.description,
              distance_m: route.distance_m, duration_s: route.duration_s,
              is_public: route.is_public, owner_type: route.owner_type,
              owner_name: route.owner_name, created_at: route.created_at, geometry: coords,
            });
          }
          if (request.method === "POST") {
            const route = await env.DB.prepare("SELECT id, name, description, is_public FROM routes WHERE id=?").bind(rid).first();
            if (!route) return json({ error: "traseu inexistent" }, 404);
            const b = await request.json().catch(() => ({}));
            const name = (b.name != null ? String(b.name).trim() : route.name) || route.name;
            const desc = b.description != null ? String(b.description).trim().slice(0, 500) : route.description;
            const pub = b.public != null ? (b.public ? 1 : 0) : route.is_public;
            await env.DB.prepare("UPDATE routes SET name=?, description=?, is_public=? WHERE id=?")
              .bind(name.slice(0, 120), desc || null, pub, rid).run();
            return json({ ok: true });
          }
          if (request.method === "DELETE") {
            await env.DB.prepare("DELETE FROM routes WHERE id=?").bind(rid).run();
            return json({ ok: true });
          }
        }

        return json({ error: "rută necunoscută" }, 404);
      }

      return json({ error: "not found" }, 404);
    } catch (err) {
      return json({ error: String(err && err.message ? err.message : err) }, 500);
    }
  },
};
