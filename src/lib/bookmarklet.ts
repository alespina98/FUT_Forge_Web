export function isEAWebAppUrl(value: string | URL) {
  try {
    const url = value instanceof URL ? value : new URL(value);
    return url.protocol === "https:" && url.hostname === "www.ea.com" &&
      /^\/(?:[a-z]{2}-[a-z]{2}\/)?(?:games\/)?ea-sports-fc\/ultimate-team\/web-app\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

type BrowserChannel = "stable" | "dev";

export function makeBookmarklet(origin: string, channel: BrowserChannel = "stable") {
  const loader = `${origin.replace(/\/$/, "")}/browser/loader.js?channel=${channel}`;
  const pageCheck = `(()=>{try{const u=new URL(location.href);return u.protocol==='https:'&&u.hostname==='www.ea.com'&&/^\\/(?:[a-z]{2}-[a-z]{2}\\/)?(?:games\\/)?ea-sports-fc\\/ultimate-team\\/web-app\\/?$/i.test(u.pathname)}catch(_){return false}})()`;
  return `javascript:(async()=>{if(!${pageCheck}){alert('FUT Forge: open the EA FC Ultimate Team Web App first.');return}if(window.__FUTFORGE_BOOKMARKLET_LOADING__||window.__FUTFORGE_BOOKMARKLET_LOADED__||window.FutForgeDispatcher){alert('FUT Forge is already loaded or loading.');return}window.__FUTFORGE_BOOKMARKLET_LOADING__=true;const u='${loader}&t='+Date.now();window.__FUTFORGE_LOADER_URL__=u;try{const r=await fetch(u,{cache:'no-store',mode:'cors'});if(!r.ok)throw Error('HTTP '+r.status);Function((await r.text())+'\\n//# sourceURL='+u)()}catch(e){window.__FUTFORGE_BOOKMARKLET_LOADING__=false;console.error('[FUT Forge Bookmarklet]',e);alert('FUT Forge: remote loader download failed.')}})()`;
}

type BookmarkletTransfer = { effectAllowed: string; setData: (format: string, data: string) => void };
export function setBookmarkletDragData(origin: string, transfer: BookmarkletTransfer, channel: BrowserChannel = "stable") {
  const href = makeBookmarklet(origin, channel);
  transfer.effectAllowed = "link";
  transfer.setData("text/uri-list", href);
  transfer.setData("text/plain", href);
  return href;
}
