"use client"

import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"
import { useToast } from "./toast-notification"

export function SetupExtraClientsButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { showToast } = useToast()

  const handleSetupExtraClients = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/setup/extra-clients")
      if (response.ok) {
        showToast("Clientes extra configurados correctamente", "success")
      } else {
        showToast("Error al configurar clientes extra", "error")
      }
    } catch (error) {
      console.error("Error al configurar clientes extra:", error)
      showToast("Error al configurar clientes extra", "error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSetupExtraClients}
      disabled={isLoading}
      className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Configurando...
        </>
      ) : (
        <>
          <Plus className="h-4 w-4 mr-2" />
          Configurar Clientes Extra
        </>
      )}
    </button>
  )
}
