import { NextResponse } from "next/server"
import { getRuteros } from "@/lib/db"

export async function GET() {
  try {
    const ruteros = await getRuteros()
    return NextResponse.json(ruteros)
  } catch (error) {
    console.error("Error al obtener ruteros:", error)
    return NextResponse.json({ error: "Error al obtener ruteros" }, { status: 500 })
  }
}
