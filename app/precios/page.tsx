import { PreciosContent } from "@/components/precios-content"

export default function PreciosPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay pointer-events-none" />
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex justify-center">
            <img src="/mrfrio-logo.png" alt="Mr. Frío de San Luis" width={320} height={64} className="drop-shadow-lg" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="relative overflow-hidden border border-gray-700/50 rounded-xl p-8 mb-10 backdrop-blur-sm bg-black/40">
          {/* Decorative elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center justify-center gap-2 mb-6">
              <h1 className="text-3xl font-bold text-center">Administración de Precios</h1>
            </div>

            <PreciosContent />
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
