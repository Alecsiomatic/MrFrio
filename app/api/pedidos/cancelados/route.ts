import { NextRequest, NextResponse } from "next/server"

import { query } from "@/lib/db"
import { requireUser } from "@/lib/api-auth"

type RutaCanceladaRow = {
  pedidoId: number
  clienteId: string
  clienteNombre: string
  direccion: string
  rutaId: string
  rutaNombre: string | null
  motivo: string | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rutaId = searchParams.get("rutaId")

    const params: any[] = []
    let rutaFilter = ""

    if (rutaId && rutaId !== "all") {
      rutaFilter = " AND a.ruta_id = ?"
      params.push(rutaId)
    }

    const rows: any[] = await query(
      `
      SELECT
        p.id AS pedidoId,
        p.cliente_id AS clienteId,
        c.local AS clienteNombre,
        c.direccion,
        a.ruta_id AS rutaId,
        r.nombre AS rutaNombre,
        p.motivo_cancelacion AS motivo
      FROM pedidos p
      JOIN asignaciones a ON a.id = p.asignacion_id
      JOIN clientes c ON c.id = p.cliente_id
      LEFT JOIN rutas r ON r.id = a.ruta_id
      WHERE DATE(a.fecha) = CURDATE()
        AND p.estado = 'cancelado'
        ${rutaFilter}
      ORDER BY c.local ASC
      `,
      params,
    )

    const data: RutaCanceladaRow[] = rows.map((row) => ({
      pedidoId: Number(row.pedidoId),
      clienteId: String(row.clienteId),
      clienteNombre: row.clienteNombre ?? "",
      direccion: row.direccion ?? "",
      rutaId: String(row.rutaId ?? ""),
      rutaNombre: row.rutaNombre ?? null,
      motivo: row.motivo ?? null,
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error al obtener rutas canceladas:", error)
    return NextResponse.json({ error: "Error al obtener rutas canceladas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(["ADMIN", "SUPERVISOR", "REPARTIDOR"])
    const body = await request.json()
    const pedidoId = body?.pedidoId

    const pedidoIdNumber = Number(pedidoId)
    if (!Number.isFinite(pedidoIdNumber)) {
      return NextResponse.json({ error: "pedidoId no v\u00e1lido" }, { status: 400 })
    }

    const rows: any[] = await query(
      `
      SELECT p.id, p.cliente_id AS clienteId, a.ruta_id AS rutaId
      FROM pedidos p
      JOIN asignaciones a ON a.id = p.asignacion_id
      WHERE p.id = ?
        AND DATE(a.fecha) = CURDATE()
        AND p.estado = 'cancelado'
      LIMIT 1
      `,
      [pedidoIdNumber],
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Pedido cancelado no encontrado para hoy" }, { status: 404 })
    }

    const row = rows[0]

    await query(
      `
      UPDATE pedidos
      SET estado = 'descancelado',
          estado_seguimiento = 'pendiente'
      WHERE id = ?
      `,
      [pedidoIdNumber],
    )

    await query(
      `
      INSERT INTO seguimiento_clientes (cliente_id, ruta_id, fecha, estado)
      VALUES (?, ?, CURDATE(), 'pendiente')
      ON DUPLICATE KEY UPDATE estado = VALUES(estado)
      `,
      [row.clienteId, row.rutaId],
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al descancelar pedido:", error)
    const status = typeof (error as any)?.status === "number" ? (error as any).status : 500
    const message =
      status === 401 || status === 403
        ? (error instanceof Error ? error.message : "No autorizado")
        : "Error al descancelar el pedido"

    return NextResponse.json({ error: message }, { status })
  }
}

