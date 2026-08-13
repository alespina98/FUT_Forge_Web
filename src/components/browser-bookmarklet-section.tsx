"use client";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { makeBookmarklet, setBookmarkletDragData } from "@/lib/bookmarklet";
import { useI18n } from "./i18n-provider";
import "./browser-bookmarklet.css";

export function BrowserBookmarkletSection() {
  const { locale } = useI18n();
  const channel = process.env.NEXT_PUBLIC_FUTFORGE_BROWSER_CHANNEL === "dev" ? "dev" : "stable";
  const [href, setHref] = useState("");
  const [copied, setCopied] = useState(false);
  const mockLink = useRef<HTMLAnchorElement>(null);
  const installLink = useRef<HTMLAnchorElement>(null);
  const it = locale === "it";
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const value = makeBookmarklet(window.location.origin, channel);
      setHref(value);
      if (mockLink.current) mockLink.current.href = value;
      if (installLink.current) installLink.current.href = value;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [channel]);
  const drag = (event: DragEvent<HTMLAnchorElement>) => setBookmarkletDragData(window.location.origin, event.dataTransfer, channel);
  const copy = async () => { await navigator.clipboard.writeText(href); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };
  const steps = it
    ? ["Mostra la barra dei preferiti", "Trascina FUT Forge nella barra", "Apri e accedi alla EA FC Web App", "Clicca FUT Forge"]
    : ["Show the bookmarks bar", "Drag FUT Forge to the bar", "Open and sign in to the EA FC Web App", "Click FUT Forge"];
  return <section id="browser" className="section-shell browser-section section-reveal" data-reveal>
    <div className="browser-heading"><p className="section-label">FUT Forge Browser</p><h2>{it ? "Nessuna app da installare." : "No app to install."}<br/><span>{it ? "Un preferito, tutto qui." : "Just one bookmark."}</span></h2><p>{it ? "FUT Forge estende direttamente la EA FC Web App. Trascina il pulsante nella barra dei preferiti e avvialo quando sei dentro Ultimate Team." : "FUT Forge extends the EA FC Web App directly. Drag the button to your bookmarks bar and launch it once you are inside Ultimate Team."}</p></div>
    <div className="browser-install-card">
      <div className="browser-mock" aria-label={it ? "Esempio della barra dei preferiti" : "Bookmarks bar example"}><div className="browser-window-row"><i/><i/><i/><div>ea.com / ultimate-team / web-app</div></div><div className="browser-bookmarks-row"><span>{it ? "Barra dei preferiti" : "Bookmarks bar"}</span><a ref={mockLink} href="#browser" draggable onDragStart={drag}><b aria-hidden>FF</b> FUT Forge</a></div><div className="browser-stage"><div><span>01</span><strong>{it ? "Trascina qui" : "Drag here"}</strong><small>{it ? "Il pulsante diventa un normale preferito del browser." : "The button becomes a normal browser bookmark."}</small></div></div></div>
      <div className="browser-actions"><a ref={installLink} className="browser-drag-button" href="#browser" draggable onDragStart={drag} aria-label={it ? "Trascina FUT Forge nella barra dei preferiti" : "Drag FUT Forge to the bookmarks bar"}><span aria-hidden>↗</span>{it ? "Trascina FUT Forge" : "Drag FUT Forge"}</a><button type="button" onClick={copy} disabled={!href}>{copied ? (it ? "Copiato" : "Copied") : (it ? "Copia URL manuale" : "Copy manual URL")}</button></div>
      <p className="browser-fallback">{it ? "Installazione manuale: crea un nuovo preferito e incolla il valore copiato nel campo URL." : "Manual installation: create a new bookmark and paste the copied value into its URL field."}</p>
    </div>
    <ol className="browser-steps">{steps.map((step,index)=><li key={step}><span>0{index+1}</span><p>{step}</p></li>)}</ol>
    <p className="browser-scope">{it ? "Funziona su Chrome ed Edge desktop. FUT Forge aggiunge strumenti alla Web App; non aggiunge una nuova voce alla sidebar EA." : "Works on desktop Chrome and Edge. FUT Forge adds tools to the Web App; it does not add a new item to the EA sidebar."}</p>
  </section>;
}
