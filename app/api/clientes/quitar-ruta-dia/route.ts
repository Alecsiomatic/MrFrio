import { NextResponse } from "next/server"
import { getPool, getDiaActualColumna } from "@/lib/db"

// POST /api/clientes/quitar-ruta-dia
// Quita un cliente de una ruta para el día actual (modo entrenamiento)
// No elimina la asignación completa, solo desmarca el día actual
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

    // Desmarcar el día actual para este cliente en esta ruta
    await pool.query(
      `UPDATE clientes_rutas SET ${diaActual} = 0 WHERE cliente_id = ? AND ruta_id = ?`,
      [clienteId, rutaId]
    )

    return NextResponse.json({ 
      success: true, 
      message: `Cliente quitado de ${rutaId} para ${diaActual.replace('dia_', '')}` 
    })
  } catch (error) {
    console.error("Error al quitar cliente de ruta:", error)
    return NextResponse.json(
      { error: "Error al quitar cliente", details: String(error) },
      { status: 500 }
    )
  }
}
