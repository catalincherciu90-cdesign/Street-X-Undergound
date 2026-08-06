// Pagina publică de înscriere prin invitație: /join?code=XXXX
export const JOIN_HTML = /* html */ `<!doctype html>
<html lang="ro">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>Înscriere · Street X Underground</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@600;700&family=JetBrains+Mono&display=swap');
  :root{--bg:#0a0f0d;--s1:#121a16;--s2:#18221d;--s3:#202b25;--line:#263229;--line2:#3a4d43;
    --t1:#f5f8f5;--t2:#b9ccc0;--t3:#7c9488;--acc:#22e08a;--cyan:#28e0ff;--pink:#ff2d95;--danger:#ff5b60}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% 0%,#12211b,#070b09 70%);color:var(--t1);
    font-family:"Rajdhani",system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:20px}
  .card{width:100%;max-width:420px;background:var(--s1);border:1px solid var(--line2);border-radius:18px;padding:22px 20px calc(22px + env(safe-area-inset-bottom));box-shadow:0 20px 60px rgba(0,0,0,.55)}
  .logo{display:block;height:38px;margin:0 auto 8px}
  h1{font-family:"Orbitron",sans-serif;font-size:16px;letter-spacing:.08em;text-align:center;margin:6px 0 2px;color:var(--acc)}
  .sub{text-align:center;color:var(--t3);font-size:13px;margin-bottom:16px}
  label{display:block;font-size:12px;color:var(--t2);margin:12px 0 4px}
  input{width:100%;background:var(--s2);border:1px solid var(--line);color:var(--t1);border-radius:11px;padding:12px;font-size:15px;font-family:inherit}
  input:focus{outline:none;border-color:var(--acc)}
  button{width:100%;height:50px;margin-top:18px;border:none;border-radius:13px;font-weight:800;font-size:16px;
    font-family:"Rajdhani",sans-serif;letter-spacing:.03em;cursor:pointer;background:linear-gradient(180deg,#29e694,#1ec97e);color:#08130d}
  button:disabled{opacity:.6}
  .msg{margin-top:14px;text-align:center;font-size:14px;min-height:20px}
  .msg.err{color:var(--danger)} .msg.ok{color:var(--acc)}
  .ok-box{display:none;text-align:center;margin-top:10px}
  .ok-box.show{display:block}
  .ok-box .big{font-family:"Orbitron",sans-serif;color:var(--acc);font-size:20px;margin:8px 0}
  .note{font-size:12px;color:var(--t3);line-height:1.5;margin-top:10px}
</style>
</head>
<body>
<div class="card">
  <img class="logo" src="/brand/logo" alt="Street X Underground" />
  <h1>ÎNSCRIERE</h1>
  <div class="sub" id="sub">Verific invitația…</div>

  <form id="form" onsubmit="return false" style="display:none">
    <label>Numele tău</label>
    <input id="name" placeholder="ex: Andrei P." autocomplete="name" />
    <label>Utilizator (pentru login)</label>
    <input id="username" placeholder="ex: andrei" autocapitalize="off" autocorrect="off" autocomplete="username" />
    <label>Parolă</label>
    <input id="password" type="password" placeholder="alege o parolă" autocomplete="new-password" />
    <button id="btn" onclick="submitSignup()">Creează cont</button>
    <div class="msg" id="msg"></div>
  </form>

  <div class="ok-box" id="okBox">
    <div class="big">Cont creat! 🏁</div>
    <div class="note">Descarcă aplicația <b>Street X Underground</b>, instaleaz-o și loghează-te cu utilizatorul și parola alese.</div>
    <a href="/app.apk" download="street-x-underground.apk" style="display:block;text-decoration:none"><button type="button">⬇️ Descarcă aplicația (Android)</button></a>
    <div class="note" style="margin-top:12px">Dacă apare un avertisment la instalare, permite „instalarea din surse necunoscute" pentru browserul tău. Aplicația e doar pentru Android.</div>
  </div>
</div>

<script>
const params=new URLSearchParams(location.search);
const code=(params.get("code")||"").trim().toUpperCase();
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
async function init(){
  if(!code){ document.getElementById("sub").textContent="Link invalid — lipsește codul invitației."; return; }
  try{
    var r=await fetch("/api/invite/"+encodeURIComponent(code));
    var d=await r.json();
    if(!r.ok||!d.valid){ document.getElementById("sub").textContent=d.error||"Invitație invalidă sau expirată."; return; }
    document.getElementById("sub").textContent="Ai fost invitat să te înscrii. Completează datele:";
    document.getElementById("form").style.display="block";
  }catch(e){ document.getElementById("sub").textContent="Eroare de rețea. Reîncearcă."; }
}
async function submitSignup(){
  var name=document.getElementById("name").value.trim();
  var username=document.getElementById("username").value.trim();
  var password=document.getElementById("password").value;
  var msg=document.getElementById("msg"); msg.className="msg";
  if(!name){ msg.className="msg err"; msg.textContent="Pune numele tău."; return; }
  if(!username||username.length<3){ msg.className="msg err"; msg.textContent="Utilizator prea scurt (min. 3)."; return; }
  if(!password||password.length<4){ msg.className="msg err"; msg.textContent="Parolă prea scurtă (min. 4)."; return; }
  var btn=document.getElementById("btn"); btn.disabled=true; btn.textContent="Se creează…";
  try{
    var r=await fetch("/api/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:code,name:name,username:username,password:password})});
    var d=await r.json();
    if(r.ok&&d.ok){ document.getElementById("form").style.display="none"; document.getElementById("sub").style.display="none"; document.getElementById("okBox").classList.add("show"); }
    else { msg.className="msg err"; msg.textContent=d.error||"Nu s-a putut crea contul."; btn.disabled=false; btn.textContent="Creează cont"; }
  }catch(e){ msg.className="msg err"; msg.textContent="Eroare de rețea."; btn.disabled=false; btn.textContent="Creează cont"; }
}
init();
</script>
</body>
</html>`;
