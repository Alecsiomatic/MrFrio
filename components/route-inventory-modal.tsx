"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { X, Truck, User, AlertCircle, Package, History, Loader2, Calendar, Check, ArrowLeftRight, Users } from "lucide-react"
import { useToast } from "./toast-notification"

// Tipos de productos disponibles
const PRODUCTOS = [
  { id: "gourmet15", nombre: "GOURMET 15KG" },
  { id: "gourmet5", nombre: "GOURMET 5KG" },
  { id: "barraHielo", nombre: "BARRA HIELO" },
  { id: "mediaBarra", nombre: "MEDIA BARRA" },
  { id: "premium", nombre: "PREMIUM" },
]

// Tipo para los ruteros
type Rutero = {
  id: string
  nombre: string
}

// Tipo para los clientes
type Cliente = {
  id: string
  local: string
  direccion: string
  isExtra?: boolean
  es_extemporaneo?: boolean | number
}

// Tipo para los pedidos de clientes
type Pedido = {
  clienteId: string
  productos: {
    [key: string]: number
  }
}

// Tipo para los totales de productos
type Totales = {
  [key: string]: number
}

// Tipo para la carga general
type CargaGeneral = {
  [key: string]: number
}

// Tipo para el historial de sobrantes
type RegistroSobrante = {
  fecha: string
  ruta: string
  productos: {
    [key: string]: number
  }
}

type RouteInventoryModalProps = {
  routeId: string
  routeName: string
  isOpen: boolean
  onClose: () => void
  clientes?: Cliente[]
  diaActual?: string
}

type RutaCancelada = {
  pedidoId: number
  clienteId: string
  clienteNombre: string
  direccion: string
  motivo: string | null
  rutaId: string
  rutaNombre: string | null
}

// Tipos de modo de inventario
type ModoInventario = "individual" | "general"

export function RouteInventoryModal({
  routeId,
  routeName,
  isOpen,
  onClose,
  clientes = [],
  diaActual = "",
}: RouteInventoryModalProps) {
  const [mounted, setMounted] = useState(false)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [totales, setTotales] = useState<Totales>({})
  const [ruteroSeleccionado, setRuteroSeleccionado] = useState("")
  const [ruteroHistorialSeleccionado, setRuteroHistorialSeleccionado] = useState("")
  const [cargaGeneral, setCargaGeneral] = useState<CargaGeneral>({})
  const [modoInventario, setModoInventario] = useState<ModoInventario>("individual")
  const [ruteros, setRuteros] = useState<Rutero[]>([])
  const [historialSobrantes, setHistorialSobrantes] = useState<RegistroSobrante[]>([])
  const [mostrarHistorial, setMostrarHistorial] = useState(false)
  const [asignando, setAsignando] = useState(false)
  const [mostrarRutasCanceladas, setMostrarRutasCanceladas] = useState(false)
  const [rutasCanceladas, setRutasCanceladas] = useState<RutaCancelada[]>([])
  const [isLoadingCanceladas, setIsLoadingCanceladas] = useState(false)
  const [restaurandoPedidoId, setRestaurandoPedidoId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRuteros, setIsLoadingRuteros] = useState(false)
  const [isLoadingSobrantes, setIsLoadingSobrantes] = useState(false)
  const [dataCargada, setDataCargada] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  // Asegurarse de que el componente está montado antes de usar createPortal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Cargar ruteros cuando se abre el modal (solo una vez)
  useEffect(() => {
    async function fetchRuteros() {
      if (!isOpen || dataCargada) return

      setIsLoadingRuteros(true)
      try {
        const response = await fetch("/api/ruteros")
        if (response.ok) {
          const data = await response.json()
          setRuteros(data)

          // Seleccionar el primer rutero por defecto para la ruta LOCAL
          if (routeId === "LOCAL" && data.length > 0) {
            setRuteroHistorialSeleccionado(data[0].id)
          }

          setDataCargada(true)
        } else {
          showToast("Error al cargar los ruteros", "error")
        }
      } catch (error) {
        console.error("Error al cargar ruteros:", error)
        showToast("Error al cargar los ruteros", "error")
      } finally {
        setIsLoadingRuteros(false)
      }
    }

    fetchRuteros()
  }, [isOpen, routeId, showToast, dataCargada])

  // Inicializar pedidos cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)

      if (routeId === "LOCAL") {
        setIsLoading(false)
      } else {
        // Para rutas normales, inicializar pedidos con 0 para cada producto
        if (clientes.length > 0) {
          const pedidosIniciales = clientes.map((cliente) => ({
            clienteId: cliente.id,
            productos: PRODUCTOS.reduce(
              (acc, producto) => {
                acc[producto.id] = 0
                return acc
              },
              {} as { [key: string]: number },
            ),
          }))

          setPedidos(pedidosIniciales)
          calcularTotales(pedidosIniciales)
        }
        setIsLoading(false)
      }
    } else {
      // Reiniciar estados cuando se cierra el modal
      setPedidos([])
      setTotales({})
      setRuteroSeleccionado("")
      setCargaGeneral({})
      setModoInventario("individual")
      setMostrarHistorial(false)
      setMostrarRutasCanceladas(false)
      setRutasCanceladas([])
      setIsLoadingCanceladas(false)
      setRestaurandoPedidoId(null)
    }
  }, [isOpen, routeId, clientes])

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

  // Manejar la tecla Escape para cerrar el modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscapeKey)
    return () => {
      document.removeEventListener("keydown", handleEscapeKey)
    }
  }, [isOpen, onClose])

  const cargarRutasCanceladas = async () => {
    setIsLoadingCanceladas(true)
    try {
      const res = await fetch(`/api/pedidos/cancelados?rutaId=${encodeURIComponent(routeId)}`)
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}))
        throw new Error(errorBody.error || "No se pudieron cargar las rutas canceladas")
      }
      const data = await res.json()
      setRutasCanceladas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error al cargar rutas canceladas:", error)
      showToast(
        error instanceof Error ? error.message : "No se pudieron cargar las rutas canceladas",
        "error",
      )
    } finally {
      setIsLoadingCanceladas(false)
    }
  }

  const handleToggleRutasCanceladas = () => {
    setMostrarRutasCanceladas((prev) => !prev)
  }

  const descancelarPedido = async (pedidoId: number) => {
    setRestaurandoPedidoId(pedidoId)
    try {
      const res = await fetch("/api/pedidos/cancelados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "No se pudo descancelar la dirección")
      }
      setRutasCanceladas((prev) => prev.filter((item) => item.pedidoId !== pedidoId))
      showToast("Pedido descancelado correctamente", "success")
    } catch (error) {
      console.error("Error al descancelar pedido:", error)
      showToast(
        error instanceof Error ? error.message : "Error al descancelar el pedido",
        "error",
      )
    } finally {
      setRestaurandoPedidoId(null)
    }
  }

  useEffect(() => {
    if (isOpen && mostrarRutasCanceladas) {
      void cargarRutasCanceladas()
    }
  }, [isOpen, mostrarRutasCanceladas, routeId])

  // Calcular totales de productos, excluyendo clientes extra
  const calcularTotales = (pedidosActuales: Pedido[]) => {
    const pedidosSinExtras = pedidosActuales.filter((pedido) => {
      const cliente = clientes.find((c) => c.id === pedido.clienteId)
      return !cliente?.isExtra
    })

    const nuevosTotales = PRODUCTOS.reduce((acc, producto) => {
      acc[producto.id] = pedidosSinExtras.reduce(
        (sum, pedido) => sum + (pedido.productos[producto.id] || 0),
        0,
      )
      return acc
    }, {} as Totales)

    setTotales(nuevosTotales)
  }

  // Manejar cambio en la carga general
  const handleCargaGeneralChange = (productoId: string, cantidad: number) => {
    if (cantidad < 0) cantidad = 0

    setCargaGeneral(prev => ({
      ...prev,
      [productoId]: cantidad
    }))
  }

  // Cambiar modo de inventario
  const cambiarModoInventario = (nuevoModo: ModoInventario) => {
    if (nuevoModo === modoInventario) return

    setModoInventario(nuevoModo)

    if (nuevoModo === "individual") {
      // Limpiar y reinicializar para modo individual
      setCargaGeneral({})
      const pedidosLimpios = clientes.map((cliente) => ({
        clienteId: cliente.id,
        productos: PRODUCTOS.reduce(
          (acc, producto) => {
            acc[producto.id] = 0
            return acc
          },
          {} as { [key: string]: number },
        ),
      }))
      setPedidos(pedidosLimpios)
      calcularTotales(pedidosLimpios)
      showToast("Modo individual activado", "success")
    } else {
      // Preparar para modo carga general
      showToast("Modo carga general activado", "success")
    }
  }

  // Obtener el valor de carga general para un producto
  const getCargaGeneralValue = (productoId: string): string => {
    const cantidad = cargaGeneral[productoId]
    return cantidad === 0 ? "" : cantidad?.toString() || ""
  }

  // Manejar cambio en la cantidad de un producto (modo individual)
  const handleCantidadChange = (clienteId: string, productoId: string, cantidad: number) => {
    if (cantidad < 0) cantidad = 0

    const nuevosPedidos = pedidos.map((pedido) => {
      if (pedido.clienteId === clienteId) {
        return {
          ...pedido,
          productos: {
            ...pedido.productos,
            [productoId]: cantidad,
          },
        }
      }
      return pedido
    })

    setPedidos(nuevosPedidos)
    calcularTotales(nuevosPedidos)
  }

  // Asignar ruta a un rutero
  const handleAsignarRuta = async () => {
    if (!ruteroSeleccionado) return

    setAsignando(true)

    try {
      // Preparar los datos para la API
      const asignacionData: {
        rutaId: string
        ruteroId: string
        pedidos: Pedido[]
        modoInventario: ModoInventario
        cargaGeneral?: Record<string, number>
      } = {
        rutaId: routeId,
        ruteroId: ruteroSeleccionado,
        pedidos: pedidos,
        modoInventario,
      }

      if (modoInventario === "general") {
        asignacionData.cargaGeneral = PRODUCTOS.reduce((acc, producto) => {
          acc[producto.id] = cargaGeneral[producto.id] || 0
          return acc
        }, {} as Record<string, number>)
      }

      // Enviar la asignación a la API
      const response = await fetch("/api/asignaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(asignacionData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al asignar ruta")
      }

      showToast("Ruta asignada correctamente. Se ha registrado el inventario inicial.", "success")
      onClose()
    } catch (error) {
      console.error("Error al asignar ruta:", error)
      showToast(error instanceof Error ? error.message : "Error al asignar ruta", "error")
    } finally {
      setAsignando(false)
    }
  }

  // Manejar la visualización del historial y cargar los sobrantes
  const handleVerHistorial = async () => {
    if (!ruteroHistorialSeleccionado) return

    setMostrarHistorial(true)
    setIsLoadingSobrantes(true)

    try {
      const apiUrl = `/api/sobrantes?ruteroId=${ruteroHistorialSeleccionado}`
      const response = await fetch(apiUrl)

      if (response.ok) {
        const data = await response.json()
        setHistorialSobrantes(data)
      } else {
        showToast("Error al cargar el historial de sobrantes", "error")
      }
    } catch (error) {
      console.error("Error al cargar historial de sobrantes:", error)
      showToast("Error al cargar el historial de sobrantes", "error")
    } finally {
      setIsLoadingSobrantes(false)
    }
  }

  // Obtener el valor de un producto para un cliente específico
  const getProductoValue = (clienteId: string, productoId: string): string => {
    const pedidoCliente = pedidos.find((p) => p.clienteId === clienteId)
    if (!pedidoCliente) return ""

    const cantidad = pedidoCliente.productos[productoId]
    return cantidad === 0 ? "" : cantidad.toString()
  }

  // Renderizar el contenido según el tipo de ruta
  const renderizarContenido = () => {
    if (isLoading) {
      return (
        <div className="p-6 flex justify-center items-center h-64">
          <div className="flex flex-col items-center">
            <svg
              className="animate-spin h-10 w-10 text-blue-500 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-gray-400">Cargando datos...</span>
          </div>
        </div>
      )
    }

    if (routeId === "LOCAL") {
      return (
        <>
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <History className="h-6 w-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                Historial de Inventario por Rutero
              </h2>
            </div>
          </div>

          <div className="p-6">
            <div className="max-w-md mx-auto bg-gray-900/70 rounded-lg p-6 border border-gray-700/50">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2 text-center">Selecciona Rutero:</label>
                  {isLoadingRuteros ? (
                    <div className="flex justify-center items-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-400 mr-2" />
                      <span>Cargando ruteros...</span>
                    </div>
                  ) : (
                    <select
                      value={ruteroHistorialSeleccionado}
                      onChange={(e) => {
                        setRuteroHistorialSeleccionado(e.target.value)
                        setMostrarHistorial(false)
                      }}
                      className="w-full py-2 px-3 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {ruteros.length > 0 ? (
                        ruteros.map((rutero) => (
                          <option key={rutero.id} value={rutero.id}>
                            {rutero.nombre}
                          </option>
                        ))
                      ) : (
                        <option value="">No hay ruteros disponibles</option>
                      )}
                    </select>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleVerHistorial}
                    disabled={!ruteroHistorialSeleccionado || isLoadingRuteros}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ver Historial
                  </button>
                </div>
              </div>
            </div>

            {mostrarHistorial && (
              <div className="mt-6 overflow-x-auto">
                {isLoadingSobrantes ? (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400 mr-2" />
                    <span>Cargando historial...</span>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-900/50">
                        <th className="py-3 px-4 text-left text-xs font-medium text-blue-300 uppercase tracking-wider border-b border-gray-800">
                          Ruta
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-blue-300 uppercase tracking-wider border-b border-gray-800">
                          Fecha
                        </th>
                        {PRODUCTOS.map((producto) => (
                          <th
                            key={producto.id}
                            className="py-3 px-4 text-center text-xs font-medium text-blue-300 uppercase tracking-wider border-b border-gray-800"
                          >
                            {producto.nombre}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {historialSobrantes.length > 0 ? (
                        historialSobrantes.map((registro, index) => (
                          <tr
                            key={`${registro.fecha}-${registro.ruta}`}
                            className={index % 2 === 0 ? "bg-gray-900/30" : "bg-gray-900/10"}
                          >
                            <td className="py-3 px-4 text-sm font-medium text-blue-400">{registro.ruta}</td>
                            <td className="py-3 px-4 text-sm text-gray-300">{registro.fecha}</td>
                            <td className="py-3 px-4 text-center text-white">{registro.productos.gourmet15}</td>
                            <td className="py-3 px-4 text-center text-white">{registro.productos.gourmet5}</td>
                            <td className="py-3 px-4 text-center text-white">{registro.productos.barraHielo}</td>
                            <td className="py-3 px-4 text-center text-white">{registro.productos.mediaBarra}</td>
                            <td className="py-3 px-4 text-center text-white">{registro.productos.premium}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="py-4 text-center text-gray-400">
                            No hay registros para este rutero
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </>
      )
    } else {
      // Contenido para rutas normales
      return (
        <>
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6 text-blue-400" />
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200">
                  Inventario de Ruta: {routeName}
                </h2>
              </div>

              {diaActual && (
                <div className="flex items-center text-sm text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full">
                  <Calendar className="h-4 w-4 mr-2" />
                  {diaActual}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {clientes.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-gray-900/50 rounded-lg p-6 inline-block mb-4">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                  <h3 className="text-lg font-medium text-white mb-2">No hay clientes asignados</h3>
                  <p className="text-gray-400">
                    Esta ruta no tiene clientes asignados para el día de hoy. Agrega clientes a esta ruta para poder
                    asignar pedidos.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Selector de modo de inventario */}
                <div className="mb-6">
                  <div className="flex justify-center">
                    <div className="bg-gray-900/50 rounded-lg p-1 border border-gray-700/50 inline-flex">
                      <button
                        onClick={() => cambiarModoInventario("individual")}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                          ${modoInventario === "individual" 
                            ? "bg-blue-600 text-white shadow-lg" 
                            : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                          }
                        `}
                      >
                        <Users className="h-4 w-4" />
                        Inventario Individual
                      </button>
                      
                      <button
                        onClick={() => cambiarModoInventario("general")}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                          ${modoInventario === "general" 
                            ? "bg-green-600 text-white shadow-lg" 
                            : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                          }
                        `}
                      >
                        <Package className="h-4 w-4" />
                        Carga General
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-center mt-3">
                    <p className="text-sm text-gray-400">
                      {modoInventario === "individual" 
                        ? "Asigna cantidades específicas a cada cliente" 
                        : "Define la carga total del camión para distribución automática"
                      }
                    </p>
                  </div>
                </div>

                {/* Contenido según el modo seleccionado */}
                {modoInventario === "general" ? (
                  /* Modo Carga General */
                  <div className="space-y-6">
                    <div className="bg-green-900/10 border border-green-500/30 rounded-lg p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Package className="h-6 w-6 text-green-400" />
                        <h3 className="text-lg font-medium text-green-400">
                          Carga General del Camión
                        </h3>
                      </div>
                      
                      <p className="text-sm text-green-300 mb-6">
                        Ingresa la cantidad total de cada producto. Se distribuirá automáticamente entre los clientes regulares.
                      </p>

                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {PRODUCTOS.map((producto) => (
                          <div key={producto.id} className="space-y-2">
                            <label className="text-sm font-medium text-green-300">
                              {producto.nombre}
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={getCargaGeneralValue(producto.id)}
                              onChange={(e) => {
                                const value = e.target.value
                                if (value === "" || /^[0-9]+$/.test(value)) {
                                  handleCargaGeneralChange(
                                    producto.id,
                                    value === "" ? 0 : parseInt(value)
                                  )
                                }
                              }}
                              className="w-full py-3 px-4 text-center text-lg font-medium rounded-md border border-green-600/50 bg-green-900/20 text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Vista previa de distribución */}
                      {Object.values(cargaGeneral).some(val => val > 0) && (
                        <div className="mt-6 p-4 bg-green-900/20 rounded-lg border border-green-700/30">
                          <h4 className="text-sm font-medium text-green-300 mb-3 flex items-center gap-2">
                            <ArrowLeftRight className="h-4 w-4" />
                            Vista Previa de Distribución
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="text-green-400 font-medium mb-1">Clientes Regulares:</p>
                              <p className="text-gray-300">
                                {clientes.filter(c => !c.isExtra).length} clientes - Distribución equitativa
                              </p>
                            </div>
                            <div>
                              <p className="text-green-400 font-medium mb-1">Clientes Extra:</p>
                              <p className="text-gray-300">
                                {clientes.filter(c => c.isExtra).length} clientes - Carga completa
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Tabla de totales para modo general */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-green-900/20">
                            <th className="py-3 px-4 text-left text-xs font-medium text-green-300 uppercase tracking-wider border-b border-green-800/50">
                              Totales de Carga
                            </th>
                            {PRODUCTOS.map((producto) => (
                              <th
                                key={producto.id}
                                className="py-3 px-4 text-center text-xs font-medium text-green-300 uppercase tracking-wider border-b border-green-800/50"
                              >
                                {producto.nombre}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-green-900/10">
                            <td className="py-3 px-4 text-sm font-medium text-green-400">
                              Total del Camión
                            </td>
                            {PRODUCTOS.map((producto) => (
                              <td key={producto.id} className="py-3 px-4 text-center text-white font-medium">
                                {cargaGeneral[producto.id] || 0}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Modo Individual */
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-900/50">
                          <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-800">
                            Local
                          </th>
                          <th className="py-3 px-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-800">
                            Dirección
                          </th>
                          {PRODUCTOS.map((producto) => (
                            <th
                              key={producto.id}
                              className="py-3 px-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider border-b border-gray-800"
                            >
                              {producto.nombre}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {clientes.map((cliente, index) => {
                          const isExtra = Boolean(cliente.isExtra)
                          const esExtemporaneo = Boolean(cliente.es_extemporaneo)

                          return (
                            <tr
                              key={cliente.id}
                              className={`
                                ${index % 2 === 0 ? "bg-gray-900/30" : "bg-gray-900/10"}
                                ${isExtra ? "bg-blue-900/20 relative" : ""}
                              `}
                            >
                              <td className="py-3 px-4 text-sm font-medium text-white relative">
                                {isExtra && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                                <div className="flex items-center gap-2">
                                  {isExtra && <Package className="h-4 w-4 text-blue-400" />}
                                  <span>{cliente.local}</span>
                                  {isExtra && (
                                    <span className="text-xs bg-blue-600/30 text-blue-200 px-2 py-0.5 rounded-full">
                                      Extra
                                    </span>
                                  )}
                                  {esExtemporaneo && (
                                    <span className="text-xs bg-purple-600/30 text-purple-200 px-2 py-0.5 rounded-full ml-1">
                                      Extemporáneo
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm">
                                {isExtra ? (
                                  <span className="text-blue-300 italic">Sin dirección física</span>
                                ) : (
                                  <span className="text-gray-300">{cliente.direccion}</span>
                                )}
                              </td>
                              {PRODUCTOS.map((producto) => (
                                <td key={producto.id} className="py-2 px-2 text-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={getProductoValue(cliente.id, producto.id)}
                                    onChange={(e) => {
                                      const value = e.target.value
                                      if (value === "" || /^[0-9]+$/.test(value)) {
                                        handleCantidadChange(
                                          cliente.id,
                                          producto.id,
                                          value === "" ? 0 : Number.parseInt(value),
                                        )
                                      }
                                    }}
                                    className={`
                                      w-16 py-1 px-2 text-center rounded border text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500
                                      ${isExtra ? "bg-blue-900/40 border-blue-700/50" : "bg-gray-800 border-gray-700"}
                                      [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                                    `}
                                    placeholder="0"
                                  />
                                </td>
                              ))}
                            </tr>
                          )
                        })}

                        {/* Fila de totales */}
                        <tr className="bg-gray-800/70 font-medium">
                          <td colSpan={2} className="py-3 px-4 text-sm text-white uppercase">
                            Total
                          </td>
                          {PRODUCTOS.map((producto) => (
                            <td key={producto.id} className="py-3 px-4 text-center text-white">
                              {totales[producto.id] || 0}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-6 border-t border-gray-800 bg-gray-900/30 rounded-b-xl">
            <div className="max-w-md mx-auto bg-gray-800/50 rounded-lg p-6 border border-gray-700/50">
              <h3 className="text-lg font-medium text-center mb-4 flex items-center justify-center gap-2">
                <User className="h-5 w-5 text-blue-400" />
                Asignar Pedidos a Rutero
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Selecciona Rutero:</label>
                  {isLoadingRuteros ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400 mr-2" />
                      <span className="text-sm text-gray-300">Cargando ruteros...</span>
                    </div>
                  ) : (
                    <select
                      value={ruteroSeleccionado}
                      onChange={(e) => setRuteroSeleccionado(e.target.value)}
                      className="w-full py-2 px-3 rounded-md bg-gray-900 border border-gray-700 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar rutero...</option>
                      {ruteros.map((rutero) => (
                        <option key={rutero.id} value={rutero.id}>
                          {rutero.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleAsignarRuta}
                    disabled={!ruteroSeleccionado || asignando || clientes.length === 0}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {asignando ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Asignando...
                      </>
                    ) : (
                      "Asignar"
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleToggleRutasCanceladas}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <AlertCircle className="h-4 w-4" />
                {mostrarRutasCanceladas
                ? "Ocultar Rutas Canceladas"
                : `Mostrar Rutas Canceladas${rutasCanceladas.length ? ` (${rutasCanceladas.length})` : ""}`}
              </button>

              {mostrarRutasCanceladas && (
                <div className="mt-3 p-4 bg-red-900/20 border border-red-900/30 rounded-lg space-y-3">
                  {isLoadingCanceladas ? (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando direcciones canceladas...
                    </div>
                  ) : rutasCanceladas.length === 0 ? (
                    <p className="text-sm text-gray-300">No hay rutas canceladas para mostrar.</p>
                  ) : (
                    rutasCanceladas.map((cancelada) => (
                      <div
                        key={cancelada.pedidoId}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-red-500/30 bg-black/30 p-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{cancelada.clienteNombre}</p>
                          <p className="text-xs text-gray-400">{cancelada.direccion}</p>
                          {cancelada.motivo && (
                            <p className="text-xs text-red-300 mt-1">Motivo: {cancelada.motivo}</p>
                          )}
                        </div>
                        <button
                          onClick={() => descancelarPedido(cancelada.pedidoId)}
                          disabled={restaurandoPedidoId === cancelada.pedidoId}
                          className="inline-flex items-center gap-2 self-start md:self-center rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                        >
                          {restaurandoPedidoId === cancelada.pedidoId ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Restaurando...
                            </>
                          ) : (
                            <>
                              <ArrowLeftRight className="h-3 w-3" />
                              Descancelar
                            </>
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}            </div>
          </div>
        </>
      )
    }
  }

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
              ref={modalRef}
              className="relative w-full max-w-6xl mx-4 overflow-y-auto max-h-[90vh] border border-gray-700/50 rounded-xl backdrop-blur-sm bg-black/90 text-white"
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

              {/* Contenido según el tipo de ruta */}
              {renderizarContenido()}
            </div>
          </div>,
          document.body,
        )
      : null

  return modalContent
}












