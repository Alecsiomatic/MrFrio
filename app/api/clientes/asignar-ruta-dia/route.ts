import { NextResponse } from "next/server"
import { getPool, getDiaActualColumna } from "@/lib/db"

// POST /api/clientes/asignar-ruta-dia
// Asigna un cliente a una ruta para el día actual (modo entrenamiento)
// El cliente queda como el PRÓXIMO en la lista (orden mínimo)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clienteId, rutaId } = body

    if (!clienteId || !rutaId) {
      return NextResponse.json(
        { error: "Se requiere clienteId y rutaId" },
        { status: 400 }
      )
    }

    const diaActual = getDiaActualColumna() // ej: "dia_lunes"
    const pool = getPool()

    // Obtener el orden mínimo actual para esta ruta y día
    // El nuevo cliente tendrá orden = min - 1 para quedar primero
    const [minOrden]: any = await pool.query(
      `SELECT COALESCE(MIN(orden), 1) - 1 as nuevo_orden 
       FROM clientes_rutas WHERE ruta_id = ? AND ${diaActual} = 1`,
      [rutaId]
    )
    const orden = minOrden[0]?.nuevo_orden ?? 0

    // Verificar si ya existe la asignación cliente-ruta
    const [existente]: any = await pool.query(
      `SELECT * FROM clientes_rutas WHERE cliente_id = ? AND ruta_id = ?`,
      [clienteId, rutaId]
    )

    if (existente && existente.length > 0) {
      // Ya existe, actualizar el día actual a 1 y poner orden al inicio
      await pool.query(
        `UPDATE clientes_rutas SET ${diaActual} = 1, orden = ? WHERE cliente_id = ? AND ruta_id = ?`,
        [orden, clienteId, rutaId]
      )
    } else {
      // No existe, crear nueva asignación con el día actual y orden al inicio
      await pool.query(
        `INSERT INTO clientes_rutas (cliente_id, ruta_id, ${diaActual}, orden) VALUES (?, ?, 1, ?)`,
        [clienteId, rutaId, orden]
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: `Cliente asignado a ${rutaId} para ${diaActual.replace('dia_', '')}` 
    })
  } catch (error) {
    console.error("Error al asignar cliente a ruta:", error)
    return NextResponse.json(
      { error: "Error al asignar cliente", details: String(error) },
      { status: 500 }
    )
  }
}
