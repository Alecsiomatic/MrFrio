import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET: Obtener el estado de seguimiento de los clientes para una ruta
export async function GET(request: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const rutaId = searchParams.get("rutaId")

    if (!rutaId) {
      return NextResponse.json({ error: "Se requiere el parámetro 'rutaId'" }, { status: 400 })
    }

    // Obtener el estado de seguimiento de los clientes para la ruta y fecha actual
    const seguimiento = await query(
      `
      SELECT 
        cliente_id,
        estado
      FROM seguimiento_clientes
      WHERE ruta_id = ? AND fecha = CURDATE()
      `,
      [rutaId],
    )

    // Convertir a un objeto con cliente_id como clave para facilitar el acceso
    const estadoSeguimiento = seguimiento.reduce((acc: any, item: any) => {
      acc[item.cliente_id] = item.estado
      return acc
    }, {})

    return NextResponse.json(estadoSeguimiento)
  } catch (error) {
    console.error("Error al obtener estado de seguimiento:", error)
    return NextResponse.json({ error: "Error al obtener estado de seguimiento" }, { status: 500 })
  }
}

// POST: Actualizar el estado de seguimiento de un cliente
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clienteId, rutaId, estado } = body

    if (!clienteId || !rutaId || !estado) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Validar que el estado sea válido
    if (!["pendiente", "activo", "completado", "cancelado"].includes(estado)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 })
    }

    // Si estamos marcando un cliente como activo, debemos asegurarnos de que no haya otros activos
    if (estado === "activo") {
      await query(
        `
        UPDATE seguimiento_clientes
        SET estado = 'pendiente'
        WHERE ruta_id = ? 
          AND fecha = CURDATE()
          AND cliente_id != ?
          AND estado = 'activo'
        `,
        [rutaId, clienteId],
      )
    }

    // Insertar o actualizar el estado de seguimiento
    await query(
      `
      INSERT INTO seguimiento_clientes (cliente_id, ruta_id, fecha, estado)
      VALUES (?, ?, CURDATE(), ?)
      ON DUPLICATE KEY UPDATE estado = ?
      `,
      [clienteId, rutaId, estado, estado],
    )

    return NextResponse.json({
      success: true,
      message: `Estado de seguimiento actualizado a '${estado}' correctamente`,
    })
  } catch (error) {
    console.error("Error al actualizar estado de seguimiento:", error)
    return NextResponse.json({ error: "Error al actualizar estado de seguimiento" }, { status: 500 })
  }
}
