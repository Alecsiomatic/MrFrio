"use client"

import { useEffect, useState } from "react"
import { useToast } from "./toast-notification"

export function RestablecerEstadosAutomatico() {
  const [restableciendo, setRestableciendo] = useState(false)
  const { showToast } = useToast()
  const [ultimaVerificacion, setUltimaVerificacion] = useState<string | null>(null)

  useEffect(() => {
    // Verificar si ya se ha verificado hoy
    const fechaUltimaVerificacion = localStorage.getItem("ultimaVerificacionEstados")
    const hoy = new Date().toISOString().split("T")[0] // Formato YYYY-MM-DD

    setUltimaVerificacion(fechaUltimaVerificacion)

    // Si no se ha verificado hoy, restablecer estados automáticamente
    if (fechaUltimaVerificacion !== hoy) {
      restablecerEstados()
    }
  }, [])

  const restablecerEstados = async () => {
    if (restableciendo) return

    setRestableciendo(true)
    try {
      // Primero, restablecer los estados de pedidos de días anteriores
      const responsePedidos = await fetch("/api/pedidos/restablecer-estados", {
        method: "POST",
      })

      if (!responsePedidos.ok) {
        throw new Error("Error al restablecer estados de pedidos")
      }

      const dataPedidos = await responsePedidos.json()

      // Luego, restablecer los estados de seguimiento para el día actual
      const responseSeguimiento = await fetch("/api/pedidos/restablecer-seguimiento", {
        method: "POST",
      })

      if (!responseSeguimiento.ok) {
        throw new Error("Error al restablecer estados de seguimiento")
      }

      const dataSeguimiento = await responseSeguimiento.json()

      // Guardar la fecha de verificación en localStorage
      const hoy = new Date().toISOString().split("T")[0]
      localStorage.setItem("ultimaVerificacionEstados", hoy)
      setUltimaVerificacion(hoy)

      // Mostrar notificación si se afectaron filas
      const totalAfectados = (dataPedidos.affectedRows || 0) + (dataSeguimiento.affectedRows || 0)
      if (totalAfectados > 0) {
        showToast(`Se han restablecido ${totalAfectados} registros para el nuevo día`, "success")
      }
    } catch (error) {
      console.error("Error al restablecer estados:", error)
    } finally {
      setRestableciendo(false)
    }
  }

  // Este componente no renderiza nada visible
  return null
}
