import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "UZJTA — Association of Japanese Language Teachers in Uzbekistan",
    template: "%s | UZJTA",
  },
  description:
    "Official blog of the Uzbekistan Association of Japanese Language Teachers (UZJTA). Connecting Japanese language educators across Uzbekistan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
