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

    // Obtener el inventario disponible para la ruta y fecha actual
    const [inventario]: any = await query(
      `
      SELECT 
        gourmet15, gourmet5, barraHielo, mediaBarra, premium
      FROM sobrantes
      WHERE ruta_id = ? AND fecha = CURDATE()
      ORDER BY id DESC
      LIMIT 1
      `,
      [rutaId],
    )

    if (!inventario) {
      return NextResponse.json({
        productos: {
          gourmet15: 0,
          gourmet5: 0,
          barraHielo: 0,
          mediaBarra: 0,
          premium: 0,
        },
      })
    }

    return NextResponse.json({
      productos: {
        gourmet15: inventario.gourmet15 || 0,
        gourmet5: inventario.gourmet5 || 0,
        barraHielo: inventario.barraHielo || 0,
        mediaBarra: inventario.mediaBarra || 0,
        premium: inventario.premium || 0,
      },
    })
  } catch (error) {
    console.error("Error al obtener inventario disponible:", error)
    return NextResponse.json({ error: "Error al obtener inventario disponible" }, { status: 500 })
  }
}
