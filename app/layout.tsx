import type { Metadata, Viewport } from "next";
import AppClient from "@/app/app-client";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bank of Dad",
  description: "A simple family money ledger",
  manifest: "/manifest.webmanifest",
  applicationName: "Bank of Dad",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bank of Dad",
  },
  icons: {
    icon: "/icons/bank-of-dad.svg",
    apple: "/icons/bank-of-dad.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#172033",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppClient />
        {children}
      </body>
    </html>
  );
}
