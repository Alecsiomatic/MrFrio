import { NextResponse } from "next/server"
import { getClienteCountPorRuta } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Esperar a que params se resuelva completamente
    const resolvedParams = await params
    const rutaId = resolvedParams.id

    const count = await getClienteCountPorRuta(rutaId)
    return NextResponse.json({ count })
  } catch (error) {
    console.error(`Error al obtener conteo de clientes para la ruta:`, error)
    return NextResponse.json({ error: "Error al obtener conteo de clientes" }, { status: 500 })
  }
}
