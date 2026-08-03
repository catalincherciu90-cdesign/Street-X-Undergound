// Pagina curierului: aplicație „Signal Field" (aliniată la adminul Signal Ops).
// Taburi jos: Curse (activ+acasă) / Istoric / Chat / Profil. Hartă live via buton.
// Deschisă în aplicație (WebView) la /driver?key=<device_key>. Auth: device key ca Bearer.

export const DRIVER_HTML = /* html */ `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>DropLy Courier</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  :root{
    --bg:#0a0f0d; --s1:#121a16; --s2:#18221d; --s3:#202b25;
    --line:#263229; --line2:#3a4d43;
    --t1:#f5f8f5; --t2:#b9ccc0; --t3:#7c9488;
    --acc:#22e08a; --acc-dim:#1ec97e; --info:#4d9fff; --warn:#eab54a; --danger:#ff5b60;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--t1);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;flex-direction:column;height:100vh;overflow:hidden}
  .ic{flex:none;vertical-align:middle}

  /* header */
  header{background:linear-gradient(180deg,var(--s1),transparent);border-bottom:1px solid var(--line);
    display:flex;align-items:center;gap:9px;flex:0 0 auto;
    padding:max(12px,env(safe-area-inset-top)) 16px 12px}
  .mark{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;flex:none;background:linear-gradient(160deg,#123320,#0c1a12);border:1px solid var(--line2);box-shadow:0 0 8px rgba(34,224,138,.2)}
  header .wm{font-weight:600;font-size:15px;letter-spacing:.2px}
  header .wm b{color:var(--acc)}
  .online{margin-left:auto;display:flex;align-items:center;gap:7px;font-size:12px;color:var(--t2)}
  .pdot{width:8px;height:8px;border-radius:50%;background:var(--acc);position:relative;flex:none}
  .pdot::after{content:"";position:absolute;inset:0;border-radius:50%;animation:pulse 1.9s infinite}
  .pdot.off{background:var(--t3)}
  .pdot.off::after{animation:none}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(34,224,138,.5)}70%{box-shadow:0 0 0 9px rgba(34,224,138,0)}100%{box-shadow:0 0 0 0 rgba(34,224,138,0)}}
  header .hbtn{background:var(--s3);border:1px solid var(--line2);color:var(--t2);border-radius:9px;width:36px;height:36px;display:grid;place-items:center;cursor:pointer}
  img[src$="brand/logo"]{filter:drop-shadow(0 0 5px rgba(34,224,138,.35));animation:logoBoot .9s steps(3,end) 1}
  @keyframes logoBoot{0%{opacity:.3}20%{opacity:1}30%{opacity:.5}45%{opacity:1}60%{opacity:.7}100%{opacity:1}}

  .h1{font-size:22px;font-weight:700;padding:10px 16px 2px}
  .sub{font-size:12.5px;color:var(--t3);padding:0 16px 10px}

  .wrap{flex:1 1 auto;overflow:auto;padding:6px 16px 10px}
  .wrap.mapmode{padding:0;overflow:hidden;position:relative}
  #dmap{position:absolute;inset:0;background:#0b1210}

  /* card cursă */
  .course{background:var(--s2);border:1px solid var(--line);border-radius:20px;padding:16px 16px 14px;margin-bottom:12px;box-shadow:0 8px 24px rgba(0,0,0,.35);position:relative;overflow:hidden;transition:transform .12s ease}
  .course:active{transform:scale(.992)}
  .course::before{content:"";position:absolute;left:0;top:16px;bottom:16px;width:3px;border-radius:3px;background:var(--line2)}
  .course.st-nou::before{background:var(--info)}
  .course.st-acceptat::before{background:var(--warn)}
  .course.st-in_curs::before{background:var(--acc);box-shadow:0 0 8px rgba(34,224,138,.6)}
  .course.live{border-color:rgba(34,224,138,.35);box-shadow:0 0 0 1px rgba(34,224,138,.28),0 10px 30px rgba(34,224,138,.1)}
  .ctop{display:flex;align-items:center;gap:10px;margin-bottom:14px}
  .cnum{font-family:var(--mono);font-weight:700;font-size:15px}
  .cetachip{margin-left:auto;font-family:var(--mono);font-weight:700;font-size:12.5px;color:var(--info);display:inline-flex;align-items:center;gap:5px}
  .badge{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase}
  .badge.b-nou{background:rgba(77,159,255,.14);color:var(--info);border:1px solid rgba(77,159,255,.3)}
  .badge.b-acceptat{background:rgba(234,181,74,.14);color:var(--warn);border:1px solid rgba(234,181,74,.3)}
  .badge.b-in_curs{background:rgba(34,224,138,.14);color:var(--acc);border:1px solid rgba(34,224,138,.25)}
  .badge.b-finalizat{background:rgba(245,248,245,.05);color:var(--t2);border:1px solid var(--line)}
  .badge.b-anulat{background:rgba(255,91,96,.12);color:var(--danger);border:1px solid rgba(255,91,96,.28)}

  /* tracker 3 pași */
  .stepper{display:flex;align-items:center;margin:2px 0 16px}
  .step{display:flex;flex-direction:column;align-items:center;width:62px;flex:0 0 auto}
  .sdot{width:12px;height:12px;border-radius:50%;background:transparent;border:2px solid var(--line2)}
  .step.done .sdot{background:var(--acc);border-color:var(--acc)}
  .step.active .sdot{background:var(--acc);border-color:var(--acc);box-shadow:0 0 0 4px rgba(34,224,138,.16);animation:ring 1.9s infinite}
  @keyframes ring{0%{box-shadow:0 0 0 3px rgba(34,224,138,.28)}70%{box-shadow:0 0 0 9px rgba(34,224,138,0)}100%{box-shadow:0 0 0 0 rgba(34,224,138,0)}}
  .slbl{font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--t3);margin-top:7px}
  .step.done .slbl,.step.active .slbl{color:var(--t1);font-weight:600}
  .sline{flex:1;height:2px;background:var(--line2);border-radius:2px;margin:0 2px 17px}
  .sline.done{background:var(--acc)}

  /* timeline adrese */
  .tl{padding-left:4px;margin:4px 0 6px}
  .ti{display:flex;gap:12px;position:relative;padding-bottom:14px}
  .ti:not(:last-child)::before{content:"";position:absolute;left:5px;top:16px;bottom:0;width:2px;background:var(--line2)}
  .ti.done:not(:last-child)::before{background:var(--acc)}
  .tm{width:12px;height:12px;border-radius:50%;flex:none;margin-top:3px;z-index:1;border:2px solid var(--bg)}
  .tm.pick{background:var(--info)}
  .tm.drop{background:var(--acc);box-shadow:0 0 8px rgba(34,224,138,.5)}
  .tk{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--t3)}
  .tv{font-size:15px;font-weight:600;color:var(--t1);margin-top:1px;word-break:break-word}
  .tv.sec{font-weight:400;color:var(--t2);font-size:14px}

  .row{display:flex;gap:8px;margin:5px 0;font-size:14px}
  .row .lbl{color:var(--t3);min-width:74px}
  .row .val{flex:1;word-break:break-word}
  a.call{display:inline-flex;align-items:center;gap:6px;background:var(--s3);border:1px solid var(--line2);color:var(--t1);text-decoration:none;padding:6px 12px;border-radius:10px;font-weight:600;font-size:13px}
  .cmeta{display:flex;align-items:center;gap:10px;padding-top:12px;margin-top:6px;border-top:1px solid var(--line);font-size:13px;color:var(--t2)}
  .cmeta .km{font-family:var(--mono);color:var(--t1);font-weight:600}
  .cmeta .call{margin-left:auto}

  .eta{margin-top:10px;padding:10px 12px;border:1px solid var(--line);border-radius:12px;background:var(--s1);font-size:13.5px;color:var(--t2)}
  .eta b{color:var(--info);font-family:var(--mono)}

  /* butoane */
  .cta{width:100%;height:52px;border:none;border-radius:14px;background:linear-gradient(180deg,#29e694,#1ec97e);color:#08130d;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;box-shadow:0 6px 18px rgba(34,224,138,.26);margin-top:14px;transition:transform .1s ease}
  .cta:active{transform:scale(.97)}
  .actrow{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
  .act{flex:1;min-width:44px;border:1px solid var(--line2);background:var(--s3);color:var(--t1);border-radius:11px;padding:11px 10px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:transform .1s ease}
  .act:active{transform:scale(.96)}
  .act.nav{color:var(--info);border-color:rgba(77,159,255,.3)}
  .act.ghost{color:var(--t3);background:transparent;border-color:var(--line);flex:0 0 auto}
  .upl{margin-top:10px}
  .upl label{display:inline-flex;align-items:center;gap:6px;color:var(--t2);border:1px dashed var(--line2);border-radius:11px;padding:9px 12px;font-size:12.5px;cursor:pointer}
  .docs{font-size:11.5px;color:var(--t3);margin-top:7px}
  input[type=file]{display:none}

  /* empty & skeleton */
  .empty{text-align:center;padding:52px 24px;color:var(--t2)}
  .empty .ei{width:96px;height:96px;margin:0 auto 16px;display:grid;place-items:center;color:var(--line2)}
  .empty .et{font-size:15px;font-weight:600;color:var(--t1)}
  .empty .es{font-size:12.5px;color:var(--t3);margin-top:6px;max-width:250px;margin-left:auto;margin-right:auto;line-height:1.5}
  .empty .pdot{display:inline-block;margin-right:6px;vertical-align:middle}
  .sk{background:var(--s2);border:1px solid var(--line);border-radius:20px;height:150px;margin-bottom:12px;position:relative;overflow:hidden}
  .sk::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.05) 50%,transparent 70%);background-size:200% 100%;animation:sh 1.4s infinite}
  @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}

  /* profil */
  .profcard{text-align:center;padding:20px 6px}
  .pav{width:88px;height:88px;border-radius:50%;background:linear-gradient(160deg,#6ff0b6,#22c47e);color:#08130d;font-size:30px;font-weight:700;display:flex;align-items:center;justify-content:center;margin:8px auto 12px;box-shadow:0 8px 22px rgba(34,224,138,.22)}
  .pname{font-size:21px;font-weight:700;margin-bottom:2px}
  .pmeta{font-size:12.5px;color:var(--t3);margin-bottom:20px}
  .pstats{display:flex;gap:10px;justify-content:center;margin-bottom:22px}
  .ptile{flex:1;max-width:120px;background:var(--s2);border:1px solid var(--line);border-radius:16px;padding:16px 8px}
  .ptile b{display:block;font-size:24px;font-family:var(--mono);color:var(--t1)}
  .ptile span{font-size:11px;color:var(--t3);text-transform:uppercase;letter-spacing:.04em}
  .pmenu{width:100%;background:var(--s2);border:1px solid var(--line);color:var(--t1);border-radius:14px;padding:15px;font-size:14px;font-weight:500;text-align:left;cursor:pointer;margin-bottom:10px;display:flex;align-items:center;gap:12px;transition:transform .1s ease}
  .pmenu:active{transform:scale(.98)}
  .pmenu .ic{color:var(--t3)}
  .pmenu.danger{color:var(--danger)}
  .pmenu.danger .ic{color:var(--danger)}

  /* chat */
  .chat{display:flex;flex-direction:column;height:100%}
  .chatlist{flex:1;overflow:auto;display:flex;flex-direction:column;gap:8px;padding-bottom:8px}
  .bub{max-width:82%;padding:9px 12px;border-radius:14px;font-size:13.5px;line-height:1.45;word-break:break-word}
  .bub.them{background:var(--s3);border:1px solid var(--line);align-self:flex-start;border-bottom-left-radius:4px}
  .bub.me{background:linear-gradient(180deg,#1f5a41,#164531);color:#eafff4;align-self:flex-end;border-bottom-right-radius:4px}
  .bub .ts{display:block;font-size:10px;opacity:.65;margin-top:4px}
  .chatin{display:flex;gap:8px;padding:10px 0 max(6px,env(safe-area-inset-bottom));align-items:flex-end}
  .chatin input{flex:1;background:var(--s2);border:1px solid var(--line);color:var(--t1);border-radius:12px;padding:12px;font-size:13.5px}
  .chatin input:focus{outline:none;border-color:var(--info);box-shadow:0 0 0 3px rgba(77,159,255,.15)}
  .chatin button{flex:none;width:48px;border:none;border-radius:12px;background:linear-gradient(180deg,#29e694,#1ec97e);color:#08130d;display:grid;place-items:center;cursor:pointer}

  /* bottom tab bar */
  .tabs{display:flex;background:#0d1512;border-top:1px solid var(--line);flex:0 0 auto;padding:8px 6px max(10px,env(safe-area-inset-bottom))}
  .tabs button{flex:1;background:none;border:none;color:var(--t3);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;font-weight:600;position:relative;padding:0}
  .tabs button .ib{width:46px;height:30px;border-radius:11px;display:grid;place-items:center;transition:background .12s}
  .tabs button.on{color:var(--acc)}
  .tabs button.on .ib{background:rgba(34,224,138,.12)}
  .tabs .cnt{position:absolute;top:-2px;right:calc(50% - 22px);min-width:16px;height:16px;border-radius:9px;background:var(--danger);color:#fff;font-family:var(--mono);font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid #0d1512}

  /* map (Waze-style) */
  #speed{position:absolute;left:14px;bottom:170px;z-index:500;background:rgba(18,26,22,.92);border:1px solid var(--line2);border-radius:50%;width:76px;height:76px;display:flex;flex-direction:column;align-items:center;justify-content:center}
  #speed b{font-size:24px;line-height:1;font-family:var(--mono)}
  #speed span{font-size:10px;color:var(--t3)}
  #mapBack{position:absolute;left:14px;top:calc(14px + env(safe-area-inset-top));z-index:600;background:rgba(18,26,22,.92);border:1px solid var(--line2);color:var(--t1);border-radius:12px;padding:10px 14px;font-weight:600;font-size:14px;display:flex;align-items:center;gap:7px;cursor:pointer}
  #navcard{position:absolute;left:0;right:0;bottom:0;z-index:500;background:var(--s1);border-top:1px solid var(--line2);border-radius:18px 18px 0 0;padding:16px 16px calc(18px + env(safe-area-inset-bottom))}
  #navcard .nn{font-weight:700;font-size:16px}
  #navcard .neta{font-size:15px;margin:8px 0}
  #navcard .neta b{color:var(--info);font-family:var(--mono)}
  #navcard .nrow{font-size:13px;color:var(--t2);margin:3px 0;display:flex;align-items:center;gap:7px}
  #navcard .nrow .ic{color:var(--t3)}
  #navcard .nbtns{display:flex;gap:8px;margin-top:12px}
  #navcard .nbtns a{flex:1;text-align:center;text-decoration:none;padding:13px;border-radius:12px;font-weight:700;font-size:14px;display:inline-flex;align-items:center;justify-content:center;gap:6px}
  .navwaze{background:var(--info);color:#04122c}
  .navmaps{background:var(--s3);color:var(--t1);border:1px solid var(--line2)}
  .navcall{background:var(--acc);color:#08130d;flex:0 0 auto!important;padding:13px 16px!important}

  /* toast */
  .toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:var(--s3);border:1px solid var(--line2);border-radius:12px;padding:11px 18px;font-size:14px;opacity:0;transition:.2s;z-index:150;box-shadow:0 8px 24px rgba(0,0,0,.5)}
  .toast.show{opacity:1}

  /* semnătură */
  #sigPad{position:fixed;inset:0;background:rgba(6,10,8,.94);display:none;flex-direction:column;z-index:200;padding:16px calc(16px) calc(16px + env(safe-area-inset-bottom))}
  #sigPad.show{display:flex}
  #sigPad h3{color:var(--t1);margin:8px 0 12px;text-align:center;font-size:16px}
  #sigCanvas{background:#fff;border-radius:14px;flex:1;touch-action:none;width:100%}
  #sigPad .sb{display:flex;gap:8px;margin-top:12px}
  #sigPad .sb button{flex:1;padding:14px;border-radius:12px;border:1px solid var(--line2);background:var(--s3);color:var(--t1);font-size:15px;font-weight:600}
  #sigPad .sb button.primary{background:linear-gradient(180deg,#29e694,#1ec97e);color:#08130d;border-color:transparent}

  /* overlay succes */
  #okView{position:fixed;inset:0;background:var(--bg);display:none;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:210;padding:24px}
  #okView.show{display:flex}
  #okView .oc{width:104px;height:104px;border-radius:50%;background:var(--acc);display:grid;place-items:center;box-shadow:0 12px 40px rgba(34,224,138,.35);margin-bottom:22px;animation:pop .45s cubic-bezier(.34,1.56,.64,1)}
  @keyframes pop{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}
  #okView .ot{font-size:20px;font-weight:700;margin-bottom:6px}
  #okView .os{font-size:13.5px;color:var(--t2);max-width:250px;line-height:1.5}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<header>
  <span class="mark"><img src="/brand/logo" alt="DropLy" style="height:22px;width:auto;max-width:22px" /></span>
  <span class="wm">Drop<b>Ly</b></span>
  <span class="online"><span class="pdot" id="onlineDot"></span><span id="onlineTxt">Online</span></span>
  <button class="hbtn" onclick="load()" title="Reîmprospătează"><span data-ic="refresh"></span></button>
</header>

<div class="wrap" id="wrap"><div class="sk"></div><div class="sk"></div></div>
<div class="toast" id="toast"></div>

<div class="tabs">
  <button id="tab-curse" class="on" onclick="setTab('curse')"><span class="ib" data-ic="clipboard"></span>Curse<span class="cnt" id="cnt-curse" style="display:none">0</span></button>
  <button id="tab-done" onclick="setTab('done')"><span class="ib" data-ic="history"></span>Istoric</button>
  <button id="tab-chat" onclick="setTab('chat')"><span class="ib" data-ic="message"></span>Chat<span class="cnt" id="cnt-chat" style="display:none">●</span></button>
  <button id="tab-profil" onclick="setTab('profil')"><span class="ib" data-ic="user"></span>Profil</button>
</div>

<div id="sigPad">
  <h3 id="sigTitle">Semnătură de primire</h3>
  <canvas id="sigCanvas"></canvas>
  <div class="sb">
    <button onclick="closeSign()">Renunță</button>
    <button onclick="clearSign()">Șterge</button>
    <button class="primary" onclick="confirmSign()">Confirmă & finalizează</button>
  </div>
</div>

<div id="okView">
  <div class="oc"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#08130d" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
  <div class="ot">Livrare confirmată</div>
  <div class="os" id="okSub">Cursa a fost marcată ca livrată.</div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const API = location.origin;
const params = new URLSearchParams(location.search);
let key = params.get("key") || localStorage.getItem("gps_driver_key") || "";
if (params.get("key")) localStorage.setItem("gps_driver_key", key);

const ST = { nou:"Nou", acceptat:"Acceptat", in_curs:"În curs", finalizat:"Livrat", anulat:"Anulat" };
const ACTIVE = ["nou","acceptat","in_curs"];
let allCourses = [], tab = "curse", destMap = {}, deviceName = "", messages = [], loaded = false;

// --- iconițe SVG stil linie ---
const ICP={
  refresh:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  clipboard:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  history:'<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><polyline points="12 7 12 12 15 14"/>',
  message:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  clock:'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  phone:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.1 9.6a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/>',
  nav:'<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  map:'<polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6"/><line x1="8" y1="3" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="21"/>',
  paperclip:'<path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  back:'<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  pin:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  inbox:'<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'
};
function ic(name,size){var s=size||18;return '<svg class="ic" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(ICP[name]||"")+'</svg>';}
function fillIcons(root){(root||document).querySelectorAll("[data-ic]").forEach(function(el){el.innerHTML=ic(el.getAttribute("data-ic"),el.getAttribute("data-sz")||22);});}
document.addEventListener("DOMContentLoaded",function(){fillIcons();});

function initials(name){ const p=String(name||"?").trim().split(/\\s+/); return ((p[0]&&p[0][0]||"")+(p[1]&&p[1][0]||"")).toUpperCase()||"?"; }
function toast(m){ const t=document.getElementById("toast"); t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2200); }
function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function hdr(){ return { "Authorization":"Bearer "+key }; }
function fmtWhen(ts){ try{ return new Date(ts).toLocaleString("ro-RO"); }catch(e){ return ""; } }
function row(l,v){ return '<div class="row"><span class="lbl">'+l+'</span><span class="val">'+v+'</span></div>'; }

function setTab(t){
  if(tab==="map") teardownMap();
  tab=t;
  ["curse","done","chat","profil"].forEach(function(x){ const el=document.getElementById("tab-"+x); if(el) el.classList.toggle("on",t===x); });
  render();
}
function openMap(){
  if(tab==="map") return;
  tab="map";
  ["curse","done","chat","profil"].forEach(function(x){ document.getElementById("tab-"+x).classList.remove("on"); });
  document.getElementById("tab-curse").classList.add("on");
  renderMap();
}

async function load(){
  if(!key){ document.getElementById("wrap").innerHTML='<div class="empty"><div class="et">Lipsește codul dispozitivului</div><div class="es">Deschide aplicația din linkul primit de la dispecer.</div></div>'; return; }
  try{
    const r = await fetch(API+"/api/my/courses",{headers:hdr()});
    if(r.status===401){ document.getElementById("wrap").innerHTML='<div class="empty"><div class="et">Cod invalid</div><div class="es">Reconectează-te din aplicație.</div></div>'; return; }
    const d = await r.json();
    deviceName = d.device||"";
    allCourses = d.courses||[];
    loaded = true;
    if(tab==="map"){ refreshMapCourse(); } else { render(); }
    loadMessages();
  }catch(e){ toast("Eroare de rețea."); }
}

// ---- mesaje ----
async function loadMessages(){
  try{
    const r=await fetch(API+"/api/my/messages",{headers:hdr()});
    const d=await r.json();
    messages=d.messages||[];
    const last=messages[messages.length-1];
    const unread = last && last.sender!=="driver";
    const dot=document.getElementById("cnt-chat");
    if(dot) dot.style.display = unread ? "flex" : "none";
    if(tab==="chat") renderChat();
  }catch(e){}
}
async function sendDriverMsg(){
  const inp=document.getElementById("msgInput"); if(!inp) return;
  const t=inp.value.trim(); if(!t) return;
  inp.value="";
  try{
    await fetch(API+"/api/my/messages",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({text:t})});
    await loadMessages(); renderChat();
  }catch(e){ toast("Eroare la trimitere."); inp.value=t; }
}

// ---- render dispatch ----
function render(){
  const w=document.getElementById("wrap"); w.classList.remove("mapmode");
  const active=allCourses.filter(c=>ACTIVE.indexOf(c.status)>=0).length;
  const cc=document.getElementById("cnt-curse");
  if(cc){ cc.textContent=active; cc.style.display = active ? "flex" : "none"; }
  if(tab==="curse"){ renderCurse(); return; }
  if(tab==="done"){ renderDone(); return; }
  if(tab==="chat"){ renderChat(); return; }
  if(tab==="profil"){ renderProfile(); return; }
}

function stepperHtml(status){
  const labels=["Acceptat","Ridicat","Livrat"];
  const idx = status==="finalizat"?3 : status==="in_curs"?2 : status==="acceptat"?1 : 0;
  let h='<div class="stepper">';
  for(let i=0;i<3;i++){
    const done=idx>=i+1, active=idx===i+1 && status!=="finalizat";
    h+='<div class="step'+(done?" done":"")+(active?" active":"")+'"><span class="sdot"></span><span class="slbl">'+labels[i]+'</span></div>';
    if(i<2) h+='<div class="sline'+(idx>=i+2?" done":"")+'"></div>';
  }
  return h+'</div>';
}

function ctaFor(c){
  if(c.status==="nou") return '<button class="cta" onclick="setStatus('+c.id+',\\'acceptat\\')">'+ic("clipboard",18)+' Acceptă cursa</button>';
  if(c.status==="acceptat") return '<button class="cta" onclick="setStatus('+c.id+',\\'in_curs\\')">'+ic("clipboard",18)+' Am ridicat coletul</button>';
  if(c.status==="in_curs") return '<button class="cta" onclick="openSign('+c.id+')">'+ic("clock",18)+' Confirmă livrarea</button>';
  return '';
}

// adresa relevantă ACUM: preluare până ridică coletul (in_curs), apoi livrare
function navDestOf(c){
  const toPickup = c.status!=="in_curs";
  const addr = toPickup ? (c.pickup||c.dropoff||"") : (c.dropoff||c.pickup||"");
  return { addr:addr, toPickup:toPickup };
}
function courseCard(c){
  const st=c.status;
  const leg=navDestOf(c), dest=leg.addr;
  if(dest && st!=="finalizat" && st!=="anulat") destMap[c.id]=dest;
  const live = st==="in_curs";
  let h='<div class="course st-'+st+(live?' live':'')+'">';
  h+='<div class="ctop"><span class="cnum">Cursa #'+c.number+'</span>';
  if(dest && st!=="finalizat" && st!=="anulat") h+='<span class="cetachip" id="eta-'+c.id+'">'+ic("clock",13)+' —</span>';
  else h+='<span class="badge b-'+st+'">'+(ST[st]||st)+'</span>';
  h+='</div>';
  if(st!=="anulat") h+=stepperHtml(st);
  // timeline adrese
  if(c.pickup || c.dropoff){
    const cur = st==="in_curs" ? "drop" : "pick";
    h+='<div class="tl">';
    if(c.pickup) h+='<div class="ti'+(st==="in_curs"?" done":"")+'"><span class="tm pick"></span><div><div class="tk">Preluare</div><div class="tv'+(cur==="pick"?"":" sec")+'">'+esc(c.pickup)+'</div></div></div>';
    if(c.dropoff) h+='<div class="ti"><span class="tm drop"></span><div><div class="tk">Livrare'+(cur==="drop"?" — acum":"")+'</div><div class="tv'+(cur==="drop"||!c.pickup?"":" sec")+'">'+esc(c.dropoff)+'</div></div></div>';
    h+='</div>';
  }
  if(c.details) h+=row("Detalii", esc(c.details));
  if(c.due_at){ const past = st!=="finalizat" && st!=="anulat" && c.due_at<Date.now(); h+='<div class="row"><span class="lbl">Termen</span><span class="val" style="'+(past?"color:var(--danger);font-weight:600":"color:var(--t2)")+'">'+ic("clock",13)+' '+fmtWhen(c.due_at)+(past?' — ÎNTÂRZIAT':'')+'</span></div>'; }
  // meta: contact + telefon
  if(c.contact_name || c.contact_phone){
    h+='<div class="cmeta">'+(c.contact_name?esc(c.contact_name):'Client');
    if(c.contact_phone) h+='<a class="call" href="tel:'+esc(c.contact_phone)+'">'+ic("phone",14)+' Sună</a>';
    h+='</div>';
  }
  // CTA principal
  h+=ctaFor(c);
  // acțiuni secundare
  h+='<div class="actrow">';
  if(dest && st!=="finalizat" && st!=="anulat"){
    h+='<a class="act nav" href="https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(dest)+'">'+ic("nav",15)+' Navighează la '+(leg.toPickup?'preluare':'client')+'</a>';
    h+='<button class="act" onclick="openMap()">'+ic("map",15)+' Hartă live</button>';
  }
  if(st!=="finalizat" && st!=="anulat") h+='<button class="act ghost" onclick="setStatus('+c.id+',\\'anulat\\')">Anulează</button>';
  h+='</div>';
  // documente
  h+='<div class="upl"><label>'+ic("paperclip",14)+' Atașează document<input type="file" accept="image/*,application/pdf" onchange="upload('+c.id+',this)"></label>'
    +'<div class="docs">'+(c.docs>0?(c.docs+" document"+(c.docs>1?"e":"")+" trimis"+(c.docs>1?"e":"")):"Niciun document încă")+'</div></div>';
  h+='</div>';
  return h;
}

function renderCurse(){
  const w=document.getElementById("wrap");
  const active=allCourses.filter(c=>ACTIVE.indexOf(c.status)>=0)
    .sort((a,b)=>({in_curs:0,acceptat:1,nou:2})[a.status]-({in_curs:0,acceptat:1,nou:2})[b.status]);
  let h='<div class="h1">Cursele mele</div>'
    +'<div class="sub">'+esc(deviceName||"Curier")+' · '+(active.length?active.length+' curse active':'nicio cursă activă')+'</div>';
  if(!active.length){
    h+='<div class="empty"><div class="ei">'+ic("inbox",70)+'</div><div class="et"><span class="pdot"></span>Aștept o cursă nouă</div><div class="es">Vei fi notificat aici când dispecerul îți trimite o cursă.</div></div>';
  } else {
    destMap={};
    for(const c of active) h+=courseCard(c);
  }
  w.innerHTML=h;
  for(const c of active){ if((c.status==="in_curs"||c.status==="acceptat") && destMap[c.id]) calcEta(c.id); }
}

function renderDone(){
  const w=document.getElementById("wrap");
  const list=allCourses.filter(c=>c.status==="finalizat");
  let h='<div class="h1">Istoric</div><div class="sub">'+list.length+' curse finalizate</div>';
  if(!list.length){ h+='<div class="empty"><div class="ei">'+ic("history",70)+'</div><div class="et">Nimic în istoric încă</div><div class="es">Cursele livrate vor apărea aici.</div></div>'; }
  else { destMap={}; for(const c of list) h+=courseCard(c); }
  w.innerHTML=h;
}

function renderChat(){
  const w=document.getElementById("wrap"); w.classList.remove("mapmode");
  let list = messages.length
    ? messages.slice().reverse().map(function(m){
        const mine=m.sender==="driver";
        return '<div class="bub '+(mine?"me":"them")+'">'+esc(m.text)+'<span class="ts">'+(mine?"Tu":"Dispecer")+' • '+fmtWhen(m.created_at)+'</span></div>';
      }).join("")
    : '<div class="empty" style="margin:auto"><div class="et">Niciun mesaj încă</div><div class="es">Scrie-i dispecerului mai jos.</div></div>';
  w.innerHTML='<div class="chat"><div class="h1" style="padding-left:0">Chat cu dispecerul</div>'
    +'<div class="chatlist" id="msgViewList">'+list+'</div>'
    +'<div class="chatin"><input id="msgInput" placeholder="Scrie un mesaj…" onkeydown="if(event.key===\\'Enter\\')sendDriverMsg()"><button onclick="sendDriverMsg()">'+ic("send",18)+'</button></div></div>';
  const el=document.getElementById("msgViewList"); if(el) el.scrollTop=el.scrollHeight;
}

function renderProfile(){
  const w=document.getElementById("wrap"); w.classList.remove("mapmode");
  const active=allCourses.filter(c=>ACTIVE.indexOf(c.status)>=0).length;
  const total=allCourses.length;
  const done=allCourses.filter(c=>c.status==="finalizat").length;
  w.innerHTML='<div class="profcard">'
    +'<div class="pav">'+esc(initials(deviceName))+'</div>'
    +'<div class="pname">'+esc(deviceName||"Curier")+'</div>'
    +'<div class="pmeta">Curier DropLy</div>'
    +'<div class="pstats">'
      +'<div class="ptile"><b>'+active+'</b><span>Active</span></div>'
      +'<div class="ptile"><b>'+total+'</b><span>Total</span></div>'
      +'<div class="ptile"><b>'+done+'</b><span>Livrate</span></div>'
    +'</div>'
    +'<button class="pmenu" onclick="setTab(\\'chat\\')">'+ic("message",18)+' Chat cu dispecerul</button>'
    +'<button class="pmenu" onclick="setTab(\\'curse\\')">'+ic("clipboard",18)+' Cursele mele active</button>'
    +'<button class="pmenu danger" onclick="doLogout()">'+ic("logout",18)+' Deconectează-te</button>'
    +'</div>';
}
function doLogout(){ if(!confirm("Te deconectezi din aplicație?")) return; localStorage.removeItem("gps_driver_key"); key=""; location.reload(); }

// ---- distanță / ETA ----
function currentPos(){
  return new Promise(function(res){
    if(!navigator.geolocation){ res(null); return; }
    navigator.geolocation.getCurrentPosition(
      function(p){ res([p.coords.latitude, p.coords.longitude]); },
      function(){ res(null); },
      { enableHighAccuracy:true, timeout:8000, maximumAge:15000 }
    );
  });
}
async function geocode(addr){
  try{
    const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q="+encodeURIComponent(addr),{headers:{Accept:"application/json"}});
    const a=await r.json();
    if(a && a.length) return [parseFloat(a[0].lat), parseFloat(a[0].lon)];
  }catch(e){}
  return null;
}
async function calcEta(id){
  const addr=destMap[id];
  const el=document.getElementById("eta-"+id); if(!el||!addr) return;
  el.innerHTML=ic("clock",13)+' …';
  const pos=await currentPos();
  if(!pos){ el.innerHTML=ic("clock",13)+' GPS?'; return; }
  const dest=await geocode(addr);
  if(!dest){ el.innerHTML=ic("clock",13)+' —'; return; }
  try{
    const u="https://router.project-osrm.org/route/v1/driving/"+pos[1]+","+pos[0]+";"+dest[1]+","+dest[0]+"?overview=false";
    const r=await fetch(u); const d=await r.json();
    if(d.code==="Ok" && d.routes && d.routes.length){
      const km=(d.routes[0].distance/1000).toFixed(1), min=Math.round(d.routes[0].duration/60);
      el.innerHTML=ic("clock",13)+' '+km+' km · '+min+' min';
      return;
    }
    throw new Error("no route");
  }catch(e){
    const km=haversine(pos[0],pos[1],dest[0],dest[1]).toFixed(1);
    el.innerHTML=ic("clock",13)+' ~'+km+' km';
  }
}
function haversine(la1,lo1,la2,lo2){
  const R=6371,dLa=(la2-la1)*Math.PI/180,dLo=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(dLa/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

// ---- semnătură de primire ----
let sigCourse=null, sigCtx=null, sigDrawing=false, sigDirty=false, sigBusy=false;
function sigBtn(){ return document.querySelector("#sigPad .sb .primary"); }
function setSigDisabled(dis){
  document.querySelectorAll("#sigPad .sb button").forEach(function(b){ b.disabled=dis; });
  const cb=sigBtn(); if(cb) cb.textContent = dis ? "Se trimite…" : "Confirmă & finalizează";
}
function openSign(id){
  if(sigBusy) return;
  sigCourse=id; sigDirty=false; sigBusy=false; setSigDisabled(false);
  document.getElementById("sigPad").classList.add("show");
  setTimeout(setupCanvas,80);
}
function canvasPos(c,e){ const b=c.getBoundingClientRect(); const t=(e.touches&&e.touches[0])||e; return [t.clientX-b.left, t.clientY-b.top]; }
function setupCanvas(){
  const c=document.getElementById("sigCanvas");
  const r=c.getBoundingClientRect();
  c.width=Math.max(1,Math.round(r.width)); c.height=Math.max(1,Math.round(r.height));
  sigCtx=c.getContext("2d"); sigCtx.lineWidth=3; sigCtx.lineCap="round"; sigCtx.lineJoin="round"; sigCtx.strokeStyle="#111"; sigDirty=false;
  const start=function(e){ e.preventDefault(); sigDrawing=true; sigDirty=true; const p=canvasPos(c,e); sigCtx.beginPath(); sigCtx.moveTo(p[0],p[1]); };
  const move=function(e){ if(!sigDrawing)return; e.preventDefault(); const p=canvasPos(c,e); sigCtx.lineTo(p[0],p[1]); sigCtx.stroke(); };
  const end=function(){ sigDrawing=false; };
  if("onpointerdown" in window){ c.onpointerdown=start; c.onpointermove=move; c.onpointerup=end; c.onpointercancel=end; }
  else { c.ontouchstart=start; c.ontouchmove=move; c.ontouchend=end; c.onmousedown=start; c.onmousemove=move; c.onmouseup=end; }
}
function clearSign(){ if(sigBusy) return; const c=document.getElementById("sigCanvas"); if(sigCtx) sigCtx.clearRect(0,0,c.width,c.height); sigDirty=false; }
function closeSign(){ if(sigBusy) return; document.getElementById("sigPad").classList.remove("show"); sigCourse=null; }
function showOk(sub){
  const ov=document.getElementById("okView");
  document.getElementById("okSub").textContent=sub||"Cursa a fost marcată ca livrată.";
  ov.classList.add("show");
  try{ if(navigator.vibrate) navigator.vibrate(30); }catch(e){}
  setTimeout(function(){ ov.classList.remove("show"); }, 1800);
}
function confirmSign(){
  if(sigBusy) return;
  if(!sigDirty){ toast("Semnează întâi în chenar."); return; }
  sigBusy=true; setSigDisabled(true);
  const c=document.getElementById("sigCanvas"), id=sigCourse;
  c.toBlob(function(blob){
    fetch(API+"/api/my/courses/"+id+"/docs?filename=semnatura-cursa.png",{method:"POST",headers:Object.assign({"Content-Type":"image/png"},hdr()),body:blob})
      .then(function(r){ if(!r.ok) throw new Error("upload"); return fetch(API+"/api/my/courses/"+id+"/status",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({status:"finalizat"})}); })
      .then(function(r){ if(!r.ok) throw new Error("status"); sigBusy=false; document.getElementById("sigPad").classList.remove("show"); sigCourse=null; setSigDisabled(false); showOk("Cursa #"+id+" a fost livrată. Semnătura a fost trimisă dispecerului."); load(); })
      .catch(function(){ sigBusy=false; setSigDisabled(false); toast("Eroare la finalizare. Încearcă din nou."); });
  },"image/png");
}

async function setStatus(id,status){
  try{
    const r = await fetch(API+"/api/my/courses/"+id+"/status",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({status})});
    if(r.ok){ toast("Status actualizat."); load(); } else { toast("Nu am putut actualiza."); }
  }catch(e){ toast("Eroare de rețea."); }
}

async function upload(id,input){
  const f = input.files && input.files[0];
  if(!f) return;
  toast("Se trimite documentul…");
  try{
    const r = await fetch(API+"/api/my/courses/"+id+"/docs?filename="+encodeURIComponent(f.name),{
      method:"POST",
      headers:Object.assign({"Content-Type":f.type||"application/octet-stream"},hdr()),
      body:f
    });
    if(r.ok){ toast("Document trimis ✔"); load(); } else { const e=await r.json().catch(()=>({})); toast(e.error||"Trimitere eșuată."); }
  }catch(e){ toast("Eroare la trimitere."); }
  input.value="";
}

// ---- hartă live (Waze-style) ----
let dmap=null, meMarker=null, destMarker=null, routeLine=null, geoWatch=null;
let mapCourse=null, mapDestLatLng=null, myLatLng=null, lastRouteAt=0, following=true;

function stopGeo(){ if(geoWatch!=null && navigator.geolocation){ navigator.geolocation.clearWatch(geoWatch); geoWatch=null; } }
function teardownMap(){ stopGeo(); if(dmap){ dmap.remove(); dmap=null; } meMarker=null; destMarker=null; routeLine=null; mapDestLatLng=null; }

function renderMap(){
  const w=document.getElementById("wrap");
  w.classList.add("mapmode");
  w.innerHTML='<div id="dmap"></div>'
    +'<button id="mapBack" onclick="setTab(\\'curse\\')">'+ic("back",16)+' Curse</button>'
    +'<div id="speed"><b id="spdVal">0</b><span>km/h</span></div>'
    +'<div id="navcard"><div id="navinner"><div class="nrow">Se încarcă…</div></div></div>';
  dmap=L.map("dmap",{zoomControl:false,attributionControl:false}).setView([45.9432,24.9668],13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(dmap);
  dmap.on("dragstart", function(){ following=false; });
  setTimeout(function(){ if(dmap) dmap.invalidateSize(); }, 200);
  refreshMapCourse();
  startGeo();
}

function pickMapCourse(){
  const act=allCourses.filter(c=>ACTIVE.indexOf(c.status)>=0 && (c.dropoff||c.pickup));
  return act.find(c=>c.status==="in_curs") || act.find(c=>c.status==="acceptat") || act.find(c=>c.status==="nou") || act[0] || null;
}

async function refreshMapCourse(){
  if(!dmap) return;
  mapCourse=pickMapCourse();
  const inner=document.getElementById("navinner");
  if(!mapCourse){
    if(inner) inner.innerHTML='<div class="nrow">Nicio cursă activă cu adresă.</div>';
    if(destMarker){ dmap.removeLayer(destMarker); destMarker=null; }
    if(routeLine){ dmap.removeLayer(routeLine); routeLine=null; }
    mapDestLatLng=null; return;
  }
  renderNavCard(mapCourse);
  const dest=navDestOf(mapCourse).addr;
  if(dest){
    const ll=await geocode(dest);
    if(ll){
      mapDestLatLng=ll;
      if(destMarker) destMarker.setLatLng(ll); else destMarker=L.marker(ll).addTo(dmap);
      destMarker.bindPopup(esc(dest));
      lastRouteAt=0;
      updateEtaAndRoute();
    }
  }
}

function renderNavCard(c){
  const inner=document.getElementById("navinner"); if(!inner) return;
  const leg=navDestOf(c), dest=leg.addr;
  let h='<div class="nn">Cursa #'+c.number+' — '+(leg.toPickup?'spre preluare':'spre client')+'</div>';
  h+='<div class="neta" id="navEta">'+ic("clock",15)+' Calculez distanța…</div>';
  if(dest) h+='<div class="nrow">'+ic("pin",14)+esc(dest)+'</div>';
  if(c.contact_name) h+='<div class="nrow">'+ic("user",14)+esc(c.contact_name)+'</div>';
  h+='<div class="nbtns">';
  if(dest){
    h+='<a class="navwaze" href="https://waze.com/ul?q='+encodeURIComponent(dest)+'&navigate=yes">Waze</a>';
    h+='<a class="navmaps" href="https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(dest)+'">'+ic("map",15)+' Maps</a>';
  }
  if(c.contact_phone) h+='<a class="navcall" href="tel:'+esc(c.contact_phone)+'">'+ic("phone",16)+'</a>';
  h+='</div>';
  inner.innerHTML=h;
}

async function updateEtaAndRoute(){
  if(!dmap || !mapCourse || !mapDestLatLng || !myLatLng) return;
  const etaEl=document.getElementById("navEta");
  try{
    const u="https://router.project-osrm.org/route/v1/driving/"+myLatLng[1]+","+myLatLng[0]+";"+mapDestLatLng[1]+","+mapDestLatLng[0]+"?overview=full&geometries=geojson";
    const r=await fetch(u); const d=await r.json();
    if(d.code==="Ok" && d.routes && d.routes.length){
      const rt=d.routes[0], coords=rt.geometry.coordinates.map(x=>[x[1],x[0]]);
      if(routeLine) dmap.removeLayer(routeLine);
      routeLine=L.polyline(coords,{color:"#22e08a",weight:5,opacity:.9}).addTo(dmap);
      if(etaEl) etaEl.innerHTML=ic("clock",15)+" Mai ai <b>"+(rt.distance/1000).toFixed(1)+" km</b> • ~<b>"+Math.round(rt.duration/60)+" min</b>";
      return;
    }
  }catch(e){}
  if(etaEl) etaEl.innerHTML=ic("clock",15)+" ~<b>"+haversine(myLatLng[0],myLatLng[1],mapDestLatLng[0],mapDestLatLng[1]).toFixed(1)+" km</b> (linie dreaptă)";
}

function startGeo(){
  stopGeo();
  if(!navigator.geolocation) return;
  geoWatch=navigator.geolocation.watchPosition(onPos, function(){}, {enableHighAccuracy:true, maximumAge:5000, timeout:15000});
}
function onPos(p){
  myLatLng=[p.coords.latitude, p.coords.longitude];
  const spd = (p.coords.speed!=null && p.coords.speed>=0) ? Math.round(p.coords.speed*3.6) : 0;
  const sv=document.getElementById("spdVal"); if(sv) sv.textContent=spd;
  if(dmap){
    if(meMarker) meMarker.setLatLng(myLatLng);
    else meMarker=L.circleMarker(myLatLng,{radius:9,color:"#fff",weight:3,fillColor:"#22e08a",fillOpacity:1}).addTo(dmap);
    if(following) dmap.setView(myLatLng, Math.max(dmap.getZoom(),16));
  }
  const now=Date.now();
  if(mapDestLatLng && now-lastRouteAt>15000){ lastRouteAt=now; updateEtaAndRoute(); }
}

load();
setInterval(load, 25000);
</script>
</body>
</html>`;
