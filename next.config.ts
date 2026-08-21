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
  async redirects() {
    // /app/login and /app/register moved to top-level /login and /register
    // (page-based site architecture). Permanent redirects keep already-shipped
    // Browser Mode bookmarklet releases (public/browser/releases/*) and any
    // bookmarked/emailed links working - query strings (e.g. ?next=) are
    // forwarded automatically by Next.js since they aren't part of the source.
    return [
      { source: "/app/login", destination: "/login", permanent: true },
      { source: "/app/register", destination: "/register", permanent: true },
      // The old Vercel domain and futforgeofficial.com serve the same project,
      // so this redirect is host-conditional (`has: host`) - it only matches
      // requests arriving on the retired domain, never futforgeofficial.com
      // itself, which avoids a redirect loop. Query strings are forwarded
      // automatically since they aren't part of the source/destination.
      //
      // /android/version.json is excluded: the already-shipped 1.0.13 APK's
      // updater has a build-time host allowlist containing only the old
      // domain, so it can fetch the manifest directly from this host but
      // can't follow a redirect off it. Excluding this one path lets that
      // request fall through to the same static file futforgeofficial.com
      // serves, with a normal 200 instead of a redirect.
      {
        source: "/:path((?!android/version\\.json$).*)",
        has: [{ type: "host", value: "futforge.vercel.app" }],
        destination: "https://futforgeofficial.com/:path",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
