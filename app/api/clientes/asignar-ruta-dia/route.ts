import { NextResponse } from "next/server"
import { getPool, getDiaActualColumna } from "@/lib/db"

// POST /api/clientes/asignar-ruta-dia
// Asigna un cliente a una ruta para el día actual (modo entrenamiento)
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

    // Verificar si ya existe la asignación cliente-ruta
    const [existente]: any = await pool.query(
      `SELECT * FROM clientes_rutas WHERE cliente_id = ? AND ruta_id = ?`,
      [clienteId, rutaId]
    )

    if (existente && existente.length > 0) {
      // Ya existe, solo actualizar el día actual a 1
      await pool.query(
        `UPDATE clientes_rutas SET ${diaActual} = 1 WHERE cliente_id = ? AND ruta_id = ?`,
        [clienteId, rutaId]
      )
    } else {
      // No existe, crear nueva asignación con el día actual
      // Obtener el orden máximo actual para esta ruta y día
      const [maxOrden]: any = await pool.query(
        `SELECT COALESCE(MAX(orden), 0) + 1 as siguiente_orden 
         FROM clientes_rutas WHERE ruta_id = ? AND ${diaActual} = 1`,
        [rutaId]
      )
      const orden = maxOrden[0]?.siguiente_orden || 1

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
