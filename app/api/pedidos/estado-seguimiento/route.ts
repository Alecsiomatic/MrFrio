import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireUser } from "@/lib/api-auth"

// GET: Obtener el estado de seguimiento de los pedidos para una ruta
export async function GET(request: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const rutaId = searchParams.get("rutaId")

    if (!rutaId) {
      return NextResponse.json({ error: "Se requiere el parámetro 'rutaId'" }, { status: 400 })
    }

    // Obtener el estado de seguimiento de los pedidos para la ruta y fecha actual
    const pedidos = await query(
      `
      SELECT 
        p.cliente_id,
        p.estado_seguimiento
      FROM pedidos p
      JOIN asignaciones a ON p.asignacion_id = a.id
      WHERE a.ruta_id = ? AND DATE(a.fecha) = CURDATE()
      `,
      [rutaId],
    )

    // Convertir a un objeto con cliente_id como clave para facilitar el acceso
    const estadoSeguimiento = pedidos.reduce((acc: any, pedido: any) => {
      acc[pedido.cliente_id] = pedido.estado_seguimiento || "pendiente"
      return acc
    }, {})

    return NextResponse.json(estadoSeguimiento)
  } catch (error) {
    console.error("Error al obtener estado de seguimiento de pedidos:", error)
    return NextResponse.json({ error: "Error al obtener estado de seguimiento de pedidos" }, { status: 500 })
  }
}

// POST: Actualizar el estado de seguimiento de un pedido
export async function POST(request: Request) {
  try {
    const user = await requireUser(["ADMIN", "REPARTIDOR"])
    const body = await request.json()
    const { clienteId, rutaId, estado, ruteroId: ruteroIdBody } = body

    if (!clienteId || !rutaId || !estado) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Validar que el estado sea válido
    if (!["pendiente", "activo", "completado", "cancelado"].includes(estado)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 })
    }

    // Obtener la asignación para la ruta y fecha actual
    const asignaciones = await query(
      `
      SELECT id, rutero_id FROM asignaciones
      WHERE ruta_id = ? AND DATE(fecha) = CURDATE()
      ORDER BY fecha DESC
      LIMIT 1
      `,
      [rutaId],
    )

    let asignacionId: number

    if (!asignaciones || asignaciones.length === 0) {
      let targetRuteroId: number | null = null

      if (user.role === "REPARTIDOR") {
        targetRuteroId = user.ruteroId ? Number(user.ruteroId) : null

        if (!targetRuteroId) {
          return NextResponse.json(
            { error: "Tu usuario no tiene un rutero asignado" },
            { status: 403 },
          )
        }
      } else {
        if (ruteroIdBody !== undefined && ruteroIdBody !== null && ruteroIdBody !== "") {
          const parsedRuteroId = Number(ruteroIdBody)
          if (!Number.isFinite(parsedRuteroId)) {
            return NextResponse.json({ error: "ruteroId inválido" }, { status: 400 })
          }
          targetRuteroId = parsedRuteroId
        } else {
          const ruteros = await query("SELECT id FROM ruteros WHERE activo = 1 LIMIT 1")

          if (!ruteros || ruteros.length === 0) {
            return NextResponse.json({ error: "No hay ruteros disponibles" }, { status: 400 })
          }

          targetRuteroId = Number(ruteros[0].id)
        }
      }

      if (targetRuteroId === null) {
        return NextResponse.json({ error: "No se pudo determinar el rutero para la asignación" }, { status: 400 })
      }

      const result: any = await query(
        "INSERT INTO asignaciones (ruta_id, rutero_id, fecha, estado) VALUES (?, ?, NOW(), 'en_progreso')",
        [rutaId, targetRuteroId],
      )

      asignacionId = Number(result.insertId)
    } else {
      const asign = asignaciones[0]

      asignacionId = Number(asign.id)
    }

    // Si estamos marcando un cliente como activo, debemos asegurarnos de que no haya otros activos
    if (estado === "activo") {
      await query(
        `
        UPDATE pedidos p
        JOIN asignaciones a ON p.asignacion_id = a.id
        SET p.estado_seguimiento = 'pendiente'
        WHERE a.ruta_id = ? 
          AND DATE(a.fecha) = CURDATE()
          AND p.cliente_id != ?
          AND p.estado_seguimiento = 'activo'
        `,
        [rutaId, clienteId],
      )
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

    // Verificar si existe un pedido para este cliente en esta asignación
    const pedidosExistentes = await query(
      `
      SELECT id FROM pedidos 
      WHERE asignacion_id = ? AND cliente_id = ?
      LIMIT 1
      `,
      [asignacionId, clienteId],
    )

    if (pedidosExistentes && pedidosExistentes.length > 0) {
      // Actualizar el pedido existente
      const pedidoId = pedidosExistentes[0].id
      await query(
        `
        UPDATE pedidos 
        SET estado_seguimiento = ?
        WHERE id = ?
        `,
        [estado, pedidoId],
      )
    } else {
      // Crear un nuevo pedido
      await query(
        `
        INSERT INTO pedidos (
          asignacion_id, cliente_id, estado_seguimiento
        ) VALUES (?, ?, ?)
        `,
        [asignacionId, clienteId, estado],
      )
    }

    await query(
      `
      INSERT INTO seguimiento_clientes (cliente_id, ruta_id, fecha, estado)
      VALUES (?, ?, CURDATE(), ?)
      ON DUPLICATE KEY UPDATE estado = VALUES(estado)
      `,
      [clienteId, rutaId, estado],
    )

    return NextResponse.json({
      success: true,
      message: `Estado de seguimiento actualizado a '${estado}' correctamente`,
    })
  } catch (error) {
    console.error("Error al actualizar estado de seguimiento:", error)
    const status = typeof (error as any)?.status === "number" ? (error as any).status : 500
    const message =
      status === 401 || status === 403
        ? (error instanceof Error && error.message) || "No autorizado para actualizar estado de seguimiento"
        : "Error al actualizar estado de seguimiento"

    return NextResponse.json({ error: message }, { status })
  }
}

