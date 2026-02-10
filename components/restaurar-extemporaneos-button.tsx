"use client"

import { useState } from "react"
import { RefreshCw, Loader2 } from "lucide-react"
import { useToast } from "./toast-notification"

export function RestaurarExtemporaneosButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { showToast } = useToast()

  const handleRestaurarExtemporaneos = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/pedidos/restaurar-extemporaneos", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        showToast(`Pedidos extemporáneos restaurados: ${data.affectedRows} pedidos actualizados`, "success")
      } else {
        showToast("Error al restaurar pedidos extemporáneos", "error")
      }
    } catch (error) {
      console.error("Error al restaurar pedidos extemporáneos:", error)
      showToast("Error al restaurar pedidos extemporáneos", "error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleRestaurarExtemporaneos}
      disabled={isLoading}
      className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Restaurando...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Restaurar Pedidos Extemporáneos
        </>
      )}
    </button>
  )
}
