import type { MetadataRoute } from "next";
import { siteCopy } from "@/lib/copy";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteCopy.url, changeFrequency: "weekly", priority: 1 },
    { url: `${siteCopy.url}/download`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteCopy.url}/privacy`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
