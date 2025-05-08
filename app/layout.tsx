import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { BatteryProvider } from "@/context/battery-context"

export const metadata: Metadata = {
  title: "FRC Battery Tracker",
  description: "Created for Team 10219",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark">
          <BatteryProvider>{children}</BatteryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
