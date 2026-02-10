import { NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requireUser } from "@/lib/api-auth"

export async function POST(request: Request) {
  try {
    const user = await requireUser(["ADMIN", "REPARTIDOR"])
    const body = await request.json()
    const { clienteId, rutaId, estado, motivo, productos, creditoUsado, ruteroId: ruteroIdBody } = body

    if (!clienteId || !rutaId || !estado) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Validar que el estado sea válido
    if (estado !== "completado" && estado !== "cancelado") {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 })
    }

    // Obtener/validar la asignación para la ruta y fecha actual
    const asignaciones: any = await query(
      `SELECT id, rutero_id FROM asignaciones WHERE ruta_id = ? AND DATE(fecha) = CURDATE() ORDER BY fecha DESC LIMIT 1`,
      [rutaId],
    )

    let asignacionId: number

    if (!asignaciones || asignaciones.length === 0) {
      let ruteroAsignacion: number | null = null

      if (user.role === "REPARTIDOR") {
        ruteroAsignacion = user.ruteroId ? Number(user.ruteroId) : null

        if (!ruteroAsignacion) {
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
          ruteroAsignacion = parsedRuteroId
        } else {
          ruteroAsignacion = (user as any).ruteroId ? Number((user as any).ruteroId) : 1
        }
      }

      const result: any = await query(
        "INSERT INTO asignaciones (ruta_id, rutero_id, fecha, estado) VALUES (?, ?, NOW(), 'en_progreso')",
        [rutaId, ruteroAsignacion],
      )
      asignacionId = Number(result.insertId)
    } else {
      const asign = asignaciones[0]
      asignacionId = Number(asign.id)
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

    let pedidoId
    let creditoActualizado: {
      limite: number
      usado: number
      disponible: number
    } | null = null

    if (pedidosExistentes && pedidosExistentes.length > 0) {
      pedidoId = pedidosExistentes[0].id

      // Actualizar el pedido existente
      if (estado === "completado" && productos) {
        // Actualizar cantidades de productos entregados
        await query(
          `
          UPDATE pedidos 
          SET 
            estado = ?,
            gourmet15 = ?,
            gourmet5 = ?,
            barraHielo = ?,
            mediaBarra = ?,
            premium = ?
          WHERE id = ?
          `,
          [
            estado,
            productos.gourmet15 || 0,
            productos.gourmet5 || 0,
            productos.barraHielo || 0,
            productos.mediaBarra || 0,
            productos.premium || 0,
            pedidoId,
          ],
        )

        // Actualizar el inventario (restar de sobrantes)
        await query(
          `
          UPDATE sobrantes
          SET
            gourmet15 = GREATEST(0, gourmet15 - ?),
            gourmet5 = GREATEST(0, gourmet5 - ?),
            barraHielo = GREATEST(0, barraHielo - ?),
            mediaBarra = GREATEST(0, mediaBarra - ?),
            premium = GREATEST(0, premium - ?)
          WHERE rutero_id = (
            SELECT rutero_id FROM asignaciones WHERE id = ?
          )
          AND ruta_id = ?
          AND fecha = CURDATE()
          `,
          [
            productos.gourmet15 || 0,
            productos.gourmet5 || 0,
            productos.barraHielo || 0,
            productos.mediaBarra || 0,
            productos.premium || 0,
            asignacionId,
            rutaId,
          ],
        )

        // Si se usó crédito, registrarlo
        if (creditoUsado && creditoUsado > 0) {
          creditoActualizado = await registrarUsoCredito(
            clienteId,
            creditoUsado,
            pedidoId,
          )
        }
      } else if (estado === "cancelado" && motivo) {
        // Actualizar estado y motivo de cancelación
        await query(
          `
          UPDATE pedidos 
          SET 
            estado = ?,
            motivo_cancelacion = ?
          WHERE id = ?
          `,
          [estado, motivo, pedidoId],
        )
      }
    } else {
      // Crear un nuevo pedido
      if (estado === "completado" && productos) {
        const result = await query(
          `
          INSERT INTO pedidos (
            asignacion_id, cliente_id, estado,
            gourmet15, gourmet5, barraHielo, mediaBarra, premium
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            asignacionId,
            clienteId,
            estado,
            productos.gourmet15 || 0,
            productos.gourmet5 || 0,
            productos.barraHielo || 0,
            productos.mediaBarra || 0,
            productos.premium || 0,
          ],
        )
        pedidoId = result.insertId

        // Actualizar el inventario (restar de sobrantes)
        await query(
          `
          UPDATE sobrantes
          SET
            gourmet15 = GREATEST(0, gourmet15 - ?),
            gourmet5 = GREATEST(0, gourmet5 - ?),
            barraHielo = GREATEST(0, barraHielo - ?),
            mediaBarra = GREATEST(0, mediaBarra - ?),
            premium = GREATEST(0, premium - ?)
          WHERE rutero_id = (
            SELECT rutero_id FROM asignaciones WHERE id = ?
          )
          AND ruta_id = ?
          AND fecha = CURDATE()
          `,
          [
            productos.gourmet15 || 0,
            productos.gourmet5 || 0,
            productos.barraHielo || 0,
            productos.mediaBarra || 0,
            productos.premium || 0,
            asignacionId,
            rutaId,
          ],
        )

        // Si se usó crédito, registrarlo
        if (creditoUsado && creditoUsado > 0) {
          creditoActualizado = await registrarUsoCredito(
            clienteId,
            creditoUsado,
            pedidoId,
          )
        }
      } else if (estado === "cancelado" && motivo) {
        const result = await query(
          `
          INSERT INTO pedidos (
            asignacion_id, cliente_id, estado, motivo_cancelacion
          ) VALUES (?, ?, ?, ?)
          `,
          [asignacionId, clienteId, estado, motivo],
        )
        pedidoId = result.insertId
      }
    }

    return NextResponse.json({
      success: true,
      message:
        estado === "completado"
          ? "Pedido completado correctamente"
          : "Pedido cancelado correctamente",
      pedidoId,
      ...(creditoActualizado ? { credito: creditoActualizado } : {}),
    })
  } catch (error) {
    console.error("Error al actualizar estado del pedido:", error)
    const status = typeof (error as any)?.status === "number" ? (error as any).status : 500
    const message =
      status === 401 || status === 403
        ? (error instanceof Error && error.message) || "No autorizado para actualizar estado del pedido"
        : "Error al actualizar estado del pedido"

    return NextResponse.json({ error: message }, { status })
  }
}

// Función para registrar el uso de crédito utilizando historial_credito
async function registrarUsoCredito(clienteId: string, monto: number, pedidoId: string) {
  try {
    // Obtener información actual del cliente
    const clienteResult = await query(
      `
      SELECT credito_usado, credito_disponible, limite_credito
      FROM clientes
      WHERE id = ?
      `,
      [clienteId],
    )

    if (!clienteResult || clienteResult.length === 0) {
      throw new Error("Cliente no encontrado")
    }

    const cliente = clienteResult[0]
    const creditoUsadoActual = Number(cliente.credito_usado) || 0
    const creditoDisponible = Number(cliente.credito_disponible) || 0
    const limiteCredito = Number(cliente.limite_credito) || 0

    if (monto > creditoDisponible) {
      throw new Error("No hay suficiente crédito disponible")
    }

    const nuevoCreditoUsado = creditoUsadoActual + monto
    const nuevoCreditoDisponible = limiteCredito - nuevoCreditoUsado

    await query(
      `
      UPDATE clientes
      SET credito_usado = ?,
          credito_disponible = ?
      WHERE id = ?
      `,
      [nuevoCreditoUsado, nuevoCreditoDisponible, clienteId],
    )

    await query(
      `
      INSERT INTO historial_credito (cliente_id, monto, tipo, pedido_id, descripcion)
      VALUES (?, ?, 'uso', ?, ?)
      `,
      [
        clienteId,
        monto,
        pedidoId || null,
        `Uso de crédito por $${monto.toFixed(2)}`,
      ],
    )

    return {
      limite: limiteCredito,
      usado: nuevoCreditoUsado,
      disponible: nuevoCreditoDisponible,
    }
  } catch (error) {
    console.error("Error al registrar uso de crédito:", error)
    throw error
  }
}
