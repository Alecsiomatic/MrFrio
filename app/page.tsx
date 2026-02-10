import { Truck, Calendar, Snowflake } from "lucide-react"
import { AddClientModal } from "@/components/add-client-modal"
import { RouteButton } from "@/components/route-button"
import { DbConnectionStatus } from "@/components/db-connection-status"
import { ExtemporaryOrderModal } from "@/components/extemporary-order-modal"
import { LimpiarExtemporaneosAutomatico } from "@/components/limpiar-extemporaneos-automatico"
import { getDiaActualNombre } from "@/lib/utils-client"
import Image from "next/image"

export default function Home() {
  const diaActual = getDiaActualNombre()

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      {/* Componente para limpiar clientes extemporáneos automáticamente */}
      <LimpiarExtemporaneosAutomatico />

      {/* Header with background effect */}
      <div className="relative">
        <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay pointer-events-none" />
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex justify-center">
            <Image
              src="/mrfrio-logo.png"
              alt="Mr. Frío de San Luis"
              width={320}
              height={64}
              priority
              className="drop-shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 flex-grow">
        {/* Asignar Rutas Section */}
        <div className="relative overflow-hidden border border-gray-700/50 rounded-xl p-8 mb-10 backdrop-blur-sm bg-black/40">
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-6">
              <Snowflake className="h-8 w-8 text-blue-400" />
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                Asignar Rutas de Mr. Frío
              </h1>
              <Snowflake className="h-8 w-8 text-blue-400" />
            </div>

            <div className="flex items-center gap-2 mb-6 bg-blue-500/10 px-4 py-2 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-400" />
              <p className="text-lg text-blue-200">Hoy es {diaActual}</p>
            </div>

            <p className="text-gray-300 text-center max-w-2xl mb-8">
              Selecciona una ruta para ver los clientes asignados para hoy o utiliza las opciones para agregar nuevos
              clientes y pedidos extemporáneos.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-4 w-full sm:w-auto">
              <AddClientModal />
              <ExtemporaryOrderModal />
            </div>
          </div>
        </div>

        {/* Routes Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Truck className="h-6 w-6 text-blue-400" />
            Rutas Principales
          </h2>

          {/* Routes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <RouteButton route="101" clients="18" />
            <RouteButton route="102" clients="22" />
            <RouteButton route="103" clients="15" />
            <RouteButton route="104" clients="19" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
            <RouteButton route="105" clients="16" />
            <RouteButton route="106" clients="14" />
            <RouteButton route="107" clients="20" />
          </div>

          <div className="w-full">
            <RouteButton route="LOCAL" clients="12" special />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/80 border-t border-gray-800 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2025 Mr. Frío de San Luis - Hielo Gourmet. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Database connection status indicator */}
      <DbConnectionStatus />
    </div>
  )
}
