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

    // Obtener el estado de los pedidos para la ruta y fecha actual
    const pedidos = await query(
      `
      SELECT 
        p.cliente_id,
        p.estado,
        p.motivo_cancelacion,
        p.gourmet15,
        p.gourmet5,
        p.barraHielo,
        p.mediaBarra,
        p.premium
      FROM pedidos p
      JOIN asignaciones a ON p.asignacion_id = a.id
      WHERE a.ruta_id = ? AND DATE(a.fecha) = CURDATE()
      `,
      [rutaId],
    )

    // Convertir a un objeto con cliente_id como clave para facilitar el acceso
    const estadoPedidos = pedidos.reduce((acc: any, pedido: any) => {
      acc[pedido.cliente_id] = {
        estado: pedido.estado || null,
        motivo_cancelacion: pedido.motivo_cancelacion || null,
        productos: {
          gourmet15: pedido.gourmet15 || 0,
          gourmet5: pedido.gourmet5 || 0,
          barraHielo: pedido.barraHielo || 0,
          mediaBarra: pedido.mediaBarra || 0,
          premium: pedido.premium || 0,
        },
      }
      return acc
    }, {})

    return NextResponse.json(estadoPedidos)
  } catch (error) {
    console.error("Error al obtener estado de pedidos:", error)
    return NextResponse.json({ error: "Error al obtener estado de pedidos" }, { status: 500 })
  }
}
