// Pagina de conectare servită la GET /pair?key=...(&url=...)
// Deschide aplicația prin deep link gpstracker://setup?... ; dacă nu e instalată,
// oferă descărcarea APK-ului și un cod QR ca alternativă.

export const PAIR_HTML = /* html */ `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Street X Underground — Conectare</title>
<style>
  :root{--bg:#0f1720;--panel:#151f2b;--line:#243447;--txt:#e6edf3;--mut:#8aa0b6;--gold:#d9a441}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:var(--bg);color:var(--txt);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:26px;width:360px;max-width:94vw;text-align:center}
  h1{font-size:20px;margin:0 0 6px;color:var(--gold)}
  p{color:var(--mut);font-size:14px;margin:0 0 20px}
  a.btn{display:block;text-decoration:none;padding:14px;border-radius:10px;font-weight:600;margin-bottom:12px}
  .primary{background:var(--gold);color:#1a1205}
  .ghost{background:#1c2b3a;color:var(--txt);border:1px solid var(--line)}
  .qrbox{display:none;justify-content:center;background:#fff;padding:14px;border-radius:10px;margin:8px 0 4px}
  .qrbox img{width:180px;height:180px;image-rendering:pixelated}
  .small{font-size:12px;color:var(--mut);margin-top:14px}
  .err{color:#f85149}
  img[src$="brand/logo"]{animation:neonFlicker 3.4s infinite}
  @keyframes neonFlicker{
    0%,100%{filter:drop-shadow(0 0 4px #2fe08a) drop-shadow(0 0 14px #2fe08a) drop-shadow(0 0 26px #22c55e);opacity:1}
    9%,10%{opacity:.55;filter:drop-shadow(0 0 2px #2fe08a)}
    11%{opacity:1}
    41%,43%{opacity:.4;filter:none}
    44%{opacity:1}
    73%,75%{opacity:.7;filter:drop-shadow(0 0 3px #2fe08a)}
    76%{opacity:1}
  }
</style>
</head>
<body>
<div class="card">
  <img src="/brand/logo" alt="Street X Underground" style="display:block;height:104px;max-width:100%;margin:0 auto 12px" />
  <p id="sub">Conectează telefonul la platformă.</p>

  <a id="openApp" class="btn primary" href="#">📲 Deschide aplicația și conectează</a>
  <a class="btn ghost" href="/app.apk" download="street-x-underground.apk">📥 Nu ai aplicația? Descarc-o</a>

  <div id="qr" class="qrbox"></div>
  <p class="small">Dacă butonul nu deschide aplicația: instaleaz-o, apoi apasă „Deschide aplicația". Sau, din alt telefon, scanează codul QR de mai sus.</p>
</div>

<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>
<script>
  var p = new URLSearchParams(location.search);
  var key = (p.get("key") || "").trim();
  var url = (p.get("url") || location.origin).trim();

  if (!key) {
    document.getElementById("sub").innerHTML = '<span class="err">Link incomplet (lipsește codul dispozitivului).</span>';
    document.getElementById("openApp").style.display = "none";
  } else {
    var deep = "gpstracker://setup?url=" + encodeURIComponent(url) + "&key=" + encodeURIComponent(key);
    var openApp = document.getElementById("openApp");
    openApp.href = deep;

    // încearcă automat să deschidă aplicația (o singură dată)
    setTimeout(function(){ try { window.location.href = deep; } catch(e){} }, 600);

    // cod QR ca alternativă (scanat de pe alt telefon)
    try {
      var qr = qrcode(0, "M");
      qr.addData(JSON.stringify({v:1, url:url, key:key}));
      qr.make();
      var box = document.getElementById("qr");
      box.innerHTML = qr.createImgTag(4, 8);
      box.style.display = "flex";
    } catch(e){}
  }
</script>
</body>
</html>`;
