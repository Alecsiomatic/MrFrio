import { NextResponse } from "next/server"
import { actualizarOrdenClientesRuta } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { rutaId, clienteIds } = await req.json()
    if (!rutaId || !Array.isArray(clienteIds)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }
    await actualizarOrdenClientesRuta(rutaId, clienteIds)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al actualizar orden de clientes:", error)
    return NextResponse.json({ error: "Error al actualizar orden" }, { status: 500 })
  }
}
