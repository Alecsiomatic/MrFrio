import { Suspense } from "react"
import { Truck, Calendar } from "lucide-react"
import { SeguimientoContent } from "@/components/seguimiento-content"
import { getDiaActualNombre } from "@/lib/utils-client"
import { RestablecerEstadosAutomatico } from "@/components/restablecer-estados-automatico"

export default function SeguimientoPage() {
  const diaActual = getDiaActualNombre()

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      {/* Componente para restablecer estados de pedidos automáticamente */}
      <RestablecerEstadosAutomatico />

      {/* Header with background effect */}
      <div className="relative">
        <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay pointer-events-none" />
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex justify-center">
            <img src="/mrfrio-logo.png" alt="Mr. Frío de San Luis" width={320} height={64} className="drop-shadow-lg" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 flex-grow">
        {/* Seguimiento Section */}
        <div className="relative overflow-hidden border border-gray-700/50 rounded-xl p-8 mb-10 backdrop-blur-sm bg-black/40">
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Truck className="h-6 w-6 text-blue-400" />
              <h1 className="text-3xl font-bold text-center">Rutas Disponibles (Día Actual)</h1>
            </div>

            <div className="flex items-center gap-2 mb-6 justify-center">
              <Calendar className="h-5 w-5 text-blue-400" />
              <p className="text-lg text-blue-200">Hoy es {diaActual}</p>
            </div>

            <Suspense fallback={<div className="text-center py-8">Cargando rutas...</div>}>
              <SeguimientoContent />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/80 border-t border-gray-800 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2025 Mr. Frío de San Luis - Hielo Gourmet. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
