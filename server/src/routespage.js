// Pagina „Trasee" a utilizatorului — înregistrează traseul conducând (GPS live),
// salvează, marchează public/privat și vezi biblioteca comună.
// Deschisă în aplicație (WebView) la /routes?key=<device_key>. Auth: device key ca Bearer.

export const ROUTES_HTML = /* html */ `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Street X Underground — Trasee</title>
<link rel="stylesheet" href="/leaflet.css" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800&family=Rajdhani:wght@500;600;700&display=swap" />
<style>
  :root{--bg:#0a0f0d;--s1:#121a16;--s2:#18221d;--s3:#202b25;--line:#263229;--line2:#3a4d43;
    --t1:#f5f8f5;--t2:#b9ccc0;--t3:#7c9488;--acc:#22e08a;--cyan:#28e0ff;--pink:#ff2d95;--danger:#ff5b60;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--t1);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;height:100vh;overflow:hidden;display:flex;flex-direction:column}
  .ic{flex:none;vertical-align:middle}
  header{display:flex;align-items:center;gap:9px;flex:0 0 auto;padding:max(12px,env(safe-area-inset-top)) 16px 12px;background:linear-gradient(180deg,var(--s1),transparent);border-bottom:1px solid var(--line);z-index:5}
  .mark{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:linear-gradient(160deg,#123320,#0c1a12);border:1px solid var(--line2);box-shadow:0 0 8px rgba(34,224,138,.2)}
  header .wm{font-family:"Orbitron",sans-serif;font-weight:700;font-size:13px;letter-spacing:.08em}
  header .wm b{color:var(--acc)}
  header .sp{flex:1}
  header .hbtn{background:var(--s3);border:1px solid var(--line2);color:var(--t2);border-radius:9px;width:36px;height:36px;display:grid;place-items:center;cursor:pointer}
  img[src$="brand/logo"]{filter:drop-shadow(0 0 5px rgba(34,224,138,.35))}

  #map{flex:1 1 auto;position:relative;background:#0a1418;min-height:240px}
  .leaflet-container{background:#0a1418}
  .glowline{filter:drop-shadow(0 0 3px rgba(125,249,255,.9)) drop-shadow(0 0 7px rgba(34,224,138,.5))}

  /* stats live peste hartă */
  #liveStats{position:absolute;left:12px;right:12px;top:12px;z-index:500;display:none;gap:8px}
  #liveStats.on{display:flex}
  .stat{flex:1;background:rgba(18,26,22,.92);border:1px solid var(--line2);border-radius:12px;padding:8px 10px;text-align:center}
  .stat b{display:block;font-family:var(--mono);font-size:18px;color:var(--t1)}
  .stat span{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em}
  .stat.rec b{color:var(--pink)}

  /* sheet jos */
  .sheet{flex:0 0 auto;background:var(--s1);border-top:1px solid var(--line2);max-height:52vh;display:flex;flex-direction:column;box-shadow:0 -12px 30px rgba(0,0,0,.4)}
  .sheetbody{overflow:auto;padding:12px 14px}
  .recbar{padding:12px 14px calc(10px + env(safe-area-inset-bottom));display:flex;gap:10px;align-items:center}
  .recbtn{flex:1;height:54px;border:none;border-radius:14px;font-weight:700;font-size:16px;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;font-family:"Rajdhani",sans-serif;letter-spacing:.03em}
  .recbtn.start{background:linear-gradient(180deg,#29e694,#1ec97e);color:#08130d;box-shadow:0 0 0 1px rgba(34,224,138,.4),0 6px 20px rgba(34,224,138,.3)}
  .recbtn.stop{background:linear-gradient(180deg,#ff5b7f,#e5344f);color:#fff;box-shadow:0 0 0 1px rgba(255,45,149,.4),0 6px 20px rgba(255,45,149,.35)}
  .recbtn:active{transform:scale(.98)}
  .hint{font-size:12px;color:var(--t3);padding:0 14px 10px;text-align:center}

  /* tab bar */
  .tabs{display:flex;background:#0d1512;border-top:1px solid var(--line);flex:0 0 auto;padding:8px 6px max(10px,env(safe-area-inset-bottom))}
  .tabs button{flex:1;background:none;border:none;color:var(--t3);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;font-weight:600;font-family:"Rajdhani",sans-serif;letter-spacing:.03em}
  .tabs button .ib{width:46px;height:30px;border-radius:11px;display:grid;place-items:center;transition:background .12s}
  .tabs button.on{color:var(--acc)}
  .tabs button.on .ib{background:rgba(34,224,138,.12)}

  /* listă trasee */
  .ritem{border:1px solid var(--line);border-radius:14px;padding:12px 13px;margin-bottom:10px;background:var(--s2);cursor:pointer;transition:border-color .12s,box-shadow .12s}
  .ritem:active{transform:scale(.995)}
  .ritem.sel{border-color:var(--cyan);box-shadow:0 0 14px rgba(40,224,255,.15)}
  .rtop{display:flex;align-items:center;gap:8px}
  .rname{font-weight:700;font-size:15px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rbadge{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 8px;border-radius:999px;font-family:"Rajdhani",sans-serif}
  .rbadge.pub{background:rgba(34,224,138,.14);color:var(--acc)}
  .rbadge.priv{background:rgba(143,168,154,.12);color:var(--t3)}
  .rmeta{font-size:12px;color:var(--t3);margin-top:4px;font-family:var(--mono)}
  .rowner{font-size:11px;color:var(--t3);margin-top:2px}
  .racts{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
  .rbtn{font-size:12px;padding:6px 10px;border:1px solid var(--line2);background:var(--s3);color:var(--t1);border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;gap:5px}
  .rbtn.pink{color:var(--pink);border-color:rgba(255,45,149,.35)}
  .rbtn.cyan{color:var(--cyan);border-color:rgba(40,224,255,.35)}
  .empty{text-align:center;padding:34px 20px;color:var(--t2)}
  .empty .et{font-weight:600;color:var(--t1)}
  .empty .es{font-size:12.5px;color:var(--t3);margin-top:6px}
  .secttl{font-family:"Orbitron",sans-serif;font-size:12px;letter-spacing:.06em;color:var(--cyan);text-transform:uppercase;margin:2px 0 10px;text-shadow:0 0 8px rgba(40,224,255,.3)}

  /* modal salvare */
  .modal{position:fixed;inset:0;background:rgba(6,10,8,.72);backdrop-filter:blur(4px);display:none;align-items:flex-end;justify-content:center;z-index:2000}
  .modal.on{display:flex}
  .modal .card{background:var(--s2);border:1px solid var(--line2);border-top-left-radius:18px;border-top-right-radius:18px;width:100%;max-width:520px;padding:18px 16px calc(18px + env(safe-area-inset-bottom))}
  .modal h3{margin:0 0 4px;font-family:"Orbitron",sans-serif;font-size:15px;letter-spacing:.05em}
  .modal .msub{font-size:12px;color:var(--t3);margin-bottom:14px;font-family:var(--mono)}
  .modal label{display:block;font-size:12px;color:var(--t2);margin:10px 0 4px}
  .modal input[type=text],.modal textarea{width:100%;background:var(--s1);border:1px solid var(--line);color:var(--t1);border-radius:10px;padding:11px;font-size:14px}
  .modal textarea{min-height:60px;resize:vertical}
  .pubrow{display:flex;align-items:center;gap:10px;margin-top:14px;padding:11px;border:1px solid var(--line);border-radius:10px;background:var(--s1)}
  .pubrow input{width:20px;height:20px;accent-color:var(--acc)}
  .pubrow .pl{font-size:13px}
  .pubrow .ps{font-size:11px;color:var(--t3)}
  .mbtns{display:flex;gap:8px;margin-top:16px}
  .mbtns button{flex:1;height:48px;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer;border:1px solid var(--line2);background:var(--s3);color:var(--t1);font-family:"Rajdhani",sans-serif;letter-spacing:.02em}
  .mbtns button.primary{background:linear-gradient(180deg,#29e694,#1ec97e);color:#08130d;border-color:transparent}

  .toast{position:fixed;bottom:110px;left:50%;transform:translateX(-50%);background:var(--s3);border:1px solid var(--line2);border-radius:12px;padding:11px 18px;font-size:14px;opacity:0;transition:.2s;z-index:2500;box-shadow:0 8px 24px rgba(0,0,0,.5)}
  .toast.show{opacity:1}
  /* ---- mod „Condu" (busolă + hartă GPS) ---- */
  body.nav-on .sheet, body.nav-on .tabs{display:none!important}
  #navHud{position:absolute;left:0;right:0;top:12px;z-index:700;display:none;flex-direction:column;align-items:center;pointer-events:none}
  body.nav-on #navHud{display:flex}
  .compass{width:98px;height:98px;border-radius:50%;
    background:radial-gradient(circle at 50% 42%, rgba(18,26,22,.96), rgba(10,15,13,.96));
    border:2px solid rgba(40,224,255,.55);box-shadow:0 0 24px rgba(40,224,255,.4),inset 0 0 18px rgba(40,224,255,.16);
    display:grid;place-items:center}
  .compass .arrow{transition:transform .2s ease-out;filter:drop-shadow(0 0 9px rgba(40,224,255,.95))}
  .navinfo{margin-top:9px;background:rgba(10,15,13,.85);border:1px solid var(--line2);border-radius:12px;
    padding:6px 14px;font-family:var(--mono);font-size:14px;color:var(--t1)}
  .navinfo b{color:var(--cyan)}
  .navinfo b.arrived{color:var(--acc)}
  #navExit{position:absolute;left:12px;top:calc(12px + env(safe-area-inset-top));z-index:701;display:none;
    align-items:center;gap:6px;background:rgba(10,15,13,.9);border:1px solid var(--line2);color:var(--t1);
    border-radius:12px;padding:10px 13px;font-weight:600;font-family:"Rajdhani",system-ui,sans-serif;cursor:pointer}
  body.nav-on #navExit{display:inline-flex}
  @media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
</head>
<body>
<header>
  <span class="mark"><img src="/brand/logo" alt="SXU" style="height:22px;width:auto;max-width:22px" /></span>
  <span class="wm">STREET&nbsp;X <b>UNDERGROUND</b></span>
  <span class="sp"></span>
  <button class="hbtn" onclick="loadList()" title="Reîmprospătează"><span data-ic="refresh"></span></button>
</header>

<div id="map">
  <div id="liveStats">
    <div class="stat rec"><b id="stDist">0.0</b><span>km</span></div>
    <div class="stat"><b id="stTime">0:00</b><span>timp</span></div>
    <div class="stat"><b id="stSpd">0</b><span>km/h</span></div>
  </div>
  <!-- HUD navigație (mod Condu): busolă sus-centru + info -->
  <div id="navHud">
    <div class="compass">
      <svg class="arrow" id="navArrow" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#eafcff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 14 12 7 18 14"/><polyline points="6 19 12 12 18 19"/>
      </svg>
    </div>
    <div class="navinfo"><b id="navRemain">—</b> <span id="navNext"></span></div>
  </div>
  <button id="navExit" onclick="exitNav()"><span data-ic="x"></span> Ieși</button>
  <div id="dbg" style="position:absolute;left:8px;top:8px;z-index:650;background:rgba(0,0,0,.6);color:#8bf9ff;font:11px/1.3 ui-monospace,monospace;padding:4px 7px;border-radius:6px;pointer-events:none">init…</div>
</div>

<!-- sheet ÎNREGISTRARE -->
<div class="sheet" id="sheetRec">
  <div class="hint" id="recHint">Apasă „Start" și condu — traseul se desenează singur.</div>
  <div class="recbar">
    <button class="recbtn start" id="recBtn" onclick="toggleRec()"><span data-ic="rec"></span> Start înregistrare</button>
  </div>
</div>

<!-- sheet LISTE (mine / bibliotecă) -->
<div class="sheet" id="sheetList" style="display:none">
  <div class="sheetbody" id="listBody"></div>
</div>

<div class="tabs">
  <button id="tab-rec" class="on" onclick="setTab('rec')"><span class="ib" data-ic="rec"></span>Înregistrează</button>
  <button id="tab-mine" onclick="setTab('mine')"><span class="ib" data-ic="route"></span>Traseele mele</button>
  <button id="tab-lib" onclick="setTab('lib')"><span class="ib" data-ic="globe"></span>Bibliotecă</button>
</div>

<!-- modal salvare traseu -->
<div class="modal" id="saveModal">
  <div class="card">
    <h3>Salvează traseul</h3>
    <div class="msub" id="saveSub">—</div>
    <label>Nume traseu</label>
    <input type="text" id="rName" placeholder="ex: Tura de noapte prin centru" />
    <label>Descriere (opțional)</label>
    <textarea id="rDesc" placeholder="Detalii despre traseu…"></textarea>
    <label class="pubrow"><input type="checkbox" id="rPublic" />
      <span><span class="pl">Fă-l public</span><br><span class="ps">Apare în biblioteca comună, vizibil tuturor.</span></span></label>
    <div class="mbtns">
      <button onclick="discardRec()">Renunță</button>
      <button class="primary" id="saveBtn" onclick="saveRoute()">Salvează</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script src="/leaflet.js"></script>
<script>
const API=location.origin;
const params=new URLSearchParams(location.search);
let key=params.get("key")||localStorage.getItem("gps_driver_key")||"";
if(params.get("key")) localStorage.setItem("gps_driver_key",key);

const ICP={
  refresh:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  rec:'<circle cx="12" cy="12" r="7"/>',
  route:'<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h6a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h6"/>',
  nav:'<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/>',
  trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  eye:'<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>'
};
function ic(n,s){var x=s||18;return '<svg class="ic" width="'+x+'" height="'+x+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(ICP[n]||"")+'</svg>';}
function fillIcons(r){(r||document).querySelectorAll("[data-ic]").forEach(function(el){el.innerHTML=ic(el.getAttribute("data-ic"),el.getAttribute("data-sz")||20);});}
document.addEventListener("DOMContentLoaded",function(){fillIcons();});

function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function hdr(){return {"Authorization":"Bearer "+key};}
function toast(m){var t=document.getElementById("toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}
function fmtKm(m){return ((m||0)/1000).toFixed(1);}
function fmtDur(s){s=Math.round(s||0);var m=Math.floor(s/60),ss=s%60;return m+":"+(ss<10?"0":"")+ss;}
function haversine(a,b,c,d){var R=6371000,p=Math.PI/180,dLa=(c-a)*p,dLo=(d-b)*p,x=Math.sin(dLa/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(x));}

// ---- hartă raster (fiabilă în WebView) cu look „Underground" din filtru CSS ----
let map,recLine=null,viewLayer=null,meDot=null;
function mapMsg(msg,color){
  var m=document.getElementById("map"); if(!m) return;
  var d=document.getElementById("mapMsg");
  if(!d){ d=document.createElement("div"); d.id="mapMsg";
    d.style.cssText="position:absolute;left:12px;right:12px;top:44%;text-align:center;color:"+(color||"#ff5b60")+";font-size:13.5px;z-index:600;pointer-events:none;text-shadow:0 1px 3px #000";
    m.appendChild(d); }
  d.style.color=color||"#ff5b60"; d.textContent=msg;
}
function clearMapMsg(){ var d=document.getElementById("mapMsg"); if(d) d.remove(); }
var tLoad=0, tErr=0;
function dbg(){
  var d=document.getElementById("dbg"); if(!d) return;
  var el=document.getElementById("map");
  var sz=el?(el.clientWidth+"x"+el.clientHeight):"?";
  d.textContent="L:"+(typeof L!=="undefined"?"ok":"LIPSĂ")+" map:"+(map?"ok":"nu")+" "+sz+" tiles:"+tLoad+"/"+tErr;
}
function addBase(){
  var layer=L.tileLayer("/tiles/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap © CARTO"});
  layer.on("tileload",function(){ tLoad++; if(tLoad===1) clearMapMsg(); dbg(); });
  layer.on("tileerror",function(){ tErr++; if(tLoad===0) mapMsg("Dalele nu se încarcă (/tiles). tErr="+tErr,"#ff5b60"); dbg(); });
  layer.addTo(map);
  mapMsg("Se încarcă harta…","#b9ccc0");
  setTimeout(function(){ if(tLoad===0) mapMsg("Harta nu s-a încărcat (tiles:"+tLoad+"/"+tErr+").","#ff5b60"); },6000);
}
function initMap(){
  dbg();
  if(typeof L==="undefined"){ mapMsg("Nu s-a încărcat motorul de hartă (Leaflet).","#ff5b60"); return; }
  try{
    map=L.map("map",{zoomControl:false}).setView([45.9432,24.9668],7);
    addBase();
    L.control.zoom({position:"bottomright"}).addTo(map);
    var fix=function(){ if(map) map.invalidateSize(); dbg(); };
    [100,300,600,1200,2500,4000].forEach(function(t){ setTimeout(fix,t); });
    window.addEventListener("resize",fix);
    window.addEventListener("load",fix);
    if(window.ResizeObserver){ try{ new ResizeObserver(fix).observe(document.getElementById("map")); }catch(e){} }
  }catch(e){ mapMsg("Eroare hartă: "+(e&&e.message?e.message:e),"#ff5b60"); dbg(); }
}

// ---- înregistrare ----
let recording=false,recPts=[],recDist=0,recStart=0,geoWatch=null,timeTimer=null;
function toggleRec(){ recording?stopRec():startRec(); }
function startRec(){
  if(!navigator.geolocation){ toast("GPS indisponibil pe acest dispozitiv."); return; }
  recPts=[];recDist=0;recStart=Date.now();recording=true;
  if(recLine){map.removeLayer(recLine);recLine=null;}
  document.getElementById("liveStats").classList.add("on");
  var b=document.getElementById("recBtn");b.className="recbtn stop";b.innerHTML=ic("rec")+" Stop & salvează";
  document.getElementById("recHint").textContent="Înregistrez… condu pe traseul dorit.";
  updateStats();
  timeTimer=setInterval(updateStats,1000);
  geoWatch=navigator.geolocation.watchPosition(onPos,function(){toast("Nu pot citi GPS-ul.");},{enableHighAccuracy:true,maximumAge:2000,timeout:15000});
}
function onPos(p){
  var lat=p.coords.latitude,lng=p.coords.longitude;
  var spd=(p.coords.speed!=null&&p.coords.speed>=0)?Math.round(p.coords.speed*3.6):0;
  document.getElementById("stSpd").textContent=spd;
  if(!meDot){ meDot=L.circleMarker([lat,lng],{radius:8,color:"#fff",weight:3,fillColor:"#22e08a",fillOpacity:1}).addTo(map); }
  else meDot.setLatLng([lat,lng]);
  if(!recording){ map.setView([lat,lng],15); return; }
  var last=recPts[recPts.length-1];
  if(last){ var d=haversine(last[0],last[1],lat,lng); if(d<3) return; if(d<200) recDist+=d; }
  recPts.push([lat,lng]);
  if(!recLine){ recLine=L.polyline(recPts,{color:"#8bf9ff",weight:5,opacity:.95,className:"glowline"}).addTo(map); }
  else recLine.setLatLngs(recPts);
  map.setView([lat,lng],Math.max(map.getZoom(),16));
  updateStats();
}
function updateStats(){
  document.getElementById("stDist").textContent=fmtKm(recDist);
  document.getElementById("stTime").textContent=fmtDur((Date.now()-recStart)/1000);
}
function stopRec(){
  recording=false;
  if(geoWatch!=null){navigator.geolocation.clearWatch(geoWatch);geoWatch=null;}
  if(timeTimer){clearInterval(timeTimer);timeTimer=null;}
  var b=document.getElementById("recBtn");b.className="recbtn start";b.innerHTML=ic("rec")+" Start înregistrare";
  document.getElementById("recHint").textContent="Apasă „Start" și condu — traseul se desenează singur.";
  if(recPts.length<2){ toast("Traseu prea scurt. Condu puțin mai mult."); document.getElementById("liveStats").classList.remove("on"); return; }
  document.getElementById("saveSub").textContent=fmtKm(recDist)+" km · "+fmtDur((Date.now()-recStart)/1000)+" · "+recPts.length+" puncte";
  document.getElementById("rName").value="";
  document.getElementById("rDesc").value="";
  document.getElementById("rPublic").checked=false;
  document.getElementById("saveModal").classList.add("on");
}
function discardRec(){
  document.getElementById("saveModal").classList.remove("on");
  document.getElementById("liveStats").classList.remove("on");
  if(recLine){map.removeLayer(recLine);recLine=null;}
  recPts=[];
}
async function saveRoute(){
  var name=document.getElementById("rName").value.trim();
  if(!name){ toast("Pune un nume traseului."); return; }
  var btn=document.getElementById("saveBtn");btn.disabled=true;btn.textContent="Se salvează…";
  try{
    var body={name:name,description:document.getElementById("rDesc").value.trim(),public:document.getElementById("rPublic").checked,geometry:recPts,duration_s:Math.round((Date.now()-recStart)/1000)};
    var r=await fetch(API+"/api/my/routes",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify(body)});
    var d=await r.json();
    if(r.ok&&d.id){ toast("Traseu salvat ✔"); document.getElementById("saveModal").classList.remove("on"); document.getElementById("liveStats").classList.remove("on"); if(recLine){map.removeLayer(recLine);recLine=null;} recPts=[]; setTab("mine"); }
    else toast(d.error||"Eroare la salvare.");
  }catch(e){ toast("Eroare de rețea."); }
  btn.disabled=false;btn.textContent="Salvează";
}

// ---- taburi / liste ----
let tab="rec",dataMine=[],dataLib=[],selRoute=null;
function setTab(t){
  tab=t;
  ["rec","mine","lib"].forEach(function(x){var el=document.getElementById("tab-"+x);if(el)el.classList.toggle("on",x===t);});
  document.getElementById("sheetRec").style.display = t==="rec"?"":"none";
  document.getElementById("sheetList").style.display = t==="rec"?"none":"";
  if(t!=="rec") renderList();
}
async function loadList(){
  if(!key){ return; }
  try{
    var r=await fetch(API+"/api/my/routes",{headers:hdr()});
    var d=await r.json();
    dataMine=d.mine||[];dataLib=d.library||[];
    if(tab!=="rec") renderList();
  }catch(e){}
}
function routeItemHtml(rt,mine){
  var pub=rt.is_public?'<span class="rbadge pub">Public</span>':'<span class="rbadge priv">Privat</span>';
  var meta=fmtKm(rt.distance_m)+' km'+(rt.duration_s?' · '+fmtDur(rt.duration_s):'');
  var h='<div class="ritem'+(selRoute===rt.id?' sel':'')+'" onclick="viewRoute('+rt.id+',this)">'
    +'<div class="rtop"><span class="rname">'+esc(rt.name)+'</span>'+pub+'</div>'
    +'<div class="rmeta">'+meta+'</div>'
    +(mine?'':'<div class="rowner">de la '+esc(rt.owner_name||"—")+'</div>')
    +'<div class="racts" onclick="event.stopPropagation()">'
    +'<button class="rbtn cyan" onclick="viewRoute('+rt.id+')">'+ic("eye",14)+' Vezi</button>'
    +'<button class="rbtn" onclick="startNav('+rt.id+')">'+ic("nav",14)+' Condu</button>';
  if(mine){
    h+='<button class="rbtn" onclick="togglePublic('+rt.id+','+(rt.is_public?0:1)+')">'+ic(rt.is_public?"lock":"unlock",14)+(rt.is_public?' Fă privat':' Fă public')+'</button>'
      +'<button class="rbtn pink" onclick="delRoute('+rt.id+')">'+ic("trash",14)+' Șterge</button>';
  }
  h+='</div></div>';
  return h;
}
function renderList(){
  var el=document.getElementById("listBody");
  if(tab==="mine"){
    var h='<div class="secttl">Traseele mele</div>';
    if(!dataMine.length) h+='<div class="empty"><div class="et">Niciun traseu încă</div><div class="es">Mergi la „Înregistrează", condu și salvează primul traseu.</div></div>';
    else h+=dataMine.map(function(rt){return routeItemHtml(rt,true);}).join("");
    el.innerHTML=h;
  } else {
    var h2='<div class="secttl">Bibliotecă · trasee publice</div>';
    if(!dataLib.length) h2+='<div class="empty"><div class="et">Biblioteca e goală</div><div class="es">Traseele publice ale utilizatorilor vor apărea aici.</div></div>';
    else h2+=dataLib.map(function(rt){return routeItemHtml(rt,false);}).join("");
    el.innerHTML=h2;
  }
}
async function viewRoute(id,elm){
  selRoute=id; renderList();
  try{
    var r=await fetch(API+"/api/my/routes/"+id,{headers:hdr()});
    var d=await r.json();
    if(!r.ok||!d.geometry){ toast(d.error||"Nu pot deschide traseul."); return; }
    if(viewLayer){map.removeLayer(viewLayer);viewLayer=null;}
    var pts=d.geometry;
    viewLayer=L.layerGroup().addTo(map);
    L.polyline(pts,{color:"#8bf9ff",weight:5,opacity:.95,className:"glowline"}).addTo(viewLayer);
    L.circleMarker(pts[0],{radius:7,color:"#22e08a",fillColor:"#22e08a",fillOpacity:1}).bindPopup("Start").addTo(viewLayer);
    L.circleMarker(pts[pts.length-1],{radius:7,color:"#ff2d95",fillColor:"#ff2d95",fillOpacity:1}).bindPopup("Final").addTo(viewLayer);
    map.fitBounds(L.polyline(pts).getBounds().pad(0.25));
  }catch(e){ toast("Eroare la deschidere."); }
}
async function togglePublic(id,pub){
  try{ var r=await fetch(API+"/api/my/routes/"+id,{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({public:!!pub})});
    if(r.ok){ toast(pub?"Traseu public ✔":"Traseu privat"); loadList(); } else toast("Eroare."); }catch(e){ toast("Eroare de rețea."); }
}
async function delRoute(id){
  if(!confirm("Ștergi acest traseu?")) return;
  try{ var r=await fetch(API+"/api/my/routes/"+id,{method:"DELETE",headers:hdr()}); if(r.ok){ toast("Șters."); if(viewLayer){map.removeLayer(viewLayer);viewLayer=null;} loadList(); } else toast("Eroare."); }catch(e){ toast("Eroare de rețea."); }
}

// ---- mod „Condu" (navigație pe un traseu salvat) ----
let navOn=false, navRoute=[], navWatch=null, lastNavPos=null;
function bearing(a,b,c,d){
  var p=Math.PI/180, y=Math.sin((d-b)*p)*Math.cos(c*p),
      x=Math.cos(a*p)*Math.sin(c*p)-Math.sin(a*p)*Math.cos(c*p)*Math.cos((d-b)*p);
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function nearestIdx(lat,lng){
  var bi=0,bd=Infinity;
  for(var i=0;i<navRoute.length;i++){ var dd=haversine(lat,lng,navRoute[i][0],navRoute[i][1]); if(dd<bd){bd=dd;bi=i;} }
  return bi;
}
async function startNav(id){
  try{
    var r=await fetch(API+"/api/my/routes/"+id,{headers:hdr()});
    var d=await r.json();
    if(!r.ok||!d.geometry||d.geometry.length<2){ toast(d.error||"Traseu indisponibil."); return; }
    navRoute=d.geometry; lastNavPos=null; navOn=true;
    if(viewLayer){map.removeLayer(viewLayer);viewLayer=null;}
    viewLayer=L.layerGroup().addTo(map);
    L.polyline(navRoute,{color:"#8bf9ff",weight:5,opacity:.95,className:"glowline"}).addTo(viewLayer);
    L.circleMarker(navRoute[0],{radius:6,color:"#22e08a",fillColor:"#22e08a",fillOpacity:1}).addTo(viewLayer);
    L.circleMarker(navRoute[navRoute.length-1],{radius:7,color:"#ff2d95",fillColor:"#ff2d95",fillOpacity:1}).bindPopup("Final").addTo(viewLayer);
    document.body.classList.add("nav-on");
    var arrow=document.getElementById("navArrow"); if(arrow) arrow.style.opacity="1";
    document.getElementById("navRemain").textContent="Pornește GPS-ul…";
    document.getElementById("navNext").textContent="";
    setTimeout(function(){ if(map){ map.invalidateSize(); map.fitBounds(L.polyline(navRoute).getBounds().pad(0.2)); } },120);
    if(!navigator.geolocation){ toast("GPS indisponibil pe acest dispozitiv."); return; }
    navWatch=navigator.geolocation.watchPosition(navPos,function(){ toast("Nu pot citi GPS-ul."); },{enableHighAccuracy:true,maximumAge:1000,timeout:15000});
  }catch(e){ toast("Eroare la pornirea navigației."); }
}
function exitNav(){
  navOn=false;
  document.body.classList.remove("nav-on");
  if(navWatch!=null){ navigator.geolocation.clearWatch(navWatch); navWatch=null; }
  setTimeout(function(){ if(map) map.invalidateSize(); },120);
}
function navPos(p){
  if(!navOn||!navRoute.length) return;
  var lat=p.coords.latitude, lng=p.coords.longitude;
  var spd=(p.coords.speed!=null&&p.coords.speed>=0)?Math.round(p.coords.speed*3.6):0;
  if(!meDot){ meDot=L.circleMarker([lat,lng],{radius:8,color:"#fff",weight:3,fillColor:"#22e08a",fillOpacity:1}).addTo(map); }
  else meDot.setLatLng([lat,lng]);
  map.setView([lat,lng],Math.max(map.getZoom(),17));
  // direcția în care e orientat șoferul
  var heading=null;
  if(p.coords.heading!=null && !isNaN(p.coords.heading) && spd>=2) heading=p.coords.heading;
  else if(lastNavPos){ var mv=haversine(lastNavPos[0],lastNavPos[1],lat,lng); if(mv>3) heading=bearing(lastNavPos[0],lastNavPos[1],lat,lng); }
  // punctul-țintă de pe traseu, puțin în față
  var idx=nearestIdx(lat,lng), ti=idx;
  while(ti<navRoute.length-1 && haversine(lat,lng,navRoute[ti][0],navRoute[ti][1])<25) ti++;
  var tgt=navRoute[ti];
  var toTgt=bearing(lat,lng,tgt[0],tgt[1]);
  var rot=(heading!=null)?(toTgt-heading):toTgt;
  var arrow=document.getElementById("navArrow"); if(arrow) arrow.style.transform="rotate("+rot+"deg)";
  // distanță rămasă de-a lungul traseului
  var rem=haversine(lat,lng,navRoute[idx][0],navRoute[idx][1]);
  for(var i=idx;i<navRoute.length-1;i++) rem+=haversine(navRoute[i][0],navRoute[i][1],navRoute[i+1][0],navRoute[i+1][1]);
  var end=navRoute[navRoute.length-1], toEnd=haversine(lat,lng,end[0],end[1]);
  var remEl=document.getElementById("navRemain"), nextEl=document.getElementById("navNext");
  if(toEnd<20){
    if(remEl){ remEl.textContent="Ai ajuns"; remEl.className="arrived"; }
    if(nextEl) nextEl.textContent="";
    if(arrow) arrow.style.opacity="0.3";
  } else {
    if(remEl){ remEl.textContent=(rem<1000?Math.round(rem)+" m":(rem/1000).toFixed(1)+" km")+" rămas"; remEl.className=""; }
    if(nextEl) nextEl.textContent="· "+spd+" km/h";
    if(arrow) arrow.style.opacity="1";
  }
  lastNavPos=[lat,lng];
}

if(!key){ document.getElementById("recHint").textContent="Lipsește codul dispozitivului — deschide din aplicație."; }
initMap();
loadList();
</script>
</body>
</html>`;
