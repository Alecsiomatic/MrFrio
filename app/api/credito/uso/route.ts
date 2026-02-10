import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// Registrar uso de crédito
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clienteId, monto, pedidoId, descripcion } = body

    if (!clienteId || monto === undefined || monto <= 0) {
      return NextResponse.json({ success: false, message: "Datos incompletos o monto inválido" }, { status: 400 })
    }

    // Obtener información actual del cliente
    const clienteQuery = `
      SELECT credito_usado, credito_disponible, limite_credito 
      FROM clientes 
      WHERE id = ?
    `
    const clienteResult = await query(clienteQuery, [clienteId])

    if (!clienteResult || clienteResult.length === 0) {
      return NextResponse.json({ success: false, message: "Cliente no encontrado" }, { status: 404 })
    }

    const cliente = clienteResult[0]
    const creditoUsadoActual = Number(cliente.credito_usado) || 0
    const creditoDisponible = Number(cliente.credito_disponible) || 0
    const limiteCredito = Number(cliente.limite_credito) || 0

    // Verificar que haya suficiente crédito disponible
    if (monto > creditoDisponible) {
      return NextResponse.json(
        {
          success: false,
          message: "No hay suficiente crédito disponible",
        },
        { status: 400 },
      )
    }

    // Actualizar crédito usado y disponible
    const nuevoCreditoUsado = creditoUsadoActual + monto
    const nuevoCreditoDisponible = limiteCredito - nuevoCreditoUsado

    const updateQuery = `
      UPDATE clientes 
      SET credito_usado = ?, 
          credito_disponible = ? 
      WHERE id = ?
    `

    await query(updateQuery, [nuevoCreditoUsado, nuevoCreditoDisponible, clienteId])

    // Registrar en historial
    const historialQuery = `
      INSERT INTO historial_credito (cliente_id, monto, tipo, pedido_id, descripcion) 
      VALUES (?, ?, 'uso', ?, ?)
    `

    await query(historialQuery, [
      clienteId,
      monto,
      pedidoId || null,
      descripcion || `Uso de crédito por $${monto.toFixed(2)}`,
    ])

    // Si hay un pedido, actualizar el campo de crédito usado
    if (pedidoId) {
      const updatePedidoQuery = `
        UPDATE pedidos 
        SET credito_usado = ? 
        WHERE id = ?
      `
      await query(updatePedidoQuery, [monto, pedidoId])
    }

    return NextResponse.json({
      success: true,
      message: "Uso de crédito registrado correctamente",
      nuevoCredito: {
        usado: nuevoCreditoUsado,
        disponible: nuevoCreditoDisponible,
        limite: limiteCredito,
      },
    })
  } catch (error) {
    console.error("Error al registrar uso de crédito:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error al registrar uso de crédito",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
