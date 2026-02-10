"use client"

import { useState, useEffect } from "react"
import { Database, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "./toast-notification"

export function DbConnectionStatus() {
  const [status, setStatus] = useState<"loading" | "connected" | "error">("loading")
  const [message, setMessage] = useState<string>("Verificando conexión...")
  const { showToast } = useToast()

  useEffect(() => {
    async function checkConnection() {
      try {
        const response = await fetch("/api/ruteros")

        if (response.ok) {
          setStatus("connected")
          setMessage("Conectado a la base de datos")
        } else {
          setStatus("error")
          setMessage("Error al conectar con la base de datos")
          showToast("Error al conectar con la base de datos. Verifica la configuración.", "error")
        }
      } catch (error) {
        setStatus("error")
        setMessage("Error al conectar con la base de datos")
        showToast("Error al conectar con la base de datos. Verifica la configuración.", "error")
        console.error("Error al verificar conexión:", error)
      }
    }

    checkConnection()
  }, [showToast])

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 shadow-lg flex items-center gap-3">
      {status === "loading" && (
        <div className="animate-spin h-5 w-5 text-blue-500">
          <Database className="h-5 w-5" />
        </div>
      )}
      {status === "connected" && <CheckCircle className="h-5 w-5 text-green-500" />}
      {status === "error" && <XCircle className="h-5 w-5 text-red-500" />}
      <span className="text-sm text-gray-300">{message}</span>
    </div>
  )
}
