import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST() {
  try {
    // Eliminar la marca de extemporáneo de los pedidos de días anteriores
    const result = await query(`
      UPDATE pedidos p
      JOIN asignaciones a ON p.asignacion_id = a.id
      SET p.es_extemporaneo = 0
      WHERE p.es_extemporaneo = 1
        AND DATE(a.fecha) < CURDATE()
    `)

    return NextResponse.json({
      success: true,
      message: "Pedidos extemporáneos antiguos restaurados correctamente",
      affectedRows: result.affectedRows || 0,
    })
  } catch (error) {
    console.error("Error al restaurar pedidos extemporáneos:", error)
    return NextResponse.json({ error: "Error al restaurar pedidos extemporáneos" }, { status: 500 })
  }
}
