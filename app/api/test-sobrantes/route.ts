import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const ruteroId = searchParams.get("ruteroId") || "1" // Valor por defecto para pruebas

    console.log("Test API sobrantes llamada con ruteroId:", ruteroId)

    // Consulta directa a la base de datos
    const rows = await query(
      `
      SELECT * FROM sobrantes
      WHERE rutero_id = ?
      ORDER BY fecha DESC
    `,
      [ruteroId],
    )

    console.log("Resultados directos de la consulta:", rows)

    return NextResponse.json({
      success: true,
      message: "Consulta de prueba ejecutada correctamente",
      data: rows,
    })
  } catch (error) {
    console.error("Error en test de sobrantes:", error)
    return NextResponse.json({ error: "Error en test de sobrantes", details: error }, { status: 500 })
  }
}
