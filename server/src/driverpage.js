// Pagina curierului — doar chat cu dispecerul.
// Deschisă în aplicație (WebView) la /driver?key=<device_key>. Auth: device key ca Bearer.

export const DRIVER_HTML = /* html */ `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Street X Underground — Chat</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800&family=Rajdhani:wght@500;600;700&display=swap" />
<style>
  :root{
    --bg:#0a0f0d; --s1:#121a16; --s2:#18221d; --s3:#202b25;
    --line:#263229; --line2:#3a4d43;
    --t1:#f5f8f5; --t2:#b9ccc0; --t3:#7c9488;
    --acc:#22e08a; --info:#4d9fff; --danger:#ff5b60;
    --cyan:#28e0ff; --pink:#ff2d95;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--t1);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;flex-direction:column;height:100vh;overflow:hidden}
  .ic{flex:none;vertical-align:middle}

  header{background:linear-gradient(180deg,var(--s1),transparent);border-bottom:1px solid var(--line);
    display:flex;align-items:center;gap:9px;flex:0 0 auto;
    padding:max(12px,env(safe-area-inset-top)) 16px 12px}
  .mark{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;flex:none;background:linear-gradient(160deg,#123320,#0c1a12);border:1px solid var(--line2);box-shadow:0 0 8px rgba(34,224,138,.2)}
  header .wm{font-family:"Orbitron",system-ui,sans-serif;font-weight:700;font-size:13px;letter-spacing:.08em}
  header .wm b{color:var(--acc)}
  .online{margin-left:auto;display:flex;align-items:center;gap:7px;font-size:12px;color:var(--t2)}
  .pdot{width:8px;height:8px;border-radius:50%;background:var(--acc);position:relative;flex:none}
  .pdot::after{content:"";position:absolute;inset:0;border-radius:50%;animation:pulse 1.9s infinite}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(34,224,138,.5)}70%{box-shadow:0 0 0 9px rgba(34,224,138,0)}100%{box-shadow:0 0 0 0 rgba(34,224,138,0)}}
  header .hbtn{background:var(--s3);border:1px solid var(--line2);color:var(--t2);border-radius:9px;width:36px;height:36px;display:grid;place-items:center;cursor:pointer}
  img[src$="brand/logo"]{filter:drop-shadow(0 0 5px rgba(34,224,138,.35));animation:logoBoot .9s steps(3,end) 1}
  @keyframes logoBoot{0%{opacity:.3}20%{opacity:1}30%{opacity:.5}45%{opacity:1}60%{opacity:.7}100%{opacity:1}}

  .h1{font-family:"Orbitron",system-ui,sans-serif;font-size:16px;font-weight:700;letter-spacing:.05em;padding:12px 16px 2px;color:var(--cyan);text-shadow:0 0 12px rgba(40,224,255,.35)}
  .sub{font-size:12.5px;color:var(--t3);padding:0 16px 8px;font-family:"Rajdhani",system-ui,sans-serif;letter-spacing:.03em}
  /* scanlines subtile (atmosferă underground) */
  body::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:9998;
    background:repeating-linear-gradient(0deg,rgba(0,0,0,0) 0 2px,rgba(0,0,0,.07) 2px 3px);opacity:.5}
  body::after{content:"";position:fixed;inset:0;pointer-events:none;z-index:9997;
    background:radial-gradient(ellipse at 50% -8%,rgba(40,224,255,.06),transparent 55%),radial-gradient(ellipse at 100% 112%,rgba(255,45,149,.06),transparent 55%)}
  @media (prefers-reduced-motion:reduce){body::before{display:none}}

  .chat{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;padding:0 16px}
  .chatlist{flex:1;overflow:auto;display:flex;flex-direction:column;gap:8px;padding:8px 0}
  .bub{max-width:82%;padding:9px 12px;border-radius:14px;font-size:13.5px;line-height:1.45;word-break:break-word}
  .bub.them{background:var(--s3);border:1px solid var(--line);align-self:flex-start;border-bottom-left-radius:4px}
  .bub.me{background:linear-gradient(180deg,#1f5a41,#164531);color:#eafff4;align-self:flex-end;border-bottom-right-radius:4px}
  .bub .ts{display:block;font-size:10px;opacity:.65;margin-top:4px}
  .chatin{display:flex;gap:8px;padding:8px 0 max(10px,env(safe-area-inset-bottom));align-items:flex-end;border-top:1px solid var(--line)}
  .chatin input{flex:1;background:var(--s2);border:1px solid var(--line);color:var(--t1);border-radius:12px;padding:12px;font-size:13.5px}
  .chatin input:focus{outline:none;border-color:var(--info);box-shadow:0 0 0 3px rgba(77,159,255,.15)}
  .chatin button{flex:none;width:48px;height:44px;border:none;border-radius:12px;background:linear-gradient(180deg,#29e694,#1ec97e);color:#08130d;display:grid;place-items:center;cursor:pointer}

  .empty{text-align:center;padding:52px 24px;color:var(--t2);margin:auto}
  .empty .et{font-size:15px;font-weight:600;color:var(--t1)}
  .empty .es{font-size:12.5px;color:var(--t3);margin-top:6px;max-width:250px;margin-left:auto;margin-right:auto;line-height:1.5}

  .toast{position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:var(--s3);border:1px solid var(--line2);border-radius:12px;padding:11px 18px;font-size:14px;opacity:0;transition:.2s;z-index:150;box-shadow:0 8px 24px rgba(0,0,0,.5)}
  .toast.show{opacity:1}
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>
</head>
<body>
<header>
  <span class="mark"><img src="/brand/logo" alt="SXU" style="height:22px;width:auto;max-width:22px" /></span>
  <span class="wm">STREET&nbsp;X <b>UNDERGROUND</b></span>
  <span class="online"><span class="pdot" id="onlineDot"></span><span id="onlineTxt">Online</span></span>
  <button class="hbtn" onclick="load()" title="Reîmprospătează"><span data-ic="refresh"></span></button>
  <button class="hbtn" onclick="doLogout()" title="Deconectează-te"><span data-ic="logout"></span></button>
</header>

<div class="h1">Chat cu dispecerul</div>
<div class="sub" id="who">Se încarcă…</div>

<div class="chat">
  <div class="chatlist" id="msgList"></div>
  <div class="chatin">
    <input id="msgInput" placeholder="Scrie un mesaj…" onkeydown="if(event.key==='Enter')sendDriverMsg()" autocomplete="off" />
    <button onclick="sendDriverMsg()" title="Trimite"><span data-ic="send"></span></button>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const API = location.origin;
const params = new URLSearchParams(location.search);
let key = params.get("key") || localStorage.getItem("gps_driver_key") || "";
if (params.get("key")) localStorage.setItem("gps_driver_key", key);

let messages = [], deviceName = "";

const ICP={
  refresh:'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'
};
function ic(name,size){var s=size||18;return '<svg class="ic" width="'+s+'" height="'+s+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(ICP[name]||"")+'</svg>';}
function fillIcons(root){(root||document).querySelectorAll("[data-ic]").forEach(function(el){el.innerHTML=ic(el.getAttribute("data-ic"),el.getAttribute("data-sz")||20);});}
document.addEventListener("DOMContentLoaded",function(){fillIcons();});

function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function hdr(){ return { "Authorization":"Bearer "+key }; }
function fmtWhen(ts){ try{ return new Date(ts).toLocaleString("ro-RO"); }catch(e){ return ""; } }
function toast(m){ const t=document.getElementById("toast"); t.textContent=m; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2200); }

async function load(){
  if(!key){
    document.getElementById("who").textContent="Lipsește codul dispozitivului.";
    document.getElementById("msgList").innerHTML='<div class="empty"><div class="et">Neconectat</div><div class="es">Deschide aplicația din linkul primit de la dispecer.</div></div>';
    return;
  }
  try{
    const r=await fetch(API+"/api/my/messages",{headers:hdr()});
    if(r.status===401){
      document.getElementById("who").textContent="Cod invalid.";
      document.getElementById("msgList").innerHTML='<div class="empty"><div class="et">Cod invalid</div><div class="es">Reconectează-te din aplicație.</div></div>';
      return;
    }
    const d=await r.json();
    messages=d.messages||[];
    deviceName=d.device||"";
    document.getElementById("who").textContent=deviceName?("Conectat ca "+deviceName):"Conectat";
    renderChat();
  }catch(e){ toast("Eroare de rețea."); }
}

function renderChat(){
  const el=document.getElementById("msgList");
  if(!messages.length){
    el.innerHTML='<div class="empty"><div class="et">Niciun mesaj încă</div><div class="es">Scrie-i dispecerului mai jos.</div></div>';
    return;
  }
  el.innerHTML=messages.slice().reverse().map(function(m){
    const mine=m.sender==="driver";
    return '<div class="bub '+(mine?"me":"them")+'">'+esc(m.text)+'<span class="ts">'+(mine?"Tu":"Dispecer")+' • '+fmtWhen(m.created_at)+'</span></div>';
  }).join("");
  el.scrollTop=el.scrollHeight;
}

async function sendDriverMsg(){
  const inp=document.getElementById("msgInput"); if(!inp) return;
  const t=inp.value.trim(); if(!t) return;
  inp.value="";
  try{
    await fetch(API+"/api/my/messages",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({text:t})});
    await load();
  }catch(e){ toast("Eroare la trimitere."); inp.value=t; }
}

function doLogout(){ if(!confirm("Te deconectezi din aplicație?")) return; localStorage.removeItem("gps_driver_key"); key=""; location.reload(); }

load();
setInterval(load, 15000);
</script>
</body>
</html>`;
