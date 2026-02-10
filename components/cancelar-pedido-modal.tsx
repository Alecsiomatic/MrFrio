"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, Loader2, XCircle } from "lucide-react"
import { useToast } from "./toast-notification"

type CancelarPedidoModalProps = {
  isOpen: boolean
  onClose: () => void
  cliente: {
    id: string
    local: string
  }
  onConfirm: (motivo: string) => void
}

export function CancelarPedidoModal({ isOpen, onClose, cliente, onConfirm }: CancelarPedidoModalProps) {
  const [mounted, setMounted] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()

  // Asegurarse de que el componente está montado antes de usar createPortal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Reiniciar el motivo cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setMotivo("")
    }
  }, [isOpen])

  // Manejar la confirmación de cancelación
  const handleConfirm = async () => {
    if (!motivo.trim()) {
      showToast("Debes ingresar un motivo de cancelación", "error")
      return
    }

    setIsSubmitting(true)
    try {
      // Llamar a la función de confirmación
      onConfirm(motivo)

      // Cerrar el modal
      onClose()
    } catch (error) {
      console.error("Error al cancelar pedido:", error)
      showToast("Error al cancelar el pedido", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Bloquear el scroll cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  // El modal que se renderizará en el portal
  const modalContent =
    isOpen && mounted
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={onClose}
              style={{ animation: "fadeIn 150ms ease-out" }}
            ></div>

            {/* Modal Content */}
            <div
              className="relative w-full max-w-md mx-4 overflow-y-auto max-h-[90vh] border border-gray-700/50 rounded-xl backdrop-blur-sm bg-black/90 text-white"
              style={{ animation: "fadeIn 200ms ease-out" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botón de cierre */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-full p-1.5 bg-gray-800/80 text-gray-400 transition-colors hover:text-white hover:bg-gray-700 z-20"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Cerrar</span>
              </button>

              {/* Contenido del modal */}
              <div className="p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-red-900/30 p-3 rounded-full">
                    <XCircle className="h-8 w-8 text-red-500" />
                  </div>
                </div>

                <h2 className="text-xl font-bold text-center mb-2">Cancelar Pedido</h2>
                <p className="text-gray-400 text-center mb-4">
                  Cliente: <span className="text-white">{cliente.local}</span>
                </p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label htmlFor="motivo" className="block text-sm text-gray-300 mb-2">
                      Motivo de la cancelación:
                    </label>
                    <textarea
                      id="motivo"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      className="w-full h-24 py-2 px-3 rounded-lg border border-gray-700 bg-gray-800 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                      placeholder="Ingresa el motivo de la cancelación..."
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={isSubmitting || !motivo.trim()}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Confirmar Cancelación
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return modalContent
}
