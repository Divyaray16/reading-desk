import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Newsreader } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://readingdesk.vercel.app"),
  title: "Reading Desk",
  description: "Discover something new in design, every morning. No login.",
  openGraph: {
    title: "Reading Desk",
    description: "Discover something new in design, every morning. No login.",
    url: "https://readingdesk.vercel.app",
    siteName: "Reading Desk",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reading Desk",
    description: "Discover something new in design, every morning. No login.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${newsreader.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
