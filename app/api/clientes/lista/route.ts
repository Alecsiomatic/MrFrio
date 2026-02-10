import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET: Obtener la lista de todos los clientes para el selector
export async function GET() {
  try {
    const clientes = await query(`
      SELECT id, local
      FROM clientes
      WHERE activo = 1
      ORDER BY local
    `)

    return NextResponse.json(clientes)
  } catch (error) {
    console.error("Error al obtener lista de clientes:", error)
    return NextResponse.json({ error: "Error al obtener lista de clientes" }, { status: 500 })
  }
}
