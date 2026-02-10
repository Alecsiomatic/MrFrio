import { NextResponse } from "next/server"
import { getClientesNoDia } from "@/lib/db"

export async function GET(request: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(request.url)
    const excluirDia = searchParams.get("excluirDia")

    if (!excluirDia) {
      return NextResponse.json({ error: "Se requiere el parámetro 'excluirDia'" }, { status: 400 })
    }

    const clientes = await getClientesNoDia(excluirDia)
    return NextResponse.json(clientes)
  } catch (error) {
    console.error("Error al obtener clientes:", error)
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 })
  }
}
