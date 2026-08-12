// @ts-expect-error Node's native TypeScript test runner requires the explicit extension.
import { safeHttpUrl } from "../core.ts";
import type { LeakProvider, ProviderItem } from "./model";

const decode = (value: string) => value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const tag = (xml: string, names: string[]) => names.map(name => xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1]).find(Boolean);
const attr = (xml: string, name: string, attribute: string) => xml.match(new RegExp(`<${name}[^>]*\\s${attribute}=["']([^"']+)["'][^>]*>`, "i"))?.[1];
export function parsePublicFeed(xml: string): ProviderItem[] {
  return [...xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].flatMap(match => {
    const block = match[2]; const title = decode(tag(block, ["title"]) || ""); const sourceUrl = safeHttpUrl(tag(block, ["link"]) || attr(block, "link", "href"));
    const sourcePostId = decode(tag(block, ["guid", "id"]) || sourceUrl || ""); const publishedAt = tag(block, ["pubDate", "published", "updated"]); const rawText = decode(tag(block, ["content:encoded", "content", "description", "summary"]) || "");
    const imageUrl = safeHttpUrl(attr(block, "media:content", "url") || attr(block, "enclosure", "url"));
    if (!title || !sourceUrl || !sourcePostId || !publishedAt || Number.isNaN(Date.parse(publishedAt))) return [];
    return [{ sourcePostId, sourceUrl, title, description: rawText.slice(0, 320), rawText: `${title} ${rawText}`, imageUrl: imageUrl || undefined, publishedAt: new Date(publishedAt).toISOString() }];
  });
}
export class PublicFeedProvider implements LeakProvider {
  readonly enabled: boolean;
  readonly code: LeakProvider["code"]; readonly name: string; private readonly feedUrl?: string;
  constructor(code: LeakProvider["code"], name: string, feedUrl?: string) { this.code = code; this.name = name; this.feedUrl = feedUrl; this.enabled = !!safeHttpUrl(feedUrl); }
  async fetch(signal: AbortSignal): Promise<ProviderItem[]> {
    if (!this.enabled || !this.feedUrl) return [];
    const response = await fetch(this.feedUrl, { signal, headers: { Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9", "User-Agent": "FUT-Forge-Leaks/1.0" }, cache: "no-store" });
    if (!response.ok) throw new Error(`${this.name} feed returned ${response.status}`); const body = await response.text();
    if (body.length > 2_000_000) throw new Error(`${this.name} feed is too large`); return parsePublicFeed(body).slice(0, 50);
  }
}
