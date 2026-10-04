import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bank of Dad",
  description: "A simple family money ledger",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
