import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const rutaId = searchParams.get("rutaId")

    if (!rutaId) {
      return NextResponse.json({ error: "Se requiere el parámetro 'rutaId'" }, { status: 400 })
    }

    // Consultar los pedidos extemporáneos para la ruta especificada en el día actual exacto
    const pedidosExtemporaneos = await query(
      `
      SELECT p.cliente_id, p.id as pedido_id
      FROM pedidos p
      JOIN asignaciones a ON p.asignacion_id = a.id
      WHERE a.ruta_id = ? 
        AND DATE(a.fecha) = CURDATE() 
        AND p.es_extemporaneo = 1
      `,
      [rutaId],
    )

    return NextResponse.json(pedidosExtemporaneos)
  } catch (error) {
    console.error("Error al obtener pedidos extemporáneos:", error)
    return NextResponse.json({ error: "Error al obtener pedidos extemporáneos" }, { status: 500 })
  }
}
