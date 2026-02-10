"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import { X, Search, Loader2, MapPin, Store, AlertCircle, Calendar } from "lucide-react"
import { useToast } from "./toast-notification"
import { getDiaActualColumna, getDiaActualNombre } from "@/lib/utils-client"

type Cliente = {
  id: string
  local: string
  direccion: string
  lat?: number
  lng?: number
  isExtra?: boolean
  distancia?: number
  rutaRecomendada?: string
}

type Ruta = {
  id: string
  nombre: string
  primerCliente?: {
    id: string | null
    lat: number | null
    lng: number | null
  } | null
}

export function ExtemporaryOrderModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [todosLosClientes, setTodosLosClientes] = useState<Cliente[]>([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [selectedRutaId, setSelectedRutaId] = useState<string | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()
  const diaActual = getDiaActualNombre()
  const [dataCargada, setDataCargada] = useState(false)

  // Filtrar clientes según el término de búsqueda
  const clientesFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return []

    const termino = searchTerm.toLowerCase()
    return todosLosClientes.filter(
      (cliente) =>
        cliente.local.toLowerCase().includes(termino) ||
        cliente.direccion.toLowerCase().includes(termino) ||
        cliente.id.toLowerCase().includes(termino),
    )
  }, [searchTerm, todosLosClientes])

  // Asegurarse de que el componente está montado antes de usar createPortal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Cargar datos cuando se abre el modal (solo una vez)
  useEffect(() => {
    if (!isOpen || dataCargada) return

    async function cargarDatos() {
      setIsLoading(true)
      try {
        // Obtener el día actual para filtrar los clientes
        const diaActual = getDiaActualColumna()

        // 1. Cargar todas las rutas
        const rutasResponse = await fetch("/api/rutas")
        if (!rutasResponse.ok) {
          throw new Error("Error al cargar las rutas")
        }
        const rutasData = await rutasResponse.json()

        // 2. Cargar todos los clientes que no sean del día actual
        const clientesResponse = await fetch(`/api/clientes/no-dia?excluirDia=${diaActual}`)
        if (!clientesResponse.ok) {
          throw new Error("Error al cargar los clientes")
        }
        const clientesData = await clientesResponse.json()

        // Actualizar el estado
        setRutas(rutasData)
        setTodosLosClientes(clientesData)
        setDataCargada(true)
      } catch (error) {
        console.error("Error al cargar datos:", error)
        showToast(error instanceof Error ? error.message : "Error al cargar datos", "error")
      } finally {
        setIsLoading(false)
      }
    }

    cargarDatos()
  }, [isOpen, dataCargada, showToast])

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

  const handleCloseModal = useCallback(() => {
    setIsOpen(false)
    setSearchTerm("")
    setClienteSeleccionado(null)
    setSelectedRutaId(null)
  }, [])

  // Manejar la tecla Escape para cerrar el modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleCloseModal()
      }
    }

    document.addEventListener("keydown", handleEscapeKey)
    return () => {
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [handleCloseModal, isOpen])

  // Función para confirmar la asignación extemporánea
  const handleConfirm = async () => {
    if (!clienteSeleccionado) {
      showToast("Selecciona un cliente para continuar", "error")
      return
    }

    if (!selectedRutaId) {
      showToast("Selecciona una ruta para continuar", "error")
      return
    }

    setIsConfirming(true)

    try {
      // Enviar la solicitud para asignar el cliente extemporáneamente
      const response = await fetch("/api/clientes/extemporaneo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteId: clienteSeleccionado.id,
          rutaId: selectedRutaId,
        }),
      })

      if (response.ok) {
        showToast("Cliente asignado extemporáneamente a la ruta solo para hoy", "success")
        handleCloseModal()
      } else {
        const error = await response.json()
        throw new Error(error.message || "Error al asignar el cliente extemporáneamente")
      }
    } catch (error) {
      console.error("Error al confirmar asignación extemporánea:", error)
      showToast(error instanceof Error ? error.message : "Error al asignar el cliente extemporáneamente", "error")
    } finally {
      setIsConfirming(false)
    }
  }

  // Función para abrir el modal
  const handleOpenModal = () => {
    setIsOpen(true)
    setSearchTerm("")
    setClienteSeleccionado(null)
    setSelectedRutaId(rutas[0]?.id ?? null)
  }

  useEffect(() => {
    if (!isOpen) return

    if (!selectedRutaId && rutas.length > 0) {
      setSelectedRutaId(rutas[0].id)
    }
  }, [isOpen, rutas, selectedRutaId])

  // Botón para abrir el modal
  const triggerButton = (
    <button
      onClick={handleOpenModal}
      className="group bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-black/20 border border-gray-600/30"
    >
      <Search className="h-5 w-5 group-hover:animate-pulse" />
      Cliente Extemporáneo
    </button>
  )

  // El modal que se renderizará en el portal
  const modalContent =
    isOpen && mounted
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={handleCloseModal}
              style={{ animation: "fadeIn 150ms ease-out" }}
            ></div>

            {/* Modal Content */}
            <div
              ref={modalRef}
              className="relative w-full max-w-lg mx-4 overflow-y-auto max-h-[90vh] border border-gray-700/50 rounded-xl backdrop-blur-sm bg-black/90 text-white"
              style={{ animation: "fadeIn 200ms ease-out" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botón de cierre */}
              <button
                onClick={handleCloseModal}
                className="absolute right-4 top-4 rounded-full p-1.5 bg-gray-800/80 text-gray-400 transition-colors hover:text-white hover:bg-gray-700 z-20"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Cerrar</span>
              </button>

              {/* Contenido del modal */}
              <div className="p-6">
                <h2 className="text-xl font-bold text-center mb-2">Cliente Extemporáneo</h2>

                {/* Información del día actual */}
                <div className="flex items-center justify-center gap-2 mb-4 text-blue-400 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Solo para hoy: {diaActual}</span>
                </div>

                {/* Mensaje informativo */}
                <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3 mb-6">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-200">
                      El cliente seleccionado será asignado a la ruta recomendada{" "}
                      <strong>solo para el día de hoy</strong>. Mañana regresará automáticamente a su programación
                      normal.
                    </p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin mb-4" />
                    <p className="text-gray-400">Cargando clientes disponibles...</p>
                  </div>
                ) : (
                  <>
                    {todosLosClientes.length === 0 ? (
                      <div className="text-center py-8 bg-gray-900/50 rounded-lg border border-gray-700/50 mb-6">
                        <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
                        <h3 className="text-lg font-medium text-white mb-2">No hay clientes disponibles</h3>
                        <p className="text-gray-400 px-4">
                          No hay clientes disponibles para asignación extemporánea hoy. Todos los clientes ya están
                          asignados a rutas para hoy o ya tienen asignaciones extemporáneas.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Selector de ruta */}
                        <div className="mb-6">
                          <label className="block text-sm text-gray-300 mb-2">Seleccionar ruta:</label>
                          {rutas.length > 0 ? (
                            <select
                              value={selectedRutaId ?? ""}
                              onChange={(e) => setSelectedRutaId(e.target.value || null)}
                              className="w-full h-10 rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="" disabled>
                                Selecciona una ruta
                              </option>
                              {rutas.map((ruta) => (
                                <option key={ruta.id} value={ruta.id}>
                                  {ruta.nombre}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-sm text-gray-400">No hay rutas disponibles</div>
                          )}
                        </div>

                        {/* Buscador */}
                        <div className="mb-6">
                          <label className="block text-sm text-gray-300 mb-2">
                            Buscar por Nombre, Dirección, o ID:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="flex h-10 w-full rounded-lg border border-gray-700/50 bg-gray-900/50 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Ingresa término de búsqueda..."
                              autoFocus
                            />
                            <div className="h-10 px-3 rounded-lg bg-gray-800 text-gray-400 flex items-center justify-center">
                              <Search className="h-4 w-4" />
                            </div>
                          </div>
                        </div>

                        {/* Resultados de búsqueda */}
                        {searchTerm.trim() && (
                          <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-300 mb-2">
                              Resultados de búsqueda: {clientesFiltrados.length}
                            </h3>
                            {clientesFiltrados.length > 0 ? (
                              <div className="max-h-60 overflow-y-auto border border-gray-700/50 rounded-lg divide-y divide-gray-700/50">
                                {clientesFiltrados.map((cliente) => (
                                  <div
                                    key={cliente.id}
                                    className={`p-3 cursor-pointer hover:bg-gray-800/50 transition-colors ${
                                      clienteSeleccionado?.id === cliente.id
                                        ? "bg-blue-900/30 border-l-2 border-blue-500"
                                        : ""
                                    }`}
                                    onClick={() => setClienteSeleccionado(cliente)}
                                  >
                                    <div className="flex items-start gap-2">
                                      <Store className="h-4 w-4 text-blue-400 mt-0.5" />
                                      <div>
                                        <div className="font-medium">{cliente.local}</div>
                                        <div className="text-sm text-gray-400 flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {cliente.direccion}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                                <p className="text-gray-400">No se encontraron clientes disponibles con ese criterio</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Los clientes que ya tienen asignaciones extemporáneas hoy no aparecen en la lista
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {/* Botones de acción */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleCloseModal}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={
                          isConfirming ||
                          !clienteSeleccionado ||
                          !selectedRutaId ||
                          todosLosClientes.length === 0
                        }
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isConfirming ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          "Confirmar Asignación"
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {triggerButton}
      {modalContent}
    </>
  )
}
