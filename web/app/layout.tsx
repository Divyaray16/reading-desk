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
  title: "Reading Desk",
  description: "Three articles for the work in front of you. No login.",
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
