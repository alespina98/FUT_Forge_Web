import type { MetadataRoute } from "next";
import { siteCopy } from "@/lib/copy";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: siteCopy.url, lastModified: new Date(), changeFrequency: "weekly", priority: 1 }];
}
