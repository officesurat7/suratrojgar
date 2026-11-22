import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { SITE_NAME, SITE_URL, TAGLINE } from "@/lib/config";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} – Jobs in Surat | ${TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description: "Find the latest jobs in Surat: textile, diamond, office, sales, IT, factory, delivery and more. Employers can post jobs and hire verified local candidates.",
  applicationName: SITE_NAME,
  keywords: ["jobs in Surat", "Surat jobs", "Surat naukri", "textile jobs Surat", "diamond jobs Surat", "SuratRojgar"],
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IN", url: SITE_URL, images: [{ url: "/icon-512.png", width: 512, height: 512 }] },
  twitter: { card: "summary" },
  icons: { apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#2563eb", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={inter.variable}>
      <body className="flex min-h-screen flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow">Skip to content</a>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
