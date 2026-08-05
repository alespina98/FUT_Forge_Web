import type { MetadataRoute } from "next";
import { siteCopy } from "@/lib/copy";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteCopy.url}/sitemap.xml`,
    host: siteCopy.url,
  };
}
