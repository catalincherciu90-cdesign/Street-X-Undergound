# Street X Underground — Trasee & Tracking

**Aplicație nouă**, cu identitate proprie — **nu** este platforma veche de curierat. Street X Underground e o aplicație de **trasee de condus** și **urmărire live**, cu o estetică inspirată din jocurile de curse de stradă („Underground"): hartă vectorială cu uscat oliv, apă albastru-adânc și drumuri albe cu glow.

## Ce face

- 🗺️ **Dashboard web (admin)** — hartă live cu toate dispozitivele (telefoanele șoferilor), **istoric traseu**, rută/distanță până la o adresă. Temă „Underground" (neon, tipografie racing, scanlines).
- 🛣️ **Trasee** — șoferii **înregistrează un traseu conducând** (GPS live, se desenează pe hartă), îl salvează cu nume și îl fac **public** (bibliotecă comună, vizibilă tuturor) sau **privat**. Adminul vede toate traseele, poate desena unul nou pe hartă (urmează șoselele), poate face public/privat sau șterge.
- 📍 **Tracking** — aplicația Android trimite poziția la interval configurabil; adminul vede live poziția, viteza, bateria și km parcurși.
- 💬 **Chat** — mesaje în ambele sensuri între admin (dispecer) și fiecare dispozitiv.
- 📱 **Aplicație Android** — login cu utilizator + parolă, GO ONLINE/OFFLINE, butoane pentru Trasee și Chat. Temă „garage/underground". Descărcabilă direct de pe site la `/app.apk`.

## Arhitectură

- **Server:** Cloudflare Worker (`server/`) — API + paginile web (dashboard, `/routes`, `/driver`, `/pair`). Bază de date **D1** (`devices`, `locations`, `messages`, `routes`) și **KV** (`DOCS`) pentru poze/logo.
- **Android:** aplicație nativă Kotlin (`android/`) — serviciu de locație în foreground + WebView pentru paginile web.
- **Hartă:** MapLibre GL cu tile-uri vectoriale gratuite (OpenFreeMap / OpenMapTiles), fără cheie API.

## Deploy

Deploy-ul se face prin **Cloudflare Workers Builds** (integrare Git):

- **Root directory:** `server`
- **Deploy command:** `npx wrangler deploy`
- `wrangler.toml` conține numele worker-ului (`street-x-undergound`) și legăturile D1/KV.
- Secrete worker (setate în dashboard Cloudflare): `ADMIN_PASS`, `AUTH_SECRET` (opțional `ADMIN_USER`).

Schema D1 se creează automat la prima cerere (vezi `ensureSchema` în `server/src/index.js`); manual: `server/schema.sql`.

## Build APK

Workflow-ul `.github/workflows/build-apk.yml` compilează automat aplicația (debug) și o publică la `/app.apk` — fără secrete. Se declanșează la orice modificare din `android/`.

## Rute principale (server)

| Rută | Descriere |
|---|---|
| `GET /` | Dashboard admin |
| `GET /routes?key=` | Pagina de trasee a șoferului (înregistrare + bibliotecă) |
| `GET /driver?key=` | Chat șofer ↔ dispecer |
| `GET /pair?key=` | Conectarea telefonului la platformă |
| `GET /app.apk` | Descărcare aplicație Android |
| `POST /api/login` | Login admin |
| `POST /api/device/login` | Login șofer (user + parolă) → device key |
| `POST /api/ingest` | Telefonul trimite poziția |
| `GET/POST /api/devices…` | Gestionare dispozitive, istoric, cont, avatar (admin) |
| `GET/POST /api/my/routes…` | Traseele șoferului + biblioteca publică |
| `GET/POST /api/routes…` | Toate traseele (admin) |
| `GET/POST /api/my/messages`, `/api/devices/:id/messages` | Chat |
