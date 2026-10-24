import type { Metadata, Viewport } from "next";
import { Anton, Inter, Special_Elite } from "next/font/google";
import "./globals.css";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Footer } from "@/components/ui/Footer";
import { Gate } from "@/components/ui/Gate";
import { Header } from "@/components/ui/Header";
import { Providers } from "@/components/ui/Providers";
import { StaticCut } from "@/components/ui/StaticCut";
import { site } from "@/data/site";
import { preHydrationScript } from "@/lib/store";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const specialElite = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-special-elite",
  display: "swap",
  // only used for small kickers now: don't spend the critical path on it
  preload: false,
  fallback: ["Courier New", "Courier", "monospace"],
});

// Tall condensed display face for poster titles.
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
  preload: false,
  fallback: ["Impact", "Haettenschweiler", "Arial Narrow", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
};

export const viewport: Viewport = {
  themeColor: "#0E0D0C",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${specialElite.variable} ${anton.variable}`} data-calm="0" data-gate="closed" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preHydrationScript }} />
      </head>
      <body className="antialiased">
        <Providers>
          <Atmosphere />
          <Header />
          <main id="main" className="relative z-10">
            {children}
          </main>
          <Footer />
          <Gate />
          <StaticCut />
        </Providers>
      </body>
    </html>
  );
}
