import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { siteCopy } from "@/lib/copy";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });
const siteUrl = new URL("https://futforge.app");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteCopy.title,
    template: "%s — FUT Forge",
  },
  description: siteCopy.description,
  applicationName: siteCopy.applicationName,
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
  themeColor: "#070908",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${mono.variable}`}>
      <body><I18nProvider>{children}</I18nProvider></body>
    </html>
  );
}






