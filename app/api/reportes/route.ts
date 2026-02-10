import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api-auth"
import {
  reporteVentasTotales,
  reporteRendimientoPorRuta,
  reporteLiquidacionPorRepartidor,
  reporteProductosMasVendidos,
  reporteHistorialCredito,
  reportePedidosDetalle,
  type ReportFilters,
} from "@/lib/reportes"

function parseDateISO(s: string | null): string | null {
  if (!s) return null
  try {
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return null
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  await requireUser(["ADMIN", "SUPERVISOR"]) // Solo ADMIN/SUPERVISOR consultan reportes

  const { searchParams } = new URL(request.url)
  const fecha_inicio = parseDateISO(searchParams.get("fecha_inicio") || searchParams.get("desde"))
  const fecha_fin = parseDateISO(searchParams.get("fecha_fin") || searchParams.get("hasta"))
  const rawRuta = searchParams.get("ruta_id") ?? searchParams.get("ruta")
  const ruta_id = rawRuta && rawRuta !== 'all' ? rawRuta : undefined
  const rutero_id = (searchParams.get("rutero") && searchParams.get("rutero") !== 'all')
    ? Number(searchParams.get("rutero"))
    : undefined

  const today = new Date()
  const yyyy = today.getUTCFullYear()
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(today.getUTCDate()).padStart(2, '0')
  const fi = fecha_inicio || `${yyyy}-${mm}-${dd}`
  const ff = fecha_fin || `${yyyy}-${mm}-${dd}`

  const filters: ReportFilters = {
    fecha_inicio: fi,
    fecha_fin: ff,
    ruta_id,
    rutero_id: rutero_id || undefined,
  }

  const [ventasResumen, porRuta, porRepartidor, productosTop, creditoHist, pedidosRows] = await Promise.all([
    reporteVentasTotales(filters),
    reporteRendimientoPorRuta(filters),
    reporteLiquidacionPorRepartidor(filters),
    reporteProductosMasVendidos(filters),
    reporteHistorialCredito(filters),
    reportePedidosDetalle(filters),
  ])

  const pedidos = (pedidosRows as any[]).map((row) => {
    const productos: Array<{ nombre: string; cantidad: number; precio_unitario: number; subtotal: number }> = []
    const pushItem = (nombre: string, qty: number, precio: number) => {
      if (!qty) return
      const subtotal = Number((qty * (precio || 0)).toFixed(2))
      productos.push({ nombre, cantidad: qty, precio_unitario: Number(precio) || 0, subtotal })
    }
    pushItem('GOURMET 15KG', Number(row.gourmet15 || 0), Number(row.precio_gourmet15 || 0))
    pushItem('GOURMET 5KG', Number(row.gourmet5 || 0), Number(row.precio_gourmet5 || 0))
    pushItem('BARRA HIELO', Number(row.barraHielo || 0), Number(row.precio_barraHielo || 0))
    pushItem('MEDIA BARRA', Number(row.mediaBarra || 0), Number(row.precio_mediaBarra || 0))
    pushItem('PREMIUM', Number(row.premium || 0), Number(row.precio_premium || 0))
    const creditoUsado = Number(row.credito_usado || 0)
    const total = productos.reduce((s, it) => s + it.subtotal, 0)
    const efectivoCobrado = Number((total - creditoUsado).toFixed(2))
    return {
      id: row.id,
      fecha: row.fecha,
      rutero: row.rutero_nombre,
      ruta: row.ruta_nombre,
      cliente: row.cliente_nombre,
      estado: row.estado || 'completado',
      motivo_cancelacion: row.motivo_cancelacion ?? null,
      productos,
      total: Number(total.toFixed(2)),
      credito_usado: creditoUsado,
      efectivo_cobrado: efectivoCobrado,
    }
  })

  return NextResponse.json({
    filtros: filters,
    kpis: {
      ventas_totales: ventasResumen.totalVentas,
      ventas_credito: ventasResumen.totalCredito,
      ventas_efectivo: ventasResumen.totalEfectivo,
      entregas: ventasResumen.entregas ?? porRuta.reduce((s: number, r: any) => s + Number(r.entregas || 0), 0),
      cancelaciones: ventasResumen.cancelaciones ?? porRuta.reduce((s: number, r: any) => s + Number(r.cancelaciones || 0), 0),
    },
    rendimiento_por_ruta: porRuta,
    liquidacion_por_repartidor: porRepartidor,
    productos_mas_vendidos: productosTop,
    historial_credito: creditoHist,
    pedidos,
  })
}

