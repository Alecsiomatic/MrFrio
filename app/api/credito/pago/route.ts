import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// Registrar un pago de crédito
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clienteId, monto, descripcion } = body

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

    // Verificar que el monto del pago no exceda el crédito usado
    if (monto > creditoUsadoActual) {
      return NextResponse.json(
        {
          success: false,
          message: "El monto del pago no puede ser mayor que el crédito usado",
        },
        { status: 400 },
      )
    }

    // Actualizar crédito usado y disponible
    const nuevoCreditoUsado = creditoUsadoActual - monto
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
      INSERT INTO historial_credito (cliente_id, monto, tipo, descripcion) 
      VALUES (?, ?, 'pago', ?)
    `

    await query(historialQuery, [clienteId, monto, descripcion || `Pago de crédito por $${monto.toFixed(2)}`])

    return NextResponse.json({
      success: true,
      message: "Pago registrado correctamente",
      nuevoCredito: {
        usado: nuevoCreditoUsado,
        disponible: nuevoCreditoDisponible,
        limite: limiteCredito,
      },
    })
  } catch (error) {
    console.error("Error al registrar pago:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error al registrar pago",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
