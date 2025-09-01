import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AppLayout } from "@/components/layout/app-layout" // Added AppLayout import
import { Suspense } from "react" // Added Suspense import
import "./globals.css"

export const metadata: Metadata = {
  title: "Zanda Clone - Appointment System", // Updated title
  description: "Professional appointment management system", // Updated description
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        {/* Wrapped children in AppLayout and Suspense for consistent navigation */}
        <Suspense fallback={<div>Loading...</div>}>
          <AppLayout>{children}</AppLayout>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
