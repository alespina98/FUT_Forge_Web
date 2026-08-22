import type { MetadataRoute } from "next";
import { siteCopy } from "@/lib/copy";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteCopy.url, changeFrequency: "weekly", priority: 1 },
    { url: `${siteCopy.url}/how-it-works`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteCopy.url}/features`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteCopy.url}/features/evo-lab`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteCopy.url}/features/sbc`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteCopy.url}/download`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteCopy.url}/faq`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteCopy.url}/partners`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteCopy.url}/fc27/players`, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteCopy.url}/fc27/compare`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteCopy.url}/register`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteCopy.url}/login`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteCopy.url}/privacy`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
