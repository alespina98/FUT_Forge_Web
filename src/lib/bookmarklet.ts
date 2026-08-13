export function makeBookmarklet(origin: string) {
  const loader = `${origin.replace(/\/$/, "")}/browser/loader.js?channel=stable`;
  return `javascript:(async()=>{if(!location.href.startsWith('https://www.ea.com/ea-sports-fc/ultimate-team/web-app/')){alert('FUT Forge: open the EA FC Ultimate Team Web App first.');return}if(window.__FUTFORGE_BOOKMARKLET_LOADING__||window.__FUTFORGE_BOOKMARKLET_LOADED__||window.FutGenieDispatcher){alert('FUT Forge is already loaded or loading.');return}window.__FUTFORGE_BOOKMARKLET_LOADING__=true;const u='${loader}&t='+Date.now();window.__FUTFORGE_LOADER_URL__=u;try{const r=await fetch(u,{cache:'no-store',mode:'cors'});if(!r.ok)throw Error('HTTP '+r.status);Function((await r.text())+'\\n//# sourceURL='+u)()}catch(e){window.__FUTFORGE_BOOKMARKLET_LOADING__=false;console.error('[FUT Forge Bookmarklet]',e);alert('FUT Forge: remote loader download failed.')}})()`;
}

type BookmarkletTransfer = { effectAllowed: string; setData: (format: string, data: string) => void };
export function setBookmarkletDragData(origin: string, transfer: BookmarkletTransfer) {
  const href = makeBookmarklet(origin);
  transfer.effectAllowed = "link";
  transfer.setData("text/uri-list", href);
  transfer.setData("text/plain", href);
  return href;
}
