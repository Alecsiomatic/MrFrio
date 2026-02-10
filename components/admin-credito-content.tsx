"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, DollarSign, ArrowUpCircle, ArrowDownCircle, Search } from "lucide-react"
import { ClienteSearch } from "@/components/cliente-search"

// Funciones de utilidad para formatear moneda y fechas
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

interface Cliente {
  id: string
  nombre: string
  limite_credito: number
  credito_usado: number
  credito_disponible: number
}

interface HistorialCredito {
  id: number
  fecha: string
  monto: number
  tipo: "uso" | "pago"
  pedido_id: number | null
  descripcion: string
}

export function AdminCreditoContent() {
  const [loading, setLoading] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [historialCredito, setHistorialCredito] = useState<HistorialCredito[]>([])
  const [nuevoLimite, setNuevoLimite] = useState<string>("")
  const [montoPago, setMontoPago] = useState<string>("")
  const [descripcionPago, setDescripcionPago] = useState<string>("")
  const { toast } = useToast()

  // Referencia para evitar consultas infinitas
  const clienteIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (clienteSeleccionado && clienteSeleccionado.id !== clienteIdRef.current) {
      clienteIdRef.current = clienteSeleccionado.id
      fetchCreditoInfo(clienteSeleccionado.id)
      setNuevoLimite(clienteSeleccionado.limite_credito.toString())
    }
  }, [clienteSeleccionado])

  const fetchCreditoInfo = async (clienteId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/credito/cliente?clienteId=${clienteId}`)
      const data = await response.json()

      if (data.success) {
        // Actualizar el cliente seleccionado sin cambiar el ID
        setClienteSeleccionado((prevCliente) => {
          if (!prevCliente || prevCliente.id !== clienteId) return data.credito
          return {
            ...prevCliente,
            limite_credito: data.credito.limite_credito,
            credito_usado: data.credito.credito_usado,
            credito_disponible: data.credito.credito_disponible,
          }
        })
        setHistorialCredito(data.historial)
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudo obtener información de crédito",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al obtener información de crédito:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClienteSeleccionado = (cliente: any) => {

    // Inicializar valores de crédito si no existen
    const limiteCredito = cliente.limite_credito !== undefined ? cliente.limite_credito : 0
    const creditoUsado = cliente.credito_usado !== undefined ? cliente.credito_usado : 0
    const creditoDisponible =
      cliente.credito_disponible !== undefined ? cliente.credito_disponible : limiteCredito - creditoUsado

    // Resetear la referencia para permitir una nueva consulta
    clienteIdRef.current = null

    setClienteSeleccionado({
      id: cliente.id,
      nombre: cliente.local || cliente.nombre,
      limite_credito: limiteCredito,
      credito_usado: creditoUsado,
      credito_disponible: creditoDisponible,
    })
  }

  const handleActualizarLimite = async () => {
    if (!clienteSeleccionado) return

    const limiteNumerico = Number.parseFloat(nuevoLimite)
    if (isNaN(limiteNumerico) || limiteNumerico < 0) {
      toast({
        title: "Error",
        description: "Por favor ingresa un límite de crédito válido",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/credito/cliente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: clienteSeleccionado.id,
          limiteCredito: limiteNumerico,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Límite de crédito actualizado correctamente",
        })
        // Forzar una nueva consulta
        clienteIdRef.current = null
        fetchCreditoInfo(clienteSeleccionado.id)
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudo actualizar el límite de crédito",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al actualizar límite:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegistrarPago = async () => {
    if (!clienteSeleccionado) return

    const montoNumerico = Number.parseFloat(montoPago)
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      toast({
        title: "Error",
        description: "Por favor ingresa un monto de pago válido",
        variant: "destructive",
      })
      return
    }

    if (montoNumerico > clienteSeleccionado.credito_usado) {
      toast({
        title: "Error",
        description: "El monto del pago no puede ser mayor que el crédito usado",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/credito/pago", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: clienteSeleccionado.id,
          monto: montoNumerico,
          descripcion: descripcionPago || `Pago de crédito por $${montoNumerico.toFixed(2)}`,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Éxito",
          description: "Pago registrado correctamente",
        })
        setMontoPago("")
        setDescripcionPago("")
        // Forzar una nueva consulta
        clienteIdRef.current = null
        fetchCreditoInfo(clienteSeleccionado.id)
      } else {
        toast({
          title: "Error",
          description: data.message || "No se pudo registrar el pago",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al registrar pago:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Función para manejar cambios en campos numéricos
  const handleNumericInput = (value: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    // Permitir cadena vacía
    if (value === "") {
      setter("")
      return
    }

    // Permitir solo números y un punto decimal
    if (/^[0-9]*\.?[0-9]*$/.test(value)) {
      setter(value)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-900 rounded-lg p-4 shadow-md">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center">
          <Search className="mr-2 h-5 w-5" />
          Buscar Cliente
        </h2>
        <ClienteSearch onSelect={handleClienteSeleccionado} />
      </div>

      {loading && (
        <div className="text-center py-8 bg-gray-800 rounded-lg">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2 text-gray-300">Cargando información de crédito...</p>
        </div>
      )}

      {clienteSeleccionado && !loading && (
        <>
          <div className="bg-gray-900 rounded-lg p-4 shadow-md">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Cliente: <span className="ml-2 text-blue-400">{clienteSeleccionado.nombre}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-gray-300 font-medium">Límite de Crédito</h3>
                  <DollarSign className="h-5 w-5 text-yellow-500" />
                </div>
                <p className="font-bold text-2xl text-yellow-400">
                  {formatCurrency(clienteSeleccionado.limite_credito)}
                </p>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-gray-300 font-medium">Crédito Usado</h3>
                  <ArrowDownCircle className="h-5 w-5 text-red-500" />
                </div>
                <p className="font-bold text-2xl text-red-400">{formatCurrency(clienteSeleccionado.credito_usado)}</p>
              </div>

              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-gray-300 font-medium">Crédito Disponible</h3>
                  <ArrowUpCircle className="h-5 w-5 text-green-500" />
                </div>
                <p className="font-bold text-2xl text-green-400">
                  {formatCurrency(clienteSeleccionado.credito_disponible)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 rounded-lg p-4 shadow-md">
              <h2 className="text-xl font-bold text-white mb-4">Actualizar Límite de Crédito</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nuevo Límite de Crédito</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={nuevoLimite}
                      onChange={(e) => handleNumericInput(e.target.value, setNuevoLimite)}
                      placeholder="Ingresa el nuevo límite"
                      className="pl-8 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-white"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleActualizarLimite}
                  disabled={loading || nuevoLimite === clienteSeleccionado.limite_credito.toString()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? "Actualizando..." : "Actualizar Límite"}
                </Button>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 shadow-md">
              <h2 className="text-xl font-bold text-white mb-4">Registrar Pago</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Monto del Pago</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={montoPago}
                      onChange={(e) => handleNumericInput(e.target.value, setMontoPago)}
                      placeholder="Ingresa el monto del pago"
                      className="pl-8 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-white"
                    />
                  </div>
                  {clienteSeleccionado.credito_usado > 0 && (
                    <div className="mt-1 text-xs text-gray-400 flex justify-between">
                      <span>Máximo: {formatCurrency(clienteSeleccionado.credito_usado)}</span>
                      <button
                        type="button"
                        className="text-blue-400 hover:text-blue-300"
                        onClick={() => setMontoPago(clienteSeleccionado.credito_usado.toString())}
                      >
                        Pagar todo
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Descripción (opcional)</label>
                  <input
                    type="text"
                    value={descripcionPago}
                    onChange={(e) => setDescripcionPago(e.target.value)}
                    placeholder="Ej: Pago en efectivo"
                    className="block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-white"
                  />
                </div>
                <Button
                  onClick={handleRegistrarPago}
                  disabled={
                    loading ||
                    montoPago === "" ||
                    Number.parseFloat(montoPago) <= 0 ||
                    Number.parseFloat(montoPago) > clienteSeleccionado.credito_usado
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? "Registrando..." : "Registrar Pago"}
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4 shadow-md">
            <h2 className="text-xl font-bold text-white mb-4">Historial de Crédito</h2>
            {historialCredito.length === 0 ? (
              <div className="text-center py-8 bg-gray-800 rounded-lg border border-dashed border-gray-700">
                <p className="text-gray-400">No hay registros de crédito para este cliente</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Monto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Descripción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {historialCredito.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {formatDate(new Date(item.fecha))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.tipo === "uso" ? "bg-red-900 text-red-200" : "bg-green-900 text-green-200"
                            }`}
                          >
                            {item.tipo === "uso" ? "Uso" : "Pago"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={item.tipo === "uso" ? "text-red-400" : "text-green-400"}>
                            {item.tipo === "uso" ? "-" : "+"}
                            {formatCurrency(item.monto)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {item.descripcion}
                          {item.pedido_id && (
                            <span className="ml-2 text-xs text-blue-400">(Pedido #{item.pedido_id})</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!clienteSeleccionado && !loading && (
        <div className="bg-gray-800 border border-gray-700 text-gray-300 p-6 rounded-lg text-center">
          <CreditCard className="h-12 w-12 mx-auto mb-4 text-blue-500" />
          <p className="text-lg">Selecciona un cliente para gestionar su crédito</p>
          <p className="text-sm text-gray-400 mt-2">
            Podrás establecer límites de crédito, registrar pagos y ver el historial de transacciones
          </p>
        </div>
      )}
    </div>
  )
}
