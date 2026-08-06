// Dashboard-ul web servit de Worker la GET /
// Hartă Leaflet + OpenStreetMap (fără chei API). Vorbește cu /api pe același origin.

export const DASHBOARD_HTML = /* html */ `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Street X Underground</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800&family=Rajdhani:wght@500;600;700&display=swap" />
<style>
  :root{
    --bg:#0a0f0d;--panel:#101815;--s1:#101815;--s2:#161f1b;--s3:#1c2622;
    --line:#22302a;--line2:#2e3f37;
    --txt:#eef2ef;--mut:#a9beb2;--t3:#6f8579;
    --gold:#22e08a;--acc-dim:#1a9d63;--ok:#3fb950;--off:#6e7681;--blue:#4d9fff;
    --warn:#e3a83b;--dang:#f0555a;
  }
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--txt);color-scheme:dark}
  #app{display:grid;grid-template-columns:288px 1fr;grid-template-rows:56px 1fr;height:100%;position:relative}
  #side{grid-row:2;min-width:0;background:var(--s1);border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0}
  #map{grid-row:2;min-width:0}

  /* ---------- TOPBAR ---------- */
  #topbar{grid-column:1/3;display:flex;align-items:center;gap:16px;padding:0 14px;
    background:linear-gradient(180deg,rgba(255,255,255,.02),transparent),var(--s1);
    border-bottom:1px solid var(--line);position:relative;z-index:5}
  .brand{display:flex;align-items:center;gap:9px;flex:none}
  .brand .logo{height:34px;width:auto;max-width:150px;display:block}
  #menuBtn{display:none;background:var(--s3);border:1px solid var(--line2);color:var(--txt);border-radius:9px;padding:8px 10px;cursor:pointer;line-height:1}
  .kpis{display:flex;align-items:center;gap:6px;flex-wrap:wrap;overflow:hidden}
  .kpi{display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:9px;background:var(--s2);border:1px solid var(--line)}
  .kpi .kic{color:var(--t3);display:inline-flex}
  .kpi .lab{color:var(--t3);font-size:11px;text-transform:uppercase;letter-spacing:.05em}
  .kpi .val{font-weight:600;font-size:13px;font-variant-numeric:tabular-nums}
  .kpi.good .val{color:var(--gold)}
  .kpi.warn{border-color:rgba(227,168,59,.4);background:rgba(227,168,59,.08)}
  .kpi.warn .val,.kpi.warn .kic{color:var(--warn)}
  .tb-sp{flex:1}
  .tb-actions{display:flex;align-items:center;gap:8px;flex:none}

  .sidetools{display:none}
  #app.side-hidden #side{display:none}
  @media (max-width:860px){
    #app{grid-template-columns:1fr}
    #menuBtn{display:inline-flex;align-items:center}
    #side{position:absolute;top:56px;left:0;z-index:1100;width:88%;max-width:330px;height:calc(100% - 56px);box-shadow:2px 0 16px rgba(0,0,0,.6)}
    #topbar .tb-actions .opt,#topbar .tb-actions a.opt{display:none}
    .sidetools{display:flex;gap:8px;flex-wrap:wrap;padding:11px 12px;border-bottom:1px solid var(--line);background:var(--s2)}
    .sidetools a{display:inline-flex;text-decoration:none}
    .kpis{display:none}
    .brand .logo{height:30px}
  }

  /* logo: glow static + un singur „boot" flicker la încărcare (fără pâlpâit continuu) */
  img[src$="brand/logo"]{filter:drop-shadow(0 0 6px rgba(34,224,138,.4));animation:logoBoot .9s steps(3,end) 1}
  @keyframes logoBoot{0%{opacity:.3}20%{opacity:1}30%{opacity:.5}45%{opacity:1}60%{opacity:.7}100%{opacity:1}}

  button{cursor:pointer;border:1px solid var(--line2);background:var(--s3);color:var(--txt);border-radius:8px;padding:9px 14px;font-size:13px;font-weight:600;line-height:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:border-color .13s ease,background .13s ease,box-shadow .13s ease}
  button:hover{border-color:var(--acc-dim);background:#20302a}
  button:active{transform:translateY(1px)}
  button.primary{background:linear-gradient(180deg,#29e694,#1fc47e);color:#06120c;border-color:transparent;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 8px rgba(34,224,138,.26)}
  button.primary:hover{background:linear-gradient(180deg,#33eca0,#22cf85);box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 4px 14px rgba(34,224,138,.36)}
  .tb-actions button:not(.primary){min-width:38px;padding:9px}
  .toolbar{padding:10px 12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .ic{flex:none;vertical-align:-3px}
  [data-ic]{display:inline-flex}
  #list{flex:1;overflow:auto;min-height:0;padding:6px 0 12px}
  .grp{padding:12px 14px 5px;color:var(--t3);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em}
  .dev{position:relative;padding:9px 11px 9px 16px;margin:2px 8px;border:1px solid transparent;border-radius:10px;cursor:pointer;display:flex;flex-direction:column;gap:8px;transition:background .13s,border-color .13s}
  .dev::before{content:"";position:absolute;left:5px;top:11px;bottom:11px;width:3px;border-radius:3px;background:var(--off);transition:background .2s}
  .dev.online::before{background:var(--gold);box-shadow:0 0 6px rgba(34,224,138,.5)}
  .dev.busy::before{background:var(--warn);box-shadow:0 0 6px rgba(227,168,59,.45)}
  .dev.late::before{background:var(--dang);box-shadow:0 0 7px rgba(240,85,90,.55)}
  .dev .nm{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ctag{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;padding:2px 7px;border-radius:999px;background:rgba(77,159,255,.14);color:var(--blue);display:inline-flex;align-items:center;gap:3px;flex:none}
  .ctag.late{background:rgba(240,85,90,.16);color:var(--dang)}
  .dev:hover{background:rgba(255,255,255,.035);border-color:var(--line)}
  .dev.sel{background:var(--s2);border-color:var(--line2)}
  .devrow{display:flex;align-items:center;gap:10px}
  .avwrap{position:relative;flex:none;line-height:0}
  .sdot{position:absolute;right:-1px;bottom:-1px;width:10px;height:10px;border-radius:50%;border:2px solid var(--s1);z-index:1}
  .sdot.on{background:var(--gold)}
  .sdot.off{background:#46564d}
  .dev.online .sdot.on::after{content:"";position:absolute;inset:-2px;border-radius:50%;border:2px solid var(--gold);animation:pulse 2s ease-out infinite}
  @keyframes pulse{0%{transform:scale(.75);opacity:.7}100%{transform:scale(2.1);opacity:0}}
  .devav{width:32px;height:32px;min-width:32px;border-radius:50%;border:2px solid var(--gold);background:var(--s2);color:#fff;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;letter-spacing:.5px;object-fit:cover}
  .devav.off{filter:grayscale(1);opacity:.55}
  img.mkav{object-fit:cover}
  .devmain{flex:1;min-width:0}
  .devacts{display:flex;gap:6px;flex-wrap:wrap;padding-left:0}
  .dev .n{font-weight:500;font-size:13px;display:flex;justify-content:space-between;align-items:center;gap:6px}
  .dev .m{font-size:11.5px;color:var(--t3);margin-top:1px;font-variant-numeric:tabular-nums}
  .badge{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;padding:2px 8px;border-radius:999px;background:rgba(143,168,154,.12);color:var(--t3);flex:none}
  .badge.on{background:rgba(34,224,138,.14);color:var(--gold)}
  .foot{padding:10px 12px;border-top:1px solid var(--line);display:flex;gap:8px;flex-wrap:wrap}
  select,input{background:var(--s1);border:1px solid var(--line);color:var(--txt);border-radius:8px;padding:8px 10px;font-size:13px;width:100%}
  input:focus,select:focus,.modal textarea:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px rgba(77,159,255,.15)}
  /* login */
  #login{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg);z-index:1000}
  #login .card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:26px;width:320px}
  #login h2{margin:0 0 4px}
  #login p{margin:0 0 18px;color:var(--mut);font-size:13px}
  #login label{display:block;font-size:12px;color:var(--mut);margin:12px 0 4px}
  #login .err{color:#f85149;font-size:13px;margin-top:12px;min-height:16px}
  .dl{display:block;text-align:center;margin-top:16px;padding:10px;border:1px dashed var(--line2);border-radius:8px;color:var(--gold);text-decoration:none;font-size:13px}
  .dl:hover{border-color:var(--gold);background:rgba(34,224,138,.06)}
  .tb-actions a{display:inline-flex;text-decoration:none}
  .hidden{display:none!important}
  .modal{position:fixed;inset:0;background:rgba(6,10,8,.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:12px}
  .modal .card{background:var(--s3);border:1px solid var(--line2);border-radius:14px;padding:22px;width:380px;max-width:92vw;max-height:92vh;overflow:auto;box-shadow:0 24px 48px rgba(0,0,0,.5)}
  .modal h3{margin:0 0 14px;display:flex;align-items:center;gap:8px}
  .modal .row{margin-bottom:12px}
  .key{background:var(--s1);border:1px solid var(--line);border-radius:8px;padding:10px;font-family:ui-monospace,monospace;font-size:12px;word-break:break-all;color:var(--gold)}
  .qrbox{display:flex;justify-content:center;background:#fff;padding:14px;border-radius:10px}
  .qrbox img{display:block;width:200px;height:200px;image-rendering:pixelated}
  .qrbtn{font-size:11.5px;padding:5px 9px;background:#182a22;border:1px solid var(--line);border-radius:20px;color:var(--gold);cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-weight:600;line-height:1;transition:border-color .12s ease,background .12s ease,box-shadow .12s ease}
  .qrbtn:hover{border-color:var(--gold);background:#1e3a2c;box-shadow:0 3px 10px rgba(47,224,138,.22)}
  .qrbtn:active{transform:translateY(1px)}
  .modal textarea{width:100%;min-height:60px;resize:vertical;background:var(--s1);border:1px solid var(--line);color:var(--txt);border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;margin-bottom:8px}
  .modal input{margin-bottom:8px}
  .citem{border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:10px}
  .citem .ch{display:flex;align-items:center;gap:8px;margin-bottom:6px}
  .citem .cnum{font-weight:700;color:var(--gold)}
  .cbadge{margin-left:auto;font-size:11px;padding:2px 9px;border-radius:20px;background:#25323f;color:var(--mut)}
  .cbadge.nou{background:#3a2f10;color:var(--gold)}
  .cbadge.acceptat{background:#10263a;color:var(--blue)}
  .cbadge.in_curs{background:#12351f;color:var(--ok)}
  .cfield{font-size:13px;margin:2px 0}
  .cfield b{color:var(--mut);font-weight:400}
  .cdocs a{display:inline-block;margin:6px 8px 0 0;font-size:12px;color:var(--blue)}
  .cactions{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap}
  .actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px}
  a{color:var(--gold)}
  .leaflet-popup-content{font-size:13px}
  /* pini stil avatar + etichetă (ca în design) */
  .mkwrap{background:none!important;border:none!important}
  .mkpin{display:flex;flex-direction:column;align-items:center;width:150px;pointer-events:auto}
  .mkpin.off{filter:grayscale(1);opacity:.55}
  .mkav{width:50px;height:50px;min-width:50px;aspect-ratio:1/1;border-radius:50%;border:3px solid var(--gold);background:#0e1620;color:#fff;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(0,0,0,.6);letter-spacing:.5px;overflow:hidden}
  img.mkav{object-fit:cover;display:block;padding:0}
  .mkname{margin-top:5px;padding:3px 10px;border-radius:8px;color:#12202b;font-size:11px;font-weight:700;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis;box-shadow:0 2px 6px rgba(0,0,0,.5)}
  /* Culorile hărții vin acum din stilul vectorial (uscat oliv, apă albastră, drumuri albe). */
  /* rute/trasee cu efect neon (glow) ca pe harta din joc */
  .glowline{filter:drop-shadow(0 0 3px rgba(125,249,255,.9)) drop-shadow(0 0 7px rgba(34,224,138,.5))}
  /* dark leaflet controls */
  .leaflet-bar a{background:var(--s2);color:var(--txt);border-color:var(--line)}
  .leaflet-bar a:hover{background:var(--s3);color:var(--gold)}
  .leaflet-popup-content-wrapper,.leaflet-popup-tip{background:var(--s3);color:var(--txt);border:1px solid var(--line2)}
  .leaflet-container{background:#0a1418}
  /* vignette subtilă pe marginile hărții (apă albastru-adânc spre margini) */
  #map::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:250;
    box-shadow:inset 0 0 0 1px rgba(34,224,138,.10);
    background:radial-gradient(ellipse at center, transparent 55%, rgba(9,20,30,.6) 100%)}
  #map{position:relative}
  #mapCtrls{position:absolute;right:12px;top:12px;z-index:600;display:flex;flex-direction:column;gap:8px}
  #mapCtrls button{width:42px;height:42px;border-radius:10px;background:var(--s2);border:1px solid var(--line2);
    color:var(--gold);display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.5);padding:0}
  #mapCtrls button:hover{background:var(--s3)}
  #mapCtrls button.on{background:var(--gold);color:#12100a;border-color:transparent}
  /* scrollbar */
  ::-webkit-scrollbar{width:8px}
  ::-webkit-scrollbar-thumb{background:rgba(34,224,138,.22);border-radius:4px}
  ::-webkit-scrollbar-thumb:hover{background:rgba(34,224,138,.4)}
  ::-webkit-scrollbar-track{background:transparent}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}

  /* ---------- bară de segmente + căutare ---------- */
  .segbar{padding:10px 10px 9px;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:8px;background:var(--s1)}
  .segs{display:flex;gap:6px;flex-wrap:wrap}
  .seg{font-size:12px;font-weight:600;padding:5px 11px;border-radius:999px;cursor:pointer;background:rgba(255,255,255,.04);color:var(--mut);border:1px solid transparent;transition:background .12s,color .12s,border-color .12s;display:inline-flex;align-items:center;gap:5px}
  .seg:hover{background:rgba(255,255,255,.07)}
  .seg.on{background:rgba(34,224,138,.14);color:var(--gold);border-color:rgba(34,224,138,.3)}
  .seg .sc{font-size:10.5px;opacity:.85;font-variant-numeric:tabular-nums}
  .searchwrap{position:relative;display:flex;align-items:center}
  .searchwrap .si{position:absolute;left:10px;color:var(--t3);display:inline-flex;pointer-events:none}
  .searchwrap input{padding:8px 10px 8px 32px;font-size:12.5px}

  /* ---------- drawer chat ---------- */
  .drawer{position:fixed;top:56px;right:0;height:calc(100% - 56px);width:360px;max-width:100%;z-index:1500;
    background:var(--s1);border-left:1px solid var(--line2);box-shadow:-18px 0 44px rgba(0,0,0,.5);
    display:flex;flex-direction:column}
  .drawer.hidden{display:none}
  .dhead{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line)}
  .dhead button{padding:8px;min-width:36px}
  .dbody{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:8px}
  .dbody .empty{color:var(--t3);font-size:13px;margin:auto}
  .dfoot{padding:12px;border-top:1px solid var(--line);display:flex;gap:8px;align-items:flex-end}
  .dfoot textarea{flex:1;min-height:42px;max-height:130px;resize:none;background:var(--s2);border:1px solid var(--line);color:var(--txt);border-radius:10px;padding:11px 12px;font:inherit;font-size:13px;width:auto}
  .dfoot textarea:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 3px rgba(77,159,255,.15)}
  .dfoot button.primary{padding:0;min-width:44px;align-self:stretch}
  .bub{max-width:82%;padding:9px 12px;border-radius:12px;font-size:13px;line-height:1.45;word-break:break-word}
  .bub.them{background:var(--s3);border:1px solid var(--line);align-self:flex-start;border-bottom-left-radius:4px}
  .bub.me{background:linear-gradient(180deg,#1f5a41,#164531);color:#eafff4;align-self:flex-end;border-bottom-right-radius:4px}
  .bub .ts{display:block;font-size:10px;opacity:.65;margin-top:4px}
  @media (max-width:860px){ .drawer{top:56px;width:100%;height:calc(100% - 56px)} }

  /* ===================== TEMĂ „STREET X UNDERGROUND" ===================== */
  :root{ --neon-pink:#ff2d95; --neon-cyan:#28e0ff; --neon-purple:#9b6bff; }

  /* typografie racing */
  .modal h3,.kpi .val,.ttl{font-family:"Orbitron",system-ui,sans-serif;letter-spacing:.05em}
  .kpi .lab,.grp,.seg,.badge,.ctag,.dl,.brandtag{font-family:"Rajdhani",system-ui,sans-serif;letter-spacing:.04em;font-weight:600}
  .brand .logo{filter:drop-shadow(0 0 6px rgba(34,224,138,.45)) drop-shadow(0 0 15px rgba(40,224,255,.22))}
  .modal h3{text-transform:uppercase;font-size:15px;text-shadow:0 0 12px rgba(40,224,255,.35)}
  .grp{color:var(--neon-cyan);text-shadow:0 0 8px rgba(40,224,255,.28)}

  /* scanlines + halou de culoare (atmosferă underground, subtil) */
  body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:9998;
    background:repeating-linear-gradient(0deg, rgba(0,0,0,0) 0 2px, rgba(0,0,0,.075) 2px 3px);opacity:.5}
  body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:9997;
    background:radial-gradient(ellipse at 50% -8%, rgba(40,224,255,.05), transparent 55%),
      radial-gradient(ellipse at 100% 112%, rgba(255,45,149,.05), transparent 55%)}

  /* butoane + accente cu glow neon */
  button.primary{box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 0 1px rgba(34,224,138,.35),0 4px 16px rgba(34,224,138,.3)}
  button.primary:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 0 0 1px rgba(34,224,138,.5),0 6px 22px rgba(34,224,138,.45)}
  .tb-actions button:hover,.foot button:hover,.sidetools button:hover{border-color:var(--neon-cyan);box-shadow:0 0 12px rgba(40,224,255,.25)}
  .kpi .val{text-shadow:0 0 10px rgba(34,224,138,.28)}
  .seg.on{box-shadow:inset 0 0 12px rgba(34,224,138,.22),0 0 0 1px rgba(34,224,138,.4)}
  .dev.online::before{box-shadow:0 0 10px rgba(34,224,138,.75)}
  .dev.sel{box-shadow:0 0 0 1px rgba(40,224,255,.35),0 0 18px rgba(40,224,255,.12)}
  .qrbtn:hover{border-color:var(--neon-cyan);box-shadow:0 0 10px rgba(40,224,255,.22)}

  /* ---- LOGIN „garage / underground" ---- */
  #login{background:
    radial-gradient(1200px 520px at 50% -10%, rgba(40,224,255,.10), transparent 60%),
    radial-gradient(900px 520px at 50% 120%, rgba(255,45,149,.10), transparent 60%),
    linear-gradient(180deg,#070b09,#0a0f0d)}
  #login::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;
    background-image:linear-gradient(rgba(40,224,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(40,224,255,.05) 1px,transparent 1px);
    background-size:44px 44px;
    -webkit-mask-image:radial-gradient(ellipse at center,#000 30%,transparent 75%);
    mask-image:radial-gradient(ellipse at center,#000 30%,transparent 75%)}
  #login .card{position:relative;z-index:1;border:1px solid rgba(40,224,255,.25);
    box-shadow:0 0 0 1px rgba(34,224,138,.12),0 24px 60px rgba(0,0,0,.6),0 0 40px rgba(40,224,255,.08);
    background:linear-gradient(180deg,rgba(22,31,27,.96),rgba(13,19,16,.98))}
  #login .card .ttl{font-size:16px;text-transform:uppercase;letter-spacing:.22em;text-align:center;
    color:var(--neon-cyan);margin:0 0 3px;text-shadow:0 0 14px rgba(40,224,255,.5)}
  #login .card .ttl2{font-size:11px;text-align:center;color:var(--t3);letter-spacing:.16em;text-transform:uppercase;margin:0 0 14px;font-family:"Rajdhani",system-ui,sans-serif}
  .dl{border-color:rgba(255,45,149,.35);color:var(--neon-pink)}
  .dl:hover{border-color:var(--neon-pink);background:rgba(255,45,149,.08);box-shadow:0 0 14px rgba(255,45,149,.2)}
  /* badge trasee public/privat */
  .rbadge{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:999px;font-family:"Rajdhani",system-ui,sans-serif}
  .rbadge.pub{background:rgba(34,224,138,.14);color:var(--gold)}
  .rbadge.priv{background:rgba(143,168,154,.12);color:var(--t3)}
  @media (prefers-reduced-motion:reduce){body::before{display:none}}
</style>
</head>
<body>
<!-- LOGIN -->
<div id="login">
  <div class="card">
    <img src="/brand/logo" alt="Street X Underground" style="display:block;height:110px;max-width:100%;margin:0 auto 14px" />
    <div class="ttl">Street X Underground</div>
    <div class="ttl2">Panou dispecerat</div>
    <p style="text-align:center">Autentificare administrator</p>
    <label>Utilizator</label>
    <input id="lu" value="admin" autocomplete="username" />
    <label>Parolă</label>
    <input id="lp" type="password" autocomplete="current-password" />
    <div class="err" id="lerr"></div>
    <div class="actions">
      <button class="primary" style="width:100%" onclick="doLogin()">Intră</button>
    </div>
    <a class="dl" href="/app.apk" download="street-x-underground.apk"><span data-ic="download"></span> Descarcă aplicația Android (.apk)</a>
  </div>
</div>

<!-- APP -->
<div id="app" class="hidden">
  <!-- TOPBAR global -->
  <div id="topbar">
    <button id="menuBtn" onclick="toggleSide()" title="Listă șoferi"><span data-ic="menu"></span></button>
    <div class="brand"><img class="logo" src="/brand/logo" alt="Street X Underground" /></div>
    <div class="kpis" id="kpis"></div>
    <div class="tb-sp"></div>
    <div class="tb-actions">
      <button class="primary" onclick="openAdd()"><span data-ic="plus"></span> Dispozitiv</button>
      <button onclick="openInvites()" title="Invită oameni"><span data-ic="user"></span> Invită</button>
      <button onclick="openRoutes()" title="Trasee"><span data-ic="route"></span> Trasee</button>
      <button onclick="refresh()" title="Reîmprospătează"><span data-ic="refresh"></span></button>
      <button class="opt" onclick="openLogo()" title="Logo"><span data-ic="image"></span></button>
      <a class="opt" href="/app.apk" download="street-x-underground.apk" title="Descarcă aplicația Android"><button><span data-ic="download"></span></button></a>
      <button class="opt" onclick="logout()" title="Ieșire"><span data-ic="logout"></span></button>
    </div>
  </div>
  <div id="side">
    <div class="sidetools">
      <button onclick="openRoutes()"><span data-ic="route"></span> Trasee</button>
      <button onclick="openLogo()"><span data-ic="image"></span> Logo</button>
      <a href="/app.apk" download="street-x-underground.apk"><button><span data-ic="download"></span> App</button></a>
      <button onclick="logout()" style="margin-left:auto"><span data-ic="logout"></span> Ieșire</button>
    </div>
    <div class="segbar">
      <div class="segs" id="segs">
        <span class="seg on" data-f="all" onclick="setFilter('all')">Toți <span class="sc" data-c="all"></span></span>
        <span class="seg" data-f="online" onclick="setFilter('online')">Online <span class="sc" data-c="online"></span></span>
        <span class="seg" data-f="offline" onclick="setFilter('offline')">Offline <span class="sc" data-c="offline"></span></span>
        <span class="seg" data-f="msg" onclick="setFilter('msg')">Mesaje noi <span class="sc" data-c="msg"></span></span>
      </div>
      <div class="searchwrap">
        <span class="si" data-ic="search" data-sz="15"></span>
        <input id="devSearch" placeholder="Caută șofer…" oninput="renderList()" autocomplete="off" />
      </div>
    </div>
    <div id="list"></div>
    <div class="foot">
      <select id="hrange">
        <option value="3600000">Ultima oră</option>
        <option value="21600000">Ultimele 6 ore</option>
        <option value="86400000" selected>Ultimele 24h</option>
        <option value="604800000">Ultima săptămână</option>
      </select>
      <button onclick="loadHistory()" style="flex:1">Arată traseul</button>
      <button onclick="clearHistory()">Ascunde</button>
    </div>
    <div class="foot" style="flex-direction:column;align-items:stretch;gap:8px">
      <label style="font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.06em">Distanță șofer → adresă</label>
      <input id="destAddr" placeholder="Adresă destinație (stradă, oraș)" />
      <div style="display:flex;gap:8px">
        <button style="flex:1" onclick="routeToAddress()">Calculează ruta</button>
        <button onclick="pickOnMap()" title="Alege destinația apăsând pe hartă"><span data-ic="pin"></span> Hartă</button>
        <button onclick="clearRoute()" title="Șterge ruta"><span data-ic="x"></span></button>
      </div>
      <div id="routeInfo" style="font-size:13px;line-height:1.4"></div>
    </div>
  </div>
  <div id="map">
    <div id="mapCtrls">
      <button id="dTrafBtn" onclick="toggleDTraffic()" title="Trafic + incidente"><span data-ic="traffic" data-sz="18"></span></button>
      <button id="dPoiBtn" onclick="toggleDPoi()" title="Benzinării în zonă"><span data-ic="fuel" data-sz="18"></span></button>
    </div>
  </div>
</div>

<!-- MODAL adaugă dispozitiv -->
<div id="addModal" class="modal hidden">
  <div class="card">
    <h3>Dispozitiv nou</h3>
    <div class="row"><label>Nume (ex: Telefon Ion)</label><input id="dName" /></div>
    <div class="row"><label>Grup (ex: Șoferi)</label><input id="dGroup" value="General" /></div>
    <div class="row"><label>Utilizator (login șofer)</label><input id="dUser" placeholder="ex: ion" autocapitalize="off" /></div>
    <div class="row"><label>Parolă</label><input id="dPass" placeholder="parola șoferului" /></div>
    <div id="addResult" class="hidden">
      <p style="color:var(--ok);font-size:13px">✔ Șofer creat. Dă-i aceste date de conectare pentru aplicație:</p>
      <div class="row"><label>Utilizator</label><div class="key" id="rUser"></div></div>
      <div class="row"><label>Parolă</label><div class="key" id="rPass"></div></div>
      <p style="color:var(--mut);font-size:12px">În aplicație, șoferul introduce utilizatorul și parola de mai sus.</p>
    </div>
    <div class="actions">
      <button onclick="closeAdd()">Închide</button>
      <button class="primary" id="addBtn" onclick="createDevice()">Creează</button>
    </div>
  </div>
</div>

<!-- MODAL logo brand -->
<div id="logoModal" class="modal hidden">
  <div class="card">
    <h3><span data-ic="image" data-sz="20"></span> Logo</h3>
    <p style="color:var(--mut);font-size:13px">Încarcă logo-ul firmei. Apare pe login, în header și în aplicația șoferului. Ideal PNG cu fundal transparent.</p>
    <div style="display:flex;justify-content:center;background:#0e1620;border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:12px">
      <img id="lgPreview" style="max-height:90px;max-width:100%;object-fit:contain" />
    </div>
    <label class="primary" style="display:block;text-align:center;padding:12px;border-radius:8px;cursor:pointer;background:var(--gold);color:#06231a;font-weight:600"><span data-ic="camera"></span> Încarcă logo<input type="file" id="lgFile" accept="image/*" style="display:none" onchange="uploadLogo(this)"></label>
    <div id="lgStatus" style="font-size:12px;color:var(--mut);margin-top:8px;text-align:center"></div>
    <div class="actions">
      <button onclick="resetLogo()">Revino la logo implicit</button>
      <button onclick="closeLogo()">Închide</button>
    </div>
  </div>
</div>

<!-- MODAL profil șofer -->
<div id="profileModal" class="modal hidden">
  <div class="card">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div id="pfAv"></div>
      <div><h3 id="pfName" style="margin:0"></h3><div id="pfStatus" style="font-size:12px;color:var(--mut)"></div></div>
    </div>
    <div class="citem"><span style="color:var(--mut)">Km făcuți azi</span><div style="font-size:22px;font-weight:700;color:var(--blue)" id="pfKm">…</div></div>
    <div class="citem"><span style="color:var(--mut)">Baterie</span> <span id="pfBat">—</span></div>
    <div class="actions"><button onclick="closeProfile()">Închide</button></div>
  </div>
</div>

<!-- DRAWER mesaje către șofer (peste hartă, nu blochează) -->
<div id="msgDrawer" class="drawer hidden">
  <div class="dhead">
    <span class="avwrap" id="msgAv"></span>
    <div style="flex:1;min-width:0">
      <div id="msgTitle" style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Mesaje</div>
      <div id="msgSub" style="font-size:11px;color:var(--t3)"></div>
    </div>
    <button onclick="closeMsg()" title="Închide"><span data-ic="x"></span></button>
  </div>
  <div id="msgList" class="dbody"></div>
  <div class="dfoot">
    <textarea id="msgText" placeholder="Scrie un mesaj pentru șofer…" rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMsg();}"></textarea>
    <button class="primary" onclick="sendMsg()" title="Trimite"><span data-ic="send"></span></button>
  </div>
</div>

<!-- MODAL cont șofer (user + parolă) -->
<div id="credsModal" class="modal hidden">
  <div class="card">
    <h3 id="crTitle">Cont șofer</h3>
    <p style="color:var(--mut);font-size:13px">Datele cu care șoferul se loghează în aplicație.</p>
    <div class="row"><label>Utilizator curent</label><div class="key" id="crUser"></div></div>
    <div class="row"><label>Poză șofer</label>
      <div style="display:flex;align-items:center;gap:12px">
        <img id="crAvatar" style="width:54px;height:54px;border-radius:50%;object-fit:cover;border:2px solid var(--line);background:#0e1620" />
        <label class="qrbtn" style="padding:8px 12px;cursor:pointer"><span data-ic="camera" data-sz="14"></span> Încarcă poză<input type="file" id="crAvatarFile" accept="image/*" style="display:none" onchange="uploadAvatar(this)"></label>
      </div>
    </div>
    <div style="font-weight:600;margin:14px 0 8px">Setează / resetează</div>
    <div class="row"><label>Utilizator</label><input id="crNewUser" autocapitalize="off" /></div>
    <div class="row"><label>Parolă nouă</label><input id="crNewPass" /></div>
    <div class="actions">
      <button onclick="closeCreds()">Închide</button>
      <button class="primary" onclick="saveCreds()">Salvează</button>
    </div>
  </div>
</div>

<!-- MODAL trasee (admin) -->
<div id="routesModal" class="modal hidden">
  <div class="card" style="width:560px;max-width:94vw;max-height:90vh;overflow:auto">
    <h3><span data-ic="route" data-sz="20"></span> Trasee</h3>
    <p style="color:var(--mut);font-size:13px;margin:0 0 12px">Traseele înregistrate de utilizatori + cele desenate de tine. Poți face public/privat, vedea pe hartă sau șterge.</p>
    <button class="primary" style="width:100%;margin-bottom:12px" onclick="startDraw()"><span data-ic="plus"></span> Desenează un traseu nou</button>
    <div id="routesBody">Se încarcă…</div>
    <div class="actions"><button onclick="closeRoutes()">Închide</button></div>
  </div>
</div>

<div id="inviteModal" class="modal hidden">
  <div class="card" style="width:560px;max-width:94vw;max-height:90vh;overflow:auto">
    <h3><span data-ic="user" data-sz="20"></span> Invită oameni</h3>
    <p style="color:var(--mut);font-size:13px;margin:0 0 12px">Creează un link de invitație. Cine îl deschide își face singur cont (nume, utilizator, parolă) și se poate loga în aplicație.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
      <div><label style="font-size:12px;color:var(--mut)">Etichetă (opțional)</label><input id="invLabel" placeholder="ex: Grupul de vineri" /></div>
      <div><label style="font-size:12px;color:var(--mut)">Grup</label><input id="invGroup" value="General" /></div>
      <div><label style="font-size:12px;color:var(--mut)">Nr. maxim de utilizări (0 = nelimitat)</label><input id="invMax" type="number" value="0" min="0" /></div>
      <div><label style="font-size:12px;color:var(--mut)">Expiră în (zile, 0 = niciodată)</label><input id="invDays" type="number" value="7" min="0" /></div>
    </div>
    <button class="primary" style="width:100%;margin-bottom:12px" onclick="createInvite()"><span data-ic="plus"></span> Creează invitație</button>
    <div id="invitesBody">Se încarcă…</div>
    <div class="actions"><button onclick="closeInvites()">Închide</button></div>
  </div>
</div>

<!-- bară plutitoare pentru desenarea traseului -->
<div id="drawBar" class="hidden" style="position:fixed;left:50%;transform:translateX(-50%);bottom:22px;z-index:1800;background:var(--s3);border:1px solid var(--line2);border-radius:14px;padding:10px 12px;display:flex;align-items:center;gap:10px;box-shadow:0 12px 34px rgba(0,0,0,.55)">
  <span style="font-size:13px;color:var(--mut)">Apasă pe hartă pentru puncte · <b id="drawCount" style="color:var(--gold)">0</b></span>
  <button onclick="undoDraw()" title="Șterge ultimul punct"><span data-ic="x"></span></button>
  <button class="primary" onclick="finishDraw()"><span data-ic="check"></span> Salvează</button>
  <button onclick="cancelDraw()">Renunță</button>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script src="https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.0.22/leaflet-maplibre-gl.js"></script>
<script>
const API = location.origin;
let token = localStorage.getItem("gps_token") || "";
let map, markers = {}, selected = null, histLayer = null, devices = [], timer = null;
let routeLayer = null, pickMode = false;

// --- set de iconițe SVG (stil linie, preiau culoarea temei) ---
const ICP={
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  refresh:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  chart:'<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  depot:'<path d="M3 21h18"/><path d="M4 21V8l8-4 8 4v13"/><path d="M9 21v-6h6v6"/><path d="M9 11h.01M15 11h.01"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  menu:'<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  chevL:'<polyline points="15 18 9 12 15 6"/>',
  key:'<circle cx="7.5" cy="15.5" r="4.5"/><path d="M10.7 12.3 21 2"/><path d="M16 7l3 3"/><path d="M18.5 4.5l3 3"/>',
  clipboard:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/>',
  message:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  pin:'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  nav:'<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  route:'<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h6a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h6"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/>',
  check:'<polyline points="20 6 9 17 4 12"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  paperclip:'<path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49"/>',
  car:'<path d="M5 17h14M6 17l1.5-5.5A2 2 0 0 1 9.4 10h5.2a2 2 0 0 1 1.9 1.5L18 17"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>',
  battery:'<rect x="1" y="7" width="18" height="10" rx="2"/><line x1="23" y1="11" x2="23" y2="13"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  power:'<path d="M12 2v9"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>',
  send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  search:'<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  alert:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h16.9a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  clock:'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
  traffic:'<rect x="8" y="2" width="8" height="20" rx="4"/><line x1="8" y1="7" x2="4" y2="7"/><line x1="8" y1="17" x2="4" y2="17"/><line x1="16" y1="7" x2="20" y2="7"/><line x1="16" y1="12" x2="20" y2="12"/><circle cx="12" cy="7" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="17" r="1.3"/>',
  fuel:'<line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9.83a2 2 0 0 0-.59-1.42L18 5"/>'
};
function ic(name,size){var s=size||16;return '<svg class="ic" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(ICP[name]||"")+'</svg>';}
function fillIcons(root){(root||document).querySelectorAll("[data-ic]").forEach(function(el){el.innerHTML=ic(el.getAttribute("data-ic"),el.getAttribute("data-sz")||17);});}
document.addEventListener("DOMContentLoaded",function(){fillIcons();});

function h(t){return {"Content-Type":"application/json","Authorization":"Bearer "+t}}
function fmtAge(ts){
  if(!ts) return "niciodată";
  const s = Math.floor((Date.now()-ts)/1000);
  if(s<60) return s+"s în urmă";
  if(s<3600) return Math.floor(s/60)+"m în urmă";
  if(s<86400) return Math.floor(s/3600)+"h în urmă";
  return Math.floor(s/86400)+"z în urmă";
}
function isOnline(ts){ return ts && (Date.now()-ts) < 5*60*1000; }

async function doLogin(){
  const u=document.getElementById("lu").value, p=document.getElementById("lp").value;
  const r = await fetch(API+"/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user:u,pass:p})});
  if(!r.ok){ document.getElementById("lerr").textContent="Utilizator sau parolă greșită"; return; }
  const d = await r.json(); token=d.token; localStorage.setItem("gps_token",token);
  showApp();
}
function logout(){ localStorage.removeItem("gps_token"); token=""; location.reload(); }

function isMobile(){ return window.matchMedia("(max-width:860px)").matches; }
function toggleSide(){
  document.getElementById("app").classList.toggle("side-hidden");
  setTimeout(function(){ if(map) map.invalidateSize(); }, 250);
}

// Stil vectorial „Street X Underground": uscat oliv, apă albastru-adânc, drumuri albe cu glow.
// Sursă de dale vectoriale gratuită, fără cheie API (OpenFreeMap / schema OpenMapTiles).
const MAP_STYLE={
  version:8,
  sources:{ omt:{ type:"vector", url:"https://tiles.openfreemap.org/planet" } },
  layers:[
    { id:"bg", type:"background", paint:{ "background-color":"#39422f" } },
    { id:"landcover", type:"fill", source:"omt", "source-layer":"landcover",
      paint:{ "fill-color":"#3d4a30", "fill-opacity":0.55 } },
    { id:"landuse", type:"fill", source:"omt", "source-layer":"landuse",
      paint:{ "fill-color":"#39432e", "fill-opacity":0.4 } },
    { id:"water", type:"fill", source:"omt", "source-layer":"water",
      paint:{ "fill-color":"#123a57" } },
    { id:"waterway", type:"line", source:"omt", "source-layer":"waterway",
      paint:{ "line-color":"#123a57", "line-width":1.2 } },
    { id:"roads-glow", type:"line", source:"omt", "source-layer":"transportation",
      layout:{ "line-cap":"round", "line-join":"round" },
      paint:{ "line-color":"#bfeffe", "line-blur":3, "line-opacity":0.35,
        "line-width":["interpolate",["linear"],["zoom"], 11,3, 14,6, 17,13, 20,22] } },
    { id:"roads", type:"line", source:"omt", "source-layer":"transportation",
      layout:{ "line-cap":"round", "line-join":"round" },
      paint:{ "line-color":"#eef4f0",
        "line-width":["interpolate",["linear"],["zoom"], 6,0.4, 11,1.4, 14,3, 17,7, 20,16] } }
  ]
};
function addBaseLayer(){
  // Preferă harta vectorială (aspect „Underground"). Dacă motorul WebGL/pluginul lipsește, cade pe raster.
  try{
    if(typeof L.maplibreGL==="function" && window.maplibregl){
      L.maplibreGL({ style:MAP_STYLE, attribution:"© OpenMapTiles © OpenStreetMap" }).addTo(map);
      return;
    }
  }catch(e){}
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    { maxZoom:20, subdomains:"abcd", attribution:"© OpenStreetMap © CARTO" }).addTo(map);
}
function showApp(){
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  if(isMobile()) document.getElementById("app").classList.add("side-hidden");
  if(typeof fillIcons==="function") fillIcons();
  if(map) setTimeout(function(){ map.invalidateSize(); }, 260);
  if(!map){
    map = L.map("map",{zoomControl:false}).setView([45.9432,24.9668],7); // România
    addBaseLayer();
    L.control.zoom({position:"bottomright"}).addTo(map);
    window.addEventListener("resize", function(){ if(map) map.invalidateSize(); });
    setTimeout(function(){ map.invalidateSize(); }, 300);
    map.on("click", function(e){
      if(drawMode){ addWaypoint(e.latlng); return; }
      if(pickMode){ pickMode=false; routeToPoint(e.latlng.lat, e.latlng.lng, null); }
    });
  }
  refresh();
  if(timer) clearInterval(timer);
  timer = setInterval(refresh, 15000);
}

async function refresh(){
  const r = await fetch(API+"/api/devices",{headers:h(token)});
  if(r.status===401){ logout(); return; }
  const d = await r.json();
  devices = d.devices || [];
  renderList();
  renderMarkers();
  renderKpis();
}

function renderKpis(){
  const el=document.getElementById("kpis"); if(!el) return;
  const total=devices.length;
  const online=devices.filter(d=>isOnline(d.last_seen)).length;
  const live=devices.filter(d=>d.last_lat!=null&&d.last_lng!=null).length;
  const onCls=(total&&online===0)?'warn':'good';
  el.innerHTML=
     '<div class="kpi '+onCls+'"><span class="kic">'+ic("user",15)+'</span><span class="lab">Online</span><span class="val">'+online+'/'+total+'</span></div>'
    +'<div class="kpi"><span class="kic">'+ic("pin",15)+'</span><span class="lab">Pe hartă</span><span class="val">'+live+'</span></div>';
}

let listFilter="all";
function devMatches(dv){
  const inp=document.getElementById("devSearch");
  const q=inp?inp.value.trim().toLowerCase():"";
  if(q && String(dv.name||"").toLowerCase().indexOf(q)<0) return false;
  const on=isOnline(dv.last_seen);
  if(listFilter==="online" && !on) return false;
  if(listFilter==="offline" && on) return false;
  if(listFilter==="msg" && dv.last_msg_from!=="driver") return false;
  return true;
}
function updateSegCounts(){
  const c={all:devices.length,online:0,offline:0,msg:0};
  devices.forEach(function(dv){ if(isOnline(dv.last_seen))c.online++; else c.offline++; if(dv.last_msg_from==="driver")c.msg++; });
  document.querySelectorAll("#segs .sc").forEach(function(s){ const k=s.getAttribute("data-c"); s.textContent=(c[k]!=null?c[k]:""); });
}
function setFilter(f){
  listFilter=f;
  document.querySelectorAll("#segs .seg").forEach(function(s){ s.classList.toggle("on",s.getAttribute("data-f")===f); });
  renderList();
}
function renderList(){
  updateSegCounts();
  const shown=devices.filter(devMatches);
  const groups = {};
  shown.forEach(dv=>{ (groups[dv.group_name]=groups[dv.group_name]||[]).push(dv); });
  let html="";
  if(!devices.length) html='<div style="padding:20px;color:var(--t3);font-size:13px">Niciun dispozitiv încă. Apasă <b>+ Dispozitiv</b>.</div>';
  else if(!shown.length) html='<div style="padding:20px;color:var(--t3);font-size:13px">Niciun șofer pentru acest filtru.</div>';
  for(const g of Object.keys(groups).sort()){
    html+='<div class="grp">'+esc(g)+'</div>';
    for(const dv of groups[g]){
      const on=isOnline(dv.last_seen);
      html+='<div class="dev'+(on?' online':'')+(selected===dv.id?' sel':'')+'" onclick="selectDevice('+dv.id+')">'
        +'<div class="devrow">'
          +'<span class="avwrap" onclick="openProfile('+dv.id+',event)" style="cursor:pointer" title="Vezi profil">'+avatarHtml(dv,on,'devav')+'<span class="sdot '+(on?'on':'off')+'"></span></span>'
          +'<div class="devmain">'
            +'<div class="n"><span class="nm">'+esc(dv.name)+'</span></div>'
            +'<div class="m">'+fmtAge(dv.last_seen)+(dv.last_battery!=null?' • '+ic("battery",13)+dv.last_battery+'%':'')+'</div>'
          +'</div>'
        +'</div>'
        +'<div class="devacts">'
          +'<span class="qrbtn" onclick="showCreds('+dv.id+',event)">'+ic("key",14)+'Cont</span>'
          +'<span class="qrbtn" onclick="openMsg('+dv.id+',event)">'+ic("message",14)+'Mesaj'+(dv.last_msg_from==="driver"?' <span style="color:var(--gold)">●</span>':"")+'</span>'
        +'</div>'
        +'</div>';
    }
  }
  document.getElementById("list").innerHTML=html;
}

const PIN_COLORS=["#d9a441","#4aa3ff","#3fb950","#e5534b","#b083f0","#f78166","#39c5cf","#db61a2"];
function colorFor(id){ return PIN_COLORS[Math.abs(id)%PIN_COLORS.length]; }
function initials(name){ const p=String(name||"?").trim().split(/\s+/); return ((p[0]&&p[0][0]||"")+(p[1]&&p[1][0]||"")).toUpperCase()||"?"; }
function avatarHtml(dv,on,cls){
  const c=colorFor(dv.id);
  if(dv.has_avatar) return '<img class="'+cls+(on?'':' off')+'" style="border-color:'+c+'" src="'+API+'/avatar/'+dv.id+'">';
  return '<div class="'+cls+(on?'':' off')+'" style="border-color:'+c+'">'+esc(initials(dv.name))+'</div>';
}
function pinIcon(dv,on){
  const c=colorFor(dv.id);
  const html='<div class="mkpin'+(on?'':' off')+'">'
    +avatarHtml(dv,on,'mkav')
    +'<div class="mkname" style="background:'+c+'">'+esc(dv.name)+'</div></div>';
  return L.divIcon({className:'mkwrap',html:html,iconSize:[150,80],iconAnchor:[75,25]});
}
function renderMarkers(){
  const seen={};
  devices.forEach(dv=>{
    if(dv.last_lat==null||dv.last_lng==null) return;
    seen[dv.id]=true;
    const on=isOnline(dv.last_seen);
    const pos=[dv.last_lat,dv.last_lng];
    const popup="<b>"+esc(dv.name)+"</b><br>"+esc(dv.group_name)+"<br>"+fmtAge(dv.last_seen)
      +(dv.last_battery!=null?"<br>"+ic("battery",13)+" "+dv.last_battery+"%":"")
      +(dv.last_speed!=null?"<br>"+ic("car",13)+" "+Math.round((dv.last_speed||0)*3.6)+" km/h":"");
    if(markers[dv.id]){ markers[dv.id].setLatLng(pos).setPopupContent(popup).setIcon(pinIcon(dv,on)); }
    else {
      markers[dv.id]=L.marker(pos,{title:dv.name,icon:pinIcon(dv,on)}).addTo(map).bindPopup(popup);
      markers[dv.id].on("click",()=>selectDevice(dv.id));
    }
  });
  Object.keys(markers).forEach(id=>{ if(!seen[id]){ map.removeLayer(markers[id]); delete markers[id]; } });
}

function selectDevice(id){
  selected=id; renderList();
  const m=markers[id];
  // pe telefon: ascunde panelul ca să se vadă harta
  if(isMobile()) document.getElementById("app").classList.add("side-hidden");
  setTimeout(function(){
    if(map){ map.invalidateSize(); if(m){ map.setView(m.getLatLng(),15); m.openPopup(); } }
  }, 260);
}

async function loadHistory(){
  if(!selected){ alert("Selectează un dispozitiv din listă."); return; }
  const range=Number(document.getElementById("hrange").value);
  const to=Date.now(), from=to-range;
  const r=await fetch(API+"/api/devices/"+selected+"/history?from="+from+"&to="+to,{headers:h(token)});
  const d=await r.json();
  clearHistory();
  const pts=(d.points||[]).map(p=>[p.lat,p.lng]);
  if(pts.length<1){ alert("Fără poziții înregistrate în intervalul ales."); return; }
  histLayer=L.layerGroup().addTo(map);
  L.polyline(pts,{color:"#8bf9ff",weight:4,opacity:.95,className:"glowline"}).addTo(histLayer);
  L.circleMarker(pts[0],{radius:6,color:"#3fb950",fillOpacity:1}).bindPopup("Start").addTo(histLayer);
  L.circleMarker(pts[pts.length-1],{radius:6,color:"#f85149",fillOpacity:1}).bindPopup("Sfârșit").addTo(histLayer);
  map.fitBounds(L.polyline(pts).getBounds().pad(0.2));
}
function clearHistory(){ if(histLayer){ map.removeLayer(histLayer); histLayer=null; } }

// --- distanță/rută de la șofer la o adresă ---
function setRouteInfo(html){ document.getElementById("routeInfo").innerHTML=html; }
function clearRoute(){ pickMode=false; if(routeLayer){ map.removeLayer(routeLayer); routeLayer=null; } setRouteInfo(""); }
function currentCourier(){
  if(!selected){ alert("Selectează întâi șoferul din listă."); return null; }
  const dv=devices.find(x=>x.id===selected);
  if(!dv||dv.last_lat==null||dv.last_lng==null){ alert("Șoferul nu are o poziție cunoscută încă."); return null; }
  return dv;
}
function pickOnMap(){
  if(!currentCourier()) return;
  pickMode=true;
  setRouteInfo("<span style='color:var(--gold)'>Apasă pe hartă unde trebuie să ajungă șoferul…</span>");
  if(isMobile()) document.getElementById("app").classList.add("side-hidden");
  setTimeout(function(){ if(map) map.invalidateSize(); },260);
}
async function routeToAddress(){
  const dv=currentCourier(); if(!dv) return;
  const q=document.getElementById("destAddr").value.trim();
  if(!q){ alert("Scrie o adresă destinație."); return; }
  setRouteInfo("Caut adresa…");
  try{
    const r=await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q="+encodeURIComponent(q),{headers:{Accept:"application/json"}});
    const arr=await r.json();
    if(!arr||!arr.length){ setRouteInfo("<span style='color:#f85149'>Adresa nu a fost găsită.</span>"); return; }
    routeToPoint(parseFloat(arr[0].lat), parseFloat(arr[0].lon), arr[0].display_name);
  }catch(e){ setRouteInfo("<span style='color:#f85149'>Eroare la căutarea adresei.</span>"); }
}
async function routeToPoint(destLat, destLng, destName){
  const dv=currentCourier(); if(!dv) return;
  const o=[dv.last_lat, dv.last_lng];
  setRouteInfo("Calculez ruta…");
  if(routeLayer){ map.removeLayer(routeLayer); routeLayer=null; }
  try{
    const url="https://router.project-osrm.org/route/v1/driving/"+o[1]+","+o[0]+";"+destLng+","+destLat+"?overview=full&geometries=geojson";
    const r=await fetch(url); const d=await r.json();
    if(d.code!=="Ok"||!d.routes||!d.routes.length) throw new Error("no route");
    const route=d.routes[0];
    const coords=route.geometry.coordinates.map(c=>[c[1],c[0]]);
    routeLayer=L.layerGroup().addTo(map);
    L.polyline(coords,{color:"#5ad1ff",weight:5,opacity:.95,className:"glowline"}).addTo(routeLayer);
    L.circleMarker(o,{radius:6,color:"#3fb950",fillOpacity:1}).bindPopup(esc(dv.name)).addTo(routeLayer);
    L.marker([destLat,destLng]).bindPopup(destName?esc(destName):"Destinație").addTo(routeLayer);
    map.fitBounds(L.polyline(coords).getBounds().pad(0.2));
    const km=(route.distance/1000).toFixed(1), min=Math.round(route.duration/60);
    setRouteInfo("<b>"+ic("car",15)+" "+km+" km • ~"+min+" min</b>"+(destName?"<br><span style='color:var(--mut)'>"+esc(destName)+"</span>":""));
  }catch(e){
    // fallback: linie dreaptă + distanță haversine
    routeLayer=L.layerGroup().addTo(map);
    L.polyline([o,[destLat,destLng]],{color:"#4aa3ff",weight:3,dashArray:"6",opacity:.8}).addTo(routeLayer);
    L.circleMarker(o,{radius:6,color:"#3fb950",fillOpacity:1}).bindPopup(esc(dv.name)).addTo(routeLayer);
    L.marker([destLat,destLng]).addTo(routeLayer);
    map.fitBounds(L.polyline([o,[destLat,destLng]]).getBounds().pad(0.3));
    const km=haversine(o[0],o[1],destLat,destLng).toFixed(1);
    setRouteInfo("<b>"+ic("nav",15)+" ~"+km+" km</b> în linie dreaptă<br><span style='color:var(--mut)'>(ruta pe șosea indisponibilă momentan)</span>");
  }
}
function haversine(la1,lo1,la2,lo2){
  const R=6371, dLa=(la2-la1)*Math.PI/180, dLo=(lo2-lo1)*Math.PI/180;
  const a=Math.sin(dLa/2)**2+Math.cos(la1*Math.PI/180)*Math.cos(la2*Math.PI/180)*Math.sin(dLo/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

// --- adaugă dispozitiv ---
function openAdd(){
  document.getElementById("addModal").classList.remove("hidden");
  document.getElementById("addResult").classList.add("hidden");
  document.getElementById("addBtn").classList.remove("hidden");
  document.getElementById("dName").value=""; document.getElementById("dGroup").value="General";
  document.getElementById("dUser").value=""; document.getElementById("dPass").value="";
}
function closeAdd(){ document.getElementById("addModal").classList.add("hidden"); refresh(); }
async function createDevice(){
  const name=document.getElementById("dName").value.trim();
  const group=document.getElementById("dGroup").value.trim()||"General";
  const username=document.getElementById("dUser").value.trim();
  const password=document.getElementById("dPass").value.trim();
  if(!name){ alert("Pune un nume."); return; }
  if(!username||!password){ alert("Pune utilizator și parolă pentru șofer."); return; }
  const r=await fetch(API+"/api/devices",{method:"POST",headers:h(token),body:JSON.stringify({name,group,username,password})});
  const d=await r.json();
  if(d.api_key){
    document.getElementById("rUser").textContent=username;
    document.getElementById("rPass").textContent=password;
    document.getElementById("addResult").classList.remove("hidden");
    document.getElementById("addBtn").classList.add("hidden");
  } else { alert(d.error||"Eroare"); }
}

// --- profil șofer (comenzi active + km azi) ---
function openProfile(id,ev){
  if(ev) ev.stopPropagation();
  const dv=devices.find(x=>x.id===id); if(!dv) return;
  const on=isOnline(dv.last_seen);
  document.getElementById("pfName").textContent=dv.name;
  document.getElementById("pfAv").innerHTML=avatarHtml(dv,on,'devav');
  document.getElementById("pfStatus").textContent=(on?"● online":"○ offline")+" • "+fmtAge(dv.last_seen);
  document.getElementById("pfBat").textContent=dv.last_battery!=null?(dv.last_battery+"%"):"—";
  document.getElementById("pfKm").textContent="…";
  document.getElementById("profileModal").classList.remove("hidden");
  loadProfileStats(id);
}
function closeProfile(){ document.getElementById("profileModal").classList.add("hidden"); }
async function loadProfileStats(id){
  const start=new Date(); start.setHours(0,0,0,0);
  const from=start.getTime(), to=Date.now();
  try{
    const r=await fetch(API+"/api/devices/"+id+"/stats?from="+from+"&to="+to,{headers:h(token)});
    const d=await r.json();
    document.getElementById("pfKm").textContent=(d.km!=null?(d.km+" km"):"—");
  }catch(e){ document.getElementById("pfKm").textContent="—"; }
}

// --- cont șofer (user + parolă) ---
let credDevice = null;
function showCreds(id,ev){
  if(ev) ev.stopPropagation();
  const dv=devices.find(x=>x.id===id); if(!dv) return;
  credDevice=id;
  document.getElementById("crTitle").textContent="Cont — "+dv.name;
  document.getElementById("crUser").textContent=dv.username||"(neconfigurat)";
  document.getElementById("crNewUser").value=dv.username||"";
  document.getElementById("crNewPass").value="";
  document.getElementById("crAvatar").src=dv.has_avatar?(API+"/avatar/"+id+"?t="+Date.now()):"data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  document.getElementById("credsModal").classList.remove("hidden");
}
async function uploadAvatar(input){
  const f=input.files&&input.files[0]; if(!f||!credDevice) return;
  const r=await fetch(API+"/api/devices/"+credDevice+"/avatar",{method:"POST",headers:Object.assign({"Content-Type":f.type||"image/jpeg"},h(token)),body:f});
  if(r.ok){ document.getElementById("crAvatar").src=API+"/avatar/"+credDevice+"?t="+Date.now(); refresh(); }
  else { const e=await r.json().catch(()=>({})); alert(e.error||"Eroare la încărcare"); }
  input.value="";
}
function closeCreds(){ document.getElementById("credsModal").classList.add("hidden"); credDevice=null; }

// --- mesaje către șofer ---
let msgDevice=null;
function openMsg(id,ev){
  if(ev) ev.stopPropagation();
  const dv=devices.find(x=>x.id===id); if(!dv) return;
  msgDevice=id;
  const on=isOnline(dv.last_seen);
  document.getElementById("msgTitle").textContent=dv.name;
  document.getElementById("msgSub").innerHTML=(on?'<span style="color:var(--gold)">● online</span>':'○ offline')+' • '+esc(dv.group_name||"");
  document.getElementById("msgAv").innerHTML=avatarHtml(dv,on,'devav')+'<span class="sdot '+(on?'on':'off')+'"></span>';
  document.getElementById("msgText").value="";
  document.getElementById("msgList").innerHTML='<div class="empty">Se încarcă…</div>';
  document.getElementById("msgDrawer").classList.remove("hidden");
  loadMsgs();
}
function closeMsg(){ document.getElementById("msgDrawer").classList.add("hidden"); msgDevice=null; }
async function sendMsg(){
  const text=document.getElementById("msgText").value.trim();
  if(!text){ alert("Scrie un mesaj."); return; }
  const r=await fetch(API+"/api/devices/"+msgDevice+"/messages",{method:"POST",headers:h(token),body:JSON.stringify({text})});
  const d=await r.json();
  if(d.ok){ document.getElementById("msgText").value=""; loadMsgs(); }
  else alert(d.error||"Eroare");
}
async function loadMsgs(){
  const r=await fetch(API+"/api/devices/"+msgDevice+"/messages",{headers:h(token)});
  const d=await r.json();
  const el=document.getElementById("msgList");
  const list=d.messages||[];
  if(!list.length){ el.innerHTML='<div class="empty">Niciun mesaj încă. Scrie primul mesaj șoferului.</div>'; return; }
  el.innerHTML=list.slice().reverse().map(function(m){
    const admin = m.sender!=="driver";
    return '<div class="bub '+(admin?"me":"them")+'">'+esc(m.text)
      +'<span class="ts">'+(admin?"Tu":"Șofer")+' • '+fmtWhen(m.created_at)+'</span></div>';
  }).join("");
  el.scrollTop=el.scrollHeight;
}
function fmtWhen(ts){ try{ return new Date(ts).toLocaleString("ro-RO"); }catch(e){ return ""; } }
async function saveCreds(){
  const username=document.getElementById("crNewUser").value.trim();
  const password=document.getElementById("crNewPass").value.trim();
  if(!username||!password){ alert("Completează utilizator și parolă."); return; }
  const r=await fetch(API+"/api/devices/"+credDevice+"/credentials",{method:"POST",headers:h(token),body:JSON.stringify({username,password})});
  const d=await r.json();
  if(d.ok){ alert("Cont actualizat. Dă șoferului noile date de conectare."); closeCreds(); refresh(); }
  else alert(d.error||"Eroare");
}
// --- logo brand ---
function bustLogos(){ document.querySelectorAll('img[src*="/brand/logo"]').forEach(function(i){ i.src="/brand/logo?t="+Date.now(); }); }
function openLogo(){
  document.getElementById("lgPreview").src="/brand/logo?t="+Date.now();
  document.getElementById("lgStatus").textContent="";
  document.getElementById("logoModal").classList.remove("hidden");
}
function closeLogo(){ document.getElementById("logoModal").classList.add("hidden"); }
async function uploadLogo(input){
  const f=input.files&&input.files[0]; if(!f) return;
  document.getElementById("lgStatus").textContent="Se încarcă…";
  try{
    const r=await fetch(API+"/api/settings/logo",{method:"POST",headers:Object.assign({"Content-Type":f.type||"image/png"},h(token)),body:f});
    if(r.ok){ document.getElementById("lgStatus").textContent="✔ Logo actualizat."; document.getElementById("lgPreview").src="/brand/logo?t="+Date.now(); bustLogos(); }
    else { const e=await r.json().catch(()=>({})); document.getElementById("lgStatus").textContent=e.error||"Eroare la încărcare."; }
  }catch(e){ document.getElementById("lgStatus").textContent="Eroare de rețea."; }
  input.value="";
}
async function resetLogo(){
  if(!confirm("Revii la logo-ul implicit?")) return;
  await fetch(API+"/api/settings/logo",{method:"DELETE",headers:h(token)});
  document.getElementById("lgPreview").src="/brand/logo?t="+Date.now();
  document.getElementById("lgStatus").textContent="Revenit la logo implicit.";
  bustLogos();
}
// --- trasee (admin) ---
let routeViewLayer=null, drawMode=false, drawPts=[], drawMarkers=[], drawLine=null;
function openRoutes(){ document.getElementById("routesModal").classList.remove("hidden"); loadRoutes(); }
function closeRoutes(){ document.getElementById("routesModal").classList.add("hidden"); }

// ---- Invitații ----
function openInvites(){ document.getElementById("inviteModal").classList.remove("hidden"); loadInvites(); }
function closeInvites(){ document.getElementById("inviteModal").classList.add("hidden"); }
function inviteLink(code){ return location.origin + "/join?code=" + encodeURIComponent(code); }
async function createInvite(){
  var body={ label:document.getElementById("invLabel").value.trim(), group:document.getElementById("invGroup").value.trim()||"General",
    max_uses:parseInt(document.getElementById("invMax").value,10)||0, days:parseInt(document.getElementById("invDays").value,10)||0 };
  try{
    var r=await fetch(API+"/api/invites",{method:"POST",headers:h(token),body:JSON.stringify(body)});
    if(r.ok){ document.getElementById("invLabel").value=""; loadInvites(); }
    else { var d=await r.json(); alert(d.error||"Eroare la creare."); }
  }catch(e){ alert("Eroare de rețea."); }
}
async function loadInvites(){
  var box=document.getElementById("invitesBody"); if(!box) return;
  try{
    var r=await fetch(API+"/api/invites",{headers:h(token)}); var d=await r.json();
    var list=d.invites||[];
    if(!list.length){ box.innerHTML='<div style="color:var(--mut);font-size:13px;padding:8px 0">Nicio invitație încă. Creează una mai sus.</div>'; return; }
    box.innerHTML=list.map(function(iv){
      var link=inviteLink(iv.code);
      var uses=iv.max_uses>0?(iv.uses+"/"+iv.max_uses):(iv.uses+" folosiri");
      var exp=iv.expires_at?("expiră "+new Date(iv.expires_at).toLocaleDateString("ro-RO")):"fără expirare";
      return '<div style="border:1px solid var(--line2);border-radius:12px;padding:10px 12px;margin-bottom:8px">'
        +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
        +'<b style="font-family:ui-monospace,monospace;letter-spacing:.1em;color:var(--gold)">'+esc(iv.code)+'</b>'
        +(iv.label?'<span style="color:var(--mut);font-size:12px">'+esc(iv.label)+'</span>':'')
        +'<span style="color:var(--mut);font-size:12px">· grup '+esc(iv.group_name)+' · '+uses+' · '+exp+'</span></div>'
        +'<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">'
        +'<input readonly value="'+esc(link)+'" onclick="this.select()" style="flex:1;min-width:200px;font-size:12px" />'
        +'<button onclick="copyInvite(\\''+esc(link)+'\\')"><span data-ic="clipboard"></span> Copiază link</button>'
        +'<button onclick="revokeInvite('+iv.id+')"><span data-ic="trash"></span></button></div></div>';
    }).join("");
    fillIcons(box);
  }catch(e){ box.innerHTML='<div style="color:var(--danger)">Eroare la încărcare.</div>'; }
}
function copyInvite(link){
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(link).then(function(){ alert("Link copiat!"); },function(){ prompt("Copiază linkul:",link); }); }
  else prompt("Copiază linkul:",link);
}
async function revokeInvite(id){
  if(!confirm("Revoci această invitație?")) return;
  try{ var r=await fetch(API+"/api/invites/"+id,{method:"DELETE",headers:h(token)}); if(r.ok) loadInvites(); else alert("Eroare."); }catch(e){ alert("Eroare de rețea."); }
}
async function loadRoutes(){
  document.getElementById("routesBody").innerHTML="Se încarcă…";
  try{
    const r=await fetch(API+"/api/routes",{headers:h(token)});
    const d=await r.json();
    renderRoutes(d.routes||[]);
  }catch(e){ document.getElementById("routesBody").innerHTML='<div style="color:#f85149">Eroare la încărcare.</div>'; }
}
function fmtKm(m){ return ((m||0)/1000).toFixed(1); }
function renderRoutes(list){
  const el=document.getElementById("routesBody");
  if(!list.length){ el.innerHTML='<div style="color:var(--mut);font-size:13px;text-align:center;padding:14px">Niciun traseu încă. Desenează unul sau așteaptă înregistrări de la utilizatori.</div>'; return; }
  el.innerHTML=list.map(function(rt){
    const pub=rt.is_public?'<span class="rbadge pub">Public</span>':'<span class="rbadge priv">Privat</span>';
    const who=rt.owner_type==="admin"?"Admin":esc(rt.owner_name||"utilizator");
    return '<div class="citem"><div class="ch"><span class="cnum" style="flex:1">'+esc(rt.name)+'</span>'+pub+'</div>'
      +'<div class="cfield" style="font-family:ui-monospace,monospace">'+fmtKm(rt.distance_m)+' km'+(rt.duration_s?' · '+Math.round(rt.duration_s/60)+' min':'')+' · de la '+who+'</div>'
      +'<div class="cactions">'
        +'<button class="qrbtn" onclick="viewRouteAdmin('+rt.id+')">'+ic("nav",14)+'Vezi</button>'
        +'<button class="qrbtn" onclick="toggleRoutePublic('+rt.id+','+(rt.is_public?0:1)+')">'+ic(rt.is_public?"key":"globe",14)+(rt.is_public?'Fă privat':'Fă public')+'</button>'
        +'<button class="qrbtn" onclick="deleteRouteAdmin('+rt.id+')">'+ic("trash",14)+'Șterge</button>'
      +'</div></div>';
  }).join("");
}

// ---- Trafic + incidente + benzinării pe harta din admin (același proxy TomTom) ----
let trafficLayer=null, incidentLayer=null, incidentTimer=null, poiLayer=null;
function toggleDTraffic(){
  if(!map) return;
  var b=document.getElementById("dTrafBtn");
  if(trafficLayer){ map.removeLayer(trafficLayer); trafficLayer=null; dStopIncidents(); if(b) b.classList.remove("on"); return; }
  trafficLayer=L.tileLayer("/traffic/{z}/{x}/{y}.png",{maxZoom:22,opacity:0.85,zIndex:400}).addTo(map);
  if(b) b.classList.add("on");
  dStartIncidents();
}
function dStartIncidents(){ dLoadIncidents(); if(incidentTimer) clearInterval(incidentTimer); incidentTimer=setInterval(dLoadIncidents,30000); map.on("moveend",dLoadIncidents); }
function dStopIncidents(){ if(incidentTimer){ clearInterval(incidentTimer); incidentTimer=null; } if(map) map.off("moveend",dLoadIncidents); if(incidentLayer&&map){ map.removeLayer(incidentLayer); incidentLayer=null; } }
function dIncIcon(cat,mag){
  var m={1:"🚗💥",2:"🌫️",3:"⚠️",4:"🌧️",5:"❄️",6:"🐌",7:"🚧",8:"⛔",9:"🚧",10:"💨",11:"🌊",14:"🚙"};
  var e=m[cat]||"⚠️";
  var color=mag>=3?"#ff3b3b":(mag===2?"#ff8a3d":(mag===1?"#eab54a":"#8bd450"));
  var html='<div style="position:relative;width:30px;height:38px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))">'
    +'<svg width="30" height="38" viewBox="0 0 30 38"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 23 15 23s15-12.5 15-23C30 6.7 23.3 0 15 0z" fill="'+color+'" stroke="#0a0f0d" stroke-width="1.6"/></svg>'
    +'<div style="position:absolute;top:2px;left:0;width:30px;text-align:center;font-size:15px;line-height:1">'+e+'</div></div>';
  return L.divIcon({className:"",html:html,iconSize:[30,38],iconAnchor:[15,38],popupAnchor:[0,-34]});
}
function dIncStart(g){
  if(!g||!g.coordinates) return null; var c=g.coordinates;
  if(g.type==="Point") return [c[1],c[0]];
  if(g.type==="LineString"){ var a=c[0]; return a?[a[1],a[0]]:null; }
  if(g.type==="MultiLineString"){ var l=c[0]||[]; var a2=l[0]; return a2?[a2[1],a2[0]]:null; }
  return null;
}
function dIncLen(len){ if(!len) return ""; return len>=1000?(len/1000).toFixed(1)+" km":Math.round(len)+" m"; }
async function dLoadIncidents(){
  if(!map || !trafficLayer) return;
  if(map.getZoom()<10){ if(incidentLayer){ map.removeLayer(incidentLayer); incidentLayer=null; } return; }
  try{
    var bb=map.getBounds();
    var bbox=bb.getWest()+","+bb.getSouth()+","+bb.getEast()+","+bb.getNorth();
    var r=await fetch(API+"/incidents?bbox="+encodeURIComponent(bbox)); var d=await r.json();
    if(incidentLayer){ map.removeLayer(incidentLayer); incidentLayer=null; }
    var inc=d.incidents||[]; if(!inc.length) return;
    incidentLayer=L.layerGroup().addTo(map);
    var sevTxt=["","minor","moderat","major",""];
    inc.forEach(function(it){
      var g=it.geometry||{}, p=it.properties||{};
      var pt=dIncStart(g); if(!pt) return;
      var ev=(p.events&&p.events[0])||{};
      var cat=(p.iconCategory!=null)?p.iconCategory:ev.iconCategory;
      var mag=p.magnitudeOfDelay||0, desc=ev.description||"Incident";
      var road=(p.roadNumbers&&p.roadNumbers.length)?p.roadNumbers.join(", "):"";
      var len=dIncLen(p.length), delay=p.delay?("+"+Math.round(p.delay/60)+" min"):"", sev=sevTxt[mag]||"";
      var parts=[]; if(len)parts.push("📏 "+len); if(delay)parts.push("⏱ "+delay); if(sev)parts.push(sev);
      var html=(road?'<b>'+esc(road)+'</b><br>':'')+esc(desc)+(parts.length?('<br><span style="font-size:12px;color:#9fb0a6">'+parts.join(" · ")+'</span>'):'');
      L.marker(pt,{icon:dIncIcon(cat,mag),zIndexOffset:700}).bindPopup(html).addTo(incidentLayer);
    });
  }catch(e){}
}
function dPoiIcon(e){ return L.divIcon({className:"",html:'<div style="font-size:20px;filter:drop-shadow(0 1px 2px #000)">'+e+'</div>',iconSize:[24,24],iconAnchor:[12,12]}); }
function toggleDPoi(){
  if(!map) return;
  var b=document.getElementById("dPoiBtn");
  if(poiLayer){ map.removeLayer(poiLayer); poiLayer=null; map.off("moveend",dLoadPoi); if(b) b.classList.remove("on"); return; }
  if(b) b.classList.add("on");
  dLoadPoi(); map.on("moveend",dLoadPoi);
}
async function dLoadPoi(){
  if(!map) return;
  if(map.getZoom()<12){ if(poiLayer){ map.removeLayer(poiLayer); poiLayer=null; } return; }
  try{
    var c=map.getCenter();
    var r=await fetch(API+"/poi?lat="+c.lat+"&lon="+c.lng+"&cat=7311&radius=7000"); var d=await r.json();
    if(poiLayer){ map.removeLayer(poiLayer); poiLayer=null; }
    var res=d.results||[]; if(!res.length) return;
    poiLayer=L.layerGroup().addTo(map);
    res.forEach(function(x){ if(x.lat==null) return;
      L.marker([x.lat,x.lon],{icon:dPoiIcon("⛽"),zIndexOffset:650})
        .bindPopup('<b>'+esc(x.name)+'</b>'+(x.addr?'<br><span style="font-size:12px;color:#9fb0a6">'+esc(x.addr)+'</span>':'')).addTo(poiLayer);
    });
  }catch(e){}
}
function clearRouteView(){ if(routeViewLayer){ map.removeLayer(routeViewLayer); routeViewLayer=null; } }
async function viewRouteAdmin(id){
  try{
    const r=await fetch(API+"/api/routes/"+id,{headers:h(token)});
    const d=await r.json();
    if(!r.ok||!d.geometry||!d.geometry.length){ alert(d.error||"Traseu indisponibil."); return; }
    clearRouteView();
    const pts=d.geometry;
    routeViewLayer=L.layerGroup().addTo(map);
    L.polyline(pts,{color:"#8bf9ff",weight:5,opacity:.95,className:"glowline"}).addTo(routeViewLayer);
    L.circleMarker(pts[0],{radius:7,color:"#22e08a",fillColor:"#22e08a",fillOpacity:1}).bindPopup("Start — "+esc(d.name)).addTo(routeViewLayer);
    L.circleMarker(pts[pts.length-1],{radius:7,color:"#ff2d95",fillColor:"#ff2d95",fillOpacity:1}).bindPopup("Final").addTo(routeViewLayer);
    closeRoutes();
    if(isMobile()) document.getElementById("app").classList.add("side-hidden");
    setTimeout(function(){ map.invalidateSize(); map.fitBounds(L.polyline(pts).getBounds().pad(0.25)); },260);
  }catch(e){ alert("Eroare la deschidere."); }
}
async function toggleRoutePublic(id,pub){
  try{ const r=await fetch(API+"/api/routes/"+id,{method:"POST",headers:h(token),body:JSON.stringify({public:!!pub})});
    if(r.ok){ loadRoutes(); } else alert("Eroare."); }catch(e){ alert("Eroare de rețea."); }
}
async function deleteRouteAdmin(id){
  if(!confirm("Ștergi acest traseu definitiv?")) return;
  try{ const r=await fetch(API+"/api/routes/"+id,{method:"DELETE",headers:h(token)}); if(r.ok){ clearRouteView(); loadRoutes(); } else alert("Eroare."); }catch(e){ alert("Eroare de rețea."); }
}
// ---- desenare traseu (admin, click pe hartă) ----
function startDraw(){
  closeRoutes();
  drawMode=true; drawPts=[]; drawMarkers=[]; if(drawLine){ map.removeLayer(drawLine); drawLine=null; }
  document.getElementById("drawBar").classList.remove("hidden");
  document.getElementById("drawCount").textContent="0";
  if(isMobile()) document.getElementById("app").classList.add("side-hidden");
  setTimeout(function(){ map.invalidateSize(); },260);
}
function addWaypoint(latlng){
  drawPts.push([latlng.lat,latlng.lng]);
  const m=L.circleMarker(latlng,{radius:5,color:"#28e0ff",fillColor:"#28e0ff",fillOpacity:1}).addTo(map);
  drawMarkers.push(m);
  if(!drawLine){ drawLine=L.polyline(drawPts,{color:"#28e0ff",weight:3,dashArray:"6",opacity:.9}).addTo(map); }
  else drawLine.setLatLngs(drawPts);
  document.getElementById("drawCount").textContent=String(drawPts.length);
}
function undoDraw(){
  if(!drawPts.length) return;
  drawPts.pop(); const m=drawMarkers.pop(); if(m) map.removeLayer(m);
  if(drawLine) drawLine.setLatLngs(drawPts);
  document.getElementById("drawCount").textContent=String(drawPts.length);
}
function cancelDraw(){
  drawMode=false;
  document.getElementById("drawBar").classList.add("hidden");
  drawMarkers.forEach(function(m){ map.removeLayer(m); }); drawMarkers=[];
  if(drawLine){ map.removeLayer(drawLine); drawLine=null; } drawPts=[];
}
async function finishDraw(){
  if(drawPts.length<2){ alert("Pune cel puțin 2 puncte pe hartă."); return; }
  const name=prompt("Nume traseu:"); if(name===null) return;
  if(!name.trim()){ alert("Nume gol."); return; }
  const pub=confirm("Faci traseul PUBLIC (vizibil tuturor)?  OK = public, Anulează = privat.");
  // urmează șoselele prin toate punctele (OSRM); fallback: linii drepte
  let geometry=drawPts;
  try{
    const coordStr=drawPts.map(p=>p[1]+","+p[0]).join(";");
    const r=await fetch("https://router.project-osrm.org/route/v1/driving/"+coordStr+"?overview=full&geometries=geojson");
    const d=await r.json();
    if(d.code==="Ok"&&d.routes&&d.routes.length){ geometry=d.routes[0].geometry.coordinates.map(c=>[c[1],c[0]]); }
  }catch(e){}
  try{
    const res=await fetch(API+"/api/routes",{method:"POST",headers:h(token),body:JSON.stringify({name:name.trim(),public:pub,geometry:geometry})});
    const dd=await res.json();
    if(res.ok&&dd.id){ alert("Traseu salvat ("+fmtKm(dd.distance_m)+" km)."); cancelDraw(); openRoutes(); }
    else alert(dd.error||"Eroare la salvare.");
  }catch(e){ alert("Eroare de rețea."); }
}
function pairLink(key){ return location.origin + "/pair?key=" + encodeURIComponent(key); }
function copyText(t){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(function(){ alert("Link copiat! Trimite-l șoferului."); },
      function(){ prompt("Copiază linkul:", t); });
  } else { prompt("Copiază linkul:", t); }
}

function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}

// init
if(token) showApp();
document.getElementById("lp").addEventListener("keydown",e=>{ if(e.key==="Enter") doLogin(); });
</script>
</body>
</html>`;
