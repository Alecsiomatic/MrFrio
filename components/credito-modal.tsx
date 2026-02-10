"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ToastNotification } from "@/components/toast-notification"
import { formatCurrency } from "@/lib/utils-client"

interface CreditoModalProps {
  isOpen: boolean
  onClose: () => void
  clienteId: string // Cambiado de number a string
  pedidoId: number
  total: number
  onCreditoAplicado: (montoCreditoUsado: number) => void
}

export function CreditoModal({ isOpen, onClose, clienteId, pedidoId, total, onCreditoAplicado }: CreditoModalProps) {
  const [loading, setLoading] = useState(false)
  const [creditoInfo, setCreditoInfo] = useState<{
    limite_credito: number
    credito_usado: number
    credito_disponible: number
  } | null>(null)
  const [montoCreditoUsado, setMontoCreditoUsado] = useState<number>(0)
  const [notification, setNotification] = useState<{
    message: string
    type: "success" | "error"
  } | null>(null)

  useEffect(() => {
    if (isOpen && clienteId) {
      fetchCreditoInfo()
    }
  }, [isOpen, clienteId])

  useEffect(() => {
    // Inicializar el monto a usar con el total o el crédito disponible (el menor de los dos)
    if (creditoInfo && total) {
      const montoInicial = Math.min(total, creditoInfo.credito_disponible)
      setMontoCreditoUsado(montoInicial)
    }
  }, [creditoInfo, total])

  const fetchCreditoInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/credito/cliente?clienteId=${clienteId}`)
      const data = await response.json()

      if (data.success) {
        setCreditoInfo(data.credito)
      } else {
        setNotification({
          message: `Error: ${data.message || "No se pudo obtener información de crédito"}`,
          type: "error",
        })
      }
    } catch (error) {
      setNotification({
        message: `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUsarCredito = async () => {
    if (!montoCreditoUsado || montoCreditoUsado <= 0) {
      setNotification({
        message: "El monto a usar debe ser mayor a cero",
        type: "error",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/credito/uso", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId,
          pedidoId,
          monto: montoCreditoUsado,
          descripcion: `Uso de crédito en pedido #${pedidoId} por $${montoCreditoUsado.toFixed(2)}`,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setNotification({
          message: "Crédito aplicado correctamente",
          type: "success",
        })
        onCreditoAplicado(montoCreditoUsado)
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setNotification({
          message: `Error: ${data.message || "No se pudo aplicar el crédito"}`,
          type: "error",
        })
      }
    } catch (error) {
      setNotification({
        message: `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Usar Crédito</h2>

        {loading && !creditoInfo ? (
          <p className="text-center py-4">Cargando información de crédito...</p>
        ) : (
          <>
            {creditoInfo && (
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-100 p-2 rounded">
                    <p className="text-sm text-gray-600">Límite de Crédito</p>
                    <p className="font-bold">{formatCurrency(creditoInfo.limite_credito)}</p>
                  </div>
                  <div className="bg-gray-100 p-2 rounded">
                    <p className="text-sm text-gray-600">Crédito Usado</p>
                    <p className="font-bold">{formatCurrency(creditoInfo.credito_usado)}</p>
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm text-blue-800">Crédito Disponible</p>
                  <p className="font-bold text-blue-800 text-xl">{formatCurrency(creditoInfo.credito_disponible)}</p>
                </div>

                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-sm text-green-800">Total del Pedido</p>
                  <p className="font-bold text-green-800 text-xl">{formatCurrency(total)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto a Usar de Crédito</label>
                  <input
                    type="number"
                    min="0"
                    max={Math.min(creditoInfo.credito_disponible, total)}
                    step="0.01"
                    value={montoCreditoUsado}
                    onChange={(e) => {
                      const value = Number.parseFloat(e.target.value)
                      if (isNaN(value)) {
                        setMontoCreditoUsado(0)
                      } else {
                        const maxValue = Math.min(creditoInfo.credito_disponible, total)
                        setMontoCreditoUsado(Math.min(value, maxValue))
                      }
                    }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {montoCreditoUsado > 0 && (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <p className="text-sm text-yellow-800">A Pagar en Efectivo</p>
                    <p className="font-bold text-yellow-800 text-xl">{formatCurrency(total - montoCreditoUsado)}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleUsarCredito} disabled={loading || !montoCreditoUsado || montoCreditoUsado <= 0}>
                {loading ? "Aplicando..." : "Aplicar Crédito"}
              </Button>
            </div>
          </>
        )}

        {notification && (
          <ToastNotification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </div>
  )
}
