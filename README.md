# DropLy Courier — Platformă flotă + Aplicație Android

Sistem complet de urmărire a locației telefoanelor pentru o **flotă/firmă**:

- 📡 **Platformă** — Cloudflare Worker + bază de date D1. Primește pozițiile și servește dashboard-ul.
- 🗺️ **Dashboard web** — hartă live cu toate telefoanele (Leaflet + OpenStreetMap), **istoric traseu** și **distanță/rută de la curier la o adresă**.
- 📱 **Aplicație Android** (Kotlin) — trimite locația **în fundal**, cu telefonul blocat, și afișează **cursele** primite.
- 🧾 **Dispecerat curse** — adminul trimite curse numerotate (contact, telefon, adrese, detalii); curierul le vede în aplicație, schimbă statusul și **atașează documente** care ajung la admin.
- ⚙️ **Build automat APK** — GitHub Actions compilează `.apk`-ul; îl descarci și îl instalezi.

```
Telefon (app Android)  ──POST /api/ingest──►  Cloudflare Worker  ──►  D1 (SQLite)
                                                     │
      Dashboard web (hartă)  ◄──GET /api/devices────┘
```

## Structura

```
gps/
├── server/                 # Platforma (Cloudflare Worker)
│   ├── src/index.js        #   API + router
│   ├── src/dashboard.js    #   dashboard-ul web (hartă live + istoric)
│   ├── schema.sql          #   tabelele D1
│   ├── wrangler.toml       #   config deploy
│   └── package.json
├── android/                # Aplicația Android (Kotlin)
│   └── app/src/main/…      #   MainActivity, LocationService (foreground), etc.
└── .github/workflows/deploy.yml       # build APK + deploy platformă (Cloudflare)
```

---

## 1. Pornirea platformei (backend + dashboard)

Ai nevoie de un cont **Cloudflare** (gratuit). Sunt două variante: **A) automat prin GitHub Actions** (recomandat) sau **B) manual din terminal**.

### Varianta A — Deploy automat (GitHub Actions)

Nu instalezi nimic local. Trebuie doar să adaugi câteva **secrete** în repo, o singură dată.

**1) Creează un Cloudflare API Token**
- Cloudflare Dashboard → **My Profile → API Tokens → Create Token**
- Alege template-ul **„Edit Cloudflare Workers”** (îți dă drepturi pe Workers).
- La *Account Resources* selectează contul tău. Adaugă și permisiunea **D1 → Edit** (Account → D1).
- Creează tokenul și **copiază-l** (se afișează o singură dată).
- Îți trebuie și **Account ID**: Cloudflare Dashboard → Workers & Pages → coloana din dreapta.

**2) Adaugă secretele în GitHub**
Repo `gps` → **Settings → Secrets and variables → Actions → New repository secret**. Adaugă:

| Nume secret | Valoare |
|-------------|---------|
| `CLOUDFLARE_API_TOKEN` | tokenul de mai sus |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID-ul contului |
| `WORKER_ADMIN_PASS` | parola cu care intri în dashboard |
| `WORKER_AUTH_SECRET` | un string random lung (ex. din `openssl rand -hex 32`) |
| `WORKER_ADMIN_USER` | *(opțional)* user-ul de admin; implicit `admin` |

**3) Rulează deploy-ul**
Repo → **Actions → „Deploy platform (Cloudflare)” → Run workflow**. Workflow-ul:
creează baza D1 `gps-tracker`, injectează id-ul, publică worker-ul și setează parola/secretele.
La pasul *„Publică worker-ul”* apare adresa `https://gps-tracker.<contul-tău>.workers.dev` — o deschizi și te loghezi.

> Tabelele bazei de date se creează automat la prima cerere (nu trebuie migrare manuală).

### Varianta B — Deploy manual din terminal

Ai nevoie de [Node.js](https://nodejs.org).

```bash
cd server
npm install
npx wrangler login            # autentificare Cloudflare

# 1) Creează baza de date
npx wrangler d1 create gps-tracker
#   -> copiază "database_id" în wrangler.toml (înlocuiește PUNE_AICI_DATABASE_ID)

# 2) Creează tabelele
npm run db:init

# 3) Setează secretele (parola de dashboard + o cheie random lungă)
npx wrangler secret put ADMIN_PASS      # parola ta de admin
npx wrangler secret put AUTH_SECRET     # string random lung (ex: din `openssl rand -hex 32`)
npx wrangler secret put ADMIN_USER      # opțional; implicit "admin"

# 4) Publică
npm run deploy
```

La final primești o adresă de forma `https://gps-tracker.<contul-tău>.workers.dev`.
Deschide-o în browser → te loghezi cu `admin` + parola setată.

> Local, pentru test: `npm run db:init:local` apoi `npm run dev`.

## 2. Adăugarea unui curier (login cu user + parolă)

1. În dashboard apasă **+ Dispozitiv**, pune **numele** (ex. „Telefon Ion"), **grupul**, și alege un **utilizator** și o **parolă** pentru curier.
2. După creare, dashboard-ul îți arată **utilizatorul și parola** — dă-i-le curierului.
3. În aplicație, curierul introduce **utilizatorul și parola** și apasă **„Conectează"** → se autentifică și poate porni urmărirea.
4. Poți schimba oricând datele: în lista de dispozitive, apasă **„🔑 Cont"** de lângă curier → setezi utilizator/parolă noi și **încarci o poză** (apare în pin-ul de pe hartă și în listă).
5. Fiecare curier are cont propriu → apare separat pe hartă și în listă.

> Parolele sunt stocate ca **hash PBKDF2-SHA256** (nu în clar). Adresa platformei e pre-completată
> în aplicație; se poate schimba din câmpul „Server".

### Distanță / rută de la curier la o adresă
În dashboard, secțiunea **„Distanță curier → adresă"** (jos în panel):
1. Selectează curierul din listă (trebuie să aibă o poziție cunoscută).
2. Scrie o **adresă destinație** și apasă **„Calculează ruta"** — sau apasă **„📍 Hartă"** și dai click pe hartă unde vrei să ajungă.
3. Se afișează **distanța pe șosea și timpul estimat** (ex. „🚗 12.4 km • ~22 min") și se desenează ruta. **✕** șterge ruta.

> Geocodarea adresei și ruta folosesc serviciile publice gratuite OpenStreetMap
> (**Nominatim** + **OSRM**), potrivite pentru volum mic. Pentru uz intens, self-hostează
> OSRM sau folosește un serviciu de rutare cu plată. Dacă ruta pe drum nu e disponibilă,
> se afișează distanța în linie dreaptă.

## 3. Aplicația Android

### Obținerea APK-ului
Cel mai simplu: **direct de pe platformă**. După deploy, APK-ul e servit de site la:
```
https://gps-tracker.<contul-tău>.workers.dev/app.apk
```
Există și un buton **„📥 Descarcă aplicația Android"** pe ecranul de login și în bara dashboard-ului.
Îl deschizi pe telefon și instalezi — fără GitHub, fără dezarhivare.

> APK-ul e compilat automat în workflow-ul de deploy și copiat în `server/public/app.apk`
> (disponibil și ca artifact GitHub Actions, ca backup).

### Instalare
1. Pe telefon: **Setări → Securitate → Instalare aplicații necunoscute** → permite pentru browser/manager de fișiere.
2. Deschide `.apk`-ul și instalează.
3. Deschide aplicația, introdu **utilizatorul și parola** și apasă **Conectează**. După conectare,
   formularul dispare și rămâne un singur buton mare **GO ONLINE / GO OFFLINE**.
4. Apasă **GO ONLINE** ca să pornești urmărirea. La cererea de permisiuni alege **„Permite tot timpul”**
   (locație în fundal) și permite **notificările**.
5. Recomandat: **Setări → Baterie →** scoate aplicația din optimizarea bateriei, ca să nu fie oprită.

### Online / Offline (curier)
- Ecranul principal: un buton mare **GO ONLINE** (verde) pornește urmărirea, **GO OFFLINE** (roșu) o oprește; dedesubt **„🧾 Cursele mele"**.
- Sus-dreapta e o **iconiță de profil** (poza curierului) → apasă pentru cont și **Deconectează**.
- Poți opri și din **notificarea permanentă** → butonul **„Oprește tura”** (fără a deschide aplicația).

Cât timp ești **ONLINE**, telefonul trimite locația și Android cere obligatoriu afișarea notificării.
Când ești **OFFLINE**, nu se mai trimite nimic — pe dashboard apari offline (rămâne doar ultima poziție).

### Compilare locală (opțional)
Cu Android Studio: deschide folderul `android/` și apasă Run — sau din terminal cu Android SDK instalat:
```bash
cd android
gradle assembleDebug        # sau ./gradlew assembleDebug dacă ai wrapper-ul
# APK: app/build/outputs/apk/debug/app-debug.apk
```

---

## Curse (dispecerat)

**Admin (în dashboard):** în lista de dispozitive, apasă **„🧾 Curse"** lângă un curier:
- completezi **persoană de contact, telefon, adresă preluare, adresă livrare, informații** și apeși **„Adaugă cursa"** — cursa primește un **număr** și ajunge la curier;
- vezi toate cursele curierului cu statusul lor și **documentele atașate** (le deschizi/descarci) — inclusiv **semnătura de primire**;
- pentru fiecare cursă activă vezi **🧭 distanța/ETA curier → livrare** (buton „Calculează");
- **click pe poza (avatarul)** unui curier → profil cu **comenzi active** și **km făcuți azi**;
- poți șterge o cursă (șterge și documentele ei).

**📊 Raport** (buton în bara de sus): curse totale, curse finalizate și **km parcurși** per curier, pe interval (azi / 7 zile / 30 zile).

**🖼️ Logo** (buton în bara de sus): încarci logo-ul firmei (apare pe login, header și în aplicația curierului); poți reveni oricând la logo-ul implicit.

**🏭 Depozit** (buton în bara de sus): setezi **adresa depozitului** (se geocodează și se salvează) și vezi pentru fiecare curier **cât mai are până la depozit** (distanță pe șosea + timp estimat).

**💬 Chat**: apasă **„💬 Mesaj"** lângă un curier — conversație în ambele sensuri. Tu trimiți din dashboard, curierul **răspunde din aplicație** (🔔 în „Cursele mele"). Curierul primește **notificare** la mesajele tale; tu vezi un **punct verde** pe „💬 Mesaj" când curierul ți-a răspuns ultimul.

**Curier (în aplicație):** apasă **„🧾 Cursele mele"**:
- **taburi** „🚚 Active" / „✅ Finalizate" cu numărul de curse pe fiecare;
- vede cursele numerotate cu toate informațiile și un buton **📞** pentru a suna contactul;
- **🧭 distanță + timp estimat** de la poziția lui live până la adresa cursei (se calculează automat pentru cursa în desfășurare) și buton **🗺️ Navighează** (deschide Google Maps);
- schimbă statusul: **Acceptă → Start cursă → Finalizează**;
- la **Finalizează** apare un ecran de **✍️ semnătură** — clientul semnează pe telefon, semnătura se salvează ca document la cursă;
- **📎 Atașează document** (poză/PDF) — ajunge instant la admin;
- primește **🔔 notificare pe telefon** când i se atribuie o cursă nouă (cât timp urmărirea e pornită).

Documentele sunt stocate în **Cloudflare KV** (namespace creat automat la deploy). Fiecare document ≤ 20 MB.

## API (rezumat)

| Metodă | Rută | Auth | Rol |
|--------|------|------|-----|
| POST | `/api/login` | — | login admin → token |
| POST | `/api/device/login` | — | login curier (user+parolă) → device key |
| GET | `/api/devices` | admin | listă + ultima poziție |
| POST | `/api/devices` | admin | creează curier (nume, grup, user, parolă) |
| POST | `/api/devices/:id/credentials` | admin | setează/resetează user+parolă |
| DELETE | `/api/devices/:id` | admin | șterge dispozitiv + istoric |
| GET | `/api/devices/:id/history?from=&to=` | admin | traseu |
| POST | `/api/ingest` | device key | telefonul trimite poziția |
| POST | `/api/courses` | admin | creează cursă pentru un curier |
| GET | `/api/courses?device_id=` | admin | listă curse |
| POST | `/api/courses/:id` | admin | schimbă status |
| DELETE | `/api/courses/:id` | admin | șterge cursa + documentele |
| GET | `/api/courses/:id/docs` | admin | listă documente |
| GET | `/api/docs/:id` | admin | descarcă un document |
| GET | `/api/report?from=&to=` | admin | raport curse + km per curier |
| POST | `/api/devices/:id/messages` | admin | trimite mesaj către curier |
| GET | `/api/my/messages` | device key | mesajele curierului |
| GET | `/api/my/courses` | device key | cursele curierului |
| POST | `/api/my/courses/:id/status` | device key | curierul schimbă statusul |
| POST | `/api/my/courses/:id/docs?filename=` | device key | curierul urcă un document |

Corpul trimis de telefon la `/api/ingest`:
```json
{ "lat": 45.94, "lng": 24.96, "accuracy": 12.0, "speed": 8.3, "battery": 84, "ts": 1730000000000 }
```

## Note de securitate & confidențialitate

- Instalează aplicația **doar pe telefoane pentru care ai dreptul** să urmărești locația (ale tale, ale firmei cu acordul angajaților). Urmărirea fără consimțământ poate fi ilegală.
- `AUTH_SECRET` și `ADMIN_PASS` se păstrează secrete (setate ca Wrangler secrets, nu în cod).
- Codul de dispozitiv (Device Key) e ca o parolă — cine îl are poate trimite poziții în numele telefonului.

## Idei de dezvoltare ulterioară

- Autentificare cu mai mulți utilizatori și roluri.
- Geofencing + alerte (intrare/ieșire din zonă).
- Export traseu (GPX/CSV), rapoarte de kilometri.
- Versiune iOS.
