"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Truck, Menu, X, Home, DollarSign, CreditCard, FileText, LayoutDashboard, TrendingDown } from "lucide-react"
import { LogoutButton } from "@/components/logout-button"
import type { AppRole } from "@/auth.config"

interface NavbarProps {
  userRole?: AppRole
}

export function Navbar({ userRole }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const normalizedRole = userRole ?? undefined
  const isRutero = normalizedRole === "REPARTIDOR"

  return (
    <nav className="bg-black/80 border-b border-gray-800 sticky top-0 z-40 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center">
            <Image src="/mrfrio-logo.png" alt="Mr. Frio" width={120} height={40} className="h-8 w-auto" />
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            {isRutero ? (
              <LogoutButton />
            ) : (
              <>
                <Link
                  href="/"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Inicio
                </Link>
                <Link
                  href="/seguimiento"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  Seguimiento
                </Link>
                <Link
                  href="/precios"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Precios
                </Link>
                <Link
                  href="/admin/credito"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Credito
                </Link>
                <Link
                  href="/salidas-dinero"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Salidas
                </Link>
                <Link
                  href="/reportes"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Reportes
                </Link>
                <Link
                  href="/admin"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Panel
                </Link>
                <div className="pl-2 ml-2 border-l border-gray-800">
                  <LogoutButton />
                </div>
              </>
            )}
          </div>

          <div className="md:hidden">
            {isRutero ? (
              <LogoutButton />
            ) : (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-400 hover:text-white focus:outline-none focus:text-white"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {!isRutero && isMenuOpen && (
        <div className="md:hidden bg-gray-900/90 backdrop-blur-sm">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="flex items-center">
                <Home className="h-5 w-5 mr-2" />
                Inicio
              </div>
            </Link>
            <Link
              href="/seguimiento"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                Seguimiento
              </div>
            </Link>
            <Link
              href="/admin"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="flex items-center">
                <LayoutDashboard className="h-5 w-5 mr-2" />
                Panel
              </div>
            </Link>
            <Link
              href="/precios"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Precios
              </div>
            </Link>
            <Link
              href="/admin/credito"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Credito
              </div>
            </Link>
            <Link
              href="/salidas-dinero"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="flex items-center">
                <TrendingDown className="h-5 w-5 mr-2" />
                Salidas
              </div>
            </Link>
            <Link
              href="/reportes"
              className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              <div className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Reportes
              </div>
            </Link>
            <div className="px-3 py-2">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
