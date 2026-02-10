
import { query } from "./db"

export type ReportFilters = {
  fecha_inicio: string // 'YYYY-MM-DD'
  fecha_fin: string // 'YYYY-MM-DD'
  ruta_id?: string | null
  rutero_id?: number | null
}

function totalPedidoExpr(aliasP = 'p', aliasC = 'c') {
  return `
    COALESCE(${aliasP}.gourmet15,0) * COALESCE(${aliasC}.precio_gourmet15, (SELECT precio_base FROM productos WHERE id='gourmet15'), 0) +
    COALESCE(${aliasP}.gourmet5,0) * COALESCE(${aliasC}.precio_gourmet5, (SELECT precio_base FROM productos WHERE id='gourmet5'), 0) +
    COALESCE(${aliasP}.barraHielo,0) * COALESCE(${aliasC}.precio_barraHielo, (SELECT precio_base FROM productos WHERE id='barraHielo'), 0) +
    COALESCE(${aliasP}.mediaBarra,0) * COALESCE(${aliasC}.precio_mediaBarra, (SELECT precio_base FROM productos WHERE id='mediaBarra'), 0) +
    COALESCE(${aliasP}.premium,0) * COALESCE(${aliasC}.precio_premium, (SELECT precio_base FROM productos WHERE id='premium'), 0)
  `
}

export async function reporteVentasTotales(filters: ReportFilters) {
  const params: any[] = [filters.fecha_inicio, filters.fecha_fin]
  let where = `WHERE p.estado = 'completado' AND DATE(a.fecha) BETWEEN ? AND ?`
  if (filters.ruta_id) {
    where += ` AND a.ruta_id = ?`
    params.push(filters.ruta_id)
  }
  if (filters.rutero_id) {
    where += ` AND a.rutero_id = ?`
    params.push(filters.rutero_id)
  }
  const totalExpr = totalPedidoExpr('p', 'c')
  const sql = `
    SELECT
      CAST(SUM(${totalExpr}) AS DECIMAL(12,2)) AS total_ventas,
      CAST(SUM(COALESCE(p.credito_usado, 0)) AS DECIMAL(12,2)) AS total_credito,
      CAST(SUM((${totalExpr}) - COALESCE(p.credito_usado, 0)) AS DECIMAL(12,2)) AS total_efectivo,
      SUM(CASE WHEN p.estado='completado' THEN 1 ELSE 0 END) AS entregas,
      SUM(CASE WHEN p.estado IN ('cancelado','descancelado') THEN 1 ELSE 0 END) AS cancelaciones
    FROM pedidos p
    JOIN asignaciones a ON a.id = p.asignacion_id
    JOIN clientes c ON c.id = p.cliente_id
    ${where}
  `
  const rows: any = await query(sql, params)
  const totals = rows?.[0] || {}
  return {
    totalVentas: Number(totals.total_ventas || 0),
    totalCredito: Number(totals.total_credito || 0),
    totalEfectivo: Number(totals.total_efectivo || 0),
    entregas: Number(totals.entregas || 0),
    cancelaciones: Number(totals.cancelaciones || 0),
  }
}

export async function reporteRendimientoPorRuta(filters: ReportFilters) {
  const params: any[] = [filters.fecha_inicio, filters.fecha_fin]
  let where = `WHERE DATE(a.fecha) BETWEEN ? AND ?`
  if (filters.ruta_id) {
    where += ` AND a.ruta_id = ?`
    params.push(filters.ruta_id)
  }
  if (filters.rutero_id) {
    where += ` AND a.rutero_id = ?`
    params.push(filters.rutero_id)
  }
  const totalExpr = totalPedidoExpr('p', 'c')
  const sql = `
    SELECT 
      a.ruta_id,
      r.nombre AS ruta_nombre,
      CAST(SUM(CASE WHEN p.estado='completado' THEN ${totalExpr} ELSE 0 END) AS DECIMAL(12,2)) AS ventas_totales,
      CAST(SUM(CASE WHEN p.estado='completado' THEN COALESCE(p.credito_usado, 0) ELSE 0 END) AS DECIMAL(12,2)) AS credito_usado,
      CAST(SUM(CASE WHEN p.estado='completado' THEN ((${totalExpr}) - COALESCE(p.credito_usado, 0)) ELSE 0 END) AS DECIMAL(12,2)) AS ventas_efectivo,
      SUM(CASE WHEN p.estado='completado' THEN 1 ELSE 0 END) AS entregas,
      SUM(CASE WHEN p.estado IN ('cancelado','descancelado') THEN 1 ELSE 0 END) AS cancelaciones
    FROM asignaciones a
    LEFT JOIN rutas r ON r.id = a.ruta_id
    LEFT JOIN pedidos p ON p.asignacion_id = a.id
    LEFT JOIN clientes c ON c.id = p.cliente_id
    ${where}
    GROUP BY a.ruta_id, r.nombre
    ORDER BY r.nombre ASC
  `
  const rows: any = await query(sql, params)
  return rows
}

export async function reporteLiquidacionPorRepartidor(filters: ReportFilters) {
  const asignParams: any[] = [filters.fecha_inicio, filters.fecha_fin]
  let whereAsign = `DATE(a.fecha) BETWEEN ? AND ?`
  if (filters.rutero_id) {
    whereAsign += ` AND a.rutero_id = ?`
    asignParams.push(filters.rutero_id)
  }
  if (filters.ruta_id) {
    whereAsign += ` AND a.ruta_id = ?`
    asignParams.push(filters.ruta_id)
  }
  const totalExpr = totalPedidoExpr('p', 'c')
  const params: any[] = [...asignParams, filters.fecha_inicio, filters.fecha_fin]
  const sql = `
    SELECT 
      ru.id AS rutero_id,
      ru.nombre AS rutero_nombre,
      CAST(SUM(CASE WHEN p.estado='completado' THEN ${totalExpr} ELSE 0 END) AS DECIMAL(12,2)) AS ventas_totales,
      CAST(SUM(CASE WHEN p.estado='completado' THEN COALESCE(p.credito_usado, 0) ELSE 0 END) AS DECIMAL(12,2)) AS credito_usado,
      CAST(SUM(CASE WHEN p.estado='completado' THEN ((${totalExpr}) - COALESCE(p.credito_usado, 0)) ELSE 0 END) AS DECIMAL(12,2)) AS efectivo_recolectado,
      CAST(COALESCE(se.gastos, 0) AS DECIMAL(12,2)) AS gastos,
      CAST(SUM(CASE WHEN p.estado='completado' THEN ((${totalExpr}) - COALESCE(p.credito_usado, 0)) ELSE 0 END) - COALESCE(se.gastos,0) AS DECIMAL(12,2)) AS balance
    FROM ruteros ru
    LEFT JOIN asignaciones a ON a.rutero_id = ru.id AND ${whereAsign}
    LEFT JOIN pedidos p ON p.asignacion_id = a.id
    LEFT JOIN clientes c ON c.id = p.cliente_id
    LEFT JOIN (
      SELECT rutero_id, SUM(monto) AS gastos
      FROM salidas_efectivo
      WHERE DATE(CONVERT_TZ(fecha_creacion, '+00:00', '-06:00')) BETWEEN ? AND ?
      GROUP BY rutero_id
    ) se ON se.rutero_id = ru.id
    WHERE ru.activo = 1
    GROUP BY ru.id, ru.nombre, se.gastos
    ORDER BY ru.nombre ASC
  `
  const rows: any = await query(sql, params)
  return rows
}

export async function reporteProductosMasVendidos(filters: ReportFilters) {
  const params: any[] = [filters.fecha_inicio, filters.fecha_fin]
  let where = `WHERE p.estado='completado' AND DATE(a.fecha) BETWEEN ? AND ?`
  if (filters.ruta_id) {
    where += ` AND a.ruta_id = ?`
    params.push(filters.ruta_id)
  }
  if (filters.rutero_id) {
    where += ` AND a.rutero_id = ?`
    params.push(filters.rutero_id)
  }
  const sql = `
    SELECT 
      SUM(COALESCE(p.gourmet15,0)) AS gourmet15,
      SUM(COALESCE(p.gourmet5,0)) AS gourmet5,
      SUM(COALESCE(p.barraHielo,0)) AS barraHielo,
      SUM(COALESCE(p.mediaBarra,0)) AS mediaBarra,
      SUM(COALESCE(p.premium,0)) AS premium
    FROM pedidos p
    JOIN asignaciones a ON a.id = p.asignacion_id
    ${where}
  `
  const rows: any = await query(sql, params)
  const totals = rows?.[0] || {}
  return [
    { producto: 'GOURMET 15KG', unidades: Number(totals.gourmet15 || 0) },
    { producto: 'GOURMET 5KG', unidades: Number(totals.gourmet5 || 0) },
    { producto: 'BARRA HIELO', unidades: Number(totals.barraHielo || 0) },
    { producto: 'MEDIA BARRA', unidades: Number(totals.mediaBarra || 0) },
    { producto: 'PREMIUM', unidades: Number(totals.premium || 0) },
  ]
}

export async function reporteHistorialCredito(filters: ReportFilters) {
  const params: any[] = [filters.fecha_inicio, filters.fecha_fin]
  let where = `WHERE p.estado='completado' AND DATE(a.fecha) BETWEEN ? AND ?`
  if (filters.ruta_id) {
    where += ` AND a.ruta_id = ?`
    params.push(filters.ruta_id)
  }
  if (filters.rutero_id) {
    where += ` AND a.rutero_id = ?`
    params.push(filters.rutero_id)
  }
  const totalExpr = totalPedidoExpr('p', 'c')
  const sql = `
    SELECT 
      c.id AS cliente_id,
      c.local AS cliente,
      CAST(SUM(COALESCE(p.credito_usado,0)) AS DECIMAL(12,2)) AS credito_utilizado,
      CAST(SUM(CASE WHEN p.estado='completado' THEN ${totalExpr} ELSE 0 END) AS DECIMAL(12,2)) AS ventas_facturadas
    FROM pedidos p
    JOIN asignaciones a ON a.id = p.asignacion_id
    JOIN clientes c ON c.id = p.cliente_id
    ${where}
    GROUP BY c.id, c.local
    ORDER BY ventas_facturadas DESC
  `
  const rows: any = await query(sql, params)
  return rows
}

export async function reportePedidosDetalle(filters: ReportFilters) {
  const params: any[] = [filters.fecha_inicio, filters.fecha_fin]
  let where = `WHERE p.estado IN ('completado','cancelado','descancelado') AND DATE(a.fecha) BETWEEN ? AND ?`
  if (filters.ruta_id) {
    where += ` AND a.ruta_id = ?`
    params.push(filters.ruta_id)
  }
  if (filters.rutero_id) {
    where += ` AND a.rutero_id = ?`
    params.push(filters.rutero_id)
  }
  const sql = `
    SELECT 
      p.id,
      DATE(a.fecha) AS fecha,
      a.ruta_id,
      r.nombre AS ruta_nombre,
      a.rutero_id,
      ru.nombre AS rutero_nombre,
      c.id AS cliente_id,
      c.local AS cliente_nombre,
      p.gourmet15, p.gourmet5, p.barraHielo, p.mediaBarra, p.premium,
      COALESCE(p.credito_usado, 0) AS credito_usado,
      COALESCE(c.precio_gourmet15, (SELECT precio_base FROM productos WHERE id='gourmet15')) AS precio_gourmet15,
      COALESCE(c.precio_gourmet5, (SELECT precio_base FROM productos WHERE id='gourmet5')) AS precio_gourmet5,
      COALESCE(c.precio_barraHielo, (SELECT precio_base FROM productos WHERE id='barraHielo')) AS precio_barraHielo,
      COALESCE(c.precio_mediaBarra, (SELECT precio_base FROM productos WHERE id='mediaBarra')) AS precio_mediaBarra,
      COALESCE(c.precio_premium, (SELECT precio_base FROM productos WHERE id='premium')) AS precio_premium,
      p.estado,
      p.motivo_cancelacion
    FROM pedidos p
    JOIN asignaciones a ON a.id = p.asignacion_id
    JOIN clientes c ON c.id = p.cliente_id
    JOIN ruteros ru ON ru.id = a.rutero_id
    JOIN rutas r ON r.id = a.ruta_id
    ${where}
    ORDER BY a.fecha DESC, p.id DESC
  `
  const rows: any = await query(sql, params)
  return rows
}
