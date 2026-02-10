import { NextResponse } from "next/server"
import { asignarClienteExtemporaneo } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clienteId, rutaId } = body

    if (!clienteId || !rutaId) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    const resultado = await asignarClienteExtemporaneo(clienteId, rutaId)
    return NextResponse.json(resultado)
  } catch (error) {
    console.error("Error al asignar cliente extemporáneo:", error)
    return NextResponse.json({ error: "Error al asignar cliente extemporáneo" }, { status: 500 })
  }
}
