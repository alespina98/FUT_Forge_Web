;(()=>{
  "use strict";
  const isEAWebApp=()=>{try{const u=new URL(location.href);return u.protocol==="https:"&&u.hostname==="www.ea.com"&&/^\/(?:[a-z]{2}-[a-z]{2}\/)?(?:games\/)?ea-sports-fc\/ultimate-team\/web-app\/?$/i.test(u.pathname);}catch(_){return false;}};
  const ffInstallId=(()=>{try{let v=localStorage.getItem("futforge_install_id");if(!v){v=crypto.randomUUID();localStorage.setItem("futforge_install_id",v);}return v;}catch(_){return null;}})();
  const ffSessionId=(()=>{try{return crypto.randomUUID();}catch(_){return null;}})();
  const ffTrack=(event,properties)=>{try{const id=ffInstallId||ffSessionId;if(!id)return;const eventId=(crypto.randomUUID&&crypto.randomUUID())||(id+":"+Date.now());const body=JSON.stringify({events:[{event,event_id:eventId,event_version:1,timestamp:Date.now(),client_type:"bookmarklet",client_version:"2.10.5-browser.13",install_id:id,session_id:ffSessionId||id,properties:properties||{}}]});const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),2500);fetch("https://futforgeofficial.com/api/analytics/events",{method:"POST",mode:"cors",credentials:"omit",keepalive:true,headers:{"content-type":"application/json"},body,signal:controller.signal}).catch(()=>{}).finally(()=>clearTimeout(timer));}catch(_){}};
  globalThis.__FUTFORGE_TRACK__=ffTrack;
  const fail=(message,error,outcome)=>{globalThis.__FUTFORGE_BOOKMARKLET_LOADING__=false;console.error("[FUT Forge Bookmarklet]",message,error||"");ffTrack("bookmarklet_open",{outcome:outcome||"error"});alert("FUT Forge: "+message);};
  if(!isEAWebApp())return fail("Open the EA FC Ultimate Team Web App before using this bookmark.",null,"not_ea_tab");
  if(globalThis.__FUTFORGE_BOOKMARKLET_LOADED__||globalThis.FutForgeDispatcher){ffTrack("bookmarklet_open",{outcome:"already_loaded"});return alert("FUT Forge is already running on this page.");}
  if(globalThis.__FUTFORGE_LOADER_ACTIVE__){ffTrack("bookmarklet_open",{outcome:"already_loading"});return alert("FUT Forge is already loading. Please wait a moment.");}
  globalThis.__FUTFORGE_LOADER_ACTIVE__=true;globalThis.__FUTFORGE_BOOKMARKLET_LOADING__=true;
  const loaderUrl=globalThis.__FUTFORGE_LOADER_URL__;
  if(!loaderUrl)return fail("The remote loader URL is unavailable.",null,"loader_url_missing");
  const source=new URL(loaderUrl),base=new URL("./",source),channel=source.searchParams.get("channel")||"stable";
  const getText=async(src)=>{const r=await fetch(src,{cache:"no-store",mode:"cors"});if(!r.ok)throw new Error("http_"+r.status+":"+src);return r.text();};
  const verify=async(text,expected)=>{if(!expected?.startsWith("sha384-"))throw new Error("integrity_missing");const bytes=await crypto.subtle.digest("SHA-384",new TextEncoder().encode(text));let binary="";for(const byte of new Uint8Array(bytes))binary+=String.fromCharCode(byte);if("sha384-"+btoa(binary)!==expected)throw new Error("integrity_mismatch");};
  const execute=(code,url)=>Function(code+"\n//# sourceURL="+url)();
  const ready=async()=>{const started=Date.now();while(Date.now()-started<15000){if(globalThis.services&&globalThis.repositories)return true;await new Promise(r=>setTimeout(r,300));}return false;};
  (async()=>{try{
    const manifestUrl=new URL("version.json",base);manifestUrl.searchParams.set("t",String(Date.now()));
    const manifest=JSON.parse(await getText(manifestUrl.href)),releaseVersion=manifest.channels?.[channel],release=manifest.releases?.[releaseVersion];if(!release)throw new Error("channel_manifest_missing");
    if(!await ready())throw new Error("ea_runtime_not_ready");
    const cssUrl=new URL(release.css,base).href,jsUrl=new URL(release.js,base).href;
    const [css,js]=await Promise.all([getText(cssUrl),getText(jsUrl)]);await Promise.all([verify(css,release.cssIntegrity),verify(js,release.jsIntegrity)]);
    const style=document.createElement("style");style.id="futforge-bookmarklet-style";style.textContent=css;(document.head||document.documentElement).appendChild(style);
    execute(js,jsUrl);
    globalThis.__FUTFORGE_LOADER_ACTIVE__=false;
    ffTrack("bookmarklet_open",{outcome:"ok"});
  }catch(error){globalThis.__FUTFORGE_LOADER_ACTIVE__=false;const c=String(error?.message||error);const outcome=c==="ea_runtime_not_ready"?"ea_runtime_not_ready":c==="integrity_mismatch"?"integrity_mismatch":"load_failed";fail(c==="ea_runtime_not_ready"?"EA Web App is not ready. Log in fully, then try again.":c==="integrity_mismatch"?"The downloaded release failed its integrity check.":"Could not load the browser release.",error,outcome);}})();
})();