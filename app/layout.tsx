import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";
import { site, siteUrl } from "@/content/site";
import "./globals.css";

// One static weight keeps the headline font small; it's what the LCP waits for.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${site.name} · Following the search for Earhart's Electra`,
    template: `%s · ${site.name}`,
  },
  description: site.tagline,
  applicationName: site.name,
  robots: site.noindex
    ? { index: false, follow: false, googleBot: { index: false, follow: false } }
    : undefined,
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.name,
    description: site.tagline,
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { title: site.name, capable: true, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1f33",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}
    >
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
