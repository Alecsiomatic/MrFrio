// src/components/entrega-productos-modal.tsx
"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  X,
  Loader2,
  Package,
  Check,
  AlertCircle,
  DollarSign,
  CreditCard,
} from "lucide-react"
import { useToast } from "./toast-notification"

/* ----------------- utilidades centralizadas ----------------- */
import {
  fetchPreciosBase,
  fetchPreciosCliente,
  getPrecioUnitario,
  formatCurrency,
  type ClientePrecios,
  type ProductoId,
} from "@/lib/utils-client"

/* ----------------- catálogo de productos -------------------- */
const PRODUCTOS = [
  { id: "gourmet15", nombre: "GOURMET 15KG" },
  { id: "gourmet5", nombre: "GOURMET 5KG" },
  { id: "barraHielo", nombre: "BARRA HIELO" },
  { id: "mediaBarra", nombre: "MEDIA BARRA" },
  { id: "premium", nombre: "PREMIUM" },
] as const

type ProductoIdLiteral = (typeof PRODUCTOS)[number]["id"]

/* --------------------- tipos auxiliares --------------------- */
type CreditoInfo = {
  limite_credito: number
  credito_usado: number
  credito_disponible: number
}

type EntregaProductosModalProps = {
  isOpen: boolean
  onClose: () => void
  cliente: { id: string; local: string }
  rutaId: string
  onConfirm: (cantidades: Record<string, number>, creditoUsado?: number) => void
}

/* ============================================================ */
/*                     componente principal                      */
/* ============================================================ */
export function EntregaProductosModal({
  isOpen,
  onClose,
  cliente,
  rutaId,
  onConfirm,
}: EntregaProductosModalProps) {
  /* -------------------- estado local ----------------------- */
  const [mounted, setMounted] = useState(false)

  const [cantidades, setCantidades] = useState<Record<string, string | number>>(
    {},
  )

  /* inventario */
  const [inventarioDisponible, setInventarioDisponible] =
    useState<Record<string, number>>({})
  const [inventarioRestante, setInventarioRestante] =
    useState<Record<string, number>>({})
  const [isLoadingInventario, setIsLoadingInventario] = useState(false)

  /* precios */
  const [basePrecios, setBasePrecios] = useState<Record<string, number>>({})
  const [clientePrecios, setClientePrecios] = useState<ClientePrecios | null>(
    null,
  )
  const [isLoadingPrecios, setIsLoadingPrecios] = useState(false)

  /* crédito */
  const [creditoInfo, setCreditoInfo] = useState<CreditoInfo | null>(null)
  const [isLoadingCredito, setIsLoadingCredito] = useState(false)
  const [usarCredito, setUsarCredito] = useState(false)
  const [cantidadCredito, setCantidadCredito] = useState("")

  /* envío */
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { showToast } = useToast()

  /* ---------------------- montaje --------------------------- */
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  /* --------- al abrir el modal, cargar todo de nuevo -------- */
  useEffect(() => {
    if (!isOpen) return

    /* cantidades en blanco */
    setCantidades(
      PRODUCTOS.reduce(
        (acc, p) => ({ ...acc, [p.id]: "" }),
        {},
      ) as Record<string, string | number>,
    )

    /* fetch de inventario, precios y crédito */
    cargarInventarioDisponible()
    cargarPrecios()
    cargarInfoCredito()

    /* reset crédito */
    setUsarCredito(false)
    setCantidadCredito("")
  }, [isOpen, rutaId, cliente.id])

  /* ---------------- fetch inventario ----------------------- */
  const cargarInventarioDisponible = async () => {
    setIsLoadingInventario(true)
    try {
      const res = await fetch(`/api/sobrantes/disponible?rutaId=${rutaId}`)
      if (!res.ok) throw new Error()
      const { productos = {} } = await res.json()
      setInventarioDisponible(productos)
      setInventarioRestante(productos)
    } catch {
      showToast("Error al cargar el inventario disponible", "error")
    } finally {
      setIsLoadingInventario(false)
    }
  }

  /* ---------------- fetch precios (base + cliente) ---------- */
  const cargarPrecios = async () => {
    setIsLoadingPrecios(true)
    try {
      const [base, clienteP] = await Promise.all([
        fetchPreciosBase(),
        fetchPreciosCliente(cliente.id).catch(() => null),
      ])
      setBasePrecios(base)
      setClientePrecios(clienteP)
    } catch {
      showToast("Error al cargar los precios", "error")
    } finally {
      setIsLoadingPrecios(false)
    }
  }

  /* ---------------- fetch crédito cliente ------------------ */
  const cargarInfoCredito = async () => {
    setIsLoadingCredito(true)
    try {
      const res = await fetch(`/api/credito/cliente?clienteId=${cliente.id}`)
      if (!res.ok) throw new Error()
      const data = await res.json()

      const pick = (obj: any): CreditoInfo | null =>
        obj &&
        ["limite_credito", "credito_usado", "credito_disponible"].every(
          (k) => k in obj,
        )
          ? {
              limite_credito: Number(obj.limite_credito) || 0,
              credito_usado: Number(obj.credito_usado) || 0,
              credito_disponible: Number(obj.credito_disponible) || 0,
            }
          : null

      let c: CreditoInfo | null = pick(data)
      if (!c && data.credito) c = pick(data.credito)
      if (!c)
        for (const key in data) {
          c = pick(data[key])
          if (c) break
        }
      setCreditoInfo(
        c ?? { limite_credito: 0, credito_usado: 0, credito_disponible: 0 },
      )
    } catch {
      setCreditoInfo({ limite_credito: 0, credito_usado: 0, credito_disponible: 0 })
    } finally {
      setIsLoadingCredito(false)
    }
  }

  /* ------------- helpers de precio y totales --------------- */
  const defaultClientePrecios: ClientePrecios = {
    precio_gourmet15: null,
    precio_gourmet5: null,
    precio_barraHielo: null,
    precio_mediaBarra: null,
    precio_premium: null,
  }

  const getPrecioProducto = (
    id: ProductoIdLiteral,
  ): { precio: number; esPersonalizado: boolean } =>
    getPrecioUnitario(
      clientePrecios ?? defaultClientePrecios,
      basePrecios,
      id as ProductoId,
    )

  const calcularSubtotal = (id: ProductoIdLiteral): number => {
    const cantidad = cantidades[id] === "" ? 0 : Number(cantidades[id])
    const { precio } = getPrecioProducto(id)
    return cantidad * precio
  }

  const calcularTotal = (): number =>
    PRODUCTOS.reduce((sum, p) => sum + calcularSubtotal(p.id), 0)

  const calcularTotalConCredito = (): number => {
    if (!usarCredito || cantidadCredito === "") return calcularTotal()
    return Math.max(0, calcularTotal() - parseFloat(cantidadCredito))
  }

  /* ------------------ handlers de input -------------------- */
  const handleCantidadChange = (id: ProductoIdLiteral, v: string) => {
    if (v === "") {
      setCantidades((p) => ({ ...p, [id]: "" }))
      setInventarioRestante((p) => ({ ...p, [id]: inventarioDisponible[id] ?? 0 }))
      return
    }
    if (!/^\d+$/.test(v)) return
    const n = parseInt(v, 10)
    const disp = inventarioDisponible[id] ?? 0
    if (n > disp) {
      showToast(`No hay suficiente inventario de ${id}. Disponible: ${disp}`, "error")
      return
    }
    setCantidades((p) => ({ ...p, [id]: v }))
    setInventarioRestante((p) => ({ ...p, [id]: disp - n }))
  }

  /* ----------------- crédito handlers ---------------------- */
  const handleCreditoChange = (v: string) => {
    if (v === "") return setCantidadCredito("")
    if (!/^(\d*\.?\d{0,2}|\.\d{1,2})$/.test(v)) return
    setCantidadCredito(v)
  }

  const handleCreditoBlur = () => {
    if (cantidadCredito === "") return
    let n = parseFloat(cantidadCredito)
    if (isNaN(n)) n = 0
    if (creditoInfo) n = Math.min(n, creditoInfo.credito_disponible)
    n = Math.min(n, calcularTotal())
    setCantidadCredito(n.toFixed(2).replace(/\.00$/, ""))
  }

  const usarMaximoCredito = () => {
    if (!creditoInfo) return
    setCantidadCredito(
      Math.min(creditoInfo.credito_disponible, calcularTotal()).toString(),
    )
  }

  /* ------------------ confirmación ------------------------- */
  const handleConfirm = () => {
    setIsSubmitting(true)
    try {
      const cantidadesNum = Object.fromEntries(
        Object.entries(cantidades).map(([k, v]) => [k, v === "" ? 0 : Number(v)]),
      ) as Record<string, number>

      if (!Object.values(cantidadesNum).some((c) => c > 0)) {
        showToast("Debes seleccionar al menos un producto", "error")
        setIsSubmitting(false)
        return
      }

      let creditoUsado: number | undefined = undefined
      if (usarCredito && cantidadCredito !== "") {
        creditoUsado = parseFloat(cantidadCredito)
        if (creditoInfo && creditoUsado > creditoInfo.credito_disponible + 0.01) {
          showToast("El crédito usado no puede exceder el disponible", "error")
          setIsSubmitting(false)
          return
        }
        if (creditoUsado > calcularTotal() + 0.01) {
          showToast("El crédito usado no puede exceder el total", "error")
          setIsSubmitting(false)
          return
        }
      }

      onConfirm(cantidadesNum, creditoUsado)
      onClose()
    } catch (err) {
      console.error(err)
      showToast("Error al confirmar la entrega", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  /* -------------- bloquear scroll al abrir ----------------- */
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  /* ----------------------- render -------------------------- */
  const modal =
    isOpen && mounted
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* overlay */}
            <div
              onClick={onClose}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />
            {/* contenido */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto rounded-xl border border-gray-700/50 bg-black/90 text-white backdrop-blur-sm"
            >
              {/* botón cerrar */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-20 rounded-full bg-gray-800/80 p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="p-6">
                {/* encabezado */}
                <h2 className="mb-2 text-center text-xl font-bold">
                  Entrega de Productos
                </h2>
                <p className="mb-4 text-center text-gray-400">
                  Cliente: <span className="text-white">{cliente.local}</span>
                </p>

                {isLoadingInventario || isLoadingPrecios || isLoadingCredito ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin text-blue-400" />
                    Cargando datos...
                  </div>
                ) : (
                  <>
                    {/* aviso */}
                    <div className="mb-6 rounded-lg border border-blue-800/30 bg-blue-900/20 p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-400" />
                        <p className="text-sm text-blue-200">
                          Ingresa la cantidad de cada producto entregado. Estas
                          cantidades se restarán del inventario disponible.
                        </p>
                      </div>
                    </div>

                    {/* productos */}
                    <div className="mb-6 space-y-4">
                      {PRODUCTOS.map(({ id, nombre }) => {
                        const { precio, esPersonalizado } = getPrecioProducto(id)
                        const subtotal = calcularSubtotal(id)
                        return (
                          <div
                            key={id}
                            className="rounded-lg border border-gray-800 bg-gray-900/50 p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-400" />
                                <span className="font-medium">{nombre}</span>
                              </div>
                              <span
                                className={`text-sm ${
                                  esPersonalizado
                                    ? "text-green-400"
                                    : "text-gray-400"
                                }`}
                              >
                                {formatCurrency(precio)}
                                {esPersonalizado && " (Personalizado)"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">
                                  Disponible: {inventarioRestante[id] ?? 0}
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={cantidades[id] || ""}
                                  onChange={(e) =>
                                    handleCantidadChange(id, e.target.value)
                                  }
                                  placeholder="0"
                                  className="w-16 appearance-none rounded border border-gray-700 bg-gray-800 py-1 px-2 text-center text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>

                              {subtotal > 0 && (
                                <div className="flex items-center gap-1 text-sm font-medium text-green-400">
                                  <DollarSign className="h-4 w-4" />
                                  {formatCurrency(subtotal)}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* total */}
                    <div className="mb-6 rounded-lg bg-gray-800 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total:</span>
                        <span className="text-xl font-bold text-green-400">
                          {formatCurrency(calcularTotal())}
                        </span>
                      </div>
                    </div>

                    {/* crédito */}
                    {creditoInfo && (
                      <div className="mb-6 rounded-lg border border-blue-800/30 bg-blue-900/20 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-400" />
                            <span className="font-medium">
                              Crédito Disponible:
                            </span>
                          </div>
                          <span className="font-semibold text-blue-300">
                            {formatCurrency(creditoInfo.credito_disponible)}
                          </span>
                        </div>
                        <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-gray-300">
                          <div>Límite de crédito:</div>
                          <div className="text-right">
                            {formatCurrency(creditoInfo.limite_credito)}
                          </div>
                          <div>Crédito usado:</div>
                          <div className="text-right">
                            {formatCurrency(creditoInfo.credito_usado)}
                          </div>
                        </div>
                        <div className="mb-3 flex items-center">
                          <input
                            id="usarCredito"
                            type="checkbox"
                            checked={usarCredito}
                            onChange={(e) => {
                              setUsarCredito(e.target.checked)
                              setCantidadCredito(
                                e.target.checked
                                  ? Math.min(
                                      creditoInfo.credito_disponible,
                                      calcularTotal(),
                                    ).toString()
                                  : "",
                              )
                            }}
                            className="h-4 w-4 rounded border-blue-800 bg-gray-800 text-blue-500 focus:ring-blue-500"
                          />
                          <label
                            htmlFor="usarCredito"
                            className="ml-2 text-sm text-blue-200"
                          >
                            Usar crédito para este pedido
                          </label>
                        </div>

                        {usarCredito && (
                          <div className="space-y-3">
                            <div>
                              <label
                                htmlFor="cantidadCredito"
                                className="mb-1 block text-sm font-medium text-blue-200"
                              >
                                Cantidad de crédito a utilizar:
                              </label>
                              <div className="flex gap-2">
                                <div className="relative flex-grow">
                                  <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />
                                  <input
                                    id="cantidadCredito"
                                    type="text"
                                    inputMode="decimal"
                                    value={cantidadCredito}
                                    onChange={(e) =>
                                      handleCreditoChange(e.target.value)
                                    }
                                    onBlur={handleCreditoBlur}
                                    placeholder="0.00"
                                    className="w-full rounded border border-gray-700 bg-gray-800 py-1.5 pl-9 pr-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={usarMaximoCredito}
                                  className="rounded bg-blue-600 px-3 py-1.5 hover:bg-blue-500"
                                >
                                  Máx
                                </button>
                              </div>
                            </div>

                            {cantidadCredito !== "" &&
                              parseFloat(cantidadCredito) > 0 && (
                                <div className="rounded-lg bg-blue-900/30 p-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-blue-200">
                                      Total a pagar:
                                    </span>
                                    <span className="font-bold text-blue-300">
                                      {formatCurrency(
                                        calcularTotalConCredito(),
                                      )}
                                    </span>
                                  </div>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* botones */}
                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        className="flex-1 rounded-lg bg-gray-700 py-2 text-white hover:bg-gray-600"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg bg-green-600 py-2 text-white hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Procesando...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <Check className="h-4 w-4" />
                            Confirmar Entrega
                          </span>
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

  return modal
}
