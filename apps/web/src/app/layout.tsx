import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { BRAND } from "@rjnx/shared";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s · ${BRAND.shortName} GAMING ESPORTS`,
  },
  description:
    "RJNX GAMING ESPORTS — tournament platform for Free Fire, BGMI, Valorant, COD Mobile and more. Register, compete, climb the verified leaderboard.",
  applicationName: BRAND.name,
  authors: [{ name: BRAND.developer }],
  keywords: ["esports", "tournament", "Free Fire", "BGMI", "Valorant", "RJNX", "gaming India"],
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: "Savage-first esports tournaments. Verified results. Real leaderboards.",
    images: ["/brand/hero-arena.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    images: ["/brand/hero-arena.svg"],
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/favicon.svg",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#05050A",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400..900&family=Rajdhani:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body className="antialiased">
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(14,14,22,0.96)",
              border: "1px solid rgba(0,207,255,0.25)",
              color: "#fff",
              backdropFilter: "blur(12px)",
            },
          }}
        />
      </body>
    </html>
  );
}
