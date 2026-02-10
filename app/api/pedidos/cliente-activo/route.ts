import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// POST: Establecer un cliente como activo
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clienteId, rutaId } = body

    if (!clienteId || !rutaId) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Obtener la asignación para la ruta y fecha actual
    const asignaciones = await query(
      `
      SELECT id FROM asignaciones
      WHERE ruta_id = ? AND DATE(fecha) = CURDATE()
      ORDER BY fecha DESC
      LIMIT 1
      `,
      [rutaId],
    )

    let asignacionId

    if (!asignaciones || asignaciones.length === 0) {
      // No hay asignación para esta ruta hoy, crear una nueva
      const ruteros = await query("SELECT id FROM ruteros WHERE activo = 1 LIMIT 1")

      if (!ruteros || ruteros.length === 0) {
        return NextResponse.json({ error: "No hay ruteros disponibles" }, { status: 400 })
      }

      const ruteroId = ruteros[0].id

      const result = await query(
        "INSERT INTO asignaciones (ruta_id, rutero_id, fecha, estado) VALUES (?, ?, NOW(), 'en_progreso')",
        [rutaId, ruteroId],
      )

      asignacionId = result.insertId
    } else {
      asignacionId = asignaciones[0].id
    }

    // Primero, establecer todos los clientes de esta ruta como pendientes
    await query(
      `
      UPDATE pedidos p
      JOIN asignaciones a ON p.asignacion_id = a.id
      SET p.estado_seguimiento = 'pendiente'
      WHERE a.ruta_id = ? 
        AND DATE(a.fecha) = CURDATE()
        AND p.estado_seguimiento = 'activo'
      `,
      [rutaId],
    )

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
        SET estado_seguimiento = 'activo'
        WHERE id = ?
        `,
        [pedidoId],
      )
    } else {
      // Crear un nuevo pedido
      await query(
        `
        INSERT INTO pedidos (
          asignacion_id, cliente_id, estado_seguimiento
        ) VALUES (?, ?, 'activo')
        `,
        [asignacionId, clienteId],
      )
    }

    return NextResponse.json({
      success: true,
      message: "Cliente establecido como activo correctamente",
    })
  } catch (error) {
    console.error("Error al establecer cliente activo:", error)
    return NextResponse.json({ error: "Error al establecer cliente activo" }, { status: 500 })
  }
}

// GET: Obtener el cliente activo para una ruta
export async function GET(request: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const rutaId = searchParams.get("rutaId")

    if (!rutaId) {
      return NextResponse.json({ error: "Se requiere el parámetro 'rutaId'" }, { status: 400 })
    }

    // Obtener el cliente activo para la ruta y fecha actual
    const clientesActivos = await query(
      `
      SELECT
        p.cliente_id
      FROM pedidos p
      JOIN asignaciones a ON p.asignacion_id = a.id
      WHERE a.ruta_id = ?
        AND DATE(a.fecha) = CURDATE()
        AND p.estado_seguimiento = 'activo'
      ORDER BY a.fecha DESC
      LIMIT 1
      `,
      [rutaId],
    )

    if (!clientesActivos || clientesActivos.length === 0) {
      // Si no hay cliente activo, buscar el primer cliente pendiente
      const clientePendiente = await query(
        `
        SELECT
          p.cliente_id
        FROM pedidos p
        JOIN asignaciones a ON p.asignacion_id = a.id
        WHERE a.ruta_id = ?
          AND DATE(a.fecha) = CURDATE()
          AND p.estado_seguimiento = 'pendiente'
        ORDER BY a.fecha DESC
        LIMIT 1
        `,
        [rutaId],
      )

      if (clientePendiente && clientePendiente.length > 0) {
        return NextResponse.json({ clienteActivo: clientePendiente[0].cliente_id })
      }

      return NextResponse.json({ clienteActivo: null })
    }

    return NextResponse.json({ clienteActivo: clientesActivos[0].cliente_id })
  } catch (error) {
    console.error("Error al obtener cliente activo:", error)
    return NextResponse.json({ error: "Error al obtener cliente activo" }, { status: 500 })
  }
}
