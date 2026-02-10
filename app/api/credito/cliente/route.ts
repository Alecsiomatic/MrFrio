import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

// Obtener información de crédito de un cliente
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const clienteId = searchParams.get("clienteId")

    if (!clienteId) {
      return NextResponse.json({ success: false, message: "ID de cliente no proporcionado" }, { status: 400 })
    }

    // Verificar si los campos de crédito existen en la tabla clientes
    const checkFieldsQuery = `
      SHOW COLUMNS FROM clientes 
      WHERE Field IN ('limite_credito', 'credito_usado', 'credito_disponible')
    `
    const fieldsResult = await query(checkFieldsQuery)

    if (!fieldsResult || fieldsResult.length < 3) {
      // Si los campos no existen, crear los campos
      console.log("Creando campos de crédito en la tabla clientes...")

      const addFieldsQuery = `
        ALTER TABLE clientes 
        ADD COLUMN IF NOT EXISTS limite_credito DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS credito_usado DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS credito_disponible DECIMAL(10,2) DEFAULT 0
      `
      await query(addFieldsQuery)

      // Verificar si existe la tabla historial_credito
      const checkTableQuery = `
        SHOW TABLES LIKE 'historial_credito'
      `
      const tableResult = await query(checkTableQuery)

      if (!tableResult || tableResult.length === 0) {
        // Crear la tabla historial_credito
        console.log("Creando tabla historial_credito...")

        const createTableQuery = `
          CREATE TABLE IF NOT EXISTS historial_credito (
            id INT AUTO_INCREMENT PRIMARY KEY,
            cliente_id VARCHAR(36) NOT NULL,
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            monto DECIMAL(10,2) NOT NULL,
            tipo ENUM('uso', 'pago') NOT NULL,
            pedido_id INT NULL,
            descripcion TEXT,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id)
          )
        `
        await query(createTableQuery)
      }
    }

    // Obtener información de crédito del cliente
    const creditoQuery = `
      SELECT 
        id, 
        local as nombre, 
        COALESCE(limite_credito, 0) as limite_credito, 
        COALESCE(credito_usado, 0) as credito_usado, 
        COALESCE(credito_disponible, 0) as credito_disponible
      FROM clientes 
      WHERE id = ?
    `

    const creditoResult = await query(creditoQuery, [clienteId])

    if (!creditoResult || creditoResult.length === 0) {
      return NextResponse.json({ success: false, message: "Cliente no encontrado" }, { status: 404 })
    }

    // Actualizar el crédito disponible si es necesario
    const cliente = creditoResult[0]
    const creditoDisponible = cliente.limite_credito - cliente.credito_usado

    if (creditoDisponible !== cliente.credito_disponible) {
      const updateQuery = `
        UPDATE clientes 
        SET credito_disponible = ? 
        WHERE id = ?
      `
      await query(updateQuery, [creditoDisponible, clienteId])
      cliente.credito_disponible = creditoDisponible
    }

    // Obtener historial de crédito
    const historialQuery = `
      SELECT 
        id, 
        fecha, 
        monto, 
        tipo, 
        pedido_id, 
        descripcion
      FROM historial_credito 
      WHERE cliente_id = ? 
      ORDER BY fecha DESC 
      LIMIT 10
    `

    const historialResult = await query(historialQuery, [clienteId])

    return NextResponse.json({
      success: true,
      credito: cliente,
      historial: historialResult || [],
    })
  } catch (error) {
    console.error("Error al obtener información de crédito:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener información de crédito",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Actualizar límite de crédito
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clienteId, limiteCredito } = body

    if (!clienteId || limiteCredito === undefined) {
      return NextResponse.json({ success: false, message: "Datos incompletos" }, { status: 400 })
    }

    // Obtener información actual del cliente
    const clienteQuery = `
      SELECT credito_usado FROM clientes WHERE id = ?
    `
    const clienteResult = await query(clienteQuery, [clienteId])

    if (!clienteResult || clienteResult.length === 0) {
      return NextResponse.json({ success: false, message: "Cliente no encontrado" }, { status: 404 })
    }

    const creditoUsado = clienteResult[0].credito_usado || 0
    const creditoDisponible = limiteCredito - creditoUsado

    // Actualizar límite de crédito y crédito disponible
    const updateQuery = `
      UPDATE clientes 
      SET limite_credito = ?, 
          credito_disponible = ? 
      WHERE id = ?
    `

    await query(updateQuery, [limiteCredito, creditoDisponible, clienteId])

    // Registrar en historial
    const historialQuery = `
      INSERT INTO historial_credito (cliente_id, monto, tipo, descripcion) 
      VALUES (?, ?, 'pago', ?)
    `

    await query(historialQuery, [
      clienteId,
      limiteCredito,
      `Actualización de límite de crédito a $${limiteCredito.toFixed(2)}`,
    ])

    return NextResponse.json({
      success: true,
      message: "Límite de crédito actualizado correctamente",
    })
  } catch (error) {
    console.error("Error al actualizar límite de crédito:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error al actualizar límite de crédito",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
