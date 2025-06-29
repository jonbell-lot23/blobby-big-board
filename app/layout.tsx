import type React from "react"
import type { Metadata } from "next"
import { Nunito } from "next/font/google"
import "./globals.css"
import { cn } from "@/lib/utils"

// Set up the Nunito font with next/font
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-sans", // Assign it to the CSS variable that Tailwind uses
})

export const metadata: Metadata = {
  title: "Blobby Project Tracker",
  description: "A fun, gooey project tracker built with Next.js and Framer Motion.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", nunito.variable)}>{children}</body>
    </html>
  )
}
