import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { branding } from "@/config/branding";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${branding.name} — ${branding.tagline}`,
    template: `%s | ${branding.shortName}`,
  },
  description: branding.description,
  keywords: [
    "developer community",
    "software showcase",
    "collaboration marketplace",
    "developer portfolio",
    "coding streaks",
    "open source",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col font-sans antialiased bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-200`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <Suspense fallback={<div className="h-16 w-full border-b border-neutral-200 dark:border-neutral-800" />}>
              <Navbar />
            </Suspense>
            <main className="flex-1 w-full">
              <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-xs text-neutral-400">Loading platform...</div>}>
                {children}
              </Suspense>
            </main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
