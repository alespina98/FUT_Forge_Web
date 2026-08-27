import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { I18nProvider } from "@/components/i18n-provider";
import { AuthRootProvider } from "@/components/auth-root-provider";
import { AnalyticsPageView } from "@/components/analytics-page-view";
import { PRODUCT, siteCopy } from "@/lib/copy";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
const siteUrl = new URL(siteCopy.url);
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: PRODUCT.desktopName,
  applicationCategory: "GameApplication",
  operatingSystem: "Windows 10, Windows 11, macOS 15+, Android 8.0+",
  softwareVersion: PRODUCT.version,
  description: siteCopy.description,
  url: siteCopy.url,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteCopy.title,
    template: "%s — FUT Forge",
  },
  description: siteCopy.description,
  applicationName: siteCopy.applicationName,
  verification: {
    google: "ILjaV7aJcpQIylabPOxnlLWyd7HBStO1l32C3KSWLiU",
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: siteCopy.applicationName,
    title: siteCopy.title,
    description: siteCopy.description,
    locale: "en_US",
    alternateLocale: ["it_IT"],
  },
  twitter: {
    card: "summary",
    title: siteCopy.title,
    description: siteCopy.description,
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
  category: siteCopy.category,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#070908" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" data-theme-preference="system" className={`${geist.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var k="futforge-theme",p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"&&p!=="system")p="system";var d=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p,r=document.documentElement;r.dataset.theme=d;r.dataset.themePreference=p;r.style.colorScheme=d}catch(e){}})()` }} />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <I18nProvider><AuthRootProvider>{children}</AuthRootProvider></I18nProvider>
        <AnalyticsPageView />
        <Analytics />
      </body>
    </html>
  );
}
