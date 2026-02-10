import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { auth } from "@/auth"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Mr. Frio - Sistema de Gestion",
  description: "Sistema de gestion para Mr. Frio de San Luis",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  const role = session?.user.role

  return (
    <html lang="es">
      <body className={inter.className}>
        {session ? <Navbar userRole={role} /> : null}
        {children}
      </body>
    </html>
  )
}
