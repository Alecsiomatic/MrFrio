"use client"

import { useEffect, useState } from "react"
import { useToast } from "./toast-notification"

export function LimpiarExtemporaneosAutomatico() {
  const [limpiando, setLimpiando] = useState(false)
  const { showToast } = useToast()
  const [ultimaLimpieza, setUltimaLimpieza] = useState<string | null>(null)

  useEffect(() => {
    // Verificar si ya se ha limpiado hoy
    const fechaUltimaLimpieza = localStorage.getItem("ultimaLimpiezaExtemporaneos")
    const hoy = new Date().toISOString().split("T")[0] // Formato YYYY-MM-DD

    setUltimaLimpieza(fechaUltimaLimpieza)

    // Si no se ha limpiado hoy, limpiar automáticamente
    if (fechaUltimaLimpieza !== hoy) {
      limpiarClientesExtemporaneos()
    }
  }, [])

  const limpiarClientesExtemporaneos = async () => {
    if (limpiando) return

    setLimpiando(true)
    try {
      const response = await fetch("/api/clientes/limpiar-extemporaneos", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()

        // Guardar la fecha de limpieza en localStorage
        const hoy = new Date().toISOString().split("T")[0]
        localStorage.setItem("ultimaLimpiezaExtemporaneos", hoy)
        setUltimaLimpieza(hoy)

        // Solo mostrar notificación si se afectaron filas
        if (data.affectedRows > 0) {
          showToast(`Se han eliminado ${data.affectedRows} asignaciones extemporáneas antiguas`, "success")
        }
      } else {
        console.error("Error al limpiar clientes extemporáneos")
      }
    } catch (error) {
      console.error("Error al limpiar clientes extemporáneos:", error)
    } finally {
      setLimpiando(false)
    }
  }

  // Este componente no renderiza nada visible
  return null
}
