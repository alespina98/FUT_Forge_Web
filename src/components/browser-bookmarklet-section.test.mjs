import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const source=readFileSync(new URL("./browser-bookmarklet-section.tsx",import.meta.url),"utf8"),css=readFileSync(new URL("./browser-bookmarklet.css",import.meta.url),"utf8");
test("Italian and English cover every installation step and the sidebar scope",()=>{for(const marker of["Mostra la barra dei preferiti","Show the bookmarks bar","Apri e accedi alla EA FC Web App","Open and sign in to the EA FC Web App","Copia URL manuale","Copy manual URL","non aggiunge una nuova voce alla sidebar EA","does not add a new item to the EA sidebar"])assert.ok(source.includes(marker),`missing copy: ${marker}`);});
test("browser installation is responsive and bypasses React javascript URL normalization safely",()=>{assert.ok(source.includes("draggable"));assert.ok(source.includes("navigator.clipboard.writeText"));assert.ok(source.includes("mockLink.current.href = value"));assert.ok(source.includes("installLink.current.href = value"));assert.match(css,/@media\(max-width:800px\)/);assert.match(css,/@media\(max-width:640px\)/);});
