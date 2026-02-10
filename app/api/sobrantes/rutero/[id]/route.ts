import { NextResponse } from "next/server"
import { getHistorialSobrantes } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Esperar a que params se resuelva completamente
    const resolvedParams = await params
    const ruteroId = resolvedParams.id

    if (!ruteroId) {
      return NextResponse.json({ error: "Se requiere el ID del rutero" }, { status: 400 })
    }

    const sobrantes = await getHistorialSobrantes(ruteroId)
    return NextResponse.json(sobrantes)
  } catch (error) {
    console.error(`Error al obtener sobrantes para el rutero:`, error)
    return NextResponse.json({ error: "Error al obtener sobrantes" }, { status: 500 })
  }
}
