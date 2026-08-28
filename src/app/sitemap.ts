import type { MetadataRoute } from "next";
import { siteCopy } from "@/lib/copy";
import { FC27_POSITIONS, positionSlug } from "@/lib/fc27/best-positions";

// No CMS/DB tracks a genuine per-page "content last changed" timestamp for these static/
// data-driven routes, so there is no real per-URL date to report - using the sitemap's own
// generation time for every entry is the honest choice (this route is dynamically rendered per
// request, not statically cached, so it reflects when the sitemap was actually served) rather
// than a fabricated distinct date per page.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: siteCopy.url, changeFrequency: "weekly", priority: 1, lastModified },
    { url: `${siteCopy.url}/how-it-works`, changeFrequency: "monthly", priority: 0.7, lastModified },
    { url: `${siteCopy.url}/features`, changeFrequency: "monthly", priority: 0.8, lastModified },
    { url: `${siteCopy.url}/features/evo-lab`, changeFrequency: "monthly", priority: 0.7, lastModified },
    { url: `${siteCopy.url}/features/sbc`, changeFrequency: "monthly", priority: 0.7, lastModified },
    { url: `${siteCopy.url}/download`, changeFrequency: "daily", priority: 0.9, lastModified },
    { url: `${siteCopy.url}/faq`, changeFrequency: "monthly", priority: 0.6, lastModified },
    { url: `${siteCopy.url}/partners`, changeFrequency: "monthly", priority: 0.5, lastModified },
    { url: `${siteCopy.url}/fc27/players`, changeFrequency: "daily", priority: 0.8, lastModified },
    { url: `${siteCopy.url}/fc27/browse`, changeFrequency: "weekly", priority: 0.7, lastModified },
    { url: `${siteCopy.url}/fc27/positions`, changeFrequency: "weekly", priority: 0.7, lastModified },
    { url: `${siteCopy.url}/fc27/nations`, changeFrequency: "weekly", priority: 0.7, lastModified },
    { url: `${siteCopy.url}/fc27/clubs`, changeFrequency: "weekly", priority: 0.7, lastModified },
    { url: `${siteCopy.url}/fc27/leagues`, changeFrequency: "weekly", priority: 0.7, lastModified },
    { url: `${siteCopy.url}/fc27/compare`, changeFrequency: "weekly", priority: 0.7, lastModified },
    { url: `${siteCopy.url}/fc27/squad-builder`, changeFrequency: "weekly", priority: 0.9, lastModified },
    { url: `${siteCopy.url}/fc27/rankings`, changeFrequency: "weekly", priority: 0.7, lastModified },
    { url: `${siteCopy.url}/fc27/meta-rankings`, changeFrequency: "weekly", priority: 0.7, lastModified },
    { url: `${siteCopy.url}/fc27/stat-finder`, changeFrequency: "weekly", priority: 0.7, lastModified },
    { url: `${siteCopy.url}/fc27/hidden-gems`, changeFrequency: "weekly", priority: 0.7, lastModified },
    ...FC27_POSITIONS.map((position) => ({ url: `${siteCopy.url}/fc27/best/${positionSlug(position)}`, changeFrequency: "weekly" as const, priority: 0.7, lastModified })),
    { url: `${siteCopy.url}/register`, changeFrequency: "monthly", priority: 0.5, lastModified },
    { url: `${siteCopy.url}/login`, changeFrequency: "monthly", priority: 0.4, lastModified },
    { url: `${siteCopy.url}/privacy`, changeFrequency: "monthly", priority: 0.3, lastModified },
  ];
}
