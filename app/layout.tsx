// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import "./globals.css";

// ⬇️ Client-only Navigation (prevents Radix from running on the server)
const Navigation = dynamic(() => import("@/components/Navigation"), { ssr: false });

export const metadata: Metadata = {
  title: "Harii Timor: Places & Histories",
  description:
    "Discover the rich history and culture of Timor-Leste through interactive maps and community stories",
  generator: "v0.app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* Nav renders only in the browser, avoiding `window` access on the server */}
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  );
}
