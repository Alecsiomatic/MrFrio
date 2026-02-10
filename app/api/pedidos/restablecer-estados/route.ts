import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST() {
  try {
    // Restablecer los estados de los pedidos de días anteriores
    // Esto preserva el estado (completado/cancelado) pero permite que se vuelvan a usar
    const result = await query(`
      UPDATE pedidos p
      JOIN asignaciones a ON p.asignacion_id = a.id
      SET p.estado_seguimiento = 'pendiente'
      WHERE DATE(a.fecha) < CURDATE()
    `)

    return NextResponse.json({
      success: true,
      message: "Estados de pedidos restablecidos correctamente para el nuevo día",
      affectedRows: result.affectedRows || 0,
    })
  } catch (error) {
    console.error("Error al restablecer estados de pedidos:", error)
    return NextResponse.json({ error: "Error al restablecer estados de pedidos" }, { status: 500 })
  }
}
