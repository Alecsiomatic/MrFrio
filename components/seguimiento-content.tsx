// src/components/seguimiento-content.tsx
"use client"

import { useState, useEffect, type DragEvent } from "react"
import {
  Loader2,
  MapPin,
  Store,
  CheckCircle,
  Building,
  Home,
  MoreVertical,
  Check,
  X,
  AlertCircle,
  Pencil,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "./toast-notification"
import { EntregaProductosModal } from "./entrega-productos-modal"
import { CancelarPedidoModal } from "./cancelar-pedido-modal"
import { TicketModal } from "./ticket-modal"
import {
  formatDate,
  fetchPreciosBase,
  fetchPreciosCliente,
  getPrecioUnitario,
  type ClientePrecios,
  type ProductoId,          // 👈 necesario para el cast
} from "@/lib/utils-client"

/* ---------------------- tipos auxiliares -------------------- */
type Ruta = { id: string; nombre: string; modo_entrenamiento?: number }

type ClienteBusqueda = {
  id: string
  local: string
  direccion: string
  telefono?: string
}

type Cliente = {
  id: string
  local: string
  direccion: string
  lat?: number
  lng?: number
  isExtra?: boolean
  es_extemporaneo?: boolean | number
}

type EstadoPedido = {
  estado: "pendiente" | "completado" | "cancelado" | "descancelado" | null
  motivo_cancelacion: string | null
  productos: {
    gourmet15: number
    gourmet5: number
    barraHielo: number
    mediaBarra: number
    premium: number
  }
}

type ProductoVenta = {
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

type TicketData = {
  clienteNombre: string
  clienteDireccion: string
  fecha: string
  productos: ProductoVenta[]
  creditoUsado?: number
  limiteCredito?: number
  creditoDisponible?: number
  total: number
  esCredito: boolean
}

/* ============================================================ */
/*                      componente principal                     */
/* ============================================================ */
export function SeguimientoContent() {
  const router = useRouter()
  /* --------------- estado general / rutas ------------------ */
  const [rutas, setRutas] = useState<Ruta[]>([])
  const [isLoadingRutas, setIsLoadingRutas] = useState(true)
  const [selectedRuta, setSelectedRuta] = useState<string | null>(null)

  /* --------------- clientes y estados ---------------------- */
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [isLoadingClientes, setIsLoadingClientes] = useState(false)

  const [estadoPedidos, setEstadoPedidos] = useState<Record<string, EstadoPedido>>({})
  const [estadoSeguimiento, setEstadoSeguimiento] = useState<Record<string, string>>({})
  const [isLoadingEstado, setIsLoadingEstado] = useState(false)
  const [clienteActivo, setClienteActivo] = useState<string | null>(null)

  /* --------------- menús / modales ------------------------- */
  const [menuAbierto, setMenuAbierto] = useState<string | null>(null)
  const [modalEntregaAbierto, setModalEntregaAbierto] = useState(false)
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null)
  const [actualizandoEstado, setActualizandoEstado] = useState(false)

  /* --------------- drag & drop --------------------------- */
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isReordenando, setIsReordenando] = useState(false)

  /* --------------- modo entrenamiento --------------------- */
  const [busquedaEntrenamiento, setBusquedaEntrenamiento] = useState("")
  const [resultadosBusqueda, setResultadosBusqueda] = useState<ClienteBusqueda[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [asignandoCliente, setAsignandoCliente] = useState<string | null>(null)

  /* --------------- ticket de venta ------------------------- */
  const [modalTicketAbierto, setModalTicketAbierto] = useState(false)
  const [ticketData, setTicketData] = useState<TicketData | null>(null)

  /* --------------- precios base ---------------------------- */
  const [basePrecios, setBasePrecios] = useState<Record<string, number>>({})
  const defaultClientePrecios: ClientePrecios = {
    precio_gourmet15: null,
    precio_gourmet5: null,
    precio_barraHielo: null,
    precio_mediaBarra: null,
    precio_premium: null,
  }

  const { showToast } = useToast()

  /* ================== efectos iniciales ==================== */
  useEffect(() => {
    fetchPreciosBase()
      .then(setBasePrecios)
      .catch((e) => console.error("Error al obtener precios base:", e))
  }, [])

  useEffect(() => {
    const load = async () => {
      setIsLoadingRutas(true)
      try {
        const res = await fetch("/api/rutas")
        const data: Ruta[] = res.ok ? await res.json() : []
        setRutas(data.filter((r) => r.id !== "LOCAL"))
      } catch {
        console.error("Error al cargar rutas")
      } finally {
        setIsLoadingRutas(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedRuta) return

    const load = async () => {
      setIsLoadingClientes(true)
      try {
        const res = await fetch(`/api/clientes/ruta/${selectedRuta}`)
        const data: Cliente[] = res.ok ? await res.json() : []
        setClientes(data)

        await fetch("/api/seguimiento/inicializar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rutaId: selectedRuta }),
        })

        await cargarEstadoPedidos(selectedRuta)
        const estados = await cargarEstadoSeguimiento(selectedRuta)
        await cargarClienteActivo(selectedRuta, data, estados)
      } catch (e) {
        console.error(`Error al cargar clientes para la ruta ${selectedRuta}`, e)
      } finally {
        setIsLoadingClientes(false)
      }
    }
    load()
  }, [selectedRuta])

  /* ---------------- fetch helpers ---------------- */
  const cargarEstadoPedidos = async (rutaId: string) => {
    setIsLoadingEstado(true)
    try {
      const res = await fetch(`/api/pedidos/estado?rutaId=${rutaId}`)
      if (res.ok) setEstadoPedidos(await res.json())
    } catch (e) {
      console.error("Error al cargar estado de pedidos:", e)
    } finally {
      setIsLoadingEstado(false)
    }
  }

  const cargarEstadoSeguimiento = async (rutaId: string) => {
    try {
      const res = await fetch(`/api/pedidos/estado-seguimiento?rutaId=${rutaId}`)
      if (res.ok) {
        const data = (await res.json()) as Record<string, string>
        setEstadoSeguimiento(data)
        return data
      }
    } catch (e) {
      console.error("Error al cargar estado de seguimiento:", e)
    }
    return {} as Record<string, string>
  }

  const cargarClienteActivo = async (rutaId: string, lista: Cliente[], estadosBase?: Record<string, string>) => {
    try {
      const res = await fetch(`/api/seguimiento/cliente-activo?rutaId=${rutaId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.clienteActivo) {
          setClienteActivo(String(data.clienteActivo))
          setEstadoSeguimiento((prev) => {
            const actualizado = { ...prev }
            Object.keys(actualizado).forEach((id) => {
              if (actualizado[id] === "activo") actualizado[id] = "pendiente"
            })
            actualizado[String(data.clienteActivo)] = "activo"
            return actualizado
          })
          return
        }
      }

      const mapaEstados = estadosBase ?? estadoSeguimiento
      const pendiente = lista.find((c) => {
        const est = mapaEstados[c.id] || "pendiente"
        return est !== "completado" && est !== "cancelado"
      })
      if (pendiente) await establecerClienteActivo(pendiente.id, rutaId)
    } catch (e) {
      console.error("Error al cargar cliente activo:", e)
    }
  }

  const establecerClienteActivo = async (clienteId: string, rutaId: string) => {
    try {
      const res = await fetch("/api/seguimiento/cliente-activo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId, rutaId }),
      })
      if (res.ok) {
        setClienteActivo(clienteId)
        setEstadoSeguimiento((prev) => {
          const nuevo = { ...prev }
          Object.keys(nuevo).forEach((id) => {
            if (nuevo[id] === "activo") nuevo[id] = "pendiente"
          })
          nuevo[clienteId] = "activo"
          return nuevo
        })
      }
    } catch (e) {
      console.error("Error al establecer cliente activo:", e)
    }
  }

  /* ---------------- UI handlers ---------------- */
  const handleRutaClick = (rutaId: string) => {
    setSelectedRuta(rutaId === selectedRuta ? null : rutaId)
    setClienteActivo(null)
    setEstadoPedidos({})
    setEstadoSeguimiento({})
    setMenuAbierto(null)
    setModalEntregaAbierto(false)
    setModalCancelarAbierto(false)
    setModalTicketAbierto(false)
    setTicketData(null)
  }

  const getClienteIcon = (c: Cliente) => {
    if (c.isExtra) return <Store className="h-4 w-4 text-gray-300" />
    if (c.local.toLowerCase().includes("bar") || c.local.toLowerCase().includes("restaurante"))
      return <Building className="h-4 w-4 text-gray-300" />
    if (c.local.toLowerCase().includes("casa")) return <Home className="h-4 w-4 text-gray-300" />
    return <Store className="h-4 w-4 text-gray-300" />
  }

  const limpiarNombre = (n: string) => n.replace(/\s*\d+\s*$/, "").trimEnd()

  /* ---------------- drag handlers ---------------- */
  const handleDragStart = (idx: number) => setDraggedIndex(idx)
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => e.preventDefault()
  const handleDrop = (idx: number) => {
    if (draggedIndex === null) return
    setClientes((prev) => {
      const regulares = prev.filter((c) => !c.isExtra)
      const extras = prev.filter((c) => c.isExtra)

      const fromRegular = prev.slice(0, draggedIndex).filter((c) => !c.isExtra).length
      const toRegular = prev.slice(0, idx).filter((c) => !c.isExtra).length

      const [moved] = regulares.splice(fromRegular, 1)
      if (!moved) return prev
      regulares.splice(toRegular, 0, moved)

      return [...regulares, ...extras]
    })
    setDraggedIndex(null)
  }
  const handleDragEnd = () => setDraggedIndex(null)

  const recargarClientes = async () => {
    if (!selectedRuta) return
    try {
      const res = await fetch(`/api/clientes/ruta/${selectedRuta}`)
      const data: Cliente[] = res.ok ? await res.json() : []
      setClientes(data)
    } catch (e) {
      console.error("Error al recargar clientes:", e)
    }
  }

  const guardarOrden = async () => {
    if (!selectedRuta) return
    try {
      const ids = clientes.filter((c) => !c.isExtra).map((c) => c.id)
      const res = await fetch("/api/clientes/ruta/orden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rutaId: selectedRuta, clienteIds: ids }),
      })
      if (!res.ok) throw new Error("Error al guardar orden")
      showToast("Orden actualizado", "success")
      await recargarClientes()
    } catch (e) {
      console.error("Error al guardar orden de clientes:", e)
      showToast("Error al guardar orden", "error")
    } finally {
      setIsReordenando(false)
    }
  }

  const cancelarOrden = async () => {
    setIsReordenando(false)
    await recargarClientes()
  }

  /* ---------------- confirmaciones ---------------- */
  const confirmarEntrega = async (cant: Record<string, number>, creditoUsado?: number) => {
    if (!clienteSeleccionado || !selectedRuta) return
    setActualizandoEstado(true)

    try {
      const res = await fetch("/api/pedidos/actualizar-estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteSeleccionado.id,
          rutaId: selectedRuta,
          estado: "completado",
          productos: cant,
          creditoUsado,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al completar el pedido")
      showToast("Pedido completado correctamente", "success")

      /* precios personalizados del cliente */
      const clientePrecios = await fetchPreciosCliente(
        clienteSeleccionado.id,
      ).catch(() => defaultClientePrecios)

      /* construir ticket */
      const productosTicket: ProductoVenta[] = (Object.entries(cant) as [ProductoId, number][]) 
        .map(([k, q]) => {
        const { precio: pu } = getPrecioUnitario(
          clientePrecios,
          basePrecios,
          k as ProductoId, // 👈 cast explícito
        )

        const subtotal = pu * q
        const nombres: Record<string, string> = {
          gourmet15: "Gourmet 15KG",
          gourmet5: "Gourmet 5KG",
          barraHielo: "Barra de Hielo",
          mediaBarra: "Media Barra",
          premium: "Premium",
        }
        return {
          nombre: nombres[k] ?? k,
          cantidad: q,
          precioUnitario: pu,
          subtotal,
        }
      })

      const totalVenta = productosTicket.reduce((s, p) => s + p.subtotal, 0)

      setTicketData({
        clienteNombre: limpiarNombre(clienteSeleccionado.local),
        clienteDireccion: clienteSeleccionado.direccion ?? "",
        fecha: formatDate(new Date()),
        productos: productosTicket,
        creditoUsado,
        limiteCredito: data.credito?.limite,
        creditoDisponible: data.credito?.disponible,
        total: totalVenta,
        esCredito: !!creditoUsado,
      })
      setModalTicketAbierto(true)

      /* refrescar estados */
      const idActual = clienteSeleccionado.id
      await cargarEstadoPedidos(selectedRuta)
      const estadosActualizados = await actualizarEstadoSeguimiento(idActual, "completado")
      avanzarAlSiguienteCliente(idActual, estadosActualizados)
    } catch (e) {
      console.error("Error al completar pedido:", e)
      showToast(e instanceof Error ? e.message : "Error al completar el pedido", "error")
    } finally {
      setActualizandoEstado(false)
      setClienteSeleccionado(null)
      setModalEntregaAbierto(false)
    }
  }

  const confirmarCancelacion = async (motivo: string) => {
    if (!clienteSeleccionado || !selectedRuta) return
    setActualizandoEstado(true)

    try {
      const res = await fetch("/api/pedidos/actualizar-estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId: clienteSeleccionado.id,
          rutaId: selectedRuta,
          estado: "cancelado",
          motivo,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Error al cancelar el pedido")
      showToast("Pedido cancelado correctamente", "success")

      const idActual = clienteSeleccionado.id
      await cargarEstadoPedidos(selectedRuta)
      const estadosActualizados = await actualizarEstadoSeguimiento(idActual, "cancelado")
      avanzarAlSiguienteCliente(idActual, estadosActualizados)
    } catch (e) {
      console.error("Error al cancelar pedido:", e)
      showToast(e instanceof Error ? e.message : "Error al cancelar el pedido", "error")
    } finally {
      setActualizandoEstado(false)
      setClienteSeleccionado(null)
      setModalCancelarAbierto(false)
    }
  }

  /* ---------------- avance de cliente ---------------- */
  const actualizarEstadoSeguimiento = async (clienteId: string, estado: string, estadosBase?: Record<string, string>) => {
    if (!selectedRuta) return estadosBase ?? estadoSeguimiento
    try {
      const res = await fetch("/api/pedidos/estado-seguimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId, rutaId: selectedRuta, estado }),
      })
      if (res.ok) {
        const base = { ...(estadosBase ?? estadoSeguimiento) }
        if (estado === "activo") {
          Object.keys(base).forEach((id) => {
            if (base[id] === "activo" && id !== clienteId) base[id] = "pendiente"
          })
        }
        base[clienteId] = estado
        setEstadoSeguimiento(base)
        setClienteActivo((prev) => {
          if (estado === "activo") return clienteId
          return prev === clienteId ? null : prev
        })
        return base
      }
    } catch (e) {
      console.error("Error al actualizar estado seguimiento:", e)
    }
    return estadosBase ?? estadoSeguimiento
  }

  const avanzarAlSiguienteCliente = async (idActual: string, estadosBase?: Record<string, string>) => {
    if (!selectedRuta) return
    const idx = clientes.findIndex((c) => c.id === idActual)
    if (idx === -1 || idx >= clientes.length - 1) {
      setClienteActivo(null)
      return
    }
    let next: Cliente | null = null
    const mapaEstados = estadosBase ?? estadoSeguimiento
    for (let i = idx + 1; i < clientes.length; i++) {
      const c = clientes[i]
      const est = mapaEstados[c.id] || "pendiente"
      if (est !== "completado" && est !== "cancelado") {
        next = c
        break
      }
    }
    if (next) await establecerClienteActivo(next.id, selectedRuta)
    else setClienteActivo(null)
  }

  /* ---------------- helpers de UI ---------------- */
  const getEstadoCliente = (id: string) => estadoPedidos[id]?.estado || null

  const getClaseEstado = (id: string) => {
    const seg = estadoSeguimiento[id]
    if (seg === "completado")
      return "border-l-4 border-emerald-500 bg-emerald-500/10"
    if (seg === "cancelado")
      return "border-l-4 border-red-500 bg-red-500/10"
    if (seg === "activo" || id === clienteActivo)
      return "border-l-4 border-gray-400 bg-gray-800/60"
    return "border-l border-gray-700/60"
  }

  /* ---------------- modo entrenamiento helpers ---------------- */
  const rutaActual = rutas.find(r => r.id === selectedRuta)
  const modoEntrenamiento = rutaActual?.modo_entrenamiento === 1

  const buscarClientesDisponibles = async (texto: string) => {
    if (texto.length < 2 || !selectedRuta) {
      setResultadosBusqueda([])
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch(`/api/clientes/buscar-disponibles?q=${encodeURIComponent(texto)}&rutaId=${selectedRuta}`)
      if (res.ok) {
        const data = await res.json()
        setResultadosBusqueda(data)
      }
    } catch (e) {
      console.error("Error buscando clientes:", e)
    } finally {
      setIsSearching(false)
    }
  }

  const asignarYEntregarCliente = async (cliente: ClienteBusqueda) => {
    if (!selectedRuta) return
    setAsignandoCliente(cliente.id)
    try {
      // 1. Asignar cliente a la ruta + día actual
      const resAsignar = await fetch("/api/clientes/asignar-ruta-dia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId: cliente.id, rutaId: selectedRuta })
      })
      if (!resAsignar.ok) throw new Error("Error al asignar cliente")

      // 2. Recargar lista de clientes
      const resClientes = await fetch(`/api/clientes/ruta/${selectedRuta}`)
      if (resClientes.ok) {
        const data = await resClientes.json()
        setClientes(data)
      }

      // 3. Limpiar búsqueda
      setBusquedaEntrenamiento("")
      setResultadosBusqueda([])

      showToast(`${cliente.local} agregado a la lista`, "success")
    } catch (e) {
      console.error("Error al asignar cliente:", e)
      showToast("Error al asignar cliente", "error")
    } finally {
      setAsignandoCliente(null)
    }
  }

  // Quitar cliente de la ruta (solo día actual, modo entrenamiento)
  const quitarClienteDeRuta = async (cliente: Cliente) => {
    if (!selectedRuta) return
    try {
      const res = await fetch("/api/clientes/quitar-ruta-dia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clienteId: cliente.id, rutaId: selectedRuta })
      })
      if (!res.ok) throw new Error("Error al quitar cliente")

      // Recargar lista de clientes
      const resClientes = await fetch(`/api/clientes/ruta/${selectedRuta}`)
      if (resClientes.ok) {
        const data = await resClientes.json()
        setClientes(data)
      }

      setMenuAbierto(null)
      showToast(`${cliente.local} quitado de la ruta`, "success")
    } catch (e) {
      console.error("Error al quitar cliente:", e)
      showToast("Error al quitar cliente", "error")
    }
  }

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (modoEntrenamiento && busquedaEntrenamiento.length >= 2) {
        buscarClientesDisponibles(busquedaEntrenamiento)
      } else {
        setResultadosBusqueda([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [busquedaEntrenamiento, modoEntrenamiento, selectedRuta])

  /* ---------------- render ---------------- */
  if (isLoadingRutas) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="mr-3 h-8 w-8 animate-spin text-gray-300" />
        <span className="text-xl text-gray-300">Cargando rutas disponibles...</span>
      </div>
    )
  }

  return (
    <div>
      {/* rutas */}
      <div className="mb-8 flex flex-wrap justify-center gap-4">
        {rutas.map((r) => (
          <button
            key={r.id}
            onClick={() => handleRutaClick(r.id)}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              selectedRuta === r.id
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "bg-blue-600/80 text-white hover:bg-blue-500"
            }`}
          >
            Ruta {r.id}
          </button>
        ))}
      </div>

      {/* clientes */}
      {selectedRuta && (
        <div className="mt-8 overflow-hidden rounded-lg border border-gray-700/50">
          {/* Buscador modo entrenamiento */}
          {modoEntrenamiento && (
            <div className="bg-amber-900/30 border-b border-amber-600/50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-amber-600 text-white text-xs px-2 py-1 rounded font-medium">
                  🎓 Modo Entrenamiento
                </span>
                <span className="text-amber-200 text-sm">
                  Busca y selecciona al cliente que vas a visitar
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Buscar cliente por nombre o dirección..."
                  value={busquedaEntrenamiento}
                  onChange={(e) => setBusquedaEntrenamiento(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-amber-500" />
                )}
              </div>
              {resultadosBusqueda.length > 0 && (
                <div className="mt-2 bg-gray-800 rounded-lg border border-gray-600 max-h-60 overflow-y-auto">
                  {resultadosBusqueda.map((cliente) => (
                    <button
                      key={cliente.id}
                      onClick={() => asignarYEntregarCliente(cliente)}
                      disabled={asignandoCliente === cliente.id}
                      className="w-full text-left p-3 hover:bg-gray-700 border-b border-gray-700 last:border-b-0 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-white">{cliente.local}</div>
                          <div className="text-sm text-gray-400">{cliente.direccion}</div>
                        </div>
                        {asignandoCliente === cliente.id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
                        ) : (
                          <span className="text-amber-500 text-sm font-medium">
                            Seleccionar →
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {busquedaEntrenamiento.length >= 2 && !isSearching && resultadosBusqueda.length === 0 && (
                <div className="mt-2 p-3 bg-gray-800/50 rounded-lg text-gray-400 text-sm">
                  No se encontraron clientes. Si es nuevo, anótalo en tu hoja.
                </div>
              )}
            </div>
          )}

          {isLoadingClientes || isLoadingEstado ? (
            <div className="flex items-center justify-center bg-gray-900/50 py-12">
              <Loader2 className="mr-3 h-6 w-6 animate-spin text-gray-300" />
              <span className="text-gray-300">Cargando clientes...</span>
            </div>
          ) : clientes.length ? (
            <>
              <div className="flex justify-end gap-2 bg-gray-900/50 p-4">
                {!isReordenando ? (
                  <button
                    onClick={() => setIsReordenando(true)}
                    className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
                  >
                    Reordenar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={guardarOrden}
                      className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={cancelarOrden}
                      className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
              <div className="divide-y divide-gray-700/50">
                {clientes.map((c, index) => {
                const estado = getEstadoCliente(c.id)
                const estadoSeg = estadoSeguimiento[c.id] || "pendiente"
                const esEditable = estadoSeg !== "completado"
                return (
                  <div
                    key={c.id}
                    draggable={isReordenando && !c.isExtra}
                    onDragStart={isReordenando && !c.isExtra ? () => handleDragStart(index) : undefined}
                    onDragOver={isReordenando && !c.isExtra ? handleDragOver : undefined}
                    onDrop={isReordenando && !c.isExtra ? () => handleDrop(index) : undefined}
                    onDragEnd={isReordenando && !c.isExtra ? handleDragEnd : undefined}
                    onClick={() => {
                      if (isReordenando) return
                      if (c.lat && c.lng)
                        window.open(`https://www.google.com/maps?q=${c.lat},${c.lng}`, "_blank")
                    }}
                    className={`p-4 transition-colors hover:bg-gray-800/50 bg-gray-900/50
                      ${getClaseEstado(c.id)}
                      ${isReordenando && !c.isExtra ? "cursor-move" : ""}
                      ${!isReordenando ? "cursor-pointer" : ""}`}
                  >
                    <div className="flex items-start">
                      {/* info */}
                      <div className="flex-grow">
                        <div className="flex items-center gap-2">
                          {getClienteIcon(c)}
                          <h3 className="font-medium text-white">
                            {limpiarNombre(c.local)}
                            {c.isExtra && (
                              <span className="ml-2 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-200">
                                Extra
                              </span>
                            )}
                            {c.es_extemporaneo && (
                              <span className="ml-2 rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-200">
                                Extemporáneo
                              </span>
                            )}
                          </h3>
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-gray-400">
                          <MapPin className="h-3.5 w-3.5" />
                          {c.isExtra ? (
                            <span className="italic text-gray-300">Cantidad de Reserva</span>
                          ) : (
                            <span>{c.direccion || "Sin dirección específica"}</span>
                          )}
                        </div>

                        {estado && (
                          <div className="mt-2">
                            {estado === "completado" && (
                              <div className="flex items-center gap-1 text-sm text-emerald-200">
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                Pedido completado
                              </div>
                            )}
                            {estado === "cancelado" && (
                              <div>
                                <div className="flex items-center gap-1 text-sm text-red-200">
                                  <X className="h-3.5 w-3.5 text-red-400" />
                                  Pedido cancelado
                                </div>
                                {estadoPedidos[c.id]?.motivo_cancelacion && (
                                  <div className="mt-1 pl-5 text-xs text-red-300">
                                    Motivo: {estadoPedidos[c.id]?.motivo_cancelacion}
                                  </div>
                                )}
                              </div>
                            )}
                            {estado === "descancelado" && (
                              <div>
                                <div className="flex items-center gap-1 text-sm text-gray-200">
                                  <AlertCircle className="h-3.5 w-3.5 text-gray-300" />
                                  Pedido descancelado
                                </div>
                                {estadoPedidos[c.id]?.motivo_cancelacion && (
                                  <div className="mt-1 pl-5 text-xs text-gray-400">
                                    Motivo original: {estadoPedidos[c.id]?.motivo_cancelacion}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* acciones / badges */}
                      <div className="flex items-center">
                        {/* 🎯 CAMBIO PRINCIPAL: Permitir editar clientes mientras no estén completados */}
                        {esEditable && (
                          <div className="relative mr-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setMenuAbierto(menuAbierto === c.id ? null : c.id)
                              }}
                              className="rounded-full p-1.5 hover:bg-gray-800"
                            >
                              <MoreVertical className="h-5 w-5 text-gray-400" />
                            </button>

                            {menuAbierto === c.id && (
                              <div className="absolute right-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-md border border-gray-700 bg-gray-800 shadow-lg">
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setClienteSeleccionado(c)
                                    setModalEntregaAbierto(true)
                                    setMenuAbierto(null)
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white hover:bg-gray-700"
                                >
                                  <Check className="h-4 w-4 text-gray-300" />
                                  Completar Pedido
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setClienteSeleccionado(c)
                                    setModalCancelarAbierto(true)
                                    setMenuAbierto(null)
                                  }}
                                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-white hover:bg-gray-700 ${!modoEntrenamiento ? 'rounded-b-md' : ''}`}
                                >
                                  <X className="h-4 w-4 text-gray-300" />
                                  Cancelar Pedido
                                </button>
                                {modoEntrenamiento && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      quitarClienteDeRuta(c)
                                    }}
                                    className="flex w-full items-center gap-2 rounded-b-md px-4 py-2 text-left text-sm text-amber-300 hover:bg-red-900/50"
                                  >
                                    <Trash2 className="h-4 w-4 text-amber-400" />
                                    Quitar de la ruta
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {estadoSeg === "completado" && (
                          <div className="flex items-center rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-200">
                            <CheckCircle className="mr-1 h-3 w-3 text-gray-300" />
                            Completado
                          </div>
                        )}
                        {estadoSeg === "cancelado" && (
                          <div className="flex items-center rounded-full bg-gray-800 px-3 py-1 text-xs font-medium text-gray-200">
                            <X className="mr-1 h-3 w-3 text-gray-300" />
                            Cancelado
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              </div>
            </>
          ) : (
            <div className="bg-gray-900/50 py-12 text-center">
              <p className="text-gray-400">No hay clientes asignados a esta ruta para hoy</p>
            </div>
          )}
        </div>
      )}

      {/* modal entrega */}
      {clienteSeleccionado && (
        <EntregaProductosModal
          isOpen={modalEntregaAbierto}
          onClose={() => setModalEntregaAbierto(false)}
          cliente={clienteSeleccionado}
          rutaId={selectedRuta ?? ""}
          onConfirm={confirmarEntrega}
        />
      )}

      {/* modal cancelación */}
      {clienteSeleccionado && (
        <CancelarPedidoModal
          isOpen={modalCancelarAbierto}
          onClose={() => setModalCancelarAbierto(false)}
          cliente={clienteSeleccionado}
          onConfirm={confirmarCancelacion}
        />
      )}

      {/* modal ticket */}
      {ticketData && (
        <TicketModal
          isOpen={modalTicketAbierto}
          onClose={() => {
            setModalTicketAbierto(false)
            setTicketData(null)
          }}
          ticketData={ticketData}
        />
      )}
    </div>
  )
}