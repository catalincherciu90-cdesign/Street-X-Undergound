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
  #locBtn{position:absolute;right:12px;bottom:14px;z-index:600;width:48px;height:48px;border-radius:50%;
    background:rgba(18,26,22,.94);border:1px solid var(--line2);color:var(--acc);font-size:22px;
    display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)}
  #locBtn:active{transform:scale(.94)}
  #styleBtn{position:absolute;right:12px;bottom:70px;z-index:600;width:48px;height:48px;border-radius:50%;
    background:rgba(18,26,22,.94);border:1px solid var(--line2);color:var(--acc);font-size:20px;
    display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)}
  #styleBtn:active{transform:scale(.94)}
  .flagmk{background:none!important;border:none!important}
  .arrowmk{background:none!important;border:none!important}
  .flagmk .fe{font-size:24px;line-height:1;filter:drop-shadow(0 1px 2px #000);text-align:center}
  .flagmk .fl{font:700 9px/1 "Rajdhani",system-ui,sans-serif;letter-spacing:.06em;color:#08130d;padding:2px 6px;border-radius:6px;margin-top:2px;text-align:center;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.5)}

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

  /* chat prieteni */
  .chatcard{display:flex;flex-direction:column;height:min(72vh,560px);padding:0 0 env(safe-area-inset-bottom)}
  .chathead{display:flex;align-items:center;gap:8px;padding:14px 14px 12px;border-bottom:1px solid var(--line)}
  .chatname{font-family:"Orbitron",sans-serif;font-size:14px;letter-spacing:.04em;flex:1;color:var(--t1)}
  .chatx{background:none;border:none;color:var(--t3);cursor:pointer;padding:4px;display:grid;place-items:center}
  .chatbody{flex:1;overflow-y:auto;padding:12px 12px 6px;display:flex;flex-direction:column;gap:7px}
  .cbub{max-width:76%;padding:8px 11px;border-radius:13px;font-size:14px;line-height:1.35;word-wrap:break-word}
  .cbub.them{align-self:flex-start;background:var(--s3);border:1px solid var(--line);border-bottom-left-radius:4px;color:var(--t1)}
  .cbub.me{align-self:flex-end;background:linear-gradient(180deg,#1c7a52,#166540);border-bottom-right-radius:4px;color:#eafff5}
  .cbub .ct{display:block;font-size:9.5px;opacity:.6;margin-top:3px;text-align:right;font-family:var(--mono)}
  .chatempty{margin:auto;color:var(--t3);font-size:13px;text-align:center;padding:20px}
  .chatinput{display:flex;gap:8px;padding:10px 12px;border-top:1px solid var(--line)}
  .chatinput input{flex:1;background:var(--s1);border:1px solid var(--line);color:var(--t1);border-radius:22px;padding:11px 15px;font-size:14px}
  .chatsend{width:44px;height:44px;flex:0 0 44px;border-radius:50%;border:none;background:linear-gradient(180deg,#29e694,#1ec97e);color:#08130d;display:grid;place-items:center;cursor:pointer}
  .fcode{font-family:var(--mono);letter-spacing:.16em;color:var(--acc);font-weight:700}
  .fdot{width:10px;height:10px;border-radius:50%;display:inline-block;margin-right:7px;flex:0 0 10px}
  .fdot.on{background:var(--acc);box-shadow:0 0 6px var(--acc)}
  .fdot.off{background:#3a4a42}
  .unread{background:var(--pink);color:#fff;font:700 10px/1 var(--mono);padding:2px 6px;border-radius:9px;margin-left:6px}

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
  body.approach-on .navinfo b{color:#eab54a}
  body.approach-on .compass{border-color:#eab54a;box-shadow:0 0 16px rgba(234,181,74,.5)}
  #recenterBtn{position:absolute;left:50%;bottom:22px;transform:translateX(-50%);z-index:702;display:none;
    align-items:center;gap:7px;background:rgba(10,15,13,.94);border:1px solid var(--acc);color:var(--acc);
    border-radius:22px;padding:11px 18px;font-weight:700;font-family:"Rajdhani",sans-serif;font-size:14.5px;
    letter-spacing:.02em;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.55)}
  #recenterBtn:active{transform:translateX(-50%) scale(.96)}
  #ttBanner{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);z-index:720;display:none;
    text-align:center;font-family:"Orbitron",sans-serif;font-weight:800;line-height:1.15;pointer-events:none;
    padding:16px 22px;border-radius:16px;background:rgba(6,10,8,.85);border:1px solid var(--line2);box-shadow:0 8px 30px rgba(0,0,0,.6)}
  #ttBanner.show{display:block;animation:ttpop .3s ease-out}
  #ttBanner.tt-speed{color:#eab54a;border-color:#eab54a;font-size:26px}
  #ttBanner.tt-start{color:var(--acc);border-color:var(--acc);font-size:46px;letter-spacing:.1em}
  #ttBanner.tt-finish{color:var(--cyan);border-color:var(--cyan);font-size:30px}
  #ttBanner.tt-info{color:var(--t2);font-size:17px;font-family:"Rajdhani",sans-serif}
  @keyframes ttpop{from{transform:translate(-50%,-50%) scale(.7);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
  #clearBtn{position:absolute;left:12px;top:calc(12px + env(safe-area-inset-top));z-index:701;display:none;
    align-items:center;gap:6px;background:rgba(10,15,13,.92);border:1px solid var(--pink);color:var(--pink);
    border-radius:12px;padding:9px 13px;font-weight:700;font-family:"Rajdhani",sans-serif;font-size:13.5px;cursor:pointer;
    box-shadow:0 4px 14px rgba(0,0,0,.5)}
  #clearBtn:active{transform:scale(.95)}
  body.nav-on #clearBtn{display:none!important}
  #speedo{position:absolute;right:12px;bottom:128px;z-index:600;display:none;flex-direction:column;
    align-items:center;justify-content:center;width:68px;height:68px;border-radius:50%;
    background:rgba(10,15,13,.9);border:2px solid var(--cyan);
    box-shadow:0 0 14px rgba(40,224,255,.35),inset 0 0 10px rgba(40,224,255,.15)}
  #speedo b{font-family:var(--mono);font-size:23px;line-height:1;color:#eafcff;font-weight:700}
  #speedo span{font-size:8.5px;letter-spacing:.08em;color:var(--cyan);margin-top:2px;text-transform:uppercase}

  .perflink{width:100%;margin-top:10px;background:rgba(18,26,22,.6);border:1px solid var(--line2);color:var(--cyan);
    border-radius:12px;padding:11px;font-weight:700;font-family:"Rajdhani",sans-serif;font-size:14px;cursor:pointer;letter-spacing:.02em}
  .perflink:active{transform:scale(.98)}
  /* Mod performanță (Dragy-like) */
  #perfPanel{position:fixed;inset:0;z-index:3000;display:none;flex-direction:column;
    background:radial-gradient(circle at 50% 0%,#0e1a14,#060a08 70%);
    padding:max(14px,env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))}
  #perfPanel.on{display:flex}
  .perfhead{display:flex;align-items:center;gap:8px;margin-bottom:4px}
  .perfhead h2{font-family:"Orbitron",sans-serif;font-size:15px;letter-spacing:.12em;color:var(--acc);flex:1;margin:0}
  .perfhead .px{background:none;border:none;color:var(--t2);cursor:pointer;padding:6px;display:grid;place-items:center}
  .perfspeed{text-align:center;margin:8px 0 0}
  .perfspeed b{font-family:var(--mono);font-size:62px;line-height:1;color:#eafcff;font-weight:700;text-shadow:0 0 18px rgba(40,224,255,.5)}
  .perfspeed span{display:block;font-size:11px;letter-spacing:.2em;color:var(--cyan);text-transform:uppercase;margin-top:2px}
  .perfelapsed{text-align:center;font-family:var(--mono);font-size:28px;color:#eab54a;min-height:32px;margin-top:6px}
  .perfstatus{text-align:center;font-family:"Rajdhani",sans-serif;font-weight:700;font-size:14.5px;color:var(--t2);min-height:20px;margin:6px 0}
  .perfstatus.armed{color:var(--pink)} .perfstatus.run{color:var(--acc)}
  .perfgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}
  .perfcard{background:rgba(18,26,22,.85);border:1px solid var(--line2);border-radius:14px;padding:11px 12px}
  .perfcard .pl{font-size:10.5px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em}
  .perfcard .pv{font-family:var(--mono);font-size:24px;color:#eafcff;margin-top:3px}
  .perfcard .pv small{font-size:11px;color:var(--t3)}
  .perfcard .pb{font-size:10.5px;color:var(--acc);margin-top:3px;min-height:14px}
  .perfcard.hit{border-color:var(--acc);box-shadow:0 0 14px rgba(34,224,138,.25)}
  .perfbtns{margin-top:auto;display:flex;gap:10px}
  .perfbtns button{flex:1;height:54px;border-radius:14px;font-weight:800;font-size:15.5px;font-family:"Rajdhani",sans-serif;
    letter-spacing:.03em;cursor:pointer;border:1px solid var(--line2);background:var(--s3);color:var(--t1)}
  .perfbtns .arm{background:linear-gradient(180deg,#29e694,#1ec97e);color:#08130d;border-color:transparent;flex:2}
  .perfbtns .arm.armed{background:linear-gradient(180deg,#ff2d95,#d81f7d);color:#fff}
  .perfnote{font-size:10.5px;color:var(--t3);text-align:center;margin-top:8px;line-height:1.45}
  #perfCount{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:30;display:none;
    font-family:"Orbitron",sans-serif;font-weight:900;line-height:1;pointer-events:none;text-align:center}
  #perfCount.show{display:block}
  #perfCount .n{font-size:130px;animation:cnt 1s ease-out both;text-shadow:0 0 30px currentColor}
  #perfCount .go{font-size:96px;letter-spacing:.06em;animation:goflash .8s ease-out both;text-shadow:0 0 34px currentColor}
  @keyframes cnt{0%{opacity:0;transform:scale(2.3)}28%{opacity:1;transform:scale(1)}100%{opacity:.12;transform:scale(.7)}}
  @keyframes goflash{0%{opacity:0;transform:scale(.4)}45%{opacity:1;transform:scale(1.18)}100%{opacity:1;transform:scale(1)}}

  /* Roll Race */
  #racePanel{position:fixed;inset:0;z-index:3000;display:none;flex-direction:column;
    background:radial-gradient(circle at 50% 0%,#1a120e,#060a08 70%);
    padding:max(14px,env(safe-area-inset-top)) 16px calc(16px + env(safe-area-inset-bottom))}
  #racePanel.on{display:flex}
  .racebody{flex:1;overflow-y:auto;margin-top:6px}
  .racestat{text-align:center;font-family:"Rajdhani",sans-serif;font-weight:700;font-size:16px;color:var(--t1);margin:6px 0 12px}
  .racestat b{color:#ff8a3d} .racestat .racesub{display:block;font-size:12px;color:var(--t3);font-weight:600;margin-top:3px}
  .racestat.go{color:var(--acc);font-family:"Orbitron",sans-serif;letter-spacing:.05em;font-size:18px}
  .racehint{color:var(--t2);font-size:13px;text-align:center;margin:12px 4px}
  .racelbl{display:block;font-size:12px;color:var(--t2);margin:8px 2px 4px}
  .raceinp{width:100%;background:var(--s1);border:1px solid var(--line);color:var(--t1);border-radius:10px;padding:12px;font-size:18px;text-align:center;font-family:var(--mono)}
  .racenote{font-size:11px;color:var(--t3);text-align:center;margin-top:10px;line-height:1.45}
  .racelist{display:flex;flex-direction:column;gap:9px}
  .racerow{background:rgba(24,20,16,.85);border:1px solid var(--line2);border-radius:12px;padding:10px 12px}
  .racerow.me{border-color:#ff8a3d}
  .racetop{display:flex;align-items:center;gap:8px}
  .racepos{width:22px;height:22px;flex:0 0 22px;border-radius:50%;background:var(--s3);border:1px solid var(--line2);display:grid;place-items:center;font:700 12px/1 var(--mono);color:var(--t2)}
  .racename{font-weight:700;flex:1;font-family:"Rajdhani",sans-serif}
  .raceval{font-family:var(--mono);font-size:14px;color:#eafcff}
  .raceval .ok{color:var(--acc);margin-left:4px}
  .racebar{height:8px;background:var(--s1);border-radius:6px;margin-top:8px;overflow:hidden}
  .racefill{height:100%;border-radius:6px;transition:width .3s}
  #raceCount{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);z-index:30;display:none;
    font-family:"Orbitron",sans-serif;font-weight:900;text-align:center;pointer-events:none}
  #raceCount.show{display:block}
  #raceCount .n{font-size:140px;font-weight:900;animation:cnt 1s ease-out both;text-shadow:0 0 30px currentColor}
  #raceCount .go{font-size:100px;letter-spacing:.06em;animation:goflash .8s ease-out both;text-shadow:0 0 34px currentColor}
  #navExit{position:absolute;left:12px;top:calc(12px + env(safe-area-inset-top));z-index:701;display:none;
    align-items:center;gap:6px;background:rgba(10,15,13,.9);border:1px solid var(--line2);color:var(--t1);
    border-radius:12px;padding:10px 13px;font-weight:600;font-family:"Rajdhani",system-ui,sans-serif;cursor:pointer}
  body.nav-on #navExit{display:inline-flex}
  @media (prefers-reduced-motion:reduce){*{animation:none!important}}
</style>
</head>
<body>
<header>
  <img src="/brand/logo" alt="Street X Underground" style="height:34px;width:auto;max-width:170px;display:block" />
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
  <button id="recenterBtn" onclick="recenterNav()"><span data-ic="nav" data-sz="16"></span> Recentrează</button>
  <div id="ttBanner"></div>
  <button id="clearBtn" onclick="clearRouteView()"><span data-ic="x" data-sz="15"></span> Anulează</button>
  <div id="speedo"><b id="spVal">0</b><span>km/h</span></div>
  <button id="styleBtn" onclick="cycleStyle()" title="Stil hartă">🗺️</button>
  <button id="locBtn" onclick="locateMe()" title="Unde sunt">📍</button>
</div>

<!-- sheet ÎNREGISTRARE -->
<div class="sheet" id="sheetRec">
  <div class="hint" id="recHint">Apasă „Start" și condu — traseul se desenează singur.</div>
  <div class="recbar">
    <button class="recbtn start" id="recBtn" onclick="toggleRec()"><span data-ic="rec"></span> Start înregistrare</button>
  </div>
  <button class="perflink" onclick="openPerf()">⏱️ Mod performanță — 0-100, 1/4 milă, 100-200…</button>
</div>

<!-- sheet LISTE (mine / bibliotecă) -->
<div class="sheet" id="sheetList" style="display:none">
  <div class="sheetbody" id="listBody"></div>
</div>

<div class="tabs">
  <button id="tab-rec" class="on" onclick="setTab('rec')"><span class="ib" data-ic="rec"></span>Înregistrează</button>
  <button id="tab-mine" onclick="setTab('mine')"><span class="ib" data-ic="route"></span>Traseele mele</button>
  <button id="tab-lib" onclick="setTab('lib')"><span class="ib" data-ic="globe"></span>Bibliotecă</button>
  <button id="tab-party" onclick="setTab('party')"><span class="ib" data-ic="users"></span>Party</button>
  <button id="tab-friends" onclick="setTab('friends')"><span class="ib" data-ic="friend"></span>Prieteni</button>
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

<!-- modal chat cu un prieten -->
<div class="modal" id="chatModal">
  <div class="card chatcard">
    <div class="chathead">
      <span class="chatname" id="chatName">Prieten</span>
      <button class="chatx" onclick="closeChat()"><span data-ic="x" data-sz="18"></span></button>
    </div>
    <div class="chatbody" id="chatBody"></div>
    <div class="chatinput">
      <input type="text" id="chatText" placeholder="Scrie un mesaj…" autocomplete="off" onkeydown="if(event.key==='Enter')sendFriendMsg()" />
      <button class="chatsend" onclick="sendFriendMsg()"><span data-ic="send" data-sz="18"></span></button>
    </div>
  </div>
</div>

<!-- Mod performanță (Dragy-like) -->
<div id="perfPanel">
  <div class="perfhead"><h2>PERFORMANȚĂ</h2><button class="px" onclick="closePerf()"><span data-ic="x" data-sz="20"></span></button></div>
  <div class="perfspeed"><b id="perfSpd">0</b><span>km/h</span></div>
  <div class="perfelapsed" id="perfElapsed">0.00 s</div>
  <div class="perfstatus" id="perfStatus">Oprește-te complet, apoi apasă „Armează".</div>
  <div class="perfgrid" id="perfGrid"></div>
  <div class="perfbtns">
    <button class="arm" id="perfCountBtn" onclick="startCountdown()">3·2·1 GO</button>
    <button id="perfArmBtn" onclick="armPerf()">Armare rapidă</button>
  </div>
  <div class="perfnote">Măsurare pe baza GPS-ului telefonului (~1 Hz) — valorile sunt orientative. Folosește doar pe drum privat/pistă, în siguranță. · <span onclick="resetPerfBest()" style="color:var(--pink);cursor:pointer;text-decoration:underline">Șterge recordurile</span></div>
  <div id="perfCount"></div>
</div>

<!-- Roll Race (cursă la sincronizare de viteză, în party) -->
<div id="racePanel">
  <div class="perfhead"><h2>ROLL RACE</h2><button class="px" onclick="closeRace()"><span data-ic="x" data-sz="20"></span></button></div>
  <div class="perfspeed"><b id="raceSpd">0</b><span>km/h</span></div>
  <div class="racebody" id="raceBody"></div>
  <div id="raceCount"></div>
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
  users:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  copy:'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  trash:'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  eye:'<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  friend:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
  msg:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  plus:'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M9 2h6"/>'
};
function ic(n,s){var x=s||18;return '<svg class="ic" width="'+x+'" height="'+x+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+(ICP[n]||"")+'</svg>';}
function fillIcons(r){(r||document).querySelectorAll("[data-ic]").forEach(function(el){el.innerHTML=ic(el.getAttribute("data-ic"),el.getAttribute("data-sz")||20);});}
document.addEventListener("DOMContentLoaded",function(){fillIcons();});

function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}
function hdr(){return {"Authorization":"Bearer "+key};}
function toast(m){var t=document.getElementById("toast");t.textContent=m;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200);}
function setSpeed(kmh){
  var v=document.getElementById("spVal"); if(v) v.textContent=(kmh!=null&&isFinite(kmh)&&kmh>=0)?Math.round(kmh):0;
  var s=document.getElementById("speedo"); if(s&&s.style.display!=="flex") s.style.display="flex";
}
function kmhOf(p){ return (p&&p.coords&&p.coords.speed!=null&&p.coords.speed>=0)?(p.coords.speed*3.6):0; }
function fmtKm(m){return ((m||0)/1000).toFixed(1);}
function fmtDur(s){s=Math.round(s||0);var m=Math.floor(s/60),ss=s%60;return m+":"+(ss<10?"0":"")+ss;}
function haversine(a,b,c,d){var R=6371000,p=Math.PI/180,dLa=(c-a)*p,dLo=(d-b)*p,x=Math.sin(dLa/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dLo/2)**2;return 2*R*Math.asin(Math.sqrt(x));}

// ---- hartă raster (fiabilă în WebView) cu look „Underground" din filtru CSS ----
let map,recLine=null,viewLayer=null,meDot=null;
let baseLayer=null, mapStyle=(localStorage.getItem("sxu_mapstyle")||"dark");
const MAP_STYLES=[
  {id:"dark",   name:"Underground", icon:"🌃"},
  {id:"sat",    name:"Satelit",     icon:"🛰️"},
  {id:"streets",name:"Stradal",     icon:"🗺️"}
];
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
function styleDef(id){ for(var i=0;i<MAP_STYLES.length;i++){ if(MAP_STYLES[i].id===id) return MAP_STYLES[i]; } return MAP_STYLES[0]; }
function addBase(){
  if(!map) return;
  if(baseLayer){ try{ map.removeLayer(baseLayer); }catch(e){} baseLayer=null; }
  tLoad=0; tErr=0;
  var layer=L.tileLayer("/tiles/"+mapStyle+"/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap © CARTO/Esri"});
  layer.on("tileload",function(){ tLoad++; if(tLoad===1) clearMapMsg(); dbg(); });
  layer.on("tileerror",function(){ tErr++; if(tLoad===0) mapMsg("Dalele nu se încarcă (/tiles). tErr="+tErr,"#ff5b60"); dbg(); });
  layer.addTo(map);
  baseLayer=layer;
  mapMsg("Se încarcă harta…","#b9ccc0");
  setTimeout(function(){ if(tLoad===0) mapMsg("Harta nu s-a încărcat (tiles:"+tLoad+"/"+tErr+").","#ff5b60"); },6000);
}
function cycleStyle(){
  var idx=0; for(var i=0;i<MAP_STYLES.length;i++){ if(MAP_STYLES[i].id===mapStyle){ idx=i; break; } }
  var next=MAP_STYLES[(idx+1)%MAP_STYLES.length];
  mapStyle=next.id;
  try{ localStorage.setItem("sxu_mapstyle",mapStyle); }catch(e){}
  var b=document.getElementById("styleBtn"); if(b) b.textContent=next.icon;
  addBase();
  toast(next.icon+" "+next.name);
}
function initMap(){
  dbg();
  if(typeof L==="undefined"){ mapMsg("Nu s-a încărcat motorul de hartă (Leaflet).","#ff5b60"); return; }
  try{
    map=L.map("map",{zoomControl:false}).setView([45.9432,24.9668],7);
    var sb=document.getElementById("styleBtn"); if(sb) sb.textContent=styleDef(mapStyle).icon;
    addBase();
    L.control.zoom({position:"bottomleft"}).addTo(map);
    // Dacă utilizatorul mișcă/zoom-uiește harta în timpul navigației, nu-l mai recentrăm
    map.on("movestart zoomstart", function(){
      if(selfMove) return;
      navFollow=false;
      if(navOn){ var b=document.getElementById("recenterBtn"); if(b) b.style.display="flex"; }
    });
    map.on("moveend zoomend", function(){ selfMove=false; });
    var fix=function(){ if(map) map.invalidateSize(); dbg(); };
    [100,300,600,1200,2500,4000].forEach(function(t){ setTimeout(fix,t); });
    window.addEventListener("resize",fix);
    window.addEventListener("load",fix);
    if(window.ResizeObserver){ try{ new ResizeObserver(fix).observe(document.getElementById("map")); }catch(e){} }
  }catch(e){ mapMsg("Eroare hartă: "+(e&&e.message?e.message:e),"#ff5b60"); dbg(); }
}

// ---- poziția mea (pin live + centrare) ----
let locWatch=null, myPos=null, locCentered=false, meAcc=null, meHeading=0;
// săgeată orientată (verde pentru mine, portocalie pentru prieteni)
function arrowIcon(color, deg){
  var html='<div style="transform:rotate('+deg+'deg);filter:drop-shadow(0 0 5px '+color+'cc)">'
    +'<svg width="30" height="30" viewBox="0 0 24 24"><path d="M12 2 L20 21 L12 16.5 L4 21 Z" fill="'+color+'" stroke="#04120b" stroke-width="1.3" stroke-linejoin="round"/></svg></div>';
  return L.divIcon({className:"arrowmk",html:html,iconSize:[30,30],iconAnchor:[15,15]});
}
function headingOf(p, prev){
  if(p.coords.heading!=null && !isNaN(p.coords.heading) && p.coords.speed!=null && p.coords.speed>=1) return p.coords.heading;
  if(prev){ var mv=haversine(prev[0],prev[1],p.coords.latitude,p.coords.longitude); if(mv>3) return bearing(prev[0],prev[1],p.coords.latitude,p.coords.longitude); }
  return null;
}
function setMe(ll, acc, heading){
  if(!map) return;
  if(heading!=null && !isNaN(heading)) meHeading=heading;
  if(!meDot){ meDot=L.marker(ll,{icon:arrowIcon("#22e08a",meHeading),zIndexOffset:1000}).addTo(map); }
  else { meDot.setLatLng(ll); meDot.setIcon(arrowIcon("#22e08a",meHeading)); }
  if(acc && acc<3000){
    if(!meAcc){ meAcc=L.circle(ll,{radius:acc,color:"#22e08a",weight:1,opacity:.35,fillColor:"#22e08a",fillOpacity:.07}).addTo(map); }
    else { meAcc.setLatLng(ll); meAcc.setRadius(acc); }
  }
}
function startLocate(){
  if(!navigator.geolocation || locWatch!=null || !map) return;
  locWatch=navigator.geolocation.watchPosition(function(p){
    var hd=headingOf(p, myPos);
    myPos=[p.coords.latitude,p.coords.longitude];
    setMe(myPos, p.coords.accuracy, hd);
    setSpeed(kmhOf(p));
    if(!locCentered && !navOn){ locCentered=true; map.setView(myPos, 16); }
  }, function(){}, {enableHighAccuracy:true, maximumAge:5000, timeout:15000});
}
function locateMe(){
  if(navOn){ recenterNav(); return; }
  if(myPos){ map.setView(myPos, Math.max(map.getZoom(),16)); return; }
  if(!navigator.geolocation){ toast("GPS indisponibil pe acest dispozitiv."); return; }
  toast("Caut poziția…");
  navigator.geolocation.getCurrentPosition(function(p){
    myPos=[p.coords.latitude,p.coords.longitude]; setMe(myPos,p.coords.accuracy); map.setView(myPos,16); startLocate();
  }, function(){ toast("Nu pot citi GPS-ul. Verifică permisiunea de locație."); }, {enableHighAccuracy:true,timeout:15000});
}

// ---- înregistrare ----
let recording=false,recPts=[],recDist=0,recStart=0,geoWatch=null,timeTimer=null;
function toggleRec(){ recording?stopRec():startRec(); }
function startRec(){
  if(!navigator.geolocation){ toast("GPS indisponibil pe acest dispozitiv."); return; }
  clearRecDraft();
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
  document.getElementById("stSpd").textContent=spd; setSpeed(spd);
  setMe([lat,lng], null, headingOf(p, recPts.length?recPts[recPts.length-1]:myPos));
  if(!recording){ map.setView([lat,lng],15); return; }
  var last=recPts[recPts.length-1];
  if(last){ var d=haversine(last[0],last[1],lat,lng); if(d<3) return; if(d<200) recDist+=d; }
  recPts.push([lat,lng]);
  if(!recLine){ recLine=L.polyline(recPts,{color:"#8bf9ff",weight:5,opacity:.95,className:"glowline"}).addTo(map); }
  else recLine.setLatLngs(recPts);
  map.setView([lat,lng],Math.max(map.getZoom(),16));
  updateStats();
  saveRecDraft();
}
// Salvează înregistrarea în curs local, ca să nu se piardă dacă se reîncarcă pagina.
function saveRecDraft(){ try{ localStorage.setItem("sxu_rec_draft",JSON.stringify({pts:recPts,dist:recDist,start:recStart})); }catch(e){} }
function clearRecDraft(){ try{ localStorage.removeItem("sxu_rec_draft"); }catch(e){} }
function openSaveSheet(){
  document.getElementById("saveSub").textContent=fmtKm(recDist)+" km · "+fmtDur((Date.now()-recStart)/1000)+" · "+recPts.length+" puncte";
  document.getElementById("rName").value="";
  document.getElementById("rDesc").value="";
  document.getElementById("rPublic").checked=false;
  document.getElementById("liveStats").classList.remove("on");
  document.getElementById("saveModal").classList.add("on");
}
function checkRecDraft(){
  if(recording) return;
  var d=null; try{ d=JSON.parse(localStorage.getItem("sxu_rec_draft")||"null"); }catch(e){}
  if(!d||!d.pts||d.pts.length<2) return;
  recPts=d.pts; recDist=d.dist||0; recStart=d.start||Date.now();
  if(recLine){ map.removeLayer(recLine); recLine=null; }
  recLine=L.polyline(recPts,{color:"#8bf9ff",weight:5,opacity:.95,className:"glowline"}).addTo(map);
  try{ map.fitBounds(L.polyline(recPts).getBounds().pad(0.2)); }catch(e){}
  openSaveSheet();
  toast("Înregistrare nesalvată recuperată — pune un nume și salveaz-o.");
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
  document.getElementById("recHint").textContent='Apasă „Start" și condu — traseul se desenează singur.';
  if(recPts.length<2){ toast("Traseu prea scurt. Condu puțin mai mult."); document.getElementById("liveStats").classList.remove("on"); clearRecDraft(); return; }
  openSaveSheet();
}
function discardRec(){
  document.getElementById("saveModal").classList.remove("on");
  document.getElementById("liveStats").classList.remove("on");
  if(recLine){map.removeLayer(recLine);recLine=null;}
  recPts=[]; clearRecDraft();
}
async function saveRoute(){
  var name=document.getElementById("rName").value.trim();
  if(!name){ toast("Pune un nume traseului."); return; }
  var btn=document.getElementById("saveBtn");btn.disabled=true;btn.textContent="Se salvează…";
  try{
    var body={name:name,description:document.getElementById("rDesc").value.trim(),public:document.getElementById("rPublic").checked,geometry:recPts,duration_s:Math.round((Date.now()-recStart)/1000)};
    var r=await fetch(API+"/api/my/routes",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify(body)});
    var d=await r.json();
    if(r.ok&&d.id){ toast("Traseu salvat ✔"); clearRecDraft(); document.getElementById("saveModal").classList.remove("on"); document.getElementById("liveStats").classList.remove("on"); if(recLine){map.removeLayer(recLine);recLine=null;} recPts=[]; setTab("mine"); }
    else toast(d.error||"Eroare la salvare.");
  }catch(e){ toast("Eroare de rețea."); }
  btn.disabled=false;btn.textContent="Salvează";
}

// ---- taburi / liste ----
let tab="rec",dataMine=[],dataLib=[],selRoute=null;
function setTab(t){
  tab=t;
  ["rec","mine","lib","party","friends"].forEach(function(x){var el=document.getElementById("tab-"+x);if(el)el.classList.toggle("on",x===t);});
  document.getElementById("sheetRec").style.display = t==="rec"?"":"none";
  document.getElementById("sheetList").style.display = t==="rec"?"none":"";
  if(t!=="friends"){ clearFriendMarkers(); stopFriendsPolling(); }
  if(t==="party"){ renderParty(); loadParty(); }
  else if(t==="friends"){ renderFriends(); loadFriends(); }
  else if(t!=="rec"){ renderList(); }
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
  var best=ttBest[rt.id];
  var meta=fmtKm(rt.distance_m)+' km'+(rt.duration_s?' · '+fmtDur(rt.duration_s):'')+(best?' · ⏱ '+fmtClock(best):'');
  var h='<div class="ritem'+(selRoute===rt.id?' sel':'')+'" onclick="viewRoute('+rt.id+',this)">'
    +'<div class="rtop"><span class="rname">'+esc(rt.name)+'</span>'+pub+'</div>'
    +'<div class="rmeta">'+meta+'</div>'
    +(mine?'':'<div class="rowner">de la '+esc(rt.owner_name||"—")+'</div>')
    +'<div class="racts" onclick="event.stopPropagation()">'
    +'<button class="rbtn cyan" onclick="viewRoute('+rt.id+')">'+ic("eye",14)+' Vezi</button>'
    +'<button class="rbtn" onclick="startNav('+rt.id+')">'+ic("nav",14)+' Condu</button>'
    +'<button class="rbtn" onclick="startTimeTrial('+rt.id+')">'+ic("timer",14)+' Contra-timp</button>'
    +'<button class="rbtn" onclick="startParty('+rt.id+')">'+ic("users",14)+' Party</button>';
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
function flagIcon(kind){
  var finish = kind==="finish";
  var emoji = finish ? "🏁" : "🚩";
  var color = finish ? "#ff2d95" : "#22e08a";
  var label = finish ? "FINISH" : "START";
  var html='<div class="fe">'+emoji+'</div><div class="fl" style="background:'+color+'">'+label+'</div>';
  return L.divIcon({className:"flagmk",html:html,iconSize:[54,44],iconAnchor:[27,40]});
}
function addFlags(layer,pts){
  L.marker(pts[0],{icon:flagIcon("start"),zIndexOffset:1000}).bindPopup("Start").addTo(layer);
  L.marker(pts[pts.length-1],{icon:flagIcon("finish"),zIndexOffset:1000}).bindPopup("Finish").addTo(layer);
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
    addFlags(viewLayer,pts);
    map.fitBounds(L.polyline(pts).getBounds().pad(0.25));
    var cb=document.getElementById("clearBtn"); if(cb) cb.style.display="inline-flex";
  }catch(e){ toast("Eroare la deschidere."); }
}
function clearRouteView(){
  if(viewLayer){ map.removeLayer(viewLayer); viewLayer=null; }
  selRoute=null; renderList();
  var cb=document.getElementById("clearBtn"); if(cb) cb.style.display="none";
  toast("Traseu scos de pe hartă.");
}
async function togglePublic(id,pub){
  try{ var r=await fetch(API+"/api/my/routes/"+id,{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({public:!!pub})});
    if(r.ok){ toast(pub?"Traseu public ✔":"Traseu privat"); loadList(); } else toast("Eroare."); }catch(e){ toast("Eroare de rețea."); }
}
async function delRoute(id){
  if(!confirm("Ștergi acest traseu?")) return;
  try{ var r=await fetch(API+"/api/my/routes/"+id,{method:"DELETE",headers:hdr()}); if(r.ok){ toast("Șters."); if(viewLayer){map.removeLayer(viewLayer);viewLayer=null;} var cb=document.getElementById("clearBtn"); if(cb) cb.style.display="none"; loadList(); } else toast("Eroare."); }catch(e){ toast("Eroare de rețea."); }
}

// ---- mod „Condu" (navigație pe un traseu salvat) ----
let navOn=false, navRoute=[], navWatch=null, lastNavPos=null;
// fază „către start" — ghidare până la începutul traseului
let navStage=null, startPt=null, approachLine=null, approachPath=[], approachSteps=[], approachStepIdx=1;
// urmărire hartă: harta te urmează doar până când o miști tu (pan/zoom)
let navFollow=true, selfMove=false, navZoomed=false;
// contra-timp (time trial): start lansat + cronometru START→FINISH
let ttMode=false, ttRouteId=null, ttStarted=false, ttFinished=false, ttAnnounced=false, ttClockTimer=null, ttBannerTimer=null;
function loadTtBest(){ try{ return JSON.parse(localStorage.getItem("sxu_tt_best")||"{}")||{}; }catch(e){ return {}; } }
function saveTtBest(o){ ttBest=o; try{ localStorage.setItem("sxu_tt_best",JSON.stringify(o)); }catch(e){} }
let ttBest=loadTtBest();
function fmtClock(s){ var m=Math.floor(s/60), ss=(s-m*60); return m+":"+(ss<10?"0":"")+ss.toFixed(2); }
function ttBanner(html,kind,sticky){
  var b=document.getElementById("ttBanner"); if(!b) return;
  b.innerHTML=html; b.className="tt-"+(kind||"info")+" show";
  if(ttBannerTimer){ clearTimeout(ttBannerTimer); ttBannerTimer=null; }
  if(!sticky){ ttBannerTimer=setTimeout(function(){ b.classList.remove("show"); }, kind==="start"?2200:6000); }
}
function ttHideBanner(){ var b=document.getElementById("ttBanner"); if(b) b.classList.remove("show"); if(ttBannerTimer){ clearTimeout(ttBannerTimer); ttBannerTimer=null; } }
function startTtClock(){ stopTtClock(); ttClockTimer=setInterval(function(){
  if(!ttStarted||ttFinished) return;
  var el=document.getElementById("navRemain"); if(el){ el.textContent=fmtClock((Date.now()-ttT0)/1000); el.className=""; }
},100); }
function stopTtClock(){ if(ttClockTimer){ clearInterval(ttClockTimer); ttClockTimer=null; } }
let ttT0=0;
function ttStartRun(){
  if(!ttMode||ttStarted) return;
  ttStarted=true; ttT0=Date.now();
  ttBanner("START!","start",false);
  startTtClock();
}
function ttFinishRun(){
  if(!ttMode||!ttStarted||ttFinished) return;
  ttFinished=true; stopTtClock();
  var s=(Date.now()-ttT0)/1000;
  var el=document.getElementById("navRemain"); if(el){ el.textContent=fmtClock(s); el.className="arrived"; }
  var prev=ttBest[ttRouteId]; var rec=(!prev||s<prev);
  if(rec){ ttBest[ttRouteId]=s; saveTtBest(ttBest); }
  var sub=rec?"<br><span style='color:#22e08a'>RECORD NOU!</span>":(prev?"<br><span style='color:#b9ccc0;font-size:16px'>record: "+fmtClock(prev)+"</span>":"");
  ttBanner("FINISH<br>"+fmtClock(s)+sub,"finish",true);
  toast(rec?"Record nou! 🏁 "+fmtClock(s):"Timp: "+fmtClock(s));
}
function parseMaxspeed(ms){
  if(ms==null) return null; ms=(""+ms).toLowerCase().trim();
  var mph=ms.indexOf("mph")>=0;
  var num=parseInt(ms,10);
  if(!isNaN(num)&&num>0) return mph?Math.round(num*1.60934):num;
  var map={"ro:urban":50,"ro:rural":90,"ro:trunk":100,"ro:motorway":130,"ro:living_street":20,
    "urban":50,"rural":90,"trunk":100,"motorway":130,"living_street":20,"walk":5,"none":130};
  var k=ms.replace(/\\s+/g,"");
  if(map[ms]!=null) return map[ms];
  if(map[k]!=null) return map[k];
  return null;
}
async function fetchSpeedLimit(lat,lng){
  try{
    var q="[out:json][timeout:8];way(around:60,"+lat+","+lng+")[highway][maxspeed];out tags 3;";
    var r=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",headers:{"Content-Type":"text/plain"},body:q});
    var d=await r.json();
    if(d&&d.elements){ for(var i=0;i<d.elements.length;i++){ var v=parseMaxspeed(d.elements[i].tags&&d.elements[i].tags.maxspeed); if(v) return v; } }
  }catch(e){}
  return null;
}
async function ttAnnounce(){
  ttAnnounced=true;
  ttBanner("Aduc limita zonei…","info",false);
  var v=await fetchSpeedLimit(startPt[0],startPt[1]);
  if(!ttMode||ttStarted) return;
  if(v) ttBanner("Start lansat<br>intră la "+v+" km/h","speed",false);
  else ttBanner("Start lansat<br>intră la viteza legală a zonei","speed",false);
}
function navSetView(ll){
  if(!map) return;
  selfMove=true;
  var z = navZoomed ? map.getZoom() : 17;
  navZoomed=true;
  map.setView(ll, z, {animate:false});
}
function recenterNav(){
  navFollow=true; navZoomed=false; // revino la nivelul de zoom pentru navigație
  var b=document.getElementById("recenterBtn"); if(b) b.style.display="none";
  if(lastNavPos) navSetView(lastNavPos);
  else if(myPos) navSetView(myPos);
}
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
function startTimeTrial(id){ startNav(id,true); }
async function startNav(id,tt){
  try{
    var r=await fetch(API+"/api/my/routes/"+id,{headers:hdr()});
    var d=await r.json();
    if(!r.ok||!d.geometry||d.geometry.length<2){ toast(d.error||"Traseu indisponibil."); return; }
    navRoute=d.geometry; lastNavPos=null; navOn=true;
    ttMode=!!tt; ttRouteId=id; ttStarted=false; ttFinished=false; ttAnnounced=false; stopTtClock(); ttHideBanner();
    if(ttMode) toast("Contra-timp — du-te la START, cronometrez de la linia de start.");
    navStage=null; startPt=navRoute[0]; approachPath=[]; approachSteps=[]; approachStepIdx=1;
    navFollow=true; navZoomed=false;
    var rb=document.getElementById("recenterBtn"); if(rb) rb.style.display="none";
    if(approachLine){map.removeLayer(approachLine);approachLine=null;}
    if(viewLayer){map.removeLayer(viewLayer);viewLayer=null;}
    viewLayer=L.layerGroup().addTo(map);
    L.polyline(navRoute,{color:"#8bf9ff",weight:5,opacity:.95,className:"glowline"}).addTo(viewLayer);
    addFlags(viewLayer,navRoute);
    document.body.classList.add("nav-on");
    var arrow=document.getElementById("navArrow"); if(arrow) arrow.style.opacity="1";
    document.getElementById("navRemain").textContent="Pornește GPS-ul…";
    document.getElementById("navNext").textContent="";
    setTimeout(function(){ if(map){ map.invalidateSize(); selfMove=true; map.fitBounds(L.polyline(navRoute).getBounds().pad(0.2)); } },120);
    if(!navigator.geolocation){ toast("GPS indisponibil pe acest dispozitiv."); return; }
    navWatch=navigator.geolocation.watchPosition(navPos,function(){ toast("Nu pot citi GPS-ul."); },{enableHighAccuracy:true,maximumAge:1000,timeout:15000});
  }catch(e){ toast("Eroare la pornirea navigației."); }
}
function exitNav(){
  navOn=false; navStage=null;
  ttMode=false; ttStarted=false; ttFinished=false; stopTtClock(); ttHideBanner();
  document.body.classList.remove("nav-on"); document.body.classList.remove("approach-on");
  var rb=document.getElementById("recenterBtn"); if(rb) rb.style.display="none";
  if(approachLine){ map.removeLayer(approachLine); approachLine=null; }
  if(navWatch!=null){ navigator.geolocation.clearWatch(navWatch); navWatch=null; }
  setTimeout(function(){ if(map) map.invalidateSize(); },120);
  var cb=document.getElementById("clearBtn"); if(cb) cb.style.display = viewLayer?"inline-flex":"none";
}
// ---- ghidare până la START (OSRM) ----
function dirTxt(mod){ if(mod&&mod.indexOf("left")>=0) return "stânga"; if(mod&&mod.indexOf("right")>=0) return "dreapta"; return "înainte"; }
function virTxt(mod){
  switch(mod){
    case "left": return "Virează la stânga"; case "right": return "Virează la dreapta";
    case "slight left": return "Ușor la stânga"; case "slight right": return "Ușor la dreapta";
    case "sharp left": return "Strâns la stânga"; case "sharp right": return "Strâns la dreapta";
    case "uturn": return "Întoarcere"; default: return "Continuă înainte";
  }
}
function osrmStepText(st){
  var m=st.maneuver||{}, t=m.type||"", mod=m.modifier||"", nm=st.name||"";
  var onName=nm?(" pe "+nm):"";
  if(t==="depart") return "Pornește"+onName;
  if(t==="arrive") return "Ai ajuns la start";
  if(t==="roundabout"||t==="rotary"){ return "La sensul giratoriu"+(m.exit?(" ieșirea "+m.exit):""); }
  if(t==="merge") return "Intră"+onName;
  if(t==="fork") return "La bifurcație, ține "+dirTxt(mod);
  if(t==="end of road") return "La capăt, "+dirTxt(mod);
  if(t==="on ramp"||t==="off ramp") return "Ia breteaua "+dirTxt(mod);
  if(mod==="straight"||!mod) return "Continuă înainte"+onName;
  return virTxt(mod)+onName;
}
async function buildApproach(lat,lng){
  approachPath=[]; approachSteps=[]; approachStepIdx=1;
  if(approachLine){ map.removeLayer(approachLine); approachLine=null; }
  var s=startPt;
  try{
    var url="https://router.project-osrm.org/route/v1/driving/"+lng+","+lat+";"+s[1]+","+s[0]+"?overview=full&geometries=geojson&steps=true";
    var r=await fetch(url); var d=await r.json();
    if(d&&d.routes&&d.routes[0]){
      approachPath=d.routes[0].geometry.coordinates.map(function(c){return [c[1],c[0]];});
      var legs=d.routes[0].legs||[];
      if(legs[0]&&legs[0].steps) approachSteps=legs[0].steps.map(function(st){ return {loc:[st.maneuver.location[1],st.maneuver.location[0]], text:osrmStepText(st)}; });
    }
  }catch(e){}
  if(approachPath.length<2) approachPath=[[lat,lng],[s[0],s[1]]]; // fallback: linie dreaptă
  // pentru fiecare manevră, reține indexul ei pe traseu (ca să avansăm după progres)
  approachSteps.forEach(function(st){ st.pathIdx=nearestPathIdx(approachPath, st.loc); });
  if(map) approachLine=L.polyline(approachPath,{color:"#eab54a",weight:5,opacity:.9,dashArray:"2 9",lineCap:"round"}).addTo(map);
  toast("Te duc întâi la start ("+(haversine(lat,lng,s[0],s[1])/1000).toFixed(1)+" km)");
}
function nearestPathIdx(path,ll){
  var bi=0,bd=Infinity;
  for(var i=0;i<path.length;i++){ var dd=haversine(ll[0],ll[1],path[i][0],path[i][1]); if(dd<bd){bd=dd;bi=i;} }
  return bi;
}
function nextManeuver(lat,lng){
  if(!approachSteps.length) return null;
  // avansează după progresul pe traseu: prima manevră al cărei punct e încă în față
  var cur=nearestPathIdx(approachPath,[lat,lng]);
  for(var i=0;i<approachSteps.length;i++){
    if(approachSteps[i].pathIdx != null && approachSteps[i].pathIdx > cur+1) return approachSteps[i].text;
  }
  return approachSteps[approachSteps.length-1].text; // aproape de start → ultima instrucțiune
}
function switchToRoute(lat,lng){
  navStage="route";
  document.body.classList.remove("approach-on");
  if(approachLine){ map.removeLayer(approachLine); approachLine=null; }
  approachPath=[]; approachSteps=[];
  if(ttMode) ttStartRun(); else toast("Ai ajuns la start! 🏁 Traseul începe.");
  routeGuide(lat,lng,0,null);
}
function approachGuide(lat,lng,spd,heading){
  var dStart=haversine(lat,lng,startPt[0],startPt[1]);
  // contra-timp: cu ~1 km înainte de start, anunță viteza de intrare (limita zonei)
  if(ttMode && !ttAnnounced && dStart<=1050 && dStart>45) ttAnnounce();
  if(dStart<40){ switchToRoute(lat,lng); return; }
  var tgt=startPt, remain=dStart, nextTxt="spre START";
  if(approachPath.length>1){
    var bi=0,bd=Infinity;
    for(var i=0;i<approachPath.length;i++){ var dd=haversine(lat,lng,approachPath[i][0],approachPath[i][1]); if(dd<bd){bd=dd;bi=i;} }
    var ti=bi; while(ti<approachPath.length-1 && haversine(lat,lng,approachPath[ti][0],approachPath[ti][1])<25) ti++;
    tgt=approachPath[ti];
    remain=haversine(lat,lng,approachPath[bi][0],approachPath[bi][1]);
    for(var j=bi;j<approachPath.length-1;j++) remain+=haversine(approachPath[j][0],approachPath[j][1],approachPath[j+1][0],approachPath[j+1][1]);
    var st=nextManeuver(lat,lng); if(st) nextTxt=st;
  }
  var toTgt=bearing(lat,lng,tgt[0],tgt[1]);
  var rot=(heading!=null)?(toTgt-heading):toTgt;
  var arrow=document.getElementById("navArrow"); if(arrow){ arrow.style.opacity="1"; arrow.style.transform="rotate("+rot+"deg)"; }
  var remEl=document.getElementById("navRemain"), nextEl=document.getElementById("navNext");
  var ds=(remain<1000?Math.round(remain)+" m":(remain/1000).toFixed(1)+" km");
  if(remEl){ remEl.textContent="→ "+nextTxt; remEl.className=""; }
  if(nextEl) nextEl.textContent="· "+ds+" până la START";
}
function navPos(p){
  if(!navOn||!navRoute.length) return;
  var lat=p.coords.latitude, lng=p.coords.longitude;
  var spd=(p.coords.speed!=null&&p.coords.speed>=0)?Math.round(p.coords.speed*3.6):0;
  setSpeed(spd);
  // direcția în care e orientat șoferul
  var heading=null;
  if(p.coords.heading!=null && !isNaN(p.coords.heading) && spd>=2) heading=p.coords.heading;
  else if(lastNavPos){ var mv=haversine(lastNavPos[0],lastNavPos[1],lat,lng); if(mv>3) heading=bearing(lastNavPos[0],lastNavPos[1],lat,lng); }
  setMe([lat,lng], null, heading);
  if(navFollow) navSetView([lat,lng]);
  // decide faza la prima poziție: dacă ești departe de start, ghidează-te întâi acolo
  if(navStage===null){
    var d0=haversine(lat,lng,startPt[0],startPt[1]);
    if(d0>60){ navStage="approach"; document.body.classList.add("approach-on"); buildApproach(lat,lng); }
    else { navStage="route"; if(ttMode) ttStartRun(); }
  }
  if(navStage==="approach"){ approachGuide(lat,lng,spd,heading); lastNavPos=[lat,lng]; return; }
  routeGuide(lat,lng,spd,heading);
  lastNavPos=[lat,lng];
}
function routeGuide(lat,lng,spd,heading){
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
  // mod contra-timp: cronometrul deține afișajul; oprim la FINISH
  if(ttMode && ttStarted){
    if(toEnd<20 && !ttFinished){ ttFinishRun(); if(arrow) arrow.style.opacity="0.3"; return; }
    if(!ttFinished){ if(nextEl) nextEl.textContent="· "+spd+" km/h · contra-timp"; if(arrow) arrow.style.opacity="1"; }
    return;
  }
  if(toEnd<20){
    if(remEl){ remEl.textContent="Ai ajuns"; remEl.className="arrived"; }
    if(nextEl) nextEl.textContent="";
    if(arrow) arrow.style.opacity="0.3";
  } else {
    if(remEl){ remEl.textContent=(rem<1000?Math.round(rem)+" m":(rem/1000).toFixed(1)+" km")+" rămas"; remEl.className=""; }
    if(nextEl) nextEl.textContent="· "+spd+" km/h";
    if(arrow) arrow.style.opacity="1";
  }
}

// ---- Party (condus împreună, poziții live) ----
let party=null, partyTimer=null, partyMarkers={}, partyRouteLayer=null;
function memberIcon(m){
  var html='<div style="display:flex;flex-direction:column;align-items:center">'
    +'<div style="width:16px;height:16px;border-radius:50%;background:'+m.color+';border:2px solid #fff;box-shadow:0 0 8px '+m.color+'"></div>'
    +'<div style="margin-top:2px;background:rgba(10,15,13,.88);color:#fff;font:700 9px/1 \\'Rajdhani\\',sans-serif;padding:2px 6px;border-radius:6px;white-space:nowrap;border:1px solid '+m.color+'">'+esc(m.name||"?")+'</div>'
    +'</div>';
  return L.divIcon({className:"flagmk",html:html,iconSize:[64,36],iconAnchor:[32,10]});
}
function renderPartyMembers(members){
  if(!map) return;
  Object.keys(partyMarkers).forEach(function(k){ map.removeLayer(partyMarkers[k]); }); partyMarkers={};
  (members||[]).forEach(function(m,i){
    if(m.me || m.lat==null || m.lng==null) return;
    partyMarkers[i]=L.marker([m.lat,m.lng],{icon:memberIcon(m),zIndexOffset:900}).addTo(map);
  });
}
async function drawPartyRoute(){
  try{
    var r=await fetch(API+"/api/my/party/route",{headers:hdr()}); var d=await r.json();
    if(partyRouteLayer){ map.removeLayer(partyRouteLayer); partyRouteLayer=null; }
    if(!d.geometry||d.geometry.length<2) return;
    partyRouteLayer=L.layerGroup().addTo(map);
    L.polyline(d.geometry,{color:"#8bf9ff",weight:5,opacity:.95,className:"glowline"}).addTo(partyRouteLayer);
    addFlags(partyRouteLayer,d.geometry);
    map.fitBounds(L.polyline(d.geometry).getBounds().pad(0.25));
  }catch(e){}
}
async function loadParty(){
  if(!key) return;
  try{
    var r=await fetch(API+"/api/my/party",{headers:hdr()}); var d=await r.json();
    if(d.in_party){
      var wasNull=!party; party=d;
      if(wasNull && d.route_id) drawPartyRoute();
      startPartyPolling();
    } else { party=null; stopPartyPolling(); clearPartyMap(); }
    if(tab==="party") renderParty();
  }catch(e){}
}
function clearPartyMap(){
  Object.keys(partyMarkers).forEach(function(k){ if(map) map.removeLayer(partyMarkers[k]); }); partyMarkers={};
  if(partyRouteLayer && map){ map.removeLayer(partyRouteLayer); partyRouteLayer=null; }
}
async function partyTick(){
  if(!party) return;
  try{
    if(myPos){ fetch(API+"/api/my/party/pos",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({lat:myPos[0],lng:myPos[1]})}); }
    var r=await fetch(API+"/api/my/party",{headers:hdr()}); var d=await r.json();
    if(!d.in_party){ leavePartyLocal(); return; }
    party=d; renderPartyMembers(d.members);
    if(tab==="party") renderParty();
  }catch(e){}
}
function startPartyPolling(){ stopPartyPolling(); partyTimer=setInterval(partyTick,1000); partyTick(); }
function stopPartyPolling(){ if(partyTimer){ clearInterval(partyTimer); partyTimer=null; } }
async function startParty(routeId){
  try{
    var r=await fetch(API+"/api/my/party/create",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({route_id:routeId})});
    var d=await r.json();
    if(r.ok&&d.code){ toast("Party creat! Cod: "+d.code); setTab("party"); loadParty(); }
    else toast(d.error||"Eroare la creare party.");
  }catch(e){ toast("Eroare de rețea."); }
}
async function joinParty(){
  var inp=document.getElementById("partyCode"); var code=inp?inp.value.trim().toUpperCase():"";
  if(!code){ toast("Scrie un cod de party."); return; }
  try{
    var r=await fetch(API+"/api/my/party/join",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({code:code})});
    var d=await r.json();
    if(r.ok){ toast("Ai intrat în party!"); party=null; loadParty(); }
    else toast(d.error||"Cod invalid.");
  }catch(e){ toast("Eroare de rețea."); }
}
async function leaveParty(){
  try{ await fetch(API+"/api/my/party/leave",{method:"POST",headers:hdr()}); }catch(e){}
  leavePartyLocal();
}
function leavePartyLocal(){
  party=null; stopPartyPolling();
  clearPartyMap();
  if(tab==="party") renderParty();
  toast("Ai ieșit din party.");
}
function copyParty(code){
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(code).then(function(){ toast("Cod copiat: "+code); },function(){ toast("Cod: "+code); }); }
  else toast("Cod: "+code);
}
function renderParty(){
  var el=document.getElementById("listBody"); if(!el) return;
  if(!party){
    el.innerHTML='<div class="secttl">Party — condu cu prietenii</div>'
      +'<div class="empty"><div class="et">Nu ești într-un party</div><div class="es">Creează un party de la un traseu (butonul „Party") sau intră cu un cod primit.</div></div>'
      +'<input id="partyCode" placeholder="COD PARTY" style="text-transform:uppercase;width:100%;background:var(--s1);border:1px solid var(--line);color:var(--t1);border-radius:10px;padding:12px;font-size:16px;letter-spacing:.15em;text-align:center;font-family:ui-monospace,monospace" autocomplete="off" />'
      +'<button class="recbtn start" style="height:46px;margin-top:8px" onclick="joinParty()">Intră în party</button>';
    return;
  }
  var mem=party.members||[];
  var list=mem.map(function(m){
    var on=m.at&&(Date.now()-m.at<60000);
    return '<div class="ritem" style="cursor:default"><div class="rtop">'
      +'<span style="width:14px;height:14px;border-radius:50%;background:'+m.color+';display:inline-block;margin-right:8px;box-shadow:0 0 6px '+m.color+'"></span>'
      +'<span class="rname">'+esc(m.name||"?")+(m.me?" (tu)":"")+'</span>'
      +'<span class="rbadge '+(on?"pub":"priv")+'">'+(on?"live":"—")+'</span></div></div>';
  }).join("");
  el.innerHTML='<div class="secttl">Party activ</div>'
    +'<div class="ritem" style="cursor:default"><div class="rtop"><span class="rname">Cod: <b style="color:var(--acc);letter-spacing:.14em;font-family:ui-monospace,monospace">'+esc(party.code)+'</b></span>'
    +'<button class="rbtn cyan" onclick="copyParty(\\''+esc(party.code)+'\\')">'+ic("copy",14)+' Copiază</button></div>'
    +'<div class="rmeta">Trimite codul prietenilor ca să intre în party.</div></div>'
    +'<div style="margin:8px 2px 4px;font-size:12px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Membri ('+mem.length+')</div>'
    +list
    +'<button class="recbtn" style="height:48px;margin-top:12px;background:linear-gradient(180deg,#ff8a3d,#e56a1c);color:#160a02;border:none;font-weight:800" onclick="openRace()">🏁 Roll Race — cursă la sincron (1 km)</button>'
    +'<button class="recbtn stop" style="height:44px;margin-top:8px" onclick="leaveParty()">Ieși din party</button>';
}

// ---- Roll Race (SYNC la viteza mea → 3·2·1 + goarnă → cursă 1 km) ----
let raceOn=false, raceWatch=null, raceTimer=null, raceState=null;
let raceLastPos=null, raceLastT=0, raceDist=0, raceStartedSeen=false, raceCurSpeed=0;
let raceCdTimers=[], raceCdScheduled=false, audioCtx=null;
function ensureAudio(){ try{ if(!audioCtx){ var AC=window.AudioContext||window.webkitAudioContext; if(AC) audioCtx=new AC(); } if(audioCtx&&audioCtx.state==="suspended") audioCtx.resume(); }catch(e){} }
function beep(freq,dur,type,vol){
  if(!audioCtx) return;
  try{ var o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type||"sawtooth"; o.frequency.value=freq; o.connect(g); g.connect(audioCtx.destination);
    var t=audioCtx.currentTime; g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol||0.25,t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.start(t); o.stop(t+dur+0.03);
  }catch(e){}
}
function playHorn(long){ var d=long?0.7:0.22; beep(330,d,"sawtooth",0.32); beep(392,d,"square",0.16); }
function clearRaceCd(){ raceCdTimers.forEach(clearTimeout); raceCdTimers=[]; var c=document.getElementById("raceCount"); if(c){ c.classList.remove("show"); c.innerHTML=""; } }
function showRaceCount(txt,isGo,color){ var c=document.getElementById("raceCount"); if(!c) return; c.classList.add("show"); c.innerHTML='<div class="'+(isGo?"go":"n")+'" style="color:'+(color||"#fff")+'">'+txt+'</div>'; }
function startRaceCountdown(goAt){
  if(!goAt) return;
  clearRaceCd(); ensureAudio();
  var now=Date.now(), cols={3:"#ff5b60",2:"#eab54a",1:"#28e0ff"};
  [3,2,1].forEach(function(n){ raceCdTimers.push(setTimeout(function(){ showRaceCount(""+n,false,cols[n]); beep(640,0.16,"square",0.32); }, Math.max(0,(goAt-n*1000)-now))); });
  raceCdTimers.push(setTimeout(function(){ showRaceCount("GO!",true,"#22e08a"); playHorn(true); }, Math.max(0,goAt-now)));
  raceCdTimers.push(setTimeout(clearRaceCd, Math.max(0,goAt-now)+1400));
}
function openRace(){
  var pp=document.getElementById("racePanel"); if(!pp) return;
  ensureAudio();
  raceOn=true; raceState=null; raceStartedSeen=false; raceDist=0; raceLastPos=null; raceLastT=0; raceCurSpeed=0; raceCdScheduled=false; clearRaceCd();
  renderRace(); pp.classList.add("on");
  if(navigator.geolocation){ raceWatch=navigator.geolocation.watchPosition(racePos,function(){ toast("Nu pot citi GPS-ul."); },{enableHighAccuracy:true,maximumAge:0,timeout:20000}); }
  if(raceTimer) clearInterval(raceTimer); raceTimer=setInterval(raceTick,700); raceTick();
}
function closeRace(){
  raceOn=false; clearRaceCd();
  if(raceWatch!=null&&navigator.geolocation){ navigator.geolocation.clearWatch(raceWatch); raceWatch=null; }
  if(raceTimer){ clearInterval(raceTimer); raceTimer=null; }
  var pp=document.getElementById("racePanel"); if(pp) pp.classList.remove("on");
}
function racePos(p){
  var t=p.timestamp||Date.now();
  var lat=p.coords.latitude,lng=p.coords.longitude,pos=[lat,lng],spd;
  if(p.coords.speed!=null&&p.coords.speed>=0) spd=p.coords.speed*3.6;
  else if(raceLastPos){ var dd=haversine(raceLastPos[0],raceLastPos[1],lat,lng); var dt=(t-raceLastT)/1000; spd=dt>0?dd/dt*3.6:0; } else spd=0;
  raceCurSpeed=spd;
  var sv=document.getElementById("raceSpd"); if(sv) sv.textContent=Math.round(spd);
  if(raceState && raceState.status==="racing" && raceStartedSeen && raceLastPos){ raceDist += haversine(raceLastPos[0],raceLastPos[1],lat,lng); }
  raceLastPos=pos; raceLastT=t;
}
async function raceTick(){
  if(!raceOn) return;
  try{
    fetch(API+"/api/my/party/race/tick",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({speed:raceCurSpeed,dist:raceDist})});
    var r=await fetch(API+"/api/my/party/race",{headers:hdr()}); var d=await r.json();
    if(!d.in_race){ raceState=null; raceCdScheduled=false; clearRaceCd(); renderRace(); return; }
    if(d.status==="lobby"){ raceCdScheduled=false; }
    if(d.status==="countdown" && !raceCdScheduled && d.started_at){ raceCdScheduled=true; startRaceCountdown(d.started_at); }
    if(d.status==="racing" && !raceStartedSeen){ raceStartedSeen=true; raceDist=0; }
    raceState=d; renderRace();
  }catch(e){}
}
async function startRace(){
  ensureAudio();
  var sp=Math.round(raceCurSpeed);
  if(!isFinite(sp)||sp<3){ toast("Adu mașina la viteza dorită, apoi apasă SYNC."); return; }
  raceStartedSeen=false; raceDist=0; raceCdScheduled=false; clearRaceCd();
  try{
    var r=await fetch(API+"/api/my/party/race/start",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({sync_speed:sp})});
    var d=await r.json();
    if(r.ok){ toast("SYNC la "+(d.sync_speed||sp)+" km/h — ceilalți se aduc la viteză!"); raceTick(); }
    else toast(d.error||"Eroare la pornirea cursei.");
  }catch(e){ toast("Eroare de rețea."); }
}
async function stopRace(){
  try{ await fetch(API+"/api/my/party/race/stop",{method:"POST",headers:hdr()}); }catch(e){}
  raceState=null; raceStartedSeen=false; raceCdScheduled=false; clearRaceCd(); renderRace(); raceTick();
}
function renderRace(){
  var el=document.getElementById("raceBody"); if(!el) return;
  var s=raceState;
  if(!s){
    el.innerHTML='<div class="racehint">Adu mașina la viteza dorită și apasă <b style="color:#ff8a3d">SYNC</b> — se ia viteza ta din acel moment ca țintă. Ceilalți se aduc la aceeași viteză, apoi <b>3·2·1 + goarnă</b> și GO. Primul la 1 km câștigă.</div>'
      +'<button class="recbtn start" style="height:66px;margin-top:14px;font-size:22px;letter-spacing:.04em" onclick="startRace()">SYNC la viteza mea</button>'
      +'<div class="racenote">Trebuie să fiți cel puțin 2 în party. Pe drum privat/pistă, cu un pasager care ține telefonul.</div>';
    return;
  }
  var head="";
  if(s.status==="lobby") head='<div class="racestat">Aduceți viteza la <b>'+s.sync_speed+' km/h</b><span class="racesub">3·2·1 automat când toți sunteți sincronizați (±'+s.tol+' km/h)</span></div>';
  else if(s.status==="countdown") head='<div class="racestat go">SINCRONIZAT — pregătiți-vă!</div>';
  else if(s.status==="racing") head='<div class="racestat go">CURSĂ! primul la 1 km câștigă</div>';
  else head='<div class="racestat">Rezultate · cursă 1 km</div>';
  var members=(s.members||[]).slice();
  if(s.status==="done") members.sort(function(a,b){ var fa=a.finish==null?Infinity:a.finish, fb=b.finish==null?Infinity:b.finish; return fa-fb; });
  else if(s.status==="racing") members.sort(function(a,b){ return (b.dist||0)-(a.dist||0); });
  var showBar=(s.status==="racing"||s.status==="done");
  var showPos=(s.status==="racing"||s.status==="done");
  var rows=members.map(function(m,i){
    var pct=Math.max(0,Math.min(100,(m.dist||0)/(s.dist_target||1000)*100));
    var right="";
    if(s.status==="lobby"||s.status==="countdown") right=(m.speed!=null?Math.round(m.speed)+' km/h':(m.online?'—':'offline'))+(m.synced?' <span class="ok">✔</span>':'');
    else if(s.status==="racing") right=(m.finish!=null?('🏁 '+fmtClock(m.finish/1000)):Math.round(m.dist||0)+' m');
    else right=(m.finish!=null?fmtClock(m.finish/1000):'DNF');
    var pos=showPos?('<span class="racepos">'+(i+1)+'</span>'):'';
    return '<div class="racerow'+(m.me?" me":"")+'"><div class="racetop">'+pos
      +'<span class="racename" style="color:'+m.color+'">'+esc(m.name||"?")+(m.me?" (tu)":"")+'</span>'
      +'<span class="raceval">'+right+'</span></div>'
      +(showBar?('<div class="racebar"><div class="racefill" style="width:'+pct.toFixed(0)+'%;background:'+m.color+'"></div></div>'):"")
      +'</div>';
  }).join("");
  var btns="";
  if(s.status==="done") btns='<button class="recbtn start" style="height:46px;margin-top:12px" onclick="stopRace()">Cursă nouă</button>';
  else btns='<button class="recbtn stop" style="height:44px;margin-top:12px" onclick="stopRace()">'+(s.status==="lobby"||s.status==="countdown"?"Anulează":"Oprește cursa")+'</button>';
  el.innerHTML=head+'<div class="racelist">'+rows+'</div>'+btns;
}

// ---- Prieteni (listă, cod, party fără cod, poziții live, mesaje) ----
let friends=[], myCode=null, friendMarkers={}, friendsTimer=null, chatWith=null, chatTimer=null;
let friendPrev={}, friendHeading={};
function clearFriendMarkers(){
  Object.keys(friendMarkers).forEach(function(k){ if(map) map.removeLayer(friendMarkers[k]); });
  friendMarkers={}; friendPrev={}; friendHeading={};
}
function friendArrowIcon(name, deg){
  var c="#ff8a3d";
  var html='<div style="display:flex;flex-direction:column;align-items:center">'
    +'<div style="transform:rotate('+deg+'deg);filter:drop-shadow(0 0 5px '+c+'cc)"><svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 2 L20 21 L12 16.5 L4 21 Z" fill="'+c+'" stroke="#160a02" stroke-width="1.3" stroke-linejoin="round"/></svg></div>'
    +'<div style="margin-top:1px;background:rgba(10,15,13,.88);color:#fff;font:700 9px/1 \\'Rajdhani\\',sans-serif;padding:2px 6px;border-radius:6px;white-space:nowrap;border:1px solid '+c+'">'+esc(name||"?")+'</div>'
    +'</div>';
  return L.divIcon({className:"arrowmk",html:html,iconSize:[60,42],iconAnchor:[30,14]});
}
function drawFriendMarkers(){
  if(!map || tab!=="friends") return;
  var keep={};
  friends.forEach(function(f){
    if(f.lat==null||f.lng==null) return;
    keep[f.id]=1;
    var prev=friendPrev[f.id], deg=friendHeading[f.id]||0;
    if(prev){ var mv=haversine(prev[0],prev[1],f.lat,f.lng); if(mv>4){ deg=bearing(prev[0],prev[1],f.lat,f.lng); friendHeading[f.id]=deg; } }
    friendPrev[f.id]=[f.lat,f.lng];
    if(friendMarkers[f.id]){ friendMarkers[f.id].setLatLng([f.lat,f.lng]); friendMarkers[f.id].setIcon(friendArrowIcon(f.name,deg)); }
    else friendMarkers[f.id]=L.marker([f.lat,f.lng],{icon:friendArrowIcon(f.name,deg),zIndexOffset:850}).addTo(map);
  });
  Object.keys(friendMarkers).forEach(function(k){ if(!keep[k]){ if(map)map.removeLayer(friendMarkers[k]); delete friendMarkers[k]; } });
}
async function loadMe(){
  if(!key) return;
  try{ var r=await fetch(API+"/api/my/me",{headers:hdr()}); var d=await r.json();
    if(r.ok&&d.friend_code){ myCode=d.friend_code; if(tab==="friends") renderFriends(); } }catch(e){}
}
function startFriendsPolling(){ if(friendsTimer) return; friendsTimer=setInterval(function(){ if(tab==="friends") loadFriends(); else stopFriendsPolling(); },2500); }
function stopFriendsPolling(){ if(friendsTimer){ clearInterval(friendsTimer); friendsTimer=null; } }
async function loadFriends(){
  if(!key) return;
  try{
    var r=await fetch(API+"/api/my/friends",{headers:hdr()}); var d=await r.json();
    friends=d.friends||[];
    if(tab==="friends"){ renderFriends(); drawFriendMarkers(); startFriendsPolling(); }
  }catch(e){}
}
function renderFriends(){
  var el=document.getElementById("listBody"); if(!el) return;
  var head='<div class="secttl">Prieteni</div>'
    +'<div class="ritem" style="cursor:default"><div class="rtop"><span class="rname">Codul meu: <b class="fcode">'+esc(myCode||"…")+'</b></span>'
    +(myCode?'<button class="rbtn cyan" onclick="copyParty(\\''+esc(myCode)+'\\')">'+ic("copy",14)+' Copiază</button>':'')+'</div>'
    +'<div class="rmeta">Dă codul unui prieten ca să te adauge — sau adaugă-l tu cu codul lui.</div></div>'
    +'<div style="display:flex;gap:8px;margin:8px 0 4px">'
    +'<input id="addFriendCode" placeholder="COD PRIETEN" style="flex:1;text-transform:uppercase;background:var(--s1);border:1px solid var(--line);color:var(--t1);border-radius:10px;padding:11px;font-size:15px;letter-spacing:.12em;text-align:center;font-family:var(--mono)" autocomplete="off" onkeydown="if(event.key===\\'Enter\\')addFriend()" />'
    +'<button class="rbtn cyan" style="padding:0 14px" onclick="addFriend()">'+ic("plus",16)+' Adaugă</button></div>';
  var body;
  if(!friends.length){
    body='<div class="empty"><div class="et">Niciun prieten încă</div><div class="es">Adaugă un prieten cu codul lui ca să conduceți împreună și să vă scrieți.</div></div>';
  } else {
    body=friends.map(function(f){
      var on=f.online;
      var nm=esc((f.name||"").replace(/'/g,""));
      var badge=f.party_code?'<span class="rbadge pub">în party</span>':(on?'<span class="rbadge pub">online</span>':'<span class="rbadge priv">offline</span>');
      var unread=f.unread?'<span class="unread">'+f.unread+'</span>':'';
      var acts='<button class="rbtn cyan" onclick="openChat('+f.id+',\\''+nm+'\\')">'+ic("msg",14)+' Mesaj'+unread+'</button>';
      if(f.party_code) acts+='<button class="rbtn" onclick="joinFriendParty(\\''+esc(f.party_code)+'\\')">'+ic("users",14)+' Intră</button>';
      if(f.lat!=null&&f.lng!=null) acts+='<button class="rbtn" onclick="showFriendOnMap('+f.id+')">'+ic("nav",14)+' Pe hartă</button>';
      acts+='<button class="rbtn pink" onclick="removeFriend('+f.id+',\\''+nm+'\\')">'+ic("trash",14)+' Șterge</button>';
      return '<div class="ritem" style="cursor:default"><div class="rtop">'
        +'<span class="fdot '+(on?"on":"off")+'"></span><span class="rname">'+esc(f.name||"?")+'</span>'+badge+'</div>'
        +'<div class="racts">'+acts+'</div></div>';
    }).join("");
  }
  el.innerHTML=head
    +'<div style="margin:10px 2px 4px;font-size:12px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Lista mea</div>'
    +body+'<div id="friendRoutes"></div>';
  loadFriendRoutes();
}
async function loadFriendRoutes(){
  try{
    var r=await fetch(API+"/api/my/friends/routes",{headers:hdr()}); var d=await r.json();
    var box=document.getElementById("friendRoutes"); if(!box) return;
    var rts=d.routes||[];
    if(!rts.length){ box.innerHTML=""; return; }
    box.innerHTML='<div style="margin:14px 2px 4px;font-size:12px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Trasee de la prieteni</div>'
      +rts.map(function(rt){ rt.is_public=1; return routeItemHtml(rt,false); }).join("");
  }catch(e){}
}
async function addFriend(){
  var inp=document.getElementById("addFriendCode"); var code=inp?inp.value.trim().toUpperCase():"";
  if(!code){ toast("Scrie codul prietenului."); return; }
  try{
    var r=await fetch(API+"/api/my/friends/add",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({code:code})});
    var d=await r.json();
    if(r.ok){ toast(d.already?("Deja prieten cu "+(d.name||"")):("Adăugat: "+(d.name||"prieten"))); if(inp)inp.value=""; loadFriends(); }
    else toast(d.error||"Cod invalid.");
  }catch(e){ toast("Eroare de rețea."); }
}
async function removeFriend(id,name){
  if(!confirm("Ștergi prietenul "+(name||"")+"?")) return;
  try{ var r=await fetch(API+"/api/my/friends/remove",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({id:id})});
    if(r.ok){ toast("Șters."); loadFriends(); } else toast("Eroare."); }catch(e){ toast("Eroare de rețea."); }
}
async function joinFriendParty(code){
  try{
    var r=await fetch(API+"/api/my/party/join",{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({code:code})});
    var d=await r.json();
    if(r.ok){ toast("Ai intrat în party!"); party=null; setTab("party"); loadParty(); }
    else toast(d.error||"Nu pot intra în party.");
  }catch(e){ toast("Eroare de rețea."); }
}
function showFriendOnMap(id){
  var f=null; for(var i=0;i<friends.length;i++){ if(friends[i].id===id){ f=friends[i]; break; } }
  if(!f||f.lat==null){ toast("Prietenul nu e vizibil pe hartă acum."); return; }
  drawFriendMarkers();
  if(map) map.setView([f.lat,f.lng],15);
  toast("Centrat pe "+(f.name||"prieten"));
}
function openChat(id,name){
  chatWith=id;
  document.getElementById("chatName").textContent=name||"Prieten";
  document.getElementById("chatBody").innerHTML='<div class="chatempty">Se încarcă…</div>';
  document.getElementById("chatModal").classList.add("on");
  loadChat(true);
  if(chatTimer) clearInterval(chatTimer);
  chatTimer=setInterval(function(){ loadChat(false); },3000);
  var t=document.getElementById("chatText"); if(t) setTimeout(function(){ t.focus(); },100);
}
function closeChat(){
  document.getElementById("chatModal").classList.remove("on");
  chatWith=null;
  if(chatTimer){ clearInterval(chatTimer); chatTimer=null; }
  loadFriends();
}
async function loadChat(scroll){
  if(!chatWith) return;
  try{
    var r=await fetch(API+"/api/my/friends/messages/"+chatWith,{headers:hdr()}); var d=await r.json();
    if(r.ok) renderChat(d.messages||[],scroll);
  }catch(e){}
}
function renderChat(msgs,scroll){
  var b=document.getElementById("chatBody"); if(!b) return;
  if(!msgs.length){ b.innerHTML='<div class="chatempty">Niciun mesaj încă.<br>Scrie primul mesaj 👋</div>'; return; }
  var atBottom=(b.scrollHeight-b.scrollTop-b.clientHeight)<50;
  b.innerHTML=msgs.map(function(m){
    var t=new Date(m.at); var hh=("0"+t.getHours()).slice(-2)+":"+("0"+t.getMinutes()).slice(-2);
    return '<div class="cbub '+(m.mine?"me":"them")+'">'+esc(m.text)+'<span class="ct">'+hh+'</span></div>';
  }).join("");
  if(scroll||atBottom) b.scrollTop=b.scrollHeight;
}
async function sendFriendMsg(){
  var inp=document.getElementById("chatText"); var text=inp?inp.value.trim():"";
  if(!text||!chatWith) return;
  inp.value="";
  try{
    var r=await fetch(API+"/api/my/friends/messages/"+chatWith,{method:"POST",headers:Object.assign({"Content-Type":"application/json"},hdr()),body:JSON.stringify({text:text})});
    if(r.ok) loadChat(true); else { var d=await r.json(); toast(d.error||"Nu s-a trimis."); }
  }catch(e){ toast("Eroare de rețea."); }
}

// ---- Mod Performanță (Dragy-like): 0-100, 1/4 milă, 400/1000 m, 100-200 ----
const PERF_METRICS=[
  {key:"0-100",   label:"0–100 km/h",  type:"speed"},
  {key:"100-200", label:"100–200 km/h",type:"speed"},
  {key:"400m",    label:"0–400 m",     type:"dist", d:400},
  {key:"402m",    label:"1/4 milă",    type:"dist", d:402.336},
  {key:"1000m",   label:"0–1000 m",    type:"dist", d:1000}
];
let perfOn=false, perfWatch=null, perfArmed=false, perfRunning=false;
let perfT0=0, perfDist=0, perfLast=null, perfLastT=0, perfLastSpd=0;
let perfCross={}, perfDistMark={};
function loadPerfBest(){ try{ return JSON.parse(localStorage.getItem("sxu_perf_best")||"{}")||{}; }catch(e){ return {}; } }
function savePerfBest(){ try{ localStorage.setItem("sxu_perf_best",JSON.stringify(perfBest)); }catch(e){} }
let perfBest=loadPerfBest();
function renderPerfGrid(){
  var g=document.getElementById("perfGrid"); if(!g) return;
  g.innerHTML=PERF_METRICS.map(function(m){
    return '<div class="perfcard" id="pc-'+m.key+'"><div class="pl">'+m.label+'</div>'
      +'<div class="pv" id="pv-'+m.key+'">—</div><div class="pb" id="pb-'+m.key+'"></div></div>';
  }).join("");
  updatePerfBestLabels();
}
function updatePerfBestLabels(){
  PERF_METRICS.forEach(function(m){ var b=document.getElementById("pb-"+m.key); if(!b) return;
    var v=perfBest[m.key]; b.textContent=v?("Record: "+v.toFixed(2)+" s"):""; });
}
function setPerfCard(key,sec,trap){
  var el=document.getElementById("pv-"+key); if(!el) return;
  el.innerHTML=sec.toFixed(2)+' <small>s</small>'+(trap!=null?(' · '+Math.round(trap)+' <small>km/h</small>'):'');
  var c=document.getElementById("pc-"+key); if(c) c.classList.add("hit");
}
function onPerfCross(){
  if(perfCross[100]) setPerfCard("0-100",(perfCross[100].t-perfT0)/1000,null);
  if(perfCross[100]&&perfCross[200]) setPerfCard("100-200",(perfCross[200].t-perfCross[100].t)/1000,null);
  PERF_METRICS.forEach(function(m){ if(m.type==="dist"&&perfDistMark[m.key]) setPerfCard(m.key,(perfDistMark[m.key].t-perfT0)/1000,perfDistMark[m.key].spd); });
}
function perfStep(t,pos,spd){
  var dt=t-perfLastT; if(dt<=0) dt=1;
  var seg=haversine(perfLast[0],perfLast[1],pos[0],pos[1]);
  var d0=perfDist, d1=perfDist+seg;
  [100,200].forEach(function(tg){
    if(perfLastSpd<tg && spd>=tg && !perfCross[tg]){
      var f=(spd>perfLastSpd)?((tg-perfLastSpd)/(spd-perfLastSpd)):1;
      perfCross[tg]={t:perfLastT+f*dt,d:d0+f*seg}; onPerfCross();
    }
  });
  PERF_METRICS.forEach(function(m){
    if(m.type!=="dist"||perfDistMark[m.key]) return;
    if(d1>=m.d && d0<m.d){
      var f=seg>0?((m.d-d0)/seg):1;
      perfDistMark[m.key]={t:perfLastT+f*dt,spd:perfLastSpd+f*(spd-perfLastSpd)}; onPerfCross();
    }
  });
  perfDist=d1;
  var el=document.getElementById("perfElapsed"); if(el) el.textContent=((t-perfT0)/1000).toFixed(2)+" s";
  var allDist=PERF_METRICS.every(function(m){ return m.type!=="dist"||perfDistMark[m.key]; });
  if((spd<3 && perfDist>30) || (perfDist>1200 && allDist)) finishPerf();
}
function perfPos(p){
  if(!perfOn) return;
  var t=p.timestamp||Date.now();
  var lat=p.coords.latitude, lng=p.coords.longitude, pos=[lat,lng], spd;
  if(p.coords.speed!=null&&p.coords.speed>=0) spd=p.coords.speed*3.6;
  else if(perfLast){ var dd=haversine(perfLast[0],perfLast[1],lat,lng); var dtt=(t-perfLastT)/1000; spd=dtt>0?(dd/dtt*3.6):0; }
  else spd=0;
  var sv=document.getElementById("perfSpd"); if(sv) sv.textContent=Math.round(spd);
  setSpeed(spd);
  if(!perfRunning){
    if(perfArmed && spd>=6 && perfLast){
      perfRunning=true; perfT0=perfLastT; perfDist=0; perfCross={}; perfDistMark={};
      clearCountdown();
      var st=document.getElementById("perfStatus"); if(st){ st.textContent="Măsor… accelerează!"; st.className="perfstatus run"; }
      perfStep(t,pos,spd);
    }
    perfLast=pos; perfLastT=t; perfLastSpd=spd; return;
  }
  perfStep(t,pos,spd);
  perfLast=pos; perfLastT=t; perfLastSpd=spd;
}
function finishPerf(){
  perfRunning=false; perfArmed=false;
  var btn=document.getElementById("perfArmBtn"); if(btn){ btn.textContent="Armare rapidă"; btn.classList.remove("armed"); }
  var st=document.getElementById("perfStatus"); if(st){ st.textContent='Gata! Oprește-te și pornește alt rulaj cu „3·2·1 GO".'; st.className="perfstatus"; }
  var res={};
  if(perfCross[100]) res["0-100"]=(perfCross[100].t-perfT0)/1000;
  if(perfCross[100]&&perfCross[200]) res["100-200"]=(perfCross[200].t-perfCross[100].t)/1000;
  PERF_METRICS.forEach(function(m){ if(m.type==="dist"&&perfDistMark[m.key]) res[m.key]=(perfDistMark[m.key].t-perfT0)/1000; });
  var improved=false;
  Object.keys(res).forEach(function(k){ if(res[k]>0 && (!perfBest[k]||res[k]<perfBest[k])){ perfBest[k]=res[k]; improved=true; } });
  if(improved){ savePerfBest(); updatePerfBestLabels(); toast("Record nou! 🏁"); }
}
function armPerf(){
  if(perfArmed && !perfRunning){
    perfArmed=false; clearCountdown();
    var s0=document.getElementById("perfStatus"); if(s0){ s0.textContent='Apasă „3·2·1 GO" și pornește la GO — sau „Armare rapidă".'; s0.className="perfstatus"; }
    var b0=document.getElementById("perfArmBtn"); if(b0){ b0.textContent="Armare rapidă"; b0.classList.remove("armed"); }
    return;
  }
  clearCountdown();
  perfArmed=true; perfRunning=false; perfCross={}; perfDistMark={}; perfDist=0;
  PERF_METRICS.forEach(function(m){ var v=document.getElementById("pv-"+m.key); if(v) v.textContent="—"; var c=document.getElementById("pc-"+m.key); if(c) c.classList.remove("hit"); });
  var el=document.getElementById("perfElapsed"); if(el) el.textContent="0.00 s";
  var st=document.getElementById("perfStatus"); if(st){ st.textContent="ARMAT — pornește tare când ești gata!"; st.className="perfstatus armed"; }
  var btn=document.getElementById("perfArmBtn"); if(btn){ btn.textContent="Anulează armarea"; btn.classList.add("armed"); }
}
function resetPerfBest(){ if(!confirm("Ștergi toate recordurile de performanță?")) return; perfBest={}; savePerfBest(); updatePerfBestLabels(); toast("Recorduri șterse."); }
// countdown animat 3·2·1·GO
let perfCountTimers=[];
function clearCountdown(){ perfCountTimers.forEach(clearTimeout); perfCountTimers=[]; var c=document.getElementById("perfCount"); if(c){ c.classList.remove("show"); c.innerHTML=""; } }
function showCount(txt,cls,color){
  var c=document.getElementById("perfCount"); if(!c) return;
  c.classList.add("show");
  c.innerHTML='<div class="'+cls+'" style="color:'+color+'">'+txt+'</div>';
}
function startCountdown(){
  if(perfRunning) return;
  clearCountdown();
  perfArmed=false; perfRunning=false; perfCross={}; perfDistMark={}; perfDist=0;
  PERF_METRICS.forEach(function(m){ var v=document.getElementById("pv-"+m.key); if(v) v.textContent="—"; var cc=document.getElementById("pc-"+m.key); if(cc) cc.classList.remove("hit"); });
  var pe=document.getElementById("perfElapsed"); if(pe) pe.textContent="0.00 s";
  var st=document.getElementById("perfStatus"); if(st){ st.textContent="Pregătește-te…"; st.className="perfstatus"; }
  var seq=[["3","#ff5b60"],["2","#eab54a"],["1","#28e0ff"]];
  seq.forEach(function(s,i){ perfCountTimers.push(setTimeout(function(){ showCount(s[0],"n",s[1]); },i*1000)); });
  perfCountTimers.push(setTimeout(function(){
    showCount("GO!","go","#22e08a");
    perfArmed=true; perfRunning=false; perfCross={}; perfDistMark={}; perfDist=0;
    var s2=document.getElementById("perfStatus"); if(s2){ s2.textContent="GO! — accelerează!"; s2.className="perfstatus armed"; }
    var b=document.getElementById("perfArmBtn"); if(b){ b.textContent="Anulează armarea"; b.classList.add("armed"); }
  },3000));
  perfCountTimers.push(setTimeout(clearCountdown,4400));
}
function openPerf(){
  var pp=document.getElementById("perfPanel"); if(!pp) return;
  perfOn=true; perfArmed=false; perfRunning=false; perfLast=null; perfLastT=0; perfLastSpd=0; perfDist=0; perfCross={}; perfDistMark={};
  clearCountdown();
  renderPerfGrid();
  var st=document.getElementById("perfStatus"); if(st){ st.textContent='Apasă „3·2·1 GO" și pornește la GO — sau „Armare rapidă".'; st.className="perfstatus"; }
  var el=document.getElementById("perfElapsed"); if(el) el.textContent="0.00 s";
  var btn=document.getElementById("perfArmBtn"); if(btn){ btn.textContent="Armare rapidă"; btn.classList.remove("armed"); }
  pp.classList.add("on");
  if(navigator.geolocation){ perfWatch=navigator.geolocation.watchPosition(perfPos,function(){ toast("Nu pot citi GPS-ul."); },{enableHighAccuracy:true,maximumAge:0,timeout:20000}); }
  else toast("GPS indisponibil pe acest dispozitiv.");
}
function closePerf(){
  perfOn=false; perfArmed=false; perfRunning=false;
  clearCountdown();
  if(perfWatch!=null && navigator.geolocation){ navigator.geolocation.clearWatch(perfWatch); perfWatch=null; }
  var pp=document.getElementById("perfPanel"); if(pp) pp.classList.remove("on");
}

// ---- ține ecranul aprins (Screen Wake Lock) cât timp ești pe pagina de trasee ----
let wakeLock=null;
async function requestWake(){
  try{
    if("wakeLock" in navigator && document.visibilityState==="visible"){
      wakeLock=await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release",function(){ wakeLock=null; });
    }
  }catch(e){ wakeLock=null; }
}
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="visible" && !wakeLock) requestWake();
});

if(!key){ document.getElementById("recHint").textContent="Lipsește codul dispozitivului — deschide din aplicație."; }
initMap();
startLocate();
loadList();
loadParty();
loadMe();
requestWake();
setTimeout(checkRecDraft, 700);
</script>
</body>
</html>`;
