import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const ruteroId = searchParams.get("ruteroId")

    if (!ruteroId) {
      return NextResponse.json({ error: "Se requiere el parámetro 'ruteroId'" }, { status: 400 })
    }

    // Consulta directa a la base de datos
    const rows = await query(
      `
      SELECT ruta_id as ruta, DATE_FORMAT(fecha, '%Y-%m-%d') as fecha, 
             gourmet15, gourmet5, barraHielo, mediaBarra, premium
      FROM sobrantes
      WHERE rutero_id = ?
      ORDER BY fecha DESC
    `,
      [ruteroId],
    )

    // Transformar los resultados al formato esperado
    const formattedResults = rows.map((row: any) => ({
      fecha: row.fecha,
      ruta: row.ruta,
      productos: {
        gourmet15: row.gourmet15,
        gourmet5: row.gourmet5,
        barraHielo: row.barraHielo,
        mediaBarra: row.mediaBarra,
        premium: row.premium,
      },
    }))

    return NextResponse.json(formattedResults)
  } catch (error) {
    console.error("Error al obtener sobrantes:", error)
    return NextResponse.json({ error: "Error al obtener sobrantes" }, { status: 500 })
  }
}
