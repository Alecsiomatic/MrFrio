import { NextResponse } from "next/server"
import { getRutas } from "@/lib/db"

export async function GET() {
  try {
    const rutas = await getRutas()
    return NextResponse.json(rutas)
  } catch (error) {
    console.error("Error al obtener rutas:", error)
    return NextResponse.json({ error: "Error al obtener rutas" }, { status: 500 })
  }
}
