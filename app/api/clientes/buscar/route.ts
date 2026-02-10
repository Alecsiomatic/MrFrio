import { NextResponse } from "next/server"
import { buscarClientes } from "@/lib/db"

export async function GET(request: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const term = searchParams.get("term")
    const excluirDia = searchParams.get("excluirDia")

    if (!term) {
      return NextResponse.json({ error: "Se requiere un término de búsqueda" }, { status: 400 })
    }

    const clientes = await buscarClientes(term, excluirDia || undefined)
    return NextResponse.json(clientes)
  } catch (error) {
    console.error("Error al buscar clientes:", error)
    return NextResponse.json({ error: "Error al buscar clientes" }, { status: 500 })
  }
}
