import { NextResponse } from "next/server"
import { getClientesPorRuta } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Esperar a que params se resuelva completamente
    const resolvedParams = await params
    const rutaId = resolvedParams.id

    // Obtener los clientes de la ruta directamente
    let clientes = await getClientesPorRuta(rutaId)

    // Limpieza adicional de los nombres de clientes en la API
    clientes = clientes.map((cliente: any) => {
      // Crear una copia del cliente para no modificar el original
      const clienteLimpio = { ...cliente }

      // Limpiar el nombre del cliente (eliminar números al final)
      if (clienteLimpio.local) {
        clienteLimpio.local = clienteLimpio.local.replace(/\s*\d+\s*$/, "").trimEnd()

        // Si es un cliente Extra, asegurarse de que no tenga números
        if (clienteLimpio.isExtra) {
          clienteLimpio.local = clienteLimpio.local.replace(/Extra\s*\d*/, "Extra")
        }
      }

      return clienteLimpio
    })

    return NextResponse.json(clientes)
  } catch (error) {
    console.error(`Error al obtener clientes para la ruta:`, error)
    return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 })
  }
}
