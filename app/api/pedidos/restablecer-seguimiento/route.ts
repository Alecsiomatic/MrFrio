import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST() {
  try {
    // Restablecer los estados de seguimiento para el día actual
    // Esto afecta solo a los pedidos del día actual, estableciendo todos a 'pendiente'
    const result = await query(`
      UPDATE pedidos p
      JOIN asignaciones a ON p.asignacion_id = a.id
      SET p.estado_seguimiento = 'pendiente'
      WHERE DATE(a.fecha) = CURDATE()
    `)

    // También asegurarse de que no haya clientes activos al inicio del día
    await query(`
      UPDATE pedidos p
      JOIN asignaciones a ON p.asignacion_id = a.id
      SET p.estado_seguimiento = 'pendiente'
      WHERE DATE(a.fecha) = CURDATE()
        AND p.estado_seguimiento = 'activo'
    `)

    return NextResponse.json({
      success: true,
      message: "Estados de seguimiento restablecidos correctamente para el nuevo día",
      affectedRows: result.affectedRows || 0,
    })
  } catch (error) {
    console.error("Error al restablecer estados de seguimiento:", error)
    return NextResponse.json({ error: "Error al restablecer estados de seguimiento" }, { status: 500 })
  }
}
