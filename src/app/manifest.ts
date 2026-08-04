import type { MetadataRoute } from "next";
import { siteCopy } from "@/lib/copy";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteCopy.applicationName,
    short_name: siteCopy.applicationName,
    description: siteCopy.description,
    start_url: "/",
    display: "standalone",
    background_color: "#070908",
    theme_color: "#070908",
    icons: [{ src: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
  };
}




