import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/browser/:path*", headers: [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Cache-Control", value: "public, max-age=60, s-maxage=60" },
    ] }];
  },
};

export default nextConfig;
