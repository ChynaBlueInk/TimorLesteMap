// app/layout.tsx
import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import "./globals.css";

// ⬇️ Client-only Navigation (prevents client hooks from running on the server)
const Navigation = dynamic(() => import("@/components/Navigation"), { ssr: false });

export const metadata: Metadata = {
  title: "Planeador viajen Timor: Places & Histories",
  description:
    "Discover the rich history and culture of Timor-Leste through interactive maps and community stories",
  generator: "v0.app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {/* Render global nav (client-only) */}
        <Suspense fallback={null}>
          <Navigation />
        </Suspense>

        {/* Page content */}
        <Suspense fallback={null}>{children}</Suspense>

        <Analytics />
      </body>
    </html>
  );
}
