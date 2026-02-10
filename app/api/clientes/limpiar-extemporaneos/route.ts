import { NextResponse } from "next/server"
import { limpiarClientesExtemporaneos } from "@/lib/db"

export async function POST() {
  try {
    const resultado = await limpiarClientesExtemporaneos()
    return NextResponse.json(resultado)
  } catch (error) {
    console.error("Error al limpiar clientes extemporáneos:", error)
    return NextResponse.json({ error: "Error al limpiar clientes extemporáneos" }, { status: 500 })
  }
}
