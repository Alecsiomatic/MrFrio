import { NextResponse } from "next/server"
import { getPrimerClienteRuta } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Esperar a que params se resuelva completamente
    const resolvedParams = await params
    const rutaId = resolvedParams.id

    const primerCliente = await getPrimerClienteRuta(rutaId)

    // Si no se encuentra ningún cliente, devolver un objeto vacío en lugar de null
    if (!primerCliente) {
      return NextResponse.json({ id: null, lat: null, lng: null })
    }

    return NextResponse.json(primerCliente)
  } catch (error) {
    console.error(`Error al obtener el primer cliente de la ruta ${params?.id}:`, error)
    return NextResponse.json({ error: "Error al obtener el primer cliente" }, { status: 500 })
  }
}
