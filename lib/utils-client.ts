// lib/utils-client.ts
// =======================================================
// Utilidades de uso exclusivamente del lado cliente (“use client”)
// =======================================================
//"use client"

/* ------------------------------------------------------------------
 * 1. Día actual (nombre en español y nombre de columna)
 * -----------------------------------------------------------------*/

export function getDiaActualNombre(): string {
  const diasSemana = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ]
  return diasSemana[new Date().getDay()]
}

/** Devuelve “dia_lunes”, “dia_martes”, etc. */
export function getDiaActualColumna(): string {
  const diasSemana = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ]
  return `dia_${diasSemana[new Date().getDay()]}`
}

/* ------------------------------------------------------------------
 * 2. Formateadores (moneda y fecha)
 * -----------------------------------------------------------------*/

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(amount)
}

/** Ejemplo → “10 jun 2025 14:35”  */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

/* ------------------------------------------------------------------
 * 3. Precios por cliente / precios base
 * -----------------------------------------------------------------*/

/** Todas las claves posibles con precio específico. */
export type ClientePrecios = {
  precio_gourmet15: number | null
  precio_gourmet5: number | null
  precio_barraHielo: number | null
  precio_mediaBarra: number | null
  precio_premium: number | null
}

/**
 * Trae los precios específicos de un cliente (o `null` si no existen).
 * Lanza excepción si el `fetch` falla.
 */
export async function fetchPreciosCliente(
  clienteId: string
): Promise<ClientePrecios> {
  const res = await fetch(`/api/clientes/precios?clienteId=${clienteId}`)
  if (!res.ok)
    throw new Error("No se pudo obtener los precios personalizados del cliente")
  const data = await res.json()
  const precios = data.precios || {}
  return {
    precio_gourmet15: precios.gourmet15?.precioPersonalizado ?? null,
    precio_gourmet5: precios.gourmet5?.precioPersonalizado ?? null,
    precio_barraHielo: precios.barraHielo?.precioPersonalizado ?? null,
    precio_mediaBarra: precios.mediaBarra?.precioPersonalizado ?? null,
    precio_premium: precios.premium?.precioPersonalizado ?? null,
  }
}

/**
 * Devuelve un mapa con los precios base de todos los productos:
 * `{ idProducto: precio_base }`
 */
export async function fetchPreciosBase(): Promise<Record<string, number>> {
  const res = await fetch("/api/productos")
  if (!res.ok)
    throw new Error("No se pudieron obtener los precios base de productos")
  const productos: Array<{ id: string; precio_base: number }> = await res.json()
  return productos.reduce<Record<string, number>>((map, p) => {
    map[p.id] = p.precio_base
    return map
  }, {})
}

/* ------------------------------------------------------------------
 * 4. Obtención del precio correcto para un producto y cliente dados
 * -----------------------------------------------------------------*/

export type ProductoId =
  | "gourmet15"
  | "gourmet5"
  | "barraHielo"
  | "mediaBarra"
  | "premium"

export function getPrecioUnitario(
  clientePrecios: ClientePrecios,
  basePrecios: Record<string, number>,
  productoId: ProductoId
): { precio: number; esPersonalizado: boolean } {
  // 1. Intentar precio personalizado ────────────────────────────────
  const precioCliente = (() => {
    switch (productoId) {
      case "gourmet15":
        return clientePrecios.precio_gourmet15
      case "gourmet5":
        return clientePrecios.precio_gourmet5
      case "barraHielo":
        return clientePrecios.precio_barraHielo
      case "mediaBarra":
        return clientePrecios.precio_mediaBarra
      case "premium":
        return clientePrecios.precio_premium
      default:
        return null
    }
  })()

  if (precioCliente !== null) {
    return { precio: precioCliente, esPersonalizado: true }
  }

  // 2. Fallback al precio base ──────────────────────────────────────
  const precioBase = basePrecios[productoId] ?? 0
  return { precio: precioBase, esPersonalizado: false }
}
