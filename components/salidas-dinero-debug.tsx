"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface Rutero {
  id: number
  nombre: string
  telefono: string
  activo: boolean
}

interface SalidaEfectivo {
  id: number
  rutero_id: number
  rutero_nombre: string
  fecha: string
  motivo: string
  monto: number
  fecha_creacion: string
  fecha_actualizacion: string
}

export default function SalidasDineroDebug() {
  const [ruteros, setRuteros] = useState<Rutero[]>([])
  const [salidas, setSalidas] = useState<SalidaEfectivo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testRuteros = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Probando /api/ruteros...")
      const response = await fetch("/api/ruteros")

      console.log("Response status:", response.status)
      console.log("Response headers:", response.headers)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text()
      console.log("Response text:", text)

      const data = JSON.parse(text)
      console.log("Parsed data:", data)

      setRuteros(data)
    } catch (error) {
      console.error("Error en testRuteros:", error)
      setError(error instanceof Error ? error.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const testSalidas = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Probando /api/salidas-efectivo...")
      const response = await fetch("/api/salidas-efectivo")

      console.log("Response status:", response.status)
      console.log("Response headers:", response.headers)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text()
      console.log("Response text:", text)

      const data = JSON.parse(text)
      console.log("Parsed data:", data)

      setSalidas(data)
    } catch (error) {
      console.error("Error en testSalidas:", error)
      setError(error instanceof Error ? error.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const testCreateSalida = async () => {
    if (ruteros.length === 0) {
      setError("Primero carga los ruteros")
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log("Probando crear salida...")
      const response = await fetch("/api/salidas-efectivo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rutero_id: ruteros[0].id,
          motivo: "Prueba desde debug",
          monto: 100.5,
        }),
      })

      console.log("Response status:", response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const text = await response.text()
      console.log("Response text:", text)

      const data = JSON.parse(text)
      console.log("Parsed data:", data)

      // Recargar salidas
      testSalidas()
    } catch (error) {
      console.error("Error en testCreateSalida:", error)
      setError(error instanceof Error ? error.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-6">
      <Card className="bg-gray-900 border-gray-800 max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-white">Debug - Salidas de Efectivo</CardTitle>
          <CardDescription className="text-blue-200">
            Panel de pruebas para diagnosticar problemas con la API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Botones de prueba */}
          <div className="flex gap-4 flex-wrap">
            <Button onClick={testRuteros} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Cargando..." : "Probar Ruteros"}
            </Button>

            <Button onClick={testSalidas} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? "Cargando..." : "Probar Salidas"}
            </Button>

            <Button
              onClick={testCreateSalida}
              disabled={loading || ruteros.length === 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Cargando..." : "Crear Salida Prueba"}
            </Button>
          </div>

          {/* Mostrar errores */}
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
              <h3 className="text-red-300 font-medium mb-2">Error:</h3>
              <pre className="text-red-200 text-sm whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {/* Mostrar ruteros */}
          {ruteros.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Ruteros cargados ({ruteros.length}):</h3>
              <pre className="text-gray-300 text-sm overflow-auto max-h-40">{JSON.stringify(ruteros, null, 2)}</pre>
            </div>
          )}

          {/* Mostrar salidas */}
          {salidas.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-white font-medium mb-2">Salidas cargadas ({salidas.length}):</h3>
              <pre className="text-gray-300 text-sm overflow-auto max-h-40">{JSON.stringify(salidas, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
