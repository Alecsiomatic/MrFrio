import { NextResponse } from "next/server"
import { guardarAsignacionRuta } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { rutaId, ruteroId, pedidos, cargaGeneral, modoInventario } = body

    if (!rutaId || !ruteroId || !pedidos) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    const resultado = await guardarAsignacionRuta(rutaId, ruteroId, pedidos, cargaGeneral, modoInventario)
    const status = resultado.accion === "creada" ? 201 : 200
    return NextResponse.json(resultado, { status })
  } catch (error) {
    console.error("Error al guardar asignación:", error)
    return NextResponse.json({ error: "Error al guardar asignación" }, { status: 500 })
  }
}
