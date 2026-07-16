import type { Metadata, Viewport } from "next";
import { Fraunces, Karla, Caveat } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import Providers from "./providers";
import TabBar from "@/components/ui/TabBar";
import AddPinFlow from "@/components/pins/AddPinFlow";
import PinDetailSheet from "@/components/pins/PinDetailSheet";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});
const karla = Karla({ subsets: ["latin"], variable: "--font-karla" });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });

export const metadata: Metadata = {
  title: "Thailand '26",
  description: "THE OFFICIAL PLANNING APPLICATION OF THE FAM GROUP CHAT",
  // WhatsApp share card: title + description only, deliberately no og:image
  openGraph: {
    title: "Thailand Round 2",
    description: "THE OFFICIAL PLANNING APPLICATION OF THE FAM GROUP CHAT",
    type: "website",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Thailand '26",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#faf3e3",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${karla.variable} ${caveat.variable}`}>
      <body className="antialiased">
        <Providers>
          {children}
          <PinDetailSheet />
          <AddPinFlow />
          <TabBar />
        </Providers>
      </body>
    </html>
  );
}
